---
name: wireframes
description: Use when the screens need drawing or changing before they're built ("show me the screens", "wireframe it", "mock it up", "change this screen", the grill's main-flow topic in /idea, new screens in /join or a big feature) - draws in two stages, a grey-box layout of every main-flow screen and then the full design with theme tokens, states and motion, shows each screen as it's done, keeps sketches in docs/design.md and one clickable prototype in light and dark, and records the approval.
---

# Wireframes: the person sees every screen before anything is planned

Two stages, both in the background while the grill goes on.

| Stage | Starts when | Tier · effort (see `routing`) | Draws |
|---|---|---|---|
| **1. Layout** | the grill's main-flow topic ends | Everyday · medium | every main-flow screen: structure and content, grey boxes, no theme |
| **2. Detailed UI and UX** | the look-and-feel topic is answered | Strongest · high. Ask first unless the profile says not to. On Full automation, use the current model. | the agreed layout as the full design: tokens, states, spacing, motion, interactions, light and dark |

Before the repo exists, write to `kickoff/` instead of `docs/`. `name` moves it.

## Screen by screen

At both stages, draw one screen at a time. When it's done, show it: open the prototype at its `#id` in a browser if you can, or give the full path (double-click it, or drag it into a browser). One line on what it is, then ask: *"What would you change?"* (on Full, at either stage: *"Tell me any time"*, no wait). Start the next screen at once. Fold the answer into its screen while the next one draws. Never hold screens back for the whole set.

Auto grill is the one exception: in auto mode, hold screens for the review (`grill`'s `references/auto.md`). On Full automation, auto grill holds them too, and nothing waits on the review.

## The prototype

One file, `docs/wireframes/index.html`. Stage 1 starts it; stage 2 details it.

- Each screen is a section with an `id`. Buttons and links go to the next screen in the flow, and a screen list jumps to any of them.
- Self-contained: inline CSS, inline SVG, inline script only. No fonts, images, scripts or styles from the network. **Done when** `grep -nE '(src|href)="(https?:)?//' docs/wireframes/index.html` finds nothing.
- Fake but realistic content.
- It's a drawing, not app code. Builders use it as the target and build with the UI kit.

## Stage 1: layout

1. **Read** `vision.md` and the grill log's main flow.
2. **List the screens:** every screen in the main flow, in order. Name each one the way the person would.
3. **Draw each screen,** screen by screen: an ASCII sketch under "Screens" in `design.md` (what's on it, what each action does), and a grey-box section in the prototype. System font, greys only.
4. **Follow the grill.** A new `must` feature or a floor item (sign-in, delete my data) adds or changes a screen. The MVP cut drops the screens the MVP doesn't need. Say what changed.

**Done when** every screen the MVP needs is sketched and in the prototype, and the person has seen each one. On Full: and the review's FYI links them.

## Stage 2: detailed UI and UX

1. **Read** `features.md`, `mvp.md`, "Look and feel" in `design.md`, and the stage-1 screens with the person's notes.
2. **Theme tokens.** Turn "Look and feel" into tokens under "Theme tokens" in `design.md`: colours for light and dark (text contrast 4.5:1 or more in both), font stacks, type scale, spacing, radius, motion. In the prototype, every value is one of these, as a CSS variable on `:root`. Light and dark follow the device, plus a toggle.
3. **Detail each screen,** screen by screen, in stage-1 order. Keep the agreed layout unless the person asks. Add spacing, interactions (hover, focus, press, what opens and closes), motion, and the copy in the voice from "Look and feel". Update its sketch in `design.md`.
4. **The core screen's states:**
   - **Empty:** an icon, one line on why it's empty, and the first action.
   - **Error:** an icon, a title, a specific message, a next action and a reference ID.
   - **Loading:** a skeleton the shape of the real content, not a grey box.
5. **Below Full, revise until they say yes** to the full set. Change the sketches and the prototype together. A "yes" with changes is not a yes yet.
6. **Record it.** Run `git hash-object docs/wireframes/index.html` (it works without a repo). Add a row to `decisions.md`: `Wireframes approved: <date>, <hash>`, with the screens covered. Commit both files if there's a repo.

**On Full automation,** skip step 5's wait. Once the set is detailed, step 6's row reads `Wireframes: AI pick, not reviewed: <date>, <hash>`. Add the prototype's path to the review's FYI, or send one. A later change from the person is a changed screen (see "Rules").

**Done when** every MVP screen and the core screen's states are detailed in `design.md` and the prototype, and `decisions.md` has an approval row (on Full, the "AI pick, not reviewed" row) whose hash matches the file.

## Rules

- **Approval is once, for the full stage-2 set.** Per-screen comments are feedback, not approval.
- **A changed screen goes back through approval.** Redraw, show, and add a new approval row. The old row stays. On Full, a screen the agents change, in the first plan, during a pass or at a re-plan, gets a `Wireframes: AI pick, not reviewed` row and an ℹ️ FYI instead.
- **New screens later** (in `/join` or a big feature): both stages, for the new screens only, in the same prototype. Stage 1 once the flow is clear, stage 2 once the look is agreed.
