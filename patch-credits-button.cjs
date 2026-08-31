/* patch-credits-button.cjs — "Create placement credits" in the item drawer
   Opens the row, shows a Salesforce section, previews exactly what would be written,
   then creates it on a second click. Never writes on the first press.
   Requires patch-credits-worker.cjs to be deployed.
   Run from the repo root:  node patch-credits-button.cjs
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
if (p.indexOf('CreditPanel') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('SFUserCell') === -1) throw new Error('Run patch-sfuser-column.cjs first. Aborting.');

/* 1. CSS */
const aCss = `  .sfu-clear{width:100%;margin-top:6px;padding:5px;font-size:12.5px;color:var(--sub);background:var(--surface-2);border:0;border-radius:7px;cursor:pointer}`;
must(p, aCss, 'sfu-clear-css');
p = p.replace(aCss, `  .sfu-clear{width:100%;margin-top:6px;padding:5px;font-size:12.5px;color:var(--sub);background:var(--surface-2);border:0;border-radius:7px;cursor:pointer}
  .cred-box{border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:0 0 14px}
  .cred-box h4{margin:0 0 8px;font:600 13px/1.2 'Jost',sans-serif;display:flex;align-items:center;gap:7px}
  .cred-row{display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0}
  .cred-row b{font-weight:600}
  .cred-tag{font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--surface-2);color:var(--sub)}
  .cred-msg{font-size:12.5px;margin-top:8px;line-height:1.5}
  .cred-msg.bad{color:#c0392b}
  .cred-msg.good{color:#0b8a4b}
  .cred-btn{margin-top:10px;width:100%;padding:8px;border:0;border-radius:8px;background:var(--gold);color:#1A1407;font:600 13px/1 'Jost',sans-serif;cursor:pointer}
  .cred-btn:disabled{opacity:.5;cursor:default}
  .cred-btn.ghost{background:var(--surface-2);color:var(--text)}`);

/* 2. the panel */
const aComp = `function UpdatesDrawer({`;
must(p, aComp, 'drawer-fn');
p = p.replace(aComp, `function CreditPanel({ boardId, item }) {
  const [state, setState] = useState({ phase: 'idle' });
  const call = (body) => API.call('/boards-placement-credits', {
    method: 'POST',
    body: JSON.stringify({ board_id: boardId, item_id: item.id, ...body })
  });
  const parseErr = e => {
    const m = e && e.message ? e.message : '';
    try {
      const j = JSON.parse(m.slice(m.indexOf('{')));
      return j;
    } catch (x) {
      return { error: m || 'Something went wrong' };
    }
  };
  const doPreview = () => {
    setState({ phase: 'loading' });
    call({ preview: true }).then(d => setState({ phase: 'preview', d: d })).catch(e => setState({ phase: 'error', d: parseErr(e) }));
  };
  const doCreate = (replace) => {
    setState(s => ({ ...s, phase: 'loading' }));
    call(replace ? { replace: true } : {}).then(d => setState({ phase: 'done', d: d })).catch(e => setState({ phase: 'error', d: parseErr(e) }));
  };
  const s = state;
  return React.createElement('div', { className: 'cred-box' },
    React.createElement('h4', null, React.createElement(Ic.bolt || 'span', { style: { width: 14, height: 14 } }), 'Salesforce placement credits'),
    s.phase === 'idle' && React.createElement('div', null,
      React.createElement('div', { style: { fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.5 } },
        'Checks the placement in Salesforce and shows what would be created before anything is written.'),
      React.createElement('button', { className: 'cred-btn', onClick: doPreview }, 'Check placement credits')),
    s.phase === 'loading' && React.createElement('div', { className: 'cred-msg' }, 'Checking Salesforce...'),
    s.phase === 'preview' && s.d && React.createElement('div', null,
      React.createElement('div', { className: 'cred-row' }, React.createElement('b', null, s.d.placement || '')),
      React.createElement('div', { className: 'cred-row', style: { color: 'var(--sub)', fontSize: 12.5 } },
        'Started ' + (s.d.start_date || '?') + (s.d.status ? ' \\u00B7 ' + s.d.status : '')),
      (s.d.plan || []).map((r, i) => React.createElement('div', { className: 'cred-row', key: i },
        React.createElement('span', { className: 'cred-tag' }, r.name),
        React.createElement('span', null, r.recipient))),
      s.d.full_desk && React.createElement('div', { className: 'cred-msg' }, 'Same person on both sides, so the second credit is Full Desk.'),
      (s.d.existing || []).length > 0 ?
        React.createElement('div', null,
          React.createElement('div', { className: 'cred-msg bad' },
            'This placement already has ' + s.d.existing.length + ' credit(s): ' + s.d.existing.map(c => c.name + ' \\u2192 ' + (c.recipient || '?')).join(', ')),
          React.createElement('button', {
            className: 'cred-btn',
            onClick: () => {
              if (confirm('Delete the ' + s.d.existing.length + ' existing credit(s) and replace them?\\n\\nThis cannot be undone.')) doCreate(true);
            }
          }, 'Replace existing credits')) :
        React.createElement('button', { className: 'cred-btn', onClick: () => doCreate(false) }, 'Create these credits')),
    s.phase === 'done' && s.d && React.createElement('div', null,
      React.createElement('div', { className: 'cred-msg good' },
        'Created ' + ((s.d.created || []).length) + ' credit(s)' + (s.d.deleted ? ', replaced ' + s.d.deleted : '') + ' on ' + (s.d.placement || '')),
      (s.d.created || []).map((c, i) => React.createElement('div', { className: 'cred-row', key: i },
        React.createElement('span', { className: 'cred-tag' }, c.name), c.recipient)),
      (s.d.errors || []).map((e, i) => React.createElement('div', { className: 'cred-msg bad', key: i }, e))),
    s.phase === 'error' && s.d && React.createElement('div', null,
      React.createElement('div', { className: 'cred-msg bad' }, s.d.error || 'Failed'),
      s.d.start_date && React.createElement('div', { className: 'cred-msg' }, 'Start date ' + s.d.start_date + (s.d.status ? ' \\u00B7 status ' + s.d.status : '')),
      React.createElement('button', { className: 'cred-btn ghost', onClick: doPreview }, 'Try again')));
}
function UpdatesDrawer({`);

/* 3. drawer signature + render */
const aSig = `function UpdatesDrawer({
  item,
  onClose,
  onPost,
  canPost,
  me
}) {`;
must(p, aSig, 'drawer-sig');
p = p.replace(aSig, `function UpdatesDrawer({
  item,
  onClose,
  onPost,
  canPost,
  me,
  boardId,
  showCredits
}) {`);

const aAfterHead = `  })))), canPost && /*#__PURE__*/React.createElement("div", {
    className: "drawer-compose"`;
must(p, aAfterHead, 'drawer-compose');
p = p.replace(aAfterHead, `  })))), showCredits && canPost && /*#__PURE__*/React.createElement("div", {
    style: { padding: '14px 18px 0' }
  }, /*#__PURE__*/React.createElement(CreditPanel, {
    boardId: boardId,
    item: item
  })), canPost && /*#__PURE__*/React.createElement("div", {
    className: "drawer-compose"`);

/* 4. pass the props in */
const aMount = `  }), drawer && /*#__PURE__*/React.createElement(UpdatesDrawer, {
    item: drawerItem,
    me: me,
    canPost: canEdit,
    onPost: postUpdate,
    onClose: () => setDrawer(null)
  })`;
must(p, aMount, 'drawer-mount');
p = p.replace(aMount, `  }), drawer && /*#__PURE__*/React.createElement(UpdatesDrawer, {
    item: drawerItem,
    me: me,
    canPost: canEdit,
    boardId: drawer.boardId,
    showCredits: !!(drawerItem && drawerItem.sfId),
    onPost: postUpdate,
    onClose: () => setDrawer(null)
  })`);

fs.writeFileSync(PAGE + '.bak-credbtn', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  credit panel in the item drawer, for rows linked to Salesforce');
console.log('OK  preview first - nothing is written until you press create');
console.log('OK  replacing existing credits needs a separate typed confirm');
console.log('Backup: spark-boards.html.bak-credbtn');
