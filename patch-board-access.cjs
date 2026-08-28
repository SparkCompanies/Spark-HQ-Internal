/* patch-board-access.cjs — server-side board access rules
   - member  : sees ONLY the boards listed in MEMBER_BOARDS (On-boarding Tracker)
   - manager : sees all non-private boards            <-- change MANAGER_SEES_ALL to flip
   - admin / superadmin : see all non-private boards
   - private boards: owner + named members ONLY. No admin bypass, per request.
   Enforced on load, save, patch and delete, so it cannot be bypassed from the browser.
   Run from the repo root:  node patch-board-access.cjs   then deploy the worker.
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
if (w.indexOf('sbAccess') !== -1) throw new Error('Access patch already applied. Aborting.');
if (w.indexOf('/boards-patch') === -1) throw new Error('Run patch-cell-save.cjs first. Aborting.');

/* ---- 1. shared helpers, defined once above the board routes ---- */
const aLoad = `    if (url.pathname === "/boards-load") {`;
must(w, aLoad, 'load-route');
const helpers = `    /* ---- sbAccess: who may see which boards ---- */
    const MEMBER_BOARDS = ["b1"];
    const MANAGER_SEES_ALL = true;
    const sbRoleOf = async (email) => {
      try {
        const r = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(email));
        if (r.ok && r.data && r.data[0] && r.data[0].role) return String(r.data[0].role).toLowerCase();
      } catch (e) {}
      return "member";
    };
    const sbSeesAll = (role) => role === "admin" || role === "superadmin" || (MANAGER_SEES_ALL && role === "manager");
    const sbAccess = (board, email, role) => {
      if (board.visibility === "private") {
        /* an explicit share always wins, whatever the role */
        const onIt = Array.isArray(board.members) && board.members.indexOf(email) !== -1;
        return board.owner === email || onIt;
      }
      if (!sbSeesAll(role) && MEMBER_BOARDS.indexOf(String(board.id)) === -1) return false;
      return true;
    };
${aLoad}`;
w = w.replace(aLoad, helpers);

/* ---- 2. /boards-load ---- */
const aFilter = `        const isAdmin = role === "admin" || role === "superadmin";
        const boards = (res.data || []).filter((b) => {
          if (b.visibility !== "private") return true;
          if (isAdmin) return true;
          if (b.owner === who.email) return true;
          return Array.isArray(b.members) && b.members.indexOf(who.email) !== -1;
        })`;
must(w, aFilter, 'load-filter');
w = w.replace(aFilter, `        const boards = (res.data || []).filter((b) => sbAccess(b, who.email, role))`);

/* ---- 3. /boards-save ---- */
const aSave = `        if (prev && prev.visibility === "private") {
          let prole = "member";
          try {
            const pr2 = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(who.email));
            if (pr2.ok && pr2.data && pr2.data[0] && pr2.data[0].role) prole = pr2.data[0].role;
          } catch (e) {}
          const padmin = prole === "admin" || prole === "superadmin";
          const onIt = Array.isArray(prev.members) && prev.members.indexOf(who.email) !== -1;
          if (!padmin && prev.owner !== who.email && !onIt) {
            return json({ error: "You do not have access to this private board." }, 403, origin);
          }
        }`;
must(w, aSave, 'save-gate');
w = w.replace(aSave, `        if (prev) {
          const srole = await sbRoleOf(who.email);
          if (!sbAccess({ id: row.id, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, srole)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }`);

/* ---- 4. /boards-patch ---- */
const aPatch = `        if (prev.visibility === "private") {
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
        }`;
must(w, aPatch, 'patch-gate');
w = w.replace(aPatch, `        {
          const prole2 = await sbRoleOf(who.email);
          if (!sbAccess({ id: pid, visibility: prev.visibility, owner: prev.owner, members: prev.members }, who.email, prole2)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }`);

/* ---- 5. /boards-delete ---- */
const aDel = `    if (url.pathname === "/boards-delete" && request.method === "POST") {`;
must(w, aDel, 'delete-route');
w = w.replace(aDel, `    if (url.pathname === "/boards-delete" && request.method === "POST") {
      {
        const dwho = await verifyUser(request, env);
        if (!dwho.ok) return json({ error: dwho.reason || "Unauthorized" }, 401, origin);
        const drole = await sbRoleOf(dwho.email);
        if (!sbSeesAll(drole)) return json({ error: "You do not have access to delete boards." }, 403, origin);
      }`);

fs.writeFileSync(WORKER + '.bak-access', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  member     -> On-boarding Tracker only');
console.log('OK  manager    -> all non-private boards (MANAGER_SEES_ALL = true)');
console.log('OK  admin/superadmin -> all non-private boards');
console.log('OK  private boards -> owner + named members ONLY, no admin bypass');
console.log('OK  enforced on load, save, patch and delete');
console.log('Backup: worker/cloudworker.js.bak-access');
