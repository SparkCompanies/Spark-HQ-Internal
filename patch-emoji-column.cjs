/* patch-emoji-column.cjs — new "Emoji" column type
   Adds an emoji column you can add from the + column menu like any other type.
   Click the cell, pick from a palette, or clear it. Saves cell-level.
   Run from the repo root:  node patch-emoji-column.cjs
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
if (p.indexOf('EmojiCell') !== -1) throw new Error('Emoji column already added. Aborting.');

/* 1. CSS */
const aCss = `  .cell{padding:10px 14px;min-height:42px;display:flex;align-items:center;width:100%;height:100%}`;
must(p, aCss, 'css-cell');
p = p.replace(aCss, `  .cell{padding:10px 14px;min-height:42px;display:flex;align-items:center;width:100%;height:100%}
  .emo-cell{justify-content:center;font-size:19px;line-height:1;cursor:pointer;user-select:none}
  .emo-cell.empty{color:var(--faint);font-size:13px}
  .emo-pop{position:absolute;z-index:80;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);padding:8px;width:268px}
  .emo-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;max-height:190px;overflow-y:auto}
  .emo-grid button{font-size:18px;line-height:1;padding:5px 0;border:0;background:none;border-radius:6px;cursor:pointer}
  .emo-grid button:hover{background:var(--surface-2)}
  .emo-clear{width:100%;margin-top:6px;padding:5px;font-size:12.5px;color:var(--sub);background:var(--surface-2);border:0;border-radius:7px;cursor:pointer}
  .emo-clear:hover{color:var(--text)}`);

/* 2. the cell component */
const aAnchor = `/* ---------------- Board container ---------------- */`;
must(p, aAnchor, 'board-container');
p = p.replace(aAnchor, `const EMOJI_SET = ['\\u2705','\\u274C','\\u26A0\\uFE0F','\\u2B50','\\uD83D\\uDD25','\\uD83C\\uDFAF','\\uD83D\\uDCC5','\\u23F0','\\uD83D\\uDCCC','\\uD83D\\uDEA9','\\uD83D\\uDC4D','\\uD83D\\uDC4E','\\uD83D\\uDCAF','\\u2757','\\u2753','\\uD83D\\uDD04','\\uD83D\\uDFE2','\\uD83D\\uDFE1','\\uD83D\\uDD34','\\uD83D\\uDD35','\\uD83D\\uDFE3','\\u26AB','\\u26AA','\\uD83D\\uDFE4','\\uD83D\\uDE00','\\uD83D\\uDE42','\\uD83D\\uDE10','\\uD83D\\uDE41','\\uD83D\\uDE22','\\uD83D\\uDE21','\\uD83E\\uDD14','\\uD83D\\uDE0E','\\uD83D\\uDCBC','\\uD83D\\uDCDE','\\uD83D\\uDCE7','\\uD83D\\uDCC4','\\uD83D\\uDCCB','\\uD83D\\uDCB0','\\uD83C\\uDFE0','\\uD83D\\uDE97','\\uD83D\\uDC64','\\uD83D\\uDC65','\\uD83E\\uDD1D','\\uD83C\\uDF89','\\uD83C\\uDFC6','\\uD83D\\uDE80','\\u26A1','\\uD83E\\uDD16','\\uD83D\\uDD27','\\uD83C\\uDFED','\\uD83E\\uDDEA','\\uD83E\\uDE7A','\\uD83D\\uDC8A','\\uD83D\\uDEE1\\uFE0F','\\uD83D\\uDD12','\\uD83D\\uDD11'];
function EmojiCell({ value, onChange, canEdit }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [open]);
  return React.createElement('div', { style: { position: 'relative', width: '100%' }, onClick: e => e.stopPropagation() },
    React.createElement('div', {
      className: 'cell emo-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Click to pick an emoji' : undefined,
      onClick: () => canEdit && setOpen(o => !o)
    }, value || '\\u2014'),
    open && React.createElement('div', { className: 'emo-pop' },
      React.createElement('div', { className: 'emo-grid' },
        EMOJI_SET.map(e => React.createElement('button', {
          key: e,
          onClick: () => {
            onChange(e);
            setOpen(false);
          }
        }, e))),
      React.createElement('button', {
        className: 'emo-clear',
        onClick: () => {
          onChange('');
          setOpen(false);
        }
      }, 'Clear')));
}

${aAnchor}`);

/* 3. register the type in the + column menu */
const aType = `  type: 'progress',
  label: 'Progress',
  c: '#13B5EA'
}, {`;
must(p, aType, 'type-list');
p = p.replace(aType, `  type: 'progress',
  label: 'Progress',
  c: '#13B5EA'
}, {
  type: 'emoji',
  label: 'Emoji',
  c: '#FDAB3D'
}, {`);

/* 4. render it */
const aRender = `      }), c.type === 'text' && /*#__PURE__*/React.createElement(TextCell, {
        value: it[c.key],
        onChange: v => setItem(gi, ii, c.key, v)
      }))), canEdit && /*#__PURE__*/React.createElement("td", null));`;
must(p, aRender, 'cell-dispatch');
p = p.replace(aRender, `      }), c.type === 'emoji' && /*#__PURE__*/React.createElement(EmojiCell, {
        value: it[c.key],
        canEdit: cellEdit,
        onChange: v => setItem(gi, ii, c.key, v)
      }), c.type === 'text' && /*#__PURE__*/React.createElement(TextCell, {
        value: it[c.key],
        onChange: v => setItem(gi, ii, c.key, v)
      }))), canEdit && /*#__PURE__*/React.createElement("td", null));`);

fs.writeFileSync(PAGE + '.bak-emoji', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  new "Emoji" column type in the + column menu');
console.log('OK  click a cell to pick from 56 emojis, or Clear');
console.log('Backup: spark-boards.html.bak-emoji');
