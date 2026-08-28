/* patch-sidebar-rail.cjs — fix collapsed sidebar showing wrapped board names
   The Favorites list renders bare .board-row buttons (no .board-row-wrap), so the
   rail rules missed them. Hides every board/folder row in rail mode and clamps
   overflow so nothing can spill.
   Run from the repo root:  node patch-sidebar-rail.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
let p = read(PAGE);
const a = `  .sidebar.rail .sb-hdr{padding:2px 0 8px;justify-content:center}`;
const n = p.split(a).length - 1;
if (n !== 1) throw new Error('ANCHOR rail-css: expected 1 match, found ' + n + '. Run patch-sidebar-a.cjs first. Aborting.');
if (p.indexOf('rail-fix') !== -1) throw new Error('Rail fix already applied. Aborting.');

p = p.replace(a, `  .sidebar.rail .sb-hdr{padding:2px 0 8px;justify-content:center}
  /* rail-fix: nothing but the nav icons survives collapse */
  .sidebar.rail{overflow:hidden}
  .sidebar.rail .board-row,.sidebar.rail .fold-head,.sidebar.rail .fold-kids,
  .sidebar.rail .ws-menu,.sidebar.rail .sb-empty,.sidebar.rail .ws-count{display:none}
  .sidebar.rail .side-section{overflow:hidden;white-space:nowrap}
  .sidebar.rail .nav-item svg{opacity:1}`);

fs.writeFileSync(PAGE + '.bak-railfix', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  collapsed sidebar now shows icons only');
console.log('Backup: spark-boards.html.bak-railfix');
