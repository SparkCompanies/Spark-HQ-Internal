// ADMIN_PROGRESS_v2 — "Team progress" dashboard for the HQ Admin tab (step-level: where each person is)
// Self-healing installer: fresh index -> full install; v1 present -> in-place upgrade; v2 present -> no-op.
// Stage map mirrors Spark Circuit build fb7dbc4 (38 steps). Rerun after any index clobber.
// Run from repo root:  node apply-admin-progress.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");

function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
function resolve(a, label){
  if (h.split(a).length === 2) return a;
  const b = a.replace(/\n/g, "\r\n");
  if (h.split(b).length === 2) return b;
  die(label + " anchor not found exactly once");
}

if (h.includes("ADMIN_PROGRESS_v2_1")) { console.log("Already applied (v2.1)."); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-adminprog-" + stamp + ".html", h);

const V2 = "<script>/* ADMIN_PROGRESS_v2_1 (supersedes ADMIN_PROGRESS_v1) */\n(function(){\n  var SB=\"https://rdyzvohphrmkkowdsoam.supabase.co\", KEY=\"sb_publishable_F1SY19w16Y4Frjd3C9RSGQ_6v4DmiO5\";\n  var ST=[\n    {id:\"s1\",n:\"Machine Ready\",s:[[\"s1-password\",\"c\",2],[\"s1-mfa\",\"c\",2],[\"s1-wifi\",\"c\",3],[\"s1-onedrive\",\"c\",2],[\"s1-chrome\",\"c\",2],[\"s1-settings\",\"c\",4]]},\n    {id:\"s2\",n:\"Plugged In\",s:[[\"s2-stack\",\"c\",1],[\"s2-teams\",\"c\",3],[\"s2-signature\",\"c\",3],[\"s2-teamsvemail\",\"c\",2],[\"s2-linkedin\",\"c\",3],[\"s2-google\",\"c\",2],[\"s2-bookings\",\"c\",1]]},\n    {id:\"s3\",n:\"Welcome to Spark\",s:[[\"s3-story\",\"q\",6],[\"s3-family\",\"q\",7],[\"s3-who\",\"q\",7],[\"s3-dress\",\"c\",1],[\"s3-values\",\"q\",8],[\"s3-profile\",\"c\",1],[\"s3-rhythm\",\"c\",1],[\"s3-words\",\"q\",8]]},\n    {id:\"s4\",n:\"Recruiting Process\",s:[[\"s4-staffing\",\"c\",1],[\"s4-lifecycle\",\"q\",7],[\"s4-reqs\",\"c\",1],[\"s4-sourcing\",\"c\",2],[\"s4-contact\",\"c\",2],[\"s4-prescreen\",\"q\",12],[\"s4-dub\",\"c\",2],[\"s4-reference\",\"c\",2],[\"s4-placement\",\"c\",3],[\"s4-sandbox\",\"q\",5],[\"s4-service\",\"c\",2],[\"s4-legal\",\"q\",13],[\"s4-charge\",\"c\",3]]},\n    {id:\"s5\",n:\"One Standard\",s:[[\"s5-respect\",\"a\",0],[\"s5-confidential\",\"a\",0],[\"s5-pay\",\"a\",0],[\"s5-security\",\"aq\",5],[\"s5-eeo\",\"a\",0]]}\n  ];\n  var QZ=[[\"s3-story\",\"Story\",6],[\"s3-family\",\"Portfolio\",7],[\"s3-who\",\"Who-to\",7],[\"s3-values\",\"Values\",8]];\n  var TOTAL=0; ST.forEach(function(g){ TOTAL+=g.s.length; });\n  function tok(){ try{ var a=JSON.parse(localStorage.getItem(\"spark_hq_sb_auth\")||\"{}\"); return a.access_token||(a.currentSession&&a.currentSession.access_token)||(a.session&&a.session.access_token)||\"\"; }catch(e){ return \"\"; } }\n  function cnt(o){ if(!o||typeof o!==\"object\")return 0; var n=0; for(var k in o){ if(o[k]) n++; } return n; }\n  function fg(g){ if(g==null)return \"\\u2014\"; if(typeof g===\"number\")return String(g); if(typeof g===\"object\"){ var s=(g.score!=null)?g.score:((g.best!=null)?g.best:null); var t=(g.total!=null)?g.total:null; if(s!=null) return t?(s+\"/\"+t):String(s); } return String(g); }\n  function esc(s){ return String(s==null?\"\":s).replace(/[&<>\"]/g,function(c){return {\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",'\"':\"&quot;\"}[c];}); }\n  function stepDone(p,st){\n    var id=st[0], t=st[1], m=st[2];\n    if(t===\"c\"){ for(var i=0;i<m;i++){ if(!(p.checks||{})[id+\":\"+i]) return false; } return true; }\n    if(t===\"q\"){ return ((p.quiz||{})[id]||0)>=m; }\n    if(t===\"a\"){ return !!(p.attest||{})[id]; }\n    if(t===\"aq\"){ return !!(p.attest||{})[id] && ((p.quiz||{})[id]||0)>=m; }\n    return false;\n  }\n  function circuitRow(p){\n    p=p||{}; var stages=[], doneAll=0, pos=null;\n    ST.forEach(function(g){\n      var d=0; g.s.forEach(function(st){ if(stepDone(p,st)) d++; });\n      stages.push({n:g.n,d:d,t:g.s.length}); doneAll+=d;\n      if(pos===null && d<g.s.length) pos={n:g.n,d:d,t:g.s.length};\n    });\n    var ga=(p.quiz||{}).gauntlet||0, cert=(p.certName||\"\").trim();\n    var where = cert ? \"CERTIFIED \\u2014 \"+esc(cert)\n      : (pos===null ? (ga>=12 ? \"Ready to certify\" : \"The Gauntlet \\u00b7 best \"+ga+\"/12\")\n                    : pos.n+\" \\u00b7 \"+pos.d+\"/\"+pos.t+\" steps\");\n    return { pct: Math.round(doneAll/TOTAL*100), stages:stages, gauntlet:ga, cert:cert, where:where,\n      quizzes: QZ.map(function(qz){ return {l:qz[1], s:(p.quiz||{})[qz[0]]||0, m:qz[2]}; }) };\n  }\n  function bar(pct){ return '<span style=\"display:inline-block;width:86px;height:8px;border-radius:5px;background:#eee;vertical-align:middle;overflow:hidden;margin-right:7px\"><span style=\"display:block;height:100%;width:'+pct+'%;background:'+(pct>=100?\"#16a34a\":pct>=50?\"#FFC800\":\"#f59e0b\")+'\"></span></span><b>'+pct+'%</b>'; }\n  function cell(sg){ var full=sg.d>=sg.t, none=sg.d===0;\n    return '<td title=\"'+esc(sg.n)+'\" style=\"text-align:center;font-weight:700;color:'+(full?\"#16a34a\":none?\"#bbb\":\"#b45309\")+'\">'+sg.d+\"/\"+sg.t+\"</td>\"; }\n  function chip(qz){ var ok=qz.s>=qz.m;\n    return '<span style=\"display:inline-block;margin:1px 3px 1px 0;padding:2px 7px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid '+(ok?\"#16a34a\":\"#ddd\")+';background:'+(ok?\"#e9f9ef\":\"#f7f7f7\")+';color:'+(ok?\"#136c34\":\"#888\")+'\">'+qz.l+\" \"+qz.s+\"/\"+qz.m+\"</span>\"; }\n  var CACHE={ob:[],ac:[]};\n  function render(){\n    var f=(document.getElementById(\"tpFilter\")||{value:\"\"}).value.toLowerCase();\n    var el=document.getElementById(\"tpBody\"); if(!el) return;\n    var ob=CACHE.ob.filter(function(r){ return (r.email||\"\").toLowerCase().indexOf(f)>=0; });\n    var ac=CACHE.ac.filter(function(r){ return (r.email||\"\").toLowerCase().indexOf(f)>=0; });\n    var h='<h4 style=\"margin:6px 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#888\">Spark Circuit \\u2014 onboarding</h4>';\n    if(!ob.length){ h+='<div style=\"color:#888;font-size:13px;padding:6px 0 14px\">No Circuit rows yet \\u2014 rows appear after someone opens Spark Circuit signed in.</div>'; }\n    else{\n      h+='<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\"><thead><tr>';\n      [\"Team member\",\"Overall\",\"Where they are\",\"Machine\",\"Plugged\",\"Welcome\",\"Recruiting\",\"Standard\",\"Quizzes\",\"Gauntlet\",\"Last active\"].forEach(function(c){ h+='<th style=\"text-align:left;padding:7px 8px;border-bottom:2px solid #eee;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#999;white-space:nowrap\">'+c+\"</th>\"; });\n      h+=\"</tr></thead><tbody>\";\n      ob.forEach(function(r){\n        var c=circuitRow(r.progress);\n        h+='<tr style=\"border-bottom:1px solid #f2f2f2\">';\n        h+='<td style=\"padding:9px 8px;font-weight:600;white-space:nowrap\">'+esc(r.email||r.user_id)+\"</td>\";\n        h+='<td style=\"white-space:nowrap;padding:9px 8px\">'+bar(c.pct)+\"</td>\";\n        h+='<td style=\"padding:9px 8px;font-weight:700;color:'+(c.cert?\"#16a34a\":\"#333\")+';white-space:nowrap\">'+c.where+\"</td>\";\n        c.stages.forEach(function(sg){ h+=cell(sg); });\n        h+='<td style=\"padding:9px 8px;white-space:nowrap\">'+c.quizzes.map(chip).join(\"\")+\"</td>\";\n        h+='<td style=\"text-align:center;font-weight:700;color:'+(c.gauntlet>=12?\"#16a34a\":\"#888\")+'\">'+c.gauntlet+\"/12</td>\";\n        h+='<td style=\"padding:9px 8px;color:#888;white-space:nowrap\">'+esc((r.updated_at||\"\").slice(0,10))+\"</td>\";\n        h+=\"</tr>\";\n      });\n      h+=\"</tbody></table></div>\";\n    }\n    h+='<h4 style=\"margin:22px 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#888\">Spark Academy</h4>';\n    if(!ac.length){ h+='<div style=\"color:#888;font-size:13px;padding:6px 0\">No Academy rows yet.</div>'; }\n    else{\n      h+='<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\"><thead><tr>';\n      [\"Team member\",\"Lessons\",\"Gauntlet (L)\",\"Gauntlet (D)\",\"Certificate\",\"Last active\"].forEach(function(c){ h+='<th style=\"text-align:left;padding:7px 8px;border-bottom:2px solid #eee;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#999\">'+c+\"</th>\"; });\n      h+=\"</tr></thead><tbody>\";\n      ac.forEach(function(r){\n        var p=r.progress||{};\n        h+='<tr style=\"border-bottom:1px solid #f2f2f2\"><td style=\"padding:9px 8px;font-weight:600\">'+esc(r.email||r.user_id)+\"</td>\";\n        h+=\"<td>\"+cnt(p.lessons)+\"</td><td>\"+fg(p.gauntletBest)+\"</td><td>\"+fg(p.gauntletBestDirector)+\"</td>\";\n        h+='<td style=\"font-weight:700;color:'+((p.certName||\"\").trim()?\"#16a34a\":\"#bbb\")+'\">'+esc((p.certName||\"\").trim()||\"\\u2014\")+\"</td>\";\n        h+='<td style=\"color:#888\">'+esc((r.updated_at||\"\").slice(0,10))+\"</td></tr>\";\n      });\n      h+=\"</tbody></table></div>\";\n    }\n    el.innerHTML=h;\n  }\n  window.tpLoad=function(){\n    var el=document.getElementById(\"tpBody\"); if(el) el.innerHTML='<div style=\"color:#888;padding:18px 2px;font-size:13.5px\">Loading\\u2026</div>';\n    var t=tok();\n    if(!t){ if(el) el.innerHTML='<div style=\"color:#b45309;padding:16px 2px;font-size:13.5px\">Sign in to Spark HQ first \\u2014 the dashboard reads Supabase with your login.</div>'; return; }\n    var H={ \"apikey\":KEY, \"Authorization\":\"Bearer \"+t };\n    Promise.all([\n      fetch(SB+\"/rest/v1/spark_onboarding_progress?select=user_id,email,progress,updated_at&order=email\",{headers:H}).then(function(r){return r.ok?r.json():[];}).catch(function(){return [];}),\n      fetch(SB+\"/rest/v1/spark_academy_progress?select=user_id,email,progress,updated_at&order=email\",{headers:H}).then(function(r){return r.ok?r.json():[];}).catch(function(){return [];})\n    ]).then(function(res){ CACHE.ob=res[0]||[]; CACHE.ac=res[1]||[]; render(); });\n  };\n  document.addEventListener(\"input\",function(e){ if(e.target&&e.target.id===\"tpFilter\") render(); });\n  function hook(){\n    var prev=window.switchAdminTab;\n    if(typeof prev===\"function\" && !prev.__tpv2){\n      var w=function(tab){ prev(tab); if(tab===\"team-progress\"){ try{ window.tpLoad(); }catch(e){} } };\n      w.__tpv2=true; window.switchAdminTab=w; return true;\n    }\n    return typeof prev===\"function\";\n  }\n  if(!hook()){ var n=0,t=setInterval(function(){ if(hook()||++n>40) clearInterval(t); },250); }\n})();\n</script>";

let did = [];

// 1) subnav button (only if missing)
if (!h.includes('data-admin-tab="team-progress"')) {
  const A1 = resolve('          <button class="admin-subnav-item" data-admin-tab="training-admin">\n            <span>Training</span>\n          </button>\n', "subnav");
  const nl = A1.includes("\r\n") ? "\r\n" : "\n";
  h = h.replace(A1, A1 + '          <button class="admin-subnav-item" data-admin-tab="team-progress">' + nl + '            <span>Team progress</span>' + nl + '          </button>' + nl);
  did.push("subnav button");
}

// 2) pane (only if missing)
if (!h.includes('data-admin-pane="team-progress"')) {
  const A2 = resolve('          <!-- SPARK STANDARD ADMIN PANE -->', "pane anchor");
  const PANE =
'          <!-- TEAM PROGRESS PANE (ADMIN_PROGRESS_v1) -->\n' +
'          <div class="admin-pane" data-admin-pane="team-progress" style="display: none;">\n' +
'            <div class="admin-hero">\n' +
'              <div class="eyebrow">Content \u00b7 Training</div>\n' +
'              <h2>Team progress. <span style="color: var(--muted-light);">Academy + Spark Circuit, per person.</span></h2>\n' +
'              <div class="dek">Live from Supabase: exactly where every team member is \u2014 stage by stage, quiz by quiz \u2014 synced to their login. A person\u2019s row appears after they open either app while signed in.</div>\n' +
'            </div>\n' +
'            <div class="admin-section">\n' +
'              <div class="admin-section-head">\n' +
'                <h3>All team members</h3>\n' +
'                <div class="actions">\n' +
'                  <input id="tpFilter" placeholder="Filter by email\u2026" style="padding:8px 12px;border:1px solid #ddd;border-radius:8px;font:inherit;font-size:13px;width:220px">\n' +
'                  <button class="btn-secondary" onclick="tpLoad()">Refresh</button>\n' +
'                </div>\n' +
'              </div>\n' +
'              <div id="tpBody"><div style="color:#888;padding:18px 2px;font-size:13.5px">Loading\u2026</div></div>\n' +
'            </div>\n' +
'          </div>\n\n' + A2;
  h = h.replace(A2, PANE);
  did.push("pane");
}

// 3) script: replace v1 block if present, else insert before last </body>
const v1rx = /<script>\/\* ADMIN_PROGRESS_v[12][^*]*\*\/[\s\S]*?<\/script>/;
if (v1rx.test(h)) {
  h = h.replace(v1rx, V2);
  did.push("script (upgraded to v2.1)");
} else {
  const bi = h.lastIndexOf("</body>");
  if (bi < 0) die("no </body>");
  h = h.slice(0, bi) + V2 + "\n" + h.slice(bi);
  did.push("script (fresh install)");
}

fs.writeFileSync(F, h);
console.log("APPLIED ADMIN_PROGRESS_v2_1: " + did.join(", "));
console.log("  backup: index.backup-adminprog-" + stamp + ".html");
