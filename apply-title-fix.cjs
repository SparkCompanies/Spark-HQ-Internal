// HQ_TITLE_v1 — browser tab reads "Spark HQ" instead of "Spark HQ — Option B".
// Run from the repo root, then commit + push.
const fs = require("fs");
const F = "index.html";
const raw = fs.readFileSync(F, "utf8");
const OLD = "<title>Spark HQ \u2014 Option B</title>";
if (!raw.includes(OLD)) { console.log(raw.includes("<title>Spark HQ</title>") ? "Already applied." : "ABORT \u2014 title anchor not found"); process.exit(raw.includes("<title>Spark HQ</title>")?0:1); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n").split(OLD).join("<title>Spark HQ</title>");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.html.title-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED HQ_TITLE_v1 \u2014 tab now reads: Spark HQ");
