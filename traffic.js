/* TRAFFIC_BY_PERSON_v1.1 — Admin > Where people go > By person
   Loaded into the HQ shell by spark-home.html (same path as my-links.js / viewas.js / access.js).
   The existing "Where people go" pane already records every tab change with who and when (worker /track) but
   only shows totals by tab. This adds a per-person view on the same data: who is using HQ, when they were last in,
   what they open most, and their click-by-click path — so you can see where each person actually goes. */
(function () {
  "use strict";
  if (window.__hqTraffic) return;
  window.__hqTraffic = true;

  var WORKER = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var days = 30, rows = [], people = {}, q = "", open = {}, sort = "recent";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var I = {
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 19h16"/></svg>'
  };

  var CSS = "" +
    "#tpByPerson{margin-top:26px;font-family:Outfit,Inter,system-ui,sans-serif}" +
    "#tpByPerson svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}" +
    "#tpByPerson .tp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}" +
    "#tpByPerson h3{margin:0;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}" +
    "#tpByPerson .tp-sub{font-size:12.5px;color:#6B675C;margin:4px 0 0}" +
    "#tpByPerson .tp-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}" +
    "#tpByPerson .tp-search{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #ddd7c8;border-radius:10px;padding:0 10px;color:#6B675C}" +
    "#tpByPerson .tp-search input{border:0;outline:0;padding:8px 0;font:13px Outfit,Inter,system-ui,sans-serif;background:transparent;width:200px;color:#1a1915}" +
    "#tpByPerson .tp-chip{border:1px solid #ddd7c8;background:#fff;border-radius:999px;padding:6px 11px;font:600 12px Outfit,Inter,system-ui,sans-serif;cursor:pointer;color:#6B675C;display:inline-flex;align-items:center;gap:6px}" +
    "#tpByPerson .tp-chip.on{background:#0D0E1A;color:#FFC800;border-color:#0D0E1A}" +
    "#tpByPerson .tp-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}" +
    "#tpByPerson .tp-tile{background:#fff;border:1px solid #ece8de;border-radius:12px;padding:12px 14px}" +
    "#tpByPerson .tp-tile b{display:block;font-size:22px;line-height:1.1}" +
    "#tpByPerson .tp-tile span{font-size:11px;color:#6B675C;text-transform:uppercase;letter-spacing:.4px;font-weight:600}" +
    "#tpByPerson table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #ece8de;border-radius:14px;overflow:hidden}" +
    "#tpByPerson th{text-align:left;font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#9a9484;font-weight:700;padding:11px 14px;background:#fbf9f3;border-bottom:1px solid #ece8de;cursor:pointer;user-select:none}" +
    "#tpByPerson th.on{color:#1a1915}" +
    "#tpByPerson td{padding:10px 14px;border-bottom:1px solid #f1ede3;vertical-align:middle;font-size:13px}" +
    "#tpByPerson tr.p{cursor:pointer}" +
    "#tpByPerson tr.p:hover td{background:#fdfbf4}" +
    "#tpByPerson tr.p.open td{background:#fff8dc}" +
    "#tpByPerson .who{display:flex;align-items:center;gap:10px;min-width:0}" +
    "#tpByPerson .av{width:30px;height:30px;border-radius:50%;background:#0D0E1A;color:#FFC800;display:grid;place-items:center;font-size:11px;font-weight:700;flex:none}" +
    "#tpByPerson .nm{font-weight:600}" +
    "#tpByPerson .em{font-size:11px;color:#6B675C}" +
    "#tpByPerson .bar{display:inline-block;height:6px;border-radius:3px;background:#FFC800;vertical-align:middle;margin-right:8px}" +
    "#tpByPerson .top{display:flex;gap:5px;flex-wrap:wrap}" +
    "#tpByPerson .tag{font-size:11px;background:#f3efe4;border-radius:999px;padding:2px 8px;color:#1a1915;white-space:nowrap}" +
    "#tpByPerson .tag i{font-style:normal;color:#9a9484;margin-left:3px}" +
    "#tpByPerson .chev svg{transition:transform .15s;color:#9a9484}" +
    "#tpByPerson tr.open .chev svg{transform:rotate(90deg)}" +
    "#tpByPerson .path{padding:4px 14px 14px 54px;background:#fffdf5}" +
    "#tpByPerson .day{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#9a9484;font-weight:700;margin:12px 0 6px}" +
    "#tpByPerson .ev{display:flex;align-items:center;gap:10px;font-size:12.5px;padding:3px 0}" +
    "#tpByPerson .ev .t{font-variant-numeric:tabular-nums;color:#6B675C;width:64px;flex:none}" +
    "#tpByPerson .ev .d{width:6px;height:6px;border-radius:50%;background:#FFC800;flex:none}" +
    "#tpByPerson .ev .d.action{background:#38bdf8}" +
    "#tpByPerson .ev .d.admin{background:#a78bfa}" +
    "#tpByPerson .ev .dev{font-size:10.5px;color:#9a9484;margin-left:auto}" +
    "#tpByPerson .empty{padding:22px;text-align:center;color:#6B675C;font-size:13px}";

  function css() { if (document.getElementById("tfPeopleCss")) return; var s = document.createElement("style"); s.id = "tfPeopleCss"; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- data ---------- */
  var dir = null;
  function loadDir() {
    if (dir) return Promise.resolve(dir);
    return window.SPARK_SB.getToken().then(function (tok) {
      return fetch(WORKER + "/directory", { headers: { Authorization: "Bearer " + tok } }).then(function (r) { return r.ok ? r.json() : { people: [] }; });
    }).then(function (d) { dir = {}; (d.people || []).forEach(function (p) { if (p.email) dir[p.email.toLowerCase()] = p; }); return dir; }).catch(function () { dir = {}; return dir; });
  }
  function load() {
    var st = document.getElementById("tpStatus"); if (st) st.textContent = "Loading…";
    return Promise.all([loadDir(), window.SPARK_SB.getToken().then(function (tok) {
      return fetch(WORKER + "/track?days=" + days, { headers: { Authorization: "Bearer " + tok } }).then(function (r) { return r.json(); });
    })]).then(function (res) {
      rows = (res[1] && res[1].rows) || [];
      crunch();
      render();
    }).catch(function (e) { if (st) st.textContent = "Couldn’t load: " + (e.message || e); });
  }
  function crunch() {
    people = {};
    // Collapse immediate repeats (the tracker fires twice on some tab switches) so counts mean real visits.
    var lastByUser = {};
    rows.slice().sort(function (a, b) { return a.ts < b.ts ? -1 : 1; }).forEach(function (r) {
      var em = (r.email || "").toLowerCase(); if (!em) return;
      var prev = lastByUser[em];
      if (prev && prev.target === r.target && (new Date(r.ts) - new Date(prev.ts)) < 5000) return;
      lastByUser[em] = r;
      var p = people[em] || (people[em] = { email: em, events: [], tabs: {}, days: {}, first: r.ts, last: r.ts, devices: {} });
      p.events.push(r);
      p.last = r.ts;
      p.tabs[r.label || r.target] = (p.tabs[r.label || r.target] || 0) + 1;
      p.days[r.ts.slice(0, 10)] = 1;
      p.devices[r.device || "desktop"] = (p.devices[r.device || "desktop"] || 0) + 1;
    });
    Object.keys(people).forEach(function (em) {
      var p = people[em], d = dir[em] || {};
      p.name = d.name || em.split("@")[0]; p.title = d.title || ""; p.dept = d.department || "";
      p.visits = p.events.length; p.activeDays = Object.keys(p.days).length;
      p.topTabs = Object.keys(p.tabs).map(function (k) { return [k, p.tabs[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
    });
  }

  /* ---------- render ---------- */
  function fmtAgo(ts) {
    var m = Math.round((Date.now() - new Date(ts)) / 60000);
    if (m < 2) return "just now"; if (m < 60) return m + " min ago"; var h = Math.round(m / 60); if (h < 24) return h + " h ago";
    var d = Math.round(h / 24); return d === 1 ? "yesterday" : d + " days ago";
  }
  function fmtTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function fmtDay(s) { var d = new Date(s + "T12:00:00"); return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }

  function render() {
    var host = document.getElementById("tpByPerson"); if (!host) return;
    var list = Object.keys(people).map(function (k) { return people[k]; });
    var allDir = Object.keys(dir || {}).filter(function (em) { return dir[em].active !== false; });
    var silent = allDir.filter(function (em) { return !people[em]; });
    var qq = q.toLowerCase().trim();
    var shown = list.filter(function (p) { return !qq || p.name.toLowerCase().indexOf(qq) >= 0 || p.email.indexOf(qq) >= 0 || p.dept.toLowerCase().indexOf(qq) >= 0; });
    shown.sort(sort === "recent" ? function (a, b) { return a.last < b.last ? 1 : -1; }
      : sort === "visits" ? function (a, b) { return b.visits - a.visits; }
      : sort === "days" ? function (a, b) { return b.activeDays - a.activeDays; }
      : function (a, b) { return a.name.localeCompare(b.name); });
    var maxVisits = Math.max.apply(null, list.map(function (p) { return p.visits; }).concat([1]));

    var h = '<div class="tp-head"><div><h3>' + I.user + 'By person</h3><div class="tp-sub">Who opened HQ in the last ' + days + ' days, when they were last in, and where they went. Click a row for their click-by-click path.</div></div>' +
      '<div class="tp-tools"><label class="tp-search">' + I.search + '<input id="tpSearch" placeholder="Name, email or team" value="' + esc(q) + '"></label>' +
      '<button type="button" class="tp-chip" id="tpExport" title="Download every event in this range as Excel">' + I.dl + 'Export</button></div></div>' +
      '<div class="tp-tiles"><div class="tp-tile"><b>' + list.length + '</b><span>People active</span></div>' +
      '<div class="tp-tile"><b>' + silent.length + '</b><span>Haven’t opened HQ</span></div>' +
      '<div class="tp-tile"><b>' + list.reduce(function (a, p) { return a + p.visits; }, 0) + '</b><span>Tab visits</span></div>' +
      '<div class="tp-tile"><b>' + list.filter(function (p) { return Date.now() - new Date(p.last) < 864e5; }).length + '</b><span>In today</span></div></div>' +
      '<div id="tpStatus" style="font-size:12px;color:#9a9484;margin:0 0 10px"></div>' +
      '<table><thead><tr>' +
        th("name", "Team member") + th("recent", "Last in") + th("visits", "Visits") + th("days", "Active days") + '<th>Goes to most</th><th></th>' +
      '</tr></thead><tbody>';
    if (!shown.length) h += '<tr><td colspan="6" class="empty">' + (list.length ? "No one matches." : "No activity recorded in this range.") + '</td></tr>';
    shown.forEach(function (p) {
      var ini = p.name.split(/[\s._-]+/).map(function (s) { return s.charAt(0); }).join("").slice(0, 2).toUpperCase();
      var isOpen = !!open[p.email];
      h += '<tr class="p' + (isOpen ? " open" : "") + '" data-em="' + esc(p.email) + '">' +
        '<td><div class="who"><span class="av">' + esc(ini) + '</span><div style="min-width:0"><div class="nm">' + esc(p.name) + (p.title ? ' <span class="em">· ' + esc(p.title) + '</span>' : "") + '</div><div class="em">' + esc(p.dept || p.email) + '</div></div></div></td>' +
        '<td title="' + esc(new Date(p.last).toLocaleString()) + '">' + esc(fmtAgo(p.last)) + '</td>' +
        '<td><span class="bar" style="width:' + Math.max(4, Math.round(p.visits / maxVisits * 70)) + 'px"></span>' + p.visits + '</td>' +
        '<td>' + p.activeDays + '</td>' +
        '<td><div class="top">' + p.topTabs.map(function (t) { return '<span class="tag">' + esc(t[0]) + '<i>' + t[1] + '</i></span>'; }).join("") + '</div></td>' +
        '<td class="chev">' + I.chev + '</td></tr>';
      if (isOpen) h += '<tr><td colspan="6" style="padding:0"><div class="path">' + pathHtml(p) + '</div></td></tr>';
    });
    h += '</tbody></table>';
    if (silent.length) {
      h += '<details style="margin-top:12px;font-size:12.5px;color:#6B675C"><summary style="cursor:pointer;font-weight:600">' + silent.length + ' people in the directory with no HQ activity in this range</summary><div style="margin-top:8px;line-height:1.7">' +
        silent.map(function (em) { return esc((dir[em].name || em)); }).sort().join(" · ") + '</div></details>';
    }
    host.innerHTML = h;
    wire(host);
  }
  function th(key, label) { return '<th data-sort="' + key + '" class="' + (sort === key ? "on" : "") + '">' + label + (sort === key ? " ↓" : "") + '</th>'; }
  function pathHtml(p) {
    var evs = p.events.slice().reverse(); // newest first
    var out = "", lastDay = "";
    evs.slice(0, 400).forEach(function (e) {
      var day = e.ts.slice(0, 10);
      if (day !== lastDay) { out += '<div class="day">' + esc(fmtDay(day)) + '</div>'; lastDay = day; }
      var kind = e.type === "action" ? "action" : (String(e.target).indexOf("admin:") === 0 ? "admin" : "tab");
      out += '<div class="ev"><span class="t">' + esc(fmtTime(e.ts)) + '</span><span class="d ' + kind + '"></span><span>' + esc(e.label || e.target) + '</span><span class="dev">' + esc(e.device || "") + '</span></div>';
    });
    if (evs.length > 400) out += '<div class="ev" style="color:#9a9484">… ' + (evs.length - 400) + ' earlier events in the export</div>';
    return out || '<div class="empty">Nothing recorded.</div>';
  }
  function wire(host) {
    var inp = host.querySelector("#tpSearch");
    inp.addEventListener("input", function () { q = inp.value; var pos = inp.selectionStart; render(); var n = host.querySelector("#tpSearch"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } });
    host.querySelectorAll("th[data-sort]").forEach(function (t) { t.addEventListener("click", function () { sort = t.getAttribute("data-sort"); render(); }); });
    host.querySelectorAll("tr.p").forEach(function (tr) { tr.addEventListener("click", function () { var em = tr.getAttribute("data-em"); open[em] = !open[em]; render(); }); });
    host.querySelector("#tpExport").addEventListener("click", exportXlsx);
  }

  /* ---------- export ---------- */
  function lib() { return window.XLSX ? Promise.resolve(window.XLSX) : new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = function () { res(window.XLSX); }; s.onerror = function () { rej(new Error("Could not load the Excel library.")); }; document.head.appendChild(s); }); }
  function exportXlsx() {
    lib().then(function (X) {
      var wb = X.utils.book_new();
      var summary = Object.keys(people).map(function (k) { var p = people[k]; return { Name: p.name, Email: p.email, Team: p.dept, "Last in": new Date(p.last).toLocaleString(), Visits: p.visits, "Active days": p.activeDays, "Top tab": p.topTabs[0] ? p.topTabs[0][0] : "", "Top tab visits": p.topTabs[0] ? p.topTabs[0][1] : 0 }; }).sort(function (a, b) { return b.Visits - a.Visits; });
      var ws1 = X.utils.json_to_sheet(summary); ws1["!cols"] = [{ wch: 24 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 8 }, { wch: 11 }, { wch: 24 }, { wch: 14 }];
      X.utils.book_append_sheet(wb, ws1, "By person");
      var events = rows.slice().sort(function (a, b) { return a.ts < b.ts ? 1 : -1; }).map(function (r) { var em = (r.email || "").toLowerCase(); return { When: new Date(r.ts).toLocaleString(), Name: (dir[em] && dir[em].name) || em, Email: em, Type: r.type, Where: r.label || r.target, Target: r.target, Device: r.device || "" }; });
      var ws2 = X.utils.json_to_sheet(events); ws2["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 34 }, { wch: 8 }, { wch: 30 }, { wch: 24 }, { wch: 9 }];
      X.utils.book_append_sheet(wb, ws2, "Every event");
      var d = new Date(), stamp = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      X.writeFile(wb, "Spark-HQ-usage-" + days + "d-" + stamp + ".xlsx");
    }).catch(function (e) { alert(e.message || e); });
  }

  /* ---------- boot ---------- */
  function mount() {
    var pane = document.querySelector('.admin-pane[data-admin-pane="traffic"]'); if (!pane || document.getElementById("tpByPerson")) return;
    css();
    var host = document.createElement("div"); host.id = "tpByPerson"; host.innerHTML = '<div class="empty">Open “Where people go” to load activity by person.</div>';
    // The pane already has a small per-person table (tbody#tpByPerson: visits, top tabs, last active). This view
    // supersedes it, so it takes that card's place and the old card is hidden rather than shown twice.
    var oldBody = document.getElementById("tfPeople"), oldCard = oldBody && oldBody.closest("table") && oldBody.closest("table").parentElement;
    if (oldCard && oldCard !== pane) { oldCard.parentElement.insertBefore(host, oldCard); oldCard.style.display = "none"; }
    else { var sec = pane.querySelector(".admin-section") || pane; sec.appendChild(host); }
    // Follow the pane's own range buttons (7 / 30 / 90) and Refresh.
    pane.querySelectorAll("#tfRange button").forEach(function (b) { b.addEventListener("click", function () { days = +b.getAttribute("data-d") || days; load(); }); });
    pane.querySelectorAll("button").forEach(function (b) { if (/refresh/i.test(b.textContent)) b.addEventListener("click", function () { load(); }); });
    document.addEventListener("click", function (e) { var b = e.target && e.target.closest && e.target.closest('.admin-subnav-item[data-admin-tab="traffic"]'); if (b) setTimeout(load, 80); });
    if (pane.style.display !== "none" && pane.offsetParent !== null) load();
  }
  (function boot(t) { t = t || 0; if (window.SPARK_SB && window.SPARK_SB.getToken && document.querySelector('.admin-pane[data-admin-pane="traffic"]')) mount(); else if (t < 60) setTimeout(function () { boot(t + 1); }, 700); })();
})();
