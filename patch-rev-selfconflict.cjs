/* patch-rev-selfconflict.cjs — stop the board conflicting with yourself
   The revision token lived on the board OBJECT. A cell patch advances the server's
   revision, but a copy of the board made before that response landed (every render
   while the search box has text makes one) still carried the old token. The next
   full save then sent a stale revision and the server correctly reported a conflict
   -- against yourself.
   Fix: keep revisions in one map keyed by board id, written by both save paths.
   Plus: if the other saver really is you, retry silently instead of prompting.
   Run from the repo root:  node patch-rev-selfconflict.cjs
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
if (p.indexOf('SB_REVS') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('Persist.cell') === -1) throw new Error('Run patch-cell-save.cjs first. Aborting.');

/* 1. one revision store for the whole app */
const aOpen = `const Persist = {`;
must(p, aOpen, 'persist-open');
p = p.replace(aOpen, `/* revisions live here, not on board objects, so a stale copy cannot carry an old one */
const SB_REVS = {};
const sbRev = b => b && b.id ? (SB_REVS[b.id] || b.__rev || null) : null;
const sbSetRev = (b, rev) => {
  if (!b || !b.id || !rev) return;
  SB_REVS[b.id] = rev;
  try {
    b.__rev = rev;
  } catch (e) {}
};
const sbIsMe = who => {
  try {
    return !!who && String(who).toLowerCase() === String((sparkMe() || {}).email || '').toLowerCase();
  } catch (e) {
    return false;
  }
};
const Persist = {`);

/* 2. full save reads and writes the store */
const aBase = `        baseRev: b.__rev || null,`;
must(p, aBase, 'baserev');
p = p.replace(aBase, `        baseRev: sbRev(b),`);

const aSetA = `    }).then(d => {
      if (d && d.rev) b.__rev = d.rev;
    });
    send(false).catch(e => {`;
must(p, aSetA, 'board-then');
p = p.replace(aSetA, `    }).then(d => {
      if (d && d.rev) sbSetRev(b, d.rev);
    });
    send(false).catch(e => {`);

/* 3. a conflict against yourself is a stale token, not a collision - retry silently */
const aPrompt = `        if (confirm('Heads up: ' + (by || 'someone else') + ' saved this board while you had it open.\\n\\nOK = keep YOUR version (overwrites theirs).\\nCancel = reload and take theirs (your last change is lost).')) {`;
must(p, aPrompt, 'board-prompt');
p = p.replace(aPrompt, `        if (sbIsMe(by)) {
          send(true).catch(e2 => sbFlash('NOT SAVED. ' + (e2 && e2.message ? e2.message : '')));
          return;
        }
        if (confirm('Heads up: ' + (by || 'someone else') + ' saved this board while you had it open.\\n\\nOK = keep YOUR version (overwrites theirs).\\nCancel = reload and take theirs (your last change is lost).')) {`);

/* 4. same for the cell path */
const aCellThen = `    }).then(d => {
      if (d && d.rev) b.__rev = d.rev;
    });
    const run = () => post(false).catch(e => {`;
must(p, aCellThen, 'cell-then');
p = p.replace(aCellThen, `    }).then(d => {
      if (d && d.rev) sbSetRev(b, d.rev);
    });
    const run = () => post(false).catch(e => {`);

const aCellPrompt = `        const what = cells.length && cells[0].item ? '"' + cells[0].item + '"' : 'this row';`;
must(p, aCellPrompt, 'cell-prompt');
p = p.replace(aCellPrompt, `        if (sbIsMe(by)) {
          return post(true).catch(e2 => sbFlash('NOT SAVED. ' + (e2 && e2.message ? e2.message : '')));
        }
        const what = cells.length && cells[0].item ? '"' + cells[0].item + '"' : 'this row';`);

/* 5. seed the store when boards load */
const aLoad = `          const clean = bs.map(b => {`;
must(p, aLoad, 'boards-load');
p = p.replace(aLoad, `          bs.forEach(b => {
            if (b && b.id && b.__rev) SB_REVS[b.id] = b.__rev;
          });
          const clean = bs.map(b => {`);

fs.writeFileSync(PAGE + '.bak-revfix', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  revisions tracked per board id, not per board object');
console.log('OK  a conflict against your own email retries silently');
console.log('Backup: spark-boards.html.bak-revfix');
