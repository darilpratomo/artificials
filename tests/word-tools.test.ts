import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { prepareDocxArchive, rasterImageDimensions } from '../src/lib/tools/word-archive';

const contentTypes =
  '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const document =
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>A local document.</w:t></w:r></w:p></w:body></w:document>';
const archive = (extra: Record<string, Uint8Array> = {}) =>
  zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    'word/document.xml': strToU8(document),
    ...extra,
  });
const directory = (bytes: Uint8Array) =>
  new DataView(bytes.buffer).getUint32(bytes.length - 6, true);

describe('DOCX archive safety', () => {
  it('rebuilds a valid DOCX from verified content without losing its document', () => {
    const output = unzipSync(prepareDocxArchive(archive()));
    expect(new TextDecoder().decode(output['word/document.xml'])).toBe(document);
  });

  it('rejects encrypted ZIP entries before conversion', () => {
    const bytes = archive();
    const view = new DataView(bytes.buffer);
    view.setUint16(directory(bytes) + 8, view.getUint16(directory(bytes) + 8, true) | 1, true);
    expect(() => prepareDocxArchive(bytes)).toThrow(/encrypted/);
  });

  it('rejects excessive declared expansion before allocating it', () => {
    const bytes = archive();
    new DataView(bytes.buffer).setUint32(directory(bytes) + 24, 1024 * 1024 * 1024, true);
    expect(() => prepareDocxArchive(bytes)).toThrow(/safe preview limit/);
  });

  it('measures actual inflation when an attacker understates the expanded size', () => {
    const bytes = archive();
    new DataView(bytes.buffer).setUint32(directory(bytes) + 24, 1, true);
    expect(() => prepareDocxArchive(bytes)).toThrow(/safe preview limit/);
  });

  it('detects CRC corruption instead of passing corrupted input to Mammoth', () => {
    const bytes = archive();
    const view = new DataView(bytes.buffer);
    const start = directory(bytes);
    view.setUint32(start + 16, view.getUint32(start + 16, true) ^ 1, true);
    expect(() => prepareDocxArchive(bytes)).toThrow(/damaged/);
  });

  it('rejects path traversal, non-DOCX ZIPs and truncated archives', () => {
    expect(() => prepareDocxArchive(archive({ '../evil.xml': strToU8('hello') }))).toThrow();
    expect(() => prepareDocxArchive(zipSync({ 'notes.txt': strToU8('hello') }))).toThrow();
    expect(() => prepareDocxArchive(archive().slice(0, -6))).toThrow();
  });

  it('rejects excessive entry counts', () => {
    const bytes = archive();
    new DataView(bytes.buffer).setUint16(bytes.length - 12, 2000, true);
    expect(() => prepareDocxArchive(bytes)).toThrow(/too many parts/);
  });
});

describe('embedded image preflight', () => {
  it('reads raster dimensions without decoding the entire image', () => {
    const png = new Uint8Array(24);
    const view = new DataView(png.buffer);
    view.setUint32(0, 0x89504e47);
    view.setUint32(4, 0x0d0a1a0a);
    view.setUint32(12, 0x49484452);
    view.setUint32(16, 640);
    view.setUint32(20, 480);
    expect(rasterImageDimensions(png, 'image/png')).toEqual([640, 480]);
    expect(rasterImageDimensions(strToU8('<svg onload="alert(1)"/>'), 'image/svg+xml')).toBeNull();
    expect(rasterImageDimensions(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBeNull();
  });
});
