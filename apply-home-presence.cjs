// HOME_PRESENCE_v1 — the "N sparks in HQ right now" greeting becomes REAL.
// Before: a random number 18-29 rolled on every page load (sample data that
// survived the de-fake because it lives in the greeting bar, not a widget).
// After: each signed-in user heartbeats spark_hq_presence once a minute; the
// greeting shows the count of people seen in the last 5 minutes, refreshed
// every minute. Pill hides entirely if the table is missing or empty.
// REQUIRES the spark_hq_presence table (SQL provided alongside this patch).
// CRLF-safe, idempotent. Run from the repo root, then commit + push.
const fs = require("fs");
const F = "spark-home.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("HOME_PRESENCE_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
const OLD = "document.getElementById('presTxt').textContent=(18+Math.floor(Math.random()*12))+' sparks in HQ right now';";
const NEW = "/* HOME_PRESENCE_v1 \u2014 real presence: heartbeat + live 5-min count (replaced a random 18-29) */\n(function(){\n var el=document.getElementById('presTxt'); var pill=el?el.parentElement:null; if(pill)pill.style.display='none';\n function beat(){ if(!window.__me)return;\n  fetch(SB_URL+\"/rest/v1/spark_hq_presence?on_conflict=email\",{method:\"POST\",headers:sbHdr({Prefer:\"resolution=merge-duplicates\"}),body:JSON.stringify({email:window.__me.email,last_seen:new Date().toISOString()})}).catch(function(){});\n }\n function count(){ if(!window.__me)return;\n  var cutoff=new Date(Date.now()-5*60*1000).toISOString();\n  sbGet(\"spark_hq_presence?select=email&last_seen=gte.\"+encodeURIComponent(cutoff)).then(function(rows){\n   var n=(rows||[]).length; if(!el||!pill)return;\n   if(n>0){el.textContent=n+(n===1?' spark':' sparks')+' in HQ right now';pill.style.display='';}\n   else{pill.style.display='none';}\n  }).catch(function(){ if(pill)pill.style.display='none'; });\n }\n function loop(){ beat(); setTimeout(count, 900); }\n setTimeout(loop, 1500); setInterval(loop, 60000);\n})();";
const n = h.split(OLD).length - 1;
if (n !== 1) { console.error("ABORT — presence anchor found " + n + " times (want 1); no changes written"); process.exit(1); }
h = h.split(OLD).join(NEW);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("spark-home.html.pres-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED HOME_PRESENCE_v1 — greeting count is now live (requires spark_hq_presence table)");
console.log("  NEXT: git add spark-home.html && git commit -m \"Home: real presence count in greeting\" && git push");
