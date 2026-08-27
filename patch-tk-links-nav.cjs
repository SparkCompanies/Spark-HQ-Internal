/* ============================================================================
 * patch-tk-links-nav.cjs
 * Adds a "TimeKeep Links" item to the Spark HQ sidebar, directly below
 * Territory Map. Follows the exact pattern of the Territory Map button.
 *
 * USAGE (Git Bash):
 *   cd ~/Desktop/Spark-HQ-Internal
 *   node patch-tk-links-nav.cjs
 * ==========================================================================*/

const fs = require("fs");
const path = require("path");

const TARGET = path.resolve(process.cwd(), "index.html");
const MARKER = 'data-tab="tklinks"';
const ANCHOR = 'data-tab="terrmap"';

const URL = "https://red-dune-014d74810.7.azurestaticapps.net/tk-links.html";

/* ---- preconditions ------------------------------------------------------ */

if (!fs.existsSync(TARGET)) {
  throw new Error(
    "index.html not found at " + TARGET +
    "\nRun this from ~/Desktop/Spark-HQ-Internal"
  );
}

const original = fs.readFileSync(TARGET, "utf8");

if (original.indexOf(MARKER) !== -1) {
  throw new Error(
    "ABORT: index.html already contains " + MARKER +
    "\nPatch already applied. Nothing written."
  );
}

const first = original.indexOf(ANCHOR);
if (first === -1) {
  throw new Error(
    "ABORT: anchor not found (" + ANCHOR + "). Nothing written.\n" +
    'Run: grep -n "Territory Map" index.html'
  );
}
if (original.indexOf(ANCHOR) !== original.lastIndexOf(ANCHOR)) {
  throw new Error(
    "ABORT: anchor " + ANCHOR + " appears more than once. Nothing written.\n" +
    "Send me the grep output and I will pick a unique one."
  );
}

/* Find the end of the whole anchor line, insert a sibling button after it. */
const lineStart = original.lastIndexOf("\n", first) + 1;
let lineEnd = original.indexOf("\n", first);
if (lineEnd === -1) lineEnd = original.length;

const indent = (original.slice(lineStart, first).match(/^[ \t]*/) || [""])[0] || "      ";

/* ---- the nav item ------------------------------------------------------- */

const ICON =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px">' +
  '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
  '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
  '</svg>';

const BUTTON =
  indent + '<button class="nav-item" data-tab="tklinks" ' +
  "onclick=\"window.open('" + URL + "','_blank','noopener'); return false;\">" +
  '<span class="ico">' + ICON + "</span>TimeKeep Links</button>";

/* ---- write -------------------------------------------------------------- */

const patched =
  original.slice(0, lineEnd) + "\n" + BUTTON + original.slice(lineEnd);

if (patched.length <= original.length) {
  throw new Error("ABORT: output not larger than input. Nothing written.");
}
if (patched.indexOf(MARKER) === -1) {
  throw new Error("ABORT: marker missing from output. Nothing written.");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = TARGET + "." + stamp + ".bak";
fs.writeFileSync(backup, original, "utf8");
fs.writeFileSync(TARGET, patched, "utf8");

console.log("");
console.log("  anchor : " + ANCHOR);
console.log("  backup : " + path.basename(backup));
console.log("  added  : TimeKeep Links nav item, below Territory Map");
console.log("");
console.log("  Next:");
console.log("    git add index.html");
console.log('    git commit -m "HQ: TimeKeep Links nav item"');
console.log("    git push");
console.log("");
console.log("  The nav item opens:");
console.log("    " + URL);
console.log("  That URL only works after tk-links.html is pushed and deployed.");
console.log("");
console.log("  Rollback:");
console.log("    cp " + path.basename(backup) + " index.html");
console.log("");
