// Worker Patch (v2) — /charge-batch accepts Spark Microsoft tokens (CRLF-safe)
// Locates the route, then the verifyUser line inside it, then the !who.ok line,
// and inserts the Graph fallback between them. Idempotent.
// Run from ~/Desktop/Spark-HQ-Internal/worker: node patch-charge-batch-auth2.cjs
const fs = require("fs");
const FILE = "cloudworker.js";
let src = fs.readFileSync(FILE, "utf8");
const bak = FILE + ".batchauth2-" + new Date().toISOString().replace(/[:.]/g,"-") + ".bak";
fs.writeFileSync(bak, src);
console.log("Backup: " + bak);

const marker = "SparkV7 (Microsoft token) fallback";
if (src.indexOf(marker) !== -1) { console.log("\u2705 Already applied \u2014 nothing to do"); process.exit(0); }

const routeIdx = src.indexOf('if (url.pathname === "/charge-batch") {');
if (routeIdx === -1) { console.log("\u274C route not found"); process.exit(0); }
const verifyStr = "const who = await verifyUser(request, env);";
const vIdx = src.indexOf(verifyStr, routeIdx);
if (vIdx === -1 || vIdx - routeIdx > 400) { console.log("\u274C verifyUser line not found in route"); process.exit(0); }
const okStr = "if (!who.ok) return json({ error: who.reason || \"Unauthorized\" }, 401, origin);";
const oIdx = src.indexOf(okStr, vIdx);
if (oIdx === -1 || oIdx - vIdx > 400) { console.log("\u274C !who.ok line not found after verifyUser"); process.exit(0); }

const eol = src.indexOf("\r\n") !== -1 ? "\r\n" : "\n";
const fallback = [
  "      if (!who.ok) {",
  "        // SparkV7 (Microsoft token) fallback \u2014 Spark domains only",
  "        try {",
  "          const gtok = (request.headers.get(\"Authorization\") || \"\").replace(/^Bearer\\s+/i, \"\").trim();",
  "          if (gtok) {",
  "            const mR = await fetch(\"https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName\", { headers: { \"Authorization\": \"Bearer \" + gtok } });",
  "            if (mR.ok) {",
  "              const me = await mR.json();",
  "              const em = String((me && (me.mail || me.userPrincipalName)) || \"\").toLowerCase();",
  "              if (/@(sparkcompanies|sparktalentinc)\\.com$/.test(em)) who = { ok: true, email: em, via: \"graph\" };",
  "            }",
  "          }",
  "        } catch (e) {}",
  "      }",
  "      "
].join(eol);

src = src.slice(0, vIdx) + "let who = await verifyUser(request, env);" + src.slice(vIdx + verifyStr.length, oIdx) + fallback + src.slice(oIdx);
fs.writeFileSync(FILE, src);
console.log("\u2705 /charge-batch accepts Spark Microsoft tokens as a fallback");
console.log("\nDONE (" + src.length + " chars). Commit + push \u2014 pipeline deploys.");
