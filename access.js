/* ACCESS_v1.1 — Admin > Access
   Loaded into the HQ shell by spark-home.html (same path as my-links.js and viewas.js; index.html is too large to
   edit on github.com). Replaces the "People & roles" admin pane with one screen that answers one question per
   person: what can they get to?

   Two controls per row, nothing else to remember:
     Role            member / manager / superadmin  -> profiles.role (what HQ reads at sign-in)
     Restricted areas  one checkbox per gated area    -> permission_overrides (what the Sr Leadership gate reads)
   Everything not restricted is baseline for every signed-in team member (ACCESS_v1 patch in index.html).

   Retired by this screen: the custom-role editor (app_roles / user_app_role — nobody was ever assigned), the
   role_assignments table (a second list of who's admin), and the browser-local role demo switcher. */
(function () {
  "use strict";
  if (window.__hqAccess) return;
  window.__hqAccess = true;

  var WORKER = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var RESTRICTED = [
    { key: "tab:srleadership", label: "Sr Leadership", hint: "Executive meeting hub. Only the leadership group." }
  ];
  var ROLES = [
    ["member", "Member", "The day-to-day view: training, career paths, directory, tools."],
    ["manager", "Manager", "Member view plus finance, headcount, boards and sales dashboards."],
    ["superadmin", "Super admin", "Everything, including Admin."]
  ];

  var ICON = {
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 7"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(r) {
    r = (r || "").toLowerCase();
    if (r === "superadmin" || r === "super_admin" || r === "admin") return "superadmin";
    if (r === "manager") return "manager";
    return "member";
  }

  var CSS = "" +
    ".acc{font-family:Outfit,Inter,system-ui,sans-serif;color:#1a1915}" +
    ".acc svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}" +
    ".acc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}" +
    ".acc-eyebrow{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#B8912E;font-weight:700;display:flex;align-items:center;gap:6px}" +
    ".acc-h{margin:4px 0 6px;font-size:24px;font-weight:700;letter-spacing:-.01em}" +
    ".acc-dek{font-size:13.5px;color:#6B675C;max-width:680px;line-height:1.45}" +
    ".acc-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:18px 0 22px}" +
    ".acc-tile{background:#fff;border:1px solid #ece8de;border-radius:14px;padding:14px 16px;box-shadow:0 10px 24px -20px rgba(20,18,10,.5)}" +
    ".acc-tile b{display:block;font-size:24px;font-weight:700;line-height:1.1}" +
    ".acc-tile span{font-size:11.5px;color:#6B675C;letter-spacing:.4px;text-transform:uppercase;font-weight:600}" +
    ".acc-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}" +
    ".acc-search{flex:1 1 260px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #ddd7c8;border-radius:12px;padding:0 12px;color:#6B675C}" +
    ".acc-search input{flex:1;border:0;outline:0;padding:10px 0;font:14px Outfit,Inter,system-ui,sans-serif;background:transparent;color:#1a1915;min-width:0}" +
    ".acc-chip{border:1px solid #ddd7c8;background:#fff;border-radius:999px;padding:7px 12px;font:600 12px Outfit,Inter,system-ui,sans-serif;cursor:pointer;color:#6B675C}" +
    ".acc-chip.on{background:#0D0E1A;color:#FFC800;border-color:#0D0E1A}" +
    ".acc-table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #ece8de;border-radius:16px;overflow:hidden}" +
    ".acc-table th{text-align:left;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#9a9484;font-weight:700;padding:12px 14px;background:#fbf9f3;border-bottom:1px solid #ece8de}" +
    ".acc-table td{padding:10px 14px;border-bottom:1px solid #f1ede3;vertical-align:middle;font-size:13.5px}" +
    ".acc-table tr:last-child td{border-bottom:0}" +
    ".acc-table tr:hover td{background:#fdfbf4}" +
    ".acc-who{display:flex;align-items:center;gap:12px;min-width:0}" +
    ".acc-av{width:34px;height:34px;border-radius:50%;background:#0D0E1A;color:#FFC800;display:grid;place-items:center;font-size:12px;font-weight:700;flex:none}" +
    ".acc-nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".acc-sub{font-size:11.5px;color:#6B675C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".acc-sub.warn{color:#9a6b00}" +
    ".acc-role{font:600 13px Outfit,Inter,system-ui,sans-serif;padding:7px 30px 7px 10px;border:1px solid #ddd7c8;border-radius:10px;background:#fff url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B675C' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 8px center/14px;appearance:none;-webkit-appearance:none;color:#1a1915;cursor:pointer}" +
    ".acc-role.superadmin{border-color:#FFC800;background-color:#fff8dc}" +
    ".acc-role.manager{border-color:#bcd3f5;background-color:#eef5ff}" +
    ".acc-role:disabled{opacity:.55;cursor:not-allowed}" +
    ".acc-chk{display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;font-size:13px}" +
    ".acc-chk i{width:20px;height:20px;border-radius:6px;border:1.5px solid #cbd5e1;display:grid;place-items:center;background:#fff;color:#fff;transition:background .12s,border-color .12s}" +
    ".acc-chk i svg{width:13px;height:13px;stroke-width:3}" +
    ".acc-chk.on i{background:#0D0E1A;border-color:#0D0E1A;color:#FFC800}" +
    ".acc-chk.busy{opacity:.5;pointer-events:none}" +
    ".acc-view{border:1px solid #ddd7c8;background:#fff;border-radius:999px;padding:6px 10px;font:600 12px Outfit,Inter,system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:#1a1915}" +
    ".acc-view:hover{border-color:#FFC800;background:#fff8dc}" +
    ".acc-view svg{width:13px;height:13px}" +
    ".acc-note{font-size:12.5px;color:#6B675C;margin-top:12px;line-height:1.5}" +
    ".acc-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#0D0E1A;color:#fff;border-left:3px solid #FFC800;padding:10px 16px;border-radius:10px;font:600 13px Outfit,Inter,system-ui,sans-serif;z-index:99999;box-shadow:0 14px 30px -12px rgba(0,0,0,.6);opacity:0;transition:opacity .15s}" +
    ".acc-toast.show{opacity:1}" +
    ".acc-toast.err{border-left-color:#e5484d}" +
    ".acc-empty{padding:28px;text-align:center;color:#6B675C;font-size:13.5px}" +
    "@media (max-width:900px){.acc-table th:nth-child(4),.acc-table td:nth-child(4){display:none}}";

  function injectCss() {
    if (document.getElementById("hqAccessCss")) return;
    var s = document.createElement("style"); s.id = "hqAccessCss"; s.textContent = CSS; document.head.appendChild(s);
  }

  /* ---------- data ---------- */
  var people = [], filter = "", chip = "all", loading = false, me = null;

  function client() { try { return window.SPARK_SB.getClient(); } catch (e) { return null; } }

  function load() {
    var c = client();
    if (!c) return Promise.resolve();
    loading = true;
    var pProf = c.from("profiles").select("email,role").then(function (r) { return (r && r.data) || []; });
    var pOvr = c.from("permission_overrides").select("email,perm_key,grant_perm").then(function (r) { return (r && r.data) || []; });
    var pDir = window.SPARK_SB.getToken().then(function (tok) {
      return fetch(WORKER + "/directory", { headers: { Authorization: "Bearer " + tok } }).then(function (r) { return r.ok ? r.json() : { people: [] }; });
    }).then(function (d) { return (d && d.people) || []; }).catch(function () { return []; });
    return Promise.all([pProf, pOvr, pDir]).then(function (res) {
      var prof = {}, grants = {}, seen = {};
      res[0].forEach(function (p) { if (p.email) prof[p.email.toLowerCase()] = p.role || "member"; });
      res[1].forEach(function (o) {
        if (!o.email || o.grant_perm !== true) return;
        var em = o.email.toLowerCase(); (grants[em] = grants[em] || {})[o.perm_key] = true;
      });
      var out = [];
      res[2].forEach(function (p) {
        if (!p.email || p.active === false) return;
        var em = p.email.toLowerCase(); seen[em] = 1;
        out.push({ email: em, name: p.name || em.split("@")[0], title: p.title || "", dept: p.department || "", signedIn: !!prof[em], role: norm(prof[em] || "member"), raw: prof[em] || "", grants: grants[em] || {} });
      });
      Object.keys(prof).forEach(function (em) {
        if (seen[em]) return;
        out.push({ email: em, name: em.split("@")[0], title: "", dept: "", signedIn: true, role: norm(prof[em]), raw: prof[em], grants: grants[em] || {}, offDirectory: true });
      });
      people = out.sort(function (a, b) { return a.name.localeCompare(b.name); });
      loading = false;
    });
  }

  /* ---------- writes ---------- */
  function setRole(p, role) {
    var c = client(); if (!c) return Promise.reject(new Error("Not signed in"));
    return c.from("profiles").update({ role: role }).eq("email", p.email).then(function (r) {
      if (r.error) throw r.error;
      p.role = role; p.raw = role;
    });
  }
  function setGrant(p, key, on) {
    var c = client(); if (!c) return Promise.reject(new Error("Not signed in"));
    var q = on
      ? c.from("permission_overrides").upsert({ email: p.email, perm_key: key, grant_perm: true, note: "Admin > Access" }, { onConflict: "email,perm_key" })
      : c.from("permission_overrides").delete().eq("email", p.email).eq("perm_key", key);
    return q.then(function (r) {
      if (r.error) throw r.error;
      if (on) p.grants[key] = true; else delete p.grants[key];
    });
  }

  /* ---------- UI ---------- */
  var toastEl = null, toastT = null;
  function toast(msg, err) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "acc-toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.toggle("err", !!err); toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  function pane() { return document.querySelector('.admin-pane[data-admin-pane="people-admin"]'); }

  function render() {
    var el = pane(); if (!el) return;
    injectCss();
    var counts = { member: 0, manager: 0, superadmin: 0, pending: 0 };
    people.forEach(function (p) { counts[p.role]++; if (!p.signedIn) counts.pending++; });
    var restrictedCounts = RESTRICTED.map(function (r) { return people.filter(function (p) { return p.grants[r.key]; }).length; });

    var html = '<div class="acc">' +
      '<div class="acc-head"><div>' +
        '<div class="acc-eyebrow">' + ICON.shield + 'Access control</div>' +
        '<h2 class="acc-h">Who can get to what</h2>' +
        '<div class="acc-dek">Every signed-in team member gets Home, Training, Career Paths, Directory, Software &amp; Tools and Brand Hub. ' +
        'A person’s <b>role</b> adds the rest of the sidebar; <b>restricted areas</b> are the only tabs that need a name on a list. Changes save instantly and apply the next time they load HQ.</div>' +
      '</div></div>' +
      '<div class="acc-tiles">' +
        '<div class="acc-tile"><b>' + people.length + '</b><span>Team members</span></div>' +
        '<div class="acc-tile"><b>' + counts.superadmin + '</b><span>Super admins</span></div>' +
        '<div class="acc-tile"><b>' + counts.manager + '</b><span>Managers</span></div>' +
        RESTRICTED.map(function (r, i) { return '<div class="acc-tile"><b>' + restrictedCounts[i] + '</b><span>' + esc(r.label) + '</span></div>'; }).join("") +
        (counts.pending ? '<div class="acc-tile"><b>' + counts.pending + '</b><span>Not signed in yet</span></div>' : "") +
      '</div>' +
      '<div class="acc-bar">' +
        '<label class="acc-search">' + ICON.search + '<input type="search" id="accSearch" placeholder="Search name, email, title" value="' + esc(filter) + '"></label>' +
        [["all", "Everyone"], ["superadmin", "Super admins"], ["manager", "Managers"], ["member", "Members"]].concat(RESTRICTED.map(function (r) { return ["g:" + r.key, r.label]; })).map(function (c) {
          return '<button type="button" class="acc-chip' + (chip === c[0] ? " on" : "") + '" data-chip="' + esc(c[0]) + '">' + esc(c[1]) + '</button>';
        }).join("") +
      '</div>';

    var q = filter.toLowerCase().trim();
    var rows = people.filter(function (p) {
      if (chip !== "all") { if (chip.indexOf("g:") === 0) { if (!p.grants[chip.slice(2)]) return false; } else if (p.role !== chip) return false; }
      return !q || p.name.toLowerCase().indexOf(q) >= 0 || p.email.indexOf(q) >= 0 || p.title.toLowerCase().indexOf(q) >= 0;
    });

    html += '<table class="acc-table"><thead><tr><th>Team member</th><th>Role</th>' +
      RESTRICTED.map(function (r) { return '<th title="' + esc(r.hint) + '">' + esc(r.label) + '</th>'; }).join("") +
      '<th>Department</th><th></th></tr></thead><tbody>';
    if (loading) html += '<tr><td colspan="9" class="acc-empty">Loading team members…</td></tr>';
    else if (!rows.length) html += '<tr><td colspan="9" class="acc-empty">No one matches.</td></tr>';
    rows.forEach(function (p) {
      var ini = p.name.split(/[\s._-]+/).map(function (s) { return s.charAt(0); }).join("").slice(0, 2).toUpperCase();
      html += '<tr data-email="' + esc(p.email) + '">' +
        '<td><div class="acc-who"><span class="acc-av">' + esc(ini) + '</span><div style="min-width:0"><div class="acc-nm">' + esc(p.name) + (p.title ? ' <span class="acc-sub">· ' + esc(p.title) + '</span>' : "") + '</div>' +
          '<div class="acc-sub' + (p.signedIn ? "" : " warn") + '">' + esc(p.email) + (p.signedIn ? "" : " · hasn’t signed in to HQ yet — becomes a Member on first sign-in") + (p.offDirectory ? " · not in the M365 directory" : "") + '</div></div></div></td>' +
        '<td><select class="acc-role ' + p.role + '" data-act="role"' + (p.signedIn ? "" : " disabled title=\"Role can be set once they have signed in\"") + '>' +
          ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (p.role === r[0] ? " selected" : "") + ' title="' + esc(r[2]) + '">' + r[1] + '</option>'; }).join("") + '</select></td>' +
        RESTRICTED.map(function (r) {
          var on = !!p.grants[r.key];
          return '<td><label class="acc-chk' + (on ? " on" : "") + '" data-act="grant" data-key="' + esc(r.key) + '"><i>' + ICON.check + '</i>' + (on ? "Allowed" : "No") + '</label></td>';
        }).join("") +
        '<td class="acc-sub">' + esc(p.dept) + '</td>' +
        '<td style="text-align:right"><button type="button" class="acc-view" data-act="view">' + ICON.eye + 'View as</button></td>' +
      '</tr>';
    });
    html += '</tbody></table>' +
      '<div class="acc-note">' + ICON.lock.replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"') +
      'Roles live in Supabase <code>profiles.role</code>; restricted areas in <code>permission_overrides</code>. Super admins here are the people who get the Admin tab. ' +
      'The old custom-roles editor, the role_assignments list and the “Your role” demo switcher are retired — this screen is the only place access is set.</div>' +
    '</div>';
    el.innerHTML = html;
    wire(el);
  }

  function wire(el) {
    var inp = el.querySelector("#accSearch");
    if (inp) inp.addEventListener("input", function () { filter = inp.value; var pos = inp.selectionStart; render(); var n = el.querySelector("#accSearch"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } });
    el.querySelectorAll(".acc-chip").forEach(function (b) { b.addEventListener("click", function () { chip = b.getAttribute("data-chip"); render(); }); });
    el.querySelectorAll("select[data-act=role]").forEach(function (s) {
      s.addEventListener("change", function () {
        var p = byRow(s); if (!p) return;
        var prev = p.role, next = s.value;
        if (p.email === (me || "") && next !== "superadmin" && !confirm("That would remove your own Admin access. Continue?")) { s.value = prev; return; }
        s.disabled = true;
        setRole(p, next).then(function () { toast(p.name + " is now " + label(next)); render(); })
          .catch(function (e) { s.disabled = false; s.value = prev; toast("Couldn’t save: " + (e.message || e), true); });
      });
    });
    el.querySelectorAll("label[data-act=grant]").forEach(function (l) {
      l.addEventListener("click", function (ev) {
        ev.preventDefault();
        var p = byRow(l); if (!p) return;
        var key = l.getAttribute("data-key"), on = !p.grants[key];
        l.classList.add("busy");
        setGrant(p, key, on).then(function () { toast((on ? "Added " : "Removed ") + p.name + (on ? " to " : " from ") + keyLabel(key)); render(); })
          .catch(function (e) { l.classList.remove("busy"); toast("Couldn’t save: " + (e.message || e), true); });
      });
    });
    el.querySelectorAll("button[data-act=view]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = byRow(b); if (!p) return;
        if (window.hqViewAs && window.hqViewAs.start) window.hqViewAs.start(p.email, p.role, p.name);
        else toast("View as isn’t loaded in this tab yet — refresh and try again.", true);
      });
    });
  }
  function byRow(node) { var tr = node.closest("tr"); var em = tr && tr.getAttribute("data-email"); return people.filter(function (p) { return p.email === em; })[0]; }
  function label(role) { return (ROLES.filter(function (r) { return r[0] === role; })[0] || [0, role])[1]; }
  function keyLabel(key) { return (RESTRICTED.filter(function (r) { return r.key === key; })[0] || { label: key }).label; }

  /* ---------- boot ---------- */
  function isSuperAdmin() {
    try {
      var u = window.SPARK_SB.whoami(); me = u && u.email ? u.email.toLowerCase() : null;
      var mine = people.filter(function (p) { return p.email === me; })[0];
      return !!(mine && mine.role === "superadmin");
    } catch (e) { return false; }
  }
  function refresh() {
    var el = pane(); if (!el) return;
    el.innerHTML = '<div class="acc"><div class="acc-empty">Loading team members…</div></div>'; injectCss();
    load().then(function () {
      if (!isSuperAdmin()) { el.innerHTML = '<div class="acc"><div class="acc-empty">Access control is for super admins.</div></div>'; return; }
      render();
    }).catch(function (e) { el.innerHTML = '<div class="acc"><div class="acc-empty">Couldn’t load: ' + esc(e.message || e) + '</div></div>'; });
  }
  function boot(t) {
    t = t || 0;
    var ready = pane() && window.SPARK_SB && window.SPARK_SB.getClient && window.SPARK_SB.whoami && window.SPARK_SB.whoami();
    if (!ready) { if (t < 60) setTimeout(function () { boot(t + 1); }, 700); return; }
    injectCss();
    // Lazy: nothing is fetched until the Access sub-tab is actually opened, so this add-on costs members
    // nothing on page load (just the 7 KB script). Re-pulled on every open so changes made elsewhere show up.
    var p = pane();
    if (p && p.style.display !== "none" && p.offsetParent !== null) refresh();
    else p.innerHTML = '<div class="acc"><div class="acc-empty">Open Access to load team members.</div></div>';
    document.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest('.admin-subnav-item[data-admin-tab="people-admin"]');
      if (b) setTimeout(refresh, 60);
    });
    // Rename the sub-tab to match what it is now.
    var btn = document.querySelector('.admin-subnav-item[data-admin-tab="people-admin"] > span');
    if (btn) btn.textContent = "Access";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); }); else boot();
})();
