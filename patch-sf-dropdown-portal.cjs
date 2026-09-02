/* patch-sf-dropdown-portal.cjs — the "type a name to pull candidates from Salesforce" dropdown
   was rendering behind other cells. The ITEM column is a sticky column (position:sticky; z-index:1),
   which creates a stacking context. The dropdown is position:fixed; z-index:9999, but that 9999 only
   ranks INSIDE the sticky cell's context, so sibling sticky cells paint over it.
   FIX: render the dropdown through ReactDOM.createPortal onto document.body so it escapes the sticky
   cell's stacking context. Position is already fixed/viewport-based, so it lands in the same spot.
   Run from repo root:  node patch-sf-dropdown-portal.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';
function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
function repl(s, oldStr, newStr, label){
  const n = s.split(oldStr).length - 1;
  if(n !== 1) throw new Error('ANCHOR '+label+': expected 1 match, found '+n+'. The Salesforce name-search code differs from what I patched against (likely the "Add files via upload" commits moved it). Send me the current spark-boards.html and I will re-anchor. Nothing written.');
  return s.replace(oldStr, newStr);
}
let p = read(PAGE);
if(p.indexOf('ReactDOM.createPortal(React.createElement(\'div\', { style: menuStyle }') !== -1) throw new Error('Already applied. Aborting.');

p = repl(p,
`    open && React.createElement('div', { style: menuStyle },`,
`    open && ReactDOM.createPortal(React.createElement('div', { style: menuStyle },`,
'menu portal open');

p = repl(p,
`(r.status || ''))))));`,
`(r.status || ''))))), document.body));`,
'menu portal close');

fs.writeFileSync(PAGE + '.bak-sfdrop', read(PAGE));
fs.writeFileSync(PAGE, p);
console.log('OK  Salesforce name-search dropdown now renders via portal on document.body');
console.log('OK  it escapes the sticky ITEM column stacking context, so it sits above the cells');
console.log('Backup:', PAGE + '.bak-sfdrop');
