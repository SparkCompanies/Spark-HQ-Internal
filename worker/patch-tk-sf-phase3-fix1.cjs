/* ============================================================================
 * patch-tk-sf-phase3-fix1.cjs
 * Corrects /tk-hours-preview and /tk-hours-push to reproduce TimeKeep's
 * ACTUAL behaviour, verified against 14 employees for week ending 2026-08-02.
 *
 * WHAT WAS WRONG
 * 1. Break threshold. The worker read breakReqHrs from tk_config (= 6).
 *    index.html reads window.__breakReqHrs, which is never assigned, so the
 *    app always uses 8. Solving for the threshold that reproduced the
 *    deployed output gave exactly 6.0 on 14/14 employees; 8.0 gave 0/14.
 *    The app's effective 8 is what produced every number now in Salesforce
 *    and in payroll, so the worker must match the app, not the config.
 *    >>> The 6-vs-8 discrepancy is a real policy question for Allie. If the
 *        intended threshold is 6, index.html must be fixed FIRST and hours
 *        restated; do not change it here.
 * 2. Week rounding. The worker used calcWeekHours' toFixed(1). The payroll
 *    export (index.html ~5717) uses toFixed(2) with no pre-rounding, and the
 *    export is what feeds Salesforce. Now 2 decimals.
 * 3. Match tolerance. Existing SF values were hand-keyed at 1 decimal, so a
 *    computed 40.09 vs a stored 40.0 must not count as a difference. 0.05 ->
 *    0.1001.
 *
 * otWeekly is still read from tk_config: the app genuinely uses it (P.otWeekly).
 *
 * USAGE:
 *   cd ~/Desktop/Spark-HQ-Internal/worker
 *   node patch-tk-sf-phase3-fix1.cjs
 *   npx wrangler deploy
 * ==========================================================================*/

const fs = require("fs");
const path = require("path");

const TARGET = path.resolve(process.cwd(), "cloudworker.js");
if (!fs.existsSync(TARGET)) {
  throw new Error("cloudworker.js not found. Run from ~/Desktop/Spark-HQ-Internal/worker");
}

let src = fs.readFileSync(TARGET, "utf8");
const before = src;

if (src.indexOf("APP_BREAK_REQ_HRS") !== -1) {
  throw new Error("ABORT: fix1 already applied. Nothing written.");
}
if (src.indexOf("/tk-hours-preview") === -1) {
  throw new Error("ABORT: phase 3 block not found. Apply patch-tk-sf-phase3.cjs first.");
}

const edits = [
  {
    what: "break threshold -> app behaviour (8h)",
    from: "const reqH = Number(pol.breakReqHrs) > 0 ? Number(pol.breakReqHrs) : 8;",
    to: "const reqH = 8; /* APP_BREAK_REQ_HRS: index.html reads window.__breakReqHrs, never assigned, so the app always uses 8 regardless of tk_config (which says 6). Verified 14/14 for week ending 2026-08-02. */"
  },
  {
    what: "break minutes -> app behaviour (30m)",
    from: "const mins = Number(pol.breakMins) > 0 ? Number(pol.breakMins) : 30;",
    to: "const mins = 30;"
  },
  {
    what: "week total -> 2 decimals (matches payroll export)",
    from: "const weekH = parseFloat(total.toFixed(1)); // app rounds the week to 0.1h",
    to: "const weekH = parseFloat(total.toFixed(2)); // payroll export uses 2dp, no pre-round"
  },
  {
    what: "regular hours -> 2 decimals",
    from: "tkReg: parseFloat(Math.min(weekH, otW).toFixed(1)),",
    to: "tkReg: parseFloat(Math.min(weekH, otW).toFixed(2)),"
  },
  {
    what: "overtime hours -> 2 decimals",
    from: "tkOt: parseFloat(Math.max(0, weekH - otW).toFixed(1)),",
    to: "tkOt: parseFloat(Math.max(0, weekH - otW).toFixed(2)),"
  },
  {
    what: "match tolerance 0.05 -> 0.1001 (existing SF values hand-keyed at 1dp)",
    from: "Math.abs(Number(a || 0) - Number(b || 0)) < 0.05;",
    to: "Math.abs(Number(a || 0) - Number(b || 0)) < 0.1001;"
  },
  {
    what: "surface the 6-vs-8 policy discrepancy in the preview response",
    from: 'note: "Read only. POST /tk-hours-push with {periodEnd, confirm:true} to write the rows marked action=write."',
    to: 'policyNote: "Lunch rule uses 8h/30m to match the TimeKeep app. tk_config.policy may say breakReqHrs 6, but index.html never applies it (window.__breakReqHrs is unassigned). Resolve that policy question before changing this.", note: "Read only. POST /tk-hours-push with {periodEnd, confirm:true} to write the rows marked action=write."'
  }
];

const applied = [];
for (const e of edits) {
  const n = src.split(e.from).length - 1;
  if (n === 0) throw new Error("ABORT: anchor not found for: " + e.what + "\nNothing written.");
  if (n > 1) throw new Error("ABORT: anchor not unique (" + n + "x) for: " + e.what + "\nNothing written.");
  src = src.replace(e.from, e.to);
  applied.push(e.what);
}

if (src === before) throw new Error("ABORT: no change produced. Nothing written.");
if (src.indexOf("APP_BREAK_REQ_HRS") === -1) throw new Error("ABORT: verification failed. Nothing written.");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = TARGET + "." + stamp + ".bak";
fs.writeFileSync(backup, before, "utf8");
fs.writeFileSync(TARGET, src, "utf8");

console.log("");
console.log("  backup : " + path.basename(backup));
applied.forEach(function (a) { console.log("  fixed  : " + a); });
console.log("");
console.log("  Next:");
console.log("    npx wrangler deploy");
console.log("    git add cloudworker.js");
console.log('    git commit -m "worker: phase 3 hours math matches app (8h lunch, 2dp)"');
console.log("");
console.log("  Then re-run the 2026-08-02 preview. Expect the 14 lunch-cluster");
console.log("  rows to match, and the +/-0.1 band to disappear.");
console.log("");
console.log("  Rollback: cp " + path.basename(backup) + " cloudworker.js && npx wrangler deploy");
console.log("");
