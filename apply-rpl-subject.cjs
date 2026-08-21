#!/usr/bin/env node
/* apply-rpl-subject.cjs
 * 1) Removes the "rec-language" topic from the Recruiting subject.
 * 2) Adds a standalone subject "Recruiting Process Language" (2 topics,
 *    rewritten copy, numbered pipeline, mini-quiz) right after Recruiting.
 * 3) Tombstones the retired topic id inside LMS_MERGE_v1 so the merge guards
 *    never resurrect it from the shared version or anyone's localStorage,
 *    and adds a sweep that strips it from already-loaded copies.
 * Safety: backup before write; every anchor verified; JSON re-parse check.
 */
const fs = require('fs');

const FILE = 'index.html';
const fail = (m) => { console.error('\u2717 ' + m); process.exit(1); };
const ok = (m) => console.log('\u2713 ' + m);

let h;
try { h = fs.readFileSync(FILE, 'utf8'); } catch (e) { fail('cannot read ' + FILE + ' — run from the repo root. ' + e.message); }

/* ---------- idempotency ---------- */
if (h.includes('"rec-process-language"')) fail('rec-process-language subject already present — patch already applied.');
if (h.includes('LMS_TOMBSTONES')) fail('tombstone block already applied.');
if (!h.includes('LMS_MERGE_v1')) fail('LMS_MERGE_v1 not found — run apply-rec-glossary.cjs first.');
if (!h.includes('"rec-language"')) fail('rec-language topic not found in built-in data — structure changed, stopping.');

/* ---------- locate + parse LMS_DATA ---------- */
const TAG = 'const LMS_DATA = ';
const tagIdx = h.indexOf(TAG);
if (tagIdx < 0) fail('anchor "const LMS_DATA = " not found.');
const jsonStart = tagIdx + TAG.length;
if (h[jsonStart] !== '{') fail('LMS_DATA does not start with "{".');

function findJsonEnd(str, from) {
  let depth = 0, inStr = false, esc = false;
  for (let i = from; i < str.length; i++) {
    const c = str[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}
const jsonEnd = findJsonEnd(h, jsonStart);
if (jsonEnd < 0) fail('could not find end of LMS_DATA literal.');

let data;
try { data = JSON.parse(h.slice(jsonStart, jsonEnd)); }
catch (e) { fail('LMS_DATA is not clean JSON — aborting untouched. ' + e.message); }
if (!Array.isArray(data.subjects)) fail('LMS_DATA.subjects missing.');

/* ---------- remove old topic from Recruiting ---------- */
const recIdx = data.subjects.findIndex(s => /recruit/i.test(s.name || '') && (s.topics || []).some(t => t.id === 'rec-language'));
if (recIdx < 0) fail('could not find the Recruiting subject holding rec-language.');
const recSubj = data.subjects[recIdx];
const before = recSubj.topics.length;
recSubj.topics = recSubj.topics.filter(t => t.id !== 'rec-language');
if (recSubj.topics.length !== before - 1) fail('topic removal count mismatch — aborting.');
ok('removed rec-language from "' + recSubj.name + '" (' + recSubj.topics.length + ' topics remain)');

/* ---------- the new standalone subject ---------- */
const GOLD = '#F5C518';
const stage = (num, name, def) =>
  '<li style="margin-bottom:10px;"><strong style="color:' + GOLD + ';">' + num + ' \u00b7 ' + name + '</strong><br>' + def + '</li>';

const newSubject = {
  id: 'rec-process-language',
  name: 'Recruiting Process Language',
  description: 'One pipeline, one vocabulary \u2014 what every stage means and how we count.',
  color: GOLD,
  category: 'Everyone',
  topics: [
    {
      id: 'rpl-pipeline',
      title: 'The Pipeline, Stage by Stage',
      estimatedMinutes: 6,
      content:
        '<p class="lead">One pipeline, one vocabulary. When someone says \u201csubmittal\u201d in a plug-in, everyone in the room should picture the same thing. Here is what every stage means, in the order it happens.</p>' +
        '<ul style="list-style:none;padding-left:0;">' +
        stage('01', 'Pre Screen', 'Our first real conversation with a candidate. We screen, we interview, and we build out their candidate profile.') +
        stage('02', 'Face to Face', 'We meet the candidate in person and form our own read \u2014 our evaluation, before a client ever sees them.') +
        stage('03', 'Submittal', 'We send the candidate to a client for review on a role we are working.') +
        stage('04', 'Interview Request', 'An interview with the client has been requested. Nothing is on the calendar yet.') +
        stage('05', 'Interview', 'The interview is confirmed for a set date and time.') +
        stage('06', 'Pending', 'The interview happened. We are waiting on the client\u2019s feedback.') +
        stage('07', 'Offer', 'The client has offered the candidate the position.') +
        stage('08', 'Onboarding', 'The candidate accepted and is working through onboarding.') +
        stage('09', 'Future Start', 'Onboarding is complete and the start date is locked. They just haven\u2019t started yet.') +
        stage('10', 'Start', 'The candidate has started \u2014 that day or that week.') +
        '</ul>' +
        '<div class="std-callout"><span class="lbl">Why it matters</span>These words show up in plug-ins, in Salesforce, and in your KPIs. Using them loosely means two people can look at the same pipeline and see two different stories.</div>'
    },
    {
      id: 'rpl-inprocess',
      title: 'How We Count: In Process',
      estimatedMinutes: 3,
      content:
        '<p class="lead">In Process is not a stage. It\u2019s your scoreboard.</p>' +
        '<p>Your <strong style="color:' + GOLD + ';">In Process</strong> number is the total candidates you currently have in <strong>Submittal, Interview, Pending, Offer, or Onboarding</strong>. It is the fastest read on how much real activity you have in front of clients right now.</p>' +
        '<div class="std-callout"><span class="lbl">What does not count</span>Pre Screens and Face to Faces \u2014 that is pipeline-building, not client activity. Future Starts and Starts \u2014 those are wins already on the board, not work in process.</div>',
      miniQuiz: {
        id: 'rpl-mini',
        passThreshold: 80,
        gated: false,
        questions: [
          { id: 'rplq1', type: 'true-false', prompt: 'In Process is a pipeline stage that comes between Submittal and Interview Request.', trueIsCorrect: false },
          { id: 'rplq2', type: 'true-false', prompt: 'Pending means we are waiting on client feedback after a candidate\u2019s interview.', trueIsCorrect: true },
          { id: 'rplq3', type: 'true-false', prompt: 'A candidate at Future Start still has onboarding steps to complete.', trueIsCorrect: false },
          { id: 'rplq4', type: 'true-false', prompt: 'Face to Face happens before a candidate is ever submitted to a client.', trueIsCorrect: true }
        ]
      }
    }
  ]
};
data.subjects.splice(recIdx + 1, 0, newSubject);
ok('added standalone subject "Recruiting Process Language" after "' + recSubj.name + '" (' + data.subjects.length + ' subjects now)');

/* ---------- rebuild file with new JSON ---------- */
let out = h.slice(0, jsonStart) + JSON.stringify(data, null, 2) + h.slice(jsonEnd);

/* ---------- tombstone edits inside LMS_MERGE_v1 ---------- */
function mustEdit(source, anchor, replacement, label) {
  const n = source.split(anchor).length - 1;
  if (n !== 1) fail('anchor for "' + label + '" found ' + n + ' times (need exactly 1) — aborting untouched.');
  return source.replace(anchor, replacement);
}

/* 1. declare tombstone map + sweep just before lmsUnion */
out = mustEdit(out,
  '    function lmsUnion(base, extra, label){',
  "    var LMS_TOMBSTONES = { 'rec-language': 1 }; /* retired topic ids \u2014 never resurrect */\n" +
  '    function lmsSweepTombstones(){\n' +
  '      var removed = 0;\n' +
  '      (LMS_DATA.subjects || []).forEach(function(s){\n' +
  '        if (!s || !Array.isArray(s.topics)) return;\n' +
  '        var b = s.topics.length;\n' +
  '        s.topics = s.topics.filter(function(t){ return !(t && LMS_TOMBSTONES[t.id]); });\n' +
  '        removed += b - s.topics.length;\n' +
  '      });\n' +
  '      if (removed) {\n' +
  "        try { localStorage.setItem('spark_hq_lms_data', JSON.stringify(LMS_DATA)); } catch(e) {}\n" +
  '        try { renderLmsRail(); } catch(e) {}\n' +
  '        try { renderLmsContent(); } catch(e) {}\n' +
  '        try { renderTrainingAdmin(); } catch(e) {}\n' +
  "        try { console.info('[LMS] removed ' + removed + ' retired topic(s)'); } catch(e) {}\n" +
  '      }\n' +
  '      return removed;\n' +
  '    }\n' +
  '    function lmsUnion(base, extra, label){',
  'tombstone map + sweep');

/* 2. union never re-adds a tombstoned topic */
out = mustEdit(out,
  '          if (t && t.id && !tIds[t.id]) {',
  '          if (t && t.id && !tIds[t.id] && !LMS_TOMBSTONES[t.id]) {',
  'union tombstone check');

/* 3. sweep before publishing (then-branch only) */
out = mustEdit(out,
  '        origPublish();\n      }).catch(function(){ origPublish(); });',
  '        try { lmsSweepTombstones(); } catch(e) {}\n        origPublish();\n      }).catch(function(){ origPublish(); });',
  'sweep before publish');

/* 4. sweep after Load-team-version wholesale replace */
out = mustEdit(out,
  '      origTake();',
  '      origTake();\n      try { lmsSweepTombstones(); } catch(e) {}',
  'sweep after takeSharedLms');

/* 5. sweep on every interval tick */
out = mustEdit(out,
  '      runs++;\n',
  '      runs++;\n      try { lmsSweepTombstones(); } catch(e) {}\n',
  'sweep in load interval');
ok('tombstone guards wired into LMS_MERGE_v1 (5 edits)');

/* ---------- verify the spliced JSON re-parses ---------- */
const vStart = out.indexOf(TAG) + TAG.length;
const vEnd = findJsonEnd(out, vStart);
try {
  const check = JSON.parse(out.slice(vStart, vEnd));
  const ns = check.subjects.find(s => s.id === 'rec-process-language');
  if (!ns || ns.topics.length !== 2) fail('verification failed: new subject missing after splice.');
  const oldStill = check.subjects.some(s => (s.topics || []).some(t => t.id === 'rec-language'));
  if (oldStill) fail('verification failed: old topic still present.');
} catch (e) { fail('verification re-parse failed — aborting untouched. ' + e.message); }
ok('output verified: JSON clean, old topic gone, new subject present with 2 topics');

/* ---------- backup, write ---------- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bak = 'index.html.backup-rpl-' + stamp;
fs.writeFileSync(bak, h);
ok('backup written: ' + bak);
fs.writeFileSync(FILE, out);
ok('index.html written (' + out.length + ' bytes, was ' + h.length + ')');
console.log('\nDone. Commit, push, wait ~2 min for Azure, then Ctrl+Shift+R.');
