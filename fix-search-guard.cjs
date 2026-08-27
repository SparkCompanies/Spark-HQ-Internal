const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
if (h.indexOf('__sbNoSave') !== -1) { console.log('already applied'); process.exit(1); }
const done = [];
function sub(n, from, to) {
  const i = h.indexOf(from);
  if (i === -1) { console.log('MISS  ' + n); return; }
  if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG ' + n); return; }
  h = h.slice(0, i) + to + h.slice(i + from.length);
  done.push(n);
}
sub('flag', 'function filterBoardRows(b, q) {\n  if (!b || !q) return b;',
            'function filterBoardRows(b, q) {\n  try { window.__sbNoSave = !!q; } catch (e) {}\n  if (!b || !q) return b;');
sub('guard', '  board(b) {\n    if (!LIVE || !b) return;',
             "  board(b) {\n    if (!LIVE || !b) return;\n    if (typeof window !== 'undefined' && window.__sbNoSave) {\n      sbFlash('Clear the search box before editing. Changes are not saved while filtered.');\n      return;\n    }");
if (done.length !== 2) { console.log('APPLIED ' + done.length + '/2. NOT WRITTEN.'); process.exit(1); }
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED: ' + done.join(', '));
