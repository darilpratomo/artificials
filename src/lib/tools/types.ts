export type UtilityId =
  | 'compress-image'
  | 'convert-image'
  | 'crop-image'
  | 'watermark-image'
  | 'compress-pdf'
  | 'merge-pdf'
  | 'extract-pdf'
  | 'remove-pdf-pages'
  | 'reorder-pdf'
  | 'split-pdf'
  | 'rotate-pdf'
  | 'pdf-to-images'
  | 'images-to-pdf'
  | 'pdf-to-word'
  | 'word-to-pdf';

export interface UtilityOptions {
  quality: number;
  maxDimension: number;
  imageFormat: 'image/jpeg' | 'image/png' | 'image/webp';
  pdfMode: 'lossless' | 'raster';
  pages: string;
  dpi: number;
  rotation: 90 | 180 | 270;
  /** Crop as percentages of the source, so one setting suits every image size. */
  crop: { x: number; y: number; width: number; height: number };
  aspectRatio: string;
  watermarkText: string;
  watermarkPosition: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'tile';
  watermarkOpacity: number;
  watermarkSize: number;
  splitMode: 'each-page' | 'every-n' | 'at-pages';
  splitValue: string;
}

export interface UtilityResult {
  name: string;
  blob: Blob;
  detail?: string;
}

export type ProgressReporter = (progress: number, message: string) => void;

/** Single source of truth for option defaults, shared by the UI and tests. */
export const DEFAULT_OPTIONS: UtilityOptions = {
  quality: 0.82,
  maxDimension: 2048,
  imageFormat: 'image/webp',
  pdfMode: 'lossless',
  pages: '',
  dpi: 144,
  rotation: 90,
  crop: { x: 0, y: 0, width: 100, height: 100 },
  aspectRatio: 'free',
  watermarkText: '',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.45,
  watermarkSize: 5,
  splitMode: 'each-page',
  splitValue: '',
};

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
export const MAX_FILES = 12;

export function checkCancelled(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Processing cancelled.', 'AbortError');
}

export function outputName(name: string, suffix: string, extension: string) {
  const stem = name
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/\x00-\x1f]/g, '-')
    .slice(0, 120);
  return `${stem || 'document'}-${suffix}.${extension}`;
}
