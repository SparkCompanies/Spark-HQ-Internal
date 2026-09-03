/* patch-sf-name-match.cjs — Sync with Salesforce and Find unclaimed stop requiring an exact name.
   Both matched a board row to Salesforce by exact candidate name, so "Jayden Dean Brown" never
   matched "Jayden Brown", and every such row was also counted as "unclaimed" while sitting on the board.
   Now: match by sfId first for any row ever linked, then by a tolerant key (first + last name; middle
   names, Jr/Sr/III, accents, punctuation, and "Last, First" order ignored). Collisions still hit the
   existing dup / sf_ambiguous guard, so this can flag more rows ambiguous but cannot mis-link one.
   Run from repo root: node patch-sf-name-match.cjs
*/
const fs = require('fs');
const WORKER = 'worker/cloudworker.js';
function read(f){ if(!fs.existsSync(f)) throw new Error('Cannot find '+f+' - run from the repo root.'); return fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'); }
function repl(s, oldStr, newStr, label){
  const n = s.split(oldStr).length - 1;
  if(n !== 1) throw new Error('ANCHOR '+label+': expected 1 match, found '+n+'. Your worker differs from the copy I patched against. Nothing written - send me the current file.');
  return s.replace(oldStr, () => newStr);
}
let w = read(WORKER);
if (w.indexOf("const sbNameKey") !== -1) throw new Error('Already applied (found ' + "const sbNameKey" + '). Aborting.');
w = repl(w, "    /* ---- sbAccess: who may see which boards ---- */\n    const MEMBER_BOARDS = [\"b1\"];", "    /* sbNameKey: tolerant person-name key for Salesforce matching. Strips accents and punctuation,\n       flips \"Last, First\", drops middle names and Jr/Sr/II/III/IV, and keys on first + last.\n       A looser key can only make MORE rows collide, and collisions land in the existing dup /\n       sf_ambiguous guard, so this can flag a row as ambiguous but never mis-link it. */\n    const sbNameKey = (raw) => {\n      let s = String(raw == null ? \"\" : raw);\n      try { s = s.normalize(\"NFD\").replace(/[\\u0300-\\u036f]/g, \"\"); } catch (e) {}\n      s = s.toLowerCase();\n      if (s.indexOf(\",\") !== -1) { const p = s.split(\",\"); s = p.slice(1).join(\" \") + \" \" + p[0]; }\n      s = s.replace(/[^a-z\\s]/g, \" \").replace(/\\s+/g, \" \").trim();\n      if (!s) return \"\";\n      const t = s.split(\" \").filter((w) => w && !/^(jr|sr|ii|iii|iv|v)$/.test(w));\n      if (!t.length) return \"\";\n      if (t.length === 1) return t[0];\n      return t[0] + \" \" + t[t.length - 1];\n    };\n    /* ---- sbAccess: who may see which boards ---- */\n    const MEMBER_BOARDS = [\"b1\"];", "sbNameKey helper");
w = repl(w, "        const byName = {};\n        (sf.records || []).forEach((r) => {\n          const cand = r.bpats__ATS_Candidate__r && r.bpats__ATS_Candidate__r.Name ? r.bpats__ATS_Candidate__r.Name : \"\";\n          const n = String(cand).toLowerCase().replace(/\\s+/g, \" \").trim();\n          if (!n) return;\n          if (!byName[n]) byName[n] = { sfId: r.Id, status: r.Status__c || \"\", start: r.bpats__Start_Date__c || \"\", client: r.bpats__Account__r && r.bpats__Account__r.Name || \"\", job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || \"\", candId: r.bpats__ATS_Candidate__c || \"\", jobId: r.bpats__ATS_Job__c || \"\", dup: false };\n          else byName[n].dup = true;\n        });", "        const byName = {};\n        const byId = {};\n        (sf.records || []).forEach((r) => {\n          const cand = r.bpats__ATS_Candidate__r && r.bpats__ATS_Candidate__r.Name ? r.bpats__ATS_Candidate__r.Name : \"\";\n          const n = sbNameKey(cand);\n          const rec = { sfId: r.Id, status: r.Status__c || \"\", start: r.bpats__Start_Date__c || \"\", client: r.bpats__Account__r && r.bpats__Account__r.Name || \"\", job: r.bpats__ATS_Job__r && r.bpats__ATS_Job__r.Name || \"\", candId: r.bpats__ATS_Candidate__c || \"\", jobId: r.bpats__ATS_Job__c || \"\", dup: false };\n          /* an Id is unique, so the byId copy is never marked dup */\n          byId[String(r.Id).slice(0, 15)] = Object.assign({}, rec);\n          if (!n) return;\n          if (!byName[n]) byName[n] = rec;\n          else byName[n].dup = true;\n        });", "sync byName + byId build");
w = repl(w, "          const key = String(it.name || \"\").toLowerCase().replace(/\\s+/g, \" \").trim();\n          const hit = byName[key];\n          if (hit) {", "          const key = sbNameKey(it.name);\n          /* a row that has ever been linked matches by Id first, so it never falls out on a spelling change */\n          const hit = (it.sfId && byId[String(it.sfId).slice(0, 15)]) || byName[key];\n          if (hit) {", "sync row lookup: sfId first, then tolerant name");
w = repl(w, "          if (x.name) haveName[String(x.name).toLowerCase().replace(/\\s+/g, \" \").trim()] = true;", "          if (x.name) haveName[sbNameKey(x.name)] = true;", "unclaimed: haveName uses tolerant key");
w = repl(w, "          if (haveName[nm.toLowerCase().replace(/\\s+/g, \" \").trim()]) return;", "          if (haveName[sbNameKey(nm)]) return;", "unclaimed: lookup uses tolerant key");
fs.writeFileSync(WORKER + '.bak-namematch', read(WORKER));
fs.writeFileSync(WORKER, w);
console.log('OK  worker: Sync matches by sfId first, then first+last name (middle names, suffixes, accents ignored)');
console.log('OK  worker: Find unclaimed uses the same tolerant key, so on-board people stop counting as unclaimed');
console.log('Backup: worker/cloudworker.js.bak-namematch');
