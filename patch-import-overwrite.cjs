// ============================================================================
// patch-import-overwrite.cjs
// Import JSON button: when selected files match boards that already exist,
// ask once - OK overwrites them with the fresh files, Cancel imports only new.
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-import-overwrite.cjs
//   git add -A && git commit -m "Boards: import overwrite option" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const FILE = "spark-boards.html";
let src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
const MARKER = "OVERWRITE them with these files";
if (src.includes(MARKER)) throw new Error(FILE + " already patched. Nothing written.");

const EDITS = [
  [
    'parsed.sort(function (a, b) { return rowsOf(a.data) - rowsOf(b.data); });',
    'parsed.sort(function (a, b) { return rowsOf(a.data) - rowsOf(b.data); });\n        var dupes = parsed.filter(function (p) { return existing[p.data.id]; }).length;\n        var overwrite = dupes > 0 && confirm(dupes + " of the selected boards already exist. OK = OVERWRITE them with these files. Cancel = import only new boards.");'
  ],
  [
    'if (existing[b.id]) { report.push("SKIP " + b.id + " (already exists)"); return; }',
    'if (existing[b.id] && !overwrite) { report.push("SKIP " + b.id + " (already exists)"); return; }'
  ]
];
for (const [i, [o]] of EDITS.entries()) {
  const n = src.split(o).length - 1;
  if (n !== 1) throw new Error("edit #" + (i + 1) + ": anchor found " + n + " times (need 1). NOTHING written.");
}
fs.writeFileSync(FILE + ".bak-ovr", fs.readFileSync(FILE));
for (const [o, nw] of EDITS) src = src.replace(o, nw);
fs.writeFileSync(FILE, src);
console.log("PATCHED " + FILE + " (backup .bak-ovr)");
console.log('Next: git add -A && git commit -m "Boards: import overwrite option" && git push');
