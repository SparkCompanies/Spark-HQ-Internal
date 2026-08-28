/* patch-cell-save.cjs — cell-level saves for Spark Boards
   Adds POST /boards-patch to the worker and Persist.cell() to the page,
   then routes grid cell edits through it instead of posting the whole board.
   Run from the repo root:  node patch-cell-save.cjs
*/
const fs = require('fs');
const path = require('path');

const PAGE = 'spark-boards.html';
const WORKER = path.join('worker', 'cloudworker.js');

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}

/* ============================ WORKER ============================ */
let w = read(WORKER);

const wAnchor = '    if (url.pathname === "/boards-versions") {';
must(w, wAnchor, 'worker-versions-route');
if (w.indexOf('/boards-patch') !== -1) throw new Error('Worker already has /boards-patch. Aborting.');

const wRoute = `    if (url.pathname === "/boards-patch" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let pb;
      try {
        pb = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const pid = String(pb.board_id || "").slice(0, 60);
      const ops = Array.isArray(pb.ops) ? pb.ops : [];
      if (!pid || !ops.length) return json({ error: "board_id and ops required" }, 400, origin);
      if (ops.length > 200) return json({ error: "too many ops" }, 400, origin);
      try {
        const cur = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members,updated_at,updated_by&id=eq." + encodeURIComponent(pid) + "&limit=1");
        const prev = cur.ok && cur.data && cur.data[0] ? cur.data[0] : null;
        if (!prev || !prev.data) return json({ error: "board not found" }, 404, origin);
        if (prev.visibility === "private") {
          let prole = "member";
          try {
            const pr3 = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(who.email));
            if (pr3.ok && pr3.data && pr3.data[0] && pr3.data[0].role) prole = pr3.data[0].role;
          } catch (e) {}
          const padmin2 = prole === "admin" || prole === "superadmin";
          const onIt2 = Array.isArray(prev.members) && prev.members.indexOf(who.email) !== -1;
          if (!padmin2 && prev.owner !== who.email && !onIt2) {
            return json({ error: "You do not have access to this private board." }, 403, origin);
          }
        }
        const data = prev.data;
        const groups = Array.isArray(data.groups) ? data.groups : [];
        const findItem = (id) => {
          for (const g of groups) {
            const items = Array.isArray(g.items) ? g.items : [];
            for (const it of items) if (it && it.id === id) return it;
          }
          return null;
        };
        const S = (v) => v === null || v === void 0 ? "" : String(v);
        const conflicts = [];
        const targets = [];
        for (const op of ops) {
          if (!op || !op.itemId || !op.key) continue;
          const it = findItem(op.itemId);
          if (!it) { conflicts.push({ itemId: op.itemId, key: op.key, gone: true }); continue; }
          if (!pb.force && Object.prototype.hasOwnProperty.call(op, "was") && S(it[op.key]) !== S(op.was)) {
            conflicts.push({ itemId: op.itemId, key: op.key, item: it.name || "", stored: it[op.key] });
            continue;
          }
          targets.push([it, op]);
        }
        if (conflicts.length && !pb.force) {
          return json({ error: "conflict", conflict: true, cells: conflicts, updated_by: prev.updated_by || "" }, 409, origin);
        }
        for (const pair of targets) pair[0][pair[1].key] = pair[1].val;
        if (Array.isArray(pb.activity) && pb.activity.length) {
          data.activity = (pb.activity.slice(0, 20)).concat(Array.isArray(data.activity) ? data.activity : []);
          if (data.activity.length > 200) data.activity.length = 200;
        }
        const stamp = (/* @__PURE__ */ new Date()).toISOString();
        try {
          const last = await sbService(env, "GET", "spark_boards_versions?select=saved_at&board_id=eq." + encodeURIComponent(pid) + "&order=saved_at.desc&limit=1");
          const lastAt = last.ok && last.data && last.data[0] ? Date.parse(last.data[0].saved_at) : 0;
          if (!lastAt || Date.now() - lastAt > 6e5) {
            await sbService(env, "POST", "spark_boards_versions", { board_id: pid, saved_by: who.email, data: prev.data });
            const old2 = await sbService(env, "GET", "spark_boards_versions?select=id&board_id=eq." + encodeURIComponent(pid) + "&order=saved_at.desc&offset=10");
            if (old2.ok && old2.data && old2.data.length) {
              await sbService(env, "DELETE", "spark_boards_versions?id=in.(" + old2.data.map((v) => v.id).join(",") + ")");
            }
          }
        } catch (e) {}
        delete data.__rev;
        const res = await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: pid,
          name: String(data.name || "").slice(0, 200),
          data,
          visibility: prev.visibility,
          owner: prev.owner,
          members: Array.isArray(prev.members) ? prev.members : [],
          updated_by: who.email,
          updated_at: stamp
        });
        if (!res.ok) return json({ error: "patch failed: " + JSON.stringify(res.data).slice(0, 250) }, 502, origin);
        return json({ ok: true, id: pid, rev: stamp, applied: targets.length }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
`;
w = w.replace(wAnchor, wRoute + wAnchor);

/* ============================= PAGE ============================= */
let p = read(PAGE);

const pAnchor1 = "  item() {/* covered by board() */},";
must(p, pAnchor1, 'page-persist-item');
if (p.indexOf('Persist.cell') !== -1 || p.indexOf('/boards-patch') !== -1) throw new Error('Page already patched for cell saves. Aborting.');

const pCell = `  _q: Promise.resolve(),
  cell(b, ops, activity) {
    if (!LIVE || !b || !ops || !ops.length) return;
    if (typeof window !== 'undefined' && window.__sbNoSave) {
      sbFlash('Clear the search box before editing. Changes are not saved while filtered.');
      return;
    }
    const post = force => API.call('/boards-patch', {
      method: 'POST',
      body: JSON.stringify({
        board_id: b.id,
        ops: ops,
        activity: activity || [],
        force: !!force
      })
    }).then(d => {
      if (d && d.rev) b.__rev = d.rev;
    });
    const run = () => post(false).catch(e => {
      const msg = e && e.message ? e.message : '';
      if (msg.indexOf('API 409') !== -1) {
        let by = '',
          cells = [];
        try {
          const j = JSON.parse(msg.slice(msg.indexOf('{')));
          by = j.updated_by || '';
          cells = j.cells || [];
        } catch (x) {}
        const what = cells.length && cells[0].item ? '"' + cells[0].item + '"' : 'this row';
        if (confirm((by || 'Someone else') + ' just changed ' + what + ' too.\\n\\nOK = apply your change anyway (overwrites theirs).\\nCancel = keep theirs (your change is dropped).')) {
          return post(true).catch(e2 => sbFlash('NOT SAVED. ' + (e2 && e2.message ? e2.message : '')));
        }
        location.reload();
        return;
      }
      if (msg.indexOf('API 404') !== -1 || msg.indexOf('API 400') !== -1) {
        Persist.board(b);
        return;
      }
      console.error('[Spark Boards] cell save failed', e);
      sbFlash('NOT SAVED. ' + (msg || 'Unknown error'));
    });
    Persist._q = Persist._q.then(run, run);
    return Persist._q;
  },
`;
p = p.replace(pAnchor1, pCell + pAnchor1);

const pAnchor2 = `    let notes = [];
    if (col && col.type === 'status') notes = runAutomations(nb, it, key);
    update(() => nb);
    Persist.board(nb);`;
must(p, pAnchor2, 'page-setItem-save');
const pReplace = `    let notes = [];
    if (col && col.type === 'status') notes = runAutomations(nb, it, key);
    const _ev = nb.activity && nb.activity[0] && nb.activity[0].kind === 'cell' && nb.activity[0].itemId === it.id && nb.activity[0].col === key ? [nb.activity[0]] : [];
    update(() => nb);
    if (notes.length) Persist.board(nb);else Persist.cell(nb, [{
      itemId: it.id,
      key: key,
      val: val,
      was: old
    }], _ev);`;
p = p.replace(pAnchor2, pReplace);

fs.writeFileSync(WORKER + '.bak-cellsave', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-cellsave', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  worker/cloudworker.js  + /boards-patch route');
console.log('OK  spark-boards.html      + Persist.cell(), setItem routed to it');
console.log('Backups: *.bak-cellsave');
