#!/usr/bin/env node
/* apply-rec-glossary.cjs
 * 1) Bakes the "Recruiting Process Language" glossary topic into the built-in
 *    Recruiting subject inside LMS_DATA (parsed as JSON — throws before write
 *    if the blob isn't clean or the subject can't be found unambiguously).
 * 2) LMS_MERGE_v1 guards:
 *    - Publish now fetches the current shared version first and unions in any
 *      published subjects/topics missing locally, so one admin can never wipe
 *      another admin's published work. Publisher wins on true conflicts
 *      (same topic id edited by both) — logged to console.
 *    - Load-time union restores any built-in subjects/topics missing from the
 *      shared/local version, so baked-in content survives future publishes.
 * Safety: backup written before any change; every anchor verified first.
 */
const fs = require('fs');

const FILE = 'index.html';
const fail = (m) => { console.error('\u2717 ' + m); process.exit(1); };
const ok = (m) => console.log('\u2713 ' + m);

let h;
try { h = fs.readFileSync(FILE, 'utf8'); } catch (e) { fail('cannot read ' + FILE + ' — run from the repo root. ' + e.message); }

/* ---------- idempotency guards ---------- */
if (h.includes('"rec-language"')) fail('rec-language topic already present — patch already applied.');
if (h.includes('LMS_MERGE_v1')) fail('LMS_MERGE_v1 already applied.');

/* ---------- 1. locate the LMS_DATA JSON literal by brace matching ---------- */
const TAG = 'const LMS_DATA = ';
const tagIdx = h.indexOf(TAG);
if (tagIdx < 0) fail('anchor "const LMS_DATA = " not found.');
const jsonStart = tagIdx + TAG.length;
if (h[jsonStart] !== '{') fail('LMS_DATA does not start with "{" — structure changed.');

let depth = 0, jsonEnd = -1, inStr = false, esc = false;
for (let i = jsonStart; i < h.length; i++) {
  const c = h[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') { inStr = true; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
}
if (jsonEnd < 0) fail('could not find the end of the LMS_DATA literal.');

const afterLiteral = h.slice(jsonEnd, jsonEnd + 4);
if (!afterLiteral.trimStart().startsWith(';')) fail('expected ";" right after the LMS_DATA literal, found: ' + JSON.stringify(afterLiteral));
const semiIdx = jsonEnd + afterLiteral.indexOf(';') + 1;

let data;
try { data = JSON.parse(h.slice(jsonStart, jsonEnd)); }
catch (e) { fail('LMS_DATA is not clean JSON — aborting untouched. ' + e.message); }
if (!Array.isArray(data.subjects) || !data.subjects.length) fail('LMS_DATA.subjects missing or empty.');
ok('LMS_DATA parsed: ' + data.subjects.length + ' subjects');

/* ---------- 2. find the Recruiting subject ---------- */
const matches = data.subjects.filter(s => /recruit/i.test(s.name || ''));
if (matches.length !== 1) {
  console.error('Subjects in LMS_DATA:');
  data.subjects.forEach(s => console.error('   ' + s.id + ' \u2014 ' + s.name));
  fail('expected exactly 1 subject matching /recruit/i, found ' + matches.length + '. Paste the list above back to Claude.');
}
const subj = matches[0];
subj.topics = subj.topics || [];
if (subj.topics.some(t => t.id === 'rec-language')) fail('topic already exists inside subject "' + subj.name + '".');

/* ---------- 3. the glossary topic ---------- */
const GOLD = '#F5C518';
const li = (name, def) => '<li><strong style="color:' + GOLD + ';">' + name + '</strong> \u2014 ' + def + '</li>';
const topic = {
  id: 'rec-language',
  title: 'Recruiting Process Language',
  estimatedMinutes: 5,
  content:
    '<p class="lead">The shared language of the Spark recruiting pipeline \u2014 one definition per stage, so a submittal in Troy means the same thing as a submittal in Marshall.</p>' +
    '<h3>The Pipeline \u2014 In Order</h3>' +
    '<ul>' +
    li('Pre Screen', 'Our initial screen/interview and build of a candidate profile with the candidate.') +
    li('Face to Face', 'We meet with the candidate face to face to do our own evaluation and interview.') +
    li('Submittal', 'When we send a candidate to a client for review, to be hired for a role we are working on.') +
    li('Interview Request', 'The client has been asked (or has asked) to interview the candidate \u2014 not yet on the calendar.') +
    li('Interview', 'The interview has been confirmed at a set time.') +
    li('Pending', 'We are awaiting feedback on a candidate\u2019s interview.') +
    li('Offer', 'The candidate has been offered a position.') +
    li('Onboarding', 'The candidate has accepted the position and is in the onboarding process.') +
    li('Future Start', 'The candidate is confirmed and onboarding is completed.') +
    li('Start', 'The candidate has started that day or week.') +
    '</ul>' +
    '<div class="std-callout"><span class="lbl">How we count</span><strong>In Process</strong> is not a pipeline stage \u2014 it\u2019s your rollup number: the total candidates you have in Submittal, Interview, Pending, Offer, or Onboarding.</div>',
  miniQuiz: {
    id: 'rec-language-mini',
    passThreshold: 80,
    gated: false,
    questions: [
      { id: 'rlq1', type: 'true-false', prompt: 'In Process is a pipeline stage that comes between Submittal and Interview Request.', trueIsCorrect: false },
      { id: 'rlq2', type: 'true-false', prompt: 'Pending means we are waiting on feedback after a candidate\u2019s interview.', trueIsCorrect: true },
      { id: 'rlq3', type: 'true-false', prompt: 'A candidate at Future Start still has onboarding steps to complete.', trueIsCorrect: false }
    ]
  }
};
subj.topics.push(topic);
ok('topic added to "' + subj.name + '" (' + subj.topics.length + ' topics now)');

/* ---------- 4. LMS_MERGE_v1 runtime guards ---------- */
const MERGE_ANCHOR = '  window.takeSharedLms = function(){';
if (!h.includes(MERGE_ANCHOR)) fail('anchor "window.takeSharedLms = function(){" not found.');

const MERGE_BLOCK = `  /* ==================== LMS_MERGE_v1 ==================== */
  /* Publish unions the current shared version into local first, so one admin
     can never wipe another's published work. Load unions any built-in content
     missing from the winning version, so baked-in updates always surface.
     Publisher wins on true conflicts (same topic id edited by both) — logged. */
  (function(){
    function lmsUnion(base, extra, label){
      var added = [];
      if (!Array.isArray(base) || !Array.isArray(extra)) return added;
      var byId = {}; base.forEach(function(s){ if (s && s.id) byId[s.id] = s; });
      extra.forEach(function(s){
        if (!s || !s.id) return;
        if (!byId[s.id]) {
          base.push(JSON.parse(JSON.stringify(s)));
          added.push(label + ' subject: ' + (s.name || s.id));
          return;
        }
        var mine = byId[s.id]; mine.topics = mine.topics || [];
        var tIds = {}; mine.topics.forEach(function(t){ if (t && t.id) tIds[t.id] = 1; });
        (s.topics || []).forEach(function(t){
          if (t && t.id && !tIds[t.id]) {
            mine.topics.push(JSON.parse(JSON.stringify(t)));
            added.push(label + ' topic: ' + (s.name || s.id) + ' \\u2192 ' + (t.title || t.id));
          }
        });
      });
      return added;
    }
    function persistAndRender(added, note){
      if (!added.length) return;
      try { localStorage.setItem('spark_hq_lms_data', JSON.stringify(LMS_DATA)); } catch(e) {}
      try { renderLmsRail(); } catch(e) {}
      try { renderLmsContent(); } catch(e) {}
      try { renderTrainingAdmin(); } catch(e) {}
      try { console.info('[LMS] ' + note + '\\n' + added.join('\\n')); } catch(e) {}
    }
    /* publish guard */
    var origPublish = window.publishLmsToTeam;
    window.publishLmsToTeam = function(){
      if (!window.SPARK_SB || !window.SPARK_SB.getContent) { return origPublish(); }
      window.SPARK_SB.getContent('lms_content').then(function(shared){
        if (shared && shared.subjects && shared.subjects.length) {
          persistAndRender(lmsUnion(LMS_DATA.subjects, shared.subjects, 'kept published'), 'merged before publish \\u2014 nothing published by others was dropped:');
        }
        origPublish();
      }).catch(function(){ origPublish(); });
    };
    /* take-team-version guard */
    var origTake = window.takeSharedLms;
    window.takeSharedLms = function(){
      origTake();
      try { persistAndRender(lmsUnion(LMS_DATA.subjects, LMS_BUILTIN.subjects, 'built-in'), 'restored built-in content:'); } catch(e) {}
    };
    /* load-time union: idempotent, re-runs while pullSharedLms may still be retrying */
    var runs = 0;
    var iv = setInterval(function(){
      runs++;
      try { persistAndRender(lmsUnion(LMS_DATA.subjects, LMS_BUILTIN.subjects, 'built-in'), 'restored built-in content:'); } catch(e) {}
      if (runs >= 8) clearInterval(iv);
    }, 5000);
  })();

`;

/* ---------- 5. assemble the new file ---------- */
const BUILTIN_SNAP = '\n  const LMS_BUILTIN = JSON.parse(JSON.stringify(LMS_DATA)); /* LMS_MERGE_v1 snapshot */';
let out = h.slice(0, jsonStart)
  + JSON.stringify(data, null, 2)
  + h.slice(jsonEnd, semiIdx)
  + BUILTIN_SNAP
  + h.slice(semiIdx);

const anchorIdx = out.indexOf(MERGE_ANCHOR);
if (anchorIdx < 0) fail('merge anchor lost after JSON splice — aborting untouched.');
out = out.slice(0, anchorIdx) + MERGE_BLOCK + out.slice(anchorIdx);

/* sanity: re-parse the spliced JSON from the output */
const vStart = out.indexOf(TAG) + TAG.length;
let vDepth = 0, vEnd = -1, vStr = false, vEsc = false;
for (let i = vStart; i < out.length; i++) {
  const c = out[i];
  if (vStr) { if (vEsc) vEsc = false; else if (c === '\\') vEsc = true; else if (c === '"') vStr = false; continue; }
  if (c === '"') { vStr = true; continue; }
  if (c === '{') vDepth++;
  else if (c === '}') { vDepth--; if (vDepth === 0) { vEnd = i + 1; break; } }
}
try {
  const check = JSON.parse(out.slice(vStart, vEnd));
  const cs = check.subjects.filter(s => /recruit/i.test(s.name || ''))[0];
  if (!cs.topics.some(t => t.id === 'rec-language')) fail('verification failed: topic missing after splice.');
} catch (e) { fail('verification re-parse failed — aborting untouched. ' + e.message); }
ok('output verified: LMS_DATA re-parses clean with the new topic');

/* ---------- 6. backup, then write ---------- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bak = 'index.html.backup-recgloss-' + stamp;
fs.writeFileSync(bak, h);
ok('backup written: ' + bak);
fs.writeFileSync(FILE, out);
ok('index.html written (' + out.length + ' bytes, was ' + h.length + ')');
console.log('\nDone. Commit, push, wait ~2 min for Azure, then Ctrl+Shift+R.');
