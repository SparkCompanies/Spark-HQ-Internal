// HOME_EMBED_v2 — removes the "old Home flashes on refresh" seam.
// Before: the shell painted its CLASSIC built-in Home, then waited for a
// fetch(HEAD) on spark-home.html to come back, and only then swapped in the
// iframe. On any slow response you saw the old page first.
// After: the classic markup is hidden and the iframe mounted as soon as the
// container node exists (polled every 25ms, pre-DOMContentLoaded). The HEAD
// check still runs — but now it only matters on FAILURE, in which case the
// iframe is removed and the classic Home is revealed as a real fallback.
// Run from the repo root, then commit + push.
const fs = require("fs");
const F = "index.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("HOME_EMBED_v2")) { console.log("Already applied."); process.exit(0); }
if (!raw.includes("/*HOME_EMBED_v1*/")) { console.error("ABORT — HOME_EMBED_v1 not found"); process.exit(1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
const OLD = "/*HOME_EMBED_v1*/\n(function(){\nfunction swap(){\n  var v=document.getElementById(\"view-home\");if(!v)return;\n  if(document.getElementById(\"sparkHomeFrame\"))return;\n  v.innerHTML='<iframe id=\"sparkHomeFrame\" src=\"spark-home.html\" title=\"Spark Home\" style=\"border:0;width:100%;height:calc(100vh - 70px);display:block;background:#faf9f6;\"></iframe>';\n}\nfetch(\"spark-home.html\",{method:\"HEAD\"}).then(function(r){\n  if(!r.ok){console.warn(\"[HomeEmbed] spark-home.html missing (\"+r.status+\"), keeping classic home\");return;}\n  swap();\n  var v=document.getElementById(\"view-home\");\n  if(v){new MutationObserver(function(){if(!document.getElementById(\"sparkHomeFrame\")){swap();}}).observe(v,{childList:true});}\n}).catch(function(e){console.warn(\"[HomeEmbed] check failed, keeping classic home\",e);});";
const n = h.split(OLD).length - 1;
if (n !== 1) { console.error("ABORT — embed block found " + n + " times (want 1); no changes written"); process.exit(1); }
h = h.split(OLD).join("/*HOME_EMBED_v2 \u2014 no classic-home flash: swap immediately, reveal classic only on real failure*/\n(function(){\nfunction hideClassic(){\n  var v=document.getElementById(\"view-home\");if(!v)return false;\n  if(!v.getAttribute(\"data-classic-hidden\")){\n    v.setAttribute(\"data-classic-hidden\",\"1\");\n    var kids=v.children;\n    for(var i=0;i<kids.length;i++){ if(kids[i].id!==\"sparkHomeFrame\"){ kids[i].setAttribute(\"data-classic-node\",\"1\"); kids[i].style.display=\"none\"; } }\n  }\n  return true;\n}\nfunction revealClassic(){\n  var v=document.getElementById(\"view-home\");if(!v)return;\n  var n=v.querySelectorAll('[data-classic-node=\"1\"]');\n  for(var i=0;i<n.length;i++){ n[i].style.display=\"\"; }\n  v.removeAttribute(\"data-classic-hidden\");\n}\nfunction swap(){\n  var v=document.getElementById(\"view-home\");if(!v)return;\n  if(document.getElementById(\"sparkHomeFrame\"))return;\n  hideClassic();\n  var f=document.createElement(\"iframe\");\n  f.id=\"sparkHomeFrame\"; f.src=\"spark-home.html\"; f.title=\"Spark Home\";\n  f.setAttribute(\"style\",\"border:0;width:100%;height:calc(100vh - 70px);display:block;background:#faf9f6;\");\n  v.appendChild(f);\n}\n/* hide the classic markup and mount the iframe as early as the node exists,\n   so the old Home is never painted while we wait on the network */\n(function early(t){\n  t=t||0;\n  if(hideClassic()){ swap(); return; }\n  if(t<60) setTimeout(function(){ early(t+1); }, 25);\n})();\nif(document.readyState===\"loading\") document.addEventListener(\"DOMContentLoaded\",function(){ hideClassic(); swap(); });\n/* verify the embedded page actually loads; if it truly does not, fall back visibly */\nfetch(\"spark-home.html\",{method:\"HEAD\"}).then(function(r){\n  var ct=(r.headers && r.headers.get)?(r.headers.get(\"content-type\")||\"\"):\"\";\n  if(!r.ok){\n    console.warn(\"[HomeEmbed] spark-home.html missing (\"+r.status+\"), falling back to classic home\");\n    var fr=document.getElementById(\"sparkHomeFrame\"); if(fr)fr.remove();\n    revealClassic(); return;\n  }\n  swap();\n  var v=document.getElementById(\"view-home\");\n  if(v){new MutationObserver(function(){if(!document.getElementById(\"sparkHomeFrame\")){swap();}}).observe(v,{childList:true});}\n}).catch(function(e){\n  console.warn(\"[HomeEmbed] check failed, falling back to classic home\",e);\n  var fr=document.getElementById(\"sparkHomeFrame\"); if(fr)fr.remove();\n  revealClassic();\n});");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.html.embedv2-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED HOME_EMBED_v2 — classic Home no longer flashes before the real one");
console.log("  NEXT: git add index.html && git commit -m \"Home: eliminate classic-home flash on refresh\" && git push");
