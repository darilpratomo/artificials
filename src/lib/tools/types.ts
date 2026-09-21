export type UtilityId =
  | 'compress-image'
  | 'convert-image'
  | 'compress-pdf'
  | 'merge-pdf'
  | 'extract-pdf'
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
}

export interface UtilityResult {
  name: string;
  blob: Blob;
  detail?: string;
}

export type ProgressReporter = (progress: number, message: string) => void;

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
