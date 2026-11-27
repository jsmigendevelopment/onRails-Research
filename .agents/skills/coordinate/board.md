# The board

One page per project that the person can keep open instead of watching threads. `scripts/board.mjs` builds it. It needs no packages and makes no API calls.

## Where it lives

- `~/.onrails/boards/<project>.md`, outside the repo. Never commit it, and never add it to `.gitignore`. It isn't in the repo to begin with.
- `<project>.events.jsonl` next to it. It's append-only, so many threads can write at once.
- `[board] dir = "<folder>"` in the profile moves both, for example to a Google Drive folder you can open on your phone.
- `[board] sheet = "<Google Sheet URL>"` adds a Google Sheet copy that cloud threads can update (below).

## Events

Every agent that starts, opens a pull request, finishes or needs the person adds one event:

```bash
node .agents/skills/coordinate/scripts/board.mjs event started issue=12 title="Notes list" thread="builder-12"
```

| Type | Who adds it |
|---|---|
| `started` | `build`, when it begins an issue |
| `pr-opened` | `build`, with `issue=` and `pr=` |
| `review` | `pr-review`, `qa`, `pr-security`, with `pr=` and `verdict="..."` |
| `needs-you` | `notify.mjs` adds it for you when you use the `ask` skill |
| `decision` | the coordinator, when the person answers |
| `merged` | the coordinator, after each merge |
| `finished` | `build`, when its run ends |
| `failed` | the coordinator, when it parks an issue |
| `fyi` | `notify.mjs --level fyi`, or anyone with a heads-up |

JSON works too: `event started '{"issue":12,"title":"Notes list"}'`. If the home folder can't be written (a cloud thread), the event is skipped. GitHub labels carry the news instead.

## Render

After each sweep, save the two lists you already fetched to the cache, then render. The cache is the board's folder: the `board` path from `board.mjs path`, without its file name. Local mode reads these same files while GitHub is rate-limited (`references/local-mode.md`).

```bash
gh issue list --state open --limit 200 --json number,title,labels,url,updatedAt > <cache>/<project>-issues.json
gh pr list --state open --json number,title,url,headRefName,labels,isDraft,updatedAt > <cache>/<project>-prs.json
node .agents/skills/coordinate/scripts/board.mjs render --github <cache>/<project>-issues.json --github <cache>/<project>-prs.json
```

These are the sweep's own batched reads, not extra ones. The board then shows:

- 🛑 **Needs you now** and ⏳ **Waiting on your decision:** local asks, plus any issue labelled `needs-human` (with `blocker`, it's "now");
- 🔨 **Being built:** local `started`, plus issues labelled `status:in-progress` (cloud threads);
- 🔍 **In review:** open pull requests, matched to issues by the `feat/<issue>-` branch name;
- ✅ **Merged today** and ℹ️ **FYI:** these roll off after a day.

The presence status is at the top, and each section says when it was last updated.

## The Google Sheet

When the profile sets `[board] sheet` and you have the Google Sheets connector, the board is also a sheet: one tab per project, plus an "All projects" tab. **This step is untested.** Check the first write by eye.

**No sheet yet?** On Full, don't offer: put the question in the next ℹ️ FYI, write nothing to the profile, and go on. Below Full, offer once: *"Want your board as a Google Sheet so you can see it from your phone and cloud threads can update it?"* On a yes, create a spreadsheet named "onRails board" and put its URL in the home profile under `[board] sheet`. On a no, write `sheet = "off"` there, so nobody asks again.

**Once per tab** (it isn't there yet), set it up and format it in one call:

```bash
node .agents/skills/coordinate/scripts/board.mjs sheet-setup --tabs "<existing project tabs, comma separated>" [--create-all]
```

- Add `--create-all` only if the sheet has no "All projects" tab yet.
- Send its `requests` array as one `spreadsheets.batchUpdate`.
- That gives you:
  - a frozen top line and header;
  - a colour per section in the Section and Status columns (red for needs you now, amber for waiting on a decision, blue for being built, purple for in review, green for merged today, grey for FYI);
  - light banding on the other columns;
  - column widths;
  - the "All projects" formula, which stacks every project tab, so no thread ever overwrites another's rows.

Formatting is never sent again. Values change, the rules stay.

**Every sweep,** write the values. That's one clear and one write, nothing more:

```bash
node .agents/skills/coordinate/scripts/board.mjs rows --github <cache>/<project>-issues.json --github <cache>/<project>-prs.json
```

1. It prints `clearRange`, `range`, `valueInputOption` and `values`.
2. Clear `clearRange` (`values.batchClear`).
3. Write `values` to `range` with `USER_ENTERED` (`values.update`). Row 1 is "Updated <time> · presence <status>". Row 2 is the header. Links are `HYPERLINK` formulas.

`rows` without `--github` reuses the last snapshot that `render` saw.

**Limits.** Sheets allows about 60 write requests a minute per user. A sweep every 10 minutes uses 2, so it stays far under. Never write one row at a time in a loop.

**Who writes:**

- **The coordinator** (local or cloud) rewrites its project's tab after every sweep.
- **`back`** rewrites it once, when the person returns.
- **`ask`** in a thread that isn't the coordinator appends one row (`values.append`) instead of rewriting the tab. The next sweep replaces it.
- **Local threads without the connector** write only `board.md`. The next thread that has the connector syncs it.
- **Cloud threads without the home folder** rely on GitHub labels. The coordinator's render picks those up.

## The Presence tab

Presence is personal and covers every project, so it lives in one "Presence" tab of the `[board] sheet`, not per project. It is the only copy of `/afk` off the person's machine. Never put presence in a repo: no issue, file, commit or variable. Repos can be public.

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Status | Since (UTC) | Until (UTC) | May merge | Pings | Machine |
| `away`, `here` | when it was set | the hard stop, or blank | the `/afk` merge rule | the `/afk` ping rule | the machine label |

Nothing else goes in it: no note, project or name. It isn't a project tab, so leave it out of `sheet-setup --tabs`.

- **Write** (`afk`, `back`): run `node .agents/skills/afk/scripts/worklog.mjs presence sheet`. Write its `values` to its `range` (`values.update`, `RAW`). Create the tab first if it's missing. Can't write? Send an ℹ️ FYI (`notify.mjs --level fyi`) and carry on. It never blocks.
- **Read** (`coordinate`, `back`): read `Presence!A1:F2` (`values.get`), then run `worklog.mjs presence --shared '<the values as JSON>'`. It picks the local file or the sheet, whichever is newer, says which in `source`, and turns a stale away into `unknown`.
- **Stale:** an `away` past its Until, or set over 24 hours ago, counts as `unknown`. Follow normal rules, and mention it at `/back`.
- **No sheet set up:** there's no shared copy. A cloud session won't know about an `/afk` from another machine. Say so once, when it matters.
