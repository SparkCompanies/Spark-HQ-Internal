/* patch-sidebar-b.cjs — monday-style sidebar, part 2 of 2
   Adds: workspace switcher pill (+ new workspace), folders that nest boards
   inside a workspace, and a "Move to folder" item in the board kebab menu.
   Requires patch-sidebar-a.cjs to have been applied first.
   Run from the repo root:  node patch-sidebar-b.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}
let p = read(PAGE);
if (p.indexOf('sb-hdr') === -1) throw new Error('Run patch-sidebar-a.cjs first. Aborting.');
if (p.indexOf('ws-pill') !== -1) throw new Error('Sidebar patch B already applied. Aborting.');

/* ---- 1. CSS ---- */
const aCss = `  .sb-empty{color:#7A7C88;font-size:12.5px;padding:10px 12px}`;
must(p, aCss, 'css-empty');
p = p.replace(aCss, `  .sb-empty{color:#7A7C88;font-size:12.5px;padding:10px 12px}
  .ws-pill-wrap{position:relative;padding:0 12px 4px;display:flex;align-items:center;gap:6px}
  .ws-pill{flex:1;min-width:0;display:flex;align-items:center;gap:9px;background:var(--sidebar-2);border:1px solid transparent;border-radius:9px;padding:7px 9px;color:#E8E9EE;cursor:pointer;text-align:left}
  .ws-pill:hover{border-color:#3A3C48}
  .ws-tile{width:24px;height:24px;flex-shrink:0;border-radius:6px;display:flex;align-items:center;justify-content:center;font:700 12px/1 'Jost',sans-serif;color:#1A1407}
  .ws-pill-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px;font-weight:600}
  .ws-pill .chev{flex-shrink:0;opacity:.6;transition:transform .15s}
  .ws-pill.open .chev{transform:rotate(90deg)}
  .ws-menu{position:absolute;top:100%;left:12px;right:12px;z-index:70;background:#25262F;border:1px solid #3A3C48;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.45);padding:5px;max-height:320px;overflow-y:auto}
  .ws-opt{display:flex;align-items:center;gap:9px;width:100%;padding:8px 9px;border-radius:7px;background:none;border:0;color:#C8CAD3;font-size:13.5px;text-align:left;cursor:pointer}
  .ws-opt:hover{background:#31333E;color:#fff}
  .ws-opt.on{color:#fff;font-weight:600}
  .ws-opt .ws-count{margin-left:auto;font-size:11px;color:#7A7C88}
  .fold-head{display:flex;align-items:center;gap:8px;width:100%;padding:7px 12px;border-radius:8px;background:none;border:0;color:#C8CAD3;font-size:13.5px;text-align:left;cursor:pointer}
  .fold-head:hover{background:var(--sidebar-2);color:#fff}
  .fold-head .chev{width:11px;height:11px;flex-shrink:0;opacity:.7;transition:transform .15s}
  .fold-head.open .chev{transform:rotate(90deg)}
  .fold-head svg.fold-ic{width:16px;height:16px;flex-shrink:0;opacity:.85}
  .fold-head .ws-count{margin-left:auto;font-size:11px;color:#7A7C88}
  .fold-kids{padding-left:14px;border-left:1px solid #2E3038;margin-left:19px}
  .sidebar.rail .ws-pill-wrap{display:none}`);

/* ---- 2. folder icon ---- */
const aIc = `  sbSearch: p => /*#__PURE__*/React.createElement("svg", {`;
must(p, aIc, 'ic-search');
p = p.replace(aIc, `  folder: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8",
    strokeLinecap: "round", strokeLinejoin: "round", ...p
  }, /*#__PURE__*/React.createElement("path", { d: "M3 7.5a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.5.7l1 1.2H19a2 2 0 0 1 2 2v7.1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" })),
  sbSearch: p => /*#__PURE__*/React.createElement("svg", {`);

/* ---- 3. workspace + folder helpers ---- */
const aHelp = `function wsColSet(m) { try { localStorage.spark_sb_ws_collapse = JSON.stringify(m); } catch (e) {} }`;
must(p, aHelp, 'ws-helpers');
p = p.replace(aHelp, `function wsColSet(m) { try { localStorage.spark_sb_ws_collapse = JSON.stringify(m); } catch (e) {} }
const WS_ALL = '__all__';
const folderOf = b => (b.folder && String(b.folder).trim()) || '';
function wsExtraGet() { try { return JSON.parse(localStorage.spark_sb_ws_extra || '[]'); } catch (e) { return []; } }
function wsExtraSet(a) { try { localStorage.spark_sb_ws_extra = JSON.stringify(a); } catch (e) {} }
function wsActiveGet() { try { return localStorage.spark_sb_ws_active || WS_DEFAULT; } catch (e) { return WS_DEFAULT; } }
function wsActiveSet(v) { try { localStorage.spark_sb_ws_active = v; } catch (e) {} }
function foldColGet() { try { return JSON.parse(localStorage.spark_sb_fold_collapse || '{}'); } catch (e) { return {}; } }
function foldColSet(m) { try { localStorage.spark_sb_fold_collapse = JSON.stringify(m); } catch (e) {} }
const wsTint = n => {
  const pal = ['#FFC800', '#579BFC', '#00C875', '#A25DDC', '#FF7B54', '#2DA2BB', '#E2445C'];
  let h = 0;
  for (let i = 0; i < String(n).length; i++) h = (h * 31 + String(n).charCodeAt(i)) >>> 0;
  return pal[h % pal.length];
};
function WsPill({ names, counts, active, onPick, onNew }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [open]);
  const label = active === WS_ALL ? 'All workspaces' : active;
  return React.createElement('div', { className: 'ws-pill-wrap', onClick: e => e.stopPropagation() },
    React.createElement('button', { className: 'ws-pill' + (open ? ' open' : ''), onClick: () => setOpen(o => !o) },
      React.createElement('span', { className: 'ws-tile', style: { background: active === WS_ALL ? '#6E6E7C' : wsTint(active), color: active === WS_ALL ? '#fff' : '#1A1407' } }, (label[0] || 'W').toUpperCase()),
      React.createElement('span', { className: 'ws-pill-name' }, label),
      React.createElement('svg', { className: 'chev', viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', style: { transform: 'rotate(90deg)' } }, React.createElement('path', { d: 'M9 6l6 6-6 6' }))),
    React.createElement('button', { className: 'sb-iconbtn', title: 'New workspace', onClick: onNew },
      React.createElement(Ic.plus, { style: { width: 16, height: 16 } })),
    open && React.createElement('div', { className: 'ws-menu' },
      names.map(w => React.createElement('button', {
        key: w, className: 'ws-opt' + (w === active ? ' on' : ''),
        onClick: () => { setOpen(false); onPick(w); }
      },
        React.createElement('span', { className: 'ws-tile', style: { width: 18, height: 18, fontSize: 10, background: wsTint(w) } }, (w[0] || 'W').toUpperCase()),
        React.createElement('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w),
        React.createElement('span', { className: 'ws-count' }, counts[w] || 0))),
      React.createElement('div', { style: { height: 1, background: '#3A3C48', margin: '5px 4px' } }),
      React.createElement('button', {
        className: 'ws-opt' + (active === WS_ALL ? ' on' : ''),
        onClick: () => { setOpen(false); onPick(WS_ALL); }
      },
        React.createElement('span', { className: 'ws-tile', style: { width: 18, height: 18, fontSize: 10, background: '#6E6E7C', color: '#fff' } }, 'A'),
        React.createElement('span', { style: { flex: 1 } }, 'All workspaces'))));
}
function FolderModal({ board, folders, onClose, onApply }) {
  const [val, setVal] = useState(folderOf(board));
  return React.createElement('div', { className: 'overlay', onClick: onClose },
    React.createElement('div', { className: 'modal', style: { maxWidth: 420 }, onClick: e => e.stopPropagation() },
      React.createElement('div', { className: 'modal-h' }, 'Move "' + board.name + '" to a folder'),
      React.createElement('div', { className: 'modal-b' },
        React.createElement('label', null, 'Folder'),
        React.createElement('input', {
          value: val, onChange: e => setVal(e.target.value),
          placeholder: 'Type a new folder name, or pick below', list: 'sb-folder-list', autoFocus: true
        }),
        React.createElement('datalist', { id: 'sb-folder-list' }, folders.map(f => React.createElement('option', { key: f, value: f }))),
        folders.length > 0 && React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 } },
          folders.map(f => React.createElement('button', {
            key: f, className: 'btn ghost', style: { padding: '5px 10px', fontSize: 12.5 }, onClick: () => setVal(f)
          }, f))),
        React.createElement('div', { style: { color: '#8A8A94', fontSize: 12.5, marginTop: 12 } },
          'Leave the box empty to take this board out of its folder.')),
      React.createElement('div', { className: 'modal-f' },
        React.createElement('button', { className: 'btn ghost', onClick: onClose }, 'Cancel'),
        React.createElement('button', { className: 'btn', onClick: () => onApply((val || '').trim()) }, 'Save'))));
}`);

/* ---- 4. WsGroups -> folder-aware renderer ---- */
const aOld = `  if (names.length === 1) {
    return groups[names[0]].map(b => React.createElement(SidebarBoardRow, {
      key: b.id, b: b, active: !!(activeBoard && activeBoard.id === b.id), canEdit: canEdit,
      onOpen: () => openBoard(b.id), onFav: () => toggleFav(b.id), onDelete: () => deleteBoard(b.id), onShare: () => shareBoard(b), onHistory: () => historyBoard(b)
    }));
  }
  return names.map(w => {`;
must(p, aOld, 'wsgroups-body');
p = p.replace(aOld, `  const rowFor = b => React.createElement(SidebarBoardRow, {
    key: b.id, b: b, active: !!(activeBoard && activeBoard.id === b.id), canEdit: canEdit,
    onOpen: () => openBoard(b.id), onFav: () => toggleFav(b.id), onDelete: () => deleteBoard(b.id),
    onShare: () => shareBoard(b), onHistory: () => historyBoard(b), onFolder: () => folderBoard && folderBoard(b)
  });
  const renderList = (list, wsKey) => {
    const loose = list.filter(b => !folderOf(b));
    const fmap = {};
    list.filter(b => folderOf(b)).forEach(b => { const f = folderOf(b); (fmap[f] = fmap[f] || []).push(b); });
    const fnames = Object.keys(fmap).sort((a, b) => a.localeCompare(b));
    const fc = foldColGet();
    return [].concat(
      loose.map(rowFor),
      fnames.map(f => {
        const fk = wsKey + '/' + f;
        const fopen = forceOpen ? true : !fc[fk];
        return React.createElement(React.Fragment, { key: 'f' + fk },
          React.createElement('button', {
            className: 'fold-head' + (fopen ? ' open' : ''),
            onClick: () => { const m = foldColGet(); m[fk] = fopen; foldColSet(m); setTick(t => t + 1); }
          },
            React.createElement('svg', { className: 'chev', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('path', { d: 'M9 6l6 6-6 6' })),
            React.createElement(Ic.folder, { className: 'fold-ic' }),
            React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, f),
            React.createElement('span', { className: 'ws-count' }, fmap[f].length)),
          fopen && React.createElement('div', { className: 'fold-kids' }, fmap[f].map(rowFor)));
      }));
  };
  if (names.length === 1) return renderList(groups[names[0]], names[0]);
  return names.map(w => {`);

const aInner = `      open && groups[w].map(b => React.createElement(SidebarBoardRow, {
        key: b.id, b: b, active: !!(activeBoard && activeBoard.id === b.id), canEdit: canEdit,
        onOpen: () => openBoard(b.id), onFav: () => toggleFav(b.id), onDelete: () => deleteBoard(b.id), onShare: () => shareBoard(b), onHistory: () => historyBoard(b)
      }))`;
must(p, aInner, 'wsgroups-inner');
p = p.replace(aInner, `      open && renderList(groups[w], w)`);

const aSig = `function WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard, historyBoard, q }) {`;
must(p, aSig, 'wsgroups-sig-b');
p = p.replace(aSig, `function WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard, historyBoard, folderBoard, q }) {`);

/* ---- 5. kebab: Move to folder ---- */
const aRowSig = `function SidebarBoardRow({
  b,
  active,
  canEdit,
  onOpen,
  onFav,
  onDelete,
  onShare,
  onHistory
}) {`;
must(p, aRowSig, 'row-sig');
p = p.replace(aRowSig, `function SidebarBoardRow({
  b,
  active,
  canEdit,
  onOpen,
  onFav,
  onDelete,
  onShare,
  onHistory,
  onFolder
}) {`);

const aMenu = `  }, /*#__PURE__*/React.createElement(Ic.lock, {
    style: { width: 15, height: 15 }
  }), "Sharing & privacy"), /*#__PURE__*/React.createElement("button", {`;
must(p, aMenu, 'menu-share');
p = p.replace(aMenu, `  }, /*#__PURE__*/React.createElement(Ic.lock, {
    style: { width: 15, height: 15 }
  }), "Sharing & privacy"), /*#__PURE__*/React.createElement("button", {
    className: "menu-item",
    onClick: () => {
      setMenu(false);
      onFolder && onFolder();
    }
  }, /*#__PURE__*/React.createElement(Ic.folder, {
    style: { width: 15, height: 15 }
  }), "Move to folder"), /*#__PURE__*/React.createElement("button", {`);

/* ---- 6. App state: active workspace + folder modal ---- */
const aState = `  const [sideQ, setSideQ] = useState('');`;
must(p, aState, 'app-sideq');
p = p.replace(aState, `  const [sideQ, setSideQ] = useState('');
  const [folderBoard, setFolderBoard] = useState(null);
  const [wsActive, setWsActive] = useState(wsActiveGet);
  const pickWs = w => {
    wsActiveSet(w);
    setWsActive(w);
  };
  const newWs = () => {
    const n = (prompt('Name the new workspace') || '').trim();
    if (!n) return;
    const x = wsExtraGet();
    if (x.indexOf(n) === -1) {
      x.push(n);
      wsExtraSet(x);
    }
    pickWs(n);
  };
  const setFolder = (id, f) => {
    updateBoard(id, b => {
      const nb = { ...b };
      if (f) nb.folder = f;else delete nb.folder;
      Persist.board(nb);
      return nb;
    });
    setFolderBoard(null);
  };`);

/* ---- 7. render the pill and scope the list ---- */
const aWsLabel = `  }, "Workspaces"), /*#__PURE__*/React.createElement("div", {`;
must(p, aWsLabel, 'ws-label');
p = p.replace(aWsLabel, `  }, "Workspaces"), /*#__PURE__*/React.createElement(WsPill, {
    names: wsNames,
    counts: wsCounts,
    active: wsActive,
    onPick: pickWs,
    onNew: newWs
  }), /*#__PURE__*/React.createElement("div", {`);

const aWsCall = `  }, sideQ.trim() && !visible.filter(sideMatch).length && /*#__PURE__*/React.createElement("div", {
    className: "sb-empty"
  }, 'No boards match "' + sideQ.trim() + '"'), /*#__PURE__*/React.createElement(WsGroups, { visible: visible.filter(sideMatch), q: sideQ,`;
must(p, aWsCall, 'wsgroups-call-b');
p = p.replace(aWsCall, `  }, sideQ.trim() && !visible.filter(sideMatch).length && /*#__PURE__*/React.createElement("div", {
    className: "sb-empty"
  }, 'No boards match "' + sideQ.trim() + '"'), !sideQ.trim() && !wsScoped.length && /*#__PURE__*/React.createElement("div", {
    className: "sb-empty"
  }, 'No boards in this workspace yet.'), /*#__PURE__*/React.createElement(WsGroups, { visible: wsScoped, q: sideQ, folderBoard: b => setFolderBoard(b),`);

/* wsNames / wsCounts / wsScoped / allFolders derivations */
const aDeriv = `  const deletedBoards = boards.filter(b => b.deletedAt);`;
must(p, aDeriv, 'visible-derive');
p = p.replace(aDeriv, `  const deletedBoards = boards.filter(b => b.deletedAt);
  const searchingSide = !!sideQ.trim();
  const wsNames = (() => {
    const s = {};
    visible.forEach(b => {
      s[wsOf(b)] = true;
    });
    wsExtraGet().forEach(n => {
      s[n] = true;
    });
    s[WS_DEFAULT] = true;
    if (wsActive && wsActive !== WS_ALL) s[wsActive] = true;
    return Object.keys(s).sort((a, b) => a === WS_DEFAULT ? -1 : b === WS_DEFAULT ? 1 : a.localeCompare(b));
  })();
  const wsCounts = (() => {
    const c = {};
    visible.forEach(b => {
      const w = wsOf(b);
      c[w] = (c[w] || 0) + 1;
    });
    return c;
  })();
  const wsScoped = visible.filter(sideMatch).filter(b => searchingSide || wsActive === WS_ALL || wsOf(b) === wsActive);
  const allFolders = (() => {
    const s = {};
    visible.forEach(b => {
      const f = folderOf(b);
      if (f) s[f] = true;
    });
    return Object.keys(s).sort((a, b) => a.localeCompare(b));
  })();`);

/* ---- 8. modal mount ---- */
const aModal = `historyBoard && React.createElement(HistoryModal, { board: historyBoard, onClose: () => setHistoryBoard(null) })`;
must(p, aModal, 'history-mount');
p = p.replace(aModal, `historyBoard && React.createElement(HistoryModal, { board: historyBoard, onClose: () => setHistoryBoard(null) }), folderBoard && React.createElement(FolderModal, { board: folderBoard, folders: allFolders, onClose: () => setFolderBoard(null), onApply: f => setFolder(folderBoard.id, f) })`);

fs.writeFileSync(PAGE + '.bak-sidebarB', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  workspace switcher pill + New workspace');
console.log('OK  folders nested inside workspaces');
console.log('OK  "Move to folder" in the board kebab menu');
console.log('Backup: spark-boards.html.bak-sidebarB');
