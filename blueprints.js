/* BLUEPRINTS_v2.0 (My Blueprint + Salesforce actuals) — Blueprint Builder, a sub-item under Leadership in the HQ sidebar.
   Loaded into the HQ shell by spark-home.html (same path as hired-direct.js and benefits.js; index.html is too
   large to edit on github.com). Nothing in index.html changes.

   What it is
     Fletcher's One Page Blueprints, rebuilt as data. Pick a team member and their role and service line; the
     KPIs, direct-hire target, weekly charge and headcount come from the rules (Blueprint Workflow.xlsx),
     focused titles come from the service line's title library, and the one-pager previews live in the
     entity's branding. Print / PDF and Word export from the preview.

   Access: super admins + anyone granted the "Blueprint Builder" restricted area (tab:blueprints) in Admin > Access.
   The nav item only appears after the worker confirms access, so nobody else ever sees it.

   Data: GET /blueprints (rules + all blueprints), POST /blueprints { id?, status, data }, DELETE /blueprints?id=,
         POST /blueprints/rules { data }. Tables + seed in worker/blueprints.sql. */
(function () {
  "use strict";
  if (window.__hqBlueprints) return;
  window.__hqBlueprints = true;

  var WORKER = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var TAB = "blueprints";
  var MAX_TITLES = 5;
  var LOGOS = {
    "Spark Companies": "spark-companies", "Spark Talent Acquisition": "spark-talent", "Ignite": "ignite-search",
    "Flex": "flex", "Spark Packaging": "spark-packaging", "JJP": "jjp"
  };

  var S = {
    loaded: false, loading: null, err: "", missing: false, admin: false, me: "",
    rules: null, rulesAt: "", rulesBy: "", list: [],
    view: "list", filter: "all", q: "",
    cur: null, curId: null, curStatus: "draft", dirty: false, activeGroup: 0, saving: false, msg: "",
    rulesDraft: null, rulesLine: "", rulesRole: ""
  };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
  function money(n) { if (n == null || n === "" || isNaN(+n)) return "Case by case"; return "$" + Math.round(+n).toLocaleString("en-US"); }
  function fmtDate(iso) { if (!iso) return ""; var d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function token() { return window.SPARK_SB && window.SPARK_SB.getToken ? window.SPARK_SB.getToken() : Promise.resolve(null); }
  function api(method, path, body) {
    return token().then(function (t) {
      if (!t) throw new Error("Sign in first.");
      var init = { method: method, headers: { Authorization: "Bearer " + t } };
      if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
      return fetch(WORKER + path, init);
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || ("Request failed (" + r.status + ")")); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function line(name) { var L = (S.rules && S.rules.serviceLines) || []; for (var i = 0; i < L.length; i++) if (L[i].name === name) return L[i]; return null; }
  function rosterFor(name) { var R = (S.rules && S.rules.roster) || []; var n = String(name || "").trim().toLowerCase(); for (var i = 0; i < R.length; i++) if (R[i].name.toLowerCase() === n) return R[i]; return null; }
  function kpiRule(role, sl) { var k = S.rules && S.rules.kpi && S.rules.kpi[role]; return k ? k[sl] || null : null; }
  function standardKpis(role, sl) {
    var k = kpiRule(role, sl); if (!k) return [];
    var out = [];
    if (k.starts !== "" && k.starts != null) out.push(/^\d+$/.test(String(k.starts)) ? k.starts + " starts per week" : "Starts: " + k.starts);
    if (+k.meetings > 0) out.push("Minimum of " + k.meetings + " client meetings per week");
    if (+k.preScreens > 0) out.push("Minimum of " + k.preScreens + " pre-screens per week");
    if (+k.inProcess > 0) out.push("Maintain a minimum of " + k.inProcess + " candidates in process at all times");
    if (+k.calls > 0) out.push("Minimum of " + k.calls + " calls per week");
    if (k.reference && k.reference !== "N/A") out.push("References: " + k.reference);
    return out;
  }
  function blank() {
    return { name: "", company: "Spark Talent Acquisition", title: "", role: "Recruiter", region: "", territory: "", serviceLine: "", secondaryServiceLine: "",
      hc: "", dhFocused: false, reportsTo: "", kpis: [], s4: clone((S.rules && S.rules.s4) || []), contacts: [], titleGroups: [{ group: "", titles: [] }],
      rolesHeading: "Focused Roles", notes: "", flags: [] };
  }
  function allTitles(d) { var o = []; (d.titleGroups || []).forEach(function (g) { (g.titles || []).forEach(function (t) { o.push(t); }); }); return o; }
  function needsAttention(b) { var d = b.data || {}; var sy = sync(d); return !!((d.flags && d.flags.length) || !allTitles(d).length || !d.serviceLine || (sy && sy.state !== "ok") || (sy && sy.issues.length) || startsGap(d)); }
  /* STANDARDS_v1 (Oct 26 Sr Leadership): every producer blueprint carries its weekly starts standard.
     7 starts for Light Industrial, build/pipe/wire automation and data center; 2 for Skilled Trades; the rest per the rules. */
  function startsStd(d) { var k = kpiRule(d.role, d.serviceLine); return k && /^\d+$/.test(String(k.starts)) ? +k.starts : 0; }
  function hasStarts(d) { return (d.kpis || []).some(function (x) { return /\d/.test(x) && /\bstarts?\b/i.test(x); }); }
  function startsGap(d) { var n = startsStd(d); return n && !hasStarts(d) ? n : 0; }
  /* ---------- MY_BLUEPRINT_v1: Salesforce actuals vs the blueprint's weekly goals ---------- */
  var ACT = { this: null, last: null, loading: {} };
  function mondayOf(offsetWeeks) { var d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7 * (offsetWeeks || 0)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function loadActuals(which) {
    which = which || "this";
    if (ACT.loading[which]) return ACT.loading[which];
    ACT.loading[which] = api("GET", "/blueprints/actuals?week=" + mondayOf(which === "last" ? -1 : 0)).then(function (d) { ACT[which] = d; return d; })
      .catch(function (e) { ACT[which] = { error: e.message }; }).then(function (x) { ACT.loading[which] = null; return x; });
    return ACT.loading[which];
  }
  var METRICS = [
    [/\bstarts?\b/i, "starts", "Starts"], [/submi(t|ss)/i, "submittals", "Submittals"], [/pre-?\s?screen/i, "preScreens", "Pre-screens"],
    [/new (client )?meeting/i, "newMeetings", "New meetings"], [/meeting/i, "meetings", "Meetings"], [/in process|active candidates|candidates in/i, "inProcess", "In process"],
    [/interview/i, "interviews", "Interviews"], [/\bcalls?\b/i, "calls", "Calls"]
  ];
  function goalRows(d) {
    var out = [], used = {};
    (d.kpis || []).forEach(function (k) {
      var g = goal(k); if (!g) return;
      var n = parseFloat(String(g.n).replace(/[$,+]/g, "")); if (!n) return;
      for (var i = 0; i < METRICS.length; i++) if (METRICS[i][0].test(k)) {
        var key = METRICS[i][1]; if (used[key]) return; used[key] = 1;
        var daily = per(g.l) === "Day";
        out.push({ key: key, label: METRICS[i][2], target: daily ? n * 5 : n, snapshot: key === "inProcess", text: k, daily: daily });
        return;
      }
    });
    return out;
  }
  function emailFor(d) { if (d.email) return String(d.email).toLowerCase(); var p = personFor(d); return p ? p.email : ""; }
  function workdaysIn(which) { if (which === "last") return 5; var et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" })); var dow = (et.getDay() + 6) % 7; return Math.min(5, dow + (et.getHours() >= 17 ? 1 : 0.5)); }
  function scorecard(d, which, email) {
    which = which || "this";
    var A = ACT[which];
    var tabs = '<div class="bp-wk"><button data-act="actwk" data-w="this" class="' + (which === "this" ? "on" : "") + '">This week</button><button data-act="actwk" data-w="last" class="' + (which === "last" ? "on" : "") + '">Last week</button></div>';
    var head = '<div class="sc-head"><div><div class="sc-k">From Salesforce</div><b>' + (which === "this" ? "This week so far" : "Last week") + "</b></div>" + tabs + "</div>";
    if (!A) { loadActuals(which).then(render); return '<div class="sc">' + head + '<div class="op-empty">Loading Salesforce numbers…</div></div>'; }
    if (A.error) return '<div class="sc">' + head + '<div class="op-empty">Couldn\'t load Salesforce numbers: ' + esc(A.error) + "</div></div>";
    email = email || emailFor(d);
    var me = A.people && A.people[email];
    var rows = goalRows(d);
    if (!email) return '<div class="sc">' + head + '<div class="op-empty">Link this blueprint to a Microsoft 365 account to see Salesforce numbers.</div></div>';
    if (!rows.length) return '<div class="sc">' + head + '<div class="op-empty">No numeric weekly goals on this blueprint yet.</div></div>';
    me = me || { starts: 0, submittals: 0, interviews: 0, preScreens: 0, calls: 0, meetings: 0, newMeetings: 0, inProcess: 0, r4: { starts: 0, submittals: 0, interviews: 0 } };
    var frac = workdaysIn(which) / 5;
    var h = '<div class="sc">' + head + '<div class="sc-rows">' + rows.map(function (r) {
      var v = me[r.key] || 0, pct = Math.min(100, Math.round(v / r.target * 100)), pace = r.snapshot ? r.target : Math.ceil(r.target * frac - 1e-9);
      var state = v >= r.target ? "met" : (v >= pace ? "on" : "behind");
      var note = state === "met" ? "Goal met" : r.snapshot ? (r.target - v) + " to go" : (which === "this" ? (state === "on" ? "On pace" : "Behind pace (" + pace + " by now)") : "Missed by " + (r.target - v));
      return '<div class="sc-row ' + state + '"><div class="sc-l"><b>' + esc(r.label) + "</b><span>" + esc(note) + '</span></div><div class="sc-bar"><i style="width:' + pct + '%"></i></div><div class="sc-v"><b>' + v + "</b> / " + r.target + (r.daily ? '<em title="' + esc(r.text) + '">daily x5</em>' : "") + "</div></div>";
    }).join("") + "</div>";
    var r4 = me.r4 || {}, s2i = r4.submittals ? Math.round(r4.interviews / r4.submittals * 100) : null, i2s = r4.interviews ? Math.round(r4.starts / r4.interviews * 100) : null;
    h += '<div class="sc-ratios"><span>Last 4 weeks:</span><span><b>' + (s2i == null ? "—" : s2i + "%") + "</b> submit to interview</span><span><b>" + (i2s == null ? "—" : i2s + "%") + "</b> interview to start</span><span><b>" + (r4.starts || 0) + "</b> starts</span></div>";
    return h + "</div>";
  }
  function addStarts(d) { var n = startsGap(d); if (n) d.kpis = [n + " starts per week"].concat(d.kpis || []); return n; }

  /* ---------- Microsoft 365 (same /directory feed as the HQ Directory tab) ----------
     365 owns name, title, company and manager. The blueprint keeps service line, territory, goals and titles. */
  var DIR = null;
  function loadDir() {
    return token().then(function (tk) { return fetch(WORKER + "/directory", { headers: { Authorization: "Bearer " + tk } }); })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !Array.isArray(j.people)) return;
        var byId = {}, byEmail = {};
        j.people.forEach(function (p) { byId[p.id] = p; byEmail[p.email] = p; });
        j.people.forEach(function (p) { p.manager = p.managerId && byId[p.managerId] ? byId[p.managerId].name : ""; });
        DIR = { list: j.people.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }), byId: byId, byEmail: byEmail };
      }).catch(function () {});
  }
  function normN(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  var NICK = { sam: "samantha", jake: "jacob", chris: "christopher", nick: "nicholas", ben: "benjamin", alex: "alexander", matt: "matthew", mike: "michael", dan: "daniel", kate: "katherine" };
  function personFor(d) {
    if (!DIR || !d) return null;
    var em = String(d.email || "").toLowerCase();
    if (em) return DIR.byEmail[em] || null;
    var n = normN(d.name); if (!n) return null;
    var exact = DIR.list.filter(function (p) { return normN(p.name) === n; });
    if (exact.length === 1) return exact[0];
    var parts = n.split(" "), first = parts[0], last = parts[parts.length - 1];
    var fuzzy = DIR.list.filter(function (p) {
      var q = normN(p.name).split(" "), pf = q[0], pl = q[q.length - 1];
      if (pl !== last) return false;
      return pf === first || pf.indexOf(first) === 0 || first.indexOf(pf) === 0 || NICK[first] === pf || NICK[pf] === first;
    });
    return fuzzy.length === 1 ? fuzzy[0] : null;
  }
  /* null = can't check yet; state: ok | left (had a 365 email that's gone) | nomatch (no 365 account found by name) */
  function sync(d) {
    if (!DIR || !d || !String(d.name || "").trim()) return null;
    var p = personFor(d);
    if (!p) return { state: d.email ? "left" : "nomatch", issues: [] };
    var iss = [];
    if (p.title && normN(p.title) !== normN(d.title)) iss.push({ f: "title", label: "Title", mine: d.title || "(blank)", theirs: p.title });
    if (p.manager && normN(p.manager) !== normN(d.reportsTo)) iss.push({ f: "reportsTo", label: "Reports to", mine: d.reportsTo || "(blank)", theirs: p.manager });
    return { state: "ok", p: p, issues: iss, blankTitle: !p.title, blankMgr: !p.manager };
  }
  function companyFor(p) {
    var dom = String(p.email || "").split("@")[1] || "";
    if (dom === "ignitesearch.com") return "Ignite";
    if (dom === "flexworkforceco.com") return "Flex";
    if (dom === "johnjosephpartners.com") return "JJP";
    if (dom === "sparktalentinc.com") return "Spark Talent Acquisition";
    return "Spark Companies";
  }
  function applyDir(d, p, fresh) {
    d.email = p.email; d.name = p.name;
    if (p.title) d.title = p.title;
    if (p.manager) d.reportsTo = p.manager;
    if (fresh) d.company = companyFor(p);
  }
  var PRODUCER = /recruit|account recruiting|account executive|account manager|sales|business development/i, NOT_PRODUCER = /internal recruiter|\bvp\b|vice president|president|chief|\bceo\b|\bcro\b|\bcoo\b|payroll|human resources|\bhr\b/i;

  var I = {
    plus: "M12 5v14M5 12h14", back: "M15 18l-6-6 6-6", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
    print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    word: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13l1.5 5 1.5-4 1.5 4 1.5-5",
    copy: "M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1", trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
    x: "M6 6l12 12M18 6L6 18", up: "M12 19V5M5 12l7-7 7 7", down: "M12 5v14M19 12l-7 7-7-7", alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    check: "M5 12.5l4.5 4.5L19 7", sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5", doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    map: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3zM9 3v15M15 6v15",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"
  };
  function ic(n, cls) { return '<svg class="bp-i ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + I[n] + '"/></svg>'; }

  /* ---------- CSS ---------- */
  var CSS = [
    ".sidebar .nav-item[data-tab='" + TAB + "'],.sidebar .nav-item[data-tab='" + TAB + "'].hide-for-role,.sidebar .nav-item[data-tab='myblueprint'],.sidebar .nav-item[data-tab='myblueprint'].hide-for-role{display:flex!important}",
    ".sidebar .nav-item.bp-sub{position:relative;padding:6px 20px 6px 56px!important;font-size:12.5px!important;gap:8px!important;min-height:0!important}",
    ".sidebar .nav-item.bp-sub .ico{width:14px!important;opacity:.85}",
    ".sidebar .nav-item.bp-sub::after{content:'';position:absolute;left:35px;top:-6px;height:calc(50% + 6px);width:12px;border-left:1.5px solid rgba(100,116,139,.32);border-bottom:1.5px solid rgba(100,116,139,.32);border-bottom-left-radius:7px;pointer-events:none}",
    "#view-" + TAB + ",#view-myblueprint{font-family:Outfit,Inter,system-ui,sans-serif;color:#1a1915;background:#F7F5EF;min-height:100vh}",
    ".bp{max-width:1280px;margin:0 auto;padding:28px 32px 90px}",
    ".bp-i{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}",
    /* header */
    ".bp-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px}",
    ".bp-k{font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#B8912E}",
    ".bp-head h1{font-size:28px;line-height:1.1;margin:6px 0 4px;font-weight:800;letter-spacing:-.02em;color:#111}",
    ".bp-head p{color:#6B675C;font-size:14px;margin:0;max-width:620px;line-height:1.5}",
    ".bp-tabs{display:inline-flex;gap:2px;background:#ECE8DE;border-radius:11px;padding:3px}",
    ".bp-tabs button{border:0;background:transparent;color:#6B675C;font:600 13px Outfit,Inter,sans-serif;padding:7px 14px;border-radius:9px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}",
    ".bp-tabs button.on{background:#fff;color:#111;box-shadow:0 1px 3px rgba(20,18,10,.12)}",
    /* stats + bar */
    ".bp-stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}",
    ".bp-stat{display:inline-flex;align-items:baseline;gap:8px;background:#fff;border:1px solid #E6E1D5;border-radius:999px;padding:7px 14px;cursor:pointer;font:inherit;color:#6B675C;font-size:13px}",
    ".bp-stat b{font-size:15px;font-weight:800;color:#111}",
    ".bp-stat:hover{border-color:#cfc3a0}.bp-stat.on{background:#111;border-color:#111;color:#d8d6cc}.bp-stat.on b{color:#FFC800}",
    ".bp-bar{display:flex;gap:10px;align-items:center;margin:0 0 18px;flex-wrap:wrap}",
    ".bp-search{flex:1 1 280px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E6E1D5;border-radius:11px;padding:0 12px;color:#8a8576}",
    ".bp-search input{flex:1;border:0;outline:0;padding:10px 0;font:14px Outfit,Inter,sans-serif;background:transparent;min-width:0;color:#1a1915}",
    ".bp-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #E0DACB;background:#fff;color:#1a1915;border-radius:10px;padding:8px 13px;font:600 13px Outfit,Inter,sans-serif;cursor:pointer;white-space:nowrap}",
    ".bp-btn:hover{border-color:#c9bd98}.bp-btn:disabled{opacity:.5;cursor:not-allowed}",
    ".bp-btn.gold{background:#FFC800;border-color:#FFC800;color:#111}.bp-btn.gold:hover{filter:brightness(.97)}",
    ".bp-btn.ghost{background:transparent;border-color:transparent;color:#6B675C;padding-left:6px;padding-right:6px}.bp-btn.ghost:hover{color:#111}",
    ".bp-btn.danger{color:#a3341f}.bp-btn.sm{padding:6px 10px;font-size:12px;border-radius:9px}",
    /* list */
    ".bp-group{margin-top:22px}.bp-group h3{font-size:12px;letter-spacing:.06em;color:#6B675C;margin:0 0 8px;font-weight:700;display:flex;gap:8px;align-items:center}",
    ".bp-group h3 span{color:#a8a291;font-weight:600}",
    ".bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}",
    ".bp-card{background:#fff;border:1px solid #E9E4D8;border-radius:12px;padding:12px 14px;cursor:pointer;text-align:left;font:inherit;color:inherit;display:flex;gap:12px;align-items:center;transition:border-color .15s,box-shadow .15s}",
    ".bp-card:hover{border-color:#d9c98f;box-shadow:0 8px 22px -16px rgba(20,18,10,.45)}",
    ".bp-av{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:12.5px;font-weight:800;color:#fff;flex:none;background:#2b2b33}",
    ".bp-card .tx{min-width:0;flex:1}",
    ".bp-card .nm{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".bp-card .sub{font-size:12px;color:#7a7566;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}",
    ".bp-dot{width:8px;height:8px;border-radius:50%;flex:none;background:#c9c3b2}",
    ".bp-dot.pub{background:#2f9e5b}.bp-dot.draft{background:#e0a800}.bp-dot.warn{background:#d0452c}",
    ".bp-card.ghostcard{border-style:dashed;background:transparent}",
    ".bp-card.ghostcard .bp-av{background:#E9E4D8;color:#6B675C}",
    ".bp-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#7a7566;margin-top:-6px;margin-bottom:6px}",
    ".bp-legend span{display:inline-flex;align-items:center;gap:6px}",
    ".bp-empty{background:#fff;border:1px dashed #d8d0bb;border-radius:14px;padding:28px;text-align:center;color:#6B675C}",
    ".bp-note{background:#fff8dc;border:1px solid #f0dc8f;border-radius:12px;padding:11px 14px;font-size:13px;color:#5a4a12;display:flex;gap:10px;align-items:flex-start;margin:12px 0}",
    ".bp-note.red{background:#fdecea;border-color:#f3c3bb;color:#7a2617}",
    /* editor */
    ".bp-top{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 0;margin:-28px 0 18px;background:#F7F5EF;border-bottom:1px solid #E9E4D8}",
    ".bp-top .who{display:flex;align-items:center;gap:10px;min-width:0;margin-right:auto}",
    ".bp-top .who b{font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".bp-top .msg{font-size:12.5px;color:#8a8576}",
    ".bp-st{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#6B675C}",
    ".bp-ed{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,540px);gap:28px;align-items:start}",
    ".bp-sec{padding:4px 0 20px;margin-bottom:18px;border-bottom:1px solid #E9E4D8}",
    ".bp-sec:last-child{border-bottom:0}",
    ".bp-sec h4{margin:0 0 12px;font-size:14px;font-weight:700;color:#111;display:flex;align-items:center;gap:10px}",
    ".bp-sec h4 .num{width:22px;height:22px;border-radius:50%;background:#111;color:#FFC800;font-size:11px;font-weight:800;display:grid;place-items:center;flex:none}",
    ".bp-sec h4 .r{margin-left:auto;display:flex;gap:6px;align-items:center;font-weight:500}",
    ".bp-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}",
    ".bp-f .full{grid-column:1/-1}",
    ".bp-f label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#7a7566}",
    ".bp-f input,.bp-f select,.bp-f textarea,.bp-li input,.bp-add input,.bp-rt input,.bp-libq{font:14px Outfit,Inter,sans-serif;color:#1a1915;padding:9px 11px;border:1px solid #E0DACB;border-radius:10px;background:#fff;outline:0;min-width:0}",
    ".bp-f input:focus,.bp-f select:focus,.bp-f textarea:focus,.bp-li input:focus,.bp-add input:focus,.bp-rt input:focus,.bp-libq:focus{border-color:#FFC800;box-shadow:0 0 0 3px rgba(255,200,0,.18)}",
    ".bp-f textarea{min-height:64px;resize:vertical}",
    ".bp-chk{flex-direction:row!important;align-items:center;gap:8px!important;font-size:13px!important;color:#1a1915!important}",
    ".bp-hint{font-size:12px;color:#8a8576;margin-top:8px;line-height:1.7}",
    ".bp-hint .bp-i{width:14px;height:14px;vertical-align:-2px;margin-right:6px}.bp-hint .bp-btn{margin-left:8px}",
    ".bp-hint.ok{color:#2f7a4a}",
    ".bp-li{display:flex;flex-direction:column;gap:6px}",
    ".bp-li .it{display:flex;gap:6px;align-items:center}.bp-li .it input{flex:1}",
    ".bp-li .n{width:20px;font-size:12px;font-weight:700;color:#a8a291;text-align:right;flex:none}",
    ".bp-x{border:0;background:transparent;color:#a8a291;cursor:pointer;padding:5px;border-radius:7px;display:inline-flex}.bp-x:hover{background:#efebe1;color:#1a1915}.bp-x:disabled{opacity:.3;cursor:default}",
    ".bp-add{display:flex;gap:6px;margin-top:8px}.bp-add input{flex:1}",
    ".bp-chips{display:flex;flex-wrap:wrap;gap:6px}",
    ".bp-chip{border:1px solid #E0DACB;background:#fff;border-radius:999px;padding:5px 11px;font:500 12.5px Outfit,Inter,sans-serif;cursor:pointer;color:#1a1915;display:inline-flex;gap:6px;align-items:center}",
    ".bp-chip:hover{border-color:#c9bd98}.bp-chip.on{background:#111;border-color:#111;color:#fff}",
    ".bp-chip.sug{border-style:dashed;color:#6B675C}",
    ".bp-sel{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}",
    ".bp-sel .grp{border:1px solid #E9E4D8;border-radius:12px;padding:10px;background:#fff}",
    ".bp-sel .grp.on{border-color:#FFC800}",
    ".bp-sel .grp .gh{display:flex;gap:6px;align-items:center;margin-bottom:6px}",
    ".bp-sel .grp .gh input{flex:1;font:600 12.5px Outfit,Inter,sans-serif;padding:6px 9px;border:1px solid #ece6d6;border-radius:8px;background:#fbfaf6}",
    ".bp-lib{display:flex;gap:8px;align-items:center;margin:4px 0 8px}",
    ".bp-libq{flex:1;padding:7px 10px;font-size:13px}",
    ".bp-flag{display:flex;gap:10px;align-items:center;background:#fdecea;border:1px solid #f3c3bb;color:#7a2617;border-radius:12px;padding:9px 12px;font-size:13px;margin-bottom:10px}",
    ".bp-flag .bp-btn{margin-left:auto}",
    ".bp-prevwrap{position:sticky;top:74px}",
    ".bp-prevlab{font-size:12px;color:#8a8576;font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".sc{background:#fff;border:1px solid #E9E4D8;border-radius:12px;padding:12px 14px;margin-bottom:14px}",
    ".sc-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.sc-head b{font-size:14px}",
    ".sc-k{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9a7a1e;font-weight:800}",
    ".bp-wk{display:inline-flex;background:#F1EDE3;border-radius:9px;padding:2px}.bp-wk button{border:0;background:transparent;font:600 12px Outfit,Inter,sans-serif;color:#6B675C;padding:5px 10px;border-radius:7px;cursor:pointer}.bp-wk button.on{background:#fff;color:#111;box-shadow:0 1px 2px rgba(0,0,0,.1)}",
    ".sc-rows{display:flex;flex-direction:column;gap:9px}",
    ".sc-row{display:grid;grid-template-columns:150px 1fr 84px;gap:10px;align-items:center}",
    ".sc-l b{display:block;font-size:13px}.sc-l span{font-size:11px;color:#8a8576}",
    ".sc-bar{height:9px;border-radius:99px;background:#F1EDE3;overflow:hidden}.sc-bar i{display:block;height:100%;border-radius:99px;background:#FFC800}",
    ".sc-row.met .sc-bar i{background:#2f9e5b}.sc-row.met .sc-l span{color:#2f7a4a}.sc-row.behind .sc-l span{color:#a3341f}",
    ".sc-v{text-align:right;font-size:12px;color:#8a8576}.sc-v b{font-size:16px;color:#111}.sc-v em{display:block;font-style:normal;font-size:9.5px}",
    ".sc-ratios{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:12px;padding-top:10px;border-top:1px solid #F1EDE3;font-size:12px;color:#6B675C}.sc-ratios b{color:#111}",
    ".bp-card .act{font-size:11px;font-weight:700;color:#6B675C;background:#F3EFE3;border-radius:999px;padding:2px 8px;white-space:nowrap}.bp-card .act.met{background:#e7f6ec;color:#1f7a3f}",
    ".mb-ack{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid #E9E4D8;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px}",
    ".mb-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,600px);gap:24px;align-items:start}",
    "@media(max-width:1100px){.mb-grid{grid-template-columns:1fr}}@media(max-width:560px){.sc-row{grid-template-columns:1fr 70px}.sc-bar{grid-column:1/-1;order:3}}",
    ".bp-terrpick{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}",
    ".bp-terrpick .bp-chip i{width:9px;height:9px;border-radius:50%;display:inline-block}",
    /* one-pager (shared with print / Word export; every rule starts with .op so export can lift them) */
    ".op{background:#fff;border-radius:12px;box-shadow:0 24px 50px -30px rgba(20,18,10,.45),0 0 0 1px #E9E4D8;overflow:hidden;font-family:Outfit,Inter,Arial,sans-serif;color:#1a1915}",
    ".op-head{background:#111219;color:#fff;padding:16px 20px 15px;border-bottom:3px solid #FFC800}",
    ".op-top{display:flex;justify-content:space-between;align-items:center;gap:12px}",
    ".op-logo{height:26px;width:auto;max-width:150px}",
    ".op-tag{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#FFC800;font-weight:700}",
    ".op-name{font-size:23px;font-weight:800;letter-spacing:-.015em;margin:12px 0 2px;line-height:1.1}",
    ".op-title{font-size:12.5px;color:#c9c9d6}",
    ".op-body{padding:14px 18px 6px}",
    ".op-nums{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #ECE7DA;border-radius:10px;overflow:hidden}",
    ".op-num{padding:9px 12px;border-left:1px solid #ECE7DA}.op-num:first-child{border-left:0}",
    ".op-num b{display:block;font-size:17px;font-weight:800;line-height:1.1;letter-spacing:-.01em}",
    ".op-num span{display:block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#8a7a52;font-weight:700;margin-top:2px}",
    ".op-terr{display:grid;grid-template-columns:44% 1fr;gap:14px;align-items:center;margin-top:12px;padding:10px 12px;border:1px solid #ECE7DA;border-radius:10px;background:#FBFAF6}",
    ".op-map{display:block;width:100%;height:auto;max-height:140px}",
    ".op-terr .tn{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700}",
    ".op-terr .tn i{width:10px;height:10px;border-radius:3px;flex:none}",
    ".op-terr .tk{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a52;font-weight:700;margin-bottom:4px}",
    ".op-terr .ts{font-size:11px;line-height:1.45;color:#5d584a;margin-top:4px}",
    ".op-sec{margin-top:14px}",
    ".op-hd{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#9a7a1e;font-weight:800;margin:0 0 7px}",
    ".op-nh{display:flex;align-items:center;gap:8px;margin:0 0 9px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#111}",
    ".op-nh b{background:#FFC800;color:#111;border-radius:4px;padding:2px 6px;font-size:10px;letter-spacing:.04em}",
    ".op-nh em{font-style:normal;color:#9a7a1e}",
    ".op-nh::after{content:'';flex:1;height:1px;background:#EFE6C9}",
    ".op-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px}",
    ".op-tile{background:#fff;border:1px solid #ECE7DA;border-radius:12px;padding:10px 12px 11px;box-shadow:0 8px 18px -16px rgba(20,18,10,.5);min-width:0}",
    ".op-tile .k{font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#9a7a1e;font-weight:800;line-height:1.25;min-height:21px}",
    ".op-tile b{display:block;font-size:30px;font-weight:800;line-height:1;letter-spacing:-.03em;color:#111;margin:4px 0 5px}",
    ".op-tile .s{font-size:9.5px;line-height:1.3;color:#6B675C}",
    ".op-tile.gold{background:#FFC800;border-color:#FFC800}.op-tile.gold .k{color:#111}.op-tile.gold .s{color:#3d3200}",
    ".op-hrow{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:10px}",
    ".op-pills{display:flex;flex-wrap:wrap;gap:5px}",
    ".op-pills span{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.35);color:#f1f1f6}",
    ".op-pills span.g{background:#FFC800;border-color:#FFC800;color:#111}",
    ".op-eff{text-align:right;flex:none}",
    ".op-eff .k{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#FFC800;font-weight:800}",
    ".op-eff b{display:block;font-size:12px;font-weight:700;color:#fff;margin-top:2px}",
    ".op-eff .t{font-size:9.5px;color:#b9b9c8;margin-top:3px;white-space:nowrap}",
    ".op-main{display:grid;grid-template-columns:1.15fr 1fr;gap:0 16px}",
    ".op-terr.v{grid-template-columns:1fr;gap:8px;margin-top:0}.op-terr.v .tk{display:none}",
".op-terr{border:2px solid #FFC800;box-shadow:0 0 0 3px rgba(255,200,0,.18),0 0 14px 2px rgba(255,200,0,.5)}", /* TERR_GLOW_v1 */
    ".op-tiles.many b{font-size:25px}.op-tiles.many .op-tile{padding:9px 10px 10px}",
    ".op-rings{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:8px;text-align:center}",
    ".op-ring{display:flex;flex-direction:column;align-items:center;gap:5px}",
    ".op-ring .c{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:#fff;border:3px solid #FFC800;box-shadow:0 0 0 3px #FFF6D6;font-size:16px;font-weight:800;color:#111;letter-spacing:-.02em}",
    ".op-ring .l{font-size:10.5px;line-height:1.25;color:#2b2818;font-weight:600}",
    ".op-ring .per{font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#FFC800;background:#111;border-radius:3px;padding:1px 5px}",
    ".op-s4{display:grid;gap:4px;text-align:center;position:relative;padding:4px 10px 10px;border:1px solid #ECE7DA;border-radius:12px}",
    ".op-s4::before{content:'';position:absolute;left:8%;right:8%;top:18px;height:2px;background:#EFE6C9}",
    ".op-s4 .st{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px}",
    ".op-s4 .n{width:26px;height:26px;border-radius:50%;background:#FFC800;color:#111;font-size:12px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 3px #fff}",
    ".op-s4 .t{font-size:10px;font-weight:700;line-height:1.2;color:#111;min-height:24px;display:flex;align-items:center}",
    ".op-s4 .tags{display:flex;gap:3px;flex-wrap:wrap;justify-content:center}",
    ".op-tag2{font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:2px 5px;border-radius:3px;background:#111;color:#FFC800}",
    ".op-tag2.tools{background:#fff;color:#9a7a1e;border:1px solid #DEBA6F}",
    ".op-road{position:relative;margin-top:2px}",
    ".op-rd{position:relative}",
    ".op-road svg.op-bolt{position:absolute;width:22px;height:22px;transform:translate(-50%,-50%);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.45))}",
    ".op-road svg{display:block;width:100%;height:46px}",
    ".op-road .stops{display:grid;gap:6px;margin-top:4px}",
    ".op-road .sp b{display:block;font-size:11px;font-weight:800;color:#111;white-space:nowrap}",
    ".op-road .sp b i{font-style:normal;font-size:8px;letter-spacing:.1em;color:#B8912E;margin-left:3px}",
    ".op-road .sp span{display:block;font-size:9.5px;line-height:1.3;color:#5d584a;margin-top:2px}",
    ".op-goals{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px}",
    ".op-goal{border-left:3px solid #FFC800;padding:2px 0 2px 9px}",
    ".op-goal b{display:block;font-size:19px;font-weight:800;line-height:1;color:#111;letter-spacing:-.02em}",
    ".op-goal span{display:block;font-size:10.5px;line-height:1.3;color:#5d584a;margin-top:3px}",
    ".op-extra{margin:8px 0 0;padding:0 0 0 14px;font-size:11px;color:#5d584a}",
    ".op-cols{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}",
    ".op-chips{display:flex;flex-wrap:wrap;gap:5px}",
    ".op-chip{font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:#F3EFE3;color:#2b2818}",
    ".op-g{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a8576;margin:7px 0 4px}",
    ".op ol{margin:0;padding-left:18px;font-size:11.5px;line-height:1.55;color:#2b2818}",
    ".op ol li::marker{color:#B8912E;font-weight:700}",
    ".op-src{font-size:9.5px;color:#a8a291;margin-left:4px}",
    ".op-notes{font-size:11.5px;line-height:1.5;white-space:pre-wrap;color:#3d3a2e}",
    ".op-empty{font-size:11px;color:#a19b88;font-style:italic}",
    ".op-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 18px;margin-top:12px;border-top:1px solid #F0ECE2;font-size:9px;color:#a8a291;letter-spacing:.08em;text-transform:uppercase}",
    /* ONE_PAGE_v1: compact sizing so a blueprint fits one letter page; print also auto-scales as a backstop */
    ".op-head{padding:12px 16px 11px}.op-logo{height:22px}.op-name{font-size:20px;margin:8px 0 1px}.op-title{font-size:11.5px}",
    ".op-hrow{margin-top:7px}.op-pills{gap:4px}.op-pills span{font-size:8px;padding:2px 7px}.op-eff b{font-size:11px}.op-eff .t{font-size:9px}",
    ".op-body{padding:10px 14px 2px}.op-sec{margin-top:9px}.op-nh{margin:0 0 6px;font-size:9px}.op-nh b{font-size:9px;padding:1px 5px}.op-hd{font-size:8.5px;margin:0 0 5px}",
    ".op-tiles{gap:6px}.op-tile,.op-tiles.many .op-tile{padding:7px 9px 8px;border-radius:10px}.op-tile .k{font-size:7.5px;min-height:18px}.op-tile b,.op-tiles.many b{font-size:22px;margin:3px 0 3px}.op-tile .s{font-size:8.5px}",
    ".op-main{gap:0 14px}.op-chips{gap:4px}.op-chip{font-size:10px;padding:2px 8px}.op-g{font-size:8.5px;margin:5px 0 3px}",
    ".op-dense{font-size:10px;line-height:1.45;color:#2b2818;margin:0 0 4px}.op-dense b{display:block;font-size:8.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a8576}",
    ".op ol{font-size:10.5px;line-height:1.4}.op ol.two{columns:2;column-gap:14px}",
    ".op-terr{padding:8px 10px}.op-map{max-height:104px}.op-terr .tn{font-size:12px}.op-terr .ts{font-size:9.5px;margin-top:2px}",
    ".op-s4{padding:3px 6px 7px}.op-s4::before{top:15px}.op-s4 .n{width:22px;height:22px;font-size:11px}.op-s4 .t{font-size:9.5px;min-height:22px}",
    ".op-road svg{height:32px}.op-road .stops{gap:5px;margin-top:2px}.op-road .sp b{font-size:10px}.op-road .sp span{font-size:8.5px;line-height:1.25}",
    ".op-extra{margin:6px 0 0;font-size:10px}.op-notes{font-size:10.5px}.op-foot{padding:6px 14px;margin-top:8px;font-size:8px}",
    /* rules */
    ".bp-rt{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #E9E4D8;border-radius:12px;overflow:hidden;font-size:13px}",
    ".bp-rt th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#9a9484;font-weight:700;padding:10px 12px;background:#FBFAF6;border-bottom:1px solid #E9E4D8}",
    ".bp-rt td{padding:7px 12px;border-bottom:1px solid #F1EDE3;vertical-align:middle}",
    ".bp-rt tr:last-child td{border-bottom:0}",
    ".bp-rt input{width:110px;padding:7px 9px;font-size:13px;box-sizing:border-box}",
    ".bp-rt input.w{width:100%}",
    ".bp-sec:has(.bp-rt){overflow-x:auto}",
    ".bp-seg{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}",
    ".bp-rbar{position:sticky;bottom:0;display:flex;gap:8px;align-items:center;padding:12px 0;background:#F7F5EF;border-top:1px solid #E9E4D8}",
    ".bp-rbar .msg{font-size:12.5px;color:#8a8576;margin-right:auto}",
    "@media(max-width:1100px){.bp-ed{grid-template-columns:1fr}.bp-prevwrap{position:static}}",
    "@media(max-width:720px){.bp{padding:18px 16px 80px}.bp-top{margin-top:-18px}.bp-f{grid-template-columns:1fr}.op-cols,.op-terr{grid-template-columns:1fr}.bp-btn{white-space:normal}.bp-sec h4{flex-wrap:wrap}.bp-rt{min-width:640px}}"
  ].join("\n");
  function injectCss() { if (document.getElementById("blueprintsCss")) return; var s = document.createElement("style"); s.id = "blueprintsCss"; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- data ---------- */
  function load() {
    if (S.loading) return S.loading;
    S.loading = api("GET", "/blueprints").then(function (d) {
      S.loaded = true; S.err = ""; S.missing = !!d.missing; S.admin = !!d.admin; S.me = d.me || "";
      S.rules = d.rules; S.rulesAt = d.rulesUpdatedAt || ""; S.rulesBy = d.rulesUpdatedBy || "";
      S.list = d.blueprints || [];
      if (d.missing) S.err = d.error || "";
      return true;
    }).catch(function (e) { S.err = e.message; if (e.status === 403 || e.status === 401) S.denied = true; return false; })
      .then(function (ok) { S.loading = null; return ok; });
    return S.loading;
  }

  /* ---------- one-pager ---------- */
  function logoUrl(company, abs, png) { var k = LOGOS[company] || "spark-companies"; return (abs ? location.origin : "") + "/brand/" + k + "-reversed." + (png ? "png" : "svg"); }
  /* ---------- territory map (shapes: /brand/us-map.json, territories: the live Territory Map config) ---------- */
  var GEO = null, TERR = null, BB = {};
  var TERR_FALLBACK = [
    { id: "nw", name: "National North West", color: "#4c9a5f", states: ["WA", "OR", "ID", "MT", "WY"] },
    { id: "cen", name: "National Central", color: "#d97b2c", states: ["ND", "SD", "NE", "KS", "MN", "IA", "MO", "WI", "IL", "IN", "OH"] },
    { id: "mi", name: "Metro Detroit", color: "#c23b3b", states: [], counties: ["26163", "26125", "26099", "26161", "26093", "26147", "26115", "26087", "26049"] },
    { id: "ne", name: "National North East", color: "#2f9db4", states: ["PA", "NY", "NJ", "ME", "NH", "VT", "MA", "RI", "CT", "MD", "DE"] },
    { id: "sw", name: "National South West", color: "#7c5cb0", states: ["CA", "NV", "UT", "CO", "AZ", "NM", "OK", "TX"] },
    { id: "se", name: "National South East", color: "#c9a227", states: ["VA", "WV", "KY", "TN", "AR", "LA", "MS", "AL", "GA", "FL", "SC", "NC"] }
  ];
  function loadGeo() {
    var g = fetch("/brand/us-map.json").then(function (r) { return r.json(); }).then(function (j) { GEO = j; }).catch(function () {});
    var t = token().then(function (tk) { return fetch(WORKER + "/terr-map-config", { headers: { Authorization: "Bearer " + tk } }); })
      .then(function (r) { return r.json(); }).then(function (d) { if (d && d.data && Array.isArray(d.data.territories)) TERR = d.data.territories; }).catch(function () {});
    return Promise.all([g, t]);
  }
  function terrs() { return TERR || TERR_FALLBACK; }
  function bb(d) {
    if (BB[d]) return BB[d];
    var n = d.match(/-?\d+\.?\d*/g) || [], b = [1e9, 1e9, -1e9, -1e9];
    for (var i = 0; i + 1 < n.length; i += 2) { var x = +n[i], y = +n[i + 1]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    return (BB[d] = b);
  }
  var ALL_TERR = { all: true, id: "all", name: "All territories (national)", color: "#111" };
  /* Which Territory Map territory a blueprint covers: the explicit pick, else a best guess from its territory / region text. */
  function terrFor(d) {
    var v = d.mapTerritory, T = terrs();
    if (v === "none") return null;
    if (v === "all") return ALL_TERR;
    if (v) { for (var i = 0; i < T.length; i++) if (T[i].id === v) return T[i]; }
    return guessTerr(d);
  }
  function guessTerr(d) {
    var T = terrs();
    var R = [[/metro|detroit|michigan|\bmi\b/, /metro detroit|detroit/], [/central|midwest|fort wayne|indiana/, /central/], [/south ?east|nashville|tennessee/, /south ?east/],
      [/north ?east/, /north ?east/], [/north ?west/, /north ?west/], [/south ?west/, /south ?west/]];
    var texts = [d.territory, d.region];  /* the territory text wins over the roster region */
    for (var k = 0; k < texts.length; k++) {
      var txt = String(texts[k] || "").toLowerCase(); if (!txt) continue;
      for (var i = 0; i < R.length; i++) if (R[i][0].test(txt)) { for (var j = 0; j < T.length; j++) if (R[i][1].test(String(T[j].name).toLowerCase())) return T[j]; }
      if (/regional|national|data center/.test(txt)) return ALL_TERR;
    }
    return null;
  }
  function mapSvg(terr) {
    if (!GEO || !terr) return "";
    var T = terrs(), owner = {}, cowner = {}, box = null, parts = [], cparts = [];
    T.forEach(function (t) { (t.states || []).forEach(function (s) { owner[s] = t; }); (t.counties || []).forEach(function (c) { cowner[c] = t; }); });
    function on(t) { return !!t && (terr.all || t.id === terr.id); }
    function grow(d) { var b = bb(d); box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b.slice(); }
    var OFF = "#E4DFD2";
    Object.keys(GEO.states).forEach(function (code) {
      var s = GEO.states[code], t = owner[code], hit = on(t) && code !== "MI";
      parts.push('<path d="' + s.d + '" fill="' + (hit ? t.color : OFF) + '"/>');
      if (hit) grow(s.d);
    });
    Object.keys(GEO.counties).forEach(function (f) {
      var c = GEO.counties[f], t = cowner[f], hit = on(t);
      if (f.indexOf("26") !== 0 && !hit) return;  /* the Ohio strip only draws when it's part of the territory */
      cparts.push('<path d="' + c.d + '" fill="' + (hit ? t.color : OFF) + '"/>');
      if (hit) grow(c.d);
    });
    var vb;
    if (terr.all || !box) vb = [-40, 10, 1040, 600];
    else {
      var w = box[2] - box[0], h = box[3] - box[1], pad = Math.max(w, h) * 0.18 + 8;
      var x = box[0] - pad, y = box[1] - pad; w += pad * 2; h += pad * 2;
      if (w < h * 1.25) { var nw = h * 1.25; x -= (nw - w) / 2; w = nw; }
      vb = [x, y, w, h];
    }
    var sw = (Math.max(vb[2], vb[3]) / 420).toFixed(2);
    return '<svg class="op-map" viewBox="' + vb.map(function (n) { return n.toFixed(1); }).join(" ") + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(terr.name) + ' territory map">' +
      '<g stroke="#fff" stroke-width="' + sw + '" stroke-linejoin="round">' + parts.join("") + "</g>" +
      '<g stroke="#fff" stroke-width="' + (sw * 0.45).toFixed(2) + '" stroke-linejoin="round">' + cparts.join("") + "</g></svg>";
  }
  function coverage(terr) {
    if (!terr) return "";
    if (terr.all) return terrs().map(function (t) { return t.name; }).join(" · ");
    var st = (terr.states || []).filter(function (s) { return s !== "MI"; }), ct = terr.counties || [];
    var names = GEO ? st.map(function (s) { return GEO.states[s] ? GEO.states[s].n : s; }) : st;
    var out = names.join(", ");
    if (ct.length) {
      var mi = ct.filter(function (f) { return f.indexOf("26") === 0; }), oh = ct.length - mi.length;
      if (!st.length && GEO) out = ct.map(function (f) { return GEO.counties[f] ? GEO.counties[f].n + (f.indexOf("39") === 0 ? " (OH)" : "") : f; }).join(", ") + " counties";
      else out += (out ? ", plus " : "") + (mi.length > 40 ? "outstate Michigan" : mi.length + " Michigan counties") + (oh ? " and " + oh + " Ohio counties" : "");
    }
    return out;
  }

  /* "Maintain a minimum of 10 candidates in process" -> { n: "10", l: "candidates in process" } */
  function goal(s) {
    var t = String(s || "").trim().replace(/^(always\s+)?(maintain\s+)?(a\s+)?minimum\s+of\s+/i, "");
    var m = t.match(/^(\$?\d[\d,]*\+?)\s+(.+)$/);
    return m ? { n: m[1], l: m[2].replace(/\s+at all times$/i, "") } : null;
  }
  /* DAILY ROAD: the producer's day. Standard lives in rules.road; a blueprint can override with its own d.road. */
  var ROAD_DEFAULT = [
    { time: "7–9 AM", tag: "", text: "Inbox, job posts and alerts. Renew jobs every 2 days. Build a 25-name call sheet." },
    { time: "9 AM", tag: "PLUG", text: "Team huddle: activity, movement, commitments, focus." },
    { time: "9:15–12", tag: "PROD", text: "Work posts and alerts, prospect HMs, InMails, skill-market talent." },
    { time: "Lunch", tag: "", text: "Recharge. Back on the phones by 1." },
    { time: "1–4 PM", tag: "PROD", text: "Heavy recruiting: source and submit. ARMs call account HMs." },
    { time: "4 PM", tag: "PLUG", text: "Team huddle: activity, movement, commitments, focus." },
    { time: "4:15–5", tag: "PREP", text: "Meetings, sales strategy, client follow-ups, build tomorrow's call list." }
  ];
  function stdRoad() { return clone((S.rules && Array.isArray(S.rules.road) && S.rules.road.length) ? S.rules.road : ROAD_DEFAULT); }
  function roadOf(d) { return Array.isArray(d.road) ? d.road : stdRoad(); }
  function roadHtml(stops) {
    var n = stops.length; if (!n) return "";
    var W = 700, H = 46, mid = 23, amp = 9, pts = [];
    for (var x = 0; x <= W; x += 10) pts.push(x + "," + (mid + amp * Math.sin(x / W * Math.PI * 2 * 2.5)).toFixed(1));
    var path = "M" + pts.join("L");
    var dots = stops.map(function (st, i) {
      var cx = (i + 0.5) * W / n, cy = mid + amp * Math.sin(cx / W * Math.PI * 2 * 2.5), gold = !st.tag || st.tag === "PLUG";
      /* lightning bolts, drawn as HTML on top of the road so they keep their shape when the road stretches */
      return '<svg class="op-bolt" viewBox="0 0 24 24" style="left:' + (cx / W * 100).toFixed(2) + "%;top:" + (cy / H * 100).toFixed(2) + '%" aria-hidden="true"><path d="M14 1.5L4.5 13.5h6.2l-1.7 9L19.5 10h-6.3z" fill="' + (gold ? "#FFC800" : "#C9CCD4") + '" stroke="#111219" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    }).join("");
    return '<div class="op-road"><div class="op-rd"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + path + '" fill="none" stroke="#111219" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="' + path + '" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="9 8" opacity=".85"/></svg>' + dots + "</div>" +
      '<div class="stops" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + stops.map(function (st) {
        return '<div class="sp"><b>' + esc(st.time) + (st.tag ? "<i>" + esc(st.tag) + "</i>" : "") + "</b><span>" + esc(st.text) + "</span></div>";
      }).join("") + "</div></div>";
  }
  function per(label) { return /(\ba|\bper|\/)\s*day\b|daily/i.test(label) ? "Day" : /(\ba|\bper|\/)\s*week\b|weekly|\/\s*wk/i.test(label) ? "Week" : ""; }
  function onePager(d, abs, png) {
    var L = line(d.serviceLine) || {};
    var hc = d.hc !== "" && d.hc != null ? d.hc : (L.hc != null ? L.hc : "");
    var groups = (d.titleGroups || []).filter(function (g) { return g.titles && g.titles.length; });
    function clean(arr) { return (arr || []).filter(function (x) { return String(x || "").trim(); }); }
    var empty = '<div class="op-empty">Not set yet</div>';
    function sec(title, body) { return '<div class="op-sec"><div class="op-hd">' + esc(title) + "</div>" + body + "</div>"; }
    function nsec(n, title, sub, body) { return '<div class="op-sec"><div class="op-nh"><b>0' + n + "</b>" + esc(title) + (sub ? " <em>- " + esc(sub) + "</em>" : "") + "</div>" + body + "</div>"; }
    var kp = clean(d.kpis), goals = [], extra = [];
    kp.forEach(function (k) { var g = goal(k); if (g) goals.push(g); else extra.push(k); });
    var tiles = '<div class="op-tile gold"><div class="k">HC expectation</div><b>' + esc(hc === "" ? "—" : hc) + '</b><div class="s">Headcount on assignment</div></div>' +
      goals.map(function (g, i) {
        var pr = per(g.l), lab = g.l.replace(/\s*(\/\s*week|\/\s*wk|per week|a week|\/\s*day|per day|a day)\s*$/i, "").replace(/^(your|active)\s+/i, function (m) { return m; });
        var orig = kp[kp.indexOf(kp.filter(function (k) { var x = goal(k); return x && x.n === g.n && x.l === g.l; })[0])] || "";
        var desc = (/^\s*(always\s+)?(maintain|minimum)/i.test(orig) ? "Minimum " : "") + lab.toLowerCase();
        return '<div class="op-tile"><div class="k">' + esc(lab) + (pr ? " / " + pr : "") + "</div><b>" + esc(g.n) + '</b><div class="s">' + esc(desc.charAt(0).toUpperCase() + desc.slice(1)) + "</div></div>";
      }).join("");
    var kpiHtml = !kp.length ? empty :
      (goals.length ? '<div class="op-rings">' + goals.map(function (g) {
        var pr = per(g.l), lab = g.l.replace(/\s*(\/\s*week|\/\s*wk|per week|a week|\/\s*day|per day|a day)\s*$/i, "");
        return '<div class="op-ring"><div class="c">' + esc(g.n) + '</div><div class="l">' + esc(lab) + "</div>" + (pr ? '<span class="per">Per ' + pr + "</span>" : "") + "</div>";
      }).join("") + "</div>" : "") +
      (extra.length ? '<ul class="op-extra">' + extra.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "");
    var dense = allTitles(d).length > 10;  /* long lists read as text so the page stays one page */
    var roles = !groups.length ? empty : groups.map(function (g) {
      if (dense) return '<div class="op-dense">' + (g.group ? "<b>" + esc(g.group) + "</b>" : "") + g.titles.map(esc).join(" · ") + "</div>";
      return (g.group ? '<div class="op-g">' + esc(g.group) + "</div>" : "") + '<div class="op-chips">' + g.titles.map(function (t) { return '<span class="op-chip">' + esc(t) + "</span>"; }).join("") + "</div>";
    }).join("");
    var ct = clean(d.contacts);
    var contacts = !ct.length ? empty : "<ol" + (ct.length > 4 ? ' class="two"' : "") + ">" + ct.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ol>";
    var st = clean(d.s4);
    var steps = !st.length ? empty : '<div class="op-s4" style="grid-template-columns:repeat(' + st.length + ',minmax(0,1fr))">' + st.map(function (x, i) {
      var m = String(x).replace(/\)\s*\)\s*$/, ")").match(/^(.*?)\s*\(([^()]+)\)\s*$/), src = m ? m[2] : "";
      var tags = []; if (/tool/i.test(src)) tags.push('<span class="op-tag2 tools">Tools</span>'); if (/system/i.test(src)) tags.push('<span class="op-tag2">System</span>');
      return '<div class="st"><div class="n">' + (i + 1) + '</div><div class="t">' + esc(m ? m[1] : x) + "</div>" + (tags.length ? '<div class="tags">' + tags.join("") + "</div>" : "") + "</div>";
    }).join("") + "</div>";
    var terr = terrFor(d), map = mapSvg(terr);
    var terrHtml = !terr ? "" : '<div class="op-terr v">' + (map || "") +
      '<div><div class="tk">Territory</div><div class="tn"><i style="background:' + esc(terr.all ? "#FFC800" : terr.color) + '"></i>' + esc(terr.name) + "</div>" +
        (d.territory ? '<div class="ts"><b>' + esc(d.territory) + "</b></div>" : "") +
        '<div class="ts">' + esc(coverage(terr)) + "</div></div></div>";
    var pills = [];
    pills.push('<span class="g">' + esc(d.company || "Spark Companies") + "</span>");
    if (d.territory || (terr && !terr.all)) pills.push("<span>" + esc(d.territory || terr.name) + "</span>");
    if (d.serviceLine) pills.push("<span>" + esc(d.serviceLine) + (d.secondaryServiceLine ? " + " + esc(d.secondaryServiceLine) : "") + "</span>");
    var tl = String(d.title || d.role || ""), sub = [tl, d.serviceLine && tl.toLowerCase().indexOf(String(d.serviceLine).toLowerCase()) < 0 ? d.serviceLine : ""].filter(Boolean);
    return '<div class="op">' +
      '<div class="op-head"><div class="op-top"><img class="op-logo" alt="' + esc(d.company || "Spark Companies") + '" src="' + logoUrl(d.company, abs, png) + '"><div class="op-tag">One Page Blueprint</div></div>' +
        '<div class="op-name">' + esc(d.name || "Team member") + "</div>" +
        '<div class="op-title">' + esc(tl || "Title") + (d.dhFocused ? " · Direct hire focused" : "") + "</div>" +
        '<div class="op-hrow"><div class="op-pills">' + pills.join("") + '</div><div class="op-eff"><div class="k">Effective</div><b>' + esc(fmtDate((d.effective || new Date().toISOString().slice(0, 10)) + "T12:00:00")) + "</b>" +
          (d.serviceLine ? '<div class="t">' + money(L.direct) + " DH target · " + (L.charge != null ? money(L.charge) + "/wk charge" : "charge case by case") + "</div>" : "") + "</div></div></div>" +
      '<div class="op-body">' +
        '<div class="op-tiles' + (goals.length >= 4 ? " many" : "") + '" style="grid-template-columns:repeat(' + Math.min(goals.length + 1, 5) + ',minmax(0,1fr))">' + tiles + "</div>" +
        (extra.length ? '<ul class="op-extra">' + extra.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
        '<div class="op-main"><div>' + nsec(1, d.rolesHeading || "Top job titles", "", roles) + nsec(2, "Target customer contacts", "", contacts) + "</div>" +
          "<div>" + (terrHtml ? '<div class="op-sec"><div class="op-nh">Territory <em>- ' + esc(terr.all ? "national" : "primary region") + "</em></div>" + terrHtml + "</div>" : "") + "</div></div>" +
        nsec(3, "S4 process", "work your pipeline in this order", steps) +
        (roadOf(d).length ? nsec(4, "Daily road", "plug in, produce, prep", roadHtml(roadOf(d))) : "") +
        (d.notes ? sec("Notes", '<div class="op-notes">' + esc(d.notes) + "</div>") : "") +
      "</div>" +
      '<div class="op-foot"><span>' + esc(d.company || "Spark Companies") + (d.reportsTo ? " · Reports to " + esc(d.reportsTo) : "") + "</span><span>Updated " + esc(fmtDate(new Date().toISOString())) + "</span></div>" +
    "</div>";
  }
  function exportDoc(kind) {
    var d = S.cur; if (!d) return;
    var css = CSS.split("\n").filter(function (r) { return r.indexOf(".op") === 0; }).join("\n");
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(d.name) + ' - One Page Blueprint</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">' +
      "<style>@page{size:letter;margin:.4in}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}" + css + ".op{box-shadow:none;border-radius:0;width:7.7in;margin:0 auto}</style></head><body>" + onePager(d, true, kind === "word") +
      (kind === "word" ? "" : "<script>function fit(){var o=document.querySelector('.op'),max=10.15*96,h=o.getBoundingClientRect().height;if(h>max)document.body.style.zoom=(max/h).toFixed(3);}<\/script>") + "</body></html>";
    if (kind === "word") {
      var blob = new Blob(["﻿" + html], { type: "application/msword" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = (d.name || "Blueprint").replace(/[^\w .-]+/g, "") + " - Blueprint.doc";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return;
    }
    var w = window.open("", "_blank");
    if (!w) { flash("Your browser blocked the print window. Allow pop-ups for HQ and try again."); return; }
    w.document.open(); w.document.write(html); w.document.close();
    w.onload = function () { setTimeout(function () { try { w.fit(); } catch (e) {} w.focus(); w.print(); }, 400); };
  }

  /* ---------- render ---------- */
  var root = null;
  function render() {
    if (!root) return;
    if (!S.loaded && !S.err) { root.innerHTML = '<div class="bp"><div class="bp-empty">Loading blueprints…</div></div>'; return; }
    var h = '<div class="bp">';
    if (S.view !== "edit") h += hero();
    if (S.missing) h += '<div class="bp-note red">' + ic("alert") + "<div><b>One-time setup needed.</b> Run <code>worker/blueprints.sql</code> in Supabase (SQL editor).</div></div>";
    else if (S.err) h += '<div class="bp-note red">' + ic("alert") + "<div>" + esc(S.err) + "</div></div>";
    if (!S.missing && S.rules) {
      if (S.view === "edit" && S.cur) h += editor();
      else if (S.view === "rules") h += rulesView();
      else h += listView();
    }
    h += "</div>";
    var ae = document.activeElement, keep = ae && root.contains(ae) && ae.getAttribute("data-k") ? { k: ae.getAttribute("data-k"), s: ae.selectionStart, e: ae.selectionEnd } : null;
    root.innerHTML = h;
    fitNote();
    if (keep) { var el = root.querySelector('[data-k="' + keep.k + '"]'); if (el) { el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  }
  function hero() {
    return '<div class="bp-head"><div><div class="bp-k">Leader Toolkit</div><h1>Blueprint Builder</h1>' +
      "<p>One Page Blueprints for every producer. Role and service line set the goals and targets; you pick the titles and territory.</p></div>" +
      '<div class="bp-tabs"><button data-act="view" data-v="list" class="' + (S.view !== "rules" ? "on" : "") + '">' + ic("users") + "Blueprints</button>" +
      '<button data-act="view" data-v="rules" class="' + (S.view === "rules" ? "on" : "") + '">' + ic("sliders") + "Rules</button></div></div>";
  }
  function counts() {
    var c = { all: S.list.length, published: 0, attention: 0 };
    S.list.forEach(function (b) { if (b.status === "published") c.published++; if (needsAttention(b)) c.attention++; });
    var have = {}; S.list.forEach(function (b) { have[String(b.name).toLowerCase()] = 1; });
    var hasEmail = {}; S.list.forEach(function (b) { var e = b.data && b.data.email; if (e) hasEmail[String(e).toLowerCase()] = 1; var p = personFor(b.data || {}); if (p) hasEmail[p.email] = 1; });
    if (DIR) c.missingList = DIR.list.filter(function (p) { return PRODUCER.test(p.title) && !NOT_PRODUCER.test(p.title) && !hasEmail[p.email] && !have[p.name.toLowerCase()]; })
      .map(function (p) { var r = rosterFor(p.name) || {}; return { name: p.name, email: p.email, title: p.title, serviceLine: r.serviceLine || "", from365: true }; });
    else c.missingList = ((S.rules && S.rules.roster) || []).filter(function (r) { return !have[r.name.toLowerCase()]; });
    c.missing = c.missingList.length;
    c.sync = 0; c.blank = 0;
    S.list.forEach(function (b) { var sy = sync(b.data || {}); if (sy && (sy.state !== "ok" || sy.issues.length)) c.sync++; if (sy && sy.state === "ok" && (sy.blankTitle || sy.blankMgr)) c.blank++; });
    return c;
  }
  function initials(n) { var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "")[0] || "?").toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : "") || "").toUpperCase(); }
  function avatar(d, name) { var t = terrFor(d || {}); var bg = t ? (t.all ? "#111" : t.color) : "#9a9484"; return '<span class="bp-av" style="background:' + esc(bg) + '">' + esc(initials(name)) + "</span>"; }
  function statusDot(b) { var cls = needsAttention(b) ? "warn" : b.status === "published" ? "pub" : b.status === "draft" ? "draft" : ""; return '<span class="bp-dot ' + cls + '" title="' + (cls === "warn" ? "Needs attention" : cls === "pub" ? "Published" : cls === "draft" ? "Draft" : "Imported") + '"></span>'; }
  function listView() {
    var c = counts();
    var h = '<div class="bp-stats">' + stat("all", c.all, "blueprints") + stat("published", c.published, "published") + stat("attention", c.attention, "need attention") + (DIR ? stat("sync", c.sync, "out of sync with 365") : "") + stat("missing", c.missing, DIR ? "producers in 365 without one" : "on roster without one") + "</div>";
    if (DIR && c.blank) h += '<div class="bp-note">' + ic("alert") + "<div>" + c.blank + " blueprint" + (c.blank === 1 ? " belongs" : "s belong") + " to people with no title or manager in Microsoft 365, so those can't be checked. Fill them in on the Directory tab and the check picks them up.</div></div>";
    h += '<div class="bp-bar"><div class="bp-search">' + ic("search") + '<input data-k="q" data-act="q" placeholder="Search name, title, service line, territory" value="' + esc(S.q) + '"></div>' +
      '<button class="bp-btn gold" data-act="new">' + ic("plus") + "New blueprint</button></div>";
    var q = S.q.trim().toLowerCase();
    if (S.filter === "missing") {
      var m = c.missingList.filter(function (r) { return !q || (r.name + " " + r.title + " " + r.serviceLine).toLowerCase().indexOf(q) >= 0; });
      if (!m.length) return h + '<div class="bp-empty">Every producer has a blueprint.</div>';
      return h + '<div class="bp-grid">' + m.map(function (r) {
        return '<button class="bp-card ghostcard" data-act="newfor" data-name="' + esc(r.name) + '" data-email="' + esc(r.email || "") + '"><span class="bp-av">' + ic("plus") + '</span><span class="tx"><div class="nm">' + esc(r.name) + '</div><div class="sub">' + esc([r.title, r.serviceLine].filter(Boolean).join(" · ")) + "</div></span></button>";
      }).join("") + "</div>";
    }
    var items = S.list.filter(function (b) {
      if (S.filter === "published" && b.status !== "published") return false;
      if (S.filter === "attention" && !needsAttention(b)) return false;
      if (S.filter === "sync") { var sy = sync(b.data || {}); if (!sy || (sy.state === "ok" && !sy.issues.length)) return false; }
      if (!q) return true;
      var d = b.data || {}, t = terrFor(d);
      return [b.name, d.title, d.serviceLine, d.secondaryServiceLine, d.territory, d.region, d.reportsTo, t && t.name].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    h += '<div class="bp-legend"><span><i class="bp-dot pub"></i>Published</span><span><i class="bp-dot draft"></i>Draft</span><span><i class="bp-dot"></i>Imported</span><span><i class="bp-dot warn"></i>Needs attention</span><span>Avatar color = territory</span></div>';
    if (!items.length) return h + '<div class="bp-empty">No blueprints match.</div>';
    var by = {};
    items.forEach(function (b) { var k = (b.data && b.data.serviceLine) || "No service line yet"; (by[k] = by[k] || []).push(b); });
    var order = ((S.rules && S.rules.serviceLines) || []).map(function (l) { return l.name; }).concat(["No service line yet"]);
    order.forEach(function (k) {
      if (!by[k]) return;
      h += '<div class="bp-group"><h3>' + esc(k) + "<span>" + by[k].length + '</span></h3><div class="bp-grid">' + by[k].map(card).join("") + "</div></div>";
    });
    return h;
  }
  function stat(key, n, label) { return '<button class="bp-stat ' + (S.filter === key ? "on" : "") + '" data-act="filter" data-f="' + key + '"><b>' + n + "</b>" + esc(label) + "</button>"; }
  function card(b) {
    var d = b.data || {}, t = terrFor(d);
    return '<button class="bp-card" data-act="open" data-id="' + esc(b.id) + '">' + avatar(d, b.name) + '<span class="tx"><div class="nm">' + esc(b.name) + '</div><div class="sub">' +
      esc([d.title || d.role, t ? t.name.replace(/^National /, "") : ""].filter(Boolean).join(" · ")) + "</div></span>" + startsChip(d) + statusDot(b) + "</button>";
  }

  function startsChip(d) {
    var A = ACT.this; if (!A || !A.people) return "";
    var g = goalRows(d).filter(function (r) { return r.key === "starts"; })[0]; if (!g) return "";
    var me = A.people[emailFor(d)] || {}; var v = me.starts || 0;
    return '<span class="act' + (v >= g.target ? " met" : "") + '" title="Starts this week vs goal">' + v + "/" + g.target + "</span>";
  }

  /* ---------- editor ---------- */
  function opts(arr, sel, blankLabel) { return (blankLabel != null ? '<option value="">' + esc(blankLabel) + "</option>" : "") + arr.map(function (v) { var val = typeof v === "object" ? v.v : v, lab = typeof v === "object" ? v.l : v; return '<option value="' + esc(val) + '"' + (val === sel ? " selected" : "") + ">" + esc(lab) + "</option>"; }).join(""); }
  function secH(n, title, right) { return "<h4><span class=\"num\">" + n + "</span>" + esc(title) + (right ? '<span class="r">' + right + "</span>" : "") + "</h4>"; }
  function editor() {
    var d = S.cur, R = S.rules, L = line(d.serviceLine) || {};
    var lines = R.serviceLines.map(function (l) { return l.name; });
    var regions = R.regions.slice(); if (d.region && regions.indexOf(d.region) < 0) regions.push(d.region);
    var companies = R.companies.slice(); if (d.company && companies.indexOf(d.company) < 0) companies.push(d.company);
    var roles = R.roles.slice(); if (d.role && roles.indexOf(d.role) < 0) roles.push(d.role);
    var std = standardKpis(d.role, d.serviceLine);
    var stLabel = S.curStatus === "published" ? "Published" : S.curStatus === "imported" ? "Imported from Word" : "Draft";
    var h = '<div class="bp-top"><button class="bp-btn ghost" data-act="back" title="All blueprints">' + ic("back") + "</button>" +
      '<div class="who">' + avatar(d, d.name) + "<div><b>" + esc(d.name || "New blueprint") + '</b><div class="bp-st"><span class="bp-dot ' + (S.curStatus === "published" ? "pub" : S.curStatus === "draft" ? "draft" : "") + '"></span>' + esc(stLabel) + ' · <span class="msg">' + esc(S.msg || (S.dirty ? "Unsaved changes" : "All changes saved")) + "</span></div></div></div>" +
      '<button class="bp-btn sm" data-act="print">' + ic("print") + "PDF</button>" +
      '<button class="bp-btn sm" data-act="word">' + ic("word") + "Word</button>" +
      (S.curId ? '<button class="bp-btn sm" data-act="dup" title="Duplicate">' + ic("copy") + '</button><button class="bp-btn sm danger" data-act="del" title="Delete">' + ic("trash") + "</button>" : "") +
      '<button class="bp-btn" data-act="save" ' + (S.saving ? "disabled" : "") + ">Save draft</button>" +
      '<button class="bp-btn gold" data-act="publish" ' + (S.saving ? "disabled" : "") + ">" + ic("check") + (S.curStatus === "published" ? "Update" : "Publish") + "</button></div>";
    h += '<div class="bp-ed"><div>';
    (d.flags || []).forEach(function (f, i) { h += '<div class="bp-flag">' + ic("alert") + "<div>" + esc(f) + '</div><button class="bp-btn sm" data-act="unflag" data-i="' + i + '">Resolved</button></div>'; });
    // 1 team member
    var sy = sync(d), m365 = "";
    if (DIR && sy) {
      if (sy.state === "left") m365 = '<div class="bp-flag">' + ic("alert") + "<div><b>Not in Microsoft 365 anymore.</b> " + esc(d.email) + " is gone or disabled. If they've left, delete this blueprint.</div></div>";
      else if (sy.state === "nomatch") m365 = '<div class="bp-flag">' + ic("alert") + '<div><b>No Microsoft 365 match for this name.</b> Pick their account so title and manager stay in sync.</div><select data-f="email" style="margin-left:auto;max-width:220px;font:13px Outfit,Inter,sans-serif;padding:6px 8px;border:1px solid #e0c4bd;border-radius:8px">' +
        opts(DIR.list.map(function (p) { return { v: p.email, l: p.name + (p.title ? " · " + p.title : "") }; }), "", "Link to…") + "</select></div>";
      else if (sy.issues.length) m365 = '<div class="bp-flag" style="flex-wrap:wrap">' + ic("alert") + "<div style=\"flex:1 1 260px\"><b>Out of sync with Microsoft 365.</b>" + sy.issues.map(function (x) { return '<div style="margin-top:4px">' + esc(x.label) + ": blueprint says <b>" + esc(x.mine) + "</b>, 365 says <b>" + esc(x.theirs) + '</b> <button class="bp-btn sm" data-act="use365" data-f="' + x.f + '">Use 365</button></div>'; }).join("") +
        '<div class="bp-hint" style="margin-top:6px">If 365 is the one that\'s wrong, fix it on the Directory tab.</div></div>' + (sy.issues.length > 1 ? '<button class="bp-btn sm" data-act="use365all">Use all</button>' : "") + "</div>";
      else m365 = '<div class="bp-hint ok" style="margin:0 0 12px">' + ic("check") + "Matches Microsoft 365 (" + esc(sy.p.email) + ")" + (sy.blankMgr ? " · no manager set in 365" : "") + (sy.blankTitle ? " · no title set in 365" : "") + "</div>";
    }
    h += '<div class="bp-sec">' + secH(1, "Team member") + m365 + '<div class="bp-f">' +
      '<label class="full">Name<input data-k="name" data-f="name" list="bpRoster" value="' + esc(d.name) + '" placeholder="Start typing a name from Microsoft 365"></label>' +
      '<datalist id="bpRoster">' + (DIR ? DIR.list.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.title) + "</option>"; }) : (R.roster || []).map(function (r) { return '<option value="' + esc(r.name) + '">' + esc(r.title) + "</option>"; })).join("") + "</datalist>" +
      '<label>Company<select data-f="company">' + opts(companies, d.company) + "</select></label>" +
      '<label>Title<input data-k="title" data-f="title" value="' + esc(d.title) + '"></label>' +
      '<label>Role<select data-f="role">' + opts(roles, d.role) + "</select></label>" +
      '<label>Reports to<input data-k="reportsTo" data-f="reportsTo" value="' + esc(d.reportsTo) + '"></label>' +
      '<label>Effective date<input type="date" data-k="effective" data-f="effective" value="' + esc(d.effective || "") + '"></label>' +
      "</div></div>";
    // 2 territory
    var guess = guessTerr(d), T = terrs();
    var tOpts = [{ v: "", l: "Match automatically" + (guess ? " (" + guess.name + ")" : "") }].concat(T.map(function (t) { return { v: t.id, l: t.name }; })).concat([{ v: "all", l: "All territories (national)" }, { v: "none", l: "Don't show a map" }]);
    h += '<div class="bp-sec">' + secH(2, "Territory") + '<div class="bp-f">' +
      '<label>Region<select data-f="region">' + opts(regions, d.region, "Select region") + "</select></label>" +
      '<label>Territory label<input data-k="territory" data-f="territory" value="' + esc(d.territory) + '" placeholder="e.g. Automation (Metro Detroit)"></label>' +
      '<label class="full">Map from Territory Map<select data-f="mapTerritory">' + opts(tOpts, d.mapTerritory || "") + "</select></label></div>" +
      '<div class="bp-hint">' + ic("map") + (TERR ? "Shapes and colors come from the live Territory Map." : "Using the default territories until the Territory Map loads.") + "</div></div>";
    // 3 service line
    h += '<div class="bp-sec">' + secH(3, "Service line and targets") + '<div class="bp-f">' +
      '<label>Primary service line<select data-f="serviceLine">' + opts(lines, d.serviceLine, "Select service line") + "</select></label>" +
      '<label>Secondary (optional)<select data-f="secondaryServiceLine">' + opts(lines, d.secondaryServiceLine, "None") + "</select></label>" +
      '<label>Headcount expectation<input data-k="hc" data-f="hc" inputmode="numeric" value="' + esc(d.hc) + '" placeholder="' + esc(L.hc != null ? "Standard: " + L.hc : "") + '"></label>' +
      '<label class="bp-chk" style="align-self:end;padding-bottom:9px"><input type="checkbox" data-f="dhFocused"' + (d.dhFocused ? " checked" : "") + "> Direct hire focused</label></div>" +
      (d.serviceLine ? '<div class="bp-hint">Targets from the rules: <b>' + money(L.direct) + "</b> direct hire · <b>" + (L.charge != null ? money(L.charge) : "case by case") + "</b> weekly charge · standard headcount <b>" + (L.hc != null ? L.hc : "—") + "</b></div>" +
        (L.note ? '<div class="bp-note" style="margin-bottom:0">' + ic("alert") + "<div>" + esc(L.note) + "</div></div>" : "") : "") + "</div>";
    // 4 goals
    var same = std.length && JSON.stringify(std) === JSON.stringify(d.kpis), gapN = startsGap(d);
    if (gapN) h += '<div class="bp-flag">' + ic("alert") + "<div><b>No weekly starts goal.</b> The standard for " + esc(d.serviceLine) + " is " + gapN + " starts per week (Oct 26 leadership meeting).</div>" + '<button class="bp-btn sm" data-act="addstarts">Add ' + gapN + " starts per week</button></div>";
    if (d.serviceLine === "Light Industrial" && (d.kpis || []).some(function (x) { return /submi(t|ss)/i.test(x); })) h += '<div class="bp-note">' + ic("alert") + "<div>Light Industrial is measured in starts, not submittals. Consider replacing the submittal goal.</div></div>";
    h += '<div class="bp-sec">' + secH(4, "Weekly goals") + listEditor("kpis", d.kpis, "Add a goal, e.g. 10 submissions per week") +
      (std.length ? (same ? '<div class="bp-hint ok">' + ic("check") + "Matches the standard for " + esc(roleShort(d.role)) + " · " + esc(d.serviceLine) + "</div>"
        : '<div class="bp-hint">Differs from the standard for ' + esc(roleShort(d.role)) + " · " + esc(d.serviceLine) + '<button class="bp-btn sm" data-act="stdkpi">' + ic("reset") + "Use standard</button></div>") : "") + "</div>";
    // 5 titles
    var sel = allTitles(d), lib = [];
    [d.serviceLine, S.libBoth ? d.secondaryServiceLine : ""].forEach(function (s) { if (s && R.titles[s]) R.titles[s].forEach(function (t) { if (lib.indexOf(t) < 0) lib.push(t); }); });
    var lq = (S.libQ || "").toLowerCase(), shown = lib.filter(function (t) { return !lq || t.toLowerCase().indexOf(lq) >= 0; });
    var LIM = 16, more = !S.libAll && !lq && shown.length > LIM;
    h += '<div class="bp-sec">' + secH(5, "Focused titles", '<span style="font-size:12px;color:' + (sel.length > MAX_TITLES ? "#a3341f" : "#8a8576") + '">' + sel.length + " of " + MAX_TITLES + "</span>") +
      '<div class="bp-sel">' + (d.titleGroups || []).map(function (g, gi) {
        return '<div class="grp' + (gi === S.activeGroup && d.titleGroups.length > 1 ? " on" : "") + '" data-act="grp" data-g="' + gi + '">' + (d.titleGroups.length > 1 || g.group ? '<div class="gh"><input data-k="g' + gi + '" data-act="gname" data-g="' + gi + '" value="' + esc(g.group) + '" placeholder="Group name">' +
          (d.titleGroups.length > 1 ? '<button class="bp-x" title="Remove group" data-act="rmgrp" data-g="' + gi + '">' + ic("x") + "</button>" : "") + "</div>" : "") +
          '<div class="bp-chips">' + ((g.titles || []).length ? g.titles.map(function (t, ti) { return '<span class="bp-chip on">' + esc(t) + '<button class="bp-x" style="color:#FFC800;padding:0" data-act="rmtitle" data-g="' + gi + '" data-i="' + ti + '">' + ic("x") + "</button></span>"; }).join("") : '<span class="op-empty">Pick titles from the library below</span>') + "</div></div>";
      }).join("") + "</div>";
    if (lib.length || d.secondaryServiceLine) {
      h += '<div class="bp-lib"><input class="bp-libq" data-k="libq" data-act="libq" placeholder="Filter ' + esc(d.serviceLine || "") + ' titles" value="' + esc(S.libQ || "") + '">' +
        (d.secondaryServiceLine ? '<button class="bp-btn sm" data-act="libboth">' + (S.libBoth ? "Hide " : "Include ") + esc(d.secondaryServiceLine) + "</button>" : "") + "</div>" +
        '<div class="bp-chips">' + (more ? shown.slice(0, LIM) : shown).map(function (t) { return '<button class="bp-chip' + (sel.indexOf(t) >= 0 ? " on" : "") + '" data-act="title" data-t="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") +
        (more ? '<button class="bp-chip sug" data-act="libmore">+ ' + (shown.length - LIM) + " more</button>" : "") + "</div>";
    } else h += '<div class="op-empty">Pick a service line to see its titles.</div>';
    h += '<div class="bp-add"><input data-k="customTitle" id="bpCustomTitle" placeholder="Title not in the library? Type it and press Enter"><button class="bp-btn sm ghost" data-act="addgrp" title="Split titles into groups">' + ic("plus") + "Group</button></div></div>";
    // 6 contacts
    var sug = []; S.list.forEach(function (b) { var x = b.data || {}; if (x.serviceLine === d.serviceLine) (x.contacts || []).forEach(function (c) { if (sug.indexOf(c) < 0 && (d.contacts || []).indexOf(c) < 0) sug.push(c); }); });
    h += '<div class="bp-sec">' + secH(6, "Target customer contacts") + listEditor("contacts", d.contacts, "Add a contact title", true);
    if (sug.length) h += '<div class="bp-hint">Used on other ' + esc(d.serviceLine) + ' blueprints</div><div class="bp-chips" style="margin-top:6px">' + sug.slice(0, 8).map(function (c) { return '<button class="bp-chip sug" data-act="addsug" data-t="' + esc(c) + '">' + ic("plus") + esc(c) + "</button>"; }).join("") + "</div>";
    h += "</div>";
    // 7 s4 + notes
    var s4same = JSON.stringify(d.s4) === JSON.stringify(S.rules.s4);
    h += '<div class="bp-sec">' + secH(7, "S4 process", s4same ? "" : '<button class="bp-btn sm" data-act="stds4">' + ic("reset") + "Reset to standard</button>") + listEditor("s4", d.s4, "Add a step", true) + "</div>";
    var rd = roadOf(d), rdStd = !Array.isArray(d.road);
    h += '<div class="bp-sec">' + secH(8, "Daily road", rdStd ? '<span style="font-size:12px;color:#8a8576">Using the standard day</span>' : '<button class="bp-btn sm" data-act="stdroad">' + ic("reset") + "Reset to standard</button>") +
      '<div class="bp-li">' + rd.map(function (st, i) {
        return '<div class="it"><input style="flex:0 0 92px" data-k="rt' + i + '" data-act="road" data-i="' + i + '" data-p="time" value="' + esc(st.time) + '">' +
          '<select data-act="roadtag" data-i="' + i + '" style="flex:0 0 84px;font:13px Outfit,Inter,sans-serif;padding:8px;border:1px solid #E0DACB;border-radius:10px;background:#fff">' + ["", "PLUG", "PROD", "PREP"].map(function (t) { return '<option value="' + t + '"' + (t === (st.tag || "") ? " selected" : "") + ">" + (t || "—") + "</option>"; }).join("") + "</select>" +
          '<input data-k="rx' + i + '" data-act="road" data-i="' + i + '" data-p="text" value="' + esc(st.text) + '">' +
          '<button class="bp-x" title="Remove" data-act="roadrm" data-i="' + i + '">' + ic("x") + "</button></div>";
      }).join("") + '</div><div class="bp-add"><button class="bp-btn sm" data-act="roadadd">' + ic("plus") + "Add a stop</button></div></div>";
    h += '<div class="bp-sec">' + secH(9, "Notes") + '<div class="bp-f"><label class="full"><textarea data-k="notes" data-f="notes" placeholder="Anything else for this seat (optional)">' + esc(d.notes || "") + "</textarea></label></div></div>";
    h += "</div>";
    h += '<div class="bp-prevwrap">' + (S.curId ? scorecard(d, S.actWeek) : "") + '<div class="bp-prevlab"><span>Live preview</span><span class="bp-fit"></span></div>' + onePager(d) + "</div>";
    h += "</div>";
    return h;
  }
  function roleShort(r) { return r === "Account Recruiting Manager (ARM)" ? "ARM" : r || ""; }
  function listEditor(key, arr, ph, numbered) {
    arr = arr || [];
    return '<div class="bp-li">' + arr.map(function (v, i) {
      return '<div class="it">' + (numbered ? '<span class="n">' + (i + 1) + "</span>" : "") + '<input data-k="' + key + i + '" data-act="li" data-l="' + key + '" data-i="' + i + '" value="' + esc(v) + '">' +
        '<button class="bp-x" title="Move up" data-act="liup" data-l="' + key + '" data-i="' + i + '"' + (i ? "" : " disabled") + ">" + ic("up") + "</button>" +
        '<button class="bp-x" title="Remove" data-act="lirm" data-l="' + key + '" data-i="' + i + '">' + ic("x") + "</button></div>";
    }).join("") + '</div><div class="bp-add"><input data-k="add-' + key + '" data-add="' + key + '" placeholder="' + esc(ph) + '"><button class="bp-btn sm" data-act="liadd" data-l="' + key + '">' + ic("plus") + "Add</button></div>";
  }
  function applyOct26Rules() {
    var R = S.rulesDraft || (S.rulesDraft = clone(S.rules));
    R.serviceLines.forEach(function (l) { if (l.name === "Skilled Trades") { l.charge = 400; l.note = "$400 confirmed at the Oct 26 Sr Leadership meeting."; } });
    var ONE = ["Skilled Trades", "Skilled Trades - Automation", "Skilled Trades - Data Center", "Technical", "Technical - Automation"];
    Object.keys(R.kpi || {}).forEach(function (role) {
      var k = R.kpi[role];
      ONE.forEach(function (sl) { if (k[sl]) k[sl].reference = "One reference required"; });
      if (k["Light Industrial"]) k["Light Industrial"].reference = "Contact name; try the most relevant reference first";
      if (role !== "Business Development") { ["Light Industrial", "Skilled Trades - Automation", "Skilled Trades - Data Center"].forEach(function (sl) { if (k[sl]) k[sl].starts = 7; }); if (k["Skilled Trades"]) k["Skilled Trades"].starts = 2; }
    });
    S.msg = "Standards added to the rules. Review, then Save rules.";
  }
  function bulkStarts() {
    var todo = S.list.filter(function (b) { return startsGap(b.data || {}); });
    if (!todo.length) return;
    if (!window.confirm("Add the weekly starts goal to " + todo.length + " blueprints? Each one keeps its other goals and its status.")) return;
    S.saving = true; var done = 0, failed = 0; render();
    todo.reduce(function (p, b) {
      return p.then(function () {
        var d = clone(b.data); addStarts(d);
        return api("POST", "/blueprints", { id: b.id, status: b.status, data: d }).then(function (r) { var i = S.list.indexOf(b); if (i >= 0 && r.blueprint) S.list[i] = r.blueprint; done++; }).catch(function () { failed++; });
      });
    }, Promise.resolve()).then(function () { S.saving = false; flash("Added the starts goal to " + done + " blueprints" + (failed ? "; " + failed + " failed" : "") + "."); });
  }
  function rulesView() {
    var R = S.rulesDraft || (S.rulesDraft = clone(S.rules));
    if (!S.rulesLine) S.rulesLine = R.serviceLines[0].name;
    if (!S.rulesRole) S.rulesRole = R.roles[0];
    var h = '<div class="bp-note" style="margin-top:0">' + ic("sliders") + "<div>These rules drive every blueprint: targets and headcount per service line, standard KPIs per role, and each service line's title library. Changing a rule doesn't rewrite saved blueprints; it changes what the builder fills in next time. Seeded from " + esc(R.source || "Fletcher's workbooks") + "." + (S.rulesAt ? " Last saved " + esc(fmtDate(S.rulesAt)) + " by " + esc(S.rulesBy) + "." : "") + "</div></div>";
    var gaps = S.list.filter(function (b) { return startsGap(b.data || {}); });
    h += '<div class="bp-sec"><h4>Oct 26 leadership standards</h4><div class="bp-hint" style="margin-top:0">7 starts a week for Light Industrial, build/pipe/wire and data center. Skilled Trades stays at 2 starts with a $400 margin. Skilled Trades and technical roles need one reference; Light Industrial needs a contact name and tries the most relevant reference first.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="bp-btn sm" data-act="oct26rules">' + ic("sliders") + "Put these in the rules</button>" +
      (gaps.length ? '<button class="bp-btn sm gold" data-act="oct26bulk"' + (S.saving ? " disabled" : "") + ">" + ic("plus") + "Add the starts goal to " + gaps.length + " blueprint" + (gaps.length === 1 ? "" : "s") + "</button>" : '<span class="bp-hint ok" style="margin:0">' + ic("check") + "Every blueprint has its starts goal</span>") + "</div></div>";
    h += '<div class="bp-sec"><h4>Targets by service line</h4><table class="bp-rt"><thead><tr><th>Service line</th><th>Direct hire target</th><th>Weekly charge</th><th>Headcount</th><th>Note</th></tr></thead><tbody>' +
      R.serviceLines.map(function (l, i) {
        return "<tr><td><b>" + esc(l.name) + "</b></td>" +
          '<td><input data-k="rl' + i + 'd" data-act="rline" data-i="' + i + '" data-p="direct" inputmode="numeric" value="' + esc(l.direct == null ? "" : l.direct) + '" placeholder="Case by case"></td>' +
          '<td><input data-k="rl' + i + 'c" data-act="rline" data-i="' + i + '" data-p="charge" inputmode="numeric" value="' + esc(l.charge == null ? "" : l.charge) + '" placeholder="Case by case"></td>' +
          '<td><input data-k="rl' + i + 'h" data-act="rline" data-i="' + i + '" data-p="hc" inputmode="numeric" value="' + esc(l.hc == null ? "" : l.hc) + '"></td>' +
          '<td><input class="w" data-k="rl' + i + 'n" data-act="rline" data-i="' + i + '" data-p="note" value="' + esc(l.note || "") + '"></td></tr>';
      }).join("") + "</tbody></table></div>";
    h += '<div class="bp-sec"><h4>Standard KPIs by role</h4><div class="bp-seg">' + R.roles.map(function (r) { return '<button class="bp-chip' + (r === S.rulesRole ? " on" : "") + '" data-act="rrole" data-r="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") + "</div>" +
      '<table class="bp-rt"><thead><tr><th>Service line</th><th>Starts / week</th><th>In process</th><th>Pre-screens / wk</th><th>Calls / wk</th><th>Meetings / wk</th><th>References</th></tr></thead><tbody>' +
      R.serviceLines.map(function (l) {
        var k = (R.kpi[S.rulesRole] || {})[l.name] || {};
        function cell(p, w) { return '<td><input ' + (w ? 'class="w" ' : 'style="width:80px" ') + 'data-k="rk' + esc(l.name + p) + '" data-act="rkpi" data-s="' + esc(l.name) + '" data-p="' + p + '" value="' + esc(k[p] == null ? "" : k[p]) + '"></td>'; }
        return "<tr><td><b>" + esc(l.name) + "</b></td>" + cell("starts") + cell("inProcess") + cell("preScreens") + cell("calls") + cell("meetings") + cell("reference", true) + "</tr>";
      }).join("") + "</tbody></table></div>";
    var T = R.titles[S.rulesLine] || [];
    h += '<div class="bp-sec"><h4>Title library <span class="r" style="font-size:12px;color:#8a8576">' + T.length + " titles</span></h4><div class=\"bp-seg\">" + R.serviceLines.map(function (l) { return '<button class="bp-chip' + (l.name === S.rulesLine ? " on" : "") + '" data-act="rlinesel" data-s="' + esc(l.name) + '">' + esc(l.name) + " · " + (R.titles[l.name] || []).length + "</button>"; }).join("") + "</div>" +
      '<div class="bp-chips">' + (T.length ? T.map(function (t, i) { return '<span class="bp-chip">' + esc(t) + '<button class="bp-x" style="padding:0" data-act="rtrm" data-i="' + i + '">' + ic("x") + "</button></span>"; }).join("") : '<span class="op-empty">No titles yet.</span>') + "</div>" +
      '<div class="bp-add"><input data-k="rtadd" id="bpRtAdd" placeholder="Add a title to ' + esc(S.rulesLine) + ' and press Enter"><button class="bp-btn sm" data-act="rtadd">' + ic("plus") + "Add</button></div></div>";
    h += '<div class="bp-sec"><h4>Standard S4 process</h4>' + rulesS4(R) + "</div>";
    var changed = JSON.stringify(R) !== JSON.stringify(S.rules);
    h += '<div class="bp-rbar"><span class="msg">' + esc(S.msg || (changed ? "Unsaved rule changes" : "Rules match what's saved")) + "</span>" +
      (changed ? '<button class="bp-btn" data-act="rdiscard">Discard</button>' : "") + '<button class="bp-btn gold" data-act="rsave"' + (changed && !S.saving ? "" : " disabled") + ">" + ic("check") + "Save rules</button></div>";
    return h;
  }
  function rulesS4(R) {
    return '<div class="bp-li">' + R.s4.map(function (v, i) { return '<div class="it"><span class="n">' + (i + 1) + '</span><input data-k="rs' + i + '" data-act="rs4" data-i="' + i + '" value="' + esc(v) + '"><button class="bp-x" data-act="rs4rm" data-i="' + i + '">' + ic("x") + "</button></div>"; }).join("") +
      '</div><div class="bp-add"><input data-k="rs4add" id="bpRs4Add" placeholder="Add a step and press Enter"><button class="bp-btn sm" data-act="rs4add">' + ic("plus") + "Add</button></div>";
  }

  /* ---------- actions ---------- */
  var msgTimer = null;
  function flash(m) { S.msg = m; render(); clearTimeout(msgTimer); msgTimer = setTimeout(function () { S.msg = ""; render(); }, 3500); }
  function touch() { S.dirty = true; S.msg = ""; render(); }
  function confirmLeave() { return !S.dirty || window.confirm("You have unsaved changes on this blueprint. Leave without saving?"); }
  function openBlueprint(b) {
    S.cur = clone(b.data || {}); S.curId = b.id; S.curStatus = b.status || "draft";
    if (!S.cur.titleGroups || !S.cur.titleGroups.length) S.cur.titleGroups = [{ group: "", titles: [] }];
    ["kpis", "s4", "contacts", "flags"].forEach(function (k) { if (!Array.isArray(S.cur[k])) S.cur[k] = []; });
    S.cur.name = S.cur.name || b.name; S.activeGroup = 0; S.libQ = ""; S.libAll = false; S.libBoth = false; S.dirty = false; S.msg = ""; S.view = "edit"; render(); scrollTop();
  }
  function startNew(name, email) {
    S.cur = blank(); S.curId = null; S.curStatus = "draft"; S.activeGroup = 0; S.libQ = ""; S.libAll = false; S.libBoth = false; S.msg = ""; S.view = "edit";
    if (name) { S.cur.name = name; applyRoster(name, true); if (email) S.cur.email = email; var p = personFor(S.cur); if (p) applyDir(S.cur, p, true); }
    S.dirty = !!name; render(); scrollTop();
  }
  function applyRoster(name, fresh) {
    var r = rosterFor(name); if (!r) return false;
    var d = S.cur;
    d.name = r.name; d.company = r.company || d.company; d.title = r.title; d.role = r.role; d.region = r.region; d.reportsTo = r.reportsTo;
    d.serviceLine = r.serviceLine; d.secondaryServiceLine = r.secondaryServiceLine || "";
    if (fresh || !d.hc) d.hc = r.hc || "";
    if (fresh || !d.kpis.length) d.kpis = standardKpis(d.role, d.serviceLine);
    return true;
  }
  function scrollTop() { try { var v = document.getElementById("view-" + TAB); if (v) v.scrollTop = 0; window.scrollTo(0, 0); } catch (e) {} }
  function save(status) {
    var d = S.cur; if (!d) return;
    if (!String(d.name || "").trim()) { flash("Add the team member's name first."); return; }
    if (status === "published" && !d.serviceLine) { flash("Pick a service line before publishing."); return; }
    d.titleGroups = (d.titleGroups || []).filter(function (g, i) { return i === 0 || (g.titles && g.titles.length) || g.group; });
    var pm = personFor(d); if (pm && !d.email) d.email = pm.email;  /* lock the 365 link in once it's matched */
    S.saving = true; S.msg = "Saving…"; render();
    api("POST", "/blueprints", { id: S.curId || undefined, status: status, data: d }).then(function (r) {
      var b = r.blueprint || {};
      S.curId = b.id || S.curId; S.curStatus = b.status || status; S.dirty = false; S.saving = false;
      var i = S.list.findIndex(function (x) { return x.id === b.id; });
      if (i >= 0) S.list[i] = b; else S.list.push(b);
      S.list.sort(function (a, c) { return String(a.name).localeCompare(String(c.name)); });
      flash(status === "published" ? "Published." : "Draft saved.");
    }).catch(function (e) { S.saving = false; flash(e.message); });
  }
  function onClick(e) {
    var t = e.target.closest("[data-act]"); if (!t || !root.contains(t)) return;
    var act = t.getAttribute("data-act"), d = S.cur;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") { if (act !== "grp") return; }
    switch (act) {
      case "view":
        if (S.view === "edit" && !confirmLeave()) return;
        S.view = t.getAttribute("data-v"); S.cur = null; S.dirty = false; S.msg = ""; render(); break;
      case "filter": S.filter = S.filter === t.getAttribute("data-f") ? "all" : t.getAttribute("data-f"); render(); break;
      case "new": startNew(""); break;
      case "newfor": startNew(t.getAttribute("data-name"), t.getAttribute("data-email")); break;
      case "use365": var sy1 = sync(d); (sy1 && sy1.issues || []).forEach(function (x) { if (x.f === t.getAttribute("data-f")) d[x.f] = x.theirs; }); if (sy1 && sy1.p) d.email = sy1.p.email; touch(); break;
      case "use365all": var sy2 = sync(d); if (sy2 && sy2.p) applyDir(d, sy2.p, false); touch(); break;
      case "open": var b = S.list.filter(function (x) { return x.id === t.getAttribute("data-id"); })[0]; if (b) openBlueprint(b); break;
      case "back": if (!confirmLeave()) return; S.view = "list"; S.cur = null; S.dirty = false; render(); scrollTop(); break;
      case "unflag": d.flags.splice(+t.getAttribute("data-i"), 1); touch(); break;
      case "stdkpi": d.kpis = standardKpis(d.role, d.serviceLine); touch(); break;
      case "stds4": d.s4 = clone(S.rules.s4); touch(); break;
      case "addstarts": addStarts(d); touch(); break;
      case "actwk": S.actWeek = t.getAttribute("data-w"); render(); break;
      case "oct26rules": applyOct26Rules(); render(); break;
      case "oct26bulk": bulkStarts(); break;
      case "stdroad": delete d.road; touch(); break;
      case "roadadd": d.road = roadOf(d); d.road.push({ time: "", tag: "", text: "" }); touch(); break;
      case "roadrm": d.road = roadOf(d); d.road.splice(+t.getAttribute("data-i"), 1); touch(); break;
      case "grp": if (e.target.closest("button")) return; S.activeGroup = +t.getAttribute("data-g"); render(); break;
      case "addgrp": d.titleGroups.push({ group: "", titles: [] }); S.activeGroup = d.titleGroups.length - 1; touch(); break;
      case "rmgrp": var gi = +t.getAttribute("data-g"); var moved = d.titleGroups[gi].titles || []; d.titleGroups.splice(gi, 1); d.titleGroups[0].titles = (d.titleGroups[0].titles || []).concat(moved.filter(function (x) { return d.titleGroups[0].titles.indexOf(x) < 0; })); S.activeGroup = 0; touch(); break;
      case "title":
        var tt = t.getAttribute("data-t"), found = false;
        d.titleGroups.forEach(function (g) { var i = (g.titles || []).indexOf(tt); if (i >= 0) { g.titles.splice(i, 1); found = true; } });
        if (!found) { var G = d.titleGroups[S.activeGroup] || d.titleGroups[0]; G.titles = G.titles || []; G.titles.push(tt); }
        touch(); break;
      case "rmtitle": d.titleGroups[+t.getAttribute("data-g")].titles.splice(+t.getAttribute("data-i"), 1); touch(); break;
      case "customtitle": addCustomTitle(); break;
      case "libmore": S.libAll = true; render(); break;
      case "libboth": S.libBoth = !S.libBoth; render(); break;
      case "addsug": d.contacts.push(t.getAttribute("data-t")); touch(); break;
      case "liadd": addItem(t.getAttribute("data-l")); break;
      case "lirm": d[t.getAttribute("data-l")].splice(+t.getAttribute("data-i"), 1); touch(); break;
      case "liup": var a = d[t.getAttribute("data-l")], i2 = +t.getAttribute("data-i"); if (i2 > 0) { var tmp = a[i2 - 1]; a[i2 - 1] = a[i2]; a[i2] = tmp; touch(); } break;
      case "save": save(S.curStatus === "published" ? "published" : "draft"); break;
      case "publish": save("published"); break;
      case "print": exportDoc("print"); break;
      case "word": exportDoc("word"); break;
      case "dup": var c = clone(d); c.name = ""; c.flags = []; S.cur = c; S.curId = null; S.curStatus = "draft"; S.dirty = true; flash("Copy made. Pick the team member and save."); break;
      case "del":
        if (!window.confirm("Delete " + (d.name || "this blueprint") + "'s blueprint? This can't be undone.")) return;
        api("DELETE", "/blueprints?id=" + encodeURIComponent(S.curId)).then(function () {
          S.list = S.list.filter(function (x) { return x.id !== S.curId; }); S.cur = null; S.curId = null; S.dirty = false; S.view = "list"; render();
        }).catch(function (er) { flash(er.message); });
        break;
      /* rules */
      case "rrole": S.rulesRole = t.getAttribute("data-r"); render(); break;
      case "rlinesel": S.rulesLine = t.getAttribute("data-s"); render(); break;
      case "rtrm": S.rulesDraft.titles[S.rulesLine].splice(+t.getAttribute("data-i"), 1); render(); break;
      case "rtadd": addRuleTitle(); break;
      case "rs4rm": S.rulesDraft.s4.splice(+t.getAttribute("data-i"), 1); render(); break;
      case "rs4add": var inp = document.getElementById("bpRs4Add"); if (inp && inp.value.trim()) { S.rulesDraft.s4.push(inp.value.trim()); render(); } break;
      case "rdiscard": S.rulesDraft = clone(S.rules); render(); break;
      case "rsave":
        S.saving = true; render();
        api("POST", "/blueprints/rules", { data: S.rulesDraft }).then(function (r) {
          S.rules = clone(S.rulesDraft); S.rulesAt = r.updated_at; S.rulesBy = r.updated_by; S.saving = false; flash("Rules saved.");
        }).catch(function (er) { S.saving = false; flash(er.message); });
        break;
    }
  }
  function addItem(key) {
    var inp = root.querySelector('[data-add="' + key + '"]'); if (!inp) return;
    var v = inp.value.trim(); if (!v) return;
    S.cur[key].push(v); S.dirty = true; render();
    var n = root.querySelector('[data-add="' + key + '"]'); if (n) n.focus();
  }
  function addCustomTitle() {
    var inp = document.getElementById("bpCustomTitle"); if (!inp) return; var v = inp.value.trim(); if (!v) return;
    var G = S.cur.titleGroups[S.activeGroup] || S.cur.titleGroups[0]; G.titles = G.titles || []; if (G.titles.indexOf(v) < 0) G.titles.push(v);
    S.dirty = true; render(); var n = document.getElementById("bpCustomTitle"); if (n) n.focus();
  }
  function addRuleTitle() {
    var inp = document.getElementById("bpRtAdd"); if (!inp) return; var v = inp.value.trim(); if (!v) return;
    var T = S.rulesDraft.titles[S.rulesLine] = S.rulesDraft.titles[S.rulesLine] || [];
    if (T.indexOf(v) < 0) T.push(v); render(); var n = document.getElementById("bpRtAdd"); if (n) n.focus();
  }
  function num(v) { v = String(v).replace(/[$,\s]/g, ""); return v === "" ? null : (isNaN(+v) ? v : +v); }
  function onInput(e) {
    var t = e.target, act = t.getAttribute("data-act"), f = t.getAttribute("data-f");
    if (act === "q") { S.q = t.value; render(); return; }
    if (act === "libq") { S.libQ = t.value; render(); return; }
    if (f && S.cur && t.type !== "checkbox" && t.tagName !== "SELECT") {
      S.cur[f] = t.value; S.dirty = true;
      if (f === "name" && !S.curId) {
        var hitR = rosterFor(t.value) && applyRoster(t.value, !S.cur.kpis.length);
        var hitD = DIR && DIR.list.filter(function (p) { return normN(p.name) === normN(t.value); })[0];
        if (hitD) applyDir(S.cur, hitD, true);
        if (hitR || hitD) { render(); return; }
      }
      renderSoft(); return;
    }
    if (act === "road") { if (!Array.isArray(S.cur.road)) S.cur.road = stdRoad(); S.cur.road[+t.getAttribute("data-i")][t.getAttribute("data-p")] = t.value; S.dirty = true; renderSoft(); return; }
    if (act === "li") { S.cur[t.getAttribute("data-l")][+t.getAttribute("data-i")] = t.value; S.dirty = true; renderSoft(); return; }
    if (act === "gname") { S.cur.titleGroups[+t.getAttribute("data-g")].group = t.value; S.dirty = true; renderSoft(); return; }
    if (act === "rline") { var l = S.rulesDraft.serviceLines[+t.getAttribute("data-i")], p = t.getAttribute("data-p"); l[p] = p === "note" ? t.value : num(t.value); renderSoft(true); return; }
    if (act === "rkpi") { var R = S.rulesDraft, role = S.rulesRole, s = t.getAttribute("data-s"), pp = t.getAttribute("data-p"); R.kpi[role] = R.kpi[role] || {}; R.kpi[role][s] = R.kpi[role][s] || {}; R.kpi[role][s][pp] = pp === "reference" ? t.value : (num(t.value) == null ? "" : num(t.value)); renderSoft(true); return; }
    if (act === "rs4") { S.rulesDraft.s4[+t.getAttribute("data-i")] = t.value; renderSoft(true); return; }
  }
  /* Typing shouldn't rebuild the form (it would drop focus on mobile keyboards); only refresh the preview + status. */
  var softT = null;
  /* How the preview compares to a letter page (7.7in x 10.15in printable). Print scales to fit; this just says by how much. */
  function fitNote() {
    if (!root) return;
    var op = root.querySelector(".bp-prevwrap .op"), lab = root.querySelector(".bp-fit"); if (!op || !lab) return;
    var page = 10.15 / 7.7, ratio = op.offsetHeight / Math.max(1, op.offsetWidth);
    if (ratio <= page) { lab.textContent = "Fits on one page"; lab.style.color = "#2f7a4a"; }
    else { var pct = Math.round(page / ratio * 100); lab.textContent = "Prints on one page at " + pct + "% size" + (pct < 80 ? ", consider trimming" : ""); lab.style.color = pct < 80 ? "#a3341f" : "#8a8576"; }
  }
  function renderSoft(rules) {
    clearTimeout(softT);
    softT = setTimeout(function () {
      if (rules) { var m = root.querySelector(".bp-rbar .msg"), btn = root.querySelector('[data-act="rsave"]'); var ch = JSON.stringify(S.rulesDraft) !== JSON.stringify(S.rules); if (m) m.textContent = ch ? "Unsaved rule changes" : "Rules match what's saved"; if (btn) btn.disabled = !ch; return; }
      var pv = root.querySelector(".bp-prevwrap .op"); if (pv) { pv.outerHTML = onePager(S.cur); fitNote(); }
      var ms = root.querySelector(".bp-top .msg"); if (ms) ms.textContent = "Unsaved changes";
    }, 120);
  }
  function onChange(e) {
    var t = e.target, f = t.getAttribute("data-f");
    /* Text inputs update state on every keystroke (onInput); re-rendering on blur would swallow the click that caused it. */
    if (t.getAttribute("data-act") === "roadtag" && S.cur) { if (!Array.isArray(S.cur.road)) S.cur.road = stdRoad(); S.cur.road[+t.getAttribute("data-i")].tag = t.value; S.dirty = true; render(); return; }
    if (!f || !S.cur || (t.tagName !== "SELECT" && t.type !== "checkbox")) return;
    if (t.type === "checkbox") S.cur[f] = t.checked;
    else S.cur[f] = t.value;
    if ((f === "role" || f === "serviceLine") && !S.cur.kpis.length) S.cur.kpis = standardKpis(S.cur.role, S.cur.serviceLine);
    S.dirty = true; render();
  }
  function onKey(e) {
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t.getAttribute("data-add")) { e.preventDefault(); addItem(t.getAttribute("data-add")); }
    else if (t.id === "bpCustomTitle") { e.preventDefault(); addCustomTitle(); }
    else if (t.id === "bpRtAdd") { e.preventDefault(); addRuleTitle(); }
    else if (t.id === "bpRs4Add") { e.preventDefault(); if (t.value.trim()) { S.rulesDraft.s4.push(t.value.trim()); render(); var n = document.getElementById("bpRs4Add"); if (n) n.focus(); } }
  }
  function wire(el) {
    root = el;
    el.addEventListener("click", onClick);
    el.addEventListener("input", onInput);
    el.addEventListener("change", onChange);
    el.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });
  }

  /* ---------- tab plumbing (same approach as hired-direct.js) ---------- */
  function openTab() {
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.remove("active"); });
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]'); if (btn) btn.classList.add("active");
    var v = document.getElementById("view-" + TAB);
    if (v && v.parentNode) Array.prototype.forEach.call(v.parentNode.children, function (p) { if (p !== v && /^view-/.test(p.id || "")) p.style.display = "none"; });
    document.querySelectorAll(".tab-page").forEach(function (p) { if (p !== v) p.style.display = "none"; });
    if (v) v.style.display = "";
    scrollTop(); render();
    if (!S.dirty) load().then(render);
  }
  var NAV_HTML = '<span class="ico"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></span>Blueprint Builder';
  function placeNav() {
    var after = document.querySelector('.nav-item[data-tab="leadership"]') || document.querySelector('.nav-item[data-tab="home"]');
    var nav = after ? after.parentNode : document.querySelector(".sidebar nav, .sidebar");
    if (!nav) return null;
    var btn = document.createElement("button");
    btn.className = "nav-item bp-sub"; btn.setAttribute("data-tab", TAB); btn.title = "One Page Blueprints for producers"; btn.innerHTML = NAV_HTML;
    if (after && after.nextSibling) nav.insertBefore(btn, after.nextSibling); else nav.appendChild(btn);
    btn.addEventListener("click", function () { var v = document.getElementById("view-" + TAB); if (v && v.style.display !== "none") return; openTab(); });
    return btn;
  }
  function ensureNav() {
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]');
    if (!btn || !document.body.contains(btn)) { placeNav(); return; }
    if (btn.style.display === "none") btn.style.display = "";
    if (btn.hasAttribute("hidden")) btn.removeAttribute("hidden");
  }
  function mountTab() {
    if (document.getElementById("view-" + TAB)) return;
    if (!placeNav()) return;
    var view = document.createElement("div");
    view.id = "view-" + TAB; view.className = "tab-page cream"; view.style.display = "none";
    view.innerHTML = '<div id="bpRoot"></div>';
    var anchor = document.getElementById("view-leadership") || document.getElementById("view-admin");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(view, anchor.nextSibling); else document.body.appendChild(view);
    wire(view.querySelector("#bpRoot"));
    document.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest(".nav-item[data-tab]");
      if (!b || b.getAttribute("data-tab") === TAB) return;
      if (view.style.display !== "none" && S.dirty && !window.confirm("You have unsaved changes on this blueprint. Leave without saving?")) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      view.style.display = "none";
    }, true);
    var n = 0; var fast = setInterval(function () { ensureNav(); if (++n >= 75) { clearInterval(fast); setInterval(ensureNav, 2500); } }, 400);
  }
  function fromHash() { if (location.hash === "#" + TAB) setTimeout(openTab, 300); }

  /* ---------- boot: only people the worker lets in ever get the nav item ---------- */
  function boot(t) {
    t = t || 0;
    var ready = document.querySelector('.nav-item[data-tab="home"]') && document.getElementById("view-admin") && window.SPARK_SB && window.SPARK_SB.getToken;
    if (!ready) { if (t < 80) setTimeout(function () { boot(t + 1); }, 600); return; }
    token().then(function (tk) {
      if (!tk) { if (t < 80) setTimeout(function () { boot(t + 1); }, 1500); return; }
      load().then(function () {
        if (S.denied) return;
        injectCss(); mountTab(); fromHash();
        loadGeo().then(render);
        loadDir().then(render);
        loadActuals("this").then(render);
        window.addEventListener("hashchange", fromHash);
        window.hqBlueprints = { open: openTab, reload: function () { return load().then(render); } };
      });
    });
  }

  /* ---------- MY_BLUEPRINT_v1: every producer's own page (published blueprints only) ---------- */
  var MB = { root: null, bp: null, ack: null, me: "", week: "this", saving: false };
  var MTAB = "myblueprint";
  function loadMine() {
    return api("GET", "/blueprints/mine").then(function (d) { MB.bp = d.blueprint; MB.ack = d.ack; MB.me = d.me || ""; if (!S.rules && d.rules) S.rules = d.rules; return !!MB.bp; }).catch(function () { return false; });
  }
  function renderMine() {
    if (!MB.root || !MB.bp) return;
    var d = MB.bp.data || {}, acked = MB.ack && MB.ack.version === MB.bp.updated_at;
    var h = '<div class="bp"><div class="bp-head"><div><div class="bp-k">My Blueprint</div><h1>' + esc(d.name || "") + "</h1><p>Your seat, your weekly goals, and how this week is tracking in Salesforce.</p></div>" +
      '<button class="bp-btn" data-mb="print">' + ic("print") + "Print / PDF</button></div>";
    h += '<div class="mb-ack">' + (acked ? '<span class="bp-hint ok" style="margin:0">' + ic("check") + "You confirmed this blueprint on " + esc(fmtDate(MB.ack.acked_at)) + ".</span>"
      : "<span><b>New or updated blueprint.</b> Read it through, then confirm you've got it.</span>" + '<button class="bp-btn gold" data-mb="ack"' + (MB.saving ? " disabled" : "") + ">" + ic("check") + "I've read my blueprint</button>") + "</div>";
    h += '<div class="mb-grid"><div>' + scorecard(d, MB.week, MB.me).replace(/data-act="actwk"/g, 'data-mb="wk"') +
      '<div class="bp-hint">Numbers come from Salesforce: starts from placement credits, submittals and interviews from stage moves you made, pre-screens and calls from logged tasks, meetings from calendar events. If something looks off, check that it\'s logged in Salesforce.</div></div>' +
      "<div>" + onePager(d) + "</div></div></div>";
    MB.root.innerHTML = h;
  }
  function wireMine(el) {
    MB.root = el;
    el.addEventListener("click", function (e) {
      var t = e.target.closest("[data-mb]"); if (!t) return;
      var a = t.getAttribute("data-mb");
      if (a === "wk") { MB.week = t.getAttribute("data-w"); if (!ACT[MB.week]) loadActuals(MB.week).then(renderMine); renderMine(); }
      if (a === "print") { var keep = S.cur; S.cur = MB.bp.data; exportDoc("print"); S.cur = keep; }
      if (a === "ack") {
        MB.saving = true; renderMine();
        api("POST", "/blueprints/ack", { id: MB.bp.id, version: MB.bp.updated_at }).then(function (r) { MB.ack = { acked_at: r.acked_at, version: MB.bp.updated_at }; })
          .catch(function (er) { window.alert(er.message); }).then(function () { MB.saving = false; renderMine(); });
      }
    });
  }
  function openMine() {
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.remove("active"); });
    var btn = document.querySelector('.nav-item[data-tab="' + MTAB + '"]'); if (btn) btn.classList.add("active");
    var v = document.getElementById("view-" + MTAB);
    if (v && v.parentNode) Array.prototype.forEach.call(v.parentNode.children, function (p) { if (p !== v && /^view-/.test(p.id || "")) p.style.display = "none"; });
    document.querySelectorAll(".tab-page").forEach(function (p) { if (p !== v) p.style.display = "none"; });
    if (v) v.style.display = "";
    scrollTop(); renderMine();
    loadActuals(MB.week).then(renderMine);
  }
  var MNAV = '<span class="ico"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M13 2L4.5 13.5h6l-1 8.5L19 10h-6z"/></svg></span>My Blueprint';
  function placeMineNav() {
    var after = document.querySelector('.nav-item[data-tab="careers"]') || document.querySelector('.nav-item[data-tab="home"]');
    var nav = after ? after.parentNode : null; if (!nav) return null;
    var btn = document.createElement("button");
    btn.className = "nav-item"; btn.setAttribute("data-tab", MTAB); btn.title = "Your One Page Blueprint and this week's numbers"; btn.innerHTML = MNAV;
    if (after.nextSibling) nav.insertBefore(btn, after.nextSibling); else nav.appendChild(btn);
    btn.addEventListener("click", openMine);
    return btn;
  }
  function mountMine() {
    if (document.getElementById("view-" + MTAB)) return;
    if (!placeMineNav()) return;
    var view = document.createElement("div");
    view.id = "view-" + MTAB; view.className = "tab-page cream"; view.style.display = "none";
    view.innerHTML = '<div id="mbRoot"></div>';
    var anchor = document.getElementById("view-admin");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(view, anchor); else document.body.appendChild(view);
    wireMine(view.querySelector("#mbRoot"));
    document.addEventListener("click", function (e) { var b = e.target && e.target.closest && e.target.closest(".nav-item[data-tab]"); if (b && b.getAttribute("data-tab") !== MTAB) view.style.display = "none"; }, true);
    setInterval(function () { if (!document.querySelector('.nav-item[data-tab="' + MTAB + '"]')) placeMineNav(); }, 2500);
    if (location.hash === "#" + MTAB) setTimeout(openMine, 300);
  }
  function bootMine(t) {
    t = t || 0;
    var ready = document.querySelector('.nav-item[data-tab="home"]') && document.getElementById("view-admin") && window.SPARK_SB && window.SPARK_SB.getToken;
    if (!ready) { if (t < 80) setTimeout(function () { bootMine(t + 1); }, 700); return; }
    token().then(function (tk) {
      if (!tk) { if (t < 80) setTimeout(function () { bootMine(t + 1); }, 1500); return; }
      loadMine().then(function (has) { if (!has) return; injectCss(); mountMine(); loadGeo().then(renderMine); window.addEventListener("hashchange", function () { if (location.hash === "#" + MTAB) openMine(); }); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); bootMine(); }); else { boot(); bootMine(); }
})();
