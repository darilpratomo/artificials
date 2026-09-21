import { describe, expect, it } from 'vitest';
import { encodableText } from '../src/lib/tools/docx-pdf';

// The DOM-dependent parts of the renderer (HTML parsing, page drawing) are
// covered by the Playwright suite, which runs in a real browser. These cases
// cover the text encoding rules, which decide whether a PDF can be produced at
// all: pdf-lib's standard fonts use WinAnsi and throw on unencodable input.
describe('DOCX to PDF text encoding', () => {
  it('normalizes typographic punctuation Word inserts automatically', () => {
    expect(encodableText('“Smart quotes” and ‘single’')).toBe('"Smart quotes" and \'single\'');
    expect(encodableText('Em—dash and en–dash')).toBe('Em-dash and en-dash');
    expect(encodableText('Wait… done')).toBe('Wait... done');
    expect(encodableText('10×15')).toBe('10x15');
    expect(encodableText('a≤b≥c')).toBe('a<=b>=c');
  });

  it('keeps Latin-1 accents, which WinAnsi can encode', () => {
    expect(encodableText('café naïve Grüße Köln')).toBe('café naïve Grüße Köln');
  });

  it('converts non-breaking and thin spaces to ordinary spaces', () => {
    expect(encodableText('a b c d')).toBe('a b c d');
    expect(encodableText('zero​width')).toBe('zerowidth');
    expect(encodableText('tab\there')).toBe('tab    here');
  });

  it('replaces characters no standard PDF font can encode', () => {
    // CJK and emoji become a placeholder rather than failing the whole export.
    expect(encodableText('hello 世界')).toBe('hello ??');
    expect(encodableText('done ✅')).toBe('done ?');
  });

  it('keeps bullet characters and newlines used for layout', () => {
    expect(encodableText('• item')).toBe('• item');
    expect(encodableText('line\nbreak')).toBe('line\nbreak');
    expect(encodableText('crlf\r\nnormalized')).toBe('crlf\nnormalized');
  });

  it('strips control characters that would corrupt a PDF string', () => {
    expect(encodableText('safe\u0000\u0007\u001ftext')).toBe('safetext');
  });
});
