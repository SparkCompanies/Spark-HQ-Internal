/* ============================================================================
 * patch-tk-sf-phase1.cjs
 * Spark TimeKeep <-> Salesforce, Phase 1 (READ ONLY)
 *
 * Adds two endpoints to cloudworker.js:
 *   GET /tk-placements?q=<name>      placement typeahead for Add Employee picker
 *   GET /tk-active-roster[&periodEnd=YYYY-MM-DD]
 *                                    real active roster, derived from the
 *                                    ASYMBL weekly timesheet run
 *
 * Every field name below was verified against FieldDefinition on 2026-08-09.
 * No writes. No deletes. Nothing here can change a Salesforce record.
 *
 * USAGE (Git Bash):
 *   cd ~/Desktop/Spark-HQ-Internal/worker
 *   node patch-tk-sf-phase1.cjs
 *   npx wrangler deploy
 * ==========================================================================*/

const fs = require("fs");
const path = require("path");

const TARGET = path.resolve(process.cwd(), "cloudworker.js");
const MARKER = "/tk-active-roster";

/* ---- 1. Preconditions ---------------------------------------------------- */

if (!fs.existsSync(TARGET)) {
  throw new Error(
    "cloudworker.js not found at " + TARGET +
    "\nRun this from ~/Desktop/Spark-HQ-Internal/worker"
  );
}

const original = fs.readFileSync(TARGET, "utf8");

if (original.indexOf(MARKER) !== -1) {
  throw new Error(
    "ABORT: cloudworker.js already contains " + MARKER +
    "\nPatch appears to have been applied already. Nothing written."
  );
}

/* ---- 2. Anchor detection -------------------------------------------------
 * Insert immediately BEFORE the first matching anchor, so the new routes are
 * evaluated inside the existing router and ahead of any 404 fallback.
 * Candidates are tried in order; first exact single match wins.
 * ------------------------------------------------------------------------ */

const ANCHOR_CANDIDATES = [
  '// \u2500\u2500 TimeKeep: distinct placement statuses',
  'if (url.pathname === "/tk-placement-statuses")',
  'if (url.pathname === "/tk-placements")',
  'return json({ error: "not found" }, 404, origin)',
  'return json({ error: "Not found" }, 404, origin)'
];

let anchor = null;
let anchorIndex = -1;

for (const cand of ANCHOR_CANDIDATES) {
  const first = original.indexOf(cand);
  if (first === -1) continue;
  const last = original.lastIndexOf(cand);
  if (first !== last) {
    console.warn("  skip (not unique): " + cand);
    continue;
  }
  anchor = cand;
  anchorIndex = first;
  break;
}

if (anchorIndex === -1) {
  throw new Error(
    "ABORT: no unique anchor found in cloudworker.js. Nothing written.\n" +
    "Run this and send me the output so I can pick a real anchor:\n" +
    '  grep -n "url.pathname ===" cloudworker.js | tail -20'
  );
}

/* Preserve the indentation of the anchor line. */
const lineStart = original.lastIndexOf("\n", anchorIndex) + 1;
const indent = original.slice(lineStart, anchorIndex).match(/^[ \t]*/)[0] || "    ";

/* ---- 3. The block -------------------------------------------------------- */

const BLOCK = String.raw`
// ── TimeKeep Phase 1: placement search (Add Employee picker) ──────────────
// Read only. Field names verified against FieldDefinition 2026-08-09.
if (url.pathname === "/tk-placements") {
  const who = await verifyUser(request, env);
  if (!who || !who.email) return json({ error: "unauthorized" }, 401, origin);

  // Whitelist input. Anything outside this set never reaches the SOQL string.
  const rawQ = (url.searchParams.get("q") || "").trim();
  const cleaned = rawQ.replace(/[^A-Za-z0-9 .'-]/g, "");
  if (cleaned.length < 2) {
    return json({ count: 0, query: cleaned, placements: [] }, 200, origin);
  }
  // Escape the apostrophe for SOQL without writing a literal backslash here.
  const q = cleaned
    .split(String.fromCharCode(39))
    .join(String.fromCharCode(92, 39));

  const soql =
    "SELECT Id, Name, Status__c, Generate_Timesheets__c, " +
    "bpats__Start_Date__c, bpats__Estimated_End_Date__c, Terminated_Date__c, " +
    "Termination_Reason__c, Job_Title__c, bpats__Pay_Rate__c, " +
    "bpats__ATS_Candidate__c, bpats__ATS_Candidate__r.Name, " +
    "bpats__ATS_Job__r.Name, bpats__ATS_Job__r.bpats__Account_Name__c " +
    "FROM bpats__Placement__c " +
    "WHERE bpats__ATS_Job__r.bpats__Account_Name__c LIKE '%DFM%' " +
    "AND bpats__ATS_Candidate__r.Name LIKE '%" + q + "%' " +
    "ORDER BY bpats__Start_Date__c DESC LIMIT 25";

  const res = await runSalesforceQueryAll(env, soql);
  if (!res.ok) return json({ error: res.error, soql: soql }, 502, origin);

  const rows = (res.records || []).map(function (r) {
    const cand = r.bpats__ATS_Candidate__r || null;
    const job = r.bpats__ATS_Job__r || null;
    return {
      placementId: r.Id,
      placementName: r.Name || "",
      candidateId: r.bpats__ATS_Candidate__c || null,
      candidateName: cand ? cand.Name : "",
      jobTitle: r.Job_Title__c || "",
      jobName: job ? job.Name : "",
      account: job ? job.bpats__Account_Name__c : "",
      status: r.Status__c || "",
      generatesTimesheets: r.Generate_Timesheets__c === true,
      startDate: r.bpats__Start_Date__c || null,
      estEndDate: r.bpats__Estimated_End_Date__c || null,
      terminatedDate: r.Terminated_Date__c || null,
      terminationReason: r.Termination_Reason__c || null,
      payRate: (r.bpats__Pay_Rate__c === undefined) ? null : r.bpats__Pay_Rate__c
    };
  });

  // Same candidate on two placements is a real ambiguity, not a dedupe target.
  const seen = {};
  const dupes = [];
  rows.forEach(function (x) {
    const k = (x.candidateName || "").toLowerCase();
    if (!k) return;
    if (seen[k]) { if (dupes.indexOf(k) === -1) dupes.push(k); }
    seen[k] = true;
  });

  return json({
    count: rows.length,
    query: cleaned,
    ambiguous: dupes,
    placements: rows
  }, 200, origin);
}

// ── TimeKeep Phase 1: active roster from the ASYMBL weekly timesheet run ──
// Status__c is unreliable here (13 "Active" vs 137 timesheets on 2026-08-09).
// Timesheet generation is the trustworthy activity signal. Read only.
if (url.pathname === "/tk-active-roster") {
  const who = await verifyUser(request, env);
  if (!who || !who.email) return json({ error: "unauthorized" }, 401, origin);

  let periodEnd = (url.searchParams.get("periodEnd") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    // Pay period ends Sunday. Resolve in Eastern time, not UTC, or a Sunday
    // evening request rolls forward a full week.
    const nowEt = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Detroit" })
    );
    nowEt.setDate(nowEt.getDate() + ((7 - nowEt.getDay()) % 7));
    const mm = String(nowEt.getMonth() + 1);
    const dd = String(nowEt.getDate());
    periodEnd = nowEt.getFullYear() + "-" +
      (mm.length < 2 ? "0" + mm : mm) + "-" +
      (dd.length < 2 ? "0" + dd : dd);
  }

  const soql =
    "SELECT Id, Placement__c, ASYMBL_Time__Candidate_Name__c, " +
    "ASYMBL_Time__Status__c, ASYMBL_Time__Pay_Period_End_Date__c, " +
    "Placement__r.Name, Placement__r.Status__c, " +
    "Placement__r.Generate_Timesheets__c, Placement__r.Terminated_Date__c, " +
    "Placement__r.Job_Title__c, Placement__r.bpats__ATS_Candidate__c, " +
    "Placement__r.bpats__ATS_Candidate__r.Name " +
    "FROM ASYMBL_Time__Timesheet__c " +
    "WHERE ASYMBL_Time__Pay_Period_End_Date__c = " + periodEnd + " " +
    "AND Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c LIKE '%DFM%' " +
    "ORDER BY ASYMBL_Time__Candidate_Name__c";

  const res = await runSalesforceQueryAll(env, soql);
  if (!res.ok) return json({ error: res.error, soql: soql }, 502, origin);

  const byPlacement = {};
  const noPlacement = [];
  const terminatedButActive = [];

  (res.records || []).forEach(function (r) {
    const p = r.Placement__r || null;
    const pid = r.Placement__c || null;

    if (!pid) {
      noPlacement.push({
        timesheetId: r.Id,
        candidateName: r.ASYMBL_Time__Candidate_Name__c || ""
      });
      return;
    }

    if (!byPlacement[pid]) {
      byPlacement[pid] = {
        placementId: pid,
        placementName: p ? (p.Name || "") : "",
        candidateId: p ? (p.bpats__ATS_Candidate__c || null) : null,
        candidateName:
          (p && p.bpats__ATS_Candidate__r && p.bpats__ATS_Candidate__r.Name) ||
          r.ASYMBL_Time__Candidate_Name__c || "",
        jobTitle: p ? (p.Job_Title__c || "") : "",
        placementStatus: p ? (p.Status__c || "") : "",
        generatesTimesheets: p ? (p.Generate_Timesheets__c === true) : false,
        terminatedDate: p ? (p.Terminated_Date__c || null) : null,
        timesheetIds: [],
        timesheetStatuses: []
      };
    }
    byPlacement[pid].timesheetIds.push(r.Id);
    if (r.ASYMBL_Time__Status__c) {
      byPlacement[pid].timesheetStatuses.push(r.ASYMBL_Time__Status__c);
    }
  });

  const roster = Object.keys(byPlacement).map(function (k) {
    return byPlacement[k];
  });

  // Terminated in Salesforce but still generating time. Someone should look.
  roster.forEach(function (x) {
    if (x.terminatedDate) terminatedButActive.push(x);
  });

  // More than one timesheet on a single placement for one period.
  const multiTimesheet = roster.filter(function (x) {
    return x.timesheetIds.length > 1;
  });

  return json({
    periodEnd: periodEnd,
    timesheetCount: (res.records || []).length,
    placementCount: roster.length,
    warnings: {
      terminatedButStillGeneratingTime: terminatedButActive.length,
      timesheetsWithNoPlacement: noPlacement.length,
      placementsWithMultipleTimesheets: multiTimesheet.length
    },
    terminatedButStillGeneratingTime: terminatedButActive,
    timesheetsWithNoPlacement: noPlacement,
    placementsWithMultipleTimesheets: multiTimesheet,
    roster: roster
  }, 200, origin);
}

`;

/* Re-indent the block to sit level with the anchor. */
const indented = BLOCK
  .split("\n")
  .map(function (l) { return l.length ? indent + l : l; })
  .join("\n");

/* ---- 4. Write ------------------------------------------------------------ */

const patched =
  original.slice(0, lineStart) +
  indented.replace(/^\n/, "") + "\n" +
  original.slice(lineStart);

/* Sanity: we only ever grow the file, and only by the block. */
if (patched.length <= original.length) {
  throw new Error("ABORT: patched output is not larger than the original.");
}
if (patched.indexOf(MARKER) === -1) {
  throw new Error("ABORT: marker missing from patched output. Nothing written.");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = TARGET + "." + stamp + ".bak";
fs.writeFileSync(backup, original, "utf8");
fs.writeFileSync(TARGET, patched, "utf8");

console.log("");
console.log("  anchor  : " + anchor);
console.log("  backup  : " + path.basename(backup));
console.log("  added   : " + (patched.length - original.length) + " bytes");
console.log("  routes  : GET /tk-placements   GET /tk-active-roster");
console.log("");
console.log("  Next:");
console.log("    npx wrangler deploy");
console.log("    git add cloudworker.js");
console.log('    git commit -m "TimeKeep SF phase 1: placement search + active roster"');
console.log("");
console.log("  Rollback:");
console.log("    cp " + path.basename(backup) + " cloudworker.js && npx wrangler deploy");
console.log("");
