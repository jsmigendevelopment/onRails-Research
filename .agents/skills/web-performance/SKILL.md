---
name: web-performance
description: Use when a page should load or respond faster ("make it fast", "it feels slow", "Lighthouse score", "PageSpeed", Core Web Vitals, LCP, CLS, INP, bundle too big) or when setting up performance budgets - prerendered HTML, JS budgets enforced in the build, images and fonts without layout shift, code splitting and lazy loading, cache headers, prefetch on intent, and measuring the right way.
---

# Web performance: budgets first, then measure

Keep pages fast by setting limits early, enforcing them before every merge (the web pack's `pnpm check:merge`, which the local gate runs), and trusting only real measurements.

## Rules

1. **Set budgets before you optimize, and fail the build on them.** Cap the compressed initial JS per page (the entry plus everything the HTML preloads or imports statically), measured from the built output. Give each big lazy feature (editor, map, chart) its own budget. Run Lighthouse CI on mobile for LCP, CLS and TBT as a second, separate budget, against a server that compresses like production. For server-rendered apps, budget what each page's HTML actually loads. The third-party audit is now called `third-parties-insight` (checked 2026-11).
2. **Put the first screen in the HTML.** Prerender or server-render every page so the largest element (ideally text) and everything above the fold arrive in the HTML. Serve static HTML from the CDN where you can.
3. **Order the head on purpose.** Charset, viewport, any tiny inline theme script, CSS, the LCP image preload, one or two font preloads, then module preloads. Analytics load with `defer`.
4. **Find what is in the bundle before you cut.** Attribute every initial chunk and name the biggest offender with its size. Barrel files (`index.ts` that re-exports everything) often drag a whole feature into the entry; import from the file itself or lazy-load the view.
5. **Lazy-load heavy below-the-fold parts.** Forms with big validation libraries, editors and maps load when they come near the viewport or on first interaction. Keep the server HTML in place until then, and give every lazy chunk a fallback when it fails to load.
6. **Keep server-only code out of the client.** Schemas used only on the server, PDF and share-image generation, and secrets stay server-side. Grep the built client output to prove it.
7. **Fonts must not move the layout.** Self-host fonts, subset them to the characters you use, preload at most two, and use metric-matched fallback faces (`size-adjust` and friends) per weight. Test with fonts delayed by about a second.
8. **Images get modern formats and fixed sizes.** Use AVIF then WebP in `<picture>` with `srcset`, `sizes`, `width` and `height`. Below the fold add `loading="lazy"` and `decoding="async"`; only the LCP image gets `fetchpriority="high"`. Never hide the main visual from LCP to game the score.
9. **No third-party origin on the critical path.** Self-host fonts and scripts. Anything third-party loads after first paint.
10. **Break up long tasks.** Every main-thread task over 50 ms during load is a bug to split, move to a web worker, or defer until after `load` and idle. Keep event handlers cheap so INP stays low.
11. **Prefer CSS and the platform over JS libraries.** Native `<details>`, `<dialog>` and `popover` work before hydration and cost no bundle. Reach for a JS library only when the platform cannot do it.
12. **Cache hashed assets forever, revalidate HTML.** Hashed files get `Cache-Control: public, max-age=31536000, immutable`; HTML gets `max-age=0, must-revalidate`. No `unload` handlers and no `no-store` on HTML, so the back button stays instant (bfcache).
13. **Prefetch on intent, not on load.** Preload a route's code and data on hover or focus. Never prefetch API or mutation endpoints. Skip optional heavy downloads when the user has Save-Data on or prefers reduced motion.
14. **Measure like a scientist.** Use the production build, at least three runs, and the median (max for CLS). Name the device and the build, and report gzip and brotli sizes. For an A/B comparison, interleave runs. Never report an estimate as a measurement.
15. **Run browsers headless** for tests and Lighthouse CI, so nothing pops up on a shared machine.

## On Cloudflare Workers

- Serve prerendered HTML and hashed assets from Static Assets so the Worker runs only for server routes. A Worker response does not get `_headers` rules, so set the same headers from the Worker too. (checked 2026-11)
- Two `_headers` rules that set the same header are joined with a comma, not replaced. Detach the earlier one with `! Header-Name`. (checked 2026-11)
- Edge compression is a fast level, not brotli 11. Precompress assets at build time if the budget is tight, and budget what actually goes over the wire. (checked 2026-11)

## Checklist before merge

- [ ] The build's JS budget check and Lighthouse CI both pass, with no budget loosened silently.
- [ ] The LCP element and above-the-fold content are in the served HTML (check with `curl`).
- [ ] New images have `width`, `height`, modern formats and lazy loading below the fold.
- [ ] No new font, script or style loads from a third-party origin before first paint.
- [ ] Any new heavy library is lazy-loaded, and its size is named in the PR.
- [ ] No server-only module or secret name appears in the client build output.
- [ ] Performance claims in the PR come from production-build runs, with the device named.
