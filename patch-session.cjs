// ============================================================================
// patch-session.cjs - Tier 1 #8 + #9:
//  * #8 token refresh: an expired session now silently renews via the HQ
//    refresh token and the request retries, instead of throwing "Session
//    expired" at whoever is mid-edit.
//  * #9 VIEW AS hole: the real role now comes from the server (profiles.role).
//    Non-admins can no longer click themselves up to Admin, AND the worker
//    refuses saves to private boards from people who are not owner/member/admin
//    - the client was the only thing stopping that before.
// Patches BOTH spark-boards.html and worker/cloudworker.js - all or nothing.
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-session.cjs
//   git add -A && git commit -m "Boards: session refresh + role enforcement" && git push
//   cd worker && npx wrangler deploy
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const PAGE = "spark-boards.html";
const WORK = "worker/cloudworker.js";
let page = fs.readFileSync(PAGE, "utf8").replace(/\r\n/g, "\n");
let work = fs.readFileSync(WORK, "utf8").replace(/\r\n/g, "\n");
if (page.includes("serverRole")) throw new Error(PAGE + " already patched. Nothing written.");
if (work.includes("do not have access to this private board")) throw new Error(WORK + " already patched. Nothing written.");

const PEDITS = [
  ["const API = {\n  async call(path, opts = {}) {\n    const tok = Auth.currentToken();\n    const r = await fetch(CONFIG.WORKER_URL + path, {\n      ...opts,\n      headers: {\n        'Content-Type': 'application/json',\n        Authorization: 'Bearer ' + (tok || ''),\n        ...(opts.headers || {})\n      }\n    });\n    if (!r.ok) {", "const API = {\n  async call(path, opts = {}) {\n    const hit = t => fetch(CONFIG.WORKER_URL + path, {\n      ...opts,\n      headers: {\n        'Content-Type': 'application/json',\n        Authorization: 'Bearer ' + (t || ''),\n        ...(opts.headers || {})\n      }\n    });\n    let r = await hit(Auth.currentToken());\n    if (r.status === 401) {\n      const nt = await Auth.refresh();\n      if (nt) r = await hit(nt);\n    }\n    if (!r.ok) {", 1],
  ["  currentToken() {\n    if (this.viaHQ) {\n      const x = this.hqToken();\n      if (x) { this.token = x.token; return x.token; }\n    }\n    return this.token;\n  },", "  currentToken() {\n    if (this.viaHQ) {\n      const x = this.hqToken();\n      if (x) { this.token = x.token; return x.token; }\n    }\n    return this.token;\n  },\n  serverRole: null,\n  _refreshing: null,\n  refresh() {\n    if (this._refreshing) return this._refreshing;\n    const self = this;\n    this._refreshing = (async function () {\n      try {\n        const raw = localStorage.getItem('spark_hq_sb_auth');\n        if (!raw) return null;\n        const v = JSON.parse(raw);\n        const s = v && (v.currentSession || v);\n        const rt = s && s.refresh_token;\n        if (!rt) return null;\n        const res = await fetch(CONFIG.SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY },\n          body: JSON.stringify({ refresh_token: rt })\n        });\n        if (!res.ok) return null;\n        const d = await res.json();\n        if (!d || !d.access_token) return null;\n        const ns = Object.assign({}, s, d);\n        if (d.expires_in) ns.expires_at = Math.floor(Date.now() / 1000) + d.expires_in;\n        try {\n          localStorage.setItem('spark_hq_sb_auth', JSON.stringify(v && v.currentSession ? Object.assign({}, v, { currentSession: ns }) : ns));\n        } catch (e) {}\n        self.token = d.access_token;\n        return d.access_token;\n      } catch (e) {\n        return null;\n      } finally {\n        setTimeout(function () { self._refreshing = null; }, 1500);\n      }\n    })();\n    return this._refreshing;\n  },", 1],
  ["  async boards() {\n    const d = await this.call('/boards-load');\n    return d && d.boards || [];\n  }", "  async boards() {\n    const d = await this.call('/boards-load');\n    if (d && d.role) Auth.serverRole = d.role;\n    return d && d.boards || [];\n  }", 1],
  ["const [role, setRole] = useState('admin'); // admin | editor | viewer  (from Supabase profile at deploy)", "const [role, setRole] = useState(Auth.serverRole === 'member' ? 'member' : 'admin'); // real role arrives from the worker on load\n  const [realRole, setRealRole] = useState(null);", 1],
  ["      API.boards().then(bs => {", "      API.boards().then(bs => {\n        if (Auth.serverRole) {\n          const sr = Auth.serverRole === 'admin' || Auth.serverRole === 'superadmin' ? 'admin' : 'member';\n          setRealRole(sr);\n          if (sr !== 'admin') setRole('member');\n        }", 1],
  ["  }, ROLES.map(r => /*#__PURE__*/React.createElement(\"button\", {\n    key: r.key,\n    className: \"role-pill\" + (role === r.key ? ' on' : ''),\n    onClick: () => setRole(r.key),\n    title: r.label\n  }, r.label.split(' ')[0])))), ", "  }, ROLES.filter(r => realRole === 'admin' || realRole === null || r.key === role).map(r => /*#__PURE__*/React.createElement(\"button\", {\n    key: r.key,\n    className: \"role-pill\" + (role === r.key ? ' on' : ''),\n    onClick: () => {\n      if (realRole && realRole !== 'admin' && r.key === 'admin') return;\n      setRole(r.key);\n    },\n    title: realRole && realRole !== 'admin' ? 'Your access level is set by an admin in Spark HQ' : r.label\n  }, r.label.split(' ')[0])))), ", 1]
];
const WEDITS = [
  ["return json({ ok: true, count: boards.length, boards }, 200, origin);", "return json({ ok: true, count: boards.length, role, boards }, 200, origin);", 1],
  ["        const cur = await sbService(env, \"GET\", \"spark_boards?select=updated_at,updated_by,data&id=eq.\" + encodeURIComponent(row.id) + \"&limit=1\");\n        const prev = cur.ok && cur.data && cur.data[0] ? cur.data[0] : null;", "        const cur = await sbService(env, \"GET\", \"spark_boards?select=updated_at,updated_by,data,visibility,owner,members&id=eq.\" + encodeURIComponent(row.id) + \"&limit=1\");\n        const prev = cur.ok && cur.data && cur.data[0] ? cur.data[0] : null;\n        if (prev && prev.visibility === \"private\") {\n          let prole = \"member\";\n          try {\n            const pr2 = await sbService(env, \"GET\", \"profiles?select=role&email=eq.\" + encodeURIComponent(who.email));\n            if (pr2.ok && pr2.data && pr2.data[0] && pr2.data[0].role) prole = pr2.data[0].role;\n          } catch (e) {}\n          const padmin = prole === \"admin\" || prole === \"superadmin\";\n          const onIt = Array.isArray(prev.members) && prev.members.indexOf(who.email) !== -1;\n          if (!padmin && prev.owner !== who.email && !onIt) {\n            return json({ error: \"You do not have access to this private board.\" }, 403, origin);\n          }\n        }", 1]
];
for (const [label, src, edits] of [["page", page, PEDITS], ["worker", work, WEDITS]]) {
  for (const [i, [o, , exp]] of edits.entries()) {
    const n = src.split(o).length - 1;
    if (n !== exp) throw new Error(label + " edit #" + (i + 1) + ": anchor found " + n + " times (need " + exp + "). NOTHING written.");
  }
}
fs.writeFileSync(PAGE + ".bak-session", fs.readFileSync(PAGE));
fs.writeFileSync(WORK + ".bak-session", fs.readFileSync(WORK));
for (const [o, nw] of PEDITS) page = page.split(o).join(nw);
for (const [o, nw] of WEDITS) work = work.split(o).join(nw);
fs.writeFileSync(PAGE, page);
fs.writeFileSync(WORK, work);
console.log("PATCHED " + PAGE + " and " + WORK + " (backups .bak-session)");
console.log("Next: git add -A && git commit -m \"Boards: session refresh + role enforcement\" && git push");
console.log("Then: cd worker && npx wrangler deploy");
