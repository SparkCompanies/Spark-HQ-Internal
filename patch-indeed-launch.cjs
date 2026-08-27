#!/usr/bin/env node
/* =====================================================================
   patch-indeed-launch.cjs — TCC_IND_LAUNCH_v1
   Adds a "Launch Indeed Sandbox" button to the Team Certification card
   on the Training tab, next to the existing ATS launch button, styled
   Indeed blue (#2557A7) so the two tracks read at a glance.

   USAGE:  node patch-indeed-launch.cjs
   Run from ~/Desktop/Spark-HQ-Internal (repo root, where index.html is).
   Backs up index.html first. Throws BEFORE writing if any anchor is
   missing or ambiguous. Single-line anchors — CRLF-safe.
===================================================================== */
'use strict';
const fs = require('fs');

const FILE = 'index.html';
if (!fs.existsSync(FILE)) throw new Error('index.html not found here. cd to ~/Desktop/Spark-HQ-Internal first. NOTHING WRITTEN.');
let src = fs.readFileSync(FILE, 'utf8');

if (src.indexOf('TCC_IND_LAUNCH_v1') > -1) {
  throw new Error('ALREADY PATCHED: TCC_IND_LAUNCH_v1 marker found. NOTHING WRITTEN.');
}
function guard(anchor, label) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) throw new Error('ANCHOR FAIL [' + label + ']: found ' + n + ' occurrences, need exactly 1. NOTHING WRITTEN.');
}

/* ---- anchors (single-line, exact) ---- */
const A_BTN   = '<a class="tcc-launch" href="ats-training.html" target="_blank" rel="noopener">Launch ATS Sandbox</a>';
const A_STYLE = '.tcc-launch:hover{background:#e6b400;}';
guard(A_BTN, 'ATS launch button');
guard(A_STYLE, 'tcc-launch hover style');

/* ---- backup, house style ---- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bak = FILE + '.bak-' + stamp;
fs.writeFileSync(bak, src);
console.log('Backup written: ' + bak);

/* ---- 1) second launch button, Indeed blue ---- */
const BTN_NEW = A_BTN +
  '\n            <!-- TCC_IND_LAUNCH_v1 -->' +
  '\n            <a class="tcc-launch tcc-ind" href="indeed-training.html" target="_blank" rel="noopener">Launch Indeed Sandbox</a>';
src = src.replace(A_BTN, BTN_NEW);

/* ---- 2) style: blue variant, sits beside the gold button ---- */
const STYLE_NEW = A_STYLE +
  '\n        /* TCC_IND_LAUNCH_v1 */' +
  '\n        .tcc-launch.tcc-ind{background:#2557A7;color:#fff;margin-left:10px;}' +
  '\n        .tcc-launch.tcc-ind:hover{background:#1F4B91;}' +
  '\n        #teamCertCard .tcc-launch.tcc-ind{box-shadow:0 2px 6px rgba(37,87,167,.3);}' +
  '\n        #teamCertCard .tcc-launch.tcc-ind:hover{box-shadow:0 6px 16px rgba(37,87,167,.4);}';
src = src.replace(A_STYLE, STYLE_NEW);

/* ---- verify before write ---- */
if (src.indexOf('indeed-training.html') === -1) throw new Error('POST-CHECK FAIL: button not inserted. NOTHING WRITTEN.');
if (src.split('TCC_IND_LAUNCH_v1').length - 1 !== 2) throw new Error('POST-CHECK FAIL: expected 2 marker occurrences. NOTHING WRITTEN.');

fs.writeFileSync(FILE, src);
console.log('PATCHED: TCC_IND_LAUNCH_v1 applied — Launch Indeed Sandbox button added to the Team Certification card.');
console.log('Next: git add index.html indeed-training.html && git commit -m "Training: Indeed employer sandbox + launch button" && git push origin main');
