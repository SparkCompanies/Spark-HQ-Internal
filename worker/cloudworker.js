var __defProp = Object.defineProperty; 
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// pulse-xero.js
async function pulseXero(c) {
  const url = c.url, env = c.env, origin = c.origin, json2 = c.json;
  const w = await c.verifyUser(c.request, env);
  if (!w.ok) return json2({ error: w.reason || "Unauthorized" }, 401, origin);
  const D = { talent: "Spark Talent", flex: "Flex Workforce", packaging: "Spark Packaging", ignite: "Ignite Search" };
  const raw = (url.searchParams.get("entity") || "talent").trim();
  const dv = D[raw.toLowerCase()] || raw;
  const q = Object.keys(D).filter(function(k) {
    return D[k] === dv;
  })[0] || raw.toLowerCase();
  const we = (url.searchParams.get("we") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(we)) return json2({ error: "we must be YYYY-MM-DD" }, 400, origin);
  const d0 = /* @__PURE__ */ new Date(we + "T12:00:00Z");
  if (isNaN(d0.getTime())) return json2({ error: "we is not a real date" }, 400, origin);
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const pe = new Date(d0.getTime() + 6 * 864e5).toISOString().slice(0, 10);
  try {
    const m = await c.sbService(env, "GET", "xero_connections?entity_division=eq." + encodeURIComponent(dv) + "&select=tenant_id&limit=1");
    if (!m.ok || !m.data || !m.data[0]) return json2({ error: "No Xero org mapped to " + dv, slugs: Object.keys(D) }, 400, origin);
    const a = await c.xeroAccessForTenant(env, m.data[0].tenant_id);
    const H = { "Authorization": "Bearer " + a.access_token, "Xero-Tenant-Id": a.tenant_id, "Accept": "application/json" };
    const r = await fetch("https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=" + we + "&toDate=" + pe, { headers: H });
    const tx = await r.text();
    if (!r.ok) {
      const scopeIssue = r.status === 401 || r.status === 403 || /insufficient_scope|unauthorized/i.test(tx);
      return json2({
        error: "Xero P and L failed (" + r.status + ")",
        entity: q,
        tenant_id: a.tenant_id,
        detail: tx.slice(0, 300),
        hint: scopeIssue ? "This token predates the reports scope. Reauthorise this org through /xero-authorize." : null
      }, 502, origin);
    }
    let data;
    try {
      data = JSON.parse(tx);
    } catch (e) {
      return json2({ error: "Xero returned non-JSON", detail: tx.slice(0, 200) }, 502, origin);
    }
    const rep = (data.Reports || [])[0];
    if (!rep) return json2({ error: "No report body returned by Xero" }, 502, origin);
    const rows = [], T = { assign: 0, dh: 0, exp: 0, other: 0, assist: 0, total: 0 };
    (rep.Rows || []).forEach(function(sec) {
      if (sec.RowType !== "Section") return;
      if (!/^(income|revenue|other income|turnover)$/i.test(String(sec.Title || "").trim())) return;
      (sec.Rows || []).forEach(function(x) {
        if (x.RowType !== "Row") return;
        const cells = x.Cells || [], nm = cells[0] && cells[0].Value;
        const v = parseFloat(String(cells[1] && cells[1].Value || "0").replace(/[$,]/g, ""));
        if (!nm || !isFinite(v) || v === 0) return;
        let k = "other", dvn = null, g;
        if (g = /^Contract\s*-\s*(.+)$/i.exec(nm)) {
          k = "assign";
          dvn = g[1].trim();
        } else if (g = /^Direct Hires?\s*-\s*(.+)$/i.exec(nm)) {
          k = "dh";
          dvn = g[1].trim();
        } else if (/expense\s+reimbursement/i.test(nm)) {
          k = "exp";
        } else if (/sales\s+assist/i.test(nm)) {
          k = "assist";
        }
        const amt = Math.round(v * 100) / 100;
        rows.push({
          entity: q,
          we_date: we,
          period_start: we,
          period_end: pe,
          category: k,
          division: dvn,
          account_name: String(nm).trim(),
          amount: amt,
          source: "xero_pl"
        });
        T[k] = Math.round((T[k] + amt) * 100) / 100;
        T.total = Math.round((T.total + amt) * 100) / 100;
      });
    });
    return json2({
      ok: true,
      entity: q,
      entityDivision: dv,
      tenant_id: a.tenant_id,
      we_date: we,
      period_start: we,
      period_end: pe,
      weekday: DAYS[d0.getUTCDay()],
      weekdayWarning: d0.getUTCDay() === 0 ? null : "we is a " + DAYS[d0.getUTCDay()] + ", not a Sunday.",
      reportName: rep.ReportName || null,
      accounts: rows.length,
      totals: T,
      rows
    }, 200, origin);
  } catch (e) {
    return json2({ error: String(e.message || e) }, 502, origin);
  }
}
__name(pulseXero, "pulseXero");

// worker.js
var ALLOWED_ORIGINS = [
  "https://red-dune-014d74810.7.azurestaticapps.net",
  "https://sparkcompanies.github.io",
  "http://localhost:5173"
];
function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Admin-Pin",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
__name(json, "json");
async function hasPermission(request, env, email, permKey) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || !email) return false;
  try {
    const resp = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/has_permission", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "apikey": env.SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_email: email, p_perm: permKey })
    });
    if (!resp.ok) return false;
    const result = await resp.json();
    return result === true;
  } catch (e) {
    return false;
  }
}
__name(hasPermission, "hasPermission");
async function getPipelineSnapshot(env) {
  const tok = await getSalesforceToken(env);
  const soql = "SELECT StageName, COUNT(Id) cnt, SUM(Amount) amt FROM Opportunity WHERE IsClosed = false GROUP BY StageName";
  const q = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(soql);
  const r = await fetch(q, { headers: { "Authorization": "Bearer " + tok.access_token } });
  const data = await r.json();
  if (!r.ok) throw new Error("SF query failed: " + JSON.stringify(data).slice(0, 200));
  const stages = (data.records || []).map((rec) => ({ stage: rec.StageName, count: rec.cnt, amount: rec.amt }));
  const total = stages.reduce((s, x) => s + (x.amount || 0), 0);
  const count = stages.reduce((s, x) => s + (x.count || 0), 0);
  let accounts = [];
  try {
    const asoql = "SELECT Account.Name acct, COUNT(Id) cnt, SUM(Amount) amt FROM Opportunity WHERE IsClosed = false AND Account.Name != null GROUP BY Account.Name ORDER BY COUNT(Id) DESC LIMIT 15";
    const aq = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(asoql);
    const ar = await fetch(aq, { headers: { "Authorization": "Bearer " + tok.access_token } });
    const adata = await ar.json();
    if (ar.ok) {
      accounts = (adata.records || []).map((rec) => ({ account: rec.acct, count: rec.cnt, amount: rec.amt }));
    }
  } catch (e) {
  }
  let owners = [];
  try {
    const osoql = "SELECT Owner.Name own, COUNT(Id) cnt, SUM(Amount) amt FROM Opportunity WHERE IsClosed = false GROUP BY Owner.Name ORDER BY COUNT(Id) DESC LIMIT 15";
    const oq = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(osoql);
    const or_ = await fetch(oq, { headers: { "Authorization": "Bearer " + tok.access_token } });
    const odata = await or_.json();
    if (or_.ok) {
      owners = (odata.records || []).map((rec) => ({ owner: rec.own, count: rec.cnt, amount: rec.amt }));
    }
  } catch (e) {
  }
  let missingAmount = null;
  try {
    const msoql = "SELECT COUNT(Id) cnt FROM Opportunity WHERE IsClosed = false AND Amount = null";
    const mq = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(msoql);
    const mr = await fetch(mq, { headers: { "Authorization": "Bearer " + tok.access_token } });
    const mdata = await mr.json();
    if (mr.ok && mdata.records && mdata.records[0]) missingAmount = mdata.records[0].cnt;
  } catch (e) {
  }
  return { stages, total, count, accounts, owners, missingAmount };
}
__name(getPipelineSnapshot, "getPipelineSnapshot");
async function getSalesforceToken(env) {
  if (!env.SF_INSTANCE_URL || !env.SF_CLIENT_ID || !env.SF_CLIENT_SECRET) {
    throw new Error("Salesforce not configured (missing SF_INSTANCE_URL / SF_CLIENT_ID / SF_CLIENT_SECRET)");
  }
  const base = env.SF_INSTANCE_URL.replace(/\/+$/, "");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.SF_CLIENT_ID,
    client_secret: env.SF_CLIENT_SECRET
  });
  const resp = await fetch(base + "/services/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error("SF token error: " + (data.error_description || data.error || JSON.stringify(data)).toString().slice(0, 200));
  }
  return { access_token: data.access_token, instance_url: data.instance_url || base };
}
__name(getSalesforceToken, "getSalesforceToken");
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
__name(round2, "round2");
async function runSalesforceQueryAll(env, soql) {
  const q = String(soql || "").trim();
  if (!/^select\s/i.test(q)) return { ok: false, error: "Only SELECT queries are allowed (read-only)." };
  if (/\b(insert|update|delete|upsert|merge|undelete)\b/i.test(q)) return { ok: false, error: "Write operations are not permitted." };
  try {
    const tok = await getSalesforceToken(env);
    let url = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(q);
    let records = [];
    for (let i = 0; i < 20; i++) {
      const r = await fetch(url, { headers: { "Authorization": "Bearer " + tok.access_token } });
      const data = await r.json();
      if (!r.ok) {
        const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
        return { ok: false, error: "Salesforce error: " + String(msg).slice(0, 300) };
      }
      for (const rec of data.records || []) {
        const c = {};
        for (const k in rec) if (k !== "attributes") c[k] = rec[k];
        records.push(c);
      }
      if (data.done || !data.nextRecordsUrl) break;
      url = tok.instance_url + data.nextRecordsUrl;
    }
    return { ok: true, returned: records.length, records };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
__name(runSalesforceQueryAll, "runSalesforceQueryAll");
async function runSalesforceQuery(env, soql) {
  const q = String(soql || "").trim();
  if (!/^select\s/i.test(q)) {
    return { ok: false, error: "Only SELECT queries are allowed (read-only)." };
  }
  if (/\b(insert|update|delete|upsert|merge|undelete)\b/i.test(q)) {
    return { ok: false, error: "Write operations are not permitted." };
  }
  let safe = q;
  const m = q.match(/\blimit\s+(\d+)\b/i);
  if (!m) {
    safe = q + " LIMIT 50";
  } else if (parseInt(m[1], 10) > 100) {
    safe = q.replace(/\blimit\s+\d+\b/i, "LIMIT 100");
  }
  try {
    const tok = await getSalesforceToken(env);
    const url = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(safe);
    const r = await fetch(url, { headers: { "Authorization": "Bearer " + tok.access_token } });
    const data = await r.json();
    if (!r.ok) {
      const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
      return { ok: false, error: "Salesforce error: " + String(msg).slice(0, 300) };
    }
    const records = (data.records || []).map((rec) => {
      const clean = {};
      for (const k in rec) {
        if (k !== "attributes") clean[k] = rec[k];
      }
      return clean;
    });
    return { ok: true, totalSize: data.totalSize, returned: records.length, records, query: safe };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 300) };
  }
}
__name(runSalesforceQuery, "runSalesforceQuery");
async function describeSalesforce(env, objectName) {
  try {
    const tok = await getSalesforceToken(env);
    if (!objectName) {
      const r2 = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/", { headers: { "Authorization": "Bearer " + tok.access_token } });
      const data2 = await r2.json();
      if (!r2.ok) return { ok: false, error: "describe failed" };
      const objs = (data2.sobjects || []).filter((o) => o.queryable).map((o) => ({ name: o.name, label: o.label }));
      return { ok: true, objects: objs.slice(0, 400) };
    }
    const r = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/" + encodeURIComponent(objectName) + "/describe", { headers: { "Authorization": "Bearer " + tok.access_token } });
    const data = await r.json();
    if (!r.ok) return { ok: false, error: "describe failed for " + objectName };
    const fields = (data.fields || []).map((f) => ({ name: f.name, label: f.label, type: f.type, relationshipName: f.relationshipName || void 0 }));
    return { ok: true, object: objectName, fields };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 300) };
  }
}
__name(describeSalesforce, "describeSalesforce");
async function hmac(keyBytes, msg) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}
__name(hmac, "hmac");
async function sha256Hex(msg) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function sigV4Key(secret, dateStamp, region, service) {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, "aws4_request");
}
__name(sigV4Key, "sigV4Key");
async function invokeBedrock(env, modelId, system, messages) {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_REGION) {
    throw new Error("Bedrock not configured (missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION)");
  }
  const region = env.AWS_REGION;
  const service = "bedrock";
  const host = "bedrock-runtime." + region + ".amazonaws.com";
  const pathSign = "/model/" + modelId.replace(/:/g, "%3A") + "/invoke";
  const pathSend = "/model/" + modelId + "/invoke";
  let body;
  if (/anthropic\./i.test(modelId)) {
    body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system: system || void 0,
      messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") }))
    });
  } else {
    body = JSON.stringify({
      messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: [{ text: String(m.content || "") }] })),
      system: system ? [{ text: system }] : void 0,
      inferenceConfig: { maxTokens: 1024 }
    });
  }
  const now = /* @__PURE__ */ new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);
  const canonicalHeaders = "host:" + host + "\nx-amz-date:" + amzDate + "\n";
  const signedHeaders = "host;x-amz-date";
  const canonicalRequest = ["POST", pathSign, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = dateStamp + "/" + region + "/" + service + "/aws4_request";
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await sigV4Key(env.AWS_SECRET_ACCESS_KEY, dateStamp, region, service);
  const sigBytes = await hmac(signingKey, stringToSign);
  const signature = [...sigBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  const authorization = "AWS4-HMAC-SHA256 Credential=" + env.AWS_ACCESS_KEY_ID + "/" + scope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;
  const resp = await fetch("https://" + host + pathSend, {
    method: "POST",
    headers: { "Authorization": authorization, "x-amz-date": amzDate, "content-type": "application/json", "accept": "application/json" },
    body
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error("Bedrock error: " + (data && (data.message || data.Message) ? data.message || data.Message : resp.status));
  }
  if (/anthropic\./i.test(modelId)) {
    const blocks = Array.isArray(data.content) ? data.content : [];
    return blocks.filter((b) => b && b.type === "text").map((b) => b.text).join("\n").trim();
  }
  if (data.output && data.output.message && Array.isArray(data.output.message.content)) {
    return data.output.message.content.map((c) => c.text || "").join("\n").trim();
  }
  if (Array.isArray(data.results)) {
    return data.results.map((r) => r.outputText || "").join("\n").trim();
  }
  return "(no response)";
}
__name(invokeBedrock, "invokeBedrock");
async function verifyUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "No token" };
  const userResp = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
    headers: { "Authorization": "Bearer " + token, "apikey": env.SUPABASE_PUBLISHABLE_KEY }
  });
  if (!userResp.ok) return { ok: false, reason: "Invalid session" };
  const user = await userResp.json();
  const email = user && user.email || "";
  if (!email) return { ok: false, reason: "No email on session" };
  return { ok: true, email };
}
__name(verifyUser, "verifyUser");
async function verifyAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "No token" };
  const userResp = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
    headers: { "Authorization": "Bearer " + token, "apikey": env.SUPABASE_PUBLISHABLE_KEY }
  });
  if (!userResp.ok) return { ok: false, reason: "Invalid session" };
  const user = await userResp.json();
  const email = user && user.email || "";
  const profResp = await fetch(
    env.SUPABASE_URL + "/rest/v1/profiles?select=role&id=eq." + user.id,
    { headers: { "Authorization": "Bearer " + token, "apikey": env.SUPABASE_PUBLISHABLE_KEY } }
  );
  if (!profResp.ok) return { ok: false, reason: "Cannot read profile" };
  const rows = await profResp.json();
  const role = rows && rows[0] && rows[0].role;
  if (role !== "admin" && role !== "superadmin") {
    return { ok: false, reason: "Not an admin", role: role || "member", email };
  }
  return { ok: true, email, role };
}
__name(verifyAdmin, "verifyAdmin");
async function findPerson(env, name) {
  try {
    const q = String(name || "").replace(/['"]/g, "").trim();
    if (!q) return { ok: false, error: "No name provided." };
    const token = await getGraphToken(env);
    const filter = "startswith(displayName,'" + q + "') or startswith(givenName,'" + q + "') or startswith(surname,'" + q + "')";
    const url = "https://graph.microsoft.com/v1.0/users?$filter=" + encodeURIComponent(filter) + "&$select=displayName,mail,userPrincipalName&$top=5";
    const r = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: "Directory search failed: " + r.status + " " + t.slice(0, 120) };
    }
    const data = await r.json();
    const people = (data.value || []).map(function(u) {
      return { name: u.displayName || "", email: (u.mail || u.userPrincipalName || "").toLowerCase() };
    }).filter(function(p) {
      return p.email;
    });
    return { ok: true, matches: people };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}
__name(findPerson, "findPerson");
async function getMyCalendar(env, email, days) {
  try {
    if (!email) return { ok: false, error: "No signed-in user." };
    const token = await getGraphToken(env);
    const uResp = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(email) + "?$select=id", { headers: { "Authorization": "Bearer " + token } });
    if (!uResp.ok) return { ok: false, error: "User lookup failed: " + uResp.status };
    const me = await uResp.json();
    let d = parseInt(days, 10);
    if (isNaN(d) || d < 1) d = 7;
    if (d > 62) d = 62;
    /* CAL_WINDOW_v1 — start at MIDNIGHT TODAY in the user's zone, not "now".
       Reading from now silently dropped every meeting that had already ended,
       so a morning-heavy day looked empty by lunchtime. Eastern is the company
       zone and matches the Prefer header below. */
    const now = /* @__PURE__ */ new Date();
    const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const offsetMs = now.getTime() - etNow.getTime();
    const etMidnight = new Date(etNow.getFullYear(), etNow.getMonth(), etNow.getDate(), 0, 0, 0, 0);
    const start = new Date(etMidnight.getTime() + offsetMs);
    const end = new Date(start.getTime() + d * 24 * 60 * 60 * 1e3);
    const qs = "startDateTime=" + encodeURIComponent(start.toISOString()) + "&endDateTime=" + encodeURIComponent(end.toISOString()) + "&$select=subject,start,end,location,isAllDay,organizer,onlineMeeting,isOnlineMeeting,onlineMeetingUrl,webLink,showAs,isCancelled&$orderby=start/dateTime&$top=200";
    const evResp = await fetch("https://graph.microsoft.com/v1.0/users/" + me.id + "/calendarView?" + qs, { headers: { "Authorization": "Bearer " + token, "Prefer": 'outlook.timezone="Eastern Standard Time"' } });
    if (!evResp.ok) {
      const t = await evResp.text();
      return { ok: false, error: "Calendar read failed: " + evResp.status + " " + t.slice(0, 120) };
    }
    const data = await evResp.json();
    /* CAL_WINDOW_v1 — carry the Teams join link through so the UI can show a
       real Join button, drop cancelled events, and expose free/busy status. */
    const events = (data.value || []).filter(function(e) { return !e.isCancelled; }).map(function(e) {
      const join = (e.onlineMeeting && e.onlineMeeting.joinUrl) || e.onlineMeetingUrl || "";
      return {
        subject: e.subject || "(no subject)",
        start: e.start && e.start.dateTime ? e.start.dateTime : null,
        end: e.end && e.end.dateTime ? e.end.dateTime : null,
        allDay: !!e.isAllDay,
        location: e.location && e.location.displayName || "",
        organizer: e.organizer && e.organizer.emailAddress && e.organizer.emailAddress.name || "",
        online: /^https:\/\//.test(join) ? join : "",
        isOnline: !!e.isOnlineMeeting,
        showAs: e.showAs || "",
        link: e.webLink || ""
      };
    });
    return { ok: true, user: email, days: d, from: start.toISOString(), to: end.toISOString(), count: events.length, events };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}
__name(getMyCalendar, "getMyCalendar");
async function getGraphToken(env) {
  const body = new URLSearchParams({
    client_id: env.AZ_CLIENT_ID,
    client_secret: env.AZ_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials"
  });
  const resp = await fetch(
    "https://login.microsoftonline.com/" + env.AZ_TENANT_ID + "/oauth2/v2.0/token",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
  );
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error("Graph token failed: " + resp.status + " " + t.slice(0, 200));
  }
  const data = await resp.json();
  return data.access_token;
}
__name(getGraphToken, "getGraphToken");
async function fetchDirectory(token) {
  const select = "id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,accountEnabled";
  let url = "https://graph.microsoft.com/v1.0/users?$select=" + select + "&$expand=manager($select=id)&$top=999";
  const out = [];
  for (let i = 0; i < 20 && url; i++) {
    const r = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
    if (!r.ok) {
      const t = await r.text();
      throw new Error("Graph users failed: " + r.status + " " + t.slice(0, 200));
    }
    const page = await r.json();
    (page.value || []).forEach((u) => out.push(u));
    url = page["@odata.nextLink"] || null;
  }
  return out;
}
__name(fetchDirectory, "fetchDirectory");
var FORGE_COA_MAP = { "Paslin - Ryan Rd, Warren (Machining Center)": { "entity": "Spark Talent", "code": "400.9" }, "Advanced Integration Technology- AIT Grand Prairie": { "entity": "Spark Talent", "code": "400.19" }, "Advanced Integration Technology- MI-Chesterfield": { "entity": "Spark Talent", "code": "400.19" }, "Armaly Brands- Air Freshener - McPherson Park Drive, Howell": { "entity": "Spark Talent", "code": "400.17" }, "Ascent Aerospace- Ascent Engineering": { "entity": "Spark Talent", "code": "400" }, "AUTOKINITON- Elkton, MI": { "entity": "Spark Talent", "code": "400.19" }, "Budco Financial": { "entity": "Spark Talent", "code": "400.19" }, "Circor International- Monroe": { "entity": "Spark Talent", "code": "400.18" }, "Clarios - FDC": { "entity": "Spark Talent", "code": "400.19" }, "Clarios - Middletown DE": { "entity": "Spark Talent", "code": "400.19" }, "Comau- Novi": { "entity": "Spark Talent", "code": "400.9" }, "DFM Solutions": { "entity": "Spark Talent", "code": "400.18" }, "Dominion Technologies Group, Inc. - Roseville,MI": { "entity": "Spark Talent", "code": "400" }, "Dominion Technologies Group, Inc.- Dominion Balance Systems": { "entity": "Spark Talent", "code": "400" }, "Elite Manufacturing Technologies - Clinton Township,MI": { "entity": "Spark Talent", "code": "400" }, "Emerson (ASCO Numatics)- Aiken, SC- Office": { "entity": "Spark Talent", "code": "400.17" }, "Emerson (ASCO Numatics)- Sandusky- MI- Office": { "entity": "Spark Talent", "code": "400.17" }, "Fanuc America Corporation - Rochester Hills,MI": { "entity": "Spark Talent", "code": "400" }, "Fanuc America Corporation- Fanuc America  - West Campus": { "entity": "Spark Talent", "code": "400" }, "Fanuc America Corporation- North Campus": { "entity": "Spark Talent", "code": "400" }, "General Dynamics Land Systems- Texas - FT Cavazos": { "entity": "Spark Talent", "code": "400.14" }, "H&H Tool": { "entity": "Spark Talent", "code": "400.17" }, "Henrob Corporation - New Hudson,MI": { "entity": "Spark Talent", "code": "400.17" }, "Hirotec America Inc.- High Meadow Circle- HQ": { "entity": "Spark Talent", "code": "400.9" }, "Hi Tech Mold & Engineering, Inc.": { "entity": "Spark Talent", "code": "400" }, "Horiba Instruments - Ann Arbor": { "entity": "Spark Talent", "code": "400.18" }, "Implant Recycling": { "entity": "Spark Talent", "code": "400.17" }, "Kuka Assembly and Test Corp.- Fenton (KAF)": { "entity": "Spark Talent", "code": "400.9" }, "Kuka Assembly and Test Corp.- Saginaw (KAS)": { "entity": "Spark Talent", "code": "400.9" }, "KUKA Mortech Engineering": { "entity": "Spark Talent", "code": "400.9" }, "KUKA Systems North America - Metro Parkway (KMP)": { "entity": "Spark Talent", "code": "400.9" }, "Kuka Systems North America- Kuka Clinton Township (KCT)": { "entity": "Spark Talent", "code": "400.9" }, "Kuka Systems North America- Kuka Livonia (KLB)": { "entity": "Spark Talent", "code": "400.9" }, "Kuka Systems North America- Main - Sterling Heights (KSH)": { "entity": "Spark Talent", "code": "400.9" }, "MacDermid": { "entity": "Spark Talent", "code": "400.18" }, "Methods Machine Tools- Wixom": { "entity": "Spark Talent", "code": "400" }, "Nagel Precision": { "entity": "Spark Talent", "code": "400.9" }, "New Leaf LLC": { "entity": "Spark Talent", "code": "400.17" }, "Osirius Group - AMG - Osirius HQ,MI": { "entity": "Spark Talent", "code": "400" }, "Pari Robotics Inc (HQ)": { "entity": "Spark Talent", "code": "400" }, "Pari Robotics Inc- Auburn Hills": { "entity": "Spark Talent", "code": "400" }, "Penske- Auburn Hills | Purks/FCA Specialty Vehicle": { "entity": "Spark Talent", "code": "400" }, "RCO Engineering - Roseville,MI": { "entity": "Spark Talent", "code": "400.17" }, "Revere Plastics Systems- Ankeny, Iowa": { "entity": "Spark Talent", "code": "400.17" }, "Revere Plastics Systems- Fraser": { "entity": "Spark Talent", "code": "400.17" }, "RoboVent- NEW Location as of June 2024": { "entity": "Spark Talent", "code": "400" }, "AIR - Rochester Hills, MI": { "entity": "Spark Talent", "code": "400" }, "Toyoda Gosei North American Corporation- Brighton": { "entity": "Spark Talent", "code": "400.17" }, "Tunkers-Mastech, Inc.": { "entity": "Spark Talent", "code": "400" }, "UTEC - Sterling Heights,MI": { "entity": "Spark Talent", "code": "400" }, "Blake's Beverage Co.": { "entity": "Spark Packaging", "code": "400.11" }, "Hood Container-Columbus, OH": { "entity": "Spark Packaging", "code": "400.11" }, "Hood Container-Walker, MI - Walker,MI": { "entity": "Spark Packaging", "code": "400.11" }, "Manchester Industries- Mendon": { "entity": "Spark Packaging", "code": "400.11" }, "Packaging Corporation of America - Liverpool, NY": { "entity": "Spark Packaging", "code": "400.11" }, "Royal Container - Oak Park,MI": { "entity": "Spark Packaging", "code": "400.11" }, "Universal Container - Ferndale, MI": { "entity": "Spark Packaging", "code": "400.11" }, "Ace Automation - Howell,MI": { "entity": "Flex Workforce Solutions", "code": "4000" }, "Fives Cinetic Automation Corp - Farmington,MI": { "entity": "Flex Workforce Solutions", "code": "4000" }, "Rhino Tool House- New Corp Office Rhino LIVONIA": { "entity": "Flex Workforce Solutions", "code": "4000" }, "Rhino Tool House- South Carolina": { "entity": "Flex Workforce Solutions", "code": "4000" }, "Rhino Tool House-Lathrup": { "entity": "Flex Workforce Solutions", "code": "4000" }, "Robex - Vantage- ShelbyVille": { "entity": "Flex Workforce Solutions", "code": "4000" } };
var FORGE_XERO_NAME = { "ACE Automation- Rochester Hills": "Ace Automation", "AG Simpson (USA) Inc- 18 1/2 mile": "AG Simpson (USA) Inc", "AIR - Rochester Hills, MI": "Automated Industrial Robotics Rochester Hills, Inc.", "AUTOKINITON": "Autokiniton - Elkton, MI", "AUTOKINITON - Milan,MI": "Autokiniton - Milan, MI", "AUTOKINITON- Elkton, MI": "Autokiniton - Elkton, MI", "Ace Automation - Howell,MI": "Ace Automation", "Advanced Integration Technology- AIT Grand Prairie": "Advanced Integration Technology", "Advanced Integration Technology- MI-Chesterfield": "Advanced Integration Technology", "Armaly Brands - Dallavo": "Armaly Brands", "Armaly Brands- Air Freshener - McPherson Park Drive, Howell": "Armaly Brands", "Armaly Brands- Distribution - Austin CT, Howell": "Armaly Brands", "Ascent Aerospace- Ascent Engineering": "Ascent Aerospace", "Autokiniton - Elkton Plant": "Autokiniton - Elkton, MI", "Autoliv North America- Autoliv Americas": "Autoliv North America", "Bleichert Inc. - Shelby Township,MI": "Bleichert Inc.", "Circor International- Monroe": "Circor International - Warren", "Circor International- Tampa": "Circor International - Tampa", "Comau- Novi": "Comau", "Deluxe Technologies - Main": "Deluxe Technologies", "Dominion Technologies Group, Inc. - Roseville,MI": "Dominion Technologies Group, Inc.", "Dominion Technologies Group, Inc.- Dominion Balance Systems": "Dominion Technologies Group, Inc.", "Elite Manufacturing Technologies - Clinton Township,MI": "Elite Manufacturing Technologies", "Elite Manufacturing Technologies- Fraser": "Elite Manufacturing Technologies", "Emerson (ASCO Numatics)- Aiken, SC- Office": "Emerson (ASCO Numatics)", "Emerson (ASCO Numatics)- Sandusky- MI- Office": "Emerson (ASCO Numatics)", "Fanuc America Corporation - Rochester Hills,MI": "Fanuc America Corporation", "Fanuc America Corporation- Fanuc America  - West Campus": "Fanuc America Corporation", "Fanuc America Corporation- Fanuc America-Hoffman Estates": "Fanuc America Corporation", "Fanuc America Corporation- North Campus": "Fanuc America Corporation", "Fanuc America Corporation- Pontiac": "Fanuc America Corporation", "Fives Cinetic Automation Corp - Farmington,MI": "Fives Cinetic Automation Corp", "General Dynamics Land Systems- Florida": "General Dynamics Land Systems", "General Dynamics Land Systems- Texas - FT Cavazos": "General Dynamics Land Systems", "HI-Tech Mold & Engineering, Inc. - Rochester Hills,MI": "HI-Tech Mold & Engineering, Inc.", "Henrob Corporation - New Hudson,MI": "Henrob Corporation", "Hi Tech Mold & Engineering, Inc.": "HI-Tech Mold & Engineering, Inc.", "Hirata Corporation of America - New Hudson,MI": "Hirata Corporation of America", "Hirotec America Inc.- Flint": "Hirotec America Inc.", "Hirotec America Inc.- Glenmeade": "Hirotec America Inc.", "Hirotec America Inc.- High Meadow Circle- HQ": "Hirotec America Inc.", "Hood Container-Walker, MI - Walker,MI": "Hood Container-Walker, MI", "JAC Products - NAPOLEON, OH": "JAC Products", "KUKA Systems North America - Metro Parkway (KMP)": "Kuka Systems North America", "Kuka Assembly and Test Corp.- Fenton (KAF)": "Kuka Assembly and Test Corp.", "Kuka Assembly and Test Corp.- Saginaw (KAS)": "Kuka Assembly and Test Corp.", "Kuka Systems - Professional- KUKA KCT": "Kuka Systems North America", "Kuka Systems North America- Kuka Clinton Township (KCT)": "Kuka Systems North America", "Kuka Systems North America- Kuka Livonia (KLB)": "Kuka Systems North America", "Kuka Systems North America- Kuka Metro (KMP)": "Kuka Systems North America", "Kuka Systems North America- Kuka Tank Plant (KTP)": "Kuka Systems North America", "Kuka Systems North America- Main - Sterling Heights (KSH)": "Kuka Systems North America", "MAHLE- MAHLE Behr Dayton L.L.C., Dayton": "MAHLE", "Manchester Industries- Mendon": "Manchester Industries", "Mayco International- Groesbeck Location": "Mayco International", "Medbio - Clinton Twp": "Medbio", "Methods Machine Tools- Wixom": "Methods Machine Tools", "Osirius Group - AMG - Osirius HQ,MI": "Osirius Group - AMG", "Pari Robotics Inc (HQ)": "Pari Robotics Inc", "Pari Robotics Inc- Auburn Hills": "Pari Robotics Inc", "Paslin (Pontiac)": "The Paslin Company", "Paslin - Ryan Rd, Warren (Machining Center)": "The Paslin Company", "Penn Engineering- Haeger": "Penn Engineering", "Penske - Purks/FCA Specialty Vehicle": "Penske", "Penske- Auburn Hills | Purks/FCA Specialty Vehicle": "Penske", "RCO Engineering - Main": "RCO Engineering", "RCO Engineering - Roseville,MI": "RCO Engineering", "Revere Plastics Systems- Ankeny, Iowa": "Revere Plastics Systems", "Revere Plastics Systems- Fraser": "Revere Plastics Systems", "Rhino Tool House- New Corp Office Rhino LIVONIA": "Rhino Tool House", "Rhino Tool House- South Carolina": "Rhino Tool House", "Rhino Tool House-Lathrup": "Rhino Tool House", "Robex - Vantage- ShelbyVille": "Robex - Vantage", "RoboVent- NEW Location as of June 2024": "RoboVent", "Roush - Livonia,MI": "Roush", "Roush- Building 9": "Roush", "Royal Container - Oak Park,MI": "Royal Container", "The Paslin Company- Paslin (Cherry Creek)": "The Paslin Company", "The Paslin Company- Paslin (Warren - Ryan Rd.)": "The Paslin Company", "The Paslin Company- Paslin Pontiac": "The Paslin Company", "Toyoda Gosei North American Corporation- Brighton": "Toyoda Gosei North American Corporation", "UTEC (18.5 | Van Dyke)": "UTEC", "UTEC - Sterling Heights, MI": "UTEC", "Universal Container - Ferndale, MI": "Universal Container" };
var XERO_REDIRECT_URI = "https://red-dune-014d74810.7.azurestaticapps.net/xero-callback";
var XERO_SCOPES = "offline_access accounting.invoices accounting.contacts accounting.reports.profitandloss.read accounting.reports.aged.read";
async function sbService(env, method, path, body) {
  const r = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, {
    method,
    headers: {
      "apikey": env.SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  return { ok: r.ok, status: r.status, data };
}
__name(sbService, "sbService");
async function xeroTokenExchange(env, params) {
  const body = new URLSearchParams(params);
  const basic = btoa(env.XERO_CLIENT_ID + ":" + env.XERO_CLIENT_SECRET);
  const r = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: { "Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await r.json();
  if (!r.ok) throw new Error("Xero token error: " + (data.error_description || data.error || JSON.stringify(data)).toString().slice(0, 200));
  return data;
}
__name(xeroTokenExchange, "xeroTokenExchange");
var XERO_CC = {
  "Spark Talent": { idKey: "XERO_CC_TALENT_ID", secretKey: "XERO_CC_TALENT_SECRET" },
  "Spark Packaging": { idKey: "XERO_CC_PACKAGING_ID", secretKey: "XERO_CC_PACKAGING_SECRET" },
  "Flex Workforce Solutions": { idKey: "XERO_CC_FLEX_ID", secretKey: "XERO_CC_FLEX_SECRET" }
};
async function xeroAccessForTenant(env, tenantId) {
  const sel = "xero_connections?tenant_id=eq." + encodeURIComponent(tenantId) + "&select=*";
  let res = await sbService(env, "GET", sel);
  if (!res.ok || !res.data || !res.data[0]) throw new Error("Xero org not connected: " + tenantId);
  let conn = res.data[0];
  const isFresh = /* @__PURE__ */ __name((c) => !!(c && c.access_token && c.access_expires_at && new Date(c.access_expires_at).getTime() - Date.now() > 12e4), "isFresh");
  if (isFresh(conn)) return { access_token: conn.access_token, tenant_id: tenantId };
  const doRefresh = /* @__PURE__ */ __name(async (oldRefresh) => {
    if (!oldRefresh) throw new Error("Xero org has no stored refresh token - reconnect this org.");
    const tok = await xeroTokenExchange(env, { grant_type: "refresh_token", refresh_token: oldRefresh });
    const expiresAt = new Date(Date.now() + (tok.expires_in || 1800) * 1e3).toISOString();
    await sbService(env, "PATCH", "xero_connections?tenant_id=eq." + encodeURIComponent(tenantId), {
      access_token: tok.access_token,
      refresh_token: tok.refresh_token || oldRefresh,
      access_expires_at: expiresAt
    });
    return tok.access_token;
  }, "doRefresh");
  try {
    return { access_token: await doRefresh(conn.refresh_token), tenant_id: tenantId };
  } catch (e) {
    const msg = String(e && e.message || e);
    if (/consumed|invalid_grant/i.test(msg)) {
      res = await sbService(env, "GET", sel);
      conn = res && res.data && res.data[0] ? res.data[0] : conn;
      if (isFresh(conn)) return { access_token: conn.access_token, tenant_id: tenantId };
      return { access_token: await doRefresh(conn.refresh_token), tenant_id: tenantId };
    }
    throw e;
  }
}
__name(xeroAccessForTenant, "xeroAccessForTenant");
function sbxCors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
}
__name(sbxCors, "sbxCors");
function sbxJson(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { "Content-Type": "application/json", ...sbxCors() } });
}
__name(sbxJson, "sbxJson");
async function sbxPicklists(env, objectName, tok) {
  try {
    const r = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/" + encodeURIComponent(objectName) + "/describe", { headers: { "Authorization": "Bearer " + tok.access_token } });
    if (!r.ok) return {};
    const data = await r.json();
    const out = {};
    (data.fields || []).forEach((f) => {
      if (f.type === "picklist" || f.type === "multipicklist") {
        const vals = (f.picklistValues || []).filter((v) => v.active !== false).map((v) => v.label || v.value);
        if (vals.length) out[f.name] = { label: f.label, values: vals };
      }
    });
    return out;
  } catch (e) {
    return {};
  }
}
__name(sbxPicklists, "sbxPicklists");
var worker_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    if (url.pathname === "/intake/preview") {
      const key = url.searchParams.get("key") || "";
      if (!env.AZ_TENANT_ID || key !== env.AZ_TENANT_ID) return json({ error: "Unauthorized" }, 401, origin);
      const we = (url.searchParams.get("weekEnding") || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(we)) return json({ error: "weekEnding=YYYY-MM-DD required" }, 400, origin);
      const d = new Date(we + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 5);
      const checkDate = (d.getUTCMonth() + 1) + "-" + d.getUTCDate() + "-" + d.getUTCFullYear() + " Check Date";
      const out = { version: "preview-v35-git", weekEnding: we, checkDateFolder: checkDate, note: "PREVIEW ONLY - reads OneDrive and extracts; writes nothing, touches no invoices" };
      let token;
      try { token = await getGraphToken(env); } catch (e) { out.tokenError = String(e.message || e); return json(out, 200, origin); }
      const H = { Authorization: "Bearer " + token, Accept: "application/json" };
      const G = "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent("timecards@sparktalentinc.com") + "/drive";
      const entities = ["Spark Talent", "Flex Workforce Solutions", "Spark Packaging", "Ignite"];
      const files = [];
      out.folders = {};
      for (const ent of entities) {
        const parts = ["2026 TC " + ent, checkDate].map(encodeURIComponent).join("/");
        try {
          const r = await fetch(G + "/root:/" + parts + ":/children", { headers: H });
          if (!r.ok) { out.folders[ent] = { status: r.status }; continue; }
          const data = await r.json();
          const items = (data.value || []).filter((v) => !v.folder);
          out.folders[ent] = { fileCount: items.length };
          items.forEach((v) => files.push({ entity: ent, name: v.name, id: v.id, dl: v["@microsoft.graph.downloadUrl"] }));
        } catch (e) { out.folders[ent] = { error: String(e.message || e) }; }
      }
      const getText = async (f) => {
        const r = f.dl ? await fetch(f.dl) : await fetch(G + "/items/" + f.id + "/content", { headers: H });
        return await r.text();
      };
      const qp = (s) => s.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
      const strip = (s) => s.replace(/<[^>]+>/g, " ");
      // ===== extract raw data from the special-client files =====
      const penskeFiles = files.filter((f) => /penske/i.test(f.name));
      const penskeRaw = [];
      out.penske = { filesFound: penskeFiles.map((f) => f.entity + "/" + f.name), invoices: [] };
      for (const f of penskeFiles) {
        try {
          if (/\.(pdf|jpe?g|png|gif|webp)$/i.test(f.name)) {
            const _r = f.dl ? await fetch(f.dl) : await fetch(G + "/items/" + f.id + "/content", { headers: H });
            const _bb = await _r.arrayBuffer();
            if (_bb.byteLength > 8e6) { out.penske.invoices.push({ file: f.name, error: "file too large" }); continue; }
            const _u = new Uint8Array(_bb); let _s = ""; for (let k = 0; k < _u.length; k++) _s += String.fromCharCode(_u[k]);
            const _b64 = btoa(_s);
            const _part = /\.(jpe?g|png|gif|webp)$/i.test(f.name) ? { type: "image", source: { type: "base64", media_type: "image/" + f.name.split(".").pop().toLowerCase().replace(/^jpg$/, "jpeg"), data: _b64 } } : { type: "document", source: { type: "base64", media_type: "application/pdf", data: _b64 } };
            const _air = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2048, messages: [{ role: "user", content: [_part, { type: "text", text: "This is a Penske staffing report. Extract the PO number (starts with POR then digits) and each contractor with their regular hours. Reply ONLY as compact JSON with keys po (a string like POR051220) and workers (an array of objects each having name and reg). No other text and no markdown." }] }] }) });
            const _ai = await _air.json();
            if (!_air.ok) { out.penske.invoices.push({ file: f.name, error: "Claude error: " + (_ai && _ai.error && _ai.error.message ? _ai.error.message : _air.status) }); continue; }
            const _txt = (Array.isArray(_ai.content) ? _ai.content : []).filter((b) => b && b.type === "text").map((b) => b.text).join(" ");
            let _p = null; try { _p = JSON.parse(_txt.slice(_txt.indexOf("{"), _txt.lastIndexOf("}") + 1)); } catch (e2) {}
            const _po = _p && _p.po ? ("POR " + String(_p.po).replace(/\D/g, "")) : null;
            const _ws = _p && Array.isArray(_p.workers) ? _p.workers : [];
            _ws.forEach((w) => { if (w && w.name) penskeRaw.push({ worker: String(w.name).trim(), po: _po, reg: Number(w.reg) || 0 }); });
            out.penske.invoices.push({ file: f.name, po: _po, workerCount: _ws.length, workers: _ws.map((w) => w.name) });
            continue;
          }
          const body = strip(qp(await getText(f)));
          const poM = body.match(/POR\s*(\d{4,})/i);
          const po = poM ? "POR " + poM[1] : null;
          const hoursByName = {};
          const re = /(?:^|\n)\s*([A-Za-z][A-Za-z.'\-]+(?:\s+[A-Za-z][A-Za-z.'\-]+)+)\s*[-\u2013]\s*([\d.]+)\s*Reg\b/gi;
          let m; while ((m = re.exec(body))) hoursByName[m[1].trim()] = Number(m[2]) || 0;
          const uniq = Object.keys(hoursByName);
          uniq.forEach((n) => penskeRaw.push({ worker: n, po, reg: hoursByName[n] }));
          out.penske.invoices.push({ file: f.name, po, workerCount: uniq.length, workers: uniq });
        } catch (e) { out.penske.invoices.push({ file: f.name, error: String(e.message || e) }); }
      }
      const folderToPaslinEntity = { "Spark Talent": "Spark Talent", "Flex Workforce Solutions": "Flex Workforce", "Spark Packaging": "Spark Packaging" };
      const paslinFiles = files.filter((f) => /paslin/i.test(f.name));
      const paslinRaw = [];
      out.paslin = { filesFound: paslinFiles.map((f) => f.entity + "/" + f.name), extracted: [] };
      for (const f of paslinFiles) {
        const entity = folderToPaslinEntity[f.entity] || f.entity;
        try {
          const resp = f.dl ? await fetch(f.dl) : await fetch(G + "/items/" + f.id + "/content", { headers: H });
          const buf = await resp.arrayBuffer();
          if (buf.byteLength > 6e6) { out.paslin.extracted.push({ file: f.name, entity, error: "PDF too large (" + buf.byteLength + " bytes)" }); continue; }
          const bytes = new Uint8Array(buf); let bin = "";
          for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
          const b64 = btoa(bin);
          const payload = { model: "claude-sonnet-4-6", max_tokens: 1024, messages: [{ role: "user", content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
            { type: "text", text: "List every employee/contractor named on this staffing invoice. Return ONLY a JSON array of their full names, each formatted First then Last (convert any Last-comma-First format to First Last). No other text and no code fences." }
          ] }] };
          const air = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(payload) });
          const ai = await air.json();
          if (!air.ok) { out.paslin.extracted.push({ file: f.name, entity, error: "Claude error: " + (ai && ai.error && ai.error.message ? ai.error.message : air.status) }); continue; }
          const txt = (Array.isArray(ai.content) ? ai.content : []).filter((b) => b && b.type === "text").map((b) => b.text).join("\n").trim();
          let names = [];
          try { const jm = txt.match(/\[[\s\S]*\]/); names = jm ? JSON.parse(jm[0]) : []; } catch (e) { names = []; }
          names = (names || []).map((s) => String(s).trim()).filter(Boolean);
          names.forEach((n) => paslinRaw.push({ worker: n, entity }));
          out.paslin.extracted.push({ file: f.name, entity, nameCount: names.length, names });
        } catch (e) { out.paslin.extracted.push({ file: f.name, entity, error: String(e.message || e) }); }
      }
      // ===== pull this week's SF roster once (same query the engine uses) =====
      let roster = {};
      try {
        const mapResp = await sbService(env, "GET", "fin_client_map?select=sf_account_name,xero_contact");
        const mapRows = (mapResp && mapResp.ok && Array.isArray(mapResp.data)) ? mapResp.data : [];
        const mapByAcct = {}; mapRows.forEach((mm) => { mapByAcct[mm.sf_account_name] = mm.xero_contact; });
        const soql = "SELECT ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c, ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + we;
        const sf = await runSalesforceQueryAll(env, soql);
        if (!sf.ok) { out.rosterError = sf.error; }
        else {
          const seen = {};
          for (const rec of sf.records || []) {
            const ts = rec.ASYMBL_Time__Timesheet__r || {};
            const acct = (ts.Placement__r && ts.Placement__r.bpats__ATS_Job__r) ? ts.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c : null;
            const cand = ts.ASYMBL_Time__Candidate_Name__c;
            if (!acct || !cand) continue;
            const client = mapByAcct[acct]; if (!client) continue;
            const ck = String(client).replace(/\s+/g, " ").trim().toLowerCase();
            const nk = String(cand).replace(/\s+/g, " ").trim().toLowerCase();
            if (seen[ck + "||" + nk]) continue; seen[ck + "||" + nk] = 1;
            (roster[ck] = roster[ck] || []).push({ name: cand, nz: nk });
          }
        }
      } catch (e) { out.rosterError = String(e.message || e); }
      const NICKMAP = { nick: "nicholas", mike: "michael", mikey: "michael", bob: "robert", bobby: "robert", rob: "robert", robbie: "robert", bill: "william", billy: "william", will: "william", willie: "william", jim: "james", jimmy: "james", joe: "joseph", joey: "joseph", tom: "thomas", tommy: "thomas", dave: "david", davey: "david", dan: "daniel", danny: "daniel", chris: "christopher", matt: "matthew", tony: "anthony", rick: "richard", ricky: "richard", dick: "richard", ken: "kenneth", kenny: "kenneth", ed: "edward", eddie: "edward", ted: "theodore", teddy: "theodore", ben: "benjamin", benny: "benjamin", sam: "samuel", sammy: "samuel", alex: "alexander", andy: "andrew", drew: "andrew", greg: "gregory", jeff: "jeffrey", geoff: "jeffrey", josh: "joshua", nate: "nathan", pat: "patrick", ron: "ronald", ronnie: "ronald", steve: "steven", stevie: "steven", charlie: "charles", chuck: "charles", frank: "francis", gabe: "gabriel", jake: "jacob", larry: "lawrence", mitch: "mitchell", phil: "philip", pete: "peter", vince: "vincent", vinny: "vincent", tim: "timothy", jerry: "gerald", gerry: "gerald", hank: "henry", harry: "harold" };
      const canonName = (s) => { const p = String(s).split(" "); if (p.length && NICKMAP[p[0]]) p[0] = NICKMAP[p[0]]; return p.join(" "); };
      const lev = (a, b) => { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = []; for (let j2 = 0; j2 <= n; j2++) prev[j2] = j2; for (let i2 = 1; i2 <= m; i2++) { let cur = [i2]; for (let j2 = 1; j2 <= n; j2++) { const c = a[i2-1] === b[j2-1] ? 0 : 1; cur[j2] = Math.min(prev[j2]+1, cur[j2-1]+1, prev[j2-1]+c); } prev = cur; } return prev[n]; };
      const ratio = (a, b) => { const L = Math.max(a.length, b.length); return L === 0 ? 1 : 1 - lev(a, b) / L; };
      out.needsReview = [];
      out.rosters = {};
      const aliasMap = {};
      try { const _al = await sbService(env, "GET", "fin_name_aliases?select=client,doc_name,action,sf_name"); if (_al && _al.ok && Array.isArray(_al.data)) _al.data.forEach((a) => { aliasMap[String(a.client) + "|" + String(a.doc_name).toLowerCase()] = { action: a.action, sf_name: a.sf_name }; }); } catch (e) {}
      const matchOne = (name, pool, clientKey) => { const dn = String(name).replace(/\s+/g, " ").trim(); const _ali = clientKey ? aliasMap[clientKey + "|" + dn.toLowerCase()] : null; if (_ali) { if (_ali.action === "ignore") return { status: "ignored", sfName: null, nearest: null, score: 1 }; if (_ali.action === "fix_sf") return { status: "fix_sf", sfName: null, nearest: null, score: 1 }; if (_ali.action === "matched" && _ali.sf_name) return { status: "matched", sfName: _ali.sf_name, nearest: _ali.sf_name, score: 1, viaAlias: true }; } const nk = canonName(dn.toLowerCase()); let best = null, second = 0; for (const c of pool) { const cz = canonName(c.nz); const s = cz === nk ? 1 : ratio(nk, cz); if (!best || s > best.s) { second = best ? best.s : 0; best = { c, s }; } else if (s > second) { second = s; } } let status = "unmatched", sfName = null; if (best && best.s >= 0.995) { status = "matched"; sfName = best.c.name; } else if (best && best.s >= 0.85 && (best.s - second) >= 0.08) { status = "matched"; sfName = best.c.name; } else if (best && best.s >= 0.7) { status = "ambiguous"; } const _res = { status, sfName, nearest: best ? best.c.name : null, score: best ? Math.round(best.s * 100) / 100 : 0 }; if (status !== "matched" && clientKey) out.needsReview.push({ client: clientKey, docName: dn, nearest: _res.nearest, score: _res.score }); return _res; };
      const penskePool = roster["penske"] || [];
      out.rosters.penske = penskePool.map((c) => c.name);
      out.penske.rosterSize = penskePool.length;
      out.penske.roster = penskePool.map((c) => c.name);
      out.penske.matching = []; out.penske.droppedZeroHours = [];
      const penskeRows = [];
      for (const row of penskeRaw) {
        const r = matchOne(row.worker, penskePool, "penske");
        if (r.status !== "matched" && Number(row.reg) === 0) { out.penske.droppedZeroHours.push({ extracted: row.worker }); continue; }
        out.penske.matching.push({ extracted: row.worker, matchedTo: r.sfName, score: r.score, status: r.status, nearest: r.status === "matched" ? undefined : r.nearest });
        if (r.status === "matched") penskeRows.push({ worker: r.sfName, po: row.po });
      }
      out.penske.intakeRowsPreview = penskeRows;
      out.penske.flagged = out.penske.matching.filter((x) => x.status !== "matched");
      const paslinPool = roster["the paslin company"] || [];
      out.rosters.paslin = paslinPool.map((c) => c.name);
      out.paslin.rosterSize = paslinPool.length;
      out.paslin.roster = paslinPool.map((c) => c.name);
      out.paslin.matching = [];
      const paslinRows = [];
      for (const row of paslinRaw) {
        const r = matchOne(row.worker, paslinPool, "paslin");
        out.paslin.matching.push({ extracted: row.worker, entity: row.entity, matchedTo: r.sfName, score: r.score, status: r.status, nearest: r.status === "matched" ? undefined : r.nearest });
        if (r.status === "matched") paslinRows.push({ worker: r.sfName, entity: row.entity });
      }
      out.paslin.intakeRowsPreview = paslinRows;
      out.paslin.flagged = out.paslin.matching.filter((x) => x.status !== "matched");
      // Methods (PDF): pull the Order/PO number from the top of the sheet
      const methodsFiles = files.filter((f) => /methods/i.test(f.name));
      out.methods = { filesFound: methodsFiles.map((f) => f.entity + "/" + f.name), po: null };
      for (const f of methodsFiles) {
        try {
          const resp = f.dl ? await fetch(f.dl) : await fetch(G + "/items/" + f.id + "/content", { headers: H });
          const buf = await resp.arrayBuffer();
          if (buf.byteLength > 6e6) { out.methods.error = "PDF too large (" + buf.byteLength + " bytes)"; continue; }
          const bytes = new Uint8Array(buf); let bin = "";
          for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
          const b64 = btoa(bin);
          const payload = { model: "claude-sonnet-4-6", max_tokens: 256, messages: [{ role: "user", content: [
            (/\.(jpe?g|png|gif|webp)$/i.test(f.name) ? { type: "image", source: { type: "base64", media_type: "image/" + f.name.split(".").pop().toLowerCase().replace(/^jpg$/, "jpeg"), data: b64 } } : { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }),
            { type: "text", text: "This is a purchase order. Return ONLY the purchase order number shown near the top of the document, labeled Order (for example PRE0000258). Reply with just that value and nothing else." }
          ] }] };
          const air = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(payload) });
          const ai = await air.json();
          if (!air.ok) { out.methods.error = "Claude error: " + (ai && ai.error && ai.error.message ? ai.error.message : air.status); continue; }
          const txt = (Array.isArray(ai.content) ? ai.content : []).filter((b) => b && b.type === "text").map((b) => b.text).join(" ").trim();
          const poM = txt.match(/[A-Za-z]{2,}\d{3,}/);
          out.methods.po = poM ? poM[0].toUpperCase() : (txt ? txt.split(/\s+/)[0] : null);
          out.methods.raw = txt;
        } catch (e) { out.methods.error = String(e.message || e); }
      }
      // Fanuc (Excel, SET RATES): read the rate sheet via Graph Excel API, dedupe by name, pull OT rate
      const FANUC_CLIENT = "Fanuc America Corporation";
      const fanucFiles = files.filter((f) => /fanuc/i.test(f.name));
      out.fanuc = { filesFound: fanucFiles.map((f) => f.entity + "/" + f.name), contractorCount: 0 };
      const fanucContractors = [];
      for (const f of fanucFiles) {
        try {
          const wsResp = await fetch(G + "/items/" + f.id + "/workbook/worksheets", { headers: H });
          if (!wsResp.ok) { (out.fanuc.fileIssues = out.fanuc.fileIssues || []).push(f.name + ": worksheets " + wsResp.status); continue; }
          const sheets = ((await wsResp.json()).value || []);
          let pickedName = null, pickedHdr = -1, pickedVals = null;
          for (const ws of sheets) {
            const urResp = await fetch(G + "/items/" + f.id + "/workbook/worksheets/" + encodeURIComponent(ws.id) + "/usedRange?$select=values", { headers: H });
            if (!urResp.ok) continue;
            const vals = ((await urResp.json()).values || []);
            for (let ri = 0; ri < Math.min(vals.length, 12); ri++) {
              const rowTxt = vals[ri].map((c) => String(c == null ? "" : c).toLowerCase());
              if (rowTxt.some((c) => c.indexOf("full name") !== -1) && rowTxt.some((c) => c.indexOf("overtime") !== -1)) { pickedName = ws.name; pickedHdr = ri; pickedVals = vals; break; }
            }
            if (pickedVals) break;
          }
          if (!pickedVals) { (out.fanuc.skipped = out.fanuc.skipped || []).push(f.name + " (no rate sheet - not the timesheet)"); continue; }
          out.fanuc.sheetUsed = pickedName;
          const hdr = pickedVals[pickedHdr].map((c) => String(c == null ? "" : c).toLowerCase());
          const nameCol = hdr.findIndex((c) => c.indexOf("full name") !== -1);
          const otCol = hdr.findIndex((c) => c.indexOf("overtime") !== -1 && c.indexOf("rate") !== -1);
          const regCol = hdr.findIndex((c) => c.indexOf("regular") !== -1 && c.indexOf("rate") !== -1);
          const seen = {};
          for (let ri = pickedHdr + 1; ri < pickedVals.length; ri++) {
            const row = pickedVals[ri] || [];
            const raw = String(row[nameCol] == null ? "" : row[nameCol]).trim();
            if (!raw) continue;
            const key = raw.toLowerCase();
            if (seen[key]) continue; seen[key] = 1;
            const otRate = otCol >= 0 ? Number(row[otCol]) : NaN;
            const regRate = regCol >= 0 ? Number(row[regCol]) : NaN;
            let disp = raw;
            if (raw.indexOf(",") !== -1) { const p = raw.split(","); disp = (p.slice(1).join(" ").trim() + " " + p[0].trim()); }
            disp = disp.split(/\s+/).filter((t) => t.length > 1).join(" ");
            fanucContractors.push({ raw: raw, name: disp, ot_rate: (otRate === otRate ? otRate : null), reg_rate: (regRate === regRate ? regRate : null) });
          }
        } catch (e) { (out.fanuc.fileIssues = out.fanuc.fileIssues || []).push(f.name + ": " + String(e.message || e)); }
      }
      out.fanuc.contractorCount = fanucContractors.length;
      if (!fanucContractors.length && fanucFiles.length) out.fanuc.error = "no rate sheet found in any Fanuc file";
      const fanucPool = roster[FANUC_CLIENT.toLowerCase()] || [];
      out.rosters.fanuc = fanucPool.map((c) => c.name);
      out.fanuc.rosterSize = fanucPool.length;
      out.fanuc.matching = [];
      const fanucRows = [];
      for (const c of fanucContractors) {
        const r = matchOne(c.name, fanucPool, "fanuc");
        out.fanuc.matching.push({ extracted: c.raw, as: c.name, matchedTo: r.sfName, regRate: c.reg_rate, otRate: c.ot_rate, score: r.score, status: r.status, nearest: r.status === "matched" ? undefined : r.nearest });
        if (r.status === "matched" && c.ot_rate != null) fanucRows.push({ contact: FANUC_CLIENT, worker: r.sfName, ot_rate: c.ot_rate, dt_rate: null, reg_rate: c.reg_rate });
      }
      out.fanuc.intakeRowsPreview = fanucRows;
      out.fanuc.flagged = out.fanuc.matching.filter((x) => x.status !== "matched");
      // Fanuc EXPENSES (separate EXP file): Full Name (E), Invoice # (D), total = Due Employee (M). EXTRACTION ONLY - not committed.
      const fanucExpFiles = files.filter((f) => /fanuc/i.test(f.name) && /exp/i.test(f.name));
      out.fanucExpenses = { filesFound: fanucExpFiles.map((f) => f.entity + "/" + f.name), invoicingNote: "on commit -> kind=fanuc_expenses; engine builds a SEPARATE Fanuc expense invoice into the review flow (Route 2)", rows: [] };
      const fanucExpRaw = [];
      for (const f of fanucExpFiles) {
        try {
          const wsResp = await fetch(G + "/items/" + f.id + "/workbook/worksheets", { headers: H });
          if (!wsResp.ok) { out.fanucExpenses.error = "worksheets " + wsResp.status; continue; }
          const sheets = ((await wsResp.json()).value || []);
          let vals = null, hdrRow = -1;
          for (const ws of sheets) {
            const ur = await fetch(G + "/items/" + f.id + "/workbook/worksheets/" + encodeURIComponent(ws.id) + "/usedRange?$select=values", { headers: H });
            if (!ur.ok) continue;
            const vv = ((await ur.json()).values || []);
            for (let ri = 0; ri < Math.min(vv.length, 8); ri++) {
              const t = vv[ri].map((c) => String(c == null ? "" : c).toLowerCase().replace(/\s+/g, " "));
              if (t.some((c) => c.indexOf("full name") !== -1) && t.some((c) => c.indexOf("invoice") !== -1) && t.some((c) => c.indexOf("due") !== -1)) { vals = vv; hdrRow = ri; break; }
            }
            if (vals) break;
          }
          if (!vals) { out.fanucExpenses.error = "no expense sheet (Full Name + Invoice # + Due Employee) found"; continue; }
          const hdr = vals[hdrRow].map((c) => String(c == null ? "" : c).toLowerCase().replace(/\s+/g, " "));
          const nameCol = hdr.findIndex((c) => c.indexOf("full name") !== -1);
          const invCol = hdr.findIndex((c) => c.indexOf("invoice") !== -1);
          const amtCol = hdr.findIndex((c) => c.indexOf("due") !== -1 && c.indexOf("employee") !== -1);
          for (let ri = hdrRow + 1; ri < vals.length; ri++) {
            const row = vals[ri] || [];
            const nm = String(row[nameCol] == null ? "" : row[nameCol]).trim();
            if (!nm) continue;
            const inv = String(row[invCol] == null ? "" : row[invCol]).trim();
            const amt = amtCol >= 0 ? Number(row[amtCol]) : NaN;
            if (!(amt === amt)) continue;
            fanucExpRaw.push({ name: nm, invoiceNo: inv, amount: amt });
          }
        } catch (e) { out.fanucExpenses.error = String(e.message || e); }
      }
      const fanucExpPool = roster["fanuc america corporation"] || [];
      for (const e of fanucExpRaw) {
        const r = matchOne(e.name, fanucExpPool, "fanuc");
        out.fanucExpenses.rows.push({ extracted: e.name, matchedTo: r.sfName, invoiceNo: e.invoiceNo, amount: e.amount, status: r.status, nearest: r.status === "matched" ? undefined : r.nearest });
      }
      out.fanucExpenses.total = Math.round(fanucExpRaw.reduce((s, e) => s + (e.amount || 0), 0) * 100) / 100;
      // Bleichert & Hirotec: read the client's stated total; engine reconciles vs its SF computation and FLAGS (does not hold) a mismatch
      const reconDefs = [
        { key: "bleich", label: "Bleichert", prompt: "This is a weekly hours/payroll report. Return ONLY the dollar amount labeled TOTAL THIS WEEK on the first page (a number such as 4640.13). Reply with just the number - no words, no dollar sign, no commas." },
        { key: "hirotec", label: "Hirotec", prompt: "This is a labor cost report. Return ONLY the grand total dollar amount at the very bottom right of the report (the overall total, a number such as 25421.71). Reply with just the number - no words, no dollar sign, no commas." }
      ];
      out.reconcile = { note: "engine compares each computed invoice total to these and FLAGS a mismatch (never holds)", rows: [] };
      const reconRows = [];
      for (const rc of reconDefs) {
        const rfAll = files.filter((f) => new RegExp(rc.key, "i").test(f.name));
        const f = rfAll.find((x) => /\.pdf$/i.test(x.name)) || rfAll.find((x) => /\.eml$/i.test(x.name)) || rfAll[0];
        if (!f) { out.reconcile.rows.push({ client: rc.label, note: "no file this week" }); continue; }
        try {
          const resp = f.dl ? await fetch(f.dl) : await fetch(G + "/items/" + f.id + "/content", { headers: H });
          let content = null;
          if (/\.pdf$/i.test(f.name)) {
            const buf = await resp.arrayBuffer();
            if (buf.byteLength > 8e6) { out.reconcile.rows.push({ client: rc.label, file: f.name, error: "PDF too large" }); continue; }
            const bytes = new Uint8Array(buf); let bin = "";
            for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
            content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: btoa(bin) } }, { type: "text", text: rc.prompt }];
          } else if (/\.eml$/i.test(f.name)) {
            const raw = await resp.text();
            let pdfB64 = null;
            const pi = raw.search(/content-type:\s*application\/pdf/i);
            if (pi >= 0) { const he = raw.indexOf("\r\n\r\n", pi); if (he >= 0) { let e = raw.indexOf("\r\n--", he); if (e < 0) e = raw.length; const blob = raw.slice(he + 4, e).replace(/[\r\n\t ]/g, ""); if (blob.length > 200) pdfB64 = blob; } }
            if (pdfB64) {
              content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfB64 } }, { type: "text", text: rc.prompt }];
            } else {
              let body = raw; const ti = raw.search(/content-type:\s*text\/(plain|html)/i);
              if (ti >= 0) { const he = raw.indexOf("\r\n\r\n", ti); if (he >= 0) { let e = raw.indexOf("\r\n--", he); if (e < 0) e = raw.length; body = raw.slice(he + 4, e); } }
              body = body.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))).replace(/<[^>]+>/g, " ").slice(0, 6000);
              content = [{ type: "text", text: rc.prompt + "\n\nHere is the emailed report text:\n" + body }];
            }
          } else {
            out.reconcile.rows.push({ client: rc.label, file: f.name, note: "unsupported format for total extraction" }); continue;
          }
          const air = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 128, messages: [{ role: "user", content }] }) });
          const ai = await air.json();
          if (!air.ok) { out.reconcile.rows.push({ client: rc.label, file: f.name, error: "Claude " + (ai && ai.error && ai.error.message ? ai.error.message : air.status) }); continue; }
          const txt = (Array.isArray(ai.content) ? ai.content : []).filter((b) => b && b.type === "text").map((b) => b.text).join(" ");
          const mm = txt.replace(/[$,]/g, "").match(/\d+(\.\d+)?/);
          const total = mm ? Number(mm[0]) : null;
          const contactKey = Object.keys(roster).find((k) => k.indexOf(rc.key) !== -1) || null;
          out.reconcile.rows.push({ client: rc.label, file: f.name, total, contactMatched: contactKey, raw: txt.trim().slice(0, 60) });
          if (total != null && contactKey) reconRows.push({ contact: contactKey, total });
        } catch (e) { out.reconcile.rows.push({ client: rc.label, file: f.name, error: String(e.message || e) }); }
      }
      const _dbg = url.searchParams.get("debugRates");
      if (_dbg) {
        try {
          const dsoql = "SELECT ASYMBL_Time__Regular_Hours__c, ASYMBL_Time__Overtime_Hours__c, ASYMBL_Time__Double_Time_Hours__c, ASYMBL_Time__Regular_Billable_Amount__c, ASYMBL_Time__Overtime_Billable_Amount__c, ASYMBL_Time__Bill_Rate__c, ASYMBL_Time__Overtime_Bill_Rate__c, ASYMBL_Time__Double_Time_Bill_Rate__c, ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c, ASYMBL_Time__Timesheet__r.Placement__r.bpats__Bill_Rate__c, ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + we;
          const dr = await runSalesforceQueryAll(env, dsoql);
          const q = _dbg.toLowerCase();
          out.debugRates = (dr.records || []).filter((rec) => { const ts = rec.ASYMBL_Time__Timesheet__r || {}; return String(ts.ASYMBL_Time__Candidate_Name__c || "").toLowerCase().indexOf(q) !== -1; }).map((rec) => { const ts = rec.ASYMBL_Time__Timesheet__r || {}; const pl = ts.Placement__r || {}; const job = pl.bpats__ATS_Job__r || {}; return { name: ts.ASYMBL_Time__Candidate_Name__c, client: job.bpats__Account_Name__c, placementBillRate: pl.bpats__Bill_Rate__c, timeEntryBillRate: rec.ASYMBL_Time__Bill_Rate__c, timeEntryOtBillRate: rec.ASYMBL_Time__Overtime_Bill_Rate__c, timeEntryDtBillRate: rec.ASYMBL_Time__Double_Time_Bill_Rate__c, regHrs: rec.ASYMBL_Time__Regular_Hours__c, otHrs: rec.ASYMBL_Time__Overtime_Hours__c, sfRegAmt: rec.ASYMBL_Time__Regular_Billable_Amount__c, sfOtAmt: rec.ASYMBL_Time__Overtime_Billable_Amount__c }; });
        } catch (e) { out.debugRates = { error: String(e.message || e) }; }
      }
      const _dbgDFM = url.searchParams.get("debugDFM");
      if (_dbgDFM) {
        try {
          const dsoql = "SELECT ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c, ASYMBL_Time__Timesheet__r.Placement__r.Name, ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.Name, ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c, ASYMBL_Time__Bill_Rate__c FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + we + " AND ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c LIKE '%DFM%'";
          const dr = await runSalesforceQueryAll(env, dsoql);
          const seen = {};
          out.debugDFM = { entryCount: (dr.records || []).length, workers: [] };
          (dr.records || []).forEach((rec) => {
            const ts = rec.ASYMBL_Time__Timesheet__r || {}; const pl = ts.Placement__r || {}; const job = pl.bpats__ATS_Job__r || {};
            const nm = ts.ASYMBL_Time__Candidate_Name__c || "";
            if (!nm || seen[nm]) return; seen[nm] = 1;
            out.debugDFM.workers.push({ name: nm, account: job.bpats__Account_Name__c, jobName: job.Name, placementName: pl.Name, billRate: rec.ASYMBL_Time__Bill_Rate__c });
          });
        } catch (e) { out.debugDFM = { error: String(e.message || e) }; }
      }
      const commit = url.searchParams.get("commit") === "true";
      out.committed = false;
      if (commit) {
        const writes = [];
        try {
          await sbService(env, "DELETE", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.penske");
          const pr = await sbService(env, "POST", "fin_weekly_intake", { week_ending: we, kind: "penske", rows: penskeRows });
          writes.push({ kind: "penske", ok: pr.ok, status: pr.status, rows: penskeRows.length });
          await sbService(env, "DELETE", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.paslin");
          const ps = await sbService(env, "POST", "fin_weekly_intake", { week_ending: we, kind: "paslin", rows: paslinRows });
          writes.push({ kind: "paslin", ok: ps.ok, status: ps.status, rows: paslinRows.length });
          if (out.methods && out.methods.po) {
            await sbService(env, "DELETE", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.methods_po");
            const mp = await sbService(env, "POST", "fin_weekly_intake", { week_ending: we, kind: "methods_po", rows: [{ po: out.methods.po }] });
            writes.push({ kind: "methods_po", ok: mp.ok, status: mp.status, po: out.methods.po });
          }
          if (out.fanuc && out.fanuc.intakeRowsPreview && out.fanuc.intakeRowsPreview.length) {
            const ex = await sbService(env, "GET", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.client_rates&select=rows");
            let base = (ex && ex.ok && ex.data && ex.data[0] && Array.isArray(ex.data[0].rows)) ? ex.data[0].rows : [];
            base = base.filter((r) => String(r.contact || "").toLowerCase() !== "fanuc america corporation");
            const combined = base.concat(out.fanuc.intakeRowsPreview);
            await sbService(env, "DELETE", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.client_rates");
            const crw = await sbService(env, "POST", "fin_weekly_intake", { week_ending: we, kind: "client_rates", rows: combined });
            writes.push({ kind: "client_rates", ok: crw.ok, status: crw.status, rows: combined.length });
          }
          if (out.fanucExpenses && Array.isArray(out.fanucExpenses.rows)) {
            const expRows = out.fanucExpenses.rows.filter((x) => x.status === "matched").map((x) => ({ worker: x.matchedTo, invoiceNo: x.invoiceNo, amount: x.amount }));
            await sbService(env, "DELETE", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.fanuc_expenses");
            if (expRows.length) { const fe = await sbService(env, "POST", "fin_weekly_intake", { week_ending: we, kind: "fanuc_expenses", rows: expRows }); writes.push({ kind: "fanuc_expenses", ok: fe.ok, status: fe.status, rows: expRows.length }); }
          }
          if (reconRows && reconRows.length) {
            await sbService(env, "DELETE", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(we) + "&kind=eq.client_total");
            const rt = await sbService(env, "POST", "fin_weekly_intake", { week_ending: we, kind: "client_total", rows: reconRows });
            writes.push({ kind: "client_total", ok: rt.ok, status: rt.status, rows: reconRows.length });
          }
          out.committed = true; out.writes = writes;
        } catch (e) { out.commitError = String(e.message || e); out.writes = writes; }
      } else {
        out.commitHint = "Add &commit=true to the URL to write these rows into fin_weekly_intake (nothing has been written).";
      }
      return json(out, 200, origin);
    }
    if (url.pathname === "/training-roster" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === "/training-roster") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/training_certified?select=*&order=last_activity.desc", { headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY } });
        if (!r.ok) {
          const t = await r.text();
          return json({ error: "roster load failed: " + t.slice(0, 200) }, 502, origin);
        }
        const rows = await r.json();
        const roster = (rows || []).map(function(x) {
          return { trainee: x.trainee || "", done: x.missions_done || 0, total: x.missions_total || 0, certified: (x.missions_done || 0) >= (x.missions_total || 0) && (x.missions_total || 0) > 0, bestSolo: x.best_solo_seconds == null ? null : x.best_solo_seconds, lastActivity: x.last_activity || "" };
        });
        return json({ ok: true, count: roster.length, roster }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e).slice(0, 200) }, 502, origin);
      }
    }
    if (url.pathname === "/sandbox-seed") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: sbxCors() });
      const t = url.searchParams.get("token") || "";
      if (!env.SANDBOX_TOKEN || t !== env.SANDBOX_TOKEN) return sbxJson({ error: "Unauthorized" }, 401);
      try {
        const tok = await getSalesforceToken(env);
        const jobsRes = await runSalesforceQueryAll(env, "SELECT Id, Name, bpats__Status__c, bpats__Account_Name__c, bpats__Number_of_Openings__c, bpats__Openings_Filled__c, Recruiter__r.Name FROM bpats__Job__c WHERE bpats__Status__c = 'Open' ORDER BY Name");
        const jobs = jobsRes.ok ? (jobsRes.records || []).map((r) => ({ id: r.Id, name: r.Name, account: r.bpats__Account_Name__c || "", openings: r.bpats__Number_of_Openings__c || 0, filled: r.bpats__Openings_Filled__c || 0, recruiter: r.Recruiter__r && r.Recruiter__r.Name || "" })) : [];
        let rateCards = [];
        try {
          const rc = await runSalesforceQueryAll(env, "SELECT Id, Name FROM bpats__Rate_Card__c ORDER BY Name LIMIT 500");
          if (rc.ok) rateCards = (rc.records || []).map((r) => ({ id: r.Id, name: r.Name }));
        } catch (e) {
        }
        const picklists = {};
        picklists.Contact = await sbxPicklists(env, "Contact", tok);
        picklists.Account = await sbxPicklists(env, "Account", tok);
        return sbxJson({ ok: true, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), jobCount: jobs.length, jobs, rateCards, picklists });
      } catch (e) {
        return sbxJson({ error: String(e.message || e).slice(0, 200) }, 502);
      }
    }
    if (url.pathname === "/sandbox-result") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: sbxCors() });
      if (request.method !== "POST") return sbxJson({ error: "POST required" }, 405);
      let sbody;
      try {
        sbody = await request.json();
      } catch (e) {
        return sbxJson({ error: "bad json" }, 400);
      }
      if (!env.SANDBOX_TOKEN || String(sbody.token || "") !== env.SANDBOX_TOKEN) return sbxJson({ error: "Unauthorized" }, 401);
      const row = {
        trainee: String(sbody.trainee || "").slice(0, 120),
        mission_id: String(sbody.missionId || "").slice(0, 20),
        mission_title: String(sbody.missionTitle || "").slice(0, 200),
        exam: sbody.exam === true,
        seconds: Number.isFinite(+sbody.seconds) ? Math.round(+sbody.seconds) : null,
        completed_count: Number.isFinite(+sbody.completedCount) ? Math.round(+sbody.completedCount) : null,
        total_missions: Number.isFinite(+sbody.totalMissions) ? Math.round(+sbody.totalMissions) : null
      };
      if (!row.trainee || !row.mission_id) return sbxJson({ error: "trainee and missionId required" }, 400);
      try {
        const res = await sbService(env, "POST", "training_results", row);
        if (!res.ok) return sbxJson({ error: "save failed: " + JSON.stringify(res.data).slice(0, 200) }, 502);
        console.log("SANDBOX-RESULT: " + row.trainee + " " + row.mission_id + (row.exam ? " (exam " + row.seconds + "s)" : ""));
        return sbxJson({ ok: true });
      } catch (e) {
        return sbxJson({ error: String(e.message || e).slice(0, 200) }, 502);
      }
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === "/worker-profile") {
      if (request.method !== "POST") return json({ error: "POST required" }, 405, origin);
      if (!env.AZ_CLIENT_ID) return json({ error: "M365 not configured" }, 503, origin);
      let wp;
      try {
        wp = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      if (!env.PROFILE_TOKEN || String(wp.token || "") !== env.PROFILE_TOKEN) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
      const wpEmailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      const wpName = String(wp.name || "").slice(0, 120).trim();
      const wpEmail = String(wp.email || "").trim();
      const wpLeaderName = String(wp.leaderName || "").slice(0, 120).trim();
      const wpLeaderEmail = String(wp.leaderEmail || "").trim();
      const wpPrimary = String(wp.primary || "").slice(0, 40).trim();
      const wpSecondary = String(wp.secondary || "").slice(0, 40).trim();
      const wpLead = String(wp.leadNote || "").slice(0, 800);
      const wpPct = wp.pct && typeof wp.pct === "object" ? wp.pct : null;
      const wpQuad = wp.quadrant && typeof wp.quadrant === "object" ? wp.quadrant : null;
      const wpTaken = String(wp.takenAt || (/* @__PURE__ */ new Date()).toISOString());
      if (!wpName || !wpPrimary || !wpSecondary || !wpPct) {
        return json({ error: "name, primary, secondary and pct are required" }, 400, origin);
      }
      if (!wpEmailOk.test(wpEmail)) return json({ error: "Invalid team member email" }, 400, origin);
      if (!wpEmailOk.test(wpLeaderEmail)) return json({ error: "Invalid leader email" }, 400, origin);
      const wpFrom = env.PROFILE_FROM_MAILBOX || "hq@sparkcompanies.com";
      const WP_TYPES = { B: "Builder", A: "Adventurer", P: "Planner", R: "Relator" };
      const WP_ORDER = ["B", "A", "P", "R"];
      const WP_BLURB = {
        Builder: "pulled toward fixing what is broken, and motivated by ownership",
        Adventurer: "energized by new ground, and willing to move before the picture is clear",
        Planner: "focused on clarity and sequence, and the reason things actually land",
        Relator: "leads through trust, and usually knows how people are doing first"
      };
      const wpEsc = /* @__PURE__ */ __name((s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c]), "wpEsc");
      const wpQuadLine = /* @__PURE__ */ __name(() => {
        if (!wpQuad) return "";
        const x = Number(wpQuad.x) || 0, y = Number(wpQuad.y) || 0;
        const xs = Math.abs(x) < 0.08 ? "balanced between systems and people" : x > 0 ? "leaning toward people" : "leaning toward systems";
        const ys = Math.abs(y) < 0.08 ? "balanced between exploring and stabilizing" : y > 0 ? "leaning toward exploring new ground" : "leaning toward stabilizing what exists";
        return "On the map, " + xs + " and " + ys + ".";
      }, "wpQuadLine");
      const wpRows = /* @__PURE__ */ __name(() => WP_ORDER.map((k) => {
        const n = Number(wpPct[k]) || 0;
        const strong = WP_TYPES[k] === wpPrimary || WP_TYPES[k] === wpSecondary;
        const col = strong ? "#111111" : "#8B887F";
        return '<tr><td style="padding:7px 12px 7px 0;font:600 11px/1.4 Jost,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + col + ';white-space:nowrap">' + wpEsc(WP_TYPES[k]) + '</td><td style="padding:7px 0;width:100%"><div style="background:#EDEBE6;height:6px;width:100%"><div style="background:#C9A227;height:6px;width:' + n + '%"></div></div></td><td style="padding:7px 0 7px 12px;font:400 13px/1.4 Jost,Arial,sans-serif;color:' + col + ';text-align:right">' + n + "%</td></tr>";
      }).join(""), "wpRows");
      const wpFooter = '<tr><td style="padding:0 36px 32px"><div style="border-top:1px solid #EDEBE6;padding-top:14px;font:400 12px/1.5 Jost,Arial,sans-serif;color:#A8A5A0">Spark Companies &middot; Worker Profile &middot; completed ' + wpEsc(new Date(wpTaken).toLocaleString("en-US", { timeZone: "America/Detroit" })) + "</div></td></tr>";
      const wpShell = /* @__PURE__ */ __name((inner) => '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F3;padding:32px 16px"><tr><td align="center"><table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-top:3px solid #C9A227">' + inner + wpFooter + "</table></td></tr></table>", "wpShell");
      const wpMemberHtml = wpShell(
        '<tr><td style="padding:36px 36px 8px"><p style="margin:0 0 20px;font:600 10px/1.4 Jost,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#C9A227">Your worker profile</p><p style="margin:0 0 4px;font:400 15px/1.5 Jost,Arial,sans-serif;color:#8B887F">' + wpEsc(wpName) + '</p><h1 style="margin:0 0 6px;font:600 34px/1.1 Jost,Arial,sans-serif;letter-spacing:-.02em;color:#111111">' + wpEsc(wpPrimary) + '</h1><p style="margin:0 0 26px;font:400 16px/1.5 Georgia,serif;font-style:italic;color:#C9A227">with ' + wpEsc(wpSecondary) + ' close behind</p><p style="margin:0 0 24px;font:300 16px/1.65 Georgia,serif;color:#3A3A3A">A <strong style="font-weight:600">' + wpEsc(wpPrimary) + "</strong> is " + wpEsc(WP_BLURB[wpPrimary] || "") + '. The <strong style="font-weight:600">' + wpEsc(wpSecondary) + "</strong> showing up right behind it is the useful part &mdash; that combination is where you do your best work. " + wpEsc(wpQuadLine()) + '</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px">' + wpRows() + '</table><p style="margin:0;font:400 15px/1.6 Jost,Arial,sans-serif;color:#3A3A3A">A copy went to ' + wpEsc(wpLeaderName || "your leader") + ". Worth ten minutes on your next one-on-one, especially the parts you disagree with.</p></td></tr>"
      );
      const wpLeaderHtml = wpShell(
        '<tr><td style="padding:36px 36px 8px"><p style="margin:0 0 20px;font:600 10px/1.4 Jost,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#C9A227">Worker profile &middot; your team</p><p style="margin:0 0 4px;font:400 15px/1.5 Jost,Arial,sans-serif;color:#8B887F">' + wpEsc(wpName) + ' completed their profile</p><h1 style="margin:0 0 6px;font:600 34px/1.1 Jost,Arial,sans-serif;letter-spacing:-.02em;color:#111111">' + wpEsc(wpPrimary) + '</h1><p style="margin:0 0 26px;font:400 16px/1.5 Georgia,serif;font-style:italic;color:#C9A227">secondary: ' + wpEsc(wpSecondary) + '</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px">' + wpRows() + '</table><p style="margin:0 0 22px;font:300 16px/1.65 Georgia,serif;color:#3A3A3A">' + wpEsc(wpQuadLine()) + " A wide spread means they flex across situations. A concentrated one means they are strongest in a narrower lane, and more costly to put in the wrong seat.</p>" + (wpLead ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#FBF9F4;border-left:3px solid #C9A227"><tr><td style="padding:20px 22px"><p style="margin:0 0 8px;font:600 10px/1.4 Jost,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8B887F">How to lead a ' + wpEsc(wpPrimary) + '</p><p style="margin:0;font:300 16px/1.65 Georgia,serif;color:#3A3A3A">' + wpEsc(wpLead) + "</p></td></tr></table>" : "") + '<p style="margin:0;font:400 15px/1.6 Jost,Arial,sans-serif;color:#8B887F">' + wpEsc(wpName) + " received their own copy. This is a conversation starter, not an evaluation, and should not be used on its own for placement or performance decisions.</p></td></tr>"
      );
      try {
        const wpToken = await getGraphToken(env);
        const wpSubject = "Worker Profile: " + wpName + " - " + wpPrimary + " / " + wpSecondary;
        const wpSend = /* @__PURE__ */ __name(async (to, html) => {
          const r = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(wpFrom) + "/sendMail", {
            method: "POST",
            headers: { "Authorization": "Bearer " + wpToken, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                subject: wpSubject,
                body: { contentType: "HTML", content: html },
                toRecipients: [{ emailAddress: { address: to } }]
              },
              saveToSentItems: true
            })
          });
          if (r.status !== 202) {
            const t = await r.text();
            throw new Error(to + ": " + r.status + " " + t.slice(0, 140));
          }
        }, "wpSend");
        const wpResults = await Promise.allSettled([
          wpSend(wpEmail, wpMemberHtml),
          wpSend(wpLeaderEmail, wpLeaderHtml)
        ]);
        const wpFails = wpResults.filter((r) => r.status === "rejected").map((r) => String(r.reason && r.reason.message || r.reason));
        if (wpFails.length === 2) return json({ error: "Both sends failed", detail: wpFails }, 502, origin);
        console.log("WORKER-PROFILE: " + wpName + " -> " + wpPrimary + "/" + wpSecondary + " (leader " + wpLeaderEmail + ")" + (wpFails.length ? " PARTIAL: " + wpFails.join("; ") : ""));
        if (wpFails.length === 1) return json({ ok: true, partial: true, detail: wpFails }, 200, origin);
        return json({ ok: true, sentFrom: wpFrom }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e).slice(0, 200) }, 502, origin);
      }
    }
    if (url.pathname === "/health") {
      return json({ ok: true, service: "spark-hq-worker" }, 200, origin);
    }
    if (url.pathname === "/directory") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Unauthorized" }, 401, origin);
      try {
        const token = await getGraphToken(env);
        const users = await fetchDirectory(token);
        const people = users.map((u) => ({
          id: u.id,
          name: u.displayName || ((u.givenName || "") + " " + (u.surname || "")).trim(),
          email: (u.mail || u.userPrincipalName || "").toLowerCase(),
          title: u.jobTitle || "",
          department: u.department || "",
          managerId: u.manager && u.manager.id || null,
          // signals used only to filter out shared/room/equipment mailboxes (dropped before sending)
          _hasName: !!(u.givenName && u.surname),
          _upn: (u.userPrincipalName || "").toLowerCase(),
          active: u.accountEnabled !== false
        })).filter((p) => p.email && p.active).filter((p) => {
          const local = p.email.split("@")[0];
          const EXCLUDE_NAMES = [
            "judy security",
            "maven admin",
            "maven-admin",
            "maven intune admin",
            "maven-adminbackup",
            "spark admin",
            "spark talent viewer",
            "terminations",
            "tmx calendar",
            "bolt accounting",
            "spark packaging payroll",
            "spark packaging accounting",
            "spark payroll department"
          ];
          const normName = (p.name || "").replace(/\s+/g, " ").trim().toLowerCase();
          if (EXCLUDE_NAMES.indexOf(normName) !== -1) return false;
          if (/\b(conference|training|meeting|board)\s+room$/.test(normName)) return false;
          if (/\broom$/.test(normName) && /\b(conf|conference|training|meeting|huddle)\b/.test(normName)) return false;
          const SHARED_EXACT = [
            "info",
            "sales",
            "support",
            "noreply",
            "no-reply",
            "admin",
            "help",
            "contact",
            "billing",
            "accounting",
            "careers",
            "jobs",
            "marketing",
            "office",
            "reception",
            "mailbox",
            "alerts",
            "notifications",
            "donotreply",
            "postmaster",
            "abuse"
          ];
          if (SHARED_EXACT.indexOf(local) !== -1) return false;
          if (/^(room|equip|conf|rm)[-_.]/.test(local)) return false;
          if (/(^|[-_.])(scanner|printer|kiosk|copier|frontdesk)([-_.]|$)/.test(local)) return false;
          return true;
        }).map((p) => {
          delete p._hasName;
          delete p._upn;
          return p;
        }).sort((a, b) => a.name.localeCompare(b.name));
        return json({ count: people.length, people }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/groups") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Unauthorized" }, 401, origin);
      const uid = url.searchParams.get("id");
      if (!uid) return json({ error: "Missing id" }, 400, origin);
      try {
        const token = await getGraphToken(env);
        const debug = url.searchParams.get("raw") === "1";
        const r = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(uid) + "/memberOf",
          { headers: { "Authorization": "Bearer " + token } }
        );
        const bodyText = await r.text();
        if (!r.ok) {
          return json({ error: "Graph groups failed: " + r.status + " " + bodyText.slice(0, 200) }, 502, origin);
        }
        const data = JSON.parse(bodyText);
        if (debug) {
          var roles = [];
          try {
            var parts = token.split(".");
            var payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            roles = payload.roles || [];
          } catch (e) {
            roles = ["<decode failed: " + e.message + ">"];
          }
          return json({
            tokenRoles: roles,
            rawCount: (data.value || []).length,
            sample: (data.value || []).slice(0, 25).map((g) => ({
              type: g["@odata.type"],
              name: g.displayName,
              mailEnabled: g.mailEnabled,
              securityEnabled: g.securityEnabled
            }))
          }, 200, origin);
        }
        const groups = (data.value || []).filter((g) => g && g.displayName && (!g["@odata.type"] || g["@odata.type"] === "#microsoft.graph.group")).map((g) => ({ name: g.displayName, distribution: !!g.mailEnabled })).sort((a, b) => a.name.localeCompare(b.name));
        return json({ count: groups.length, groups }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/calendar") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const token = await getGraphToken(env);
        const uResp = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(who.email) + "?$select=id,displayName",
          { headers: { "Authorization": "Bearer " + token } }
        );
        if (!uResp.ok) {
          const t = await uResp.text();
          return json({ error: "User lookup failed: " + uResp.status + " " + t.slice(0, 140) }, 502, origin);
        }
        const me = await uResp.json();
        const now = /* @__PURE__ */ new Date();
        const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1e3);
        const qs = "startDateTime=" + encodeURIComponent(now.toISOString()) + "&endDateTime=" + encodeURIComponent(end.toISOString()) + "&$select=subject,start,end,location,isAllDay,organizer,onlineMeetingUrl,webLink&$orderby=start/dateTime&$top=15";
        const evResp = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(me.id) + "/calendarView?" + qs,
          { headers: { "Authorization": "Bearer " + token, "Prefer": 'outlook.timezone="Eastern Standard Time"' } }
        );
        if (!evResp.ok) {
          const t = await evResp.text();
          return json({ error: "Calendar read failed: " + evResp.status + " " + t.slice(0, 160) }, 502, origin);
        }
        const data = await evResp.json();
        const events = (data.value || []).map((e) => ({
          subject: e.subject || "(no subject)",
          start: e.start && e.start.dateTime ? e.start.dateTime : null,
          end: e.end && e.end.dateTime ? e.end.dateTime : null,
          allDay: !!e.isAllDay,
          location: e.location && e.location.displayName || "",
          organizer: e.organizer && e.organizer.emailAddress && e.organizer.emailAddress.name || "",
          online: e.onlineMeetingUrl || "",
          link: e.webLink || ""
        }));
        return json({ count: events.length, events }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-reports") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const q = (url.searchParams.get("q") || "headcount").replace(/['\\]/g, "");
        const soql = "SELECT Id, Name, DeveloperName, FolderName, Format FROM Report WHERE Name LIKE '%" + q + "%' LIMIT 50";
        const res = await runSalesforceQuery(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        return json({ ok: true, query: q, reports: res.records }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-report-run") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const reportId = (url.searchParams.get("id") || "").replace(/[^a-zA-Z0-9]/g, "");
      if (!reportId) return json({ error: "report id required (?id=...)" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const r = await fetch(
          tok.instance_url + "/services/data/v60.0/analytics/reports/" + reportId + "?includeDetails=false",
          { headers: { "Authorization": "Bearer " + tok.access_token } }
        );
        const data = await r.json();
        if (!r.ok) {
          const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
          return json({ error: "Report run failed: " + String(msg).slice(0, 300) }, 502, origin);
        }
        return json({
          ok: true,
          reportId,
          reportName: data.attributes && data.attributes.reportName,
          reportFormat: data.reportMetadata && data.reportMetadata.reportFormat,
          groupingsDown: data.reportMetadata && data.reportMetadata.groupingsDown,
          groupingsAcross: data.reportMetadata && data.reportMetadata.groupingsAcross,
          aggregates: data.reportMetadata && data.reportMetadata.aggregates,
          groupingValuesDown: data.groupingsDown && data.groupingsDown.groupings,
          factMap: data.factMap
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-jobs") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const q = (url.searchParams.get("q") || "").replace(/['\\]/g, "");
      try {
        let soql = "SELECT Id, Name, bpats__Status__c, bpats__Account_Name__c, bpats__Number_of_Openings__c, bpats__Openings_Filled__c, Recruiter__r.Name FROM bpats__Job__c ";
        if (q) soql += "WHERE bpats__Status__c = 'Open' AND (Name LIKE '%" + q + "%' OR bpats__Account_Name__c LIKE '%" + q + "%') ";
        else soql += "WHERE bpats__Status__c = 'Open' ";
        soql += "ORDER BY Name";
        const res = await runSalesforceQueryAll(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const jobs = (res.records || []).map((r) => ({
          id: r.Id,
          name: r.Name,
          status: r.bpats__Status__c || "",
          account: r.bpats__Account_Name__c || "",
          openings: r.bpats__Number_of_Openings__c || 0,
          filled: r.bpats__Openings_Filled__c || 0,
          recruiter: r.Recruiter__r && r.Recruiter__r.Name ? r.Recruiter__r.Name : ""
        }));
        return json({ ok: true, jobs }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-board") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const jobId = (url.searchParams.get("jobId") || "").replace(/[^a-zA-Z0-9]/g, "");
      if (!jobId) {
        /* SF_BOARD_SUMMARY_v1 + SF_BOARD_DEBUG_v1 + SF_BOARD_BU_v1 — org-wide or per-BU summary */
        const bu = (url.searchParams.get("bu") || "").trim().slice(0, 60).replace(/['"\\]/g, "");
        if (url.searchParams.get("listbu")) {
          const out = { ok: true, listbu: true };
          const d1 = await runSalesforceQueryAll(env, "SELECT ASYMBL_Time__Timesheet__r.Placement__r.Division__c dv, COUNT(Id) n FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.Placement__r.Division__c != null GROUP BY ASYMBL_Time__Timesheet__r.Placement__r.Division__c ORDER BY COUNT(Id) DESC");
          out.divisions = d1.ok ? d1.records : { error: d1.error };
          const d2 = await runSalesforceQueryAll(env, "SELECT Account.Subdivision__c sd, COUNT(Id) n FROM Opportunity WHERE IsClosed = false AND Account.Subdivision__c != null GROUP BY Account.Subdivision__c ORDER BY COUNT(Id) DESC");
          out.subdivisions = d2.ok ? d2.records : { error: d2.error };
          return json(out, 200, origin);
        }
        let pipelineTotal = null, headcount = null, hours = null, weekEnding = null;
        const diag = {};
        try {
          const pipeRes = await runSalesforceQueryAll( /* SF_BOARD_RUNNER_v2 */env, "SELECT SUM(Amount) amt FROM Opportunity WHERE IsClosed = false" + (bu ? " AND Account.Subdivision__c = '" + bu + "'" : ""));
          if (!pipeRes.ok) { diag.pipeline = pipeRes.error || "query not ok"; }
          else if (pipeRes.records && pipeRes.records[0] && pipeRes.records[0].amt != null) {
            pipelineTotal = Math.round(Number(pipeRes.records[0].amt));
          } else { diag.pipeline = "ok but empty/unaliased: " + JSON.stringify((pipeRes.records || [])[0] || null); }
        } catch (e) { diag.pipeline = "threw: " + String(e && e.message || e); }
        try {
          const weRes = await runSalesforceQueryAll( /* SF_BOARD_RUNNER_v2 */
            env,
            "SELECT ASYMBL_Time__Pay_Period_End_Date__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c != null AND ASYMBL_Time__Pay_Period_End_Date__c <= TODAY ORDER BY ASYMBL_Time__Pay_Period_End_Date__c DESC LIMIT 1"
          );
          if (weRes.ok && weRes.records && weRes.records.length) {
            weekEnding = weRes.records[0].ASYMBL_Time__Pay_Period_End_Date__c;
            const hRes = await runSalesforceQueryAll( /* SF_BOARD_RUNNER_v2 */
              env,
              "SELECT COUNT_DISTINCT(ASYMBL_Time__Timesheet__c) heads, SUM(ASYMBL_Time__Regular_Hours__c) rh, SUM(ASYMBL_Time__Overtime_Hours__c) oh, SUM(ASYMBL_Time__Double_Time_Hours__c) dh FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding + (bu ? " AND ASYMBL_Time__Timesheet__r.Placement__r.Division__c = '" + bu + "'" : "") /* SF_BOARD_HEADS_v3 + BU_v1 */
            );
            if (!hRes.ok) { diag.hours = hRes.error || "query not ok"; }
            else if (hRes.records && hRes.records[0]) {
              const agg = hRes.records[0]; /* SF_BOARD_HEADS_v3 */
              headcount = agg.heads == null ? null : Math.round(Number(agg.heads));
              hours = Math.round((Number(agg.rh) || 0) + (Number(agg.oh) || 0) + (Number(agg.dh) || 0));
            } else { diag.hours = "ok but no aggregate row returned"; }
          } else if (!weRes.ok) { diag.week = weRes.error || "week query not ok"; }
        } catch (e) { diag.hours = "threw: " + String(e && e.message || e); }
        return json({ ok: true, summary: true, bu: bu || null, pipelineTotal, headcount, hours, weekEnding, diag }, 200, origin);
      }
      try {
        const stagesRes = await runSalesforceQuery(
          env,
          "SELECT Id, Name, bpats__Sequence__c, bpats__Stage_Type__c, bpats__Interview_Stage__c FROM bpats__ATS_Stage__c WHERE bpats__Job__c = '" + jobId + "' ORDER BY bpats__Sequence__c LIMIT 50"
        );
        if (!stagesRes.ok) return json({ error: stagesRes.error }, 502, origin);
        const appsRes = await runSalesforceQuery(
          env,
          "SELECT Id, bpats__Applicant_Name__c, bpats__Stage__c, Stage_name__c, bpats__Applicant_Status__c, bpats__Days_in_Current_Stage__c, bpats__Recruited_By__r.Name FROM bpats__ATS_Applicant__c WHERE bpats__Job__c = '" + jobId + "' AND bpats__Applicant_Status__c != 'Inactive' ORDER BY bpats__Days_in_Current_Stage__c DESC LIMIT 100"
        );
        if (!appsRes.ok) return json({ error: appsRes.error }, 502, origin);
        const stages = (stagesRes.records || []).map((s) => ({
          id: s.Id,
          name: s.Name,
          seq: s.bpats__Sequence__c,
          type: s.bpats__Stage_Type__c || "",
          isInterview: !!s.bpats__Interview_Stage__c
        }));
        const applicants = (appsRes.records || []).map((a) => ({
          id: a.Id,
          name: a.bpats__Applicant_Name__c || "(unnamed)",
          stageId: a.bpats__Stage__c || "",
          stageName: a.Stage_name__c || "",
          status: a.bpats__Applicant_Status__c || "",
          days: a.bpats__Days_in_Current_Stage__c == null ? null : Math.round(a.bpats__Days_in_Current_Stage__c),
          recruiter: a.bpats__Recruited_By__r && a.bpats__Recruited_By__r.Name ? a.bpats__Recruited_By__r.Name : ""
        }));
        return json({ ok: true, stages, applicants }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/xero-authorize") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      if (!env.XERO_CLIENT_ID) return json({ error: "Xero not configured (missing XERO_CLIENT_ID)" }, 503, origin);
      const state = btoa(JSON.stringify({ e: who.email, n: Math.random().toString(36).slice(2) }));
      const authUrl = "https://login.xero.com/identity/connect/authorize?response_type=code&client_id=" + encodeURIComponent(env.XERO_CLIENT_ID) + "&redirect_uri=" + encodeURIComponent(XERO_REDIRECT_URI) + "&scope=" + encodeURIComponent(XERO_SCOPES) + "&state=" + encodeURIComponent(state);
      return json({ ok: true, authUrl }, 200, origin);
    }
    if (url.pathname === "/xero-callback-exchange" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const code = String(body.code || "");
      if (!code) return json({ error: "code required" }, 400, origin);
      try {
        const tok = await xeroTokenExchange(env, {
          grant_type: "authorization_code",
          code,
          redirect_uri: XERO_REDIRECT_URI
        });
        const connResp = await fetch("https://api.xero.com/connections", {
          headers: { "Authorization": "Bearer " + tok.access_token, "Content-Type": "application/json" }
        });
        const conns = await connResp.json();
        if (!connResp.ok) return json({ error: "Xero connections failed: " + JSON.stringify(conns).slice(0, 200) }, 502, origin);
        const expiresAt = new Date(Date.now() + (tok.expires_in || 1800) * 1e3).toISOString();
        const saved = [];
        for (const c of conns || []) {
          if (c.tenantType && c.tenantType !== "ORGANISATION") continue;
          await sbService(env, "POST", "xero_connections", {
            tenant_id: c.tenantId,
            tenant_name: c.tenantName || "(unnamed)",
            refresh_token: tok.refresh_token,
            access_token: tok.access_token,
            access_expires_at: expiresAt,
            connected_by: who.email
          });
          saved.push({ tenant_id: c.tenantId, tenant_name: c.tenantName });
        }
        return json({ ok: true, connected: saved }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/xero-orgs") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const res = await sbService(env, "GET", "xero_connections?select=tenant_id,tenant_name,entity_division,connected_by,updated_at&order=tenant_name");
        if (!res.ok) return json({ error: "Could not read connections" }, 502, origin);
        return json({ ok: true, orgs: res.data || [] }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/xero-map-entity" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const tenantId = String(body.tenantId || "");
      const division = String(body.division || "");
      if (!tenantId) return json({ error: "tenantId required" }, 400, origin);
      try {
        await sbService(env, "PATCH", "xero_connections?tenant_id=eq." + encodeURIComponent(tenantId), { entity_division: division || null });
        return json({ ok: true, tenantId, division }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/xero-cc-test") {
      const ent = url.searchParams.get("entity") || "Spark Talent";
      const cc = XERO_CC[ent];
      if (!cc) return json({ step: "map", error: "no XERO_CC entry for " + ent, known: Object.keys(XERO_CC) }, 200, origin);
      const id = env[cc.idKey], sec = env[cc.secretKey];
      const idSet = !!id, secSet = !!sec;
      const idTail = id ? id.slice(-6) : null;
      if (!idSet || !secSet) return json({ step: "secrets", entity: ent, idKey: cc.idKey, secretKey: cc.secretKey, idSet, secSet, idTail }, 200, origin);
      try {
        const basic = btoa(id + ":" + sec);
        const tr = await fetch("https://identity.xero.com/connect/token", { method: "POST", headers: { "Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials&scope=" + encodeURIComponent(url.searchParams.get("scope") || "accounting.invoices accounting.contacts") });
        const txt = await tr.text();
        return json({ step: "token", entity: ent, idKey: cc.idKey, idTail, http_status: tr.status, xero_response: txt.slice(0, 500) }, 200, origin);
      } catch (e) {
        return json({ step: "token-exception", entity: ent, error: String(e.message || e) }, 200, origin);
      }
    }
    if (url.pathname === "/xero-conns") {
      if (!env.AZ_TENANT_ID || url.searchParams.get("key") !== env.AZ_TENANT_ID) return json({ error: "Unauthorized" }, 401, origin);
      try {
        const via = url.searchParams.get("via") || "Spark Talent";
        const m = await sbService(env, "GET", "xero_connections?entity_division=eq." + encodeURIComponent(via) + "&select=tenant_id&limit=1");
        if (!m.ok || !m.data || !m.data[0]) return json({ error: "no healthy org to authenticate with (tried via=" + via + "); pass ?via=<a working entity name>" }, 200, origin);
        const { access_token } = await xeroAccessForTenant(env, m.data[0].tenant_id);
        const cr = await fetch("https://api.xero.com/connections", { headers: { "Authorization": "Bearer " + access_token, "Content-Type": "application/json" } });
        const conns = await cr.json();
        const list = Array.isArray(conns) ? conns.map((c) => ({ id: c.id, tenant: c.tenantName, type: c.tenantType, created: c.createdDateUtc })) : conns;
        return json({ count: Array.isArray(conns) ? conns.length : null, limit: 25, connections: list }, 200, origin);
      } catch (e) { return json({ error: String(e.message || e) }, 200, origin); }
    }
    if (url.pathname === "/xero-conns-delete") {
      if (!env.AZ_TENANT_ID || url.searchParams.get("key") !== env.AZ_TENANT_ID) return json({ error: "Unauthorized" }, 401, origin);
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id required (get it from /xero-conns)" }, 400, origin);
      try {
        const via = url.searchParams.get("via") || "Spark Talent";
        const m = await sbService(env, "GET", "xero_connections?entity_division=eq." + encodeURIComponent(via) + "&select=tenant_id&limit=1");
        if (!m.ok || !m.data || !m.data[0]) return json({ error: "no healthy org to authenticate with" }, 200, origin);
        const { access_token } = await xeroAccessForTenant(env, m.data[0].tenant_id);
        const dr = await fetch("https://api.xero.com/connections/" + encodeURIComponent(id), { method: "DELETE", headers: { "Authorization": "Bearer " + access_token } });
        return json({ ok: dr.ok, status: dr.status, deleted: id }, 200, origin);
      } catch (e) { return json({ error: String(e.message || e) }, 200, origin); }
    }
    if (url.pathname === "/xero-draft" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const inv = body.invoice;
      if (!inv || !inv.client || !inv.entity || !Array.isArray(inv.lines)) return json({ error: "invoice {client, entity, lines[]} required" }, 400, origin);
      try {
        const _mapRes = await sbService(env, "GET", "xero_connections?entity_division=eq." + encodeURIComponent(inv.entity) + "&select=tenant_id&limit=1");
        if (!_mapRes.ok || !_mapRes.data || !_mapRes.data[0]) return json({ error: "No Xero org mapped to entity '" + inv.entity + "'. Map it in Xero settings." }, 400, origin);
        const { access_token, tenant_id: tenantId } = await xeroAccessForTenant(env, _mapRes.data[0].tenant_id);
        const H = { "Authorization": "Bearer " + access_token, "Xero-Tenant-Id": tenantId, "Content-Type": "application/json", "Accept": "application/json" };
        let contactID = null;
        const cName = inv.client;
        const findResp = await fetch("https://api.xero.com/api.xro/2.0/Contacts?where=" + encodeURIComponent('Name=="' + cName.replace(/"/g, '\\"') + '"'), { headers: H });
        const findData = await findResp.json();
        if (findResp.ok && findData.Contacts && findData.Contacts[0]) {
          contactID = findData.Contacts[0].ContactID;
        } else {
          const createResp = await fetch("https://api.xero.com/api.xro/2.0/Contacts", {
            method: "POST",
            headers: H,
            body: JSON.stringify({ Contacts: [{ Name: cName }] })
          });
          const createData = await createResp.json();
          if (!createResp.ok || !createData.Contacts || !createData.Contacts[0]) {
            return json({ error: "Contact create failed: " + JSON.stringify(createData).slice(0, 200) }, 502, origin);
          }
          contactID = createData.Contacts[0].ContactID;
        }
        const lineItems = inv.lines.map((l) => ({
          Description: String(l[0]).slice(0, 3900),
          Quantity: Number(l[1]) || 0,
          UnitAmount: Number(l[2]) || 0,
          AccountCode: inv.account || void 0,
          TaxType: "NONE"
        }));
        const invoicePayload = {
          Invoices: [{
            Type: "ACCREC",
            Contact: { ContactID: contactID },
            Date: inv.invDateISO || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            DueDate: inv.dueDateISO || void 0,
            Reference: inv.reference || void 0,
            Status: "DRAFT",
            LineAmountTypes: "Exclusive",
            LineItems: lineItems
          }]
        };
        const invResp = await fetch("https://api.xero.com/api.xro/2.0/Invoices", { method: "POST", headers: H, body: JSON.stringify(invoicePayload) });
        const invData = await invResp.json();
        if (!invResp.ok || !invData.Invoices || !invData.Invoices[0]) {
          const msg = invData.Elements ? JSON.stringify(invData.Elements[0].ValidationErrors || invData).slice(0, 300) : JSON.stringify(invData).slice(0, 300);
          return json({ error: "Draft create failed: " + msg }, 502, origin);
        }
        const created = invData.Invoices[0];
        console.log("XERO-DRAFT by " + who.email + ": " + cName + " [" + inv.entity + "] $" + (created.Total || "?") + " -> " + created.InvoiceID);
        return json({ ok: true, invoiceID: created.InvoiceID, invoiceNumber: created.InvoiceNumber || "(draft)", total: created.Total, org: inv.entity }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/ar-overdue") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const ent = url.searchParams.get("entity") || "Spark Talent";
      try {
        let due = function(inv) {
          const m = String(inv.DueDateString || inv.DueDate || "").match(/(\d{4})-(\d{2})-(\d{2})/);
          if (m) return (/* @__PURE__ */ new Date(m[1] + "-" + m[2] + "-" + m[3] + "T23:59:59Z")).getTime();
          const ms = String(inv.DueDate || "").match(/\/Date\((\d+)/);
          return ms ? parseInt(ms[1]) : 0;
        };
        __name(due, "due");
        globalThis.__AR_CACHE = globalThis.__AR_CACHE || {};
        const hit = globalThis.__AR_CACHE[ent];
        if (hit && Date.now() - hit.at < 6e5) return json(hit.payload, 200, origin);
        const _m = await sbService(env, "GET", "xero_connections?entity_division=eq." + encodeURIComponent(ent) + "&select=tenant_id&limit=1");
        if (!_m.ok || !_m.data || !_m.data[0]) return json({ error: "No Xero org mapped to " + ent }, 400, origin);
        const cc = await xeroAccessForTenant(env, _m.data[0].tenant_id);
        const hdrs = { "Authorization": "Bearer " + cc.access_token, "Xero-Tenant-Id": cc.tenant_id, "Accept": "application/json" };
        const where = encodeURIComponent('Type=="ACCREC" AND AmountDue>0');
        let all = [], page = 1;
        while (page <= 6) {
          const r = await fetch("https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED&where=" + where + "&page=" + page, { headers: hdrs });
          const d = await r.json();
          if (!r.ok) return json({ error: "Xero invoices error: " + (d.Message || r.status) }, 502, origin);
          const inv = d.Invoices || [];
          all = all.concat(inv);
          if (inv.length < 100) break;
          page++;
        }
        const now = Date.now();
        let awaitingTotal = 0, awaitingCount = 0, overdueTotal = 0, overdueCount = 0;
        const buckets = { b30: 0, b60: 0, b90: 0, b90p: 0 };
        const rows = [];
        for (const inv of all) {
          const amt = Number(inv.AmountDue || 0);
          if (!(amt > 0)) continue;
          awaitingTotal += amt;
          awaitingCount++;
          const dl = Math.floor((now - due(inv)) / 864e5);
          if (dl <= 0) continue;
          overdueTotal += amt;
          overdueCount++;
          if (dl <= 30) buckets.b30 += amt;
          else if (dl <= 60) buckets.b60 += amt;
          else if (dl <= 90) buckets.b90 += amt;
          else buckets.b90p += amt;
          rows.push({ contact: inv.Contact && inv.Contact.Name || "", number: inv.InvoiceNumber || "", reference: inv.Reference || "", amountDue: Math.round(amt * 100) / 100, dueDate: (inv.DueDateString || "").slice(0, 10), daysLate: dl });
        }
        rows.sort((a, b) => b.amountDue - a.amountDue);
        const payload2 = {
          ok: true,
          entity: ent,
          asOf: (/* @__PURE__ */ new Date()).toISOString(),
          awaitingTotal: Math.round(awaitingTotal),
          awaitingCount,
          overdueTotal: Math.round(overdueTotal),
          overdueCount,
          buckets: { b30: Math.round(buckets.b30), b60: Math.round(buckets.b60), b90: Math.round(buckets.b90), b90p: Math.round(buckets.b90p) },
          invoices: rows.slice(0, 150)
        };
        globalThis.__AR_CACHE[ent] = { at: Date.now(), payload: payload2 };
        return json(payload2, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/pulse-sf") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let wk = (url.searchParams.get("weekEnding") || "").trim();
      if (wk && !/^\d{4}-\d{2}-\d{2}$/.test(wk)) return json({ error: "weekEnding must be YYYY-MM-DD" }, 400, origin);
      try {
        if (!wk) {
          const latest = await runSalesforceQuery(
            env,
            "SELECT ASYMBL_Time__Pay_Period_End_Date__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c != null AND ASYMBL_Time__Pay_Period_End_Date__c <= TODAY ORDER BY ASYMBL_Time__Pay_Period_End_Date__c DESC LIMIT 1"
          );
          if (latest.ok && latest.records && latest.records[0]) wk = latest.records[0].ASYMBL_Time__Pay_Period_End_Date__c;
        }
        if (!wk) return json({ error: "No pay-period data found" }, 404, origin);
        const SUMS = "SUM(ASYMBL_Time__Regular_Hours__c) rt, SUM(ASYMBL_Time__Overtime_Hours__c) ot, SUM(ASYMBL_Time__Double_Time_Hours__c) dt";
        const FROMW = " FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + wk;
        const byPerson = await runSalesforceQuery(
          env,
          "SELECT ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c cand, " + SUMS + FROMW + " GROUP BY ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c"
        );
        if (!byPerson.ok) return json({ error: byPerson.error, stage: "byPerson" }, 502, origin);
        const byDivision = await runSalesforceQuery(
          env,
          "SELECT ASYMBL_Time__Timesheet__r.Placement__r.Division__c dvsn, " + SUMS + FROMW + " GROUP BY ASYMBL_Time__Timesheet__r.Placement__r.Division__c"
        );
        const n = /* @__PURE__ */ __name((v) => Math.round((Number(v) || 0) * 100) / 100, "n");
        let rt = 0, ot = 0, dt = 0, headcount = 0, zeroHour = 0;
        const people = [];
        for (const r of byPerson.records || []) {
          const p = { name: r.cand || "(unnamed)", rt: n(r.rt), ot: n(r.ot), dt: n(r.dt) };
          p.total = n(p.rt + p.ot + p.dt);
          rt += p.rt;
          ot += p.ot;
          dt += p.dt;
          if (p.total > 0) {
            headcount++;
            people.push(p);
          } else {
            zeroHour++;
          }
        }
        const divisions = ((byDivision && byDivision.ok ? byDivision.records : []) || []).map((r) => ({
          division: r.dvsn || null,
          rt: n(r.rt),
          ot: n(r.ot),
          dt: n(r.dt),
          total: n((Number(r.rt) || 0) + (Number(r.ot) || 0) + (Number(r.dt) || 0))
        })).sort((a, b) => b.total - a.total);
        const total = n(rt + ot + dt);
        return json({
          weekEnding: wk,
          basis: "ASYMBL_Time__Pay_Period_End_Date__c",
          hours: { rt: n(rt), ot: n(ot), dt: n(dt), total, otPct: total ? n(ot / total * 100) : 0 },
          headcount,
          zeroHourPeople: zeroHour,
          divisions,
          unresolvedDivisionHours: n(divisions.filter((d) => !d.division).reduce((a, d) => a + d.total, 0)),
          divisionError: byDivision && byDivision.ok ? null : byDivision && byDivision.error || "division query failed",
          people: url.searchParams.get("detail") === "1" ? people.sort((a, b) => b.total - a.total) : void 0,
          truncated: (byPerson.records || []).length >= 2e3
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/pulse-xero") return pulseXero({ url, request, env, origin, json, verifyUser, sbService, xeroAccessForTenant });
    if (url.pathname === "/fin-probe") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const wk = url.searchParams.get("weekEnding") || "2026-06-14";
      const base = "FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + wk;
      const probes = {
        all_for_week: "SELECT COUNT() " + base,
        with_division_not_null: "SELECT COUNT() " + base + " AND ASYMBL_Time__Timesheet__r.Placement__r.Division__c != null",
        with_placement_not_null: "SELECT COUNT() " + base + " AND ASYMBL_Time__Timesheet__r.Placement__r.Id != null",
        with_job_not_null: "SELECT COUNT() " + base + " AND ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.Id != null",
        with_account_not_null: "SELECT COUNT() " + base + " AND ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c != null"
      };
      const out = {};
      const tok = await getSalesforceToken(env);
      for (const [label, q] of Object.entries(probes)) {
        try {
          const u = tok.instance_url + "/services/data/v60.0/query?q=" + encodeURIComponent(q);
          const r = await fetch(u, { headers: { "Authorization": "Bearer " + tok.access_token } });
          const data = await r.json();
          if (!r.ok) {
            out[label] = "ERR: " + (Array.isArray(data) && data[0] ? data[0].message : JSON.stringify(data)).slice(0, 120);
          } else {
            out[label] = data.totalSize;
          }
        } catch (e) {
          out[label] = "EXC: " + String(e.message || e).slice(0, 120);
        }
      }
      return json({ ok: true, weekEnding: wk, counts: out }, 200, origin);
    }
    if (url.pathname === "/sf-picklist") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const ALLOWED = { "Account": ["Subdivision__c", "Division__c", "Status__c"], "bpats__Job__c": ["Subdivision__c", "bpats__Status__c"] };
      const obj = url.searchParams.get("obj") || "Account";
      if (ALLOWED[obj] === void 0) return json({ error: "object not allowed" }, 400, origin);
      const listMode = url.searchParams.get("list") === "1";
      const fieldName = url.searchParams.get("field") || ALLOWED[obj][0];
      if (listMode === false && ALLOWED[obj].indexOf(fieldName) === -1) return json({ error: "field not allowed" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token || tok.accessToken || tok.token;
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        const r = await fetch(base + "/services/data/v59.0/sobjects/" + obj + "/describe", { headers: { "Authorization": "Bearer " + at } });
        if (r.ok !== true) return json({ error: "describe failed: " + r.status }, 502, origin);
        const d = await r.json();
        if (listMode) {
          const picks = (d.fields || []).filter(function(x) {
            return x.type === "picklist" || x.type === "multipicklist";
          }).map(function(x) {
            return { name: x.name, label: x.label };
          });
          return json({ ok: true, obj, picklistFields: picks }, 200, origin);
        }
        const f = (d.fields || []).find(function(x) {
          return x.name === fieldName;
        });
        if (f === void 0) return json({ error: "field not found" }, 404, origin);
        const values = (f.picklistValues || []).filter(function(v) {
          return v.active;
        }).map(function(v) {
          return v.value;
        });
        return json({ ok: true, obj, field: fieldName, restricted: f.restrictedPicklist === true, values }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-update-account-address") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a map admin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body; try { body = await request.json(); } catch(e){ return json({ error: "bad json" }, 400, origin); }
      const acctId = String((body && body.accountId) || "").trim();
      if (/^[a-zA-Z0-9]{15,18}$/.test(acctId) === false) return json({ error: "invalid accountId" }, 400, origin);
      const rec = {};
      if (Object.prototype.hasOwnProperty.call(body, "city")) rec.ShippingCity = String(body.city||"").trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, "state")) rec.ShippingState = String(body.state||"").trim().toUpperCase() || null;
      if (Object.prototype.hasOwnProperty.call(body, "zip")) rec.ShippingPostalCode = String(body.zip||"").trim() || null;
      if (Object.keys(rec).length === 0) return json({ error: "nothing to update" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token || tok.accessToken || tok.token;
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        const r = await fetch(base + "/services/data/v59.0/sobjects/Account/" + acctId, {
          method: "PATCH", headers: { "Authorization": "Bearer " + at, "Content-Type": "application/json" }, body: JSON.stringify(rec) });
        if (r.status === 204) return json({ ok: true, accountId: acctId, by: email }, 200, origin);
        let msg = "HTTP " + r.status;
        try { const e2 = await r.json(); if (Array.isArray(e2) && e2[0]) msg = (e2[0].errorCode?e2[0].errorCode+" ":"") + (e2[0].message||""); } catch(x){}
        return json({ error: msg }, 502, origin);
      } catch(e){ return json({ error: String(e.message||e) }, 502, origin); }
    }
    if (url.pathname === "/sf-update-account-address-bulk") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a map admin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body; try { body = await request.json(); } catch(e){ return json({ error: "bad json" }, 400, origin); }
      const ups = Array.isArray(body && body.updates) ? body.updates : [];
      if (ups.length < 1 || ups.length > 200) return json({ error: "1-200 updates required" }, 400, origin);
      if (ups.every(function(u){ return u && /^[a-zA-Z0-9]{15,18}$/.test(String(u.id||"")); }) === false) return json({ error: "invalid id in list" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token || tok.accessToken || tok.token;
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        const records = ups.map(function(u){
          const rec = { attributes: { type: "Account" }, Id: String(u.id) };
          if (u.city !== undefined) rec.ShippingCity = String(u.city||"").trim() || null;
          if (u.state !== undefined) rec.ShippingState = String(u.state||"").trim().toUpperCase() || null;
          if (u.zip !== undefined) rec.ShippingPostalCode = String(u.zip||"").trim() || null;
          return rec;
        });
        const r = await fetch(base + "/services/data/v59.0/composite/sobjects", {
          method: "PATCH", headers: { "Authorization": "Bearer " + at, "Content-Type": "application/json" },
          body: JSON.stringify({ allOrNone: false, records: records }) });
        if (r.ok !== true) { const t2 = await r.text(); return json({ error: "composite failed: " + r.status + " " + t2.slice(0,180) }, 502, origin); }
        const results = await r.json();
        const updatedIds = [], failed = [];
        results.forEach(function(res, i){
          if (res.success) updatedIds.push(String(ups[i].id));
          else failed.push({ id: String(ups[i].id), message: (res.errors && res.errors[0] && res.errors[0].message) || "unknown" });
        });
        return json({ ok: true, updated: updatedIds.length, updatedIds: updatedIds, failed: failed, by: email }, 200, origin);
      } catch(e){ return json({ error: String(e.message||e) }, 502, origin); }
    }
    if (url.pathname === "/sf-update-account-bu-bulk") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com", "mpatrico@sparkcompanies.com", "pmalani@sparkcompanies.com", "aopalewski@sparkcompanies.com", "eurisitti@sparkcompanies.com", "bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || who.user && who.user.email || "").toLowerCase();
      if (email === "") {
        try {
          const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
          const seg = t.split(".")[1] || "";
          email = String(JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/"))).email || "").toLowerCase();
        } catch (e) {
        }
      }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a map admin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const ids = Array.isArray(body && body.ids) ? body.ids.map(String) : [];
      const bu = String(body && body.bu || "").trim();
      const coBulk = String(body && body.company || "").trim();
      const setBuBulk = body && Object.prototype.hasOwnProperty.call(body, "bu");
      const setCoBulk = body && Object.prototype.hasOwnProperty.call(body, "company");
      const stBulk = String(body && body.status || "").trim();
      const setStBulk = body && Object.prototype.hasOwnProperty.call(body, "status");
      if (setBuBulk === false && setCoBulk === false && setStBulk === false) return json({ error: "nothing to update" }, 400, origin);
      if (coBulk.length > 120 || stBulk.length > 120) return json({ error: "value too long" }, 400, origin);
      if (ids.length < 1 || ids.length > 200) return json({ error: "1-200 ids required" }, 400, origin);
      if (ids.every(function(id) {
        return /^[a-zA-Z0-9]{15,18}$/.test(id);
      }) === false) return json({ error: "invalid id in list" }, 400, origin);
      if (bu.length > 120) return json({ error: "bu too long" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token || tok.accessToken || tok.token;
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        if (at === void 0 || base === "") return json({ error: "SF token missing fields" }, 502, origin);
        const records = ids.map(function(id) {
          const rec = { attributes: { type: "Account" }, Id: id };
          if (setCoBulk) rec.Division__c = coBulk === "" ? null : coBulk;
          if (setStBulk) rec.Status__c = stBulk === "" ? null : stBulk;
          if (setBuBulk) rec.Subdivision__c = bu === "" ? null : bu;
          return rec;
        });
        const r = await fetch(base + "/services/data/v59.0/composite/sobjects", {
          method: "PATCH",
          headers: { "Authorization": "Bearer " + at, "Content-Type": "application/json" },
          body: JSON.stringify({ allOrNone: false, records })
        });
        if (r.ok !== true) {
          const t2 = await r.text();
          return json({ error: "composite failed: " + r.status + " " + t2.slice(0, 180) }, 502, origin);
        }
        const results = await r.json();
        const updatedIds = [], failed = [];
        results.forEach(function(res, i) {
          if (res.success) updatedIds.push(ids[i]);
          else failed.push({ id: ids[i], message: res.errors && res.errors[0] && res.errors[0].message || "unknown" });
        });
        return json({ ok: true, updated: updatedIds.length, updatedIds, failed, by: email }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-update-account-bu") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com", "mpatrico@sparkcompanies.com", "pmalani@sparkcompanies.com", "aopalewski@sparkcompanies.com", "eurisitti@sparkcompanies.com", "bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || who.user && who.user.email || "").toLowerCase();
      if (email === "") {
        try {
          const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
          const seg = t.split(".")[1] || "";
          email = String(JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/"))).email || "").toLowerCase();
        } catch (e) {
        }
      }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a map admin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const acctId = String(body && body.accountId || "").trim();
      const bu = String(body && body.bu || "").trim();
      if (/^[a-zA-Z0-9]{15,18}$/.test(acctId) === false) return json({ error: "invalid accountId" }, 400, origin);
      const company = String(body && body.company || "").trim();
      const setCompany = body && Object.prototype.hasOwnProperty.call(body, "company");
      const status = String(body && body.status || "").trim();
      const setStatus = body && Object.prototype.hasOwnProperty.call(body, "status");
      if (bu.length > 120 || company.length > 120 || status.length > 120) return json({ error: "value too long" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token || tok.accessToken || tok.token;
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        if (at === void 0 || base === "") return json({ error: "SF token missing fields" }, 502, origin);
        const r = await fetch(base + "/services/data/v59.0/sobjects/Account/" + acctId, {
          method: "PATCH",
          headers: { "Authorization": "Bearer " + at, "Content-Type": "application/json" },
          body: JSON.stringify((function() {
            var rec = { Subdivision__c: bu === "" ? null : bu };
            if (setCompany) rec.Division__c = company === "" ? null : company;
            if (setStatus) rec.Status__c = status === "" ? null : status;
            return rec;
          })())
        });
        if (r.status === 204) return json({ ok: true, accountId: acctId, bu, by: email }, 200, origin);
        let msg = "HTTP " + r.status;
        try {
          const e2 = await r.json();
          if (Array.isArray(e2) && e2[0]) msg = (e2[0].errorCode ? e2[0].errorCode + " " : "") + (e2[0].message || "") + (Array.isArray(e2[0].fields) && e2[0].fields.length ? " [fields: " + e2[0].fields.join(",") + "]" : "");
        } catch (x) {
        }
        return json({ error: msg }, 502, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-update-job-bu") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com", "mpatrico@sparkcompanies.com", "pmalani@sparkcompanies.com", "aopalewski@sparkcompanies.com", "eurisitti@sparkcompanies.com", "bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || who.user && who.user.email || "").toLowerCase();
      if (!email) {
        try {
          const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
          const seg = t.split(".")[1] || "";
          email = String(JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/"))).email || "").toLowerCase();
        } catch (e) {
        }
      }
      if (!MAP_ADMINS.includes(email)) return json({ error: "not a map admin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const jobId = String(body && body.jobId || "").trim();
      const bu = String(body && body.bu || "").trim();
      if (!/^[a-zA-Z0-9]{15,18}$/.test(jobId)) return json({ error: "invalid jobId" }, 400, origin);
      if (!bu || bu.length > 120) return json({ error: "bu required" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token || tok.accessToken || tok.token;
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        if (!at || !base) return json({ error: "SF token missing fields" }, 502, origin);
        const r = await fetch(base + "/services/data/v59.0/sobjects/bpats__Job__c/" + jobId, {
          method: "PATCH",
          headers: { "Authorization": "Bearer " + at, "Content-Type": "application/json" },
          body: JSON.stringify({ Subdivision__c: bu })
        });
        if (r.status === 204) return json({ ok: true, jobId, bu, by: email }, 200, origin);
        let msg = "HTTP " + r.status;
        try {
          const e2 = await r.json();
          if (Array.isArray(e2) && e2[0]) msg = (e2[0].errorCode ? e2[0].errorCode + " " : "") + (e2[0].message || "") + (Array.isArray(e2[0].fields) && e2[0].fields.length ? " [fields: " + e2[0].fields.join(",") + "]" : "");
        } catch (x) {
        }
        return json({ error: msg }, 502, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-map-config") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com", "mpatrico@sparkcompanies.com", "pmalani@sparkcompanies.com", "aopalewski@sparkcompanies.com", "eurisitti@sparkcompanies.com", "bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      const sbHeaders = { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json" };
      if (request.method === "GET") {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/terr_map_config?id=eq.1&select=data,updated_at,updated_by", { headers: sbHeaders });
        if (!r.ok) return json({ error: "config read failed: " + r.status }, 502, origin);
        const rows = await r.json();
        if (!rows.length) return json({ ok: true, data: null }, 200, origin);
        return json({ ok: true, data: rows[0].data, updated_at: rows[0].updated_at, updated_by: rows[0].updated_by }, 200, origin);
      }
      if (request.method === "POST") {
        let email = String(who.email || who.user && who.user.email || "").toLowerCase();
        if (!email) {
          try {
            const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
            const seg = t.split(".")[1] || "";
            email = String(JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/"))).email || "").toLowerCase();
          } catch (e) {
          }
        }
        if (!MAP_ADMINS.includes(email)) return json({ error: "not a map admin", email }, 403, origin);
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ error: "bad json" }, 400, origin);
        }
        if (!body || !body.data || !Array.isArray(body.data.territories)) return json({ error: "data.territories required" }, 400, origin);
        if (JSON.stringify(body.data).length > 3e5) return json({ error: "payload too large" }, 413, origin);
        const row = [{ id: 1, data: body.data, updated_at: (/* @__PURE__ */ new Date()).toISOString(), updated_by: email }];
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/terr_map_config", { method: "POST", headers: Object.assign({}, sbHeaders, { "Prefer": "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(row) });
        if (!(r.status === 201 || r.status === 200 || r.status === 204)) return json({ error: "config write failed: " + r.status }, 502, origin);
        return json({ ok: true, updated_by: email }, 200, origin);
      }
      return json({ error: "method not allowed" }, 405, origin);
    }
    if (url.pathname === "/terr-map-data") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        let st2 = function(v) {
          v = String(v || "").trim();
          if (!v) return "";
          if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
          return AB[v.toLowerCase()] || "";
        };
        __name(st2, "st2");
        const tok = await getSalesforceToken(env);
        const base = String(tok.instance_url || "").replace(/\/+$/, "");
        const AB = { "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE", "district of columbia": "DC", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY" };
        const asoql = "SELECT Id, Name, Subdivision__c, Division__c, Status__c, ShippingCity, ShippingState, ShippingPostalCode, BillingCity, BillingState, BillingPostalCode FROM Account WHERE Name != null LIMIT 20000";
        const ares = await runSalesforceQueryAll(env, asoql);
        if (!ares.ok) return json({ error: ares.error }, 502, origin);
        const accounts = (ares.records || []).map((a) => ({
          id: a.Id,
          name: (a.Name || "").trim(),
          bu: a.Subdivision__c,
          co: a.Division__c,
          status: a.Status__c || "",
          city: (a.ShippingCity || a.BillingCity || "").trim(),
          shippingState: st2(a.ShippingState || a.BillingState),
          zip: String(a.ShippingPostalCode || a.BillingPostalCode || String()).trim(),
          url: base + "/lightning/r/Account/" + a.Id + "/view"
        }));
        const byName = {};
        accounts.forEach((a) => {
          byName[a.name.toLowerCase()] = a;
        });
        let jobs = [];
        const jsoql = "SELECT Id, Name, Subdivision__c, bpats__Account_Name__c, bpats__Number_of_Openings__c, bpats__Openings_Filled__c FROM bpats__Job__c WHERE bpats__Status__c = 'Open' LIMIT 2000";
        const jres = await runSalesforceQueryAll(env, jsoql);
        if (jres.ok) {
          jobs = (jres.records || []).map((j) => {
            const host = byName[String(j.bpats__Account_Name__c || "").trim().toLowerCase()];
            return {
              id: j.Id,
              name: (j.Name || "").trim(),
              bu: j.Subdivision__c,
              status: j.bpats__Status__c || "",
              account: (j.bpats__Account_Name__c || "").trim(),
              openings: j.bpats__Number_of_Openings__c != null ? Number(j.bpats__Number_of_Openings__c) : null,
              filled: j.bpats__Openings_Filled__c != null ? Number(j.bpats__Openings_Filled__c) : null,
              shippingState: host ? host.shippingState : "",
              url: base + "/lightning/r/bpats__Job__c/" + j.Id + "/view"
            };
          });
        }
        return json({ ok: true, counts: { accounts: accounts.length, jobs: jobs.length }, accounts, jobs }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-accounts") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        let norm = function(a) {
          const name = (a.Name || "").trim();
          let city = (a.ShippingCity || a.BillingCity || "").trim();
          const stateRaw = (a.ShippingState || a.BillingState || "").trim();
          const zipRaw = (a.ShippingPostalCode || a.BillingPostalCode || "").trim();
          const zipMatch = (zipRaw + " " + stateRaw + " " + name).match(/\b(\d{5})(?:-\d{4})?\b/);
          const zip5 = zipMatch ? zipMatch[1] : "";
          let st = stateRaw.replace(/\s*\d{5}(?:-\d{4})?\s*/, "").trim();
          const stTok = st.match(/\b([A-Za-z]{2})\b/);
          if (stTok) st = stTok[1].toUpperCase();
          if (!city) {
            const paren = name.match(/\(([^)]+)\)/);
            if (paren) city = paren[1].trim();
            else {
              const dash = name.match(/-\s*([A-Za-z .]+),\s*[A-Z]{2}/);
              if (dash) city = dash[1].trim();
            }
          }
          return { name, city, state: st, zip5 };
        };
        __name(norm, "norm");
        const type = (url.searchParams.get("type") || "all").replace(/['\\]/g, "");
        const typeClause = type === "all" ? "" : "Type = '" + type + "' AND ";
        const soql = "SELECT Id, Name, Type, Subdivision__c, Status__c, LastActivityDate, LastModifiedDate, BillingCity, BillingState, BillingPostalCode, ShippingCity, ShippingState, ShippingPostalCode FROM Account WHERE " + typeClause + "Name != null LIMIT 20000";
        const res = await runSalesforceQueryAll(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const accts = res.records || [];
        const normd = accts.map((a) => ({ id: a.Id, type: a.Type || "", bu: a.Subdivision__c || "", status: a.Status__c || "", lastActivity: a.LastActivityDate || a.LastModifiedDate || "", ...norm(a) }));
        let jobAcctIds = /* @__PURE__ */ new Set(), jobAcctNames = /* @__PURE__ */ new Set();
        try {
          const jr = await runSalesforceQueryAll(env, "SELECT bpats__Account__c, bpats__Account_Name__c FROM bpats__Job__c WHERE bpats__Status__c = 'Open'");
          (jr.records || []).forEach((j) => {
            if (j.bpats__Account__c) jobAcctIds.add(j.bpats__Account__c);
            if (j.bpats__Account_Name__c) jobAcctNames.add(String(j.bpats__Account_Name__c).toLowerCase().trim());
          });
        } catch (e) {
        }
        const zips = [...new Set(normd.map((x) => x.zip5).filter(Boolean))];
        const csKeys = [...new Set(normd.filter((x) => !x.zip5 && x.city && x.state).map((x) => x.city.toUpperCase() + "|" + x.state))];
        async function sbGet(path) {
          const r = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, {
            headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY }
          });
          if (!r.ok) return [];
          return await r.json();
        }
        __name(sbGet, "sbGet");
        const zipGeo = {};
        for (let i = 0; i < zips.length; i += 150) {
          const chunk = zips.slice(i, i + 150);
          const inList = chunk.map((z) => '"' + z + '"').join(",");
          const rows = await sbGet("terr_zipgeo?zip=in.(" + inList + ")&select=zip,lat,lng");
          rows.forEach((r) => {
            zipGeo[r.zip] = [r.lat, r.lng];
          });
        }
        const csGeo = {};
        if (csKeys.length) {
          const wantStates = [...new Set(csKeys.map((k) => k.split("|")[1]).filter(Boolean))];
          const wantPairs = new Set(csKeys);
          for (let i = 0; i < wantStates.length; i += 20) {
            const stChunk = wantStates.slice(i, i + 20);
            const inList = stChunk.map((x) => '"' + x + '"').join(",");
            const rows = await sbGet("terr_zipgeo?state=in.(" + inList + ")&select=city,state,lat,lng&limit=50000");
            rows.forEach((r) => {
              const key = (r.city || "").toUpperCase() + "|" + r.state;
              if (wantPairs.has(key) && !csGeo[key]) csGeo[key] = [r.lat, r.lng];
            });
          }
        }
        const placed = [];
        const unplaceable = [];
        for (const x of normd) {
          let ll = null, via = null;
          if (x.zip5 && zipGeo[x.zip5]) {
            ll = zipGeo[x.zip5];
            via = "zip";
          } else if (x.city && x.state && csGeo[x.city.toUpperCase() + "|" + x.state]) {
            ll = csGeo[x.city.toUpperCase() + "|" + x.state];
            via = "citystate";
          }
          if (ll) {
            placed.push({ id: x.id, name: x.name, type: x.type, bu: x.bu, status: x.status || "", lastActivity: x.lastActivity || "", hasJob: jobAcctIds.has(x.id) || jobAcctNames.has(String(x.name).toLowerCase().trim()), city: x.city, state: x.state, zip: x.zip5 || "", lat: ll[0], lng: ll[1], via });
          } else {
            unplaceable.push({ id: x.id, name: x.name, city: x.city, state: x.state, zip: x.zip5 || "", reason: x.state ? "no ZIP/city match" : "no usable address" });
          }
        }
        return json({ ok: true, total: accts.length, placed: placed.length, unplaceableCount: unplaceable.length, accounts: placed, unplaceable }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-seed-zips") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Admins only" }, 403, origin);
      try {
        const CSV_URL = "https://raw.githubusercontent.com/midwire/free_zipcode_data/master/all_us_zipcodes.csv";
        const cr = await fetch(CSV_URL);
        if (!cr.ok) return json({ error: "CSV fetch failed: " + cr.status }, 502, origin);
        const text = await cr.text();
        const lines = text.split(/\r?\n/);
        const hdr = lines[0].split(",");
        const ci = {};
        hdr.forEach((h, i) => ci[h.trim()] = i);
        const seen = {};
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const p = lines[i].split(",");
          if (p.length < 7) continue;
          const code = (p[ci.code] || "").trim();
          const lat = parseFloat(p[ci.lat]), lon = parseFloat(p[ci.lon]);
          if (!code || isNaN(lat) || isNaN(lon) || seen[code]) continue;
          seen[code] = 1;
          rows.push({
            zip: code,
            lat: Math.round(lat * 1e4) / 1e4,
            lng: Math.round(lon * 1e4) / 1e4,
            city: (p[ci.city] || "").trim(),
            state: (p[ci.state] || "").trim(),
            county: (p[ci.county] || "").trim()
          });
        }
        let inserted = 0, failed = 0;
        let firstErr = "";
        const BATCH = 1e3;
        for (let i = 0; i < rows.length; i += BATCH) {
          const slice = rows.slice(i, i + BATCH);
          const r = await fetch(env.SUPABASE_URL + "/rest/v1/terr_zipgeo", {
            method: "POST",
            headers: {
              "apikey": env.SUPABASE_SERVICE_KEY,
              "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates,return=minimal"
            },
            body: JSON.stringify(slice)
          });
          if (r.ok || r.status === 201 || r.status === 200) {
            inserted += slice.length;
          } else {
            failed += slice.length;
            if (!firstErr) firstErr = r.status + " " + (await r.text()).slice(0, 200);
          }
        }
        return json({ ok: failed === 0, parsed: rows.length, inserted, failed, firstError: firstErr || void 0 }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-jobs") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        let realLL = function(j) {
          const la = Number(j.Latitude__c), lo = Number(j.Longitude__c);
          if (j.Latitude__c != null && j.Longitude__c != null && la !== 0 && lo !== 0 && !isNaN(la) && !isNaN(lo)) return [la, lo];
          return null;
        }, zip5 = function(j) {
          const m = String(j.Postal_Code__c || "").match(/\b(\d{5})\b/);
          return m ? m[1] : "";
        };
        __name(realLL, "realLL");
        __name(zip5, "zip5");
        const soql = "SELECT Id, Name, Subdivision__c, bpats__Account_Name__c, bpats__Number_of_Openings__c, bpats__Openings_Filled__c, Latitude__c, Longitude__c, Postal_Code__c FROM bpats__Job__c WHERE bpats__Status__c = 'Open' LIMIT 2000";
        const res = await runSalesforceQueryAll(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const jobs = res.records || [];
        const zips = [...new Set(jobs.map(zip5).filter(Boolean))];
        async function sbGet(path) {
          const r = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, {
            headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY }
          });
          if (!r.ok) return [];
          return await r.json();
        }
        __name(sbGet, "sbGet");
        const zipGeo = {};
        for (let i = 0; i < zips.length; i += 150) {
          const chunk = zips.slice(i, i + 150);
          const inList = chunk.map((z) => '"' + z + '"').join(",");
          const rows = await sbGet("terr_zipgeo?zip=in.(" + inList + ")&select=zip,lat,lng");
          rows.forEach((r) => {
            zipGeo[r.zip] = [r.lat, r.lng];
          });
        }
        const placed = [], unplaceable = [];
        for (const j of jobs) {
          let ll = realLL(j), via = ll ? "coords" : null;
          if (!ll) {
            const z = zip5(j);
            if (z && zipGeo[z]) {
              ll = zipGeo[z];
              via = "zip";
            }
          }
          const total = Number(j.bpats__Number_of_Openings__c) || 0;
          const filled = Number(j.bpats__Openings_Filled__c) || 0;
          const remaining = total - filled;
          const rec = { id: j.Id, name: j.Name, bu: j.Subdivision__c || "", account: j.bpats__Account_Name__c || "", openings: remaining > 0 ? remaining : total, zip: zip5(j) };
          if (ll) placed.push({ ...rec, lat: ll[0], lng: ll[1], via });
          else unplaceable.push(rec);
        }
        return json({ ok: true, total: jobs.length, placed: placed.length, unplaceableCount: unplaceable.length, jobs: placed, unplaceable }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-load") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/terr_territories?select=id,name,owner,color,geo,sort_order&order=sort_order.asc", {
          headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY }
        });
        if (!r.ok) {
          const t = await r.text();
          return json({ error: "load failed: " + t.slice(0, 200) }, 502, origin);
        }
        const rows = await r.json();
        const territories = (rows || []).map((x) => ({
          id: x.id,
          name: x.name || "",
          owner: x.owner || "",
          color: x.color || "",
          states: x.geo && Array.isArray(x.geo.states) ? x.geo.states : [],
          counties: x.geo && Array.isArray(x.geo.counties) ? x.geo.counties : [],
          sort_order: x.sort_order || 0
        }));
        return json({ ok: true, count: territories.length, territories }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-save" && request.method === "POST") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Admins only" }, 403, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const terrs = Array.isArray(body.territories) ? body.territories : null;
      if (!terrs) return json({ error: "territories[] required" }, 400, origin);
      if (terrs.length > 100) return json({ error: "too many territories" }, 400, origin);
      const rows = terrs.map((t, i) => ({
        id: String(t.id || "").slice(0, 40),
        name: String(t.name || "").slice(0, 120),
        owner: String(t.owner || "").slice(0, 120),
        color: String(t.color || "").slice(0, 20),
        geo: {
          states: Array.isArray(t.states) ? t.states.map((s) => String(s).slice(0, 4)) : [],
          counties: Array.isArray(t.counties) ? t.counties.map((c) => String(c).slice(0, 8)) : []
        },
        sort_order: Number.isFinite(t.sort_order) ? t.sort_order : i,
        updated_by: gate.email || "",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      })).filter((rr) => rr.id);
      if (!rows.length) return json({ error: "no valid territories" }, 400, origin);
      try {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/terr_territories?on_conflict=id", {
          method: "POST",
          headers: {
            "apikey": env.SUPABASE_SERVICE_KEY,
            "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(rows)
        });
        if (!(r.ok || r.status === 201 || r.status === 200 || r.status === 204)) {
          const t = await r.text();
          return json({ error: "save failed: " + t.slice(0, 250) }, 502, origin);
        }
        console.log("TERR-SAVE by " + (gate.email || "?") + ": " + rows.length + " territories");
        return json({ ok: true, saved: rows.length }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/terr-set-bu" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const accountId = String(body.accountId || "");
      const bu = String(body.bu || "").trim();
      if (!/^001[A-Za-z0-9]{12,15}$/.test(accountId)) return json({ error: "invalid account id" }, 400, origin);
      const ALLOWED_BU = ["MI Metro", "Southeast", "Automation", "Light Industrial", "Ignite", "Central", "Northeast", "Enterprise", "Spark Sales", "JJP", "Southwest", "BPO"];
      if (ALLOWED_BU.indexOf(bu) === -1) return json({ error: "BU not allowed: " + bu.slice(0, 40) }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const r = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/Account/" + accountId, {
          method: "PATCH",
          headers: { "Authorization": "Bearer " + tok.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ "Subdivision__c": bu })
        });
        if (r.status === 204) {
          console.log("BU-SET by " + (who.email || "?") + ": account " + accountId + " -> " + bu);
          return json({ ok: true, accountId, bu }, 200, origin);
        }
        const data = await r.json().catch(() => ({}));
        const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
        return json({ error: "Update failed: " + String(msg).slice(0, 250) }, 502, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/xero-paste-code") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const code = (url.searchParams.get("code") || "").trim();
      if (!code) return json({ error: "code query param required" }, 400, origin);
      try {
        const tok = await xeroTokenExchange(env, { grant_type: "authorization_code", code, redirect_uri: XERO_REDIRECT_URI });
        if (!tok || !tok.access_token) return json({ error: "token exchange failed: " + JSON.stringify(tok).slice(0, 200) }, 502, origin);
        const connResp = await fetch("https://api.xero.com/connections", { headers: { "Authorization": "Bearer " + tok.access_token, "Content-Type": "application/json" } });
        const conns = await connResp.json();
        if (!connResp.ok || !Array.isArray(conns)) return json({ error: "connections failed: " + JSON.stringify(conns).slice(0, 200) }, 502, origin);
        const expiresAt = new Date(Date.now() + (tok.expires_in || 1800) * 1e3).toISOString();
        const saved = [];
        for (const c of conns) {
          if (c.tenantType && c.tenantType !== "ORGANISATION") continue;
          await sbService(env, "DELETE", "xero_connections?tenant_id=eq." + encodeURIComponent(c.tenantId), null);
          await sbService(env, "POST", "xero_connections", { tenant_id: c.tenantId, tenant_name: c.tenantName || "(unnamed)", refresh_token: tok.refresh_token, access_token: tok.access_token, access_expires_at: expiresAt, connected_by: who.email });
          saved.push({ tenant_id: c.tenantId, tenant_name: c.tenantName });
        }
        console.log("XERO-PASTE-CODE by " + (who.email || "?") + ": refreshed " + saved.length + " org(s): " + saved.map(function(x) {
          return x.tenant_name;
        }).join(", "));
        return json({ ok: true, refreshed: saved }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/inv-approvals-load") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const week = (url.searchParams.get("week") || "").slice(0, 20).replace(/[^0-9A-Za-z\/\-]/g, "");
      if (!week) return json({ error: "week required" }, 400, origin);
      try {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/inv_approvals?select=invoice_key,xero_id,xero_num,xero_org,approved_by,approved_at&week_ending=eq." + encodeURIComponent(week), { headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY } });
        if (!r.ok) {
          const t = await r.text();
          return json({ error: "load failed: " + t.slice(0, 200) }, 502, origin);
        }
        const rows = await r.json();
        const approvals = {};
        (rows || []).forEach(function(x) {
          approvals[x.invoice_key] = { id: x.xero_id || "", num: x.xero_num || "", org: x.xero_org || "", by: x.approved_by || "", at: x.approved_at || "" };
        });
        return json({ ok: true, week, count: (rows || []).length, approvals }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/fin-aliases-save" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (url.pathname === "/fin-aliases-save" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, origin); }
      const client = String(body.client || "").slice(0, 80);
      const docName = String(body.docName || "").slice(0, 120);
      const action = String(body.action || "matched").slice(0, 20);
      const sfName = body.sfName != null ? String(body.sfName).slice(0, 120) : null;
      if (!client || !docName) return json({ error: "client and docName required" }, 400, origin);
      const row = { client, doc_name: docName, action, sf_name: sfName, updated_at: new Date().toISOString() };
      try {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/fin_name_aliases?on_conflict=client,doc_name", { method: "POST", headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
        if (!(r.ok || r.status === 201 || r.status === 200 || r.status === 204)) { const t = await r.text(); return json({ error: "save failed: " + t.slice(0, 250) }, 502, origin); }
        return json({ ok: true }, 200, origin);
      } catch (e) { return json({ error: String(e.message || e) }, 502, origin); }
    }
    if (url.pathname === "/inv-approvals-save" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const week = String(body.week || "").slice(0, 20);
      const invoiceKey = String(body.invoiceKey || "").slice(0, 200);
      if (!week || !invoiceKey) return json({ error: "week and invoiceKey required" }, 400, origin);
      const row = { week_ending: week, invoice_key: invoiceKey, xero_id: String(body.xeroId || "").slice(0, 60), xero_num: String(body.xeroNum || "").slice(0, 60), xero_org: String(body.xeroOrg || "").slice(0, 120), approved_by: who.email || "", approved_at: (/* @__PURE__ */ new Date()).toISOString() };
      try {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/inv_approvals?on_conflict=week_ending,invoice_key", { method: "POST", headers: { "apikey": env.SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + env.SUPABASE_SERVICE_KEY, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
        if (!(r.ok || r.status === 201 || r.status === 200 || r.status === 204)) {
          const t = await r.text();
          return json({ error: "save failed: " + t.slice(0, 250) }, 502, origin);
        }
        return json({ ok: true }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/dh-batch") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const weekEnding = (url.searchParams.get("weekEnding") || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) return json({ error: "weekEnding=YYYY-MM-DD required" }, 400, origin);
      try {
        const end = /* @__PURE__ */ new Date(weekEnding + "T00:00:00Z");
        const start = new Date(end.getTime());
        start.setUTCDate(start.getUTCDate() - 6);
        const fmt = /* @__PURE__ */ __name(function(d) {
          return d.toISOString().slice(0, 10);
        }, "fmt");
        const soql = "SELECT Id, Name, bpats__Start_Date__c, Status__c, Placement_Fee_Amount__c, Division__c, Job_Title__c, bpats__Account__r.Name, bpats__ATS_Candidate__r.Name FROM bpats__Placement__c WHERE Placement_Fee_Amount__c > 0 AND bpats__Start_Date__c >= " + fmt(start) + " AND bpats__Start_Date__c <= " + fmt(end) + " ORDER BY bpats__Account__r.Name, bpats__Start_Date__c";
        const sf = await runSalesforceQueryAll(env, soql);
        if (!sf.ok) return json({ error: "SF query failed: " + (sf.error || "") }, 502, origin);
        const recs = sf.records || [];
        const byClient = {};
        recs.forEach(function(r) {
          const client = r.bpats__Account__r && r.bpats__Account__r.Name || "(no account)";
          const cand = r.bpats__ATS_Candidate__r && r.bpats__ATS_Candidate__r.Name || "(candidate)";
          const fee = Number(r.Placement_Fee_Amount__c) || 0;
          if (fee <= 0) return;
          const entity = r.Division__c && String(r.Division__c).trim() || "";
          const gkey = client + "||" + entity;
          if (!byClient[gkey]) byClient[gkey] = { client, entity, entityMissing: !entity, lines: [], subtotal: 0, placements: 0 };
          const jt = r.Job_Title__c && String(r.Job_Title__c).trim() || "";
          const sd = r.bpats__Start_Date__c ? (function(iso) {
            const p = String(iso).slice(0, 10).split("-");
            if (p.length !== 3) return iso;
            return parseInt(p[1], 10) + "/" + parseInt(p[2], 10) + "/" + p[0].slice(2);
          })(r.bpats__Start_Date__c) : "";
          const dpieces = ["Direct Hire", cand];
          if (jt) dpieces.push(jt);
          var ddesc = dpieces.join(" - ");
          if (sd) ddesc = ddesc + " - Start Date: " + sd;
          byClient[gkey].lines.push({ desc: ddesc, hours: 1, rate: fee, amount: fee, startDate: r.bpats__Start_Date__c, status: r.Status__c });
          byClient[gkey].subtotal += fee;
          byClient[gkey].placements += 1;
        });
        const invoices = Object.keys(byClient).map(function(c) {
          return byClient[c];
        });
        const total = invoices.reduce(function(s2, iv) {
          return s2 + iv.subtotal;
        }, 0);
        return json({ ok: true, type: "direct_hire", weekEnding, weekStart: fmt(start), invoices, summary: { invoices: invoices.length, placements: recs.length, total } }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/fin-batch") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let weekEnding = (url.searchParams.get("weekEnding") || "").trim();
      try {
        if (!weekEnding) {
          const latest = await runSalesforceQuery(
            env,
            "SELECT ASYMBL_Time__Pay_Period_End_Date__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c != null AND ASYMBL_Time__Pay_Period_End_Date__c <= TODAY ORDER BY ASYMBL_Time__Pay_Period_End_Date__c DESC LIMIT 1"
          );
          if (latest.ok && latest.records && latest.records[0]) weekEnding = latest.records[0].ASYMBL_Time__Pay_Period_End_Date__c;
        }
        if (!weekEnding) return json({ error: "No pay-period data found" }, 404, origin);
        const soql = "SELECT ASYMBL_Time__Regular_Hours__c, ASYMBL_Time__Overtime_Hours__c, ASYMBL_Time__Double_Time_Hours__c, ASYMBL_Time__Regular_Billable_Amount__c, ASYMBL_Time__Overtime_Billable_Amount__c, ASYMBL_Time__Double_Time_Billable_Amount__c, ASYMBL_Time__Bill_Rate__c, ASYMBL_Time__Overtime_Bill_Rate__c, ASYMBL_Time__Double_Time_Bill_Rate__c, ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c, ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c, ASYMBL_Time__Timesheet__r.Placement__r.Division__c, ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding;
        const res = await runSalesforceQueryAll(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const dbg = {
          totalPulled: (res.records || []).length,
          droppedHouse: 0,
          droppedNoClient: 0,
          droppedUnknownEntity: 0,
          droppedZeroHours: 0,
          kept: 0,
          rawRegHours: 0,
          rawOtHours: 0,
          rawDtHours: 0,
          entityCounts: {},
          distinctCandidates: {},
          entityFromSF: 0,
          entityDerived: 0,
          entityUnresolved: 0,
          unresolvedClients: {}
        };
        const groups = {};
        const fmtDate = /* @__PURE__ */ __name((d) => {
          if (!d) return "";
          const parts2 = String(d).split("-");
          if (parts2.length !== 3) return d;
          const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(parts2[1], 10) - 1];
          return mo + " " + parseInt(parts2[2], 10) + ", " + parts2[0];
        }, "fmtDate");
        for (const r of res.records || []) {
          const ts = r.ASYMBL_Time__Timesheet__r || {};
          const sfDivision = ts.Placement__r && ts.Placement__r.Division__c ? ts.Placement__r.Division__c : null;
          dbg.rawRegHours += r.ASYMBL_Time__Regular_Hours__c || 0;
          dbg.rawOtHours += r.ASYMBL_Time__Overtime_Hours__c || 0;
          dbg.rawDtHours += r.ASYMBL_Time__Double_Time_Hours__c || 0;
          const job = ts.Placement__r && ts.Placement__r.bpats__ATS_Job__r ? ts.Placement__r.bpats__ATS_Job__r : {};
          const client = job.bpats__Account_Name__c || "(no client)";
          const xeroName = FORGE_XERO_NAME[client] || client;
          const coa = FORGE_COA_MAP[client];
          const acct = coa && coa.code ? coa.code : "";
          let entity, entitySource;
          if (sfDivision) {
            entity = sfDivision;
            entitySource = "sf";
            dbg.entityFromSF++;
          } else if (coa && coa.entity) {
            entity = coa.entity;
            entitySource = "derived";
            dbg.entityDerived++;
          } else {
            entity = "Unresolved";
            entitySource = "unresolved";
            dbg.entityUnresolved++;
            dbg.unresolvedClients[client] = (dbg.unresolvedClients[client] || 0) + 1;
          }
          dbg.entityCounts[entity] = (dbg.entityCounts[entity] || 0) + 1;
          if (entity === "House") {
            dbg.droppedHouse++;
            continue;
          }
          if (client === "(no client)") dbg.droppedNoClient++;
          const rtH = r.ASYMBL_Time__Regular_Hours__c || 0, otH = r.ASYMBL_Time__Overtime_Hours__c || 0, dtH = r.ASYMBL_Time__Double_Time_Hours__c || 0;
          if (rtH === 0 && otH === 0 && dtH === 0) {
            dbg.droppedZeroHours++;
          }
          const cand = ts.ASYMBL_Time__Candidate_Name__c || "Unknown";
          dbg.distinctCandidates[cand] = true;
          const wkEnd = ts.ASYMBL_Time__Pay_Period_End_Date__c || weekEnding;
          const key = entity + "||" + xeroName;
          if (!groups[key]) groups[key] = { client: xeroName, entity, entitySource, account: acct, sfNames: {}, lines: [], cands: {}, subtotal: 0 };
          const g = groups[key];
          g.sfNames[client] = true;
          if (!g.account && acct) g.account = acct;
          g.cands[cand] = true;
          const rt = r.ASYMBL_Time__Regular_Hours__c || 0, rtAmt = r.ASYMBL_Time__Regular_Billable_Amount__c || 0;
          const ot = r.ASYMBL_Time__Overtime_Hours__c || 0, otAmt = r.ASYMBL_Time__Overtime_Billable_Amount__c || 0;
          const dt = r.ASYMBL_Time__Double_Time_Hours__c || 0, dtAmt = r.ASYMBL_Time__Double_Time_Billable_Amount__c || 0;
          if (rt > 0) g.lines.push([cand + " RT (" + wkEnd + ")", round2(rt), round2(r.ASYMBL_Time__Bill_Rate__c || 0), round2(rtAmt)]);
          if (ot > 0) g.lines.push([cand + " OT (" + wkEnd + ")", round2(ot), round2(r.ASYMBL_Time__Overtime_Bill_Rate__c || 0), round2(otAmt)]);
          if (dt > 0) g.lines.push([cand + " DT (" + wkEnd + ")", round2(dt), round2(r.ASYMBL_Time__Double_Time_Bill_Rate__c || 0), round2(dtAmt)]);
          g.subtotal += rtAmt + otAmt + dtAmt;
          dbg.kept++;
        }
        const invoices = Object.keys(groups).map((k) => {
          const g = groups[k];
          g.lines.sort((a, b) => a[0].localeCompare(b[0]));
          const sfNameList = Object.keys(g.sfNames);
          return {
            client: g.client,
            entity: g.entity,
            entitySource: g.entitySource,
            emp: Object.keys(g.cands).length,
            invDate: fmtDate(weekEnding),
            dueDate: "",
            reference: "WE " + weekEnding,
            account: g.account || "",
            tax: "Tax Exempt (0%)",
            consolidatedFrom: sfNameList.length > 1 ? sfNameList : void 0,
            lines: g.lines,
            subtotal: round2(g.subtotal)
          };
        }).filter((inv) => inv.lines.length > 0).sort((a, b) => b.subtotal - a.subtotal);
        const total = round2(invoices.reduce((s, i) => s + i.subtotal, 0));
        const hours = round2((res.records || []).reduce((s, r) => s + (r.ASYMBL_Time__Regular_Hours__c || 0) + (r.ASYMBL_Time__Overtime_Hours__c || 0) + (r.ASYMBL_Time__Double_Time_Hours__c || 0), 0));
        const emps = {};
        invoices.forEach((i) => i.lines.forEach((l) => emps[l[0].replace(/ (RT|OT|DT) .*/, "")] = true));
        const entities = [...new Set(invoices.map((i) => i.entity))];
        const wantDebug = url.searchParams.get("debug") === "1";
        const debugBlock = wantDebug ? {
          recordsPulledFromSF: dbg.totalPulled,
          recordsKept: dbg.kept,
          droppedHouse: dbg.droppedHouse,
          droppedNoClient: dbg.droppedNoClient,
          droppedUnknownEntity: dbg.droppedUnknownEntity,
          recordsWithZeroHours: dbg.droppedZeroHours,
          distinctCandidatesSeen: Object.keys(dbg.distinctCandidates).length,
          rawHoursAllPulled: round2(dbg.rawRegHours + dbg.rawOtHours + dbg.rawDtHours),
          rawRegHours: round2(dbg.rawRegHours),
          rawOtHours: round2(dbg.rawOtHours),
          rawDtHours: round2(dbg.rawDtHours),
          recordsPerEntity: dbg.entityCounts,
          entityFromSF: dbg.entityFromSF,
          entityDerived: dbg.entityDerived,
          entityUnresolved: dbg.entityUnresolved,
          unresolvedClients: dbg.unresolvedClients,
          queryWeekEnding: weekEnding
        } : void 0;
        return json({
          ok: true,
          summary: {
            weekEnding: fmtDate(weekEnding),
            weekEndingRaw: weekEnding,
            batchDate: fmtDate((/* @__PURE__ */ new Date()).toISOString().slice(0, 10)),
            invoices: invoices.length,
            employees: Object.keys(emps).length,
            entities,
            total,
            hours,
            entityFromSF: dbg.entityFromSF,
            entityDerived: dbg.entityDerived,
            entityUnresolved: dbg.entityUnresolved
          },
          debug: debugBlock,
          invoices
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-update-stage" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const applicantId = String(body.applicantId || "");
      const stageId = String(body.stageId || "");
      if (!/^a03[A-Za-z0-9]{12,15}$/.test(applicantId)) return json({ error: "invalid applicant id" }, 400, origin);
      if (!/^a07[A-Za-z0-9]{12,15}$/.test(stageId)) return json({ error: "invalid stage id" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const r = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/bpats__ATS_Applicant__c/" + applicantId, {
          method: "PATCH",
          headers: { "Authorization": "Bearer " + tok.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ "bpats__Stage__c": stageId })
        });
        if (r.status === 204) {
          console.log("STAGE-MOVE by " + (who.email || who.user || "?") + ": applicant " + applicantId + " -> stage " + stageId);
          return json({ ok: true, applicantId, stageId }, 200, origin);
        }
        const data = await r.json().catch(() => ({}));
        const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
        return json({ error: "Update failed: " + String(msg).slice(0, 250) }, 502, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-command") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        let buMap = function(data, idx) {
          const out = {};
          if (!data) return out;
          const groupings = data.groupingsDown && data.groupingsDown.groupings || [];
          const fact = data.factMap || {};
          groupings.forEach((g) => {
            const f = fact[g.key + "!T"];
            const a = f && f.aggregates ? f.aggregates : [];
            out[g.label] = a[idx] ? a[idx].value : null;
          });
          return out;
        }, grandOf = function(data, idx) {
          const fact = data && data.factMap ? data.factMap : {};
          const gk = fact["T!T"] ? "T!T" : fact["T"] ? "T" : null;
          const a = gk && fact[gk].aggregates ? fact[gk].aggregates : [];
          return a[idx] ? a[idx].value : null;
        };
        __name(buMap, "buMap");
        __name(grandOf, "grandOf");
        const tok = await getSalesforceToken(env);
        async function runReport(id) {
          const r = await fetch(
            tok.instance_url + "/services/data/v60.0/analytics/reports/" + id + "?includeDetails=false",
            { headers: { "Authorization": "Bearer " + tok.access_token } }
          );
          if (!r.ok) return null;
          return await r.json();
        }
        __name(runReport, "runReport");
        const fillR = await runReport("00OV500000486M5MAI");
        const hcR = await runReport("00OV5000003FBELMA4");
        const startR = await runReport("00OV5000003JQoHMAW");
        const termR = await runReport("00OV5000003FosQMAS");
        const openings = buMap(fillR, 0);
        const filled = buMap(fillR, 1);
        const ratio = buMap(fillR, 2);
        const hc = buMap(hcR, 1);
        const starts = buMap(startR, 1);
        const terms = buMap(termR, 1);
        const buSet = {};
        [openings, hc, starts, terms].forEach((m) => Object.keys(m).forEach((k) => {
          if (k && k !== "-") buSet[k] = true;
        }));
        const units = Object.keys(buSet).map((bu) => ({
          bu,
          headcount: hc[bu] || 0,
          openings: openings[bu] || 0,
          filled: filled[bu] || 0,
          fillRatio: ratio[bu] != null ? ratio[bu] : openings[bu] ? Math.round((filled[bu] || 0) / openings[bu] * 1e3) / 10 : 0,
          starts: starts[bu] || 0,
          terms: terms[bu] || 0
        })).sort((a, b) => b.headcount - a.headcount);
        const totals = {
          headcount: grandOf(hcR, 1) || units.reduce((s, u) => s + u.headcount, 0),
          openings: grandOf(fillR, 0) || 0,
          filled: grandOf(fillR, 1) || 0,
          fillRatio: grandOf(fillR, 2) || 0,
          starts: grandOf(startR, 1) || units.reduce((s, u) => s + u.starts, 0),
          terms: grandOf(termR, 1) || units.reduce((s, u) => s + u.terms, 0),
          hcGoal: 500
        };
        totals.net = (totals.starts || 0) - (totals.terms || 0);
        return json({ ok: true, totals, units }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-report-summary") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const reportId = (url.searchParams.get("id") || "").replace(/[^a-zA-Z0-9]/g, "");
      if (!reportId) return json({ error: "report id required" }, 400, origin);
      try {
        const tok = await getSalesforceToken(env);
        const r = await fetch(
          tok.instance_url + "/services/data/v60.0/analytics/reports/" + reportId + "?includeDetails=false",
          { headers: { "Authorization": "Bearer " + tok.access_token } }
        );
        const data = await r.json();
        if (!r.ok) {
          const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
          return json({ error: "Report run failed: " + String(msg).slice(0, 200) }, 502, origin);
        }
        const meta = data.reportMetadata || {};
        const aggs = meta.aggregates || [];
        let primaryIdx;
        const aggParam = url.searchParams.get("agg");
        if (aggParam !== null && aggParam !== void 0 && aggParam !== "" && !isNaN(parseInt(aggParam, 10))) {
          primaryIdx = parseInt(aggParam, 10);
        } else {
          primaryIdx = aggs.findIndex((a) => /RowCount/i.test(a));
          if (primaryIdx === -1) primaryIdx = 0;
        }
        const fact = data.factMap || {};
        const grandKey = fact["T!T"] ? "T!T" : fact["T"] ? "T" : Object.keys(fact).find((k) => /^T/.test(k));
        const grand = grandKey && fact[grandKey] && fact[grandKey].aggregates ? fact[grandKey].aggregates : [];
        const grandTotal = grand[primaryIdx] ? grand[primaryIdx].value : grand[0] ? grand[0].value : null;
        const grandLabel = grand[primaryIdx] ? grand[primaryIdx].label : grand[0] ? grand[0].label : null;
        const grandAll = grand.map((a) => ({ value: a.value, label: a.label }));
        const groupings = data.groupingsDown && data.groupingsDown.groupings || [];
        const rows = groupings.slice(0, 30).map((g) => {
          const f = fact[g.key + "!T"];
          const a = f && f.aggregates ? f.aggregates : [];
          return {
            label: g.label,
            value: a[primaryIdx] ? a[primaryIdx].value : a[0] ? a[0].value : null,
            all: a.map((x) => ({ value: x.value, label: x.label }))
          };
        });
        return json({
          ok: true,
          reportId,
          reportName: data.attributes && data.attributes.reportName,
          format: meta.reportFormat,
          grandTotal,
          grandLabel,
          grandAll,
          aggregateLabels: aggs,
          rows
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-by-bu") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const metric = url.searchParams.get("metric") || "pipeline";
      let soql;
      if (metric === "wins") {
        soql = "SELECT Account.Subdivision__c bu, SUM(Amount) total, COUNT(Id) n FROM Opportunity WHERE IsWon = true AND Account.Subdivision__c != null GROUP BY Account.Subdivision__c ORDER BY SUM(Amount) DESC";
      } else if (metric === "accounts") {
        soql = "SELECT Subdivision__c bu, COUNT(Id) n FROM Account WHERE Subdivision__c != null GROUP BY Subdivision__c ORDER BY COUNT(Id) DESC";
      } else {
        soql = "SELECT Account.Subdivision__c bu, SUM(Amount) total, COUNT(Id) n FROM Opportunity WHERE IsClosed = false AND Account.Subdivision__c != null GROUP BY Account.Subdivision__c ORDER BY SUM(Amount) DESC";
      }
      try {
        const res = await runSalesforceQuery(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const rows = (res.records || []).map((r) => ({
          bu: r.bu || "(none)",
          total: r.total || 0,
          count: r.n || 0
        }));
        return json({ ok: true, metric, rows }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-describe") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const obj = url.searchParams.get("object") || "";
        const res = await describeSalesforce(env, obj);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        if (!obj && url.searchParams.get("q")) {
          const q = url.searchParams.get("q").toLowerCase();
          res.objects = (res.objects || []).filter((o) => o.name.toLowerCase().includes(q) || (o.label || "").toLowerCase().includes(q));
        }
        if (obj && url.searchParams.get("field")) {
          const fq = url.searchParams.get("field").toLowerCase();
          res.fields = (res.fields || []).filter((f) => f.name.toLowerCase().includes(fq) || (f.label || "").toLowerCase().includes(fq));
        }
        return json(res, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-query") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let soql = url.searchParams.get("soql");
      if (!soql && request.method === "POST") {
        try {
          const b = await request.json();
          soql = b.soql;
        } catch (e) {
        }
      }
      if (!soql) return json({ error: "soql required" }, 400, origin);
      try {
        const res = await runSalesforceQuery(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        return json({ ok: true, totalSize: res.totalSize, returned: res.returned, records: res.records }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-wins") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const soql = "SELECT Name, Amount, CloseDate, Account.Name, Owner.Name FROM Opportunity WHERE IsWon = true AND CloseDate = LAST_N_DAYS:30 ORDER BY CloseDate DESC LIMIT 15";
        const res = await runSalesforceQuery(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const wins = (res.records || []).map((r) => ({
          name: r.Name,
          amount: r.Amount || 0,
          closeDate: r.CloseDate,
          account: r.Account && r.Account.Name ? r.Account.Name : "",
          owner: r.Owner && r.Owner.Name ? r.Owner.Name : ""
        }));
        return json({ ok: true, wins }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-closing") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const soql = "SELECT Name, Amount, CloseDate, StageName, Account.Name, Owner.Name FROM Opportunity WHERE IsClosed = false AND CloseDate >= TODAY AND CloseDate <= NEXT_N_DAYS:30 ORDER BY CloseDate ASC LIMIT 15";
        const res = await runSalesforceQuery(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const deals = (res.records || []).map((r) => ({
          name: r.Name,
          amount: r.Amount || 0,
          closeDate: r.CloseDate,
          stage: r.StageName || "",
          account: r.Account && r.Account.Name ? r.Account.Name : "",
          owner: r.Owner && r.Owner.Name ? r.Owner.Name : ""
        }));
        return json({ ok: true, deals }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-top-customers") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const soql = "SELECT Account.Name acct, SUM(Amount) total, COUNT(Id) deals FROM Opportunity WHERE IsWon = true AND Account.Name != null GROUP BY Account.Name ORDER BY SUM(Amount) DESC LIMIT 10";
        const res = await runSalesforceQuery(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const customers = (res.records || []).map((r) => ({
          account: r.acct || "",
          total: r.total || 0,
          deals: r.deals || 0
        }));
        return json({ ok: true, customers }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/sf-dashboard") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const dashId = (url.searchParams.get("id") || "01ZV5000001IOuXMAW").replace(/[^a-zA-Z0-9]/g, "");
      try {
        const tok = await getSalesforceToken(env);
        const r = await fetch(
          tok.instance_url + "/services/data/v60.0/analytics/dashboards/" + dashId + "/describe",
          { headers: { "Authorization": "Bearer " + tok.access_token } }
        );
        const data = await r.json();
        if (!r.ok) {
          const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
          return json({ error: "Dashboard describe failed: " + String(msg).slice(0, 300) }, 502, origin);
        }
        const comps = (data.components || []).map((c) => ({
          id: c.id,
          reportId: c.reportId || c.properties && c.properties.reportId || null,
          header: c.header || c.properties && c.properties.header || "",
          title: c.title || c.properties && c.properties.title || "",
          type: c.componentType || c.properties && c.properties.componentType || ""
        }));
        const ids = [...new Set(comps.map((c) => c.reportId).filter(Boolean))];
        let names = {};
        if (ids.length) {
          const inList = ids.map((i) => "'" + i + "'").join(",");
          const res = await runSalesforceQuery(env, "SELECT Id, Name FROM Report WHERE Id IN (" + inList + ")");
          if (res.ok) (res.records || []).forEach((rec) => {
            names[rec.Id] = rec.Name;
          });
        }
        comps.forEach((c) => {
          if (c.reportId && names[c.reportId]) c.reportName = names[c.reportId];
        });
        return json({ ok: true, dashboardId: dashId, dashboardName: data.name || "", componentCount: comps.length, components: comps }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/headcount-wow") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const reportId = (url.searchParams.get("id") || "00OV5000003Fz6IMAS").replace(/[^a-zA-Z0-9]/g, "");
      try {
        const tok = await getSalesforceToken(env);
        const r = await fetch(
          tok.instance_url + "/services/data/v60.0/analytics/reports/" + reportId + "?includeDetails=false",
          { headers: { "Authorization": "Bearer " + tok.access_token } }
        );
        const data = await r.json();
        if (!r.ok) {
          const msg = Array.isArray(data) && data[0] ? data[0].message || JSON.stringify(data[0]) : JSON.stringify(data);
          return json({ error: "Report run failed: " + String(msg).slice(0, 300) }, 502, origin);
        }
        const aggs = data.reportMetadata && data.reportMetadata.aggregates || [];
        let hoursIdx = aggs.findIndex((a) => /Total_Hours_Logged/i.test(a));
        let countIdx = aggs.findIndex((a) => /RowCount/i.test(a));
        if (hoursIdx === -1) hoursIdx = 0;
        if (countIdx === -1) countIdx = aggs.length - 1;
        const groupings = data.groupingsDown && data.groupingsDown.groupings || [];
        const factMap = data.factMap || {};
        const weeks = groupings.map((g) => {
          const f = factMap[g.key + "!T"];
          const a = f && f.aggregates ? f.aggregates : [];
          return {
            label: g.label,
            date: g.value,
            headcount: a[countIdx] ? a[countIdx].value : null,
            hours: a[hoursIdx] ? a[hoursIdx].value : null
          };
        });
        return json({ ok: true, reportId, reportName: data.attributes && data.attributes.reportName, weeks }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/hc-snapshot") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const projId = (url.searchParams.get("proj") || "00OV5000004WqCTMA0").replace(/[^a-zA-Z0-9]/g, "");
      const actualId = (url.searchParams.get("actual") || "00OV5000003HIoPMAW").replace(/[^a-zA-Z0-9]/g, "");
      try {
        let idxOf = function(data) {
          const aggs = data.reportMetadata && data.reportMetadata.aggregates || [];
          let countIdx = aggs.findIndex(function(a) {
            return /RowCount/i.test(a);
          });
          let hoursIdx = aggs.findIndex(function(a) {
            return /Hours/i.test(a);
          });
          if (countIdx === -1) countIdx = aggs.length ? aggs.length - 1 : 0;
          return { countIdx, hoursIdx };
        }, grand = function(data, idx) {
          const fm = data.factMap || {};
          const key = fm["T!T"] ? "T!T" : fm["T"] ? "T" : null;
          const a = key && fm[key].aggregates ? fm[key].aggregates : [];
          return idx != null && idx >= 0 && a[idx] ? a[idx].value : null;
        }, byBU = function(data, idx) {
          const out = {};
          const groupings = data.groupingsDown && data.groupingsDown.groupings || [];
          const fm = data.factMap || {};
          groupings.forEach(function(g) {
            const f = fm[g.key + "!T"];
            const a = f && f.aggregates ? f.aggregates : [];
            if (g.label && g.label !== "-") out[g.label] = idx >= 0 && a[idx] ? a[idx].value : 0;
          });
          return out;
        }, leafCounts = function(data, idx) {
          const fm = data.factMap || {};
          const out = {};
          (/* @__PURE__ */ __name((function walk(groupings) {
            (groupings || []).forEach(function(g) {
              if (g.groupings && g.groupings.length) {
                walk(g.groupings);
              } else {
                const f = fm[g.key + "!T"];
                const a = f && f.aggregates ? f.aggregates : [];
                const v = idx >= 0 && a[idx] ? a[idx].value || 0 : 0;
                if (g.label && g.label !== "-") out[g.label] = (out[g.label] || 0) + v;
              }
            });
          }), "walk"))(data.groupingsDown && data.groupingsDown.groupings || []);
          return out;
        };
        __name(idxOf, "idxOf");
        __name(grand, "grand");
        __name(byBU, "byBU");
        __name(leafCounts, "leafCounts");
        const tok = await getSalesforceToken(env);
        async function runReport(id) {
          const r = await fetch(
            tok.instance_url + "/services/data/v60.0/analytics/reports/" + id + "?includeDetails=false",
            { headers: { "Authorization": "Bearer " + tok.access_token } }
          );
          const d = await r.json();
          if (!r.ok) {
            const msg = Array.isArray(d) && d[0] ? d[0].message || JSON.stringify(d[0]) : JSON.stringify(d);
            throw new Error("Report " + id + " failed: " + String(msg).slice(0, 200));
          }
          return d;
        }
        __name(runReport, "runReport");
        const projData = await runReport(projId);
        const actData = await runReport(actualId);
        const pIdx = idxOf(projData);
        const aIdx = idxOf(actData);
        const projectedTotal = grand(projData, pIdx.countIdx) || 0;
        const actualTotal = grand(actData, aIdx.countIdx) || 0;
        const actualHours = aIdx.hoursIdx >= 0 ? grand(actData, aIdx.hoursIdx) || 0 : null;
        const projByBU = byBU(projData, pIdx.countIdx);
        const actByBU = byBU(actData, aIdx.countIdx);
        const buSet = {};
        Object.keys(projByBU).forEach(function(k) {
          buSet[k] = true;
        });
        Object.keys(actByBU).forEach(function(k) {
          buSet[k] = true;
        });
        const units = Object.keys(buSet).map(function(bu) {
          return { bu, lastWeekActual: actByBU[bu] || 0, thisWeekProjected: projByBU[bu] || 0, wow: (projByBU[bu] || 0) - (actByBU[bu] || 0) };
        }).sort(function(a, b) {
          return b.thisWeekProjected - a.thisWeekProjected;
        });
        const projCli = leafCounts(projData, pIdx.countIdx);
        const actCli = leafCounts(actData, aIdx.countIdx);
        const cliSet = {};
        Object.keys(projCli).forEach(function(k) {
          cliSet[k] = true;
        });
        Object.keys(actCli).forEach(function(k) {
          cliSet[k] = true;
        });
        const clients = Object.keys(cliSet).map(function(acct) {
          return { account: acct, lastWeek: actCli[acct] || 0, thisWeek: projCli[acct] || 0, delta: (projCli[acct] || 0) - (actCli[acct] || 0) };
        }).sort(function(a, b) {
          return (b.lastWeek || b.thisWeek) - (a.lastWeek || a.thisWeek);
        }).slice(0, 25);
        const wow = projectedTotal - actualTotal;
        const wowPct = actualTotal ? wow / actualTotal : null;
        return json({
          ok: true,
          reportNames: {
            projection: projData.attributes && projData.attributes.reportName,
            actual: actData.attributes && actData.attributes.reportName
          },
          projectedTotal,
          actualTotal,
          actualHours,
          wow,
          wowPct,
          units,
          byAM: clients
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/hc-clients") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const projId = (url.searchParams.get("proj") || "00OV5000004WqCTMA0").replace(/[^a-zA-Z0-9]/g, "");
      const actualId = (url.searchParams.get("actual") || "00OV5000003HIoPMAW").replace(/[^a-zA-Z0-9]/g, "");
      try {
        let findClientCol = function(data) {
          const cols = data.reportMetadata && data.reportMetadata.detailColumns || [];
          const info = data.reportExtendedMetadata && data.reportExtendedMetadata.detailColumnInfo || {};
          function labelOf(api) {
            return info[api] && info[api].label ? String(info[api].label) : String(api);
          }
          __name(labelOf, "labelOf");
          let idx = cols.indexOf("bpats__Account_Name__c");
          if (idx === -1) idx = cols.findIndex(function(c) {
            return /^account name$/i.test(labelOf(c));
          });
          if (idx === -1) idx = cols.findIndex(function(c) {
            return /client/i.test(labelOf(c)) || /client/i.test(String(c));
          });
          if (idx === -1) idx = cols.findIndex(function(c) {
            return /\baccount\b/i.test(labelOf(c)) && !/manager|owner|exec|\brep\b|recruit/i.test(labelOf(c));
          });
          return { idx, cols, labelOf };
        }, clientCounts = function(data) {
          const f = findClientCol(data);
          if (f.idx === -1) {
            return { idx: -1, counts: {}, total: 0, columns: f.cols.map(function(c) {
              return { api: c, label: f.labelOf(c) };
            }) };
          }
          const fm = data.factMap || {};
          const counts = {};
          let total = 0;
          Object.keys(fm).forEach(function(k) {
            const rows = fm[k] && fm[k].rows ? fm[k].rows : [];
            rows.forEach(function(row) {
              const cells = row.dataCells || [];
              const cell = cells[f.idx];
              const name = cell ? cell.label != null ? cell.label : cell.value : null;
              if (name) {
                counts[name] = (counts[name] || 0) + 1;
                total++;
              }
            });
          });
          return { idx: f.idx, counts, total, columnUsed: f.labelOf(f.cols[f.idx]) };
        };
        __name(findClientCol, "findClientCol");
        __name(clientCounts, "clientCounts");
        const tok = await getSalesforceToken(env);
        async function runDetail(id) {
          const r = await fetch(
            tok.instance_url + "/services/data/v60.0/analytics/reports/" + id + "?includeDetails=true",
            { headers: { "Authorization": "Bearer " + tok.access_token } }
          );
          const d = await r.json();
          if (!r.ok) {
            const msg = Array.isArray(d) && d[0] ? d[0].message || JSON.stringify(d[0]) : JSON.stringify(d);
            throw new Error("Report " + id + " failed: " + String(msg).slice(0, 200));
          }
          return d;
        }
        __name(runDetail, "runDetail");
        const projData = await runDetail(projId);
        const actData = await runDetail(actualId);
        const proj = clientCounts(projData);
        const act = clientCounts(actData);
        if (proj.idx === -1 || act.idx === -1) {
          return json({
            ok: false,
            reason: "client column not auto-detected",
            projectionColumns: proj.columns || null,
            actualColumns: act.columns || null
          }, 200, origin);
        }
        const set = {};
        Object.keys(proj.counts).forEach(function(k) {
          set[k] = true;
        });
        Object.keys(act.counts).forEach(function(k) {
          set[k] = true;
        });
        const clients = Object.keys(set).map(function(acct) {
          return { account: acct, lastWeek: act.counts[acct] || 0, thisWeek: proj.counts[acct] || 0, delta: (proj.counts[acct] || 0) - (act.counts[acct] || 0) };
        }).sort(function(a, b) {
          return (b.lastWeek || b.thisWeek) - (a.lastWeek || a.thisWeek);
        }).slice(0, 30);
        return json({
          ok: true,
          columnUsed: { projection: proj.columnUsed, actual: act.columnUsed },
          rowTotals: { projection: proj.total, actual: act.total },
          clients
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/pipeline-snapshot") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const snap = await getPipelineSnapshot(env);
        const topStages = (snap.stages || []).slice().sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 4).map((s) => ({ stage: s.stage, count: s.count, amount: s.amount }));
        return json({
          ok: true,
          totalOpen: snap.total || 0,
          openCount: snap.count || 0,
          topStages,
          missingAmount: snap.missingAmount || 0
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/calendar-request" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
      }
      const COORD = "modeesh@sparkcompanies.com";
      const subject = String(body.subject || "").slice(0, 200).trim();
      const startISO = String(body.start || "").slice(0, 40);
      const endISO = String(body.end || "").slice(0, 40);
      const notes = String(body.notes || "").slice(0, 1e3);
      if (!subject || !startISO || !endISO) {
        return json({ error: "subject, start, and end are required" }, 400, origin);
      }
      try {
        const token = await getGraphToken(env);
        const uResp = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(COORD) + "?$select=id",
          { headers: { "Authorization": "Bearer " + token } }
        );
        if (!uResp.ok) return json({ error: "Coordinator lookup failed" }, 502, origin);
        const coord = await uResp.json();
        const ev = {
          subject: "[Onboarding] " + subject,
          body: { contentType: "text", content: "Onboarding appointment requested via Spark HQ.\n\nRequested by: " + (who.email || "a Spark HQ user") + "\n\nDetails:\n" + (notes || "(none provided)") },
          start: { dateTime: startISO, timeZone: "Eastern Standard Time" },
          end: { dateTime: endISO, timeZone: "Eastern Standard Time" },
          isReminderOn: true,
          // mark as tentative-ish: she is the attendee and must respond
          responseRequested: true,
          attendees: [
            { emailAddress: { address: COORD, name: "Onboarding" }, type: "required" },
            who.email ? { emailAddress: { address: who.email }, type: "optional" } : null
          ].filter(Boolean)
        };
        const cResp = await fetch("https://graph.microsoft.com/v1.0/users/" + coord.id + "/events", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(ev)
        });
        const cData = await cResp.json();
        if (!cResp.ok) {
          const msg = cData && cData.error && cData.error.message ? cData.error.message : cResp.status;
          return json({ error: "Could not create request: " + msg }, 502, origin);
        }
        return json({ ok: true, id: cData.id, webLink: cData.webLink || "" }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/calendar-list") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const token = await getGraphToken(env);
        const mailbox = url.searchParams.get("mailbox") || who.email;
        const uResp = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(mailbox) + "?$select=id,displayName,mail",
          { headers: { "Authorization": "Bearer " + token } }
        );
        if (!uResp.ok) {
          const t = await uResp.text();
          return json({ error: "Mailbox lookup failed: " + uResp.status + " " + t.slice(0, 160) }, 502, origin);
        }
        const me = await uResp.json();
        const cResp = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + me.id + "/calendars?$select=id,name,owner,canEdit,canShare&$top=100",
          { headers: { "Authorization": "Bearer " + token } }
        );
        if (!cResp.ok) {
          const t = await cResp.text();
          return json({ error: "Calendar list failed: " + cResp.status + " " + t.slice(0, 200) }, 502, origin);
        }
        const data = await cResp.json();
        const calendars = (data.value || []).map((c) => ({
          id: c.id,
          name: c.name,
          owner: c.owner && c.owner.address ? c.owner.address : "",
          canEdit: !!c.canEdit
        }));
        return json({ ok: true, mailbox: me.mail || mailbox, calendars }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/calendar-discover") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Admins only" }, 403, origin);
      try {
        const token = await getGraphToken(env);
        const q = (url.searchParams.get("q") || "sterling").toLowerCase();
        const H = { "Authorization": "Bearer " + token };
        const results = { query: q, groups: [], users: [], sharedMailboxes: [] };
        try {
          const gResp = await fetch(
            "https://graph.microsoft.com/v1.0/groups?$select=id,displayName,mail,groupTypes,mailEnabled,resourceProvisioningOptions&$top=100",
            { headers: H }
          );
          if (gResp.ok) {
            const gData = await gResp.json();
            (gData.value || []).forEach((g) => {
              const name = (g.displayName || "").toLowerCase();
              const mail = (g.mail || "").toLowerCase();
              if (name.includes(q) || mail.includes(q)) {
                const isUnified = (g.groupTypes || []).indexOf("Unified") !== -1;
                results.groups.push({
                  id: g.id,
                  name: g.displayName,
                  mail: g.mail,
                  type: isUnified ? "M365 Group (has calendar)" : g.mailEnabled ? "Mail-enabled / distribution (NO calendar)" : "Security group (NO calendar)",
                  hasCalendar: isUnified
                });
              }
            });
          }
        } catch (e) {
        }
        try {
          const uResp = await fetch(
            "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName&$top=100",
            { headers: H }
          );
          if (uResp.ok) {
            const uData = await uResp.json();
            (uData.value || []).forEach((u) => {
              const name = (u.displayName || "").toLowerCase();
              const mail = (u.mail || u.userPrincipalName || "").toLowerCase();
              if (name.includes(q) || mail.includes(q)) {
                results.users.push({ id: u.id, name: u.displayName, mail: u.mail || u.userPrincipalName });
              }
            });
          }
        } catch (e) {
        }
        for (const g of results.groups) {
          if (!g.hasCalendar) continue;
          try {
            const c = await fetch("https://graph.microsoft.com/v1.0/groups/" + g.id + "/calendar", { headers: H });
            g.calendarReadable = c.ok;
          } catch (e) {
            g.calendarReadable = false;
          }
        }
        for (const u of results.users) {
          try {
            const c = await fetch("https://graph.microsoft.com/v1.0/users/" + u.id + "/calendar", { headers: H });
            u.calendarReadable = c.ok;
          } catch (e) {
            u.calendarReadable = false;
          }
        }
        return json({ ok: true, results }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/calendar-events") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const token = await getGraphToken(env);
        let source = url.searchParams.get("source") || env.ONBOARDING_CAL || "user:modeesh@sparkcompanies.com";
        let basePath;
        if (source.indexOf("group:") === 0) {
          basePath = "https://graph.microsoft.com/v1.0/groups/" + encodeURIComponent(source.slice(6));
        } else if (source.indexOf("|cal:") !== -1) {
          const parts2 = source.split("|cal:");
          const who2 = parts2[0].indexOf("user:") === 0 ? parts2[0].slice(5) : parts2[0];
          basePath = "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(who2) + "/calendars/" + encodeURIComponent(parts2[1]);
        } else {
          const id = source.indexOf("user:") === 0 ? source.slice(5) : source;
          basePath = "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(id);
        }
        let from = url.searchParams.get("from");
        let to = url.searchParams.get("to");
        if (!from || !to) {
          const now = /* @__PURE__ */ new Date();
          const first = new Date(now.getFullYear(), now.getMonth(), 1);
          const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          from = first.toISOString();
          to = last.toISOString();
        }
        const qs = "startDateTime=" + encodeURIComponent(from) + "&endDateTime=" + encodeURIComponent(to) + "&$select=subject,start,end,location,isAllDay,organizer,webLink&$orderby=start/dateTime&$top=100";
        const evResp = await fetch(
          basePath + "/calendarView?" + qs,
          { headers: { "Authorization": "Bearer " + token, "Prefer": 'outlook.timezone="Eastern Standard Time"' } }
        );
        if (!evResp.ok) {
          const t = await evResp.text();
          return json({ error: "Calendar read failed: " + evResp.status + " " + t.slice(0, 200) }, 502, origin);
        }
        const data = await evResp.json();
        const ONBOARD_TERMS = ["onboarding", "tmx", "orientation", "new hire", "start date", "day 1", "day one", "i-9", "i9", "new employee"];
        let raw = data.value || [];
        if (url.searchParams.get("onlyOnboarding") === "1") {
          raw = raw.filter((e) => {
            const s = (e.subject || "").toLowerCase();
            return ONBOARD_TERMS.some((t) => s.indexOf(t) !== -1);
          });
        }
        const events = raw.map((e) => ({
          subject: e.subject || "(no subject)",
          start: e.start && e.start.dateTime ? e.start.dateTime : null,
          end: e.end && e.end.dateTime ? e.end.dateTime : null,
          allDay: !!e.isAllDay,
          location: e.location && e.location.displayName || "",
          webLink: e.webLink || ""
        }));
        return json({ ok: true, source, count: events.length, events }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/calendar-events-OLD") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const MAILBOX = "sterlingtmx@sparktalentinc.com";
        const token = await getGraphToken(env);
        let from = url.searchParams.get("from");
        let to = url.searchParams.get("to");
        if (!from || !to) {
          const now = /* @__PURE__ */ new Date();
          const first = new Date(now.getFullYear(), now.getMonth(), 1);
          const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          from = first.toISOString();
          to = last.toISOString();
        }
        const qs = "startDateTime=" + encodeURIComponent(from) + "&endDateTime=" + encodeURIComponent(to) + "&$select=subject,start,end,location,isAllDay,organizer,webLink&$orderby=start/dateTime&$top=100";
        const evResp = await fetch(
          "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(MAILBOX) + "/calendarView?" + qs,
          { headers: { "Authorization": "Bearer " + token, "Prefer": 'outlook.timezone="Eastern Standard Time"' } }
        );
        if (!evResp.ok) {
          const t = await evResp.text();
          return json({ error: "Calendar read failed: " + evResp.status + " " + t.slice(0, 200) }, 502, origin);
        }
        const data = await evResp.json();
        const events = (data.value || []).map((e) => ({
          subject: e.subject || "(no subject)",
          start: e.start && e.start.dateTime ? e.start.dateTime : null,
          end: e.end && e.end.dateTime ? e.end.dateTime : null,
          allDay: !!e.isAllDay,
          location: e.location && e.location.displayName || "",
          webLink: e.webLink || ""
        }));
        return json({ ok: true, mailbox: MAILBOX, count: events.length, events }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/permissions") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const auth = request.headers.get("Authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      try {
        const resp = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/my_permissions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token,
            "apikey": env.SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ p_email: who.email })
        });
        if (!resp.ok) {
          const t = await resp.text();
          return json({ error: "Permission lookup failed: " + resp.status + " " + t.slice(0, 140) }, 502, origin);
        }
        const perms = await resp.json();
        return json({ email: who.email, permissions: perms || {} }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/ai" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const allowed = await hasPermission(request, env, who.email, "jarvis");
      if (!allowed) return json({ error: "You don't have access to the assistant." }, 403, origin);
      if (!env.ANTHROPIC_API_KEY) return json({ error: "AI not configured" }, 503, origin);
      try {
        const body = await request.json();
        const messages = Array.isArray(body.messages) ? body.messages : null;
        if (!messages || !messages.length) return json({ error: "No messages" }, 400, origin);
        const trimmed = messages.slice(-10).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 4e3)
        }));
        let loc = { type: "approximate", city: "South Lyon", region: "Michigan", country: "US", timezone: "America/Detroit" };
        if (body.location && typeof body.location === "object") {
          loc = {
            type: "approximate",
            city: String(body.location.city || "").slice(0, 80) || void 0,
            region: String(body.location.region || "").slice(0, 80) || void 0,
            country: String(body.location.country || "US").slice(0, 4),
            timezone: String(body.location.timezone || "America/Detroit").slice(0, 60)
          };
        }
        let sysPrompt = body.system ? String(body.system).slice(0, 4e3) : "You are Jarvis, the helpful AI assistant inside Spark HQ, Spark Companies' internal hub. Be concise, friendly, and practical. You can search the web for current information (weather, news, lookups) when it helps.";
        sysPrompt += "\n\nSPARK VOICE: Write the way a sharp, busy operator talks. No emojis, ever. No decorative headers, no lines like Here is how we can work together, no checkmark or rocket icons, no rehearsed corporate filler. Plain, direct text and lead with the answer. If you cannot do something yet, say so in one short line and move on.";
        if (body.language && typeof body.language === "string" && body.language.trim()) {
          const lang = body.language.trim().slice(0, 40);
          sysPrompt += "\n\nIMPORTANT: Respond entirely in " + lang + ", regardless of the language the user writes in, unless they explicitly ask for a different language.";
        }
        const SF_AGENTS = ["jarvis", "ops", "sniper"];
        const sfCapable = SF_AGENTS.indexOf(body.agent) !== -1 && !!env.SF_CLIENT_ID;
        const opsQueryCapable = sfCapable;
        const alfredTools = body.agent === "alfred" && !!env.AZ_CLIENT_ID;
        if (body.agent === "ops" && env.SF_CLIENT_ID && !opsQueryCapable) {
          try {
            const snap = await getPipelineSnapshot(env);
            const lines = snap.stages.sort((a, b) => (b.amount || 0) - (a.amount || 0)).map((s) => "  - " + s.stage + ": " + s.count + " opps, $" + Math.round(s.amount || 0).toLocaleString());
            sysPrompt += "\n\nLIVE SALESFORCE PIPELINE (open opportunities, fetched just now):\n" + lines.join("\n") + "\n  TOTAL: " + snap.count + " open opps, $" + Math.round(snap.total).toLocaleString();
          } catch (e) {
            sysPrompt += "\n\n(The pipeline snapshot could not be pre-loaded this time: " + String(e.message || e).slice(0, 120) + ".)";
          }
        }
        if (opsQueryCapable) {
          sysPrompt += "\n\nLIVE QUERY ACCESS: You can run read-only SOQL against Spark's live Salesforce via the query_salesforce tool, and inspect schema via describe_salesforce. For ANY data need (pipeline, owners, accounts, close dates, contacts, stages, custom fields, counts, sums) WRITE A QUERY rather than saying you lack data or asking for an export. Keep queries LEAN: select only the fields you need, use COUNT()/SUM() and GROUP BY for aggregates instead of pulling raw rows, and add a small LIMIT. If unsure what fields/objects exist, call describe_salesforce first. Never ask the user to export a report \u2014 query it yourself and answer.";
        }
        if (body.agent === "sniper" && env.SF_CLIENT_ID) {
          sysPrompt += "\n\nSOURCING DATA: Candidates and applicants live on bpats__ATS_Applicant__c; jobs on bpats__Job__c; people and contacts under the bpats__ and ASYMBL_ namespaces. When asked to find or pull candidates, call query_salesforce directly with a SOQL query. Do not call describe_salesforce first, and do not write the call as a code block or explain what you would do; execute the tool. Confirmed fields on bpats__ATS_Applicant__c: bpats__Applicant_Name__c, bpats__Job__c, bpats__Stage__c, bpats__Applicant_Status__c, bpats__Days_in_Current_Stage__c, bpats__Recruited_By__r.Name. To match a role, traverse to the job with bpats__Job__r.Name (e.g. bpats__Job__r.Name LIKE '%CNC%'). Select only the fields you need and add a small LIMIT. If a query errors on a field name, call describe_salesforce once to fix it, then re-query. Never answer with a generic list of job boards.";
        }
        if (body.agent === "alfred" && env.AZ_CLIENT_ID) {
          sysPrompt += "\n\nLIVE CALENDAR ACCESS: You can read the signed-in user's own Microsoft 365 calendar with the get_my_calendar tool. It is always scoped to the current user and cannot read anyone else. When asked about schedule, availability, or planning a day or week, call get_my_calendar for the right window and answer from real events; never say you lack calendar access. You cannot send email or create events yet; if asked, say that is coming and offer to draft text they can paste.";
        }
        const chosenModel = body.model && typeof body.model === "string" ? body.model : "claude-sonnet-4-6";
        if (chosenModel.indexOf("bedrock:") === 0) {
          try {
            const bedrockId = chosenModel.slice("bedrock:".length);
            const reply = await invokeBedrock(env, bedrockId, sysPrompt, trimmed);
            return json({ reply: reply || "(no response)", model: chosenModel }, 200, origin);
          } catch (e) {
            return json({ error: String(e.message || e) }, 502, origin);
          }
        }
        const allowedClaude = ["claude-sonnet-4-6", "claude-opus-4-1", "claude-haiku-4-5"];
        const claudeModel = allowedClaude.indexOf(chosenModel) !== -1 ? chosenModel : "claude-sonnet-4-6";
        const tools = [
          { type: "web_search_20250305", name: "web_search", max_uses: 5, user_location: loc }
        ];
        const opsTools = sfCapable;
        if (alfredTools) {
          tools.push({ name: "get_my_calendar", description: "Read the signed-in user's own Microsoft 365 / Outlook calendar for a date range and return their events (subject, start, end, location, organizer). Always scoped to the current user; cannot read other people. Use for schedule, availability, and week or day planning.", input_schema: { type: "object", properties: { days: { type: "number", description: "How many days ahead from today to include (default 7, max 31)." } } } });
        }
        if (opsTools) {
          tools.push({
            name: "query_salesforce",
            description: `Run a read-only SOQL query against Spark's live Salesforce and get the matching records back. Use this to answer ANY question about opportunities, accounts, owners, contacts, or other objects. Compose standard SOQL (e.g. "SELECT Name, StageName, Amount, Owner.Name, Account.Name, CloseDate FROM Opportunity WHERE IsClosed = false ORDER BY Amount DESC"). A LIMIT is auto-applied if you omit one. Read-only: SELECT queries only.`,
            input_schema: { type: "object", properties: { soql: { type: "string", description: "A valid SOQL SELECT query." } }, required: ["soql"] }
          });
          tools.push({
            name: "describe_salesforce",
            description: 'Discover the Salesforce schema. Call with no object to list queryable objects; call with an object name (e.g. "Opportunity") to get its fields and relationship names. Use this when you are unsure what fields or objects exist before writing a query.',
            input_schema: { type: "object", properties: { object: { type: "string", description: "Optional object API name, e.g. 'Opportunity'. Omit to list all objects." } } }
          });
        }
        const convo = trimmed.slice();
        let finalText = "";
        let searched = false;
        let usedSF = false;
        let pendingDraft = null;
        if (alfredTools) {
          tools.push({ name: "find_person", description: "Look up a coworker's email address from the Microsoft 365 directory by name. Returns up to 5 matches with name and email. Use this before draft_email when you only have a person's name.", input_schema: { type: "object", properties: { name: { type: "string", description: "Full or partial name to search for." } }, required: ["name"] } });
          tools.push({ name: "draft_email", description: "Prepare an email for the user to review and send. This does NOT send anything; it returns a draft the user must confirm with a Send button. Resolve names to addresses with find_person first, then provide the recipient email, a subject, and the body.", input_schema: { type: "object", properties: { to: { type: "string", description: "Recipient email address." }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } });
        }
        const MAX_TURNS = opsTools || alfredTools ? 6 : 1;
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const payload2 = {
            model: claudeModel,
            max_tokens: 1024,
            system: sysPrompt,
            messages: convo,
            tools
          };
          const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
            body: JSON.stringify(payload2)
          });
          const data = await aiResp.json();
          if (!aiResp.ok) {
            return json({ error: "AI error: " + (data && data.error && data.error.message ? data.error.message : aiResp.status) }, 502, origin);
          }
          const blocks = Array.isArray(data.content) ? data.content : [];
          for (const b of blocks) {
            if (b && (b.type === "server_tool_use" || b.type === "web_search_tool_result")) searched = true;
          }
          const toolUses = blocks.filter((b) => b && b.type === "tool_use");
          const textPieces = blocks.filter((b) => b && b.type === "text").map((b) => b.text);
          if (data.stop_reason === "tool_use" && toolUses.length) {
            convo.push({ role: "assistant", content: blocks });
            const results = [];
            for (const tu of toolUses) {
              let out;
              if (tu.name === "query_salesforce") {
                usedSF = true;
                out = await runSalesforceQuery(env, tu.input && tu.input.soql);
              } else if (tu.name === "describe_salesforce") {
                usedSF = true;
                out = await describeSalesforce(env, tu.input && tu.input.object);
              } else {
                if (tu.name === "get_my_calendar") {
                  out = await getMyCalendar(env, who.email, tu.input && tu.input.days);
                } else if (tu.name === "find_person") {
                  out = await findPerson(env, tu.input && tu.input.name);
                } else if (tu.name === "draft_email") {
                  pendingDraft = { to: String(tu.input && tu.input.to || ""), subject: String(tu.input && tu.input.subject || ""), body: String(tu.input && tu.input.body || "") };
                  out = { ok: true, drafted: true, note: "Draft prepared and shown to the user for confirmation. Do NOT claim it was sent. Tell the user to review it and click Send.", draft: pendingDraft };
                } else {
                  out = { ok: false, error: "Unknown tool" };
                }
              }
              results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 1200) });
            }
            convo.push({ role: "user", content: results });
            continue;
          }
          finalText = textPieces.join("\n").trim();
          break;
        }
        if (!finalText) {
          try {
            convo.push({ role: "user", content: "Answer now using only the data already gathered above. List the candidate names and key details as plain text. Do not call any tools." });
            const finResp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: claudeModel, max_tokens: 1024, system: sysPrompt, messages: convo }) });
            const finData = await finResp.json();
            if (finResp.ok && Array.isArray(finData.content)) {
              finalText = finData.content.filter((b) => b && b.type === "text").map((b) => b.text).join("\n").trim();
            }
          } catch (e) {
          }
        }
        return json({ reply: finalText || "(no response)", draft: pendingDraft, searched, usedSalesforce: usedSF }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/salesforce/test") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Admins only" }, 403, origin);
      try {
        const tok = await getSalesforceToken(env);
        const idResp = await fetch(tok.instance_url + "/services/oauth2/userinfo", {
          headers: { "Authorization": "Bearer " + tok.access_token }
        });
        const id = idResp.ok ? await idResp.json() : null;
        return json({
          ok: true,
          instance_url: tok.instance_url,
          running_as: id ? { name: id.name, email: id.email, user_id: id.user_id } : "(userinfo unavailable)"
        }, 200, origin);
      } catch (e) {
        return json({ ok: false, error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/salesforce/pipeline") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const snap = await getPipelineSnapshot(env);
        return json({ ok: true, stages: snap.stages, total: snap.total, count: snap.count, accounts: snap.accounts || [], owners: snap.owners || [], missingAmount: snap.missingAmount }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/status") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const status = { salesforce: "down", m365: "down", zoominfo: "not_connected", ai: "down" };
      status.ai = env.ANTHROPIC_API_KEY ? "up" : "down";
      if (env.SF_CLIENT_ID) {
        try {
          await getSalesforceToken(env);
          status.salesforce = "up";
        } catch (e) {
          status.salesforce = "error";
        }
      } else {
        status.salesforce = "not_connected";
      }
      try {
        const t = await getGraphToken(env);
        status.m365 = t ? "up" : "down";
      } catch (e) {
        status.m365 = "error";
      }
      status.zoominfo = "not_connected";
      return json({ ok: true, status }, 200, origin);
    }
    if (url.pathname === "/alfred-send" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const allowed = await hasPermission(request, env, who.email, "jarvis");
      if (!allowed) return json({ error: "You don't have access to the assistant." }, 403, origin);
      if (!env.AZ_CLIENT_ID) return json({ error: "M365 not configured" }, 503, origin);
      let sbody = {};
      try {
        sbody = await request.json();
      } catch (e) {
      }
      const to = String(sbody.to || "").trim();
      const subject = String(sbody.subject || "").slice(0, 300);
      const content = String(sbody.body || "").slice(0, 2e4);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "Invalid recipient address" }, 400, origin);
      try {
        const token = await getGraphToken(env);
        const msg = { message: { subject, body: { contentType: "Text", content }, toRecipients: [{ emailAddress: { address: to } }] }, saveToSentItems: true };
        const r = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(who.email) + "/sendMail", { method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(msg) });
        if (r.status === 202) {
          console.log("ALFRED-SEND by " + who.email + " -> " + to);
          return json({ ok: true, sentAs: who.email, to }, 200, origin);
        }
        const t = await r.text();
        return json({ error: "Send failed: " + r.status + " " + t.slice(0, 160) }, 502, origin);
      } catch (e) {
        return json({ error: String(e.message || e).slice(0, 200) }, 502, origin);
      }
    }
    if (url.pathname === "/fin-dryrun") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      async function sbGet(path) {
        const r = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, { headers: { "Authorization": "Bearer " + token, "apikey": env.SUPABASE_PUBLISHABLE_KEY } });
        if (!r.ok) return null;
        return await r.json();
      }
      __name(sbGet, "sbGet");
      let weekEnding = (url.searchParams.get("weekEnding") || "").trim();
      try {
        let HOLD = function(msg) {
          const e = new Error(msg);
          e.__hold = true;
          return e;
        }, route = function(xero, p, workers, rule, staticPO) {
          if (p.splits || rule && rule.type === "two_entity") {
            if (!rule) throw HOLD("split client but no split rule defined");
            return splitRoute(xero, rule, workers, staticPO);
          }
          if (p.weekly_po) {
            if (!METHODS_PO) throw HOLD("weekly PO not provided for this week");
            return [{ entOv: null, acctOv: null, ref: METHODS_PO, subset: workers, rtOnly: false }];
          }
          return [{ entOv: null, acctOv: null, ref: staticPO || "WE " + weekUS, subset: workers, rtOnly: false }];
        }, splitRoute = function(xero, rule, workers, staticPO) {
          const names = Object.keys(workers);
          const t = rule.type;
          if (t === "named_list") {
            const out = [];
            const assigned = {};
            (rule.groups || []).forEach((grp) => {
              const set = {};
              (grp.workers || []).forEach((x) => {
                set[nz(x)] = true;
              });
              const sub = {};
              names.forEach((n) => {
                if (set[nz(n)]) {
                  sub[n] = workers[n];
                  assigned[n] = true;
                }
              });
              if (Object.keys(sub).length) out.push({ entOv: null, acctOv: null, ref: grp.po, subset: sub, rtOnly: !!grp.rt_only });
            });
            const rest = {};
            names.forEach((n) => {
              if (!assigned[n]) rest[n] = workers[n];
            });
            if (Object.keys(rest).length) out.push({ entOv: null, acctOv: null, ref: rule.default_po, subset: rest, rtOnly: false });
            return out;
          }
          if (t === "worker_po") {
            const mp = {};
            Object.keys(rule.map || {}).forEach((k) => {
              mp[nz(k)] = rule.map[k];
            });
            const buckets = {};
            names.forEach((n) => {
              const po = mp[nz(n)] || rule.default_po;
              if (!po) throw HOLD("worker '" + n + "' has no PO and no default");
              (buckets[po] = buckets[po] || {})[n] = workers[n];
            });
            return Object.keys(buckets).map((po) => ({ entOv: null, acctOv: null, ref: po, subset: buckets[po], rtOnly: false }));
          }
          if (t === "weekly_po") {
            if (!Object.keys(DROP.penske).length) throw HOLD("Penske weekly PO split not provided for this week");
            const buckets = {};
            names.forEach((n) => {
              const row = DROP.penske[nz(n)];
              if (!row) throw HOLD("Penske worker '" + n + "' not in this week's split");
              (buckets[row.po] = buckets[row.po] || {})[n] = workers[n];
            });
            return Object.keys(buckets).map((po) => ({ entOv: null, acctOv: null, ref: po, subset: buckets[po], rtOnly: false }));
          }
          if (t === "division") {
            if (!Object.keys(DROP.rhino).length) throw HOLD("Rhino division split not provided for this week");
            const buckets = {};
            names.forEach((n) => {
              const row = DROP.rhino[nz(n)];
              if (!row) throw HOLD("Rhino worker '" + n + "' not in this week's division split");
              (buckets[row.division] = buckets[row.division] || {})[n] = workers[n];
            });
            return Object.keys(buckets).map((d) => ({ entOv: null, acctOv: null, ref: "WE " + weekUS + " - " + d, subset: buckets[d], rtOnly: false }));
          }
          if (t === "roster") {
            if (!Object.keys(DROP.dfm).length) throw HOLD("DFM roster not provided for this week");
            const buckets = {};
            names.forEach((n) => {
              const row = DROP.dfm[nz(n)];
              if (!row) throw HOLD("DFM worker '" + n + "' not in this week's roster");
              const k = (row.job_number || "") + "|" + (row.site || "") + "|" + (row.role || "");
              (buckets[k] = buckets[k] || { meta: row, sub: {} }).sub[n] = workers[n];
            });
            return Object.keys(buckets).map((k) => {
              const b = buckets[k];
              const ref = ("WE " + weekUS + " - " + (b.meta.job_number || "") + " " + (b.meta.site || "")).trim() + (b.meta.role ? " - " + b.meta.role : "");
              return { entOv: null, acctOv: null, ref, subset: b.sub, rtOnly: false };
            });
          }
          if (t === "two_entity") {
            if (!Object.keys(DROP.paslin).length) throw HOLD("Paslin two-entity worker list not provided for this week");
            const accounts = rule.accounts || {};
            const buckets = {};
            names.forEach((n) => {
              const row = DROP.paslin[nz(n)];
              if (!row) throw HOLD("Paslin worker '" + n + "' not in this week's entity list");
              (buckets[row.entity] = buckets[row.entity] || {})[n] = workers[n];
            });
            return Object.keys(buckets).map((ent) => ({ entOv: ent, acctOv: accounts[ent] || null, ref: staticPO || "WE " + weekUS, subset: buckets[ent], rtOnly: false }));
          }
          throw HOLD("unknown split type '" + t + "'");
        };
        __name(HOLD, "HOLD");
        __name(route, "route");
        __name(splitRoute, "splitRoute");
        if (!weekEnding) {
          const latest = await runSalesforceQuery(env, "SELECT ASYMBL_Time__Pay_Period_End_Date__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c != null AND ASYMBL_Time__Pay_Period_End_Date__c <= TODAY ORDER BY ASYMBL_Time__Pay_Period_End_Date__c DESC LIMIT 1");
          if (latest.ok && latest.records && latest.records[0]) weekEnding = latest.records[0].ASYMBL_Time__Pay_Period_End_Date__c;
        }
        if (!weekEnding) return json({ error: "No pay-period data found" }, 404, origin);
        const mapRows = await sbGet("fin_client_map?select=sf_account_name,xero_contact,invoicing_entity");
        const ruleRows = await sbGet("fin_ot_dt_rules?select=sf_account_name,rate_mode,ot_multiplier,dt_multiplier");
        const profRows = await sbGet("fin_client_profile?select=*");
        if (!mapRows || !ruleRows || !profRows) return json({ error: "Could not load billing rules from Supabase (auth/secret issue)." }, 502, origin);
        const mapByAcct = {};
        mapRows.forEach((r) => {
          mapByAcct[r.sf_account_name] = r;
        });
        const ruleByAcct = {};
        ruleRows.forEach((r) => {
          ruleByAcct[r.sf_account_name] = r;
        });
        const profByContact = {};
        profRows.forEach((r) => {
          profByContact[r.xero_contact] = r;
        });
        const nz = /* @__PURE__ */ __name((s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase(), "nz");
        const m2 = /* @__PURE__ */ __name((x) => round2(x), "m2");
        const fmtDate = /* @__PURE__ */ __name((d) => {
          if (!d) return "";
          const p = String(d).split("-");
          if (p.length !== 3) return d;
          const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(p[1], 10) - 1];
          return p[1].padStart(2, "0") + "/" + p[2].padStart(2, "0") + "/" + p[0];
        }, "fmtDate");
        const addDays = /* @__PURE__ */ __name((iso, n) => {
          const d = /* @__PURE__ */ new Date(iso + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() + (parseInt(n, 10) || 0));
          return d.toISOString().slice(0, 10);
        }, "addDays");
        const weekUS = fmtDate(weekEnding);
        const weekDash = weekUS.split("/").join("-");
        const SPLIT_RULES = {
          "Clarios - Middletown DE": { type: "named_list", default_po: "4500651975", groups: [{ po: "4500651977", rt_only: true, workers: ["Kaelan Eberle", "William Nylander"] }] },
          "Autoliv North America": { type: "worker_po", default_po: "US00195700", map: { "Robert Hall": "US00195700", "Todd Fast": "US00198498" } },
          "The Paslin Company": { type: "two_entity", accounts: { "Spark Talent": "400.9", "Flex Workforce": "4000" } },
          "Penske": { type: "weekly_po" },
          "Rhino Tool House": { type: "division" },
          "DFM Solutions": { type: "roster" }
        };
        const DROP = { client_rates: {}, penske: {}, rhino: {}, dfm: {}, paslin: {}, holiday: {}, expenses: {}, client_total: {} };
        let METHODS_PO = "";
        const _intake = await sbService(env, "GET", "fin_weekly_intake?week_ending=eq." + encodeURIComponent(weekEnding) + "&select=kind,rows");
        const intakeRows = (_intake && _intake.ok && Array.isArray(_intake.data)) ? _intake.data : [];
        (intakeRows || []).forEach((ir) => {
          const rows = Array.isArray(ir.rows) ? ir.rows : [];
          if (ir.kind === "penske") rows.forEach((r) => {
            if (r.worker) DROP.penske[nz(r.worker)] = { po: String(r.po || "").trim() };
          });
          else if (ir.kind === "rhino") rows.forEach((r) => {
            if (r.worker) DROP.rhino[nz(r.worker)] = { division: String(r.division || "").trim() };
          });
          else if (ir.kind === "dfm") rows.forEach((r) => {
            if (r.worker) DROP.dfm[nz(r.worker)] = { job_number: String(r.job_number || ""), site: String(r.site || ""), role: String(r.role || "") };
          });
          else if (ir.kind === "paslin") rows.forEach((r) => {
            if (r.worker) DROP.paslin[nz(r.worker)] = { entity: String(r.entity || "").trim() };
          });
          else if (ir.kind === "fanuc_expenses") { DROP.fanuc_expenses = rows; }
          else if (ir.kind === "client_total") rows.forEach((r) => { if (r.contact) DROP.client_total[nz(r.contact)] = Number(r.total); });
          else if (ir.kind === "client_rates") rows.forEach((r) => {
            if (r.worker && r.contact) DROP.client_rates[nz(r.contact) + "|" + nz(r.worker)] = { ot_rate: r.ot_rate, dt_rate: r.dt_rate, reg_rate: r.reg_rate };
          });
          else if (ir.kind === "holiday") rows.forEach((r) => {
            if (r.worker && r.contact) DROP.holiday[nz(r.contact) + "|" + nz(r.worker)] = { holiday_hours: r.holiday_hours };
          });
          else if (ir.kind === "expenses") rows.forEach((r) => {
            if (r.worker && r.contact) {
              const k = nz(r.contact) + "|" + nz(r.worker);
              (DROP.expenses[k] = DROP.expenses[k] || []).push({ description: String(r.description || "Expense"), amount: r.amount });
            }
          });
          else if (ir.kind === "methods_po") {
            if (rows[0] && rows[0].po) METHODS_PO = String(rows[0].po).trim();
          }
        });
        const SHIFT_PREM = {};
        const exRows = await sbGet("fin_exception_params?key=eq.shift_premium&select=value");
        if (exRows && exRows[0] && exRows[0].value && typeof exRows[0].value === "object") {
          Object.keys(exRows[0].value).forEach((k) => {
            SHIFT_PREM[k] = Number(exRows[0].value[k]);
          });
        }
        const soql = "SELECT ASYMBL_Time__Regular_Hours__c, ASYMBL_Time__Overtime_Hours__c, ASYMBL_Time__Double_Time_Hours__c, ASYMBL_Time__Regular_Billable_Amount__c, ASYMBL_Time__Overtime_Billable_Amount__c, ASYMBL_Time__Double_Time_Billable_Amount__c, ASYMBL_Time__Bill_Rate__c, ASYMBL_Time__Overtime_Bill_Rate__c, ASYMBL_Time__Double_Time_Bill_Rate__c, ASYMBL_Time__Timesheet__r.ASYMBL_Time__Candidate_Name__c, ASYMBL_Time__Timesheet__r.Placement__r.Division__c, ASYMBL_Time__Timesheet__r.Placement__r.bpats__Bill_Rate__c, ASYMBL_Time__Timesheet__r.Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c FROM ASYMBL_Time__Time_Entry__c WHERE ASYMBL_Time__Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding;
        const res = await runSalesforceQueryAll(env, soql);
        if (!res.ok) return json({ error: res.error }, 502, origin);
        const agg = {};
        const unmapped = {};
        let skippedHouse = 0;
        for (const r of res.records || []) {
          const ts = r.ASYMBL_Time__Timesheet__r || {};
          const job = ts.Placement__r && ts.Placement__r.bpats__ATS_Job__r ? ts.Placement__r.bpats__ATS_Job__r : {};
          const sfAcct = job.bpats__Account_Name__c || "(no client)";
          const sfDivision = ts.Placement__r && ts.Placement__r.Division__c ? ts.Placement__r.Division__c : null;
          if (sfDivision === "House") {
            skippedHouse++;
            continue;
          }
          const rtH = r.ASYMBL_Time__Regular_Hours__c || 0;
          const otH = r.ASYMBL_Time__Overtime_Hours__c || 0;
          const dtH = r.ASYMBL_Time__Double_Time_Hours__c || 0;
          const asymblAmt = (r.ASYMBL_Time__Regular_Billable_Amount__c || 0) + (r.ASYMBL_Time__Overtime_Billable_Amount__c || 0) + (r.ASYMBL_Time__Double_Time_Billable_Amount__c || 0);
          const m = mapByAcct[sfAcct];
          if (!m) {
            if (!unmapped[sfAcct]) unmapped[sfAcct] = { sfAccount: sfAcct, hours: 0, asymblAmount: 0 };
            unmapped[sfAcct].hours += rtH + otH + dtH;
            unmapped[sfAcct].asymblAmount += asymblAmt;
            continue;
          }
          const xero = m.xero_contact || sfAcct;
          const entity = m.invoicing_entity || sfDivision || "Unresolved";
          const key = entity + "||" + xero;
          if (!agg[key]) agg[key] = { client: xero, entity, sfAccounts: {}, workers: {} };
          const g = agg[key];
          g.sfAccounts[sfAcct] = true;
          const cand = ts.ASYMBL_Time__Candidate_Name__c || "Unknown";
          if (!g.workers[cand]) g.workers[cand] = { reg: 0, ot: 0, dt: 0, br: null, otRate: null, dtRate: null, sf: sfAcct, asymblAmt: 0, regAmt: 0, otAmt: 0, dtAmt: 0 };
          const w = g.workers[cand];
          w.reg += rtH;
          w.ot += otH;
          w.dt += dtH;
          const __plRate = ts.Placement__r && ts.Placement__r.bpats__Bill_Rate__c != null ? ts.Placement__r.bpats__Bill_Rate__c : null;
          if (__plRate != null && __plRate > 0) {
            w.br = __plRate;
          } else if (w.br == null && r.ASYMBL_Time__Bill_Rate__c != null) {
            w.br = r.ASYMBL_Time__Bill_Rate__c;
          }
          if (r.ASYMBL_Time__Bill_Rate__c != null) w.teRate = r.ASYMBL_Time__Bill_Rate__c;
          w.otAmt += r.ASYMBL_Time__Overtime_Billable_Amount__c || 0;
          w.dtAmt += r.ASYMBL_Time__Double_Time_Billable_Amount__c || 0;
          w.regAmt += r.ASYMBL_Time__Regular_Billable_Amount__c || 0;
          if (r.ASYMBL_Time__Overtime_Bill_Rate__c != null) w.otRate = r.ASYMBL_Time__Overtime_Bill_Rate__c;
          if (r.ASYMBL_Time__Double_Time_Bill_Rate__c != null) w.dtRate = r.ASYMBL_Time__Double_Time_Bill_Rate__c;
          w.asymblAmt += asymblAmt;
        }
        const ready = [];
        const held = [];
        Object.keys(agg).forEach((key) => {
          const g = agg[key];
          const prof = profByContact[g.client];
          const workers = g.workers;
          const names = Object.keys(workers);
          if (!prof) {
            held.push({ client: g.client, entity: g.entity, reason: "no client profile \u2014 add one", employees: names.length, hours: m2(names.reduce((s, n) => s + workers[n].reg + workers[n].ot + workers[n].dt, 0)), asymblAmount: m2(names.reduce((s, n) => s + workers[n].asymblAmt, 0)) });
            return;
          }
          try {
            const hasOT = names.some((n) => workers[n].ot > 0);
            const hasDT = names.some((n) => workers[n].dt > 0);
            let setRates = false;
            names.forEach((n) => {
              const ru = ruleByAcct[workers[n].sf];
              const om = ru && ru.ot_multiplier != null ? ru.ot_multiplier : null;
              const dm = ru && ru.dt_multiplier != null ? ru.dt_multiplier : null;
              if (om == null || dm == null) setRates = true;
            });
            if (names.some((n) => workers[n].reg + workers[n].ot + workers[n].dt > 0 && (!workers[n].br || workers[n].br <= 0))) throw HOLD("contains a $0 bill rate");
            if (prof.review_flag) throw HOLD("review: " + prof.review_flag);
            const crKey = /* @__PURE__ */ __name((n) => DROP.client_rates[nz(g.client) + "|" + nz(n)], "crKey");
            if (false) {
              const need = names.filter((n) => workers[n].ot > 0 || workers[n].dt > 0);
              if (!need.every((n) => crKey(n))) throw HOLD("OT/DT is set-rates (client timesheet) \u2014 rate file missing/incomplete");
            }
            if (prof.uses_client_timesheet) {
              const need = names.filter((n) => workers[n].ot > 0 || workers[n].dt > 0);
              const _hasTotal = DROP.client_total[nz(g.client)] != null; const _hasRates = need.length > 0 && need.every((n) => crKey(n)); if (!_hasTotal && !_hasRates) throw HOLD("invoice must reconcile to the client timesheet \u2014 provide it");
            }
            if (prof.shift_premium && SHIFT_PREM[g.client] == null) throw HOLD("shift premium not configured");
            const net = prof.due_net_days != null ? prof.due_net_days : null;
            const acct = prof.account_code || "";
            const tax = prof.tax_type || "";
            const order = (prof.line_order || "").toString().trim().toLowerCase();
            const staticPO = prof.static_po && prof.static_po_value ? prof.static_po_value : "";
            const premium = SHIFT_PREM[g.client];
            const groups2 = route(g.client, prof, workers, SPLIT_RULES[g.client], staticPO);
            groups2.forEach((grp) => {
              const ent = grp.entOv || g.entity;
              const a = grp.acctOv || acct;
              if (!a || !String(a).trim()) throw HOLD("no revenue account code set \u2014 add it in Billing Rules \u2192 Client Profiles");
              const subNames = Object.keys(grp.subset).sort((x, y) => {
                const kx = order === "alpha_last" ? (x.split(" ").slice(-1)[0] || x).toLowerCase() : x.toLowerCase();
                const ky = order === "alpha_last" ? (y.split(" ").slice(-1)[0] || y).toLowerCase() : y.toLowerCase();
                return kx < ky ? -1 : kx > ky ? 1 : 0;
              });
              const lines = [];
              let recalc = 0, asymbl = 0;
              const flags = [];
              subNames.forEach((n) => {
                const w = grp.subset[n];
                asymbl += w.asymblAmt;
                if (!w.br || w.br <= 0) return;
                const ru = ruleByAcct[w.sf];
                const om = ru && ru.ot_multiplier != null ? ru.ot_multiplier : null;
                const dm = ru && ru.dt_multiplier != null ? ru.dt_multiplier : null;
                const cr = crKey(n);
                if (w.reg > 0) {
                  const unit = (cr && cr.reg_rate != null) ? m2(Number(cr.reg_rate)) : m2(w.br);
                  const amt = m2(w.reg * unit);
                  lines.push({ desc: n + " RT (" + weekDash + ")", hours: m2(w.reg), rate: unit, amount: amt });
                  recalc += amt;
                  if (w.teRate != null && Math.abs(m2(w.teRate) - unit) > 0.01) flags.push(n + " RT rate corrected: ASYMBL $" + m2(w.teRate) + " -> placement $" + unit);
                }
                if (!grp.rtOnly) {
                  let otUnit = null;
                  if (cr && cr.ot_rate != null) otUnit = m2(Number(cr.ot_rate));
                  else if (prof.use_sf_ot_rate && w.otRate != null && w.otRate > 0) otUnit = m2(w.otRate);
                  else if (om != null) otUnit = m2(w.br * om);
                  else if (prof.uses_client_timesheet && w.otRate != null && w.otRate > 0) otUnit = m2(w.otRate);
                  if (w.ot > 0) {
                    if (otUnit == null) throw HOLD("OT hours present but no OT rule (set ot_multiplier or set_rates) for " + w.sf);
                    const amt = m2(w.ot * otUnit);
                    lines.push({ desc: n + " OT (" + weekDash + ")", hours: m2(w.ot), rate: otUnit, amount: amt });
                    recalc += amt;
                    if (w.otRate != null && Math.abs(m2(w.otRate) - otUnit) > 0.01) flags.push(n + " OT rate corrected: ASYMBL $" + m2(w.otRate) + " -> $" + otUnit);
                  }
                  let dtUnit = null;
                  if (cr && cr.dt_rate != null) dtUnit = m2(Number(cr.dt_rate));
                  else if (prof.use_sf_ot_rate && w.dtRate != null && w.dtRate > 0) dtUnit = m2(w.dtRate);
                  else if (dm != null) dtUnit = m2(w.br * dm);
                  else if (prof.uses_client_timesheet && w.dtRate != null && w.dtRate > 0) dtUnit = m2(w.dtRate);
                  if (w.dt > 0) {
                    if (dtUnit == null) throw HOLD("DT hours present but no DT rule (set dt_multiplier or set_rates) for " + w.sf);
                    const amt = m2(w.dt * dtUnit);
                    lines.push({ desc: n + " DT (" + weekDash + ")", hours: m2(w.dt), rate: dtUnit, amount: amt });
                    recalc += amt;
                    if (w.dtRate != null && Math.abs(m2(w.dtRate) - dtUnit) > 0.01) flags.push(n + " DT rate corrected: ASYMBL $" + m2(w.dtRate) + " -> $" + dtUnit);
                  }
                }
                if (premium != null && w.reg > 0) {
                  const amt = m2(w.reg * premium);
                  lines.push({ desc: n + " Shift Premium (" + weekDash + ")", hours: m2(w.reg), rate: m2(premium), amount: amt });
                  recalc += amt;
                }
                const exps = DROP.expenses[nz(g.client) + "|" + nz(n)];
                if (exps) exps.forEach((ex) => {
                  const amt = m2(Number(ex.amount));
                  if (amt) {
                    lines.push({ desc: n + " \u2014 " + ex.description + " (" + weekDash + ")", hours: 1, rate: amt, amount: amt });
                    recalc += amt;
                  }
                });
              });
              if (!lines.length) return;
              if (prof.holiday_multiplier != null) flags.push("holiday-rate client: holiday lines wired once the pay-rate field is confirmed");
              if (prof.allows_expenses && !Object.keys(DROP.expenses).length) flags.push("expenses allowed (none fed this week)");
              const diff = m2(recalc - asymbl);
              if (Math.abs(diff) > 0.01) flags.push("recomputed vs ASYMBL differs by $" + diff);
              const ctgt = DROP.client_total[nz(g.client)];
              if (ctgt != null && ctgt === ctgt && Math.abs(m2(recalc) - m2(ctgt)) > 0.01) flags.push("client timesheet total $" + m2(ctgt) + " vs computed $" + m2(recalc) + " (off by $" + m2(recalc - ctgt) + ")");
              ready.push({ client: g.client, entity: ent, account: a, tax, reference: grp.ref, lineOrder: order || "", invDate: weekUS, dueDate: net != null ? fmtDate(addDays(weekEnding, net)) : "", dueDateISO: net != null ? addDays(weekEnding, net) : "", employees: subNames.length, lines, subtotal: m2(recalc), asymblSubtotal: m2(asymbl), flags });
            });
          } catch (e) {
            if (e && e.__hold) {
              held.push({ client: g.client, entity: g.entity, reason: e.message, employees: names.length, hours: m2(names.reduce((s, n) => s + workers[n].reg + workers[n].ot + workers[n].dt, 0)), asymblAmount: m2(names.reduce((s, n) => s + workers[n].asymblAmt, 0)) });
            } else {
              throw e;
            }
          }
        });
        Object.keys(unmapped).forEach((a) => {
          held.push({ client: a, entity: "\u2014", reason: "SF account not in client map (add it in Billing Rules)", employees: null, hours: m2(unmapped[a].hours), asymblAmount: m2(unmapped[a].asymblAmount) });
        });
        if (DROP.fanuc_expenses && DROP.fanuc_expenses.length) {
          const fx = ready.find((inv) => String(inv.client).toLowerCase() === "fanuc america corporation");
          if (fx) {
            const exLines = [];
            DROP.fanuc_expenses.forEach((e) => { const amt = m2(Number(e.amount)); if (amt) exLines.push({ desc: e.worker + " Expenses - " + e.invoiceNo, hours: 1, rate: amt, amount: amt }); });
            if (exLines.length) {
              const exSub = m2(exLines.reduce((s, l) => s + l.amount, 0));
              ready.push({ client: "Fanuc America Corporation", entity: fx.entity, account: "401", tax: fx.tax, reference: "Fanuc Expenses WE " + weekUS, lineOrder: "", invDate: weekUS, dueDate: fx.dueDate, dueDateISO: fx.dueDateISO || "", employees: new Set(DROP.fanuc_expenses.map((e) => e.worker)).size, lines: exLines, subtotal: exSub, asymblSubtotal: exSub, flags: ["Fanuc expenses \u2014 separate invoice"] });
            }
          }
        }
        ready.sort((a, b) => b.subtotal - a.subtotal);
        held.sort((a, b) => (b.asymblAmount || 0) - (a.asymblAmount || 0));
        const readyTotal = m2(ready.reduce((s, i) => s + i.subtotal, 0));
        const heldTotal = m2(held.reduce((s, i) => s + (i.asymblAmount || 0), 0));
        const emps = {};
        ready.forEach((i) => i.lines.forEach((l) => {
          emps[l.desc.replace(/ (RT|OT|DT|Shift|—).*/, "")] = true;
        }));
        const entities = [...new Set(ready.map((i) => i.entity))];
        return json({
          ok: true,
          mode: "dry-run \u2014 full engine, posts nothing to Xero",
          weekEnding: weekUS,
          weekEndingRaw: weekEnding,
          summary: { readyInvoices: ready.length, readyTotal, heldInvoices: held.length, heldTotal, employeesOnReady: Object.keys(emps).length, entities, skippedHouse },
          ready,
          held
        }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-load") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const res = await sbService(env, "GET", "spark_boards?select=id,data,visibility,owner,members&order=created_at.asc");
        if (!res.ok) return json({ error: "load failed: " + JSON.stringify(res.data).slice(0, 200) }, 502, origin);
        let role = "member";
        try {
          const pr = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(who.email));
          if (pr.ok && pr.data && pr.data[0] && pr.data[0].role) role = pr.data[0].role;
        } catch (e) {
        }
        const isAdmin = role === "admin" || role === "superadmin";
        const boards = (res.data || []).filter((b) => {
          if (b.visibility !== "private") return true;
          if (isAdmin) return true;
          if (b.owner === who.email) return true;
          return Array.isArray(b.members) && b.members.indexOf(who.email) !== -1;
        }).map((b) => b.data).filter(Boolean);
        return json({ ok: true, count: boards.length, boards }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-save" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const b = body.board;
      if (!b || !b.id) return json({ error: "board {id,...} required" }, 400, origin);
      const row = {
        id: String(b.id).slice(0, 60),
        name: String(b.name || "").slice(0, 200),
        data: b,
        visibility: b.visibility === "private" ? "private" : "workspace",
        owner: b.owner || who.email,
        members: Array.isArray(b.members) ? b.members : [],
        updated_by: who.email,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      try {
        const res = await sbService(env, "POST", "spark_boards?on_conflict=id", row);
        if (!res.ok) return json({ error: "save failed: " + JSON.stringify(res.data).slice(0, 250) }, 502, origin);
        return json({ ok: true, id: row.id }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-delete" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const id = String(body.id || "").slice(0, 60);
      if (!id) return json({ error: "id required" }, 400, origin);
      try {
        const cur = await sbService(env, "GET", "spark_boards?id=eq." + encodeURIComponent(id) + "&select=owner");
        const owner = cur.ok && cur.data && cur.data[0] ? cur.data[0].owner : null;
        let role = "member";
        const pr = await sbService(env, "GET", "profiles?select=role&email=eq." + encodeURIComponent(who.email));
        if (pr.ok && pr.data && pr.data[0] && pr.data[0].role) role = pr.data[0].role;
        const isAdmin = role === "admin" || role === "superadmin";
        if (!isAdmin && owner !== who.email) return json({ error: "Only the owner or an admin can delete this board." }, 403, origin);
        const del = await sbService(env, "DELETE", "spark_boards?id=eq." + encodeURIComponent(id));
        if (!del.ok) return json({ error: "delete failed" }, 502, origin);
        console.log("BOARDS-DELETE by " + who.email + ": " + id);
        return json({ ok: true, deleted: id }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-users") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Admins only" }, 403, origin);
      try {
        const res = await sbService(env, "GET", "profiles?select=id,email,full_name,role&order=full_name");
        if (!res.ok) return json({ error: "Could not read profiles" }, 502, origin);
        return json({ ok: true, users: res.data || [] }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-user-save" && request.method === "POST") {
      const gate = await verifyAdmin(request, env);
      if (!gate.ok) return json({ error: gate.reason || "Admins only" }, 403, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const id = String(body.id || "");
      if (!id) return json({ error: "id required" }, 400, origin);
      try {
        if (body.delete === true) {
          const del = await sbService(env, "DELETE", "profiles?id=eq." + encodeURIComponent(id));
          if (!del.ok) return json({ error: "delete failed" }, 502, origin);
          console.log("BOARDS-USER-DELETE by " + gate.email + ": " + id);
          return json({ ok: true, deleted: id }, 200, origin);
        }
        const patch = {};
        if (body.role) patch.role = String(body.role).toLowerCase().slice(0, 20);
        if (body.email) patch.email = String(body.email).slice(0, 200);
        if (body.status) patch.status = String(body.status).slice(0, 20);
        if (!Object.keys(patch).length) return json({ error: "nothing to update" }, 400, origin);
        const res = await sbService(env, "PATCH", "profiles?id=eq." + encodeURIComponent(id), patch);
        if (!res.ok) return json({ error: "update failed: " + JSON.stringify(res.data).slice(0, 200) }, 502, origin);
        console.log("BOARDS-USER-SAVE by " + gate.email + ": " + id + " " + JSON.stringify(patch));
        return json({ ok: true }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-sf-sync" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const boardId = String(body.boardId || "").slice(0, 60);
      const sfColumn = String(body.sfColumn || "sf").slice(0, 40);
      let days = parseInt(body.days, 10);
      if (isNaN(days) || days < 1 || days > 365) days = 120;
      if (!boardId) return json({ error: "boardId required" }, 400, origin);
      try {
        const br = await sbService(env, "GET", "spark_boards?id=eq." + encodeURIComponent(boardId) + "&select=data");
        if (!br.ok || !br.data || !br.data[0]) return json({ error: "board not found" }, 404, origin);
        const board = br.data[0].data;
        const soql = "SELECT Id, bpats__ATS_Candidate__r.Name, Status__c, bpats__Start_Date__c FROM bpats__Placement__c WHERE (bpats__Start_Date__c = LAST_N_DAYS:" + days + " OR bpats__Start_Date__c = NEXT_N_DAYS:90) ORDER BY bpats__Start_Date__c DESC";
        const sf = await runSalesforceQueryAll(env, soql);
        if (!sf.ok) return json({ error: sf.error }, 502, origin);
        const byName = {};
        (sf.records || []).forEach((r) => {
          const cand = r.bpats__ATS_Candidate__r && r.bpats__ATS_Candidate__r.Name ? r.bpats__ATS_Candidate__r.Name : "";
          const n = String(cand).toLowerCase().replace(/\s+/g, " ").trim();
          if (!n) return;
          if (!byName[n]) byName[n] = { sfId: r.Id, status: r.Status__c || "", start: r.bpats__Start_Date__c || "", dup: false };
          else byName[n].dup = true;
        });
        let matched = 0;
        (board.groups || []).forEach((g) => (g.items || []).forEach((it) => {
          const key = String(it.name || "").toLowerCase().replace(/\s+/g, " ").trim();
          const hit = byName[key];
          if (hit) {
            it[sfColumn] = 1;
            if (!it.sfId && !hit.dup) it.sfId = hit.sfId;
            it.sf_ambiguous = !!hit.dup;
            it.sf_status = hit.status;
            if (hit.start) it.sf_start = hit.start;
            matched++;
          }
        }));
        const save = await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: boardId,
          data: board,
          updated_by: who.email,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (!save.ok) return json({ error: "saved match but re-save failed: " + JSON.stringify(save.data).slice(0, 200) }, 502, origin);
        console.log("BOARDS-SF-SYNC by " + who.email + ": board " + boardId + " matched " + matched + "/" + (sf.records || []).length);
        return json({ ok: true, matched, placementsScanned: (sf.records || []).length }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-email" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      if (!env.AZ_CLIENT_ID) return json({ error: "M365 not configured" }, 503, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const to = String(body.to || "").trim();
      const subject = String(body.subject || "Spark Boards update").slice(0, 300);
      const html = String(body.html || body.body || "").slice(0, 2e4);
      const isHtml = !!body.html;
      const from = String(body.from || env.SPARK_BOARDS_FROM || who.email).trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "Invalid recipient address" }, 400, origin);
      try {
        const token = await getGraphToken(env);
        const msg = {
          message: { subject, body: { contentType: isHtml ? "HTML" : "Text", content: html }, toRecipients: [{ emailAddress: { address: to } }] },
          saveToSentItems: true
        };
        const r = await fetch("https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(from) + "/sendMail", {
          method: "POST",
          headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(msg)
        });
        if (r.status === 202) {
          console.log("BOARDS-EMAIL by " + who.email + " from " + from + " -> " + to);
          return json({ ok: true, sentAs: from, to }, 200, origin);
        }
        const t = await r.text();
        return json({ error: "Send failed: " + r.status + " " + t.slice(0, 160) }, 502, origin);
      } catch (e) {
        return json({ error: String(e.message || e).slice(0, 200) }, 502, origin);
      }
    }
    if (url.pathname === "/match-search" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const clean = /* @__PURE__ */ __name((v) => String(v == null ? "" : v).replace(/['\\]/g, "").trim(), "clean");
      const skill = clean(body.skill);
      const shift = clean(body.shift);
      const skills = Array.isArray(body.skills) ? body.skills.map(clean).filter(Boolean) : skill ? [skill] : [];
      const shifts = Array.isArray(body.shifts) ? body.shifts.map(clean).filter(Boolean) : shift ? [shift] : [];
      const priorOnly = body.priorPlacements === true;
      const includeFormer = body.includeFormer === true;
      const zip = clean(body.zip).replace(/[^0-9]/g, "").slice(0, 5);
      const radiusMi = Math.min(Math.max(parseInt(body.radiusMi, 10) || 0, 0), 200);
      const payMin = body.payMin != null ? parseFloat(body.payMin) : null;
      const payMax = body.payMax != null ? parseFloat(body.payMax) : null;
      const needAuth = body.workAuth === true;
      const needDrug = body.drugTest === true;
      const needBg = body.background === true;
      const needTrans = body.transport === true;
      const limit = Math.min(Math.max(parseInt(body.limit, 10) || 60, 1), 100);
      const where = [];
      const statusIn = includeFormer ? "'Active','Prospect','# DISCO','Former'" : "'Active','Prospect','# DISCO'";
      where.push("(bpats__Contact_Relationship__c = null OR bpats__Contact_Relationship__c IN (" + statusIn + "))");
      where.push("Primary_Skill_Set__c != null");
      where.push("LastActivityDate = LAST_N_DAYS:730");
      if (skills.length) where.push("Primary_Skill_Set__c IN (" + skills.map((x) => "'" + x + "'").join(",") + ")");
      if (shifts.length) {
        const shiftOrs = [];
        for (const sh of shifts) {
          shiftOrs.push("Primary_Shift_Preference__c = '" + sh + "'");
          shiftOrs.push("Other_Shift_Preferences__c INCLUDES ('" + sh + "')");
        }
        shiftOrs.push("Primary_Shift_Preference__c = 'Any'");
        where.push("(" + shiftOrs.join(" OR ") + ")");
      }
      if (payMin != null && !isNaN(payMin)) where.push("(bpats__Pay_Rate__c = null OR bpats__Pay_Rate__c >= " + payMin + ")");
      if (payMax != null && !isNaN(payMax)) where.push("(bpats__Pay_Rate__c = null OR bpats__Pay_Rate__c <= " + payMax + ")");
      if (needAuth) where.push("Authorized_to_Work_in_US__c = 'Yes'");
      if (needDrug) where.push("Willingness_to_Submit_Drug_Test__c = 'Yes'");
      if (needBg) where.push("Willingness_to_Submit_Background_Check__c = 'Yes'");
      if (needTrans) where.push("Reliable_Transportation__c = true");
      if (priorOnly) where.push("Placement_Count__c >= 1");
      const fields = [
        "Id",
        "Name",
        "MailingPostalCode",
        "MailingCity",
        "MailingState",
        "Primary_Skill_Set__c",
        "Primary_Shift_Preference__c",
        "Other_Shift_Preferences__c",
        "Overtime_Willingness__c",
        "bpats__Pay_Rate__c",
        "Commute_Radius_mi__c",
        "Authorized_to_Work_in_US__c",
        "Willingness_to_Submit_Drug_Test__c",
        "Willingness_to_Submit_Background_Check__c",
        "Reliable_Transportation__c",
        "Placement_Count__c",
        "bpats__Total_Years_Of_Work_Experience__c",
        "bpats__Earliest_Available_Date__c",
        "bpats__Contact_Relationship__c",
        "LastActivityDate",
        "Phone",
        "MobilePhone"
      ];
      const soql = "SELECT " + fields.join(",") + " FROM Contact WHERE " + where.join(" AND ") + " ORDER BY LastActivityDate DESC NULLS LAST LIMIT " + limit;
      const res = await runSalesforceQuery(env, soql);
      if (!res.ok) return json({ error: res.error }, 502, origin);
      let originGeo = null, zipGeo = {};
      if (zip && radiusMi > 0) {
        try {
          const zips = /* @__PURE__ */ new Set([zip]);
          for (const r of res.records) {
            const z = (r.MailingPostalCode || "").replace(/[^0-9]/g, "").slice(0, 5);
            if (z) zips.add(z);
          }
          const inList = [...zips].map((z) => "'" + z + "'").join(",");
          const gr = await fetch(
            env.SUPABASE_URL + "/rest/v1/terr_zipgeo?select=zip,lat,lng&zip=in.(" + inList + ")",
            { headers: { "apikey": env.SUPABASE_PUBLISHABLE_KEY, "Authorization": "Bearer " + env.SUPABASE_PUBLISHABLE_KEY } }
          );
          if (gr.ok) {
            for (const g of await gr.json()) zipGeo[g.zip] = { lat: +g.lat, lng: +g.lng };
          }
          originGeo = zipGeo[zip] || null;
        } catch (e) {
        }
      }
      const miles = /* @__PURE__ */ __name((a, b) => {
        if (!a || !b) return null;
        const R = 3958.8, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
        const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
      }, "miles");
      const scored = res.records.map((r) => {
        let score = 0;
        const why = [];
        if (skills.length && skills.indexOf(r.Primary_Skill_Set__c) >= 0) {
          score += 22;
          why.push("Skill match: " + r.Primary_Skill_Set__c);
        } else if (!skills.length && r.Primary_Skill_Set__c) {
          score += 14;
        } else if (r.Primary_Skill_Set__c) {
          score += 8;
        }
        const cz = (r.MailingPostalCode || "").replace(/[^0-9]/g, "").slice(0, 5);
        const dist = originGeo && zipGeo[cz] ? miles(originGeo, zipGeo[cz]) : null;
        if (dist != null) {
          if (radiusMi && dist <= radiusMi) {
            score += 16;
            why.push(Math.round(dist) + " mi away");
          } else if (radiusMi && dist <= radiusMi * 1.5) {
            score += 8;
            why.push(Math.round(dist) + " mi (just outside radius)");
          }
        } else {
          score += 8;
        }
        if (shifts.length) {
          if (shifts.indexOf(r.Primary_Shift_Preference__c) >= 0) {
            score += 14;
            why.push(r.Primary_Shift_Preference__c + " shift");
          } else if (r.Primary_Shift_Preference__c === "Any") {
            score += 11;
            why.push("Any shift");
          } else if (shifts.some((sh) => (r.Other_Shift_Preferences__c || "").includes(sh))) {
            score += 9;
            why.push("Secondary shift match");
          }
        } else if (r.Primary_Shift_Preference__c) {
          score += 9;
        }
        const pr = r.bpats__Pay_Rate__c;
        if (pr == null) {
          score += 6;
        } else if ((payMax == null || pr <= payMax) && (payMin == null || pr >= payMin)) {
          score += 12;
          why.push("$" + pr + "/hr desired");
        } else if (payMax != null && pr <= payMax * 1.1) {
          score += 6;
        }
        if (r.Authorized_to_Work_in_US__c === "Yes") {
          score += 12;
        } else if (r.Authorized_to_Work_in_US__c == null) {
          score += 4;
        }
        if (r.Willingness_to_Submit_Drug_Test__c === "Yes") score += 4;
        if (r.Willingness_to_Submit_Background_Check__c === "Yes") score += 4;
        const pc = r.Placement_Count__c || 0;
        if (pc >= 3) {
          score += 7;
          why.push(pc + " prior placements");
        } else if (pc >= 1) {
          score += 4;
          why.push(pc + " prior placement" + (pc > 1 ? "s" : ""));
        }
        const yr = r.bpats__Total_Years_Of_Work_Experience__c;
        if (yr != null) {
          if (yr >= 5) score += 5;
          else if (yr >= 2) score += 3;
          else score += 1;
          if (yr) why.push(yr + " yrs exp");
        }
        if (r.bpats__Earliest_Available_Date__c) {
          const av = new Date(r.bpats__Earliest_Available_Date__c);
          if (!isNaN(av) && av <= new Date(Date.now() + 14 * 864e5)) {
            score += 4;
            why.push("Available soon");
          }
        }
        const flags = [];
        if (r.bpats__Contact_Relationship__c === "# DISCO") flags.push("Prior attempt unreached");
        if (r.Authorized_to_Work_in_US__c === "No") flags.push("Not work-authorized");
        if (r.Authorized_to_Work_in_US__c === "Needs Sponsorship") flags.push("Needs sponsorship");
        return {
          id: r.Id,
          name: r.Name || "(unnamed)",
          city: r.MailingCity || "",
          state: r.MailingState || "",
          zip: cz,
          skillSet: r.Primary_Skill_Set__c || "",
          shift: r.Primary_Shift_Preference__c || "",
          pay: pr == null ? null : pr,
          distanceMi: dist == null ? null : Math.round(dist * 10) / 10,
          placements: pc,
          yearsExp: yr == null ? null : yr,
          workAuth: r.Authorized_to_Work_in_US__c === "Yes",
          phone: r.MobilePhone || r.Phone || "",
          status: r.bpats__Contact_Relationship__c || "",
          lastActivity: r.LastActivityDate || null,
          score: Math.min(Math.round(score), 100),
          why,
          flags
        };
      });
      scored.sort((a, b) => b.score - a.score);
      return json({
        ok: true,
        count: scored.length,
        radiusApplied: !!(zip && radiusMi > 0 && originGeo),
        geocodeAvailable: !!originGeo,
        candidates: scored
      }, 200, origin);
    }
    if (url.pathname === "/boards-sf-write" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "bad json" }, 400, origin);
      }
      const boardId = String(body.boardId || "").slice(0, 60);
      const itemId = String(body.itemId || "").slice(0, 60);
      if (!boardId || !itemId) return json({ error: "boardId and itemId required" }, 400, origin);
      const ALLOWED = ["Active", "Completed", "Pending Start"];
      try {
        const br = await sbService(env, "GET", "spark_boards?id=eq." + encodeURIComponent(boardId) + "&select=data");
        if (!br.ok || !br.data || !br.data[0]) return json({ error: "board not found" }, 404, origin);
        const board = br.data[0].data;
        let item = null;
        (board.groups || []).forEach((g) => (g.items || []).forEach((it) => {
          if (it.id === itemId) item = it;
        }));
        if (!item) return json({ error: "item not found on board" }, 404, origin);
        if (!item.sfId) return json({ error: "This row has no Salesforce link yet. Run Sync first." }, 409, origin);
        if (item.sf_ambiguous) return json({ error: "Duplicate name in Salesforce - resolve before writing." }, 409, origin);
        const patch = {};
        if (body.status !== void 0 && body.status !== null && body.status !== "") {
          const s = String(body.status);
          if (ALLOWED.indexOf(s) === -1) return json({ error: "Invalid status: " + s }, 400, origin);
          patch.Status__c = s;
        }
        const rateKeys = [["payRate", "bpats__Pay_Rate__c"], ["billRate", "bpats__Bill_Rate__c"]];
        let wantsRates = false;
        rateKeys.forEach((p) => {
          if (body[p[0]] !== void 0 && body[p[0]] !== null && body[p[0]] !== "") wantsRates = true;
        });
        if (wantsRates) {
          const adm = await verifyAdmin(request, env);
          if (!adm.ok) return json({ error: "Rate changes are admin-only." }, 403, origin);
          for (const p of rateKeys) {
            const v = body[p[0]];
            if (v === void 0 || v === null || v === "") continue;
            const n = Number(v);
            if (isNaN(n) || n < 0 || n > 1e4) return json({ error: "Invalid " + p[0] + ": " + v }, 400, origin);
            patch[p[1]] = n;
          }
        }
        if (!Object.keys(patch).length) return json({ error: "nothing to write" }, 400, origin);
        const tok = await getSalesforceToken(env);
        const pr = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/bpats__Placement__c/" + encodeURIComponent(item.sfId), {
          method: "PATCH",
          headers: { Authorization: "Bearer " + tok.access_token, "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (pr.status !== 204) {
          let t = "";
          try {
            t = (await pr.text()).slice(0, 300);
          } catch (e) {
          }
          return json({ error: "Salesforce rejected the update: " + t }, 502, origin);
        }
        if (patch.Status__c) item.sf_status = patch.Status__c;
        item.sf_written_by = who.email;
        item.sf_written_at = (/* @__PURE__ */ new Date()).toISOString();
        await sbService(env, "POST", "spark_boards?on_conflict=id", {
          id: boardId,
          data: board,
          updated_by: who.email,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log("BOARDS-SF-WRITE by " + who.email + ": " + item.sfId + " " + JSON.stringify(patch));
        return json({ ok: true, sfId: item.sfId, written: patch }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-sf-objects") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const objRaw = String(url.searchParams.get("obj") || "");
      let obj = "";
      for (let k = 0; k < objRaw.length; k++) {
        const ch = objRaw[k];
        if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch >= "0" && ch <= "9" || ch === "_") obj += ch;
      }
      try {
        const tok = await getSalesforceToken(env);
        if (!obj) {
          const lr = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/", { headers: { Authorization: "Bearer " + tok.access_token } });
          const ld = await lr.json();
          const names = (ld.sobjects || []).map((s) => s.name).filter((n) => n.toLowerCase().indexOf("bpats") !== -1 || n.toLowerCase().indexOf("applic") !== -1);
          return json({ ok: true, objects: names }, 200, origin);
        }
        const dr = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/" + obj + "/describe", { headers: { Authorization: "Bearer " + tok.access_token } });
        const d = await dr.json();
        if (!dr.ok) return json({ error: "describe failed: " + JSON.stringify(d).slice(0, 300) }, 502, origin);
        const out = { object: obj, updateable: !!d.updateable, fields: [] };
        (d.fields || []).forEach((f) => {
          const isPick = f.picklistValues && f.picklistValues.length;
          const isRef = f.type === "reference";
          if (!isPick && !isRef) return;
          const rec = { name: f.name, label: f.label, type: f.type, updateable: !!f.updateable };
          if (isPick) rec.values = f.picklistValues.map((p) => p.value);
          if (isRef) rec.refTo = f.referenceTo || [];
          out.fields.push(rec);
        });
        return json({ ok: true, describe: out }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    // ---- Move an ATS applicant into the Placement stage (Asymbl Kanban) ----
    if (url.pathname === "/boards-sf-stage" && request.method === "POST") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, origin); }
      const boardId = String(body.boardId || "").slice(0, 60);
      const itemId = String(body.itemId || "").slice(0, 60);
      const dryRun = body.dryRun !== false;
      if (!boardId || !itemId) return json({ error: "boardId and itemId required" }, 400, origin);
      function sfid(v) {
        let o = ""; const s = String(v || "");
        for (let k = 0; k < s.length; k++) {
          const c = s[k];
          if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9")) o += c;
        }
        return o.slice(0, 18);
      }
      try {
        const br = await sbService(env, "GET", "spark_boards?id=eq." + encodeURIComponent(boardId) + "&select=data");
        if (!br.ok || !br.data || !br.data[0]) return json({ error: "board not found" }, 404, origin);
        const board = br.data[0].data;
        let item = null;
        (board.groups || []).forEach((g) => (g.items || []).forEach((it) => { if (it.id === itemId) item = it; }));
        if (!item) return json({ error: "item not found" }, 404, origin);
        if (!item.sfId) return json({ error: "No Salesforce link on this row. Run Sync first." }, 409, origin);
        const pid = sfid(item.sfId);
        const p = await runSalesforceQueryAll(env, "SELECT bpats__ATS_Candidate__c, bpats__ATS_Job__c FROM bpats__Placement__c WHERE Id = '" + pid + "'");
        if (!p.ok) return json({ error: p.error }, 502, origin);
        if (!p.records || !p.records[0]) return json({ error: "placement not found" }, 404, origin);
        const contactId = sfid(p.records[0].bpats__ATS_Candidate__c);
        const jobId = sfid(p.records[0].bpats__ATS_Job__c);
        if (!contactId || !jobId) return json({ error: "placement missing candidate or job link" }, 409, origin);
        const a = await runSalesforceQueryAll(env, "SELECT Id, bpats__Stage__c, bpats__Stage__r.Name, bpats__Stage__r.bpats__Stage_Type__c FROM bpats__ATS_Applicant__c WHERE bpats__ATS_Applicant__c = '" + contactId + "' AND bpats__Job__c = '" + jobId + "'");
        if (!a.ok) return json({ error: a.error }, 502, origin);
        const apps = a.records || [];
        if (!apps.length) return json({ error: "No ATS applicant record for this candidate and job." }, 404, origin);
        if (apps.length > 1) return json({ error: "Multiple applicant records found - resolve in Salesforce." }, 409, origin);
        const app = apps[0];
        const s = await runSalesforceQueryAll(env, "SELECT Id, Name FROM bpats__ATS_Stage__c WHERE bpats__Job__c = '" + jobId + "' AND bpats__Stage_Type__c = 'Placement'");
        if (!s.ok) return json({ error: s.error }, 502, origin);
        const stages = s.records || [];
        if (!stages.length) return json({ error: "This job has no Placement stage." }, 404, origin);
        if (stages.length > 1) return json({ error: "Job has multiple Placement stages." }, 409, origin);
        const target = stages[0];
        const cur = app.bpats__Stage__r || {};
        const preview = { candidate: item.name, applicantId: app.Id, currentStage: cur.Name || null,
                          currentStageType: cur.bpats__Stage_Type__c || null,
                          targetStageId: target.Id, targetStageName: target.Name };
        if (app.bpats__Stage__c === target.Id) return json({ ok: true, alreadyThere: true, preview }, 200, origin);
        if (dryRun) return json({ ok: true, dryRun: true, preview }, 200, origin);
        const tok = await getSalesforceToken(env);
        const pr = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/bpats__ATS_Applicant__c/" + encodeURIComponent(app.Id), {
          method: "PATCH",
          headers: { Authorization: "Bearer " + tok.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({ bpats__Stage__c: target.Id })
        });
        if (pr.status !== 204) {
          let t = ""; try { t = (await pr.text()).slice(0, 300); } catch (e) {}
          return json({ error: "Salesforce rejected the stage move: " + t }, 502, origin);
        }
        item.sf_stage = target.Name;
        item.sf_stage_by = who.email;
        item.sf_stage_at = (/* @__PURE__ */ new Date()).toISOString();
        await sbService(env, "POST", "spark_boards?on_conflict=id", { id: boardId, data: board, updated_by: who.email, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
        console.log("BOARDS-SF-STAGE by " + who.email + ": applicant " + app.Id + " -> " + target.Id);
        return json({ ok: true, moved: true, preview }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-sf-describe") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      try {
        const tok = await getSalesforceToken(env);
        const dr = await fetch(tok.instance_url + "/services/data/v60.0/sobjects/bpats__Placement__c/describe", {
          headers: { Authorization: "Bearer " + tok.access_token }
        });
        const d = await dr.json();
        if (!dr.ok) return json({ error: "describe failed: " + JSON.stringify(d).slice(0, 300) }, 502, origin);
        const out = { objectUpdateable: !!d.updateable, fields: [] };
        (d.fields || []).forEach((f) => {
          const n = String(f.name || "").toLowerCase();
          const lab = String(f.label || "").toLowerCase();
          const want = n === "status__c" || n.indexOf("rate") !== -1 || n.indexOf("commission") !== -1 || lab.indexOf("rate") !== -1 || lab.indexOf("commission") !== -1;
          if (!want) return;
          const rec = { name: f.name, label: f.label, type: f.type, updateable: !!f.updateable };
          if (f.picklistValues && f.picklistValues.length) {
            rec.picklist = f.picklistValues.map((p) => ({ value: p.value, active: !!p.active }));
          }
          out.fields.push(rec);
        });
        return json({ ok: true, describe: out }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
    if (url.pathname === "/boards-sf-search") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const raw = String(url.searchParams.get("q") || "");
      let safe = "";
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z" || ch >= "0" && ch <= "9" || ch === " " || ch === "-" || ch === ".") safe += ch;
      }
      safe = safe.trim().slice(0, 60);
      if (safe.length < 2) return json({ ok: true, results: [] }, 200, origin);
      try {
        const soql = "SELECT Id, Status__c, bpats__Start_Date__c, bpats__ATS_Candidate__r.Name FROM bpats__Placement__c WHERE bpats__ATS_Candidate__r.Name LIKE '%" + safe + "%' ORDER BY bpats__Start_Date__c DESC LIMIT 25";
        const sf = await runSalesforceQueryAll(env, soql);
        if (!sf.ok) return json({ error: sf.error }, 502, origin);
        const results = (sf.records || []).map((r) => ({
          sfId: r.Id,
          name: r.bpats__ATS_Candidate__r && r.bpats__ATS_Candidate__r.Name || "",
          status: r.Status__c || "",
          start: r.bpats__Start_Date__c || ""
        })).filter((x) => x.name);
        return json({ ok: true, results }, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }
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
      const reqH = 8; /* APP_BREAK_REQ_HRS: index.html reads window.__breakReqHrs, never assigned, so the app always uses 8 regardless of tk_config (which says 6). Verified 14/14 for week ending 2026-08-02. */
      const mins = 30;
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
        const weekH = parseFloat(total.toFixed(2)); // payroll export uses 2dp, no pre-round
        return {
          eid: e.id, badge: e.badge, name: e.fn + " " + e.ln,
          placementId: e.sf_placement_id,
          tkReg: parseFloat(Math.min(weekH, otW).toFixed(2)),
          tkOt: parseFloat(Math.max(0, weekH - otW).toFixed(2)),
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

    const tkNear = function(a, b){ return Math.abs(Number(a || 0) - Number(b || 0)) < 0.1001; };

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
          policyNote: "Lunch rule uses 8h/30m to match the TimeKeep app. tk_config.policy may say breakReqHrs 6, but index.html never applies it (window.__breakReqHrs is unassigned). Resolve that policy question before changing this.", note: "Read only. POST /tk-hours-push with {periodEnd, confirm:true} to write the rows marked action=write."
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


    // ── TimeKeep Phase 1: placement search (Add Employee picker) ──────────────
    // Read only. Field names verified against FieldDefinition 2026-08-09.
    if (url.pathname === "/tk-placements") {
      const who = await verifyUser(request, env);
      if (!who || !who.email) return json({ error: "unauthorized" }, 401, origin);

      // Whitelist input. Anything outside this set never reaches the SOQL string.
      const rawQ = (url.searchParams.get("q") || "").trim();
      const cleaned = rawQ.replace(/[^A-Za-z0-9 .'-]/g, "");
      if (cleaned.length < 2) {
        return json({ count: 0, query: cleaned, placements: [] }, 200, origin);
      }
      // Escape the apostrophe for SOQL without writing a literal backslash here.
      const q = cleaned
        .split(String.fromCharCode(39))
        .join(String.fromCharCode(92, 39));

      const soql =
        "SELECT Id, Name, Status__c, Generate_Timesheets__c, " +
        "bpats__Start_Date__c, bpats__Estimated_End_Date__c, Terminated_Date__c, " +
        "Termination_Reason__c, Job_Title__c, bpats__Pay_Rate__c, " +
        "bpats__ATS_Candidate__c, bpats__ATS_Candidate__r.Name, " +
        "bpats__ATS_Job__r.Name, bpats__ATS_Job__r.bpats__Account_Name__c " +
        "FROM bpats__Placement__c " +
        "WHERE bpats__ATS_Job__r.bpats__Account_Name__c LIKE '%DFM%' " +
        "AND bpats__ATS_Candidate__r.Name LIKE '%" + q + "%' " +
        "ORDER BY bpats__Start_Date__c DESC LIMIT 25";

      const res = await runSalesforceQueryAll(env, soql);
      if (!res.ok) return json({ error: res.error, soql: soql }, 502, origin);

      const rows = (res.records || []).map(function (r) {
        const cand = r.bpats__ATS_Candidate__r || null;
        const job = r.bpats__ATS_Job__r || null;
        return {
          placementId: r.Id,
          placementName: r.Name || "",
          candidateId: r.bpats__ATS_Candidate__c || null,
          candidateName: cand ? cand.Name : "",
          jobTitle: r.Job_Title__c || "",
          jobName: job ? job.Name : "",
          account: job ? job.bpats__Account_Name__c : "",
          status: r.Status__c || "",
          generatesTimesheets: r.Generate_Timesheets__c === true,
          startDate: r.bpats__Start_Date__c || null,
          estEndDate: r.bpats__Estimated_End_Date__c || null,
          terminatedDate: r.Terminated_Date__c || null,
          terminationReason: r.Termination_Reason__c || null,
          payRate: (r.bpats__Pay_Rate__c === undefined) ? null : r.bpats__Pay_Rate__c
        };
      });

      // Same candidate on two placements is a real ambiguity, not a dedupe target.
      const seen = {};
      const dupes = [];
      rows.forEach(function (x) {
        const k = (x.candidateName || "").toLowerCase();
        if (!k) return;
        if (seen[k]) { if (dupes.indexOf(k) === -1) dupes.push(k); }
        seen[k] = true;
      });

      return json({
        count: rows.length,
        query: cleaned,
        ambiguous: dupes,
        placements: rows
      }, 200, origin);
    }

    // ── TimeKeep Phase 1: active roster from the ASYMBL weekly timesheet run ──
    // Status__c is unreliable here (13 "Active" vs 137 timesheets on 2026-08-09).
    // Timesheet generation is the trustworthy activity signal. Read only.
    if (url.pathname === "/tk-active-roster") {
      const who = await verifyUser(request, env);
      if (!who || !who.email) return json({ error: "unauthorized" }, 401, origin);

      let periodEnd = (url.searchParams.get("periodEnd") || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
        // Pay period ends Sunday. Resolve in Eastern time, not UTC, or a Sunday
        // evening request rolls forward a full week.
        const nowEt = new Date(
          new Date().toLocaleString("en-US", { timeZone: "America/Detroit" })
        );
        nowEt.setDate(nowEt.getDate() + ((7 - nowEt.getDay()) % 7));
        const mm = String(nowEt.getMonth() + 1);
        const dd = String(nowEt.getDate());
        periodEnd = nowEt.getFullYear() + "-" +
          (mm.length < 2 ? "0" + mm : mm) + "-" +
          (dd.length < 2 ? "0" + dd : dd);
      }

      const soql =
        "SELECT Id, Placement__c, ASYMBL_Time__Candidate_Name__c, " +
        "ASYMBL_Time__Status__c, ASYMBL_Time__Pay_Period_End_Date__c, " +
        "Placement__r.Name, Placement__r.Status__c, " +
        "Placement__r.Generate_Timesheets__c, Placement__r.Terminated_Date__c, " +
        "Placement__r.Job_Title__c, Placement__r.bpats__ATS_Candidate__c, " +
        "Placement__r.bpats__ATS_Candidate__r.Name " +
        "FROM ASYMBL_Time__Timesheet__c " +
        "WHERE ASYMBL_Time__Pay_Period_End_Date__c = " + periodEnd + " " +
        "AND Placement__r.bpats__ATS_Job__r.bpats__Account_Name__c LIKE '%DFM%' " +
        "ORDER BY ASYMBL_Time__Candidate_Name__c";

      const res = await runSalesforceQueryAll(env, soql);
      if (!res.ok) return json({ error: res.error, soql: soql }, 502, origin);

      const byPlacement = {};
      const noPlacement = [];
      const terminatedButActive = [];

      (res.records || []).forEach(function (r) {
        const p = r.Placement__r || null;
        const pid = r.Placement__c || null;

        if (!pid) {
          noPlacement.push({
            timesheetId: r.Id,
            candidateName: r.ASYMBL_Time__Candidate_Name__c || ""
          });
          return;
        }

        if (!byPlacement[pid]) {
          byPlacement[pid] = {
            placementId: pid,
            placementName: p ? (p.Name || "") : "",
            candidateId: p ? (p.bpats__ATS_Candidate__c || null) : null,
            candidateName:
              (p && p.bpats__ATS_Candidate__r && p.bpats__ATS_Candidate__r.Name) ||
              r.ASYMBL_Time__Candidate_Name__c || "",
            jobTitle: p ? (p.Job_Title__c || "") : "",
            placementStatus: p ? (p.Status__c || "") : "",
            generatesTimesheets: p ? (p.Generate_Timesheets__c === true) : false,
            terminatedDate: p ? (p.Terminated_Date__c || null) : null,
            timesheetIds: [],
            timesheetStatuses: []
          };
        }
        byPlacement[pid].timesheetIds.push(r.Id);
        if (r.ASYMBL_Time__Status__c) {
          byPlacement[pid].timesheetStatuses.push(r.ASYMBL_Time__Status__c);
        }
      });

      const roster = Object.keys(byPlacement).map(function (k) {
        return byPlacement[k];
      });

      // Terminated in Salesforce but still generating time. Someone should look.
      roster.forEach(function (x) {
        if (x.terminatedDate) terminatedButActive.push(x);
      });

      // More than one timesheet on a single placement for one period.
      const multiTimesheet = roster.filter(function (x) {
        return x.timesheetIds.length > 1;
      });

      return json({
        periodEnd: periodEnd,
        timesheetCount: (res.records || []).length,
        placementCount: roster.length,
        warnings: {
          terminatedButStillGeneratingTime: terminatedButActive.length,
          timesheetsWithNoPlacement: noPlacement.length,
          placementsWithMultipleTimesheets: multiTimesheet.length
        },
        terminatedButStillGeneratingTime: terminatedButActive,
        timesheetsWithNoPlacement: noPlacement,
        placementsWithMultipleTimesheets: multiTimesheet,
        roster: roster
      }, 200, origin);
    }


// ════════════════════════════════════════════════════════════════════════════
// CHARGE REPORT — PHASE B+C: /charge-batch  (read-only compute engine)
// ════════════════════════════════════════════════════════════════════════════
// GET /charge-batch?weekEnding=YYYY-MM-DD   (a Sunday; defaults to latest week in SF)
// Optional: &debug=1 diagnostics · &payables=0 to skip the Payable Worksheet merge.
//
// Pulls the week straight from Salesforce (no report export needed), applies the
// finance agent's rules (fin_client_map, fin_ot_dt_rules), computes the verified
// widget math, and returns rows + rollups + review flags. Writes nothing.
//
// Verified math (100% match against widget_8-2-26.xlsx):
//   otPay = pay*1.5   dtPay = pay*2
//   regMargin = bill - pay*(1+burden)
//   otMargin  = otBill - otPay*(1+burden)      dtMargin likewise
//   vacMargin = -(bill - pay)*(1+burden)
//   charge    = reg*regM + ot*otM + dt*dtM + vac*vacM
// Phase C: vacation hours + manual pays merged in from the 2026 Payable Worksheet.
// ════════════════════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════════════
    // CHARGE REPORT — PHASE D: /charge-history (official books) + /charge-snapshot
    // History tables are loaded from the running Excel report (charge_history.sql)
    // and grown weekly by /charge-snapshot, which freezes the live engine's week.
    // ══════════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════
    // DIRECT HIRE — ENGINE v2 (tracker-live): /charge-dh
    // Reads the week's column straight from all seven live tracker workbooks
    // (credit notes & mid-week edits included), applies overrides (editor),
    // manual adds, split rules (deal counted exactly once), burden rules
    // (5% off except Cupertino / Spark Companies BPO / Bolt content = 100%),
    // geographic BU via terr_territories, and cross-checks SF perm starts.
    // Week rule: WE Sunday S owns tracker column labeled Monday S+1.
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname === "/charge-dh") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const weekEnding = (url.searchParams.get("weekEnding") || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) return json({ error: "weekEnding=YYYY-MM-DD required" }, 400, origin);
      try {
        const r2s = (n) => Math.round((Number(n) || 0) * 100) / 100;
        const d0 = new Date(weekEnding + "T12:00:00Z");
        const mon = new Date(d0.getTime() + 864e5);
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monSerial = Math.round(mon.getTime() / 864e5) + 25569;
        const labelCandidates = [mon.getUTCDate() + "-" + MONTHS[mon.getUTCMonth()], String(mon.getUTCDate()).padStart(2, "0") + "-" + MONTHS[mon.getUTCMonth()]];
        const TRACKERS = [
          { entity: "Spark Talent", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BDF08D9CB-5CF1-4744-9075-619F14A9F552%7D&file=2024%20Direct%20Hire%20Tracker%20Master.xlsx&fromShare=true&action=default&mobileredirect=true" },
          { entity: "Spark Packaging", share: "https://sparktalent.sharepoint.com/:x:/r/sites/SparkPackagingTeamSite/_layouts/15/Doc.aspx?sourcedoc=%7BC44470F8-DCDB-4F3E-85B6-77BD869BFE9B%7D&file=Packaging-%202024%20DH%20Tracker%20Template.xlsx&action=default&mobileredirect=true&wdsle=0&CID=897E83FE-F4C8-4BFE-9EE5-4FB5FA115F50&wdLOR=c551251C0-BE60-4FEB-B4C8-714E2DC31E12" },
          { entity: "John Joseph Partners", share: "https://sparktalent.sharepoint.com/:x:/r/sites/JohnJosephPartnersLLC/_layouts/15/Doc.aspx?sourcedoc=%7BE9CA7E68-DBC8-4F6E-B05C-63034B37BB33%7D&file=JJP-%202024%20DH%20Tracker%20Template.xlsx&wdLOR=cF6BF3837-577D-4480-AE57-6FB1A2121FC8&fromShare=true&action=default&mobileredirect=true" },
          { entity: "Flex Workforce", share: "https://sparktalent.sharepoint.com/:x:/r/sites/FlexWorkforceSolutions/_layouts/15/Doc.aspx?sourcedoc=%7BF5371A1C-0C10-4B1F-A090-55B57B95516C%7D&file=Flex-%202024%20DH%20Tracker.xlsx&wdLOR=cB7D5741D-ABB1-455C-9750-1CC6D43D7DB1&fromShare=true&action=default&mobileredirect=true" },
          { entity: "Ignite Search", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BF52BF0E1-3985-4FA2-B8C3-C063279E71B5%7D&file=Ignite-%202024%20DH%20Tracker.xlsx&wdLOR=c49888525-0F93-458A-B3E2-61064DF907B1&fromShare=true&action=default&mobileredirect=true" },
          { entity: "Spark Companies", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7B0542B573-F958-41FF-9BB1-4E5CB04CF363%7D&file=Spark%20Companies%202024%20DH%20Tracker.xlsx&wdLOR=c81E484C9-98DD-453A-9B76-637D59E3F685&fromShare=true&action=default&mobileredirect=true" },
          { entity: "Bolt Creative", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BC6BA04FD-8A6E-4D2F-B5A1-224A9880F10A%7D&file=Bolt-%202025%20DH%20Tracker%20-%20Copy.xlsx&action=default&mobileredirect=true&CID=72A32F3D-08A6-476E-AAF7-9CF051163281&wdLOR=cC295F8FA-ECD8-496A-AEA7-CBBA88BF8E91" }
        ];
        const ENTSET = { "spark talent": 1, "spark packaging": 1, "john joseph partners": 1, "flex workforce": 1, "ignite search": 1, "spark companies": 1, "bolt creative": 1, "jjp": 1 };
        const burdenFor = (entity, company, employee, title) => {
          const c = String(company || "").toLowerCase(), e = String(employee || "") + " " + String(title || "");
          if (c.indexOf("cupertino") !== -1) return 0;
          if (entity === "Spark Companies" && /bpo/i.test(e + " " + c)) return 0;
          if (entity === "Bolt Creative" && /content|social|media|creative|marketing/i.test(e + " " + c)) return 0;
          return 0.05;
        };
        const gt = await getGraphToken(env);
        const GH = { "Authorization": "Bearer " + gt, "Accept": "application/json" };
        const review = [];
        let drops = [];
        for (const T of TRACKERS) {
          try {
            const shareTok = "u!" + btoa(T.share).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
            const sR = await fetch("https://graph.microsoft.com/v1.0/shares/" + shareTok + "/driveItem?$select=id,parentReference", { headers: GH });
            const sD = await sR.json();
            if (!sR.ok) throw new Error((sD.error && sD.error.message) || "share");
            const B = "https://graph.microsoft.com/v1.0/drives/" + sD.parentReference.driveId + "/items/" + sD.id;
            const rR = await fetch(B + "/workbook/worksheets('Direct%20Hire%20Tracker')/range(address='A1:BR300')?$select=values", { headers: GH });
            const rD = await rR.json();
            if (!rR.ok) throw new Error((rD.error && rD.error.message) || "range");
            const grid = rD.values || [];
            let hr = -1;
            for (let i = 0; i < Math.min(6, grid.length); i++) { if ((grid[i] || []).some((c) => String(c).trim() === "Company")) { hr = i; break; } }
            if (hr < 0) throw new Error("no header row");
            const H2 = grid[hr].map((c) => String(c || "").trim());
            const col = (re) => H2.findIndex((h) => re.test(h));
            const cCo = col(/^Company$/i), cSr = col(/^Sales Rep$/i), cRc = col(/^Recruiter$/i), cNm = col(/^Team Member/i), cTi = col(/^Title$/i), cBu = col(/^Business Unit$/i), cLoc = col(/^Work Location$/i), cInv = col(/^Invoicing$/i);
            let wc = -1;
            for (let c = 0; c < H2.length; c++) {
              const h = grid[hr][c];
              if (typeof h === "number" && Math.round(h) === monSerial) { wc = c; break; }
              if (labelCandidates.indexOf(String(h).trim()) !== -1) { wc = c; break; }
            }
            if (wc < 0) { review.push({ company: T.entity, candidate: "(tracker)", flags: ["dh_week_col_missing"], credits: ["No column for Mon " + labelCandidates[0]] }); continue; }
            for (let r = hr + 1; r < grid.length; r++) {
              const row = grid[r] || [];
              const co = String(row[cCo] || "").trim();
              if (!co) continue;
              const v = row[wc];
              if (typeof v !== "number" || !isFinite(v) || v === 0) continue;
              const emp = cNm >= 0 ? String(row[cNm] || "").trim() : "";
              const ttl = cTi >= 0 ? String(row[cTi] || "").trim() : "";
              const burden = burdenFor(T.entity, co, emp, ttl);
              let paidSoFar = 0, totalDrops = 0;
              for (let c = wc; c < row.length; c++) { if (typeof row[c] === "number" && row[c] !== 0) totalDrops++; }
              for (let c = 0; c <= wc; c++) { if (c >= 13 && typeof row[c] === "number" && row[c] !== 0 && String(grid[hr][c]).length <= 9) paidSoFar++; }
              const cd = String(row[H2.findIndex((h) => /^Charge Details$/i.test(h))] || "");
              const m = cd.match(/\/\s*(\d+)\s*(Week|Month|Install)/i);
              const invType = cInv >= 0 ? String(row[cInv] || "").trim() : "";
              let ofN = m ? Number(m[1]) : (/^3 install/i.test(invType) ? 3 : (/^lump/i.test(invType) || !invType ? 1 : paidSoFar + totalDrops - 1));
              if (!ofN || ofN < paidSoFar) ofN = paidSoFar + Math.max(totalDrops - 1, 0);
              drops.push({
                source: "tracker", entity: T.entity, company: co, employee: emp, title: ttl,
                sales_rep: cSr >= 0 ? String(row[cSr] || "").trim() : "", recruiter: cRc >= 0 ? String(row[cRc] || "").trim() : "",
                bu: cBu >= 0 ? String(row[cBu] || "").trim() : "", loc: cLoc >= 0 ? String(row[cLoc] || "").trim() : "",
                invoicing_type: invType,
                invoiced: r2s(v), burden, amount: r2s(v * (1 - burden)),
                drop: paidSoFar + " of " + ofN, remaining: Math.max(ofN - paidSoFar, 0),
                internal: !!ENTSET[co.toLowerCase().replace(/,? llc$/, "").trim()]
              });
            }
          } catch (e) { review.push({ company: T.entity, candidate: "(tracker)", flags: ["dh_tracker_error"], credits: [String(e.message || e).slice(0, 100)] }); }
        }
        // ── overrides (editor): hide / patch ──
        const ovR = await sbService(env, "GET", "charge_dh_overrides?select=*&or=(week_ending.eq." + weekEnding + ",week_ending.is.null)");
        const ovs = (ovR.ok && ovR.data) || [];
        const okey = (e, c, n) => (String(e || "") + "|" + String(c || "") + "|" + String(n || "")).toLowerCase();
        drops = drops.filter((d) => {
          const k0 = { entity: d.entity, company: d.company, employee: d.employee };
          const hit = ovs.filter((o) => okey(o.match_entity || d.entity, o.match_company, o.match_employee) === okey(d.entity, d.company, d.employee));
          for (const o of hit) {
            if (o.action === "hide") { review.push({ company: d.company, candidate: d.employee, flags: ["dh_hidden"], credits: ["Hidden by editor" + (o.notes ? ": " + o.notes : "")] }); return false; }
            if (o.action === "patch" && o.fields) {
              const f = o.fields;
              ["company","employee","sales_rep","recruiter","bu","entity","title"].forEach((k) => { if (f[k] !== void 0) d[k] = f[k]; });
              if (f.sales_rep !== void 0 || f.recruiter !== void 0) d.credEdited = true;
              if (f.bu !== void 0) d.buEdited = true;
              if (f.amount !== void 0) { d.amount = r2s(f.amount); d.invoiced = null; d.burden = null; d.amtEdited = true; }
              d.edited = true;
            }
          }
          if (d.edited) { d.m_entity = k0.entity; d.m_company = k0.company; d.m_employee = k0.employee; }
          return true;
        });
        // ── manual adds (editor) from charge_dh_schedule source='manual' ──
        const mR = await sbService(env, "GET", "charge_dh_schedule?select=*&source=eq.manual&status=eq.active");
        const monthsBetween = (a, b) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
        for (const s of ((mR.ok && mR.data) || [])) {
          const first = new Date(s.first_we + "T12:00:00Z");
          const n = Number(s.installments) || 1, paid = Number(s.weeks_paid) || 0, total = Number(s.charge) || 0;
          let k = -1;
          if (s.interval === "month") { const m = monthsBetween(first, d0); const target = new Date(first.getTime()); target.setUTCMonth(target.getUTCMonth() + m); if (m >= 0 && Math.abs(d0.getTime() - target.getTime()) / 864e5 <= 3) k = m; }
          else { const wks = Math.round((d0.getTime() - first.getTime()) / (7 * 864e5)); if (wks >= 0 && (d0.getTime() - first.getTime()) % (7 * 864e5) === 0) k = wks; }
          if (k < 0 || k >= (n - paid)) continue;
          drops.push({ source: "manual", schedId: s.id, entity: s.entity, company: s.company, employee: s.employee, title: "", sales_rep: s.sales_rep || "", recruiter: s.recruiter || "", bu: s.bu || "", invoicing_type: s.interval, invoiced: null, burden: null, amount: r2s(total / n), internal: false, drop: (paid + k + 1) + " of " + n });
        }
        // ── resolve tracker short names to roster full names (charge_people) ──
        try {
          const pplR = await sbService(env, "GET", "charge_people?select=person");
          const roster = ((pplR.ok && pplR.data) || []).map((x) => String(x.person || ""));
          const parsed = roster.map((full) => {
            const t = full.trim().split(/\s+/);
            return { full, first: (t[0] || "").toLowerCase(), li: t.length > 1 ? t[t.length - 1][0].toLowerCase() : "" };
          });
          const uniq = (list) => (list.length === 1 ? list[0].full : null);
          const resolve = (nm) => {
            const s = String(nm || "").trim();
            if (!s || /^house$/i.test(s)) return s;
            if (roster.indexOf(s) !== -1) return s;
            const t = s.split(/\s+/);
            const f = (t[0] || "").toLowerCase();
            const firstMatch = (p) => p.first === f || p.first.indexOf(f) === 0 || f.indexOf(p.first) === 0;
            if (t.length >= 2 && t[1].replace(".", "").length >= 1) {
              const li = t[1][0].toLowerCase();
              const exact = uniq(parsed.filter((p) => p.first === f && p.li === li));
              if (exact) return exact;
              const pre = uniq(parsed.filter((p) => firstMatch(p) && p.li === li));
              if (pre) return pre;
            }
            if (t.length === 1) {
              const exact = uniq(parsed.filter((p) => p.first === f));
              if (exact) return exact;
              const pre = uniq(parsed.filter((p) => firstMatch(p)));
              if (pre) return pre;
            }
            return s;
          };
          drops.forEach((d) => { d.sales_rep = resolve(d.sales_rep); d.recruiter = resolve(d.recruiter); });
        } catch (e) {}
        // ── Bolt Creative: all DH lands in its own unit ──
        drops.forEach((d) => { if (/^bolt/i.test(String(d.entity || "")) && !d.buEdited) d.bu = "Bolt Creative Strategies"; });
        // ── geographic BU: client state → territory → BU ──
        const terrR = await sbService(env, "GET", "terr_territories?select=name,geo");
        const stateBU = {};
        for (const t of ((terrR.ok && terrR.data) || [])) {
          let nm = String(t.name || "");
          let bu = /michigan|metro/i.test(nm) ? "MI Metro" : nm.replace(/^National\s+/i, "").replace(/\s+/g, "");
          if (bu === "SouthEast") bu = "Southeast";
          const g = t.geo || {};
          (g.states || []).forEach((st) => { stateBU[String(st).toUpperCase()] = bu; });
        }
        const needState = drops.filter((d) => !d.bu && !d.internal);
        const locState = (loc) => { const m = String(loc || "").match(/,\s*([A-Z]{2})\b/); return m ? m[1] : null; };
        needState.forEach((d) => { const st = locState(d.loc); if (st && stateBU[st]) d.bu = stateBU[st]; });
        const missing = [...new Set(needState.filter((d) => !d.bu).map((d) => d.company))].slice(0, 40);
        if (missing.length) {
          try {
            const names = missing.map((n) => "'" + n.replace(/'/g, "\\'") + "'").join(",");
            const q = await runSalesforceQuery(env, "SELECT Name, BillingState, ShippingState FROM Account WHERE Name IN (" + names + ")");
            const st2 = {}; ((q.ok && q.records) || []).forEach((a) => { st2[a.Name.toLowerCase()] = (a.ShippingState || a.BillingState || "").toUpperCase().slice(0, 2); });
            needState.forEach((d) => { if (!d.bu) { const st = st2[String(d.company).toLowerCase()]; if (st && stateBU[st]) d.bu = stateBU[st]; } });
          } catch (e) {}
        }
        drops.forEach((d) => { if (!d.bu && !d.internal) review.push({ company: d.company, candidate: d.employee, flags: ["dh_no_bu"], credits: ["No BU: set in DH Editor or check account state"] }); });
        // ── inter-entity placement splits: pair the owning entity's client invoice with
        //    the placing entity's inter-company invoice. Owner keeps only the spread (its
        //    retained %) as House Full Desk in the hire's unit; placer keeps its invoice
        //    with its own AM/recruiter credits. The deal counts exactly once. ──
        const entCanon = (s) => String(s || "").toLowerCase().replace(/[.,]/g, "").replace(/\s+(llc|inc|co)$/i, "").trim();
        const txtCanon = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const pd of drops) {
          if (pd.edited === true && pd.amtEdited) continue;
          if (pd.pairSplit || pd.split || !(pd.amount > 0)) continue;
          const ownerEnt = entCanon(pd.company);
          if (!ownerEnt) continue;
          const ptxt = txtCanon(pd.employee);
          const own = drops.find((x) => x !== pd && !x.pairSplit && !x.split && !x.amtEdited &&
            entCanon(x.entity) === ownerEnt && entCanon(pd.entity) !== ownerEnt && x.amount > pd.amount &&
            ((txtCanon(x.company).length >= 6 && ptxt.indexOf(txtCanon(x.company).slice(0, 10)) !== -1) ||
             (txtCanon(x.employee).length >= 6 && ptxt.indexOf(txtCanon(x.employee).slice(0, 8)) !== -1)));
          if (!own) continue;
          const retained = r2s(own.amount - pd.amount);
          const hireBU = own.bu || pd.bu || "";
          if (hireBU) { if (!own.buEdited) own.bu = hireBU; if (!pd.buEdited) pd.bu = hireBU; }
          review.push({ company: own.company, candidate: own.employee, flags: ["dh_entity_split"], credits: [own.entity + " retains $" + retained + " as House FD; " + pd.entity + " keeps $" + pd.amount + " \u2192 " + (pd.sales_rep || "?") + " / " + (pd.recruiter || "?") + "; both coded to " + (hireBU || "no BU")] });
          own.amount = retained;
          if (!own.credEdited) { own.sales_rep = "House"; own.recruiter = "House"; }
          own.pairSplit = true; pd.pairSplit = true;
        }
        // ── splits: allocate the deal exactly once, suppress sibling counterparts ──
        const spR = await sbService(env, "GET", "charge_splits?select=*&active=eq.true");
        const splits = (spR.ok && spR.data) || [];
        const byEntity = {}, byBU = {}, byPerson = {};
        const addU = (m, k, v) => { if (k) m[k] = r2s((m[k] || 0) + v); };
        const addP = (name, bucket, v) => { if (!name || /^house$/i.test(name)) return; const p = byPerson[name] || (byPerson[name] = { sales: 0, fd: 0, rec: 0, tt: 0 }); p[bucket] = r2s(p[bucket] + v); p.tt = r2s(p.tt + v); };
        const ruled = [];
        for (const d of drops) {
          const rule = splits.find((sp) => {
            const c = String(sp.match_company || "").replace(/%/g, "").toLowerCase();
            const e = String(sp.match_employee || "").replace(/%/g, "").toLowerCase();
            return c && String(d.company || "").toLowerCase().indexOf(c) !== -1 && (!e || String(d.employee || "").toLowerCase().indexOf(e) !== -1);
          });
          if (rule) { d.split = true; ruled.push(d); }
        }
        drops = drops.filter((d) => {
          if (!d.internal || d.split || d.pairSplit) return true;
          const twin = ruled.find((x) => x.entity !== d.entity && Math.abs(Math.abs(d.amount) - Math.abs(x.amount) * 0.9) <= Math.abs(x.amount) * 0.02);
          if (twin) { review.push({ company: d.company, candidate: d.employee, flags: ["dh_split_suppressed"], credits: ["Sibling invoice of " + twin.company + " — counted once via split rule"] }); return false; }
          review.push({ company: d.company, candidate: d.employee, flags: ["dh_internal"], credits: ["Inter-entity: counted for " + d.entity] });
          return true;
        });
        for (const d of drops) {
          if (d.split) {
            const rule = splits.find((sp) => String(d.company || "").toLowerCase().indexOf(String(sp.match_company || "").replace(/%/g, "").toLowerCase()) !== -1);
            (rule.allocations || []).forEach((a) => {
              const amt = r2s(d.amount * (Number(a.pct) || 0) / 100);
              addU(byEntity, a.entity || d.entity, amt);
              addU(byBU, a.bu || d.bu, amt);
              addP(a.person, a.bucket === "sales" || a.bucket === "rec" ? a.bucket : "fd", amt);
            });
          } else {
            addU(byEntity, d.entity, d.amount);
            addU(byBU, d.bu, d.amount);
            const sr = d.sales_rep, rc = d.recruiter;
            if (sr && rc && sr.toLowerCase() !== rc.toLowerCase()) { addP(sr, "sales", d.amount); addP(rc, "rec", d.amount); }
            else addP(rc || sr, "fd", d.amount);
          }
        }
        // ── SF completeness check: perm starts in window vs tracker presence ──
        const iso = (dt) => dt.toISOString().slice(0, 10);
        const winStart = iso(new Date(d0.getTime() + 864e5)), winEnd = iso(new Date(d0.getTime() + 7 * 864e5));
        const intake = { window: winStart + " .. " + winEnd, found: 0, missingFromTrackers: [] };
        try {
          const sf = await runSalesforceQueryAll(env, "SELECT Id, bpats__Start_Date__c, bpats__Account__r.Name, bpats__ATS_Candidate__r.Name, Placement_Fee_Amount__c FROM bpats__Placement__c WHERE bpats__ATS_Job__r.bpats__Type__c = 'Permanent' AND Terminated_Date__c = null AND bpats__Start_Date__c >= " + winStart + " AND bpats__Start_Date__c <= " + winEnd);
          if (sf.ok) {
            intake.found = (sf.records || []).length;
            const canon = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
            for (const p of sf.records || []) {
              const nm = canon(p.bpats__ATS_Candidate__r && p.bpats__ATS_Candidate__r.Name);
              if (!drops.some((dd) => canon(dd.employee).indexOf(nm.slice(0, 12)) !== -1 || nm.indexOf(canon(dd.employee).slice(0, 12)) !== -1)) {
                const miss = { company: (p.bpats__Account__r && p.bpats__Account__r.Name) || "", employee: (p.bpats__ATS_Candidate__r && p.bpats__ATS_Candidate__r.Name) || "", fee: Number(p.Placement_Fee_Amount__c) || 0, start: p.bpats__Start_Date__c };
                intake.missingFromTrackers.push(miss);
                review.push({ company: miss.company, candidate: miss.employee, flags: ["dh_missing_from_tracker"], credits: ["SF perm start " + miss.start + " ($" + miss.fee + ") not found in any tracker — add via DH Editor or tracker"] });
              }
            }
          }
        } catch (e) {}
        const total = r2s(drops.reduce((s, d) => s + (d.split ? d.amount : d.amount), 0));
        return json({ ok: true, weekEnding, weekCol: labelCandidates[0], total, drops, byEntity, byBU, byPerson, review, intake }, 200, origin);
      } catch (e) { return json({ error: "dh-batch failed: " + String(e.message || e) }, 502, origin); }
    }

    if (url.pathname === "/dh-override") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      if (request.method === "GET") {
        const r = await sbService(env, "GET", "charge_dh_overrides?select=*&order=edited_at.desc&limit=300");
        return json({ ok: r.ok, rows: r.data }, r.ok ? 200 : 502, origin);
      }
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a charge admin" }, 403, origin);
      const CHARGE_PIN = String((env && env.CHARGE_ADMIN_PIN) || "5857");
      if (String(request.headers.get("X-Admin-Pin") || "") !== CHARGE_PIN) return json({ error: "bad admin pin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, origin); }
      if (body.op === "delete" && body.id) {
        const r = await sbService(env, "DELETE", "charge_dh_overrides?id=eq." + Number(body.id));
        return json({ ok: r.ok }, r.ok ? 200 : 502, origin);
      }
      if (body.op === "revert") {
        const wk = String(body.week_ending || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(wk)) return json({ error: "week_ending required" }, 400, origin);
        let q = "charge_dh_overrides?week_ending=eq." + wk + "&match_company=eq." + encodeURIComponent(String(body.match_company || "")) + "&match_employee=eq." + encodeURIComponent(String(body.match_employee || ""));
        if (body.match_entity) q += "&match_entity=eq." + encodeURIComponent(String(body.match_entity));
        const r = await sbService(env, "DELETE", q);
        return json({ ok: r.ok }, r.ok ? 200 : 502, origin);
      }
      if (body.op === "add_manual") {
        const m = body.row || {};
        const ins = await sbService(env, "POST", "charge_dh_schedule", [{ source: "manual", entity: m.entity || null, bu: m.bu || null, company: m.company || "", employee: m.employee || "", sales_rep: m.sales_rep || null, recruiter: m.recruiter || null, invoicing: null, burden_pct: 0, charge: Number(m.charge) || 0, interval: m.interval === "month" || m.interval === "week" ? m.interval : "lump", installments: Number(m.installments) || 1, weeks_paid: 0, first_we: m.first_we || body.week_ending, status: "active", notes: "manual add by " + email }]);
        return json({ ok: ins.ok, row: ins.data && ins.data[0] }, ins.ok ? 200 : 502, origin);
      }
      const o = { week_ending: body.week_ending || null, match_entity: body.match_entity || null, match_company: String(body.match_company || ""), match_employee: String(body.match_employee || ""), action: body.action === "hide" ? "hide" : "patch", fields: body.fields || null, edited_by: email, notes: body.notes || null };
      if (!o.match_company || !o.match_employee) return json({ error: "match_company & match_employee required" }, 400, origin);
      const r = await sbService(env, "POST", "charge_dh_overrides", [o]);
      return json({ ok: r.ok, row: r.data && r.data[0] }, r.ok ? 200 : 502, origin);
    }

    // ══════════════════════════════════════════════════════════════════════
    // TEAM EDITOR: /charge-people — GET roster · POST admin upsert/deactivate
    // The roster (charge_people) is the authority for who's active and which
    // BU/entity each internal member belongs to.
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname === "/charge-admin-check") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      return json({ ok: true, admin: MAP_ADMINS.indexOf(email) !== -1 }, 200, origin);
    }

    if (url.pathname === "/charge-people") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      if (request.method === "GET") {
        const r = await sbService(env, "GET", "charge_people?select=person,role,entity,bu,active&order=person.asc");
        return json({ ok: r.ok, rows: r.data }, r.ok ? 200 : 502, origin);
      }
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a charge admin" }, 403, origin);
      const CHARGE_PIN = String((env && env.CHARGE_ADMIN_PIN) || "5857");
      if (String(request.headers.get("X-Admin-Pin") || "") !== CHARGE_PIN) return json({ error: "bad admin pin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, origin); }
      const person = String(body.person || "").trim();
      if (!person) return json({ error: "person required" }, 400, origin);
      if (body.op === "deactivate" || body.op === "activate") {
        const r = await sbService(env, "PATCH", "charge_people?person=eq." + encodeURIComponent(person), { active: body.op === "activate" });
        return json({ ok: r.ok, row: r.data && r.data[0] }, r.ok ? 200 : 502, origin);
      }
      const row = { person, active: true };
      ["bu","entity","role"].forEach((k) => { if (body[k] !== void 0) row[k] = body[k]; });
      if (!row.entity && row.bu) row.entity = row.bu === "Ignite Search" ? "Ignite Search" : (row.bu === "BPO" ? "Spark Companies" : "Spark Talent");
      const r = await sbService(env, "POST", "charge_people?on_conflict=person", [row]);
      if (r.ok && body.targets && typeof body.targets === "object") {
        const unit = (r.data && r.data[0] && r.data[0].bu) || row.bu || "";
        if (unit) {
          const map = { q3i: ["q3", "igniter"], ai: ["annual", "igniter"], q3c: ["q3", "contest"], ac: ["annual", "contest"] };
          const trows = [];
          Object.keys(map).forEach((k) => { const v = Number(body.targets[k]); if (isFinite(v) && v > 0) trows.push({ person, unit, period: map[k][0], kind: map[k][1], amount: v }); });
          if (trows.length) await sbService(env, "POST", "charge_person_targets?on_conflict=person,unit,period,kind", trows);
        }
      }
      return json({ ok: r.ok, row: r.data && r.data[0] }, r.ok ? 200 : 502, origin);
    }

    if (url.pathname === "/dh-schedule") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      if (request.method === "GET") {
        const r = await sbService(env, "GET", "charge_dh_schedule?select=*&order=created_at.desc&limit=500");
        return json({ ok: r.ok, rows: r.data }, r.ok ? 200 : 502, origin);
      }
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a charge admin" }, 403, origin);
      const CHARGE_PIN = String((env && env.CHARGE_ADMIN_PIN) || "5857");
      if (String(request.headers.get("X-Admin-Pin") || "") !== CHARGE_PIN) return json({ error: "bad admin pin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      let body; try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, origin); }
      const id = Number(body && body.id);
      if (!id) return json({ error: "id required" }, 400, origin);
      const patch = {};
      ["interval","installments","weeks_paid","first_we","status","burden_pct","invoicing","charge","sales_rep","recruiter","entity","bu","company","employee","notes"].forEach((k) => { if (body[k] !== void 0) patch[k] = body[k]; });
      if (patch.invoicing !== void 0 && patch.charge === void 0) { const b = patch.burden_pct !== void 0 ? Number(patch.burden_pct) : null; if (b !== null) patch.charge = Math.round(Number(patch.invoicing) * (1 - b) * 100) / 100; }
      const r = await sbService(env, "PATCH", "charge_dh_schedule?id=eq." + id, patch);
      return json({ ok: r.ok, row: r.data && r.data[0] }, r.ok ? 200 : 502, origin);
    }

    // ══════════════════════════════════════════════════════════════════════
    // DIRECT HIRE — PROBE: /dh-probe
    // Read-only recon of (1) the SF Direct Hire report and (2) the seven
    // manual DH tracker workbooks, so the DH engine is built on verified shapes.
    // Optional params: &report=<id>  &tracker=<index>&sheet=<name>&range=A1:P40
    // ══════════════════════════════════════════════════════════════════════
    if (url.pathname === "/dh-probe") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const out = { ok: true, at: new Date().toISOString() };
      // ── 1) Salesforce DH report: describe + run ──
      const reportId = (url.searchParams.get("report") || "00OV50000042t1JMAQ").replace(/[^a-zA-Z0-9]/g, "");
      try {
        const tok = await getSalesforceToken(env);
        const H = { "Authorization": "Bearer " + tok.access_token, "Accept": "application/json" };
        const dR = await fetch(tok.instance_url + "/services/data/v60.0/analytics/reports/" + reportId + "/describe", { headers: H });
        const dD = await dR.json();
        if (!dR.ok) throw new Error(JSON.stringify(dD).slice(0, 200));
        const meta = dD.reportMetadata || {};
        const cols = {};
        const detCols = meta.detailColumns || [];
        const extended = (dD.reportExtendedMetadata && dD.reportExtendedMetadata.detailColumnInfo) || {};
        detCols.forEach((c) => { cols[c] = (extended[c] && extended[c].label) || c; });
        out.sfReport = {
          name: meta.name, reportType: meta.reportType && meta.reportType.type,
          detailColumns: cols,
          filters: (meta.reportFilters || []).map((f) => f.column + " " + f.operator + " " + f.value),
          dateFilter: meta.standardDateFilter || null
        };
        const rR = await fetch(tok.instance_url + "/services/data/v60.0/analytics/reports/" + reportId + "?includeDetails=true", { headers: H });
        const rD = await rR.json();
        if (!rR.ok) throw new Error(JSON.stringify(rD).slice(0, 200));
        const fm = rD.factMap || {};
        let rows = [];
        for (const k of Object.keys(fm)) {
          if (fm[k] && Array.isArray(fm[k].rows) && fm[k].rows.length) { rows = fm[k].rows; break; }
        }
        out.sfReport.sampleRows = rows.slice(0, 8).map((r) => (r.dataCells || []).map((c) => (c.label !== void 0 ? c.label : c.value)));
        out.sfReport.rowCount = rows.length;
        out.sfReport.allData = rD.allData;
      } catch (e) { out.sfError = String(e.message || e); }
      // ── 2) Tracker workbooks via Graph share resolution ──
      const TRACKERS = [
        { name: "Master (2024 Direct Hire Tracker Master)", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BDF08D9CB-5CF1-4744-9075-619F14A9F552%7D&file=2024%20Direct%20Hire%20Tracker%20Master.xlsx&fromShare=true&action=default&mobileredirect=true" },
        { name: "Packaging", share: "https://sparktalent.sharepoint.com/:x:/r/sites/SparkPackagingTeamSite/_layouts/15/Doc.aspx?sourcedoc=%7BC44470F8-DCDB-4F3E-85B6-77BD869BFE9B%7D&file=Packaging-%202024%20DH%20Tracker%20Template.xlsx&action=default&mobileredirect=true&wdsle=0&CID=897E83FE-F4C8-4BFE-9EE5-4FB5FA115F50&wdLOR=c551251C0-BE60-4FEB-B4C8-714E2DC31E12" },
        { name: "JJP", share: "https://sparktalent.sharepoint.com/:x:/r/sites/JohnJosephPartnersLLC/_layouts/15/Doc.aspx?sourcedoc=%7BE9CA7E68-DBC8-4F6E-B05C-63034B37BB33%7D&file=JJP-%202024%20DH%20Tracker%20Template.xlsx&wdLOR=cF6BF3837-577D-4480-AE57-6FB1A2121FC8&fromShare=true&action=default&mobileredirect=true" },
        { name: "Flex", share: "https://sparktalent.sharepoint.com/:x:/r/sites/FlexWorkforceSolutions/_layouts/15/Doc.aspx?sourcedoc=%7BF5371A1C-0C10-4B1F-A090-55B57B95516C%7D&file=Flex-%202024%20DH%20Tracker.xlsx&wdLOR=cB7D5741D-ABB1-455C-9750-1CC6D43D7DB1&fromShare=true&action=default&mobileredirect=true" },
        { name: "Ignite", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BF52BF0E1-3985-4FA2-B8C3-C063279E71B5%7D&file=Ignite-%202024%20DH%20Tracker.xlsx&wdLOR=c49888525-0F93-458A-B3E2-61064DF907B1&fromShare=true&action=default&mobileredirect=true" },
        { name: "Spark Companies", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7B0542B573-F958-41FF-9BB1-4E5CB04CF363%7D&file=Spark%20Companies%202024%20DH%20Tracker.xlsx&wdLOR=c81E484C9-98DD-453A-9B76-637D59E3F685&fromShare=true&action=default&mobileredirect=true" },
        { name: "Bolt", share: "https://sparktalent.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BC6BA04FD-8A6E-4D2F-B5A1-224A9880F10A%7D&file=Bolt-%202025%20DH%20Tracker%20-%20Copy.xlsx&action=default&mobileredirect=true&CID=72A32F3D-08A6-476E-AAF7-9CF051163281&wdLOR=cC295F8FA-ECD8-496A-AEA7-CBBA88BF8E91" }
      ];
      const onlyIdx = url.searchParams.get("tracker");
      const wantSheet = url.searchParams.get("sheet");
      const wantRange = (url.searchParams.get("range") || "A1:P40").replace(/[^A-Za-z0-9:]/g, "");
      out.trackers = [];
      try {
        const gt = await getGraphToken(env);
        const GH = { "Authorization": "Bearer " + gt, "Accept": "application/json" };
        for (let i = 0; i < TRACKERS.length; i++) {
          if (onlyIdx !== null && onlyIdx !== "" && Number(onlyIdx) !== i) continue;
          const t = { i, name: TRACKERS[i].name };
          try {
            const shareTok = "u!" + btoa(TRACKERS[i].share).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
            const sR = await fetch("https://graph.microsoft.com/v1.0/shares/" + shareTok + "/driveItem?$select=id,name,parentReference", { headers: GH });
            const sD = await sR.json();
            if (!sR.ok) throw new Error((sD.error && sD.error.message) || ("share " + sR.status));
            t.file = sD.name;
            const B = "https://graph.microsoft.com/v1.0/drives/" + sD.parentReference.driveId + "/items/" + sD.id;
            const wR = await fetch(B + "/workbook/worksheets?$select=name,visibility", { headers: GH });
            const wD = await wR.json();
            if (!wR.ok) throw new Error((wD.error && wD.error.message) || ("sheets " + wR.status));
            t.sheets = (wD.value || []).map((x) => x.name);
            const pick = wantSheet && t.sheets.indexOf(wantSheet) !== -1 ? wantSheet : t.sheets[t.sheets.length - 1];
            if (pick) {
              const safe = encodeURIComponent(pick.replace(/'/g, "''"));
              const rR = await fetch(B + "/workbook/worksheets('" + safe + "')/range(address='" + wantRange + "')?$select=values", { headers: GH });
              const rD = await rR.json();
              if (!rR.ok) throw new Error((rD.error && rD.error.message) || ("range " + rR.status));
              t.sampledSheet = pick;
              t.sample = (rD.values || []).filter((row) => row.some((c) => c !== null && c !== "" && c !== 0)).slice(0, 14);
            }
          } catch (e) { t.error = String(e.message || e); }
          out.trackers.push(t);
        }
      } catch (e) { out.graphError = String(e.message || e); }
      return json(out, 200, origin);
    }

    if (url.pathname === "/charge-history") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
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
        const unitWeeks = await sbAll("charge_unit_weeks?select=week_ending,unit,kind,charge&order=week_ending.asc");
        const units = await sbAll("charge_units?select=unit,is_entity,ath,ath_we");
        const unitTargets = await sbAll("charge_unit_targets?select=unit,period,amount");
        const people = await sbAll("charge_people?select=person,role,entity,bu,active,cum_raw,monthly_raw,quarterly_raw,rec_ath,sales_ath,fd_ath,tt_ath");
        const personWeeks = await sbAll("charge_person_weeks?select=week_ending,person,sales,fd,rec,tt,raw&order=week_ending.asc");
        const personTargets = await sbAll("charge_person_targets?select=person,unit,period,kind,amount");
        let dh = [];
        const dhLatest = await sbService(env, "GET", "charge_dh_snap?select=week_ending&order=week_ending.desc&limit=1");
        if (dhLatest.ok && Array.isArray(dhLatest.data) && dhLatest.data[0]) {
          dh = await sbAll("charge_dh_snap?select=week_ending,entity,bu,company,sales_rep,recruiter,charge,week_num,of_weeks,weeks_remaining,employee&week_ending=eq." + dhLatest.data[0].week_ending);
        }
        let lastImported = null;
        unitWeeks.forEach((r) => { if (!lastImported || r.week_ending > lastImported) lastImported = r.week_ending; });
        return json({ ok: true, lastImported, unitWeeks, units, unitTargets, people, personWeeks, personTargets, dh }, 200, origin);
      } catch (e) {
        return json({ error: "history failed: " + String(e.message || e) }, 502, origin);
      }
    }

    if (url.pathname === "/charge-snapshot") {
      const who = await verifyUser(request, env);
      if (who.ok !== true) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      const MAP_ADMINS = ["aspegel@sparkcompanies.com","mpatrico@sparkcompanies.com","pmalani@sparkcompanies.com","aopalewski@sparkcompanies.com","eurisitti@sparkcompanies.com","bnamma@sparkcompanies.com","bnaama@sparkcompanies.com"];
      let email = String(who.email || (who.user && who.user.email) || "").toLowerCase();
      if (email === "") { try { const t=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim(); const seg=t.split(".")[1]||""; email=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).email||"").toLowerCase(); } catch(e){} }
      if (MAP_ADMINS.indexOf(email) === -1) return json({ error: "not a charge admin" }, 403, origin);
      const CHARGE_PIN = String((env && env.CHARGE_ADMIN_PIN) || "5857");
      if (String(request.headers.get("X-Admin-Pin") || "") !== CHARGE_PIN) return json({ error: "bad admin pin" }, 403, origin);
      if (request.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
      const weekEnding = (url.searchParams.get("weekEnding") || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) return json({ error: "weekEnding=YYYY-MM-DD required" }, 400, origin);
      try {
        // Re-run the live engine for that week and freeze its output.
        const bR = await fetch(url.origin + "/charge-batch?weekEnding=" + weekEnding, { headers: { "Authorization": request.headers.get("Authorization") || "" } });
        const b = await bR.json();
        if (!b || !b.ok) return json({ error: "engine failed: " + ((b && b.error) || bR.status) }, 502, origin);
        const r2s = (n) => Math.round((Number(n) || 0) * 100) / 100;
        const unitRows = [];
        ((b.rollups && b.rollups.byEntity) || []).forEach((r) => unitRows.push({ week_ending: weekEnding, unit: r.key, kind: "contract", charge: r2s(r.charge) }));
        ((b.rollups && b.rollups.byBU) || []).forEach((r) => unitRows.push({ week_ending: weekEnding, unit: r.key, kind: "contract", charge: r2s(r.charge) }));
        const bucket = (t) => { t = String(t || "").toLowerCase(); if (t.indexOf("full") !== -1) return "fd"; if (t.indexOf("recruit") !== -1) return "rec"; if (t.indexOf("account") !== -1 || t.indexOf("sales") !== -1) return "sales"; return null; };
        const ppl = {};
        (b.rows || []).forEach((row) => {
          const seen = {};
          (row.credits || []).forEach((c) => {
            const n = c.recipient; if (!n) return;
            const p = ppl[n] || (ppl[n] = { sales: 0, fd: 0, rec: 0, tt: 0 });
            if (!seen[n]) { p.tt += row.charge; seen[n] = 1; }
            const bk = bucket(c.type); if (bk) p[bk] += row.charge;
          });
        });
        const personRows = Object.keys(ppl).map((n) => ({ week_ending: weekEnding, person: n, sales: r2s(ppl[n].sales), fd: r2s(ppl[n].fd), rec: r2s(ppl[n].rec), tt: r2s(ppl[n].tt), raw: null }));
        const u1 = await sbService(env, "POST", "charge_unit_weeks?on_conflict=week_ending,unit,kind", unitRows);
        if (!u1.ok) return json({ error: "unit upsert failed: " + JSON.stringify(u1.data).slice(0, 160) }, 502, origin);
        // merge DH drops into the freeze (self-fetch dh-batch)
        let dhInfo = null;
        try {
          const dR = await fetch(url.origin + "/charge-dh?weekEnding=" + weekEnding, { headers: { "Authorization": request.headers.get("Authorization") || "" } });
          const dj = await dR.json();
          if (dj && dj.ok) {
            dhInfo = { total: dj.total, drops: dj.drops.length };
            Object.keys(dj.byEntity || {}).forEach((u) => unitRows.push({ week_ending: weekEnding, unit: u, kind: "direct", charge: dj.byEntity[u] }));
            Object.keys(dj.byBU || {}).forEach((u) => unitRows.push({ week_ending: weekEnding, unit: u + " \u00b7 DH", kind: "direct", charge: dj.byBU[u] }));
            Object.keys(dj.byPerson || {}).forEach((n) => {
              const p = dj.byPerson[n];
              let row = personRows.find((x) => x.person === n);
              if (!row) { row = { week_ending: weekEnding, person: n, sales: 0, fd: 0, rec: 0, tt: 0, raw: null }; personRows.push(row); }
              row.sales = r2s(row.sales + p.sales); row.fd = r2s(row.fd + p.fd); row.rec = r2s(row.rec + p.rec); row.tt = r2s(row.tt + p.tt);
            });
            // advance paid counters for dropped schedules
            for (const d of dj.drops) {
              try { await sbService(env, "PATCH", "charge_dh_schedule?id=eq." + d.id, { weeks_paid: (Number(d.drop.split(" ")[0]) || 0), status: d.remaining <= 0 ? "done" : "active" }); } catch (e2) {}
            }
          }
        } catch (e) {}
        const u2 = await sbService(env, "POST", "charge_person_weeks?on_conflict=week_ending,person", personRows);
        if (!u2.ok) return json({ error: "person upsert failed: " + JSON.stringify(u2.data).slice(0, 160) }, 502, origin);
        return json({ ok: true, weekEnding, unitRows: unitRows.length, personRows: personRows.length, contractTotal: b.summary && b.summary.totalCharge, dh: dhInfo, note: "Contract + DH frozen into the books." }, 200, origin);
      } catch (e) {
        return json({ error: "snapshot failed: " + String(e.message || e) }, 502, origin);
      }
    }

    if (url.pathname === "/charge-batch") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);
      let weekEnding = (url.searchParams.get("weekEnding") || "").trim();
      const wantDebug = url.searchParams.get("debug") === "1";
      try {
        if (!weekEnding) {
          const latest = await runSalesforceQuery(env, "SELECT ASYMBL_Time__Pay_Period_End_Date__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c != null AND ASYMBL_Time__Pay_Period_End_Date__c <= TODAY ORDER BY ASYMBL_Time__Pay_Period_End_Date__c DESC LIMIT 1");
          if (latest.ok && latest.records && latest.records[0]) weekEnding = latest.records[0].ASYMBL_Time__Pay_Period_End_Date__c;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) return json({ error: "weekEnding=YYYY-MM-DD required" }, 400, origin);

        // ── 1) Salesforce pulls ─────────────────────────────────────────────
        const tsSoql = "SELECT Id, ASYMBL_Time__Candidate_Name__c, ASYMBL_Time__Regular_Hours__c, ASYMBL_Time__Overtime_Hours__c, ASYMBL_Time__Double_Time_Hours__c, ASYMBL_Time__Total_Hours_Logged__c, ASYMBL_Time__Overtime_Bill_Rate__c, ASYMBL_Time__Double_Time_Bill_Rate__c, Placement__c, Placement__r.Name, Placement__r.bpats__Pay_Rate__c, Placement__r.bpats__Bill_Rate__c, Placement__r.bpats__Burden_Percentage__c, Placement__r.Division__c, Placement__r.bpats__Account__r.Name, Placement__r.bpats__ATS_Job__c, Placement__r.bpats__ATS_Job__r.Subdivision__c FROM ASYMBL_Time__Timesheet__c WHERE ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding + " AND ASYMBL_Time__Total_Hours_Logged__c > 0 AND Placement__c != null";
        const tsRes = await runSalesforceQueryAll(env, tsSoql);
        if (!tsRes.ok) return json({ error: "Timesheet query failed: " + tsRes.error }, 502, origin);

        const crSoql = "SELECT Id, Name, bpats__Credit_Recipient__c, bpats__User__c, bpats__ATS_Role_Type__c, bpats__Placement__c, Timesheet_Timesheet__c FROM bpats__Placement_Credit__c WHERE Timesheet_Timesheet__r.ASYMBL_Time__Pay_Period_End_Date__c = " + weekEnding + " AND bpats__Is_Void__c = false";
        const crRes = await runSalesforceQueryAll(env, crSoql);
        if (!crRes.ok) return json({ error: "Credit query failed: " + crRes.error }, 502, origin);

        // ── 2) Supabase rules (shared with the invoicing agent) ─────────────
        const clientMap = {};   // sf account name -> { company, entity }
        try {
          const r = await sbService(env, "GET", "fin_client_map?select=sf_account_name,xero_contact,invoicing_entity");
          if (r && r.ok && Array.isArray(r.data)) r.data.forEach((m) => { clientMap[m.sf_account_name] = { company: m.xero_contact || m.sf_account_name, entity: m.invoicing_entity || null }; });
        } catch (e) {}
        const rateRules = {};   // sf account name -> { mode, ot, dt }
        try {
          const r = await sbService(env, "GET", "fin_ot_dt_rules?select=sf_account_name,rate_mode,ot_multiplier,dt_multiplier");
          if (r && r.ok && Array.isArray(r.data)) r.data.forEach((m) => { rateRules[m.sf_account_name] = { mode: m.rate_mode || "unset", ot: m.ot_multiplier, dt: m.dt_multiplier }; });
        } catch (e) {}
        const recipAlias = { "House": "House Account", "Asymbl Admin": "House Account", "Nicholas Greenfelder": "Nick Greenfelder", "Kazeem Olaniyan": "CJ Olaniyan" };
        try {
          const r = await sbService(env, "GET", "charge_name_aliases?select=sf_name,display_name");
          if (r && r.ok && Array.isArray(r.data)) r.data.forEach((m) => { recipAlias[m.sf_name] = m.display_name; });
        } catch (e) {}
        const creditRename = { "Sales Credit": "Account Manager", "Recruiter Credit": "Recruiter", "Full Desk Credit": "Full Desk", "House Credit": "House Credit" };

        // ── 3) Group credits by timesheet, collapse duplicates ──────────────
        const creditsByTs = {};
        (crRes.records || []).forEach((c) => {
          const k = c.Timesheet_Timesheet__c || ("P|" + c.bpats__Placement__c);
          (creditsByTs[k] = creditsByTs[k] || []).push(c);
        });

        // ── 4) Build rows ────────────────────────────────────────────────────
        const rows = [];
        const review = [];
        const dbg = { timesheets: (tsRes.records || []).length, creditRecords: (crRes.records || []).length, dupCreditsCollapsed: 0, mappedAccounts: 0, unmappedAccounts: {}, missingRateRule: {}, skippedNoPlacement: 0 };
        const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
        const r4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;

        for (const ts of tsRes.records || []) {
          const pl = ts.Placement__r || {};
          const acct = (pl.bpats__Account__r && pl.bpats__Account__r.Name) || "(no account)";
          const cand = ts.ASYMBL_Time__Candidate_Name__c || "Unknown";
          const map = clientMap[acct];
          if (map) dbg.mappedAccounts++; else dbg.unmappedAccounts[acct] = (dbg.unmappedAccounts[acct] || 0) + 1;
          const company = map ? map.company : acct;
          const entity = pl.Division__c || (map && map.entity) || null;
          const bu = (pl.bpats__ATS_Job__r && pl.bpats__ATS_Job__r.Subdivision__c) || null;

          // Job title: placement name is "Account… - Title" (candidate suffix when present)
          let title = String(pl.Name || "");
          if (title.toLowerCase().indexOf(String(acct).toLowerCase()) === 0) title = title.slice(String(acct).length);
          title = title.replace(/^[\s\-–]+/, "");
          const candIdx = cand !== "Unknown" ? title.toLowerCase().lastIndexOf(cand.toLowerCase()) : -1;
          if (candIdx > 0) title = title.slice(0, candIdx).replace(/[\s\-–]+$/, "");

          const pay = Number(pl.bpats__Pay_Rate__c) || 0;
          const bill = Number(pl.bpats__Bill_Rate__c) || 0;
          let burden = Number(pl.bpats__Burden_Percentage__c) || 0;
          if (burden > 1) burden = burden / 100; // SF percent fields arrive as 23.0
          const regH = Number(ts.ASYMBL_Time__Regular_Hours__c) || 0;
          const otH = Number(ts.ASYMBL_Time__Overtime_Hours__c) || 0;
          const dtH = Number(ts.ASYMBL_Time__Double_Time_Hours__c) || 0;
          const totH = Number(ts.ASYMBL_Time__Total_Hours_Logged__c) || 0;

          // OT/DT bill rates: rate rule multiplier wins; else timesheet's explicit rates; else 0
          const rule = rateRules[acct] || null;
          if (!rule && (otH > 0 || dtH > 0)) dbg.missingRateRule[acct] = (dbg.missingRateRule[acct] || 0) + 1;
          const otMult = rule && rule.mode === "multiplier" && rule.ot != null ? Number(rule.ot) : null;
          const dtMult = rule && rule.mode === "multiplier" && rule.dt != null ? Number(rule.dt) : null;
          const otBill = otMult != null ? bill * otMult : (Number(ts.ASYMBL_Time__Overtime_Bill_Rate__c) || 0);
          const dtBill = dtMult != null ? bill * dtMult : (Number(ts.ASYMBL_Time__Double_Time_Bill_Rate__c) || 0);
          const otPay = pay * 1.5, dtPay = pay * 2;

          const regM = bill - pay * (1 + burden);
          const otM = otBill - otPay * (1 + burden);
          const dtM = dtBill - dtPay * (1 + burden);
          const vacM = -(bill - pay) * (1 + burden);
          const vacH = 0; // Phase C: Payables Worksheet
          const charge = regH * regM + otH * otM + dtH * dtM + vacH * vacM;

          // Credits: collapse exact duplicates, then pick the canonical set
          const raw = creditsByTs[ts.Id] || [];
          const seen = {};
          let credits = [];
          raw.forEach((c) => {
            const key = (c.Name || "") + "|" + (c.bpats__Credit_Recipient__c || "");
            if (seen[key]) { dbg.dupCreditsCollapsed++; return; }
            seen[key] = 1;
            credits.push({ id: c.Id, type: c.Name || "", recipient: c.bpats__Credit_Recipient__c || "", userId: c.bpats__User__c || null, roleType: c.bpats__ATS_Role_Type__c || "" });
          });
          const flags = [];
          const sales = credits.filter((c) => c.type === "Sales Credit");
          const recr = credits.filter((c) => c.type === "Recruiter Credit");
          const full = credits.filter((c) => c.type === "Full Desk Credit");
          const house = credits.filter((c) => c.type === "House Credit");
          let kept;
          if (sales.length && recr.length) { kept = [sales[0], recr[0]]; if (credits.length > 2) flags.push("extra_credits"); }
          else if (full.length) { kept = [full[0]]; if (sales.length) kept.push(sales[0]); if (credits.length > kept.length) flags.push("extra_credits"); }
          else if (credits.length === 1 && house.length === 1) { kept = credits; flags.push("lone_house"); }
          else if (credits.length === 0) { kept = []; flags.push("no_credits"); }
          else { kept = credits; if (credits.length > 2) flags.push("extra_credits"); }
          if (!map) flags.push("unmapped_account");
          if (!bu) flags.push("no_bu");
          if ((otH > 0 && otBill === 0) || (dtH > 0 && dtBill === 0)) flags.push("unbilled_ot");

          const creditsOut = kept.map((c) => ({
            id: c.id,
            type: creditRename[c.type] || c.type,
            recipient: recipAlias[c.recipient] || c.recipient,
            userId: c.userId
          }));
          if (flags.length) review.push({ tsId: ts.Id, placementId: ts.Placement__c, company, candidate: cand, flags, credits: creditsOut.map((c) => c.type + "→" + c.recipient) });

          rows.push({
            tsId: ts.Id, placementId: ts.Placement__c, jobId: pl.bpats__ATS_Job__c || null,
            company, entity, bu, title, account: acct, candidate: cand,
            pay: r2(pay), otPay: r2(otPay), dtPay: r2(dtPay),
            bill: r2(bill), otBill: r2(otBill), dtBill: r2(dtBill),
            otMult: otMult, dtMult: dtMult, burden: r4(burden),
            regHrs: regH, otHrs: otH, dtHrs: dtH, vacHrs: vacH, totalHrs: totH,
            regMargin: r4(regM), otMargin: r4(otM), dtMargin: r4(dtM), vacMargin: r4(vacM),
            charge: r2(charge),
            credits: creditsOut, flags
          });
        }

        rows.sort((a, b) => (a.company || "").localeCompare(b.company || "") || (a.candidate || "").localeCompare(b.candidate || ""));

        // ── 4.5) Phase C: Payable Worksheet — vacation + manual pays (v3) ───
        const payables = { attempted: false };
        if (url.searchParams.get("payables") !== "0") {
          payables.attempted = true;
          try {
            const gt = await getGraphToken(env);
            const GH = { "Authorization": "Bearer " + gt, "Accept": "application/json" };
            const shareUrl = "https://sparktalent-my.sharepoint.com/:x:/g/personal/timecards_sparktalentinc_com/IQCNdykcRQJLRKsOAFZyxYT3ATQz4Y_-30tpSh40h2OGwSo";
            const shareTok = "u!" + btoa(shareUrl).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
            const sR = await fetch("https://graph.microsoft.com/v1.0/shares/" + shareTok + "/driveItem?$select=id,parentReference", { headers: GH });
            const sD = await sR.json();
            if (!sR.ok) throw new Error((sD.error && sD.error.message) || "share resolve failed");
            const B = "https://graph.microsoft.com/v1.0/drives/" + sD.parentReference.driveId + "/items/" + sD.id;
            const wr = await fetch(B + "/workbook/worksheets?$select=name", { headers: GH });
            const wd = await wr.json();
            if (!wr.ok) throw new Error((wd.error && wd.error.message) || "worksheets failed");
            const parts = weekEnding.split("-");
            const short = Number(parts[1]) + "-" + Number(parts[2]) + "-" + parts[0].slice(2);
            const normName = (s) => String(s).trim().toLowerCase().replace(/^we\s+/, "");
            const target = (wd.value || []).map((x) => x.name).find((n) => normName(n) === short) || null;
            payables.sheet = target || null;
            if (!target) { payables.note = "No sheet named '" + short + "' or 'WE " + short + "' yet."; }
            else {
              const safe = encodeURIComponent(target.replace(/'/g, "''"));
              const rr = await fetch(B + "/workbook/worksheets('" + safe + "')/range(address='A1:X200')?$select=values", { headers: GH });
              const rd = await rr.json();
              if (!rr.ok) throw new Error((rd.error && rd.error.message) || "range failed");
              const grid = rd.values || [];
              const SECTION = /^(advance|exepnses|expenses|shift premium|overpayment|bonus|reimburse|deduction|two rates|manual pay|vacation)/i;
              const findCell = (re) => { for (let r = 0; r < grid.length; r++) { const row = grid[r] || []; for (let c = 0; c < row.length; c++) { if (re.test(String(row[c] || "").trim())) return { r, c }; } } return null; };
              // A block title can sit in a vertically-merged cell, so the header row
              // ("Team Member"...) may be a few rows off from the title cell. Hunt ±4.
              const findHeader = (anchor) => {
                for (let dr = -4; dr <= 4; dr++) {
                  const r = anchor.r + dr; if (r < 0 || r >= grid.length) continue;
                  const row = grid[r] || [];
                  for (let c = anchor.c; c < Math.min(row.length, anchor.c + 6); c++) {
                    if (/team member/i.test(String(row[c] || ""))) return { r, cName: c };
                  }
                }
                return null;
              };
              const labelCol = (rowIdx, fromC, re, span) => { const row = grid[rowIdx] || []; for (let c = fromC; c < Math.min(row.length, fromC + (span || 10)); c++) { if (re.test(String(row[c] || "").trim().toLowerCase())) return c; } return null; };
              const canon = (s) => String(s || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
              const lev = (a, b) => { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = []; for (let j = 0; j <= n; j++) prev[j] = j; for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) { const c = a[i - 1] === b[j - 1] ? 0 : 1; cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c); } prev = cur; } return prev[n]; };
              const ratio = (a, b) => { const L = Math.max(a.length, b.length); return L === 0 ? 1 : 1 - lev(a, b) / L; };
              const pool = rows.map((r, i) => ({ i, nk: canon(r.candidate), ak: canon(r.account + " " + r.company) }));
              const matchRow = (name, client) => {
                const nk = canon(name); if (!nk) return -1;
                const ct = canon(client).split(" ").filter((w) => w.length >= 3)[0] || "";
                let best = null;
                for (const p of pool) {
                  let s = p.nk === nk ? 1 : ratio(nk, p.nk);
                  if (s < 0.7) continue;
                  if (ct && p.ak.indexOf(ct) !== -1) s += 0.08;
                  if (!best || s > best.s) best = { p, s };
                }
                return best && best.s >= 0.86 ? best.p.i : -1;
              };
              const readNames = (hdr, cb) => {
                for (let r = hdr.r + 1; r < grid.length; r++) {
                  const row = grid[r] || []; const name = String(row[hdr.cName] || "").trim();
                  if (!name) { const nxt = String((grid[r + 1] || [])[hdr.cName] || "").trim(); if (!nxt) break; else continue; }
                  if (SECTION.test(name) || /team member/i.test(name)) break;
                  cb(row, name);
                }
              };
              // Vacation block
              const vacEntries = [];
              const vT = findCell(/^vacation$/i);
              const vH = vT && findHeader(vT);
              if (vH) {
                const cC = labelCol(vH.r, vH.cName, /^client/), cH = labelCol(vH.r, vH.cName, /total hours|^hours$/);
                if (cH != null) readNames(vH, (row, name) => {
                  const h = Number(row[cH]);
                  if (h) vacEntries.push({ name, client: cC != null ? String(row[cC] || "").trim() : "", hours: h });
                });
              }
              // Manual Pay block — columns read BY HEADER LABEL: Regular / OT / DT
              const manEntries = [];
              const mT = findCell(/^manual pay/i);
              const mH = mT && findHeader(mT);
              if (mH) {
                const cC = labelCol(mH.r, mH.cName, /^client/);
                const cW = labelCol(mH.r, mH.cName, /weekend/);
                let cReg = labelCol(mH.r, mH.cName, /^reg/), cOt = labelCol(mH.r, mH.cName, /^ot$/), cDt = labelCol(mH.r, mH.cName, /^dt$|double/);
                if (cReg == null && cW != null) { cReg = cW + 1; cOt = cW + 2; cDt = cW + 3; } // positional fallback
                if (cReg != null) readNames(mH, (row, name) => {
                  const n = (c) => { const v = c != null ? row[c] : null; return typeof v === "number" && isFinite(v) ? v : 0; };
                  const reg = n(cReg), ot = n(cOt), dt = n(cDt);
                  if (reg || ot || dt) manEntries.push({ name, client: cC != null ? String(row[cC] || "").trim() : "", reg, ot, dt });
                });
              }
              // Merge vacation
              payables.vacation = { entries: vacEntries.length, matched: 0, vacationOnlyAdded: 0, unmatched: [] };
              const vacOnly = [];
              vacEntries.forEach((e) => {
                const i = matchRow(e.name, e.client);
                if (i < 0) { vacOnly.push(e); return; }
                const r = rows[i]; r.vacHrs = r2((r.vacHrs || 0) + e.hours); if (r.flags.indexOf("vacation") === -1) r.flags.push("vacation");
                payables.vacation.matched++;
              });
              // Full-week vacation (no timesheet): look their placement up in SF and add a vacation-only row
              for (const e of vacOnly.slice(0, 10)) {
                let added = false;
                try {
                  const toks = canon(e.name).split(" ").filter((w) => w.length >= 3);
                  if (toks.length >= 2) {
                    const like = "%" + toks[0].replace(/'/g, "\\'") + "%" + toks[toks.length - 1].replace(/'/g, "\\'") + "%";
                    const q = await runSalesforceQuery(env, "SELECT Id, Name, bpats__Pay_Rate__c, bpats__Bill_Rate__c, bpats__Burden_Percentage__c, Division__c, bpats__Account__r.Name, bpats__ATS_Job__c, bpats__ATS_Job__r.Subdivision__c, bpats__Candidate__r.Name FROM bpats__Placement__c WHERE bpats__Candidate__r.Name LIKE '" + like + "' ORDER BY CreatedDate DESC LIMIT 5");
                    if (q.ok && q.records && q.records.length) {
                      const ct = canon(e.client).split(" ").filter((w) => w.length >= 3)[0] || "";
                      const pick = q.records.find((p) => ct && canon((p.bpats__Account__r && p.bpats__Account__r.Name) || "").indexOf(ct) !== -1) || q.records[0];
                      const acct = (pick.bpats__Account__r && pick.bpats__Account__r.Name) || "(no account)";
                      const map = clientMap[acct];
                      const pay = Number(pick.bpats__Pay_Rate__c) || 0, bill = Number(pick.bpats__Bill_Rate__c) || 0;
                      let burden = Number(pick.bpats__Burden_Percentage__c) || 0; if (burden > 1) burden = burden / 100;
                      const vacM = -(bill - pay) * (1 + burden);
                      let title = String(pick.Name || "");
                      if (title.toLowerCase().indexOf(String(acct).toLowerCase()) === 0) title = title.slice(String(acct).length);
                      title = title.replace(/^[\s\-–]+/, "");
                      rows.push({
                        tsId: null, placementId: pick.Id, jobId: pick.bpats__ATS_Job__c || null,
                        company: map ? map.company : acct, entity: pick.Division__c || (map && map.entity) || null,
                        bu: (pick.bpats__ATS_Job__r && pick.bpats__ATS_Job__r.Subdivision__c) || null,
                        title, account: acct, candidate: (pick.bpats__Candidate__r && pick.bpats__Candidate__r.Name) || e.name,
                        pay: r2(pay), otPay: r2(pay * 1.5), dtPay: r2(pay * 2), bill: r2(bill), otBill: 0, dtBill: 0,
                        otMult: null, dtMult: null, burden: r4(burden),
                        regHrs: 0, otHrs: 0, dtHrs: 0, vacHrs: e.hours, totalHrs: 0,
                        regMargin: r4(bill - pay * (1 + burden)), otMargin: 0, dtMargin: 0, vacMargin: r4(vacM),
                        charge: r2(e.hours * vacM),
                        credits: [], flags: ["vacation", "vacation_only"]
                      });
                      review.push({ tsId: null, placementId: pick.Id, company: map ? map.company : acct, candidate: e.name, flags: ["vacation_only"], credits: ["Full-week vacation " + e.hours + "h — no timesheet; credits not attributed"] });
                      payables.vacation.vacationOnlyAdded++;
                      added = true;
                    }
                  }
                } catch (e2) {}
                if (!added) { payables.vacation.unmatched.push(e); review.push({ tsId: null, placementId: null, company: e.client || "(payables)", candidate: e.name, flags: ["vac_unmatched"], credits: ["Vacation " + e.hours + "h — no match found"] }); }
              }
              // Merge manual pays (Regular / OT / DT by header)
              payables.manualPay = { entries: manEntries.length, matched: 0, unmatched: [] };
              manEntries.forEach((e) => {
                const i = matchRow(e.name, e.client);
                if (i < 0) { payables.manualPay.unmatched.push(e); review.push({ tsId: null, placementId: null, company: e.client || "(payables)", candidate: e.name, flags: ["manual_unmatched"], credits: ["Manual pay " + (e.reg + e.ot + e.dt) + "h — no timesheet match"] }); return; }
                const r = rows[i];
                r.regHrs = r2(r.regHrs + e.reg); r.otHrs = r2(r.otHrs + e.ot); r.dtHrs = r2(r.dtHrs + e.dt);
                r.totalHrs = r2(r.totalHrs + e.reg + e.ot + e.dt);
                r.manualReg = r2((r.manualReg || 0) + e.reg); r.manualOt = r2((r.manualOt || 0) + e.ot); r.manualDt = r2((r.manualDt || 0) + e.dt);
                if (r.flags.indexOf("manual_pay") === -1) r.flags.push("manual_pay");
                payables.manualPay.matched++;
              });
              // Recompute charges with merged hours
              rows.forEach((r) => { r.charge = r2(r.regHrs * r.regMargin + r.otHrs * r.otMargin + r.dtHrs * r.dtMargin + (r.vacHrs || 0) * r.vacMargin); });
            }
          } catch (e) { payables.error = String(e.message || e); }
        }

        // ── 5) Rollups ───────────────────────────────────────────────────────
        const roll = (keyFn) => {
          const m = {};
          rows.forEach((r) => {
            const k = keyFn(r) || "(none)";
            const o = (m[k] = m[k] || { charge: 0, hours: 0, placements: 0 });
            o.charge += r.charge; o.hours += r.totalHrs; o.placements++;
          });
          return Object.keys(m).sort((a, b) => m[b].charge - m[a].charge).map((k) => ({ key: k, charge: r2(m[k].charge), hours: r2(m[k].hours), placements: m[k].placements }));
        };
        const byRecipient = (() => {
          const m = {};
          rows.forEach((r) => {
            const seenP = {};
            (r.credits || []).forEach((c) => {
              const k = c.recipient || "(none)";
              if (seenP[k]) return; seenP[k] = 1; // full-desk counts once per placement
              const o = (m[k] = m[k] || { charge: 0, hours: 0, placements: 0 });
              o.charge += r.charge; o.hours += r.totalHrs; o.placements++;
            });
          });
          return Object.keys(m).sort((a, b) => m[b].charge - m[a].charge).map((k) => ({ key: k, charge: r2(m[k].charge), hours: r2(m[k].hours), placements: m[k].placements }));
        })();

        const total = r2(rows.reduce((s, r) => s + r.charge, 0));
        const hours = r2(rows.reduce((s, r) => s + r.totalHrs, 0));
        const out = {
          ok: true,
          summary: { weekEnding, placements: rows.length, totalCharge: total, totalHours: hours, vacationHours: r2(rows.reduce((s, r) => s + (r.vacHrs || 0), 0)), manualHours: r2(rows.reduce((s, r) => s + (r.manualReg || 0) + (r.manualOt || 0) + (r.manualDt || 0), 0)), reviewCount: review.length, loneHouse: review.filter((x) => x.flags.indexOf("lone_house") !== -1).length },
          payables,
          rollups: { byCompany: roll((r) => r.company), byEntity: roll((r) => r.entity), byBU: roll((r) => r.bu), byRecipient },
          review,
          rows
        };
        if (wantDebug) out.debug = dbg;
        return json(out, 200, origin);
      } catch (e) {
        return json({ error: String(e.message || e) }, 502, origin);
      }
    }

// ════════════════════════════════════════════════════════════════════════════
// CHARGE REPORT — PHASE A: /charge-probe
// ════════════════════════════════════════════════════════════════════════════
// One-shot discovery for the Charge Report build. Read-only. Writes nothing.
//
// WHERE TO PASTE: inside the fetch handler in worker.js, directly ABOVE the
// final line:   return json({ error: "Not found" }, 404, origin);
// It uses only helpers that already exist in the worker (verifyUser,
// getSalesforceToken, getGraphToken, runSalesforceQuery, json).
//
// HOW TO RUN (browser console on Spark HQ while signed in):
//
//   SPARK_SB.getToken().then(t =>
//     fetch('https://spark-hq-worker.sparkcompanies.workers.dev/charge-probe', {
//       headers: { Authorization: 'Bearer ' + t }
//     }).then(r => r.json())
//   ).then(j => { console.log(j); copy(JSON.stringify(j, null, 2)); alert('Probe JSON copied to clipboard'); });
//
// Optional params:
//   ?reportId=00OV50000030xnxMAA   (defaults to the Charge Report Credits report)
//   ?sheet=SheetName&range=A1:R60  (peek a specific sheet/range in the Payables workbook)
//   ?file=<driveItemId>            (override which OneDrive file to open)
// ════════════════════════════════════════════════════════════════════════════

    if (url.pathname === "/charge-probe") {
      const who = await verifyUser(request, env);
      if (!who.ok) return json({ error: who.reason || "Unauthorized" }, 401, origin);

      const reportId = (url.searchParams.get("reportId") || "00OV50000030xnxMAA").replace(/[^a-zA-Z0-9]/g, "");
      const out = { version: "charge-probe-v1", ranBy: who.email, reportId, salesforce: {}, graph: {}, note: "READ ONLY — discovery for the Charge Report build. Writes nothing." };

      // ─── SALESFORCE ────────────────────────────────────────────────────────
      try {
        const tok = await getSalesforceToken(env);
        const at = tok.access_token, base = String(tok.instance_url || "").replace(/\/+$/, "");
        const H = { "Authorization": "Bearer " + at, "Accept": "application/json" };
        const V = "/services/data/v60.0";

        // 1) Report DESCRIBE — the exact column API names the legacy export uses
        try {
          const r = await fetch(base + V + "/analytics/reports/" + reportId + "/describe", { headers: H });
          const d = await r.json();
          if (!r.ok) {
            out.salesforce.reportDescribeError = Array.isArray(d) && d[0] ? (d[0].errorCode + " " + d[0].message) : JSON.stringify(d).slice(0, 300);
          } else {
            const rm = d.reportMetadata || {};
            const info = (d.reportExtendedMetadata || {}).detailColumnInfo || {};
            out.salesforce.reportName = rm.name || null;
            out.salesforce.reportType = rm.reportType || null;
            out.salesforce.detailColumns = (rm.detailColumns || []).map(function (c) {
              const i = info[c] || {};
              return { key: c, label: i.label || null, dataType: i.dataType || null };
            });
            out.salesforce.reportFilters = rm.reportFilters || [];
            out.salesforce.standardDateFilter = rm.standardDateFilter || null;
          }
        } catch (e) { out.salesforce.reportDescribeError = String(e.message || e); }

        // 2) Report RUN — row count + first 3 rows so we see real data shape
        try {
          const r = await fetch(base + V + "/analytics/reports/" + reportId + "?includeDetails=true", { headers: H });
          const d = await r.json();
          if (!r.ok) {
            out.salesforce.reportRunError = Array.isArray(d) && d[0] ? (d[0].errorCode + " " + d[0].message) : JSON.stringify(d).slice(0, 300);
          } else {
            const fm = d.factMap || {};
            let rows = [];
            Object.keys(fm).some(function (k) {
              const rr = fm[k] && fm[k].rows;
              if (Array.isArray(rr) && rr.length) { rows = rr; return true; }
              return false;
            });
            out.salesforce.reportFormat = d.reportMetadata && d.reportMetadata.reportFormat;
            out.salesforce.detailRowCount = rows.length;
            out.salesforce.allData = d.allData; // false means Salesforce truncated at 2,000 detail rows
            const cols = (out.salesforce.detailColumns || []).map(function (c) { return c.label || c.key; });
            out.salesforce.sampleRows = rows.slice(0, 3).map(function (row) {
              const o = {};
              (row.dataCells || []).forEach(function (cell, i) { o[cols[i] || ("col" + i)] = cell.label; });
              return o;
            });
          }
        } catch (e) { out.salesforce.reportRunError = String(e.message || e); }

        // 3) Placement describe — burden field + the credit child object
        let creditObjectName = null;
        try {
          const r = await fetch(base + V + "/sobjects/bpats__Placement__c/describe", { headers: H });
          const d = await r.json();
          if (!r.ok) {
            out.salesforce.placementDescribeError = JSON.stringify(d).slice(0, 300);
          } else {
            out.salesforce.placementBurdenFields = (d.fields || [])
              .filter(function (f) { return /burden/i.test(f.name) || /burden/i.test(f.label || ""); })
              .map(function (f) { return { name: f.name, label: f.label, type: f.type }; });
            out.salesforce.placementRateFields = (d.fields || [])
              .filter(function (f) { return /pay_rate|bill_rate|overtime|double/i.test(f.name); })
              .map(function (f) { return { name: f.name, label: f.label, type: f.type }; });
            const rels = (d.childRelationships || []).filter(function (c) {
              return /credit/i.test(c.childSObject || "") || /credit/i.test(c.relationshipName || "");
            });
            out.salesforce.placementCreditChildRels = rels.map(function (c) {
              return { object: c.childSObject, relationshipName: c.relationshipName, lookupField: c.field };
            });
            if (rels[0]) creditObjectName = rels[0].childSObject;
            out.salesforce.placementChildObjectsAll = (d.childRelationships || []).map(function (c) { return c.childSObject; }).slice(0, 80);
          }
        } catch (e) { out.salesforce.placementDescribeError = String(e.message || e); }

        // 4) Credit object describe — fields, picklists, and (critically) whether
        //    the integration user can DELETE + CREATE these records, for the
        //    lone-House-credit repair flow.
        if (creditObjectName) {
          try {
            const r = await fetch(base + V + "/sobjects/" + creditObjectName + "/describe", { headers: H });
            const d = await r.json();
            if (!r.ok) {
              out.salesforce.creditDescribeError = JSON.stringify(d).slice(0, 300);
            } else {
              out.salesforce.creditObject = {
                name: d.name,
                label: d.label,
                canCreate: !!d.createable,
                canDelete: !!d.deletable,
                canUpdate: !!d.updateable,
                canQuery: !!d.queryable,
                fields: (d.fields || []).map(function (f) {
                  const o = { name: f.name, label: f.label, type: f.type, updateable: f.updateable, createable: f.createable };
                  if (f.referenceTo && f.referenceTo.length) o.referenceTo = f.referenceTo;
                  const pv = (f.picklistValues || []).filter(function (p) { return p.active; }).map(function (p) { return p.value; });
                  if (pv.length) o.picklist = pv;
                  return o;
                })
              };
              const s = await runSalesforceQuery(env, "SELECT FIELDS(ALL) FROM " + creditObjectName + " ORDER BY CreatedDate DESC LIMIT 3");
              out.salesforce.creditSampleRecords = s.ok ? s.records : { error: s.error };
            }
          } catch (e) { out.salesforce.creditDescribeError = String(e.message || e); }
        } else {
          out.salesforce.creditObjectHint = "No child object with 'credit' in its name found on bpats__Placement__c. Check placementChildObjectsAll for the right one, then re-run with the object name once we wire it in.";
        }
      } catch (e) { out.salesforce.tokenError = String(e.message || e); }

      // ─── ONEDRIVE: 2026 Payable Worksheet (via share link — v2) ────────────
      try {
        const gt = await getGraphToken(env);
        const GH = { "Authorization": "Bearer " + gt, "Accept": "application/json" };
        const shareUrl = url.searchParams.get("shareUrl") || "https://sparktalent-my.sharepoint.com/:x:/g/personal/timecards_sparktalentinc_com/IQCNdykcRQJLRKsOAFZyxYT3ATQz4Y_-30tpSh40h2OGwSo";
        const shareTok = "u!" + btoa(shareUrl).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
        const sR = await fetch("https://graph.microsoft.com/v1.0/shares/" + shareTok + "/driveItem?$select=id,name,webUrl,parentReference,lastModifiedDateTime", { headers: GH });
        const sD = await sR.json();
        if (!sR.ok) {
          out.graph.shareResolveError = (sD.error && sD.error.message) || JSON.stringify(sD).slice(0, 300);
        } else {
          const driveId = sD.parentReference && sD.parentReference.driveId;
          const itemId = sD.id;
          out.graph.file = { name: sD.name, id: itemId, driveId, path: sD.parentReference && sD.parentReference.path, modified: sD.lastModifiedDateTime };
          const B = "https://graph.microsoft.com/v1.0/drives/" + driveId + "/items/" + itemId;
          const wr = await fetch(B + "/workbook/worksheets?$select=name,position", { headers: GH });
          const wd = await wr.json();
          if (!wr.ok) {
            out.graph.worksheetsError = (wd.error && wd.error.message) || JSON.stringify(wd).slice(0, 300);
          } else {
            const sheets = (wd.value || []).map(function (w) { return w.name; });
            out.graph.worksheets = sheets;
            const want = (url.searchParams.get("sheet") || "").trim();
            const target = want || sheets.filter(function (n) { return /vac|pto/i.test(n); })[0] || sheets[0] || null;
            if (target) {
              const range = (url.searchParams.get("range") || "A1:T80").replace(/[^A-Za-z0-9:]/g, "");
              const safe = encodeURIComponent(target.replace(/'/g, "''"));
              const rr = await fetch(B + "/workbook/worksheets('" + safe + "')/range(address='" + range + "')?$select=address,rowCount,columnCount,values", { headers: GH });
              const rd = await rr.json();
              if (!rr.ok) out.graph.peekError = (rd.error && rd.error.message) || JSON.stringify(rd).slice(0, 300);
              else out.graph.peek = { sheet: target, address: rd.address, rows: (rd.values || []).filter(function (row) { return row.some(function (c) { return c !== "" && c != null; }); }).slice(0, 80) };
            }
          }
        }
      } catch (e) { out.graph.error = String(e.message || e); }

      return json(out, 200, origin);
    }
    return json({ error: "Not found" }, 404, origin);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
