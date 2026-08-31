/* patch-doc-probe.cjs — read-only: find out how I-9 documents are stored
   GET /boards-doc-probe?item=<itemId>&board=<boardId>
   For that row's candidate it reports:
     - Salesforce Files linked to the candidate (title, type, dates)
     - every child relationship on the candidate object whose name looks
       document-related, and a sample of records from each
     - all date fields on those objects, which is where an expiry would live
   Writes nothing. Purely to see the shape before designing the rule.
   Run from the repo root:  node patch-doc-probe.cjs   then deploy the worker.
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
if (w.indexOf('/boards-doc-probe') !== -1) throw new Error('Already applied. Aborting.');

const anchor = `    if (url.pathname === "/boards-versions") {`;
must(w, anchor, 'versions-route');

const route = `    if (url.pathname === "/boards-doc-probe") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const pbid = String(url.searchParams.get("board") || "").slice(0, 60);
      const pitem = String(url.searchParams.get("item") || "").slice(0, 80);
      let candId = String(url.searchParams.get("candidate") || "").replace(/[^a-zA-Z0-9]/g, "");
      const out = { candidate_id: null, candidate_name: null, files: [], child_objects: [], samples: {}, notes: [] };
      try {
        if (!candId && pbid && pitem) {
          const br5 = await sbService(env, "GET", "spark_boards?select=data&id=eq." + encodeURIComponent(pbid) + "&limit=1");
          if (br5.ok && br5.data && br5.data[0]) {
            for (const g of br5.data[0].data.groups || []) {
              for (const x of g.items || []) if (x && x.id === pitem) candId = String(x.sf_cand_id || "").replace(/[^a-zA-Z0-9]/g, "");
            }
          }
        }
        if (!candId) return json({ error: "No candidate id. Run Sync with Salesforce first, or pass ?candidate=<id>." }, 400, origin);
        out.candidate_id = candId;
        const tok = await getSalesforceToken(env);
        const H = { Authorization: "Bearer " + tok.access_token };
        const V = "/services/data/v60.0";
        /* 1. Salesforce Files attached to the candidate */
        try {
          const q1 = "SELECT ContentDocument.Title, ContentDocument.FileType, ContentDocument.CreatedDate, ContentDocument.ContentSize FROM ContentDocumentLink WHERE LinkedEntityId = '" + candId + "'";
          const r1 = await fetch(tok.instance_url + V + "/query?q=" + encodeURIComponent(q1), { headers: H });
          const d1 = await r1.json();
          if (r1.ok && d1.records) {
            out.files = d1.records.map((x) => ({
              title: x.ContentDocument && x.ContentDocument.Title,
              type: x.ContentDocument && x.ContentDocument.FileType,
              created: x.ContentDocument && x.ContentDocument.CreatedDate
            }));
          } else out.notes.push("files query: " + JSON.stringify(d1).slice(0, 160));
        } catch (e) {
          out.notes.push("files: " + String(e.message || e));
        }
        /* 2. which object is the candidate, and what hangs off it */
        let candObj = "bpats__ATS_Candidate__c";
        try {
          const r0 = await fetch(tok.instance_url + V + "/sobjects/bpats__ATS_Candidate__c/" + candId + "?fields=Id,Name", { headers: H });
          const d0 = await r0.json();
          if (r0.ok && d0) out.candidate_name = d0.Name || null;
          else out.notes.push("candidate fetch: " + JSON.stringify(d0).slice(0, 120));
        } catch (e) {
          out.notes.push("candidate: " + String(e.message || e));
        }
        try {
          const rd = await fetch(tok.instance_url + V + "/sobjects/" + candObj + "/describe", { headers: H });
          const dd = await rd.json();
          if (rd.ok && dd && Array.isArray(dd.childRelationships)) {
            const kids = dd.childRelationships.filter((c) => c.childSObject && /doc|file|attach|i9|form|complian|onboard|credential/i.test(c.childSObject));
            out.child_objects = kids.map((c) => ({ object: c.childSObject, field: c.field, relationship: c.relationshipName }));
            for (const k of kids.slice(0, 4)) {
              try {
                const kd = await fetch(tok.instance_url + V + "/sobjects/" + k.childSObject + "/describe", { headers: H });
                const kj = await kd.json();
                const dateFields = (kj.fields || []).filter((f) => f.type === "date" || f.type === "datetime").map((f) => f.name + " (" + f.label + ")");
                const nameish = (kj.fields || []).filter((f) => /name|type|title|status/i.test(f.name) && f.type !== "reference").map((f) => f.name).slice(0, 8);
                const sel = ["Id"].concat(nameish.slice(0, 4)).concat(dateFields.slice(0, 4).map((x) => x.split(" ")[0]));
                const q2 = "SELECT " + Array.from(new Set(sel)).join(", ") + " FROM " + k.childSObject + " WHERE " + k.field + " = '" + candId + "' LIMIT 5";
                const r2 = await fetch(tok.instance_url + V + "/query?q=" + encodeURIComponent(q2), { headers: H });
                const d2 = await r2.json();
                out.samples[k.childSObject] = {
                  date_fields: dateFields,
                  records: r2.ok ? d2.records || [] : JSON.stringify(d2).slice(0, 200)
                };
              } catch (e) {
                out.samples[k.childSObject] = "error: " + String(e.message || e);
              }
            }
          }
        } catch (e) {
          out.notes.push("describe: " + String(e.message || e));
        }
        return json({ ok: true, probe: out }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e), probe: out }, 502, origin);
      }
    }
`;
w = w.replace(anchor, route + anchor);

fs.writeFileSync(WORKER + '.bak-probe', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  GET /boards-doc-probe - read-only inspection of candidate documents');
console.log('OK  reports files, document-like child objects, and their date fields');
console.log('Backup: worker/cloudworker.js.bak-probe');
