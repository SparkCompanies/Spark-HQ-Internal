// TRAINING_LAYOUT_v2 — restructures the Training tab from four stacked full-width
// strips into: slim launch strip / continue bar / two-up action row / LMS shell.
// Run from repo root:  node apply-training-layout.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("TRAINING_LAYOUT_v2")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-trainlayout-" + stamp + ".html", h);

// anchor check: the launch card must exist (it is our insertion point)
if (h.indexOf('SPARK_LAUNCH_TRAINING_CARD_V1') === -1) die("launch card marker not found");
if (h.lastIndexOf("</body>") === -1) die("no </body>");

const CSS = [
'<style id="training-layout-v2">/* TRAINING_LAYOUT_v2 */',
'#view-training{padding:0 26px 40px;}',
/* every strip shares one gutter now */
'#view-training > div[style*="SPARK_LAUNCH"],',
'#view-training .lms-welcome{margin-left:0 !important;margin-right:0 !important;}',
'#view-training .lms-welcome{margin:10px 0 12px !important;padding:9px 16px !important;}',
/* the launch strip: slimmer, no oversized side margins */
'#trainLaunchCard{margin:14px 0 0 !important;}',
/* two-up action row */
'#trainActionRow{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 16px;align-items:stretch;}',
'#trainActionRow > *{margin:0 !important;height:100%;box-sizing:border-box;}',
'#trainActionRow #stdCard{padding:16px 18px !important;}',
'#trainActionRow .team-cert-card{padding:16px 18px !important;border-radius:14px;}',
'@media (max-width:1180px){#trainActionRow{grid-template-columns:1fr;}}',
/* shell breathes */
'#view-training .lms-shell{gap:20px;}',
'#view-training .lms-content{padding:28px 34px 36px;}',
'</style>'
].join("\n") + "\n";

const JS = [
'<script>/* TRAINING_LAYOUT_v2 */',
'(function(){',
'  function q(i){return document.getElementById(i);}',
'  function row(){',
'    var v=q("view-training"); if(!v) return null;',
'    var r=q("trainActionRow");',
'    if(!r){',
'      var shell=v.querySelector(".lms-shell"); if(!shell) return null;',
'      r=document.createElement("div"); r.id="trainActionRow";',
'      v.insertBefore(r, shell);',
'    }',
'    return r;',
'  }',
'  function tidy(){',
'    var v=q("view-training"); if(!v) return;',
'    var lc=v.querySelector(\'div[style*="border-left:4px solid #FFC800"]\');',
'    if(lc && !lc.id) lc.id="trainLaunchCard";',
'    var r=row(); if(!r) return;',
'    var std=q("stdCard"), tc=q("teamCertCard");',
'    if(std && std.parentElement!==r) r.appendChild(std);',
'    // only relocate the sandbox card AFTER its own injector has cloned it and',
'    // installed #tcRosterCSS \u2014 moving the pre-clone copy suppresses that injection',
'    if(tc && document.getElementById("tcRosterCSS") && tc.parentElement!==r){',
'      var host=tc.parentElement;',
'      r.appendChild(tc);',
'      if(host && host!==r && host.id!=="view-training" && host.children.length===0) host.remove();',
'    }',
'    if(r.children.length===0) r.style.display="none"; else r.style.display="";',
'  }',
'  var n=0, iv=setInterval(function(){ tidy(); if(++n>40) clearInterval(iv); }, 250);',
'  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", tidy); else tidy();',
'  try{',
'    var v=document.getElementById("view-training");',
'    if(v) new MutationObserver(function(){ tidy(); }).observe(v,{childList:true});',
'  }catch(e){}',
'  var nb=document.querySelector(\'.nav-item[data-tab="training"]\');',
'  if(nb) nb.addEventListener("click", function(){ setTimeout(tidy,80); setTimeout(tidy,700); });',
'})();',
'</script>'
].join("\n") + "\n";

const bi = h.lastIndexOf("</body>");
h = h.slice(0, bi) + CSS + JS + h.slice(bi);
fs.writeFileSync(F, h);
console.log("APPLIED TRAINING_LAYOUT_v2: gutters, two-up action row, tightened rhythm");
console.log("  backup: index.backup-trainlayout-" + stamp + ".html");
