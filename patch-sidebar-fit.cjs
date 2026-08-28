/* patch-sidebar-fit.cjs — stop the Workspaces list being squeezed into a sliver
   The workspaces section only got the leftover height after nav + favorites, so it
   scrolled inside ~90px. This makes it the flexible one that claims the remaining
   space, and caps Favorites so a long list cannot starve it.
   Safe to run whether or not patch-sidebar-b has been applied.
   Run from the repo root:  node patch-sidebar-fit.cjs
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
if (p.indexOf('ws-scroll') !== -1) throw new Error('Sidebar fit patch already applied. Aborting.');

const aCss = `  .side-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6E6E7C;padding:14px 12px 7px}`;
must(p, aCss, 'css-sidelabel');
p = p.replace(aCss, `  .side-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6E6E7C;padding:14px 12px 7px}
  .side-label.tight{padding-top:10px}
  .fav-list{max-height:20vh;overflow-y:auto;flex-shrink:0}
  .ws-scroll{flex:1 1 auto;min-height:140px;overflow-y:auto}
  .sidebar>.side-section:first-of-type{flex-shrink:0}
  .sidebar .side-foot{flex-shrink:0}`);

/* favorites list gets the cap */
const aFav = `    className: "side-section",
    style: {
      paddingTop: 0
    }
  }, favs.filter(sideMatch).map(b =>`;
must(p, aFav, 'fav-section');
p = p.replace(aFav, `    className: "side-section fav-list",
    style: {
      paddingTop: 0
    }
  }, favs.filter(sideMatch).map(b =>`);

/* workspaces list claims the remaining height */
const aWs = `    className: "side-section",
    style: {
      paddingTop: 0,
      overflowY: 'auto'
    }
  },`;
must(p, aWs, 'ws-section');
p = p.replace(aWs, `    className: "side-section ws-scroll",
    style: {
      paddingTop: 0
    }
  },`);

fs.writeFileSync(PAGE + '.bak-sidebarfit', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  Workspaces list now claims the leftover sidebar height');
console.log('OK  Favorites capped at 20% of the sidebar so it cannot starve it');
console.log('Backup: spark-boards.html.bak-sidebarfit');
