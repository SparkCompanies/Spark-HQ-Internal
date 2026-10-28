/* BLUEPRINTS_v1.1 — Blueprint Builder, a sub-item under Leadership in the HQ sidebar.
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
    if (k.starts !== "" && k.starts != null) out.push(/^\d+$/.test(String(k.starts)) ? k.starts + " starts per week at target margin" : "Starts: " + k.starts);
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
  function needsAttention(b) { var d = b.data || {}; return (d.flags && d.flags.length) || !allTitles(d).length || !d.serviceLine; }

  var I = {
    plus: "M12 5v14M5 12h14", back: "M15 18l-6-6 6-6", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
    print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    word: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13l1.5 5 1.5-4 1.5 4 1.5-5",
    copy: "M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1", trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
    x: "M6 6l12 12M18 6L6 18", up: "M12 19V5M5 12l7-7 7 7", down: "M12 5v14M19 12l-7 7-7-7", alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    check: "M5 12.5l4.5 4.5L19 7", sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5", doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"
  };
  function ic(n, cls) { return '<svg class="bp-i ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + I[n] + '"/></svg>'; }

  /* ---------- CSS ---------- */
  var CSS = [
    ".sidebar .nav-item[data-tab='" + TAB + "'],.sidebar .nav-item[data-tab='" + TAB + "'].hide-for-role{display:flex!important}",
    ".sidebar .nav-item.bp-sub{position:relative;padding:6px 20px 6px 56px!important;font-size:12.5px!important;gap:8px!important;min-height:0!important}",
    ".sidebar .nav-item.bp-sub .ico{width:14px!important;opacity:.85}",
    ".sidebar .nav-item.bp-sub::after{content:'';position:absolute;left:35px;top:-6px;height:calc(50% + 6px);width:12px;border-left:1.5px solid rgba(100,116,139,.32);border-bottom:1.5px solid rgba(100,116,139,.32);border-bottom-left-radius:7px;pointer-events:none}",
    "#view-" + TAB + "{font-family:Outfit,Inter,system-ui,sans-serif;color:#1a1915;background:radial-gradient(1100px 460px at 88% -140px,rgba(245,197,24,.13),transparent 60%),linear-gradient(180deg,#FBFAF6 0%,#F6F3EC 100%);min-height:100vh}",
    ".bp{max-width:1280px;margin:0 auto;padding:26px 30px 90px}",
    ".bp-i{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}",
    ".bp-hero{position:relative;border-radius:24px;overflow:hidden;color:#fff;padding:28px 34px;isolation:isolate;background:linear-gradient(118deg,#0D0E1A 0%,#17182a 55%,#252038 100%);box-shadow:0 36px 70px -34px rgba(13,14,26,.75)}",
    ".bp-hero::before{content:'';position:absolute;inset:-40%;z-index:-1;background:radial-gradient(closest-side at 15% 25%,rgba(255,200,0,.30),transparent 70%),radial-gradient(closest-side at 90% 110%,rgba(200,150,62,.28),transparent 70%);filter:blur(28px)}",
    ".bp-hero-row{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;flex-wrap:wrap}",
    ".bp-k{font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#FFC800}",
    ".bp-hero h1{font-size:32px;line-height:1.1;margin:10px 0 8px;font-weight:800;letter-spacing:-.015em;color:#fff}",
    ".bp-hero p{color:#cfd0e6;font-size:14px;line-height:1.6;max-width:640px;margin:0}",
    ".bp-tabs{display:flex;gap:6px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:4px}",
    ".bp-tabs button{border:0;background:transparent;color:#d8d8ea;font:600 13px Outfit,Inter,sans-serif;padding:8px 16px;border-radius:999px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}",
    ".bp-tabs button.on{background:#FFC800;color:#0D0E1A}",
    ".bp-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}",
    ".bp-stat{background:#fff;border:1px solid #ebe7dc;border-radius:16px;padding:14px 16px;box-shadow:0 16px 32px -28px rgba(20,18,10,.4);cursor:pointer;text-align:left;font:inherit;color:inherit}",
    ".bp-stat:hover{border-color:#e2c766}.bp-stat.on{border-color:#FFC800;box-shadow:0 0 0 3px rgba(255,200,0,.18)}",
    ".bp-stat b{display:block;font-size:26px;font-weight:800;line-height:1;color:#111}",
    ".bp-stat span{display:block;margin-top:6px;font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8a7a52}",
    ".bp-bar{display:flex;gap:10px;align-items:center;margin:18px 0 12px;flex-wrap:wrap}",
    ".bp-search{flex:1 1 280px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #ddd7c8;border-radius:12px;padding:0 12px;color:#6B675C}",
    ".bp-search input{flex:1;border:0;outline:0;padding:10px 0;font:14px Outfit,Inter,sans-serif;background:transparent;min-width:0;color:#1a1915}",
    ".bp-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #ddd7c8;background:#fff;color:#1a1915;border-radius:11px;padding:9px 14px;font:600 13px Outfit,Inter,sans-serif;cursor:pointer;white-space:nowrap}",
    ".bp-btn:hover{border-color:#c9b98a}.bp-btn:disabled{opacity:.5;cursor:not-allowed}",
    ".bp-btn.gold{background:#FFC800;border-color:#FFC800;color:#0D0E1A}.bp-btn.gold:hover{filter:brightness(.97)}",
    ".bp-btn.dark{background:#0D0E1A;border-color:#0D0E1A;color:#FFC800}",
    ".bp-btn.ghost{background:transparent;border-color:transparent;color:#6B675C}.bp-btn.ghost:hover{color:#1a1915}",
    ".bp-btn.danger{color:#a3341f}.bp-btn.sm{padding:6px 10px;font-size:12px;border-radius:9px}",
    ".bp-group{margin-top:18px}.bp-group h3{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#9a8a5c;margin:0 0 8px;font-weight:800}",
    ".bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}",
    ".bp-card{background:#fff;border:1px solid #ece8de;border-radius:14px;padding:14px 16px;cursor:pointer;text-align:left;font:inherit;color:inherit;display:flex;flex-direction:column;gap:6px;transition:border-color .15s,transform .15s,box-shadow .15s}",
    ".bp-card:hover{border-color:#e2c766;transform:translateY(-1px);box-shadow:0 14px 28px -22px rgba(20,18,10,.5)}",
    ".bp-card .nm{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px}",
    ".bp-card .sub{font-size:12.5px;color:#6B675C}",
    ".bp-card .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:2px}",
    ".bp-card.ghostcard{border-style:dashed;background:transparent}",
    ".bp-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#f3efe4;color:#6B675C;white-space:nowrap}",
    ".bp-pill.pub{background:#e7f6ec;color:#1f7a3f}.bp-pill.draft{background:#fff3cc;color:#8a6200}.bp-pill.imp{background:#eef0f7;color:#4a5170}",
    ".bp-pill.warn{background:#fdecea;color:#a3341f}.bp-pill.sl{background:#0D0E1A;color:#FFC800}",
    ".bp-empty{background:#fff;border:1px dashed #d8d0bb;border-radius:16px;padding:28px;text-align:center;color:#6B675C}",
    ".bp-note{background:#fff8dc;border:1px solid #f0dc8f;border-radius:12px;padding:12px 14px;font-size:13px;color:#5a4a12;display:flex;gap:10px;align-items:flex-start;margin:12px 0}",
    ".bp-note.red{background:#fdecea;border-color:#f3c3bb;color:#7a2617}",
    /* editor */
    ".bp-ed{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,560px);gap:22px;align-items:start;margin-top:16px}",
    ".bp-edtop{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px}",
    ".bp-edtop h2{margin:0;font-size:22px;font-weight:800;letter-spacing:-.01em}",
    ".bp-sec{background:#fff;border:1px solid #ece8de;border-radius:16px;padding:16px 18px;margin-bottom:12px}",
    ".bp-sec h4{margin:0 0 12px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#9a8a5c;font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".bp-f{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}",
    ".bp-f .full{grid-column:1/-1}",
    ".bp-f label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#6B675C}",
    ".bp-f input,.bp-f select,.bp-f textarea,.bp-li input,.bp-add input,.bp-rt input{font:14px Outfit,Inter,sans-serif;color:#1a1915;padding:9px 11px;border:1px solid #ddd7c8;border-radius:10px;background:#fff;outline:0;min-width:0}",
    ".bp-f input:focus,.bp-f select:focus,.bp-f textarea:focus,.bp-li input:focus,.bp-add input:focus,.bp-rt input:focus{border-color:#FFC800;box-shadow:0 0 0 3px rgba(255,200,0,.18)}",
    ".bp-f textarea{min-height:70px;resize:vertical}",
    ".bp-chk{flex-direction:row!important;align-items:center;gap:8px!important;font-size:13px!important;color:#1a1915!important}",
    ".bp-targets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}",
    ".bp-targets div{background:#fbf9f3;border:1px solid #efe9d8;border-radius:12px;padding:10px 12px}",
    ".bp-targets b{display:block;font-size:17px;font-weight:800}.bp-targets span{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a52;font-weight:700}",
    ".bp-li{display:flex;flex-direction:column;gap:6px}",
    ".bp-li .it{display:flex;gap:6px;align-items:center}.bp-li .it input{flex:1}",
    ".bp-li .n{width:22px;height:22px;border-radius:50%;background:#0D0E1A;color:#FFC800;font-size:11px;font-weight:800;display:grid;place-items:center;flex:none}",
    ".bp-x{border:0;background:transparent;color:#9a9484;cursor:pointer;padding:5px;border-radius:7px;display:inline-flex}.bp-x:hover{background:#f3efe4;color:#1a1915}",
    ".bp-add{display:flex;gap:6px;margin-top:8px}.bp-add input{flex:1}",
    ".bp-chips{display:flex;flex-wrap:wrap;gap:6px}",
    ".bp-chip{border:1px solid #ddd7c8;background:#fff;border-radius:999px;padding:6px 11px;font:500 12.5px Outfit,Inter,sans-serif;cursor:pointer;color:#1a1915;display:inline-flex;gap:6px;align-items:center}",
    ".bp-chip:hover{border-color:#c9b98a}.bp-chip.on{background:#0D0E1A;border-color:#0D0E1A;color:#FFC800}",
    ".bp-chip.sug{border-style:dashed;color:#6B675C}",
    ".bp-sel{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}",
    ".bp-sel .grp{border:1px solid #efe9d8;border-radius:12px;padding:10px;background:#fbf9f3}",
    ".bp-sel .grp.on{border-color:#FFC800;background:#fffaf0}",
    ".bp-sel .grp .gh{display:flex;gap:6px;align-items:center;margin-bottom:6px}",
    ".bp-sel .grp .gh input{flex:1;font:600 12.5px Outfit,Inter,sans-serif;padding:6px 9px;border:1px solid #e3dccb;border-radius:8px;background:#fff}",
    ".bp-sub{font-size:12px;color:#8a8576;margin:10px 0 6px;font-weight:600}",
    ".bp-flag{display:flex;gap:10px;align-items:flex-start;background:#fdecea;border:1px solid #f3c3bb;color:#7a2617;border-radius:12px;padding:10px 12px;font-size:13px;margin-bottom:8px}",
    ".bp-flag .bp-btn{margin-left:auto}",
    ".bp-actions{position:sticky;bottom:0;z-index:5;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:12px 14px;margin-top:6px;background:rgba(251,250,246,.94);backdrop-filter:blur(8px);border:1px solid #ece8de;border-radius:14px}",
    ".bp-actions .msg{font-size:12.5px;color:#6B675C;margin-right:auto}",
    ".bp-prevwrap{position:sticky;top:16px}",
    ".bp-prevlab{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#9a8a5c;font-weight:800;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}",
    /* one-pager (shared with print / Word export) */
    ".op{background:#fff;border-radius:6px;box-shadow:0 30px 60px -30px rgba(20,18,10,.55),0 0 0 1px #ece8de;overflow:hidden;font-family:Outfit,Inter,Arial,sans-serif;color:#1a1915}",
    ".op-head{background:linear-gradient(118deg,#0D0E1A 0%,#1b1b30 100%);color:#fff;padding:20px 24px 18px;position:relative}",
    ".op-head::after{content:'';position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,#FFC800,#DEBA6F)}",
    ".op-top{display:flex;justify-content:space-between;align-items:center;gap:12px}",
    ".op-logo{height:30px;width:auto;max-width:150px}",
    ".op-tag{font-size:9.5px;letter-spacing:.24em;text-transform:uppercase;color:#FFC800;font-weight:700}",
    ".op-name{font-size:24px;font-weight:800;letter-spacing:-.01em;margin:14px 0 2px;line-height:1.1}",
    ".op-title{font-size:13px;color:#d6d6e8}",
    ".op-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
    ".op-meta span{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.1);color:#f1f1f8}",
    ".op-meta span.g{background:#FFC800;color:#0D0E1A}",
    ".op-body{padding:16px 22px 18px}",
    ".op-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}",
    ".op-nums div{border:1px solid #efe9d8;border-radius:10px;padding:8px 10px;background:#fbf9f3}",
    ".op-nums b{display:block;font-size:16px;font-weight:800}.op-nums span{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a52;font-weight:700}",
    ".op-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px}",
    ".op-h{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#B8912E;font-weight:800;margin:0 0 6px;padding-bottom:4px;border-bottom:1.5px solid #f1e6c4}",
    ".op ul,.op ol{margin:0;padding-left:17px;font-size:12px;line-height:1.5}",
    ".op li{margin:1px 0}",
    ".op-g{font-size:11px;font-weight:700;margin:6px 0 2px;color:#4a4636}",
    ".op-empty{font-size:11.5px;color:#a19b88;font-style:italic}",
    ".op-foot{display:flex;justify-content:space-between;gap:8px;padding:9px 22px;border-top:1px solid #f1ede3;font-size:9.5px;color:#9a9484;letter-spacing:.06em}",
    /* rules */
    ".bp-rt{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid #ece8de;border-radius:14px;overflow:hidden;font-size:13px}",
    ".bp-rt th{text-align:left;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#9a9484;font-weight:700;padding:10px 12px;background:#fbf9f3;border-bottom:1px solid #ece8de}",
    ".bp-rt td{padding:7px 12px;border-bottom:1px solid #f1ede3;vertical-align:middle}",
    ".bp-rt tr:last-child td{border-bottom:0}",
    ".bp-rt input{width:110px;padding:7px 9px;font-size:13px;box-sizing:border-box}",
    ".bp-sec:has(.bp-rt){overflow-x:auto}",
    ".bp-rt input.w{width:100%}",
    ".bp-seg{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}",
    "@media(max-width:1100px){.bp-ed{grid-template-columns:1fr}.bp-prevwrap{position:static}}",
    "@media(max-width:720px){.bp{padding:16px 14px 80px}.bp-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.bp-f{grid-template-columns:1fr}.bp-hero{padding:22px 20px}.bp-hero h1{font-size:26px}.op-cols{grid-template-columns:1fr}.bp-btn{white-space:normal}.bp-sec h4,.bp-flag,.bp-prevlab,.bp-edtop{flex-wrap:wrap}.bp-targets,.op-nums{grid-template-columns:1fr 1fr}.bp-rt{min-width:640px}}"
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
  function onePager(d, abs, png) {
    var L = line(d.serviceLine) || {};
    var hc = d.hc !== "" && d.hc != null ? d.hc : (L.hc != null ? L.hc : "");
    var groups = (d.titleGroups || []).filter(function (g) { return g.titles && g.titles.length; });
    function list(arr, ordered) {
      arr = (arr || []).filter(function (x) { return String(x || "").trim(); });
      if (!arr.length) return '<div class="op-empty">Not set yet</div>';
      return "<" + (ordered ? "ol" : "ul") + ">" + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</" + (ordered ? "ol" : "ul") + ">";
    }
    var roles = !groups.length ? '<div class="op-empty">Not set yet</div>' : groups.map(function (g) { return (g.group ? '<div class="op-g">' + esc(g.group) + "</div>" : "") + list(g.titles); }).join("");
    var meta = [];
    if (d.serviceLine) meta.push('<span class="g">' + esc(d.serviceLine) + "</span>");
    if (d.secondaryServiceLine) meta.push("<span>+ " + esc(d.secondaryServiceLine) + "</span>");
    if (d.territory || d.region) meta.push("<span>" + esc(d.territory || d.region) + "</span>");
    if (d.dhFocused) meta.push("<span>Direct hire focused</span>");
    return '<div class="op">' +
      '<div class="op-head"><div class="op-top"><img class="op-logo" alt="' + esc(d.company || "Spark Companies") + '" src="' + logoUrl(d.company, abs, png) + '"><div class="op-tag">One Page Blueprint</div></div>' +
        '<div class="op-name">' + esc(d.name || "Team member") + "</div>" +
        '<div class="op-title">' + esc([d.title, d.role && String(d.title || "").indexOf(d.role) < 0 ? d.role : ""].filter(Boolean).join(" · ") || "Title") + "</div>" +
        (meta.length ? '<div class="op-meta">' + meta.join("") + "</div>" : "") + "</div>" +
      '<div class="op-body">' +
        '<div class="op-nums"><div><b>' + esc(hc === "" ? "—" : hc) + "</b><span>Headcount expectation</span></div>" +
          "<div><b>" + money(L.direct) + "</b><span>Direct hire target</span></div>" +
          "<div><b>" + (L.charge != null ? money(L.charge) : "Case by case") + "</b><span>Weekly charge target</span></div></div>" +
        '<div class="op-cols">' +
          '<div><div class="op-h">KPI expectations</div>' + list(d.kpis) + "</div>" +
          '<div><div class="op-h">' + esc(d.rolesHeading || "Focused Roles") + "</div>" + roles + "</div>" +
          '<div><div class="op-h">Target customer contacts</div>' + list(d.contacts, true) + "</div>" +
          '<div><div class="op-h">S4 process</div>' + list(d.s4, true) + "</div>" +
        "</div>" +
        (d.notes ? '<div style="margin-top:12px"><div class="op-h">Notes</div><div style="font-size:12px;line-height:1.5;white-space:pre-wrap">' + esc(d.notes) + "</div></div>" : "") +
      "</div>" +
      '<div class="op-foot"><span>' + esc(d.company || "Spark Companies") + (d.reportsTo ? " · Reports to " + esc(d.reportsTo) : "") + "</span><span>Updated " + esc(fmtDate(new Date().toISOString())) + "</span></div>" +
    "</div>";
  }
  function exportDoc(kind) {
    var d = S.cur; if (!d) return;
    var css = CSS.split("\n").filter(function (r) { return r.indexOf(".op") === 0; }).join("\n");
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(d.name) + ' - One Page Blueprint</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">' +
      "<style>@page{size:letter;margin:.4in}body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}" + css + ".op{box-shadow:none;border-radius:0;max-width:7.7in;margin:0 auto}</style></head><body>" + onePager(d, true, kind === "word") + "</body></html>";
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
    w.onload = function () { setTimeout(function () { w.focus(); w.print(); }, 250); };
  }

  /* ---------- render ---------- */
  var root = null;
  function render() {
    if (!root) return;
    if (!S.loaded && !S.err) { root.innerHTML = '<div class="bp"><div class="bp-empty">Loading blueprints…</div></div>'; return; }
    var h = '<div class="bp">' + hero();
    if (S.missing) h += '<div class="bp-note red">' + ic("alert") + "<div><b>One-time setup needed.</b> Run <code>worker/blueprints.sql</code> in Supabase (SQL editor). It creates the two tables, loads Fletcher's rules and the 35 existing blueprints, and gives Fletcher access.</div></div>";
    else if (S.err) h += '<div class="bp-note red">' + ic("alert") + "<div>" + esc(S.err) + "</div></div>";
    if (!S.missing && S.rules) {
      if (S.view === "edit" && S.cur) h += editor();
      else if (S.view === "rules") h += rulesView();
      else h += listView();
    }
    h += "</div>";
    var ae = document.activeElement, keep = ae && root.contains(ae) && ae.getAttribute("data-k") ? { k: ae.getAttribute("data-k"), s: ae.selectionStart, e: ae.selectionEnd } : null;
    root.innerHTML = h;
    if (keep) { var el = root.querySelector('[data-k="' + keep.k + '"]'); if (el) { el.focus(); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) {} } }
  }
  function hero() {
    return '<div class="bp-hero"><div class="bp-hero-row"><div><div class="bp-k">Leader Toolkit</div><h1>Blueprint Builder</h1>' +
      "<p>One Page Blueprints for every producer, built from the same rules: role and service line set the KPIs, direct hire target, weekly charge and headcount. Pick the focused titles, preview it, publish it.</p></div>" +
      '<div class="bp-tabs"><button data-act="view" data-v="list" class="' + (S.view !== "rules" ? "on" : "") + '">' + ic("users") + "Blueprints</button>" +
      '<button data-act="view" data-v="rules" class="' + (S.view === "rules" ? "on" : "") + '">' + ic("sliders") + "Rules</button></div></div></div>";
  }
  function counts() {
    var c = { all: S.list.length, published: 0, attention: 0, missing: 0 };
    S.list.forEach(function (b) { if (b.status === "published") c.published++; if (needsAttention(b)) c.attention++; });
    var have = {}; S.list.forEach(function (b) { have[String(b.name).toLowerCase()] = 1; });
    c.missingList = ((S.rules && S.rules.roster) || []).filter(function (r) { return !have[r.name.toLowerCase()]; });
    c.missing = c.missingList.length;
    return c;
  }
  function listView() {
    var c = counts();
    var h = '<div class="bp-stats">' +
      stat("all", c.all, "Blueprints") + stat("published", c.published, "Published") + stat("attention", c.attention, "Need attention") + stat("missing", c.missing, "On roster, no blueprint") + "</div>";
    h += '<div class="bp-bar"><div class="bp-search">' + ic("search") + '<input data-k="q" data-act="q" placeholder="Search name, title, service line, territory" value="' + esc(S.q) + '"></div>' +
      '<button class="bp-btn gold" data-act="new">' + ic("plus") + "New blueprint</button></div>";
    var q = S.q.trim().toLowerCase();
    if (S.filter === "missing") {
      var m = c.missingList.filter(function (r) { return !q || (r.name + " " + r.title + " " + r.serviceLine).toLowerCase().indexOf(q) >= 0; });
      if (!m.length) return h + '<div class="bp-empty">Everyone on the roster has a blueprint.</div>';
      return h + '<div class="bp-grid">' + m.map(function (r) {
        return '<button class="bp-card ghostcard" data-act="newfor" data-name="' + esc(r.name) + '"><div class="nm">' + esc(r.name) + '</div><div class="sub">' + esc(r.title) + '</div><div class="row"><span class="bp-pill sl">' + esc(r.serviceLine) + '</span><span class="bp-pill">' + ic("plus") + "Start blueprint</span></div></button>";
      }).join("") + "</div>";
    }
    var items = S.list.filter(function (b) {
      if (S.filter === "published" && b.status !== "published") return false;
      if (S.filter === "attention" && !needsAttention(b)) return false;
      if (!q) return true;
      var d = b.data || {};
      return [b.name, d.title, d.serviceLine, d.secondaryServiceLine, d.territory, d.region, d.reportsTo].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    if (!items.length) return h + '<div class="bp-empty">No blueprints match.</div>';
    var by = {};
    items.forEach(function (b) { var k = (b.data && b.data.serviceLine) || "No service line yet"; (by[k] = by[k] || []).push(b); });
    var order = ((S.rules && S.rules.serviceLines) || []).map(function (l) { return l.name; }).concat(["No service line yet"]);
    order.forEach(function (k) {
      if (!by[k]) return;
      h += '<div class="bp-group"><h3>' + esc(k) + " · " + by[k].length + '</h3><div class="bp-grid">' + by[k].map(card).join("") + "</div></div>";
    });
    return h;
  }
  function stat(key, n, label) { return '<button class="bp-stat ' + (S.filter === key ? "on" : "") + '" data-act="filter" data-f="' + key + '"><b>' + n + "</b><span>" + esc(label) + "</span></button>"; }
  function card(b) {
    var d = b.data || {};
    var st = b.status === "published" ? '<span class="bp-pill pub">Published</span>' : b.status === "imported" ? '<span class="bp-pill imp">Imported</span>' : '<span class="bp-pill draft">Draft</span>';
    var warn = needsAttention(b) ? '<span class="bp-pill warn">' + ic("alert") + (d.flags && d.flags.length ? "Review" : "Incomplete") + "</span>" : "";
    return '<button class="bp-card" data-act="open" data-id="' + esc(b.id) + '"><div class="nm">' + esc(b.name) + '</div><div class="sub">' + esc(d.title || d.role || "") + (d.territory ? " · " + esc(d.territory) : "") + '</div><div class="row">' + st + warn +
      '<span class="bp-pill">' + allTitles(d).length + " titles</span>" + (d.hc ? '<span class="bp-pill">HC ' + esc(d.hc) + "</span>" : "") + "</div></button>";
  }

  /* ---------- editor ---------- */
  function opts(arr, sel, blankLabel) { return (blankLabel != null ? '<option value="">' + esc(blankLabel) + "</option>" : "") + arr.map(function (v) { return '<option' + (v === sel ? " selected" : "") + ">" + esc(v) + "</option>"; }).join(""); }
  function editor() {
    var d = S.cur, R = S.rules, L = line(d.serviceLine) || {};
    var lines = R.serviceLines.map(function (l) { return l.name; });
    var regions = R.regions.slice(); if (d.region && regions.indexOf(d.region) < 0) regions.push(d.region);
    var companies = R.companies.slice(); if (d.company && companies.indexOf(d.company) < 0) companies.push(d.company);
    var roles = R.roles.slice(); if (d.role && roles.indexOf(d.role) < 0) roles.push(d.role);
    var std = standardKpis(d.role, d.serviceLine);
    var h = '<div class="bp-edtop"><button class="bp-btn ghost" data-act="back">' + ic("back") + "All blueprints</button>" +
      '<span class="bp-pill ' + (S.curStatus === "published" ? "pub" : S.curStatus === "imported" ? "imp" : "draft") + '">' + (S.curStatus === "published" ? "Published" : S.curStatus === "imported" ? "Imported from Word" : "Draft") + "</span></div>";
    h += '<div class="bp-ed"><div>';
    (d.flags || []).forEach(function (f, i) { h += '<div class="bp-flag">' + ic("alert") + "<div>" + esc(f) + '</div><button class="bp-btn sm" data-act="unflag" data-i="' + i + '">' + ic("check") + "Resolved</button></div>"; });
    // team member
    h += '<div class="bp-sec"><h4>Team member</h4><div class="bp-f">' +
      '<label class="full">Name<input data-k="name" data-f="name" list="bpRoster" value="' + esc(d.name) + '" placeholder="Start typing a name from the roster"></label>' +
      '<datalist id="bpRoster">' + (R.roster || []).map(function (r) { return '<option value="' + esc(r.name) + '">' + esc(r.title) + "</option>"; }).join("") + "</datalist>" +
      '<label>Company<select data-f="company">' + opts(companies, d.company) + "</select></label>" +
      '<label>Title<input data-k="title" data-f="title" value="' + esc(d.title) + '"></label>' +
      '<label>Role<select data-f="role">' + opts(roles, d.role) + "</select></label>" +
      '<label>Reports to<input data-k="reportsTo" data-f="reportsTo" value="' + esc(d.reportsTo) + '"></label>' +
      '<label>Region<select data-f="region">' + opts(regions, d.region, "Select region") + "</select></label>" +
      '<label>Territory<input data-k="territory" data-f="territory" value="' + esc(d.territory) + '" placeholder="e.g. Automation (Metro Detroit)"></label>' +
      "</div></div>";
    // service line
    h += '<div class="bp-sec"><h4>Service line and targets</h4><div class="bp-f">' +
      '<label>Primary service line<select data-f="serviceLine">' + opts(lines, d.serviceLine, "Select service line") + "</select></label>" +
      '<label>Secondary (optional)<select data-f="secondaryServiceLine">' + opts(lines, d.secondaryServiceLine, "None") + "</select></label>" +
      '<label>Headcount expectation<input data-k="hc" data-f="hc" inputmode="numeric" value="' + esc(d.hc) + '" placeholder="' + esc(L.hc != null ? "Standard: " + L.hc : "") + '"></label>' +
      '<label class="bp-chk" style="align-self:end;padding-bottom:9px"><input type="checkbox" data-f="dhFocused"' + (d.dhFocused ? " checked" : "") + "> Direct hire focused</label>" +
      "</div>" +
      (d.serviceLine ? '<div class="bp-targets"><div><b>' + money(L.direct) + "</b><span>Direct hire target</span></div><div><b>" + (L.charge != null ? money(L.charge) : "Case by case") + "</b><span>Weekly charge target</span></div><div><b>" + (L.hc != null ? L.hc : "—") + "</b><span>Standard headcount</span></div></div>" +
        (L.note ? '<div class="bp-note" style="margin-bottom:0">' + ic("alert") + "<div>" + esc(L.note) + "</div></div>" : "") : "") +
      "</div>";
    // KPIs
    h += '<div class="bp-sec"><h4>KPI expectations' + (std.length ? '<button class="bp-btn sm" data-act="stdkpi">' + ic("reset") + "Use standard for " + esc(roleShort(d.role)) + " · " + esc(d.serviceLine) + "</button>" : "") + "</h4>" + listEditor("kpis", d.kpis, "Add a KPI");
    if (std.length && JSON.stringify(std) !== JSON.stringify(d.kpis)) h += '<div class="bp-sub">Standard for this role and service line</div><div class="bp-chips">' + std.map(function (k) { return '<span class="bp-chip sug">' + esc(k) + "</span>"; }).join("") + "</div>";
    h += "</div>";
    // titles
    var sel = allTitles(d), lib = [];
    [d.serviceLine, d.secondaryServiceLine].forEach(function (s) { if (s && R.titles[s]) R.titles[s].forEach(function (t) { if (lib.indexOf(t) < 0) lib.push(t); }); });
    h += '<div class="bp-sec"><h4>Focused titles <span class="bp-pill' + (sel.length > MAX_TITLES ? " warn" : "") + '">' + sel.length + " of " + MAX_TITLES + "</span></h4>" +
      '<div class="bp-f" style="margin-bottom:10px"><label class="full">Section heading on the one-pager<input data-k="rolesHeading" data-f="rolesHeading" value="' + esc(d.rolesHeading || "") + '" placeholder="Focused Roles"></label></div>' +
      '<div class="bp-sel">' + (d.titleGroups || []).map(function (g, gi) {
        return '<div class="grp' + (gi === S.activeGroup ? " on" : "") + '" data-act="grp" data-g="' + gi + '"><div class="gh"><input data-k="g' + gi + '" data-act="gname" data-g="' + gi + '" value="' + esc(g.group) + '" placeholder="' + ((d.titleGroups.length > 1) ? "Group name" : "Group name (optional)") + '">' +
          (d.titleGroups.length > 1 ? '<button class="bp-x" title="Remove group" data-act="rmgrp" data-g="' + gi + '">' + ic("x") + "</button>" : "") + "</div>" +
          '<div class="bp-chips">' + ((g.titles || []).length ? g.titles.map(function (t, ti) { return '<span class="bp-chip on">' + esc(t) + '<button class="bp-x" style="color:#FFC800;padding:0" data-act="rmtitle" data-g="' + gi + '" data-i="' + ti + '">' + ic("x") + "</button></span>"; }).join("") : '<span class="op-empty">Click titles below to add them here</span>') + "</div></div>";
      }).join("") + '<button class="bp-btn sm ghost" style="align-self:flex-start" data-act="addgrp">' + ic("plus") + "Add a group</button></div>";
    if (sel.length > MAX_TITLES) h += '<div class="bp-note">' + ic("alert") + "<div>The template is " + MAX_TITLES + " focused titles. More than that is fine for a sales seat, but the one-pager gets crowded.</div></div>";
    if (lib.length) h += '<div class="bp-sub">' + esc([d.serviceLine, d.secondaryServiceLine].filter(Boolean).join(" + ")) + " title library</div><div class=\"bp-chips\">" + lib.map(function (t) { return '<button class="bp-chip' + (sel.indexOf(t) >= 0 ? " on" : "") + '" data-act="title" data-t="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>";
    else h += '<div class="op-empty">Pick a service line to see its titles.</div>';
    h += '<div class="bp-add"><input data-k="customTitle" id="bpCustomTitle" placeholder="Title not in the library? Type it and press Enter"><button class="bp-btn sm" data-act="customtitle">' + ic("plus") + "Add</button></div></div>";
    // contacts
    var sug = []; S.list.forEach(function (b) { var x = b.data || {}; if (x.serviceLine === d.serviceLine) (x.contacts || []).forEach(function (c) { if (sug.indexOf(c) < 0 && (d.contacts || []).indexOf(c) < 0) sug.push(c); }); });
    h += '<div class="bp-sec"><h4>Target customer contacts</h4>' + listEditor("contacts", d.contacts, "Add a contact title", true);
    if (sug.length) h += '<div class="bp-sub">Used on other ' + esc(d.serviceLine) + ' blueprints</div><div class="bp-chips">' + sug.slice(0, 14).map(function (c) { return '<button class="bp-chip sug" data-act="addsug" data-t="' + esc(c) + '">' + ic("plus") + esc(c) + "</button>"; }).join("") + "</div>";
    h += "</div>";
    // s4
    h += '<div class="bp-sec"><h4>S4 process<button class="bp-btn sm" data-act="stds4">' + ic("reset") + "Reset to standard</button></h4>" + listEditor("s4", d.s4, "Add a step", true) + "</div>";
    h += '<div class="bp-sec"><h4>Notes</h4><div class="bp-f"><label class="full"><textarea data-k="notes" data-f="notes" placeholder="Anything else for this seat (optional)">' + esc(d.notes || "") + "</textarea></label></div></div>";
    // actions
    h += '<div class="bp-actions"><span class="msg">' + esc(S.msg || (S.dirty ? "Unsaved changes" : "All changes saved")) + "</span>" +
      (S.curId ? '<button class="bp-btn sm danger" data-act="del">' + ic("trash") + "Delete</button>" + '<button class="bp-btn sm" data-act="dup">' + ic("copy") + "Duplicate</button>" : "") +
      '<button class="bp-btn" data-act="save" ' + (S.saving ? "disabled" : "") + ">Save draft</button>" +
      '<button class="bp-btn gold" data-act="publish" ' + (S.saving ? "disabled" : "") + ">" + ic("check") + (S.curStatus === "published" ? "Save and keep published" : "Publish") + "</button></div>";
    h += "</div>";
    // preview
    h += '<div class="bp-prevwrap"><div class="bp-prevlab"><span>Live preview</span><span style="display:flex;gap:6px"><button class="bp-btn sm" data-act="print">' + ic("print") + 'Print / PDF</button><button class="bp-btn sm" data-act="word">' + ic("word") + "Word</button></span></div>" + onePager(d) + "</div>";
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
    }).join("") + '</div><div class="bp-add"><input data-k="add-' + key + '" data-add="' + key + '" placeholder="' + esc(ph) + ' and press Enter"><button class="bp-btn sm" data-act="liadd" data-l="' + key + '">' + ic("plus") + "Add</button></div>";
  }

  /* ---------- rules view ---------- */
  function rulesView() {
    var R = S.rulesDraft || (S.rulesDraft = clone(S.rules));
    if (!S.rulesLine) S.rulesLine = R.serviceLines[0].name;
    if (!S.rulesRole) S.rulesRole = R.roles[0];
    var h = '<div class="bp-note" style="margin-top:16px">' + ic("sliders") + "<div>These rules drive every blueprint: targets and headcount per service line, standard KPIs per role, and each service line's title library. Changing a rule doesn't rewrite saved blueprints; it changes what the builder fills in next time. Seeded from " + esc(R.source || "Fletcher's workbooks") + "." + (S.rulesAt ? " Last saved " + esc(fmtDate(S.rulesAt)) + " by " + esc(S.rulesBy) + "." : "") + "</div></div>";
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
    h += '<div class="bp-sec"><h4>Title library <span class="bp-pill">' + T.length + " titles</span></h4><div class=\"bp-seg\">" + R.serviceLines.map(function (l) { return '<button class="bp-chip' + (l.name === S.rulesLine ? " on" : "") + '" data-act="rlinesel" data-s="' + esc(l.name) + '">' + esc(l.name) + " · " + (R.titles[l.name] || []).length + "</button>"; }).join("") + "</div>" +
      '<div class="bp-chips">' + (T.length ? T.map(function (t, i) { return '<span class="bp-chip">' + esc(t) + '<button class="bp-x" style="padding:0" data-act="rtrm" data-i="' + i + '">' + ic("x") + "</button></span>"; }).join("") : '<span class="op-empty">No titles yet.</span>') + "</div>" +
      '<div class="bp-add"><input data-k="rtadd" id="bpRtAdd" placeholder="Add a title to ' + esc(S.rulesLine) + ' and press Enter"><button class="bp-btn sm" data-act="rtadd">' + ic("plus") + "Add</button></div></div>";
    h += '<div class="bp-sec"><h4>Standard S4 process</h4>' + rulesS4(R) + "</div>";
    var changed = JSON.stringify(R) !== JSON.stringify(S.rules);
    h += '<div class="bp-actions"><span class="msg">' + esc(S.msg || (changed ? "Unsaved rule changes" : "Rules match what's saved")) + "</span>" +
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
    S.cur.name = S.cur.name || b.name; S.activeGroup = 0; S.dirty = false; S.msg = ""; S.view = "edit"; render(); scrollTop();
  }
  function startNew(name) {
    S.cur = blank(); S.curId = null; S.curStatus = "draft"; S.activeGroup = 0; S.msg = ""; S.view = "edit";
    if (name) { S.cur.name = name; applyRoster(name, true); }
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
      case "newfor": startNew(t.getAttribute("data-name")); break;
      case "open": var b = S.list.filter(function (x) { return x.id === t.getAttribute("data-id"); })[0]; if (b) openBlueprint(b); break;
      case "back": if (!confirmLeave()) return; S.view = "list"; S.cur = null; S.dirty = false; render(); scrollTop(); break;
      case "unflag": d.flags.splice(+t.getAttribute("data-i"), 1); touch(); break;
      case "stdkpi": d.kpis = standardKpis(d.role, d.serviceLine); touch(); break;
      case "stds4": d.s4 = clone(S.rules.s4); touch(); break;
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
    if (f && S.cur && t.type !== "checkbox" && t.tagName !== "SELECT") {
      S.cur[f] = t.value; S.dirty = true;
      if (f === "name" && rosterFor(t.value) && !S.curId) { applyRoster(t.value, !S.cur.kpis.length); render(); return; }
      renderSoft(); return;
    }
    if (act === "li") { S.cur[t.getAttribute("data-l")][+t.getAttribute("data-i")] = t.value; S.dirty = true; renderSoft(); return; }
    if (act === "gname") { S.cur.titleGroups[+t.getAttribute("data-g")].group = t.value; S.dirty = true; renderSoft(); return; }
    if (act === "rline") { var l = S.rulesDraft.serviceLines[+t.getAttribute("data-i")], p = t.getAttribute("data-p"); l[p] = p === "note" ? t.value : num(t.value); renderSoft(true); return; }
    if (act === "rkpi") { var R = S.rulesDraft, role = S.rulesRole, s = t.getAttribute("data-s"), pp = t.getAttribute("data-p"); R.kpi[role] = R.kpi[role] || {}; R.kpi[role][s] = R.kpi[role][s] || {}; R.kpi[role][s][pp] = pp === "reference" ? t.value : (num(t.value) == null ? "" : num(t.value)); renderSoft(true); return; }
    if (act === "rs4") { S.rulesDraft.s4[+t.getAttribute("data-i")] = t.value; renderSoft(true); return; }
  }
  /* Typing shouldn't rebuild the form (it would drop focus on mobile keyboards); only refresh the preview + status. */
  var softT = null;
  function renderSoft(rules) {
    clearTimeout(softT);
    softT = setTimeout(function () {
      if (rules) { var m = root.querySelector(".bp-actions .msg"), btn = root.querySelector('[data-act="rsave"]'); var ch = JSON.stringify(S.rulesDraft) !== JSON.stringify(S.rules); if (m) m.textContent = ch ? "Unsaved rule changes" : "Rules match what's saved"; if (btn) btn.disabled = !ch; return; }
      var pv = root.querySelector(".bp-prevwrap .op"); if (pv) pv.outerHTML = onePager(S.cur);
      var ms = root.querySelector(".bp-actions .msg"); if (ms) ms.textContent = "Unsaved changes";
    }, 120);
  }
  function onChange(e) {
    var t = e.target, f = t.getAttribute("data-f");
    /* Text inputs update state on every keystroke (onInput); re-rendering on blur would swallow the click that caused it. */
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
        window.addEventListener("hashchange", fromHash);
        window.hqBlueprints = { open: openTab, reload: function () { return load().then(render); } };
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); }); else boot();
})();
