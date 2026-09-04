/* patch-celeb-month-label.cjs — make the month the headline, and stop the count reading as a date.
   "September · 7" was being read as September 7th. It actually meant seven people to celebrate this
   month, so the pill was genuinely ambiguous - my wording, not a data problem.
   Now the right side of the header is a stacked block: the month name at 23px in a gold gradient,
   with "7 TO CELEBRATE" underneath in small caps. The word makes the number unmistakable, and the
   month finally has some size to it.
   Requires patch-celeb-header.cjs.
   Run from repo root:  node patch-celeb-month-label.cjs
*/
const fs = require('fs');
const F = 'spark-home.html';
function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
function repl(s, oldStr, newStr, label){
  const n = s.split(oldStr).length - 1;
  if(n !== 1) throw new Error('ANCHOR '+label+': expected 1 match, found '+n+'. Nothing written.');
  return s.replace(oldStr, () => newStr);
}
let x = read(F);
if (x.indexOf('cb-month') !== -1) throw new Error('Already applied. Aborting.');
if (x.indexOf('cb-badge') === -1) throw new Error('Run patch-celeb-header.cjs first.');
x = repl(x, ".cb-sub{margin-left:auto;flex:0 0 auto;display:flex;align-items:center;gap:8px}\n@media(max-width:520px){.cb-title{font-size:17px}.cb-sub{display:none}}", ".cb-sub{margin-left:auto;flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}\n.cb-month{font-size:23px;font-weight:800;letter-spacing:-.02em;color:#B8912E;\n  background:linear-gradient(180deg,#D9A916,#B8912E);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}\n.cb-tally{margin-top:3px;font-size:10.5px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#9a948a}\n@media(max-width:520px){.cb-title{font-size:17px}.cb-month{font-size:19px}.cb-tally{letter-spacing:.08em}}", "month block css");
x = repl(x, "    var n=(j.monthBirthdays||[]).length+(j.monthAnniversaries||[]).length;\n    var pill=el('div','cb-sub');\n    pill.appendChild(el('span','cb-count',(j.monthName||'')+' &middot; '+n));\n    h.appendChild(pill);", "    var n=(j.monthBirthdays||[]).length+(j.monthAnniversaries||[]).length;\n    /* the month reads as the headline; the tally always carries a word, because\n       \"September · 7\" was being read as the 7th of September rather than 7 people. */\n    var side=el('div','cb-sub');\n    side.appendChild(el('div','cb-month',esc(j.monthName||'')));\n    side.appendChild(el('div','cb-tally',n+(n===1?' to celebrate':' to celebrate')));\n    h.appendChild(side);", "month block markup");
fs.writeFileSync(F + '.bak-monthlabel', read(F));
fs.writeFileSync(F, x);
console.log('OK  month is now the headline on the right, 23px in a gold gradient');
console.log('OK  count reads "7 TO CELEBRATE" so it can no longer be mistaken for a date');
console.log('Backup: spark-home.html.bak-monthlabel');
