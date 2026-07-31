// DOCS_TAB_REMOVE_v1 — removes the placeholder Documents tab (nav, roles, editor, admin manager)
// Views stay dormant in the DOM; restoring later = re-adding these entries.
// Run from repo root:  node apply-remove-docs-tab.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");

if (h.includes("DOCS_TAB_REMOVE_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
function R(old, neu, count, label){
  let a = old, c = h.split(a).length - 1;
  if (c !== count) { const b = old.replace(/\n/g, "\r\n"); const c2 = h.split(b).length - 1;
    if (c2 === count) { a = b; neu = neu.replace(/\n/g, "\r\n"); c = c2; } }
  if (c !== count) die(label + ": expected " + count + ", found " + c);
  h = h.split(a).join(neu);
  console.log("ok  " + label);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-docsremove-" + stamp + ".html", h);
h = h.replace("<head>", "<head><!-- DOCS_TAB_REMOVE_v1 -->");

// 1) sidebar nav button
R('<button class="nav-item" data-tab="docs"><span class="ico">\u25a2</span>Documents</button>', '', 1, "nav button");
// 2) role navItems — super_admin + manager
R("navItems: ['home','jarvis','salesforce','finance','headcount','sparkline','boards','match','training','standard','careers','people','tools','docs','leadership','admin']", "navItems: ['home','jarvis','salesforce','finance','headcount','sparkline','boards','match','training','standard','careers','people','tools','leadership','admin']", 2, "navItems (super_admin+manager)");
// 3) role navItems — member
R("'tools','docs']", "'tools']", 1, "navItems (member)");
// 4) roles editor nav list
R("['docs','Documents'], ", "", 1, "ALL_NAV_ITEMS entry");
// 5) super_admin adminTabs
R("'tools-admin', 'docs-admin']", "'tools-admin']", 1, "adminTabs (super_admin)");
// 6) roles editor admin list
R(", ['docs-admin','Documents admin']", "", 1, "ALL_ADMIN_TABS entry");
// 7) admin subnav button
R('          <button class="admin-subnav-item" data-admin-tab="docs-admin">\n            <span>Documents</span>\n          </button>\n', '', 1, "admin subnav button");

fs.writeFileSync(F, h);
console.log("APPLIED DOCS_TAB_REMOVE_v1");
console.log("  backup: index.backup-docsremove-" + stamp + ".html");
