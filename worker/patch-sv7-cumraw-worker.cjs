// Worker Patch — /sv7-sync returns cumulative/monthly/quarterly raw per person
// SparkV7 uses cum_raw as YTD Raw (the Rankings "Cumulative Raw" figure).
// Run from ~/Desktop/Spark-HQ-Internal/worker:  node patch-sv7-cumraw-worker.cjs
const fs = require("fs");
const FILE = "cloudworker.js";
let src = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".cumraw-" + new Date().toISOString().replace(/[:.]/g,"-") + ".bak";
fs.writeFileSync(bak, src);
console.log("Backup: " + bak);

const oldS = 'const people = await sbAll("charge_people?select=person,role,entity,bu,active");';
const newS = 'const people = await sbAll("charge_people?select=person,role,entity,bu,active,cum_raw,monthly_raw,quarterly_raw,rec_ath,sales_ath,fd_ath,tt_ath");';

if (src.indexOf(oldS) !== -1) {
  src = src.replace(oldS, newS);
  fs.writeFileSync(FILE, src);
  console.log("\u2705 people select now includes cum_raw / monthly_raw / quarterly_raw");
  console.log("\nDONE (" + src.length + " chars). Commit + push \u2014 pipeline deploys.");
} else {
  console.log("\u274C anchor not found \u2014 file untouched");
}
