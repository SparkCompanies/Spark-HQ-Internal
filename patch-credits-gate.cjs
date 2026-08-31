/* patch-credits-gate.cjs — allow credits on placed-but-not-yet-started placements
   The gate required the start date to have passed, so a placement like Greg Nye
   (start 2026-09-14, status "Pending Start") was refused even though he is placed.
   Now it only refuses placements that are genuinely dead - terminated, cancelled,
   fell off, void - and passes the status and start date through so the panel can
   show them. A future start date is shown as a note, not a block.
   Run from the repo root:  node patch-credits-gate.cjs   then deploy the worker.
*/
const fs = require('fs');
const path = require('path');
const WORKER = path.join('worker', 'cloudworker.js');

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}
let w = read(WORKER);
if (w.indexOf('/boards-placement-credits') === -1) throw new Error('Run patch-credits-worker.cjs first. Aborting.');
if (w.indexOf('DEAD_STATUS') !== -1) throw new Error('Already applied. Aborting.');

const aGate = `        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const started = pl.bpats__Start_Date__c ? String(pl.bpats__Start_Date__c).slice(0, 10) <= today : false;
        if (!started) {
          return json({
            error: "Not started yet. Placement credits can be applied once the start date has passed.",
            status: pl.Status__c || null,
            start_date: pl.bpats__Start_Date__c || null
          }, 409, origin);
        }`;
must(w, aGate, 'start-gate');
w = w.replace(aGate, `        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const DEAD_STATUS = /terminat|cancel|fell\\s*off|void|withdraw|declin|rescind|closed\\s*lost|no\\s*show/i;
        const pstatus = String(pl.Status__c || "");
        if (pstatus && DEAD_STATUS.test(pstatus)) {
          return json({
            error: "This placement is " + pstatus + ", so credits cannot be applied.",
            status: pl.Status__c || null,
            start_date: pl.bpats__Start_Date__c || null
          }, 409, origin);
        }
        const startsLater = pl.bpats__Start_Date__c ? String(pl.bpats__Start_Date__c).slice(0, 10) > today : false;`);

/* surface the note in the preview */
const aPrev = `        if (cb.preview === true) {
          return json({ ok: true, preview: true, placement: pl.Name || placementId, start_date: pl.bpats__Start_Date__c, status: pl.Status__c || null, full_desk: fullDesk,`;
must(w, aPrev, 'preview-shape');
w = w.replace(aPrev, `        if (cb.preview === true) {
          return json({ ok: true, preview: true, placement: pl.Name || placementId, start_date: pl.bpats__Start_Date__c, status: pl.Status__c || null, starts_later: startsLater, full_desk: fullDesk,`);

fs.writeFileSync(WORKER + '.bak-gate', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  placed-but-not-started placements can now have credits applied');
console.log('OK  refuses only terminated / cancelled / fell off / void / withdrawn');
console.log('OK  a future start date is reported as a note, not a block');
console.log('Backup: worker/cloudworker.js.bak-gate');
