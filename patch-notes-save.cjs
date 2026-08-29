/* patch-notes-save.cjs — item notes were never saved
   postUpdate pushed the note into React state and returned. Nothing called Persist,
   so every note typed on an item looked fine until the page was reloaded, then it
   was gone. This builds the new board explicitly and persists it.
   Run from the repo root:  node patch-notes-save.cjs
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
if (p.indexOf('/* notes now persist */') !== -1) throw new Error('Already applied. Aborting.');

const a = `  const postUpdate = textVal => {
    if (!drawer) return;
    updateBoard(drawer.boardId, b => {
      const nb = structuredClone(b);
      for (const g of nb.groups) {
        const it = g.items.find(i => i.id === drawer.itemId);
        if (it) {
          it.updates = it.updates || [];
          it.updates.push({
            id: 'u' + Date.now(),
            author: me.name,
            color: me.color,
            text: textVal,
            at: new Date().toISOString()
          });
          break;
        }
      }
      return nb;
    });
  };`;
must(p, a, 'post-update');
p = p.replace(a, `  /* notes now persist */
  const postUpdate = textVal => {
    if (!drawer) return;
    const cur = boards.find(b => b.id === drawer.boardId);
    if (!cur) return;
    const nb = structuredClone(cur);
    let target = null;
    for (const g of nb.groups || []) {
      const it = (g.items || []).find(i => i.id === drawer.itemId);
      if (it) {
        target = it;
        break;
      }
    }
    if (!target) return;
    target.updates = target.updates || [];
    target.updates.push({
      id: 'u' + Date.now(),
      author: me.name,
      color: me.color,
      text: textVal,
      at: new Date().toISOString()
    });
    updateBoard(drawer.boardId, () => nb);
    Persist.board(nb, true);
  };`);

fs.writeFileSync(PAGE + '.bak-notessave', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  item notes are saved to the server instead of screen-only');
console.log('Backup: spark-boards.html.bak-notessave');
