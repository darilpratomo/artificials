/**
 * The Artificials symbol as one smooth outline, in the same 40 × 35 grid as
 * LOGO_MATRIX, so the animated blocks land exactly on it.
 *
 * Traced from the original artwork (public/brand/artificials-symbol-large.png):
 * every edge is a straight line fitted to the outline, and every corner keeps
 * the artwork's own radius. Three closed shapes, drawn as one path.
 *
 * Kept free of CSS or React imports so tests and build tooling can read it.
 */
export const SYMBOL_PATH =
  'M17.27 0.04L23.67 0.04A2.47 2.47 0 0 1 25.89 1.43L28.56 6.9A2.33 2.33 0 0 1 26.46 10.25L21.71 10.25A2.6 2.6 0 0 0 19.53 11.43L15.7 17.31A2.19 2.19 0 0 0 15.65 19.62L17.92 23.47A1.52 1.52 0 0 1 17.87 25.08L16.94 26.49A1.58 1.58 0 0 1 15.62 27.19L4.58 27.19A1.77 1.77 0 0 1 3.07 26.33L0.24 21.64A1.7 1.7 0 0 1 0.27 19.85L2.49 16.38A1.83 1.83 0 0 1 4.01 15.54L4.72 15.53A2.18 2.18 0 0 0 6.53 14.52L14.93 1.32A2.77 2.77 0 0 1 17.27 0.04ZM19.87 18.97L26.15 18.97A1.59 1.59 0 0 1 27.54 19.78L32.52 28.64A1.6 1.6 0 0 1 32.45 30.33L29.91 34.09A1.96 1.96 0 0 1 28.28 34.96L19.23 34.96A2.01 2.01 0 0 1 17.49 33.96L15.49 30.53A1.56 1.56 0 0 1 16.83 28.19L20.03 28.19A1.93 1.93 0 0 0 21.69 25.28L18.93 20.63A1.1 1.1 0 0 1 19.87 18.97ZM29.62 10.55L34.61 10.55A1.86 1.86 0 0 1 36.25 11.52L39.81 18.06A1.57 1.57 0 0 1 39.7 19.73L37.94 22.18A1.51 1.51 0 0 1 36.71 22.81L33.42 22.81A1.54 1.54 0 0 1 32.1 22.07L29.58 17.92A1.97 1.97 0 0 0 27.9 16.98L25.93 16.98A0.91 0.91 0 0 1 25.17 15.57L27.83 11.52A2.15 2.15 0 0 1 29.62 10.55Z';
