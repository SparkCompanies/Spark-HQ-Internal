/* patch-sfuser-column.cjs — "Salesforce User" column type
   A picker fed from your Salesforce active-user list (/charge-sf-users). The cell
   stores the Salesforce User Id, not a typed name, so placement credits can never
   be written against a misspelling. The name is resolved for display from a list
   fetched once per session.
   Add it from the + column menu, then name the columns Sales Rep and Recruiter.
   Run from the repo root:  node patch-sfuser-column.cjs
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
if (p.indexOf('SFUserCell') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('EmojiCell') === -1) throw new Error('Run patch-emoji-column.cjs first. Aborting.');

/* 1. CSS - same 42px box as every other cell */
const aCss = `  .emo-wrap{position:relative;width:100%;height:42px}`;
must(p, aCss, 'emo-wrap-css');
p = p.replace(aCss, `  .emo-wrap{position:relative;width:100%;height:42px}
  .sfu-cell{height:42px;width:100%;display:flex;align-items:center;gap:7px;padding:0 12px;cursor:pointer;font-size:13.5px;overflow:hidden}
  .sfu-cell.empty{color:var(--faint)}
  .sfu-chip{width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font:700 10px/1 'Jost',sans-serif;color:#fff;background:#579BFC}
  .sfu-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sfu-pop{position:fixed;z-index:400;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);padding:8px;width:280px}
  .sfu-pop input{width:100%;padding:7px 9px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;margin-bottom:6px}
  .sfu-pop input:focus{border-color:var(--gold)}
  .sfu-list{max-height:220px;overflow-y:auto}
  .sfu-list button{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;background:none;border-radius:7px;cursor:pointer;font-size:13px;text-align:left}
  .sfu-list button:hover{background:var(--surface-2)}
  .sfu-clear{width:100%;margin-top:6px;padding:5px;font-size:12.5px;color:var(--sub);background:var(--surface-2);border:0;border-radius:7px;cursor:pointer}`);

/* 2. shared user list - fetched once, reused by every cell */
const aComp = `function EmojiCell({ value, onChange, canEdit }) {`;
must(p, aComp, 'emoji-cell-fn');
p = p.replace(aComp, `/* Salesforce users, loaded once and shared by every SF user cell */
const SFU = {
  list: null,
  loading: null,
  byId: {},
  load() {
    if (this.list) return Promise.resolve(this.list);
    if (this.loading) return this.loading;
    this.loading = API.call('/charge-sf-users').then(d => {
      this.list = (d && d.users) || [];
      this.list.forEach(u => {
        this.byId[u.id] = u.name;
      });
      return this.list;
    }).catch(() => {
      this.loading = null;
      return [];
    });
    return this.loading;
  },
  name(id) {
    if (!id) return '';
    return this.byId[id] || '';
  }
};
const sfuInitials = n => String(n || '').split(/\\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
function SFUserCell({ value, onChange, canEdit }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [users, setUsers] = useState(SFU.list || []);
  const [q, setQ] = useState('');
  const anchor = useRef(null);
  useEffect(() => {
    if (!SFU.list) SFU.load().then(u => setUsers(u.slice()));
  }, []);
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
    SFU.load().then(u => setUsers(u.slice()));
    const el = anchor.current;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      const w = 280,
        h = 300;
      let left = r.left;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
      if (left < 8) left = 8;
      let top = r.bottom + 4;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
      setPos({ left: left, top: top });
    }
    setQ('');
    setOpen(true);
  };
  const nm = SFU.name(value);
  const shown = (users || []).filter(u => !q.trim() || u.name.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1).slice(0, 60);
  return React.createElement('div', { className: 'emo-wrap' },
    React.createElement('div', {
      ref: anchor,
      className: 'sfu-cell' + (value ? '' : ' empty'),
      title: canEdit ? 'Pick a Salesforce user' : undefined,
      onClick: openAt
    }, value ? React.createElement('span', { className: 'sfu-chip' }, sfuInitials(nm || '?')) : null,
       React.createElement('span', { className: 'sfu-name' }, nm || (value ? value : '\\u2014'))),
    open && pos && React.createElement('div', {
      className: 'sfu-pop',
      style: pos,
      onClick: e => e.stopPropagation()
    },
      React.createElement('input', {
        value: q,
        autoFocus: true,
        placeholder: 'Search Salesforce users',
        onChange: e => setQ(e.target.value)
      }),
      React.createElement('div', { className: 'sfu-list' },
        shown.length === 0 ? React.createElement('div', { style: { padding: 8, fontSize: 12.5, color: 'var(--faint)' } }, users && users.length ? 'No match' : 'Loading users...') :
        shown.map(u => React.createElement('button', {
          key: u.id,
          onClick: () => {
            onChange(u.id);
            setOpen(false);
          }
        }, React.createElement('span', { className: 'sfu-chip' }, sfuInitials(u.name)), u.name))),
      React.createElement('button', {
        className: 'sfu-clear',
        onClick: () => {
          onChange('');
          setOpen(false);
        }
      }, 'Clear')));
}
function EmojiCell({ value, onChange, canEdit }) {`);

/* 3. register in the + column picker */
const aType = `  type: 'emoji',
  label: 'Emoji',
  c: '#FDAB3D'
}, {`;
must(p, aType, 'type-list');
p = p.replace(aType, `  type: 'emoji',
  label: 'Emoji',
  c: '#FDAB3D'
}, {
  type: 'sfuser',
  label: 'Salesforce User',
  c: '#0086C0'
}, {`);

/* 4. render it */
const aRender = `      }), c.type === 'emoji' && /*#__PURE__*/React.createElement(EmojiCell, {`;
must(p, aRender, 'cell-dispatch');
p = p.replace(aRender, `      }), c.type === 'sfuser' && /*#__PURE__*/React.createElement(SFUserCell, {
        value: it[c.key],
        canEdit: cellEdit,
        onChange: v => setItem(gi, ii, c.key, v)
      }), c.type === 'emoji' && /*#__PURE__*/React.createElement(EmojiCell, {`);

fs.writeFileSync(PAGE + '.bak-sfuser', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  new "Salesforce User" column type');
console.log('OK  searchable picker from your active SF users, stores the User Id');
console.log('Backup: spark-boards.html.bak-sfuser');
