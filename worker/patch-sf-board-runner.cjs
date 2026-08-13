// SF_BOARD_RUNNER_v2 — the summary sub-queries now use runSalesforceQueryAll.
// Root cause: runSalesforceQuery auto-appends " LIMIT 50" to queries lacking a
// LIMIT, which broke both aggregate queries (the week lookup carries LIMIT 1 and
// survived — exactly the observed null pattern). runSalesforceQueryAll leaves the
// query text untouched and paginates, matching the proven aggregate endpoints.
// Works whether or not SF_BOARD_DEBUG_v1 was applied.
// Run from the worker folder, then: npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("SF_BOARD_RUNNER_v2")) { console.log("Already applied."); process.exit(0); }
if (!raw.includes("SF_BOARD_SUMMARY_v1")) { console.error("ABORT — SUMMARY_v1 not present"); process.exit(1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

for (const v of ["pipeRes", "weRes", "hRes"]) {
  const a = "const " + v + " = await runSalesforceQuery(";
  const n = h.split(a).length - 1;
  if (n !== 1) die(v + " call site found " + n + " times (want 1)");
  h = h.split(a).join("const " + v + " = await runSalesforceQueryAll( /* SF_BOARD_RUNNER_v2 */");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.sfrun-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED SF_BOARD_RUNNER_v2 — summary queries now use runSalesforceQueryAll (no LIMIT munging)");
console.log("  NEXT: npx wrangler deploy");
console.log("  backup: cloudworker.js.sfrun-" + stamp + ".bak");
