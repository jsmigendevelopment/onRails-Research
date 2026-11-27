# Recipe: TanStack Hotkeys

Load with an issue whose `Recipes:` line says `hotkeys`: keyboard shortcuts.

## The official prompt

> Add keyboard shortcuts with TanStack Hotkeys. Register commands with useHotkey using Mod bindings so they work on macOS, Windows, and Linux, and use physical [Code] bindings only where key position matters. Pass an array of keys such as G G to useHotkey for a sequence. Wrap dialogs and other overlays in a HotkeysProvider with a scope and exclusive so their hotkeys suspend the rest of the page while they are open. Show platform-correct labels with formatForDisplay and reveal hints with useHotkeyHint while modifiers are held. Declare app hotkeys with defineAppHotkeys, list them in a cheat sheet with useAppHotkeyList, and pass them to HotkeysProvider as appHotkeys, with customHotkeys and onCustomHotkeysChange to persist user rebinding. Use useHotkeyRecorder with detectConflicts and onReject to record new bindings.

Source: tanstack.com/hotkeys, "Copy Hotkeys prompt" (`TanStack/tanstack.com` `src/components/landing/HotkeysLanding.tsx`, commit `bc3e24a`), read 2026-11-23.

## Version

`@tanstack/react-hotkeys` **0.27.2** on npm, checked 2026-11-23 (MIT, React 18+; it re-exports `@tanstack/hotkeys` 0.33.1). **Young (0.x):** any minor release can break. Pin it exactly (`pnpm add -E`), read the changelog for every bump, keep Dependabot from auto-merging it, and mark it young in `docs/stack.md` (the `dependencies` skill).

## API check

Read in `TanStack/hotkeys` at `418247d` (2026-11-21, `react-hotkeys` 0.27.2). Present: `useHotkey` (a chord such as `'Mod+S'`, or an array such as `['G', 'G']` for a sequence), physical bindings in brackets (`'Mod+[KeyS]'`, `'[Enter]'`), `HotkeysProvider` with `scope` and `exclusive` (for example `exclusive={{ allow: ['global'] }}`), `formatForDisplay`, `useHotkeyHint`, `defineAppHotkeys`, `useAppHotkeyList`, the provider's `appHotkeys`, `customHotkeys` and `onCustomHotkeysChange`, and `useHotkeyRecorder` with `detectConflicts` and `onReject`. Every name in the prompt exists in 0.27.2; at 0.x, check them again before each upgrade.

## The kit's rules on top

- **Every shortcut has a visible alternative** (a button or menu item); shortcuts are accelerators, never the only way.
- **Don't fight the platform:** no shortcut that fires while typing (by default, `ignoreInputs: 'auto'`, single keys and `Shift`/`Alt` chords are ignored in fields while `Mod` chords and `Escape` still fire; keep that default), nothing on browser or screen-reader keys, and `Mod` rather than `Ctrl` or `Cmd`.
- **One place for app shortcuts:** `defineAppHotkeys` in one file, a cheat sheet from `useAppHotkeyList` (opened with `?`), and labels from `formatForDisplay` everywhere a shortcut is shown.
- **Overlays** wrap their content in a scoped, exclusive provider so the page's shortcuts pause while a dialog is open.
- **Rebinding** is stored as personal settings (local storage, or the server if it must follow the person), validated on load, with conflicts refused (`detectConflicts`, `onReject` showing why).

## Done when

- [ ] The version is pinned exactly and marked young in `docs/stack.md`.
- [ ] Each shortcut has an e2e test (press it, see the effect) and a visible alternative.
- [ ] Typing in a field never fires a page shortcut (an e2e test).
- [ ] An open dialog blocks the page's shortcuts (an e2e test).
- [ ] The cheat sheet lists every app shortcut with platform-correct labels and is axe clean.
