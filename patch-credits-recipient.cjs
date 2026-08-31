/* patch-credits-recipient.cjs — stop writing the calculated Credit Recipient field
   Salesforce rejected both records with:
     "Unable to create/update fields: bpats__Credit_Recipient__c"
   That field is calculated on save (the New Placement Credit form says so), so it
   cannot be set directly. Salesforce derives it from bpats__User__c, which we are
   already setting to the Salesforce User Id chosen on the board.
   Run from the repo root:  node patch-credits-recipient.cjs   then deploy the worker.
*/
const fs = require('fs');
const path = require('path');
const WORKER = path.join('worker', 'cloudworker.js');

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}
let w = read(WORKER);
if (w.indexOf('/boards-placement-credits') === -1) throw new Error('Run patch-credits-worker.cjs first. Aborting.');
if (w.indexOf('recipient is calculated on save') !== -1) throw new Error('Already applied. Aborting.');

const a = `          const rec = {
            Name: r.Name,
            bpats__Placement__c: placementId,
            bpats__ATS_Role_Type__c: "User Lookup",
            bpats__Credit_Recipient__c: r.recipient,
            bpats__Credit_Percentage__c: 100,
            bpats__User__c: r.userId
          };`;
must(w, a, 'credit-record');
w = w.replace(a, `          /* recipient is calculated on save from bpats__User__c - do not send it */
          const rec = {
            Name: r.Name,
            bpats__Placement__c: placementId,
            bpats__ATS_Role_Type__c: "User Lookup",
            bpats__Credit_Percentage__c: 100,
            bpats__User__c: r.userId
          };`);

fs.writeFileSync(WORKER + '.bak-recip', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  no longer sends the calculated Credit Recipient field');
console.log('OK  recipient comes from the User lookup, which is already set');
console.log('Backup: worker/cloudworker.js.bak-recip');
