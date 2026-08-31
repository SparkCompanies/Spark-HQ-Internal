/* patch-sync-client.cjs — fill Client (and remember the job) from Salesforce on sync
   Both the bulk sync and the single-row name lookup now pull the placement's Account
   name and Job title. Sync writes the Account into the board's Client column when
   that cell is empty, and stores the job title on the row either way.
   Existing Client values are never overwritten - sync fills blanks only.
   Patches BOTH files. Run from the repo root:  node patch-sync-client.cjs
   Then deploy the worker, then push.
*/
const fs = require('fs');
const path = require('path');
const WORKER = path.join('worker', 'cloudworker.js');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}

/* ---------------- worker ---------------- */
let w = read(WORKER);
if (w.indexOf('sfClientFill') !== -1) throw new Error('Already applied. Aborting.');

/* bulk sync: widen the query */
const aSoql = `        const soql = "SELECT Id, bpats__ATS_Candidate__r.Name, Status__c, bpats__Start_Date__c FROM bpats__Placement__c WHERE (bpats__Start_Date__c = LAST_N_DAYS:" + days + " OR bpats__Start_Date__c = NEXT_N_DAYS:90) ORDER BY bpats__Start_Date__c DESC";`;
must(w, aSoql, 'sync-soql');
w = w.replace(aSoql, `        const soql = "SELECT Id, bpats__ATS_Candidate__r.Name, Status__c, bpats__Start_Date__c, bpats__Account__r.Name, bpats__ATS_Job__r.Name FROM bpats__Placement__c WHERE (bpats__Start_Date__c = LAST_N_DAYS:" + days + " OR bpats__Start_Date__c = NEXT_N_DAYS:90) ORDER BY bpats__Start_Date__c DESC";`);

const aMap = `          if (!byName[n]) byName[n] = { sfId: r.Id, status: r.Status__c || "", start: r.bpats__Start_Date__c || "", dup: false };`;
must(w, aMap, 'sync-map');
w = w.replace(aMap, `          if (!byName[n]) byName[n] = { sfId: r.Id, status: r.Status__c || "", start: r.bpats__Start_Date__c || "", client: r.bpats__Account__r && r.bpats__Account__r.Name || "", job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || "", dup: false };`);

const aApply = `            it.sf_status = hit.status;
            if (hit.start) it.sf_start = hit.start;
            matched++;`;
must(w, aApply, 'sync-apply');
w = w.replace(aApply, `            it.sf_status = hit.status;
            if (hit.start) it.sf_start = hit.start;
            /* sfClientFill: fill the Client column only when it is empty */
            if (hit.client) {
              it.sf_client = hit.client;
              const ccol = (board.columns || []).find((c) => c && /client/i.test(String(c.label || c.name || c.key || "")) && (c.type === "text" || c.type === "status"));
              if (ccol && ccol.type === "text" && !String(it[ccol.key] || "").trim()) it[ccol.key] = hit.client;
            }
            if (hit.job) it.sf_job = hit.job;
            matched++;`);

/* single-row lookup: same fields */
const aSearch = `        const soql = "SELECT Id, Status__c, bpats__Start_Date__c, bpats__ATS_Candidate__r.Name FROM bpats__Placement__c WHERE bpats__ATS_Candidate__r.Name LIKE '%" + safe + "%' ORDER BY bpats__Start_Date__c DESC LIMIT 25";`;
must(w, aSearch, 'search-soql');
w = w.replace(aSearch, `        const soql = "SELECT Id, Status__c, bpats__Start_Date__c, bpats__ATS_Candidate__r.Name, bpats__Account__r.Name, bpats__ATS_Job__r.Name FROM bpats__Placement__c WHERE bpats__ATS_Candidate__r.Name LIKE '%" + safe + "%' ORDER BY bpats__Start_Date__c DESC LIMIT 25";`);

const aRes = `          status: r.Status__c || "",
          start: r.bpats__Start_Date__c || ""
        })).filter((x) => x.name);`;
must(w, aRes, 'search-result');
w = w.replace(aRes, `          status: r.Status__c || "",
          start: r.bpats__Start_Date__c || "",
          client: r.bpats__Account__r && r.bpats__Account__r.Name || "",
          job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || ""
        })).filter((x) => x.name);`);

/* ---------------- page ---------------- */
let p = read(PAGE);
if (p.indexOf('sf_client') !== -1) throw new Error('Page already applied. Aborting.');

const aSF = `    const sfVals = {
      name: it.name,
      sfId: it.sfId,
      sf_ambiguous: false
    };`;
must(p, aSF, 'setitemsf-vals');
p = p.replace(aSF, `    if (rec.client) {
      it.sf_client = rec.client;
      const ccol = board.columns.find(c => /client/i.test(String(c.label || c.name || c.key || '')) && c.type === 'text');
      if (ccol && !String(it[ccol.key] || '').trim()) it[ccol.key] = rec.client;
    }
    if (rec.job) it.sf_job = rec.job;
    const sfVals = {
      name: it.name,
      sfId: it.sfId,
      sf_ambiguous: false,
      sf_client: it.sf_client,
      sf_job: it.sf_job
    };
    {
      const ccol2 = board.columns.find(c => /client/i.test(String(c.label || c.name || c.key || '')) && c.type === 'text');
      if (ccol2) sfVals[ccol2.key] = it[ccol2.key];
    }`);

fs.writeFileSync(WORKER + '.bak-client', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-client', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  sync and name lookup now return the Account and Job');
console.log('OK  Client column filled from Salesforce when it is blank');
console.log('OK  job title stored on the row as sf_job');
console.log('Backups: *.bak-client');
