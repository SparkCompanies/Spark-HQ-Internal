/* patch-rev-format.cjs — URGENT: whole-board saves were always failing
   The conflict check compared revisions as strings. The worker sends
   "2026-08-31T15:04:05.123Z"; Postgres returns "2026-08-31T15:04:05.123+00:00".
   Those never match, so every /boards-save was rejected with 409 - which is why
   group moves appeared on screen, never persisted, and were snapped back by the
   live refresh, and why rows showed states nobody set.
   Two fixes:
     - compare revisions by parsed timestamp, not by string
     - after every write, return the revision the database actually stored
   Run from the repo root:  node patch-rev-format.cjs   then deploy the worker.
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
if (w.indexOf('sbSameRev') !== -1) throw new Error('Already applied. Aborting.');

/* helper + timestamp comparison */
const aHelp = `    /* ---- sbAccess: who may see which boards ---- */`;
must(w, aHelp, 'access-helpers');
w = w.replace(aHelp, `    /* revisions are timestamps - compare by value, never by string format */
    const sbSameRev = (a, b) => {
      if (!a || !b) return false;
      const x = Date.parse(a), y = Date.parse(b);
      if (isNaN(x) || isNaN(y)) return String(a) === String(b);
      return x === y;
    };
    const sbStoredRev = async (id) => {
      try {
        const r = await sbService(env, "GET", "spark_boards?select=updated_at&id=eq." + encodeURIComponent(id) + "&limit=1");
        if (r.ok && r.data && r.data[0]) return r.data[0].updated_at || null;
      } catch (e) {}
      return null;
    };
    /* ---- sbAccess: who may see which boards ---- */`);

const aCmp = `        if (prev && baseRev && !body.force && prev.updated_at && prev.updated_at !== baseRev) {`;
must(w, aCmp, 'rev-compare');
w = w.replace(aCmp, `        if (prev && baseRev && !body.force && prev.updated_at && !sbSameRev(prev.updated_at, baseRev)) {`);

/* return what the database actually stored, in all three write paths */
const aSaveRet = `        return json({ ok: true, id: row.id, rev: row.updated_at }, 200, origin);`;
must(w, aSaveRet, 'save-return');
w = w.replace(aSaveRet, `        const realRev = (await sbStoredRev(row.id)) || row.updated_at;
        return json({ ok: true, id: row.id, rev: realRev }, 200, origin);`);

const aPatchRet = `        return json({ ok: true, id: pid, rev: stamp, applied: targets.length }, 200, origin);`;
must(w, aPatchRet, 'patch-return');
w = w.replace(aPatchRet, `        const realRev2 = (await sbStoredRev(pid)) || stamp;
        return json({ ok: true, id: pid, rev: realRev2, applied: targets.length }, 200, origin);`);

const aOpRet = `        return json({ ok: true, id: oid, rev: stamp, applied, skipped, board: data }, 200, origin);`;
must(w, aOpRet, 'op-return');
w = w.replace(aOpRet, `        const realRev3 = (await sbStoredRev(oid)) || stamp;
        return json({ ok: true, id: oid, rev: realRev3, applied, skipped, board: data }, 200, origin);`);

fs.writeFileSync(WORKER + '.bak-revfmt', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  revisions compared by timestamp value, not string format');
console.log('OK  every write returns the revision the database actually stored');
console.log('OK  whole-board saves (group moves, automations) will persist again');
console.log('Backup: worker/cloudworker.js.bak-revfmt');
