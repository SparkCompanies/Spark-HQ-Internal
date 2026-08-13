// SF_BOARD_BU_v1 — per-business-unit scoping for the Home summary.
//  /sf-board?bu=<name>   -> headcount/hours scoped by Placement Division__c,
//                           pipeline scoped by Account.Subdivision__c
//  /sf-board?listbu=1    -> the exact BU values as Salesforce spells them
//                           (divisions on timesheets + subdivisions on open opps)
//  /sf-board (no params) -> unchanged org-wide summary; per-job path untouched.
// Input is sanitized (quotes/backslashes stripped) before entering SOQL.
// Run from the worker folder, then: npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("SF_BOARD_BU_v1")) { console.log("Already applied."); process.exit(0); }
if (!raw.includes("SF_BOARD_HEADS_v3 marker moved out of SOQL")) { console.error("ABORT — heads-fix not present (apply patch-sf-board-heads-fix.cjs first)"); process.exit(1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["HEADER", "        /* SF_BOARD_SUMMARY_v1 + SF_BOARD_DEBUG_v1 \u2014 org-wide summary, errors surfaced */\n        let pipelineTotal = null, headcount = null, hours = null, weekEnding = null;", "        /* SF_BOARD_SUMMARY_v1 + SF_BOARD_DEBUG_v1 + SF_BOARD_BU_v1 \u2014 org-wide or per-BU summary */\n        const bu = (url.searchParams.get(\"bu\") || \"\").trim().slice(0, 60).replace(/['\"\\\\]/g, \"\");\n        if (url.searchParams.get(\"listbu\")) {\n          const out = { ok: true, listbu: true };\n          const d1 = await runSalesforceQueryAll(env, \"SELECT ASYMBL_Time__Timesheet__r.Placement__r.Division__c dv, COUNT(Id) n FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.Placement__r.Division__c != null GROUP BY ASYMBL_Time__Timesheet__r.Placement__r.Division__c ORDER BY COUNT(Id) DESC\");\n          out.divisions = d1.ok ? d1.records : { error: d1.error };\n          const d2 = await runSalesforceQueryAll(env, \"SELECT Account.Subdivision__c sd, COUNT(Id) n FROM Opportunity WHERE IsClosed = false AND Account.Subdivision__c != null GROUP BY Account.Subdivision__c ORDER BY COUNT(Id) DESC\");\n          out.subdivisions = d2.ok ? d2.records : { error: d2.error };\n          return json(out, 200, origin);\n        }\n        let pipelineTotal = null, headcount = null, hours = null, weekEnding = null;"], ["PIPE", "const pipeRes = await runSalesforceQueryAll( /* SF_BOARD_RUNNER_v2 */env, \"SELECT SUM(Amount) amt FROM Opportunity WHERE IsClosed = false\");", "const pipeRes = await runSalesforceQueryAll( /* SF_BOARD_RUNNER_v2 */env, \"SELECT SUM(Amount) amt FROM Opportunity WHERE IsClosed = false\" + (bu ? \" AND Account.Subdivision__c = '\" + bu + \"'\" : \"\"));"], ["HOURS", "weekEnding /* SF_BOARD_HEADS_v3 marker moved out of SOQL */", "weekEnding + (bu ? \" AND ASYMBL_Time__Timesheet__r.Placement__r.Division__c = '\" + bu + \"'\" : \"\") /* SF_BOARD_HEADS_v3 + BU_v1 */"], ["RESP", "return json({ ok: true, summary: true, pipelineTotal, headcount, hours, weekEnding, diag }, 200, origin);", "return json({ ok: true, summary: true, bu: bu || null, pipelineTotal, headcount, hours, weekEnding, diag }, 200, origin);"]];
for (const [name, oldS, newS] of P) {
  const n = h.split(oldS).length - 1;
  if (n !== 1) die(name + " anchor found " + n + " times (want 1)");
  h = h.split(oldS).join(newS);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.sfbu-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED SF_BOARD_BU_v1 — ?bu= scoping + ?listbu=1 discovery");
console.log("  NEXT: npx wrangler deploy");
