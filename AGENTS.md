# Artificials

Build clean, secure, lightweight software with a professional UI responsive across mobile and desktop. Product copy is English; communicate with the owner in Indonesian.

- Use SVG icons, not emoji. Base the interface on black, silver and white with thoughtful scroll animation, keyboard accessibility and reduced-motion support. For charts and model analysis, color is welcome: use the validated skill-area palette in `src/domain-colors.css` for skill areas, each maker's brand color from `shared/makers.ts` for model makers (always beside the maker's logo or name), and keep text in neutral colors. Logos and icons keep their original colors.
- Never invent AI model rankings, benchmark scores or freshness. Show source and retrieval time; distinguish catalog metadata from measured benchmarks. The owner asked for no last-updated time on the home page: there, credit each chart's source beside it, and keep retrieval times on the rankings and model pages.
- Keep admin.md local only. Never add it to Git, deploy uploads, public assets or build output. Never commit secrets.
- After completed coding changes, run appropriate checks, review the diff, then commit and push to the Artificials GitHub repository. Do not push incomplete work or secrets.
- The owner selected Cloudflare Free. Do not purchase services or upgrade plans. Paid AI requests remain disabled until credentials and billing are configured.
