/* patch-sidebar-a.cjs — monday-style sidebar, part 1 of 2
   Adds: board search box, collapse-to-rail button, board-type glyphs (lock badge
   on private boards) in place of the plain colored dot.
   Run from the repo root:  node patch-sidebar-a.cjs
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
if (p.indexOf('sb-hdr') !== -1) throw new Error('Sidebar patch A already applied. Aborting.');

/* ---- 1. CSS ---- */
const aCss = `  .new-board-btn:hover{background:#E0B654}`;
must(p, aCss, 'css-newboard');
const css = `  .new-board-btn:hover{background:#E0B654}
  .sb-hdr{display:flex;align-items:center;gap:6px;padding:2px 12px 8px}
  .sb-search{flex:1;display:flex;align-items:center;gap:7px;background:var(--sidebar-2);border:1px solid transparent;border-radius:8px;padding:6px 9px;transition:border-color .12s}
  .sb-search:focus-within{border-color:var(--gold)}
  .sb-search svg{width:14px;height:14px;flex-shrink:0;opacity:.55}
  .sb-search input{flex:1;min-width:0;background:none;border:0;outline:none;color:#E8E9EE;font-size:13px;font-family:inherit}
  .sb-search input::placeholder{color:#7A7C88}
  .sb-iconbtn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0;border-radius:7px;background:none;border:0;color:#8A8C97;cursor:pointer}
  .sb-iconbtn:hover{background:var(--sidebar-2);color:#fff}
  .sb-iconbtn svg{width:16px;height:16px}
  .board-glyph{width:16px;height:16px;flex-shrink:0;opacity:.9}
  .sb-empty{color:#7A7C88;font-size:12.5px;padding:10px 12px}
  .sidebar.rail{width:62px}
  .sidebar.rail .brand-name,.sidebar.rail .sb-search,.sidebar.rail .side-label,.sidebar.rail .ws-head,
  .sidebar.rail .board-row-wrap,.sidebar.rail .new-board-btn,.sidebar.rail .side-foot,.sidebar.rail .board-row span{display:none}
  .sidebar.rail .brand{padding:18px 0 16px;justify-content:center}
  .sidebar.rail .side-section{padding:6px 8px}
  .sidebar.rail .nav-item{justify-content:center;padding:9px 0;font-size:0;gap:0}
  .sidebar.rail .nav-item .tg-badge{display:none}
  .sidebar.rail .sb-hdr{padding:2px 0 8px;justify-content:center}`;
p = p.replace(aCss, css);

/* ---- 2. board glyph icons ---- */
const aIc = `/* ---------------- Icons (inline SVG, no emoji) ---------------- */
const Ic = {`;
must(p, aIc, 'icons-open');
const icons = `/* ---------------- Icons (inline SVG, no emoji) ---------------- */
const Ic = {
  boardGlyph: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8",
    strokeLinecap: "round", strokeLinejoin: "round", ...p
  }, /*#__PURE__*/React.createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
     /*#__PURE__*/React.createElement("path", { d: "M3 9.5h18" }),
     /*#__PURE__*/React.createElement("path", { d: "M9 9.5V20" })),
  boardLock: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8",
    strokeLinecap: "round", strokeLinejoin: "round", ...p
  }, /*#__PURE__*/React.createElement("path", { d: "M3 9.5h11" }),
     /*#__PURE__*/React.createElement("path", { d: "M9 9.5V20" }),
     /*#__PURE__*/React.createElement("path", { d: "M21 11V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" }),
     /*#__PURE__*/React.createElement("rect", { x: "16", y: "14", width: "7", height: "6", rx: "1.2" }),
     /*#__PURE__*/React.createElement("path", { d: "M17.8 14v-1.4a1.7 1.7 0 0 1 3.4 0V14" })),
  sbSearch: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2",
    strokeLinecap: "round", strokeLinejoin: "round", ...p
  }, /*#__PURE__*/React.createElement("circle", { cx: "11", cy: "11", r: "7" }),
     /*#__PURE__*/React.createElement("path", { d: "m20 20-3.6-3.6" })),
  chevrons: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2",
    strokeLinecap: "round", strokeLinejoin: "round", ...p
  }, /*#__PURE__*/React.createElement("path", { d: "m11 17-5-5 5-5" }),
     /*#__PURE__*/React.createElement("path", { d: "m18 17-5-5 5-5" })),`;
p = p.replace(aIc, icons);

/* ---- 3. glyph replaces the dot in board rows ---- */
const aDot = `  }, /*#__PURE__*/React.createElement("span", {
    className: "board-dot",
    style: {
      background: b.dot
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: 1
    }
  }, b.name), b.visibility === 'private' && /*#__PURE__*/React.createElement(Ic.lock, {
    style: {
      width: 12,
      height: 12,
      opacity: .6,
      flexShrink: 0
    }
  }),`;
must(p, aDot, 'row-dot');
const glyph = `  }, /*#__PURE__*/React.createElement(b.visibility === 'private' ? Ic.boardLock : Ic.boardGlyph, {
    className: "board-glyph",
    style: {
      color: b.dot || '#9AA0AC'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: 1
    }
  }, b.name),`;
p = p.replace(aDot, glyph);

/* favorites list uses its own inline dot */
const aFavDot = `  }, /*#__PURE__*/React.createElement("span", {
    className: "board-dot",
    style: {
      background: b.dot
    }
  }), b.name)))), /*#__PURE__*/React.createElement("div", {
    className: "side-label"
  }, "Workspaces"),`;
must(p, aFavDot, 'fav-dot');
p = p.replace(aFavDot, `  }, /*#__PURE__*/React.createElement(b.visibility === 'private' ? Ic.boardLock : Ic.boardGlyph, {
    className: "board-glyph",
    style: {
      color: b.dot || '#9AA0AC'
    }
  }), b.name)))), /*#__PURE__*/React.createElement("div", {
    className: "side-label"
  }, "Workspaces"),`);

/* ---- 4. WsGroups honours the search filter (force groups open) ---- */
const aWs = `  const col = wsColGet();
  const activeWs = activeBoard ? wsOf(activeBoard) : null;`;
must(p, aWs, 'wsgroups-col');
p = p.replace(aWs, `  const col = wsColGet();
  const activeWs = activeBoard ? wsOf(activeBoard) : null;
  const forceOpen = !!(typeof q === 'string' && q.trim());`);

const aWsOpen = `    const open = col[w] !== undefined ? !col[w] : (w === WS_DEFAULT || w === activeWs);`;
must(p, aWsOpen, 'wsgroups-open');
p = p.replace(aWsOpen, `    const open = forceOpen ? true : (col[w] !== undefined ? !col[w] : (w === WS_DEFAULT || w === activeWs));`);

const aWsSig = `function WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard, historyBoard }) {`;
must(p, aWsSig, 'wsgroups-sig');
p = p.replace(aWsSig, `function WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard, historyBoard, q }) {`);

/* ---- 5. sidebar state + header row ---- */
const aState = `  const [shareBoard, setShareBoard] = useState(null);
  const [historyBoard, setHistoryBoard] = useState(null);`;
must(p, aState, 'app-state');
p = p.replace(aState, `  const [shareBoard, setShareBoard] = useState(null);
  const [historyBoard, setHistoryBoard] = useState(null);
  const [sideQ, setSideQ] = useState('');
  const [rail, setRail] = useState(() => {
    try {
      return localStorage.spark_sb_rail === '1';
    } catch (e) {
      return false;
    }
  });
  const toggleRail = () => setRail(r => {
    try {
      localStorage.spark_sb_rail = r ? '0' : '1';
    } catch (e) {}
    return !r;
  });
  const sideMatch = b => {
    const s = sideQ.trim().toLowerCase();
    return !s || String(b.name || '').toLowerCase().indexOf(s) !== -1;
  };`);

const aAside = `  }, /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement(SparkMark, null), /*#__PURE__*/React.createElement("span", {
    className: "brand-name"
  }, "SPARK ", /*#__PURE__*/React.createElement("b", null, "BOARDS"))), /*#__PURE__*/React.createElement("div", {
    className: "side-section"
  },`;
must(p, aAside, 'aside-brand');
p = p.replace(aAside, `  }, /*#__PURE__*/React.createElement("aside", {
    className: "sidebar" + (rail ? ' rail' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement(SparkMark, null), /*#__PURE__*/React.createElement("span", {
    className: "brand-name"
  }, "SPARK ", /*#__PURE__*/React.createElement("b", null, "BOARDS"))), /*#__PURE__*/React.createElement("div", {
    className: "sb-hdr"
  }, !rail && /*#__PURE__*/React.createElement("div", {
    className: "sb-search"
  }, /*#__PURE__*/React.createElement(Ic.sbSearch, null), /*#__PURE__*/React.createElement("input", {
    value: sideQ,
    onChange: e => setSideQ(e.target.value),
    placeholder: "Search boards",
    spellCheck: false
  }), sideQ && /*#__PURE__*/React.createElement("button", {
    className: "sb-iconbtn",
    style: { width: 18, height: 18 },
    title: "Clear",
    onClick: () => setSideQ('')
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", { d: "M6 6l12 12M18 6L6 18" })))), /*#__PURE__*/React.createElement("button", {
    className: "sb-iconbtn",
    title: rail ? 'Expand sidebar' : 'Collapse sidebar',
    onClick: toggleRail
  }, /*#__PURE__*/React.createElement(Ic.chevrons, {
    style: { transform: rail ? 'rotate(180deg)' : 'none' }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "side-section"
  },`);

/* ---- 6. feed the filter into the lists ---- */
const aFavs = `  }, "Favorites"), /*#__PURE__*/React.createElement("div", {
    className: "side-section",
    style: {
      paddingTop: 0
    }
  }, favs.map(b =>`;
must(p, aFavs, 'favs-list');
p = p.replace(aFavs, `  }, "Favorites"), /*#__PURE__*/React.createElement("div", {
    className: "side-section",
    style: {
      paddingTop: 0
    }
  }, favs.filter(sideMatch).map(b =>`);

const aWsCall = `  }, /*#__PURE__*/React.createElement(WsGroups, { visible: visible, activeBoard: activeBoard, canEdit: canEdit,`;
must(p, aWsCall, 'wsgroups-call');
p = p.replace(aWsCall, `  }, sideQ.trim() && !visible.filter(sideMatch).length && /*#__PURE__*/React.createElement("div", {
    className: "sb-empty"
  }, 'No boards match "' + sideQ.trim() + '"'), /*#__PURE__*/React.createElement(WsGroups, { visible: visible.filter(sideMatch), q: sideQ, activeBoard: activeBoard, canEdit: canEdit,`);

fs.writeFileSync(PAGE + '.bak-sidebarA', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  search box + clear button');
console.log('OK  collapse-to-rail button (remembers your choice)');
console.log('OK  board-type glyphs, lock badge on private boards');
console.log('Backup: spark-boards.html.bak-sidebarA');
