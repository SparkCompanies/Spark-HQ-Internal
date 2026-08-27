const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
const L = a => a.join('\n');

const from = L([
'  const runSync = () => {',
'    setSync({',
"      state: 'syncing',",
'      at: null',
'    });',
'    // SIMULATED Salesforce pull. At deploy this calls the SF/Asymbl bridge (see Connections).',
'    setTimeout(() => {',
'      update(b => {',
'        const nb = structuredClone(b);',
'        nb.groups.forEach(g => g.items.forEach(it => {',
'          if (it.sf === 0) it.sf = 1;',
'        }));',
'        return nb;',
'      });',
'      setSync({',
"        state: 'done',",
'        at: new Date()',
'      });',
'    }, 1100);',
'  };']);

const to = L([
'  const runSync = () => {',
'    if (!LIVE) {',
"      sbFlash('Sync needs the live worker connection.');",
'      return;',
'    }',
"    setSync({ state: 'syncing', at: null });",
"    API.call('/boards-sf-sync', {",
"      method: 'POST',",
"      body: JSON.stringify({ boardId: board.id, sfColumn: board.sfColumn || 'sf', days: 120 })",
'    }).then(res => {',
"      return API.call('/boards-load').then(d => {",
'        const fresh = ((d && d.boards) || []).filter(x => x && x.id === board.id)[0];',
'        if (fresh && Array.isArray(fresh.groups)) update(() => fresh);',
'        const amb = fresh && Array.isArray(fresh.groups)',
'          ? fresh.groups.reduce((n, g) => n + (g.items || []).filter(i => i.sf_ambiguous).length, 0)',
'          : 0;',
"        sbFlash('Salesforce sync: matched ' + res.matched + ' of ' + res.placementsScanned +",
"                ' placements' + (amb ? ' — ' + amb + ' need review (duplicate names)' : ''), 'ok');",
"        setSync({ state: 'done', at: new Date() });",
'      });',
'    }).catch(e => {',
"      sbFlash('Sync failed. ' + ((e && e.message) || ''));",
"      setSync({ state: 'idle', at: null });",
'    });',
'  };']);

const i = h.indexOf(from);
if (i === -1) { console.log('MISS runSync — not written.'); process.exit(1); }
if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG runSync — not written.'); process.exit(1); }
h = h.slice(0, i) + to + h.slice(i + from.length);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED runSync');
console.log('simulation gone:', h.indexOf('SIMULATED Salesforce pull') === -1);
