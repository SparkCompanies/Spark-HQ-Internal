// AR_REFERENCE_home — shows the Xero invoice Reference in the Overdue-AR drawer.
//   - AR_FULL mapping carries r.reference through as ref
//   - drawer table gains a REFERENCE column (header + cell), colspan fix on empty row
// Stays blank until the Worker's /ar-overdue returns reference (paired worker patch).
// EOL-safe (spark-home.html is CRLF). Run from repo root:
//   node patch-ar-reference-home.cjs
const fs = require("fs");
const F = "spark-home.html";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("AR_REFERENCE_home")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

// 1. carry reference through the live mapping
const MAP_OLD = "AR_FULL=d?d.invoices.map(function(r){return{c:r.contact,inv:r.number,a:Math.round(r.amountDue),d:r.daysLate,real:1};}):[];";
if (h.split(MAP_OLD).length - 1 !== 1) die("AR_FULL mapping not found exactly once");
const MAP_NEW = "AR_FULL=d?d.invoices.map(function(r){return{c:r.contact,inv:r.number,ref:r.reference||'',a:Math.round(r.amountDue),d:r.daysLate,real:1};}):[]; /* AR_REFERENCE_home */";
h = h.split(MAP_OLD).join(MAP_NEW);

// 2. table header — add REFERENCE after INVOICE
const HEAD_OLD = '<table class="dtable"><thead><tr><th>CLIENT</th><th>INVOICE</th><th style="text-align:right;">AMOUNT</th><th style="text-align:right;">DAYS LATE</th></tr></thead><tbody></tbody></table>';
if (h.split(HEAD_OLD).length - 1 !== 1) die("drawer table header not found exactly once");
const HEAD_NEW = '<table class="dtable"><thead><tr><th>CLIENT</th><th>INVOICE</th><th>REFERENCE</th><th style="text-align:right;">AMOUNT</th><th style="text-align:right;">DAYS LATE</th></tr></thead><tbody></tbody></table>';
h = h.split(HEAD_OLD).join(HEAD_NEW);

// 3. row render — add reference cell (escaped) after the invoice cell
const ROW_OLD = "return '<tr><td>'+r.c+(r.real?'':' <span style=\"color:#a3a29b;font-size:10.5px;\">(sample)</span>')+'</td><td>'+r.inv+'</td><td class=\"amt\">$'+r.a.toLocaleString()+'</td><td class=\"late'+(r.d<60?' warn':'')+'\">'+r.d+'d</td></tr>';";
if (h.split(ROW_OLD).length - 1 !== 1) die("drawer row render not found exactly once");
const ROW_NEW = "var _ref=(''+(r.ref||'')).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); return '<tr><td>'+r.c+(r.real?'':' <span style=\"color:#a3a29b;font-size:10.5px;\">(sample)</span>')+'</td><td>'+r.inv+'</td><td class=\"ref\" style=\"color:#6b6a64;\">'+(_ref||'<span style=\"color:#c9c6bb;\">\\u2014</span>')+'</td><td class=\"amt\">$'+r.a.toLocaleString()+'</td><td class=\"late'+(r.d<60?' warn':'')+'\">'+r.d+'d</td></tr>'; /* AR_REFERENCE_home */";
h = h.split(ROW_OLD).join(ROW_NEW);

// 4. empty-state colspan 4 -> 5
const NM_OLD = '<tr><td colspan="4" style="text-align:center;color:#a3a29b;padding:18px;">No matches</td></tr>';
if (h.split(NM_OLD).length - 1 === 1) {
  h = h.split(NM_OLD).join('<tr><td colspan="5" style="text-align:center;color:#a3a29b;padding:18px;">No matches</td></tr>');
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("spark-home.backup-arref-" + stamp + ".html", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED AR_REFERENCE (home)");
console.log("  Drawer now has a REFERENCE column (shows \\u2014 until the Worker sends reference)");
console.log("  EOL preserved:", hadCRLF ? "CRLF" : "LF");
console.log("  backup: spark-home.backup-arref-" + stamp + ".html");
