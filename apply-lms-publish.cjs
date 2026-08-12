// LMS_PUBLISH_v1 — makes Training admin edits shared instead of per-browser.
// Rides the existing app_content plumbing (SPARK_SB.getContent/setContent):
//   - "Publish to team" button in Admin -> Training admin
//   - every browser pulls the published curriculum on load
//   - unpublished local edits are never clobbered (dirty flag)
// All logic is inserted INSIDE the app closure (LMS_DATA is const-scoped there).
// Run from repo root:  node apply-lms-publish.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("LMS_PUBLISH_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

const A_PERSIST = "function persistLmsData() {\n    try { localStorage.setItem('spark_hq_lms_data', JSON.stringify(LMS_DATA)); } catch(e) {}\n  }";
const A_RESET   = "window.resetTrainingData = function() {";
const A_BUTTON  = '<button class="btn-secondary" onclick="exportTrainingDataJson()">Export JSON</button>';

for (const [name, a] of [["persistLmsData", A_PERSIST], ["resetTrainingData", A_RESET], ["Export button", A_BUTTON]]) {
  if (h.split(a).length - 1 !== 1) die(name + " anchor not found exactly once");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-lmspub-" + stamp + ".html", h);

// 1. persistLmsData also marks unpublished-edits flag
h = h.split(A_PERSIST).join(
  "function persistLmsData() {\n" +
  "    /* LMS_PUBLISH_v1 */\n" +
  "    try {\n" +
  "      localStorage.setItem('spark_hq_lms_data', JSON.stringify(LMS_DATA));\n" +
  "      localStorage.setItem('spark_hq_lms_dirty', '1');\n" +
  "      var chip = document.getElementById('lmsPubState');\n" +
  "      if (chip) { chip.textContent = 'Unpublished edits'; chip.style.color = '#B8912E'; }\n" +
  "    } catch(e) {}\n" +
  "  }"
);

// 2. publish + pull, inserted inside the closure just before resetTrainingData
const CORE =
"  /* ==================== LMS_PUBLISH_v1 ==================== */\n" +
"  window.publishLmsToTeam = function() {\n" +
"    if (!window.SPARK_SB || !window.SPARK_SB.setContent) { alert('Cloud sync is not available on this page.'); return; }\n" +
"    var who = null;\n" +
"    try { who = window.SPARK_SB.whoami(); } catch(e) {}\n" +
"    if (!who || !who.email) { alert('Sign in first — publishing records who published.'); return; }\n" +
"    var nSub = (LMS_DATA.subjects || []).length;\n" +
"    var nTop = (LMS_DATA.subjects || []).reduce(function(a, s){ return a + (s.topics || []).length; }, 0);\n" +
"    if (!confirm('Publish the current training content to the whole team?\\n\\n' + nSub + ' subjects / ' + nTop + ' topics\\nEveryone sees this version on their next load.')) return;\n" +
"    var payload = {\n" +
"      subjects: LMS_DATA.subjects,\n" +
"      publishedAt: new Date().toISOString(),\n" +
"      publishedBy: who.email,\n" +
"      v: 1\n" +
"    };\n" +
"    var btn = document.getElementById('lmsPubBtn');\n" +
"    if (btn) { btn.disabled = true; btn.textContent = 'Publishing\\u2026'; }\n" +
"    window.SPARK_SB.setContent('lms_content', payload).then(function(r) {\n" +
"      var err = r && r.error;\n" +
"      if (btn) { btn.disabled = false; btn.textContent = 'Publish to team'; }\n" +
"      if (err) { alert('Publish failed: ' + (err.message || JSON.stringify(err))); return; }\n" +
"      try { localStorage.removeItem('spark_hq_lms_dirty'); } catch(e) {}\n" +
"      var chip = document.getElementById('lmsPubState');\n" +
"      if (chip) { chip.textContent = 'Published ' + new Date().toLocaleTimeString() + ' by ' + who.email; chip.style.color = '#3E9E7E'; }\n" +
"      alert('Published. The team sees this version on their next page load.');\n" +
"    }).catch(function(e) {\n" +
"      if (btn) { btn.disabled = false; btn.textContent = 'Publish to team'; }\n" +
"      alert('Publish failed: ' + (e && e.message ? e.message : e));\n" +
"    });\n" +
"  };\n" +
"\n" +
"  (function pullSharedLms(tries) {\n" +
"    tries = tries || 0;\n" +
"    if (!window.SPARK_SB || !window.SPARK_SB.getContent) {\n" +
"      if (tries < 20) setTimeout(function(){ pullSharedLms(tries + 1); }, 700);\n" +
"      return;\n" +
"    }\n" +
"    var dirty = false;\n" +
"    try { dirty = localStorage.getItem('spark_hq_lms_dirty') === '1'; } catch(e) {}\n" +
"    if (dirty) {\n" +
"      try { console.info('[LMS] Local unpublished edits present — shared version not applied. Publish or Reset to sync.'); } catch(e) {}\n" +
"      var chip0 = document.getElementById('lmsPubState');\n" +
"      if (chip0) { chip0.textContent = 'Unpublished edits'; chip0.style.color = '#B8912E'; }\n" +
"      return;\n" +
"    }\n" +
"    window.SPARK_SB.getContent('lms_content').then(function(shared) {\n" +
"      if (!shared || !shared.subjects || !shared.subjects.length) return;\n" +
"      LMS_DATA.subjects = shared.subjects;\n" +
"      try { localStorage.setItem('spark_hq_lms_data', JSON.stringify(LMS_DATA)); } catch(e) {}\n" +
"      try { renderLmsRail(); } catch(e) {}\n" +
"      try { renderLmsContent(); } catch(e) {}\n" +
"      try { renderTrainingAdmin(); } catch(e) {}\n" +
"      var chip = document.getElementById('lmsPubState');\n" +
"      if (chip && shared.publishedAt) {\n" +
"        chip.textContent = 'Published ' + new Date(shared.publishedAt).toLocaleString() + (shared.publishedBy ? ' by ' + shared.publishedBy : '');\n" +
"        chip.style.color = '#3E9E7E';\n" +
"      }\n" +
"      try { console.info('[LMS] Loaded published curriculum (' + shared.subjects.length + ' subjects).'); } catch(e) {}\n" +
"    }).catch(function(){ /* offline or table missing — built-in/local stands */ });\n" +
"  })();\n" +
"\n  ";

h = h.split(A_RESET).join(CORE + A_RESET);

// 3. Publish button + status chip beside Export JSON
h = h.split(A_BUTTON).join(
  '<button class="btn-secondary" id="lmsPubBtn" onclick="publishLmsToTeam()" style="background:#FFC800;border-color:#FFC800;color:#171614;font-weight:700;">Publish to team</button>' +
  '<span id="lmsPubState" style="font-size:11.5px;color:#8a8578;align-self:center;margin-right:6px;"></span>' +
  A_BUTTON
);

// reset should also clear the dirty flag so pull resumes
const A_RESET_BODY = "localStorage.removeItem('spark_hq_lms_data');";
if (h.split(A_RESET_BODY).length - 1 === 1) {
  h = h.split(A_RESET_BODY).join("localStorage.removeItem('spark_hq_lms_data');\n    localStorage.removeItem('spark_hq_lms_dirty'); /* LMS_PUBLISH_v1 */");
}

fs.writeFileSync(F, h);
console.log("APPLIED LMS_PUBLISH_v1");
console.log("  Publish to team button + status chip in Admin -> Training admin");
console.log("  All browsers pull the published curriculum on load (app_content key: lms_content)");
console.log("  Unpublished local edits are protected from being overwritten");
console.log("  backup: index.backup-lmspub-" + stamp + ".html");
