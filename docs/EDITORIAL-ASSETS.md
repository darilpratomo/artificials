# Editorial artwork

Created with the built-in image_gen tool on 17 September 2026, then resized and encoded as WebP with cwebp. No OpenAI API key or production generation endpoint was used. These are original AI-generated concept illustrations, not photographs of real events.

Project assets: `public/editorial/{benchmarks,context,engineering}.webp` (1200px) and matching `-small.webp` variants (640px). Cards use responsive srcset, fixed aspect ratios and lazy loading. The owner requested removal of the visible article captions; provenance remains recorded here.

Final prompts:

## benchmarks

Use case: stylized-concept. Asset: wide 16:9 editorial cover for Artificials AI research article, no text or logos. A cinematic macro photograph-like 3D silver computational sculpture: five polished titanium towers of differing heights connected by impossibly fine luminous threads, suspended above a charcoal laboratory plane. Graphite black and cool silver palette, subtle white light, realistic brushed metal texture, architectural composition, tasteful high-end technology magazine art, strong subject readable as small thumbnail, no actual chart values or invented UI. 1536 by 1024 landscape.

## context

Use case: stylized-concept. Asset: wide editorial cover for Artificials article about model context and knowledge, no text or logos. A sculptural spiral of thin translucent smoked-glass sheets surrounding a glowing silver orb, sophisticated abstract memory architecture in a dark studio. Photoreal 3D materials, soft volumetric white light, silver and black palette with extremely faint cold blue reflections. Single coherent sculptural scene, precise close-up details, high-end technology magazine photography aesthetic, readable thumbnail. 1536 by 1024 landscape.

## engineering

Use case: stylized-concept. Asset: wide editorial cover for Artificials software engineering and AI application article, no text, no logos, no letters. An exploded architectural assembly of brushed aluminum layers and glass circuit tiles floating above a small cylindrical database-like metal core, elegant isometric composition in a charcoal studio. Fine glowing white connecting lines, tactile photoreal 3D rendering, monochrome black and silver with restrained cold highlights. Clean premium technology magazine editorial image, full composition legible small. 1536 by 1024 landscape.

## Homepage hero banner

Mode: built-in image_gen, new image, 17 September 2026. Final files: `public/editorial/hero-banner.webp` (1920px, about 64KB) and `public/editorial/hero-banner-small.webp` (960px, about 21KB). The image is decorative behind real HTML text, with a dark contrast overlay. Replace both responsive versions to change the banner; preserve a wide composition with empty space on the left. There is no embedded text or logo.

Final prompt:

Use case: stylized-concept. Asset type: ultra-wide homepage hero background for Artificials, an elegant black and silver AI technology publication. Create a cinematic photorealistic 3D scene of a vast dark silver celestial sphere with fine etched computational topology, an illuminated thin orbital ring, and sparse fine stars in a deep charcoal space. Wide 2.4:1 composition, sphere occupies the right half with its lower edge softly disappearing in mist. Left half is very dark atmospheric negative space designed for large white heading text layered on top in HTML. Quiet, restrained, high-end scientific art direction, brushed silver surface, subtle white rim light, depth, a faint horizontal light horizon, no bright blue or purple. Keep some sculptural texture behind the left area but readable as an understated background. No text, letters, logos, labels, watermark, charts, or UI. Landscape 2400x1024.

## Engraved planet and mobile composition

Mode: built-in image_gen, edit/reframe of the original homepage hero, 17 September 2026. The displayed replacements are `public/editorial/hero-engraved.webp` (1920px, 67,354 bytes), `public/editorial/hero-engraved-small.webp` (960px, 26,674 bytes), `public/editorial/hero-mobile.webp` (768px, 65,702 bytes), and `public/editorial/hero-mobile-small.webp` (480px, 29,046 bytes). The original unlettered assets above remain as source references. Both edited scenes embed the ARTIFICIALS.NET inscription into the silver planet. The HTML heading, buttons, and navigation remain real accessible text.

`Home.tsx` selects portrait artwork below 761px. CSS frames small phones separately so the sphere is visible below the copy without extending the hero to its former 795px minimum. To replace the artwork, update both desktop and portrait srcsets; keep the portrait planet low and the upper area dark.

Final desktop edit prompt:

Use case: text-localization. Edit the supplied Artificials homepage banner. Preserve its dark silver celestial sphere, computational engraving, thin orbital ring, lighting, stars, atmosphere, landscape framing and empty left half exactly. Add the exact uppercase inscription "ARTIFICIALS.NET" engraved into the planet's metal surface, on the upper-front facing hemisphere above the diagonal ring. It should look physically carved, recessed metallic lettering following the spherical curvature with subtle silver highlights and shadow, understated yet clearly legible at desktop website size. One line, moderately large but tasteful, not bright white flat overlay, no extra words or logos. Spell exactly A R T I F I C I A L S . N E T. Keep the original wide aspect ratio and all other visual content.

Final portrait edit prompt:

Use case: compositing. Adapt the supplied silver planet banner into a dedicated portrait mobile hero background, 1024x1536. Preserve the same cinematic charcoal and silver material, fine computational engravings, single thin orbital ring, sparse stars and mist. Reframe and zoom OUT: show the entire planet with comfortable margins, planet diameter approximately 72 percent of image width, centered horizontally, centered around 72 percent of the image height. Upper 42 percent should be deep dark nearly black atmospheric negative space for real HTML heading text, no text there. Add exact uppercase inscription "ARTIFICIALS.NET" physically engraved in a single curved line on the upper-facing portion of the sphere, subtle but readable silver recessed lettering, not overlay text. Spell exactly A R T I F I C I A L S . N E T. Fade lower edge to black, retain orbital ring within portrait bounds. No additional objects, logos, UI, or extra text.

## Social profile icons

`public/social/x.svg` and `public/social/instagram.svg` are official white glyphs from the [X brand toolkit](https://about.x.com/en/who-we-are/brand-toolkit) and [Instagram brand resources](https://about.meta.com/brand/resources/instagram/instagram-brand/). They replace the hand-drawn X mark and visible social labels. Screen-reader link names remain. `public/social/NOTICE.txt` records archive provenance.
