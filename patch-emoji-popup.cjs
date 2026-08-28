/* patch-emoji-popup.cjs — make the emoji picker actually appear
   patch-col-align added overflow:hidden to every table cell so long values would
   ellipsize. The picker was absolutely positioned INSIDE that cell, so it opened
   and was clipped to nothing. This switches it to fixed positioning measured from
   the cell's screen rect, so it escapes the cell and the table's scroll box.
   Run from the repo root:  node patch-emoji-popup.cjs
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
if (p.indexOf('emo-fixed') !== -1) throw new Error('Already applied. Aborting.');

/* 1. fixed, not absolute */
const aCss = `  .emo-pop{position:absolute;z-index:80;`;
must(p, aCss, 'emo-pop-css');
p = p.replace(aCss, `  .emo-pop{position:fixed;z-index:400;`);

/* 2. measure the cell and place the panel against the viewport */
const aOpen = `function EmojiCell({ value, onChange, canEdit }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [open]);`;
must(p, aOpen, 'emoji-open');
p = p.replace(aOpen, `function EmojiCell({ value, onChange, canEdit }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchor = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('click', h);
    window.addEventListener('scroll', h, true);
    return () => {
      window.removeEventListener('click', h);
      window.removeEventListener('scroll', h, true);
    };
  }, [open]);
  const openAt = () => {
    if (!canEdit) return;
    if (open) {
      setOpen(false);
      return;
    }
    const el = anchor.current;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      const w = 268,
        h = 250;
      let left = r.left;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
      if (left < 8) left = 8;
      let top = r.bottom + 4;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
      setPos({ left: left, top: top });
    }
    setOpen(true);
  };`);

/* 3. wire the ref and the new handler, and place the panel */
const aWrap = `  return React.createElement('div', { className: 'emo-wrap', onClick: e => e.stopPropagation() },
    React.createElement('div', {
      className: 'emo-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Click to pick an emoji' : undefined,
      onClick: () => canEdit && setOpen(o => !o)
    }, value || '\\u2014'),
    open && React.createElement('div', { className: 'emo-pop' },`;
must(p, aWrap, 'emoji-wrap');
p = p.replace(aWrap, `  return React.createElement('div', { className: 'emo-wrap emo-fixed', onClick: e => e.stopPropagation() },
    React.createElement('div', {
      ref: anchor,
      className: 'emo-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Click to pick an emoji' : undefined,
      onClick: openAt
    }, value || '\\u2014'),
    open && React.createElement('div', { className: 'emo-pop', style: pos || { left: 0, top: 0 } },`);

fs.writeFileSync(PAGE + '.bak-emojipop', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  emoji picker escapes the cell and is visible again');
console.log('OK  flips above the cell near the bottom of the screen, clamps at edges');
console.log('OK  closes on scroll so it cannot float detached');
console.log('Backup: spark-boards.html.bak-emojipop');
