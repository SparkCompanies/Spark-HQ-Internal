/* patch-warn-links-fix.cjs — two fixes
   1. board.sfInstance was assigned AFTER the board was saved, so it never persisted
      and the Salesforce link icons had no base URL to build from. Now set before.
   2. The warning chip carried "N - started 4d ago" inline and squeezed the candidate
      name. It is now just the icon and the count; the timing moves to the tooltip.
   Patches BOTH files. Run from the repo root:  node patch-warn-links-fix.cjs
   Then deploy the worker, push, and run Sync with Salesforce again.
*/
const fs = require('fs');
const path = require('path');
const WORKER = path.join('worker', 'cloudworker.js');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}

/* ---------------- worker: set the instance BEFORE saving ---------------- */
let w = read(WORKER);
if (w.indexOf('sfInstance') === -1) throw new Error('Run patch-sf-links.cjs first. Aborting.');
if (w.indexOf('/* instance before save */') !== -1) throw new Error('Worker already fixed. Aborting.');

const aLate = `        let sfInstance = "";
        try {
          const tk = await getSalesforceToken(env);
          sfInstance = tk.instance_url || "";
        } catch (e) {}
        board.sfInstance = sfInstance;
`;
must(w, aLate, 'late-instance');
w = w.replace(aLate, '');

const aSave = `        const save = await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: boardId,
          data: board,`;
must(w, aSave, 'sync-save');
w = w.replace(aSave, `        /* instance before save */
        try {
          const tk = await getSalesforceToken(env);
          if (tk && tk.instance_url) board.sfInstance = tk.instance_url;
        } catch (e) {}
        const save = await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: boardId,
          data: board,`);

/* ---------------- page: compact chip ---------------- */
let p = read(PAGE);
if (p.indexOf('function WarnChip') === -1) throw new Error('Run patch-hire-warnings.cjs first. Aborting.');
if (p.indexOf('warn-compact') !== -1) throw new Error('Page already fixed. Aborting.');

const aChip = `  }, React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  }, React.createElement('path', { d: 'M10.3 4.3 2.5 18a1.9 1.9 0 0 0 1.7 2.8h15.6A1.9 1.9 0 0 0 21.5 18L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z' }),
     React.createElement('path', { d: 'M12 9.5v4' }),
     React.createElement('path', { d: 'M12 17h.01' })), risk.open.length + ' \\u00B7 ' + when);`;
must(p, aChip, 'warn-chip-body');
p = p.replace(aChip, `  }, React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round'
  }, React.createElement('path', { d: 'M10.3 4.3 2.5 18a1.9 1.9 0 0 0 1.7 2.8h15.6A1.9 1.9 0 0 0 21.5 18L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z' }),
     React.createElement('path', { d: 'M12 9.5v4' }),
     React.createElement('path', { d: 'M12 17h.01' })), String(risk.open.length));`);

const aTitle = `    title: 'Starts ' + (risk.days < 0 ? Math.abs(risk.days) + ' days ago' : 'in ' + risk.days + ' days') + ' \\u2014 still open:\\n\\u2022 ' + risk.open.join('\\n\\u2022 ')`;
must(p, aTitle, 'warn-title');
p = p.replace(aTitle, `    title: (risk.days < 0 ? 'Started ' + Math.abs(risk.days) + ' days ago' : risk.days === 0 ? 'Starts today' : 'Starts in ' + risk.days + ' days') + ' \\u2014 ' + risk.open.length + ' still open:\\n\\u2022 ' + risk.open.join('\\n\\u2022 ')`);

const aCss = `  .warn-chip{flex-shrink:0;display:flex;align-items:center;gap:3px;height:20px;padding:0 6px;border-radius:6px;font:700 10.5px/1 'Jost',sans-serif;cursor:default;margin-right:2px}`;
must(p, aCss, 'warn-css');
p = p.replace(aCss, `  /* warn-compact: icon and count only, so the name keeps its width */
  .warn-chip{flex-shrink:0;display:flex;align-items:center;gap:2px;height:19px;padding:0 5px;border-radius:6px;font:700 10.5px/1 'Jost',sans-serif;cursor:default;margin-right:2px}`);

/* the Salesforce link should not be hover-only - it was easy to miss */
const aLinkCss = `  tr:hover .sf-link{opacity:1}`;
must(p, aLinkCss, 'sflink-hover');
p = p.replace(aLinkCss, `  .sf-link{opacity:.55}
  tr:hover .sf-link{opacity:1}`);

fs.writeFileSync(WORKER + '.bak-wlfix', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-wlfix', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  Salesforce instance URL now saved with the board (links can build)');
console.log('OK  warning chip is icon + count only; timing moved to the tooltip');
console.log('OK  link icons are faintly visible instead of hover-only');
console.log('Backups: *.bak-wlfix');
