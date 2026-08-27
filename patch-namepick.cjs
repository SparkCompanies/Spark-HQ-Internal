const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
if (h.indexOf('function SFNameCell') !== -1) { console.log('already applied'); process.exit(1); }
const done = [];
function sub(name, from, to) {
  const i = h.indexOf(from);
  if (i === -1) { console.log('MISS  ' + name); return; }
  if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG ' + name); return; }
  h = h.slice(0, i) + to + h.slice(i + from.length);
  done.push(name);
}
const L = a => a.join('\n');

const comp = L([
'function SFNameCell({ value, onPick, onText }) {',
"  const [q, setQ] = useState(value || '');",
'  const [res, setRes] = useState([]);',
'  const [open, setOpen] = useState(false);',
'  const [busy, setBusy] = useState(false);',
"  useEffect(() => { setQ(value || ''); }, [value]);",
'  const run = s => {',
'    setQ(s);',
'    if (!LIVE || s.trim().length < 2) { setRes([]); setOpen(false); return; }',
'    setBusy(true);',
"    API.call('/boards-sf-search?onboarding=1&q=' + encodeURIComponent(s.trim()))",
'      .then(d => { setRes((d && d.results) || []); setOpen(true); })',
'      .catch(() => { setRes([]); setOpen(false); })',
'      .then(() => setBusy(false));',
'  };',
'  const commit = () => {',
'    setOpen(false);',
'    if (q !== value) onText(q);',
'  };',
"  return React.createElement('div', { style: { position: 'relative', width: '100%' } },",
"    React.createElement('input', {",
'      value: q,',
'      onChange: e => run(e.target.value),',
'      onBlur: () => setTimeout(commit, 150),',
"      onKeyDown: e => { if (e.key === 'Enter') { e.target.blur(); } if (e.key === 'Escape') { setOpen(false); } },",
"      placeholder: 'Type to search Salesforce',",
"      style: { width: '100%', border: 'none', background: 'transparent', font: 'inherit', fontWeight: 600, outline: 'none', padding: '2px 0' }",
'    }),',
"    busy && React.createElement('div', { style: { position: 'absolute', right: 4, top: 4, fontSize: 10, color: '#9A9CA8' } }, '...'),",
"    open && res.length > 0 && React.createElement('div', {",
"      style: { position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#fff', border: '1px solid #E3E5EC', borderRadius: 10, boxShadow: '0 8px 30px rgba(16,16,29,.14)', minWidth: 300, maxHeight: 280, overflowY: 'auto', marginTop: 4 }",
'    }, res.map(r => React.createElement(\'div\', {',
'      key: r.sfId,',
'      onMouseDown: e => { e.preventDefault(); setOpen(false); setQ(r.name); onPick(r); },',
"      style: { padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #F2F3F7' },",
"      onMouseEnter: e => e.currentTarget.style.background = '#F7F8FB',",
"      onMouseLeave: e => e.currentTarget.style.background = 'transparent'",
'    }, React.createElement(\'div\', { style: { fontWeight: 600 } }, r.name),',
"       React.createElement('div', { style: { fontSize: 11, color: '#7A7D8C', marginTop: 2 } }, (r.start || 'no start date') + '  ·  ' + (r.status || ''))))),",
"    open && res.length === 0 && !busy && React.createElement('div', {",
"      style: { position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#fff', border: '1px solid #E3E5EC', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#7A7D8C', marginTop: 4, whiteSpace: 'nowrap' }",
"    }, 'No match in Salesforce'));",
'}',
'function BoardView({']);
sub('component', 'function BoardView({', comp);

const setter = L([
'  const setItemSF = (gi, ii, rec) => {',
'    const nb = structuredClone(board);',
'    const it = nb.groups[gi].items[ii];',
'    const was = it.name;',
'    it.name = rec.name;',
'    it.sfId = rec.sfId;',
'    it.sf_ambiguous = false;',
'    if (board.sfColumn) it[board.sfColumn] = 1;',
'    if (rec.status) it.sf_status = rec.status;',
'    if (rec.start) { it.sf_start = rec.start; if (!it.start) it.start = rec.start; }',
"    logAct(nb, { actor: sparkMe(), kind: 'cell', itemId: it.id, item: rec.name, col: 'name', colLabel: 'Item', from: was, to: rec.name + ' (linked to Salesforce)', rawFrom: was });",
'    update(() => nb);',
'    Persist.board(nb);',
'  };',
'  const setItem = (gi, ii, key, val) => {']);
sub('setter', '  const setItem = (gi, ii, key, val) => {', setter);

sub('cell', L([
'      }, /*#__PURE__*/React.createElement(TextCell, {',
'        value: it.name,',
'        bold: true,',
"        onChange: v => setItem(gi, ii, 'name', v)",
'      })), /*#__PURE__*/React.createElement("button", {']), L([
'      }, /*#__PURE__*/React.createElement(SFNameCell, {',
'        value: it.name,',
'        onPick: rec => setItemSF(gi, ii, rec),',
"        onText: v => setItem(gi, ii, 'name', v)",
'      })), /*#__PURE__*/React.createElement("button", {']));

if (done.length !== 3) { console.log('APPLIED ' + done.length + '/3. NOT WRITTEN.'); process.exit(1); }
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED 3/3: ' + done.join(', '));
