// HQ_ADMIN_TRIM_v1 — removes three placeholder items from the Admin submenu:
// Content & SOPs, Security & access, Billing & plan. All three are template
// stubs (descriptive text, no working UI). Their panes are left in place but
// become unreachable — buttons only are removed, so nothing nested breaks.
// Team progress / Tools / People & roles are real and untouched.
// Run from the repo root, then commit + push.
const fs = require("fs");
const F = "index.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("HQ_ADMIN_TRIM_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
const pat = /\s*<button class="admin-subnav-item" data-admin-tab="(content|security|billing)">\s*<span>[^<]*<\/span>\s*<\/button>/g;
const found = (h.match(pat) || []).length;
if (found !== 3) { console.error("ABORT — expected 3 stub buttons, found " + found + "; no changes written"); process.exit(1); }
h = h.replace(pat, "");
h = h.replace('<div class="admin-content">', '<!-- HQ_ADMIN_TRIM_v1: Content&SOPs / Security / Billing stub buttons removed -->\n        <div class="admin-content">');
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.html.admintrim-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED HQ_ADMIN_TRIM_v1 — Admin submenu now shows only working panels");
console.log("  NEXT: git add index.html && git commit -m \"Admin: remove placeholder Content/Security/Billing menu items\" && git push");
