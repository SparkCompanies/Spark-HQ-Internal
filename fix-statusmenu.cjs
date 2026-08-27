const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
if (h.indexOf('menuPos') !== -1) { console.log('already applied'); process.exit(1); }
const done = [];
function sub(name, from, to) {
  const i = h.indexOf(from);
  if (i === -1) { console.log('MISS  ' + name); return; }
  if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG ' + name); return; }
  h = h.slice(0, i) + to + h.slice(i + from.length);
  done.push(name);
}
const L = a => a.join('\n');

// 1) add position state next to `open`
sub('state', L([
'  const [open, setOpen] = useState(false);',
'  const [edit, setEdit] = useState(false);']), L([
'  const [open, setOpen] = useState(false);',
'  const [menuPos, setMenuPos] = useState(null);',
'  const [edit, setEdit] = useState(false);']));

// 2) measure on open
sub('click', L([
'    onClick: () => setOpen(o => !o)',
"  }, s ? s.label : '—'), open && /*#__PURE__*/React.createElement(\"div\", {"]), L([
'    onClick: e => {',
'      const r = e.currentTarget.getBoundingClientRect();',
'      const below = window.innerHeight - r.bottom;',
'      const up = below < 320 && r.top > 320;',
'      setMenuPos({',
'        left: Math.min(r.left, window.innerWidth - 230),',
'        top: up ? null : r.bottom + 4,',
'        bottom: up ? window.innerHeight - r.top + 4 : null',
'      });',
'      setOpen(o => !o);',
'    }',
"  }, s ? s.label : '—'), open && /*#__PURE__*/React.createElement(\"div\", {"]));

// 3) fixed-position the menu
sub('style', L([
'    className: "menu status-menu",',
'    style: {',
"      top: '100%',",
'      left: 0',
'    }']), L([
'    className: "menu status-menu",',
'    style: menuPos ? {',
"      position: 'fixed',",
"      left: menuPos.left + 'px',",
"      top: menuPos.top !== null ? menuPos.top + 'px' : 'auto',",
"      bottom: menuPos.bottom !== null ? menuPos.bottom + 'px' : 'auto',",
'      zIndex: 9999,',
'      maxHeight: 300,',
"      overflowY: 'auto'",
"    } : { top: '100%', left: 0 }"]));

if (done.length !== 3) { console.log('APPLIED ' + done.length + '/3. NOT WRITTEN.'); process.exit(1); }
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED 3/3: ' + done.join(', '));
