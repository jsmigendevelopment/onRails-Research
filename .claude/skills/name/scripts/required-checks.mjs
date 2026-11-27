// Which checks main requires, for setup-github.mjs: at most `onrails/check`, the commit status the
// local merge gate posts through the REST API (`coordinate`). Never a GitHub Actions check: the kit's
// repos run no workflows (`ci = "local"` in docs/stack.md), and a required check that never reports
// blocks every merge. For the same reason, `onrails/check` is required only where a probe status
// posted: some sessions can't post commit statuses (a proxy that refuses the write).

/** The one required status: the local merge gate's. */
export const LOCAL_CHECK = "onrails/check";

/** The context of setup-github's probe status. Nothing requires it. */
export const PROBE_CHECK = "onrails/setup-probe";

/** The checks the kit's old workflows reported. A rule that still requires one waits forever. */
export const ACTIONS_CHECKS = ["checks", "secrets", "agent-files", "ci", "pr-rules", "issue-link", "size", "preview", "visual", "semgrep", "supply-chain", "research", "web-e2e"];

/** The required status checks for a new ruleset, when the probe status posted. */
export const requiredChecks = () => [{ context: LOCAL_CHECK }];

/**
 * An existing ruleset's rules with the old workflows' checks swapped for `onrails/check`, or null
 * when nothing changes. Any other required check stays. When statuses can't be posted (`canPost`
 * false), `onrails/check` goes too, and so does the status rule if nothing is left in it.
 */
export function localChecks(rules, canPost = true) {
  const checks = rules.find((r) => r.type === "required_status_checks");
  const listed = checks?.parameters?.required_status_checks ?? [];
  const kept = listed.filter((c) => !ACTIONS_CHECKS.includes(c.context) && (canPost || c.context !== LOCAL_CHECK));
  if (!canPost && !kept.length) return checks ? rules.filter((r) => r !== checks) : null;
  const want = !canPost || kept.some((c) => c.context === LOCAL_CHECK) ? kept : [...kept, { context: LOCAL_CHECK }];
  if (checks && want.length === listed.length && want.every((c, i) => c === listed[i])) return null;
  if (!checks) return [...rules, { type: "required_status_checks", parameters: { strict_required_status_checks_policy: true, required_status_checks: want } }];
  return rules.map((r) => (r === checks ? { ...r, parameters: { ...r.parameters, required_status_checks: want } } : r));
}
