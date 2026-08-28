/* patch-table-revert.cjs — put the table back to how it behaved this morning
   Undoes ONLY the three layout changes that destabilised it:
     - sticky headers (which forced one shared scroll container)
     - the single-sticky follow-up
     - the fixed colgroup / table-layout:fixed alignment change
   Keeps everything that is working: cell-level saves, the revision fix, editing
   while searching, the sidebar, the calendar, and the emoji column.
   Run from the repo root:  node patch-table-revert.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function drop(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
  return hay.replace(needle, '');
}
function swap(hay, a, b, label) {
  const n = hay.split(a).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
  return hay.replace(a, b);
}
let p = read(PAGE);
if (p.indexOf('board-wrap scroller') === -1) throw new Error('Nothing to revert. Aborting.');

/* 1. each group scrolls horizontally on its own again */
p = swap(p,
`done\")), !isC && /*#__PURE__*/React.createElement(\"div\", {
      style: {
        borderRadius: 'var(--radius)'
      }
    }, /*#__PURE__*/React.createElement(\"table\", {`,
`done\")), !isC && /*#__PURE__*/React.createElement(\"div\", {
      style: {
        overflowX: 'auto',
        borderRadius: 'var(--radius)'
      }
    }, /*#__PURE__*/React.createElement(\"table\", {`,
'group-scroller');

/* 2. drop table-layout:fixed and the colgroup */
p = swap(p,
`        minWidth: board.columns.reduce((a, c) => a + (c.w || 150), 300),
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
    ), /*#__PURE__*/React.createElement("thead", null,`,
`        minWidth: board.columns.reduce((a, c) => a + (c.w || 150), 300)
      }
    }, /*#__PURE__*/React.createElement("thead", null,`,
'colgroup');

/* 3. board-wrap stops being the scroll container */
p = swap(p, `    className: "board-wrap scroller"`, `    className: "board-wrap"`, 'board-wrap');

/* 4. the page scrolls normally again on the table view */
p = swap(p,
`    className: "content" + (canEdit ? '' : ' readonly') + (view === 'table' ? ' no-scroll' : '')`,
`    className: "content" + (canEdit ? '' : ' readonly')`,
'content-noscroll');

/* 5. remove the CSS those changes added */
p = drop(p, `
  /* sticky-hdr: the table view scrolls here, so headers have something to pin to */
  .board-wrap.scroller{height:100%;overflow:auto;padding-top:0}
  .board-wrap.scroller .group{margin-bottom:24px}
  /* single-sticky: only the column header pins, so no strip can show rows */
  .board-wrap.scroller .group-head{padding:14px 0 8px;margin-bottom:0;height:46px;box-sizing:border-box}
  .board-wrap.scroller .tbl thead th{position:sticky;top:0;z-index:5;box-shadow:0 1px 0 var(--border)}
  .board-wrap.scroller .tbl thead th.name-th{z-index:7}
  .board-wrap.scroller .tbl{box-shadow:none}`, 'sticky-css');

p = drop(p, `
  .content.no-scroll{overflow:hidden}`, 'content-css');

/* 6. restore the table's own clipping and undo the ellipsis rules */
p = swap(p,
`  .tbl{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}`,
`  .tbl{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}`,
'tbl-css');

p = swap(p,
`  .tbl td{padding:0;border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-size:13.5px;overflow:hidden}
  .tbl td .cell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tbl td .cell>span,.tbl td .cell>div{overflow:hidden;text-overflow:ellipsis}`,
`  .tbl td{padding:0;border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-size:13.5px}`,
'td-css');

/* 7. name column keeps its original stacking */
p = swap(p,
`    }), /*#__PURE__*/React.createElement("th", {
      className: "name-th",
      style: {
        minWidth: 250,
        position: 'sticky',
        left: 0,
        background: 'var(--surface-2)'
      }
    },`,
`    }), /*#__PURE__*/React.createElement("th", {
      style: {
        minWidth: 250,
        position: 'sticky',
        left: 0,
        zIndex: 2,
        background: 'var(--surface-2)'
      }
    },`,
'name-th');

fs.writeFileSync(PAGE + '.bak-tablerevert', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  table back to per-group scrolling, no sticky headers, auto widths');
console.log('OK  kept: cell saves, revision fix, edit-while-search, sidebar, calendar, emoji');
console.log('Backup: spark-boards.html.bak-tablerevert');
