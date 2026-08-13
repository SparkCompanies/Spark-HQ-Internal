// SF_BOARD_HEADS_v3 — fixes headcount/hours: Salesforce refuses to GROUP BY the
// formula field Candidate_Name__c (confirmed by diag). Replaced with a single
// no-GROUP-BY aggregate: COUNT_DISTINCT of the timesheet lookup (one timesheet =
// one person-week) + hour sums. Pipeline is untouched (already live).
// Run from the worker folder, then: npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("SF_BOARD_HEADS_v3")) { console.log("Already applied."); process.exit(0); }
if (!raw.includes("SF_BOARD_DEBUG_v2")) { console.error("ABORT — DEBUG_v2 not present"); process.exit(1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

// 1. the failing GROUP BY query -> single aggregate row
const Q_OLD = '"SELECT ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c cand, SUM(ASYMBL_Time__Regular_Hours__c) rh, SUM(ASYMBL_Time__Overtime_Hours__c) oh, SUM(ASYMBL_Time__Double_Time_Hours__c) dh FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding + " GROUP BY ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c"';
if (h.split(Q_OLD).length - 1 !== 1) die("group-by query not found exactly once");
const Q_NEW = '"SELECT COUNT_DISTINCT(ASYMBL_Time__Timesheet__c) heads, SUM(ASYMBL_Time__Regular_Hours__c) rh, SUM(ASYMBL_Time__Overtime_Hours__c) oh, SUM(ASYMBL_Time__Double_Time_Hours__c) dh FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding + " /* SF_BOARD_HEADS_v3 */"';
h = h.split(Q_OLD).join(Q_NEW);

// 2. the row-scan parse -> single aggregate row parse
const P_OLD =
'            if (!hRes.ok) { diag.hours = hRes.error || "query not ok"; }\n' +
'            else if (hRes.records) {\n' +
'              const rows = hRes.records.filter((r) => r.cand);\n' +
'              headcount = rows.length;\n' +
'              let tot = 0;\n' +
'              for (const r of rows) tot += (Number(r.rh) || 0) + (Number(r.oh) || 0) + (Number(r.dh) || 0);\n' +
'              hours = Math.round(tot);\n' +
'              if (!rows.length) diag.hours = "ok but 0 rows; sample: " + JSON.stringify((hRes.records || [])[0] || null);\n' +
'            }';
if (h.split(P_OLD).length - 1 !== 1) die("hours parse block not found exactly once");
const P_NEW =
'            if (!hRes.ok) { diag.hours = hRes.error || "query not ok"; }\n' +
'            else if (hRes.records && hRes.records[0]) {\n' +
'              const agg = hRes.records[0]; /* SF_BOARD_HEADS_v3 */\n' +
'              headcount = agg.heads == null ? null : Math.round(Number(agg.heads));\n' +
'              hours = Math.round((Number(agg.rh) || 0) + (Number(agg.oh) || 0) + (Number(agg.dh) || 0));\n' +
'            } else { diag.hours = "ok but no aggregate row returned"; }';
h = h.split(P_OLD).join(P_NEW);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.sfheads-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED SF_BOARD_HEADS_v3 — headcount = distinct timesheets for the week, hours = Reg+OT+DT sums");
console.log("  NEXT: npx wrangler deploy");
