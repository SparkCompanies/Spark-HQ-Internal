// CAL_WINDOW_v1 — fixes three bugs in the worker's /calendar endpoint.
//   1) THE BIG ONE: the Graph query started at "now", so every meeting that had
//      already ENDED was dropped. A morning-heavy day therefore looked empty by
//      lunchtime — today showed "Nothing scheduled" while the real calendar had
//      four meetings before 11:30. It now starts at MIDNIGHT TODAY (Eastern,
//      matching the Prefer header), so the whole day is always present.
//   2) days was capped at 31, so the UI asking for ?days=45 silently got 31.
//      Cap raised to 62 and $top raised from 50 to 200.
//   3) $select never asked for the online-meeting fields, so the Teams join URL
//      was never returned and JOIN buttons could never appear. Now returns
//      online (validated https join URL), isOnline, showAs and webLink, and
//      filters out cancelled events.
// Run from ~/Desktop/Spark-HQ-Internal/worker, then: npx wrangler deploy
const fs = require("fs");
const F = "cloudworker.js";
const raw = fs.readFileSync(F, "utf8");
if (raw.includes("CAL_WINDOW_v1")) { console.log("Already applied."); process.exit(0); }
const hadCRLF = /\r\n/.test(raw);
let h = raw.replace(/\r\n/g, "\n");
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const P = [["WINDOW", "    let d = parseInt(days, 10);\n    if (isNaN(d) || d < 1) d = 7;\n    if (d > 31) d = 31;\n    const now = /* @__PURE__ */ new Date();\n    const end = new Date(now.getTime() + d * 24 * 60 * 60 * 1e3);\n    const qs = \"startDateTime=\" + encodeURIComponent(now.toISOString()) + \"&endDateTime=\" + encodeURIComponent(end.toISOString()) + \"&$select=subject,start,end,location,isAllDay,organizer&$orderby=start/dateTime&$top=50\";", "    let d = parseInt(days, 10);\n    if (isNaN(d) || d < 1) d = 7;\n    if (d > 62) d = 62;\n    /* CAL_WINDOW_v1 \u2014 start at MIDNIGHT TODAY in the user's zone, not \"now\".\n       Reading from now silently dropped every meeting that had already ended,\n       so a morning-heavy day looked empty by lunchtime. Eastern is the company\n       zone and matches the Prefer header below. */\n    const now = /* @__PURE__ */ new Date();\n    const etNow = new Date(now.toLocaleString(\"en-US\", { timeZone: \"America/New_York\" }));\n    const offsetMs = now.getTime() - etNow.getTime();\n    const etMidnight = new Date(etNow.getFullYear(), etNow.getMonth(), etNow.getDate(), 0, 0, 0, 0);\n    const start = new Date(etMidnight.getTime() + offsetMs);\n    const end = new Date(start.getTime() + d * 24 * 60 * 60 * 1e3);\n    const qs = \"startDateTime=\" + encodeURIComponent(start.toISOString()) + \"&endDateTime=\" + encodeURIComponent(end.toISOString()) + \"&$select=subject,start,end,location,isAllDay,organizer,onlineMeeting,isOnlineMeeting,onlineMeetingUrl,webLink,showAs,isCancelled&$orderby=start/dateTime&$top=200\";"], ["MAP", "    const events = (data.value || []).map(function(e) {\n      return { subject: e.subject || \"(no subject)\", start: e.start && e.start.dateTime ? e.start.dateTime : null, end: e.end && e.end.dateTime ? e.end.dateTime : null, allDay: !!e.isAllDay, location: e.location && e.location.displayName || \"\", organizer: e.organizer && e.organizer.emailAddress && e.organizer.emailAddress.name || \"\" };\n    });\n    return { ok: true, user: email, days: d, count: events.length, events };", "    /* CAL_WINDOW_v1 \u2014 carry the Teams join link through so the UI can show a\n       real Join button, drop cancelled events, and expose free/busy status. */\n    const events = (data.value || []).filter(function(e) { return !e.isCancelled; }).map(function(e) {\n      const join = (e.onlineMeeting && e.onlineMeeting.joinUrl) || e.onlineMeetingUrl || \"\";\n      return {\n        subject: e.subject || \"(no subject)\",\n        start: e.start && e.start.dateTime ? e.start.dateTime : null,\n        end: e.end && e.end.dateTime ? e.end.dateTime : null,\n        allDay: !!e.isAllDay,\n        location: e.location && e.location.displayName || \"\",\n        organizer: e.organizer && e.organizer.emailAddress && e.organizer.emailAddress.name || \"\",\n        online: /^https:\\/\\//.test(join) ? join : \"\",\n        isOnline: !!e.isOnlineMeeting,\n        showAs: e.showAs || \"\",\n        link: e.webLink || \"\"\n      };\n    });\n    return { ok: true, user: email, days: d, from: start.toISOString(), to: end.toISOString(), count: events.length, events };"]];
for (const [name, oldS] of P) { const n = h.split(oldS).length - 1; if (n !== 1) die(name + " anchor found " + n + " times (want 1)"); }
for (const [name, oldS, newS] of P) h = h.split(oldS).join(newS);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("cloudworker.js.calwindow-" + stamp + ".bak", raw);
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, "\r\n") : h);
console.log("APPLIED CAL_WINDOW_v1");
console.log("  calendar now starts at midnight today — past meetings no longer vanish");
console.log("  day cap 31 -> 62, top 50 -> 200, cancelled events filtered out");
console.log("  Teams join URLs now returned, so JOIN buttons work");
console.log("  NEXT: npx wrangler deploy");
