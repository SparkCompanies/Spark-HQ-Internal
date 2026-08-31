/* patch-credits-worker.cjs — create placement credits from a board row
   POST /boards-placement-credits  { board_id, item_id, preview? }
   Reads the row's Sales Rep and Recruiter (Salesforce User columns), checks the
   placement in Salesforce is actually started, and writes the credits:
     different people -> Sales Credit + Recruiter Credit
     same person      -> Sales Credit + Full Desk Credit
   Always two records, 100% each, Role Type "User Lookup", matching how the
   commission report splits the charge across kept credits.
   Refuses if credits already exist unless replace:true is sent.
   Run from the repo root:  node patch-credits-worker.cjs   then deploy the worker.
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
if (w.indexOf('/boards-placement-credits') !== -1) throw new Error('Already applied. Aborting.');
if (w.indexOf('/boards-op') === -1) throw new Error('Run patch-ops-worker.cjs first. Aborting.');

const anchor = `    if (url.pathname === "/boards-versions") {`;
must(w, anchor, 'versions-route');

const route = `    if (url.pathname === "/boards-placement-credits" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let cb;
      try {
        cb = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const cbid = String(cb.board_id || "").slice(0, 60);
      const citem = String(cb.item_id || "").slice(0, 80);
      if (!cbid || !citem) return json({ error: "board_id and item_id required" }, 400, origin);
      const clean = (v) => String(v || "").replace(/[^a-zA-Z0-9]/g, "");
      try {
        const br = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members&id=eq." + encodeURIComponent(cbid) + "&limit=1");
        if (!br.ok || !br.data || !br.data[0]) return json({ error: "board not found" }, 404, origin);
        const brow = br.data[0];
        {
          const crole = typeof sbRoleOf === "function" ? await sbRoleOf(who.email) : "member";
          if (typeof sbAccess === "function" && !sbAccess({ id: cbid, visibility: brow.visibility, owner: brow.owner, members: brow.members }, who.email, crole)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }
        const bd = brow.data || {};
        let item = null;
        for (const g of bd.groups || []) {
          for (const it of g.items || []) if (it && it.id === citem) item = it;
        }
        if (!item) return json({ error: "row not found on this board" }, 404, origin);
        const cols = bd.columns || [];
        const findCol = (re) => cols.find((c) => c && c.type === "sfuser" && re.test(String(c.label || c.name || c.key || "")));
        const salesCol = findCol(/sales|account manager|\\bam\\b/i);
        const recCol = findCol(/recruit/i);
        const salesId = clean(salesCol ? item[salesCol.key] : "");
        const recId = clean(recCol ? item[recCol.key] : "");
        if (!salesCol || !recCol) return json({ error: "This board needs a Sales Rep and a Recruiter column of type Salesforce User." }, 400, origin);
        if (!salesId) return json({ error: "Set the Sales Rep on this row first." }, 400, origin);
        if (!recId) return json({ error: "Set the Recruiter on this row first." }, 400, origin);
        const placementId = clean(item.sfId);
        if (!placementId) return json({ error: "This row is not linked to Salesforce yet. Run Sync with Salesforce first." }, 409, origin);
        const pq = await runSalesforceQueryAll(env, "SELECT Id, Name, Status__c, bpats__Start_Date__c FROM bpats__Placement__c WHERE Id = '" + placementId + "'");
        if (!pq.ok) return json({ error: "Salesforce lookup failed: " + pq.error }, 502, origin);
        const pl = pq.records && pq.records[0];
        if (!pl) return json({ error: "That placement no longer exists in Salesforce." }, 404, origin);
        const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const started = pl.bpats__Start_Date__c ? String(pl.bpats__Start_Date__c).slice(0, 10) <= today : false;
        if (!started) {
          return json({
            error: "Not started yet. Placement credits can be applied once the start date has passed.",
            status: pl.Status__c || null,
            start_date: pl.bpats__Start_Date__c || null
          }, 409, origin);
        }
        const uq = await runSalesforceQueryAll(env, "SELECT Id, Name FROM User WHERE Id IN ('" + salesId + "','" + recId + "')");
        const uName = {};
        ((uq.ok && uq.records) || []).forEach((u) => {
          uName[u.Id.slice(0, 15)] = u.Name;
        });
        const nameOf = (id) => uName[id.slice(0, 15)] || "";
        const salesName = nameOf(salesId);
        const recName = nameOf(recId);
        if (!salesName || !recName) return json({ error: "Could not resolve those users in Salesforce. Re-pick them on the row." }, 400, origin);
        const fullDesk = salesId.slice(0, 15) === recId.slice(0, 15);
        const plan = [
          { Name: "Sales Credit", recipient: salesName, userId: salesId },
          { Name: fullDesk ? "Full Desk Credit" : "Recruiter Credit", recipient: recName, userId: recId }
        ];
        const eq = await runSalesforceQueryAll(env, "SELECT Id, Name, bpats__Credit_Recipient__c FROM bpats__Placement_Credit__c WHERE bpats__Placement__c = '" + placementId + "' AND bpats__Is_Void__c = false");
        const existing = (eq.ok && eq.records) || [];
        if (cb.preview === true) {
          return json({ ok: true, preview: true, placement: pl.Name || placementId, start_date: pl.bpats__Start_Date__c, status: pl.Status__c || null, full_desk: fullDesk, plan: plan.map((r) => ({ name: r.Name, recipient: r.recipient })), existing: existing.map((c) => ({ id: c.Id, name: c.Name, recipient: c.bpats__Credit_Recipient__c })) }, 200, origin);
        }
        if (existing.length && cb.replace !== true) {
          return json({ error: "This placement already has " + existing.length + " credit(s).", existing: existing.map((c) => ({ id: c.Id, name: c.Name, recipient: c.bpats__Credit_Recipient__c })) }, 409, origin);
        }
        let deleted = 0;
        if (existing.length && cb.replace === true) {
          for (const c of existing) {
            const dr = await sfWrite(env, "DELETE", "/sobjects/bpats__Placement_Credit__c/" + c.Id);
            if (dr.ok) deleted++;
          }
        }
        let typeField = null;
        try {
          const tok = await getSalesforceToken(env);
          const dr2 = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/bpats__Placement_Credit__c/describe", { headers: { Authorization: "Bearer " + tok.access_token } });
          const dd = await dr2.json();
          if (dr2.ok && dd && Array.isArray(dd.fields)) {
            const f = dd.fields.find((x) => x.type === "picklist" && /type/i.test(x.name) && !/role/i.test(x.name) && (x.picklistValues || []).some((v) => v.value === "Timesheet"));
            if (f) typeField = f.name;
          }
        } catch (e) {}
        const created = [];
        const errs = [];
        for (const r of plan) {
          const rec = {
            Name: r.Name,
            bpats__Placement__c: placementId,
            bpats__ATS_Role_Type__c: "User Lookup",
            bpats__Credit_Recipient__c: r.recipient,
            bpats__Credit_Percentage__c: 100,
            bpats__User__c: r.userId
          };
          if (typeField) rec[typeField] = "Timesheet";
          const cr = await sfWrite(env, "POST", "/sobjects/bpats__Placement_Credit__c", rec);
          if (cr.ok) created.push({ name: r.Name, recipient: r.recipient, id: cr.data && cr.data.id });
          else errs.push(r.Name + ": " + JSON.stringify(cr.data).slice(0, 160));
        }
        return json({
          ok: errs.length === 0,
          placement: pl.Name || placementId,
          full_desk: fullDesk,
          deleted,
          created,
          type_field: typeField,
          errors: errs.length ? errs : void 0
        }, errs.length ? 502 : 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
`;
w = w.replace(anchor, route + anchor);

fs.writeFileSync(WORKER + '.bak-credits', fs.readFileSync(WORKER));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
console.log('OK  POST /boards-placement-credits');
console.log('OK  gated on the real Salesforce start date, not the cached board status');
console.log('OK  Sales Credit + Recruiter Credit, or Sales Credit + Full Desk Credit');
console.log('OK  refuses if credits already exist unless replace:true');
console.log('OK  finds the Type picklist by describe rather than guessing its API name');
console.log('Backup: worker/cloudworker.js.bak-credits');
