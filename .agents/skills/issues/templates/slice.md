---
name: Slice
about: One step of a slice: the smallest change a person can try, built by one agent alone
title: "[pass N] <slice>: <what a user can do after this>"
---

## Goal

<!-- One or two sentences. What a user can do once this is merged. -->

## Try it

<!-- What the person does on the test site once this is merged, and what they see. One or two sentences.
     From the step's row in docs/pyramid.md. No try line, no issue: it's part of another step. -->

## Why

<!-- Link the vision, MVP or feedback this comes from. -->

## Pyramid

- **Slice:** <!-- name --> · **Role:** core / support / insisted
- **Pass:** 1 / 2 / 3 · **Step:** <!-- its number in docs/pyramid.md -->

## Acceptance checks

<!-- Written before the build. One result each. The test that proves it has the ID in its title.
     auto  = becomes an automated test that the local gate runs on every pull request
     agent = needs judgement; a fresh agent checks it on the preview before merge
     Unsure? Write [NEEDS CLARIFICATION: <question>]. The issue can't be status:ready until it's answered. -->
- [ ] `auto` AC-<issue>-1: WHEN  THEN 
- [ ] `auto` AC-<issue>-2: WHEN  THEN 
- [ ] `agent` AC-<issue>-3: WHEN  THEN  <!-- the steps to click, and what you should see -->

## Out of scope

<!-- The fence. Nearby things this issue must not do. -->
- 

## Dependencies

- **Depends on:** #
- **Blocks:** #

## Touches

- **Modules:** <!-- e.g. features/lists, features/auth -->
- **Decoupled:** yes / no <!-- if no, list the issues it may conflict with -->

## Risk flags

<!-- Tick any that apply. One tick puts the issue in the risky lane: security review plus the human gate below Full (on Full, an extra review). -->
- [ ] Auth or permissions
- [ ] Secrets or config
- [ ] Personal data
- [ ] Money
- [ ] Schema or migration
- [ ] New dependency
- [ ] API contract change

**Lane:** tiny / normal / risky

## Routing

**Complexity:** <!-- 1–10 · one-line reason. Aim for 4 or under. At 5 to 7, say why it can't be cut. Above 7: split it. The scale is in the issues skill. -->
**Override:** <!-- Leave blank to use the routing table. -->

**Priority:** p0 / p1 / p2 / p3
**Skills:** `build`, <!-- up to two more, named exactly -->
**Recipes:** <!-- the default libraries this needs, by recipe name: form, table, charts, markdown, highlight, virtual, hotkeys, start, router, query. Leave blank if none -->
