/* patch-sticky-v2.cjs — pinned column headers, second attempt
   The first version made every group share one scroll container, which caused the
   column misalignment and the strip that rows showed through. This keeps each group
   independent: the group's own box scrolls vertically, and its header pins inside it.
   No shared scrollbar, no fixed colgroup, no second sticky layer.
   Run from the repo root:  node patch-sticky-v2.cjs
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
if (p.indexOf('grp-scroll') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('board-wrap scroller') !== -1) throw new Error('The old sticky patch is still applied - run patch-table-revert.cjs first. Aborting.');

/* 1. the group box scrolls; .tbl must not clip its own sticky header */
const aTbl = `  .tbl{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}`;
must(p, aTbl, 'tbl-css');
p = p.replace(aTbl, `  .tbl{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}
  .grp-scroll{max-height:calc(100vh - 300px);overflow:auto;border-radius:var(--radius);border:1px solid var(--border)}
  .grp-scroll .tbl{border:0;box-shadow:none;border-radius:0}
  .grp-scroll thead th{position:sticky;top:0;z-index:5;box-shadow:0 1px 0 var(--border)}
  .grp-scroll thead th.name-th{z-index:7}`);

/* 2. that wrapper becomes the scroller - it already handles horizontal */
const aWrap = `!isC && /*#__PURE__*/React.createElement(\"div\", {
      style: {
        overflowX: 'auto',
        borderRadius: 'var(--radius)'
      }
    }, /*#__PURE__*/React.createElement(\"table\", {`;
must(p, aWrap, 'group-wrapper');
p = p.replace(aWrap, `!isC && /*#__PURE__*/React.createElement(\"div\", {
      className: "grp-scroll"
    }, /*#__PURE__*/React.createElement(\"table\", {`);

/* 3. the frozen name column is sticky on both axes now, so it needs the higher layer */
const aNameTh = `    }), /*#__PURE__*/React.createElement("th", {
      style: {
        minWidth: 250,
        position: 'sticky',
        left: 0,
        zIndex: 2,
        background: 'var(--surface-2)'
      }
    },`;
must(p, aNameTh, 'name-th');
p = p.replace(aNameTh, `    }), /*#__PURE__*/React.createElement("th", {
      className: "name-th",
      style: {
        minWidth: 250,
        position: 'sticky',
        left: 0,
        background: 'var(--surface-2)'
      }
    },`);

fs.writeFileSync(PAGE + '.bak-sticky2', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  each group scrolls in its own box with its header pinned');
console.log('OK  groups stay independent - no shared scrollbar, no misalignment');
console.log('Backup: spark-boards.html.bak-sticky2');
