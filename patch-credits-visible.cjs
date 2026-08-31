/* patch-credits-visible.cjs — always show the credits panel, explain when it cannot run
   The panel was hidden entirely on rows with no Salesforce link, so it looked like
   the feature was missing rather than not yet applicable. It now always renders and
   says what is needed: link the row, or set Sales Rep and Recruiter.
   Run from the repo root:  node patch-credits-visible.cjs
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
if (p.indexOf('CreditPanel') === -1) throw new Error('Run patch-credits-button.cjs first. Aborting.');
if (p.indexOf('notLinked') !== -1) throw new Error('Already applied. Aborting.');

/* 1. show it on every row */
const aShow = `    showCredits: !!(drawerItem && drawerItem.sfId),`;
must(p, aShow, 'show-credits');
p = p.replace(aShow, `    showCredits: true,`);

/* 2. the panel explains the blocker itself */
const aIdle = `    s.phase === 'idle' && React.createElement('div', null,`;
must(p, aIdle, 'panel-idle');
p = p.replace(aIdle, `    s.phase === 'idle' && !item.sfId && React.createElement('div', null,
      React.createElement('div', { className: 'cred-msg' },
        'This row is not linked to a Salesforce placement yet, so credits cannot be applied.'),
      React.createElement('div', { className: 'cred-msg', style: { color: 'var(--sub)' } },
        'Use Sync with Salesforce on the board, or set the candidate name from the Salesforce lookup in the ITEM cell. The Started in SF column shows Synced once it is linked.')),
    s.phase === 'idle' && item.sfId && React.createElement('div', null,`);

fs.writeFileSync(PAGE + '.bak-credvis', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  credits panel shows on every row');
console.log('OK  unlinked rows explain what is needed instead of hiding');
console.log('Backup: spark-boards.html.bak-credvis');
