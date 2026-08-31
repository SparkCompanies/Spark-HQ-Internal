/* patch-hire-warnings.cjs — flag hires at risk before the start date
   A row is flagged when it has a start date inside the next 14 days (or already
   past) and one or more onboarding status columns are not done. The severity
   follows how close the start is:
     overdue  - start date has passed and steps are still open
     urgent   - starts within 3 days
     soon     - starts within 14 days
   Shows a warning chip on the row listing exactly what is outstanding, and a count
   in each group header so Maryam and Tamika can see the problem children at a glance.
   Run from the repo root:  node patch-hire-warnings.cjs
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
if (p.indexOf('hireRisk') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('function SfLink') === -1) throw new Error('Run patch-sf-links.cjs first. Aborting.');

/* 1. CSS */
const aCss = `  .sf-link{flex-shrink:0;`;
must(p, aCss, 'sflink-css');
p = p.replace(aCss, `  .warn-chip{flex-shrink:0;display:flex;align-items:center;gap:3px;height:20px;padding:0 6px;border-radius:6px;font:700 10.5px/1 'Jost',sans-serif;cursor:default;margin-right:2px}
  .warn-chip svg{width:12px;height:12px}
  .warn-chip.overdue{background:#FDE2E0;color:#B4261B}
  .warn-chip.urgent{background:#FCE9CF;color:#9A5B00}
  .warn-chip.soon{background:#FFF4CC;color:#8A6A00}
  .group-risk{margin-left:8px;padding:1px 8px;border-radius:999px;font:700 11px/1.7 'Jost',sans-serif;background:#FDE2E0;color:#B4261B;display:inline-block}
  .sf-link{flex-shrink:0;`);

/* 2. the risk calculation + chip */
const aComp = `function SfLink({ board, recId, label }) {`;
must(p, aComp, 'sflink-fn');
p = p.replace(aComp, `/* hireRisk: which onboarding steps are still open, and how close is the start */
function hireRisk(board, it) {
  const dcol = (board.columns || []).find(c => c && c.type === 'date' && /start/i.test(String(c.label || c.name || c.key || '')));
  const raw = dcol ? String(it[dcol.key] || '').slice(0, 10) : '';
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)) return null;
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const parts = raw.split('-');
  const sd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const days = Math.round((sd - t0) / 86400000);
  if (days > 14) return null;
  const skip = /^(type|position|company|entity|hr team member|started in sf|progress|on-boarding status)$/i;
  const open = [];
  (board.columns || []).forEach(c => {
    if (!c || c.type !== 'status') return;
    const label = String(c.label || c.name || c.key || '');
    if (skip.test(label.trim())) return;
    const o = optOf(c, it[c.key]);
    if (!o || !o.label) {
      open.push(label);
      return;
    }
    if (!isDoneLabel(o.label) && !/not applicable|n\\/a|clear|waived|received|synced/i.test(o.label)) open.push(label);
  });
  if (!open.length) return null;
  const level = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : 'soon';
  return { level: level, days: days, open: open };
}
function WarnChip({ risk }) {
  if (!risk) return null;
  const when = risk.days < 0 ? 'started ' + Math.abs(risk.days) + 'd ago' : risk.days === 0 ? 'starts today' : 'in ' + risk.days + 'd';
  return React.createElement('span', {
    className: 'warn-chip ' + risk.level,
    title: 'Starts ' + (risk.days < 0 ? Math.abs(risk.days) + ' days ago' : 'in ' + risk.days + ' days') + ' \\u2014 still open:\\n\\u2022 ' + risk.open.join('\\n\\u2022 ')
  }, React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  }, React.createElement('path', { d: 'M10.3 4.3 2.5 18a1.9 1.9 0 0 0 1.7 2.8h15.6A1.9 1.9 0 0 0 21.5 18L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z' }),
     React.createElement('path', { d: 'M12 9.5v4' }),
     React.createElement('path', { d: 'M12 17h.01' })), risk.open.length + ' \\u00B7 ' + when);
}
function SfLink({ board, recId, label }) {`);

/* 3. chip on the row */
const aItem = `       })), /*#__PURE__*/React.createElement(SfLink, {
        board: board,
        recId: it.sf_cand_id,`;
must(p, aItem, 'item-cell');
p = p.replace(aItem, `       })), /*#__PURE__*/React.createElement(WarnChip, {
        risk: hireRisk(board, it)
      }), /*#__PURE__*/React.createElement(SfLink, {
        board: board,
        recId: it.sf_cand_id,`);

/* 4. count in the group header */
const aCount = `    }, shown.length, " items · ", done, " done")),`;
must(p, aCount, 'group-count');
p = p.replace(aCount, `    }, shown.length, " items · ", done, " done"), (() => {
      const n = shown.filter(x => hireRisk(board, x)).length;
      return n > 0 ? /*#__PURE__*/React.createElement("span", {
        className: "group-risk",
        title: "Rows starting soon with onboarding steps still open"
      }, n, " at risk") : null;
    })()),`);

fs.writeFileSync(PAGE + '.bak-warn', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  warning chip on rows starting within 14 days with open steps');
console.log('OK  hover the chip to see exactly what is outstanding');
console.log('OK  "N at risk" count in each group header');
console.log('Backup: spark-boards.html.bak-warn');
