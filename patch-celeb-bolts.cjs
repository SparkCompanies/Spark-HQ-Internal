/* patch-celeb-bolts.cjs — raining lightning bolts behind the anniversaries column.
   Mirrors the balloons: decorative SVG bolts in Spark gold fall behind the anniversaries list,
   sitting at z-index 0 with pointer-events off so reading and clicking are unchanged. Fixed
   positions and speeds (no randomness, no jitter), a subtle flicker in the opacity keyframes, and
   they hold still for prefers-reduced-motion. Bolt lanes and timings are deliberately offset from
   the balloon lanes so the two columns do not look copy-pasted. Appear only when the month has
   anniversaries.
   Requires patch-celeb-balloons.cjs to have run first (it shares that layer's CSS scaffolding).
   Run from repo root:  node patch-celeb-bolts.cjs
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
if (x.indexOf('cb-bolt') !== -1) throw new Error('Already applied. Aborting.');
if (x.indexOf('cb-blns') === -1) throw new Error('Run patch-celeb-balloons.cjs first - the bolts reuse that layer scaffolding.');
x = repl(x, "@media(prefers-reduced-motion:reduce){.cb-bln{animation:none;opacity:.22;top:8px}}\n</style>", "@media(prefers-reduced-motion:reduce){.cb-bln{animation:none;opacity:.22;top:8px}}\n/* raining lightning bolts, anniversaries column only. Same rules as the balloons:\n   behind the text, no pointer events, fixed timings, still for reduced motion. */\n.cb-bolt{position:absolute;top:-34px;width:13px;height:26px;opacity:0;animation:cbRain linear infinite}\n@keyframes cbRain{\n  0%{transform:translate3d(0,-36px,0) rotate(-10deg);opacity:0}\n  10%{opacity:.55}\n  45%{opacity:.28}\n  60%{opacity:.6}\n  90%{opacity:.4}\n  100%{transform:translate3d(-5px,var(--cbEnd,340px),0) rotate(8deg);opacity:0}\n}\n@media(prefers-reduced-motion:reduce){.cb-bolt{animation:none;opacity:.24;top:8px}}\n</style>", "bolt css");
x = repl(x, "  function build(j){", "  /* one bolt, in Spark gold with a lighter core so it reads at low opacity */\n  function bolt(i){\n    var COL=['#F5C518','#D4A017','#FFC800','#E8B33A'];\n    var c=COL[i%COL.length];\n    var s=document.createElementNS(NS,'svg');\n    s.setAttribute('viewBox','0 0 13 26'); s.setAttribute('class','cb-bolt');\n    s.setAttribute('aria-hidden','true');\n    var p=document.createElementNS(NS,'path');\n    p.setAttribute('d','M8.2 0 1 14.4h4.2L4.4 26 12 10.6H7.6z');\n    p.setAttribute('fill',c);\n    var hi=document.createElementNS(NS,'path');\n    hi.setAttribute('d','M7.6 3.2 3.6 12.2h2.2z');\n    hi.setAttribute('fill','#fff'); hi.setAttribute('opacity','.42');\n    s.appendChild(p); s.appendChild(hi);\n    return s;\n  }\n  function boltLayer(count){\n    var lay=el('div','cb-blns');\n    /* offset from the balloon lanes so the two columns do not look copy-pasted */\n    var lefts=[12,30,48,66,84,20,58,76,38,90];\n    var durs=[9,12,8,13,10,11,14,9,12,10];\n    for(var i=0;i<count;i++){\n      var b=bolt(i);\n      b.style.left=lefts[i%lefts.length]+'%';\n      b.style.animationDuration=durs[i%durs.length]+'s';\n      b.style.animationDelay=(-i*1.7).toFixed(1)+'s';\n      b.style.setProperty('--cbEnd',(300+(i%4)*60)+'px');\n      lay.appendChild(b);\n    }\n    return lay;\n  }\n  function build(j){", "bolt builders");
x = repl(x, "      if(spec[0]==='b'&&spec[1].length) c.appendChild(balloonLayer(Math.min(6,Math.max(3,spec[1].length+1))));", "      if(spec[0]==='b'&&spec[1].length) c.appendChild(balloonLayer(Math.min(6,Math.max(3,spec[1].length+1))));\n      if(spec[0]==='a'&&spec[1].length) c.appendChild(boltLayer(Math.min(7,Math.max(4,spec[1].length+2))));", "attach bolts");
fs.writeFileSync(F + '.bak-bolts', read(F));
fs.writeFileSync(F, x);
console.log('OK  lightning bolts rain behind the anniversaries column');
console.log('OK  offset lanes and faster timings than the balloons, with a subtle flicker');
console.log('OK  behind the text, no pointer events, still for reduced motion, absent when empty');
console.log('Backup: spark-home.html.bak-bolts');
