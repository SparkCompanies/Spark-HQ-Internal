// ============================================================================
// patch-mywork.cjs - replace the "My Work" placeholder with the real page:
// every item assigned to you across visible boards, grouped Overdue / Due
// today / In progress / Done, click-through to the board.
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-mywork.cjs
//   git add -A && git commit -m "Boards: real My Work page" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const FILE = "spark-boards.html";
let src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (src.includes("const MyWork = ")) throw new Error(FILE + " already patched. Nothing written.");

const A1 = "const COLUMN_TYPES = [{";
const A2 = "React.createElement(Scaffold, {\n    icon: Ic.work,\n    title: \"My Work\",\n    desc: \"Every item assigned to you across all boards, grouped into Overdue, Due Today, In Progress, and Done \u2014 the same aggregation the dashboard already computes, in a focused personal list.\",\n    bullet: \"Next iteration\"\n  })";
const NEW2 = "React.createElement(MyWork, {\n    boards: visible,\n    meId: me.id,\n    onOpen: id => setRoute({\n      page: 'board',\n      id\n    })\n  })";
const COMPONENT = "const MyWork = ({ boards, meId, onOpen }) => {\n  const iso = new Date().toISOString().slice(0, 10);\n  const rows = [];\n  (boards || []).forEach(b => {\n    const dcol = (b.columns || []).find(c => c.type === 'date');\n    const scol = (b.columns || []).find(c => c.key === b.primaryStatus && c.type === 'status') || (b.columns || []).find(c => c.type === 'status');\n    (b.groups || []).forEach(g => (g.items || []).forEach(it => {\n      if (it.owner !== meId) return;\n      const d = dcol ? it[dcol.key] || null : null;\n      const so = scol && it[scol.key] != null && scol.options ? scol.options[it[scol.key]] : null;\n      const done = !!(so && /done|complete|placed|hired|closed|paid|approved/i.test(so.label || ''));\n      const bucket = done ? 3 : !d ? 2 : d < iso ? 0 : d === iso ? 1 : 2;\n      rows.push({ b, g, it, d, so, bucket });\n    }));\n  });\n  rows.sort((a, b) => (a.d || '9999') < (b.d || '9999') ? -1 : 1);\n  const SECTIONS = [['Overdue', '#E2445C'], ['Due today', '#FFC800'], ['In progress', '#579BFC'], ['Done', '#00C875']];\n  if (!rows.length) return React.createElement(\"div\", { style: { textAlign: 'center', padding: '80px 20px', color: '#8A8A94' } },\n    React.createElement(\"div\", { style: { fontWeight: 700, fontSize: 17, color: '#1C1C22', marginBottom: 6 } }, \"Nothing assigned to you yet\"),\n    \"Items where you're set as the person show up here, grouped by due date.\");\n  return React.createElement(\"div\", { style: { maxWidth: 860, margin: '0 auto' } }, SECTIONS.map(([label, color], si) => {\n    const list = rows.filter(r => r.bucket === si);\n    if (!list.length) return null;\n    return React.createElement(\"div\", { key: label, style: { marginBottom: 26 } },\n      React.createElement(\"div\", { style: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px 2px' } },\n        React.createElement(\"span\", { style: { width: 9, height: 9, borderRadius: 3, background: color, display: 'inline-block' } }),\n        React.createElement(\"span\", { style: { fontWeight: 800, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#55555E' } }, label),\n        React.createElement(\"span\", { style: { fontSize: 12, color: '#9A9AA2', fontWeight: 700 } }, list.length)),\n      list.map((r, i) => React.createElement(\"div\", {\n        key: i, onClick: () => onOpen(r.b.id),\n        style: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #ECECF0', borderLeft: '3px solid ' + color, borderRadius: 10, padding: '11px 14px', marginBottom: 8, cursor: 'pointer' }\n      },\n        React.createElement(\"div\", { style: { flex: 1, minWidth: 0 } },\n          React.createElement(\"div\", { style: { fontWeight: 700, fontSize: 14, color: '#1C1C22', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, r.it.name),\n          React.createElement(\"div\", { style: { fontSize: 12, color: '#8A8A94', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 } },\n            React.createElement(\"span\", { style: { width: 7, height: 7, borderRadius: 2, background: r.b.dot || '#FFC800', display: 'inline-block' } }),\n            r.b.name, \" \\u00B7 \", r.g.title)),\n        r.d && React.createElement(\"span\", { style: { fontSize: 12.5, fontWeight: 600, color: si === 0 ? '#E2445C' : '#55555E', whiteSpace: 'nowrap' } }, r.d),\n        r.so && React.createElement(\"span\", { style: { fontSize: 12, fontWeight: 700, color: '#fff', background: r.so.color || '#C4C4C4', borderRadius: 6, padding: '3px 10px', whiteSpace: 'nowrap' } }, r.so.label))));\n  }));\n};\n";

for (const [name, a] of [["#1", A1], ["#2", A2]]) {
  const n = src.split(a).length - 1;
  if (n !== 1) throw new Error("edit " + name + ": anchor found " + n + " times (need 1). NOTHING written.");
}
fs.writeFileSync(FILE + ".bak-mywork", fs.readFileSync(FILE));
src = src.replace(A1, COMPONENT + "\nconst COLUMN_TYPES = [{");
src = src.replace(A2, NEW2);
fs.writeFileSync(FILE, src);
console.log("PATCHED " + FILE + " (backup .bak-mywork)");
console.log('Next: git add -A && git commit -m "Boards: real My Work page" && git push');
