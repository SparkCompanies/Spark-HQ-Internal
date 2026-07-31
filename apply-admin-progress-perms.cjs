// ADMIN_PROGRESS_PERMS_v1 — whitelists the Team Progress admin tab in the role system
// Run from repo root:  node apply-admin-progress-perms.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");

if (h.includes("ADMIN_PROGRESS_PERMS_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
function resolve(a, label){
  if (h.split(a).length === 2) return a;
  const b = a.replace(/\n/g, "\r\n");
  if (h.split(b).length === 2) return b;
  die(label + " anchor not found exactly once");
}

// 1) super_admin adminTabs — locked to defaults, so this IS the source of truth
const A1 = resolve("adminTabs: ['agents', 'connections', 'analytics', 'knowledge', 'role', 'people-admin', 'content', 'security', 'billing', 'training-admin', 'career-paths', 'spark-standard-admin', 'tools-admin', 'docs-admin'],", "super_admin adminTabs");
// 2) role editor checklist so the tab is grantable to other roles later
const A2raw = "const ALL_ADMIN_TABS = [";
const A2 = resolve(A2raw, "ALL_ADMIN_TABS");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-adminperms-" + stamp + ".html", h);

h = h.replace(A1, A1.replace("'training-admin',", "'training-admin', 'team-progress', /* ADMIN_PROGRESS_PERMS_v1 */"));
h = h.replace(A2, A2 + (A2.includes("\r\n") ? "\r\n" : "\n") + "    ['team-progress','Team progress'],");

fs.writeFileSync(F, h);
console.log("APPLIED ADMIN_PROGRESS_PERMS_v1");
console.log("  backup: index.backup-adminperms-" + stamp + ".html");
