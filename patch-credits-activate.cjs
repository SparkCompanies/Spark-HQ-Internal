/* patch-credits-activate.cjs — also set the placement Active with a far-future end date
   After the credits are created, the placement is patched:
     Status__c            -> "Active"
     <estimated end date> -> 2999-01-01
   The end-date field's API name is discovered by describing the object (looking for
   an updateable date field labelled estimated/projected end date), so nothing is
   guessed. If it cannot be found, the status is still set and the response says so.
   Run from the repo root:  node patch-credits-activate.cjs   then deploy the worker.
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
if (w.indexOf('placementUpdate') !== -1) throw new Error('Already applied. Aborting.');

const a = `        return json({
          ok: errs.length === 0,
          placement: pl.Name || placementId,
          full_desk: fullDesk,
          deleted,
          created,
          type_field: typeField,
          errors: errs.length ? errs : void 0
        }, errs.length ? 502 : 200, origin);`;
must(w, a, 'credit-response');
w = w.replace(a, `        /* placementUpdate: mark it Active and push the estimated end date out */
        const placementUpdate = { attempted: false };
        if (errs.length === 0) {
          placementUpdate.attempted = true;
          try {
            let endField = null;
            try {
              const tok2 = await getSalesforceToken(env);
              const pd = await fetch(tok2.instance_url + "/services/data/v60.0/sobjects/bpats__Placement__c/describe", { headers: { Authorization: "Bearer " + tok2.access_token } });
              const pj = await pd.json();
              if (pd.ok && pj && Array.isArray(pj.fields)) {
                const f = pj.fields.find((x) => x.updateable && (x.type === "date" || x.type === "datetime") && /(estimated|projected|proj|est)[^a-z]*end/i.test(String(x.label || "") + " " + String(x.name || "")));
                if (f) endField = f.name;
              }
            } catch (e) {}
            const patch = { Status__c: "Active" };
            if (endField) patch[endField] = "2999-01-01";
            const ur = await sfWrite(env, "PATCH", "/sobjects/bpats__Placement__c/" + placementId, patch);
            placementUpdate.ok = !!ur.ok;
            placementUpdate.status = "Active";
            placementUpdate.end_date_field = endField;
            placementUpdate.end_date = endField ? "2999-01-01" : null;
            if (!endField) placementUpdate.note = "No estimated end date field found on the placement object - status was still set.";
            if (!ur.ok) placementUpdate.error = JSON.stringify(ur.data).slice(0, 200);
          } catch (e) {
            placementUpdate.ok = false;
            placementUpdate.error = String(e.message || e);
          }
        }
        return json({
          ok: errs.length === 0,
          placement: pl.Name || placementId,
          full_desk: fullDesk,
          deleted,
          created,
          type_field: typeField,
          placement_update: placementUpdate,
          errors: errs.length ? errs : void 0
        }, errs.length ? 502 : 200, origin);`);

fs.writeFileSync(WORKER + '.bak-activate', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  placement set to Active after credits are created');
console.log('OK  estimated end date set to 2999-01-01, field discovered by describe');
console.log('OK  only runs when both credits wrote cleanly');
console.log('Backup: worker/cloudworker.js.bak-activate');
