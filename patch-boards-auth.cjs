const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
const done = [];
function sub(name, from, to) {
  const i = h.indexOf(from);
  if (i === -1) { console.log('MISS  ' + name); return false; }
  if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG ' + name); return false; }
  h = h.slice(0, i) + to + h.slice(i + from.length);
  done.push(name); return true;
}
const L = a => a.join('\n');

// 1) Auth: adopt HQ session + live token + flash helper
sub('adopt', L([
"  restore() {",
"    try {",
"      const s = JSON.parse(localStorage.getItem('sb-spark') || 'null');",
"      if (s) {",
"        this.token = s.token;",
"        this.user = s.user;",
"      }",
"    } catch (e) {}",
"    return !!this.token;",
"  },"
]), L([
"  restore() {",
"    try {",
"      const s = JSON.parse(localStorage.getItem('sb-spark') || 'null');",
"      if (s) {",
"        this.token = s.token;",
"        this.user = s.user;",
"      }",
"    } catch (e) {}",
"    return !!this.token;",
"  },",
"  viaHQ: false,",
"  hqToken() {",
"    try {",
"      const raw = localStorage.getItem('spark_hq_sb_auth');",
"      if (!raw) return null;",
"      const v = JSON.parse(raw);",
"      const s = v && (v.currentSession || v);",
"      if (!s || !s.access_token) return null;",
"      const exp = s.expires_at ? s.expires_at * 1000 : 0;",
"      if (exp && Date.now() > exp - 30000) return null;",
"      return { token: s.access_token, user: s.user || v.user || null };",
"    } catch (e) { return null; }",
"  },",
"  adopt() {",
"    const x = this.hqToken();",
"    if (!x) return false;",
"    this.token = x.token;",
"    if (x.user) this.user = x.user;",
"    this.viaHQ = true;",
"    return true;",
"  },",
"  currentToken() {",
"    if (this.viaHQ) {",
"      const x = this.hqToken();",
"      if (x) { this.token = x.token; return x.token; }",
"    }",
"    return this.token;",
"  },"
]));

// 2) API.call: live token + loud failures
sub('apicall', L([
"const API = {",
"  async call(path, opts = {}) {",
"    const r = await fetch(CONFIG.WORKER_URL + path, {",
"      ...opts,",
"      headers: {",
"        'Content-Type': 'application/json',",
"        Authorization: `Bearer ${Auth.token}`,",
"        ...(opts.headers || {})",
"      }",
"    });",
"    if (!r.ok) throw new Error(`API ${r.status}`);",
"    return r.json();",
"  },"
]), L([
"function sbFlash(msg, kind) {",
"  try {",
"    var el = document.getElementById('sb-flash');",
"    if (!el) {",
"      el = document.createElement('div');",
"      el.id = 'sb-flash';",
"      el.style.cssText = 'position:fixed;z-index:99999;left:50%;transform:translateX(-50%);top:16px;padding:10px 16px;border-radius:8px;font:600 13px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.18);max-width:520px;text-align:center;color:#fff';",
"      document.body.appendChild(el);",
"    }",
"    el.style.background = kind === 'ok' ? '#0b8a4b' : '#c0392b';",
"    el.textContent = msg;",
"    el.style.display = 'block';",
"    clearTimeout(el._t);",
"    el._t = setTimeout(function () { el.style.display = 'none'; }, 6000);",
"  } catch (e) {}",
"}",
"const API = {",
"  async call(path, opts = {}) {",
"    const tok = Auth.currentToken();",
"    const r = await fetch(CONFIG.WORKER_URL + path, {",
"      ...opts,",
"      headers: {",
"        'Content-Type': 'application/json',",
"        Authorization: 'Bearer ' + (tok || ''),",
"        ...(opts.headers || {})",
"      }",
"    });",
"    if (!r.ok) {",
"      let body = '';",
"      try { body = (await r.text()).slice(0, 200); } catch (e) {}",
"      if (r.status === 401) sbFlash('Session expired. Open Spark HQ, sign in, then refresh this tab.');",
"      throw new Error('API ' + r.status + ' ' + path + ' ' + body);",
"    }",
"    return r.json();",
"  },"
]));

// 3) Persist: no more silent swallow
sub('persist', L([
"    }).catch(() => {});",
"  },",
"  item() {/* covered by board() */},"
]), L([
"    }).catch(e => {",
"      console.error('[Spark Boards] save failed', e);",
"      sbFlash('NOT SAVED. ' + (e && e.message ? e.message : 'Unknown error'));",
"    });",
"  },",
"  item() {/* covered by board() */},"
]));

// 4) Inherit HQ session at boot
sub('authed', "useState(() => !LIVE || Auth.restore())",
              "useState(() => !LIVE || Auth.adopt() || Auth.restore())");

// 5) No seed data when live
sub('seed', "useState(() => seedBoards().map(b => ({",
            "useState(() => LIVE ? [] : seedBoards().map(b => ({");

// 6) Kill signup
sub('signup', L([
"      if (mode === 'in') await Auth.signIn(email, pw);else await Auth.signUp(email, pw, name);",
"      onAuthed();"
]), L([
"      if (mode !== 'in') throw new Error('Sign-up is disabled. Ask an admin for access.');",
"      await Auth.signIn(email, pw);",
"      if (!Auth.token) throw new Error('No session returned. Contact an admin.');",
"      onAuthed();"
]));

if (done.length !== 6) {
  console.log('\nAPPLIED ' + done.length + '/6: ' + done.join(', '));
  console.log('NOT WRITTEN. Nothing changed.');
  process.exit(1);
}
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED 6/6: ' + done.join(', '));
console.log('\n=== LOADER REGION ===');
h.split('\n').slice(8915, 8945).forEach((l, i) => console.log((8916 + i) + ': ' + l));
