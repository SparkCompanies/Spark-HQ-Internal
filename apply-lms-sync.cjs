// LMS_SYNC_v1 — fixes why published training never reaches the team.
//
// THE BUG: on load the app checked a local "dirty" flag and, if set, RETURNED
// before ever fetching the published curriculum. That flag is written the moment
// anyone types in the Training editor, and was cleared only by that same person
// publishing. So every admin who had ever opened the editor was frozen on their
// own browser copy permanently — able to publish out, never able to see anyone
// else's publish come in. Mary's new subject and your test both reached the
// database; no other browser would ever apply them.
//
// THE FIX:
//   * Always fetch the shared version — no early return.
//   * Hold it back only when this person's unpublished edits are genuinely NEWER
//     than the published copy (timestamp comparison, not a boolean flag).
//   * In that case say so plainly and offer a "Load team version" button that
//     discards local and adopts shared (also takeSharedLms() in the console).
//   * If the flag is stale (shared is newer), clear it and load shared.
//   * Local edits now record when they happened, so recency is knowable.
// Run from the repo root, then commit + push.
const fs = require("fs");
const F = "index.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("LMS_SYNC_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["LOADER", "var dirty = false;\n    try { dirty = localStorage.getItem('spark_hq_lms_dirty') === '1'; } catch(e) {}\n    if (dirty) {\n      try { console.info('[LMS] Local unpublished edits present \u2014 shared version not applied. Publish or Reset to sync.'); } catch(e) {}\n      var chip0 = document.getElementById('lmsPubState');\n      if (chip0) { chip0.textContent = 'Unpublished edits'; chip0.style.color = '#B8912E'; }\n      return;\n    }\n    window.SPARK_SB.getContent('lms_content').then(function(shared) {\n      if (!shared || !shared.subjects || !shared.subjects.length) return;\n      LMS_DATA.subjects = shared.subjects;", "/* LMS_SYNC_v1 \u2014 the dirty flag used to make a browser skip published content\n       FOREVER. Anyone who had ever opened the editor was frozen on their own copy and\n       never saw another publish. Now we always FETCH the shared version and only hold\n       it back when this person's unpublished work is genuinely newer. */\n    var dirty = false;\n    try { dirty = localStorage.getItem('spark_hq_lms_dirty') === '1'; } catch(e) {}\n    window.SPARK_SB.getContent('lms_content').then(function(shared) {\n      if (!shared || !shared.subjects || !shared.subjects.length) return;\n      var localStamp = 0, sharedStamp = shared.publishedAt ? new Date(shared.publishedAt).getTime() : 0;\n      try { localStamp = parseInt(localStorage.getItem('spark_hq_lms_touched') || '0', 10) || 0; } catch(e) {}\n      if (dirty && localStamp > sharedStamp) {\n        var chipD = document.getElementById('lmsPubState');\n        if (chipD) { chipD.textContent = 'Unpublished edits \u2014 publish to share'; chipD.style.color = '#B8912E'; }\n        window.__LMS_SHARED_PENDING = shared;\n        try { console.info('[LMS] Your unpublished edits are newer than the published version (' + shared.subjects.length + ' subjects). Publish yours, or run takeSharedLms() to load the team version.'); } catch(e) {}\n        if (chipD && chipD.parentNode && !document.getElementById('lmsTakeShared')) {\n          var b = document.createElement('button');\n          b.id = 'lmsTakeShared'; b.className = 'btn-secondary';\n          b.style.cssText = 'margin-left:8px;font-size:11px;padding:4px 9px;';\n          b.textContent = 'Load team version';\n          b.onclick = function(){ window.takeSharedLms(); };\n          chipD.parentNode.insertBefore(b, chipD.nextSibling);\n        }\n        return;\n      }\n      if (dirty) { try { localStorage.removeItem('spark_hq_lms_dirty'); } catch(e) {} }\n      LMS_DATA.subjects = shared.subjects;"], ["STAMP", "localStorage.setItem('spark_hq_lms_dirty', '1');", "localStorage.setItem('spark_hq_lms_dirty', '1'); localStorage.setItem('spark_hq_lms_touched', String(Date.now())); /* LMS_SYNC_v1 */"], ["PUBSTAMP", "alert('Published. The team sees this version on their next page load.');", "try { localStorage.setItem('spark_hq_lms_touched', '0'); } catch(e) {}\n        alert('Published. The team sees this version on their next page load.');"], ["TAKESHARED", "(function pullSharedLms(tries) {", "window.takeSharedLms = function(){ /* LMS_SYNC_v1 */\n      var s = window.__LMS_SHARED_PENDING;\n      if (!s || !s.subjects) { alert('No shared version loaded yet.'); return; }\n      if (!confirm('Discard your unpublished edits and load the team version (' + s.subjects.length + ' subjects)?')) return;\n      LMS_DATA.subjects = s.subjects;\n      try { localStorage.setItem('spark_hq_lms_data', JSON.stringify(LMS_DATA)); localStorage.removeItem('spark_hq_lms_dirty'); localStorage.setItem('spark_hq_lms_touched','0'); } catch(e) {}\n      try { renderLmsRail(); } catch(e) {}\n      try { renderLmsContent(); } catch(e) {}\n      try { renderTrainingAdmin(); } catch(e) {}\n      var b = document.getElementById('lmsTakeShared'); if (b) b.remove();\n      var chip = document.getElementById('lmsPubState');\n      if (chip) { chip.textContent = 'Published ' + (s.publishedAt ? new Date(s.publishedAt).toLocaleString() : '') + (s.publishedBy ? ' by ' + s.publishedBy : ''); chip.style.color = '#3E9E7E'; }\n      alert('Loaded the team version.');\n    };\n    (function pullSharedLms(tries) {"]];
for (const [name, oldS] of P) { const n = h.split(oldS).length - 1; if (n !== 1) die(name + " anchor found " + n + " times (want 1)"); }
for (const [name, oldS, newS] of P) h = h.split(oldS).join(newS);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.html.lmssync-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED LMS_SYNC_v1 — published training now actually reaches the team");
console.log("  no more permanent freeze on a stale local copy");
console.log("  genuine unpublished work is protected, flagged, and recoverable");
console.log("  NEXT: git add index.html && git commit -m \"Training: published curriculum reaches everyone\" && git pull --rebase && git push");
