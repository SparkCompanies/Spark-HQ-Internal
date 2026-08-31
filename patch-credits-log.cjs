/* patch-credits-log.cjs — record on the board that credits were applied
   After a successful write, the worker stamps the row (creditsAt / creditsBy /
   creditsDetail) and posts a note into that item's Updates thread, so the board
   itself is the record - no need to open Salesforce to know it was done.
   The panel then shows "Applied <date> by <who>" instead of offering to do it again.
   Patches BOTH files. Run from the repo root:  node patch-credits-log.cjs
   Then deploy the worker, then push.
*/
const fs = require('fs');
const path = require('path');
const WORKER = path.join('worker', 'cloudworker.js');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}

/* ---------------- worker ---------------- */
let w = read(WORKER);
if (w.indexOf('creditsAt') !== -1) throw new Error('Worker already logs credits. Aborting.');
if (w.indexOf('placementUpdate') === -1) throw new Error('Run patch-credits-activate.cjs first. Aborting.');

const aW = `        return json({
          ok: errs.length === 0,
          placement: pl.Name || placementId,
          full_desk: fullDesk,
          deleted,
          created,
          type_field: typeField,
          placement_update: placementUpdate,
          errors: errs.length ? errs : void 0
        }, errs.length ? 502 : 200, origin);`;
must(w, aW, 'credit-response');
w = w.replace(aW, `        /* stamp the board row so the record lives here too */
        const boardLog = { attempted: false };
        if (errs.length === 0) {
          boardLog.attempted = true;
          try {
            const cur2 = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members&id=eq." + encodeURIComponent(cbid) + "&limit=1");
            const row2 = cur2.ok && cur2.data && cur2.data[0] ? cur2.data[0] : null;
            if (row2 && row2.data) {
              const d2 = row2.data;
              let tgt = null;
              for (const g of d2.groups || []) {
                for (const x of g.items || []) if (x && x.id === citem) tgt = x;
              }
              if (tgt) {
                const stampNow = (/* @__PURE__ */ new Date()).toISOString();
                const detail = created.map((c) => c.name + " \\u2192 " + c.recipient).join(", ");
                tgt.creditsAt = stampNow;
                tgt.creditsBy = who.email;
                tgt.creditsDetail = detail;
                tgt.updates = Array.isArray(tgt.updates) ? tgt.updates : [];
                tgt.updates.push({
                  id: "u" + Date.now().toString(36),
                  author: who.email,
                  color: "#0086C0",
                  at: stampNow,
                  text: "Placement credits applied in Salesforce: " + detail + (placementUpdate.ok ? ". Placement set Active." : "") + (deleted ? " (replaced " + deleted + " existing)" : "")
                });
                d2.activity = [{
                  id: "ev" + Date.now().toString(36),
                  at: Date.now(),
                  actor: { name: who.email, color: "#0086C0" },
                  kind: "cell",
                  itemId: citem,
                  item: tgt.name || "",
                  col: "credits",
                  colLabel: "Placement credits",
                  from: "",
                  to: detail
                }].concat(Array.isArray(d2.activity) ? d2.activity : []);
                if (d2.activity.length > 200) d2.activity.length = 200;
                delete d2.__rev;
                const sv = await sbService(env, "POST", "spark_boards?on_conflict=id", {
                  id: cbid,
                  name: String(d2.name || "").slice(0, 200),
                  data: d2,
                  visibility: row2.visibility,
                  owner: row2.owner,
                  members: Array.isArray(row2.members) ? row2.members : [],
                  updated_by: who.email,
                  updated_at: (/* @__PURE__ */ new Date()).toISOString()
                });
                boardLog.ok = !!sv.ok;
                boardLog.at = stampNow;
              } else {
                boardLog.ok = false;
                boardLog.note = "row disappeared";
              }
            }
          } catch (e) {
            boardLog.ok = false;
            boardLog.error = String(e.message || e);
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
          board_log: boardLog,
          errors: errs.length ? errs : void 0
        }, errs.length ? 502 : 200, origin);`);

/* the preview should report what the row already says */
const aPrev = `        if (cb.preview === true) {
          return json({ ok: true, preview: true, placement: pl.Name || placementId,`;
must(w, aPrev, 'preview');
w = w.replace(aPrev, `        if (cb.preview === true) {
          return json({ ok: true, preview: true, applied_at: item.creditsAt || null, applied_by: item.creditsBy || null, applied_detail: item.creditsDetail || null, placement: pl.Name || placementId,`);

/* ---------------- page ---------------- */
let p = read(PAGE);
if (p.indexOf('CreditPanel') === -1) throw new Error('Run patch-credits-button.cjs first. Aborting.');
if (p.indexOf('creditsAt') !== -1) throw new Error('Page already shows the credit stamp. Aborting.');

const aIdle = `    s.phase === 'idle' && React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.5 } },
        'Checks the placement in Salesforce and shows what would be created before anything is written.'),
      React.createElement('button', { className: 'cred-btn', onClick: doPreview }, 'Check placement credits')),`;
must(p, aIdle, 'panel-idle');
p = p.replace(aIdle, `    s.phase === 'idle' && React.createElement('div', null,
      item.creditsAt ? React.createElement('div', null,
        React.createElement('div', { className: 'cred-msg good' },
          'Applied ' + new Date(item.creditsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
          (item.creditsBy ? ' by ' + String(item.creditsBy).split('@')[0] : '')),
        item.creditsDetail && React.createElement('div', { className: 'cred-msg' }, item.creditsDetail)) :
        React.createElement('div', { style: { fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.5 } },
          'Checks the placement in Salesforce and shows what would be created before anything is written.'),
      React.createElement('button', { className: 'cred-btn' + (item.creditsAt ? ' ghost' : ''), onClick: doPreview },
        item.creditsAt ? 'Check again' : 'Check placement credits')),`);

fs.writeFileSync(WORKER + '.bak-log', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-log', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  worker stamps the row and posts a note in the item Updates thread');
console.log('OK  the change also lands in board activity, so it is in version history');
console.log('OK  panel shows "Applied <date> by <who>" instead of prompting again');
console.log('Backups: *.bak-log');
