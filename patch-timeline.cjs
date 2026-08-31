/* patch-timeline.cjs — build the Timeline view (replaces the placeholder)
   A day-scaled axis across every upcoming and recent start date. Each candidate is
   a bar running from today to their start date - ahead of today in the client's
   colour, behind today in red for anyone who has started with steps still open.
   Grouped by HR team member, with today marked. Click a bar to open the item.
   Run from the repo root:  node patch-timeline.cjs
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
if (p.indexOf('function TimelineView') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('function CalendarView') === -1) throw new Error('Run patch-calendar.cjs first. Aborting.');

/* CSS */
const aCss = `  .cal-bar{display:flex;align-items:center;gap:12px;margin-bottom:14px}`;
must(p, aCss, 'cal-bar-css');
p = p.replace(aCss, `  .tl-wrap{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);overflow:auto;max-height:calc(100vh - 280px)}
  .tl-grid{position:relative;min-width:760px}
  .tl-axis{display:flex;position:sticky;top:0;z-index:3;background:var(--surface-2);border-bottom:1px solid var(--border)}
  .tl-axis .tl-name{flex-shrink:0;width:190px;position:sticky;left:0;z-index:4;background:var(--surface-2);border-right:1px solid var(--border)}
  .tl-tick{flex:1;min-width:34px;text-align:center;font-size:10.5px;font-weight:600;color:var(--sub);padding:7px 0;border-left:1px solid var(--border)}
  .tl-tick.mon{color:var(--ink)}
  .tl-row{display:flex;align-items:stretch;border-bottom:1px solid var(--border);min-height:34px}
  .tl-row:hover{background:var(--surface-2)}
  .tl-name{flex-shrink:0;width:190px;position:sticky;left:0;z-index:2;background:var(--surface);border-right:1px solid var(--border);padding:8px 10px;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tl-row:hover .tl-name{background:var(--surface-2)}
  .tl-track{flex:1;position:relative;min-width:0}
  .tl-bar{position:absolute;top:7px;height:20px;border-radius:5px;color:#fff;font:600 11px/20px 'Jost',sans-serif;padding:0 8px;white-space:nowrap;overflow:hidden;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.12)}
  .tl-bar:hover{filter:brightness(1.08)}
  .tl-today{position:absolute;top:0;bottom:0;width:2px;background:var(--gold);z-index:1}
  .tl-grouphead{padding:10px 12px;font:600 13px/1 'Jost',sans-serif;background:var(--surface-2);border-bottom:1px solid var(--border);position:sticky;left:0}
  .cal-bar{display:flex;align-items:center;gap:12px;margin-bottom:14px}`);

/* component */
const aComp = `function CalendarView({ board, update, canEdit, onOpenItem, personFilter }) {`;
must(p, aComp, 'calendarview-fn');
p = p.replace(aComp, `function TimelineView({ board, onOpenItem, personFilter }) {
  const dcol = (board.columns || []).find(c => c && c.type === 'date' && /start/i.test(String(c.label || c.name || c.key || ''))) || (board.columns || []).find(c => c && c.type === 'date');
  const pcol = primaryCol(board);
  const hrcol = (board.columns || []).find(c => c && /hr team|recruiter|owner/i.test(String(c.label || c.name || c.key || '')));
  const matchPF = it => !personFilter || personFilter.length === 0 || personFilter.some(f => String(it[f.key]) === String(f.val));
  if (!dcol) {
    return React.createElement(Scaffold, {
      icon: Ic.timeline,
      title: 'No date column on this board',
      desc: 'The timeline spans start dates. Add a date column and it will appear here.'
    });
  }
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parse = s => {
    const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(s || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rows = [];
  (board.groups || []).forEach(g => (g.items || []).forEach(it => {
    if (!isActiveItem(it) || !matchPF(it)) return;
    const d = parse(it[dcol.key]);
    if (!d) return;
    const days = Math.round((d - today) / 86400000);
    if (days < -30 || days > 90) return;
    rows.push({ it: it, g: g, d: d, days: days });
  }));
  if (!rows.length) {
    return React.createElement(Scaffold, {
      icon: Ic.timeline,
      title: 'Nothing to show',
      desc: 'The timeline covers start dates from 30 days ago to 90 days out. No rows fall in that window.'
    });
  }
  let lo = today,
    hi = today;
  rows.forEach(r => {
    if (r.d < lo) lo = r.d;
    if (r.d > hi) hi = r.d;
  });
  lo = new Date(lo.getFullYear(), lo.getMonth(), lo.getDate() - 2);
  hi = new Date(hi.getFullYear(), hi.getMonth(), hi.getDate() + 2);
  const span = Math.max(1, Math.round((hi - lo) / 86400000));
  const pct = d => (Math.round((d - lo) / 86400000) / span) * 100;
  const ticks = [];
  for (let i = 0; i <= span; i++) {
    const d = new Date(lo.getFullYear(), lo.getMonth(), lo.getDate() + i);
    if (span > 45 ? d.getDay() === 1 : true) ticks.push(d);
  }
  const buckets = {};
  rows.forEach(r => {
    const who = hrcol ? String(r.it[hrcol.key] || '').trim() || 'Unassigned' : r.g.title;
    (buckets[who] = buckets[who] || []).push(r);
  });
  const names = Object.keys(buckets).sort((a, b) => a.localeCompare(b));
  const colorOf = it => {
    const o = pcol ? optOf(pcol, it[pcol.key]) : null;
    return (o && o.color) || '#579BFC';
  };
  const short = d => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  return React.createElement('div', { className: 'board-wrap' },
    React.createElement('div', { className: 'cal-bar' },
      React.createElement('div', { className: 'cal-title' }, 'Start dates'),
      React.createElement('span', { style: { fontSize: 13, color: 'var(--sub)' } },
        rows.length + ' people \\u00B7 ' + short(lo) + ' to ' + short(hi) + (hrcol ? ' \\u00B7 grouped by ' + (hrcol.label || hrcol.name) : ''))),
    React.createElement('div', { className: 'tl-wrap' },
      React.createElement('div', { className: 'tl-grid' },
        React.createElement('div', { className: 'tl-axis' },
          React.createElement('div', { className: 'tl-name' }),
          ticks.map((d, i) => React.createElement('div', {
            key: i,
            className: 'tl-tick' + (d.getDay() === 1 ? ' mon' : '')
          }, short(d)))),
        names.map(who => React.createElement(React.Fragment, { key: who },
          React.createElement('div', { className: 'tl-grouphead' }, who + ' \\u00B7 ' + buckets[who].length),
          buckets[who].sort((a, b) => a.d - b.d).map(r => {
            const late = r.days < 0;
            const from = late ? pct(r.d) : pct(today);
            const to = late ? pct(today) : pct(r.d);
            const left = Math.min(from, to);
            const width = Math.max(1.2, Math.abs(to - from));
            const when = r.days === 0 ? 'today' : r.days > 0 ? 'in ' + r.days + 'd' : Math.abs(r.days) + 'd ago';
            return React.createElement('div', { className: 'tl-row', key: r.it.id },
              React.createElement('div', { className: 'tl-name', title: r.it.name }, r.it.name),
              React.createElement('div', { className: 'tl-track' },
                React.createElement('div', {
                  className: 'tl-today',
                  style: { left: pct(today) + '%' }
                }),
                React.createElement('div', {
                  className: 'tl-bar',
                  style: {
                    left: left + '%',
                    width: width + '%',
                    background: late ? '#E2445C' : colorOf(r.it)
                  },
                  title: r.it.name + ' \\u2014 ' + short(r.d) + ' (' + when + ')',
                  onClick: () => onOpenItem && onOpenItem(r.it.id)
                }, short(r.d) + ' \\u00B7 ' + when)));
          }))))));
}
function CalendarView({ board, update, canEdit, onOpenItem, personFilter }) {`);

/* swap the stub */
const aStub = `view === 'timeline' && /*#__PURE__*/React.createElement(Scaffold, {
    icon: Ic.timeline,
    title: "Timeline / Gantt",
    desc: "Horizontal bars from today to each start date across a scrollable axis, grouped by recruiter. Needs a start-window field to span from.",
    bullet: "Next iteration"
  })`;
must(p, aStub, 'timeline-stub');
p = p.replace(aStub, `view === 'timeline' && /*#__PURE__*/React.createElement(TimelineView, {
    board: board,
    onOpenItem: onOpenItem,
    personFilter: pf
  })`);

fs.writeFileSync(PAGE + '.bak-timeline', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  Timeline built: bars from today to each start date');
console.log('OK  grouped by HR team member, late starts shown in red');
console.log('OK  today marked, click a bar to open the item');
console.log('Backup: spark-boards.html.bak-timeline');
