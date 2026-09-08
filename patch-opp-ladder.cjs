// patch-opp-ladder.cjs
// Opportunity Plan Builder: ladder collapses from three stages to two.
//   before: Coaching Conversation / Verbal Warning (2nd Conversation) / Opportunity Letter (Final Discussion)
//   after:  Serious Conversation / Opportunity Plan
//
// Run from ~/Desktop/Spark-HQ-Internal:
//   node patch-opp-ladder.cjs
//
// Only touches the root spark-academy.html. The site/ copy is build output and
// gets regenerated on deploy; do not patch it by hand.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'spark-academy.html');
const BACKUP = FILE + '.bak-oppladder';

let src = fs.readFileSync(FILE, 'utf8');
const original = src;

function replaceOnce(label, from, to) {
  const count = src.split(from).length - 1;
  if (count !== 1) {
    console.error(`FAIL ${label}`);
    console.error(`     expected exactly 1 match, found ${count}`);
    console.error(`     looking for: ${from}`);
    process.exit(1);
  }
  src = src.replace(from, to);
  console.log(`OK  ${label}`);
}

// 1. The option list the pill selector renders.
replaceOnce(
  'ladder options: three stages -> Serious Conversation, Opportunity Plan',
  'bc=["Coaching Conversation","Verbal Warning (2nd Conversation)","Opportunity Letter (Final Discussion)"]',
  'bc=["Serious Conversation","Opportunity Plan"]'
);

// 2. Default selection. Was bc[2] (the final stage). With two entries bc[2] is
//    undefined, which leaves no pill selected and prints a blank
//    "Type of Discussion" on the letter. Default to Opportunity Plan (bc[1]),
//    which matches the old behavior of defaulting to the last rung.
//    Flip to bc[0] if you'd rather it default to Serious Conversation.
replaceOnce(
  'default selection: bc[2] -> bc[1] (Opportunity Plan)',
  'disc:bc[2]',
  'disc:bc[1]'
);

if (src === original) {
  console.error('FAIL nothing changed');
  process.exit(1);
}

fs.writeFileSync(BACKUP, original, 'utf8');
fs.writeFileSync(FILE, src, 'utf8');
console.log(`Backup: ${path.basename(BACKUP)}`);
