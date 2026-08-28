/* patch-col-align.cjs — make every group's table use identical column widths
   Each group renders its own <table>. With table-layout:auto each one sized itself
   to its own content, so once the sticky-header change put all groups behind one
   shared horizontal scrollbar the mismatch became obvious. This pins the widths
   with a colgroup and table-layout:fixed so every group lines up exactly.
   Run from the repo root:  node patch-col-align.cjs
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
if (p.indexOf('sb-colgroup') !== -1) throw new Error('Column alignment patch already applied. Aborting.');
if (p.indexOf('board-wrap scroller') === -1) throw new Error('Run patch-sticky-header.cjs first. Aborting.');

/* fixed layout + a colgroup that mirrors the header cells exactly:
   grip, name, one per column, then the trailing add-column cell */
const aTable = `    }, /*#__PURE__*/React.createElement("table", {
      className: "tbl",
      style: {
        minWidth: board.columns.reduce((a, c) => a + (c.w || 150), 300)
      }
    }, /*#__PURE__*/React.createElement("thead", null,`;
must(p, aTable, 'table-el');
p = p.replace(aTable, `    }, /*#__PURE__*/React.createElement("table", {
      className: "tbl",
      style: {
        minWidth: board.columns.reduce((a, c) => a + (c.w || 150), 300),
        tableLayout: 'fixed'
      }
    }, /*#__PURE__*/React.createElement("colgroup", { className: "sb-colgroup" },
      /*#__PURE__*/React.createElement("col", { style: { width: 5 } }),
      /*#__PURE__*/React.createElement("col", { style: { width: 250 } }),
      board.columns.map(c => /*#__PURE__*/React.createElement("col", {
        key: c.key,
        style: { width: c.w || 150 }
      })),
      canEdit ? /*#__PURE__*/React.createElement("col", { style: { width: 44 } }) : null
    ), /*#__PURE__*/React.createElement("thead", null,`);

/* fixed layout clips instead of wrapping, so let cell text ellipsize cleanly */
const aCss = `  .tbl td{padding:0;border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-size:13.5px}`;
must(p, aCss, 'css-td');
p = p.replace(aCss, `  .tbl td{padding:0;border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-size:13.5px;overflow:hidden}
  .tbl td .cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tbl td .cell>span,.tbl td .cell>div{overflow:hidden;text-overflow:ellipsis}`);

fs.writeFileSync(PAGE + '.bak-colalign', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  every group table now uses identical column widths');
console.log('OK  long values ellipsize instead of forcing a column wider');
console.log('Backup: spark-boards.html.bak-colalign');
