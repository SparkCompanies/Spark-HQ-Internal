// TERRMAP_PIN_v1 — soft PIN on the Territory Map "Admin edit" button.
// Everyone can still VIEW the map (unchanged). Flipping into edit mode now
// prompts for a PIN. Correct PIN unlocks edit for the rest of the browser tab
// (sessionStorage), so you don't retype on every toggle; closing the tab re-locks.
//
// HONEST LIMITATION: this is a soft gate. The PIN lives in the page source, and
// this repo is public, so anyone who reads the source or the console can bypass it.
// It stops casual/accidental edits by the ~30 users who now have view access. It is
// NOT real security. For that, gate by role via SPARK_SB.myRole() instead.
//
// >>> SET YOUR PIN ON THE NEXT LINE (installer aborts if left as REPLACE_ME) <<<
const PIN = "606761";
//
// Run from repo root:  node apply-terrmap-pin.cjs
const fs = require("fs");
const F = "spark-territory-map.html";
const raw = fs.readFileSync(F, "utf8");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
if (PIN === "REPLACE_ME" || !PIN.trim()) die('set PIN at the top of this file first (line: const PIN = "...")');
if (raw.includes("TERRMAP_PIN_v1")) { console.log("Already applied. To change the PIN, edit the pin value inside spark-territory-map.html (search TERRMAP_PIN_v1)."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");

const ANCHOR = 'adminBtn.addEventListener("click",()=>{\n  admin=!admin;';
if (h.split(ANCHOR).length - 1 !== 1) die("adminBtn handler anchor not found exactly once");

// Insert a PIN check at the very top of the handler. If entering edit mode and not
// yet unlocked this tab, prompt. Wrong/cancel => bail before admin flips.
const GATE =
'adminBtn.addEventListener("click",()=>{\n' +
'  /* TERRMAP_PIN_v1 — soft gate on entering edit mode (view is always open) */\n' +
'  var TERRMAP_PIN = ' + JSON.stringify(PIN) + ';\n' +
'  if(!admin){\n' +
'    var unlocked=false; try{ unlocked = sessionStorage.getItem("terrmap_edit_unlocked")==="1"; }catch(e){}\n' +
'    if(!unlocked){\n' +
'      var entered = window.prompt("Admin edit is locked. Enter the PIN to make changes:");\n' +
'      if(entered===null) return;                 /* cancelled */\n' +
'      if(entered!==TERRMAP_PIN){ window.alert("Incorrect PIN. Still in view-only mode."); return; }\n' +
'      try{ sessionStorage.setItem("terrmap_edit_unlocked","1"); }catch(e){}\n' +
'    }\n' +
'  }\n' +
'  admin=!admin;';
h = h.split(ANCHOR).join(GATE);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("spark-territory-map.backup-pin-" + stamp + ".html", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED TERRMAP_PIN_v1 (soft PIN)");
console.log("  View: unchanged, open to all users");
console.log("  Admin edit: prompts for a PIN; correct PIN unlocks edit for the browser tab");
console.log("  EOL preserved:", hadCRLF ? "CRLF" : "LF");
console.log("  Reminder: soft gate only — the PIN is readable in page source (public repo)");
console.log("  backup: spark-territory-map.backup-pin-" + stamp + ".html");
