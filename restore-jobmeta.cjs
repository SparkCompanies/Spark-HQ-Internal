#!/usr/bin/env node
/* restore-jobmeta.cjs
 * Restores the /sandbox-jobmeta route into worker/cloudworker.js by
 * extracting it byte-for-byte from a known-good git commit (7cf1b96)
 * and inserting it immediately before the /sandbox-result route.
 *
 * Safety: anchor guards, brace-balance checks, throw-before-write,
 * timestamped backup. Touches nothing else in the file.
 *
 * Run from anywhere inside the repo:  node restore-jobmeta.cjs
 */
"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const GOOD_COMMIT = process.env.JOBMETA_COMMIT || "7cf1b96";
const ROUTE_SIG = '"/sandbox-jobmeta"';
const ANCHOR_SIG = '"/sandbox-result"';

function die(msg) { console.error("\nFAILED: " + msg + "\nNo files were modified."); process.exit(1); }

/* ---------- locate repo + file ---------- */
let repoRoot;
try {
  repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
} catch (e) { die("Not inside a git repo. cd into Spark-HQ-Internal first."); }
const workerPath = path.join(repoRoot, "worker", "cloudworker.js");
if (!fs.existsSync(workerPath)) die("worker/cloudworker.js not found at " + workerPath);

/* ---------- read current file ---------- */
const current = fs.readFileSync(workerPath, "utf8");
if (current.includes(ROUTE_SIG)) die("Current file already contains /sandbox-jobmeta. Nothing to restore.");
const anchorCount = current.split(ANCHOR_SIG).length - 1;
if (anchorCount !== 1) die("Expected exactly 1 occurrence of /sandbox-result in current file, found " + anchorCount);

/* ---------- read known-good file from git ---------- */
let good;
try {
  good = execSync("git show " + GOOD_COMMIT + ":worker/cloudworker.js",
    { encoding: "utf8", cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
} catch (e) { die("git show " + GOOD_COMMIT + " failed: " + e.message); }
if (!good.includes(ROUTE_SIG)) die("Commit " + GOOD_COMMIT + " does not contain /sandbox-jobmeta.");

/* ---------- extract the route block via brace counting ---------- */
const sigIdx = good.indexOf(ROUTE_SIG);
const lineStart = good.lastIndexOf("\n", sigIdx) + 1;
const openBrace = good.indexOf("{", sigIdx);
if (openBrace === -1) die("Could not find opening brace of jobmeta route in good commit.");
// sanity: the line must be a top-level route if
const headLine = good.slice(lineStart, good.indexOf("\n", sigIdx));
if (!/if\s*\(url\.pathname\s*===\s*"\/sandbox-jobmeta"\)/.test(headLine))
  die("Route line in good commit has unexpected shape: " + headLine.slice(0, 120));

let depth = 0, i = openBrace, inStr = null, inLineComment = false, inBlockComment = false, prev = "";
let end = -1;
for (; i < good.length; i++) {
  const c = good[i];
  if (inLineComment) { if (c === "\n") inLineComment = false; prev = c; continue; }
  if (inBlockComment) { if (prev === "*" && c === "/") inBlockComment = false; prev = c; continue; }
  if (inStr) {
    if (c === "\\" && prev !== "\\") { prev = "\\x"; continue; } // skip escaped char
    if (c === inStr && prev !== "\\") inStr = null;
    prev = c; continue;
  }
  if (c === "/" && good[i + 1] === "/") { inLineComment = true; prev = c; continue; }
  if (c === "/" && good[i + 1] === "*") { inBlockComment = true; prev = c; continue; }
  if (c === '"' || c === "'" || c === "`") { inStr = c; prev = c; continue; }
  if (c === "{") depth++;
  else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  prev = c;
}
if (end === -1) die("Brace walk never closed. Good commit block is malformed.");
let block = good.slice(lineStart, end + 1);

/* verify block balance with a plain count as a second opinion */
const bal = (s) => (s.match(/{/g) || []).length - (s.match(/}/g) || []).length;
// plain count can differ due to braces in strings/comments; rely on the walker, but require walker end sane:
if (block.length < 500) die("Extracted block suspiciously small (" + block.length + " chars).");
if (!block.includes("SBX_OBJECTS")) die("Extracted block missing SBX_OBJECTS (not the v2 route?).");
console.log("Extracted jobmeta v2 block: " + block.length + " chars, " + block.split("\n").length + " lines.");

/* ---------- build new file ---------- */
const anchorIdx = current.indexOf(ANCHOR_SIG);
const anchorLineStart = current.lastIndexOf("\n", anchorIdx) + 1;
const before = current.slice(0, anchorLineStart);
const after = current.slice(anchorLineStart);
const insert = block + "\n";
const updated = before + insert + after;

/* ---------- post-build verification, all before any write ---------- */
if (updated.length !== current.length + insert.length) die("Length check failed.");
if ((updated.split(ROUTE_SIG).length - 1) !== 1) die("Route occurrence count wrong after insert.");
if ((updated.split(ANCHOR_SIG).length - 1) !== 1) die("Anchor damaged by insert.");
if (bal(updated) !== bal(current) + bal(block)) die("Whole-file brace tally shifted unexpectedly.");
if (!updated.includes("sv7-sync") && current.includes("sv7-sync")) die("sv7-sync route lost. Aborting.");

/* ---------- backup then write ---------- */
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const bak = workerPath + ".pre-jobmeta-restore-" + ts + ".bak";
fs.copyFileSync(workerPath, bak);
fs.writeFileSync(workerPath, updated, "utf8");

/* ---------- re-read and confirm ---------- */
const onDisk = fs.readFileSync(workerPath, "utf8");
if ((onDisk.split(ROUTE_SIG).length - 1) !== 1) { fs.copyFileSync(bak, workerPath); die("Post-write verify failed. Backup restored."); }

console.log("OK: /sandbox-jobmeta restored into worker/cloudworker.js");
console.log("Backup: " + path.basename(bak));
console.log("Next: npx wrangler versions upload");
