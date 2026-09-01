// Worker Patch — /sv7-dh-tracker: find the header row robustly
// The Direct Hire Tracker sheet has preamble/legend rows above the headers, so
// scanning only the first 8 rows for "Client" failed. Scan the first 25 rows and
// require BOTH "Client" and "Candidate Name" so a legend row can't false-match.
// Also returns a debug preview when the header still isn't found.
// Run from ~/Desktop/Spark-HQ-Internal/worker: node patch-dh-tracker-hdr.cjs
const fs = require("fs");
const FILE = "cloudworker.js";
let src = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".dhhdr-" + new Date().toISOString().replace(/[:.]/g,"-") + ".bak";
fs.writeFileSync(bak, src);
console.log("Backup: " + bak);

const oldS = `        let hr0 = -1;
        for (let i = 0; i < Math.min(8, grid0.length); i++) { if ((grid0[i] || []).some((c) => String(c).trim() === "Client")) { hr0 = i; break; } }
        if (hr0 < 0) return json({ error: "header row not found" }, 502, origin);`;
const newS = `        let hr0 = -1;
        for (let i = 0; i < Math.min(25, grid0.length); i++) {
          const cells = (grid0[i] || []).map((c) => String(c || "").trim());
          const hasClient = cells.some((c) => /^client$/i.test(c));
          const hasCand = cells.some((c) => /^candidate name$/i.test(c));
          if (hasClient && hasCand) { hr0 = i; break; }
        }
        if (hr0 < 0) {
          for (let i = 0; i < Math.min(25, grid0.length); i++) {
            const cells = (grid0[i] || []).map((c) => String(c || "").trim());
            if (cells.some((c) => /^client$/i.test(c))) { hr0 = i; break; }
          }
        }
        if (hr0 < 0) return json({ error: "header row not found", debug: (grid0.slice(0, 12) || []).map((r) => (r || []).slice(0, 12)) }, 502, origin);`;

if (src.indexOf(oldS) !== -1) {
  src = src.replace(oldS, newS);
  fs.writeFileSync(FILE, src);
  console.log("\u2705 header-row detection widened (25 rows, Client + Candidate Name)");
  console.log("\nDONE (" + src.length + " chars). Commit + push \u2014 pipeline deploys.");
} else {
  console.log("\u274C anchor not found \u2014 file untouched");
}
