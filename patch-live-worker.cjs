/* patch-live-worker.cjs — Phase 2, worker half
   Two small endpoints so the page can notice someone else's change without
   re-downloading every board:
     GET /boards-rev        -> [{id, updated_at, updated_by}]  (metadata only, tiny)
     GET /boards-one?id=..  -> that single board's data
   Both respect the same access rules as /boards-load.
   Run from the repo root:  node patch-live-worker.cjs   then deploy the worker.
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
if (w.indexOf('/boards-rev') !== -1) throw new Error('Worker already has /boards-rev. Aborting.');
if (w.indexOf('/boards-op') === -1) throw new Error('Run patch-ops-worker.cjs first. Aborting.');

const anchor = `    if (url.pathname === "/boards-load") {`;
must(w, anchor, 'load-route');

const routes = `    if (url.pathname === "/boards-rev") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const res = await sbService(env, "GET", "spark_boards?select=id,visibility,owner,members,updated_at,updated_by");
        if (!res.ok) return json({ error: "rev failed" }, 502, origin);
        let rrole = "member";
        try {
          const pr = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(who.email));
          if (pr.ok && pr.data && pr.data[0] && pr.data[0].role) rrole = pr.data[0].role;
        } catch (e) {}
        const revs = (res.data || []).filter((b) => sbAccess(b, who.email, rrole)).map((b) => ({
          id: b.id,
          rev: b.updated_at || null,
          by: b.updated_by || ""
        }));
        return json({ ok: true, revs, me: who.email }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-one") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const bid = String(url.searchParams.get("id") || "").slice(0, 60);
      if (!bid) return json({ error: "id required" }, 400, origin);
      try {
        const res = await sbService(env, "GET", "spark_boards?select=id,data,visibility,owner,members,updated_at,updated_by&id=eq." + encodeURIComponent(bid) + "&limit=1");
        if (!res.ok || !res.data || !res.data[0]) return json({ error: "board not found" }, 404, origin);
        const row = res.data[0];
        let orole = "member";
        try {
          const pr = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(who.email));
          if (pr.ok && pr.data && pr.data[0] && pr.data[0].role) orole = pr.data[0].role;
        } catch (e) {}
        if (!sbAccess(row, who.email, orole)) return json({ error: "You do not have access to this board." }, 403, origin);
        if (row.data) row.data.__rev = row.updated_at || null;
        return json({ ok: true, board: row.data, rev: row.updated_at || null, by: row.updated_by || "" }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
`;
w = w.replace(anchor, routes + anchor);

fs.writeFileSync(WORKER + '.bak-live', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  GET /boards-rev   - revision metadata for every board you can see');
console.log('OK  GET /boards-one   - one board, for refreshing just what changed');
console.log('Backup: worker/cloudworker.js.bak-live');
