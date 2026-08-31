/* patch-doc-probe-fix.cjs — resolve the candidate's real object type
   The probe assumed bpats__ATS_Candidate__c, but candidates are Contact records
   (Greg Nye opens as Contact / Greg Nye). It now looks up the object from the
   record id's key prefix via describeGlobal, so it works whatever the id points to,
   and reports Notes & Attachments through ContentDocumentLink plus legacy Attachments.
   Run from the repo root:  node patch-doc-probe-fix.cjs   then deploy the worker.
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
if (w.indexOf('/boards-doc-probe') === -1) throw new Error('Run patch-doc-probe.cjs first. Aborting.');
if (w.indexOf('keyPrefix') !== -1) throw new Error('Already applied. Aborting.');

const a = `        /* 2. which object is the candidate, and what hangs off it */
        let candObj = "bpats__ATS_Candidate__c";
        try {
          const r0 = await fetch(tok.instance_url + V + "/sobjects/bpats__ATS_Candidate__c/" + candId + "?fields=Id,Name", { headers: H });
          const d0 = await r0.json();
          if (r0.ok && d0) out.candidate_name = d0.Name || null;
          else out.notes.push("candidate fetch: " + JSON.stringify(d0).slice(0, 120));
        } catch (e) {
          out.notes.push("candidate: " + String(e.message || e));
        }`;
must(w, a, 'probe-candobj');
w = w.replace(a, `        /* 2. resolve the object from the id's keyPrefix - candidates are Contacts here */
        let candObj = null;
        try {
          const gr = await fetch(tok.instance_url + V + "/sobjects/", { headers: H });
          const gj = await gr.json();
          const pref = candId.slice(0, 3);
          if (gr.ok && gj && Array.isArray(gj.sobjects)) {
            const hit = gj.sobjects.find((s) => s.keyPrefix === pref && s.queryable);
            if (hit) candObj = hit.name;
          }
        } catch (e) {
          out.notes.push("describeGlobal: " + String(e.message || e));
        }
        out.candidate_object = candObj;
        if (!candObj) {
          out.notes.push("Could not resolve the object for id prefix " + candId.slice(0, 3));
          return json({ ok: true, probe: out }, 200, origin);
        }
        try {
          const r0 = await fetch(tok.instance_url + V + "/sobjects/" + candObj + "/" + candId + "?fields=Id,Name", { headers: H });
          const d0 = await r0.json();
          if (r0.ok && d0) out.candidate_name = d0.Name || null;
          else out.notes.push("candidate fetch: " + JSON.stringify(d0).slice(0, 120));
        } catch (e) {
          out.notes.push("candidate: " + String(e.message || e));
        }
        /* legacy Attachments live separately from Files */
        try {
          const qa = "SELECT Name, ContentType, CreatedDate FROM Attachment WHERE ParentId = '" + candId + "' LIMIT 25";
          const ra = await fetch(tok.instance_url + V + "/query?q=" + encodeURIComponent(qa), { headers: H });
          const da = await ra.json();
          if (ra.ok && da.records) out.attachments = da.records.map((x) => ({ name: x.Name, type: x.ContentType, created: x.CreatedDate }));
        } catch (e) {}`);

fs.writeFileSync(WORKER + '.bak-probefix', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  probe resolves the object from the record id (Contact, custom, whatever)');
console.log('OK  also reports legacy Attachments alongside Files');
console.log('Backup: worker/cloudworker.js.bak-probefix');
