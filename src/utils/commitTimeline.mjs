/**
 * Pure commit-classification + timeline-grouping logic for the Tech Team
 * dashboard tab (src/components/views/TechTeamView.jsx). Shared with
 * tests/commit-timeline.test.mjs.
 *
 * Pure module — no React/Firebase imports.
 *
 * MONTH_NAMES_FULL/ABBR are defined here (not in constants.js) because
 * constants.js re-exports CHART_COLORS from './colors' without an explicit
 * extension, which plain Node ESM can't resolve — so constants.js itself
 * isn't Node-importable. This module IS, so it's the single source of truth
 * for the month-name arrays; constants.js re-exports them from here.
 */

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTH_NAMES_ABBR = MONTH_NAMES_FULL.map((m) => m.slice(0, 3));

export const FEATURE_RE =
  /^(add|added|implement|introduce|create|build|new|redesign|replace|migrate|launch)\b/i;
export const FIX_RE = /^(fix|fixed|harden|secure|resolve|patch)\b/i;

// Ordered project/category classifier — first matching rule wins. Heuristic and
// easy to tune; mirrors the app's functional domains.
// Ordered most-specific → most-generic so domain keywords win over catch-alls.
// "Practice & Roster" leads the list: its keywords (practice composition,
// seniority, activation date, roster) would otherwise be shadowed by "admin"
// (Security & Auth), "attorney" (Team & Attorneys), or "overflow"/"view"
// (UI & Styling) further down — rule ORDER, not just presence, is what keeps
// e.g. "Add admin-only Practice Composition tab..." out of Security & Auth.
// Stems intentionally omit a trailing \b so plurals/gerunds match
// ("download" → "downloads", "styl" → "styling", "format" → "formatting").
export const CATEGORY_RULES = [
  ["Practice & Roster", /\b(practice\s*composition|seniority|activation[ -]?date|roster)/i],
  ["Utilization & Targets", /\b(utiliz|target|ooo|holiday|pro[- ]?rat|capacity|quarterly|variance|business[- ]day|predictive|time[- ]?off|calendar)/i],
  ["Clients", /\bclient|ideal|\bquiet/i],
  ["Billing & Invoices", /\b(billing|invoice|payment|reminder|mercury|reconcil|revenue|mark[- ]paid|kpi|adjustment)/i],
  ["Document Downloads", /\b(download|drive|document|folder)/i],
  ["Matters", /\bmatter/i],
  ["Transactions", /\btransaction/i],
  ["Ops", /\b(ops|sunburst)\b/i],
  ["Calculations & Tooltips", /\b(tooltip|calc|undercount|audit|sanity)/i],
  ["Team & Attorneys", /\b(attorney|team member|rate|role|hid|earning)/i],
  ["Data & Sync", /\b(firebase|firestore|schema|data format|query)/i],
  ["Security & Auth", /\b(auth|login|sign[- ]?in|admin|permission|sec-\d|security|token|oauth|domain|redirect|leak)/i],
  ["Setup & Platform", /\b(initial commit|migrate|next\.?js|vite|readme|eslint|lint|refactor|template|workflow|build|tech team|commit[ -]?histor)/i],
  ["UI & Styling", /\b(ui|styl|chart|label|layout|navigation|date range|time[ -]?frame|sort|format|overflow|spacing|header|page|view|display|dashboard|frontend|component|small fix|minor)/i],
];

export function classify(c) {
  if (c.isMerge) return "Merges & PRs";
  for (const [label, re] of CATEGORY_RULES) if (re.test(c.message)) return label;
  return "Other";
}

// Commit "type" — conveyed with a TEXT badge (not color alone) for WCAG 1.4.1.
export function commitType(c) {
  if (c.isMerge) return { label: "Merge", cls: "bg-meta-light text-meta-text" };
  if (FEATURE_RE.test(c.message))
    return { label: "Feature", cls: "bg-status-success-light text-status-success-text" };
  if (FIX_RE.test(c.message))
    return { label: "Fix", cls: "bg-status-warning-light text-status-warning-text" };
  return { label: "Update", cls: "bg-gray-100 text-gray-700" };
}

export function sortByDateDesc(a, b) {
  return new Date(b.date) - new Date(a.date);
}

// Build a two-level grouped tree: primary -> secondary -> commits.
export function buildTree(commits, groupBy) {
  const annotated = commits.map((c) => {
    const d = new Date(c.date);
    const valid = !Number.isNaN(d.getTime());
    const monthKey = valid
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : "0000-00";
    return {
      ...c,
      monthKey,
      monthLabel: valid ? `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}` : "Undated",
      monthShort: valid ? `${MONTH_NAMES_ABBR[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` : "—",
      category: classify(c),
      type: commitType(c), // classified once here; reused by featureCount + render
    };
  });

  const byMonth = groupBy === "month";
  const primKey = byMonth ? "monthKey" : "category";
  const primLabel = byMonth ? "monthLabel" : "category";
  const primShort = byMonth ? "monthShort" : "category";
  const secKey = byMonth ? "category" : "monthKey";
  const secLabel = byMonth ? "category" : "monthLabel";

  const prims = new Map();
  for (const c of annotated) {
    const pk = c[primKey];
    if (!prims.has(pk)) {
      prims.set(pk, { key: pk, label: c[primLabel], short: c[primShort], commits: [], secs: new Map() });
    }
    const p = prims.get(pk);
    p.commits.push(c);
    const sk = c[secKey];
    if (!p.secs.has(sk)) p.secs.set(sk, { key: sk, label: c[secLabel], commits: [] });
    p.secs.get(sk).commits.push(c);
  }

  let list = [...prims.values()].map((p) => ({
    key: p.key,
    label: p.label,
    short: p.short,
    count: p.commits.length,
    featureCount: p.commits.filter((c) => c.type.label === "Feature").length,
    children: [...p.secs.values()].map((s) => ({
      key: s.key,
      label: s.label,
      count: s.commits.length,
      commits: [...s.commits].sort(sortByDateDesc),
    })),
  }));

  const byMonthDesc = (a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0);
  const byCountDesc = (a, b) => b.count - a.count || (a.label < b.label ? -1 : 1);

  if (byMonth) {
    list.sort(byMonthDesc);
    list.forEach((p) => p.children.sort(byCountDesc));
  } else {
    list.sort(byCountDesc);
    list.forEach((p) => p.children.sort(byMonthDesc));
  }
  return list;
}

// Month-headline callouts (chevron graphic) truncate the commit's first line
// (message is already first-line-only, per the API/hook contract), trimming
// trailing whitespace before the ellipsis so it never reads "foo …". The
// default budget suits generous layouts; the chevron graphic passes a tighter
// maxChars derived from its month-column width so same-level labels in
// adjacent columns can never collide.
const HEADLINE_MAX_CHARS = 46;
function truncateHeadline(text, maxChars = HEADLINE_MAX_CHARS) {
  const clean = (text || "").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1).trimEnd()}…`;
}

const HEADLINE_TYPE_PRIORITY = { Feature: 0, Fix: 1, Update: 2 };

/**
 * Pick up to `max` headline-worthy commits from a single month's commits, for
 * the chevron graphic callouts. Merges are excluded. Prioritized
 * Feature > Fix > Update; ties within the same type break newest-first.
 *
 * Returns [{ text, milestone, sha }] — `milestone` is true for Feature-type
 * commits (drives the graphic's milestone marker).
 */
export function pickMonthHeadlines(commits, max = 6, maxChars = HEADLINE_MAX_CHARS) {
  const ranked = (commits || [])
    .filter((c) => !c.isMerge)
    .map((c) => ({ commit: c, type: commitType(c) }))
    .sort((a, b) => {
      const pa = HEADLINE_TYPE_PRIORITY[a.type.label] ?? 3;
      const pb = HEADLINE_TYPE_PRIORITY[b.type.label] ?? 3;
      if (pa !== pb) return pa - pb;
      return sortByDateDesc(a.commit, b.commit);
    });

  return ranked.slice(0, max).map(({ commit, type }) => ({
    text: truncateHeadline(commit.message, maxChars),
    milestone: type.label === "Feature",
    sha: commit.sha,
  }));
}
