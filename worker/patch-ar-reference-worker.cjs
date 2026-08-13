// AR_REFERENCE_worker — adds the Xero invoice Reference to the /ar-overdue response.
// The row builder already has the full Xero invoice object (inv); Xero returns
// inv.Reference by default, so this is a single field add to the pushed row.
// Idempotent: keys off the presence of "reference: inv.Reference".
// EOL-safe. Run from the worker folder:
//   cd ~/Desktop/Spark-HQ-Internal/worker && node patch-ar-reference-worker.cjs
//   then:  npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("reference: inv.Reference")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

const OLD = 'rows.push({ contact: inv.Contact && inv.Contact.Name || "", number: inv.InvoiceNumber || "", amountDue: Math.round(amt * 100) / 100, dueDate: (inv.DueDateString || "").slice(0, 10), daysLate: dl });';
if (h.split(OLD).length - 1 !== 1) die("AR row builder not found exactly once");
const NEW = 'rows.push({ contact: inv.Contact && inv.Contact.Name || "", number: inv.InvoiceNumber || "", reference: inv.Reference || "", amountDue: Math.round(amt * 100) / 100, dueDate: (inv.DueDateString || "").slice(0, 10), daysLate: dl });';
h = h.split(OLD).join(NEW);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.arref-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED AR_REFERENCE (worker)");
console.log("  /ar-overdue rows now include: reference (from Xero inv.Reference)");
console.log("  EOL preserved:", hadCRLF ? "CRLF" : "LF");
console.log("  NEXT: npx wrangler deploy");
console.log("  backup: cloudworker.js.arref-" + stamp + ".bak");
