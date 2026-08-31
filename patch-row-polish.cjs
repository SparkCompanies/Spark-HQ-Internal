/* patch-row-polish.cjs — two requests from Maryam and Tamika
   1. Full candidate name visible: the ITEM column goes from 250px to 340px and the
      name gets priority over the chips beside it, so it stops truncating.
   2. The row being worked on is highlighted across its full width while that
      person's updates drawer is open.
   Run from the repo root:  node patch-row-polish.cjs
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
if (p.indexOf('row-active') !== -1) throw new Error('Already applied. Aborting.');

/* ---- 1. wider ITEM column, name wins the space ---- */
const n250 = p.split('minWidth: 250').length - 1;
if (n250 < 2) throw new Error('Expected the 250px name column in header and body, found ' + n250 + '. Aborting.');
p = p.split('minWidth: 250').join('minWidth: 340');

const aCss = `  .cell{padding:10px 14px;min-height:42px;display:flex;align-items:center;width:100%;height:100%}`;
must(p, aCss, 'cell-css');
p = p.replace(aCss, `  .cell{padding:10px 14px;min-height:42px;display:flex;align-items:center;width:100%;height:100%}
  /* the candidate name takes the room; chips and icons keep their size */
  .name-cell>span:first-child,.name-cell .nm{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .name-cell .warn-chip,.name-cell .sf-link,.name-cell .update-btn{flex:0 0 auto}
  /* row being worked on */
  tr.row-active>td{background:#FFF8E1}
  tr.row-active>td:first-child{box-shadow:inset 3px 0 0 var(--gold)}
  tr.row-active:hover>td{background:#FFF3CC}`);

/* ---- 2. highlight the row whose drawer is open ---- */
const aRow = `        className: (sel[it.id] ? 'row-sel ' : '') + (overRow === it.id && dragRow && dragRow !== it.id ? 'row-drop' : ''),`;
must(p, aRow, 'row-class');
p = p.replace(aRow, `        className: (sel[it.id] ? 'row-sel ' : '') + (activeItemId === it.id ? 'row-active ' : '') + (overRow === it.id && dragRow && dragRow !== it.id ? 'row-drop' : ''),`);

const aTVSig = `function TableView({
  board,
  fullBoard,
  filtered,`;
must(p, aTVSig, 'tableview-sig');
p = p.replace(aTVSig, `function TableView({
  board,
  fullBoard,
  activeItemId,
  filtered,`);

const aTVCall = `React.createElement(TableView, {
    board: board,
    fullBoard: fullBoard,`;
must(p, aTVCall, 'tableview-call');
p = p.replace(aTVCall, `React.createElement(TableView, {
    board: board,
    fullBoard: fullBoard,
    activeItemId: activeItemId,`);

const aBVSig = `function BoardView({
  board,
  fullBoard,
  filtered,`;
must(p, aBVSig, 'boardview-sig');
p = p.replace(aBVSig, `function BoardView({
  board,
  fullBoard,
  activeItemId,
  filtered,`);

const aApp = `    fullBoard: activeBoard,
    filtered: !!query,`;
must(p, aApp, 'app-boardview');
p = p.replace(aApp, `    fullBoard: activeBoard,
    activeItemId: drawer && drawer.boardId === activeBoard.id ? drawer.itemId : null,
    filtered: !!query,`);

fs.writeFileSync(PAGE + '.bak-rowpolish', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  ITEM column widened to 340px and the name gets the space');
console.log('OK  open row highlighted full width with a gold edge');
console.log('Backup: spark-boards.html.bak-rowpolish');
