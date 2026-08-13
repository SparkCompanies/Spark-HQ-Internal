// SF_BOARD_HEADS_v3 fix — removes the JS-style comment I mistakenly embedded in the
// SOQL string. SOQL has no comment syntax; Salesforce rejected the query at the '/'.
// Run from the worker folder, then: npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
const BAD = 'weekEnding + " /* SF_BOARD_HEADS_v3 */"';
if (!raw.includes(BAD)) { console.log("Already fixed (no comment inside the SOQL)."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
if (h.split(BAD).length - 1 !== 1) { console.error("ABORT — anchor not unique"); process.exit(1); }
h = h.split(BAD).join("weekEnding /* SF_BOARD_HEADS_v3 marker moved out of SOQL */");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.sffix-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED heads fix — SOQL is now clean (comment removed from the query string)");
console.log("  NEXT: npx wrangler deploy");
