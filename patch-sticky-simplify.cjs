/* patch-sticky-simplify.cjs — one sticky layer instead of two
   The group title bar was pinned at top:0 and the column header at top:46px. Between
   groups neither covers that 46px strip, so rows scroll through it. This drops the
   sticky group title and pins the column header at top:0, so nothing can appear above
   the header. Group titles scroll normally, like every other row of content.
   Run from the repo root:  node patch-sticky-simplify.cjs
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
if (p.indexOf('sticky-hdr') === -1) throw new Error('Run patch-sticky-header.cjs first. Aborting.');
if (p.indexOf('single-sticky') !== -1) throw new Error('Already applied. Aborting.');

const aCss = `  .board-wrap.scroller .group-head{position:sticky;top:0;z-index:6;background:var(--bg);padding:14px 0 8px;margin-bottom:0;height:46px;box-sizing:border-box}
  .board-wrap.scroller .tbl thead th{position:sticky;top:46px;z-index:5}`;
must(p, aCss, 'sticky-css');
p = p.replace(aCss, `  /* single-sticky: only the column header pins, so no strip can show rows */
  .board-wrap.scroller .group-head{padding:14px 0 8px;margin-bottom:0;height:46px;box-sizing:border-box}
  .board-wrap.scroller .tbl thead th{position:sticky;top:0;z-index:5;box-shadow:0 1px 0 var(--border)}`);

fs.writeFileSync(PAGE + '.bak-stickysimple', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  only the column header is sticky now, pinned to the very top');
console.log('OK  group titles scroll normally - no gap for rows to show through');
console.log('Backup: spark-boards.html.bak-stickysimple');
