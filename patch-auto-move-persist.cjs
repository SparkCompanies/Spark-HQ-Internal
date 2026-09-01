/* patch-auto-move-persist.cjs — automation group-moves now persist
   BUG: runAutomations() only pushes to `notes` for notify/email actions. A
   "move it to a group" (or set_status / assign) action mutates the board but
   returns an empty notes array. setItem/addItem use notes.length to decide the
   save path, so a move-group automation fell through to the cell-only patch
   (Persist.cell) or the add_item op — neither carries the group move. The move
   showed locally, never reached the server, and any refresh pulled it back.
   FIX: runAutomations reports how many rules actually fired (notes.fired). The
   two callers force a whole-board save whenever any rule fired, so the move
   (and any set_status/assign it did) is written.
   Run from repo root:  node patch-auto-move-persist.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
function repl(s, oldStr, newStr, label){
  const n = s.split(oldStr).length - 1;
  if(n !== 1) throw new Error('ANCHOR '+label+': expected 1 match, found '+n+'. Nothing written.');
  return s.replace(oldStr, newStr);
}

let p = read(PAGE);
if(p.indexOf('notes.fired = fired') !== -1) throw new Error('Already applied. Aborting.');

/* 1. declare the fired counter */
p = repl(p,
`function runAutomations(board, item, changedKey) {
  const notes = [];
  (board.automations || []).forEach(a => {`,
`function runAutomations(board, item, changedKey) {
  const notes = [];
  let fired = 0;
  (board.automations || []).forEach(a => {`,
'runAutomations header');

/* 2. count every rule that actually fires (after the trigger checks pass) */
p = repl(p,
`    } else return;
    const ac = a.action;
    if (ac.type === 'move_group') {`,
`    } else return;
    fired++;
    const ac = a.action;
    if (ac.type === 'move_group') {`,
'fired increment');

/* 3. expose the count on the returned array */
p = repl(p,
`  });
  return notes;
}
const seedAutomations = id => id !== 'b1' ? [] : [{`,
`  });
  notes.fired = fired;
  return notes;
}
const seedAutomations = id => id !== 'b1' ? [] : [{`,
'runAutomations return');

/* 4. setItem: whole-board save when any rule fired, not just notify/email */
p = repl(p,
`    if (notes.length) Persist.board(nb, true);else Persist.cell(nb, [{`,
`    if (notes.length || notes.fired) Persist.board(nb, true);else Persist.cell(nb, [{`,
'setItem save path');

/* 5. addItem: same, so item_created move automations persist too */
p = repl(p,
`    if (notes.length) {
      Persist.board(nb, true);
    } else {
      Persist.op(nb, [{
        type: 'add_item',`,
`    if (notes.length || notes.fired) {
      Persist.board(nb, true);
    } else {
      Persist.op(nb, [{
        type: 'add_item',`,
'addItem save path');

fs.writeFileSync(PAGE + '.bak-automove', read(PAGE));
fs.writeFileSync(PAGE, p);
console.log('OK  runAutomations now reports fired-rule count');
console.log('OK  status-change automations that move groups save the whole board');
console.log('OK  item-created automations that move groups persist too');
console.log('Backup:', PAGE + '.bak-automove');
