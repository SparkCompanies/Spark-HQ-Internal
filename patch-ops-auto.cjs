/* patch-ops-auto.cjs — stop the two automatic whole-board saves
   1. The Salesforce sync saved the WHOLE board once per matched record. A 12-record
      sync meant 12 full-board writes, each able to collide with a colleague.
   2. The expired-trash purge saved every affected board on page load, so just
      opening Spark Boards wrote to the server before you touched anything.
   Both now send targeted operations instead.
   Requires patch-ops-page.cjs and a deployed /boards-op.
   Run from the repo root:  node patch-ops-auto.cjs
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
if (p.indexOf('Persist.op') === -1) throw new Error('Run patch-ops-page.cjs first. Aborting.');
if (p.indexOf('/* sf sync via ops */') !== -1) throw new Error('Already applied. Aborting.');

/* ---- 1. Salesforce sync: one set_fields op per record ---- */
const aSF = `    logAct(nb, { actor: sparkMe(), kind: 'cell', itemId: it.id, item: rec.name, col: 'name', colLabel: 'Item', from: was, to: rec.name + ' (linked to Salesforce)', rawFrom: was });
    update(() => nb);
    Persist.board(nb);
  };`;
must(p, aSF, 'setitem-sf');
p = p.replace(aSF, `    logAct(nb, { actor: sparkMe(), kind: 'cell', itemId: it.id, item: rec.name, col: 'name', colLabel: 'Item', from: was, to: rec.name + ' (linked to Salesforce)', rawFrom: was });
    /* sf sync via ops */
    const sfVals = {
      name: it.name,
      sfId: it.sfId,
      sf_ambiguous: false
    };
    if (board.sfColumn) sfVals[board.sfColumn] = it[board.sfColumn];
    if (rec.status) sfVals.sf_status = it.sf_status;
    if (rec.start) {
      sfVals.sf_start = it.sf_start;
      sfVals.start = it.start;
    }
    update(() => nb);
    Persist.op(nb, [{
      type: 'set_fields',
      itemId: it.id,
      values: sfVals
    }], nb.activity ? [nb.activity[0]] : []);
  };`);

/* ---- 2. load-time purge: remove_item ops, not a whole-board write ---- */
const aPurge = `            if (purgeExpiredItems(nb)) Persist.board(nb);
            return nb;`;
must(p, aPurge, 'load-purge');
p = p.replace(aPurge, `            const idsBefore = [];
            (nb.groups || []).forEach(g => (g.items || []).forEach(x => {
              if (x && x.id) idsBefore.push(x.id);
            }));
            if (purgeExpiredItems(nb)) {
              const kept = {};
              (nb.groups || []).forEach(g => (g.items || []).forEach(x => {
                if (x && x.id) kept[x.id] = true;
              }));
              const gone = idsBefore.filter(id => !kept[id]).map(id => ({
                type: 'remove_item',
                itemId: id
              }));
              if (gone.length) Persist.op(nb, gone, []);
            }
            return nb;`);

fs.writeFileSync(PAGE + '.bak-opsauto', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  Salesforce sync writes one targeted op per record');
console.log('OK  load-time trash purge sends remove ops, not a whole-board save');
console.log('Backup: spark-boards.html.bak-opsauto');
