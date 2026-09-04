/* patch-celeb-header.cjs — give the Celebrations header some presence.
   Before: a 10px all-caps gold label and a count, sitting on a flat hairline.
   After: a gold badge holding a bolt mark, a two-line title stack ("This month at Spark" over
   "Celebrations" at 19px), a soft radial gold wash behind the band, and a gradient rule that
   fades out to the right instead of a flat border. The count pill stays on the right and hides
   below 520px so the title never gets squeezed.
   Requires patch-celeb-v4.cjs.
   Run from repo root:  node patch-celeb-header.cjs
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
if (x.indexOf('cb-badge') !== -1) throw new Error('Already applied. Aborting.');
if (x.indexOf('cb-av') === -1) throw new Error('Run patch-celeb-v4.cjs first.');
x = repl(x, ".cb-head{display:flex;align-items:baseline;gap:10px;padding:15px 20px 12px;border-bottom:1px solid rgba(184,145,46,.16)}\n.cb-eyebrow{font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#B8912E}\n.cb-sub{font-size:11.5px;color:#9a948a;margin-left:auto}", ".cb-head{position:relative;display:flex;align-items:center;gap:13px;padding:16px 20px 15px;overflow:hidden;\n  background:radial-gradient(120% 180% at 0% 0%,rgba(245,197,24,.16),rgba(245,197,24,.03) 46%,transparent 70%)}\n.cb-head::after{content:\"\";position:absolute;left:0;right:0;bottom:0;height:1px;\n  background:linear-gradient(90deg,rgba(184,145,46,.55),rgba(184,145,46,.16) 42%,transparent)}\n/* icon badge */\n.cb-badge{position:relative;flex:0 0 auto;width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;\n  background:linear-gradient(140deg,#F5C518,#DFA512);box-shadow:0 3px 10px rgba(184,145,46,.38),inset 0 1px 0 rgba(255,255,255,.5)}\n.cb-badge svg{width:19px;height:19px;display:block}\n.cb-badge::after{content:\"\";position:absolute;inset:-4px;border-radius:15px;border:1px solid rgba(245,197,24,.35);opacity:.9}\n/* title stack */\n.cb-hstack{display:flex;flex-direction:column;min-width:0;line-height:1.15}\n.cb-eyebrow{font-size:9.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#B8912E;opacity:.95}\n.cb-title{font-size:19px;font-weight:700;letter-spacing:-.015em;color:#171614;margin-top:1px}\n.cb-sub{margin-left:auto;flex:0 0 auto;display:flex;align-items:center;gap:8px}\n@media(max-width:520px){.cb-title{font-size:17px}.cb-sub{display:none}}", "header css");
x = repl(x, "    var h=el('div','cb-head');\n    h.appendChild(el('div','cb-eyebrow','Celebrations'));", "    var h=el('div','cb-head');\n    /* gold badge holding a bolt-in-a-spark mark */\n    var badge=el('div','cb-badge');\n    var bsvg=document.createElementNS(NS,'svg');\n    bsvg.setAttribute('viewBox','0 0 24 24'); bsvg.setAttribute('aria-hidden','true');\n    var bp=document.createElementNS(NS,'path');\n    bp.setAttribute('d','M13.6 2 5.4 13.6h4.9L8.9 22l8.4-11.9h-5z');\n    bp.setAttribute('fill','#2a2205');\n    bsvg.appendChild(bp);\n    badge.appendChild(bsvg);\n    h.appendChild(badge);\n    var stack=el('div','cb-hstack');\n    stack.appendChild(el('div','cb-eyebrow','This month at Spark'));\n    stack.appendChild(el('div','cb-title','Celebrations'));\n    h.appendChild(stack);", "header markup");
fs.writeFileSync(F + '.bak-header', read(F));
fs.writeFileSync(F, x);
console.log('OK  gold badge with a bolt mark, two-line title stack');
console.log('OK  radial gold wash behind the header, gradient rule that fades right');
console.log('OK  count pill stays right; hidden on narrow screens so the title never squeezes');
console.log('Backup: spark-home.html.bak-header');
