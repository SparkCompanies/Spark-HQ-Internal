/* patch-start-sync.cjs — push a revised start date to the Salesforce placement
   Worker: POST /boards-push-start { board_id, item_id }
     reads the row's Start Date column, writes it to bpats__Start_Date__c on the
     linked placement, stamps the row, and posts a note in the item Updates thread.
   Page: the Start Date cell shows a small sync arrow when the board date differs
     from the date Salesforce last reported, so it appears only when it is needed.
   Patches BOTH files. Run from the repo root:  node patch-start-sync.cjs
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
if (w.indexOf('/boards-push-start') !== -1) throw new Error('Worker already has /boards-push-start. Aborting.');
if (w.indexOf('/boards-placement-credits') === -1) throw new Error('Run patch-credits-worker.cjs first. Aborting.');

const anchor = `    if (url.pathname === "/boards-versions") {`;
must(w, anchor, 'versions-route');
const route = `    if (url.pathname === "/boards-push-start" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let sb2;
      try {
        sb2 = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const sbid = String(sb2.board_id || "").slice(0, 60);
      const sitem = String(sb2.item_id || "").slice(0, 80);
      if (!sbid || !sitem) return json({ error: "board_id and item_id required" }, 400, origin);
      try {
        const br2 = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members&id=eq." + encodeURIComponent(sbid) + "&limit=1");
        if (!br2.ok || !br2.data || !br2.data[0]) return json({ error: "board not found" }, 404, origin);
        const brow2 = br2.data[0];
        {
          const srole2 = typeof sbRoleOf === "function" ? await sbRoleOf(who.email) : "member";
          if (typeof sbAccess === "function" && !sbAccess({ id: sbid, visibility: brow2.visibility, owner: brow2.owner, members: brow2.members }, who.email, srole2)) {
            return json({ error: "You do not have access to this board." }, 403, origin);
          }
        }
        const bd2 = brow2.data || {};
        let it2 = null;
        for (const g of bd2.groups || []) {
          for (const x of g.items || []) if (x && x.id === sitem) it2 = x;
        }
        if (!it2) return json({ error: "row not found on this board" }, 404, origin);
        const dcol = (bd2.columns || []).find((c) => c && c.type === "date" && /start/i.test(String(c.label || c.name || c.key || ""))) || (bd2.columns || []).find((c) => c && c.type === "date");
        if (!dcol) return json({ error: "This board has no Start Date column." }, 400, origin);
        const newDate = String(it2[dcol.key] || "").slice(0, 10);
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(newDate)) return json({ error: "Set a start date on this row first." }, 400, origin);
        const plid = String(it2.sfId || "").replace(/[^a-zA-Z0-9]/g, "");
        if (!plid) return json({ error: "This row is not linked to Salesforce yet. Run Sync with Salesforce first." }, 409, origin);
        const pr4 = await runSalesforceQueryAll(env, "SELECT Id, Name, bpats__Start_Date__c, Status__c FROM bpats__Placement__c WHERE Id = '" + plid + "'");
        if (!pr4.ok) return json({ error: "Salesforce lookup failed: " + pr4.error }, 502, origin);
        const pl4 = pr4.records && pr4.records[0];
        if (!pl4) return json({ error: "That placement no longer exists in Salesforce." }, 404, origin);
        const wasDate = pl4.bpats__Start_Date__c ? String(pl4.bpats__Start_Date__c).slice(0, 10) : null;
        if (sb2.preview === true) {
          return json({ ok: true, preview: true, placement: pl4.Name || plid, from: wasDate, to: newDate, same: wasDate === newDate, status: pl4.Status__c || null }, 200, origin);
        }
        if (wasDate === newDate) return json({ ok: true, unchanged: true, placement: pl4.Name || plid, to: newDate }, 200, origin);
        const ur2 = await sfWrite(env, "PATCH", "/sobjects/bpats__Placement__c/" + plid, { bpats__Start_Date__c: newDate });
        if (!ur2.ok) return json({ error: "Salesforce rejected the update: " + JSON.stringify(ur2.data).slice(0, 200) }, 502, origin);
        try {
          const cur3 = await sbService(env, "GET", "spark_boards?select=data,visibility,owner,members&id=eq." + encodeURIComponent(sbid) + "&limit=1");
          const row3 = cur3.ok && cur3.data && cur3.data[0] ? cur3.data[0] : null;
          if (row3 && row3.data) {
            const d3 = row3.data;
            let t3 = null;
            for (const g of d3.groups || []) {
              for (const x of g.items || []) if (x && x.id === sitem) t3 = x;
            }
            if (t3) {
              const now3 = (/* @__PURE__ */ new Date()).toISOString();
              t3.sf_start = newDate;
              t3.updates = Array.isArray(t3.updates) ? t3.updates : [];
              t3.updates.push({
                id: "u" + Date.now().toString(36),
                author: who.email,
                color: "#0086C0",
                at: now3,
                text: "Start date pushed to Salesforce: " + (wasDate || "(none)") + " \\u2192 " + newDate
              });
              delete d3.__rev;
              await sbService(env, "POST", "spark_boards?on_conflict=id", {
                id: sbid,
                name: String(d3.name || "").slice(0, 200),
                data: d3,
                visibility: row3.visibility,
                owner: row3.owner,
                members: Array.isArray(row3.members) ? row3.members : [],
                updated_by: who.email,
                updated_at: now3
              });
            }
          }
        } catch (e) {}
        return json({ ok: true, placement: pl4.Name || plid, from: wasDate, to: newDate }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
`;
w = w.replace(anchor, route + anchor);

/* ---------------- page ---------------- */
let p = read(PAGE);
if (p.indexOf('startSyncBtn') !== -1) throw new Error('Page already patched. Aborting.');

const aCss = `  .sfu-backdrop{position:fixed;inset:0;z-index:399}`;
must(p, aCss, 'backdrop-css');
p = p.replace(aCss, `  .sfu-backdrop{position:fixed;inset:0;z-index:399}
  .date-wrap{position:relative;display:flex;align-items:center;width:100%;height:100%}
  .date-wrap>*:first-child{flex:1;min-width:0}
  .start-sync{flex-shrink:0;width:24px;height:24px;margin-right:6px;border:0;border-radius:6px;background:var(--gold);color:#1A1407;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .start-sync:hover{filter:brightness(1.06)}
  .start-sync svg{width:13px;height:13px}
  .start-sync.busy{opacity:.5;cursor:default}`);

const aDateRender = `      }), c.type === 'date' && /*#__PURE__*/React.createElement(DateCell, {
        value: it[c.key],
        onChange: v => setItem(gi, ii, c.key, v)
      }),`;
must(p, aDateRender, 'date-dispatch');
p = p.replace(aDateRender, `      }), c.type === 'date' && /*#__PURE__*/React.createElement("div", {
        className: "date-wrap"
      }, /*#__PURE__*/React.createElement(DateCell, {
        value: it[c.key],
        onChange: v => setItem(gi, ii, c.key, v)
      }), cellEdit && it.sfId && /start/i.test(String(c.label || c.name || c.key || '')) && it[c.key] && String(it[c.key]).slice(0, 10) !== String(it.sf_start || '').slice(0, 10) && /*#__PURE__*/React.createElement(StartSync, {
        boardId: board.id,
        itemId: it.id,
        date: it[c.key]
      })),`);

const aComp = `function DateCell({`;
must(p, aComp, 'datecell-fn');
p = p.replace(aComp, `/* startSyncBtn: appears only when the row's start date differs from Salesforce */
function StartSync({ boardId, itemId, date }) {
  const [busy, setBusy] = useState(false);
  const go = e => {
    e.stopPropagation();
    if (busy) return;
    if (!confirm('Push this start date to the Salesforce placement?\\n\\nNew start date: ' + date)) return;
    setBusy(true);
    API.call('/boards-push-start', {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId, item_id: itemId })
    }).then(d => {
      setBusy(false);
      if (d && d.unchanged) sbFlash('Salesforce already had that start date.', 'ok');else sbFlash('Start date updated in Salesforce: ' + (d && d.from ? d.from + ' \\u2192 ' : '') + (d && d.to ? d.to : ''), 'ok');
    }).catch(err => {
      setBusy(false);
      const m = err && err.message ? err.message : '';
      let msg = m;
      try {
        msg = JSON.parse(m.slice(m.indexOf('{'))).error || m;
      } catch (x) {}
      sbFlash('Not pushed. ' + msg);
    });
  };
  return React.createElement('button', {
    className: 'start-sync' + (busy ? ' busy' : ''),
    title: 'Push this start date to Salesforce',
    onMouseDown: e => e.stopPropagation(),
    onClick: go
  }, React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2.4', strokeLinecap: 'round', strokeLinejoin: 'round'
  }, React.createElement('path', { d: 'M21 12a9 9 0 1 1-3-6.7' }), React.createElement('path', { d: 'M21 4v5h-5' })));
}
function DateCell({`);

fs.writeFileSync(WORKER + '.bak-startsync', fs.readFileSync(WORKER));
fs.writeFileSync(PAGE + '.bak-startsync', fs.readFileSync(PAGE));
fs.writeFileSync(WORKER, w.replace(/\n/g, '\r\n'));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  POST /boards-push-start writes the row date to the placement');
console.log('OK  sync arrow shows only when the board date differs from Salesforce');
console.log('OK  logs the change as a note on the item');
console.log('Backups: *.bak-startsync');
