// ============================================================================
// patch-import-button.cjs
// Adds an "Import JSON" button to Spark Boards (bottom-right, admin tool).
// The button opens a file picker (multi-select), imports sparkboard-*.json
// files using the page's own login - no tokens, no console, no clipboard.
//
// Run from the repo root:
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-import-button.cjs          (apply)
//   node patch-import-button.cjs --remove (take the button back out later)
//
// Then: git add -A && git commit -m "Boards: import tool" && git push
// Wait ~2 min for Azure, hard-refresh Boards (Ctrl+F5), button appears.
// ============================================================================

const fs = require("fs");
const path = require("path");

const MARKER = "sb-import-tool";

// ---- locate repo + file (throw before any write) ----
if (!fs.existsSync(".git")) throw new Error("Run this from the repo root: cd ~/Desktop/Spark-HQ-Internal");

function findAll(dir, name, hits) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findAll(p, name, hits);
    else if (e.name === name) hits.push(p);
  }
  return hits;
}
const hits = findAll(".", "spark-boards.html", []);
if (hits.length !== 1) throw new Error("Expected exactly one spark-boards.html, found " + hits.length + ": " + hits.join(", "));
const FILE = hits[0];
let html = fs.readFileSync(FILE, "utf8");

// ---- remove mode ----
if (process.argv.includes("--remove")) {
  const re = new RegExp('\\n?<script id="' + MARKER + '">[\\s\\S]*?</' + 'script>', "m");
  if (!re.test(html)) throw new Error("No import tool found in " + FILE + " - nothing to remove.");
  fs.writeFileSync(FILE + ".bak-import", html);
  fs.writeFileSync(FILE, html.replace(re, ""));
  console.log("REMOVED import tool from " + FILE + " (backup: .bak-import). Commit and push.");
  process.exit(0);
}

// ---- guards ----
if (html.includes('id="' + MARKER + '"')) throw new Error(FILE + " already has the import tool. To update: node patch-import-button.cjs --remove, then re-run.");
const bodyCount = (html.match(/<\/body>/g) || []).length;
if (bodyCount !== 1) throw new Error("Expected exactly one </body> in " + FILE + ", found " + bodyCount + ". Nothing written.");

// ---- the injected tool (self-contained IIFE, page-auth, multi-file) ----
const TOOL = `
<script id="${MARKER}">
(function () {
  var W = "https://spark-hq-worker.sparkcompanies.workers.dev";
  function rowsOf(b){var n=0;(b.groups||[]).forEach(function(g){n+=(g.items||[]).length});return n;}
  function token(){
    try { var raw = JSON.parse(localStorage.spark_hq_sb_auth); return (raw.currentSession||raw).access_token; }
    catch(e){ return null; }
  }
  var btn = document.createElement("button");
  btn.id = "sbImportBtn";
  btn.textContent = "Import JSON";
  btn.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:99999;background:#111;color:#FFC800;border:1px solid #FFC800;border-radius:8px;padding:10px 16px;font:600 13px/1 'Century Gothic',Jost,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)";
  document.body.appendChild(btn);

  btn.onclick = function () {
    var tok = token();
    if (!tok) { alert("No login token found. Open/refresh the Spark HQ tab, then hard-refresh this page."); return; }
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json"; inp.multiple = true;
    inp.onchange = function () { run(Array.prototype.slice.call(inp.files), tok); };
    inp.click();
  };

  function run(files, tok) {
    var H = { "Content-Type": "application/json", Authorization: "Bearer " + tok };
    var report = [];
    btn.disabled = true;

    fetch(W + "/boards-load", { headers: H }).then(function (r) {
      if (r.status !== 200) throw new Error("boards-load returned " + r.status + " - refresh the Spark HQ tab and try again.");
      return r.json();
    }).then(function (j) {
      var existing = {};
      (j.boards || []).forEach(function (b) { existing[b.id] = true; });

      return Promise.all(files.map(function (f) {
        return f.text().then(function (t) { return { name: f.name, data: JSON.parse(t) }; });
      })).then(function (parsed) {
        // validate shapes up front, none written until all named files look right
        parsed.forEach(function (p) {
          var b = p.data;
          if (b && b.items && b.board && !b.columns) throw new Error(p.name + " is the monday ARCHIVE file - pick sparkboard-*.json files instead. Nothing imported.");
          if (!b || !b.id || !b.name || !Array.isArray(b.columns) || !Array.isArray(b.groups)) throw new Error(p.name + " is not a Spark Boards file. Nothing imported.");
        });
        parsed.sort(function (a, b) { return rowsOf(a.data) - rowsOf(b.data); });

        var chain = Promise.resolve();
        parsed.forEach(function (p, i) {
          chain = chain.then(function () {
            var b = p.data, want = rowsOf(b);
            if (existing[b.id]) { report.push("SKIP " + b.id + " (already exists)"); return; }
            btn.textContent = "Importing " + (i + 1) + "/" + parsed.length + "...";
            return fetch(W + "/boards-save", { method: "POST", headers: H, body: JSON.stringify({ board: b }) })
              .then(function (r) {
                if (r.status !== 200) throw new Error(b.id + ": save returned " + r.status);
                return fetch(W + "/boards-load", { headers: H });
              })
              .then(function (r) { return r.json(); })
              .then(function (j2) {
                var got = (j2.boards || []).filter(function (x) { return x.id === b.id; })[0];
                if (!got) throw new Error(b.id + ": not present after save - boards-save may not create new boards. Tell Claude.");
                var gotRows = rowsOf(got);
                if (gotRows !== want) throw new Error(b.id + ": row mismatch " + gotRows + "/" + want + " - do not edit it. Tell Claude.");
                existing[b.id] = true;
                report.push("OK   " + b.id + "  " + gotRows + "/" + want + " rows");
              });
          });
        });
        return chain;
      });
    }).then(function () {
      btn.textContent = "Import JSON";
      btn.disabled = false;
      alert("Import finished:\\n\\n" + report.join("\\n") + "\\n\\nRefresh the page to see the boards.");
    }).catch(function (e) {
      btn.textContent = "Import JSON";
      btn.disabled = false;
      alert("IMPORT STOPPED:\\n\\n" + (report.length ? report.join("\\n") + "\\n\\n" : "") + e.message);
    });
  }
})();
</` + `script>
`;

fs.writeFileSync(FILE + ".bak-import", html);
fs.writeFileSync(FILE, html.replace("</body>", TOOL + "</body>"));
console.log("PATCHED " + FILE + " (backup: " + FILE + ".bak-import)");
console.log("Next: git add -A && git commit -m \"Boards: import tool\" && git push");
console.log("Wait ~2 min for Azure, then Ctrl+F5 on Spark Boards. Button appears bottom-right.");
console.log("After migration, remove it with: node patch-import-button.cjs --remove");
