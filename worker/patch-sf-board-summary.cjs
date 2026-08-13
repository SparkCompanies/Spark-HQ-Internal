// SF_BOARD_SUMMARY_v1 — /sf-board without a jobId now returns an org-wide summary
// for the Spark HQ Home KPIs instead of a 400. With a jobId, behavior is unchanged
// (the per-job ATS board that Spark Boards uses).
//
// Response shape (no jobId):
//   { ok:true, summary:true, pipelineTotal, headcount, hours, weekEnding }
//   - pipelineTotal : SUM(Amount) of open Opportunities        (same basis as the SF Hub pipeline)
//   - weekEnding    : latest completed ASYMBL pay period end   (same lookup TimeKeep Phase 3 uses)
//   - headcount     : distinct candidates with time entries that week ("on payroll" basis)
//   - hours         : total Reg+OT+DT hours that week
// Any sub-query that fails returns null for its number — Home leaves that KPI blank.
//
// EOL-safe, idempotent. Run from the worker folder:
//   cd ~/Desktop/Spark-HQ-Internal/worker && node patch-sf-board-summary.cjs
//   then:  npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("SF_BOARD_SUMMARY_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

const ANCHOR =
'      const jobId = (url.searchParams.get("jobId") || "").replace(/[^a-zA-Z0-9]/g, "");\n' +
'      if (!jobId) return json({ error: "jobId required" }, 400, origin);';
if (h.split(ANCHOR).length - 1 !== 1) die("sf-board jobId guard not found exactly once");

const SUMMARY =
'      const jobId = (url.searchParams.get("jobId") || "").replace(/[^a-zA-Z0-9]/g, "");\n' +
'      if (!jobId) {\n' +
'        /* SF_BOARD_SUMMARY_v1 — org-wide summary for Spark HQ Home KPIs */\n' +
'        let pipelineTotal = null, headcount = null, hours = null, weekEnding = null;\n' +
'        try {\n' +
'          const pipeRes = await runSalesforceQuery(env, "SELECT SUM(Amount) amt FROM Opportunity WHERE IsClosed = false");\n' +
'          if (pipeRes.ok && pipeRes.records && pipeRes.records[0] && pipeRes.records[0].amt != null) {\n' +
'            pipelineTotal = Math.round(Number(pipeRes.records[0].amt));\n' +
'          }\n' +
'        } catch (e) {}\n' +
'        try {\n' +
'          const weRes = await runSalesforceQuery(\n' +
'            env,\n' +
'            "SELECT ASYMBL_Time__Pay_Period_End_Date__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c != null AND ASYMBL_Time__Pay_Period_End_Date__c <= TODAY ORDER BY ASYMBL_Time__Pay_Period_End_Date__c DESC LIMIT 1"\n' +
'          );\n' +
'          if (weRes.ok && weRes.records && weRes.records.length) {\n' +
'            weekEnding = weRes.records[0].ASYMBL_Time__Pay_Period_End_Date__c;\n' +
'            const hRes = await runSalesforceQuery(\n' +
'              env,\n' +
'              "SELECT ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c cand, SUM(ASYMBL_Time__Regular_Hours__c) rh, SUM(ASYMBL_Time__Overtime_Hours__c) oh, SUM(ASYMBL_Time__Double_Time_Hours__c) dh FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding + " GROUP BY ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c"\n' +
'            );\n' +
'            if (hRes.ok && hRes.records) {\n' +
'              const rows = hRes.records.filter((r) => r.cand);\n' +
'              headcount = rows.length;\n' +
'              let tot = 0;\n' +
'              for (const r of rows) tot += (Number(r.rh) || 0) + (Number(r.oh) || 0) + (Number(r.dh) || 0);\n' +
'              hours = Math.round(tot);\n' +
'            }\n' +
'          }\n' +
'        } catch (e) {}\n' +
'        return json({ ok: true, summary: true, pipelineTotal, headcount, hours, weekEnding }, 200, origin);\n' +
'      }';
h = h.split(ANCHOR).join(SUMMARY);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.sfboard-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED SF_BOARD_SUMMARY_v1");
console.log("  /sf-board (no jobId): returns { pipelineTotal, headcount, hours, weekEnding }");
console.log("  /sf-board?jobId=...: unchanged (Spark Boards per-job view)");
console.log("  EOL preserved:", hadCRLF ? "CRLF" : "LF");
console.log("  NEXT: npx wrangler deploy");
console.log("  backup: cloudworker.js.sfboard-" + stamp + ".bak");
