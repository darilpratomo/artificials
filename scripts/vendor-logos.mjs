/**
 * Copies the brand marks listed in BRAND_ICONS (shared/catalog.ts) and
 * MAKER_STYLES (shared/makers.ts) from an extracted @lobehub/icons-static-svg
 * package into public/providers/brand/.
 *
 *   npm pack @lobehub/icons-static-svg@<version>
 *   tar -xzf lobehub-icons-static-svg-<version>.tgz
 *   node scripts/vendor-logos.mjs ./package <version> <path-to-LICENSE>
 *
 * Each file is checked before it is copied: SVG only, no scripts, event
 * handlers, embedded documents, images or external references.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_ICONS } from '../shared/catalog.ts';
import { MAKER_STYLES } from '../shared/makers.ts';

const [packageDir, version, licensePath] = process.argv.slice(2);
if (!packageDir || !version || !licensePath)
  throw Error('Usage: node scripts/vendor-logos.mjs <package-dir> <version> <LICENSE>');
const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'public/providers/brand');
const unsafe =
  /<script|\son[a-z]+\s*=|<foreignObject|<image|<use|href\s*=|url\(\s*['"]?(?:https?:|\/\/)/i;

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const icons = [
  ...new Set([
    ...Object.values(BRAND_ICONS),
    ...Object.values(MAKER_STYLES).map((style) => style.icon),
  ]),
].sort();
for (const icon of icons) {
  const source = await readFile(resolve(packageDir, 'icons', `${icon}.svg`), 'utf8');
  if (!source.trimStart().startsWith('<svg') || source.length > 60_000 || unsafe.test(source))
    throw Error(`Rejected brand mark: ${icon}`);
  // Give each mark a fixed intrinsic size; the page scales it with width/height.
  const svg = source
    .replace(/\sstyle="[^"]*"/, '')
    .replace(/\swidth="1em"/, ' width="24"')
    .replace(/\sheight="1em"/, ' height="24"');
  await writeFile(resolve(target, `${icon}.svg`), svg.trim() + '\n');
}
const license = await readFile(licensePath, 'utf8');
await writeFile(
  resolve(target, 'LICENSE.txt'),
  `Brand marks in this folder come from LobeHub Icons (@lobehub/icons-static-svg ${version}),\n` +
    'https://github.com/lobehub/lobe-icons, used under the MIT License below.\n' +
    'Logos identify providers and model makers. Trademarks belong to their owners and do not\n' +
    'imply a partnership or endorsement.\n\n' +
    license.trim() +
    '\n',
);
console.log(`Vendored ${icons.length} brand marks from @lobehub/icons-static-svg ${version}.`);
