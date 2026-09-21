import mammoth from 'mammoth';
import { prepareDocxArchive, rasterImageDimensions } from './word-archive';

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const archive = prepareDocxArchive(new Uint8Array(event.data));
    let omittedImages = 0;
    let pixels = 0;
    let imageBytes = 0;
    const result = await mammoth.convertToHtml(
      { arrayBuffer: archive.buffer as ArrayBuffer },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        ignoreEmptyParagraphs: false,
        styleMap: ['u => u', 'strike => s'],
        convertImage: mammoth.images.imgElement(async (image) => {
          if (!['image/png', 'image/jpeg', 'image/gif'].includes(image.contentType)) {
            omittedImages++;
            return { src: '' };
          }
          const buffer = await image.readAsArrayBuffer();
          const dimensions = rasterImageDimensions(new Uint8Array(buffer), image.contentType);
          const area = dimensions ? dimensions[0] * dimensions[1] : 0;
          if (
            !dimensions ||
            !area ||
            dimensions.some((size) => size > 8192) ||
            area > 16_000_000 ||
            pixels + area > 40_000_000 ||
            imageBytes + buffer.byteLength > 20 * 1024 * 1024
          ) {
            omittedImages++;
            return { src: '' };
          }
          pixels += area;
          imageBytes += buffer.byteLength;
          return { src: `data:${image.contentType};base64,${await image.readAsBase64String()}` };
        }),
      },
    );
    if (result.value.length > 32 * 1024 * 1024)
      throw new Error('The converted document is too large to preview safely.');
    self.postMessage({ html: result.value, warnings: result.messages.length, omittedImages });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'This DOCX could not be read. Try saving a new copy in Word.',
    });
  }
};
