// SF_BOARD_DEBUG_v1 — surfaces the sub-query errors that SUMMARY_v1 swallowed.
// The summary response gains a "diag" object carrying the exact Salesforce error
// for any query that failed, so nulls are never silent again.
// EOL-safe, idempotent. Run from the worker folder, then: npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("SF_BOARD_DEBUG_v1")) { console.log("Already applied."); process.exit(0); }
if (!raw.includes("SF_BOARD_SUMMARY_v1")) { console.error("ABORT — SUMMARY_v1 not present"); process.exit(1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

// replace the entire v1 branch body (verbatim from the v1 installer)
const OLD =
'        /* SF_BOARD_SUMMARY_v1 — org-wide summary for Spark HQ Home KPIs */\n' +
'        let pipelineTotal = null, headcount = null, hours = null, weekEnding = null;\n' +
'        try {\n' +
'          const pipeRes = await runSalesforceQuery(env, "SELECT SUM(Amount) amt FROM Opportunity WHERE IsClosed = false");\n' +
'          if (pipeRes.ok && pipeRes.records && pipeRes.records[0] && pipeRes.records[0].amt != null) {\n' +
'            pipelineTotal = Math.round(Number(pipeRes.records[0].amt));\n' +
'          }\n' +
'        } catch (e) {}\n';
if (h.split(OLD).length - 1 !== 1) die("v1 pipeline block not found exactly once");
const NEW =
'        /* SF_BOARD_SUMMARY_v1 + SF_BOARD_DEBUG_v1 — org-wide summary, errors surfaced */\n' +
'        let pipelineTotal = null, headcount = null, hours = null, weekEnding = null;\n' +
'        const diag = {};\n' +
'        try {\n' +
'          const pipeRes = await runSalesforceQuery(env, "SELECT SUM(Amount) amt FROM Opportunity WHERE IsClosed = false");\n' +
'          if (!pipeRes.ok) { diag.pipeline = pipeRes.error || "query not ok"; }\n' +
'          else if (pipeRes.records && pipeRes.records[0] && pipeRes.records[0].amt != null) {\n' +
'            pipelineTotal = Math.round(Number(pipeRes.records[0].amt));\n' +
'          } else { diag.pipeline = "ok but empty/unaliased: " + JSON.stringify((pipeRes.records || [])[0] || null); }\n' +
'        } catch (e) { diag.pipeline = "threw: " + String(e && e.message || e); }\n';
h = h.split(OLD).join(NEW);

// hours/headcount block: capture hRes/weRes failures
const OLD2 =
'            if (hRes.ok && hRes.records) {\n' +
'              const rows = hRes.records.filter((r) => r.cand);\n' +
'              headcount = rows.length;\n' +
'              let tot = 0;\n' +
'              for (const r of rows) tot += (Number(r.rh) || 0) + (Number(r.oh) || 0) + (Number(r.dh) || 0);\n' +
'              hours = Math.round(tot);\n' +
'            }\n' +
'          }\n' +
'        } catch (e) {}\n' +
'        return json({ ok: true, summary: true, pipelineTotal, headcount, hours, weekEnding }, 200, origin);';
if (h.split(OLD2).length - 1 !== 1) die("v1 hours block not found exactly once");
const NEW2 =
'            if (!hRes.ok) { diag.hours = hRes.error || "query not ok"; }\n' +
'            else if (hRes.records) {\n' +
'              const rows = hRes.records.filter((r) => r.cand);\n' +
'              headcount = rows.length;\n' +
'              let tot = 0;\n' +
'              for (const r of rows) tot += (Number(r.rh) || 0) + (Number(r.oh) || 0) + (Number(r.dh) || 0);\n' +
'              hours = Math.round(tot);\n' +
'              if (!rows.length) diag.hours = "ok but 0 rows; sample: " + JSON.stringify((hRes.records || [])[0] || null);\n' +
'            }\n' +
'          } else if (!weRes.ok) { diag.week = weRes.error || "week query not ok"; }\n' +
'        } catch (e) { diag.hours = "threw: " + String(e && e.message || e); }\n' +
'        return json({ ok: true, summary: true, pipelineTotal, headcount, hours, weekEnding, diag }, 200, origin);';
h = h.split(OLD2).join(NEW2);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.sfdbg-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED SF_BOARD_DEBUG_v1 — summary response now includes diag with exact errors");
console.log("  NEXT: npx wrangler deploy, then re-run the console fetch");
