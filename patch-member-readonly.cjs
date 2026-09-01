/* patch-member-readonly.cjs — members are view-only; editing is admin/superadmin/manager
   Members already only RECEIVE b1 from the worker (sbAccess + MEMBER_BOARDS=["b1"]),
   so "see only the On-boarding board" is already enforced on reads. What was missing
   is an EDIT gate: sbAccess controls visibility, not write permission, so a member
   could still write to b1 via the worker. This adds:
     - worker: sbCanEdit(role) gate on /boards-save, /boards-patch, /boards-op (403 read-only)
     - page:   canEdit driven by the real server role, so members/viewers get a
               read-only UI (no cell edit, add, delete, drag, group ops)
   Editors = admin, superadmin, manager (same set that already sees all boards).
   Run from repo root:  node patch-member-readonly.cjs
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

/* ---------- worker ---------- */
let w = read(WORKER);
if(w.indexOf('sbCanEdit') !== -1) throw new Error('Worker already patched (sbCanEdit present). Aborting.');

w = repl(w,
`    const sbSeesAll = (role) => role === "admin" || role === "superadmin" || (MANAGER_SEES_ALL && role === "manager");
    const sbAccess = (board, email, role) => {`,
`    const sbSeesAll = (role) => role === "admin" || role === "superadmin" || (MANAGER_SEES_ALL && role === "manager");
    const sbCanEdit = (role) => sbSeesAll(role);
    const sbAccess = (board, email, role) => {`,
'worker sbCanEdit helper');

w = repl(w,
`        const prev = cur.ok && cur.data && cur.data[0] ? cur.data[0] : null;
        if (prev) {
          const srole = await sbRoleOf(who.email);
          if (!sbAccess({ id: row.id, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, srole)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }`,
`        const prev = cur.ok && cur.data && cur.data[0] ? cur.data[0] : null;
        const srole = await sbRoleOf(who.email);
        if (!sbCanEdit(srole)) return json({ error: "read-only", readOnly: true, message: "Your Spark Boards access is view-only." }, 403, origin);
        if (prev) {
          if (!sbAccess({ id: row.id, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, srole)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }`,
'worker /boards-save gate');

w = repl(w,
`          const prole2 = await sbRoleOf(who.email);
          if (!sbAccess({ id: pid, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, prole2)) {`,
`          const prole2 = await sbRoleOf(who.email);
          if (!sbCanEdit(prole2)) return json({ error: "read-only", readOnly: true, message: "Your Spark Boards access is view-only." }, 403, origin);
          if (!sbAccess({ id: pid, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, prole2)) {`,
'worker /boards-patch gate');

w = repl(w,
`          const orole = typeof sbRoleOf === "function" ? await sbRoleOf(who.email) : "member";
          if (typeof sbAccess === "function" && !sbAccess({ id: oid, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, orole)) {`,
`          const orole = typeof sbRoleOf === "function" ? await sbRoleOf(who.email) : "member";
          if (!sbCanEdit(orole)) return json({ error: "read-only", readOnly: true, message: "Your Spark Boards access is view-only." }, 403, origin);
          if (typeof sbAccess === "function" && !sbAccess({ id: oid, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, orole)) {`,
'worker /boards-op gate');

/* ---------- page ---------- */
let p = read(PAGE);
if(p.indexOf('EDIT_ROLES') !== -1) throw new Error('Page already patched (EDIT_ROLES present). Aborting.');

p = repl(p,
`  const canEdit = role !== 'viewer';`,
`  const EDIT_ROLES = ['admin', 'superadmin', 'manager'];
  const canEdit = (() => {
    const rr = String(Auth.serverRole || '').toLowerCase();
    const realIsEditor = LIVE ? EDIT_ROLES.indexOf(rr) !== -1 : true;
    if (realRole === 'admin' && role !== 'admin') return false; // admin previewing a lower role via "View as"
    return realIsEditor;
  })();`,
'page canEdit');

fs.writeFileSync(WORKER + '.bak-readonly', read(WORKER));
fs.writeFileSync(PAGE + '.bak-readonly', read(PAGE));
fs.writeFileSync(WORKER, w);
fs.writeFileSync(PAGE, p);
console.log('OK  worker: sbCanEdit gate on /boards-save, /boards-patch, /boards-op (members get 403 read-only)');
console.log('OK  page:   canEdit now follows the real server role; members and viewers are read-only');
console.log('OK  editors = admin, superadmin, manager (same set that sees all boards)');
console.log('Backups:', WORKER + '.bak-readonly', '/', PAGE + '.bak-readonly');
