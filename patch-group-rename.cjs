// ============================================================================
// patch-group-rename.cjs - groups: double-click to rename (Enter saves, Esc
// cancels), Add group drops you straight into naming it, and new groups +
// renames actually persist (addGroup previously never saved).
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-group-rename.cjs
//   git add -A && git commit -m "Boards: group rename + persist fix" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const FILE = "spark-boards.html";
let src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (src.includes("const [renameG")) throw new Error(FILE + " already patched. Nothing written.");

const EDITS = [
  ["  const addGroup = () => update(b => {\n    const nb = structuredClone(b);\n    nb.groups.push({\n      id: 'g' + Date.now(),\n      title: 'New Group',\n      color: '#9AA0AC',\n      items: []\n    });\n    return nb;\n  });", "  const [renameG, setRenameG] = useState(null);\n  const [renameV, setRenameV] = useState('');\n  const commitRename = () => {\n    const gid = renameG;\n    const val = (renameV || '').trim();\n    setRenameG(null);\n    if (!gid || !val) return;\n    update(b => {\n      const nb = structuredClone(b);\n      const t = nb.groups.find(x => x.id === gid);\n      if (!t || t.title === val) return nb;\n      t.title = val;\n      Persist.board(nb);\n      return nb;\n    });\n  };\n  const addGroup = () => update(b => {\n    const nb = structuredClone(b);\n    nb.groups.push({\n      id: 'g' + Date.now(),\n      title: 'New Group',\n      color: '#9AA0AC',\n      items: []\n    });\n    Persist.board(nb);\n    setRenameG(nb.groups[nb.groups.length - 1].id);\n    setRenameV('New Group');\n    return nb;\n  });"],
  ["React.createElement(\"span\", {\n      className: \"group-title\",\n      style: {\n        color: g.color\n      }\n    }, g.title)", "renameG === g.id ? /*#__PURE__*/React.createElement(\"input\", {\n      className: \"group-title\",\n      autoFocus: true,\n      value: renameV,\n      onChange: e => setRenameV(e.target.value),\n      onBlur: commitRename,\n      onFocus: e => e.target.select(),\n      onKeyDown: e => {\n        if (e.key === 'Enter') commitRename();\n        if (e.key === 'Escape') setRenameG(null);\n      },\n      style: {\n        color: g.color,\n        background: 'transparent',\n        border: 'none',\n        borderBottom: '2px solid ' + g.color,\n        outline: 'none',\n        width: 200,\n        padding: 0\n      }\n    }) : React.createElement(\"span\", {\n      className: \"group-title\",\n      style: {\n        color: g.color,\n        cursor: canEdit ? 'text' : 'default'\n      },\n      title: canEdit ? 'Double-click to rename' : undefined,\n      onDoubleClick: () => {\n        if (!canEdit) return;\n        setRenameG(g.id);\n        setRenameV(g.title);\n      }\n    }, g.title)"]
];
for (const [i, [o]] of EDITS.entries()) {
  const n = src.split(o).length - 1;
  if (n !== 1) throw new Error("edit #" + (i + 1) + ": anchor found " + n + " times (need 1). NOTHING written.");
}
fs.writeFileSync(FILE + ".bak-grename", fs.readFileSync(FILE));
for (const [o, nw] of EDITS) src = src.replace(o, nw);
fs.writeFileSync(FILE, src);
console.log("PATCHED " + FILE + " (backup .bak-grename)");
console.log('Next: git add -A && git commit -m "Boards: group rename + persist fix" && git push');
