const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
if (h.indexOf('function filterBoardRows') !== -1) { console.log('already applied'); process.exit(1); }
const done = [];
function sub(name, from, to) {
  const i = h.indexOf(from);
  if (i === -1) { console.log('MISS  ' + name); return; }
  if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG ' + name); return; }
  h = h.slice(0, i) + to + h.slice(i + from.length);
  done.push(name);
}
const fn = [
'function filterBoardRows(b, q) {',
'  if (!b || !q) return b;',
'  var s = String(q).toLowerCase();',
'  return Object.assign({}, b, {',
'    groups: (b.groups || []).map(function (g) {',
'      return Object.assign({}, g, {',
'        items: (g.items || []).filter(function (it) {',
"          return String(it.name || '').toLowerCase().indexOf(s) !== -1;",
'        })',
'      });',
'    })',
'  });',
'}',
'var SPARK_NAME_MAP = {'].join('\n');
sub('helper', 'var SPARK_NAME_MAP = {', fn);
sub('wire', [
"  })), !query && route.page === 'board' && activeBoard && /*#__PURE__*/React.createElement(BoardView, {",
'    board: activeBoard,',
'    update: fn => updateBoard(activeBoard.id, fn),',
'    canEdit: canEdit,'].join('\n'), [
"  })), route.page === 'board' && activeBoard && /*#__PURE__*/React.createElement(BoardView, {",
'    board: filterBoardRows(activeBoard, query),',
'    update: fn => updateBoard(activeBoard.id, fn),',
'    canEdit: canEdit && !query,'].join('\n'));
if (done.length !== 2) { console.log('APPLIED ' + done.length + '/2. NOT WRITTEN.'); process.exit(1); }
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED: ' + done.join(', '));
