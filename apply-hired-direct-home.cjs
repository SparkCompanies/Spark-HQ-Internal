#!/usr/bin/env node
/* HIRED_DIRECT_v1.2 — move the "Hired direct follow-ups" card onto the real Home (spark-home.html).
   Run from the repo root:  node apply-hired-direct-home.cjs
   Edits spark-home.html in place (backup written first). Idempotent: safe to run twice.

   Why: Home is spark-home.html rendered in #sparkHomeFrame; the card apply-hired-direct.cjs put in
   index.html sits in the parked legacy layout and is never visible. This puts the same card directly
   above the celebrations card on the live Home. Worker routes are unchanged (/hired-direct).
*/
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "spark-home.html");
let src = fs.readFileSync(file, "utf8");
let changes = 0;

function replaceOnce(label, from, to) {
  if (src.includes(to)) { console.log("  = already applied:", label); return; }
  if (!src.includes(from)) { console.error("  ! anchor not found:", label); process.exitCode = 1; return; }
  src = src.replace(from, to);
  changes++;
  console.log("  + applied:", label);
}

console.log("HIRED_DIRECT_v1.2 patching", file);

/* 1. Host element — directly above the celebrations card. */
replaceOnce("host",
  "    <!-- HQ_CELEBRATIONS_v3 -->\n    <section class=\"celebs\" id=\"celebWrap\"></section>",
  "    <!-- HIRED_DIRECT_v1.2 — hired-direct follow-ups for the signed-in recruiter -->\n    <section class=\"hd-wrap\" id=\"hdWrap\" style=\"display:none\"></section>\n" +
  "    <!-- HQ_CELEBRATIONS_v3 -->\n    <section class=\"celebs\" id=\"celebWrap\"></section>");

/* 2. Spacing rule — same rhythm as the celebrations card. */
replaceOnce("spacing",
  ".main>#celebWrap{margin-top:40px !important}",
  ".main>#celebWrap{margin-top:40px !important}\n.main>#hdWrap{margin-top:40px !important}");

/* 3. CSS + behaviour, appended before </body>. */
const BLOCK =
'<style>/*HIRED_DIRECT_v1.2*/\n' +
'.hd-card{background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(20,18,10,.04),0 24px 48px -32px rgba(20,18,10,.28);overflow:hidden;position:relative}\n' +
'.hd-card::before{content:"";position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}\n' +
'.hd-head{display:flex;align-items:center;gap:14px;padding:22px 28px;border-bottom:1px solid #f0eee7}\n' +
'.hd-eyebrow{font:600 11px Jost,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#8a7a52}\n' +
'.hd-title{font-size:26px;font-weight:600;letter-spacing:-.01em;color:#111;line-height:1.1}\n' +
'.hd-sub{font:600 10px Jost,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:6px}\n' +
'.hd-toggle{margin-left:auto;display:flex;gap:4px}\n' +
'.hd-toggle button{font:600 11px Jost,sans-serif;letter-spacing:.06em;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--muted);cursor:pointer}\n' +
'.hd-toggle button.on{background:#111;color:var(--gold);border-color:#111}\n' +
'.hd-lead{padding:16px 28px 0;font-size:14px;line-height:1.55;color:var(--muted)}\n' +
'.hd-list{padding:14px 28px 22px;display:grid;gap:10px}\n' +
'.hd-row{display:grid;grid-template-columns:1fr auto;gap:14px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:#fff}\n' +
'.hd-row.is-done{opacity:.5}\n' +
'.hd-name{font-weight:600;color:#111;font-size:15px}\n' +
'.hd-meta{font-size:12.5px;color:var(--muted);margin-top:2px}\n' +
'.hd-contact{font-size:13px;color:#111;margin-top:7px;line-height:1.55}\n' +
'.hd-contact a{color:inherit;text-decoration:none;border-bottom:1px dotted rgba(138,122,82,.6)}\n' +
'.hd-contact .hd-none{color:var(--muted);font-style:italic}\n' +
'.hd-who{font-size:11px;color:var(--muted);margin-top:4px}\n' +
'.hd-sf{display:inline-block;margin-top:7px;font:600 11px Jost,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a7a52;text-decoration:none}\n' +
'.hd-acts{display:flex;flex-direction:column;gap:6px;align-items:flex-end;justify-content:center}\n' +
'.hd-chk{display:inline-flex;align-items:center;gap:7px;font:600 12px Jost,sans-serif;letter-spacing:.04em;color:var(--muted);cursor:pointer;user-select:none;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;white-space:nowrap}\n' +
'.hd-chk svg{width:14px;height:14px;flex:0 0 auto}\n' +
'.hd-chk.on{background:rgba(255,200,0,.18);border-color:#d9ab00;color:#111}\n' +
'.hd-chk.busy{opacity:.5;pointer-events:none}\n' +
'@media(max-width:640px){.hd-row{grid-template-columns:1fr}.hd-acts{flex-direction:row;align-items:center;justify-content:flex-start}.hd-head{flex-wrap:wrap}}\n' +
'</style>\n' +
'<script>/*HIRED_DIRECT_v1.2 — hired-direct follow-ups card on Home*/\n' +
'(function () {\n' +
'  var W = (typeof WORKER_URL === "string" && WORKER_URL) || "https://spark-hq-worker.sparkcompanies.workers.dev";\n' +
'  var NS = "http://www.w3.org/2000/svg";\n' +
'  var S = { items: [], admin: false, all: false };\n' +
'  function tok(){ try{ var a=JSON.parse(localStorage.getItem("spark_hq_sb_auth")||"{}"); return a.access_token||(a.currentSession&&a.currentSession.access_token)||(a.session&&a.session.access_token)||""; }catch(e){ return ""; } }\n' +
'  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"\']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "\'": "&#39;" }[c]; }); }\n' +
'  function ico(d) { var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2.2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); var p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); return s; }\n' +
'  var D_CHECK = "M5 12.5l4.5 4.5L19 7", D_PHONE = "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z", D_MAIL = "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6";\n' +
'  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }\n' +
'  function fmtDate(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }\n' +
'  function addrLines(a) { a = a || {}; var l1 = String(a.street || "").replace(/\\s*\\n\\s*/g, ", ").trim(); var l2 = [a.city, a.state].filter(Boolean).join(", ") + (a.zip ? " " + a.zip : ""); return [l1, l2.trim()].filter(Boolean); }\n' +
'  function api(method, body) {\n' +
'    var t = tok(); if (!t) return Promise.reject(new Error("Sign in first."));\n' +
'    var init = { method: method, headers: { Authorization: "Bearer " + t } };\n' +
'    if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }\n' +
'    return fetch(W + "/hired-direct" + (method === "GET" && S.all ? "?all=1" : ""), init).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || ("Request failed (" + r.status + ")")); return d; }); });\n' +
'  }\n' +
'  function chk(label, d, on, busy, onClick) { var b = el("button", "hd-chk" + (on ? " on" : "") + (busy ? " busy" : "")); b.type = "button"; b.appendChild(ico(on ? D_CHECK : d)); b.appendChild(document.createTextNode(label)); b.addEventListener("click", onClick); return b; }\n' +
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
'    var sf = el("a", "hd-sf", "Open placement in Salesforce"); sf.href = "https://spark-companies.lightning.force.com/lightning/r/bpats__Placement__c/" + encodeURIComponent(it.placement_id) + "/view"; sf.target = "_blank"; sf.rel = "noopener"; left.appendChild(sf);\n' +
'    var acts = el("div", "hd-acts");\n' +
'    acts.appendChild(chk("Called", D_PHONE, !!it.called_at, it._busy, function () { mark(it, { called: !it.called_at }); }));\n' +
'    acts.appendChild(chk("Card sent", D_MAIL, !!it.card_sent_at, it._busy, function () { mark(it, { card: !it.card_sent_at }); }));\n' +
'    r.appendChild(left); r.appendChild(acts); return r;\n' +
'  }\n' +
'  function mark(it, patch) {\n' +
'    it._busy = true; render();\n' +
'    api("POST", Object.assign({ placementId: it.placement_id }, patch)).then(function (d) { if (d && d.item) { for (var k in d.item) it[k] = d.item[k]; } }).catch(function (e) { alert(e.message || "Could not save"); }).then(function () { it._busy = false; render(); });\n' +
'  }\n' +
'  function render() {\n' +
'    var host = document.getElementById("hdWrap"); if (!host) return;\n' +
'    if (!S.items.length) { host.style.display = "none"; host.innerHTML = ""; return; }\n' +
'    var open = S.items.filter(function (i) { return !(i.called_at && i.card_sent_at); });\n' +
'    host.innerHTML = ""; host.style.display = "";\n' +
'    var card = el("div", "hd-card"), head = el("div", "hd-head"), tw = el("div");\n' +
'    tw.appendChild(el("div", "hd-eyebrow", "Hired direct"));\n' +
'    tw.appendChild(el("div", "hd-title", "Call and congratulate"));\n' +
'    tw.appendChild(el("div", "hd-sub", open.length ? open.length + " open" : "All caught up"));\n' +
'    head.appendChild(tw);\n' +
'    if (S.admin) { var t = el("div", "hd-toggle"); [["Mine", false], ["Everyone", true]].forEach(function (o) { var b = el("button", S.all === o[1] ? "on" : "", o[0]); b.type = "button"; b.addEventListener("click", function () { if (S.all !== o[1]) { S.all = o[1]; load(); } }); t.appendChild(b); }); head.appendChild(t); }\n' +
'    card.appendChild(head);\n' +
'    card.appendChild(el("div", "hd-lead", "The client hired your candidate on. Call them, ask who they know that\\u2019s looking, and drop a card in the mail. Check each one off here."));\n' +
'    var list = el("div", "hd-list");\n' +
'    S.items.slice().sort(function (a, b) { var ad = !!(a.called_at && a.card_sent_at), bd = !!(b.called_at && b.card_sent_at); if (ad !== bd) return ad ? 1 : -1; return String(b.sent_at || "").localeCompare(String(a.sent_at || "")); }).forEach(function (it) { list.appendChild(row(it)); });\n' +
'    card.appendChild(list); host.appendChild(card);\n' +
'  }\n' +
'  function wantsJump() { try { return location.hash === "#hired-direct" || (window.parent && window.parent !== window && window.parent.location.hash === "#hired-direct"); } catch (e) { return false; } }\n' +
'  function jump() { var h = document.getElementById("hdWrap"); if (h && h.style.display !== "none") h.scrollIntoView({ behavior: "smooth", block: "start" }); }\n' +
'  function load() { api("GET").then(function (d) { S.items = d.items || []; S.admin = !!d.admin; S.all = !!d.all; render(); if (wantsJump()) setTimeout(jump, 200); }).catch(function () { /* never let this break Home */ }); }\n' +
'  window.addEventListener("hashchange", function () { if (wantsJump()) jump(); });\n' +
'  function go() { var n = 0; var iv = setInterval(function () { n++; if (document.getElementById("hdWrap") && tok()) { clearInterval(iv); load(); setInterval(load, 300000); } else if (n > 80) clearInterval(iv); }, 250); }\n' +
'  if (document.readyState !== "loading") go(); else document.addEventListener("DOMContentLoaded", go);\n' +
'})();\n' +
'</script>\n';

replaceOnce("block", "</body>", BLOCK + "</body>");

if (changes) {
  const bak = file.replace(/spark-home\.html$/, "spark-home.html.backup-hired-direct-" + new Date().toISOString().replace(/[:.]/g, "-"));
  fs.writeFileSync(bak, fs.readFileSync(file));
  fs.writeFileSync(file, src);
  console.log("done —", changes, "change(s); backup at", path.basename(bak));
} else {
  console.log("nothing to do");
}
