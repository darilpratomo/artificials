import type { UtilityId } from '../src/lib/tools/types';

export interface UtilityDefinition {
  id: UtilityId;
  title: string;
  description: string;
  category: 'Images' | 'PDF' | 'Documents';
  action: string;
  accept: string;
  formats: string;
  multiple: boolean;
  note: string;
}

export const UTILITIES: UtilityDefinition[] = [
  {
    id: 'compress-image',
    title: 'Compress images',
    description: 'Lighter images, with quality and dimensions under your control.',
    category: 'Images',
    action: 'Compress images',
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    formats: 'JPG, PNG or WebP',
    multiple: true,
    note: 'Quality affects JPEG and WebP. PNG keeps lossless pixels after resizing. Some images are already optimized; a smaller file is not guaranteed.',
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    description: 'Optimize a PDF, or create a smaller image-based version.',
    category: 'PDF',
    action: 'Compress PDF',
    accept: '.pdf,application/pdf',
    formats: 'PDF',
    multiple: false,
    note: 'Start with lossless optimization. Image mode can reduce scanned documents further, but makes pages flat images and removes selectable text, links, forms and accessibility structure. Keep your original.',
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    description: 'Bring selectable PDF text into an editable Word document.',
    category: 'Documents',
    action: 'Create Word document',
    accept: '.pdf,application/pdf',
    formats: 'PDF with selectable text',
    multiple: false,
    note: 'Text-first DOCX export, with page breaks. Columns, tables, images and exact layout are not preserved. Scanned pages need OCR, which is not included. Review the result before using it.',
  },
  {
    id: 'word-to-pdf',
    title: 'Word to PDF',
    description: 'Preview a DOCX document and save it as PDF using your browser.',
    category: 'Documents',
    action: 'Preview document',
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    formats: 'DOCX (not legacy .doc)',
    multiple: false,
    note: 'Uses your browser’s Print → Save as PDF. Text stays selectable. Headings, lists, tables and supported images are retained; complex page layouts, fonts and headers may differ. Review the preview first.',
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDFs',
    description: 'Put multiple PDFs into one document, in the order you choose.',
    category: 'PDF',
    action: 'Merge PDFs',
    accept: '.pdf,application/pdf',
    formats: 'PDF',
    multiple: true,
    note: 'Add at least two files, then arrange them before merging. Page content is copied without rasterizing. Bookmarks, interactive forms and digital signatures may not carry over.',
  },
  {
    id: 'extract-pdf',
    title: 'Extract PDF pages',
    description: 'Make a new PDF with just the pages you need.',
    category: 'PDF',
    action: 'Extract pages',
    accept: '.pdf,application/pdf',
    formats: 'PDF',
    multiple: false,
    note: 'Enter page numbers or ranges, such as 1-3, 5. The original file stays unchanged. Document-level bookmarks, forms and signatures may not carry over.',
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    description: 'Correct page orientation without turning text into images.',
    category: 'PDF',
    action: 'Rotate pages',
    accept: '.pdf,application/pdf',
    formats: 'PDF',
    multiple: false,
    note: 'Choose a clockwise rotation and the pages to change. Leave the page field empty to rotate every page. Editing a signed PDF can invalidate its digital signature.',
  },
  {
    id: 'pdf-to-images',
    title: 'PDF to images',
    description: 'Export PDF pages as crisp JPEG or PNG images.',
    category: 'PDF',
    action: 'Export images',
    accept: '.pdf,application/pdf',
    formats: 'PDF',
    multiple: false,
    note: 'Export up to 40 pages per job. Higher resolution produces larger files; rendering is capped to protect device memory. Image exports do not retain selectable text or interactive elements.',
  },
  {
    id: 'images-to-pdf',
    title: 'Images to PDF',
    description: 'Arrange your images and package them into a single PDF.',
    category: 'Images',
    action: 'Create PDF',
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    formats: 'JPG, PNG or WebP',
    multiple: true,
    note: 'Each image becomes one PDF page. Arrange files in your preferred order. Transparent areas are placed on white. The result contains images, not searchable text.',
  },
  {
    id: 'convert-image',
    title: 'Convert & resize images',
    description: 'Switch between JPEG, PNG and WebP, and resize in one step.',
    category: 'Images',
    action: 'Convert images',
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    formats: 'JPG, PNG or WebP',
    multiple: true,
    note: 'JPEG uses a white background for transparent areas. PNG and WebP can retain transparency. Animated images, SVG and HEIC are not supported.',
  },
];
