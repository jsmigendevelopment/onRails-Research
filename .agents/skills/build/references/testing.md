# Testing

How agents write tests in this kit. The short version lives in the `build` and `pr-review` skills. This page has the reasons.

The goal is tests that catch real breaks, not tests that pad a number.

## 1. Tests first for every acceptance check

Every `auto` acceptance check on an issue becomes a test before its code. Each check has an ID (`AC-12-2: WHEN … THEN …`), and the test's title starts with it, so a reviewer can find the test for every check with one search. Run it, watch it fail, then build until it passes. Take the checks one at a time, not all the tests first and then all the code: a batch of tests written up front tests what you imagined, not what you built.

**Why:** a test written first is a statement of what "done" means, made before the code can bend it. Acceptance tests written first and run by someone else added 34–48 points on one benchmark ([evidence](evidence.md)).

## 2. Strict red/green for bugs and core logic, not for everything

The loop is red, green, refactor. **Red:** one failing test, failing for the right reason. **Green:** the least code to pass it. **Refactor:** tidy names and repeats while every test stays green, with no new behaviour. Then the next test. Strict red/green means small steps, one small test per cycle. Use it for:
- **every bug:** first a test that reproduces it and fails, then the fix;
- **core logic:** business rules in a service, permissions, money, anything the core slice depends on.

For the rest (wiring, a simple screen, config), write each acceptance test before its code, then build in bigger steps.

**Why:** the owner's own runs found strict TDD on easy issues cost 1.5–2× the turns with no measured gain. The payoff is on code where a quiet mistake is expensive, so that's where the cost goes.

## 3. Test behaviour through the public interface

Call what a user or another module would call: the service method, the controller, the hook, the rendered screen. Assert on what comes out and what changed. Don't reach into private functions, internal state or the order of internal calls.

**Why:** a test tied to internals breaks on every refactor even when nothing is wrong, and passes when the behaviour is broken in a way the internals don't show.

## 4. Mock only at the edges

Mock or fake the things you don't control: the network, outside APIs, the clock, randomness. Use the module's in-memory repository fake instead of mocking the database calls one by one. Don't mock your own services or helpers.

**Why:** every mock is a guess about how the real thing behaves. Guess at the edges, where you have to, and let the real code run everywhere else.

## 5. No snapshot tests for logic

Snapshots are fine for a stable serialised output you'd review by eye, like a generated file. They are not a test of logic or of a screen's behaviour. Assert on the specific values that matter.

**Why:** a snapshot fails on any change, so people update it without reading it. Then it passes on the bug too.

## 6. Each test would fail without the change

Before you call a test done, ask: if I undo the change, does this fail? If not, it tests nothing. A good check is to break the code on purpose for a moment and see the test go red.

The expected value must come from somewhere else: the issue, a worked example, a known literal. A test that recomputes it the way the code does (`expect(total(items)).toBe(items.reduce(...))`) passes by construction and can never catch a bug.

**Why:** a test that always passes gives false comfort, which is worse than no test.

## 7. Never weaken a test

Don't skip, delete, loosen or rewrite a test to make it pass, including tests from earlier slices. If a test looks wrong, stop and say why. This is standing rule 7 in `AGENTS.md`.

## 8. Tests the conventions need

Some conventions in [app-conventions.md](app-conventions.md) only hold if a test pins them. When a change touches one of these, it brings the test:

| Area | Test |
|---|---|
| Money | rounding (half-even unless decided otherwise), splitting with a remainder so the parts add up to the whole, a zero-decimal currency, a negative amount, mixed currencies rejected |
| Time | a fixed injected clock; a day with 23 hours and one with 25; a local time that doesn't exist and one that happens twice; a calendar date that doesn't shift by zone |
| Error and empty states | the error component shows the title, the code's message, the next action and the reference ID; the empty state shows its action. Never a raw `error.message` |
| Logging | the logger masks secrets, tokens and emails; an error is logged once |
| Events | every `track()` name is in the registry and matches `object_action` |
| Env | a missing variable fails with its name and never its value; `.env.example` and the schema list the same names |
| Access | for each action, one user who may and one who may not; someone else's object returns "not found" |

**Why:** these are the places where a quiet mistake costs real money, leaks data or breaks for users in one time zone. A test is the only thing that keeps them true after the next refactor.

## What the reviewer checks

The `pr-review` skill checks, for each pull request:
- every `auto` acceptance check has a test with its ID in the title, and it would fail without the change;
- bug fixes come with a test that reproduces the bug;
- tests go through the public interface and mock only at the edges;
- no snapshot stands in for a logic test;
- the area tests in rule 8, for any change that touches money, time, error or empty states, logs, events, env or access;
- no test was weakened, skipped or deleted.

---

The loop and the rule on expected values are based on Matt Pocock's [tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) (MIT).
