# PostHog: setup recipe

Last checked: 2026-11-23. Rules every recipe shares: [`README.md`](README.md). The kit has no PostHog provider file yet, so `pnpm connect` won't ask for its values: use the `secrets` checklist's "if you're wiring them" path.

**Only if the person picks PostHog.** The kit's default is the `analytics` add-on (Cloudflare Web Analytics, no cookies). PostHog is for funnels, product events and session replay.

## Ask first

- *"PostHog gives you funnels and per-feature events, but it sets cookies and can record sessions, so you may need a consent banner. Cloudflare's analytics is simpler and cookie-free. Which do you want? (Recommended: Cloudflare, unless you need funnels.)"*
- *"PostHog's setup wizard sends your source files to Anthropic or OpenAI, through PostHog's gateway, to write the code. OK, or should I wire it by hand?"*
- US or EU cloud? Session replay on or off? Autocapture on or off? Write each answer to `docs/decisions.md`.

## The vendor's steps, reviewed

PostHog's entry point is `npx -y @posthog/wizard@latest`.

- An interactive terminal app. The published build refuses `--ci`, so an agent can't drive it. `[V]`
- It detects TanStack Start (`@tanstack/react-start`), installs the SDK and edits code. It writes `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` and `VITE_PUBLIC_POSTHOG_HOST` into the project's env file. `[V]` (`src/services/frameworks/tanstack-start/`)
- Source files go to the model provider. `.env*` files stay local. Run telemetry goes to PostHog unless `--no-telemetry`. `[V]`
- It can sign up a new account (`--signup`), and has other programs (`mcp add`, `audit`, `self-driving`, `email`, `warehouse`). `[V]`

## Kit rules on top

- **On a branch, pinned, in the person's terminal:**

  ```sh
  git switch -c feat/<issue>-posthog
  pnpm dlx @posthog/wizard@2.98.0 --no-telemetry
  ```

  `[U]` not run here. Never `--signup` for the person, and none of the other programs without a yes. `self-driving` connects GitHub and turns on replay.
- **Review the wizard's diff before the pull request,** against the kit's rules:
  - **events only through `track()`.** Move every `posthog.capture(...)` it added into `lib/track.ts`, and add each event to `lib/analytics-events.ts` (`object_action`, owner, date). Create both files first if the app has none (`guide/app-conventions.md`, section 14). Nothing else calls PostHog;
  - no personal data in properties or `identify()`: an internal ID at most;
  - env read only through `lib/env.ts`; both names in `.env.example` (in the `secrets` format) and the env schema. The project token is public, so `secret: no`;
  - the PostHog host added to `CSP_EXTRA` in `src/lib/security-headers.ts`;
  - with no token, the app builds, tests pass and nothing is sent;
  - exact pins for `posthog-js` (and `posthog-node` for server events) in `package.json`, with the licence checked: `posthog-js` is `(Apache-2.0 AND MIT)`;
  - no `console.*`, no leftovers, files under 300 lines.
- **The values go in through the `secrets` checklist,** never chat. If the wizard wrote them into a file, check `git status` shows it ignored. Never open it.
- Cookies or replay on: the consent banner and privacy page are the person's call before launch.
- Using the Cloudflare beacon too? Pick one. Two counters disagree.

## Verify

- `pnpm check` passes with no PostHog token set, and the built HTML makes no request to PostHog.
- With a test project's token: one `track()` call shows up once in PostHog's activity view, with no email or name in its properties.
- `git grep -n "posthog.capture"` finds nothing outside `lib/track.ts`.

## Sources

- `PostHog/wizard`, commit `3872773` (2026-11-20): `README.md`, `src/services/frameworks/tanstack-start/tanstack-start-wizard-agent.ts`.
- npm, 2026-11-23: `@posthog/wizard` 2.98.0 (MIT, published 2026-11-19); `posthog-js` 1.453.3 (Apache-2.0 AND MIT); `posthog-node` 6.0.6 (MIT).
- posthog.com wasn't reached. `[U]` PostHog's own TanStack Start page and its default cookie and autocapture settings.

## Follow-up notes for the kit

- No PostHog provider file with a `json connect` block. Add one if PostHog becomes an add-on.
