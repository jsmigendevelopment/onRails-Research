---
name: a11y
description: Use when a site must work for everyone ("make it accessible", "a11y", "WCAG", "screen reader", "keyboard navigation", "contrast is too low", "Lighthouse accessibility score") - WCAG 2.2 AA, axe with Playwright on every route, theme and state, colour contrast including hover and focus, keyboard and focus, form errors, live regions, reduced motion, zoom and reflow, and target size.
---

# Accessibility: WCAG 2.2 AA, tested in states, not just at rest

Build to WCAG 2.2 AA and prove it with automated scans plus a short manual pass.

## Rules

1. **Use the UI kit's accessible parts and real HTML.** Buttons are `<button>`, links are `<a href>`, inputs have a `<label>`. Native elements bring keyboard and screen reader support for free.
2. **Scan every route with axe in Playwright.** Use `@axe-core/playwright` with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice`, after hydration, in light and dark themes, on a desktop and a phone profile. Expect zero violations. The `wcag22aa` tag is what turns on the target-size rule. (checked 2026-11)
3. **Scan states, not just pages.** Run axe again with each menu or dialog open, with the form showing errors, with the failure message visible, and with hover forced on buttons and links. A page at rest hides most problems.
4. **Read axe's "incomplete" list.** Text over images, gradients or video is never judged; it is reported as needing review. Snapshot the list per route and fail when it grows.
5. **Contrast is 4.5:1 for text and 3:1 for large text and UI parts.** Compute every text-on-surface pair from the design tokens in both themes. Hover, focus and pressed states must meet the same bar as rest; a hover that lightens a filled button usually breaks it.
6. **Everything works with the keyboard.** Tab order follows the page, focus is always visible, and focus is drawn with `outline` so it survives forced colors. Add a skip link to the main content. A sticky header must not cover the focused element.
7. **Form errors name the field and help fix it.** On a failed submit, set `aria-invalid="true"`, link the message with `aria-describedby`, and move focus to the first bad field. Messages say what to do. Keep what the person typed.
8. **Live regions are for changes.** Put an empty `role="status"` or `role="alert"` container in the DOM from the start and write into it. Hide an empty one with a visually-hidden (`sr-only`) class, never `display:none`, which removes it from the accessibility tree. Never put a live role on content present at load or around a button.
9. **When an action removes the focused control, place focus.** Dismiss, delete and "send another" buttons are the usual culprits. Move focus to the next sensible element in the same handler.
10. **Client-side route changes are silent.** After the swap, move focus to the new page's `h1` and announce its title, or use a plain link for rare navigations.
11. **Honor reduced motion, and add a pause button.** With `prefers-reduced-motion: reduce`, serve the still version from first paint. Anything that moves for more than five seconds on its own also gets a visible pause control. Nothing flashes more than three times a second.
12. **Reflow at 320 px wide and survive text spacing.** No page-level horizontal scroll at 320 by 256 CSS px (400 % zoom). Anything holding text uses `min-height`, never a fixed `height`, so readers' spacing settings don't clip it.
13. **Targets are at least 24 by 24 px or spaced apart.** Check at the narrowest width, where lists wrap.
14. **Decorative visuals are hidden.** A decorative image has `alt=""`; a decorative canvas or SVG is `aria-hidden="true"` and unfocusable. Meaningful images get alt text that says what they show.
15. **A green suite is a floor, not a pass.** Below Full, each release, one person does a short manual check: keyboard only, 200 % zoom, and one screen reader (NVDA with Chrome on Windows or VoiceOver on iPhone). **On Full,** run the parts an agent can: a keyboard-only pass and a 200 % zoom pass in Playwright on the main flow. Record what no screen reader checked on the release's pull request as "AI pick, not reviewed", go on, and add a "try it with a screen reader" line to the FYI.

## Checklist before merge

- [ ] The axe spec passes on every new route and state, in both themes and both profiles.
- [ ] The incomplete snapshot did not grow, or the new entry was checked by hand.
- [ ] Every new control is reachable and usable by keyboard, with a visible focus outline.
- [ ] New text and hover or focus colors meet contrast in both themes.
- [ ] New form fields have labels, and their errors set `aria-invalid` and move focus.
- [ ] New motion respects reduced motion and has a pause control if it runs long.
- [ ] The page reflows at 320 px wide with no horizontal scroll.
