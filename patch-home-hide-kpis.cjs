/* patch-home-hide-kpis.cjs — park the four KPI tiles on the home page.
   Hides the strip (ON PAYROLL, OPEN PIPELINE, HOURS LOGGED, OVERDUE AR) with display:none rather
   than deleting it, because five other places in this file still write to those elements
   (#kpiHc, #kpiPipe, #kpiHrs, #kpiAr and the .kpi .big[data-live="sf"] selectors, plus the AR
   drawer's updateArKpi). Hiding keeps every one of those writes harmless; deleting the markup
   would leave them writing to nothing.
   To bring the strip back: delete the style="display:none" attribute on <section class="kpis">.
   Run from repo root:  node patch-home-hide-kpis.cjs
*/
const fs = require('fs');
const F = 'spark-home.html';
function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
function repl(s, oldStr, newStr, label){
  const n = s.split(oldStr).length - 1;
  if(n !== 1) throw new Error('ANCHOR '+label+': expected 1 match, found '+n+'. Nothing written.');
  return s.replace(oldStr, () => newStr);
}
let x = read(F);
if (x.indexOf('KPIS_HIDDEN_v1') !== -1) throw new Error('Already applied. Aborting.');
x = repl(x, "    <section class=\"kpis\"><!-- HOME_DEFAKE_v1 -->", "    <!-- KPIS_HIDDEN_v1 — KPI strip parked. Remove style=\"display:none\" below to bring it back. -->\n    <section class=\"kpis\" style=\"display:none\"><!-- HOME_DEFAKE_v1 -->", 'hide kpi strip');
fs.writeFileSync(F + '.bak-hidekpis', read(F));
fs.writeFileSync(F, x);
console.log('OK  KPI strip hidden (On payroll, Open pipeline, Hours logged, Overdue AR)');
console.log('OK  elements kept in place, so the scripts that write to them stay harmless');
console.log('Backup: spark-home.html.bak-hidekpis');
