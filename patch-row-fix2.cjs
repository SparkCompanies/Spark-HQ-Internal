/* patch-row-fix2.cjs — restore row selection, make the highlight actually visible
   1. My rule set .sel-box{width:auto}, collapsing the 17px checkbox to nothing.
      With no checkbox there is no way to select a row, and no way to delete one.
      Rule removed.
   2. The active-row gold lines were drawn on the td, but every coloured cell paints
      an inner div over the top. They are now drawn by an ::after overlay that sits
      above the cell contents.
   Run from the repo root:  node patch-row-fix2.cjs
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
if (p.indexOf('row-active-fix') === -1) throw new Error('Run patch-row-polish-fix.cjs first. Aborting.');
if (p.indexOf('row-active-overlay') !== -1) throw new Error('Already applied. Aborting.');

const a = `  /* row-active-fix: chips keep their size, the name span already has flex:1 */
  .name-cell .warn-chip,.name-cell .sel-box,.name-cell .row-grip,.name-cell .sf-link,.name-cell .update-btn{flex:0 0 auto}
  .name-cell .sel-box,.name-cell .row-grip{width:auto}
  /* the row being worked on - gold lines read over coloured status cells,
     which carry their own inline backgrounds */
  tr.row-active>td{box-shadow:inset 0 2px 0 var(--gold),inset 0 -2px 0 var(--gold)}
  tr.row-active>td:first-child{box-shadow:inset 3px 0 0 var(--gold),inset 0 2px 0 var(--gold),inset 0 -2px 0 var(--gold)}`;
must(p, a, 'row-css');
p = p.replace(a, `  /* row-active-overlay: chips keep their size; the checkbox keeps its own 17px */
  .name-cell .warn-chip,.name-cell .sf-link,.name-cell .update-btn{flex:0 0 auto}
  /* the highlight is drawn ABOVE the cell contents, so coloured status cells
     cannot paint over it */
  tr.row-active>td{position:relative}
  tr.row-active>td::after{content:'';position:absolute;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:3;
    box-shadow:inset 0 2px 0 var(--gold),inset 0 -2px 0 var(--gold);background:rgba(255,200,0,.14)}
  tr.row-active>td:first-child::after{box-shadow:inset 3px 0 0 var(--gold),inset 0 2px 0 var(--gold),inset 0 -2px 0 var(--gold)}`);

fs.writeFileSync(PAGE + '.bak-rowfix2', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  checkbox restored to 17px - rows can be selected and deleted again');
console.log('OK  highlight drawn above cell contents, visible across the whole row');
console.log('Backup: spark-boards.html.bak-rowfix2');
