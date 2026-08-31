/* patch-sfuser-simple.cjs — rebuild the Salesforce User picker without the moving parts
   Previous version had three things competing: a window click listener, a scroll
   listener, and an autofocused input that can itself cause a scroll. Any one of
   them could close the panel the instant it opened.
   This version: no autofocus, no scroll listener, and the opening click calls
   stopPropagation so it cannot reach the close handler. A backdrop closes it.
   Run from the repo root:  node patch-sfuser-simple.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
let p = read(PAGE);
const start = p.indexOf('function SFUserCell');
const end = p.indexOf('function EmojiCell');
if (start === -1 || end === -1 || end < start) throw new Error('Could not locate SFUserCell. Aborting, nothing written.');
if (p.indexOf('sfu-backdrop') !== -1) throw new Error('Already applied. Aborting.');

const next = `function SFUserCell({ value, onChange, canEdit }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [users, setUsers] = useState(SFU.list || []);
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const anchor = useRef(null);
  useEffect(() => {
    if (!SFU.list) SFU.load().then(u => setUsers(u.slice()));
  }, []);
  const openAt = e => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!canEdit) return;
    if (open) {
      setOpen(false);
      return;
    }
    SFU.load().then(u => setUsers(u.slice()));
    const el = anchor.current;
    let box = { left: 40, top: 120 };
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      const w = 280,
        h = 320;
      let left = r.left;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
      if (left < 8) left = 8;
      let top = r.bottom + 4;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
      box = { left: left, top: top };
    }
    setPos(box);
    setQ('');
    setShowAll(false);
    setOpen(true);
  };
  const nm = SFU.name(value);
  const source = !showAll && SFU.team && SFU.team.length ? SFU.team : users || [];
  const shown = source.filter(u => !q.trim() || u.name.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1).slice(0, showAll ? 80 : 40);
  const hiddenCount = !showAll && SFU.team ? Math.max(0, (users || []).length - SFU.team.length) : 0;
  return React.createElement('div', { className: 'emo-wrap' },
    React.createElement('div', {
      ref: anchor,
      className: 'sfu-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Pick a Salesforce user' : undefined,
      onClick: openAt
    }, value ? React.createElement('span', { className: 'sfu-chip' }, sfuInitials(nm || '?')) : null,
       React.createElement('span', { className: 'sfu-name' }, nm || (value ? value : (canEdit ? 'Set\\u2026' : '\\u2014')))),
    open && React.createElement('div', {
      className: 'sfu-backdrop',
      onClick: e => {
        e.stopPropagation();
        setOpen(false);
      }
    }, React.createElement('div', {
      className: 'sfu-pop',
      style: pos || { left: 40, top: 120 },
      onClick: e => e.stopPropagation()
    },
      React.createElement('input', {
        value: q,
        placeholder: 'Search ' + (showAll ? 'all Salesforce users' : 'your team'),
        onChange: e => setQ(e.target.value)
      }),
      React.createElement('div', { className: 'sfu-list' },
        shown.length === 0 ? React.createElement('div', { style: { padding: 8, fontSize: 12.5, color: 'var(--faint)' } }, users && users.length ? 'No match' : 'Loading users\\u2026') :
        shown.map(u => React.createElement('button', {
          key: u.id,
          onClick: e => {
            e.stopPropagation();
            onChange(u.id);
            setOpen(false);
          }
        }, React.createElement('span', { className: 'sfu-chip' }, sfuInitials(u.name)), u.name))),
      hiddenCount > 0 && React.createElement('button', {
        className: 'sfu-clear',
        onClick: e => {
          e.stopPropagation();
          setShowAll(true);
        }
      }, 'Show all Salesforce users (' + hiddenCount + ' more)'),
      React.createElement('button', {
        className: 'sfu-clear',
        onClick: e => {
          e.stopPropagation();
          onChange('');
          setOpen(false);
        }
      }, 'Clear'))));
}

`;
p = p.slice(0, start) + next + p.slice(end);

/* backdrop CSS */
const aCss = `  .sfu-pop{position:fixed;z-index:400;`;
if (p.split(aCss).length - 1 !== 1) throw new Error('ANCHOR sfu-pop-css missing. Aborting.');
p = p.replace(aCss, `  .sfu-backdrop{position:fixed;inset:0;z-index:399}
  .sfu-pop{position:fixed;z-index:400;`);

fs.writeFileSync(PAGE + '.bak-sfusimple', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  picker rebuilt: no autofocus, no scroll listener, no window listener');
console.log('OK  opening click cannot reach any close handler');
console.log('OK  closes on a click outside, on pick, or on Clear');
console.log('Backup: spark-boards.html.bak-sfusimple');
