// PULSE_CAL_REMOVE_v1 — retires the duplicate month calendar in The Pulse.
// Home now has ONE calendar surface: the timeline band at the top, which
// already carries its own month grid, day strip and stats. Two widgets drawing
// the same events meant two layouts to keep in sync and a second render pass on
// every load. The Pulse row becomes a clean two-up (Most Recognized / Values in
// Action). The renderer is kept but guarded, so nothing throws if the nodes are
// absent — and it can be reinstated by restoring the markup alone.
// CRLF-safe, idempotent. Run from the repo root, then commit + push.
const fs = require("fs");
const F = "spark-home.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("PULSE_CAL_REMOVE_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["GRID", "<div class=\"statgrid\" style=\"grid-template-columns:1fr 1fr 1.2fr;\">\n        <div class=\"statcard\"><h4>MOST RECOGNIZED</h4><div id=\"mostRec\"></div></div>\n        <div class=\"statcard calcard\" id=\"pulseCalCard\"><h4 id=\"pulseCalHead\">CALENDAR</h4>\n<div id=\"pulseCalGrid\"></div>\n<div id=\"pulseCalEvents\"><div class=\"calevt\"><span>Loading your calendar&hellip;</span></div></div>\n</div>\n<div class=\"statcard\"><h4>VALUES IN ACTION</h4><div id=\"valAct\"></div></div>\n      </div>", "<!-- PULSE_CAL_REMOVE_v1: month calendar retired \u2014 the timeline band at the top\n     of Home is now the single calendar surface (it carries its own month rail),\n     and two widgets showing the same events disagreed on layout and load time. -->\n      <div class=\"statgrid\" style=\"grid-template-columns:1fr 1fr;\">\n        <div class=\"statcard\"><h4>MOST RECOGNIZED</h4><div id=\"mostRec\"></div></div>\n        <div class=\"statcard\"><h4>VALUES IN ACTION</h4><div id=\"valAct\"></div></div>\n      </div>"], ["GUARD", "function pulseCalRender(d){\n  var head=document.getElementById('pulseCalHead');", "function pulseCalRender(d){\n  if(!document.getElementById('pulseCalCard')) return; /* PULSE_CAL_REMOVE_v1 */\n  var head=document.getElementById('pulseCalHead');"]];
for (const [name, oldS] of P) { const n = h.split(oldS).length - 1; if (n !== 1) die(name + " anchor found " + n + " times (want 1)"); }
for (const [name, oldS, newS] of P) h = h.split(oldS).join(newS);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("spark-home.html.pulsecalrm-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED PULSE_CAL_REMOVE_v1 — duplicate month calendar removed from The Pulse");
console.log("  NEXT: git add spark-home.html && git commit -m \"Home: single calendar surface\" && git pull --rebase && git push");
