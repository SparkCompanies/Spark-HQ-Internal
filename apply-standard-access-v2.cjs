// STANDARD_ACCESS_v2 — opens Career Paths (and Spark Standard) to every signed-in user.
// Extends STANDARD_ACCESS_v1: member defaults gain 'careers' + 'standard', and the
// saved-role-set ensure block upgrades existing browsers on next load.
// Run from repo root:  node apply-standard-access-v2.cjs
const fs = require("fs");
const F = "index.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("STANDARD_ACCESS_v2")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

// 1. member defaults (current post-v1 string)
const DEF_OLD = "'home','command','people','leadership','terrmap','training' /* STANDARD_ACCESS_v1 */";
if (h.split(DEF_OLD).length - 1 !== 1) die("member defaults anchor (v1) not found exactly once");
const DEF_NEW = "'home','command','people','leadership','terrmap','training','standard','careers' /* STANDARD_ACCESS_v2 */";
h = h.split(DEF_OLD).join(DEF_NEW);

// 2. extend the v1 ensure block so saved role sets pick these up too
const ENS_ANCHOR =
"          if (ni.indexOf('training') === -1) {\n" +
"            var ti = ni.indexOf('terrmap');\n" +
"            if (ti !== -1) ni.splice(ti + 1, 0, 'training'); else ni.push('training');\n" +
"          }\n" +
"        });";
if (h.split(ENS_ANCHOR).length - 1 !== 1) die("v1 ensure block tail not found exactly once");
const ENS_NEW =
"          if (ni.indexOf('training') === -1) {\n" +
"            var ti = ni.indexOf('terrmap');\n" +
"            if (ti !== -1) ni.splice(ti + 1, 0, 'training'); else ni.push('training');\n" +
"          }\n" +
"          /* STANDARD_ACCESS_v2 — Career Paths + Spark Standard for everyone */\n" +
"          if (ni.indexOf('standard') === -1) {\n" +
"            var tr = ni.indexOf('training');\n" +
"            if (tr !== -1) ni.splice(tr + 1, 0, 'standard'); else ni.push('standard');\n" +
"          }\n" +
"          if (ni.indexOf('careers') === -1) {\n" +
"            var st = ni.indexOf('standard');\n" +
"            if (st !== -1) ni.splice(st + 1, 0, 'careers'); else ni.push('careers');\n" +
"          }\n" +
"        });";
h = h.split(ENS_ANCHOR).join(ENS_NEW);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-stdaccess2-" + stamp + ".html", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED STANDARD_ACCESS_v2");
console.log("  member nav now also includes: standard (Spark Standard), careers (Career Paths)");
console.log("  saved role sets auto-upgrade on next load");
console.log("  EOL preserved:", hadCRLF ? "CRLF" : "LF");
console.log("  backup: index.backup-stdaccess2-" + stamp + ".html");
