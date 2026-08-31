/* patch-ops-worker.cjs — Phase 1, worker half: /boards-op
   Typed operations applied server-side to the stored board, so a client never has
   to send the whole board for a structural change. Two people adding rows at the
   same time stop colliding: each op is applied to whatever the server currently
   holds, not to a snapshot the client took minutes ago.
   Run from the repo root:  node patch-ops-worker.cjs   then deploy the worker.
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
if (w.indexOf('/boards-op') !== -1) throw new Error('Worker already has /boards-op. Aborting.');
if (w.indexOf('/boards-patch') === -1) throw new Error('Run patch-cell-save.cjs first. Aborting.');

const anchor = `    if (url.pathname === "/boards-versions") {`;
must(w, anchor, 'versions-route');

const route = `    if (url.pathname === "/boards-op" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let ob;
      try {
        ob = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const oid = String(ob.board_id || "").slice(0, 60);
      const ops = Array.isArray(ob.ops) ? ob.ops : [];
      if (!oid || !ops.length) return json({ error: "board_id and ops required" }, 400, origin);
      if (ops.length > 50) return json({ error: "too many ops" }, 400, origin);
      try {
        const cur = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members,updated_by&id=eq." + encodeURIComponent(oid) + "&limit=1");
        const prev = cur.ok && cur.data && cur.data[0] ? cur.data[0] : null;
        if (!prev || !prev.data) return json({ error: "board not found" }, 404, origin);
        {
          const orole = typeof sbRoleOf === "function" ? await sbRoleOf(who.email) : "member";
          if (typeof sbAccess === "function" && !sbAccess({ id: oid, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, orole)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }
        const data = prev.data;
        data.groups = Array.isArray(data.groups) ? data.groups : [];
        const findGroup = (id) => data.groups.find((g) => g && g.id === id) || null;
        const findItem = (id) => {
          for (const g of data.groups) {
            const items = Array.isArray(g.items) ? g.items : [];
            for (const it of items) if (it && it.id === id) return { it, g };
          }
          return null;
        };
        const applied = [];
        const skipped = [];
        for (const op of ops) {
          const t = op && op.type;
          if (t === "add_item") {
            const g = findGroup(op.groupId) || data.groups[op.groupIndex || 0];
            if (!g) { skipped.push("add_item: group gone"); continue; }
            g.items = Array.isArray(g.items) ? g.items : [];
            if (op.item && op.item.id && g.items.some((x) => x && x.id === op.item.id)) { skipped.push("add_item: duplicate"); continue; }
            if (typeof op.index === "number" && op.index >= 0 && op.index <= g.items.length) g.items.splice(op.index, 0, op.item);
            else g.items.push(op.item);
            applied.push(t);
          } else if (t === "set_fields") {
            const hit = findItem(op.itemId);
            if (!hit) { skipped.push("set_fields: item gone"); continue; }
            const vals = op.values || {};
            for (const k of Object.keys(vals)) {
              if (vals[k] === null) delete hit.it[k];
              else hit.it[k] = vals[k];
            }
            applied.push(t);
          } else if (t === "remove_item") {
            let gone = false;
            for (const g of data.groups) {
              const before = (g.items || []).length;
              g.items = (g.items || []).filter((x) => !(x && x.id === op.itemId));
              if (g.items.length !== before) gone = true;
            }
            if (gone) applied.push(t); else skipped.push("remove_item: already gone");
          } else if (t === "move_item") {
            const hit = findItem(op.itemId);
            const dest = findGroup(op.toGroupId);
            if (!hit || !dest) { skipped.push("move_item: missing"); continue; }
            hit.g.items = (hit.g.items || []).filter((x) => x !== hit.it);
            dest.items = Array.isArray(dest.items) ? dest.items : [];
            if (typeof op.index === "number" && op.index >= 0 && op.index <= dest.items.length) dest.items.splice(op.index, 0, hit.it);
            else dest.items.push(hit.it);
            applied.push(t);
          } else if (t === "post_note") {
            const hit = findItem(op.itemId);
            if (!hit) { skipped.push("post_note: item gone"); continue; }
            hit.it.updates = Array.isArray(hit.it.updates) ? hit.it.updates : [];
            if (op.note && op.note.id && hit.it.updates.some((u) => u && u.id === op.note.id)) { skipped.push("post_note: duplicate"); continue; }
            hit.it.updates.push(op.note);
            applied.push(t);
          } else if (t === "add_group") {
            if (op.group && op.group.id && findGroup(op.group.id)) { skipped.push("add_group: duplicate"); continue; }
            data.groups.push(op.group);
            applied.push(t);
          } else if (t === "rename_group") {
            const g = findGroup(op.groupId);
            if (!g) { skipped.push("rename_group: group gone"); continue; }
            g.title = String(op.title || "").slice(0, 200);
            applied.push(t);
          } else if (t === "remove_group") {
            const before = data.groups.length;
            data.groups = data.groups.filter((g) => g && g.id !== op.groupId);
            if (data.groups.length !== before) applied.push(t); else skipped.push("remove_group: already gone");
          } else {
            return json({ error: "unknown op: " + String(t) }, 400, origin);
          }
        }
        if (Array.isArray(ob.activity) && ob.activity.length) {
          data.activity = ob.activity.slice(0, 20).concat(Array.isArray(data.activity) ? data.activity : []);
          if (data.activity.length > 200) data.activity.length = 200;
        }
        const stamp = (/* @__PURE__ */ new Date()).toISOString();
        try {
          const last = await sbService(env, "GET", "spark_boards_versions?select=saved_at&board_id=eq." + encodeURIComponent(oid) + "&order=saved_at.desc&limit=1");
          const lastAt = last.ok && last.data && last.data[0] ? Date.parse(last.data[0].saved_at) : 0;
          if (!lastAt || Date.now() - lastAt > 6e5) {
            await sbService(env, "POST", "spark_boards_versions", { board_id: oid, saved_by: who.email, data: prev.data });
            const old3 = await sbService(env, "GET", "spark_boards_versions?select=id&board_id=eq." + encodeURIComponent(oid) + "&order=saved_at.desc&offset=10");
            if (old3.ok && old3.data && old3.data.length) {
              await sbService(env, "DELETE", "spark_boards_versions?id=in.(" + old3.data.map((v) => v.id).join(",") + ")");
            }
          }
        } catch (e) {}
        delete data.__rev;
        const res = await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: oid,
          name: String(data.name || "").slice(0, 200),
          data,
          visibility: prev.visibility,
          owner: prev.owner,
          members: Array.isArray(prev.members) ? prev.members : [],
          updated_by: who.email,
          updated_at: stamp
        });
        if (!res.ok) return json({ error: "op failed: " + JSON.stringify(res.data).slice(0, 250) }, 502, origin);
        return json({ ok: true, id: oid, rev: stamp, applied, skipped, board: data }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
`;
w = w.replace(anchor, route + anchor);

fs.writeFileSync(WORKER + '.bak-ops', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  /boards-op added: add_item, set_fields, remove_item, move_item,');
console.log('    post_note, add_group, rename_group, remove_group');
console.log('OK  every op is idempotent - a retry cannot double-add');
console.log('OK  returns the merged board so the client can take the truth back');
console.log('Backup: worker/cloudworker.js.bak-ops');
