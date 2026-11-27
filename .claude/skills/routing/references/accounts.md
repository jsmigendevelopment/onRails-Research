# Accounts: a fixed split by job or project

Some people have more than one subscription account: a work one and a personal one, or a client's account for the client's project. Each account owns its own projects and jobs. The person sets the split. It never changes because of usage.

## The rule

- **Never rotate accounts.** Never spread, balance or move work between subscription accounts because one is near or at its usage limit. Never fall back to another account.
- **At a limit, that account's work waits** for its reset. Say so in an ℹ️ FYI with the reset time. Keep doing work that belongs to other accounts as normal.
- **Why:** providers' terms can treat moving work to dodge a limit as account rotation or limit evasion. That risks a suspended account, and losing the account you build with stops everything.

## Ask once

`/idea` asks while the wireframes draw; `/join` asks once, with the keys. The profile's `[accounts]` already filled in? Confirm it in one line instead.

Ask in plain words:
1. *"Do you use more than one Claude or Codex account, like a work one and a personal one?"* Recommend: no, unless the jobs are really separate.
2. *"Which projects belong to each? This one?"*
3. *"Any jobs that always run on one account, like the overnight loop or the builders?"* The job names are in `routing` under "Where a job runs".

No other accounts? Leave `[accounts]` empty and stop. Every job runs on the account you're signed in with.

## Sign each one in

One "Setup step for you" (the `ask` skill) per account. Each account gets its own config folder, so both stay signed in at once. The person runs these in their own terminal. Never sign in for them, and never open the folder's credential files.

**Claude Code** (verified against `claude auth --help` 2.1.331 and code.claude.com/docs/en/authentication, "Log in with multiple accounts", 2026-11-24):

```text
Setup step for you · sign in <label> to Claude Code · about 3 minutes

1. In your own terminal, run:
   CLAUDE_CONFIG_DIR=~/.claude-<key> claude auth login
2. Sign in with the <label> account in the browser that opens.
   No browser opened? Press c to copy the link and open it yourself.
   The page shows a code? Paste it at "Paste code here if prompted".
3. Add this line to ~/.bashrc or ~/.zshrc, then open a new terminal:
   alias claude-<key>='CLAUDE_CONFIG_DIR=~/.claude-<key> claude'
4. Want /or: commands there too? Run claude-<key> plugin marketplace add jsmigendevelopment/onRails,
   then claude-<key> plugin install core@onrails --scope user. The repo's own skills work either way.

When it worked: CLAUDE_CONFIG_DIR=~/.claude-<key> claude auth status --text names the <label> account.
Stuck? It shows your usual account: the CLAUDE_CONFIG_DIR= part was missing from that line.
```

- Each folder keeps its own settings, history, plugins and login. A new folder starts empty.
- There is no device-code sign-in for Claude Code. On a machine with no browser, use the copied link and the pasted code.
- `claude setup-token` makes a one-year token for a headless run with no browser sign-in (a server; never GitHub Actions). It is a secret: it goes only through the `secrets` checklist, never chat. The steps above don't need it.
- Windows PowerShell: `$env:CLAUDE_CONFIG_DIR="$HOME\.claude-<key>"; claude auth login`.

**Codex** (verified against `codex login --help` 0.171.0 and the openai/codex source, 2026-11-24):

```text
Setup step for you · sign in <label> to Codex · about 3 minutes

1. In your own terminal, run:
   mkdir -p ~/.codex-<key>
   CODEX_HOME=~/.codex-<key> codex login
2. Sign in with the <label> account in the browser that opens.
   No browser on this machine? Add --device-auth to that line, open the link on any device and type the code it shows.
3. Add this line to ~/.bashrc or ~/.zshrc, then open a new terminal:
   alias codex-<key>='CODEX_HOME=~/.codex-<key> codex'

When it worked: CODEX_HOME=~/.codex-<key> codex login status says you're logged in.
Stuck? "CODEX_HOME points to ... does not exist": run the mkdir line first.
```

## Write the profile

Write one table per account to `[accounts]` in `docs/profile.toml`, and in `~/.onrails/profile.toml` if the person keeps one. Then a `docs/decisions.md` row: *"Accounts: <label> owns <projects/jobs>; fixed, never by usage."* `npx onrails accounts` lists them; `npx onrails doctor` checks each folder exists.

## Which account owns a job

- An account owns a job when the project is in its `projects` (or it lists `"*"`) and the job is in its `jobs` (or it lists `"*"`).
- A project named outright beats `"*"`.
- Nothing matches: the account this session runs on.
- Two match equally: below Full, ask the person (a ⏳ decision). On Full, take the one listed first in `[accounts]`, record it as "AI pick, not reviewed" and put it in the FYI. Never pick by usage.
- **This session's account:** the one whose `config_dir` matches `CLAUDE_CONFIG_DIR` or `CODEX_HOME` (unset means `~/.claude` or `~/.codex`). A cloud session runs on the account named in its brief. Not sure? Ask once.

## A job for another account

Don't run it here. Write a ready-to-paste prompt for that account's session, put it in the message (and on the board as an ℹ️ FYI), and keep going with this account's work:

```text
For <label> (<tool>) · <job> · <project>
Cloud:  CLAUDE_CONFIG_DIR=<config_dir> claude --cloud "<the brief>"
Local:  CLAUDE_CONFIG_DIR=<config_dir> claude "<the brief>"
The brief: This session runs on the <label> account. <the job's normal brief: issue, branch, skills to use>.
```

For Codex: `CODEX_HOME=<config_dir> codex "<the brief>"` local, or `CODEX_HOME=<config_dir> codex cloud exec --env <env id> "<the brief>"` in the cloud (experimental). Show the cloud line first when `[sessions] prefer = "cloud"` and the job can run in the cloud (`routing`, "Where a job runs"). `claude --cloud` starts the session on the account that folder is signed in to, for the current repo.
