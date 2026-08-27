// ============================================================================
// patch-export-json.cjs - "Export JSON (backup)" in every board's kebab menu.
// Downloads that board exactly as stored, so it can be re-imported, handed off,
// or kept as an offline backup. Requires patch-history-ui.
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-export-json.cjs
//   git add -A && git commit -m "Boards: export board JSON" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const FILE = "spark-boards.html";
let src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (src.includes("Export JSON (backup)")) throw new Error(FILE + " already patched. Nothing written.");
if (!src.includes("HistoryModal")) throw new Error("patch-history-ui must run first. Nothing written.");

const EDITS = [
  ["  }), \"Sharing & privacy\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item\",\n    onClick: () => {\n      setMenu(false);\n      onHistory && onHistory();\n    }", "  }), \"Sharing & privacy\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item\",\n    onClick: () => {\n      setMenu(false);\n      try {\n        const clean = JSON.parse(JSON.stringify(b));\n        delete clean.__rev;\n        const url = URL.createObjectURL(new Blob([JSON.stringify(clean, null, 1)], { type: 'application/json' }));\n        const a2 = document.createElement('a');\n        a2.href = url;\n        a2.download = 'sparkboard-' + b.id + '.json';\n        document.body.appendChild(a2);\n        a2.click();\n        document.body.removeChild(a2);\n        setTimeout(() => URL.revokeObjectURL(url), 3000);\n      } catch (e) {\n        alert('Export failed: ' + (e && e.message || e));\n      }\n    }\n  }, /*#__PURE__*/React.createElement(\"svg\", {\n    viewBox: \"0 0 24 24\",\n    fill: \"none\",\n    stroke: \"currentColor\",\n    strokeWidth: \"1.9\",\n    strokeLinecap: \"round\",\n    strokeLinejoin: \"round\",\n    style: { width: 15, height: 15 }\n  }, /*#__PURE__*/React.createElement(\"path\", {\n    d: \"M12 3v12\"\n  }), /*#__PURE__*/React.createElement(\"path\", {\n    d: \"M7 11l5 5 5-5\"\n  }), /*#__PURE__*/React.createElement(\"path\", {\n    d: \"M4 20h16\"\n  })), \"Export JSON (backup)\"), /*#__PURE__*/React.createElement(\"button\", {\n    className: \"menu-item\",\n    onClick: () => {\n      setMenu(false);\n      onHistory && onHistory();\n    }", 1]
];
for (const [i, [o, , exp]] of EDITS.entries()) {
  const n = src.split(o).length - 1;
  if (n !== exp) throw new Error("edit #" + (i + 1) + ": anchor found " + n + " times (need " + exp + "). NOTHING written.");
}
fs.writeFileSync(FILE + ".bak-export", fs.readFileSync(FILE));
for (const [o, nw] of EDITS) src = src.split(o).join(nw);
fs.writeFileSync(FILE, src);
console.log("PATCHED " + FILE + " (backup .bak-export)");
console.log('Next: git add -A && git commit -m "Boards: export board JSON" && git push');
