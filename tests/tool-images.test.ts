import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canvasToBlob,
  fitImageDimensions,
  imageInfoFromBytes,
  inspectImage,
  runImageTool,
} from '../src/lib/tools/images';
import type { UtilityOptions } from '../src/lib/tools/types';

const options: UtilityOptions = {
  quality: 0.82,
  maxDimension: 0,
  imageFormat: 'image/webp',
  pdfMode: 'lossless',
  pages: '',
  dpi: 144,
  rotation: 90,
};
const signal = () => new AbortController().signal;

function png(width = 40, height = 20, animated = false) {
  const chunks: Uint8Array[] = [];
  const add = (name: string, payload: Uint8Array) => {
    const chunk = new Uint8Array(payload.length + 12);
    new DataView(chunk.buffer).setUint32(0, payload.length);
    chunk.set(new TextEncoder().encode(name), 4);
    chunk.set(payload, 8);
    chunks.push(chunk);
  };
  const header = new Uint8Array(13);
  new DataView(header.buffer).setUint32(0, width);
  new DataView(header.buffer).setUint32(4, height);
  add('IHDR', header);
  if (animated) add('acTL', new Uint8Array(8));
  add('IDAT', new Uint8Array(1));
  add('IEND', new Uint8Array());
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunks.flatMap((chunk) => [...chunk]),
  ]);
}

function webp(width: number, height: number) {
  const bytes = new Uint8Array(26);
  const view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode('RIFF'), 0);
  view.setUint32(4, 18, true);
  bytes.set(new TextEncoder().encode('WEBPVP8L'), 8);
  view.setUint32(16, 5, true);
  bytes[20] = 0x2f;
  view.setUint32(21, ((height - 1) << 14) | (width - 1), true);
  return bytes;
}

function jpeg(width: number, height: number) {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc2, 0, 8, 8, 0, 0, 0, 0, 1,
  ]);
  const view = new DataView(bytes.buffer);
  view.setUint16(13, height);
  view.setUint16(15, width);
  return bytes;
}

function mockBrowser(output: Blob, width = 40, height = 20) {
  const close = vi.fn();
  const bitmap = vi.fn(async (_file: Blob, _options?: ImageBitmapOptions) => ({
    width,
    height,
    close,
  }));
  const context = { drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: '' };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback: (blob: Blob) => void) => callback(output),
  };
  vi.stubGlobal('createImageBitmap', bitmap);
  vi.stubGlobal('document', { createElement: () => canvas });
  return { close, bitmap, canvas, context };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('image safety preflight', () => {
  it('reads actual PNG, JPEG, and lossless WebP dimensions', () => {
    expect(imageInfoFromBytes(png(120, 40))).toEqual({ mime: 'image/png', width: 120, height: 40 });
    expect(imageInfoFromBytes(jpeg(800, 600))).toEqual({
      mime: 'image/jpeg',
      width: 800,
      height: 600,
    });
    expect(imageInfoFromBytes(webp(1920, 1080))).toEqual({
      mime: 'image/webp',
      width: 1920,
      height: 1080,
    });
  });

  it('uses the signature instead of trusting a file MIME label', async () => {
    expect(await inspectImage(new Blob([png()], { type: 'text/plain' }), signal())).toMatchObject({
      mime: 'image/png',
    });
    await expect(
      inspectImage(new Blob(['<svg></svg>'], { type: 'image/png' }), signal()),
    ).rejects.toThrow('JPEG, PNG, or WebP');
  });

  it('rejects huge dimensions before a decoder allocates pixels', () => {
    expect(() => imageInfoFromBytes(png(12000, 10000))).toThrow('40 megapixels');
    expect(() => imageInfoFromBytes(jpeg(65535, 1))).toThrow('32,768');
    expect(() => imageInfoFromBytes(webp(16384, 16384))).toThrow('40 megapixels');
  });

  it('rejects animated and truncated image containers', () => {
    expect(() => imageInfoFromBytes(png(20, 20, true))).toThrow('Animated PNG');
    expect(() => imageInfoFromBytes(png().slice(0, 35))).toThrow('incomplete or invalid');
    expect(() => imageInfoFromBytes(webp(10, 10).slice(0, 24))).toThrow('incomplete or invalid');
    expect(() => imageInfoFromBytes(new TextEncoder().encode('GIF89a'))).toThrow('GIF');
  });

  it('rejects oversized files and cancellation before reading', async () => {
    const arrayBuffer = vi.fn();
    await expect(
      inspectImage({ size: 26 * 1024 * 1024, arrayBuffer } as unknown as Blob, signal()),
    ).rejects.toThrow('25 MB');
    const controller = new AbortController();
    controller.abort();
    await expect(
      inspectImage({ size: 12, arrayBuffer } as unknown as Blob, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });
});

describe('image resizing and encoding', () => {
  it('keeps aspect ratio, never enlarges, and caps output dimensions and area', () => {
    expect(fitImageDimensions(1000, 500, 2000)).toEqual({ width: 1000, height: 500 });
    expect(fitImageDimensions(6000, 4000, 2048)).toEqual({ width: 2048, height: 1365 });
    expect(fitImageDimensions(6000, 6000, 0)).toEqual({ width: 4000, height: 4000 });
    expect(() => fitImageDimensions(1000, 500, Number.NaN)).toThrow('valid maximum');
  });

  it('refuses a browser encoder fallback instead of putting PNG bytes in a WebP file', async () => {
    const { canvas } = mockBrowser(new Blob(['png'], { type: 'image/png' }));
    await expect(
      canvasToBlob(canvas as unknown as HTMLCanvasElement, 'image/webp', 0.8, signal()),
    ).rejects.toThrow('cannot export WebP');
  });

  it('retains an efficient original without inventing compression savings', async () => {
    const input = new File([png()], 'tiny.png', { type: 'image/png' });
    const { close, canvas, bitmap } = mockBrowser(
      new Blob([new Uint8Array(500)], { type: 'image/png' }),
    );
    const progress = vi.fn();
    const [result] = await runImageTool('compress-image', [input], options, progress, signal());
    expect(result.name).toBe('tiny-original.png');
    expect(await result.blob.arrayBuffer()).toEqual(await input.arrayBuffer());
    expect(result.detail).toContain('without size savings');
    expect(result.detail).toContain('metadata is retained');
    expect(bitmap.mock.calls[0][1]).toEqual({ imageOrientation: 'from-image' });
    expect(close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(progress).toHaveBeenLastCalledWith(100, 'Finished image 1 of 1.');
  });

  it('honors requested resizing even when the encoded file is larger', async () => {
    const input = new File([png()], 'tiny.png');
    mockBrowser(new Blob([new Uint8Array(500)], { type: 'image/png' }));
    const [result] = await runImageTool(
      'compress-image',
      [input],
      { ...options, maxDimension: 10 },
      vi.fn(),
      signal(),
    );
    expect(result.blob.size).toBe(500);
    expect(result.detail).toContain('10 × 5 pixels');
    expect(result.detail).toContain('Resized and re-encoded');
  });

  it('preserves transparency for PNG but fills a white background for JPEG', async () => {
    const input = new File([png()], 'transparent.png');
    const pngBrowser = mockBrowser(new Blob(['output'], { type: 'image/png' }));
    await runImageTool(
      'convert-image',
      [input],
      { ...options, imageFormat: 'image/png' },
      vi.fn(),
      signal(),
    );
    expect(pngBrowser.context.fillRect).not.toHaveBeenCalled();
    const jpegBrowser = mockBrowser(new Blob(['output'], { type: 'image/jpeg' }));
    const [result] = await runImageTool(
      'convert-image',
      [input],
      { ...options, imageFormat: 'image/jpeg' },
      vi.fn(),
      signal(),
    );
    expect(jpegBrowser.context.fillStyle).toBe('#ffffff');
    expect(jpegBrowser.context.fillRect).toHaveBeenCalledWith(0, 0, 40, 20);
    expect(result.name).toBe('transparent-converted.jpg');
  });

  it('disposes decoded pixels and stops the batch if cancelled during encoding', async () => {
    const input = new File([png()], 'tiny.png');
    const controller = new AbortController();
    const { close, canvas, bitmap } = mockBrowser(new Blob(['output'], { type: 'image/png' }));
    canvas.toBlob = (callback) => {
      controller.abort();
      callback(new Blob(['output'], { type: 'image/png' }));
    };
    await expect(
      runImageTool('compress-image', [input, input], options, vi.fn(), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(bitmap).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
  });
});
