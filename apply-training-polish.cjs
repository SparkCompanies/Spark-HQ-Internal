// TRAINING_POLISH_v1 — compacts the Training tab's banner stack, removes diagnostic leak
// Run from repo root:  node apply-training-polish.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("TRAINING_POLISH_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
function R(old, neu, label){
  let a = old, c = h.split(a).length - 1;
  if (c !== 1) { const b = old.replace(/\n/g, "\r\n");
    if (h.split(b).length - 1 === 1) { a = b; neu = neu.replace(/\n/g, "\r\n"); c = 1; } }
  if (c !== 1) die(label + ": found " + c);
  h = h.split(a).join(neu);
  console.log("ok  " + label);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-trainpolish-" + stamp + ".html", h);

// 1) Launch card: slimmer, one-line pitch
R('style="margin:22px 26px 6px;background:#FFFFFF;border:1px solid #E7E2D4;border-left:4px solid #FFC800;border-radius:14px;padding:20px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;box-shadow:0 2px 10px rgba(20,18,10,0.05);"',
  'style="margin:14px 26px 4px;background:#FFFFFF;border:1px solid #E7E2D4;border-left:4px solid #FFC800;border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(20,18,10,0.04);"',
  "launch card frame");
R('<div style="font-size:13.5px;color:#6B675C;line-height:1.5;margin-top:4px;max-width:560px;">Your first days at Spark, step by step: machine setup, the tool stack, who we are, and the craft. Interactive checklists, progress that follows your login, and a certificate at the end.</div>',
  '<div style="font-size:13px;color:#6B675C;line-height:1.4;margin-top:2px;max-width:640px;">Your first days, step by step \u2014 progress follows your login, certificate at the end.</div>',
  "launch card copy");
R('<svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" style="flex-shrink:0"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#FFC800" stroke="#B8912E" stroke-width="0.6"/></svg>',
  '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" style="flex-shrink:0"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#FFC800" stroke="#B8912E" stroke-width="0.6"/></svg>',
  "launch card icon");

// 2) Welcome bar: tighter
R('.lms-welcome {\n  display: flex; align-items: center; justify-content: space-between;\n  gap: 18px; flex-wrap: wrap;\n  padding: 18px 24px;',
  '.lms-welcome {\n  display: flex; align-items: center; justify-content: space-between;\n  gap: 18px; flex-wrap: wrap;\n  padding: 10px 18px;',
  "welcome bar padding");

// 3) Sandbox card: hide diagnostics for unconfigured users (clean launch tile instead)
R('if(typeof workerFetch!=="function" || !tcWorkerConfigured()){ tcState("<div class=\\"tc-empty\\">Worker not connected \\u2014 set it under Admin \\u2192 Connections to see team certification progress here.</div>"); return; }',
  'if(typeof workerFetch!=="function" || !tcWorkerConfigured()){ var _tb=document.getElementById("teamCertBody"); if(_tb) _tb.style.display="none"; var _tr=document.querySelector(".tcc-refresh"); if(_tr) _tr.style.display="none"; return; }',
  "sandbox diagnostic -> hidden");

// 4) Compaction CSS
const CSS = '<style id="training-polish">/* TRAINING_POLISH_v1 */\n' +
'.team-cert-card{padding:12px 18px !important;margin-top:10px !important}\n' +
'.tcc-sub{display:none !important}\n' +
'.lms-welcome{margin-top:10px}\n' +
'</style>\n';
const bi = h.lastIndexOf("</body>");
if (bi < 0) die("no </body>");
h = h.slice(0, bi) + CSS + h.slice(bi);
console.log("ok  compaction css");

fs.writeFileSync(F, h);
console.log("APPLIED TRAINING_POLISH_v1");
console.log("  backup: index.backup-trainpolish-" + stamp + ".html");
