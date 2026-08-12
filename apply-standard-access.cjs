// STANDARD_ACCESS_v1 — opens Command Center and Training to every signed-in user.
//  1. member role defaults gain 'command' and 'training' nav items
//  2. saved role sets (spark_hq_roles in localStorage) get the same via an ensure-block
//  3. the Command Center email allowlist becomes signed-in-only (fail-closed kept:
//     no session still hides the tab)
// Run from repo root:  node apply-standard-access.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("STANDARD_ACCESS_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

const A1 = "'home','people','leadership','terrmap'";
const A2 = "var ok=ALLOW.indexOf((u.email||'').toLowerCase())>=0;";
const A3 = "        return merged;";
if (h.split(A1).length - 1 !== 1) die("member navItems anchor not found exactly once");
if (h.split(A2).length - 1 !== 1) die("command allowlist anchor not found exactly once");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-stdaccess-" + stamp + ".html", h);

// 1. member defaults: command right after home, training after terrmap
h = h.split(A1).join("'home','command','people','leadership','terrmap','training' /* STANDARD_ACCESS_v1 */");

// 2. ensure-block for saved role sets — same pattern as v47/vBoards, members included
const ENSURE =
"        // STANDARD_ACCESS_v1 — ensure Command Center + Training exist in saved sets (all roles)\n" +
"        Object.keys(merged).forEach(function(k){\n" +
"          var ni = merged[k].navItems;\n" +
"          if (!Array.isArray(ni)) return;\n" +
"          if (ni.indexOf('command') === -1) {\n" +
"            var hi = ni.indexOf('home');\n" +
"            if (hi !== -1) ni.splice(hi + 1, 0, 'command'); else ni.unshift('command');\n" +
"          }\n" +
"          if (ni.indexOf('training') === -1) {\n" +
"            var ti = ni.indexOf('terrmap');\n" +
"            if (ti !== -1) ni.splice(ti + 1, 0, 'training'); else ni.push('training');\n" +
"          }\n" +
"        });\n" +
A3;
// A3 may occur multiple times file-wide; scope the replace to the ROLE_PERMISSIONS loader
const rp = h.indexOf("ROLE_PERMISSIONS = (function()");
if (rp < 0) die("ROLE_PERMISSIONS loader not found");
const seg = h.slice(rp, rp + 9500);
if (seg.split(A3).length - 1 !== 1) die("return merged not unique inside loader");
h = h.slice(0, rp) + seg.replace(A3, ENSURE) + h.slice(rp + 9500);

// 3. Command Center gate: any signed-in user (session still required — fail-closed preserved)
h = h.split(A2).join("var ok=true; /* STANDARD_ACCESS_v1 — open to all signed-in users (was 4-email allowlist) */");

fs.writeFileSync(F, h);
console.log("APPLIED STANDARD_ACCESS_v1");
console.log("  member nav now includes: command, training");
console.log("  saved role sets auto-upgraded on next load");
console.log("  Command Center: allowlist removed — any signed-in user (no session still hides it)");
console.log("  backup: index.backup-stdaccess-" + stamp + ".html");
