// patch80-house-match.cjs
// ROOT CAUSE (WE 2026-08-23, Scott Tanghe): matchMember's fuzzy branch is a character-bag
// similarity. "House Account" scores 0.83+ against "Scott Tanghe", so the ENGINE_MERGE
// step summed House Account's buckets into Scott's row before the /house/ exclusion ran.
// "Executive Totals" would do the same to Alec Czartoryski.
// Three edits:
//   1) filter house/executive-totals persons out of personWeeks BEFORE the merge
//   2) matchMember fuzzy branch requires a shared whole-name token (>=3 letters)
//   3) DH snapshot: /^house$/ -> /house/ so "House Account" is stripped there too
// Idempotent: re-running after success prints 3/3 and writes nothing.
const fs = require("fs");
const path = require("path");

const FILE = path.resolve("src/App.jsx");
let src = fs.readFileSync(FILE, "utf8");

const edits = [
  {
    name: "sync: exclude house/executive totals from personWeeks before merge",
    old: 'var pw=d.personWeeks||[];',
    new: 'var pw=(d.personWeeks||[]).filter(function(p){return !/house|executive totals/i.test(String((p&&p.person)||""));});'
  },
  {
    name: "matchMember: fuzzy branch requires a shared name token",
    old: 'var matchMember=function(csvName,members){var n=normName(csvName);var exact=members.find(function(m){return normName(m.name)===n;});if(exact)return exact;var best=null,bestScore=0;members.forEach(function(m){var mn=normName(m.name);var parts=n.split("").filter(function(c){return mn.indexOf(c)>=0;}).length;var score=parts/Math.max(n.length,mn.length);if(score>bestScore&&score>0.7){bestScore=score;best=m;}});return best;};',
    new: 'var matchMember=function(csvName,members){var n=normName(csvName);var exact=members.find(function(m){return normName(m.name)===n;});if(exact)return exact;var _tk=function(s){return String(s||"").toLowerCase().split(/[^a-z]+/).filter(function(t){return t.length>=3;});};var _in=_tk(csvName);var best=null,bestScore=0;members.forEach(function(m){var mt=_tk(m.name);if(!_in.some(function(t){return mt.indexOf(t)>=0;}))return;var mn=normName(m.name);var parts=n.split("").filter(function(c){return mn.indexOf(c)>=0;}).length;var score=parts/Math.max(n.length,mn.length);if(score>bestScore&&score>0.7){bestScore=score;best=m;}});return best;};'
  },
  {
    name: "DH snapshot: strip any house-type sales_rep/recruiter",
    old: 'if(/^house$/i.test(sr))sr="";if(/^house$/i.test(rcC))rcC="";',
    new: 'if(/house/i.test(sr))sr="";if(/house/i.test(rcC))rcC="";'
  }
];

function count(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

let ok = 0, changed = false;
const problems = [];
for (const e of edits) {
  if (src.includes(e.new)) { ok++; console.log("✅ already applied: " + e.name); continue; }
  const n = count(src, e.old);
  if (n === 1) { src = src.replace(e.old, e.new); ok++; changed = true; console.log("✅ applied: " + e.name); }
  else { problems.push(e.name); console.log("❌ skipped: " + e.name + " — anchor found " + n + " times, expected 1"); }
}

if (problems.length) {
  console.log(ok + "/" + edits.length + " ❌ Nothing written. Send me: grep -n 'var pw=d.personWeeks\\|var matchMember=\\|house\\$' src/App.jsx");
  process.exit(1);
}
if (changed) fs.writeFileSync(FILE, src, "utf8");
console.log(ok + "/" + edits.length + " ✅" + (changed ? " src/App.jsx written" : " no changes needed"));
