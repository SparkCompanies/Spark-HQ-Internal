/* ============================================================================
 * patch-tk-links-navset.cjs
 * The HQ sidebar renders from saved role nav sets, not raw HTML. Every nav
 * item ever added (salesforce, boards, terrmap, match, finance) required a
 * forcing block. This adds the same block for 'tklinks', inserted right
 * after the vTerrMap forcing line, and follows the v51 Finance precedent:
 * members do not get it.
 *
 * USAGE (Git Bash):
 *   cd ~/Desktop/Spark-HQ-Internal
 *   node patch-tk-links-navset.cjs
 *   git add index.html && git commit -m "HQ: force tklinks into saved nav sets" && git push
 * ==========================================================================*/

const fs = require("fs");
const path = require("path");

const TARGET = path.resolve(process.cwd(), "index.html");
const MARKER = "vTkLinks";
const ANCHOR = "ni.splice(bi + 1, 0, 'terrmap'); else ni.splice(1, 0, 'terrmap');";

if (!fs.existsSync(TARGET)) {
  throw new Error("index.html not found. Run from ~/Desktop/Spark-HQ-Internal");
}

const original = fs.readFileSync(TARGET, "utf8");

if (original.indexOf(MARKER) !== -1) {
  throw new Error("ABORT: " + MARKER + " already present. Nothing written.");
}

const first = original.indexOf(ANCHOR);
if (first === -1) {
  throw new Error(
    "ABORT: vTerrMap anchor not found. Nothing written.\n" +
    'Run: grep -n "terrmap" index.html | head -5  and send me the output.'
  );
}
if (first !== original.lastIndexOf(ANCHOR)) {
  throw new Error("ABORT: anchor not unique. Nothing written.");
}

/* end of the vTerrMap one-liner's line */
let lineEnd = original.indexOf("\n", first);
if (lineEnd === -1) lineEnd = original.length;

const BLOCK =
  "\n        // vTkLinks \u2014 ensure TimeKeep Links nav exists in saved sets (admins/managers, not members)\n" +
  "        Object.keys(merged).forEach(function(k){\n" +
  "          if (k === 'member') return;\n" +
  "          var ni = merged[k].navItems;\n" +
  "          if (Array.isArray(ni) && ni.indexOf('tklinks') === -1) {\n" +
  "            var ti = ni.indexOf('terrmap');\n" +
  "            if (ti !== -1) ni.splice(ti + 1, 0, 'tklinks'); else ni.splice(1, 0, 'tklinks');\n" +
  "          }\n" +
  "        });";

const patched = original.slice(0, lineEnd) + BLOCK + original.slice(lineEnd);

if (patched.length <= original.length || patched.indexOf(MARKER) === -1) {
  throw new Error("ABORT: patch verification failed. Nothing written.");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = TARGET + "." + stamp + ".bak";
fs.writeFileSync(backup, original, "utf8");
fs.writeFileSync(TARGET, patched, "utf8");

console.log("");
console.log("  anchor : vTerrMap forcing line");
console.log("  backup : " + path.basename(backup));
console.log("  added  : vTkLinks forcing block (member role excluded)");
console.log("");
console.log("  Next:");
console.log("    git add index.html");
console.log('    git commit -m "HQ: force tklinks into saved nav sets"');
console.log("    git push");
console.log("");
console.log("  After the Azure deploy finishes, hard-refresh HQ (Ctrl+Shift+R).");
console.log("  TimeKeep Links should appear under Territory Map.");
console.log("");
console.log("  Rollback: cp " + path.basename(backup) + " index.html");
console.log("");
