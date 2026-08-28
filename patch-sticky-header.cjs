/* patch-sticky-header.cjs — lock the column headers while scrolling
   Sticky headers cannot work in the current DOM: each group's table sits inside a
   div with overflow-x:auto (which computes overflow-y:auto and becomes the sticky
   scrollport), and .tbl has overflow:hidden which clips sticky outright. This moves
   scrolling to one container around all groups, so the header can pin to the top.
   Also sticks the group title bar above it, like monday.
   Run from the repo root:  node patch-sticky-header.cjs
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
if (p.indexOf('sticky-hdr') !== -1) throw new Error('Sticky header patch already applied. Aborting.');

/* 1. one scroll region for the whole table view; drop the overflow:hidden that clips sticky */
const aTbl = `  .board-wrap{padding:22px 22px 60px}`;
must(p, aTbl, 'css-boardwrap');
p = p.replace(aTbl, `  .board-wrap{padding:22px 22px 60px}
  /* sticky-hdr: the table view scrolls here, so headers have something to pin to */
  .board-wrap.scroller{height:100%;overflow:auto;padding-top:0}
  .board-wrap.scroller .group{margin-bottom:24px}
  .board-wrap.scroller .group-head{position:sticky;top:0;z-index:6;background:var(--bg);padding:14px 0 8px;margin-bottom:0;height:46px;box-sizing:border-box}
  .board-wrap.scroller .tbl thead th{position:sticky;top:46px;z-index:5}
  .board-wrap.scroller .tbl thead th.name-th{z-index:7}
  .board-wrap.scroller .tbl{box-shadow:none}`);

const aTblCss = `  .tbl{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}`;
must(p, aTblCss, 'css-tbl');
p = p.replace(aTblCss, `  .tbl{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}`);

/* 2. board-wrap becomes the scroller */
const aWrap = `  return /*#__PURE__*/React.createElement("div", {
    className: "board-wrap"
  }, board.groups.map((g, gi) => {`;
must(p, aWrap, 'boardwrap-el');
p = p.replace(aWrap, `  return /*#__PURE__*/React.createElement("div", {
    className: "board-wrap scroller"
  }, board.groups.map((g, gi) => {`);

/* 3. per-group horizontal scroller would trap sticky - let the group flow instead */
const aOv = `done\")), !isC && /*#__PURE__*/React.createElement(\"div\", {
      style: {
        overflowX: 'auto',
        borderRadius: 'var(--radius)'
      }
    }, /*#__PURE__*/React.createElement(\"table\", {
      className: \"tbl\",`;
must(p, aOv, 'group-scroller');
p = p.replace(aOv, `done\")), !isC && /*#__PURE__*/React.createElement(\"div\", {
      style: {
        borderRadius: 'var(--radius)'
      }
    }, /*#__PURE__*/React.createElement(\"table\", {
      className: \"tbl\",`);

/* 4. name column header needs the higher stacking order (it is sticky on both axes) */
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

/* 5. .content must stop scrolling on the board page or you get two scrollbars */
const aContent = `    className: "content" + (canEdit ? '' : ' readonly')`;
must(p, aContent, 'board-content');
p = p.replace(aContent, `    className: "content" + (canEdit ? '' : ' readonly') + (view === 'table' ? ' no-scroll' : '')`);

const aContentCss = `  .content{flex:1;overflow:auto}`;
must(p, aContentCss, 'css-content');
p = p.replace(aContentCss, `  .content{flex:1;overflow:auto}
  .content.no-scroll{overflow:hidden}`);

fs.writeFileSync(PAGE + '.bak-sticky', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  column headers pin while scrolling');
console.log('OK  group title bar pins above them');
console.log('OK  one horizontal scrollbar for the whole view (columns line up across groups)');
console.log('Backup: spark-boards.html.bak-sticky');
