#!/usr/bin/env node
/* HIRED_DIRECT_v1 — "Hired direct follow-ups" card on the HQ home page.
   Run from the repo root:  node apply-hired-direct.cjs
   Edits index.html in place (backup written first). Idempotent: safe to run twice.

   Pairs with worker/cloudworker.js HIRED_DIRECT_v1 (routes /hired-direct, /hired-direct/preview, /hired-direct/run)
   and worker/hired-direct.sql (table spark_hq_hired_direct).

   What it adds:
   1. A card above the celebrations card that lists the signed-in person's open hired-direct follow-ups
      (candidate, client, phone, mailing address) with "Called" and "Card sent" checkmarks. Admins get an
      "Everyone" toggle. The card stays hidden when there is nothing to show.
   2. #hired-direct in the URL (the link in the nudge email) opens Home and scrolls to the card.
*/
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "index.html");
let src = fs.readFileSync(file, "utf8");
let changes = 0;

function replaceOnce(label, from, to) {
  if (src.includes(to)) { console.log("  = already applied:", label); return; }
  if (!src.includes(from)) { console.error("  ! anchor not found:", label); process.exitCode = 1; return; }
  src = src.replace(from, to);
  changes++;
  console.log("  + applied:", label);
}

console.log("HIRED_DIRECT_v1 patching", file);

/* 1. CSS — sits with the celebrations styles so it inherits the same card language. */
replaceOnce("css",
  ".celeb-empty{font-size:12px;color:var(--muted-light);padding:2px 0 4px}\n</style>",
  ".celeb-empty{font-size:12px;color:var(--muted-light);padding:2px 0 4px}\n" +
  "/*HIRED_DIRECT_v1*/\n" +
  ".hd-wrap{margin:0 0 18px}\n" +
  ".hd-card{background:linear-gradient(180deg,#fffdf7,#fff);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 2px 14px rgba(23,22,20,.05)}\n" +
  ".hd-head{display:flex;align-items:center;gap:10px;padding:16px 20px 12px;border-bottom:1px solid rgba(184,145,46,.14)}\n" +
  ".hd-eyebrow{font-family:var(--font-display);font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#B8912E}\n" +
  ".hd-sub{font-size:11.5px;color:var(--muted-light);letter-spacing:.02em}\n" +
  ".hd-toggle{margin-left:auto;display:flex;gap:4px}\n" +
  ".hd-toggle button{font:inherit;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--muted);cursor:pointer}\n" +
  ".hd-toggle button.on{background:#171614;color:var(--gold);border-color:#171614}\n" +
  ".hd-lead{padding:12px 20px 0;font-size:13px;line-height:1.5;color:var(--muted)}\n" +
  ".hd-list{padding:8px 20px 16px;display:grid;gap:10px}\n" +
  ".hd-row{display:grid;grid-template-columns:1fr auto;gap:12px;padding:12px 14px;border:1px solid rgba(184,145,46,.18);border-radius:12px;background:#fff}\n" +
  ".hd-row.is-done{opacity:.5}\n" +
  ".hd-name{font-weight:700;color:var(--ink);font-size:14.5px}\n" +
  ".hd-meta{font-size:12.5px;color:var(--muted);margin-top:2px}\n" +
  ".hd-contact{font-size:12.5px;color:var(--ink);margin-top:6px;line-height:1.5}\n" +
  ".hd-contact a{color:inherit;text-decoration:none;border-bottom:1px dotted rgba(184,145,46,.6)}\n" +
  ".hd-contact .hd-none{color:var(--muted-light);font-style:italic}\n" +
  ".hd-who{font-size:11px;color:var(--muted-light);margin-top:4px}\n" +
  ".hd-acts{display:flex;flex-direction:column;gap:6px;align-items:flex-end;justify-content:center}\n" +
  ".hd-chk{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;user-select:none;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:#fff;white-space:nowrap}\n" +
  ".hd-chk svg{width:14px;height:14px;flex:0 0 auto}\n" +
  ".hd-chk.on{background:rgba(245,197,24,.16);border-color:#D4A017;color:#171614}\n" +
  ".hd-chk.busy{opacity:.5;pointer-events:none}\n" +
  ".hd-sf{font-size:11.5px;color:#B8912E;font-weight:600;text-decoration:none}\n" +
  "@media(max-width:600px){.hd-row{grid-template-columns:1fr}.hd-acts{flex-direction:row;align-items:center;justify-content:flex-start}}\n" +
  "</style>");

/* 2. Host element — directly above the celebrations card on Home. */
replaceOnce("host",
  "          <!-- HQ_CELEBRATIONS_v2 — birthdays & anniversaries, home page -->\n          <div class=\"celeb-wrap\" id=\"celebWrap\"></div>",
  "          <!-- HIRED_DIRECT_v1 — hired-direct follow-ups for the signed-in recruiter -->\n          <div class=\"hd-wrap\" id=\"hdWrap\" style=\"display:none\"></div>\n" +
  "          <!-- HQ_CELEBRATIONS_v2 — birthdays & anniversaries, home page -->\n          <div class=\"celeb-wrap\" id=\"celebWrap\"></div>");

/* 3. Behaviour — mirrors the celebrations loader: wait for SPARK_SB, fetch, mount, never break Home. */
const SCRIPT =
'<script>/*HIRED_DIRECT_v1 — hired-direct follow-ups card*/\n' +
'(function () {\n' +
'  var WK = "https://spark-hq-worker.sparkcompanies.workers.dev";\n' +
'  var NS = "http://www.w3.org/2000/svg";\n' +
'  var S = { items: [], admin: false, all: false };\n' +
'  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"\']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "\'": "&#39;" }[c]; }); }\n' +
'  function ico(d) { var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2.2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); return s; }\n' +
'  var D_CHECK = "M5 12.5l4.5 4.5L19 7", D_PHONE = "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z", D_MAIL = "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6";\n' +
'  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }\n' +
'  function fmtDate(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }\n' +
'  function addrLines(a) { a = a || {}; var l1 = String(a.street || "").replace(/\\s*\\n\\s*/g, ", ").trim(); var l2 = [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : ""); return [l1, l2.trim()].filter(Boolean); }\n' +
'  function api(method, body) {\n' +
'    return window.SPARK_SB.getToken().then(function (tok) {\n' +
'      if (!tok) throw new Error("Sign in first.");\n' +
'      var init = { method: method, headers: { Authorization: "Bearer " + tok } };\n' +
'      if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }\n' +
'      return fetch(WK + "/hired-direct" + (method === "GET" && S.all ? "?all=1" : ""), init);\n' +
'    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ("Request failed (" + r.status + ")")); return d; }); });\n' +
'  }\n' +
'  function chk(label, d, on, busy, onClick) {\n' +
'    var b = el("button", "hd-chk" + (on ? " on" : "") + (busy ? " busy" : "")); b.type = "button";\n' +
'    b.appendChild(ico(on ? D_CHECK : d)); b.appendChild(document.createTextNode(label));\n' +
'    b.addEventListener("click", onClick); return b;\n' +
'  }\n' +
'  function row(it) {\n' +
'    var done = !!(it.called_at && it.card_sent_at);\n' +
'    var r = el("div", "hd-row" + (done ? " is-done" : ""));\n' +
'    var left = el("div");\n' +
'    left.appendChild(el("div", "hd-name", it.candidate_name || "Candidate"));\n' +
'    left.appendChild(el("div", "hd-meta", [it.job_title, it.client].filter(Boolean).join(" at ") + (it.sent_at ? " \\u00b7 flagged " + fmtDate(it.sent_at) : "")));\n' +
'    var c = el("div", "hd-contact"); var al = addrLines(it.address); var parts = [];\n' +
'    if (it.candidate_phone) parts.push("<a href=\\"tel:" + esc(String(it.candidate_phone).replace(/[^0-9+]/g, "")) + "\\">" + esc(it.candidate_phone) + "</a>");\n' +
'    if (it.candidate_email) parts.push("<a href=\\"mailto:" + esc(it.candidate_email) + "\\">" + esc(it.candidate_email) + "</a>");\n' +
'    c.innerHTML = (parts.length ? parts.join(" \\u00b7 ") + "<br>" : "") + (al.length ? esc(al.join(", ")) : "<span class=\\"hd-none\\">No mailing address on the Contact \\u2014 grab it on the call.</span>");\n' +
'    left.appendChild(c);\n' +
'    if (S.all) left.appendChild(el("div", "hd-who", (it.recruiter_name || it.recruiter_email || "") + (it.recruiter_via ? " (" + it.recruiter_via + ")" : "")));\n' +
'    var sf = el("a", "hd-sf", "Open placement in Salesforce"); sf.href = "https://spark-companies.lightning.force.com/lightning/r/bpats__Placement__c/" + encodeURIComponent(it.placement_id) + "/view"; sf.target = "_blank"; sf.rel = "noopener";\n' +
'    var sfw = el("div"); sfw.style.marginTop = "6px"; sfw.appendChild(sf); left.appendChild(sfw);\n' +
'    var acts = el("div", "hd-acts");\n' +
'    acts.appendChild(chk("Called", D_PHONE, !!it.called_at, it._busy, function () { mark(it, { called: !it.called_at }); }));\n' +
'    acts.appendChild(chk("Card sent", D_MAIL, !!it.card_sent_at, it._busy, function () { mark(it, { card: !it.card_sent_at }); }));\n' +
'    r.appendChild(left); r.appendChild(acts); return r;\n' +
'  }\n' +
'  function mark(it, patch) {\n' +
'    it._busy = true; render();\n' +
'    api("POST", Object.assign({ placementId: it.placement_id }, patch)).then(function (d) {\n' +
'      if (d && d.item) { for (var k in d.item) it[k] = d.item[k]; }\n' +
'    }).catch(function (e) { alert(e.message || "Could not save"); }).then(function () { it._busy = false; render(); });\n' +
'  }\n' +
'  function render() {\n' +
'    var host = document.getElementById("hdWrap"); if (!host) return;\n' +
'    var open = S.items.filter(function (i) { return !(i.called_at && i.card_sent_at); });\n' +
'    if (!S.items.length) { host.style.display = "none"; host.innerHTML = ""; return; }\n' +
'    host.innerHTML = ""; host.style.display = "";\n' +
'    var card = el("div", "hd-card"), head = el("div", "hd-head");\n' +
'    head.appendChild(el("div", "hd-eyebrow", "Hired direct \\u2014 call and congratulate"));\n' +
'    head.appendChild(el("div", "hd-sub", open.length ? open.length + " open" : "All caught up"));\n' +
'    if (S.admin) { var t = el("div", "hd-toggle"); [["Mine", false], ["Everyone", true]].forEach(function (o) { var b = el("button", S.all === o[1] ? "on" : "", o[0]); b.type = "button"; b.addEventListener("click", function () { if (S.all !== o[1]) { S.all = o[1]; load(); } }); t.appendChild(b); }); head.appendChild(t); }\n' +
'    card.appendChild(head);\n' +
'    card.appendChild(el("div", "hd-lead", "The client hired your candidate on. Call them, ask who they know that\\u2019s looking, and drop a card in the mail. Check each one off here."));\n' +
'    var list = el("div", "hd-list");\n' +
'    S.items.slice().sort(function (a, b) { var ad = !!(a.called_at && a.card_sent_at), bd = !!(b.called_at && b.card_sent_at); if (ad !== bd) return ad ? 1 : -1; return String(b.sent_at || "").localeCompare(String(a.sent_at || "")); }).forEach(function (it) { list.appendChild(row(it)); });\n' +
'    card.appendChild(list); host.appendChild(card);\n' +
'  }\n' +
'  function load() {\n' +
'    api("GET").then(function (d) { S.items = d.items || []; S.admin = !!d.admin; S.all = !!d.all; render(); if (location.hash === "#hired-direct") jump(); }).catch(function () { /* never let this break the home page */ });\n' +
'  }\n' +
'  function jump() {\n' +
'    try { var b = document.querySelector(".nav-item[data-tab=\\"home\\"]"); if (b) b.click(); } catch (e) {}\n' +
'    setTimeout(function () { var h = document.getElementById("hdWrap"); if (h && h.style.display !== "none") h.scrollIntoView({ behavior: "smooth", block: "start" }); }, 350);\n' +
'  }\n' +
'  function go() {\n' +
'    var n = 0;\n' +
'    var iv = setInterval(function () {\n' +
'      n++;\n' +
'      if (document.getElementById("hdWrap") && window.SPARK_SB && window.SPARK_SB.getToken) { clearInterval(iv); load(); try { window.SPARK_SB.onChange(function () { setTimeout(load, 300); }); } catch (e) {} }\n' +
'      else if (n > 60) clearInterval(iv);\n' +
'    }, 250);\n' +
'  }\n' +
'  window.addEventListener("hashchange", function () { if (location.hash === "#hired-direct") jump(); });\n' +
'  if (document.readyState !== "loading") go(); else document.addEventListener("DOMContentLoaded", go);\n' +
'})();\n' +
'</script>\n';

replaceOnce("script",
  "<script>/*HQ_CELEBRATIONS_v2 — home-page celebrations card*/",
  SCRIPT + "<script>/*HQ_CELEBRATIONS_v2 — home-page celebrations card*/");

if (changes) {
  const bak = file.replace(/index\.html$/, "index.html.backup-hired-direct-" + new Date().toISOString().replace(/[:.]/g, "-"));
  fs.writeFileSync(bak, fs.readFileSync(file));
  fs.writeFileSync(file, src);
  console.log("done —", changes, "change(s); backup at", path.basename(bak));
} else {
  console.log("nothing to do");
}
