// Worker Patch — /sv7-dh-tracker : full DH deal records from the Master tracker
// Reads "2026 Direct Hire Tracker Master.xlsx" (Direct Hire Tracker sheet) via
// Graph, keeps 2026 starts, groups the weekly installment rows into ONE deal per
// client+candidate+position (summing charge, so credit notes net out), and
// returns the payout-gating fields SparkV7 needs: guarantee days, clearance,
// invoice paid, paycheck date, termination.
// Auth: Microsoft token (same as /sv7-sync), Spark domains only.
// Run from ~/Desktop/Spark-HQ-Internal/worker: node patch-dh-tracker-worker.cjs
const fs = require("fs");
const FILE = "cloudworker.js";
let src = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".dhtracker-" + new Date().toISOString().replace(/[:.]/g,"-") + ".bak";
fs.writeFileSync(bak, src);
console.log("Backup: " + bak);

const anchor = 'if (url.pathname === "/sv7-sync") {';
const route = String.raw`if (url.pathname === "/sv7-dh-tracker") {
      const authH0 = request.headers.get("Authorization") || "";
      const gtok0 = authH0.replace(/^Bearer\s+/i, "").trim();
      if (!gtok0) return json({ error: "No token" }, 401, origin);
      try {
        const mR0 = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", { headers: { "Authorization": "Bearer " + gtok0 } });
        if (!mR0.ok) return json({ error: "Invalid Microsoft session" }, 401, origin);
        const me0 = await mR0.json();
        const em0 = String((me0 && (me0.mail || me0.userPrincipalName)) || "").toLowerCase();
        if (!/@(sparkcompanies|sparktalentinc)\.com$/.test(em0)) return json({ error: "Not a Spark account" }, 403, origin);
      } catch (e) { return json({ error: "Auth check failed" }, 401, origin); }
      try {
        const SHARE = "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BDF08D9CB-5CF1-4744-9075-619F14A9F552%7D&file=2024%20Direct%20Hire%20Tracker%20Master.xlsx&fromShare=true&action=default&mobileredirect=true";
        const gt0 = await getGraphToken(env);
        const GH0 = { "Authorization": "Bearer " + gt0, "Accept": "application/json" };
        const shareTok0 = "u!" + btoa(SHARE).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
        const sR0 = await fetch("https://graph.microsoft.com/v1.0/shares/" + shareTok0 + "/driveItem?$select=id,name,parentReference", { headers: GH0 });
        const sD0 = await sR0.json();
        if (!sR0.ok) throw new Error((sD0.error && sD0.error.message) || "share");
        const B0 = "https://graph.microsoft.com/v1.0/drives/" + sD0.parentReference.driveId + "/items/" + sD0.id;
        const rR0 = await fetch(B0 + "/workbook/worksheets('Direct%20Hire%20Tracker')/range(address='A1:X600')?$select=values", { headers: GH0 });
        const rD0 = await rR0.json();
        if (!rR0.ok) throw new Error((rD0.error && rD0.error.message) || "range");
        const grid0 = rD0.values || [];
        let hr0 = -1;
        for (let i = 0; i < Math.min(8, grid0.length); i++) { if ((grid0[i] || []).some((c) => String(c).trim() === "Client")) { hr0 = i; break; } }
        if (hr0 < 0) return json({ error: "header row not found" }, 502, origin);
        const H0 = grid0[hr0].map((c) => String(c || "").trim());
        const ix = (re) => H0.findIndex((h) => re.test(h));
        const cCl = ix(/^Client$/i), cAM = ix(/^Account Manager$/i), cRec = ix(/^Recruiter$/i), cCan = ix(/^Candidate Name$/i),
              cPos = ix(/^Position$/i), cChg = ix(/^Charge Total$/i), cFDS = ix(/Full Desk\/Split/i), cRaw = ix(/Raw Charge/i),
              cBU = ix(/^Business Unit$/i), cInv = ix(/^Invoice Number$/i), cSD = ix(/^Start Date$/i), cGD = ix(/Guarantee Terms/i),
              cCD = ix(/^Clearance Date$/i), cTD = ix(/^Termination Date$/i), cIP = ix(/Invoice Paid Date/i), cPD = ix(/^Paycheck Date$/i),
              cNo = ix(/^Notes$/i);
        const xlDate = (v) => {
          if (v === null || v === undefined || v === "") return "";
          if (typeof v === "number" && isFinite(v)) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
          const s = String(v).trim();
          const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (m) return m[3] + "-" + String(m[1]).padStart(2, "0") + "-" + String(m[2]).padStart(2, "0");
          return s;
        };
        const num = (v) => { if (typeof v === "number") return v; const s = String(v || "").replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1"); const n = parseFloat(s); return isFinite(n) ? n : 0; };
        const deals = {};
        for (let r = hr0 + 1; r < grid0.length; r++) {
          const row = grid0[r] || [];
          const client = String(row[cCl] || "").trim();
          const cand = String(row[cCan] || "").trim();
          if (!client || !cand) continue;
          const sd = xlDate(row[cSD]);
          if (!/^2026-/.test(sd)) continue;
          const key = (client + "|" + cand + "|" + String(row[cPos] || "")).toLowerCase();
          const chg = num(row[cChg]), raw = num(row[cRaw]);
          if (!deals[key]) {
            deals[key] = { client, candidate: cand, position: String(row[cPos] || "").trim(), am: String(row[cAM] || "").trim(),
              rec: String(row[cRec] || "").trim(), type: /full/i.test(String(row[cFDS] || "")) ? "FD" : "S",
              unit: String(row[cBU] || "").trim(), charge: 0, raw: 0, invoice: String(row[cInv] || "").trim(),
              startDate: sd, guaranteeDays: num(row[cGD]), clearance: xlDate(row[cCD]), terminated: xlDate(row[cTD]),
              invoicePaid: xlDate(row[cIP]), paycheck: String(row[cPD] || "").trim(), notes: String(row[cNo] || "").trim(), rows: 0 };
          }
          const d = deals[key];
          d.charge += chg; d.raw += raw; d.rows++;
          if (sd > d.startDate) d.startDate = sd;
          const cd = xlDate(row[cCD]); if (cd && cd > (d.clearance || "")) d.clearance = cd;
          const ip = xlDate(row[cIP]); if (ip && ip > (d.invoicePaid || "")) d.invoicePaid = ip;
          const td = xlDate(row[cTD]); if (td) d.terminated = td;
          const pc = String(row[cPD] || "").trim(); if (pc && !/^n\/a$/i.test(pc)) d.paycheck = pc;
          if (num(row[cGD]) > d.guaranteeDays) d.guaranteeDays = num(row[cGD]);
          if (String(row[cInv] || "").trim() && !d.invoice) d.invoice = String(row[cInv] || "").trim();
        }
        const out = Object.keys(deals).map((k) => { const d = deals[k]; d.charge = Math.round(d.charge * 100) / 100; d.raw = Math.round(d.raw * 100) / 100; return d; });
        return json({ ok: true, at: new Date().toISOString(), count: out.length, deals: out }, 200, origin);
      } catch (e) {
        return json({ error: "dh tracker failed: " + String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sv7-sync") {`;

if (src.indexOf(anchor) !== -1) {
  src = src.replace(anchor, route);
  fs.writeFileSync(FILE, src);
  console.log("\u2705 /sv7-dh-tracker route added (Master tracker, 2026 starts, grouped per placement)");
  console.log("\nDONE (" + src.length + " chars). Commit + push \u2014 pipeline deploys.");
} else {
  console.log("\u274C anchor not found \u2014 file untouched");
}
