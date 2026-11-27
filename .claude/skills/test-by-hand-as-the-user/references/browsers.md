# Testing in Claude in Chrome or the built-in browser

Your host may ship its own skill for each browser (Claude Code: `chrome-browser` and `built-in-browser`). Read it first: it's the source, and this file is the short version. Checked 2026-11-26.

## Which browser

| | Claude in Chrome | The built-in browser |
|---|---|---|
| What it is | An extension in the person's real Chrome, with their sign-ins | A browser pane in the Claude desktop app, with its own saved sign-ins |
| Its tools | `mcp__claude-in-chrome__*` | `mcp__Claude_Browser__*`, or `mcp__remote-devices__Claude_Browser__*` from a cloud session linked to the computer |
| Only an `enable__...` tool shows? | Call `enable__mcp__claude-in-chrome` first | Call `enable__mcp__remote-devices__Claude_Browser` first |
| Can't open | Nothing special | `localhost` or `file://` from your own shell: it runs on the person's computer, not where you run. Use the preview or the test site. |

Both act as the person. Their sign-ins are the person's: never sign out, change a setting or act on an account beyond the test.

## Steps

1. **Load the tools in one call.** Deferred tools load through ToolSearch. Claude in Chrome: one `select:` list with `tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `read_page`, `computer`, `tabs_close_mcp`, `read_console_messages` and `read_network_requests`. The built-in browser: one query for the whole prefix.
2. **Look, then open your own tab.** Read the tab list first (`tabs_context_mcp` or `tabs_context`). Work in a new tab (`tabs_create_mcp`, or `preview_start` with the URL). Use one of the person's tabs only when they ask. A tab ID from another session is stale: read the list again.
3. **Read the page as text** (`read_page`, `get_page_text`) for the values in your table. Take a screenshot (`computer`) for each fail and when the layout is the point.
4. **Read the console with a filter.** `read_console_messages` with a `pattern` keeps only the app's lines. `read_network_requests` shows failed calls and what they answered.
5. **Close the tabs you opened** before you report.

## Stop and say so

- **A site waits for the person's permission?** Below Full, tell them and wait. On Full, skip it, list it as not tested and put it in the FYI. Declined? Skip it and list it as not tested. Never work around it.
- **Alerts and confirm boxes freeze the extension.** Don't click what raises one, such as Delete. A test needs it? Below Full, warn the person first. On Full, don't click it: list it as not tested and put it in the FYI. Stuck on one? Below Full, ask them to close it in Chrome. On Full, leave that tab, list what's left in it as not tested and put it in the FYI.
- **Not connected, or no answer?** Say so once. Don't retry in a loop.
- **The same action fails 2 or 3 times?** Stop and say what you tried. Below Full, ask how to go on. On Full, mark that row not tested, put what you tried in the FYI and go on with the rest.
