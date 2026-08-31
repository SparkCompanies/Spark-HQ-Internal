/* patch-live-page.cjs — Phase 2, page half: live refresh
   Every 15 seconds the open board checks whether its revision changed. If someone
   else saved, it pulls just that board and adopts it, so Maryam sees Tamika's edits
   without reloading. Deliberately skipped when: the tab is hidden, you are typing
   in a field, or one of your own writes is in flight - so it can never yank the
   board out from under you mid-edit.
   Requires patch-live-worker.cjs to be deployed first.
   Run from the repo root:  node patch-live-page.cjs
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
if (p.indexOf('sbLivePoll') !== -1) throw new Error('Already applied. Aborting.');
if (p.indexOf('Persist.op') === -1) throw new Error('Run patch-ops-page.cjs first. Aborting.');

/* 1. remember when we last wrote, so polling never fights an in-flight save */
const aRev = `const sbSetRev = (b, rev) => {
  if (!b || !b.id || !rev) return;
  SB_REVS[b.id] = rev;`;
must(p, aRev, 'set-rev');
p = p.replace(aRev, `let SB_LAST_WRITE = 0;
const sbTouch = () => {
  SB_LAST_WRITE = Date.now();
};
const sbSetRev = (b, rev) => {
  if (!b || !b.id || !rev) return;
  SB_REVS[b.id] = rev;
  SB_LAST_WRITE = Date.now();`);

/* mark the start of every write too, not just the finish */
const aOpBody = `  op(b, ops, activity, onMerged) {
    if (!LIVE || !b || !ops || !ops.length) return;`;
must(p, aOpBody, 'op-head');
p = p.replace(aOpBody, `  op(b, ops, activity, onMerged) {
    if (!LIVE || !b || !ops || !ops.length) return;
    sbTouch();`);

const aCellBody = `  cell(b, ops, activity) {
    if (!LIVE || !b || !ops || !ops.length) return;`;
must(p, aCellBody, 'cell-head');
p = p.replace(aCellBody, `  cell(b, ops, activity) {
    if (!LIVE || !b || !ops || !ops.length) return;
    sbTouch();`);

/* 2. the poll itself */
const aUpd = `  const toggleFav = id => setBoards(bs => bs.map(b => b.id === id ? {`;
must(p, aUpd, 'toggle-fav');
p = p.replace(aUpd, `  /* sbLivePoll: pick up other people's changes to the board you are looking at */
  const liveId = activeBoard ? activeBoard.id : null;
  useEffect(() => {
    if (!LIVE || !liveId) return;
    let stopped = false;
    const busyTyping = () => {
      const el = typeof document !== 'undefined' ? document.activeElement : null;
      if (!el) return false;
      const t = (el.tagName || '').toUpperCase();
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable === true;
    };
    const tick = async () => {
      try {
        if (stopped) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        if (busyTyping()) return;
        if (Date.now() - SB_LAST_WRITE < 5000) return;
        const d = await API.call('/boards-rev');
        if (stopped || !d || !Array.isArray(d.revs)) return;
        const hit = d.revs.find(r => r.id === liveId);
        if (!hit || !hit.rev) return;
        if (SB_REVS[liveId] === hit.rev) return;
        const mine = String(d.me || '').toLowerCase();
        if (String(hit.by || '').toLowerCase() === mine) {
          SB_REVS[liveId] = hit.rev;
          return;
        }
        if (busyTyping() || Date.now() - SB_LAST_WRITE < 5000) return;
        const one = await API.call('/boards-one?id=' + encodeURIComponent(liveId));
        if (stopped || !one || !one.board) return;
        SB_REVS[liveId] = one.rev || hit.rev;
        updateBoard(liveId, () => one.board);
        const whoName = String(hit.by || '').split('@')[0].replace(/[._-]+/g, ' ');
        sbFlash((whoName || 'Someone') + ' updated this board - refreshed', 'ok');
      } catch (e) {}
    };
    const iv = setInterval(tick, 15000);
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) tick();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      clearInterval(iv);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
  }, [liveId]);
  const toggleFav = id => setBoards(bs => bs.map(b => b.id === id ? {`);

fs.writeFileSync(PAGE + '.bak-livepage', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  open board refreshes every 15s when someone else saves');
console.log('OK  skipped while typing, while your own save is in flight, or tab hidden');
console.log('OK  refreshes immediately when you switch back to the tab');
console.log('Backup: spark-boards.html.bak-livepage');
