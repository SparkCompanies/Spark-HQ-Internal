/* patch-celeb-balloons.cjs — falling balloons behind the birthdays column.
   Decorative SVG balloons drift down behind the September birthdays list: soft party colours,
   low opacity, sitting behind the text at z-index 0 with pointer-events off so nothing about
   reading or clicking the card changes. Positions and speeds are fixed (no randomness), so the
   card never jitters between renders. Honours prefers-reduced-motion by holding them still.
   They appear only in the birthdays column, and only when there are birthdays that month.
   Run from repo root:  node patch-celeb-balloons.cjs
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
if (x.indexOf('cb-blns') !== -1) throw new Error('Already applied. Aborting.');
if (x.indexOf('HQ_CELEBRATIONS_v3') === -1) throw new Error('Run patch-home-celebrations.cjs first - the Celebrations card is not in this file yet.');
x = repl(x, ".cb-ico{flex:0 0 auto;width:16px;height:16px}\n.cb-none{font-size:12px;color:#b6b0a4;padding:1px 0 3px}\n</style>", ".cb-ico{flex:0 0 auto;width:16px;height:16px}\n.cb-none{font-size:12px;color:#b6b0a4;padding:1px 0 3px}\n/* falling balloons, birthdays column only. Purely decorative: sits behind the text,\n   ignores pointer events, and holds still for anyone who asks for reduced motion. */\n.cb-col{position:relative;overflow:hidden}\n.cb-col>.cb-ct,.cb-col>.cb-row,.cb-col>.cb-none{position:relative;z-index:1}\n.cb-blns{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}\n.cb-bln{position:absolute;top:-42px;width:20px;height:34px;opacity:0;animation:cbFall linear infinite}\n@keyframes cbFall{\n  0%{transform:translate3d(0,-45px,0) rotate(-8deg);opacity:0}\n  12%{opacity:.5}\n  50%{transform:translate3d(9px,50%,0) rotate(7deg)}\n  88%{opacity:.5}\n  100%{transform:translate3d(-6px,var(--cbEnd,340px),0) rotate(-6deg);opacity:0}\n}\n@media(prefers-reduced-motion:reduce){.cb-bln{animation:none;opacity:.22;top:8px}}\n</style>", "balloon css");
x = repl(x, "  function build(j){", "  /* one balloon: body + knot + string, in a soft party palette */\n  function balloon(i){\n    var COL=['#F5C518','#F0908A','#7FB7E8','#9BD4A4','#C9A7E8','#F3B96B'];\n    var c=COL[i%COL.length];\n    var s=document.createElementNS(NS,'svg');\n    s.setAttribute('viewBox','0 0 20 34'); s.setAttribute('class','cb-bln');\n    s.setAttribute('aria-hidden','true');\n    var b=document.createElementNS(NS,'ellipse');\n    b.setAttribute('cx','10'); b.setAttribute('cy','11'); b.setAttribute('rx','7.4'); b.setAttribute('ry','9.2');\n    b.setAttribute('fill',c);\n    var g=document.createElementNS(NS,'ellipse');\n    g.setAttribute('cx','7.4'); g.setAttribute('cy','7.6'); g.setAttribute('rx','2'); g.setAttribute('ry','3');\n    g.setAttribute('fill','#fff'); g.setAttribute('opacity','.45');\n    var k=document.createElementNS(NS,'path');\n    k.setAttribute('d','M10 20.2l-1.5 2h3z'); k.setAttribute('fill',c);\n    var t=document.createElementNS(NS,'path');\n    t.setAttribute('d','M10 22.2c2 3 -2 5 0 8'); t.setAttribute('fill','none');\n    t.setAttribute('stroke',c); t.setAttribute('stroke-width','.9'); t.setAttribute('opacity','.55');\n    s.appendChild(b); s.appendChild(g); s.appendChild(k); s.appendChild(t);\n    return s;\n  }\n  function balloonLayer(count){\n    var lay=el('div','cb-blns');\n    /* deterministic spread: no RNG, so the layout never jitters between renders */\n    var lefts=[6,22,38,54,70,86,14,46,78,30];\n    var durs=[13,16,11,18,14,17,12,15,19,16];\n    for(var i=0;i<count;i++){\n      var b=balloon(i);\n      b.style.left=lefts[i%lefts.length]+'%';\n      b.style.animationDuration=durs[i%durs.length]+'s';\n      b.style.animationDelay=(-i*2.3).toFixed(1)+'s';\n      b.style.setProperty('--cbEnd',(300+(i%4)*60)+'px');\n      lay.appendChild(b);\n    }\n    return lay;\n  }\n  function build(j){", "balloon layer");
x = repl(x, "      var c=el('div','cb-col');\n      c.appendChild(el('div','cb-ct',spec[2]));\n      if(spec[1].length) spec[1].forEach(function(e){c.appendChild(row(e,spec[0]));});\n      else c.appendChild(el('div','cb-none','None this month'));\n      cols.appendChild(c);", "      var c=el('div','cb-col');\n      /* balloons drift down behind the birthdays list only, and only when there are birthdays */\n      if(spec[0]==='b'&&spec[1].length) c.appendChild(balloonLayer(Math.min(6,Math.max(3,spec[1].length+1))));\n      c.appendChild(el('div','cb-ct',spec[2]));\n      if(spec[1].length) spec[1].forEach(function(e){c.appendChild(row(e,spec[0]));});\n      else c.appendChild(el('div','cb-none','None this month'));\n      cols.appendChild(c);", "attach balloons to birthdays column");
fs.writeFileSync(F + '.bak-balloons', read(F));
fs.writeFileSync(F, x);
console.log('OK  balloons drift down behind the birthdays column');
console.log('OK  behind the text, no pointer events, fixed positions (no jitter)');
console.log('OK  held still for prefers-reduced-motion; absent when the month has no birthdays');
console.log('Backup: spark-home.html.bak-balloons');
