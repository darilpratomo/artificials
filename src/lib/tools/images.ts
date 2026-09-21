import {
  checkCancelled,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  outputName,
  type ProgressReporter,
  type UtilityId,
  type UtilityOptions,
  type UtilityResult,
} from './types';

export type ImageMime = UtilityOptions['imageFormat'];
export interface ImageInfo {
  mime: ImageMime;
  width: number;
  height: number;
}

const INPUT_PIXEL_LIMIT = 40_000_000;
const OUTPUT_PIXEL_LIMIT = 16_000_000;
const OUTPUT_DIMENSION_LIMIT = 4096;
const SUPPORTED_MESSAGE =
  'Choose a JPEG, PNG, or WebP image. SVG, GIF, HEIC, and animated images are not supported.';
const invalidImage = () =>
  new Error('This image is incomplete or invalid. Try opening and exporting it again.');
const ascii = (bytes: Uint8Array, offset: number, size: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + size));

function validateDimensions(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw invalidImage();
  if (width > 32768 || height > 32768 || width * height > INPUT_PIXEL_LIMIT)
    throw new Error(
      'This image is too large to process safely. Use an image of 40 megapixels or less, with each side at most 32,768 pixels.',
    );
}

/** Check the file bytes before asking a browser decoder to allocate pixel memory. */
export function imageInfoFromBytes(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = (mime: ImageMime, width: number, height: number): ImageInfo => {
    validateDimensions(width, height);
    return { mime, width, height };
  };

  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  ) {
    if (bytes.length < 33 || ascii(bytes, 12, 4) !== 'IHDR' || view.getUint32(8) !== 13)
      throw invalidImage();
    const info = result('image/png', view.getUint32(16), view.getUint32(20));
    let offset = 8;
    let hasImageData = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (length > bytes.length - offset - 12) throw invalidImage();
      const chunk = ascii(bytes, offset + 4, 4);
      if (chunk === 'acTL')
        throw new Error(
          'Animated PNG files are not supported. Choose a still JPEG, PNG, or WebP image.',
        );
      if (chunk === 'IHDR' && offset !== 8) throw invalidImage();
      if (chunk === 'IDAT') hasImageData = true;
      if (chunk === 'IEND') {
        if (!hasImageData || length !== 0) throw invalidImage();
        return info;
      }
      offset += length + 12;
    }
    throw invalidImage();
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let offset = 2;
    while (offset + 1 < bytes.length) {
      if (bytes[offset] !== 0xff) throw invalidImage();
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9 || marker === undefined) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) throw invalidImage();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) throw invalidImage();
      // SOF markers; DHT, JPG, and DAC are not frame headers.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        if (length < 8) throw invalidImage();
        return result('image/jpeg', view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
    throw invalidImage();
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    const end = view.getUint32(4, true) + 8;
    if (end > bytes.length || end < 20) throw invalidImage();
    let info: ImageInfo | undefined;
    let hasPixels = false;
    let offset = 12;
    const uint24 = (at: number) => bytes[at] + bytes[at + 1] * 256 + bytes[at + 2] * 65536;
    while (offset + 8 <= end) {
      const chunk = ascii(bytes, offset, 4);
      const length = view.getUint32(offset + 4, true);
      const start = offset + 8;
      if (length > end - start) throw invalidImage();
      if (chunk === 'ANIM' || chunk === 'ANMF')
        throw new Error(
          'Animated WebP files are not supported. Choose a still JPEG, PNG, or WebP image.',
        );
      if (chunk === 'VP8X') {
        if (length !== 10) throw invalidImage();
        if ((bytes[start] & 2) !== 0)
          throw new Error(
            'Animated WebP files are not supported. Choose a still JPEG, PNG, or WebP image.',
          );
        info = result('image/webp', uint24(start + 4) + 1, uint24(start + 7) + 1);
      } else if (chunk === 'VP8 ') {
        if (length < 10 || bytes[start] & 1 || ascii(bytes, start + 3, 3) !== '\x9d\x01\x2a')
          throw invalidImage();
        const frame = result(
          'image/webp',
          view.getUint16(start + 6, true) & 0x3fff,
          view.getUint16(start + 8, true) & 0x3fff,
        );
        info ??= frame;
        hasPixels = true;
      } else if (chunk === 'VP8L') {
        if (length < 5 || bytes[start] !== 0x2f) throw invalidImage();
        const dimensions = view.getUint32(start + 1, true);
        const frame = result(
          'image/webp',
          (dimensions & 0x3fff) + 1,
          ((dimensions >>> 14) & 0x3fff) + 1,
        );
        info ??= frame;
        hasPixels = true;
      }
      offset = start + length + (length % 2);
    }
    if (!info || !hasPixels || offset !== end) throw invalidImage();
    return info;
  }
  throw new Error(SUPPORTED_MESSAGE);
}

export async function inspectImage(file: Blob, signal: AbortSignal): Promise<ImageInfo> {
  checkCancelled(signal);
  if (file.size > MAX_FILE_BYTES) throw new Error('Each image must be 25 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkCancelled(signal);
  return imageInfoFromBytes(bytes);
}

export interface DecodedImage extends ImageInfo {
  source: CanvasImageSource;
  dispose: () => void;
}

/** EXIF orientation is applied by the browser exactly once, before canvas rendering. */
export async function decodeImage(file: Blob, signal: AbortSignal): Promise<DecodedImage> {
  const info = await inspectImage(file, signal);
  // Trust the validated bytes, not a misleading MIME value supplied by the file picker.
  const typedFile = file.slice(0, file.size, info.mime);
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(typedFile, { imageOrientation: 'from-image' });
      try {
        checkCancelled(signal);
        validateDimensions(bitmap.width, bitmap.height);
        return {
          mime: info.mime,
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          dispose: () => bitmap.close(),
        };
      } catch (error) {
        bitmap.close();
        throw error;
      }
    } catch (error) {
      checkCancelled(signal);
      if (error instanceof Error && error.message.includes('too large')) throw error;
      // Some browsers support HTMLImageElement decoding for formats not accepted by ImageBitmap.
    }
  }
  checkCancelled(signal);
  const url = URL.createObjectURL(typedFile);
  const element = new Image();
  element.decoding = 'async';
  const dispose = () => {
    element.removeAttribute('src');
    URL.revokeObjectURL(url);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const clean = () => {
        element.onload = null;
        element.onerror = null;
        signal.removeEventListener('abort', aborted);
      };
      const aborted = () => {
        clean();
        reject(new DOMException('Processing cancelled.', 'AbortError'));
      };
      element.onload = () => {
        clean();
        resolve();
      };
      element.onerror = () => {
        clean();
        reject(
          new Error(
            'Your browser could not decode this image. Export it as JPEG or PNG and try again.',
          ),
        );
      };
      signal.addEventListener('abort', aborted, { once: true });
      element.src = url;
    });
    checkCancelled(signal);
    validateDimensions(element.naturalWidth, element.naturalHeight);
    return {
      mime: info.mime,
      source: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

export function fitImageDimensions(width: number, height: number, maxDimension: number) {
  validateDimensions(width, height);
  if (!Number.isFinite(maxDimension) || maxDimension < 0)
    throw new Error('Choose a valid maximum image dimension.');
  const limit = Math.min(maxDimension || OUTPUT_DIMENSION_LIMIT, OUTPUT_DIMENSION_LIMIT);
  const scale = Math.min(
    1,
    limit / width,
    limit / height,
    Math.sqrt(OUTPUT_PIXEL_LIMIT / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: ImageMime,
  quality: number,
  signal: AbortSignal,
): Promise<Blob> {
  checkCancelled(signal);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(
              new Error('Your browser could not encode this image. Try a smaller output size.'),
            ),
      mime,
      quality,
    );
  });
  checkCancelled(signal);
  if (blob.type !== mime)
    throw new Error(
      `Your browser cannot export ${mime === 'image/webp' ? 'WebP' : mime.split('/')[1].toUpperCase()}. Choose PNG or JPEG instead.`,
    );
  return blob;
}

/** Resolve a percentage crop against real pixels, clamped to the image bounds. */
export function resolveCrop(
  width: number,
  height: number,
  crop: UtilityOptions['crop'],
): { x: number; y: number; width: number; height: number } {
  const values = [crop.x, crop.y, crop.width, crop.height];
  if (values.some((value) => !Number.isFinite(value))) throw new Error('Choose a valid crop area.');
  const x = Math.min(Math.max(crop.x, 0), 100);
  const y = Math.min(Math.max(crop.y, 0), 100);
  const w = Math.min(Math.max(crop.width, 0), 100 - x);
  const h = Math.min(Math.max(crop.height, 0), 100 - y);
  // Reject an empty selection before rounding, which would otherwise widen a
  // zero-width crop to a single pixel and silently produce a useless image.
  if (w <= 0 || h <= 0) throw new Error('The crop area is too small. Select a larger region.');
  const pixels = {
    x: Math.round((x / 100) * width),
    y: Math.round((y / 100) * height),
    width: Math.max(1, Math.round((w / 100) * width)),
    height: Math.max(1, Math.round((h / 100) * height)),
  };
  pixels.width = Math.min(pixels.width, width - pixels.x);
  pixels.height = Math.min(pixels.height, height - pixels.y);
  if (pixels.width < 1 || pixels.height < 1)
    throw new Error('The crop area is too small. Select a larger region.');
  return pixels;
}

const WATERMARK_INSET = 0.035;

/** Where to draw the watermark, in pixels, given the text box size. */
export function watermarkPlacement(
  width: number,
  height: number,
  textWidth: number,
  textHeight: number,
  position: UtilityOptions['watermarkPosition'],
) {
  const inset = Math.round(Math.min(width, height) * WATERMARK_INSET);
  const right = Math.max(inset, width - textWidth - inset);
  const bottom = Math.max(inset, height - textHeight - inset);
  switch (position) {
    case 'center':
      return { x: Math.max(0, (width - textWidth) / 2), y: Math.max(0, (height - textHeight) / 2) };
    case 'top-left':
      return { x: inset, y: inset };
    case 'top-right':
      return { x: right, y: inset };
    case 'bottom-left':
      return { x: inset, y: bottom };
    default:
      return { x: right, y: bottom };
  }
}

export async function runImageTool(
  id: UtilityId,
  files: File[],
  options: UtilityOptions,
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<UtilityResult[]> {
  checkCancelled(signal);
  const supported: UtilityId[] = [
    'compress-image',
    'convert-image',
    'crop-image',
    'watermark-image',
  ];
  if (!supported.includes(id)) throw new Error('Choose an image tool.');
  if (id === 'watermark-image') {
    const text = options.watermarkText.trim();
    if (!text) throw new Error('Enter the watermark text to place on your images.');
    if (text.length > 120) throw new Error('Use watermark text of 120 characters or less.');
    if (
      !Number.isFinite(options.watermarkOpacity) ||
      options.watermarkOpacity <= 0 ||
      options.watermarkOpacity > 1
    )
      throw new Error('Choose a watermark opacity between 1 and 100%.');
    if (
      !Number.isFinite(options.watermarkSize) ||
      options.watermarkSize < 1 ||
      options.watermarkSize > 20
    )
      throw new Error('Choose a watermark size between 1 and 20% of the image.');
  }
  if (!files.length || files.length > MAX_FILES)
    throw new Error(`Choose between 1 and ${MAX_FILES} images.`);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES)
    throw new Error('Use up to 60 MB of images per batch.');
  if (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 1)
    throw new Error('Choose an image quality between 0 and 100%.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(options.imageFormat))
    throw new Error(SUPPORTED_MESSAGE);

  const results: UtilityResult[] = [];
  for (const [index, file] of files.entries()) {
    checkCancelled(signal);
    report((index / files.length) * 100, `Reading image ${index + 1} of ${files.length}…`);
    const image = await decodeImage(file, signal);
    let canvas: HTMLCanvasElement | undefined;
    try {
      const region =
        id === 'crop-image'
          ? resolveCrop(image.width, image.height, options.crop)
          : { x: 0, y: 0, width: image.width, height: image.height };
      const size =
        id === 'crop-image'
          ? fitImageDimensions(region.width, region.height, options.maxDimension || 0)
          : fitImageDimensions(image.width, image.height, options.maxDimension);
      const mime =
        id === 'compress-image' || id === 'crop-image' || id === 'watermark-image'
          ? image.mime
          : options.imageFormat;
      const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
      canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable in this browser. Try another browser.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      if (mime === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, size.width, size.height);
      }
      context.drawImage(
        image.source,
        region.x,
        region.y,
        region.width,
        region.height,
        0,
        0,
        size.width,
        size.height,
      );
      if (id === 'watermark-image') drawWatermark(context, size.width, size.height, options);
      checkCancelled(signal);
      report(
        ((index + 0.5) / files.length) * 100,
        `Encoding image ${index + 1} of ${files.length}…`,
      );
      const output = await canvasToBlob(canvas, mime, options.quality, signal);
      const resized = size.width !== region.width || size.height !== region.height;
      const keepOriginal = id === 'compress-image' && !resized && output.size >= file.size;
      const dimensionText = `${size.width.toLocaleString('en-US')} × ${size.height.toLocaleString('en-US')} pixels`;
      const suffixes: Record<string, string> = {
        'compress-image': 'compressed',
        'convert-image': 'converted',
        'crop-image': 'cropped',
        'watermark-image': 'watermarked',
      };
      const transparency =
        mime === 'image/jpeg'
          ? 'Transparency uses a white background.'
          : 'Transparency is preserved.';
      const details: Record<string, string> = {
        'crop-image': `${dimensionText}. Cropped from ${image.width.toLocaleString('en-US')} × ${image.height.toLocaleString('en-US')}; the trimmed pixels are not in this file. ${transparency} The original format is kept. Camera metadata is not retained.`,
        'watermark-image': `${dimensionText}. Watermark drawn into the pixels and not removable. ${transparency} The original format is kept. Camera metadata is not retained.`,
      };
      results.push({
        name: outputName(
          file.name,
          keepOriginal ? 'original' : suffixes[id] || 'processed',
          extension,
        ),
        blob: keepOriginal ? file.slice(0, file.size, image.mime) : output,
        detail: keepOriginal
          ? `${dimensionText}. Already efficient at these settings: original kept without size savings. Original metadata is retained.`
          : (details[id] ??
            `${dimensionText}. ${resized ? 'Resized and re-encoded.' : 'Re-encoded.'} ${transparency}${mime === 'image/png' ? ' PNG encoding is lossless; the quality slider does not affect PNG.' : ''} Camera metadata is not retained.`),
      });
    } finally {
      image.dispose();
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    checkCancelled(signal);
    report(((index + 1) / files.length) * 100, `Finished image ${index + 1} of ${files.length}.`);
    // Let the browser paint progress and handle cancellation between files.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  checkCancelled(signal);
  return results;
}

/**
 * Draws the watermark into the pixels. Size scales with the image so a batch of
 * mixed dimensions stays visually consistent, and a dark outline keeps light
 * text readable over both bright and dark areas.
 */
function drawWatermark(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: UtilityOptions,
) {
  const text = options.watermarkText.trim().slice(0, 120);
  if (!text) return;
  const fontSize = Math.max(
    10,
    Math.round((Math.min(width, height) * options.watermarkSize) / 100),
  );
  context.save();
  context.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;
  context.textBaseline = 'top';
  context.globalAlpha = Math.min(1, Math.max(0.02, options.watermarkOpacity));
  context.lineWidth = Math.max(1, fontSize * 0.055);
  context.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  context.fillStyle = '#ffffff';
  const measured = context.measureText(text);
  const textWidth = Math.min(measured.width, width);
  const textHeight = fontSize * 1.2;
  if (options.watermarkPosition === 'tile') {
    const stepX = textWidth + fontSize * 2.5;
    const stepY = textHeight + fontSize * 2.5;
    context.translate(width / 2, height / 2);
    context.rotate(-Math.PI / 9);
    context.translate(-width / 2, -height / 2);
    // Overdraw beyond the canvas so the rotated grid still covers the corners.
    for (let y = -height * 0.4; y < height * 1.4; y += stepY)
      for (let x = -width * 0.4; x < width * 1.4; x += stepX) {
        context.strokeText(text, x, y);
        context.fillText(text, x, y);
      }
  } else {
    const spot = watermarkPlacement(
      width,
      height,
      textWidth,
      textHeight,
      options.watermarkPosition,
    );
    context.strokeText(text, spot.x, spot.y, width);
    context.fillText(text, spot.x, spot.y, width);
  }
  context.restore();
}
