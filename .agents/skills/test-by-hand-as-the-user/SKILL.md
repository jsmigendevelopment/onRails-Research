---
name: test-by-hand-as-the-user
description: Use when an agent tests a change by hand, clicking through the app like a person, in the person's browser, the built-in browser or one it drives ("test it by hand", "click through it like a user", "check it in my browser", "is the number right") - asks first in the person's accounts, never clicks what costs, sends or deletes, predicts every output before looking, moves every input across its range, and reports an input, expected, actual, pass or fail table.
---

# Test by hand as the user: check that it's right, not that it shows up

You click through the app the way a person would: in the person's own browser (Claude in Chrome), the built-in browser, or a browser you drive one step at a time. The automated suite (`test:e2e`, Playwright in the local gate) stays in `build` and `qa`.

The failure this stops: the page renders, and the number on it is wrong. An agent changed a video length estimate, saw the page load, and reported it working. The estimate said 0 minutes for every choice.

## Before you start

1. **In the person's own browser or accounts, ask first.** Name the site, the account and what you'll click, and wait for a yes: these are the person's own logins. A work or live account gets "read and look only" unless the person says otherwise. On Full automation the person's own logins are parked (`AGENTS.md`): test on the preview or in a browser you drive, and put the look in their browser in the FYI.
2. **Never click what costs money, sends something or can't be undone:** generate, publish, pay, send, invite, delete. A test needs one? Use a test account or the preview, or stop and ask.
3. **Predict before you look.** Write down every input you'll try and the output you expect for each. Take the values from the issue, the diff and plain arithmetic, never from the screen. Lengths of 30 seconds, 1, 2, 3 and 5 minutes should give estimates of about 30 seconds, 1, 2, 3 and 5 minutes. **Done when** the predictions are in your message or notes before the first page load. No prediction, no test.

## While you test

4. **Test what changed, not the page around it.** Read the diff. Check every value, rule and formula it touched, directly.
5. **Move every input across its range:** the smallest, the largest, a middle value, and every option of a short list. The output must change when the input changes, in the right direction. **Done when** every prediction has the actual value you read from the page next to it.
6. **These are always a fail:** 0, blank, `NaN`, `undefined`, `Infinity`, a negative number where none makes sense, the same value for every input, a spinner or placeholder that never ends, and a number further from your prediction than the issue allows.
7. **Compare with before** where you can: main, the test site or the old version. A change that wasn't meant to alter an output must leave it the same.
8. **Watch the console and the network:** errors, failed requests, and responses that don't match the screen.
9. **Run the error and empty states and the phone size,** as in `qa`, step 3.

## Report

10. **Report the table.** "It works" or "looks good" without it is not a result.

    | Input | Expected | Actual | Result |
    |---|---|---|---|
    | 2 minutes | about 2 min | 0 min | fail |

11. **Show proof:** a screenshot of each fail, plus the inputs and outputs you read.
12. **Every bug you find by hand becomes a test.** The fix's pull request gets a unit or Playwright test with your expected values, red before the fix (`build`, step 5). Not the one fixing it? Put the expected values in the bug issue, so the builder can. Found nothing? Name the `auto` checks the change was missing.
13. **Say what you didn't test, and why:** "Didn't click Generate: it costs credits."
14. **Clean up:** close the tabs you opened and stop the servers you started. **Done when** your report has the table, the proof and the untested list, and nothing you started is still running.

## References

| File | Load when |
|---|---|
| `references/browsers.md` | You test in Claude in Chrome or the built-in browser: loading the tools, a new tab, site permissions, dialogs to avoid. |
