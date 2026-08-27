// ============================================================================
// patch-history-ui.cjs - "Version history" in every board's kebab menu:
// see the last 10 snapshots (who saved over what, when) and restore any of
// them with one click. Requires patch-safety + the versions SQL already live.
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-history-ui.cjs
//   git add -A && git commit -m "Boards: version history viewer" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const FILE = "spark-boards.html";
let src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (src.includes("HistoryModal")) throw new Error(FILE + " already patched. Nothing written.");
if (!src.includes("baseRev")) throw new Error("patch-safety must run first. Nothing written.");

const EDITS = [
  ["function SidebarBoardRow({\n  b,\n  active,\n  canEdit,\n  onOpen,\n  onFav,\n  onDelete,\n  onShare\n}) {", "function SidebarBoardRow({\n  b,\n  active,\n  canEdit,\n  onOpen,\n  onFav,\n  onDelete,\n  onShare,\n  onHistory\n}) {", 1],
  ["  }), \"Sharing & privacy\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item danger\",", "  }), \"Sharing & privacy\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item\",\n    onClick: () => {\n      setMenu(false);\n      onHistory && onHistory();\n    }\n  }, /*#__PURE__*/React.createElement(\"svg\", {\n    viewBox: \"0 0 24 24\",\n    fill: \"none\",\n    stroke: \"currentColor\",\n    strokeWidth: \"1.9\",\n    strokeLinecap: \"round\",\n    strokeLinejoin: \"round\",\n    style: { width: 15, height: 15 }\n  }, /*#__PURE__*/React.createElement(\"path\", {\n    d: \"M3 12a9 9 0 1 0 3-6.7\"\n  }), /*#__PURE__*/React.createElement(\"path\", {\n    d: \"M3 4v5h5\"\n  }), /*#__PURE__*/React.createElement(\"path\", {\n    d: \"M12 7v5l3 3\"\n  })), \"Version history\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item danger\",", 1],
  ["function WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard }) {", "function WsGroups({ visible, activeBoard, canEdit, openBoard, toggleFav, deleteBoard, shareBoard, historyBoard }) {", 1],
  ["onDelete: () => deleteBoard(b.id), onShare: () => shareBoard(b)", "onDelete: () => deleteBoard(b.id), onShare: () => shareBoard(b), onHistory: () => historyBoard(b)", 2],
  ["function ShareModal({ board, me, onApply, onClose }) {", "function HistoryModal({ board, onClose }) {\n  const [list, setList] = useState(null);\n  const [busy, setBusy] = useState(false);\n  useEffect(() => {\n    let on = true;\n    API.call('/boards-versions?id=' + encodeURIComponent(board.id)).then(d => {\n      if (on) setList(d && d.versions || []);\n    }).catch(() => {\n      if (on) setList([]);\n    });\n    return () => {\n      on = false;\n    };\n  }, [board.id]);\n  const fmt = s => {\n    try {\n      const d = new Date(s);\n      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });\n    } catch (e) {\n      return s;\n    }\n  };\n  const restore = v => {\n    if (!confirm('Restore \"' + board.name + '\" to the version saved ' + fmt(v.saved_at) + '?\\n\\nThe current state is snapshotted first, so this is undoable.')) return;\n    setBusy(true);\n    API.call('/boards-restore', {\n      method: 'POST',\n      body: JSON.stringify({ board_id: board.id, version_id: v.id })\n    }).then(() => location.reload()).catch(e => {\n      setBusy(false);\n      alert('Restore failed: ' + (e && e.message || e));\n    });\n  };\n  return React.createElement('div', { className: 'overlay', onClick: onClose }, React.createElement('div', {\n    className: 'modal',\n    style: { maxWidth: 460 },\n    onClick: e => e.stopPropagation()\n  }, React.createElement('div', { className: 'modal-h' }, 'Version history \\u2014 ' + board.name), React.createElement('div', { className: 'modal-b' }, list === null ? React.createElement('div', {\n    style: { color: '#8A8A94', padding: '18px 4px' }\n  }, 'Loading\\u2026') : !list.length ? React.createElement('div', {\n    style: { color: '#8A8A94', padding: '18px 4px' }\n  }, 'No snapshots yet. A snapshot is kept automatically every time this board is saved from now on.') : list.map(v => React.createElement('div', {\n    key: v.id,\n    style: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: '1px solid #F0F0F3' }\n  }, React.createElement('div', { style: { flex: 1 } }, React.createElement('div', {\n    style: { fontWeight: 700, fontSize: 13.5 }\n  }, fmt(v.saved_at)), React.createElement('div', {\n    style: { fontSize: 12, color: '#8A8A94' }\n  }, 'saved over by ' + (v.saved_by || 'unknown'))), React.createElement('button', {\n    className: 'btn ghost',\n    disabled: busy,\n    onClick: () => restore(v)\n  }, 'Restore')))), React.createElement('div', { className: 'modal-f' }, React.createElement('button', {\n    className: 'btn ghost',\n    onClick: onClose\n  }, 'Close'))));\n}\nfunction ShareModal({ board, me, onApply, onClose }) {", 1],
  ["const [shareBoard, setShareBoard] = useState(null);", "const [shareBoard, setShareBoard] = useState(null);\n  const [historyBoard, setHistoryBoard] = useState(null);", 1],
  ["deleteBoard: deleteBoard, shareBoard: b => setShareBoard(b) })", "deleteBoard: deleteBoard, shareBoard: b => setShareBoard(b), historyBoard: b => setHistoryBoard(b) })", 1],
  ["setShareBoard(null); } }), ", "setShareBoard(null); } }), historyBoard && React.createElement(HistoryModal, { board: historyBoard, onClose: () => setHistoryBoard(null) }), ", 1]
];
for (const [i, [o, , exp]] of EDITS.entries()) {
  const n = src.split(o).length - 1;
  if (n !== exp) throw new Error("edit #" + (i + 1) + ": anchor found " + n + " times (need " + exp + "). NOTHING written.");
}
fs.writeFileSync(FILE + ".bak-history", fs.readFileSync(FILE));
for (const [o, nw] of EDITS) src = src.split(o).join(nw);
fs.writeFileSync(FILE, src);
console.log("PATCHED " + FILE + " (backup .bak-history)");
console.log('Next: git add -A && git commit -m "Boards: version history viewer" && git push');
