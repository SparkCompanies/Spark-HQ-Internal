const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
if (h.indexOf('boards-sf-write') !== -1) { console.log('already applied'); process.exit(1); }
const from = [
"    let notes = [];",
"    if (col && col.type === 'status') notes = runAutomations(nb, it, key);",
"    update(() => nb);",
"    Persist.board(nb);"].join('\n');
const to = [
"    let notes = [];",
"    if (col && col.type === 'status') notes = runAutomations(nb, it, key);",
"    update(() => nb);",
"    Persist.board(nb);",
"    if (LIVE && col && col.type === 'status' && col.options && col.options[val] && col.options[val].label === 'Placed') {",
"      if (!it.sfId) {",
"        sbFlash('Saved on the board. This row has no Salesforce link yet - run Sync with Salesforce first.');",
"      } else {",
"        API.call('/boards-sf-write', {",
"          method: 'POST',",
"          body: JSON.stringify({ boardId: board.id, itemId: it.id, status: 'Active' })",
"        }).then(function () {",
"          sbFlash(it.name + ' set to Active in Salesforce.', 'ok');",
"        }).catch(function (e) {",
"          sbFlash('Board updated, but Salesforce was not: ' + ((e && e.message) || ''));",
"        });",
"      }",
"    }"].join('\n');
const i = h.indexOf(from);
if (i === -1) { console.log('MISS. NOT WRITTEN.'); process.exit(1); }
if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG. NOT WRITTEN.'); process.exit(1); }
h = h.slice(0, i) + to + h.slice(i + from.length);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED sf-write UI');
