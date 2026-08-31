/* patch-ops-page.cjs — Phase 1, page half
   Routes the mutations that actually collide through /boards-op instead of saving
   the whole board: adding a row, adding a group, renaming a group, posting a note,
   and the item trash actions. The server returns the merged board and the client
   adopts it, so the other person's changes arrive instead of being overwritten.
   Requires patch-ops-worker.cjs to be deployed first.
   Run from the repo root:  node patch-ops-page.cjs
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
if (p.indexOf('Persist.op') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('SB_REVS') === -1) throw new Error('Run patch-rev-selfconflict.cjs first. Aborting.');

/* ---- 1. Persist.op ---- */
const aCell = `  _q: Promise.resolve(),`;
must(p, aCell, 'persist-queue');
p = p.replace(aCell, `  _q: Promise.resolve(),
  /* structural change as a typed operation - the server merges it into whatever
     it currently holds, so it cannot clobber someone else's concurrent change */
  op(b, ops, activity, onMerged) {
    if (!LIVE || !b || !ops || !ops.length) return;
    const run = () => API.call('/boards-op', {
      method: 'POST',
      body: JSON.stringify({
        board_id: b.id,
        ops: ops,
        activity: activity || []
      })
    }).then(d => {
      if (d && d.rev) sbSetRev(b, d.rev);
      if (d && d.board && typeof onMerged === 'function') {
        d.board.__rev = d.rev || null;
        onMerged(d.board);
      }
    }).catch(e => {
      const msg = e && e.message ? e.message : '';
      if (msg.indexOf('API 404') !== -1 || msg.indexOf('API 400') !== -1) {
        Persist.board(b, true);
        return;
      }
      console.error('[Spark Boards] op failed', e);
      sbFlash('NOT SAVED. ' + (msg || 'Unknown error'));
    });
    Persist._q = Persist._q.then(run, run);
    return Persist._q;
  },`);

/* ---- 2. TableView needs a way to adopt the merged board ---- */
const aTV = `  const cellEdit = canEditRaw;`;
must(p, aTV, 'tableview-cell');
p = p.replace(aTV, `  const adopt = nb => update(() => nb);
  const cellEdit = canEditRaw;`);

/* ---- 3. add row ---- */
const aAdd = `    const notes = runAutomations(nb, blank, '__created__');
    update(() => nb);
    Persist.board(nb);
    if (notes.length && onAutomation) onAutomation(notes);`;
must(p, aAdd, 'add-item');
p = p.replace(aAdd, `    const notes = runAutomations(nb, blank, '__created__');
    update(() => nb);
    if (notes.length) {
      Persist.board(nb, true);
    } else {
      Persist.op(nb, [{
        type: 'add_item',
        groupId: nb.groups[gi].id,
        groupIndex: gi,
        item: blank
      }], nb.activity ? [nb.activity[0]] : [], adopt);
    }
    if (notes.length && onAutomation) onAutomation(notes);`);

/* ---- 4. add group ---- */
const aAddG = `  const addGroup = () => update(b => {
    const nb = structuredClone(b);
    nb.groups.push({
      id: 'g' + Date.now(),
      title: 'New Group',
      color: '#9AA0AC',
      items: []
    });
    Persist.board(nb);
    setRenameG(nb.groups[nb.groups.length - 1].id);
    setRenameV('New Group');
    return nb;
  });`;
must(p, aAddG, 'add-group');
p = p.replace(aAddG, `  const addGroup = () => {
    const nb = structuredClone(baseBoard);
    const g = {
      id: 'g' + Date.now(),
      title: 'New Group',
      color: '#9AA0AC',
      items: []
    };
    nb.groups.push(g);
    update(() => nb);
    Persist.op(nb, [{
      type: 'add_group',
      group: g
    }], [], adopt);
    setRenameG(g.id);
    setRenameV('New Group');
  };`);

/* ---- 5. rename group ---- */
const aRen = `      t.title = val;
      Persist.board(nb);
      return nb;
    });`;
must(p, aRen, 'rename-group');
p = p.replace(aRen, `      t.title = val;
      Persist.op(nb, [{
        type: 'rename_group',
        groupId: gid,
        title: val
      }], [], adopt);
      return nb;
    });`);

/* ---- 6. item trash actions ---- */
const aRestore = `  const restoreItem = id => update(b => {
    const nb = structuredClone(b);
    nb.groups.forEach(g => g.items.forEach(it => {
      if (it.id === id) {
        delete it.archivedAt;
        delete it.deletedAt;
      }
    }));
    Persist.board(nb);
    return nb;
  });`;
must(p, aRestore, 'restore-item');
p = p.replace(aRestore, `  const restoreItem = id => update(b => {
    const nb = structuredClone(b);
    nb.groups.forEach(g => g.items.forEach(it => {
      if (it.id === id) {
        delete it.archivedAt;
        delete it.deletedAt;
      }
    }));
    Persist.op(nb, [{
      type: 'set_fields',
      itemId: id,
      values: {
        archivedAt: null,
        deletedAt: null
      }
    }], []);
    return nb;
  });`);

const aPurge = `      g.items = g.items.filter(it => !(it.id === id && it.deletedAt && !it.archivedAt));
    });
    Persist.board(nb);
    return nb;
  });`;
must(p, aPurge, 'purge-item');
p = p.replace(aPurge, `      g.items = g.items.filter(it => !(it.id === id && it.deletedAt && !it.archivedAt));
    });
    Persist.op(nb, [{
      type: 'remove_item',
      itemId: id
    }], []);
    return nb;
  });`);

/* ---- 7. notes ---- */
const aNote = `    updateBoard(drawer.boardId, () => nb);
    Persist.board(nb, true);
  };`;
must(p, aNote, 'post-note');
p = p.replace(aNote, `    const note = target.updates[target.updates.length - 1];
    updateBoard(drawer.boardId, () => nb);
    Persist.op(nb, [{
      type: 'post_note',
      itemId: drawer.itemId,
      note: note
    }], [], merged => updateBoard(drawer.boardId, () => merged));
  };`);

fs.writeFileSync(PAGE + '.bak-opspage', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  add row, add group, rename group, notes, item trash -> /boards-op');
console.log('OK  the merged board comes back and is adopted, so both people stay in sync');
console.log('OK  falls back to a full save if the worker route is missing');
console.log('Backup: spark-boards.html.bak-opspage');
