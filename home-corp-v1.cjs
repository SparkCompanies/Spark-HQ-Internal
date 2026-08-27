#!/usr/bin/env node
/* ============================================================================
   HOME_CORP_v1 — Spark HQ home page: "clean corporate intranet" pass
   ----------------------------------------------------------------------------
   What this does (presentation layer only — every data/JS feature survives):
     1. Kills the demo tells: picsum stock-photo video slot + thumbs, values
        marquee (ticker stays — it is the ONE moving strip, and it is live data)
     2. Unifies surfaces: quick-action tiles go light to match the card system
        (no more dark/light patchwork down the page)
     3. Retires the gimmicks: 3D tilt, cursor border-beam, button sheen sweep,
        gradient-clipped KPI text, shake/flash/embers/bolt dead code
     4. Removes dead CSS (sidebar/topbar/brands/wehelp never render on this page)
     5. Hero becomes a calm two-column band: core-values spotlight (rotation
        kept, ids kept) + a quiet "This week at Spark" panel (heroClassLine and
        thumbPulse ids kept so existing JS keeps working untouched)
     6. Caps content sections at 1400px so ultrawide reads intranet, not demo

   Usage:
     node home-corp-v1.cjs --check <file>   # dry run: report every anchor, write nothing
     node home-corp-v1.cjs <file>           # apply: timestamped backup, then patch

   Safety: all edits are staged in memory; the file is only written if every
   anchor resolves and post-patch verification passes. Backup is written first.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const target = args.filter(a => a !== '--check')[0] || 'home.html';

if (!fs.existsSync(target)) { console.error('✖ File not found: ' + target); process.exit(1); }
let src = fs.readFileSync(target, 'utf8');
const EOL = src.includes('\r\n') ? '\r\n' : '\n';

/* ---- target sanity guard: make sure this is actually the HQ home page ---- */
const SANITY = ['<title>Spark Home</title>', 'HOME_DEFAKE_v1', 'CAL_BAND_v1'];
for (const s of SANITY) {
  if (!src.includes(s)) { console.error('✖ Sanity guard failed — "' + s + '" not found. Is ' + target + ' the HQ home page?'); process.exit(1); }
}

/* ---------------------------- op machinery ------------------------------- */
const misses = [];
const applied = [];
let out = src;

function idxOf(hay, needle, label) {
  const i = hay.indexOf(needle);
  if (i < 0) misses.push(label + '  — anchor not found: ' + JSON.stringify(needle.slice(0, 70)) + (needle.length > 70 ? '…' : ''));
  return i;
}
/* replace one exact string */
function rep(label, from, to) {
  const i = idxOf(out, from, label); if (i < 0) return;
  if (out.indexOf(from, i + 1) >= 0) { misses.push(label + ' — anchor is not unique'); return; }
  out = out.slice(0, i) + to + out.slice(i + from.length);
  applied.push(label);
}
/* remove/replace everything from startAnchor through END of endAnchor (inclusive) */
function span(label, startA, endA, replacement) {
  const i = idxOf(out, startA, label); if (i < 0) return;
  const j = idxOf(out, endA, label + ' (end)'); if (j < 0) return;
  if (j < i) { misses.push(label + ' — end anchor precedes start anchor'); return; }
  out = out.slice(0, i) + (replacement || '') + out.slice(j + endA.length);
  applied.push(label);
}
/* remove/replace from startAnchor up to (NOT including) stopAnchor */
function upTo(label, startA, stopA, replacement) {
  const i = idxOf(out, startA, label); if (i < 0) return;
  const j = idxOf(out, stopA, label + ' (stop)'); if (j < 0) return;
  if (j < i) { misses.push(label + ' — stop anchor precedes start anchor'); return; }
  out = out.slice(0, i) + (replacement || '') + out.slice(j);
  applied.push(label);
}
/* remove the whole <script>…</script> that contains the given anchor */
function dropScript(label, innerA) {
  const k = idxOf(out, innerA, label); if (k < 0) return;
  const i = out.lastIndexOf('<script>', k);
  const j = out.indexOf('</script>', k);
  if (i < 0 || j < 0) { misses.push(label + ' — enclosing <script> tags not found'); return; }
  out = out.slice(0, i) + '<!-- HOME_CORP_v1: 3D tilt / border-beam script retired -->' + out.slice(j + '</script>'.length);
  applied.push(label);
}

/* ============================ 1. DEAD CSS ================================= */
span('css: dead sidebar/nav rules',
  '.sidebar{width:210px',
  '.navi li svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.6;}');

span('css: dead topbar/search/userchip/avatar rules',
  '.topbar{display:flex',
  '.avatar{width:32px;height:32px;border-radius:50%;background:var(--ink);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;}');

span('css: values marquee rules',
  '.marquee{overflow:hidden',
  '@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}');

span('css: dead herobody/heroleft',
  '.herobody{padding:26px 30px 20px',
  '.heroleft{flex:1;min-width:280px;}');

span('css: dead brands/wehelp/jwu',
  '.brands{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px;}',
  '.jwu{font-size:13px;letter-spacing:.3em;color:var(--gold);margin-top:8px;}');

span('css: dead bolt glow + hero vignette',
  '#bolt{width:300px',
  'background:radial-gradient(ellipse at 50% 120%,transparent 55%,rgba(0,0,0,.45));}');

rep('css: dead scatterhint',
  '.scatterhint{position:absolute;right:24px;bottom:14px;font-size:10px;letter-spacing:.2em;color:#8887a0;}', '');

span('css: dead demo pill + flash overlay',
  '.demo{position:absolute;right:8px;top:4px',
  'transition:opacity .12s;}');

span('css: dead shake animation',
  '@keyframes shake{',
  '.hero.striking{animation:shake .35s ease;}');

rep('css: dead embers layer',
  '/* cinematic */' + EOL + '#embers{position:absolute;inset:0;z-index:1;pointer-events:none;}', '');

span('css: dead brands pill hover (cinematic dupe)',
  '.brands b{font-weight:400;font-size:12px;border:1px solid rgba(255,255,255,.22)',
  '.brands b:hover{border-color:rgba(255,200,0,.6);background:rgba(255,200,0,.1);}');

span('css: dead cursor blink',
  '.cursorblink{animation:blink 1.05s steps(1) infinite;}',
  '@keyframes blink{50%{opacity:0;}}');

/* ====================== 2. GIMMICK RETIREMENT ============================= */
span('css: gradient-clipped KPI numbers -> plain ink',
  '.big{background:linear-gradient(120deg,#1a1a1a,#4a3a00 120%)',
  '.big[style*="c47a00"],.big[style*="--red"]{background:none;}');

span('css: button sheen sweep',
  '.btn{position:relative;overflow:hidden;}',
  '.btn:hover::after{left:130%;}');

rep('css: marquee span leftover', '.marquee span{transition:color .3s;}', '');
rep('css: wehelp text-shadow leftover', '.wehelp{text-shadow:0 4px 30px rgba(0,0,0,.5);}', '');

rep('css: reduced-motion rule (drop removed selectors)',
  '@media (prefers-reduced-motion:reduce){.wg{animation:none;opacity:1;transform:none;}.marquee .track,.ticker .ttrack{animation:none;}.cursorblink{animation:none;}.btn::after{display:none;}}',
  '@media (prefers-reduced-motion:reduce){.wg{animation:none;opacity:1;transform:none;}.ticker .ttrack{animation:none;}}');

span('css: lightplus tilt + border-beam -> section width discipline',
  '/* light theme keepers: 3D tilt + cursor border-beam */',
  '@media (prefers-reduced-motion:reduce){.wg::after{display:none;}}',
  [
    '/* HOME_CORP_v1 — flat, disciplined surfaces (tilt + border-beam retired) */',
    '.main>section{max-width:1400px;margin-left:auto;margin-right:auto;}',
    '.main>section.hero{max-width:none;}'
  ].join(EOL));

dropScript('js: mousemove 3D tilt script', "var rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;");

/* ========================= 3. HERO REBUILD ================================ */
rep('css: banner grid -> calm two-column',
  '.banner{display:grid;grid-template-columns:250px 1fr 230px;gap:16px;padding:22px 26px;align-items:stretch;}',
  '.banner{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:28px;padding:30px 30px 26px;align-items:center;}');

rep('css: values title sized for the hero',
  '.bnr-title{font-size:21px;font-weight:700;color:#fff;line-height:1.25;margin-bottom:8px;}',
  '.bnr-title{font-size:27px;font-weight:700;color:#fff;line-height:1.25;margin-bottom:8px;max-width:560px;}');

span('css: picsum video slot + photo thumbs -> quiet side panel',
  '.bnr-video{position:relative;border-radius:14px',
  '.thumb span{position:relative;padding:10px 12px;font-size:12px;color:#fff;font-weight:500;line-height:1.3;text-shadow:0 1px 6px rgba(0,0,0,.8);height:100%;display:flex;align-items:flex-end;}',
  [
    '/* HOME_CORP_v1 — hero side panel (replaces placeholder video/photo slots) */',
    '.bnr-panel{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px 18px;}',
    '.bnr-panel-label{font-size:10px;letter-spacing:.22em;color:#9a99a8;font-weight:600;margin-bottom:8px;}',
    '.bnr-item{display:flex;align-items:center;gap:10px;font-size:13px;color:#e6e4f2;padding:10px 0;border-top:1px solid rgba(255,255,255,.08);}',
    '.bnr-item:first-of-type{border-top:none;}',
    '.bnr-item svg{width:16px;height:16px;stroke:var(--gold);fill:none;stroke-width:1.7;flex-shrink:0;}',
    '.bnr-item.link{cursor:pointer;}',
    '.bnr-item.link b{margin-left:auto;color:var(--gold);font-weight:600;}',
    '.bnr-item.link:hover span{color:#fff;}'
  ].join(EOL));

rep('css: dead video/thumb gradient fallback',
  '.bnr-video,.thumb{background:linear-gradient(135deg,#1c1c1c 0%,#3a3110 60%,#8a7500 130%);}', '');

rep('css: greeting gets a touch more presence',
  '.greet{font-size:13px;color:#cfcede;padding:12px 22px 0;display:flex;align-items:center;gap:14px;}',
  '.greet{font-size:15px;color:#e8e7f0;padding:16px 26px 0;display:flex;align-items:center;gap:14px;}');

rep('html: flash overlay element', '<div class="flash" id="flash"></div>', '');
rep('html: values marquee strip', '<div class="marquee"><div class="track" id="mtrack"></div></div>', '');

upTo('html: hero banner -> values spotlight + This Week panel',
  '<div class="banner">',
  '<nav class="quicknav">',
  [
    '<div class="banner">',
    '        <div class="bnr-left">',
    '          <p class="bnr-eyebrow">OUR CORE VALUES</p>',
    '          <p class="bnr-title cvfade" id="cvVal"></p>',
    '          <p class="bnr-sub cvfade" id="cvSub" style="min-height:18px;"></p>',
    '          <p class="bnr-num" id="cvNum"></p>',
    '        </div>',
    '        <div class="bnr-panel">',
    '          <p class="bnr-panel-label">THIS WEEK AT SPARK</p>',
    '          <div class="bnr-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span id="heroClassLine">New hire class</span></div>',
    '          <div class="bnr-item link" id="thumbPulse"><svg viewBox="0 0 24 24"><path d="M3 11l18-7-7 18-2.5-7.5z"/></svg><span>See a value in action? Post a shout-out</span><b>&rarr;</b></div>',
    '        </div>',
    '      </div>',
    '      '
  ].join(EOL));

rep('js: marquee population lines (element removed)',
  "var mt=document.getElementById('mtrack');" + EOL + "mt.innerHTML=(VALUES.concat(VALUES)).map(function(v){return '<span>'+v+'</span>';}).join('');",
  "/* HOME_CORP_v1 — values marquee retired; core values live in the hero spotlight */");

/* ==================== 4. QUICK ACTIONS GO LIGHT =========================== */
rep('css: quick-action tiles -> light card system',
  '.qab{display:flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(180deg,#161616,#0c0c0c);border:1px solid #2c2c2c;border-radius:12px;padding:14px 8px;cursor:pointer;color:#eee;font-size:11.5px;font-weight:500;box-shadow:0 8px 20px -12px rgba(0,0,0,.6);transition:transform .15s,border-color .15s;}',
  '.qab{display:flex;flex-direction:column;align-items:center;gap:9px;background:linear-gradient(180deg,#ffffff,#fdfcf8);border:1px solid var(--line);border-radius:12px;padding:14px 8px;cursor:pointer;color:#3b3527;font-size:11.5px;font-weight:600;box-shadow:0 1px 2px rgba(20,18,10,.05),0 10px 24px -16px rgba(20,18,10,.18);transition:transform .15s,border-color .15s,box-shadow .15s;}');

rep('css: quick-action hover',
  '.qab:hover{transform:translateY(-3px);border-color:var(--gold);}',
  '.qab:hover{transform:translateY(-2px);border-color:#e8bb17;box-shadow:0 2px 4px rgba(20,18,10,.06),0 16px 32px -14px rgba(20,18,10,.26);}');

rep('css: quick-action icon -> gold chip (matches widget heads)',
  '.qab svg{width:20px;height:20px;stroke:var(--gold);fill:none;stroke-width:1.7;}',
  '.qab svg{width:36px;height:36px;padding:8px;border-radius:10px;stroke:#7a5c00;fill:none;stroke-width:1.7;background:linear-gradient(145deg,#fff3c2,#ffe27a);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 1px 3px rgba(160,120,0,.25);}');

/* ==================== 5. RESPONSIVE RULE CLEANUP ========================== */
rep('css: 900px media rule (drop removed selectors, stack banner)',
  '@media (max-width:900px){.sidebar{display:none;}.wg.s3,.wg.s6,.wg.s2{grid-column:span 6;}.wehelp{font-size:32px;}#bolt{width:200px;height:220px;}}',
  '@media (max-width:900px){.wg.s3,.wg.s6,.wg.s2{grid-column:span 6;}.banner{grid-template-columns:1fr;gap:16px;padding:22px 20px 20px;}}');

/* ============================== REPORT ==================================== */
console.log('\nHOME_CORP_v1 — ' + target);
console.log('  anchors resolved: ' + applied.length + '   missed: ' + misses.length + '\n');
if (misses.length) {
  console.log('MISSED (nothing was written):');
  misses.forEach(m => console.log('  ✖ ' + m));
  process.exit(1);
}
applied.forEach(a => console.log('  ✔ ' + a));

/* ---------------------- post-patch verification --------------------------- */
const mustBeGone = ['picsum.photos', '#bolt{', '.marquee{', 'id="mtrack"', '.boltwrap', '#embers{', '@keyframes shake', 'background:linear-gradient(180deg,#161616,#0c0c0c)', '.cursorblink', '.bnr-video{'];
const mustRemain = ['id="cvVal"', 'id="cvSub"', 'id="cvNum"', 'id="heroClassLine"', 'id="thumbPulse"', 'id="ttrack"', 'id="greetTxt"', 'id="presTxt"', 'id="nowBadge"', 'class="quicknav"', 'id="calBand"', 'id="dashPage"', 'id="pulse"', 'id="newsGrid"', 'tickerFromPulse', 'loadLayoutCloud'];
const problems = [];
mustBeGone.forEach(s => { if (out.includes(s)) problems.push('still present: ' + s); });
mustRemain.forEach(s => { if (!out.includes(s)) problems.push('went missing: ' + s); });
const so = (out.match(/<script>/g) || []).length, sc = (out.match(/<\/script>/g) || []).length;
if (so !== sc) problems.push('unbalanced <script> tags: ' + so + ' open vs ' + sc + ' close');
if (problems.length) {
  console.log('\n✖ VERIFICATION FAILED — nothing was written:');
  problems.forEach(p => console.log('  ✖ ' + p));
  process.exit(1);
}
console.log('\n  ✔ verification passed (' + mustRemain.length + ' live ids intact, demo tells gone, script tags balanced)');

if (CHECK) { console.log('\n--check mode: no changes written. Run without --check to apply.\n'); process.exit(0); }

/* ------------------------------ WRITE ------------------------------------- */
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const bak = target + '.bak.' + ts;
fs.copyFileSync(target, bak);
fs.writeFileSync(target, out, 'utf8');
console.log('\n  ✔ backup: ' + bak);
console.log('  ✔ wrote:  ' + target + '  (' + src.length + ' → ' + out.length + ' bytes)\n');
