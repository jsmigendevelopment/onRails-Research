# Consistency check: read-only, before anything is built

You check one pass's issues against the plan. You didn't write them. **Read only.** Edit no file, no issue, no label. Your output is the report.

## Read

- `docs/mvp.md`, `docs/features.md`, `docs/pyramid.md`, `docs/design.md`, `docs/decisions.md`, `docs/wireframes/index.html`;
- every open issue in the pass's milestone, with its body: `gh issue list --milestone "<name>" --state open --json number,title,body,labels`. No GitHub yet? `docs/issues/`.

## Check

1. **Every `must` feature** in `features.md` that belongs in this pass has an issue.
2. **Every issue is in the MVP** or the pass's plan. Name the ones that aren't.
3. **Dependencies work:** each `Depends on #N` exists, says `Blocks` back, sits in this pass or an earlier one, and no chain loops back on itself.
4. **Every screen** in `design.md` for this pass has a slice that builds it.
5. **Every MVP screen has an approved stage-2 wireframe:** it's detailed in `design.md` "Screens" and in the prototype (a grey-box stage-1 layout doesn't count), and the latest "Wireframes approved" row in `decisions.md` matches `git hash-object docs/wireframes/index.html`.
6. **Every floor item** in `features.md` with a decision has an issue or a check that covers it (sign-in, who can see what, deleting personal data, and so on).
7. **Acceptance checks:** every issue has them, in the form `AC-<issue>-<n>: WHEN … THEN …` with no repeated ID. No two checks, in one issue or across issues, ask for opposite results. None contradicts `decisions.md`.
8. **No `[NEEDS CLARIFICATION]`** is left on an issue labelled `status:ready`. List every open marker either way.
9. **Every issue has** a `Complexity:` line of 7 or under, a fence, a lane, a priority and a `Skills:` line.
10. **The pass fence:** no open issue sits in a later pass's milestone. In the MVP, no insisted slice is above pass 2, and a pass 4 has its row in `decisions.md`.
11. **Thin steps:** run `node .agents/skills/pyramid/scripts/check-plan.mjs docs/pyramid.md` and report each error it prints. Every step in the table has one issue, and every issue has a "Try it" line that a person could follow on the test site. Name any issue that builds only a layer (the schema, the API or the screens alone), and any at complexity 5 to 7 whose reason doesn't say why it can't be cut.

**Done when** every item above has a result for every issue in the pass.

## Report

Reply with this, and nothing else. Under 40 lines.

```text
Consistency check · pass <N> · <date> · <k> issues read
Clean: <yes | no>

1. [<check number>] <what's wrong, with issue numbers and the doc line> → <new issue | fix #<n> | ask the person>
2. ...
```

Suggest where each gap goes. The issue writer decides and does it.
