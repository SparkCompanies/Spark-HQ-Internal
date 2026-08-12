// HOME_DEFAKE_v1 — stops the Home dashboard from showing invented numbers.
//  - KPI strip: the /sf-board-dependent tiles (payroll, pipeline, hours) start blank
//    ("—") and only fill if the Worker returns real values. AR stays live. The
//    hardcoded "12 placements (SAMPLE)" tile is removed.
//  - DEFAULT dashboard layout drops to the cards that are actually live/real
//    (AR + links). The sample widgets are NOT deleted — they stay in the gallery,
//    clearly tagged "sample", so they can be added intentionally but never
//    masquerade as live on first load.
// All edits are to spark-home.html. Run from repo root:
//   node apply-home-defake.cjs
const fs = require("fs");
const F = "spark-home.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("HOME_DEFAKE_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

// ---- 1. KPI strip: blank the sf-board tiles, drop the sample placements tile ----
const KPI_OLD =
'<section class="kpis">\n' +
'      <div class="kpi"><div class="kv"><span class="big" id="kpiHc">475</span><span class="arrow">&#9650; +3</span></div><div class="kl">ON PAYROLL &middot; THIS WEEK</div></div>\n' +
'      <div class="kpi"><div class="kv"><span class="big" id="kpiPipe">$5.73M</span><span class="arrow">&#9650;</span></div><div class="kl">OPEN PIPELINE</div></div>\n' +
'      <div class="kpi"><div class="kv"><span class="big">12</span><span class="arrow">&#9650; +4</span></div><div class="kl">PLACEMENTS &middot; THIS WEEK (SAMPLE)</div></div>\n' +
'      <div class="kpi"><div class="kv"><span class="big" id="kpiHrs">18,269</span></div><div class="kl">HOURS LOGGED &middot; THIS WEEK</div></div>\n' +
'      <div class="kpi red"><div class="kv"><span class="big" id="kpiAr">$1.27M</span><span class="arrow">&#9660;</span></div><div class="kl">OVERDUE AR &middot; NEEDS ATTENTION</div></div>\n' +
'    </section>';
if (h.split(KPI_OLD).length - 1 !== 1) die("KPI strip anchor not found exactly once");

const KPI_NEW =
'<section class="kpis"><!-- HOME_DEFAKE_v1 -->\n' +
'      <div class="kpi"><div class="kv"><span class="big" id="kpiHc" data-live="sf">&mdash;</span></div><div class="kl">ON PAYROLL &middot; THIS WEEK</div></div>\n' +
'      <div class="kpi"><div class="kv"><span class="big" id="kpiPipe" data-live="sf">&mdash;</span></div><div class="kl">OPEN PIPELINE</div></div>\n' +
'      <div class="kpi"><div class="kv"><span class="big" id="kpiHrs" data-live="sf">&mdash;</span></div><div class="kl">HOURS LOGGED &middot; THIS WEEK</div></div>\n' +
'      <div class="kpi red"><div class="kv"><span class="big" id="kpiAr">&mdash;</span></div><div class="kl">OVERDUE AR &middot; LIVE FROM XERO</div></div>\n' +
'    </section>';
h = h.split(KPI_OLD).join(KPI_NEW);

// ---- 2. DEFAULT dashboard layout: only the honest cards on first load ----
const DEF_OLD = "var DEFAULT=[{id:'needsyou',s:3},{id:'thermo',s:3},{id:'pipeline',s:3},{id:'ar',s:3},{id:'today',s:3},{id:'headcount',s:3},{id:'leaderboard',s:3},{id:'spotlight',s:3},{id:'training',s:2},{id:'whosin',s:2},{id:'countdowns',s:2},{id:'inbox',s:2},{id:'bdays',s:2},{id:'jarvis',s:2},{id:'teams',s:3},{id:'links',s:3}];";
if (h.split(DEF_OLD).length - 1 !== 1) die("DEFAULT layout anchor not found exactly once");
const DEF_NEW = "var DEFAULT=[{id:'ar',s:6},{id:'links',s:3},{id:'jarvis',s:3}]; /* HOME_DEFAKE_v1 — only live/real cards by default; sample widgets remain in the gallery, tagged */";
h = h.split(DEF_OLD).join(DEF_NEW);

// ---- 3. Tag every sample widget in the gallery so it can't pose as live ----
// mark which widget ids are sample-only (everything except the genuinely live/real ones)
const SAMPLE_TAG_BLOCK =
"  /* HOME_DEFAKE_v1 — widgets whose data is placeholder, not wired to a live source */\n" +
"  var SAMPLE_WIDGETS={pipeline:1,headcount:1,today:1,inbox:1,training:1,whosin:1,needsyou:1,thermo:1,leaderboard:1,spotlight:1,countdowns:1,bdays:1};\n";
// inject the set right before renderGallery
const RG_ANCHOR = "function renderGallery(){";
if (h.split(RG_ANCHOR).length - 1 !== 1) die("renderGallery anchor not unique");
h = h.split(RG_ANCHOR).join(SAMPLE_TAG_BLOCK + RG_ANCHOR);

// add a "sample" pill in the gallery tile for those ids
const GAL_OLD = "el.innerHTML=(def.lock?'<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#a3a29b\" stroke-width=\"2\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 018 0v4\"/></svg> ':'')+def.t+'<span class=\"plus\">'+(def.lock?'tab access required':'+')+'</span>';";
if (h.split(GAL_OLD).length - 1 !== 1) die("gallery tile anchor not found exactly once");
const GAL_NEW = "var _samp=(typeof SAMPLE_WIDGETS!=='undefined'&&SAMPLE_WIDGETS[id]); el.innerHTML=(def.lock?'<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#a3a29b\" stroke-width=\"2\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 018 0v4\"/></svg> ':'')+def.t+(_samp?' <span style=\"font-size:9.5px;letter-spacing:.1em;color:#a3792e;background:#fff3c2;border:1px solid #f0dc8a;border-radius:99px;padding:1px 7px;margin-left:4px;\">SAMPLE</span>':'')+'<span class=\"plus\">'+(def.lock?'tab access required':'+')+'</span>'; /* HOME_DEFAKE_v1 */";
h = h.split(GAL_OLD).join(GAL_NEW);

// ---- 4. sf-board KPI setter: only overwrite blanks with real numbers (already tolerant),
// but if sf-board fails, leave the em-dash instead of a stale fake. Add a quiet console note. ----
const SFCATCH_OLD = "}).catch(function(e){console.log('[Home] /sf-board unavailable:',e);});";
if (h.split(SFCATCH_OLD).length - 1 === 1) {
  const SFCATCH_NEW = "}).catch(function(e){/* HOME_DEFAKE_v1 — leave KPIs blank rather than show fake numbers */try{document.querySelectorAll('.kpi .big[data-live=\"sf\"]').forEach(function(el){if(el.textContent==='\\u2014'){el.title='Connects when the Salesforce board endpoint is live';}});}catch(_){}console.log('[Home] /sf-board unavailable — payroll/pipeline/hours left blank (no fake fallback):',e);});";
  h = h.split(SFCATCH_OLD).join(SFCATCH_NEW);
}

fs.writeFileSync("spark-home.backup-defake-" + stamp + ".html", fs.readFileSync(F));
fs.writeFileSync(F, h);
console.log("APPLIED HOME_DEFAKE_v1");
console.log("  KPI strip: payroll/pipeline/hours blank until the Worker returns real values; placements(sample) removed; AR live");
console.log("  Default dashboard: Overdue AR (live) + Quick links + Ask Jarvis only");
console.log("  Sample widgets kept in the gallery, tagged SAMPLE — addable, never posing as live");
console.log("  backup: spark-home.backup-defake-" + stamp + ".html");
