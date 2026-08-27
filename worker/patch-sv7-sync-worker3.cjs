// Worker Patch — /sv7-sync returns full columns + weekly DH snapshot
// So the app can subtract DH dollars from contract buckets (DH is paid
// separately on funds-received + guarantee-cleared, never as contract %).
// Run from ~/Desktop/Spark-HQ-Internal/worker:  node patch-sv7-sync-worker3.cjs
const fs = require("fs");
const FILE = "cloudworker.js";
let src = fs.readFileSync(FILE, "utf8");
let n = 0;
const bak = FILE + ".sv7sync3-" + new Date().toISOString().replace(/[:.]/g, "-") + ".bak";
fs.writeFileSync(bak, src);
console.log("Backup: " + bak);

// 1. personWeeks: select * (reveals any DH columns in the weekly table)
const a1 = 'const personWeeks = await sbAll("charge_person_weeks?select=week_ending,person,sales,fd,rec,tt,raw&order=week_ending.asc");';
const a1new = 'const personWeeks = await sbAll("charge_person_weeks?select=*&order=week_ending.asc");';
if (src.indexOf(a1) !== -1) { src = src.replace(a1, a1new); n++; console.log("\u2705 1. personWeeks now returns all columns"); }
else console.log("\u274C 1. personWeeks anchor not found");

// 2. Include the weekly DH snapshot table (guarded: absent table won't break)
const a2 = 'const dh = await sbAll("charge_dh_schedule?select=*&order=created_at.desc");';
const a2new = 'const dh = await sbAll("charge_dh_schedule?select=*&order=created_at.desc");\n        let dhSnap = [];\n        try { dhSnap = await sbAll("charge_dh_snap?select=*"); } catch (eSnap) { dhSnap = []; }';
if (src.indexOf(a2) !== -1) { src = src.replace(a2, a2new); n++; console.log("\u2705 2. Weekly DH snapshot (charge_dh_snap) added"); }
else console.log("\u274C 2. dh schedule anchor not found");

// 3. Return dhSnap in the payload
const a3 = 'return json({ ok: true, syncedBy: em, at: new Date().toISOString(), personWeeks: personWeeks, people: people, dh: dh }, 200, origin);';
const a3new = 'return json({ ok: true, syncedBy: em, at: new Date().toISOString(), personWeeks: personWeeks, people: people, dh: dh, dhSnap: dhSnap }, 200, origin);';
if (src.indexOf(a3) !== -1) { src = src.replace(a3, a3new); n++; console.log("\u2705 3. dhSnap included in response"); }
else console.log("\u274C 3. response anchor not found");

if (n === 3) {
  fs.writeFileSync(FILE, src);
  console.log("\nDONE: 3/3 written (" + src.length + " chars)");
  console.log("Commit + push \u2014 the pipeline deploys it. NO manual wrangler.");
} else {
  console.log("\n\u26A0\uFE0F  NOT WRITTEN \u2014 " + n + "/3 matched. File untouched.");
}
