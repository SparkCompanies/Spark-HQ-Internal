/* patch-row-polish-fix.cjs — actually fix the two things
   1. My previous CSS put flex:1 on .name-cell>span:first-child, which is the
      CHECKBOX, not the name. The checkbox expanded and pushed every name to the
      right, squeezing it further - that is the gap in the screenshot. Rule removed;
      the name span already carries flex:1 of its own.
   2. The highlight never showed because the name cell sets background as an INLINE
      style, which no stylesheet rule can override. The active row is now driven by
      that inline value, plus gold lines above and below the row that read over the
      coloured status cells.
   Run from the repo root:  node patch-row-polish-fix.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}
let p = read(PAGE);
if (p.indexOf('row-active') === -1) throw new Error('Run patch-row-polish.cjs first. Aborting.');
if (p.indexOf('row-active-fix') !== -1) throw new Error('Already applied. Aborting.');

/* 1. drop the rule that expanded the checkbox, and make the highlight visible over inline styles */
const aCss = `  /* the candidate name takes the room; chips and icons keep their size */
  .name-cell>span:first-child,.name-cell .nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name-cell .warn-chip,.name-cell .sf-link,.name-cell .update-btn{flex:0 0 auto}
  /* row being worked on */
  tr.row-active>td{background:#FFF8E1}
  tr.row-active>td:first-child{box-shadow:inset 3px 0 0 var(--gold)}
  tr.row-active:hover>td{background:#FFF3CC}`;
must(p, aCss, 'bad-css');
p = p.replace(aCss, `  /* row-active-fix: chips keep their size, the name span already has flex:1 */
  .name-cell .warn-chip,.name-cell .sel-box,.name-cell .row-grip,.name-cell .sf-link,.name-cell .update-btn{flex:0 0 auto}
  .name-cell .sel-box,.name-cell .row-grip{width:auto}
  /* the row being worked on - gold lines read over coloured status cells,
     which carry their own inline backgrounds */
  tr.row-active>td{box-shadow:inset 0 2px 0 var(--gold),inset 0 -2px 0 var(--gold)}
  tr.row-active>td:first-child{box-shadow:inset 3px 0 0 var(--gold),inset 0 2px 0 var(--gold),inset 0 -2px 0 var(--gold)}`);

/* 2. the name cell's inline background reflects the active row */
const aBg = `          background: sel[it.id] ? 'var(--gold-soft)' : 'var(--surface)',
          minWidth: 340,`;
must(p, aBg, 'name-td-bg');
p = p.replace(aBg, `          background: sel[it.id] ? 'var(--gold-soft)' : activeItemId === it.id ? '#FFF6DC' : 'var(--surface)',
          minWidth: 340,`);

fs.writeFileSync(PAGE + '.bak-rowfix', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  removed the rule that was pushing names to the right');
console.log('OK  active row marked with gold lines top and bottom, full width');
console.log('OK  name cell tints amber for the row being worked on');
console.log('Backup: spark-boards.html.bak-rowfix');
