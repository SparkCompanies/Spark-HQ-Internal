/* ============================================================================
 * patch-tk-sf-phase3.cjs
 * Spark TimeKeep <-> Salesforce, Phase 3 (HOURS PREVIEW + PUSH)
 *
 * Adds two endpoints to cloudworker.js:
 *   GET  /tk-hours-preview[?periodEnd=YYYY-MM-DD]
 *        Computes every linked employee's week from tk_punches using the
 *        EXACT TimeKeep algorithm (calcDayHours pairing, auto-lunch rule,
 *        overnight carry-over incl. the >=14:00 forward look), splits at
 *        policy.otWeekly, and shows it side by side with what is currently
 *        in ASYMBL. Read only. Includes plannedAction per row.
 *
 *   POST /tk-hours-push   body: { "periodEnd":"YYYY-MM-DD", "confirm":true }
 *        Recomputes server-side (never trusts a browser's numbers), then
 *        writes Regular (seq 1.0) / Overtime (seq 2.0) time entries via the
 *        Salesforce collections API. HARD RULES:
 *          - only placements linked in tk_employees (never account-wide)
 *          - Approved timesheets are never touched
 *          - anyone with unpaired IN punches is skipped (fix punches first)
 *          - a computed zero never overwrites nonzero Salesforce hours
 *        Preflights write permission via describe before writing anything.
 *
 * Algorithm port notes (verified against index.html 2026-08-10):
 *   - "in" pairs with next unused "out"; unpaired "in" = 0 for a closed week
 *   - lunch: -policy.breakMins (default 30) when gross >= breakReqHrs (8)
 *     unless break_exempt
 *   - forward look triggers at ET hour >= 14 (the CODE, not the >=18 comment)
 *   - the priorIsSunday branch is hardcoded false in source: inert, omitted
 *   - week total rounded to 0.1h before the split (matches app + SF data)
 *   - all calendar bucketing in America/Detroit (browser was ET implicitly;
 *     the worker is UTC and must convert)
 *
 * USAGE (Git Bash):
 *   cd ~/Desktop/Spark-HQ-Internal/worker
 *   node patch-tk-sf-phase3.cjs
 *   npx wrangler deploy
 * ==========================================================================*/

const fs = require("fs");
const path = require("path");

const TARGET = path.resolve(process.cwd(), "cloudworker.js");
const MARKER = "/tk-hours-preview";

if (!fs.existsSync(TARGET)) {
  throw new Error("cloudworker.js not found at " + TARGET +
    "\nRun this from ~/Desktop/Spark-HQ-Internal/worker");
}

const original = fs.readFileSync(TARGET, "utf8");

if (original.indexOf(MARKER) !== -1) {
  throw new Error("ABORT: cloudworker.js already contains " + MARKER +
    "\nPatch already applied. Nothing written.");
}

/* Phase 1 must be present: we anchor directly above its block. */
const ANCHOR_CANDIDATES = [
  '// \u2500\u2500 TimeKeep Phase 1: placement search',
  'if (url.pathname === "/tk-placements")'
];

let anchor = null, anchorIndex = -1;
for (const cand of ANCHOR_CANDIDATES) {
  const first = original.indexOf(cand);
  if (first === -1) continue;
  if (first !== original.lastIndexOf(cand)) { console.warn("  skip (not unique): " + cand); continue; }
  anchor = cand; anchorIndex = first; break;
}
if (anchorIndex === -1) {
  throw new Error("ABORT: Phase 1 anchor not found. Is patch-tk-sf-phase1 applied? Nothing written.");
}

const lineStart = original.lastIndexOf("\n", anchorIndex) + 1;
const indent = original.slice(lineStart, anchorIndex).match(/^[ \t]*/)[0] || "    ";

const BLOCK = String.raw`
// ── TimeKeep Phase 3: hours preview + push ─────────────────────────────────
// Faithful port of TimeKeep's calcDayHours / getDayPunchesWithCarryOver.
// All calendar bucketing in America/Detroit. See patch header for rules.

const tkET = (function(){
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
  const cache = new Map();
  return function(iso){
    let v = cache.get(iso);
    if (v) return v;
    const parts = fmt.formatToParts(new Date(iso));
    const g = {}; parts.forEach(function(p){ g[p.type] = p.value; });
    let h = parseInt(g.hour, 10); if (h === 24) h = 0;
    v = { d: g.year + "-" + g.month + "-" + g.day, h: h, t: new Date(iso).getTime() };
    if (cache.size > 20000) cache.clear();
    cache.set(iso, v);
    return v;
  };
})();

const tkAddDays = function(ymd, n){
  const p = ymd.split("-").map(Number);
  return new Date(Date.UTC(p[0], p[1]-1, p[2] + n)).toISOString().slice(0,10);
};

const tkSb = async function(env, pathQ){
  const r = await fetch(env.SUPABASE_URL + "/rest/v1/" + pathQ, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY }
  });
  if (!r.ok) throw new Error("supabase " + r.status + " on " + pathQ.split("?")[0]);
  return r.json();
};

// calcDayHours port. Unpaired "in" contributes 0 (browser only live-counts
// "today"); we count it so the caller can flag the person instead.
const tkDayHours = function(punches, exempt, pol){
  const sorted = punches.slice().sort(function(a,b){ return tkET(a.time).t - tkET(b.time).t; });
  let gross = 0, unpaired = 0;
  const used = {};
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type !== "in") continue;
    let paired = null;
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].type === "out" && !used[j]) { paired = sorted[j]; used[j] = true; break; }
    }
    if (paired) gross += tkET(paired.time).t - tkET(sorted[i].time).t;
    else unpaired++;
  }
  const grossH = gross / 3600000;
  const reqH = Number(pol.breakReqHrs) > 0 ? Number(pol.breakReqHrs) : 8;
  const mins = Number(pol.breakMins) > 0 ? Number(pol.breakMins) : 30;
  const breakMs = exempt ? 0 : (grossH >= reqH ? mins * 60000 : 0);
  return { grossH: grossH, netH: Math.max(0, (gross - breakMs) / 3600000), unpaired: unpaired };
};

// getDayPunchesWithCarryOver port. Forward look at ET hour >= 14; backward
// dedup when yesterday's evening clock-in already claimed this morning.
const tkDayPunches = function(byEid, eid, ymd){
  const all = byEid[eid] || [];
  let dp = all.filter(function(p){ return tkET(p.time).d === ymd; })
              .sort(function(a,b){ return tkET(a.time).t - tkET(b.time).t; });

  const last = dp.length ? dp[dp.length - 1] : null;
  if (last && last.type === "in" && tkET(last.time).h >= 14) {
    const nd = tkAddDays(ymd, 1);
    const next = all.filter(function(p){ return tkET(p.time).d === nd && tkET(p.time).h < 12; })
                    .sort(function(a,b){ return tkET(a.time).t - tkET(b.time).t; });
    for (let i = 0; i < next.length; i++) { dp.push(next[i]); if (next[i].type === "out") break; }
  }

  if (dp.length && dp[0].type !== "in") {
    const pd = tkAddDays(ymd, -1);
    const priorEveningIn = all.some(function(p){
      return tkET(p.time).d === pd && p.type === "in" && tkET(p.time).h >= 14;
    });
    if (priorEveningIn) {
      /* source's priorIsSunday branch is hardcoded false: inert, omitted */
      let firstIn = -1;
      for (let k = 0; k < dp.length; k++) { if (dp[k].type === "in") { firstIn = k; break; } }
      if (firstIn > 0) dp = dp.slice(firstIn);
      else if (firstIn === -1) {
        const evening = dp.filter(function(p){ return tkET(p.time).h >= 12; });
        dp = evening.length ? evening : [];
      }
    }
  }
  return dp.sort(function(a,b){ return tkET(a.time).t - tkET(b.time).t; });
};

// Compute the whole week for every linked, active employee.
const tkComputeWeek = async function(env, periodEnd){
  let pol = { otWeekly: 40, breakReqHrs: 8, breakMins: 30 };
  try {
    const pr = await tkSb(env, "tk_config?key=eq.policy&select=value");
    if (Array.isArray(pr) && pr[0] && pr[0].value && typeof pr[0].value === "object") {
      pol = Object.assign(pol, pr[0].value);
    }
  } catch (e) { /* defaults match the app's own fallbacks */ }

  const emps = await tkSb(env,
    "tk_employees?select=id,badge,fn,ln,break_exempt,sf_placement_id" +
    "&sf_placement_id=not.is.null&status=eq.active&order=ln.asc");

  const monday = tkAddDays(periodEnd, -6);
  // over-fetch in UTC; precise ET bucketing trims the edges
  const fromIso = tkAddDays(monday, -2) + "T00:00:00Z";
  const toIso = tkAddDays(periodEnd, 2) + "T23:59:59Z";

  const punches = [];
  for (let off = 0; ; off += 1000) {
    const page = await tkSb(env, "tk_punches?select=eid,type,time" +
      "&time=gte." + fromIso + "&time=lte." + toIso +
      "&order=time.asc&limit=1000&offset=" + off);
    for (let i = 0; i < page.length; i++) punches.push(page[i]);
    if (!Array.isArray(page) || page.length < 1000) break;
  }

  const byEid = {};
  punches.forEach(function(p){ (byEid[p.eid] = byEid[p.eid] || []).push(p); });

  const days = []; for (let i = 0; i < 7; i++) days.push(tkAddDays(monday, i));
  const otW = Number(pol.otWeekly) > 0 ? Number(pol.otWeekly) : 40;

  const rows = emps.map(function(e){
    let total = 0, unpaired = 0;
    days.forEach(function(d){
      const r = tkDayHours(tkDayPunches(byEid, e.id, d), !!e.break_exempt, pol);
      total += r.netH; unpaired += r.unpaired;
    });
    const weekH = parseFloat(total.toFixed(1)); // app rounds the week to 0.1h
    return {
      eid: e.id, badge: e.badge, name: e.fn + " " + e.ln,
      placementId: e.sf_placement_id,
      tkReg: parseFloat(Math.min(weekH, otW).toFixed(1)),
      tkOt: parseFloat(Math.max(0, weekH - otW).toFixed(1)),
      tkTotal: weekH,
      unpairedIns: unpaired
    };
  });
  return { rows: rows, policy: { otWeekly: otW }, monday: monday };
};

// Current Salesforce state for those placements, this period only.
const tkSfWeek = async function(env, periodEnd, placementIds){
  const out = { byPlacement: {}, entriesByTs: {} };
  if (!placementIds.length) return out;
  const pidList = "('" + placementIds.join("','") + "')";

  const ts = await runSalesforceQueryAll(env,
    "SELECT Id, Placement__c, ASYMBL_Time__Status__c FROM ASYMBL_Time__Timesheet__c " +
    "WHERE ASYMBL_Time__Pay_Period_End_Date__c = " + periodEnd +
    " AND Placement__c IN " + pidList);
  if (!ts.ok) throw new Error("SF timesheet query failed: " + (ts.error || ""));
  (ts.records || []).forEach(function(t){
    out.byPlacement[t.Placement__c] = { tsId: t.Id, status: t.ASYMBL_Time__Status__c || "" };
  });

  const tsIds = (ts.records || []).map(function(t){ return t.Id; });
  if (tsIds.length) {
    const en = await runSalesforceQueryAll(env,
      "SELECT Id, ASYMBL_Time__Timesheet__c, ASYMBL_Time__AST_Sequence__c, " +
      "ASYMBL_Time__Regular_Hours__c, ASYMBL_Time__Overtime_Hours__c " +
      "FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__c IN ('" +
      tsIds.join("','") + "')");
    if (!en.ok) throw new Error("SF time entry query failed: " + (en.error || ""));
    (en.records || []).forEach(function(x){
      const k = x.ASYMBL_Time__Timesheet__c;
      const slot = out.entriesByTs[k] = out.entriesByTs[k] || {};
      const seq = Number(x.ASYMBL_Time__AST_Sequence__c);
      if (seq === 1) slot.reg = { id: x.Id, hrs: Number(x.ASYMBL_Time__Regular_Hours__c || 0) };
      else if (seq === 2) slot.ot = { id: x.Id, hrs: Number(x.ASYMBL_Time__Overtime_Hours__c || 0) };
      else (slot.other = slot.other || []).push({ id: x.Id, seq: seq });
    });
  }
  return out;
};

const tkNear = function(a, b){ return Math.abs(Number(a || 0) - Number(b || 0)) < 0.05; };

// Decide what the push would do for one person. Shared by preview and push.
const tkPlan = function(row, sf){
  const p = sf.byPlacement[row.placementId];
  if (!p) return { action: "skip", reason: "no_timesheet_this_period" };
  const e = sf.entriesByTs[p.tsId] || {};
  const sfReg = e.reg ? e.reg.hrs : 0;
  const sfOt = e.ot ? e.ot.hrs : 0;
  const base = { tsId: p.tsId, status: p.status, sfReg: sfReg, sfOt: sfOt,
    hasOther: !!(e.other && e.other.length) };

  if ((p.status || "").toLowerCase() === "approved")
    return Object.assign(base, { action: "skip", reason: "approved_locked" });
  if (row.unpairedIns > 0)
    return Object.assign(base, { action: "skip", reason: "unpaired_in_punches" });
  if (base.hasOther)
    return Object.assign(base, { action: "skip", reason: "unexpected_seq_entry" });
  if (row.tkTotal === 0 && (sfReg > 0 || sfOt > 0))
    return Object.assign(base, { action: "skip", reason: "zero_would_overwrite" });
  if (tkNear(row.tkReg, sfReg) && tkNear(row.tkOt, sfOt))
    return Object.assign(base, { action: "none", reason: "already_matches" });

  const ops = [];
  if (!tkNear(row.tkReg, sfReg)) {
    if (e.reg) ops.push({ kind: "update", id: e.reg.id, field: "reg", val: row.tkReg });
    else if (row.tkReg > 0) ops.push({ kind: "create", seq: 1, field: "reg", val: row.tkReg, tsId: p.tsId });
  }
  if (!tkNear(row.tkOt, sfOt)) {
    if (e.ot) ops.push({ kind: "update", id: e.ot.id, field: "ot", val: row.tkOt });
    else if (row.tkOt > 0) ops.push({ kind: "create", seq: 2, field: "ot", val: row.tkOt, tsId: p.tsId });
  }
  return Object.assign(base, { action: ops.length ? "write" : "none", ops: ops });
};

if (url.pathname === "/tk-hours-preview") {
  const who = await verifyUser(request, env);
  if (!who || !who.email) return json({ error: "unauthorized" }, 401, origin);

  let periodEnd = (url.searchParams.get("periodEnd") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    // default: most recent Sunday, Eastern
    const todayEt = tkET(new Date().toISOString()).d;
    const wd = new Date(todayEt + "T00:00:00Z").getUTCDay();
    periodEnd = tkAddDays(todayEt, -wd); // Sunday itself when wd === 0
  }
  const dowChk = new Date(periodEnd + "T00:00:00Z").getUTCDay();
  if (dowChk !== 0) return json({ error: "periodEnd must be a Sunday (pay period end)", got: periodEnd }, 400, origin);

  try {
    const wk = await tkComputeWeek(env, periodEnd);
    const sf = await tkSfWeek(env, periodEnd, wk.rows.map(function(r){ return r.placementId; }));
    const rows = wk.rows.map(function(r){
      const plan = tkPlan(r, sf);
      return Object.assign({}, r, plan);
    });
    const summary = {};
    rows.forEach(function(r){ const k = r.action + (r.reason ? ":" + r.reason : ""); summary[k] = (summary[k] || 0) + 1; });
    return json({
      periodEnd: periodEnd, weekOf: wk.monday, otWeekly: wk.policy.otWeekly,
      employees: rows.length, summary: summary, rows: rows,
      note: "Read only. POST /tk-hours-push with {periodEnd, confirm:true} to write the rows marked action=write."
    }, 200, origin);
  } catch (err) {
    return json({ error: String(err && err.message || err) }, 502, origin);
  }
}

if (url.pathname === "/tk-hours-push" && request.method === "POST") {
  const who = await verifyUser(request, env);
  if (!who || !who.email) return json({ error: "unauthorized" }, 401, origin);

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const periodEnd = String(body.periodEnd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || new Date(periodEnd + "T00:00:00Z").getUTCDay() !== 0)
    return json({ error: "body.periodEnd must be a Sunday, YYYY-MM-DD" }, 400, origin);
  if (body.confirm !== true)
    return json({ error: "body.confirm must be true. Run /tk-hours-preview first." }, 400, origin);

  try {
    const tok = await getSalesforceToken(env);

    // Preflight: can this integration user actually write hours?
    const dr = await fetch(tok.instance_url +
      "/services/data/v60.0/sobjects/ASYMBL_Time__Time_Entry__c/describe",
      { headers: { Authorization: "Bearer " + tok.access_token } });
    const dd = await dr.json();
    const fmap = {}; (dd.fields || []).forEach(function(f){ fmap[f.name] = f; });
    const fReg = fmap["ASYMBL_Time__Regular_Hours__c"];
    const fOt = fmap["ASYMBL_Time__Overtime_Hours__c"];
    if (!fReg || !fReg.updateable || !fOt || !fOt.updateable) {
      return json({ error: "Integration user cannot edit hours on ASYMBL_Time__Time_Entry__c. " +
        "Grant edit access on Regular/Overtime Hours to the Connected App run-as user, then retry.",
        regUpdateable: !!(fReg && fReg.updateable), otUpdateable: !!(fOt && fOt.updateable) }, 403, origin);
    }
    const canCreate = !!(dd.createable);

    const wk = await tkComputeWeek(env, periodEnd);
    const sf = await tkSfWeek(env, periodEnd, wk.rows.map(function(r){ return r.placementId; }));

    const F_REG = "ASYMBL_Time__Regular_Hours__c";
    const F_OT = "ASYMBL_Time__Overtime_Hours__c";
    const updates = [], creates = [], report = [];

    wk.rows.forEach(function(r){
      const plan = tkPlan(r, sf);
      const item = { name: r.name, badge: r.badge, placementId: r.placementId,
        tkReg: r.tkReg, tkOt: r.tkOt, sfReg: plan.sfReg, sfOt: plan.sfOt,
        action: plan.action, reason: plan.reason || "" };
      report.push(item);
      if (plan.action !== "write") return;
      plan.ops.forEach(function(op){
        if (op.kind === "update") {
          const rec = { attributes: { type: "ASYMBL_Time__Time_Entry__c" }, Id: op.id };
          rec[op.field === "reg" ? F_REG : F_OT] = op.val;
          updates.push(rec);
        } else if (op.kind === "create" && canCreate) {
          const rec = { attributes: { type: "ASYMBL_Time__Time_Entry__c" },
            ASYMBL_Time__Timesheet__c: op.tsId,
            ASYMBL_Time__Date__c: periodEnd,
            ASYMBL_Time__AST_Sequence__c: op.seq,
            ASYMBL_Time__AST_Unique_Key__c: op.tsId + " - " + periodEnd + " 00:00:00 - " + op.seq + ".0" };
          rec[op.field === "reg" ? F_REG : F_OT] = op.val;
          creates.push(rec);
        } else if (op.kind === "create") {
          item.reason = (item.reason ? item.reason + "; " : "") + "create_skipped_no_perm";
        }
      });
    });

    const results = { updated: 0, created: 0, failed: [] };
    const chunks = function(arr){ const o = []; for (let i = 0; i < arr.length; i += 200) o.push(arr.slice(i, i + 200)); return o; };

    for (const ch of chunks(updates)) {
      const r = await fetch(tok.instance_url + "/services/data/v60.0/composite/sobjects",
        { method: "PATCH",
          headers: { Authorization: "Bearer " + tok.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ allOrNone: false, records: ch }) });
      const arr = await r.json();
      (Array.isArray(arr) ? arr : []).forEach(function(x, i){
        if (x.success) results.updated++;
        else results.failed.push({ id: ch[i].Id, errors: x.errors });
      });
    }
    for (const ch of chunks(creates)) {
      const r = await fetch(tok.instance_url + "/services/data/v60.0/composite/sobjects",
        { method: "POST",
          headers: { Authorization: "Bearer " + tok.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ allOrNone: false, records: ch }) });
      const arr = await r.json();
      (Array.isArray(arr) ? arr : []).forEach(function(x, i){
        if (x.success) results.created++;
        else results.failed.push({ key: ch[i].ASYMBL_Time__AST_Unique_Key__c, errors: x.errors });
      });
    }

    return json({
      periodEnd: periodEnd, pushedBy: who.email, at: new Date().toISOString(),
      results: results,
      counts: { write: report.filter(function(x){ return x.action === "write"; }).length,
        matched: report.filter(function(x){ return x.action === "none"; }).length,
        skipped: report.filter(function(x){ return x.action === "skip"; }).length },
      report: report
    }, 200, origin);
  } catch (err) {
    return json({ error: String(err && err.message || err) }, 502, origin);
  }
}

`;

const indented = BLOCK.split("\n").map(function(l){ return l.length ? indent + l : l; }).join("\n");

const patched = original.slice(0, lineStart) + indented.replace(/^\n/, "") + "\n" + original.slice(lineStart);

if (patched.length <= original.length) throw new Error("ABORT: output not larger. Nothing written.");
if (patched.indexOf(MARKER) === -1) throw new Error("ABORT: marker missing. Nothing written.");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = TARGET + "." + stamp + ".bak";
fs.writeFileSync(backup, original, "utf8");
fs.writeFileSync(TARGET, patched, "utf8");

console.log("");
console.log("  anchor : " + anchor);
console.log("  backup : " + path.basename(backup));
console.log("  added  : " + (patched.length - original.length) + " bytes");
console.log("  routes : GET /tk-hours-preview   POST /tk-hours-push");
console.log("");
console.log("  Next:");
console.log("    npx wrangler deploy");
console.log("    git add cloudworker.js");
console.log('    git commit -m "worker: TimeKeep SF phase 3 hours preview + push"');
console.log("");
console.log("  Rollback: cp " + path.basename(backup) + " cloudworker.js && npx wrangler deploy");
console.log("");
