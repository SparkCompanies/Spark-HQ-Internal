/* patch-calendar.cjs — build the Calendar view (replaces the placeholder)
   Month grid on the board's first date column, chips coloured by the primary status,
   click a chip to open the item, drag a chip to another day to reschedule.
   Saves through Persist.cell so a reschedule does not re-upload the whole board.
   Run from the repo root:  node patch-calendar.cjs
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
if (p.indexOf('function CalendarView') !== -1) throw new Error('Calendar already built. Aborting.');
if (p.indexOf('Persist.cell') === -1) throw new Error('Run patch-cell-save.cjs first. Aborting.');

/* ---- 1. CSS ---- */
const aCss = `  .board-wrap{padding:22px 22px 60px}`;
must(p, aCss, 'css-boardwrap');
p = p.replace(aCss, `  .board-wrap{padding:22px 22px 60px}
  .cal-bar{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  .cal-title{font-family:'Jost';font-weight:600;font-size:19px;min-width:190px}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .cal-dow{background:var(--surface-2);padding:8px 10px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--sub);text-align:center}
  .cal-day{background:var(--surface);min-height:118px;padding:6px 7px;display:flex;flex-direction:column;gap:4px}
  .cal-day.dim{background:var(--surface-2);opacity:.55}
  .cal-day.today .cal-num{background:var(--gold);color:#1A1407;border-radius:999px;padding:1px 7px}
  .cal-day.over{outline:2px solid var(--gold);outline-offset:-2px}
  .cal-num{font-size:12px;font-weight:600;color:var(--sub);align-self:flex-start}
  .cal-chip{font-size:11.5px;padding:3px 7px;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:0;text-align:left;width:100%}
  .cal-chip:hover{filter:brightness(1.08)}
  .cal-more{font-size:11px;color:var(--faint);padding-left:2px}
  .cal-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px;font-size:12px;color:var(--sub)}
  .cal-legend span{display:inline-flex;align-items:center;gap:6px}
  .cal-legend i{width:10px;height:10px;border-radius:3px;display:inline-block}`);

/* ---- 2. the component ---- */
const aScaffold = `function Scaffold({`;
must(p, aScaffold, 'scaffold-fn');
p = p.replace(aScaffold, `function CalendarView({ board, update, canEdit, onOpenItem, personFilter }) {
  const dateCol = (board.columns || []).find(c => c.type === 'date');
  const pcol = primaryCol(board);
  const [cur, setCur] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [over, setOver] = useState(null);
  const [drag, setDrag] = useState(null);
  const matchPF = it => !personFilter || personFilter.length === 0 || personFilter.some(f => String(it[f.key]) === String(f.val));
  if (!dateCol) {
    return React.createElement(Scaffold, {
      icon: Ic.cal,
      title: 'No date column on this board',
      desc: 'The calendar places each row on a date. Add a date column to this board and it will appear here.'
    });
  }
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const byDay = {};
  (board.groups || []).forEach(g => (g.items || []).forEach(it => {
    if (!isActiveItem(it) || !matchPF(it)) return;
    const raw = it[dateCol.key];
    if (!raw) return;
    const key = String(raw).slice(0, 10);
    (byDay[key] = byDay[key] || []).push({ it: it, g: g });
  }));
  const first = new Date(cur.y, cur.m, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  const todayIso = iso(new Date());
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const total = Object.keys(byDay).reduce((a, k) => a + byDay[k].length, 0);
  const colorOf = it => {
    const o = pcol ? optOf(pcol, it[pcol.key]) : null;
    return (o && o.color) || '#9AA0AC';
  };
  const move = (rec, d) => {
    if (!canEdit) return;
    const nd = iso(d);
    const was = rec.it[dateCol.key];
    if (String(was || '').slice(0, 10) === nd) return;
    const nb = structuredClone(board);
    let target = null;
    nb.groups.forEach(g => (g.items || []).forEach(x => {
      if (x.id === rec.it.id) target = x;
    }));
    if (!target) return;
    target[dateCol.key] = nd;
    logAct(nb, {
      actor: sparkMe(), kind: 'cell', itemId: rec.it.id, item: rec.it.name,
      col: dateCol.key, colLabel: dateCol.label || 'Date', from: was || '(empty)', to: nd, rawFrom: was
    });
    update(() => nb);
    Persist.cell(nb, [{ itemId: rec.it.id, key: dateCol.key, val: nd, was: was }], nb.activity ? [nb.activity[0]] : []);
  };
  const shift = n => setCur(c => {
    const d = new Date(c.y, c.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const legend = pcol && pcol.options ? pcol.options.slice(0, 8) : [];
  return React.createElement('div', { className: 'board-wrap' },
    React.createElement('div', { className: 'cal-bar' },
      React.createElement('button', { className: 'btn ghost', onClick: () => shift(-1) }, '\\u2039 Prev'),
      React.createElement('div', { className: 'cal-title' }, monthLabel),
      React.createElement('button', { className: 'btn ghost', onClick: () => shift(1) }, 'Next \\u203A'),
      React.createElement('button', {
        className: 'btn ghost',
        onClick: () => {
          const d = new Date();
          setCur({ y: d.getFullYear(), m: d.getMonth() });
        }
      }, 'Today'),
      React.createElement('span', { style: { marginLeft: 'auto', fontSize: 13, color: 'var(--sub)' } },
        total + ' dated on ' + (dateCol.label || 'date') + (canEdit ? ' \\u00B7 drag to reschedule' : ''))),
    React.createElement('div', { className: 'cal-grid' },
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d =>
        React.createElement('div', { key: d, className: 'cal-dow' }, d)),
      cells.map((d, i) => {
        const k = iso(d);
        const list = byDay[k] || [];
        const dim = d.getMonth() !== cur.m;
        return React.createElement('div', {
          key: i,
          className: 'cal-day' + (dim ? ' dim' : '') + (k === todayIso ? ' today' : '') + (over === k ? ' over' : ''),
          onDragOver: canEdit ? (e => {
            e.preventDefault();
            if (over !== k) setOver(k);
          }) : undefined,
          onDragLeave: canEdit ? (() => setOver(o => o === k ? null : o)) : undefined,
          onDrop: canEdit ? (e => {
            e.preventDefault();
            setOver(null);
            if (drag) {
              move(drag, d);
              setDrag(null);
            }
          }) : undefined
        },
          React.createElement('div', { className: 'cal-num' }, d.getDate()),
          list.slice(0, 4).map(rec => React.createElement('button', {
            key: rec.it.id,
            className: 'cal-chip',
            style: { background: colorOf(rec.it) },
            draggable: canEdit,
            onDragStart: canEdit ? (() => setDrag(rec)) : undefined,
            onDragEnd: canEdit ? (() => setDrag(null)) : undefined,
            title: rec.it.name + ' \\u2014 ' + rec.g.title,
            onClick: () => onOpenItem && onOpenItem(rec.it.id)
          }, rec.it.name)),
          list.length > 4 && React.createElement('div', { className: 'cal-more' }, '+' + (list.length - 4) + ' more'));
      })),
    legend.length > 0 && React.createElement('div', { className: 'cal-legend' },
      legend.map((o, i) => React.createElement('span', { key: i },
        React.createElement('i', { style: { background: o.color } }), o.label))));
}
function Scaffold({`);

/* ---- 3. swap the placeholder for the real view ---- */
const aCall = `view === 'calendar' && /*#__PURE__*/React.createElement(Scaffold, {
    icon: Ic.cal,
    title: "Calendar view",
    desc: "A month grid placing every candidate on their start date, color-coded by on-boarding status — drag to reschedule. Ready to wire to this board's Start Date column.",
    bullet: "Next iteration"
  })`;
must(p, aCall, 'calendar-stub');
p = p.replace(aCall, `view === 'calendar' && /*#__PURE__*/React.createElement(CalendarView, {
    board: board,
    update: update,
    canEdit: canEdit,
    onOpenItem: onOpenItem,
    personFilter: pf
  })`);

fs.writeFileSync(PAGE + '.bak-calendar', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  Calendar view built on the first date column');
console.log('OK  chips coloured by status, click to open the item');
console.log('OK  drag a chip to another day to reschedule (saves cell-level)');
console.log('Backup: spark-boards.html.bak-calendar');
