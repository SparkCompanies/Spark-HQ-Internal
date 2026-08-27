// HOME_TODAY_v1 — the "Today · Outlook" card goes LIVE.
// Each signed-in person sees THEIR OWN Outlook day, read through the worker's
// existing /calendar endpoint (self-scoped: the worker derives the mailbox from
// the verified login, so nobody can read anyone else's schedule).
// Fake sample meetings removed; card joins the default layout; no longer
// tagged SAMPLE or purged from saved layouts. Empty day says so honestly.
// CRLF-safe, idempotent. Run from the repo root, then commit + push.
const fs = require("fs");
const F = "spark-home.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("HOME_TODAY_v1")) { console.log("Already applied."); process.exit(0); }
if (!raw.includes("HOME_LIVE_v1")) { console.error("ABORT — HOME_LIVE_v1 not present (wrong file state)"); process.exit(1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["TODAY", "today:{t:'Today \u00b7 Outlook',lock:false,\n opts:[{k:'range',label:'Range',type:'select',c:['Work hours','Full day','Next 3 days'],d:'Work hours'},{k:'loc',label:'Show location',type:'toggle',d:true}],\n render:function(o){var loc=o.loc?' <span class=\"sub\">\u00b7 Troy Conference Room</span>':'';\n  var s=head('Today \u00b7 '+o.range.toLowerCase(),IC.cal,'Outlook')+'<div class=\"row\"><span><b>9:00</b> &nbsp;Weekly leadership sync'+loc+' <span class=\"sub\">(sample)</span></span></div><div class=\"row\"><span><b>1:00</b> &nbsp;Greenshades implementation call <span class=\"sub\">(sample)</span></span></div>';\n  if(o.range!=='Work hours')s+='<div class=\"row\"><span><b>6:30</b> &nbsp;Awana TNT leader night <span class=\"sub\">(sample)</span></span></div>';\n  s+='<div class=\"sub\" style=\"margin-top:8px;\">Live feed connects via Microsoft sign-in</div>';\n  return s;}},", "today:{t:'Today \\u00b7 Outlook',lock:false,\n opts:[],\n render:function(o){var d=window.__CALDAY||null;\n  var s=head('Today \\u00b7 Outlook',IC.cal,'Outlook \\u00b7 live');\n  s+='<div id=\"todayLiveList\">'+(d?todayRows(d):'<div class=\"sub\">Loading your day\\u2026</div>')+'</div>';\n  return s;}},\n"], ["DEFAULT", "var DEFAULT=[{id:'ar',s:6},{id:'pipeline',s:3},{id:'headcount',s:3},{id:'links',s:3},{id:'jarvis',s:3}]; /* HOME_LIVE_v1 \u2014 live Salesforce + Xero cards by default */", "var DEFAULT=[{id:'ar',s:6},{id:'today',s:3},{id:'pipeline',s:3},{id:'headcount',s:3},{id:'links',s:3},{id:'jarvis',s:3}]; /* HOME_LIVE_v1 + HOME_TODAY_v1 \u2014 live cards by default */"], ["SAMPLE", "SAMPLE_WIDGETS={today:1,", "SAMPLE_WIDGETS={"], ["PROBE", "loadAR('Spark Talent');", "loadAR('Spark Talent');\n/* HOME_TODAY_v1 \\u2014 per-user Outlook day via worker /calendar (self-scoped to the signed-in user) */\nfunction todayRows(d){\n var evs=(d&&d.events)||[];var t=new Date();\n function sameDay(x){var e=new Date(x);return e.getFullYear()===t.getFullYear()&&e.getMonth()===t.getMonth()&&e.getDate()===t.getDate();}\n var rows=evs.filter(function(e){return e.start&&sameDay(e.start);});\n if(!rows.length)return '<div class=\"sub\">Nothing on your calendar today</div>';\n var out='';var max=6;\n rows.slice(0,max).forEach(function(e){\n  var tm=e.allDay?'All day':new Date(e.start).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});\n  var loc=e.location?' <span class=\"sub\">\\u00b7 '+String(e.location).replace(/[<>&]/g,'')+'</span>':'';\n  out+='<div class=\"row\"><span><b>'+tm+'</b> &nbsp;'+String(e.subject).replace(/[<>&]/g,'')+loc+'</span></div>';\n });\n if(rows.length>max)out+='<div class=\"sub\" style=\"margin-top:6px;\">+'+(rows.length-max)+' more</div>';\n return out;\n}\nwGet('/calendar').then(function(d){\n window.__CALDAY=d;\n var el=document.getElementById('todayLiveList');\n if(el)el.innerHTML=todayRows(d);\n}).catch(function(e){\n var el=document.getElementById('todayLiveList');\n if(el)el.innerHTML='<div class=\"sub\">Calendar unavailable right now</div>';\n console.log('[Home] /calendar unavailable:',e);\n});"]];
for (const [name, oldS, newS] of P) {
  const n = h.split(oldS).length - 1;
  if (n !== 1) die(name + " anchor found " + n + " times (want 1)");
  h = h.split(oldS).join(newS);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("spark-home.html.today-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED HOME_TODAY_v1 — Today card shows each person their real Outlook day");
console.log("  NEXT: git add spark-home.html && git commit -m \"Home: live per-user Outlook Today card\" && git push");
