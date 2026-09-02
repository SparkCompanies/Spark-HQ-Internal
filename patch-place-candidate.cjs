/* patch-place-candidate.cjs — the per-row "Started in SF" cell becomes a "place this candidate" action
   Tamika/Maryam click the green Synced cell on a candidate's row -> confirm -> Salesforce:
     /boards-sf-write sets the placement Status = Active
     /boards-sf-stage moves the ATS applicant into the job's Placement stage
   On success the cell flips to a purple "Placed" state (sf value 2). One candidate at a time,
   their discretion. Scoped to the On-boarding Tracker (b1) so the Time Card board's
   "Upload to SF" toggle is untouched. Guarded: row must be linked (sfId) and not ambiguous.
   Worker: the two SF endpoints are gated to editors (admin/superadmin/manager); members get 403.
   Run from repo root:  node patch-place-candidate.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';
const WORKER = 'worker/cloudworker.js';

function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
function repl(s, oldStr, newStr, label){
  const n = s.split(oldStr).length - 1;
  if(n !== 1) throw new Error('ANCHOR '+label+': expected 1 match, found '+n+'. Nothing written.');
  return s.replace(oldStr, newStr);
}

/* ---------------- page ---------------- */
let p = read(PAGE);
if(p.indexOf('placeCandidate') !== -1) throw new Error('Page already patched (placeCandidate present). Aborting.');

/* 1. SfCell: accept onPlace */
p = repl(p,
`function SfCell({
  value,
  onChange
}) {`,
`function SfCell({
  value,
  onChange,
  onPlace
}) {`,
'SfCell signature');

/* 2. SfCell: placed state, colour, title, click */
p = repl(p,
`  const synced = value === 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "status-cell",
    style: {
      background: synced ? 'var(--s-done)' : value === 0 ? '#EBEDF2' : 'transparent',
      color: synced ? '#fff' : 'var(--sub)',
      gap: 7
    },
    title: synced ? 'Synced from Salesforce' : 'Awaiting Salesforce',
    onClick: () => onChange(synced ? 0 : 1)`,
`  const placed = value === 2;
  const synced = value === 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "status-cell",
    style: {
      background: placed ? '#7E5BD6' : synced ? 'var(--s-done)' : value === 0 ? '#EBEDF2' : 'transparent',
      color: placed || synced ? '#fff' : 'var(--sub)',
      gap: 7
    },
    title: placed ? 'Placed in Salesforce' : onPlace ? (synced ? 'Click to place this candidate in Salesforce' : 'Run Sync to link this candidate first') : synced ? 'Synced from Salesforce' : 'Awaiting Salesforce',
    onClick: () => onPlace ? onPlace() : onChange(synced ? 0 : 1)`,
'SfCell body');

/* 3. SfCell: show the check for placed too */
p = repl(p,
`  }), synced && /*#__PURE__*/React.createElement("path", {
    d: "m9 13 2 2 4-4"
  })), synced ? 'Synced' : value === 0 ? 'Pending' : '—');`,
`  }), (synced || placed) && /*#__PURE__*/React.createElement("path", {
    d: "m9 13 2 2 4-4"
  })), placed ? 'Placed' : synced ? 'Synced' : value === 0 ? 'Pending' : '—');`,
'SfCell label');

/* 4. placeCandidate handler, inserted just before addItem inside TableView */
p = repl(p,
`  const addItem = gi => {`,
`  const placeCandidate = (gi, ii) => {
    if (!LIVE) { sbFlash('Placing works only on the live board.'); return; }
    const ref = ((board.groups[gi] || {}).items || [])[ii];
    if (!ref) return;
    let it = null;
    (baseBoard.groups || []).forEach(g => (g.items || []).forEach(x => { if (x.id === ref.id) it = x; }));
    if (!it) return;
    if (!it.sfId) { sbFlash('Run Sync with Salesforce to link ' + (it.name || 'this candidate') + ' first.'); return; }
    if (it.sf_ambiguous) { sbFlash(it.name + ' matches more than one Salesforce record - resolve it before placing.'); return; }
    if (it.sf === 2) { sbFlash(it.name + ' is already marked Placed.'); return; }
    if (!confirm('Move ' + it.name + ' to Placed in Salesforce?\\n\\nThis sets the placement to Active and moves the ATS applicant into the Placement stage.')) return;
    const itemId = it.id, boardId = board.id, was = it.sf, nm = it.name;
    sbFlash('Placing ' + nm + ' in Salesforce...', 'ok');
    API.call('/boards-sf-write', { method: 'POST', body: JSON.stringify({ boardId: boardId, itemId: itemId, status: 'Active' }) })
      .then(function () {
        return API.call('/boards-sf-stage', { method: 'POST', body: JSON.stringify({ boardId: boardId, itemId: itemId, dryRun: false }) });
      })
      .then(function (r) {
        update(prev => { const nb = structuredClone(prev); nb.groups.forEach(g => (g.items || []).forEach(x => { if (x.id === itemId) x.sf = 2; })); return nb; });
        Persist.cell(board, [{ itemId: itemId, key: 'sf', val: 2, was: was }], []);
        const where = r && r.alreadyThere ? ' (already in the Placement stage)' : '';
        sbFlash(nm + ' set to Active and placed in Salesforce' + where + '.', 'ok');
      })
      .catch(function (e) {
        sbFlash('NOT placed. ' + ((e && e.message) || 'Salesforce error') + '. Nothing was changed on the board.');
      });
  };
  const addItem = gi => {`,
'placeCandidate handler');

/* 5. wire onPlace into the row's SfCell, only on b1 and only for editors */
p = repl(p,
`      }), c.type === 'sf' && /*#__PURE__*/React.createElement(SfCell, {
        value: it.sf,
        onChange: v => setItem(gi, ii, 'sf', v)
      }), c.type === 'person' &&`,
`      }), c.type === 'sf' && /*#__PURE__*/React.createElement(SfCell, {
        value: it.sf,
        onChange: v => setItem(gi, ii, 'sf', v),
        onPlace: board.id === 'b1' && cellEdit ? () => placeCandidate(gi, ii) : undefined
      }), c.type === 'person' &&`,
'row SfCell wiring');

/* 6. sf label helpers show 2 -> Placed (tooltip, kanban, export parity) */
p = repl(p,
`  if (c.type === 'sf') return val === 1 ? 'Synced' : val === 0 ? 'Pending' : '—';`,
`  if (c.type === 'sf') return val === 2 ? 'Placed' : val === 1 ? 'Synced' : val === 0 ? 'Pending' : '—';`,
'sf label helper A');
p = repl(p,
`    return v === 1 ? 'Synced' : v === 0 ? 'Pending' : '';`,
`    return v === 2 ? 'Placed' : v === 1 ? 'Synced' : v === 0 ? 'Pending' : '';`,
'sf label helper B');
p = repl(p,
`    label: it.sf === 1 ? 'Synced' : it.sf === 0 ? 'Pending' : 'Blank',`,
`    label: it.sf === 2 ? 'Placed' : it.sf === 1 ? 'Synced' : it.sf === 0 ? 'Pending' : 'Blank',`,
'sf label helper C');

/* ---------------- worker: gate the two SF endpoints to editors ---------------- */
let w = read(WORKER);
if(w.indexOf('Placing candidates is limited') !== -1) throw new Error('Worker already patched. Aborting.');

w = repl(w,
`      const ALLOWED = ["Active", "Completed", "Pending Start"];
      try {`,
`      const ALLOWED = ["Active", "Completed", "Pending Start"];
      const sfwRole = await sbRoleOf(who.email);
      if (!sbSeesAll(sfwRole)) return json({ error: "read-only", readOnly: true, message: "Placing candidates is limited to admins, super admins, and managers." }, 403, origin);
      try {`,
'worker /boards-sf-write gate');

w = repl(w,
`      const dryRun = body.dryRun !== false;
      if (!boardId || !itemId) return json({ error: "boardId and itemId required" }, 400, origin);`,
`      const dryRun = body.dryRun !== false;
      if (!boardId || !itemId) return json({ error: "boardId and itemId required" }, 400, origin);
      const sfsRole = await sbRoleOf(who.email);
      if (!sbSeesAll(sfsRole)) return json({ error: "read-only", readOnly: true, message: "Placing candidates is limited to admins, super admins, and managers." }, 403, origin);`,
'worker /boards-sf-stage gate');

fs.writeFileSync(PAGE + '.bak-place', read(PAGE));
fs.writeFileSync(WORKER + '.bak-place', read(WORKER));
fs.writeFileSync(PAGE, p);
fs.writeFileSync(WORKER, w);
console.log('OK  "Started in SF" cell on b1 now places the candidate (Active + Placement stage) on click');
console.log('OK  confirm dialog per candidate; cell turns purple "Placed" on success');
console.log('OK  scoped to b1; Time Card "Upload to SF" toggle unchanged');
console.log('OK  worker: /boards-sf-write and /boards-sf-stage gated to admin/superadmin/manager');
console.log('Backups:', PAGE + '.bak-place', '/', WORKER + '.bak-place');
