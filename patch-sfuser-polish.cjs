/* patch-sfuser-polish.cjs — make the Salesforce User column obvious and robust
   - empty cells say "Set Sales Rep" instead of a faint dash, so it reads as
     something you click rather than a blank you type into
   - the picker no longer closes on the scroll that autofocus itself can trigger
   - proper column icon in the header instead of the generic text "A"
   Run from the repo root:  node patch-sfuser-polish.cjs
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
if (p.indexOf('SFUserCell') === -1) throw new Error('Run patch-sfuser-column.cjs first. Aborting.');
if (p.indexOf('sfu-hint') !== -1) throw new Error('Already applied. Aborting.');

/* 1. the picker must survive the scroll that autoFocus can cause */
const aEffect = `  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('click', h);
    window.addEventListener('scroll', h, true);
    return () => {
      window.removeEventListener('click', h);
      window.removeEventListener('scroll', h, true);
    };
  }, [open]);
  const openAt = () => {
    if (!canEdit) return;
    if (open) {
      setOpen(false);
      return;
    }
    SFU.load().then(u => setUsers(u.slice()));`;
must(p, aEffect, 'sfu-effect');
p = p.replace(aEffect, `  useEffect(() => {
    if (!open) return;
    const t0 = Date.now();
    const h = () => setOpen(false);
    const hs = () => {
      if (Date.now() - t0 > 350) setOpen(false);
    };
    window.addEventListener('click', h);
    window.addEventListener('scroll', hs, true);
    return () => {
      window.removeEventListener('click', h);
      window.removeEventListener('scroll', hs, true);
    };
  }, [open]);
  const openAt = () => {
    if (!canEdit) return;
    if (open) {
      setOpen(false);
      return;
    }
    SFU.load().then(u => setUsers(u.slice()));`);

/* 2. empty cell reads as an action */
const aEmpty = `       React.createElement('span', { className: 'sfu-name' }, nm || (value ? value : '\\u2014')))`;
must(p, aEmpty, 'sfu-empty');
p = p.replace(aEmpty, `       React.createElement('span', { className: 'sfu-name' }, nm || (value ? value : (canEdit ? 'Set\\u2026' : '\\u2014'))))`);

const aCss = `  .sfu-cell.empty{color:var(--faint)}`;
must(p, aCss, 'sfu-empty-css');
p = p.replace(aCss, `  .sfu-cell.empty{color:var(--faint)}
  .sfu-cell.empty:hover{color:var(--sub);background:var(--surface-2)}
  .sfu-hint{font-size:12.5px}`);

/* 3. real icon in the column header */
const aIcon = `  folder: p => /*#__PURE__*/React.createElement("svg", {`;
must(p, aIcon, 'ic-folder');
p = p.replace(aIcon, `  sfuser: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.9",
    strokeLinecap: "round", strokeLinejoin: "round", ...p
  }, /*#__PURE__*/React.createElement("circle", { cx: "12", cy: "8", r: "3.4" }),
     /*#__PURE__*/React.createElement("path", { d: "M5.5 20a6.5 6.5 0 0 1 13 0" })),
  folder: p => /*#__PURE__*/React.createElement("svg", {`);

fs.writeFileSync(PAGE + '.bak-sfupolish', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  empty cells read "Set..." and highlight on hover');
console.log('OK  picker ignores the scroll its own autofocus can trigger');
console.log('OK  person icon available for the column header');
console.log('Backup: spark-boards.html.bak-sfupolish');
