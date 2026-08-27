// ============================================================================
// patch-session-page.cjs - PAGE HALF of the session patch. The worker half is
// already applied and deployed; this adds:
//   * token refresh: an expired session renews silently and the request retries
//   * real role from the server; non-admins can no longer click up to Admin
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-session-page.cjs
//   git add -A && git commit -m "Boards: session refresh + role (page)" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const PAGE = "spark-boards.html";
let page = fs.readFileSync(PAGE, "utf8").replace(/\r\n/g, "\n");
if (page.includes("serverRole")) throw new Error(PAGE + " already patched. Nothing written.");

const EDITS = [
  ["const API = {\n  async call(path, opts = {}) {\n    const tok = Auth.currentToken();\n    const r = await fetch(CONFIG.WORKER_URL + path, {\n      ...opts,\n      headers: {\n        'Content-Type': 'application/json',\n        Authorization: 'Bearer ' + (tok || ''),\n        ...(opts.headers || {})\n      }\n    });\n    if (!r.ok) {", "const API = {\n  async call(path, opts = {}) {\n    const hit = t => fetch(CONFIG.WORKER_URL + path, {\n      ...opts,\n      headers: {\n        'Content-Type': 'application/json',\n        Authorization: 'Bearer ' + (t || ''),\n        ...(opts.headers || {})\n      }\n    });\n    let r = await hit(Auth.currentToken());\n    if (r.status === 401) {\n      const nt = await Auth.refresh();\n      if (nt) r = await hit(nt);\n    }\n    if (!r.ok) {", 1],
  ["  currentToken() {\n    if (this.viaHQ) {\n      const x = this.hqToken();\n      if (x) { this.token = x.token; return x.token; }\n    }\n    return this.token;\n  },", "  currentToken() {\n    if (this.viaHQ) {\n      const x = this.hqToken();\n      if (x) { this.token = x.token; return x.token; }\n    }\n    return this.token;\n  },\n  serverRole: null,\n  _refreshing: null,\n  refresh() {\n    if (this._refreshing) return this._refreshing;\n    const self = this;\n    this._refreshing = (async function () {\n      try {\n        const raw = localStorage.getItem('spark_hq_sb_auth');\n        if (!raw) return null;\n        const v = JSON.parse(raw);\n        const s = v && (v.currentSession || v);\n        const rt = s && s.refresh_token;\n        if (!rt) return null;\n        const res = await fetch(CONFIG.SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY },\n          body: JSON.stringify({ refresh_token: rt })\n        });\n        if (!res.ok) return null;\n        const d = await res.json();\n        if (!d || !d.access_token) return null;\n        const ns = Object.assign({}, s, d);\n        if (d.expires_in) ns.expires_at = Math.floor(Date.now() / 1000) + d.expires_in;\n        try {\n          localStorage.setItem('spark_hq_sb_auth', JSON.stringify(v && v.currentSession ? Object.assign({}, v, { currentSession: ns }) : ns));\n        } catch (e) {}\n        self.token = d.access_token;\n        return d.access_token;\n      } catch (e) {\n        return null;\n      } finally {\n        setTimeout(function () { self._refreshing = null; }, 1500);\n      }\n    })();\n    return this._refreshing;\n  },", 1],
  ["  async boards() {\n    const d = await this.call('/boards-load');\n    return d && d.boards || [];\n  }", "  async boards() {\n    const d = await this.call('/boards-load');\n    if (d && d.role) Auth.serverRole = d.role;\n    return d && d.boards || [];\n  }", 1],
  ["const [role, setRole] = useState('admin'); // admin | editor | viewer  (from Supabase profile at deploy)", "const [role, setRole] = useState(Auth.serverRole === 'member' ? 'member' : 'admin'); // real role arrives from the worker on load\n  const [realRole, setRealRole] = useState(null);", 1],
  ["      API.boards().then(bs => {", "      API.boards().then(bs => {\n        if (Auth.serverRole) {\n          const sr = Auth.serverRole === 'admin' || Auth.serverRole === 'superadmin' ? 'admin' : 'member';\n          setRealRole(sr);\n          if (sr !== 'admin') setRole('member');\n        }", 1],
  ["  }, ROLES.map(r => /*#__PURE__*/React.createElement(\"button\", {\n    key: r.key,\n    className: \"role-pill\" + (role === r.key ? ' on' : ''),\n    onClick: () => setRole(r.key),\n    title: r.label\n  }, r.label.split(' ')[0])))), ", "  }, ROLES.filter(r => realRole === 'admin' || realRole === null || r.key === role).map(r => /*#__PURE__*/React.createElement(\"button\", {\n    key: r.key,\n    className: \"role-pill\" + (role === r.key ? ' on' : ''),\n    onClick: () => {\n      if (realRole && realRole !== 'admin' && r.key === 'admin') return;\n      setRole(r.key);\n    },\n    title: realRole && realRole !== 'admin' ? 'Your access level is set by an admin in Spark HQ' : r.label\n  }, r.label.split(' ')[0])))), ", 1]
];
for (const [i, [o, , exp]] of EDITS.entries()) {
  const n = page.split(o).length - 1;
  if (n !== exp) throw new Error("edit #" + (i + 1) + ": anchor found " + n + " times (need " + exp + "). NOTHING written.");
}
fs.writeFileSync(PAGE + ".bak-sessionpage", fs.readFileSync(PAGE));
for (const [o, nw] of EDITS) page = page.split(o).join(nw);
fs.writeFileSync(PAGE, page);
console.log("PATCHED " + PAGE + " (backup .bak-sessionpage)");
console.log('Next: git add -A && git commit -m "Boards: session refresh + role (page)" && git push');
