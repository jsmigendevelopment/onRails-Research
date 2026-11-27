---
name: stack-monorepo-expo
description: Use when slice 0 sets up one repo with a web app and an Expo mobile app from the monorepo stack pack, or when building in one - applying the pack and pulling the web pack into apps/web, adding a shared contract or API client method, adding a mobile module or screen, calling /api/v1 with a Clerk token, Uniwind styling, Jest and Maestro tests, EAS builds and updates, and the known traps of Expo SDK 58 in a pnpm workspace.
---

# Stack pack: monorepo with web and Expo

The pack is `stacks/monorepo-expo/` in this kit: pnpm 12 workspaces and Turborepo 2.11 at the root, `apps/mobile` (Expo SDK 58, React Native 0.88.1, Expo Router, `@clerk/expo`, Uniwind, TanStack Query, Zod, Jest, Maestro, EAS), `packages/contracts` (the `/api/v1` schemas and route table) and `packages/api-client` (a typed fetch client with a Clerk bearer token). `apps/web` is the TanStack Start pack, added at slice 0; load `stack-tanstack-start` for work inside it. The pack's README is the reference; this file is what an agent needs to act.

## Slice 0: apply the pack

1. In the new project folder:
   ```sh
   npx degit jsmigendevelopment/onRails/stacks/monorepo-expo .
   npx degit jsmigendevelopment/onRails/stacks/tanstack-start apps/web
   ```
   If degit fails, sparse-clone the kit and copy both folders, as in `stack-tanstack-start`.
2. Fold the web pack in: delete `apps/web/pnpm-workspace.yaml` and `apps/web/pnpm-lock.yaml` (copy any `allowBuilds` or `minimumReleaseAgeExclude` entries the root lacks into the root `pnpm-workspace.yaml` first), move `apps/web/.github/dependabot.yml` to `.github/` with npm `directory: /` and delete the rest of `apps/web/.github/`, and delete `apps/web/lefthook.yml`. Then set `"CLERK_ALLOW_NATIVE_TOKENS": "true"` and `"CLERK_NATIVE_APP_CLAIM": "<repo name, lowercase>"` in all three `vars` blocks of `apps/web/wrangler.jsonc`: the mobile app sends no Origin, so its Clerk tokens have no `azp`, and the web pack refuses those without the flag, or without an `app` claim equal to that value (the `stack-tanstack-start` skill, Sign-in). The person adds the claim in Clerk: give them the "Setup step for you" in the `secrets` skill's Clerk file (a mobile app). Until they do, every mobile call is the 401 and the Worker log says nothing; with the flag on and no value it says `clerk_native_claim_missing`.
3. Rename: `name`, `slug`, `scheme`, `ios.bundleIdentifier`, `android.package` in `apps/mobile/app.json`; `appId` in `apps/mobile/e2e/*.yaml`; the workspace and scheme in `e2e:build:ios` (`apps/mobile/package.json`); then the web pack's own slice 0 renames.
4. `pnpm install`. Then show the person both apps (`build`, "Show it"). This is the web app's one look: skip the web pack's own `pnpm dev` step later. The web app: `pnpm -C apps/web dev` on http://localhost:3000; screenshots with `pnpm -C apps/web exec playwright screenshot ...` (Playwright lives in `apps/web` only). The mobile app: `pnpm --filter mobile dev --go`, opened by scanning the QR code in Expo Go, or `i` or `a` for a simulator. Without `--go` it targets a development build. No keys? Both still run, with sign-in off. Then `pnpm check`. Install and check must both pass before you change anything. Commit the new `pnpm-lock.yaml` (the pack ships none: it can't know `apps/web` in advance; the merge gate installs with `--frozen-lockfile`).
5. Prove the boundaries once: add `import '../../../web/src/lib/page'` to a file in `apps/mobile/src/lib/`, see `pnpm lint` fail, delete it.
6. Fill in "Commands that work here" in `AGENTS.md` from the README's Commands table. Write `ci = "local"` in `docs/stack.md`. Neither pack ships a GitHub Actions workflow: never add one, never wait on one. A tool's docs say "add this workflow"? Run its commands from the session as a package script. Ask the person for the test and production web URLs (they become `EXPO_PUBLIC_API_URL` per EAS environment). Clerk, the Expo account, store accounts and every EAS command stay with the person.
7. This skill doesn't set up Cloudflare itself: `apps/web` does, in the web pack's slice 0. When you get there, its step 9 offers Cloudflare's agent tools (`stack-tanstack-start/references/cloudflare-agent-setup.md`). Offer them once for the whole repo, after a yes, never per workspace.
8. The web pack needs `/api/v1` server routes before the mobile app shows data. That is its own issue: the contract is in `packages/contracts/src/routes.ts` and the README's API table.

## Check contract

| Root command | Runs |
|---|---|
| `check` | `turbo run lint lint:workspace typecheck test build` (all workspaces; cached; any failure fails it) |
| `lint` | each workspace's ESLint and Prettier, plus `lint:workspace` (the cross-workspace rule and `scripts/check-workspace-deps.js`) |
| `typecheck`, `test`, `build` | that task in every workspace. Mobile `test` is Jest; packages and web use Vitest. Mobile `build` is `expo export --platform ios --platform android` |
| `test:e2e` | web Playwright only, because it runs on Linux |
| `test:e2e:mobile` | Maestro, needs a booted simulator or emulator with the app installed |

Short on memory (`ask`, "Try before you block"): `pnpm check --concurrency=1` runs Turborepo's tasks one at a time. Jest and Vitest still start several workers each; for one, run a workspace's tests on their own: `pnpm --filter mobile exec jest --maxWorkers=1`, and `pnpm -C apps/web exec vitest run --maxWorkers=1` for the web app.

Before merge, the agent that runs the local gate (`coordinate`, the `onrails/check` status) also runs `pnpm check:merge` from the root, and the pull request rules with the kit's `pr-rules.mjs` from its checkout of main (the rules of `pnpm pr:rules <n>`, with `feat/` and `fix/` branches only). The web app's deploys run from the root too: `pnpm deploy:preview <n>`, `pnpm deploy:test`, `pnpm deploy:production` (`stack-tanstack-start`, Environments and deploys). The mobile app has no deploy here: EAS stays with the person.

Run one workspace with `pnpm --filter mobile <script>` or `cd apps/mobile && pnpm <script>`. Use `pnpm turbo run <task> --affected` to run only what changed.

## Conventions

**Add a shared contract** (`<r>` is the resource):
1. `packages/contracts/src/<r>.ts`: `z.strictObject` bodies, a DTO schema with explicit fields (no owner id), `page(dto)` for lists, and a plain `interface` for any query a client sends (`z.input` types a coerced number as `unknown`).
2. Paths and methods in `routes.ts` under `API_PREFIX`. Create answers 201, everything else 200; errors use `ERROR_STATUS`.
3. Export it from `index.ts`. Tests next to it: strictness, messages, limits.
4. A method group in `packages/api-client/src/client.ts` that calls `request(schema, { ...route, path, query, body })`, and tests with a fake `fetch` (URL, method, body, bearer header, each error path).
5. The web routes and the mobile hooks follow, each in its own issue if the issue says so.

Contracts and the client stay platform-free: no React, React Native, Expo, Clerk or database imports (lint and `check-workspace-deps.js` fail otherwise).

**Add a mobile module** (`<f>` is kebab-case):
1. `src/modules/<f>/api/<f>-api.ts`: cache keys and the calls it makes through `ApiClient`.
2. `hooks/use-<f>.ts`: TanStack Query hooks that take the client from `useApi()`. Mutations invalidate the module's keys.
3. `ui/screens/<f>-screen.tsx` with loading, empty, error and data states, and `ui/components/`. Use `components/ui` (Button, TextField, Screen) and `components/states.tsx`; add a kit component there rather than restyling one inline.
4. A thin route in `src/app/` that renders the screen. Route tests go in `src/test/`, never in `src/app/` (Expo Router would load them as routes).
5. Tests first: `renderWith(<Screen />, { api: fakeApi({ <r>: { list: jest.fn()... } }) })` from `src/test/render.tsx`. Unfaked methods reject, so a stray call fails. Query by role and label, the way a screen reader would.

A module never imports another module, and never imports `@clerk/*`. Auth is `useSession()` (`status`, `getToken`, `signIn`, `signOut`); `src/components/auth-provider.tsx` is the only Clerk file.

**Call the API:** only through `useApi()` and `@repo/api-client`. It asks for a fresh token each call, sends `Authorization: Bearer`, validates the response with the contract, and throws `ApiError` (`code`, safe `message`, `fields`, `status`). Signed out or no `EXPO_PUBLIC_API_URL`: it throws before any request. Show `errorMessage(error)` and `fieldError(error, 'title')` from `src/lib/errors.ts`. The query client never retries 4xx codes or `rate_limited`.

**Add a native package:** `pnpm --filter mobile exec expo install <pkg>`, then pin the exact version it chose. Native changes need a new binary, not an OTA update.

**Add a variable:** `EXPO_PUBLIC_*` only, read by its full name (`process.env.EXPO_PUBLIC_X`), parsed in `src/lib/env.ts` (bad values turn the feature off and are named, never printed), listed in the root `.env.example` in the secrets format. They are compiled into the app: never a secret. A secret belongs on the web server.

## Gotchas (checked 2026-11)

1. `eslint-config-expo` 58.0.4 pulls `eslint-plugin-react` 7.37 and `eslint-plugin-import` 2.32, which don't support ESLint 10. The pack uses typescript-eslint, `eslint-plugin-react-hooks` and `eslint-plugin-expo` (the env-variable rules) instead. Re-check before switching back.
2. Jest under pnpm: paths look like `node_modules/.pnpm/<name>/node_modules/<name>`, so every ESM-only package must be in `transformIgnorePatterns` by its own name (`standard-navigation` for Expo Router). "Must use import to load ES Module" means one is missing.
3. RNTL 14 is async: `await render(...)`, `await user.press(...)`. Keep `test-renderer` at the version `jest-expo` depends on (1.3.0).
4. A QueryClient in a test needs `gcTime: Infinity` or its timers keep Jest alive ("worker failed to exit gracefully"). Use `testQueryClient()`.
5. Clerk's React SDK has `react-dom` as a peer. Mobile pins `react-dom` 19.3.0, or pnpm resolves the web app's 19.3.1 for it.
6. Never set `nodeLinker: hoisted`. Web (React 19.3.1) and mobile (19.3.0) each resolve their own React only under isolated installs. Shared packages may list React as a peer, never a dependency.
7. pnpm 12 fails install on an unapproved install script (`ERR_PNPM_IGNORED_BUILDS`). Decide each one in `allowBuilds` (true or false) with a comment.
8. `pnpm doctor` is pnpm's own command; Expo's check is `pnpm --filter mobile expo:doctor`, and it needs network to `exp.host`.
9. Without a git repo Turborepo ignores `.gitignore`, hashes its own logs and never hits the cache. In a git checkout the second `pnpm check` is "FULL TURBO". A task that reads env vars must list them in `turbo.json` (`build` lists `EXPO_PUBLIC_*`).
10. ESLint 10 finds a config per file. The cross-workspace check runs with `-c eslint.workspace.config.js` so the workspaces' own configs don't apply to it.
11. `expo-dev-client` is installed, so `expo start` targets a development build. Add `--go` for Expo Go.
12. Expo inlines `process.env.EXPO_PUBLIC_*` only on a direct, literal read. Destructuring gives `undefined` in the bundle (lint catches it).
13. Hosted sign-in is `useHostedAuth()` from `@clerk/expo/hosted-auth`. On Android its default redirect needs the `@clerk/expo` config plugin and a rebuilt binary. Clerk's native components are beta and need a development build.
14. `@clerk/expo` 4.17.4 allows `expo >=54 <59`: the SDK 59 upgrade waits for Clerk. Expo ships an SDK about every quarter.
15. Metro needs no monorepo config with `expo/metro-config`. Uniwind's own example sets `watchFolders`; don't copy that.
16. The web pack's licence check lists the whole workspace, and jest-expo and Vitest bring `@csstools/color-helpers` (MIT-0) through jsdom. It fails until MIT-0 is on the web pack's allow-list.
17. eslint-plugin-boundaries 7 deprecates `mode` in element descriptors; use `partialMatch`. Prove any new rule fails on a deliberate violation before trusting it.
18. `e2e:build:ios`'s `App.xcworkspace` and `App` scheme come from `name` in `app.json`; rename them together.
19. One Clerk key, two names, each Clerk's own: `VITE_CLERK_PUBLISHABLE_KEY` in `apps/web` (TanStack Start) and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/mobile` (Expo). Run `clerk env pull` inside each app's folder: it picks the name from that folder's `package.json` and writes `.env.local` there. From the root it finds neither and falls back to `CLERK_PUBLISHABLE_KEY` in the root `.env.local`, which no app reads (`detectFramework` and `FALLBACK_KEY` in `clerk/cli`'s `framework.ts`, read 2026-11-23).

## What an agent can't verify

An agent can run lint, types, Jest, `expo export` and both boundary checks; none of them puts the app on a screen. Layout, dark mode, the keyboard, safe areas, the hosted sign-in browser and its return to the app, deep links and permission prompts need a device. The Maestro flows need a simulator or emulator and were written from docs, not run. So:

- In the pull request, say what you could not check. Below Full, ask the person to open it in Expo Go or a preview build (the `qa` skill's browser steps don't apply to mobile).
- For a change to sign-in, navigation or native config, below Full, ask the person to run the Maestro flows on a simulator (the README's "Mobile e2e") or to check it on a device before merge.
- **On Full,** run the Maestro flows yourself where a simulator or emulator is available. None? Record the gap on the pull request (what no device checked) as "AI pick, not reviewed", merge on the reviews, and add a "try it on a device" line to the FYI.
- `eas build`, `eas submit`, `eas update`, store listings, signing and Clerk dashboard changes cost money or touch production: stop and ask the person.
