---
name: name
description: Use to name a new app and set up its repo ("help me name this", "what should we call it", the intermission in /idea after the product grill). Suggests names, asks about visibility and licence, runs git init, connects GitHub if the person wants it, and moves the kickoff notes into docs/.
---

# Name: the intermission

Naming waits until now because you can't name something before you know what it is.

## Steps

**On Full automation, ask nothing.** Take the review's pick (else your step 2 pick), the profile's `repo_visibility` (default private), no licence, and the owner from `docs/profile.toml` or the signed-in `gh` account. `gh` signed in? Create the repo in step 5 without asking. Not signed in? Carry on locally. Record each as "AI pick, not reviewed".

1. **Ask about style first.** Does the person have a naming convention, a theme, or names they like? Does the domain or app-store name need to be free?

2. **Suggest 5–7 names** in a table: the name, what it means, why it fits this product, and any risk you know of (an existing product, a hard spelling). Check every name against the competitor scan (`docs/research/competitors.md` or `kickoff/research/competitors.md`) and drop any that's close to a competitor's. Mark your pick. Don't claim a domain or trademark is free unless you actually checked.

3. **Once a name is picked, ask:**
   - Public or private repo? **Default: private.**
   - A licence? **Default: none** while private. If it's public and meant to be copied, suggest MIT.
   - Personal account or an organisation?
   - Does your school or employer have rules about where code lives?

4. **Make it a git repo now.** Run `git init` in this folder if it isn't one already. Add a `.gitignore` that covers `.env*`, secrets and build output. Move `kickoff/` into `docs/` (wireframes still drawing? Wait for them first). Write a short `README.md`: the name and one line on what it does. Then run `npx onrails signature --write README.md` to end it with the person's signature. Exit 3: the profile has no `[me.signature]`, so skip quietly. Any other failure: tell the person what it printed. Never write a signature by hand. Then make the first commit.

5. **Create the GitHub repo for them.** Ask: *"Create a private repo `<owner>/<name>` and push to it?"* (the owner comes from `docs/profile.toml` or the question in step 3). On a yes, run:
   ```bash
   gh repo create <owner>/<name> --private --source . --remote origin --push
   ```
   Use `--public` if they chose public. If `gh` isn't signed in, ask them to run `gh auth login` first. If they'd rather create it themselves, wait for the URL, then add it as the remote and push. In slice 0, set up GitHub for them with `scripts/setup-github.mjs` from this skill (see `pyramid` step 1). It requires no GitHub Actions check: where the plan allows a rule on main, it asks at most for the `onrails/check` commit status, which the local merge gate posts. It posts one probe status first; if GitHub refuses it (some sessions can't post statuses), main requires no status, and the output says why: put that line in the FYI. A later session that can't post the status runs it again, and the requirement goes. Never add a workflow to the repo: `docs/stack.md` says `ci = "local"`.
   - If they'd rather wait, carry on locally. Issues are written as files until there's a remote (see `issues`).

6. **Record** the name, visibility, licence and remote in `docs/decisions.md`.

Then go back to `/idea` step 6: approve the wireframes.
