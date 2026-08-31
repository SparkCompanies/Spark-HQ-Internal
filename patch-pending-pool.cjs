/* patch-pending-pool.cjs — pull unclaimed onboarding candidates into the board
   Worker: POST /boards-pull-pending { board_id, preview?, ids? }
     Finds placements starting between 14 days ago and 90 days out that are NOT
     already on the board (matched by placement id, then by candidate name), skipping
     terminated/cancelled ones. Preview lists them; a second call adds the chosen
     ones to an "Unclaimed" group with name, start date, client and the SF links
     already filled in.
   Page: a "Find unclaimed" button beside Sync with Salesforce, with a review list.
   Patches BOTH files. Run from the repo root:  node patch-pending-pool.cjs
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
if (w.indexOf('/boards-pull-pending') !== -1) throw new Error('Worker already applied. Aborting.');
if (w.indexOf('/boards-op') === -1) throw new Error('Run patch-ops-worker.cjs first. Aborting.');

const anchor = `    if (url.pathname === "/boards-versions") {`;
must(w, anchor, 'versions-route');
const route = `    if (url.pathname === "/boards-pull-pending" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let pp;
      try {
        pp = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const ppid = String(pp.board_id || "").slice(0, 60);
      if (!ppid) return json({ error: "board_id required" }, 400, origin);
      try {
        const br6 = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members&id=eq." + encodeURIComponent(ppid) + "&limit=1");
        if (!br6.ok || !br6.data || !br6.data[0]) return json({ error: "board not found" }, 404, origin);
        const row6 = br6.data[0];
        {
          const rr = typeof sbRoleOf === "function" ? await sbRoleOf(who.email) : "member";
          if (typeof sbAccess === "function" && !sbAccess({ id: ppid, visibility: row6.visibility, owner: row6.owner, members: row6.members }, who.email, rr)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }
        const bd6 = row6.data || {};
        const haveId = {}, haveName = {};
        (bd6.groups || []).forEach((g) => (g.items || []).forEach((x) => {
          if (!x) return;
          if (x.sfId) haveId[String(x.sfId).slice(0, 15)] = true;
          if (x.name) haveName[String(x.name).toLowerCase().replace(/\\s+/g, " ").trim()] = true;
        }));
        const soql6 = "SELECT Id, Name, Status__c, bpats__Start_Date__c, bpats__ATS_Candidate__c, bpats__ATS_Candidate__r.Name, bpats__Account__r.Name, bpats__ATS_Job__c, bpats__ATS_Job__r.Name FROM bpats__Placement__c WHERE (bpats__Start_Date__c = LAST_N_DAYS:14 OR bpats__Start_Date__c = NEXT_N_DAYS:90) AND Terminated_Date__c = null ORDER BY bpats__Start_Date__c ASC";
        const sf6 = await runSalesforceQueryAll(env, soql6);
        if (!sf6.ok) return json({ error: "Salesforce query failed: " + sf6.error }, 502, origin);
        const DEAD6 = /terminat|cancel|fell\\s*off|void|withdraw|declin|rescind|closed\\s*lost|no\\s*show/i;
        const found = [];
        (sf6.records || []).forEach((r) => {
          const nm = r.bpats__ATS_Candidate__r && r.bpats__ATS_Candidate__r.Name || "";
          if (!nm) return;
          if (r.Status__c && DEAD6.test(String(r.Status__c))) return;
          if (haveId[String(r.Id).slice(0, 15)]) return;
          if (haveName[nm.toLowerCase().replace(/\\s+/g, " ").trim()]) return;
          found.push({
            sfId: r.Id,
            name: nm,
            status: r.Status__c || "",
            start: r.bpats__Start_Date__c || "",
            client: r.bpats__Account__r && r.bpats__Account__r.Name || "",
            job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || "",
            candId: r.bpats__ATS_Candidate__c || "",
            jobId: r.bpats__ATS_Job__c || ""
          });
        });
        if (pp.preview !== false) return json({ ok: true, preview: true, found: found, checked: (sf6.records || []).length }, 200, origin);
        const want = Array.isArray(pp.ids) && pp.ids.length ? found.filter((f) => pp.ids.indexOf(f.sfId) !== -1) : found;
        if (!want.length) return json({ ok: true, added: 0, note: "nothing selected" }, 200, origin);
        const cols6 = bd6.columns || [];
        const colBy = (re, type) => cols6.find((c) => c && (!type || c.type === type) && re.test(String(c.label || c.name || c.key || "")));
        const dcol6 = colBy(/start/i, "date");
        const ccol6 = colBy(/client/i, "text");
        let grp = (bd6.groups || []).find((g) => g && /unclaimed|pending/i.test(String(g.title || "")));
        if (!grp) {
          grp = { id: "g_unclaimed", title: "Unclaimed \\u2014 to pick up", color: "#A25DDC", items: [] };
          bd6.groups = [grp].concat(bd6.groups || []);
        }
        grp.items = Array.isArray(grp.items) ? grp.items : [];
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        want.forEach((f, i) => {
          const it = {
            id: "i_pull" + Date.now().toString(36) + i,
            name: f.name,
            sfId: f.sfId,
            sf_status: f.status,
            sf_start: f.start,
            sf_client: f.client,
            sf_job: f.job,
            sf_cand_id: f.candId,
            sf_job_id: f.jobId
          };
          if (dcol6 && f.start) it[dcol6.key] = String(f.start).slice(0, 10);
          if (ccol6 && f.client) it[ccol6.key] = f.client;
          const sfc = cols6.find((c) => c && c.type === "sf");
          if (sfc) it[sfc.key] = 1;
          grp.items.push(it);
        });
        bd6.activity = [{
          id: "ev" + Date.now().toString(36),
          at: Date.now(),
          actor: { name: who.email, color: "#A25DDC" },
          kind: "created",
          item: want.length + " unclaimed candidates pulled from Salesforce",
          group: grp.title
        }].concat(Array.isArray(bd6.activity) ? bd6.activity : []);
        if (bd6.activity.length > 200) bd6.activity.length = 200;
        delete bd6.__rev;
        const sv6 = await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: ppid,
          name: String(bd6.name || "").slice(0, 200),
          data: bd6,
          visibility: row6.visibility,
          owner: row6.owner,
          members: Array.isArray(row6.members) ? row6.members : [],
          updated_by: who.email,
          updated_at: nowIso
        });
        if (!sv6.ok) return json({ error: "save failed: " + JSON.stringify(sv6.data).slice(0, 200) }, 502, origin);
        return json({ ok: true, added: want.length, group: grp.title, rev: nowIso }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
`;
w = w.replace(anchor, route + anchor);

/* ---------------- page ---------------- */
let p = read(PAGE);
if (p.indexOf('PendingPool') !== -1) throw new Error('Page already applied. Aborting.');

const aCss = `  .cred-btn.ghost{background:var(--surface-2);color:var(--text)}`;
must(p, aCss, 'cred-btn-css');
p = p.replace(aCss, `  .cred-btn.ghost{background:var(--surface-2);color:var(--text)}
  .pool-row{display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid var(--border);font-size:13px}
  .pool-row:last-child{border-bottom:0}
  .pool-row .pn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
  .pool-row .pm{color:var(--sub);font-size:12px;white-space:nowrap}
  .pool-list{max-height:46vh;overflow-y:auto;margin:10px 0}`);

const aComp = `function CreditPanel({ boardId, item }) {`;
must(p, aComp, 'creditpanel-fn');
p = p.replace(aComp, `function PendingPool({ boardId, onClose, onDone }) {
  const [state, setState] = useState({ phase: 'loading' });
  const [pick, setPick] = useState({});
  useEffect(() => {
    API.call('/boards-pull-pending', {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId, preview: true })
    }).then(d => {
      const sel = {};
      (d.found || []).forEach(f => {
        sel[f.sfId] = true;
      });
      setPick(sel);
      setState({ phase: 'list', d: d });
    }).catch(e => setState({ phase: 'error', msg: e && e.message ? e.message : 'Failed' }));
  }, [boardId]);
  const add = () => {
    const ids = Object.keys(pick).filter(k => pick[k]);
    if (!ids.length) return;
    setState(s => ({ ...s, phase: 'saving' }));
    API.call('/boards-pull-pending', {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId, preview: false, ids: ids })
    }).then(d => {
      setState({ phase: 'done', d: d });
      if (onDone) onDone();
    }).catch(e => setState({ phase: 'error', msg: e && e.message ? e.message : 'Failed' }));
  };
  const s = state;
  const list = (s.d && s.d.found) || [];
  const nSel = Object.keys(pick).filter(k => pick[k]).length;
  return React.createElement('div', { className: 'overlay', onClick: onClose },
    React.createElement('div', { className: 'modal', style: { maxWidth: 620 }, onClick: e => e.stopPropagation() },
      React.createElement('div', { className: 'modal-h' }, 'Unclaimed candidates in Salesforce'),
      React.createElement('div', { className: 'modal-b' },
        s.phase === 'loading' && React.createElement('div', { className: 'cred-msg' }, 'Checking Salesforce\\u2026'),
        s.phase === 'error' && React.createElement('div', { className: 'cred-msg bad' }, s.msg),
        s.phase === 'done' && React.createElement('div', { className: 'cred-msg good' },
          'Added ' + s.d.added + ' to "' + (s.d.group || 'Unclaimed') + '". Reload to see them.'),
        (s.phase === 'list' || s.phase === 'saving') && React.createElement('div', null,
          list.length === 0 ? React.createElement('div', { className: 'cred-msg' },
            'Nobody new. Every placement starting in the next 90 days is already on this board.') :
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 12.5, color: 'var(--sub)' } },
                list.length + ' not on the board yet, out of ' + s.d.checked + ' placements checked'),
              React.createElement('div', { className: 'pool-list' },
                list.map(f => React.createElement('div', { className: 'pool-row', key: f.sfId },
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: !!pick[f.sfId],
                    onChange: e => setPick(o => ({ ...o, [f.sfId]: e.target.checked }))
                  }),
                  React.createElement('span', { className: 'pn' }, f.name),
                  React.createElement('span', { className: 'pm' }, (f.client || '') + (f.start ? ' \\u00B7 ' + f.start : '') + (f.status ? ' \\u00B7 ' + f.status : ''))))))))
      ,
      React.createElement('div', { className: 'modal-f' },
        React.createElement('button', { className: 'btn ghost', onClick: onClose }, s.phase === 'done' ? 'Close' : 'Cancel'),
        s.phase === 'list' && list.length > 0 && React.createElement('button', {
          className: 'btn', onClick: add
        }, 'Add ' + nSel + ' to the board'))));
}
function CreditPanel({ boardId, item }) {`);

/* toolbar button */
const aBtn = `  }, hasSF && canEdit && /*#__PURE__*/React.createElement("button", {
    className: "btn sync",
    onClick: runSync,`;
must(p, aBtn, 'sync-btn');
p = p.replace(aBtn, `  }, hasSF && canEdit && /*#__PURE__*/React.createElement("button", {
    className: "btn",
    title: "Find placements in Salesforce that are not on this board yet",
    onClick: () => setPoolOpen(true)
  }, /*#__PURE__*/React.createElement(Ic.people || 'span', null), "Find unclaimed"), hasSF && canEdit && /*#__PURE__*/React.createElement("button", {
    className: "btn sync",
    onClick: runSync,`);

const aState = `  const [trashOpen, setTrashOpen] = useState(false);`;
must(p, aState, 'boardview-state');
p = p.replace(aState, `  const [trashOpen, setTrashOpen] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);`);

const aMount = `  })), trashOpen && /*#__PURE__*/React.createElement(TrashModal, {`;
must(p, aMount, 'trash-mount');
p = p.replace(aMount, `  })), poolOpen && /*#__PURE__*/React.createElement(PendingPool, {
    boardId: board.id,
    onClose: () => setPoolOpen(false),
    onDone: () => {}
  }), trashOpen && /*#__PURE__*/React.createElement(TrashModal, {`);

fs.writeFileSync(WORKER + '.bak-pool', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-pool', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  POST /boards-pull-pending finds placements not on the board');
console.log('OK  "Find unclaimed" button beside Sync, with a review list');
console.log('OK  adds to an "Unclaimed - to pick up" group, links already filled in');
console.log('Backups: *.bak-pool');
