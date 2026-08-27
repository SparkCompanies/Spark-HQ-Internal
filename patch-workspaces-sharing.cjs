// ============================================================================
// patch-workspaces-sharing.cjs
// Spark Boards: monday-style workspace groups in the sidebar + private boards
// + sharing (member picker fed by real HQ logins via new /boards-people route).
//
// Run from the repo root:
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-workspaces-sharing.cjs
//   git add -A && git commit -m "Boards: workspaces + private boards + sharing" && git push
//   cd worker && npx wrangler deploy
// ============================================================================
const fs = require("fs");
const path = require("path");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");

function findOne(name) {
  const hits = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules" || e.name === ".wrangler") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === name) hits.push(p);
    }
  })(".");
  if (hits.length !== 1) throw new Error("Expected exactly one " + name + ", found " + hits.length + ": " + hits.join(", "));
  return hits[0];
}
function apply(file, edits, marker) {
  let src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (src.includes(marker)) throw new Error(file + " already patched (" + marker + "). Nothing written.");
  for (const [i, [oldS, newS]] of edits.entries()) {
    const n = src.split(oldS).length - 1;
    if (n !== 1) throw new Error(file + " edit #" + (i + 1) + ": anchor found " + n + " times (need exactly 1). NOTHING written to any file.");
  }
  for (const [oldS, newS] of edits) src = src.replace(oldS, newS);
  return src;
}

const PAGE_EDITS = [
 [
  "if (hit) return hit;",
  "if (hit) return Object.assign({}, hit, { email: email });"
 ],
 [
  "const canSeeBoard = (b, meId, role) => b.visibility !== 'private' || role === 'admin' || b.owner === meId || (b.members || []).includes(meId);",
  "const canSeeBoard = (b, meId, role, meEmail) => { if (b.visibility !== 'private' || role === 'admin') return true; const em = (meEmail || '').toLowerCase(); const own = String(b.owner || '').toLowerCase(); if (b.owner === meId || (em && own === em)) return true; return (b.members || []).some(m => m === meId || String(m).toLowerCase() === em); };"
 ],
 [
  "const visible = boards.filter(b => !b.deletedAt && canSeeBoard(b, actingId, role));",
  "const visible = boards.filter(b => !b.deletedAt && canSeeBoard(b, actingId, role, me.email));"
 ],
 [
  "const actingId = role === 'viewer' ? '_recruiter' : me.id;",
  "const [shareBoard, setShareBoard] = useState(null);\n  const actingId = role === 'viewer' ? '_recruiter' : me.id;"
 ],
 [
  "function SidebarBoardRow({\n  b,\n  active,\n  canEdit,\n  onOpen,\n  onFav,\n  onDelete\n}) {",
  "function SidebarBoardRow({\n  b,\n  active,\n  canEdit,\n  onOpen,\n  onFav,\n  onDelete,\n  onShare\n}) {"
 ],
 [
  "/*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item danger\",\n    onClick: () => {\n      setMenu(false);\n      onDelete();\n    }",
  "/*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item\",\n    onClick: () => {\n      setMenu(false);\n      onShare && onShare();\n    }\n  }, /*#__PURE__*/React.createElement(Ic.lock, {\n    style: { width: 15, height: 15 }\n  }), \"Sharing & privacy\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item danger\",\n    onClick: () => {\n      setMenu(false);\n      onDelete();\n    }"
 ],
 [
  "visible.map(b => /*#__PURE__*/React.createElement(SidebarBoardRow, {\n    key: b.id,\n    b: b,\n    active: activeBoard && activeBoard.id === b.id,\n    canEdit: canEdit,\n    onOpen: () => setRoute({\n      page: 'board',\n      id: b.id\n    }),\n    onFav: () => toggleFav(b.id),\n    onDelete: () => deleteBoard(b.id)\n  }))",
  "/*#__PURE__*/React.createElement(WsGroups, { visible: visible, activeBoard: activeBoard, canEdit: canEdit, openBoard: id => setRoute({ page: 'board', id: id }), toggleFav: toggleFav, deleteBoard: deleteBoard, shareBoard: b => setShareBoard(b) })"
 ],
 [
  "}, \"Boards\"), ",
  "}, \"Workspaces\"), "
 ],
 [
  "/*#__PURE__*/React.createElement(\"div\", {\n    className: \"main\"\n  }",
  "shareBoard && /*#__PURE__*/React.createElement(ShareModal, { board: shareBoard, me: me, onClose: () => setShareBoard(null), onApply: patch => { updateBoard(shareBoard.id, b => { const nb = Object.assign({}, b, patch); Persist.board(nb); return nb; }); setShareBoard(null); } }), /*#__PURE__*/React.createElement(\"div\", {\n    className: \"main\"\n  }"
 ],
 [
  "/* Workspace-level trash: restore or permanently remove deleted boards */",
  "\n/* ---------------- Workspaces + Sharing (sb-ws-share) ---------------- */\nconst WS_DEFAULT = 'Main workspace';\nconst wsOf = b => (b.ws && String(b.ws).trim()) || WS_DEFAULT;\nfunction wsColGet() { try { return JSON.parse(localStorage.spark_sb_ws_collapse || '{}'); } catch (e) { return {}; } }\nfunction wsColSet(m) { try { localStorage.spark_sb_ws_collapse = JSON.stringify(m); } catch (e) {} }\nfunction WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard }) {\n  const [, setTick] = useState(0);\n  const groups = {};\n  visible.forEach(b => { const w = wsOf(b); (groups[w] = groups[w] || []).push(b); });\n  const names = Object.keys(groups).sort((a, b) => (a === WS_DEFAULT ? -1 : b === WS_DEFAULT ? 1 : a.localeCompare(b)));\n  const col = wsColGet();\n  const activeWs = activeBoard ? wsOf(activeBoard) : null;\n  if (names.length === 1) {\n    return groups[names[0]].map(b => React.createElement(SidebarBoardRow, {\n      key: b.id, b: b, active: !!(activeBoard && activeBoard.id === b.id), canEdit: canEdit,\n      onOpen: () => openBoard(b.id), onFav: () => toggleFav(b.id), onDelete: () => deleteBoard(b.id), onShare: () => shareBoard(b)\n    }));\n  }\n  return names.map(w => {\n    const open = col[w] !== undefined ? !col[w] : (w === WS_DEFAULT || w === activeWs);\n    return React.createElement(React.Fragment, { key: w },\n      React.createElement('button', {\n        className: 'ws-head' + (open ? ' open' : ''),\n        onClick: () => { const m = wsColGet(); m[w] = open; wsColSet(m); setTick(t => t + 1); }\n      },\n        React.createElement('svg', { className: 'chev', viewBox: '0 0 24 24', width: 11, height: 11, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('path', { d: 'M9 6l6 6-6 6' })),\n        React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w),\n        React.createElement('span', { className: 'ws-count' }, groups[w].length)\n      ),\n      open && groups[w].map(b => React.createElement(SidebarBoardRow, {\n        key: b.id, b: b, active: !!(activeBoard && activeBoard.id === b.id), canEdit: canEdit,\n        onOpen: () => openBoard(b.id), onFav: () => toggleFav(b.id), onDelete: () => deleteBoard(b.id), onShare: () => shareBoard(b)\n      }))\n    );\n  });\n}\nfunction ShareModal({ board, me, onApply, onClose }) {\n  const [vis, setVis] = useState(board.visibility === 'private' ? 'private' : 'workspace');\n  const [members, setMembers] = useState(Array.isArray(board.members) ? board.members.slice() : []);\n  const [ws, setWs] = useState(board.ws || WS_DEFAULT);\n  const [people, setPeople] = useState(null);\n  const [q, setQ] = useState('');\n  const [manual, setManual] = useState('');\n  useEffect(() => {\n    let on = true;\n    API.call('/boards-people').then(d => { if (on) setPeople((d && d.users) || []); }).catch(() => { if (on) setPeople([]); });\n    return () => { on = false; };\n  }, []);\n  const ownerEmail = String(board.owner || '').indexOf('@') !== -1 ? board.owner : (me.email || '');\n  const toggleM = em => setMembers(ms => ms.indexOf(em) !== -1 ? ms.filter(x => x !== em) : ms.concat([em]));\n  const addManual = () => {\n    const em = (manual || '').trim().toLowerCase();\n    if (em.indexOf('@') === -1) { sbFlash('Enter a full email address.'); return; }\n    if (members.indexOf(em) === -1) setMembers(ms => ms.concat([em]));\n    setManual('');\n  };\n  const list = (people || []).filter(p => p.email && p.email !== ownerEmail &&\n    (!q || p.email.toLowerCase().indexOf(q.toLowerCase()) !== -1 || (p.name || '').toLowerCase().indexOf(q.toLowerCase()) !== -1));\n  const save = () => onApply({\n    visibility: vis,\n    members: vis === 'private' ? members : [],\n    ws: (ws || '').trim() || WS_DEFAULT,\n    owner: String(board.owner || '').indexOf('@') !== -1 ? board.owner : ((me.email || '').toLowerCase() || board.owner || 'u1')\n  });\n  const pill = (key, label) => React.createElement('button', {\n    className: 'btn ' + (vis === key ? 'primary' : 'ghost'),\n    style: { flex: 1 },\n    onClick: () => setVis(key)\n  }, label);\n  return React.createElement('div', { className: 'overlay', onClick: onClose },\n    React.createElement('div', { className: 'modal', onClick: e => e.stopPropagation() },\n      React.createElement('div', { className: 'modal-h' }, 'Sharing & privacy'),\n      React.createElement('div', { className: 'modal-b' },\n        React.createElement('div', { className: 'field' },\n          React.createElement('label', null, 'Board'),\n          React.createElement('div', { style: { fontSize: 14, fontWeight: 600 } }, board.name)),\n        React.createElement('div', { className: 'field' },\n          React.createElement('label', null, 'Workspace'),\n          React.createElement('input', { value: ws, onChange: e => setWs(e.target.value), placeholder: WS_DEFAULT })),\n        React.createElement('div', { className: 'field' },\n          React.createElement('label', null, 'Who can see this board'),\n          React.createElement('div', { style: { display: 'flex', gap: 8 } },\n            pill('workspace', 'Everyone'),\n            pill('private', 'Private')),\n          React.createElement('div', { style: { fontSize: 12, color: 'var(--sub)', marginTop: 7 } },\n            vis === 'private' ? 'Only the owner, the people below, and admins can see it.' : 'Everyone signed in to Spark Boards can see it.')),\n        vis === 'private' && React.createElement('div', { className: 'field' },\n          React.createElement('label', null, 'Owner'),\n          React.createElement('div', { style: { fontSize: 13 } }, ownerEmail || 'you')),\n        vis === 'private' && React.createElement('div', { className: 'field' },\n          React.createElement('label', null, 'Shared with'),\n          people === null && React.createElement('div', { style: { fontSize: 13, color: 'var(--sub)' } }, 'Loading people...'),\n          people !== null && people.length > 0 && React.createElement(React.Fragment, null,\n            React.createElement('input', { value: q, onChange: e => setQ(e.target.value), placeholder: 'Search people', style: { marginBottom: 8 } }),\n            React.createElement('div', { style: { maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-strong)', borderRadius: 8 } },\n              list.map(p => React.createElement('label', {\n                key: p.email,\n                style: { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', cursor: 'pointer', fontSize: 13.5, borderBottom: '1px solid var(--border)' }\n              },\n                React.createElement('input', { type: 'checkbox', checked: members.indexOf(p.email) !== -1, onChange: () => toggleM(p.email) }),\n                React.createElement('span', { style: { fontWeight: 600 } }, p.name || p.email),\n                React.createElement('span', { style: { color: 'var(--sub)', marginLeft: 'auto', fontSize: 12 } }, p.email))))),\n          people !== null && people.length === 0 && React.createElement('div', { style: { display: 'flex', gap: 8 } },\n            React.createElement('input', { value: manual, onChange: e => setManual(e.target.value), placeholder: 'name@sparkcompanies.com' }),\n            React.createElement('button', { className: 'btn ghost', onClick: addManual }, 'Add')),\n          members.length > 0 && React.createElement('div', { style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 } },\n            members.map(em => React.createElement('span', {\n              key: em,\n              style: { fontSize: 12, background: 'var(--sidebar-2)', color: '#E8E9EE', borderRadius: 20, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }\n            }, em, React.createElement('span', { style: { cursor: 'pointer', opacity: .7 }, onClick: () => toggleM(em) }, '\\u00D7'))))\n        )),\n      React.createElement('div', { className: 'modal-f' },\n        React.createElement('button', { className: 'btn ghost', onClick: onClose }, 'Cancel'),\n        React.createElement('button', { className: 'btn primary', onClick: save }, 'Save'))));\n}\n\n/* Workspace-level trash: restore or permanently remove deleted boards */"
 ],
 [
  ".side-foot{margin-top:auto",
  ".ws-head{display:flex;align-items:center;gap:7px;width:100%;background:none;border:0;color:#8A8C97;font:600 11px/1 'Jost',sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:9px 14px 5px;cursor:pointer;text-align:left}\n  .ws-head:hover{color:#fff}\n  .ws-head .chev{transition:transform .15s;flex-shrink:0}\n  .ws-head.open .chev{transform:rotate(90deg)}\n  .ws-count{margin-left:auto;font-size:10.5px;opacity:.65;font-weight:500}\n  .side-foot{margin-top:auto"
 ]
];
const WORKER_EDITS = [
 [
  "    if (url.pathname === \"/boards-users\") {",
  "    if (url.pathname === \"/boards-people\") {\n      const who = await verifyUser(request, env);\n      if (!who.ok) return json({ error: who.reason || \"Unauthorized\" }, 401, origin);\n      try {\n        const res = await sbService(env, \"GET\", \"profiles?select=email,full_name&order=full_name\");\n        if (!res.ok) return json({ error: \"Could not read profiles\" }, 502, origin);\n        return json({ ok: true, users: (res.data || []).map((u) => ({ email: (u.email || \"\").toLowerCase(), name: u.full_name || u.email })) }, 200, origin);\n      } catch (e) {\n        return json({ error: String(e.message || e) }, 502, origin);\n      }\n    }\n    if (url.pathname === \"/boards-users\") {"
 ]
];

const page = "spark-boards.html";
const worker = "worker/cloudworker.js";

// dry-run both BEFORE writing either (all-or-nothing)
const pageOut = apply(page, PAGE_EDITS, "sb-ws-share");
const workerOut = apply(worker, WORKER_EDITS, "/boards-people");

fs.writeFileSync(page + ".bak-wsshare", fs.readFileSync(page));
fs.writeFileSync(worker + ".bak-wsshare", fs.readFileSync(worker));
fs.writeFileSync(page, pageOut);
fs.writeFileSync(worker, workerOut);
console.log("PATCHED " + page + "  (backup .bak-wsshare)");
console.log("PATCHED " + worker + " (backup .bak-wsshare)");
console.log("");
console.log("Next:");
console.log("  git add -A && git commit -m \"Boards: workspaces + private boards + sharing\" && git push");
console.log("  cd worker && npx wrangler deploy");
console.log("Then hard-refresh Spark Boards (Ctrl+F5).");
