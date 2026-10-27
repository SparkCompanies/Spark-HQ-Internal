/* VIEW_AS_v2
   Loaded into the HQ shell (index.html) by spark-home.html, same path as my-links.js, because index.html is too
   large to edit on github.com.
   "View as": lets a super admin see HQ exactly as a given team member sees it. Two things decide what a person
   sees: their role (enforceRole: super_admin / manager / member nav lists) and their permission grants
   (gateRender: Tools, Directory, Career Paths, Sr Leadership from Supabase my_permissions). v2 simulates both.
   - Picker lives in the topbar next to "Need help?". Super admins only (same FLOOR list as the role lock).
   - Choose a person (from profiles) or a bare role. A banner shows who you are viewing as, with an Exit button.
   - While active, every setRole() call is pinned to the viewed role, so the role-lock's periodic
     "restore super_admin" cannot undo it. Exit restores super_admin and reloads.
   - State is per tab (sessionStorage), so it never leaks into another window or another person's browser. */
(function () {
  "use strict";
  if (window.__hqViewAs) return;
  window.__hqViewAs = true;

  var FLOOR = ["aspegel", "aopalewski", "mpatrico", "pmalani", "eurisitti", "bnamma"];
  var KEY = "spark_hq_viewas";
  var state = null;      // { email, role, label }
  var origSetRole = null;

  function uname(e) { return (e || "").toLowerCase().split("@")[0]; }
  function mapRole(r) {
    r = (r || "").toLowerCase();
    if (r === "superadmin" || r === "super_admin" || r === "admin") return "super_admin";
    if (r === "manager") return "manager";
    return "member";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(s) { try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) {} }

  function isSuperAdmin() {
    try {
      var u = window.SPARK_SB && window.SPARK_SB.whoami && window.SPARK_SB.whoami();
      if (u && u.email && FLOOR.indexOf(uname(u.email)) >= 0) return true;
    } catch (e) {}
    // Already viewing as someone: the real identity is still a super admin (only they can start a view-as).
    return !!state;
  }

  /* ---------- role pinning ---------- */
  function wrapSetRole() {
    if (origSetRole || typeof window.setRole !== "function") return;
    origSetRole = window.setRole;
    window.setRole = function (r) {
      if (state) r = state.role;
      return origSetRole.call(this, r);
    };
  }
  function applyState() {
    if (!state) return;
    wrapSetRole();
    if (origSetRole) origSetRole(state.role);
    renderBanner();
    applyGates();
  }

  /* ---------- permission gates ----------
     HQ hides Tools, Directory, Career Paths and Sr Leadership unless /permissions (Supabase my_permissions) grants
     them. That lookup is for the signed-in admin, so a view-as must re-run it for the viewed person and apply the
     same rule gateRender() uses, or the picture is wrong. "Any member" = no grants, which is what a member with no
     app role or exception gets today. */
  var GATE = { tools: "tab:tools", people: "tab:people", careers: "tab:career", srlead: "tab:srleadership" };
  var viewPerms = null;
  function permOk(p, key) {
    if (!p) return true;
    if (p._admin === true) return true;
    if (p[key] === true) return true;
    if (key.indexOf(":") > 0 && p[key.split(":")[0] + ":*"] === true) return true;
    return false;
  }
  function paintGates() {
    if (!state || !viewPerms) return;
    Object.keys(GATE).forEach(function (tab) {
      var ok = tab === "srlead" ? viewPerms[GATE[tab]] === true : permOk(viewPerms, GATE[tab]);
      document.querySelectorAll('.nav-item[data-tab="' + tab + '"]').forEach(function (b) { b.style.display = ok ? "" : "none"; });
    });
  }
  function applyGates() {
    if (!state) return;
    var done = function (p) { viewPerms = p || {}; paintGates(); };
    if (!state.email) { done({}); return; }
    try {
      var c = window.SPARK_SB.getClient();
      c.rpc("my_permissions", { p_email: state.email }).then(function (r) { done((r && r.data) || {}); }).catch(function () { done({}); });
    } catch (e) { done({}); }
  }
  // HQ re-runs its own gate pass on sign-in changes; paint ours right after so it never wins while a view is active.
  (function hookGates() {
    var orig = window.applyPermissionGates;
    if (typeof orig !== "function" || orig.__viewas) { setTimeout(hookGates, 800); return; }
    var wrapped = function () { var r = orig.apply(this, arguments); setTimeout(paintGates, 1200); setTimeout(paintGates, 3000); return r; };
    wrapped.__viewas = true;
    window.applyPermissionGates = wrapped;
  })();
  setInterval(paintGates, 4000);

  /* ---------- UI ---------- */
  var CSS = "" +
    "#hqViewAsBtn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    "#hqViewAsBtn.on{background:#FFC800;color:#0D0E1A;border-color:#FFC800}" +
    "#hqViewAsBanner{position:fixed;left:0;right:0;top:0;z-index:99999;display:flex;align-items:center;gap:14px;padding:9px 18px;" +
      "background:#0D0E1A;color:#fff;font:600 13px/1.3 Outfit,Inter,system-ui,sans-serif;border-bottom:2px solid #FFC800;box-shadow:0 8px 24px -12px rgba(0,0,0,.6)}" +
    "#hqViewAsBanner svg{width:16px;height:16px;fill:none;stroke:#FFC800;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}" +
    "#hqViewAsBanner b{color:#FFC800;font-weight:700}" +
    "#hqViewAsBanner .sub{opacity:.72;font-weight:500}" +
    "#hqViewAsBanner button{margin-left:auto;background:#FFC800;color:#0D0E1A;border:0;border-radius:999px;padding:6px 14px;font:700 12px Outfit,Inter,system-ui,sans-serif;letter-spacing:.3px;cursor:pointer}" +
    "#hqViewAsBanner button:hover{background:#ffd54a}" +
    "body.hq-viewas{padding-top:40px}" +
    "#hqViewAsModal{position:fixed;inset:0;z-index:99998;background:rgba(13,14,26,.55);display:flex;align-items:flex-start;justify-content:center;padding-top:12vh}" +
    "#hqViewAsModal .box{width:min(520px,92vw);background:#fff;color:#1a1915;border-radius:16px;box-shadow:0 30px 80px -30px rgba(0,0,0,.6);overflow:hidden;font-family:Outfit,Inter,system-ui,sans-serif}" +
    "#hqViewAsModal .hd{padding:18px 20px 10px;border-bottom:1px solid #ece8de}" +
    "#hqViewAsModal .hd h3{margin:0 0 4px;font-size:16px;font-weight:700}" +
    "#hqViewAsModal .hd p{margin:0;font-size:12.5px;color:#6B675C}" +
    "#hqViewAsModal input{width:100%;box-sizing:border-box;margin:12px 0 0;padding:9px 12px;border:1px solid #ddd7c8;border-radius:10px;font:14px Outfit,Inter,system-ui,sans-serif}" +
    "#hqViewAsModal input:focus{outline:none;border-color:#FFC800;box-shadow:0 0 0 3px rgba(255,200,0,.25)}" +
    "#hqViewAsModal .list{max-height:46vh;overflow:auto;padding:8px}" +
    "#hqViewAsModal .row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:none;border:0;border-radius:10px;padding:9px 12px;cursor:pointer;font-family:inherit}" +
    "#hqViewAsModal .row:hover{background:#fbf6e6}" +
    "#hqViewAsModal .row .av{width:30px;height:30px;border-radius:50%;background:#0D0E1A;color:#FFC800;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none}" +
    "#hqViewAsModal .row .nm{font-size:13.5px;font-weight:600}" +
    "#hqViewAsModal .row .em{font-size:11.5px;color:#6B675C}" +
    "#hqViewAsModal .row .rl{margin-left:auto;font-size:10px;letter-spacing:1px;text-transform:uppercase;font-weight:700;color:#6B675C;background:#f3efe4;padding:3px 8px;border-radius:999px}" +
    "#hqViewAsModal .row .rl.member{color:#166534;background:#dcfce7}" +
    "#hqViewAsModal .row .rl.manager{color:#1e3a8a;background:#dbeafe}" +
    "#hqViewAsModal .row .rl.super_admin{color:#7c2d12;background:#ffedd5}" +
    "#hqViewAsModal .sec{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#9a9484;font-weight:700;padding:10px 12px 4px}" +
    "#hqViewAsModal .ft{padding:10px 20px 14px;border-top:1px solid #ece8de;display:flex;justify-content:flex-end}" +
    "#hqViewAsModal .ft button{background:none;border:1px solid #ddd7c8;border-radius:999px;padding:6px 14px;font:600 12px Outfit,Inter,system-ui,sans-serif;cursor:pointer}" +
    "#hqViewAsModal .empty{padding:18px 12px;font-size:13px;color:#6B675C}";

  var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  function injectCss() {
    if (document.getElementById("hqViewAsCss")) return;
    var s = document.createElement("style"); s.id = "hqViewAsCss"; s.textContent = CSS; document.head.appendChild(s);
  }

  function renderButton() {
    var right = document.querySelector(".topbar .right");
    if (!right || document.getElementById("hqViewAsBtn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "hqViewAsBtn"; b.className = "help-pill"; b.title = "View HQ as a team member";
    b.innerHTML = EYE + "<span>View as</span>";
    b.addEventListener("click", openPicker);
    var help = document.getElementById("helpPill");
    if (help && help.parentNode === right) right.insertBefore(b, help); else right.insertBefore(b, right.firstChild);
    if (state) b.classList.add("on");
  }

  function renderBanner() {
    var old = document.getElementById("hqViewAsBanner");
    if (!state) { if (old) old.remove(); document.body.classList.remove("hq-viewas"); return; }
    var who = state.label || state.email || state.role;
    var html = EYE + "<span>Viewing HQ as <b>" + esc(who) + "</b> <span class=\"sub\">(" + esc(state.role.replace("_", " ")) +
      " role, their tab grants). What you see now is what they see.</span></span><button type=\"button\" id=\"hqViewAsExit\">Exit view</button>";
    if (old) { old.innerHTML = html; } else {
      old = document.createElement("div"); old.id = "hqViewAsBanner"; old.innerHTML = html; document.body.appendChild(old);
    }
    document.body.classList.add("hq-viewas");
    document.getElementById("hqViewAsExit").onclick = exitView;
    var btn = document.getElementById("hqViewAsBtn"); if (btn) btn.classList.add("on");
  }

  function startView(email, role, label) {
    state = { email: email || "", role: mapRole(role), label: label || email || mapRole(role) };
    save(state);
    closePicker();
    applyState();
    try { var h = document.querySelector('.nav-item[data-tab="home"]'); if (h) h.click(); } catch (e) {}
  }

  function exitView() {
    state = null; save(null);
    try { localStorage.setItem("spark_hq_role", "super_admin"); } catch (e) {}
    if (origSetRole) { try { origSetRole("super_admin"); } catch (e) {} }
    location.reload();
  }

  /* ---------- picker ---------- */
  /* People = the Microsoft 365 directory (same source as Admin > People), each with the role HQ will actually
     give them: profiles.role (what myRole() reads once they have signed in), else role_assignments, else member. */
  var WORKER = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var people = null;
  function loadPeople() {
    if (people) return Promise.resolve(people);
    var c = null;
    try { c = window.SPARK_SB.getClient(); } catch (e) {}
    var pProf = c ? c.from("profiles").select("email,role").then(function (r) { return (r && r.data) || []; }).catch(function () { return []; }) : Promise.resolve([]);
    var pAsg = c ? c.from("role_assignments").select("email,role").then(function (r) { return (r && r.data) || []; }).catch(function () { return []; }) : Promise.resolve([]);
    var pDir = window.SPARK_SB.getToken().then(function (tok) {
      return fetch(WORKER + "/directory", { headers: { Authorization: "Bearer " + tok } }).then(function (r) { return r.ok ? r.json() : { people: [] }; });
    }).then(function (d) { return (d && d.people) || []; }).catch(function () { return []; });
    return Promise.all([pProf, pAsg, pDir]).then(function (res) {
      var prof = {}, asg = {}, seen = {};
      res[0].forEach(function (p) { if (p.email) prof[p.email.toLowerCase()] = p.role; });
      res[1].forEach(function (a) { if (a.email) asg[a.email.toLowerCase()] = a.role; });
      var out = [];
      res[2].forEach(function (p) {
        if (!p.email || p.active === false) return;
        var em = p.email.toLowerCase(); seen[em] = 1;
        var raw = prof[em] || asg[em] || "member";
        out.push({ email: em, name: p.name || "", title: p.title || "", role: mapRole(raw), rawRole: raw, signedIn: !!prof[em] });
      });
      // Anyone with a profile but not in the directory (contractors, old accounts) still shows.
      Object.keys(prof).forEach(function (em) {
        if (seen[em]) return;
        out.push({ email: em, name: "", title: "", role: mapRole(prof[em]), rawRole: prof[em] || "member", signedIn: true });
      });
      people = out.sort(function (a, b) { return (a.name || a.email).localeCompare(b.name || b.email); });
      return people;
    });
  }

  function openPicker() {
    if (document.getElementById("hqViewAsModal")) return;
    var m = document.createElement("div"); m.id = "hqViewAsModal";
    m.innerHTML = '<div class="box"><div class="hd"><h3>View HQ as…</h3><p>Pick a team member or a role. HQ re-renders with their access until you exit.</p>' +
      '<input type="search" id="hqViewAsSearch" placeholder="Search by name or email" autocomplete="off"></div>' +
      '<div class="list" id="hqViewAsList"><div class="empty">Loading team members…</div></div>' +
      '<div class="ft"><button type="button" id="hqViewAsCancel">Cancel</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) closePicker(); });
    document.getElementById("hqViewAsCancel").onclick = closePicker;
    var inp = document.getElementById("hqViewAsSearch");
    inp.addEventListener("input", function () { paintList(inp.value); });
    setTimeout(function () { inp.focus(); }, 30);
    loadPeople().then(function () { paintList(""); });
  }
  function closePicker() { var m = document.getElementById("hqViewAsModal"); if (m) m.remove(); }

  function paintList(q) {
    var list = document.getElementById("hqViewAsList"); if (!list) return;
    q = (q || "").toLowerCase().trim();
    var html = '<div class="sec">Roles</div>';
    [["member", "Member", "Recruiters, coordinators, most of the team"], ["manager", "Manager", "Team leads, directors, entity presidents"]].forEach(function (r) {
      if (q && r[1].toLowerCase().indexOf(q) < 0) return;
      html += '<button type="button" class="row" data-role="' + r[0] + '"><span class="av">' + r[1].charAt(0) + '</span><span><div class="nm">Any ' + r[1] + '</div><div class="em">' + r[2] + '</div></span><span class="rl ' + r[0] + '">' + r[0].replace("_", " ") + '</span></button>';
    });
    var rows = (people || []).filter(function (p) { return !q || p.email.indexOf(q) >= 0 || (p.name || "").toLowerCase().indexOf(q) >= 0; });
    html += '<div class="sec">Team members (' + rows.length + ')</div>';
    if (!rows.length) html += '<div class="empty">' + (people && people.length ? "No one matches." : "No profiles found. You can still pick a role above.") + '</div>';
    rows.forEach(function (p) {
      var nm = p.name || p.email.split("@")[0];
      var ini = nm.split(/[\s._-]+/).map(function (s) { return s.charAt(0); }).join("").slice(0, 2).toUpperCase();
      html += '<button type="button" class="row" data-email="' + esc(p.email) + '" data-role="' + esc(p.rawRole) + '" data-name="' + esc(nm) + '">' +
        '<span class="av">' + esc(ini) + '</span><span><div class="nm">' + esc(nm) + (p.title ? ' <span class="em">· ' + esc(p.title) + '</span>' : '') + '</div><div class="em">' + esc(p.email) + (p.signedIn ? '' : ' · has not signed in to HQ yet') + '</div></span>' +
        '<span class="rl ' + p.role + '">' + esc(p.role.replace("_", " ")) + '</span></button>';
    });
    list.innerHTML = html;
    list.querySelectorAll(".row").forEach(function (b) {
      b.addEventListener("click", function () {
        startView(b.getAttribute("data-email") || "", b.getAttribute("data-role"), b.getAttribute("data-name") || ("Any " + b.getAttribute("data-role")));
      });
    });
  }

  /* ---------- boot ---------- */
  function boot(t) {
    t = t || 0;
    var ready = typeof window.setRole === "function" && document.querySelector(".topbar .right");
    if (!ready) { if (t < 40) setTimeout(function () { boot(t + 1); }, 500); return; }
    injectCss();
    state = load();
    if (state) { applyState(); renderButton(); return; }
    // Not viewing: only super admins get the button. Identity can arrive a little after the shell, so poll briefly.
    var tries = 0;
    (function waitAdmin() {
      if (isSuperAdmin()) { renderButton(); return; }
      if (++tries < 30) setTimeout(waitAdmin, 700);
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); }); else boot();
})();
