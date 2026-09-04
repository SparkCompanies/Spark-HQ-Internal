/* patch-swa-staging.cjs — stage only the real pages for the Azure deploy.
   The workflow ran "cp *.html site/", which copied all 37 root HTML files - including 21 backups
   (index.backup-*, *.bak.html, spark-home.backup-*, index.2026-*). Two problems with that: it
   bloats the deploy payload, and every one of those old backups was being PUBLISHED to the live
   site where anyone could fetch it by URL.
   This filters them out (16 real pages staged, 21 backups skipped - verified against your actual
   root listing) and prints the staged list so the build log shows exactly what shipped.
   NOTE: this may or may not be the cause of today's exit-code-1 failure - the real error line was
   buried under npm noise. It is worth doing regardless, and it rules out payload size as a cause.
   Run from repo root:  node patch-swa-staging.cjs
*/
const fs = require('fs');
const F = '.github/workflows/azure-static-web-apps-red-dune-014d74810.yml';
function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
let x = read(F);
if (x.indexOf('Stage only the real pages') !== -1) throw new Error('Already applied. Aborting.');
const OLD = "      - name: Stage site\n        run: |\n          mkdir -p site\n          cp *.html site/\n          cp *.mp4 *.png *.jpg *.svg *.pdf *.webm *.mp3 site/ 2>/dev/null || true\n          cp staticwebapp.config.json site/staticwebapp.config.json";
const NEW = "      - name: Stage site\n        run: |\n          mkdir -p site\n          # Stage only the real pages. \"cp *.html site/\" also published every backup at the\n          # repo root (index.backup-*, *.bak.html, spark-home.backup-*, index.2026-*), which\n          # bloated the deploy and, worse, made those old copies fetchable on the live site.\n          for f in *.html; do\n            case \"$f\" in\n              *.backup-*|*.bak.html|*.bak-*|index.2026-*) continue ;;\n            esac\n            cp \"$f\" site/\n          done\n          cp *.mp4 *.png *.jpg *.svg *.pdf *.webm *.mp3 site/ 2>/dev/null || true\n          cp staticwebapp.config.json site/staticwebapp.config.json\n          echo \"Staged $(ls site/*.html | wc -l) pages:\"\n          ls site/*.html | sed 's|site/|  |'";
const n = x.split(OLD).length - 1;
if (n !== 1) throw new Error('ANCHOR Stage site: expected 1 match, found ' + n + '. The workflow differs from the copy I read. Nothing written.');
x = x.replace(OLD, () => NEW);
fs.writeFileSync(F + '.bak-staging', read(F));
fs.writeFileSync(F, x);
console.log('OK  staging now skips the 21 backup HTML files (16 real pages ship)');
console.log('OK  build log will list exactly what was staged');
console.log('Backup: ' + F + '.bak-staging');
