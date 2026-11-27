---
name: seo
description: Use when a site should show up well in search or when shared links look wrong ("add meta tags", "SEO", "it doesn't show up on Google", "the link preview is broken", "add a sitemap", "Lighthouse SEO score") - titles, descriptions, canonical URLs, Open Graph share images, favicons, sitemap.xml and robots.txt, JSON-LD, real 404s, AI crawlers and llms.txt, and Search Console.
---

# SEO: metadata in the HTML, one URL per page

Make every public page describe itself in the HTML the server sends, with one canonical address.

## Rules

1. **All metadata is in the served HTML.** Title, description, canonical, Open Graph and Twitter tags, JSON-LD and the main content come from the server, not from client JavaScript. Check with `curl`, not DevTools.
2. **One site-URL source.** A single validated setting feeds canonicals, `og:url`, the sitemap and `robots.txt`. Never hard-code the domain in several places.
3. **One URL form.** Pick trailing slash or not, and enforce it at the host, in links and in the sitemap. Internal links and canonicals point straight at the final URL, with no redirect chains. No second public host serves the same pages.
4. **One `pageHead()` helper for every route.** Each page passes its own unique title and description. Dev, test and styleguide pages are `noindex` and stay out of the sitemap.
5. **Generate the sitemap, robots.txt, share images and favicons at build time.** Never generate them per request. The sitemap lists only indexable pages with absolute canonical URLs; `robots.txt` has an absolute `Sitemap:` line. To opt out of AI training without hiding from search, add the `__usage_ai-training` token next to the crawler rules (checked 2026-11).
6. **Lint metadata in the build.** Fail on a missing title, description or canonical, or a duplicate title. Warn on a duplicate description.
7. **Unknown URLs return a real 404 status,** never a 200 "not found" page and never a 5xx.
8. **Share images are 1200 by 630 PNGs** with `og:image:width`, `og:image:height` and `og:image:alt`, plus `twitter:card` set to `summary_large_image`. Compress them.
9. **Ship the standard icon set.** `favicon.ico`, `favicon.svg`, a 180 px `apple-touch-icon`, 192 and 512 px manifest icons and `site.webmanifest`.
10. **Use structured data types you can fill.** `Organization`, `Person`, `WebSite` and `BlogPosting` are safe defaults. Avoid types like `LocalBusiness` or `ProfessionalService` unless you have the street address they expect.
11. **Put the key name in visible words.** The brand or person's name belongs in the first heading or first sentence, not only in the title tag and JSON-LD. Structured data alone does not rank anything.
12. **Decide the AI-crawler policy on purpose.** A common choice is to allow search and answer bots and disallow training bots in `robots.txt`. Re-check crawler names in each vendor's own docs whenever you edit it. A short `/llms.txt` generated from the same source as the sitemap is cheap to add.
13. **Make SEO and accessibility hard gates.** Set Lighthouse CI's SEO and accessibility scores to 1 as errors from day one. Never sniff the Lighthouse user agent to serve it a different page.
14. **Register the domain once it is live.** Verify it in Google Search Console and Bing Webmaster Tools with a DNS TXT record and submit the sitemap. This needs the person's accounts, so ask.
15. **Never invent facts.** No made-up numbers, reviews or client names in metadata, structured data or posts.

## On Cloudflare

- An edge "block AI bots" or crawl-control setting overrides `robots.txt`. If it conflicts with the policy, report it to the person instead of changing the account. (checked 2026-11)
- Preview and `*.workers.dev` hosts send `X-Robots-Tag: noindex`; production and localhost do not, or Lighthouse CI's SEO audit fails.

## Checklist before merge

- [ ] `curl` on each new page shows its title, description, canonical and share tags.
- [ ] The metadata lint passes with no duplicate titles.
- [ ] New public pages are in the sitemap; dev pages are `noindex` and not in it.
- [ ] A made-up URL returns status 404.
- [ ] Canonicals and internal links use the one URL form and do not redirect.
- [ ] JSON-LD parses and uses a type whose required fields are filled.
- [ ] Lighthouse CI's SEO score is 1.
