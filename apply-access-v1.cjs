#!/usr/bin/env node
/* ACCESS_v1 — one Access screen, baseline tabs for everyone.
   Run from the repo root:  node apply-access-v1.cjs
   Edits index.html in place (backup written first). Idempotent: safe to run twice.

   1. Career Paths, Directory and Software & Tools leave the permission gate; members also get Spark Boards + Tools in their nav. They fall back to the role layer
      (member / manager / super_admin nav lists), which already includes all three. Only Sr Leadership stays gated.
   2. The browser-local "Your role" demo switcher is removed from the Admin sub-nav (it only ever changed the
      admin's own browser and contradicted Supabase).
   3. window.HQ_GATED_TABS tells access.js / viewas.js which tabs are still gated, so View as stays truthful.
*/
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "index.html");
let src = fs.readFileSync(file, "utf8");
const before = src;
let changes = 0;

function replaceOnce(label, from, to) {
  if (src.includes(to)) { console.log("  = already applied:", label); return; }
  if (!src.includes(from)) { console.error("  ! anchor not found:", label); process.exitCode = 1; return; }
  src = src.replace(from, to);
  changes++;
  console.log("  + applied:", label);
}

console.log("ACCESS_v1 patching", file);

// 1. Permission gate: only Sr Leadership stays behind an explicit grant.
replaceOnce(
  "GATE_TAB_PERM: baseline tabs leave the gate",
  "  var GATE_TAB_PERM = {\n" +
  "    'tools':   'tab:tools',\n" +
  "    'people':  'tab:people',\n" +
  "    'careers': 'tab:career',\n" +
  "    'srlead':  'tab:srleadership'  /* SRLEAD_v1: button starts hidden; only shown once /permissions confirms access */",
  "  var GATE_TAB_PERM = {\n" +
  "    /* ACCESS_v1: Tools, Directory and Career Paths are baseline for every signed-in team member and come from\n" +
  "       the role layer only. Sr Leadership is the one tab that still needs an explicit grant (Admin > Access). */\n" +
  "    'srlead':  'tab:srleadership'  /* SRLEAD_v1: button starts hidden; only shown once /permissions confirms access */"
);

// 1b. Tell the add-on scripts which tabs are still gated.
replaceOnce(
  "HQ_GATED_TABS flag",
  "  var MY_PERMS = null;\n",
  "  var MY_PERMS = null;\n  window.HQ_GATED_TABS = Object.keys(GATE_TAB_PERM); /* ACCESS_v1 */\n"
);

// 1c. Members get Spark Boards and Software & Tools in their sidebar (they were only in manager/super admin lists).
replaceOnce(
  "member navItems: add boards + tools",
  "navItems: ['home','command','people','leadership','terrmap','chargecc','training','standard','careers','brand' /* BRAND_HUB_v1 */]",
  "navItems: ['home','command','people','leadership','boards','terrmap','chargecc','training','standard','careers','tools','brand' /* BRAND_HUB_v1 */ /* ACCESS_v1: boards + tools for everyone */]"
);

// 2. Drop the browser-local role demo switcher from the super admin sub-nav.
replaceOnce(
  "remove 'Your role' demo switcher from Admin",
  "adminTabs: ['agents', 'connections', 'analytics', 'knowledge', 'role', 'people-admin',",
  "adminTabs: ['agents', 'connections', 'analytics', 'knowledge', /* ACCESS_v1: 'role' demo switcher retired */ 'people-admin',"
);

if (process.exitCode) { console.error("Nothing written — fix the anchors above first."); process.exit(1); }
if (!changes) { console.log("No changes needed."); process.exit(0); }

if (process.env.CI) {
  fs.writeFileSync(file, src);
  console.log("Done. " + changes + " change(s). (CI run: no backup file written)");
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(__dirname, "index." + stamp + ".bak.html"), before);
  fs.writeFileSync(file, src);
  console.log("Done. " + changes + " change(s). Backup: index." + stamp + ".bak.html");
}
console.log("Next: git add index.html && git commit -m \"ACCESS_v1: baseline tabs, retire role demo switcher\" && git push");
