const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
if (h.indexOf('boards-sf-stage') !== -1) { console.log('already applied'); process.exit(1); }
const from = [
"        }).then(function () {",
"          sbFlash(it.name + ' set to Active in Salesforce.', 'ok');",
"        }).catch(function (e) {",
"          sbFlash('Board updated, but Salesforce was not: ' + ((e && e.message) || ''));",
"        });"].join('\n');
const to = [
"        }).then(function () {",
"          return API.call('/boards-sf-stage', {",
"            method: 'POST',",
"            body: JSON.stringify({ boardId: board.id, itemId: it.id, dryRun: false })",
"          }).then(function (r) {",
"            if (r && r.alreadyThere) sbFlash(it.name + ' set to Active. Already in Placement stage.', 'ok');",
"            else sbFlash(it.name + ' set to Active and moved to Placement in Salesforce.', 'ok');",
"          }).catch(function (e) {",
"            sbFlash(it.name + ' set to Active, but the Kanban move failed: ' + ((e && e.message) || ''));",
"          });",
"        }).catch(function (e) {",
"          sbFlash('Board updated, but Salesforce was not: ' + ((e && e.message) || ''));",
"        });"].join('\n');
const i = h.indexOf(from);
if (i === -1) { console.log('MISS. NOT WRITTEN.'); process.exit(1); }
if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG. NOT WRITTEN.'); process.exit(1); }
h = h.slice(0, i) + to + h.slice(i + from.length);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED stage UI');
