/* patch-sf-links.cjs — open Salesforce records straight from the board
   Sync and the name lookup now also capture the Candidate and Job record ids and
   your Salesforce instance URL. The board then shows:
     - a link icon in the ITEM cell   -> the candidate's record in Salesforce
     - a link icon in the Client cell -> the job the candidate is placed on
   Both open in a new tab. Icons appear only on rows that have the id.
   Patches BOTH files. Run from the repo root:  node patch-sf-links.cjs
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
if (w.indexOf('sf_cand_id') !== -1) throw new Error('Worker already applied. Aborting.');
if (w.indexOf('sfClientFill') === -1) throw new Error('Run patch-sync-client.cjs first. Aborting.');

const aSoql = `bpats__Start_Date__c, bpats__Account__r.Name, bpats__ATS_Job__r.Name FROM bpats__Placement__c WHERE (bpats__Start_Date__c = LAST_N_DAYS:`;
must(w, aSoql, 'sync-soql');
w = w.replace(aSoql, `bpats__Start_Date__c, bpats__Account__r.Name, bpats__ATS_Job__r.Name, bpats__ATS_Candidate__c, bpats__ATS_Job__c FROM bpats__Placement__c WHERE (bpats__Start_Date__c = LAST_N_DAYS:`);

const aMap = `client: r.bpats__Account__r && r.bpats__Account__r.Name || "", job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || "", dup: false };`;
must(w, aMap, 'sync-map');
w = w.replace(aMap, `client: r.bpats__Account__r && r.bpats__Account__r.Name || "", job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || "", candId: r.bpats__ATS_Candidate__c || "", jobId: r.bpats__ATS_Job__c || "", dup: false };`);

const aApply = `            if (hit.job) it.sf_job = hit.job;
            matched++;`;
must(w, aApply, 'sync-apply');
w = w.replace(aApply, `            if (hit.job) it.sf_job = hit.job;
            if (hit.candId) it.sf_cand_id = hit.candId;
            if (hit.jobId) it.sf_job_id = hit.jobId;
            matched++;`);

/* return the instance url so links can be built */
const aRet = `        console.log("BOARDS-SF-SYNC by " + who.email + ": board " + boardId + " matched " + matched + "/" + (sf.records || []).length);`;
must(w, aRet, 'sync-log');
w = w.replace(aRet, `        let sfInstance = "";
        try {
          const tk = await getSalesforceToken(env);
          sfInstance = tk.instance_url || "";
        } catch (e) {}
        board.sfInstance = sfInstance;
        console.log("BOARDS-SF-SYNC by " + who.email + ": board " + boardId + " matched " + matched + "/" + (sf.records || []).length);`);

/* single lookup */
const aSearch = `bpats__ATS_Candidate__r.Name, bpats__Account__r.Name, bpats__ATS_Job__r.Name FROM bpats__Placement__c WHERE bpats__ATS_Candidate__r.Name LIKE`;
must(w, aSearch, 'search-soql');
w = w.replace(aSearch, `bpats__ATS_Candidate__r.Name, bpats__Account__r.Name, bpats__ATS_Job__r.Name, bpats__ATS_Candidate__c, bpats__ATS_Job__c FROM bpats__Placement__c WHERE bpats__ATS_Candidate__r.Name LIKE`);

const aRes = `          client: r.bpats__Account__r && r.bpats__Account__r.Name || "",
          job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || ""
        })).filter((x) => x.name);`;
must(w, aRes, 'search-res');
w = w.replace(aRes, `          client: r.bpats__Account__r && r.bpats__Account__r.Name || "",
          job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || "",
          candId: r.bpats__ATS_Candidate__c || "",
          jobId: r.bpats__ATS_Job__c || ""
        })).filter((x) => x.name);`);

/* ---------------- page ---------------- */
let p = read(PAGE);
if (p.indexOf('sfOpen') !== -1) throw new Error('Page already applied. Aborting.');

const aCss = `  .date-wrap{position:relative;display:flex;align-items:center;width:100%;height:100%}`;
must(p, aCss, 'date-wrap-css');
p = p.replace(aCss, `  .sf-link{flex-shrink:0;width:22px;height:22px;border:0;border-radius:6px;background:none;color:var(--faint);cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .12s}
  tr:hover .sf-link{opacity:1}
  .sf-link:hover{background:var(--surface-2);color:#0086C0}
  .sf-link svg{width:13px;height:13px}
  .client-wrap{display:flex;align-items:center;width:100%;height:100%}
  .client-wrap>*:first-child{flex:1;min-width:0}
  .date-wrap{position:relative;display:flex;align-items:center;width:100%;height:100%}`);

const aComp = `function StartSync({ boardId, itemId, date }) {`;
must(p, aComp, 'startsync-fn');
p = p.replace(aComp, `/* sfOpen: Salesforce resolves /<recordId> to the right object, so one shape works for all */
const sfInstanceOf = b => {
  const v = (b && b.sfInstance) || '';
  if (v) {
    try {
      localStorage.spark_sb_sf_instance = v;
    } catch (e) {}
    return v;
  }
  try {
    return localStorage.spark_sb_sf_instance || '';
  } catch (e) {
    return '';
  }
};
function SfLink({ board, recId, label }) {
  const base = sfInstanceOf(board);
  if (!recId || !base) return null;
  return React.createElement('button', {
    className: 'sf-link',
    title: label,
    onMouseDown: e => e.stopPropagation(),
    onClick: e => {
      e.stopPropagation();
      window.open(base.replace(/\\/$/, '') + '/' + recId, '_blank', 'noopener');
    }
  }, React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
  }, React.createElement('path', { d: 'M14 4h6v6' }),
     React.createElement('path', { d: 'M20 4 11 13' }),
     React.createElement('path', { d: 'M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5' })));
}
function StartSync({ boardId, itemId, date }) {`);

/* candidate link in the ITEM cell */
const aItem = `      })), /*#__PURE__*/React.createElement("button", {
        className: "update-btn" + (updates ? ' has' : ''),`;
must(p, aItem, 'item-cell');
p = p.replace(aItem, `       })), /*#__PURE__*/React.createElement(SfLink, {
        board: board,
        recId: it.sf_cand_id,
        label: "Open this candidate in Salesforce"
      }), /*#__PURE__*/React.createElement("button", {
        className: "update-btn" + (updates ? ' has' : ''),`);

/* job link in the Client cell */
const aText = `      }), c.type === 'text' && /*#__PURE__*/React.createElement(TextCell, {
        value: it[c.key],
        onChange: v => setItem(gi, ii, c.key, v)
      }))), canEdit && /*#__PURE__*/React.createElement("td", null));`;
must(p, aText, 'text-dispatch');
p = p.replace(aText, `      }), c.type === 'text' && /*#__PURE__*/React.createElement("div", {
        className: "client-wrap"
      }, /*#__PURE__*/React.createElement(TextCell, {
        value: it[c.key],
        onChange: v => setItem(gi, ii, c.key, v)
      }), /client/i.test(String(c.label || c.name || c.key || '')) && /*#__PURE__*/React.createElement(SfLink, {
        board: board,
        recId: it.sf_job_id,
        label: it.sf_job ? 'Open the job in Salesforce: ' + it.sf_job : 'Open the job in Salesforce'
      })))), canEdit && /*#__PURE__*/React.createElement("td", null));`);

/* keep the ids when a row is linked by name */
const aSF = `      sf_client: it.sf_client,
      sf_job: it.sf_job
    };`;
must(p, aSF, 'setitemsf');
p = p.replace(aSF, `      sf_client: it.sf_client,
      sf_job: it.sf_job,
      sf_cand_id: it.sf_cand_id,
      sf_job_id: it.sf_job_id
    };`);

const aPick = `    if (rec.job) it.sf_job = rec.job;`;
must(p, aPick, 'setitemsf-job');
p = p.replace(aPick, `    if (rec.job) it.sf_job = rec.job;
    if (rec.candId) it.sf_cand_id = rec.candId;
    if (rec.jobId) it.sf_job_id = rec.jobId;`);

fs.writeFileSync(WORKER + '.bak-links', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-links', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  sync captures Candidate id, Job id and your Salesforce instance');
console.log('OK  link icon in the ITEM cell opens the candidate');
console.log('OK  link icon in the Client cell opens the job');
console.log('Backups: *.bak-links');
