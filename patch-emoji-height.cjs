/* patch-emoji-height.cjs — fix rows growing when an Emoji column is present
   The emoji cell used the .cell class (min-height:42px PLUS 10px vertical padding
   = 62px) inside an extra positioned wrapper, while every other cell is a single
   element exactly 42px tall. That 20px difference stretched every row.
   This rebuilds the cell on the same box model as .status-cell: one element, 42px,
   no wrapper.
   Run from the repo root:  node patch-emoji-height.cjs
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
if (p.indexOf('EmojiCell') === -1) throw new Error('Run patch-emoji-column.cjs first. Aborting.');
if (p.indexOf('emo-cell{height:42px') !== -1) throw new Error('Already applied. Aborting.');

/* 1. CSS: exact same height as .status-cell, no padding, no min-height */
const aCss = `  .emo-cell{justify-content:center;font-size:19px;line-height:1;cursor:pointer;user-select:none}
  .emo-cell.empty{color:var(--faint);font-size:13px}`;
must(p, aCss, 'emo-css');
p = p.replace(aCss, `  .emo-cell{height:42px;width:100%;display:flex;align-items:center;justify-content:center;font-size:19px;line-height:1;cursor:pointer;user-select:none;padding:0}
  .emo-cell.empty{color:var(--faint);font-size:13px}
  .emo-wrap{position:relative;width:100%;height:42px}`);

/* 2. one element, not a .cell inside a wrapper */
const aCell = `  return React.createElement('div', { style: { position: 'relative', width: '100%' }, onClick: e => e.stopPropagation() },
    React.createElement('div', {
      className: 'cell emo-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Click to pick an emoji' : undefined,
      onClick: () => canEdit && setOpen(o => !o)
    }, value || '\\u2014'),`;
must(p, aCell, 'emo-render');
p = p.replace(aCell, `  return React.createElement('div', { className: 'emo-wrap', onClick: e => e.stopPropagation() },
    React.createElement('div', {
      className: 'emo-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Click to pick an emoji' : undefined,
      onClick: () => canEdit && setOpen(o => !o)
    }, value || '\\u2014'),`);

fs.writeFileSync(PAGE + '.bak-emojih', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  emoji cell is now exactly 42px, same as every other cell');
console.log('OK  rows no longer grow when an Emoji column exists');
console.log('Backup: spark-boards.html.bak-emojih');
