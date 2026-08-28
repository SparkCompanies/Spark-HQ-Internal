/* patch-edit-while-search.cjs — let people edit cells while the search box has text
   Searching rebuilds the board with only matching rows. Saving in that state would
   have written the filtered board back and deleted every non-matching row, so the
   original build blocked all editing while filtered. Cell-level saves removed that
   danger, so this re-enables CELL editing only: edits resolve against the real
   (unfiltered) board by item id. Structural changes (add row, add/move columns,
   drag) stay disabled while filtered, because those still depend on the full board.
   Requires patch-cell-save.cjs.
   Run from the repo root:  node patch-edit-while-search.cjs
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
if (p.indexOf('Persist.cell') === -1) throw new Error('Run patch-cell-save.cjs first. Aborting.');
if (p.indexOf('cellEdit') !== -1) throw new Error('Already applied. Aborting.');

/* ---- 1. Persist.board gains a bypass for callers that already hold the full board ---- */
const aPB = `  board(b) {
    if (!LIVE || !b) return;
    if (typeof window !== 'undefined' && window.__sbNoSave) {`;
must(p, aPB, 'persist-board');
p = p.replace(aPB, `  board(b, trusted) {
    if (!LIVE || !b) return;
    if (!trusted && typeof window !== 'undefined' && window.__sbNoSave) {`);

const aPC = `  cell(b, ops, activity) {
    if (!LIVE || !b || !ops || !ops.length) return;
    if (typeof window !== 'undefined' && window.__sbNoSave) {
      sbFlash('Clear the search box before editing. Changes are not saved while filtered.');
      return;
    }`;
must(p, aPC, 'persist-cell');
p = p.replace(aPC, `  cell(b, ops, activity) {
    if (!LIVE || !b || !ops || !ops.length) return;`);

/* ---- 2. App passes the real board through and stops disabling edit on search ---- */
const aApp = `    board: filterBoardRows(activeBoard, query),
    update: fn => updateBoard(activeBoard.id, fn),
    canEdit: canEdit && !query,`;
must(p, aApp, 'app-boardview');
p = p.replace(aApp, `    board: filterBoardRows(activeBoard, query),
    fullBoard: activeBoard,
    filtered: !!query,
    update: fn => updateBoard(activeBoard.id, fn),
    canEdit: canEdit,`);

/* ---- 3. thread the two new props down ---- */
const aBV = `function BoardView({
  board,
  update,
  canEdit,
  onOpenItem,
  onSetPrivacy,
  onAutomation,
  onOpenAutomations
}) {`;
must(p, aBV, 'boardview-sig');
p = p.replace(aBV, `function BoardView({
  board,
  fullBoard,
  filtered,
  update,
  canEdit,
  onOpenItem,
  onSetPrivacy,
  onAutomation,
  onOpenAutomations
}) {`);

const aTVCall = `  }, view === 'table' && /*#__PURE__*/React.createElement(TableView, {
    board: board,
    update: update,
    canEdit: canEdit,`;
must(p, aTVCall, 'tableview-call');
p = p.replace(aTVCall, `  }, view === 'table' && /*#__PURE__*/React.createElement(TableView, {
    board: board,
    fullBoard: fullBoard,
    filtered: filtered,
    update: update,
    canEdit: canEdit,`);

/* ---- 4. inside TableView: structural ops keep the old gate, cells get their own ---- */
const aTVSig = `function TableView({
  board,
  update,
  canEdit,
  onOpenItem,
  onAutomation,
  personFilter,
  sel,
  setSel
}) {`;
must(p, aTVSig, 'tableview-sig');
p = p.replace(aTVSig, `function TableView({
  board,
  fullBoard,
  filtered,
  update,
  canEdit: canEditRaw,
  onOpenItem,
  onAutomation,
  personFilter,
  sel,
  setSel
}) {
  /* cells stay editable while filtered; everything structural does not */
  const cellEdit = canEditRaw;
  const canEdit = canEditRaw && !filtered;
  const baseBoard = fullBoard || board;`);

const aCellProp = `        canEdit: canEdit,`;
must(p, aCellProp, 'cell-canedit');
p = p.replace(aCellProp, `        canEdit: cellEdit,`);

/* ---- 5. setItem resolves against the real board by item id ---- */
const aSetItem = `  const setItem = (gi, ii, key, val) => {
    const nb = structuredClone(board);
    const col = board.columns.find(c => c.key === key);
    const it = nb.groups[gi].items[ii];
    const old = it[key];`;
must(p, aSetItem, 'setitem-head');
p = p.replace(aSetItem, `  const setItem = (gi, ii, key, val) => {
    const col = board.columns.find(c => c.key === key);
    const ref = ((board.groups[gi] || {}).items || [])[ii];
    if (!ref) return;
    const nb = structuredClone(baseBoard);
    let it = null;
    nb.groups.forEach(g => (g.items || []).forEach(x => {
      if (x.id === ref.id) it = x;
    }));
    if (!it) return;
    const old = it[key];`);

const aSetItemSave = `    if (notes.length) Persist.board(nb);else Persist.cell(nb, [{`;
must(p, aSetItemSave, 'setitem-save');
p = p.replace(aSetItemSave, `    if (notes.length) Persist.board(nb, true);else Persist.cell(nb, [{`);

fs.writeFileSync(PAGE + '.bak-editsearch', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  cells are editable while the search box has text');
console.log('OK  edits write to the real board by item id, not the filtered copy');
console.log('OK  add row / column changes / drag still disabled while filtered');
console.log('Backup: spark-boards.html.bak-editsearch');
