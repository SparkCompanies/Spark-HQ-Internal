// SPARK_ROLE_LOCK_v1 — closes the role-spoofing holes + removes the demo analytics pane.
//  1. Usage analytics (self-declared demo data) removed from the Admin submenu.
//  2. ?role=super_admin URL backdoor REMOVED — it granted anyone super-admin for a session.
//  3. window.SPARK_RESCUE() now only works for the FLOOR admin list; anyone else gets "not permitted".
//  4. Members no longer get an Admin tab at all (they had one containing the role SWITCHER).
//  5. Managers keep Agent knowledge only — switcher and demo panes removed from their view.
//  6. One-time localStorage migration (rolev3) resets stale saved role grants so 4/5 take effect.
// Honest limit: UI roles remain client-side; a determined user with devtools can still
// tamper locally. True enforcement of sensitive data (Finance/AR endpoints) belongs in the
// Worker — flagged as follow-up. This patch closes the casual/accidental paths.
// Run from the repo root, then commit + push.
const fs = require("fs");
const F = "index.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("SPARK_ROLE_LOCK_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["ANALYTICS_BTN", "\n          <button class=\"admin-subnav-item\" data-admin-tab=\"analytics\">\n            <span>Usage analytics</span>\n          </button>", ""], ["URL_BACKDOOR", "  try{var q=new URLSearchParams(location.search);if(q.get('role')==='super_admin'){LOCK=true;try{localStorage.setItem('spark_hq_role','super_admin');}catch(e){}setTimeout(function(){set('super_admin');},80);}}catch(e){}\n", "  /* SPARK_ROLE_LOCK_v1: URL role backdoor removed */\n"], ["RESCUE_GATE", "window.SPARK_RESCUE=function(){LOCK=true;try{localStorage.setItem('spark_hq_role','super_admin');}catch(e){}set('super_admin');return 'super_admin restored';};", "window.SPARK_RESCUE=function(){/* SPARK_ROLE_LOCK_v1: rescue is FLOOR-gated */try{var u=window.SPARK_SB&&window.SPARK_SB.whoami&&window.SPARK_SB.whoami();if(!u||!u.email||FLOOR.indexOf(uname(u.email))<0)return 'not permitted';}catch(e){return 'not permitted';}LOCK=true;try{localStorage.setItem('spark_hq_role','super_admin');}catch(e){}set('super_admin');return 'super_admin restored';};"], ["MEMBER_TABS", "adminTabs: ['role']", "adminTabs: [] /* SPARK_ROLE_LOCK_v1: members get no Admin tab */"], ["MANAGER_TABS", "adminTabs: ['analytics', 'knowledge', 'role', 'content']", "adminTabs: ['knowledge'] /* SPARK_ROLE_LOCK_v1: managers keep agent knowledge; switcher/demo panes removed */"], ["ROLE_MIGRATION", "if(localStorage.getItem('spark_hq_rolev2')!=='1'){try{localStorage.removeItem('spark_hq_role');localStorage.removeItem('spark_hq_roles');localStorage.setItem('spark_hq_rolev2','1');}catch(e){}}", "if(localStorage.getItem('spark_hq_rolev3')!=='1'){try{localStorage.removeItem('spark_hq_role');localStorage.removeItem('spark_hq_roles');localStorage.setItem('spark_hq_rolev3','1');}catch(e){}} /* SPARK_ROLE_LOCK_v1 migration */"]];
for (const [name, oldS, newS] of P) {
  const n = h.split(oldS).length - 1;
  if (n !== 1) die(name + " anchor found " + n + " times (want 1)");
  h = h.split(oldS).join(newS);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.html.rolelock-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED SPARK_ROLE_LOCK_v1");
console.log("  - demo Usage analytics removed from Admin menu");
console.log("  - URL role backdoor removed; SPARK_RESCUE gated to FLOOR admins");
console.log("  - members: no Admin tab; managers: Agent knowledge only");
console.log("  NEXT: git add index.html && git commit -m \"Security: close role-spoof paths, remove demo analytics\" && git push");
