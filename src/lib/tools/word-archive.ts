import { Inflate, zipSync } from 'fflate';

export const DOCX_MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ENTRIES = 1500;
const MAX_EXPANDED_BYTES = 48 * 1024 * 1024;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_XML_BYTES = 6 * 1024 * 1024;
const invalid = () =>
  new Error('This DOCX is damaged, encrypted, or uses an unsupported archive format.');

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});

/** Check real expansion before handing a normalized archive to the document parser. */
export function prepareDocxArchive(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength > DOCX_MAX_FILE_BYTES) throw new Error('Choose a DOCX smaller than 25 MB.');
  if (bytes.byteLength < 22) throw invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let cursor = bytes.length - 22; cursor >= Math.max(0, bytes.length - 65557); cursor--) {
    if (
      view.getUint32(cursor, true) === 0x06054b50 &&
      cursor + 22 + view.getUint16(cursor + 20, true) === bytes.length
    ) {
      end = cursor;
      break;
    }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw invalid();
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directoryStart = view.getUint32(end + 16, true);
  if (!count || count > MAX_ENTRIES)
    throw new Error('This document contains too many parts to preview safely.');
  if (count !== view.getUint16(end + 8, true) || directoryStart + directorySize !== end)
    throw invalid();

  const entries: Record<string, Uint8Array> = Object.create(null);
  const offsets = new Set<number>();
  let cursor = directoryStart;
  let declaredTotal = 0;
  let actualTotal = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw invalid();
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const expectedCrc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const expandedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (
      next > end ||
      !nameLength ||
      flags & 1 ||
      (method !== 0 && method !== 8) ||
      view.getUint16(cursor + 34, true)
    )
      throw invalid();
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    if (
      name.startsWith('/') ||
      /[\\\x00-\x1f]/.test(name) ||
      name.split('/').includes('..') ||
      Object.hasOwn(entries, name)
    )
      throw invalid();
    const entryLimit = /\.(xml|rels)$/i.test(name) ? MAX_XML_BYTES : MAX_ENTRY_BYTES;
    declaredTotal += expandedSize;
    if (expandedSize > entryLimit || declaredTotal > MAX_EXPANDED_BYTES)
      throw new Error(
        'This document expands beyond the safe preview limit. Try a smaller document.',
      );
    if (
      offsets.has(localOffset) ||
      localOffset + 30 > directoryStart ||
      view.getUint32(localOffset, true) !== 0x04034b50
    )
      throw invalid();
    offsets.add(localOffset);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (
      view.getUint16(localOffset + 6, true) !== flags ||
      view.getUint16(localOffset + 8, true) !== method ||
      localNameLength !== nameLength ||
      dataStart + compressedSize > directoryStart
    )
      throw invalid();
    for (let n = 0; n < nameLength; n++)
      if (bytes[localOffset + 30 + n] !== nameBytes[n]) throw invalid();
    const chunks: Uint8Array[] = [];
    let actualSize = 0;
    let crc = 0xffffffff;
    const receive = (chunk: Uint8Array) => {
      actualSize += chunk.length;
      actualTotal += chunk.length;
      if (actualSize > expandedSize || actualSize > entryLimit || actualTotal > MAX_EXPANDED_BYTES)
        throw new Error('This document expands beyond the safe preview limit.');
      for (const byte of chunk) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      chunks.push(chunk);
    };
    if (method === 0) {
      receive(bytes.subarray(dataStart, dataStart + compressedSize));
    } else {
      const stream = new Inflate(receive);
      // A small compressed chunk bounds temporary output even for forged ZIP sizes.
      for (let position = 0; position < compressedSize; position += 4096) {
        const stop = Math.min(position + 4096, compressedSize);
        stream.push(
          bytes.subarray(dataStart + position, dataStart + stop),
          stop === compressedSize,
        );
      }
    }
    if (actualSize !== expandedSize || (crc ^ 0xffffffff) >>> 0 !== expectedCrc) throw invalid();
    const content = new Uint8Array(actualSize);
    let written = 0;
    for (const chunk of chunks) {
      content.set(chunk, written);
      written += chunk.length;
    }
    entries[name] = content;
    cursor = next;
  }
  if (cursor !== end || !entries['[Content_Types].xml'] || !entries['word/document.xml'])
    throw invalid();
  const types = new TextDecoder().decode(entries['[Content_Types].xml']);
  if (
    !types.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
    )
  )
    throw invalid();
  // Mammoth receives a fresh ZIP with sizes derived from actual bytes, never attacker metadata.
  return zipSync(entries, { level: 0 });
}

export function rasterImageDimensions(bytes: Uint8Array, mime: string): [number, number] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    mime === 'image/png' &&
    bytes.length >= 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a &&
    view.getUint32(12) === 0x49484452
  ) {
    return [view.getUint32(16), view.getUint32(20)];
  }
  if (
    mime === 'image/gif' &&
    bytes.length >= 10 &&
    new TextDecoder().decode(bytes.subarray(0, 6)).match(/^GIF8[79]a$/)
  ) {
    return [view.getUint16(6, true), view.getUint16(8, true)];
  }
  if (mime === 'image/jpeg' && bytes.length > 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda || offset + 2 > bytes.length) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        length >= 7
      ) {
        return [view.getUint16(offset + 5), view.getUint16(offset + 3)];
      }
      offset += length;
    }
  }
  return null;
}
