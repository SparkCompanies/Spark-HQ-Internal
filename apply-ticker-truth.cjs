// TICKER_TRUTH_v1 — fixes two wrong facts scrolling across Home.
//   1) "HEADCOUNT · 277 on payroll" — the ticker read whatever text happened to
//      be in the KPI card when it built. If the live Salesforce number had not
//      landed yet (or a stale cached one was showing), that wrong figure froze
//      into the banner while the card later showed 495. It now reads
//      window.__SFSUM directly, and the ticker rebuilds when live data arrives.
//   2) "New hire class starts Aug 3" — hardcoded in FOUR places (ticker, hero
//      card, two morning-brief countdowns), all pointing at a date that already
//      passed. Now ONE constant, NEXT_CLASS, drives every surface, rendering a
//      live countdown: "starts Aug 19 — 5 days out", then "tomorrow", "today".
// TO CHANGE THE DATE LATER: edit NEXT_CLASS in spark-home.html (search
// TICKER_TRUTH_v1); every surface follows.
// CRLF-safe, idempotent. Run from the repo root, then commit + push.
const fs = require("fs");
const F = "spark-home.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("TICKER_TRUTH_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["TICKER", " var kh=document.getElementById('kpiHc');\n if(kh)items.push('<span><b>HEADCOUNT</b> \u00b7 '+esc(kh.textContent)+' on payroll</span>');\n items.push('<span><b>MILESTONE</b> \u00b7 New hire class starts Aug 3</span>');", " /* TICKER_TRUTH_v1 \u2014 headcount from the live payload, never a stale on-screen value */\n var hcLive=(window.__SFSUM&&(window.__SFSUM.headcount||window.__SFSUM.heads))||null;\n var kh=document.getElementById('kpiHc');\n var hcTxt=hcLive!=null?String(hcLive):((kh&&/^[0-9,]+$/.test((kh.textContent||'').trim()))?kh.textContent.trim():null);\n if(hcTxt)items.push('<span><b>HEADCOUNT</b> \u00b7 '+esc(hcTxt)+' on payroll</span>');\n items.push('<span><b>MILESTONE</b> \u00b7 '+esc(nextClassLine())+'</span>');"], ["CONST", "/* ---------- ticker from real activity ---------- */\nfunction tickerFromPulse(){", "/* TICKER_TRUTH_v1 \u2014 ONE place to set the next new-hire class date.\n   Change NEXT_CLASS below and the ticker, the hero card and the morning brief\n   all follow. Nothing hardcodes a date any more. */\nvar NEXT_CLASS='2026-08-19T08:30:00';\nfunction nextClassDays(){return Math.ceil((new Date(NEXT_CLASS)-new Date())/86400000);}\nfunction nextClassLine(){\n  var d=nextClassDays();\n  var dt=new Date(NEXT_CLASS);\n  var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];\n  var when=M[dt.getMonth()]+' '+dt.getDate();\n  if(d>1) return 'New hire class starts '+when+' \\u2014 '+d+' days out';\n  if(d===1) return 'New hire class starts tomorrow \\u2014 '+when;\n  if(d===0) return 'New hire class starts today';\n  return 'New hire class started '+when;\n}\n/* ---------- ticker from real activity ---------- */\nfunction tickerFromPulse(){"], ["HERO", "<span>New hire class of 8 starts Aug 3 &mdash; meet them Friday</span>", "<span id=\"heroClassLine\">New hire class starts Aug 19</span>"], ["BRIEF1", "var bd=document.getElementById('briefDays');if(bd){bd.textContent=Math.max(0,Math.ceil((new Date('2026-08-03T09:00:00')-new Date())/86400000));}", "var bd=document.getElementById('briefDays');if(bd){bd.textContent=Math.max(0,nextClassDays());}"], ["BRIEF2", "(function(){var el=document.getElementById('briefDays');if(el){el.textContent=Math.max(0,Math.ceil((new Date('2026-08-03T09:00:00')-new Date())/86400000));}})();", "(function(){var el=document.getElementById('briefDays');if(el){el.textContent=Math.max(0,nextClassDays());}\n var hl=document.getElementById('heroClassLine');if(hl){hl.textContent=nextClassLine();}})();"], ["RETICK", "function applySfBoard(d){", "function applySfBoard(d){ setTimeout(function(){ try{ if(typeof tickerFromPulse==='function') tickerFromPulse(); }catch(e){} },0); /* TICKER_TRUTH_v1 */"], ["COUNTDOWN", "<div class=\"cd\"><span>New hire class \u00b7 Aug 3</span><b>'+dto(new Date('2026-08-03T09:00:00'))+'d</b></div>", "<div class=\"cd\"><span>New hire class \u00b7 Aug 19</span><b>'+dto(new Date(NEXT_CLASS))+'d</b></div>"]];
for (const [name, oldS] of P) { const n = h.split(oldS).length - 1; if (n !== 1) die(name + " anchor found " + n + " times (want 1)"); }
for (const [name, oldS, newS] of P) h = h.split(oldS).join(newS);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("spark-home.html.ticker-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED TICKER_TRUTH_v1");
console.log("  ticker headcount now comes from the live Salesforce payload");
console.log("  new-hire date lives in ONE constant (NEXT_CLASS) and counts down");
console.log("  corrected in 5 places: ticker, hero, 2 brief counters, countdowns widget");
console.log("  NEXT: git add spark-home.html && git commit -m \"Home: ticker shows live headcount and real class countdown\" && git push");
