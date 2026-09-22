/**
 * The logo shape. Every rendered pixel comes from this matrix, so editing the
 * artwork means editing these rows and nothing else. Rows must all be the same
 * length; `1` draws a pixel and `0` leaves an empty grid cell that still holds
 * its position, which is what keeps the proportions intact.
 *
 * Kept free of CSS or React imports so tests and build tooling can read the
 * shape without pulling in a stylesheet.
 */
export const LOGO_MATRIX = [
  '000000111111111000000',
  '000011111111111110000',
  '000011111111111110000',
  '000111111111111111000',
  '001111111111111111100',
  '001111111111111111100',
  '001111111111111111100',
  '011111111111111111110',
  '011100000000000001110',
  '101000000000000000101',
  '101000000000000000101',
  '101000000000000000101',
  '101000000000000000101',
  '101100000111000001101',
  '011111011111110111110',
  '010111110000011111010',
  '011011110111011110110',
  '011110100000001011110',
  '001110101111101011100',
  '000000111000111000000',
  '000000010000010000000',
] as const;

export const LOGO_ROWS = LOGO_MATRIX.length;
export const LOGO_COLUMNS = LOGO_MATRIX[0].length;
