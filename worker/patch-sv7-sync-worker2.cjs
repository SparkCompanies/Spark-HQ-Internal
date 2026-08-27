// Worker Patch v2 — /sv7-sync route for SparkV7 (CRLF-safe anchors)
// Run from ~/Desktop/Spark-HQ-Internal/worker:  node patch-sv7-sync-worker2.cjs
const fs = require("fs");
const FILE = "cloudworker.js";
let src = fs.readFileSync(FILE, "utf8");
let n = 0;

const bak = FILE + ".sv7sync2-" + new Date().toISOString().replace(/[:.]/g, "-") + ".bak";
fs.writeFileSync(bak, src);
console.log("Backup: " + bak);

// ═══ 1. CORS: single-line anchor (no newlines = CRLF-proof) ═══
const corsOld = '"https://red-dune-014d74810.7.azurestaticapps.net",';
const corsNew = '"https://red-dune-014d74810.7.azurestaticapps.net",\n  "https://nice-beach-07b54f71e4.azurestaticapps.net",';
if (src.indexOf(corsOld) !== -1) { src = src.replace(corsOld, corsNew); n++; console.log("\u2705 1. SparkV7 origin added to CORS allow-list"); }
else console.log("\u274C 1. CORS anchor not found");

// ═══ 2. /sv7-sync route (inserted before /dh-schedule) ═══
const routeAnchor = 'if (url.pathname === "/dh-schedule") {';
const routeNew = String.raw`if (url.pathname === "/sv7-sync") {
      // SPARKV7 SYNC (read-only): SparkV7 signs in with Azure AD (MSAL), not
      // Supabase, so validate by delegating to Microsoft Graph /me, then
      // require a Spark domain. Returns person-week charge lines + roster +
      // DH schedule in one call for the commission tracker to import.
      const authH = request.headers.get("Authorization") || "";
      const gtok = authH.replace(/^Bearer\s+/i, "").trim();
      if (!gtok) return json({ error: "No token" }, 401, origin);
      let me = null;
      try {
        const mR = await fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", { headers: { "Authorization": "Bearer " + gtok } });
        if (!mR.ok) return json({ error: "Invalid Microsoft session" }, 401, origin);
        me = await mR.json();
      } catch (e) { return json({ error: "Auth check failed" }, 401, origin); }
      const em = String((me && (me.mail || me.userPrincipalName)) || "").toLowerCase();
      if (!/@(sparkcompanies|sparktalentinc)\.com$/.test(em)) return json({ error: "Not a Spark account" }, 403, origin);
      try {
        const sbAll = async (path) => {
          let out = [], off = 0;
          for (;;) {
            const sep = path.indexOf("?") === -1 ? "?" : "&";
            const r = await sbService(env, "GET", path + sep + "limit=1000&offset=" + off);
            if (!r.ok) throw new Error(path.split("?")[0] + ": " + JSON.stringify(r.data).slice(0, 160));
            const rows = Array.isArray(r.data) ? r.data : [];
            out = out.concat(rows);
            if (rows.length < 1000) return out;
            off += 1000;
          }
        };
        const personWeeks = await sbAll("charge_person_weeks?select=week_ending,person,sales,fd,rec,tt,raw&order=week_ending.asc");
        const people = await sbAll("charge_people?select=person,role,entity,bu,active");
        const dh = await sbAll("charge_dh_schedule?select=*&order=created_at.desc");
        return json({ ok: true, syncedBy: em, at: new Date().toISOString(), personWeeks: personWeeks, people: people, dh: dh }, 200, origin);
      } catch (e) {
        return json({ error: "sv7 sync failed: " + String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/dh-schedule") {`;
if (src.indexOf(routeAnchor) !== -1) { src = src.replace(routeAnchor, routeNew); n++; console.log("\u2705 2. /sv7-sync route added"); }
else console.log("\u274C 2. /dh-schedule anchor not found");

if (n === 2) {
  fs.writeFileSync(FILE, src);
  console.log("\nDONE: 2/2 changes written (" + src.length + " chars)");
  console.log("Deploy:  npx wrangler deploy");
} else {
  console.log("\n\u26A0\uFE0F  NOT WRITTEN \u2014 " + n + "/2 anchors matched. File untouched; backup remains.");
}
