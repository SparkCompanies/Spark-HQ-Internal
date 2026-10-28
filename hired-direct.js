/* HIRED_DIRECT_v2.1 — "HD Conversion Hub", a sub-item under Salesforce in the sidebar
   Loaded into the HQ shell by spark-home.html (same path as benefits.js, my-links.js, viewas.js;
   index.html is too large to edit on github.com). Nothing in index.html changes.

   What it is
     When a contract placement is termed with the reason "Client Hired Direct" in Salesforce, the worker emails the
     recruiter (HIRED_DIRECT_v1 in worker/cloudworker.js) and records the placement in spark_hq_hired_direct.
     This tab is where the recruiter works that list: call and congratulate, ask for referrals, send a card, and
     check each one off. Admins can switch to Everyone and filter by recruiter.

   Data: GET /hired-direct (mine; admins ?all=1), POST /hired-direct { placementId, called?, card?, notes? }.
   Deep link: #hired-direct (the link in the recruiter email) opens this tab. */
(function () {
  "use strict";
  if (window.__hqHiredDirect) return;
  window.__hqHiredDirect = true;

  var WORKER = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var TAB = "hired-direct";
  var SF = "https://spark-companies.lightning.force.com/lightning/r/bpats__Placement__c/";

  var S = { items: [], admin: false, all: false, triedAll: false, status: "open", who: "", q: "", loading: false, loadedAt: 0, err: "" };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function token() { return window.SPARK_SB && window.SPARK_SB.getToken ? window.SPARK_SB.getToken() : Promise.resolve(null); }
  function api(method, body) {
    return token().then(function (t) {
      if (!t) throw new Error("Sign in first.");
      var init = { method: method, headers: { Authorization: "Bearer " + t } };
      if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
      return fetch(WORKER + "/hired-direct" + (method === "GET" && S.all ? "?all=1" : ""), init);
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ("Request failed (" + r.status + ")")); return d; }); });
  }
  function fmtDate(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  function addrLines(a) { a = a || {}; var l1 = String(a.street || "").replace(/\s*\n\s*/g, ", ").trim(); var l2 = [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : ""); return [l1, l2.trim()].filter(Boolean); }
  function isDone(i) { return !!(i.called_at && i.card_sent_at); }
  function who(i) { return i.recruiter_name || i.recruiter_email || "Unassigned"; }
  var I = {
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
    mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
    check: "M5 12.5l4.5 4.5L19 7",
    pin: "M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    ext: "M14 3h7v7M10 14L21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
    note: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"
  };
  function ic(name) { return '<span class="hdx-ic"><svg viewBox="0 0 24 24"><path d="' + I[name] + '"/></svg></span>'; }

  /* ---------- CSS ---------- */
  var CSS = "" +
    ".sidebar .nav-item[data-tab=\"" + TAB + "\"].hide-for-role{display:flex!important}" +
    ".sidebar .nav-item.hdx-sub{position:relative;padding:6px 20px 6px 56px!important;font-size:12.5px!important;gap:8px!important;min-height:0!important}" +
    ".sidebar .nav-item.hdx-sub .ico{width:14px!important;opacity:.85}" +
    ".sidebar .nav-item.hdx-sub::after{content:'';position:absolute;left:35px;top:-6px;height:calc(50% + 6px);width:12px;background:none!important;border-left:1.5px solid rgba(100,116,139,.32);border-bottom:1.5px solid rgba(100,116,139,.32);border-bottom-left-radius:7px;pointer-events:none}" +
    ".nav-item[data-tab=\"" + TAB + "\"] .hdx-badge{margin-left:auto;min-width:18px;height:18px;padding:0 6px;border-radius:999px;background:#F5C518;color:#111;font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;line-height:1}" +
    "#view-" + TAB + "{font-family:Outfit,Inter,system-ui,sans-serif;color:#1a1a2e;background:" +
      "radial-gradient(1200px 500px at 85% -120px,rgba(245,197,24,.14),transparent 60%),radial-gradient(900px 420px at -10% 30%,rgba(200,150,62,.10),transparent 60%),linear-gradient(180deg,#FBFAF6 0%,#F6F3EC 100%)}" +
    ".hdx{max-width:1140px;margin:0 auto;padding:28px 32px 80px}" +
    ".hdx-ic{display:inline-flex;width:16px;height:16px;flex:none}.hdx-ic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    /* hero */
    ".hdx-hero{position:relative;border-radius:26px;overflow:hidden;color:#fff;padding:34px 40px 36px;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:center;" +
      "background:linear-gradient(118deg,#141428 0%,#1b1b36 48%,#2a2347 100%);box-shadow:0 40px 80px -36px rgba(20,20,45,.75),0 2px 0 rgba(255,255,255,.06) inset}" +
    ".hdx-hero::before{content:'';position:absolute;inset:-40%;z-index:-1;background:radial-gradient(closest-side at 18% 30%,rgba(255,212,59,.38),transparent 70%),radial-gradient(closest-side at 85% 110%,rgba(200,150,62,.32),transparent 70%);filter:blur(30px)}" +
    ".hdx-ring{position:absolute;right:-110px;top:-150px;width:400px;height:400px;border-radius:50%;border:1px solid rgba(255,212,59,.22);box-shadow:0 0 0 60px rgba(255,212,59,.04),0 0 0 120px rgba(255,212,59,.025);z-index:-1;pointer-events:none}" +
    ".hdx-k{font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#FFD43B;display:flex;align-items:center;gap:8px}" +
    ".hdx-hero h1{font-size:36px;line-height:1.08;margin:12px 0 10px;font-weight:800;letter-spacing:-.015em;color:#fff}" +
    ".hdx-hero h1 em{font-style:normal;background:linear-gradient(92deg,#FFE57A,#F5C518 60%,#DEBA6F);-webkit-background-clip:text;background-clip:text;color:transparent}" +
    ".hdx-dek{color:#cfd0e6;font-size:14.5px;line-height:1.65;max-width:640px}" +
    ".hdx-steps{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}" +
    /* #JWU sign-off: big, gold, slightly italic, with a soft glow and a sheen that sweeps across it */
    ".hdx-jwu{text-align:right;padding-right:6px;user-select:none}" +
    ".hdx-jwu .t{position:relative;display:inline-block;font:900 92px/.86 Outfit,Inter,system-ui,sans-serif;letter-spacing:-.035em;transform:skewX(-8deg);" +
      "background:linear-gradient(176deg,#FFF3B0 0%,#FFD43B 38%,#F5C518 58%,#C8963E 100%);-webkit-background-clip:text;background-clip:text;color:transparent;" +
      "filter:drop-shadow(0 10px 30px rgba(245,197,24,.35)) drop-shadow(0 2px 0 rgba(0,0,0,.35))}" +
    ".hdx-jwu .t::after{content:'#JWU';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.75) 46%,transparent 62%);background-size:260% 100%;background-position:120% 0;" +
      "-webkit-background-clip:text;background-clip:text;color:transparent;animation:hdxSheen 5.5s ease-in-out infinite}" +
    "@keyframes hdxSheen{0%,55%{background-position:120% 0}85%,100%{background-position:-60% 0}}" +
    "@media(prefers-reduced-motion:reduce){.hdx-jwu .t::after{animation:none;opacity:0}}" +
    ".hdx-jwu .s{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:12px;font-size:11px;font-weight:700;letter-spacing:.34em;text-transform:uppercase;color:#d8d6ea}" +
    ".hdx-jwu .s::before{content:'';width:34px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#F5C518)}" +
    ".hdx-step{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font-size:12.5px;color:#eceaf6}" +
    ".hdx-step b{color:#FFD43B;font-weight:800}" +
    /* stats */
    ".hdx-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0 0}" +
    ".hdx-stat{background:#fff;border:1px solid #ebe7dc;border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,18,10,.04),0 18px 36px -30px rgba(20,18,10,.35)}" +
    ".hdx-stat .v{font-size:28px;font-weight:800;letter-spacing:-.02em;color:#111;line-height:1}" +
    ".hdx-stat .l{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#8a7a52;margin-top:8px}" +
    ".hdx-stat.gold{background:linear-gradient(135deg,#FFF6CF,#FFFDF5);border-color:#F0D77A}" +
    /* toolbar */
    ".hdx-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:22px 0 12px}" +
    ".hdx-seg{display:inline-flex;background:#fff;border:1px solid #e7e3d8;border-radius:999px;padding:3px}" +
    ".hdx-seg button{font:600 12px Outfit,Inter,sans-serif;letter-spacing:.02em;padding:7px 14px;border-radius:999px;border:0;background:transparent;color:#6b6a64;cursor:pointer}" +
    ".hdx-seg button.on{background:#111;color:#F5C518}" +
    ".hdx-sel,.hdx-q{font:500 13px Outfit,Inter,sans-serif;padding:8px 12px;border:1px solid #e7e3d8;border-radius:999px;background:#fff;color:#111}" +
    ".hdx-qw{position:relative;margin-left:auto}.hdx-qw .hdx-ic{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#9a9486}.hdx-q{padding-left:32px;width:220px}" +
    /* list */
    ".hdx-list{display:grid;gap:10px}" +
    ".hdx-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;padding:16px 18px;border:1px solid #ebe7dc;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(20,18,10,.03)}" +
    ".hdx-row.done{opacity:.55}" +
    ".hdx-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px}" +
    ".hdx-name{font-weight:700;color:#111;font-size:16px}" +
    ".hdx-tag{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a7a52;background:#faf6e8;border:1px solid #efe4bf;border-radius:999px;padding:2px 8px}" +
    ".hdx-meta{font-size:13px;color:#6b6a64;margin-top:3px}" +
    ".hdx-meta b{color:#111;font-weight:600}" +
    ".hdx-contact{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:#111;margin-top:9px}" +
    ".hdx-contact a,.hdx-contact span{display:inline-flex;align-items:center;gap:6px;color:inherit;text-decoration:none}" +
    ".hdx-contact a:hover{color:#8a6a00}" +
    ".hdx-contact .hdx-ic{width:14px;height:14px;color:#B8912E}" +
    ".hdx-none{color:#9a9486;font-style:italic}" +
    ".hdx-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:10px;font-size:12px;color:#9a9486}" +
    ".hdx-sf{display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8a7a52;text-decoration:none}" +
    ".hdx-sf .hdx-ic{width:12px;height:12px}" +
    ".hdx-notebtn{display:inline-flex;align-items:center;gap:5px;font:700 11px Outfit,Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8a7a52;background:none;border:0;padding:0;cursor:pointer}" +
    ".hdx-notebtn .hdx-ic{width:12px;height:12px}" +
    ".hdx-note{width:100%;margin-top:8px;font:13px Outfit,Inter,sans-serif;padding:9px 11px;border:1px solid #e7e3d8;border-radius:10px;resize:vertical;min-height:54px;box-sizing:border-box}" +
    ".hdx-notetxt{margin-top:8px;font-size:13px;color:#33302a;background:#faf9f6;border-left:3px solid #F5C518;padding:7px 10px;border-radius:0 8px 8px 0;white-space:pre-wrap}" +
    ".hdx-acts{display:flex;flex-direction:column;gap:7px;align-items:stretch;justify-content:center;min-width:132px}" +
    ".hdx-chk{display:inline-flex;align-items:center;justify-content:center;gap:7px;font:600 12.5px Outfit,Inter,sans-serif;color:#6b6a64;cursor:pointer;padding:8px 14px;border-radius:999px;border:1px solid #e7e3d8;background:#fff;white-space:nowrap}" +
    ".hdx-chk:hover{border-color:#d9ab00;color:#111}" +
    ".hdx-chk.on{background:rgba(245,197,24,.2);border-color:#d9ab00;color:#111}" +
    ".hdx-chk.busy{opacity:.5;pointer-events:none}" +
    ".hdx-empty{text-align:center;padding:48px 20px;background:#fff;border:1px dashed #e2dccb;border-radius:16px;color:#6b6a64;font-size:14px}" +
    ".hdx-empty b{display:block;color:#111;font-size:16px;margin-bottom:4px}" +
    ".hdx-err{padding:12px 16px;border-radius:12px;background:#fdecea;color:#8a1c12;font-size:13px;margin-bottom:12px}" +
    "@media(max-width:820px){.hdx{padding:18px 16px 60px}.hdx-hero{padding:26px 22px;grid-template-columns:1fr;gap:18px}.hdx-hero h1{font-size:28px}.hdx-jwu{text-align:left}.hdx-jwu .t{font-size:60px}.hdx-jwu .s{justify-content:flex-start}.hdx-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.hdx-row{grid-template-columns:1fr}.hdx-acts{flex-direction:row}.hdx-qw{margin-left:0;width:100%}.hdx-q{width:100%}}";
  function injectCss() { if (document.getElementById("hiredDirectCss")) return; var s = document.createElement("style"); s.id = "hiredDirectCss"; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- data ---------- */
  function load(force) {
    if (S.loading) return S.loading;
    if (!force && S.loadedAt && Date.now() - S.loadedAt < 60 * 1000) return Promise.resolve();
    S.loading = api("GET").then(function (d) {
      S.items = d.items || []; S.admin = !!d.admin; S.all = !!d.all; S.err = "";
      // An admin who isn't the recruiter on anything would see an empty page; show everyone's instead.
      if (S.admin && !S.all && !S.items.length && !S.triedAll) { S.triedAll = true; S.all = true; S.loading = null; return load(true); }
      S.loadedAt = Date.now();
    }).catch(function (e) { S.err = e.message || "Could not load."; }).then(function () { S.loading = null; badge(); });
    return S.loading;
  }
  function mark(it, patch) {
    it._busy = true; render();
    return api("POST", Object.assign({ placementId: it.placement_id }, patch)).then(function (d) {
      if (d && d.item) for (var k in d.item) it[k] = d.item[k];
    }).catch(function (e) { alert(e.message || "Could not save"); }).then(function () { it._busy = false; render(); badge(); });
  }

  /* ---------- render ---------- */
  function filtered() {
    var q = S.q.trim().toLowerCase();
    return S.items.filter(function (i) {
      if (S.status === "open" && isDone(i)) return false;
      if (S.status === "done" && !isDone(i)) return false;
      if (S.who && (i.recruiter_email || "") !== S.who) return false;
      if (q && [i.candidate_name, i.client, i.job_title, who(i)].join(" ").toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      var ad = isDone(a), bd = isDone(b); if (ad !== bd) return ad ? 1 : -1;
      return String(b.sent_at || "").localeCompare(String(a.sent_at || ""));
    });
  }
  function rowHtml(it) {
    var al = addrLines(it.address), done = isDone(it);
    var contact = [];
    if (it.candidate_phone) contact.push('<a href="tel:' + esc(String(it.candidate_phone).replace(/[^0-9+]/g, "")) + '">' + ic("phone") + esc(it.candidate_phone) + "</a>");
    if (it.candidate_email) contact.push('<a href="mailto:' + esc(it.candidate_email) + '">' + ic("mail") + esc(it.candidate_email) + "</a>");
    contact.push(al.length ? "<span>" + ic("pin") + esc(al.join(", ")) + "</span>" : '<span class="hdx-none">' + ic("pin") + "No mailing address on file. Grab it on the call.</span>");
    var meta = [it.job_title ? esc(it.job_title) : "", it.client ? "at <b>" + esc(it.client) + "</b>" : ""].filter(Boolean).join(" ");
    var foot = [];
    foot.push("Hired on " + (it.terminated_date ? fmtDate(it.terminated_date + "T12:00:00") : fmtDate(it.sent_at)));
    if (S.all) foot.push("Recruiter: " + esc(who(it)));
    foot.push('<a class="hdx-sf" target="_blank" rel="noopener" href="' + SF + encodeURIComponent(it.placement_id) + '/view">Salesforce' + ic("ext") + "</a>");
    foot.push('<button class="hdx-notebtn" data-act="note" data-id="' + esc(it.placement_id) + '">' + ic("note") + (it.notes ? "Edit note" : "Add note") + "</button>");
    return '<div class="hdx-row' + (done ? " done" : "") + '" data-id="' + esc(it.placement_id) + '">' +
      "<div>" +
        '<div class="hdx-top"><span class="hdx-name">' + esc(it.candidate_name || "Candidate") + "</span>" + (it.division ? '<span class="hdx-tag">' + esc(it.division) + "</span>" : "") + "</div>" +
        (meta ? '<div class="hdx-meta">' + meta + "</div>" : "") +
        '<div class="hdx-contact">' + contact.join("") + "</div>" +
        (it.notes && !it._editing ? '<div class="hdx-notetxt">' + esc(it.notes) + "</div>" : "") +
        (it._editing ? '<textarea class="hdx-note" data-id="' + esc(it.placement_id) + '" placeholder="Who did they refer? Anything to remember?">' + esc(it.notes || "") + "</textarea>" : "") +
        '<div class="hdx-foot">' + foot.join("<span>&middot;</span>") + "</div>" +
      "</div>" +
      '<div class="hdx-acts">' +
        '<button class="hdx-chk' + (it.called_at ? " on" : "") + (it._busy ? " busy" : "") + '" data-act="called" data-id="' + esc(it.placement_id) + '">' + ic(it.called_at ? "check" : "phone") + "Called</button>" +
        '<button class="hdx-chk' + (it.card_sent_at ? " on" : "") + (it._busy ? " busy" : "") + '" data-act="card" data-id="' + esc(it.placement_id) + '">' + ic(it.card_sent_at ? "check" : "mail") + "Card sent</button>" +
      "</div></div>";
  }
  function render() {
    var root = document.getElementById("hdxRoot"); if (!root) return;
    var open = S.items.filter(function (i) { return !isDone(i); }).length;
    var called = S.items.filter(function (i) { return !!i.called_at; }).length;
    var cards = S.items.filter(function (i) { return !!i.card_sent_at; }).length;
    var mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    var month = S.items.filter(function (i) { var d = new Date(i.terminated_date ? i.terminated_date + "T12:00:00" : i.sent_at); return d >= mStart; }).length;
    var people = {}; S.items.forEach(function (i) { if (i.recruiter_email) people[i.recruiter_email] = who(i); });
    var list = filtered();
    var scope = S.all ? "the team's" : "your";

    var html = '<div class="hdx">' +
      '<div class="hdx-hero"><div class="hdx-ring"></div>' +
        "<div>" +
          '<div class="hdx-k">' + ic("star") + "HD Conversion Hub</div>" +
          "<h1>They got hired on. <em>Now make the call.</em></h1>" +
          '<div class="hdx-dek">This is the best kind of goodbye. A client wanted them for keeps. Call and celebrate, ask who else they know that’s looking for work, and drop a card in the mail.</div>' +
          '<div class="hdx-steps"><span class="hdx-step"><b>1</b>Call and congratulate</span><span class="hdx-step"><b>2</b>Ask for referrals</span><span class="hdx-step"><b>3</b>Mail a handwritten card</span></div>' +
        "</div>" +
        '<div class="hdx-jwu" aria-label="#JWU, Just Watch Us"><div class="t">#JWU</div><div class="s">Just watch us</div></div>' +
      "</div>" +
      '<div class="hdx-stats">' +
        '<div class="hdx-stat gold"><div class="v">' + open + '</div><div class="l">Open follow-ups</div></div>' +
        '<div class="hdx-stat"><div class="v">' + called + '</div><div class="l">Called</div></div>' +
        '<div class="hdx-stat"><div class="v">' + cards + '</div><div class="l">Cards sent</div></div>' +
        '<div class="hdx-stat"><div class="v">' + month + '</div><div class="l">Hired on this month</div></div>' +
      "</div>" +
      '<div class="hdx-bar">' +
        (S.admin ? '<div class="hdx-seg"><button data-scope="mine" class="' + (S.all ? "" : "on") + '">Mine</button><button data-scope="all" class="' + (S.all ? "on" : "") + '">Everyone</button></div>' : "") +
        '<div class="hdx-seg"><button data-status="open" class="' + (S.status === "open" ? "on" : "") + '">Open</button><button data-status="done" class="' + (S.status === "done" ? "on" : "") + '">Done</button><button data-status="all" class="' + (S.status === "all" ? "on" : "") + '">All</button></div>' +
        (S.all && Object.keys(people).length > 1 ? '<select class="hdx-sel" id="hdxWho"><option value="">All recruiters</option>' + Object.keys(people).sort(function (a, b) { return people[a].localeCompare(people[b]); }).map(function (e) { return '<option value="' + esc(e) + '"' + (S.who === e ? " selected" : "") + ">" + esc(people[e]) + "</option>"; }).join("") + "</select>" : "") +
        '<div class="hdx-qw">' + ic("search") + '<input class="hdx-q" id="hdxQ" placeholder="Search name or client" value="' + esc(S.q) + '"></div>' +
      "</div>" +
      (S.err ? '<div class="hdx-err">' + esc(S.err) + "</div>" : "") +
      (S.loading && !S.items.length ? '<div class="hdx-empty">Loading…</div>' :
        list.length ? '<div class="hdx-list">' + list.map(rowHtml).join("") + "</div>" :
        '<div class="hdx-empty"><b>' + (S.status === "open" && S.items.length ? "All caught up." : "Nothing here yet.") + "</b>" +
          (S.status === "open" && S.items.length ? "Every one of " + scope + " hired-direct follow-ups has been called and carded." : "When a client hires one of " + scope + " contract placements direct, it lands here within 30 minutes.") + "</div>") +
      "</div>";

    var qFocused = document.activeElement && document.activeElement.id === "hdxQ";
    var caret = qFocused ? document.activeElement.selectionStart : 0;
    root.innerHTML = html;
    if (qFocused) { var q = document.getElementById("hdxQ"); if (q) { q.focus(); try { q.setSelectionRange(caret, caret); } catch (e) {} } }
    var editing = root.querySelector("textarea.hdx-note"); if (editing && !qFocused) editing.focus();
  }
  function wire(root) {
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.scope) { var all = b.dataset.scope === "all"; if (all !== S.all) { S.all = all; S.who = ""; S.triedAll = true; load(true).then(render); render(); } return; }
      if (b.dataset.status) { S.status = b.dataset.status; render(); return; }
      var id = b.dataset.id, it = id && S.items.filter(function (x) { return x.placement_id === id; })[0]; if (!it) return;
      if (b.dataset.act === "called") mark(it, { called: !it.called_at });
      else if (b.dataset.act === "card") mark(it, { card: !it.card_sent_at });
      else if (b.dataset.act === "note") { it._editing = true; render(); }
    });
    root.addEventListener("input", function (e) { if (e.target.id === "hdxQ") { S.q = e.target.value; render(); } });
    root.addEventListener("change", function (e) { if (e.target.id === "hdxWho") { S.who = e.target.value; render(); } });
    root.addEventListener("focusout", function (e) {
      var t = e.target; if (!t.classList || !t.classList.contains("hdx-note")) return;
      var it = S.items.filter(function (x) { return x.placement_id === t.dataset.id; })[0]; if (!it) return;
      it._editing = false;
      var v = t.value.trim();
      if (v === (it.notes || "")) { render(); return; }
      mark(it, { notes: v });
    });
  }

  /* ---------- nav badge: open follow-ups that are the signed-in person's own ---------- */
  function badge() {
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]'); if (!btn) return;
    token().then(function (t) {
      var me = ""; try { me = JSON.parse(atob(String(t).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email.toLowerCase(); } catch (e) {}
      var n = S.items.filter(function (i) { return !isDone(i) && (i.recruiter_email || "").toLowerCase() === me; }).length;
      var b = btn.querySelector(".hdx-badge");
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("span"); b.className = "hdx-badge"; btn.appendChild(b); }
      b.textContent = n;
    });
  }

  /* ---------- tab plumbing (same approach as benefits.js) ---------- */
  function openTab() {
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.remove("active"); });
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]'); if (btn) btn.classList.add("active");
    var v = document.getElementById("view-" + TAB);
    if (v && v.parentNode) Array.prototype.forEach.call(v.parentNode.children, function (p) { if (p !== v && /^view-/.test(p.id || "")) p.style.display = "none"; });
    document.querySelectorAll(".tab-page").forEach(function (p) { if (p !== v) p.style.display = "none"; });
    if (v) v.style.display = "";
    try { window.scrollTo(0, 0); } catch (e) {}
    render(); load(true).then(render);
  }
  var NAV_HTML = '<span class="ico"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg></span>HD Conversion Hub';
  function placeNav() {
    var after = document.querySelector('.nav-item[data-tab="salesforce"]') || document.querySelector('.nav-item[data-tab="home"]');
    var nav = after ? after.parentNode : document.querySelector(".sidebar nav, .sidebar");
    if (!nav) return null;
    var btn = document.createElement("button");
    btn.className = "nav-item hdx-sub"; btn.setAttribute("data-tab", TAB); btn.title = "Hired Direct conversions: call, ask for referrals, send a card"; btn.innerHTML = NAV_HTML;
    if (after && after.nextSibling) nav.insertBefore(btn, after.nextSibling); else nav.appendChild(btn);
    btn.addEventListener("click", openTab);
    new MutationObserver(function () { heal(btn); }).observe(btn, { attributes: true, attributeFilter: ["style", "hidden"] });
    return btn;
  }
  function heal(btn) { if (btn.style.display === "none") btn.style.display = ""; if (btn.hasAttribute("hidden")) btn.removeAttribute("hidden"); }
  function ensureNav() {
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]');
    if (!btn || !document.body.contains(btn)) { if (placeNav()) badge(); return; }
    heal(btn);
  }
  function mountTab() {
    if (document.getElementById("view-" + TAB)) return;
    if (!placeNav()) return;
    var view = document.createElement("div");
    view.id = "view-" + TAB; view.className = "tab-page cream"; view.style.display = "none";
    view.innerHTML = '<div id="hdxRoot"></div>';
    var anchor = document.getElementById("view-salesforce") || document.getElementById("view-admin");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(view, anchor.nextSibling); else document.body.appendChild(view);
    wire(view.querySelector("#hdxRoot"));
    document.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest(".nav-item[data-tab]");
      if (b && b.getAttribute("data-tab") !== TAB) view.style.display = "none";
    }, true);
    var n = 0; var fast = setInterval(function () { ensureNav(); if (++n >= 75) { clearInterval(fast); setInterval(ensureNav, 2500); } }, 400);
  }
  function fromHash() { if (location.hash === "#" + TAB) setTimeout(openTab, 300); }

  /* ---------- boot ---------- */
  function boot(t) {
    t = t || 0;
    var ready = document.querySelector('.nav-item[data-tab="home"]') && document.getElementById("view-admin") && window.SPARK_SB && window.SPARK_SB.getToken;
    if (!ready) { if (t < 80) setTimeout(function () { boot(t + 1); }, 600); return; }
    injectCss(); mountTab();
    load(true).then(function () { badge(); fromHash(); });
    window.addEventListener("hashchange", fromHash);
    setInterval(function () { load(true).then(function () { var v = document.getElementById("view-" + TAB); if (v && v.style.display !== "none" && !document.querySelector("textarea.hdx-note")) render(); }); }, 5 * 60 * 1000);
    window.hqHiredDirect = { open: openTab, reload: function () { return load(true).then(render); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); }); else boot();
})();
