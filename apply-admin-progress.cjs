// ADMIN_PROGRESS_v1 — adds "Team progress" section to the HQ Admin tab
// Reads spark_academy_progress + spark_onboarding_progress from Supabase (RLS: super_admin read-all)
// Run from the repo root:  node apply-admin-progress.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");

if (h.includes("ADMIN_PROGRESS_v1")) {
  console.log("Already applied — nothing to do.");
  process.exit(0);
}

const A1 = '          <button class="admin-subnav-item" data-admin-tab="training-admin">\n            <span>Training</span>\n          </button>\n';
const A2 = '          <!-- SPARK STANDARD ADMIN PANE -->';
const BODY = "</body>";

function die(msg) { console.error("ABORT — " + msg + " (no changes written)"); process.exit(1); }
// CRLF-aware: Windows checkouts store \r\n; match whichever variant the file uses
function resolve(a, label) {
  if (h.split(a).length === 2) return { a: a, nl: "\n" };
  const b = a.replace(/\n/g, "\r\n");
  if (h.split(b).length === 2) return { a: b, nl: "\r\n" };
  die(label + " anchor not found exactly once");
}
const R1 = resolve(A1, "subnav");
const R2 = resolve(A2, "pane");
if (h.lastIndexOf(BODY) < 0) die("no </body>");

const BTN = A1 +
'          <button class="admin-subnav-item" data-admin-tab="team-progress">\n' +
'            <span>Team progress</span>\n' +
'          </button>\n';

const PANE =
'          <!-- TEAM PROGRESS PANE (ADMIN_PROGRESS_v1) -->\n' +
'          <div class="admin-pane" data-admin-pane="team-progress" style="display: none;">\n' +
'            <div class="admin-hero">\n' +
'              <div class="eyebrow">Content \u00b7 Training</div>\n' +
'              <h2>Team progress. <span style="color: var(--muted-light);">Academy + Spark Circuit, per person.</span></h2>\n' +
'              <div class="dek">Live from Supabase: every team member\u2019s Spark Academy lessons, Gauntlet bests, and Spark Circuit onboarding checks \u2014 synced to their login. A person\u2019s row appears after they open either app while signed in.</div>\n' +
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

const SCRIPT =
'<script>/* ADMIN_PROGRESS_v1 */\n' +
'(function(){\n' +
'  var SB="https://rdyzvohphrmkkowdsoam.supabase.co", KEY="sb_publishable_F1SY19w16Y4Frjd3C9RSGQ_6v4DmiO5";\n' +
'  function tok(){ try{ var a=JSON.parse(localStorage.getItem("spark_hq_sb_auth")||"{}"); return a.access_token||(a.currentSession&&a.currentSession.access_token)||(a.session&&a.session.access_token)||""; }catch(e){ return ""; } }\n' +
'  function cnt(o){ if(!o||typeof o!=="object")return 0; var n=0; for(var k in o){ if(o[k]) n++; } return n; }\n' +
'  function fg(g){ if(g==null)return "\\u2014"; if(typeof g==="number")return String(g); if(typeof g==="object"){ var s=(g.score!=null)?g.score:((g.best!=null)?g.best:null); var t=(g.total!=null)?g.total:null; if(s!=null) return t?(s+"/"+t):String(s); } return String(g); }\n' +
'  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];}); }\n' +
'  window.tpLoad = function(){\n' +
'    var body=document.getElementById("tpBody"); if(!body) return;\n' +
'    var t=tok();\n' +
'    if(!t){ body.innerHTML=\'<div style="color:#a33;padding:16px 2px;font-size:13.5px">No Supabase session found \\u2014 sign in to HQ first.</div>\'; return; }\n' +
'    body.innerHTML=\'<div style="color:#888;padding:16px 2px;font-size:13.5px">Loading team progress\\u2026</div>\';\n' +
'    var H={apikey:KEY,Authorization:"Bearer "+t};\n' +
'    Promise.all([\n' +
'      fetch(SB+"/rest/v1/spark_academy_progress?select=email,progress,updated_at",{headers:H}).then(function(r){return r.ok?r.json():[];}).catch(function(){return [];}),\n' +
'      fetch(SB+"/rest/v1/spark_onboarding_progress?select=email,progress,updated_at",{headers:H}).then(function(r){return r.ok?r.json():[];}).catch(function(){return [];})\n' +
'    ]).then(function(res){\n' +
'      var m={};\n' +
'      res[0].forEach(function(r){ var e=(r.email||"").toLowerCase(); if(!e)return; (m[e]=m[e]||{}).a=r; });\n' +
'      res[1].forEach(function(r){ var e=(r.email||"").toLowerCase(); if(!e)return; (m[e]=m[e]||{}).o=r; });\n' +
'      var rows=Object.keys(m).map(function(e){\n' +
'        var a=m[e].a, o=m[e].o, ap=(a&&a.progress)||{}, op=(o&&o.progress)||{};\n' +
'        var last=Math.max(a?(Date.parse(a.updated_at||0)||0):0, o?(Date.parse(o.updated_at||0)||0):0);\n' +
'        return { em:e, les:cnt(ap.lessons), gl:fg(ap.gauntletBest), gd:fg(ap.gauntletBestDirector), ac:ap.certName||"\\u2014", ck:cnt(op.checks), oc:op.certName||"\\u2014", last:last };\n' +
'      }).sort(function(x,y){ return y.last-x.last; });\n' +
'      if(!rows.length){ body.innerHTML=\'<div style="color:#888;padding:16px 2px;font-size:13.5px">No progress rows yet \\u2014 they appear as team members open Academy or Spark Circuit while signed in. If you expected rows, confirm your account is super_admin.</div>\'; return; }\n' +
'      var th=\'style="text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#999;padding:10px 10px;border-bottom:1px solid #e7e7e7;white-space:nowrap;text-transform:uppercase"\';\n' +
'      var td=\'style="font-size:13px;color:#222;padding:9px 10px;border-bottom:1px solid #f1f1f1;white-space:nowrap"\';\n' +
'      body.innerHTML=\'<div style="overflow:auto"><table style="border-collapse:collapse;width:100%;min-width:880px"><thead><tr>\'\n' +
'        +\'<th \'+th+\'>Team member</th><th \'+th+\'>Academy lessons</th><th \'+th+\'>Gauntlet L</th><th \'+th+\'>Gauntlet D</th><th \'+th+\'>Academy cert</th><th \'+th+\'>Circuit checks</th><th \'+th+\'>Circuit cert</th><th \'+th+\'>Last active</th>\'\n' +
'        +\'</tr></thead><tbody>\'\n' +
'        +rows.map(function(r){ return \'<tr data-em="\'+esc(r.em)+\'"><td \'+td+\'>\'+esc(r.em)+\'</td><td \'+td+\'>\'+r.les+\'</td><td \'+td+\'>\'+esc(r.gl)+\'</td><td \'+td+\'>\'+esc(r.gd)+\'</td><td \'+td+\'>\'+esc(r.ac)+\'</td><td \'+td+\'>\'+r.ck+\'</td><td \'+td+\'>\'+esc(r.oc)+\'</td><td \'+td+\'>\'+(r.last?new Date(r.last).toLocaleString():"\\u2014")+\'</td></tr>\'; }).join("")\n' +
'        +\'</tbody></table></div>\';\n' +
'      var f=document.getElementById("tpFilter");\n' +
'      if(f&&!f._tp){ f._tp=1; f.addEventListener("input",function(){ var q=this.value.toLowerCase(); document.querySelectorAll("#tpBody tbody tr").forEach(function(tr){ tr.style.display = tr.getAttribute("data-em").indexOf(q)>=0 ? "" : "none"; }); }); }\n' +
'    });\n' +
'  };\n' +
'  var prev=window.switchAdminTab;\n' +
'  if(typeof prev==="function"){\n' +
'    window.switchAdminTab=function(tab){ prev(tab); if(tab==="team-progress"){ try{ tpLoad(); }catch(e){} } };\n' +
'  }\n' +
'})();\n' +
'<\/script>\n';

// backup, then apply all three insertions
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-adminprog-" + stamp + ".html", h);

h = h.replace(R1.a, BTN.replace(/\n/g, R1.nl));
h = h.replace(R2.a, PANE.replace(/\n/g, R2.nl));
const at = h.lastIndexOf(BODY);
h = h.slice(0, at) + SCRIPT.replace(/\n/g, R1.nl) + h.slice(at);

fs.writeFileSync(F, h);
console.log("APPLIED ADMIN_PROGRESS_v1");
console.log("  backup: index.backup-adminprog-" + stamp + ".html");
console.log("  next:   git add index.html && git commit -m \"Admin: Team Progress section\" && git push");
