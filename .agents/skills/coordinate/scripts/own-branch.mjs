#!/usr/bin/env node
// The local gate only runs the loop's own branches (#131). Before `coordinate` step 6.1 checks out a pull
// request, run this from your checkout of main:
//   node own-branch.mjs <n> --repo owner/name
// It passes when the pull request's branch is in this repo, not a fork; its author has write access or higher;
// the branch is feat/<issue>-<name> or fix/<issue>-<name>; and that issue has a claim from a login with write
// access or higher, as a whole line in the claim's exact form: "Claimed by <session> at <time> · branch <name>".
// A Dependabot bump passes too, with no claim (#226): opened by dependabot[bot] from a dependabot/ branch in this
// repo, every commit Dependabot's and verified, and changing only dependency versions in existing package.json
// files and registry lockfiles (dependabot-bump.mjs).
// On a pass it prints the head's full sha. It reads the API only, and runs nothing from the pull request.
// Exit 0: the loop's own branch. 1: not, so never check it out or run it. 2: a usage or API error, including an
// access check with no answer (a proxy's 403, a 5xx, a rate limit, the network), or a bump's file list that doesn't
// match its pull request, whose head moved while it was read, or whose commit list doesn't match it. Only a real read, triage or none,
// or a 404 for the user, is "no write access". Where a proxy refuses the permission path, the token's own login
// is checked through the repo's `permissions` instead.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AccessUnknown, gh, pages, prArgs, writers } from "./agent-files.mjs";
import { DEPENDABOT, Unsettled, dependabotBump } from "./dependabot-bump.mjs";

// Plain characters only after the dash, so the name is safe to write into a command or a claim line.
const BRANCH = /^(?:feat|fix)\/(\d+)-[A-Za-z0-9._-]+$/;
const ONLY = "The local gate only runs the loop's own branches.";
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every file of pull request `pr`, read between two reads of it that name the same head and file count. */
function filesAt(repo, pr, pull) {
  const files = pages(`repos/${repo}/pulls/${pr}/files`);
  const again = JSON.parse(gh(`repos/${repo}/pulls/${pr}`));
  if (again.head?.sha !== pull.head?.sha) throw new Unsettled(`#${pr}'s head moved from ${pull.head?.sha} to ${again.head?.sha} while its files were read`);
  const listed = new Set(files.map((f) => f.filename)).size;
  if (listed !== pull.changed_files) throw new Unsettled(`GitHub listed ${listed} files, but #${pr} changes ${pull.changed_files}`);
  return files;
}

/** What dependabot-bump.mjs reads for pull request `pr`, through the API. */
function bumpReads(repo, pr, pull) {
  const contents = (path) => path.split("/").map(encodeURIComponent).join("/");
  return {
    files: () => filesAt(repo, pr, pull),
    commits: () => pages(`repos/${repo}/pulls/${pr}/commits`),
    mergeBase: () => {
      const base = JSON.parse(gh(`repos/${repo}/compare/${pull.base?.sha}...${pull.head?.sha}`)).merge_base_commit?.sha;
      if (!/^[0-9a-f]{40}$/.test(base ?? "")) throw new Unsettled(`GitHub gave no merge base for #${pr}`);
      return base;
    },
    text: (path, sha) => gh("-H", "Accept: application/vnd.github.raw+json", `repos/${repo}/contents/${contents(path)}?ref=${sha}`),
  };
}

/**
 * Pass for the loop's own branch: in `repo`, opened by a writer, and named by a writer's claim on its issue; or a
 * Dependabot bump in `repo`. `commentsOf(issue)` lists that issue's comments; `canWrite(logins)` returns the set of
 * them with write access; `bump` is what dependabot-bump.mjs reads.
 */
export function ownBranch(repo, pull, commentsOf, canWrite, bump) {
  const { ref = "", sha, repo: from } = pull.head ?? {};
  const where = from?.full_name;
  if (where?.toLowerCase() !== repo.toLowerCase()) return { pass: false, why: `The branch is in ${where ?? "a repository that's gone"}, not ${repo}. ${ONLY}` };
  if (pull.user?.login === DEPENDABOT) return dependabotBump(pull, bump);
  const issue = ref.match(BRANCH)?.[1];
  if (!issue) return { pass: false, why: `${ref} isn't a feat/<n>- or fix/<n>- branch with only letters, digits, dots, dashes and underscores after the dash. ${ONLY}` };
  const author = pull.user?.login;
  if (!author || !canWrite([author]).has(author)) return { pass: false, why: `#${pull.number} was opened by ${author ?? "a deleted account"} without write access. ${ONLY}` };
  // The whole line, in the claim's form. Backticks around the branch come as a pair or not at all.
  const claim = new RegExp(`^Claimed by \\S.* at \\S.* · branch (?:${escape(ref)}|\`${escape(ref)}\`)$`);
  const claimers = commentsOf(issue)
    .filter((c) => (c.body ?? "").split(/\r?\n/).some((line) => claim.test(line)))
    .map((c) => c.user?.login)
    .filter(Boolean);
  if (!claimers.length || !canWrite([...new Set(claimers)]).size) {
    return { pass: false, why: `No claim comment on #${issue} names ${ref} as a whole claim line from a login with write access. ${ONLY}` };
  }
  return { pass: true, why: `${sha}: ${ref} is this loop's branch for #${issue}` };
}

export function main(argv) {
  const { pr, repo } = prArgs(argv);
  if (!pr || !repo) {
    console.error("Usage: own-branch.mjs <n> --repo <owner>/<name>");
    return 2;
  }
  let r;
  try {
    const pull = JSON.parse(gh(`repos/${repo}/pulls/${pr}`));
    r = ownBranch(repo, pull, (issue) => pages(`repos/${repo}/issues/${issue}/comments`), (logins) => writers(repo, logins), bumpReads(repo, pr, pull));
  } catch (error) {
    // An access check with no answer is an API error, never "no write access": exit 2, so the next sweep retries.
    const why = error instanceof AccessUnknown || error instanceof Unsettled ? error.message : `Couldn't read #${pr} from the API: ${String(error.stderr || error.message).trim()}`;
    console.error(`${why}. Check nothing out.`);
    return 2;
  }
  (r.pass ? console.log : console.error)(r.why);
  return r.pass ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
