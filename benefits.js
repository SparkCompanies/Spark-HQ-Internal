/* BENEFITS_v1.2 — Benefits & PTO tab + Admin > Benefits & PTO editor
   Loaded into the HQ shell by spark-home.html (same path as my-links.js, viewas.js, access.js and traffic.js;
   index.html is too large to edit on github.com). Nothing in index.html changes.

   What it adds
     • Sidebar tab "Benefits & PTO" (after Career Paths) — baseline for every signed-in team member, no toggle.
     • The tab: PTO accrual tiers + a personal accrual estimator, paid holidays for this year and next, floating
       holidays, other leave (bereavement, parental, jury duty…), the benefits package, helpful links, who to ask.
     • Admin > Content > Benefits & PTO: edit all of the above without a code push. Saved through the worker
       (POST /benefits-info, admins only) into spark_hq_benefits_info; every team member reads GET /benefits-info.
       Until that row exists the tab shows the built-in defaults below (seeded from the Oct 2026 handbook).

   Holiday dates are generated from the rules (last Monday of May, 4th Thursday of November…) and shifted to the
   nearest weekday when they land on a weekend. Any year can be overridden date-by-date in the editor. */
(function () {
  "use strict";
  if (window.__hqBenefits) return;
  window.__hqBenefits = true;

  var WORKER = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var TAB = "benefits";
  var ADMIN_TAB = "benefits-admin";

  /* ---------- built-in defaults (Spark Portfolio Internal Team Member Handbook, Oct 2026) ---------- */
  var DEFAULTS = {
    version: 1,
    intro: "Everything in one place: how PTO accrues, which days are paid holidays, what the benefits package covers, and who to ask. The handbook is still the source of truth if anything here ever differs.",
    pto: {
      tiers: [
        { label: "Less than 1 year", days: 15, hours: 120, perPeriod: 2.31, minYears: 0 },
        { label: "1 to 4 years", days: 20, hours: 160, perPeriod: 3.08, minYears: 1 },
        { label: "4+ years", days: 25, hours: 200, perPeriod: 3.85, minYears: 4 }
      ],
      carryoverHours: 72,
      rules: [
        "PTO covers sick, vacation and personal time. There are no separate buckets.",
        "Accrual is based on the calendar year, not your anniversary date. Your per-pay-period accrual steps up after one year of service.",
        "You can carry up to 72 hours (9 days) of unused PTO into the next calendar year.",
        "PTO does not replace the holiday schedule. Paid holidays are on top of PTO.",
        "In certain circumstances the Company may require you to use accrued PTO during a leave of absence.",
        "Unused PTO is not paid out when employment ends, unless state law requires it."
      ],
      sick: [
        "PTO can be used for your own or a family member's illness, injury, medical care or preventive care, and for the other reasons protected by state sick-time laws.",
        "For a foreseeable need (a scheduled appointment), give as much notice as you can, up to seven days. For an unforeseeable need, tell us as soon as practicable.",
        "Documentation is only requested for absences of more than three consecutive days.",
        "No one is disciplined or retaliated against for using protected sick time. Michigan team members also have Earned Sick Time Act rights (at least 1 hour per 30 worked, up to 72 hours a year; PTO counts toward it)."
      ],
      request: [
        "Clear the dates with your leader first, especially for anything over two days.",
        "Submit the request so it's on the books. Your leader approves it and the hours come out of your PTO.",
        "Add it to your Outlook calendar as Out of Office so the team can see it."
      ],
      requestUrl: "",
      requestLabel: "Request time off",
      balanceUrl: "",
      balanceLabel: "See my PTO balance"
    },
    holidays: {
      paid: ["New Year's Day", "Memorial Day", "4th of July", "Labor Day", "Thanksgiving", "Day after Thanksgiving", "Christmas Eve", "Christmas Day"],
      overrides: {},
      floating: {
        count: 2,
        note: "Two floating holidays each calendar year, for a holiday that's personally meaningful to you from the Company's approved floating holiday list. Unused floating holidays don't carry over and can't be exchanged for pay.",
        list: ["Martin Luther King Jr. Day", "Epiphany", "Orthodox Christmas Day", "Tu BiShvat", "National Freedom Day", "Valentine's Day", "Presidents' Day", "Isra and Mi'raj", "Ash Wednesday", "St. Patrick's Day", "Ramadan (first day)", "Maundy Thursday", "Good Friday", "Easter Sunday", "Easter Monday", "Orthodox Holy Saturday", "Orthodox Easter Monday", "Passover (first day)", "Last Day of Passover", "Yom HaShoah", "Lailat al-Qadr", "Eid al-Fitr", "Tax Day", "Yom Ha'atzmaut", "National Day of Prayer", "Cinco de Mayo", "Pentecost", "Whit Monday", "Shavuot", "D-Day", "Flag Day", "Corpus Christi", "Juneteenth", "Tisha B'Av", "The Prophet's Birthday", "Leif Erikson Day", "Columbus Day", "First Day of Sukkot", "Halloween", "All Saints' Day", "All Souls' Day", "Election Day", "Veterans Day", "Chanukah (first day)", "Last Day of Chanukah", "Kwanzaa (first day)", "Day After Christmas", "New Year's Eve"]
      },
      notes: [
        "Full-time team members (regularly scheduled 30+ hours a week) receive paid holidays.",
        "If payday falls on a Company holiday, you'll usually be paid the business day before.",
        "Religious observance: one paid day each year for team members who need to be away for religious reasons on a regular workday. Request it through your department leader two weeks ahead."
      ]
    },
    leave: [
      { title: "Bereavement", icon: "heart", body: "Up to five paid days for an immediate family member (spouse, child, parent, parent-in-law, stepparent, stepchild, stepsibling, or anyone who stood in the place of a parent). Two paid days for extended family (aunt, uncle, grandparent or grandparent-in-law, grandchild, sibling-in-law, child-in-law)." },
      { title: "Parental leave", icon: "baby", body: "After nine months with the Company. Team member who gave birth: 6 weeks Childbirth Recovery at 100% of base (8 weeks with a certified C-section or complications), then 2 weeks Parental Bonding at 100%, then a 4-week flexible return (3 days remote, 2 in office). Every other new parent (birth, adoption or foster): 2 weeks Parental Bonding at 100%, taken within the first 12 weeks." },
      { title: "Jury duty", icon: "scale", body: "Send TMX a copy of your summons as soon as you get it. Full-time team members are paid the difference between jury pay and regular pay for the first two days (Tennessee: full pay for the whole service after six months). Additional time is granted unpaid and you stay on benefits." },
      { title: "FMLA", icon: "shield", body: "Up to 12 weeks of unpaid, job-protected leave in a 12-month period for your own serious health condition, to care for a spouse, child or parent, or for a birth, adoption or foster placement. Eligible after 12 months and 1,250 hours. Give TMX 30 days' notice when you can." },
      { title: "Military service", icon: "flag", body: "Unpaid military leave as needed to meet service obligations, with advance notice where possible. You may use PTO during military duty but don't have to. Military caregiver (up to 26 weeks) and qualifying exigency leave (up to 12 weeks) are available under FMLA." },
      { title: "Voting and witness", icon: "check", body: "Plan to vote outside work hours when you can; tell your leader ahead if there's a conflict. Tennessee: up to three paid hours when polls aren't open three hours outside your shift. Wisconsin: up to three unpaid hours. Called as a witness? Paid time off to appear." }
    ],
    benefits: {
      planYear: "December 1 to November 30",
      eligibility: "Full-time team members (regularly scheduled 30+ hours a week). Part-time, temporary and seasonal team members aren't eligible for Company-paid benefits except where the law requires it. The 401(k) is open to anyone who works 1,000+ hours in a calendar year, once eligible after one year of service.",
      items: [
        { name: "Medical", icon: "heart", blurb: "Group medical coverage with a Company contribution toward every plan and tier." },
        { name: "Dental", icon: "smile", blurb: "Preventive, basic and major dental coverage." },
        { name: "Vision", icon: "eye", blurb: "Exams, frames, lenses and contacts." },
        { name: "Life insurance", icon: "shield", blurb: "Group life coverage for you, with options to add more." },
        { name: "Short-term disability", icon: "clock", blurb: "Income protection for a short-term illness or injury that keeps you from working." },
        { name: "Long-term disability", icon: "calendar", blurb: "Income protection if a disability lasts beyond the short-term period." },
        { name: "401(k)", icon: "trend", blurb: "Retirement plan with payroll deductions. Eligible after one year of service and 1,000 hours." }
      ],
      notes: [
        "Enrollment happens when you're hired (as you become eligible) and at open enrollment each fall. Mid-year changes need a qualifying life event (marriage, birth, loss of other coverage).",
        "Voluntary deductions for benefits and retirement only come out of your pay with your written authorization.",
        "COBRA: if your employment ends or your hours drop, you and your covered dependents can usually continue group health coverage for up to 18 months at your own cost."
      ],
      guideUrl: "",
      guideLabel: "Open the benefits guide",
      medical: {
        carrier: "Priority Health",
        switchDate: "2026-12-01",
        current: { label: "Dec 1, 2025 to Nov 30, 2026", plans: [
          { name: "$3,000 HMO", type: "HMO Traditional", network: "In-network only", ded: "$3,000 / $6,000", oop: "$6,850 / $13,700", coins: "20%", pcp: "$35", spec: "$50", er: "$250", uc: "$75", rx: "$20 / $60 / $80", note: "Lowest deductible of the HMO options; no out-of-network coverage." },
          { name: "$1,500 POS", type: "POS Traditional", network: "In + out of network", ded: "$1,500 / $3,000", oop: "$8,150 / $16,300", coins: "20%", pcp: "$40", spec: "$60", er: "$250", uc: "$60", rx: "$10 / $40 / $80", note: "Lowest deductible overall and you can go out of network (40% after a $3,000 / $6,000 deductible)." },
          { name: "$6,350 HSA", type: "POS with Health Savings Account", network: "In + out of network", ded: "$6,350 / $12,700", oop: "$7,000 / $14,000", coins: "0% after deductible", pcp: "0% after deductible", spec: "0% after deductible", er: "0% after deductible", uc: "0% after deductible", rx: "$0 after deductible", note: "You pay everything up to the deductible, then the plan pays 100% in network. Pairs with a tax-free HSA." }
        ] },
        next: { label: "Dec 1, 2026 to Nov 30, 2027", plans: [
          { name: "$4,000 HMO", type: "HMO Traditional", network: "In-network only", ded: "$4,000 / $8,000", oop: "$9,200 / $18,400", coins: "20%", pcp: "$40", spec: "$55", er: "$250", uc: "$40", rx: "$20 / $60 / $80", note: "No out-of-network coverage. Mail order: 90-day supply at 2.5x the retail copay." },
          { name: "$2,400 POS", type: "POS Traditional", network: "In + out of network", ded: "$2,400 / $4,800", oop: "$10,150 / $20,300", coins: "20%", pcp: "$50", spec: "$65", er: "$250", uc: "$65", rx: "$20 / $60 / $80", note: "Out of network: 40% after a $4,800 / $9,600 deductible. Mail order: 90-day supply at 2x the retail copay." },
          { name: "$7,000 HSA", type: "POS with Health Savings Account", network: "In + out of network", ded: "$7,000 / $14,000", oop: "$8,050 / $16,100", coins: "0% after deductible", pcp: "0% after deductible", spec: "0% after deductible", er: "$250", uc: "0% after deductible", rx: "$20 / $60 / $80 after deductible", note: "Plan pays 100% in network once you meet the deductible. Pairs with a tax-free HSA." }
        ] },
        footnote: "Deductibles and out-of-pocket maximums are shown individual / family, in network, per calendar year. Copays are for in-network care. Rx shows the Tier 1 / 2 / 3 retail copays; specialty tiers are 20% up to a cap. Full details are in the plan summaries."
      },
      other: [
        { name: "Dental", icon: "smile", carrier: "Delta Dental PPO", rows: [["Deductible", "$75 person / $225 family (PPO and Premier); $50 / $150 out of network. Waived for preventive."], ["Annual maximum", "$1,000 per person"], ["Preventive", "Covered in full in the PPO network (exams, cleanings, x-rays)"], ["Basic", "You pay 20% (fillings, scaling); 40% at Premier or out of network"], ["Major", "You pay 50% (crowns, root canals, implants)"], ["Orthodontia", "You pay 50%, adults and children, $1,000 lifetime maximum"]] },
        { name: "Vision", icon: "eye", carrier: "EyeMed, Insight network", rows: [["Eye exam", "$10 copay, once every 12 months"], ["Lenses", "$25 copay (single, bifocal or trifocal), once every 12 months"], ["Frames", "$110 allowance, once every 24 months"], ["Contacts", "$110 allowance instead of lenses and frames; medically necessary contacts covered in full"], ["LASIK", "15% discount"]] },
        { name: "Life and disability", icon: "shield", carrier: "Supplemental coverage, cost by age and amount", rows: [["Supplemental life, you", "Up to $500,000 in $10,000 steps"], ["Supplemental life, spouse", "Up to $500,000 in $5,000 steps"], ["Supplemental life, children", "Up to $10,000 in $2,000 steps"], ["Short-term disability", "Income protection for a short-term illness or injury; voluntary"], ["Long-term disability", "Income protection if a disability lasts beyond the short-term period; voluntary"]] }
      ]
    },
    links: [
      { label: "Team Member Handbook", url: "", blurb: "The full Spark Portfolio Internal Team Member Handbook (TMX SharePoint).", icon: "book" },
      { label: "Pay stubs and W-2s", url: "https://www.greenemployee.com", blurb: "Green Employee portal for pay statements, tax forms and direct deposit.", icon: "dollar" },
      { label: "Benefits guide", url: "", blurb: "This plan year's benefits guide and rates.", icon: "file" },
      { label: "Maven IT support", url: "mailto:support@mavenitinc.com", blurb: "Laptop, email, password and software issues go to Maven.", icon: "laptop" }
    ],
    contacts: [
      { topic: "Benefits and enrollment", name: "Tamika Coleman", email: "tcoleman@sparkcompanies.com", note: "Medical, dental, vision, life, disability, open enrollment" },
      { topic: "PTO and time off", name: "Priyanka Malani", email: "pmalani@sparkcompanies.com", note: "Clear dates with your leader first" },
      { topic: "401(k)", name: "Priyanka Malani", email: "pmalani@sparkcompanies.com", note: "Enrollment, contributions, rollovers" },
      { topic: "Pay, pay stubs and W-2s", name: "Priyanka Malani", email: "pmalani@sparkcompanies.com", note: "Payroll" }
    ],
    source: "Spark Portfolio Internal Team Member Handbook, updated October 2026"
  };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function deepMerge(base, over) {
    if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
    var out = clone(base);
    Object.keys(over).forEach(function (k) { out[k] = (base && typeof base[k] === "object" && !Array.isArray(base[k]) && over[k] && typeof over[k] === "object" && !Array.isArray(over[k])) ? deepMerge(base[k], over[k]) : over[k]; });
    return out;
  }
  function token() { return window.SPARK_SB && window.SPARK_SB.getToken ? window.SPARK_SB.getToken() : Promise.resolve(null); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim()); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmt(d, withYear) { return DAYS[d.getDay()].slice(0, 3) + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + (withYear ? ", " + d.getFullYear() : ""); }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  var ICON = {
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8c-2-3-6-3-6-1s4 1 6 1zm0 0c2-3 6-3 6-1s-4 1-6 1z"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.4-9 9-9 9z"/></svg>',
    baby: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0M12 3c0 2 1.5 2.5 1.5 4"/></svg>',
    scale: '<svg viewBox="0 0 24 24"><path d="M12 3v18M4 7h16M6 7l-3 7a3 3 0 0 0 6 0L6 7zM18 7l-3 7a3 3 0 0 0 6 0l-3-7M8 21h8"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 7"/></svg>',
    smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    trend: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 19a2 2 0 0 1 2-2h14V3H6a2 2 0 0 0-2 2v14zM4 19a2 2 0 0 0 2 2h14v-4"/></svg>',
    dollar: '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6M8 13h8M8 17h8"/></svg>',
    laptop: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 20h20"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    palm: '<svg viewBox="0 0 24 24"><path d="M12 22V9M12 9c-2-4-6-5-9-3 3 0 6 1 9 3zm0 0c2-4 6-5 9-3-3 0-6 1-9 3zm0 0c-3-3-3-7-1-9 1 3 1 6 1 9zm0 0c3-3 3-7 1-9-1 3-1 6-1 9z"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
  };
  function ic(name, cls) { return '<i class="bf-ic' + (cls ? " " + cls : "") + '">' + (ICON[name] || ICON.info) + "</i>"; }

  /* ---------- holiday rules ---------- */
  function nthWeekday(year, month, weekday, n) { var d = new Date(year, month, 1); var off = (weekday - d.getDay() + 7) % 7; return new Date(year, month, 1 + off + (n - 1) * 7); }
  function lastWeekday(year, month, weekday) { var d = new Date(year, month + 1, 0); var off = (d.getDay() - weekday + 7) % 7; return new Date(year, month, d.getDate() - off); }
  var RULES = {
    "new year's day": function (y) { return new Date(y, 0, 1); },
    "memorial day": function (y) { return lastWeekday(y, 4, 1); },
    "4th of july": function (y) { return new Date(y, 6, 4); },
    "independence day": function (y) { return new Date(y, 6, 4); },
    "labor day": function (y) { return nthWeekday(y, 8, 1, 1); },
    "thanksgiving": function (y) { return nthWeekday(y, 10, 4, 4); },
    "day after thanksgiving": function (y) { var t = nthWeekday(y, 10, 4, 4); return new Date(y, 10, t.getDate() + 1); },
    "christmas eve": function (y) { return new Date(y, 11, 24); },
    "christmas day": function (y) { return new Date(y, 11, 25); },
    "christmas": function (y) { return new Date(y, 11, 25); },
    "juneteenth": function (y) { return new Date(y, 5, 19); },
    "mlk day": function (y) { return nthWeekday(y, 0, 1, 3); },
    "presidents' day": function (y) { return nthWeekday(y, 1, 1, 3); },
    "new year's eve": function (y) { return new Date(y, 11, 31); }
  };
  function observed(d) { var day = d.getDay(); if (day === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1); if (day === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return d; }
  function holidaysFor(cfg, year) {
    var over = cfg.overrides && cfg.overrides[String(year)];
    var out = [];
    if (over && over.length) {
      over.forEach(function (h) { var d = parseISO(h.date); if (d) out.push({ name: h.name, date: d, actual: d, custom: true }); });
    } else {
      (cfg.paid || []).forEach(function (name) {
        var rule = RULES[String(name).toLowerCase().replace(/\s+/g, " ").trim()];
        if (!rule) { out.push({ name: name, date: null }); return; }
        var actual = rule(year), obs = observed(actual);
        out.push({ name: name, date: obs, actual: actual });
      });
      // Christmas Eve + Christmas (or any pair) landing on the same observed day: push the earlier one back a day.
      for (var i = 1; i < out.length; i++) for (var j = 0; j < i; j++) if (out[i].date && out[j].date && iso(out[i].date) === iso(out[j].date)) {
        var e = out[i].actual < out[j].actual ? out[i] : out[j];
        e.date = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() - 1);
      }
    }
    out.sort(function (a, b) { return (a.date ? a.date.getTime() : 9e15) - (b.date ? b.date.getTime() : 9e15); });
    return out;
  }
  function nextHoliday(cfg) {
    var t = today(), y = t.getFullYear();
    var all = holidaysFor(cfg, y).concat(holidaysFor(cfg, y + 1));
    for (var i = 0; i < all.length; i++) if (all[i].date && all[i].date >= t) return all[i];
    return null;
  }

  /* ---------- PTO estimator ---------- */
  function tierFor(tiers, years) { var best = tiers[0]; tiers.forEach(function (t) { if (years >= (+t.minYears || 0)) best = t; }); return best; }
  function fridaysBetween(a, b) { var n = 0, d = new Date(a.getFullYear(), a.getMonth(), a.getDate()); while (d <= b) { if (d.getDay() === 5) n++; d.setDate(d.getDate() + 1); } return n; }
  function estimate(pto, start) {
    var t = today(), y = t.getFullYear();
    var jan1 = new Date(y, 0, 1);
    var from = start > jan1 ? start : jan1;
    var yearsAtJan1 = (jan1 - start) / 31557600000;
    var years = (t - start) / 31557600000;
    var tier = tierFor(pto.tiers, years);
    // Pay periods = Fridays elapsed this year since the later of Jan 1 and the start date; the tier steps up on the anniversary.
    var anniv = new Date(start.getFullYear() + Math.ceil(Math.max(0, yearsAtJan1)), start.getMonth(), start.getDate());
    var hours = 0;
    if (anniv > from && anniv <= t) {
      hours = fridaysBetween(from, new Date(anniv.getTime() - 86400000)) * (+tierFor(pto.tiers, (anniv - start) / 31557600000 - 0.01).perPeriod || 0)
        + fridaysBetween(anniv, t) * (+tier.perPeriod || 0);
    } else hours = fridaysBetween(from, t) * (+tier.perPeriod || 0);
    return { tier: tier, years: years, hours: Math.round(hours * 10) / 10, periods: fridaysBetween(from, t) };
  }

  /* ---------- CSS ---------- */
  var NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";
  var CSS = "" +
    /* Baseline for every signed-in team member: outrank the shell's .hide-for-role{display:none!important} for our buttons */
    ".sidebar .nav-item[data-tab=\"" + TAB + "\"].hide-for-role{display:flex!important}" +
    ".admin-subnav-item[data-admin-tab=\"" + ADMIN_TAB + "\"].hide-for-role{display:flex!important}" +
    "#view-" + TAB + "{font-family:Outfit,Inter,system-ui,sans-serif;color:#1a1a2e;background:" +
      "radial-gradient(1200px 500px at 85% -120px,rgba(245,197,24,.14),transparent 60%),radial-gradient(900px 420px at -10% 30%,rgba(200,150,62,.10),transparent 60%),linear-gradient(180deg,#FBFAF6 0%,#F6F3EC 100%)}" +
    ".bf{max-width:1140px;margin:0 auto;padding:28px 32px 80px;position:relative}" +
    ".bf .bf-ic{display:inline-flex;width:18px;height:18px;flex:none;color:inherit}.bf .bf-ic svg,.bfa .bf-ic svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    ".bf-eyebrow{font-size:11px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#B8912E;display:flex;align-items:center;gap:8px}" +
    /* hero */
    ".bf-hero{position:relative;margin-top:14px;border-radius:26px;overflow:hidden;color:#fff;padding:38px 40px 58px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.85fr);gap:32px;align-items:center;isolation:isolate;" +
      "background:linear-gradient(118deg,#141428 0%,#1b1b36 48%,#2a2347 100%);box-shadow:0 40px 80px -36px rgba(20,20,45,.75),0 2px 0 rgba(255,255,255,.06) inset}" +
    ".bf-hero::before{content:'';position:absolute;inset:-40%;z-index:0;background:radial-gradient(closest-side at 22% 30%,rgba(255,212,59,.42),transparent 70%),radial-gradient(closest-side at 80% 110%,rgba(200,150,62,.35),transparent 70%);filter:blur(30px);animation:bfGlow 14s ease-in-out infinite alternate}" +
    ".bf-hero::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.10;mix-blend-mode:overlay;background-image:" + NOISE + "}" +
    ".bf-hero>*{position:relative;z-index:1}" +
    ".bf-hero .bf-ring{position:absolute;right:-120px;top:-160px;width:420px;height:420px;border-radius:50%;border:1px solid rgba(255,212,59,.22);box-shadow:0 0 0 60px rgba(255,212,59,.04),0 0 0 120px rgba(255,212,59,.025);z-index:0;pointer-events:none}" +
    ".bf-hero h1{font-size:38px;line-height:1.06;margin:14px 0 12px;font-weight:800;letter-spacing:-.015em;color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.35)}" +
    ".bf-hero h1 em{font-style:normal;background:linear-gradient(92deg,#FFE57A,#F5C518 60%,#DEBA6F);-webkit-background-clip:text;background-clip:text;color:transparent}" +
    ".bf-hero .bf-dek{color:#cfd0e6;font-size:14.5px;line-height:1.65;max-width:540px}" +
    ".bf-hero .bf-k{font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#FFD43B;display:flex;align-items:center;gap:8px}" +
    ".bf-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.bf-chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;font-size:12px;font-weight:600;color:#e8e8f4;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}.bf-chip .bf-ic{width:14px;height:14px;color:#FFD43B}" +
    ".bf-next{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:20px 22px 22px;backdrop-filter:blur(10px);box-shadow:0 30px 50px -30px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.18)}" +
    ".bf-next::before{content:'';position:absolute;inset:0;border-radius:20px;padding:1px;background:linear-gradient(140deg,rgba(255,216,79,.65),rgba(255,216,79,0) 45%,rgba(255,216,79,.25));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}" +
    ".bf-next b{display:block;font-size:26px;font-weight:800;margin:10px 0 2px;color:#fff;letter-spacing:-.01em}.bf-next span{display:block;color:#cfd0e6;font-size:13px}" +
    ".bf-next .bf-count{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:999px;background:linear-gradient(180deg,#FFE063,#F0BE12);color:#1a1a2e;font-weight:800;font-size:12px;box-shadow:0 10px 22px -10px rgba(245,197,24,.9),inset 0 1px 0 rgba(255,255,255,.5)}" +
    ".bf-next .bf-big{position:absolute;right:18px;top:14px;font-size:64px;font-weight:800;line-height:1;color:rgba(255,216,79,.10);letter-spacing:-.04em;pointer-events:none}" +
    "@keyframes bfGlow{0%{transform:translate(0,0) scale(1)}100%{transform:translate(4%,6%) scale(1.08)}}" +
    /* stat tiles */
    ".bf-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:-26px 18px 8px;position:relative;z-index:2}" +
    ".bf-tile{position:relative;overflow:hidden;background:linear-gradient(180deg,#fff,#FBFAF6);border:1px solid rgba(255,255,255,.9);border-radius:18px;padding:16px 18px 15px;box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 18px 40px -22px rgba(30,26,10,.45),0 0 0 1px rgba(200,150,62,.12);transition:transform .18s,box-shadow .18s}" +
    ".bf-tile:hover{transform:translateY(-3px);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 26px 46px -22px rgba(30,26,10,.5),0 0 0 1px rgba(200,150,62,.3)}" +
    ".bf-tile::after{content:'';position:absolute;right:-30px;top:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(245,197,24,.28),transparent 70%)}" +
    ".bf-tile b{display:block;font-size:26px;font-weight:800;line-height:1.05;letter-spacing:-.02em}.bf-tile small{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#8a8477;font-weight:700;margin-bottom:7px}.bf-tile span{display:block;font-size:12px;color:#6B675C;margin-top:5px;line-height:1.4}" +
    ".bf-tile .bf-bars{display:flex;gap:3px;align-items:flex-end;height:22px;margin-top:9px}.bf-tile .bf-bars i{flex:1;border-radius:3px 3px 1px 1px;background:linear-gradient(180deg,#e9e3d3,#ddd5c0)}.bf-tile .bf-bars i.on{background:linear-gradient(180deg,#FFE063,#C8963E);box-shadow:0 4px 10px -4px rgba(200,150,62,.8)}" +
    /* sections */
    ".bf-sec{margin-top:44px}.bf-sec-h{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:14px;position:relative}" +
    ".bf-sec-h::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,rgba(200,150,62,.55),rgba(200,150,62,.08) 60%,transparent)}" +
    ".bf-sec h2{margin:6px 0 6px;font-size:24px;font-weight:800;letter-spacing:-.015em;display:flex;align-items:center;gap:12px}" +
    ".bf-sec h2 .bf-md{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#1a1a2e;background:linear-gradient(145deg,#FFE063,#DEBA6F);box-shadow:0 10px 20px -10px rgba(200,150,62,.9),inset 0 1px 0 rgba(255,255,255,.6)}.bf-sec h2 .bf-md .bf-ic{width:19px;height:19px}" +
    ".bf-sec .bf-sub{font-size:13.5px;color:#6B675C;max-width:680px;line-height:1.55}" +
    ".bf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.bf-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}" +
    /* cards */
    ".bf-card{position:relative;background:linear-gradient(180deg,#fff,#FCFBF8);border:1px solid rgba(236,232,222,.9);border-radius:18px;padding:20px 22px;box-shadow:0 1px 0 #fff inset,0 20px 40px -30px rgba(30,26,10,.5);transition:transform .18s,box-shadow .18s}" +
    ".bf-card:hover{transform:translateY(-2px);box-shadow:0 1px 0 #fff inset,0 28px 50px -28px rgba(30,26,10,.55),0 0 0 1px rgba(200,150,62,.25)}" +
    ".bf-card h3{margin:0 0 10px;font-size:15px;font-weight:800;display:flex;align-items:center;gap:10px}" +
    ".bf-card h3 .bf-md{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;color:#8a6a1c;background:linear-gradient(145deg,#FFF4C2,#F3E2A8);box-shadow:inset 0 1px 0 #fff,0 6px 14px -8px rgba(200,150,62,.8)}.bf-card h3 .bf-md .bf-ic{width:16px;height:16px}" +
    ".bf-card p,.bf-card li{font-size:13.5px;line-height:1.6;color:#3d3b35;margin:0}.bf-card ul{margin:0;padding-left:0;list-style:none}.bf-card li{position:relative;padding-left:18px}.bf-card li::before{content:'';position:absolute;left:0;top:9px;width:7px;height:7px;border-radius:50%;background:linear-gradient(145deg,#FFD84F,#C8963E);box-shadow:0 2px 6px -2px rgba(200,150,62,.9)}.bf-card li+li{margin-top:7px}" +
    ".bf-card.dark{background:linear-gradient(150deg,#1b1b36,#141428);border-color:rgba(255,255,255,.08);color:#e8e8f4}.bf-card.dark h3{color:#fff}.bf-card.dark p,.bf-card.dark li{color:#cfd0e6}" +
    /* PTO tiers */
    ".bf-tiers{display:grid;gap:10px}.bf-tier{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:12px 14px;border-radius:14px;border:1px solid #efebe2;background:#fff;transition:background .2s,border-color .2s,transform .2s}" +
    ".bf-tier .bf-no{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-weight:800;font-size:13px;color:#6B675C;background:#F3F0E8}.bf-tier .bf-tl{font-weight:800;font-size:14px}.bf-tier .bf-ts{font-size:12px;color:#6B675C;margin-top:2px}" +
    ".bf-tier .bf-tr{text-align:right}.bf-tier .bf-tr b{display:block;font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:1}.bf-tier .bf-tr span{font-size:11px;color:#6B675C;text-transform:uppercase;letter-spacing:.08em;font-weight:700}" +
    ".bf-tier .bf-bar{grid-column:1/-1;height:6px;border-radius:99px;background:#F1EDE3;overflow:hidden}.bf-tier .bf-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#DEBA6F,#F5C518);box-shadow:0 0 12px rgba(245,197,24,.5)}" +
    ".bf-tier.me{background:linear-gradient(135deg,#1b1b36,#23214a);border-color:transparent;color:#fff;transform:scale(1.015);box-shadow:0 24px 40px -24px rgba(20,20,45,.8)}.bf-tier.me .bf-no{background:linear-gradient(145deg,#FFE063,#DEBA6F);color:#1a1a2e}.bf-tier.me .bf-ts,.bf-tier.me .bf-tr span{color:#cfd0e6}.bf-tier.me .bf-bar{background:rgba(255,255,255,.12)}" +
    /* estimator */
    ".bf-est{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end}.bf-est label{font-size:12px;color:#6B675C;display:block}.bf-est input{display:block;width:100%;margin-top:5px;font:inherit;font-size:14px;padding:10px 12px;border:1px solid #ddd7c8;border-radius:12px;box-sizing:border-box;background:#fff;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)}" +
    ".bf-est-out{margin-top:16px;display:grid;grid-template-columns:118px 1fr;gap:16px;align-items:center;padding:16px;border-radius:16px;background:linear-gradient(160deg,#FAF8F1,#F3EFE4);border:1px solid #ECE6D6;font-size:13.5px;line-height:1.6;box-shadow:inset 0 1px 0 #fff}.bf-est-out b{font-weight:800}.bf-est-out.empty{grid-template-columns:1fr;color:#6B675C}" +
    ".bf-ring{position:relative;width:118px;height:118px}.bf-ring svg{width:100%;height:100%;transform:rotate(-90deg)}.bf-ring .bf-rt{fill:none;stroke:#E8E2D3;stroke-width:10}.bf-ring .bf-rv{fill:none;stroke:url(#bfGold);stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.1s cubic-bezier(.22,.8,.3,1);filter:drop-shadow(0 2px 6px rgba(245,197,24,.55))}" +
    ".bf-ring .bf-rc{position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1}.bf-ring .bf-rc b{display:block;font-size:22px;font-weight:800;letter-spacing:-.02em}.bf-ring .bf-rc small{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a8477;font-weight:700;margin-top:3px}" +
    /* steps */
    ".bf-steps{counter-reset:s;list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.bf-steps li{counter-increment:s;position:relative;padding:18px 18px 16px 18px;font-size:13.5px;line-height:1.55;color:#3d3b35;border-radius:14px;background:#fff;border:1px solid #efebe2;box-shadow:0 14px 30px -26px rgba(30,26,10,.6)}" +
    ".bf-steps li::before{content:counter(s);display:grid;place-items:center;width:30px;height:30px;margin-bottom:10px;border-radius:10px;font-weight:800;font-size:13px;color:#1a1a2e;background:linear-gradient(145deg,#FFE063,#F0BE12);box-shadow:0 10px 18px -10px rgba(245,197,24,1),inset 0 1px 0 rgba(255,255,255,.6)}" +
    /* buttons */
    ".bf-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:13px;font:700 13px Outfit,Inter,system-ui,sans-serif;border:1px solid #ddd7c8;background:linear-gradient(180deg,#fff,#F8F6F0);color:#1a1a2e;cursor:pointer;text-decoration:none;box-shadow:inset 0 1px 0 #fff,0 8px 18px -12px rgba(30,26,10,.6);transition:transform .12s,box-shadow .15s}.bf-btn:hover{transform:translateY(-1px);box-shadow:inset 0 1px 0 #fff,0 14px 26px -14px rgba(30,26,10,.7)}" +
    ".bf-btn.gold{background:linear-gradient(180deg,#FFE063,#F0BE12);border-color:transparent;box-shadow:0 12px 24px -10px rgba(245,197,24,.8),inset 0 1px 0 rgba(255,255,255,.6)}.bf-btn .bf-ic{width:16px;height:16px}" +
    ".bf-yr{display:inline-flex;border:1px solid #ddd7c8;border-radius:999px;overflow:hidden;background:#fff;box-shadow:inset 0 1px 0 #fff,0 6px 14px -10px rgba(30,26,10,.6)}.bf-yr button{font:700 12.5px Outfit,Inter,system-ui,sans-serif;padding:8px 16px;border:0;background:transparent;cursor:pointer;color:#6B675C}.bf-yr button.on{background:linear-gradient(145deg,#1b1b36,#23214a);color:#FFD43B}" +
    /* holidays */
    ".bf-strip{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;margin:4px 0 16px;padding:14px 14px 12px;border-radius:18px;background:linear-gradient(150deg,#1b1b36,#141428);box-shadow:0 30px 50px -34px rgba(20,20,45,.8),inset 0 1px 0 rgba(255,255,255,.06);position:relative;overflow:hidden}" +
    ".bf-strip::after{content:'';position:absolute;inset:0;opacity:.08;mix-blend-mode:overlay;background-image:" + NOISE + ";pointer-events:none}" +
    ".bf-mo{position:relative;z-index:1;text-align:center;padding:8px 2px 6px;border-radius:10px;color:#9a9bb8;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:700}.bf-mo.now{background:rgba(255,216,79,.08);color:#FFD43B;box-shadow:inset 0 0 0 1px rgba(255,216,79,.25)}" +
    ".bf-mo .bf-dots{display:flex;justify-content:center;gap:4px;margin-top:8px;min-height:8px}.bf-mo .bf-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.14)}.bf-mo .bf-dots i.on{background:linear-gradient(145deg,#FFE063,#DEBA6F);box-shadow:0 0 10px rgba(255,216,79,.6)}.bf-mo .bf-dots i.next{box-shadow:0 0 0 3px rgba(255,216,79,.25),0 0 14px rgba(255,216,79,.9);animation:bfPulse 2s infinite}" +
    "@keyframes bfPulse{0%,100%{box-shadow:0 0 0 3px rgba(255,216,79,.25),0 0 14px rgba(255,216,79,.9)}50%{box-shadow:0 0 0 6px rgba(255,216,79,.12),0 0 18px rgba(255,216,79,.7)}}" +
    ".bf-hol{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}" +
    ".bf-hd{position:relative;display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,#fff,#FCFBF8);border:1px solid #efebe2;border-radius:16px;padding:14px 16px;box-shadow:0 1px 0 #fff inset,0 16px 34px -28px rgba(30,26,10,.6);transition:transform .18s,box-shadow .18s}.bf-hd:hover{transform:translateY(-2px)}.bf-hd.past{opacity:.5;filter:saturate(.6)}" +
    ".bf-hd.next{border-color:transparent;background:linear-gradient(150deg,#1b1b36,#23214a);color:#fff;box-shadow:0 26px 44px -26px rgba(20,20,45,.9)}.bf-hd.next .bf-wd{color:#cfd0e6}.bf-hd.next .bf-tag{position:absolute;right:12px;top:10px;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#1a1a2e;background:linear-gradient(180deg,#FFE063,#F0BE12);padding:3px 8px;border-radius:999px}" +
    ".bf-hd .bf-dt{width:50px;height:50px;border-radius:14px;background:linear-gradient(160deg,#23214a,#141428);color:#fff;display:grid;place-items:center;line-height:1;flex:none;box-shadow:0 10px 18px -10px rgba(20,20,45,.9),inset 0 1px 0 rgba(255,255,255,.1)}.bf-hd.next .bf-dt{background:linear-gradient(160deg,#FFE063,#DEBA6F);color:#1a1a2e}.bf-hd .bf-dt b{font-size:18px;font-weight:800;color:#FFD43B}.bf-hd.next .bf-dt b{color:#1a1a2e}.bf-hd .bf-dt small{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;margin-top:3px;opacity:.85}" +
    ".bf-hd .bf-nm{font-weight:800;font-size:13.5px}.bf-hd .bf-wd{font-size:12px;color:#6B675C;margin-top:1px}.bf-hd .bf-obs{font-size:11px;color:#B8912E;font-weight:700;margin-top:2px}.bf-hd.next .bf-obs{color:#FFD43B}" +
    /* links & contacts */
    ".bf-links{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}" +
    ".bf-lk{display:flex;gap:14px;align-items:flex-start;background:linear-gradient(180deg,#fff,#FCFBF8);border:1px solid #efebe2;border-radius:16px;padding:16px 18px;text-decoration:none;color:inherit;box-shadow:0 1px 0 #fff inset,0 16px 34px -28px rgba(30,26,10,.6);transition:transform .15s,box-shadow .18s,border-color .18s}.bf-lk:hover{transform:translateY(-3px);box-shadow:0 1px 0 #fff inset,0 26px 44px -26px rgba(30,26,10,.7),0 0 0 1px rgba(200,150,62,.35)}" +
    ".bf-lk .bf-md{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex:none;color:#1a1a2e;background:linear-gradient(145deg,#FFE063,#DEBA6F);box-shadow:0 10px 20px -10px rgba(200,150,62,1),inset 0 1px 0 rgba(255,255,255,.6)}.bf-lk .bf-md .bf-ic{width:18px;height:18px}.bf-lk b{display:block;font-size:14px}.bf-lk span{display:block;font-size:12.5px;color:#6B675C;margin-top:3px;line-height:1.45}.bf-lk .bf-go{margin-left:auto;align-self:center;color:#B8912E;opacity:0;transform:translateX(-4px);transition:opacity .15s,transform .15s}.bf-lk:hover .bf-go{opacity:1;transform:none}" +
    ".bf-ct{display:flex;gap:14px;align-items:center;background:linear-gradient(180deg,#fff,#FCFBF8);border:1px solid #efebe2;border-radius:16px;padding:14px 16px;box-shadow:0 1px 0 #fff inset,0 16px 34px -28px rgba(30,26,10,.6)}" +
    ".bf-ct .bf-av{position:relative;width:44px;height:44px;border-radius:50%;background:linear-gradient(160deg,#23214a,#141428);color:#FFD43B;display:grid;place-items:center;font-weight:800;font-size:14px;flex:none;box-shadow:0 10px 18px -10px rgba(20,20,45,.9)}.bf-ct .bf-av::after{content:'';position:absolute;inset:-3px;border-radius:50%;padding:2px;background:conic-gradient(from 200deg,#FFE063,#DEBA6F,#FFE063);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}" +
    ".bf-ct .bf-tp{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#8a8477;font-weight:700}.bf-ct b{display:block;font-size:14px;margin-top:1px}.bf-ct a{color:#B8912E;font-size:12.5px;text-decoration:none;font-weight:600}.bf-ct small{display:block;color:#6B675C;font-size:12px;margin-top:1px}" +
    ".bf-foot{margin-top:40px;font-size:12px;color:#6B675C;display:flex;gap:8px;align-items:center;padding-top:16px;border-top:1px solid rgba(200,150,62,.2)}.bf-foot .bf-ic{width:14px;height:14px}" +
    ".bf-loading,.bf-empty{padding:50px 0;text-align:center;color:#6B675C}" +
    "@media(max-width:1000px){.bf-tiles{grid-template-columns:repeat(3,minmax(0,1fr));margin:12px 0 0}.bf-hol{grid-template-columns:repeat(2,minmax(0,1fr))}}" +
    "@media(max-width:820px){.bf{padding:20px 16px 50px}.bf-hero{grid-template-columns:1fr;padding:26px 22px}.bf-hero .bf-ring{display:none}.bf-grid.two{grid-template-columns:1fr}.bf-hero h1{font-size:30px}.bf-est{grid-template-columns:1fr}.bf-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.bf-strip{grid-template-columns:repeat(6,minmax(0,1fr))}.bf-hol{grid-template-columns:1fr}.bf-est-out{grid-template-columns:1fr;justify-items:center;text-align:center}}" +
    "@media(prefers-reduced-motion:reduce){.bf-hero::before,.bf-mo .bf-dots i.next{animation:none}}" +
    /* floating holidays */
    ".bf-float{position:relative;margin-top:14px;border-radius:22px;padding:24px 26px 22px;overflow:hidden;color:#1a1a2e;background:linear-gradient(160deg,#FFF9E3 0%,#FBF3D6 45%,#F6E9C4 100%);border:1px solid rgba(200,150,62,.35);box-shadow:0 30px 60px -36px rgba(120,90,20,.6),inset 0 1px 0 #fff}" +
    ".bf-float::before{content:'';position:absolute;right:-80px;top:-120px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(255,216,79,.55),rgba(255,216,79,0) 68%);pointer-events:none}" +
    ".bf-float::after{content:'';position:absolute;inset:0;opacity:.07;mix-blend-mode:multiply;background-image:" + NOISE + ";pointer-events:none}" +
    ".bf-float>*{position:relative;z-index:1}.bf-float-h{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:16px}.bf-float .bf-k{color:#8a6a1c}.bf-float h3{margin:8px 0 6px;font-size:22px;font-weight:800;letter-spacing:-.015em}.bf-float p{margin:0;font-size:13.5px;line-height:1.55;color:#5c5540;max-width:620px}" +
    ".bf-float-find{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid rgba(200,150,62,.4);border-radius:999px;padding:6px 8px 6px 14px;box-shadow:0 10px 24px -16px rgba(120,90,20,.6);color:#8a6a1c;flex:0 0 auto}.bf-float-find input{border:0;outline:0;font:inherit;font-size:13px;background:transparent;min-width:170px;color:#1a1a2e}.bf-float-find span{font-size:11px;font-weight:800;background:#1a1a2e;color:#FFD43B;border-radius:999px;padding:4px 9px}" +
    ".bf-chips2{display:flex;flex-wrap:wrap;gap:8px}.bf-fchip{display:inline-flex;align-items:center;padding:8px 13px;border-radius:999px;font-size:12.5px;font-weight:600;color:#2b2615;background:linear-gradient(180deg,#fff,#FBF7EA);border:1px solid rgba(200,150,62,.35);box-shadow:0 8px 16px -12px rgba(120,90,20,.7),inset 0 1px 0 #fff;transition:transform .12s,box-shadow .15s}.bf-fchip:hover{transform:translateY(-2px);box-shadow:0 14px 22px -12px rgba(120,90,20,.8),inset 0 1px 0 #fff}" +
    ".bf-float-none{font-size:13px;color:#8a6a1c;padding:10px 0 0}" +
    /* medical plans */
    ".bf-med{position:relative;margin-top:14px;border-radius:22px;padding:24px 26px 22px;overflow:hidden;color:#fff;background:linear-gradient(150deg,#1b1b36 0%,#141428 60%,#1f1a3a 100%);box-shadow:0 36px 70px -36px rgba(20,20,45,.85),inset 0 1px 0 rgba(255,255,255,.06)}" +
    ".bf-med::before{content:'';position:absolute;left:-120px;bottom:-200px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(255,212,59,.22),transparent 68%);filter:blur(20px);pointer-events:none}.bf-med::after{content:'';position:absolute;inset:0;opacity:.08;mix-blend-mode:overlay;background-image:" + NOISE + ";pointer-events:none}.bf-med>*{position:relative;z-index:1}" +
    ".bf-med-h{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-bottom:18px}.bf-med .bf-k{color:#FFD43B}.bf-med h3{margin:8px 0 4px;font-size:22px;font-weight:800;letter-spacing:-.015em;color:#fff}.bf-med-h p{margin:4px 0 0;font-size:13px;color:#cfd0e6}.bf-med-h p b{color:#FFD43B}" +
    ".bf-yr.dark{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.06);box-shadow:none}.bf-yr.dark button{color:#cfd0e6}.bf-yr.dark button.on{background:linear-gradient(180deg,#FFE063,#F0BE12);color:#1a1a2e}" +
    ".bf-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}" +
    ".bf-plan{position:relative;border-radius:18px;padding:18px 18px 16px;background:linear-gradient(170deg,rgba(255,255,255,.10),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 24px 40px -30px rgba(0,0,0,.8);transition:transform .18s}.bf-plan:hover{transform:translateY(-3px)}" +
    ".bf-plan.mid{border-color:rgba(255,216,79,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(255,216,79,.2),0 30px 50px -30px rgba(245,197,24,.45)}" +
    ".bf-plan-nm{font-size:19px;font-weight:800;letter-spacing:-.01em;color:#fff}.bf-plan-ty{font-size:11.5px;color:#b9bad4;margin-top:3px}" +
    ".bf-plan-ded{margin:14px 0 12px;padding:12px 14px;border-radius:14px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08)}.bf-plan-ded small{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#9a9bb8;font-weight:700}.bf-plan-ded b{display:block;font-size:30px;font-weight:800;line-height:1.05;margin-top:4px;background:linear-gradient(92deg,#FFE57A,#F5C518 60%,#DEBA6F);-webkit-background-clip:text;background-clip:text;color:transparent}.bf-plan-ded span{display:block;font-size:11.5px;color:#b9bad4;margin-top:3px}" +
    ".bf-plan dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:7px 12px;font-size:12.5px}.bf-plan dt{color:#b9bad4}.bf-plan dt i{display:block;font-style:normal;font-size:10px;color:#7f80a0}.bf-plan dd{margin:0;text-align:right;font-weight:700;color:#fff}" +
    ".bf-plan-note{margin:12px 0 0;padding-top:10px;border-top:1px solid rgba(255,255,255,.1);font-size:12px;line-height:1.5;color:#cfd0e6}" +
    ".bf-med-foot{display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:11.5px;line-height:1.5;color:#9a9bb8}.bf-med-foot .bf-ic{width:14px;height:14px;margin-top:2px;color:#FFD43B}" +
    ".bf-kv .bf-carrier{font-size:12px;font-weight:700;color:#B8912E;margin:-4px 0 10px}.bf-kv dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:13px}.bf-kv dt{color:#6B675C;font-weight:600;white-space:nowrap}.bf-kv dd{margin:0;color:#3d3b35;line-height:1.5}" +
    "@media(max-width:1000px){.bf-plans{grid-template-columns:1fr}.bf-kv dl{grid-template-columns:1fr}.bf-kv dt{margin-top:4px}}" +
    ".bfa-plans input{min-width:90px;font-size:12px;padding:6px 8px}.bfa-plans td:first-child input{min-width:110px}.bfa-plans td:last-child input{min-width:220px}" +
    /* admin editor */
    ".bfa{font-family:Outfit,Inter,system-ui,sans-serif}.bfa .bf-ic{display:inline-flex;width:16px;height:16px;flex:none}" +
    ".bfa-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 16px}.bfa-bar .sp{flex:1}.bfa-status{font-size:12.5px;color:#6B675C}.bfa-status.bad{color:#b42318}.bfa-status.good{color:#15803d}" +
    ".bfa-sec{background:#fff;border:1px solid #ece8de;border-radius:14px;padding:16px 18px;margin-bottom:14px}.bfa-sec h3{margin:0 0 4px;font-size:15px;font-weight:800;display:flex;align-items:center;gap:8px}.bfa-sec h3 .bf-ic{color:#B8912E}.bfa-sec .hint{font-size:12.5px;color:#6B675C;margin:0 0 12px;line-height:1.45}" +
    ".bfa label{display:block;font-size:12px;color:#6B675C;margin-bottom:10px}.bfa input,.bfa textarea,.bfa select{display:block;width:100%;margin-top:4px;font:inherit;font-size:13px;padding:8px 10px;border:1px solid #ddd7c8;border-radius:8px;box-sizing:border-box;background:#fff}.bfa textarea{min-height:92px;line-height:1.45;resize:vertical}" +
    ".bfa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0 14px}" +
    ".bfa table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:8px}.bfa th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6B675C;padding:6px 6px}.bfa td{padding:4px 6px;vertical-align:top}.bfa td input,.bfa td select{margin:0}" +
    ".bfa-x{background:none;border:0;color:#b42318;cursor:pointer;padding:6px}.bfa-add{display:inline-flex;align-items:center;gap:6px;background:none;border:1px dashed #ddd7c8;border-radius:8px;padding:6px 10px;font:600 12px Outfit,Inter,system-ui,sans-serif;color:#6B675C;cursor:pointer}" +
    ".bfa-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:10px;font:700 12.5px Outfit,Inter,system-ui,sans-serif;border:1px solid #ddd7c8;background:#fff;color:#1a1a2e;cursor:pointer}.bfa-btn.gold{background:linear-gradient(180deg,#FFD84F,#F0BE12);border-color:transparent}.bfa-btn[disabled]{opacity:.5;cursor:default}";

  function injectCss() { if (document.getElementById("benefitsCss")) return; var s = document.createElement("style"); s.id = "benefitsCss"; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- data ---------- */
  var DATA = null, META = null, loadedAt = 0, loading = null;
  function load(force) {
    if (!force && DATA && Date.now() - loadedAt < 5 * 60 * 1000) return Promise.resolve(DATA);
    if (loading) return loading;
    loading = token().then(function (tok) {
      return fetch(WORKER + "/benefits-info", { headers: tok ? { Authorization: "Bearer " + tok } : {} }).then(function (r) { return r.json(); });
    }).then(function (j) {
      META = j || {};
      DATA = (j && j.data) ? deepMerge(DEFAULTS, j.data) : clone(DEFAULTS);
      loadedAt = Date.now(); loading = null; return DATA;
    }).catch(function () { DATA = clone(DEFAULTS); META = { offline: true }; loadedAt = Date.now(); loading = null; return DATA; });
    return loading;
  }
  function save(data) {
    return token().then(function (tok) {
      if (!tok) throw new Error("Not signed in");
      return fetch(WORKER + "/benefits-info", { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify({ data: data }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || ("HTTP " + r.status)); return j; }); });
    });
  }

  /* ---------- the tab ---------- */
  var year = today().getFullYear();
  function initials(n) { return String(n || "?").split(/[\s._-]+/).map(function (s) { return s.charAt(0); }).join("").slice(0, 2).toUpperCase(); }
  function list(items) { return "<ul>" + (items || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>"; }

  function md(name) { return '<span class="bf-md">' + ic(name) + '</span>'; }
  var medYear = null; // "current" | "next", null = decide from the switch date
  function renderMedical(m) {
    if (!m || !m.current || !(m.current.plans || []).length) return "";
    var sw = parseISO(m.switchDate), hasNext = m.next && (m.next.plans || []).length;
    var autoNext = !!(sw && today() >= sw && hasNext);
    var which = medYear || (autoNext ? "next" : "current");
    if (which === "next" && !hasNext) which = "current";
    var set = m[which], daysToSwitch = sw ? Math.round((sw - today()) / 86400000) : null;
    var ROWS = [["ded", "Deductible", "individual / family"], ["oop", "Out-of-pocket max", "individual / family"], ["coins", "Coinsurance", "your share after deductible"], ["pcp", "Primary care visit"], ["spec", "Specialist visit"], ["uc", "Urgent care"], ["er", "Emergency room"], ["rx", "Prescriptions", "tier 1 / 2 / 3 retail"]];
    var html = '<div class="bf-med"><div class="bf-med-h"><div><div class="bf-k">' + ic("heart") + 'Medical plans · ' + esc(m.carrier || "") + '</div><h3>' + (which === "next" ? "Starting " + esc(m.next.label) : "Plan year " + esc(set.label)) + '</h3>' +
      (which === "current" && hasNext && daysToSwitch != null && daysToSwitch > 0 && daysToSwitch < 120 ? '<p>New plan designs start in <b>' + daysToSwitch + ' days</b>. Flip the toggle to preview them before open enrollment.</p>' : '') + '</div>' +
      (hasNext ? '<div class="bf-yr dark"><button data-med="current" class="' + (which === "current" ? "on" : "") + '">Current</button><button data-med="next" class="' + (which === "next" ? "on" : "") + '">From ' + esc((m.next.label || "").split(" to ")[0]) + '</button></div>' : '') + '</div>' +
      '<div class="bf-plans">' + (set.plans || []).map(function (p, i) {
        return '<div class="bf-plan' + (i === 1 ? " mid" : "") + '"><div class="bf-plan-top"><div class="bf-plan-nm">' + esc(p.name) + '</div><div class="bf-plan-ty">' + esc(p.type) + (p.network ? ' · ' + esc(p.network) : '') + '</div></div>' +
          '<div class="bf-plan-ded"><small>Deductible</small><b>' + esc((p.ded || "").split("/")[0].trim()) + '</b><span>' + esc(p.ded) + '</span></div>' +
          '<dl>' + ROWS.slice(1).map(function (r) { return p[r[0]] ? '<dt>' + r[1] + (r[2] ? '<i>' + r[2] + '</i>' : '') + '</dt><dd>' + esc(p[r[0]]) + '</dd>' : ''; }).join("") + '</dl>' +
          (p.note ? '<p class="bf-plan-note">' + esc(p.note) + '</p>' : '') + '</div>';
      }).join("") + '</div>' + (m.footnote ? '<div class="bf-med-foot">' + ic("info") + esc(m.footnote) + '</div>' : '') + '</div>';
    return html;
  }
  function renderTab() {
    var root = document.getElementById("bfRoot"); if (!root) return;
    var d = DATA; if (!d) { root.innerHTML = '<div class="bf-loading">Loading…</div>'; return; }
    var t = today(), nh = nextHoliday(d.holidays);
    var daysTo = nh ? Math.round((nh.date - t) / 86400000) : null;
    var tiers = d.pto.tiers || [];
    var maxDays = Math.max.apply(null, tiers.map(function (x) { return +x.days || 0; }).concat([1]));
    var hols = holidaysFor(d.holidays, year);
    var nhKey = nh && nh.date ? iso(nh.date) : "";
    var savedStart = ""; try { savedStart = localStorage.getItem("hq_bf_start") || ""; } catch (e) {}
    var paidCount = (d.holidays.paid || []).length, floatCount = d.holidays.floating.count || 0;

    var html = '<div class="bf">' +
      '<div class="bf-eyebrow">' + ic("gift") + 'Benefits &amp; PTO</div>' +
      /* hero */
      '<div class="bf-hero"><div class="bf-ring"></div><div><div class="bf-k">' + ic("sun") + 'For every team member</div><h1>Time off, holidays and benefits, <em>in one place.</em></h1><div class="bf-dek">' + esc(d.intro) + '</div>' +
        '<div class="bf-chips"><span class="bf-chip">' + ic("palm") + 'Up to ' + esc(maxDays) + ' PTO days a year</span><span class="bf-chip">' + ic("sun") + paidCount + ' paid holidays + ' + floatCount + ' floating</span><span class="bf-chip">' + ic("heart") + 'Medical, dental, vision &amp; more</span></div></div>' +
        '<div class="bf-next">' + (nh && daysTo != null ? '<div class="bf-big">' + daysTo + '</div>' : '') + '<div class="bf-k">' + ic("calendar") + 'Next paid holiday</div>' +
          (nh ? '<b>' + esc(nh.name) + '</b><span>' + fmt(nh.date, true) + (nh.actual && iso(nh.actual) !== iso(nh.date) ? ' (observed)' : '') + '</span><span class="bf-count">' + ic("clock") + (daysTo === 0 ? "Today" : daysTo === 1 ? "Tomorrow" : daysTo + " days away") + '</span>' : '<b>Set in Admin</b>') +
        '</div></div>' +
      /* stat tiles */
      '<div class="bf-tiles">' +
        tiers.map(function (tr, i) { return '<div class="bf-tile"><small>' + esc(tr.label) + '</small><b>' + esc(tr.days) + ' days</b><span>' + esc(tr.hours) + ' hrs a year · ' + esc(tr.perPeriod) + ' hrs per paycheck</span><div class="bf-bars">' + tiers.map(function (_, j) { return '<i class="' + (j <= i ? "on" : "") + '" style="height:' + (40 + Math.round(60 * (+tiers[j].days || 0) / maxDays)) + '%"></i>'; }).join("") + '</div></div>'; }).join("") +
        '<div class="bf-tile"><small>Carryover</small><b>' + esc(d.pto.carryoverHours) + ' hrs</b><span>up to ' + Math.round(d.pto.carryoverHours / 8) + ' days into next year</span></div>' +
        '<div class="bf-tile"><small>Paid holidays</small><b>' + paidCount + ' + ' + floatCount + '</b><span>company holidays + floating</span></div>' +
      '</div>';

    /* PTO */
    html += '<div class="bf-sec"><div class="bf-sec-h"><div><div class="bf-eyebrow">Paid time off</div><h2>' + md("palm") + 'How PTO accrues</h2><div class="bf-sub">One bucket for sick, vacation and personal time. Your rate is set by years of service and lands with every weekly paycheck.</div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (d.pto.balanceUrl ? '<a class="bf-btn" target="_blank" rel="noopener" href="' + esc(d.pto.balanceUrl) + '">' + ic("eye") + esc(d.pto.balanceLabel || "See my balance") + '</a>' : '') + (d.pto.requestUrl ? '<a class="bf-btn gold" target="_blank" rel="noopener" href="' + esc(d.pto.requestUrl) + '">' + ic("calendar") + esc(d.pto.requestLabel || "Request time off") + '</a>' : '') + '</div></div>' +
      '<div class="bf-grid two">' +
        '<div class="bf-card"><h3>' + md("trend") + 'Accrual by years of service</h3><div class="bf-tiers" id="bfTierBody">' +
          tiers.map(function (tr, i) { return '<div class="bf-tier" data-i="' + i + '"><div class="bf-no">' + (i + 1) + '</div><div><div class="bf-tl">' + esc(tr.label) + '</div><div class="bf-ts">' + esc(tr.hours) + ' hours a year · ' + esc(tr.perPeriod) + ' hrs every paycheck</div></div><div class="bf-tr"><b>' + esc(tr.days) + '</b><span>days</span></div><div class="bf-bar"><i style="width:' + Math.round(100 * (+tr.days || 0) / maxDays) + '%"></i></div></div>'; }).join("") +
          '</div></div>' +
        '<div class="bf-card"><h3>' + md("clock") + 'Estimate what you\'ve accrued this year</h3><div class="bf-est"><label>Your start date<input type="date" id="bfStart" value="' + esc(savedStart) + '"></label><button class="bf-btn gold" id="bfEstBtn">' + ic("arrow") + 'Estimate</button></div><div class="bf-est-out empty" id="bfEstOut">Enter your start date to see your tier and a rough year-to-date accrual. It\'s an estimate, not your balance; what you\'ve used isn\'t subtracted' + (d.pto.balanceUrl ? ', and your real balance lives in the payroll portal' : '') + '.</div></div>' +
        '<div class="bf-card"><h3>' + md("check") + 'The rules</h3>' + list(d.pto.rules) + '</div>' +
        '<div class="bf-card"><h3>' + md("heart") + 'Using PTO when you\'re sick</h3>' + list(d.pto.sick) + '</div>' +
      '</div>' +
      '<div style="margin-top:14px"><div class="bf-eyebrow" style="margin:10px 0 10px">How to request time off</div><ol class="bf-steps">' + (d.pto.request || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ol></div></div>';

    /* Holidays */
    var byMonth = {}; hols.forEach(function (h) { if (h.date) { var m = h.date.getMonth(); (byMonth[m] = byMonth[m] || []).push(h); } });
    html += '<div class="bf-sec"><div class="bf-sec-h"><div><div class="bf-eyebrow">Holidays</div><h2>' + md("sun") + 'Paid holidays ' + year + '</h2><div class="bf-sub">Full-time team members get these days paid. When a holiday lands on a weekend it\'s observed on the nearest weekday.</div></div>' +
      '<div class="bf-yr"><button data-y="' + t.getFullYear() + '" class="' + (year === t.getFullYear() ? "on" : "") + '">' + t.getFullYear() + '</button><button data-y="' + (t.getFullYear() + 1) + '" class="' + (year === t.getFullYear() + 1 ? "on" : "") + '">' + (t.getFullYear() + 1) + '</button></div></div>' +
      '<div class="bf-strip">' + MONTHS.map(function (m, i) { var hs = byMonth[i] || []; return '<div class="bf-mo' + (year === t.getFullYear() && i === t.getMonth() ? " now" : "") + '" title="' + esc(hs.map(function (h) { return h.name; }).join(", ")) + '">' + m + '<div class="bf-dots">' + hs.map(function (h) { return '<i class="on' + (iso(h.date) === nhKey ? " next" : "") + '"></i>'; }).join("") + '</div></div>'; }).join("") + '</div>' +
      '<div class="bf-hol">' + hols.map(function (h) {
        if (!h.date) return '<div class="bf-hd"><div class="bf-dt"><b>?</b></div><div><div class="bf-nm">' + esc(h.name) + '</div><div class="bf-wd">Date set in Admin</div></div></div>';
        var past = h.date < t, obs = h.actual && iso(h.actual) !== iso(h.date), isNext = iso(h.date) === nhKey;
        return '<div class="bf-hd' + (past ? " past" : "") + (isNext ? " next" : "") + '">' + (isNext ? '<span class="bf-tag">Up next</span>' : '') + '<div class="bf-dt"><b>' + h.date.getDate() + '</b><small>' + MONTHS[h.date.getMonth()] + '</small></div><div><div class="bf-nm">' + esc(h.name) + '</div><div class="bf-wd">' + DAYS[h.date.getDay()] + '</div>' + (obs ? '<div class="bf-obs">Observed · falls on ' + DAYS[h.actual.getDay()].slice(0, 3) + ' ' + MONTHS[h.actual.getMonth()] + ' ' + h.actual.getDate() + '</div>' : '') + '</div></div>';
      }).join("") + '</div>' +
      '<div class="bf-card" style="margin-top:14px"><h3>' + md("info") + 'Good to know</h3>' + list(d.holidays.notes) + '</div>' +
      /* floating holidays */
      '<div class="bf-float"><div class="bf-float-h"><div><div class="bf-k">' + ic("gift") + 'Floating holidays</div><h3>' + floatCount + ' days a year, your pick.</h3><p>' + esc(d.holidays.floating.note) + '</p></div>' +
        ((d.holidays.floating.list || []).length ? '<div class="bf-float-find">' + ic("search") + '<input type="search" id="bfFloatFind" placeholder="Find a holiday" aria-label="Find a floating holiday"><span id="bfFloatCount">' + d.holidays.floating.list.length + '</span></div>' : '') + '</div>' +
        ((d.holidays.floating.list || []).length ? '<div class="bf-chips2" id="bfFloatList">' + d.holidays.floating.list.map(function (h) { return '<span class="bf-fchip">' + esc(h) + '</span>'; }).join("") + '</div><div class="bf-float-none" id="bfFloatNone" style="display:none">Nothing on the list matches. Ask TMX if you think it should be added.</div>' : '<div class="bf-float-none">The approved list will show here once it\'s added in Admin.</div>') +
      '</div></div>';

    /* Other leave */
    html += '<div class="bf-sec"><div class="bf-sec-h"><div><div class="bf-eyebrow">Other leave</div><h2>' + md("shield") + 'When life happens</h2><div class="bf-sub">Paid and protected time beyond PTO. TMX helps with the paperwork for any of these.</div></div></div>' +
      '<div class="bf-grid">' + (d.leave || []).map(function (l) { return '<div class="bf-card"><h3>' + md(l.icon || "info") + esc(l.title) + '</h3><p>' + esc(l.body) + '</p></div>'; }).join("") + '</div></div>';

    /* Benefits */
    html += '<div class="bf-sec"><div class="bf-sec-h"><div><div class="bf-eyebrow">Benefits</div><h2>' + md("heart") + 'The benefits package</h2><div class="bf-sub">Plan year ' + esc(d.benefits.planYear) + '. ' + esc(d.benefits.eligibility) + '</div></div>' +
      (d.benefits.guideUrl ? '<a class="bf-btn gold" target="_blank" rel="noopener" href="' + esc(d.benefits.guideUrl) + '">' + ic("file") + esc(d.benefits.guideLabel || "Benefits guide") + '</a>' : '') + '</div>' +
      '<div class="bf-grid">' + (d.benefits.items || []).map(function (b) { return '<div class="bf-card"><h3>' + md(b.icon || "check") + esc(b.name) + '</h3><p>' + esc(b.blurb) + '</p></div>'; }).join("") + '</div>' +
      renderMedical(d.benefits.medical) +
      '<div class="bf-grid" style="margin-top:14px">' + (d.benefits.other || []).map(function (o) { return '<div class="bf-card bf-kv"><h3>' + md(o.icon || "check") + esc(o.name) + '</h3>' + (o.carrier ? '<div class="bf-carrier">' + esc(o.carrier) + '</div>' : '') + '<dl>' + (o.rows || []).map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join("") + '</dl></div>'; }).join("") + '</div>' +
      '<div class="bf-card dark" style="margin-top:14px"><h3>' + md("info") + 'Enrollment and changes</h3>' + list(d.benefits.notes) + '</div></div>';

    /* Links */
    var links = (d.links || []).filter(function (l) { return l.url; });
    if (links.length) html += '<div class="bf-sec"><div class="bf-sec-h"><div><div class="bf-eyebrow">Helpful links</div><h2>' + md("link") + 'Where things live</h2></div></div><div class="bf-links">' +
      links.map(function (l) { return '<a class="bf-lk" target="_blank" rel="noopener" href="' + esc(l.url) + '">' + md(l.icon || "link") + '<div><b>' + esc(l.label) + '</b><span>' + esc(l.blurb) + '</span></div><span class="bf-go">' + ic("arrow") + '</span></a>'; }).join("") + '</div></div>';

    /* Contacts */
    html += '<div class="bf-sec"><div class="bf-sec-h"><div><div class="bf-eyebrow">Who to ask</div><h2>' + md("user") + 'Questions go to</h2></div></div><div class="bf-links">' +
      (d.contacts || []).map(function (c) { return '<div class="bf-ct"><div class="bf-av">' + esc(initials(c.name)) + '</div><div><div class="bf-tp">' + esc(c.topic) + '</div><b>' + esc(c.name) + '</b>' + (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '') + (c.note ? '<small>' + esc(c.note) + '</small>' : '') + '</div></div>'; }).join("") + '</div></div>';

    html += '<div class="bf-foot">' + ic("book") + 'Source: ' + esc(d.source) + (META && META.updated_at ? ' · Last updated in HQ ' + new Date(META.updated_at).toLocaleDateString() : '') + '. If anything here differs from the handbook, the handbook wins.</div></div>';
    root.innerHTML = html;

    root.querySelectorAll(".bf-yr button[data-y]").forEach(function (b) { b.addEventListener("click", function () { year = +b.getAttribute("data-y"); renderTab(); }); });
    root.querySelectorAll(".bf-yr button[data-med]").forEach(function (b) { b.addEventListener("click", function () { medYear = b.getAttribute("data-med"); var y = window.scrollY; renderTab(); window.scrollTo(0, y); }); });
    var ff = root.querySelector("#bfFloatFind");
    if (ff) ff.addEventListener("input", function () {
      var q = ff.value.toLowerCase().trim(), n = 0;
      root.querySelectorAll("#bfFloatList .bf-fchip").forEach(function (c) { var on = !q || c.textContent.toLowerCase().indexOf(q) >= 0; c.style.display = on ? "" : "none"; if (on) n++; });
      root.querySelector("#bfFloatCount").textContent = n; root.querySelector("#bfFloatNone").style.display = n ? "none" : "";
    });
    var go = function () {
      var v = root.querySelector("#bfStart").value, st = parseISO(v), out = root.querySelector("#bfEstOut");
      if (!st) { out.className = "bf-est-out empty"; out.innerHTML = "Pick your start date first."; return; }
      try { localStorage.setItem("hq_bf_start", v); } catch (e) {}
      var e = estimate(d.pto, st);
      root.querySelectorAll("#bfTierBody .bf-tier").forEach(function (tr) { tr.classList.toggle("me", tiers[+tr.getAttribute("data-i")] === e.tier); });
      var yrs = Math.floor(e.years), mos = Math.floor((e.years - yrs) * 12);
      var pct = Math.max(0, Math.min(1, e.hours / (+e.tier.hours || 1))), C = 2 * Math.PI * 50;
      out.className = "bf-est-out";
      out.innerHTML = '<div class="bf-ring"><svg viewBox="0 0 118 118"><defs><linearGradient id="bfGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE063"/><stop offset="1" stop-color="#C8963E"/></linearGradient></defs><circle class="bf-rt" cx="59" cy="59" r="50"/><circle class="bf-rv" cx="59" cy="59" r="50" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/></svg><div class="bf-rc"><div><b>' + e.hours + '</b><small>hrs so far</small></div></div></div>' +
        '<div>You\'ve been with Spark <b>' + yrs + ' year' + (yrs === 1 ? "" : "s") + (mos ? ", " + mos + " month" + (mos === 1 ? "" : "s") : "") + '</b>, so you\'re in the <b>' + esc(e.tier.label) + '</b> tier: <b>' + esc(e.tier.days) + ' days</b> (' + esc(e.tier.hours) + ' hours) a year, <b>' + esc(e.tier.perPeriod) + ' hours</b> each paycheck. ' +
        'Across the <b>' + e.periods + '</b> paychecks so far in ' + t.getFullYear() + ', that\'s roughly <b>' + e.hours + ' hours</b> (' + (Math.round(e.hours / 8 * 10) / 10) + ' days), about ' + Math.round(pct * 100) + '% of the year\'s accrual, before anything you\'ve used or carried over.</div>';
      var rv = out.querySelector(".bf-rv"); if (rv) requestAnimationFrame(function () { rv.style.strokeDashoffset = (C * (1 - pct)).toFixed(1); });
    };
    root.querySelector("#bfEstBtn").addEventListener("click", go);
    root.querySelector("#bfStart").addEventListener("keydown", function (ev) { if (ev.key === "Enter") go(); });
    if (savedStart) go();
  }
  function openTab() {
    document.querySelectorAll(".nav-item").forEach(function (b) { b.classList.remove("active"); });
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]'); if (btn) btn.classList.add("active");
    var v = document.getElementById("view-" + TAB);
    // Hide every sibling view (Home isn't a .tab-page, so go by id), then show ours.
    if (v && v.parentNode) Array.prototype.forEach.call(v.parentNode.children, function (p) { if (p !== v && /^view-/.test(p.id || "")) p.style.display = "none"; });
    document.querySelectorAll(".tab-page").forEach(function (p) { if (p !== v) p.style.display = "none"; });
    if (v) v.style.display = "";
    try { window.scrollTo(0, 0); } catch (e) {}
    load().then(renderTab);
  }

  var NAV_HTML = '<span class="ico"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8c-2-3-6-3-6-1s4 1 6 1zm0 0c2-3 6-3 6-1s-4 1-6 1z"/></svg></span>Benefits &amp; PTO';
  var DIAG = [];
  function diag(msg) { DIAG.push(new Date().toISOString().slice(11, 19) + " " + msg); if (DIAG.length > 40) DIAG.shift(); try { console.info("[benefits] " + msg); } catch (e) {} }
  function placeNav() {
    var after = document.querySelector('.nav-item[data-tab="careers"]') || document.querySelector('.nav-item[data-tab="people"]') || document.querySelector('.nav-item[data-tab="training"]');
    var nav = after ? after.parentNode : document.querySelector(".sidebar nav, .sidebar");
    if (!nav) return null;
    var btn = document.createElement("button");
    btn.className = "nav-item"; btn.setAttribute("data-tab", TAB); btn.innerHTML = NAV_HTML;
    if (after && after.nextSibling) nav.insertBefore(btn, after.nextSibling); else nav.appendChild(btn);
    btn.addEventListener("click", openTab);
    // Baseline for everyone: the shell's role enforcement hides nav items it doesn't know about. Undo that the moment it happens.
    new MutationObserver(function () { healNav(btn, "observer"); }).observe(btn, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    return btn;
  }
  function healNav(btn, why) {
    // The shell's role enforcement adds .hide-for-role to any nav item it doesn't know about, and it re-runs on every
    // sign-in/role tick. Rather than fight it (remove the class, it comes back, flicker), a stylesheet rule below wins
    // over .hide-for-role for our two buttons. Here we only undo inline hiding.
    var fixed = [];
    if (btn.style.display === "none") { btn.style.display = ""; fixed.push("style"); }
    if (btn.hasAttribute("hidden")) { btn.removeAttribute("hidden"); fixed.push("hidden"); }
    if (fixed.length) diag("nav re-shown (" + fixed.join(",") + ") via " + why);
  }
  function ensureNav() {
    // Self-heal: if anything removes or hides the sidebar button after we mount it, put it back. Checks often for the
    // first 30 s (when sign-in, role enforcement and the View-as picker all run), then every few seconds.
    var btn = document.querySelector('.nav-item[data-tab="' + TAB + '"]');
    if (!btn) { btn = placeNav(); if (btn) diag("nav button was removed from the DOM; re-inserted"); return; }
    if (!btn.parentNode || !document.body.contains(btn)) { btn = placeNav(); if (btn) diag("nav button was detached; re-inserted"); return; }
    healNav(btn, "poll");
    if (getComputedStyle(btn).display === "none") diag("nav button still hidden after heal; parent=" + (btn.parentNode && btn.parentNode.className) + " parentDisplay=" + getComputedStyle(btn.parentNode).display);
  }
  function mountTab() {
    if (document.getElementById("view-" + TAB)) return;
    var btn = placeNav();
    if (!btn) return;

    var view = document.createElement("div");
    view.id = "view-" + TAB; view.className = "tab-page cream"; view.style.display = "none";
    view.innerHTML = '<div id="bfRoot"><div class="bf-loading">Loading…</div></div>';
    var anchor = document.getElementById("view-careers") || document.getElementById("view-admin");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(view, anchor.nextSibling); else document.body.appendChild(view);

    // Other tabs' click handlers only hide the views they know about; hide ours when any other tab is chosen.
    document.addEventListener("click", function (e) {
      var b = e.target && e.target.closest && e.target.closest(".nav-item[data-tab]");
      if (b && b.getAttribute("data-tab") !== TAB) view.style.display = "none";
    }, true);

    var n = 0; var fast = setInterval(function () { ensureNav(); if (++n >= 75) { clearInterval(fast); setInterval(ensureNav, 2500); } }, 400);
  }

  /* ---------- admin editor ---------- */
  var ED = null; // working copy
  function lines(v) { return String(v || "").split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function field(label, id, val, ph) { return '<label>' + esc(label) + '<input id="' + id + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>'; }
  function area(label, id, val, hint) { return '<label>' + esc(label) + (hint ? ' <span style="color:#9a9589">· ' + esc(hint) + '</span>' : '') + '<textarea id="' + id + '">' + esc(Array.isArray(val) ? val.join("\n") : val) + '</textarea></label>'; }
  function iconSel(id, val) { return '<select id="' + id + '">' + Object.keys(ICON).filter(function (k) { return ["save", "refresh", "plus", "trash", "arrow"].indexOf(k) < 0; }).map(function (k) { return '<option' + (k === val ? " selected" : "") + '>' + k + '</option>'; }).join("") + '</select>'; }

  function renderEditor() {
    var el = document.querySelector('.admin-pane[data-admin-pane="' + ADMIN_TAB + '"] .bfa-body'); if (!el || !ED) return;
    var d = ED, ty = today().getFullYear();
    var html = '';
    html += '<div class="bfa-sec"><h3>' + ic("info") + 'Intro and source</h3><div class="bfa-grid">' + area("Intro (top of the tab)", "bfa_intro", d.intro) + area("Source line (bottom of the tab)", "bfa_source", d.source) + '</div></div>';

    html += '<div class="bfa-sec"><h3>' + ic("palm") + 'PTO</h3><p class="hint">Tiers are matched by years of service (the smallest "from" that the team member has reached). Hours per paycheck is what shows in the table and drives the estimator.</p>' +
      '<table><thead><tr><th>Label</th><th>From (years)</th><th>Days / yr</th><th>Hours / yr</th><th>Hours per weekly paycheck</th><th></th></tr></thead><tbody>' +
      (d.pto.tiers || []).map(function (t, i) { return '<tr><td><input data-t="' + i + '" data-k="label" value="' + esc(t.label) + '"></td><td><input data-t="' + i + '" data-k="minYears" type="number" step="0.5" value="' + esc(t.minYears) + '"></td><td><input data-t="' + i + '" data-k="days" type="number" value="' + esc(t.days) + '"></td><td><input data-t="' + i + '" data-k="hours" type="number" value="' + esc(t.hours) + '"></td><td><input data-t="' + i + '" data-k="perPeriod" type="number" step="0.01" value="' + esc(t.perPeriod) + '"></td><td><button class="bfa-x" data-del-tier="' + i + '" title="Remove">' + ic("trash") + '</button></td></tr>'; }).join("") +
      '</tbody></table><button class="bfa-add" id="bfaAddTier">' + ic("plus") + 'Add a tier</button>' +
      '<div class="bfa-grid" style="margin-top:14px">' + field("Carryover (hours)", "bfa_carry", d.pto.carryoverHours) + field("\"See my balance\" link (blank hides the button)", "bfa_balUrl", d.pto.balanceUrl, "https://…") + field("Balance button label", "bfa_balLbl", d.pto.balanceLabel) + field("\"Request time off\" link (blank hides the button)", "bfa_reqUrl", d.pto.requestUrl, "https://…") + field("Request button label", "bfa_reqLbl", d.pto.requestLabel) + '</div>' +
      '<div class="bfa-grid">' + area("The rules", "bfa_rules", d.pto.rules, "one per line") + area("Using PTO when sick", "bfa_sick", d.pto.sick, "one per line") + '</div>' + area("How to request time off", "bfa_req", d.pto.request, "one step per line") + '</div>';

    html += '<div class="bfa-sec"><h3>' + ic("sun") + 'Holidays</h3><p class="hint">Dates are worked out from the holiday name (Memorial Day = last Monday in May, Thanksgiving = 4th Thursday, and so on) and moved to the nearest weekday when they fall on a weekend. To set exact dates for a year instead, fill in the override box for that year: one holiday per line as <code>Name | YYYY-MM-DD</code>. Leave it blank to go back to the rules.</p>' +
      '<div class="bfa-grid">' + area("Paid holidays", "bfa_paid", d.holidays.paid, "one per line; names the rules know: " + Object.keys(RULES).join(", ")) +
      area(ty + " dates (override)", "bfa_ov1", (d.holidays.overrides[String(ty)] || []).map(function (h) { return h.name + " | " + h.date; }), "Name | YYYY-MM-DD") +
      area((ty + 1) + " dates (override)", "bfa_ov2", (d.holidays.overrides[String(ty + 1)] || []).map(function (h) { return h.name + " | " + h.date; }), "Name | YYYY-MM-DD") + '</div>' +
      '<div class="bfa-grid">' + field("Floating holidays per year", "bfa_flCount", d.holidays.floating.count) + area("Approved floating holiday list", "bfa_flList", d.holidays.floating.list, "one per line; optional") + '</div>' +
      area("Floating holiday note", "bfa_flNote", d.holidays.floating.note) + area("Good to know", "bfa_holNotes", d.holidays.notes, "one per line") + '</div>';

    html += '<div class="bfa-sec"><h3>' + ic("shield") + 'Other leave</h3><table><thead><tr><th style="width:22%">Title</th><th style="width:12%">Icon</th><th>Text</th><th></th></tr></thead><tbody>' +
      (d.leave || []).map(function (l, i) { return '<tr><td><input data-l="' + i + '" data-k="title" value="' + esc(l.title) + '"></td><td>' + iconSel("bfa_lic" + i, l.icon) + '</td><td><textarea data-l="' + i + '" data-k="body" style="min-height:64px">' + esc(l.body) + '</textarea></td><td><button class="bfa-x" data-del-leave="' + i + '">' + ic("trash") + '</button></td></tr>'; }).join("") +
      '</tbody></table><button class="bfa-add" id="bfaAddLeave">' + ic("plus") + 'Add a leave type</button></div>';

    html += '<div class="bfa-sec"><h3>' + ic("heart") + 'Benefits</h3><div class="bfa-grid">' + field("Plan year", "bfa_planYear", d.benefits.planYear) + field("Benefits guide link (blank hides the button)", "bfa_guideUrl", d.benefits.guideUrl, "https://…") + field("Guide button label", "bfa_guideLbl", d.benefits.guideLabel) + '</div>' + area("Eligibility", "bfa_elig", d.benefits.eligibility) +
      '<table><thead><tr><th style="width:22%">Benefit</th><th style="width:12%">Icon</th><th>One-liner</th><th></th></tr></thead><tbody>' +
      (d.benefits.items || []).map(function (b, i) { return '<tr><td><input data-b="' + i + '" data-k="name" value="' + esc(b.name) + '"></td><td>' + iconSel("bfa_bic" + i, b.icon) + '</td><td><input data-b="' + i + '" data-k="blurb" value="' + esc(b.blurb) + '"></td><td><button class="bfa-x" data-del-ben="' + i + '">' + ic("trash") + '</button></td></tr>'; }).join("") +
      '</tbody></table><button class="bfa-add" id="bfaAddBen">' + ic("plus") + 'Add a benefit</button>' + area("Enrollment and changes", "bfa_benNotes", d.benefits.notes, "one per line") + '</div>';

    var m = d.benefits.medical || (d.benefits.medical = { carrier: "", switchDate: "", current: { label: "", plans: [] }, next: { label: "", plans: [] }, footnote: "" });
    var PCOLS = [["name", "Plan"], ["type", "Type"], ["network", "Network"], ["ded", "Deductible"], ["oop", "OOP max"], ["coins", "Coinsurance"], ["pcp", "PCP"], ["spec", "Specialist"], ["uc", "Urgent care"], ["er", "ER"], ["rx", "Rx 1/2/3"], ["note", "Note"]];
    var planTable = function (key, set) { return '<table class="bfa-plans"><thead><tr>' + PCOLS.map(function (c) { return '<th>' + c[1] + '</th>'; }).join("") + '<th></th></tr></thead><tbody>' +
      (set.plans || []).map(function (p, i) { return '<tr>' + PCOLS.map(function (c) { return '<td><input data-med="' + key + '" data-i="' + i + '" data-k="' + c[0] + '" value="' + esc(p[c[0]] || "") + '"></td>'; }).join("") + '<td><button class="bfa-x" data-del-plan="' + key + ':' + i + '">' + ic("trash") + '</button></td></tr>'; }).join("") +
      '</tbody></table><button class="bfa-add" data-add-plan="' + key + '">' + ic("plus") + 'Add a plan</button>'; };
    html += '<div class="bfa-sec"><h3>' + ic("heart") + 'Medical plans</h3><p class="hint">Two sets: the plan year in effect now and the one that starts on the switch date. The tab shows the current set until that date, then flips on its own; team members can preview the next set with a toggle. Deductible and OOP max are typed as "individual / family".</p>' +
      '<div class="bfa-grid">' + field("Carrier", "bfa_medCarrier", m.carrier) + field("Switch date (YYYY-MM-DD)", "bfa_medSwitch", m.switchDate, "2026-12-01") + field("Current plan year label", "bfa_medCurLbl", (m.current || {}).label) + field("Next plan year label", "bfa_medNextLbl", (m.next || {}).label) + '</div>' +
      '<div class="hint" style="margin-top:6px"><b>Current plan year</b></div>' + planTable("current", m.current || { plans: [] }) +
      '<div class="hint" style="margin-top:14px"><b>Next plan year</b> (leave empty if not decided yet)</div>' + planTable("next", m.next || { plans: [] }) +
      area("Footnote under the plans", "bfa_medFoot", m.footnote) + '</div>';
    html += '<div class="bfa-sec"><h3>' + ic("smile") + 'Dental, vision, life and disability</h3><p class="hint">One card each. Rows are one per line as <code>Label | Detail</code>.</p>' +
      (d.benefits.other || []).map(function (o, i) { return '<div class="bfa-grid"><div>' + field("Card title", "bfa_oth_name" + i, o.name) + field("Carrier / subtitle", "bfa_oth_carrier" + i, o.carrier) + '<label>Icon ' + iconSel("bfa_oth_icon" + i, o.icon) + '</label></div>' + area("Rows", "bfa_oth_rows" + i, (o.rows || []).map(function (r) { return r[0] + " | " + r[1]; }), "Label | Detail") + '</div><div style="text-align:right;margin:-6px 0 10px"><button class="bfa-x" data-del-oth="' + i + '">' + ic("trash") + ' Remove this card</button></div>'; }).join("") +
      '<button class="bfa-add" id="bfaAddOth">' + ic("plus") + 'Add a card</button></div>';

    html += '<div class="bfa-sec"><h3>' + ic("link") + 'Helpful links</h3><p class="hint">A link with no URL is kept here but hidden on the tab.</p><table><thead><tr><th style="width:22%">Label</th><th style="width:28%">URL</th><th>Blurb</th><th style="width:12%">Icon</th><th></th></tr></thead><tbody>' +
      (d.links || []).map(function (l, i) { return '<tr><td><input data-lk="' + i + '" data-k="label" value="' + esc(l.label) + '"></td><td><input data-lk="' + i + '" data-k="url" value="' + esc(l.url) + '" placeholder="https://…"></td><td><input data-lk="' + i + '" data-k="blurb" value="' + esc(l.blurb) + '"></td><td>' + iconSel("bfa_kic" + i, l.icon) + '</td><td><button class="bfa-x" data-del-link="' + i + '">' + ic("trash") + '</button></td></tr>'; }).join("") +
      '</tbody></table><button class="bfa-add" id="bfaAddLink">' + ic("plus") + 'Add a link</button></div>';

    html += '<div class="bfa-sec"><h3>' + ic("user") + 'Who to ask</h3><table><thead><tr><th>Topic</th><th>Name</th><th>Email</th><th>Note</th><th></th></tr></thead><tbody>' +
      (d.contacts || []).map(function (c, i) { return '<tr><td><input data-c="' + i + '" data-k="topic" value="' + esc(c.topic) + '"></td><td><input data-c="' + i + '" data-k="name" value="' + esc(c.name) + '"></td><td><input data-c="' + i + '" data-k="email" value="' + esc(c.email) + '"></td><td><input data-c="' + i + '" data-k="note" value="' + esc(c.note) + '"></td><td><button class="bfa-x" data-del-ct="' + i + '">' + ic("trash") + '</button></td></tr>'; }).join("") +
      '</tbody></table><button class="bfa-add" id="bfaAddCt">' + ic("plus") + 'Add a contact</button></div>';

    el.innerHTML = html;
    el.querySelector("#bfaAddTier").addEventListener("click", function () { collect(); ED.pto.tiers.push({ label: "", minYears: 0, days: 0, hours: 0, perPeriod: 0 }); renderEditor(); });
    el.querySelector("#bfaAddLeave").addEventListener("click", function () { collect(); ED.leave.push({ title: "", icon: "info", body: "" }); renderEditor(); });
    el.querySelector("#bfaAddBen").addEventListener("click", function () { collect(); ED.benefits.items.push({ name: "", icon: "check", blurb: "" }); renderEditor(); });
    el.querySelector("#bfaAddLink").addEventListener("click", function () { collect(); ED.links.push({ label: "", url: "", blurb: "", icon: "link" }); renderEditor(); });
    el.querySelector("#bfaAddCt").addEventListener("click", function () { collect(); ED.contacts.push({ topic: "", name: "", email: "", note: "" }); renderEditor(); });
    el.querySelectorAll("[data-add-plan]").forEach(function (b) { b.addEventListener("click", function () { collect(); var k = b.getAttribute("data-add-plan"); ED.benefits.medical[k] = ED.benefits.medical[k] || { label: "", plans: [] }; ED.benefits.medical[k].plans.push({ name: "", type: "", network: "", ded: "", oop: "", coins: "", pcp: "", spec: "", uc: "", er: "", rx: "", note: "" }); renderEditor(); }); });
    el.querySelectorAll("[data-del-plan]").forEach(function (b) { b.addEventListener("click", function () { collect(); var p = b.getAttribute("data-del-plan").split(":"); ED.benefits.medical[p[0]].plans.splice(+p[1], 1); renderEditor(); }); });
    el.querySelector("#bfaAddOth").addEventListener("click", function () { collect(); (ED.benefits.other = ED.benefits.other || []).push({ name: "", icon: "check", carrier: "", rows: [] }); renderEditor(); });
    el.querySelectorAll("[data-del-oth]").forEach(function (b) { b.addEventListener("click", function () { collect(); ED.benefits.other.splice(+b.getAttribute("data-del-oth"), 1); renderEditor(); }); });
    el.querySelectorAll("[data-del-tier]").forEach(function (b) { b.addEventListener("click", function () { collect(); ED.pto.tiers.splice(+b.getAttribute("data-del-tier"), 1); renderEditor(); }); });
    el.querySelectorAll("[data-del-leave]").forEach(function (b) { b.addEventListener("click", function () { collect(); ED.leave.splice(+b.getAttribute("data-del-leave"), 1); renderEditor(); }); });
    el.querySelectorAll("[data-del-ben]").forEach(function (b) { b.addEventListener("click", function () { collect(); ED.benefits.items.splice(+b.getAttribute("data-del-ben"), 1); renderEditor(); }); });
    el.querySelectorAll("[data-del-link]").forEach(function (b) { b.addEventListener("click", function () { collect(); ED.links.splice(+b.getAttribute("data-del-link"), 1); renderEditor(); }); });
    el.querySelectorAll("[data-del-ct]").forEach(function (b) { b.addEventListener("click", function () { collect(); ED.contacts.splice(+b.getAttribute("data-del-ct"), 1); renderEditor(); }); });
  }

  function collect() {
    var el = document.querySelector('.admin-pane[data-admin-pane="' + ADMIN_TAB + '"] .bfa-body'); if (!el || !ED) return ED;
    var v = function (id) { var n = el.querySelector("#" + id); return n ? n.value : ""; };
    var d = ED;
    d.intro = v("bfa_intro"); d.source = v("bfa_source");
    el.querySelectorAll("[data-t]").forEach(function (n) { var t = d.pto.tiers[+n.getAttribute("data-t")], k = n.getAttribute("data-k"); if (t) t[k] = (k === "label") ? n.value : (+n.value || 0); });
    d.pto.carryoverHours = +v("bfa_carry") || 0; d.pto.balanceUrl = v("bfa_balUrl").trim(); d.pto.balanceLabel = v("bfa_balLbl"); d.pto.requestUrl = v("bfa_reqUrl").trim(); d.pto.requestLabel = v("bfa_reqLbl");
    d.pto.rules = lines(v("bfa_rules")); d.pto.sick = lines(v("bfa_sick")); d.pto.request = lines(v("bfa_req"));
    d.holidays.paid = lines(v("bfa_paid"));
    var ty = today().getFullYear(), ov = {};
    [["bfa_ov1", ty], ["bfa_ov2", ty + 1]].forEach(function (p) {
      var rows = lines(v(p[0])).map(function (s) { var m = s.split("|"); return { name: (m[0] || "").trim(), date: (m[1] || "").trim() }; }).filter(function (h) { return h.name && parseISO(h.date); });
      if (rows.length) ov[String(p[1])] = rows;
    });
    Object.keys(d.holidays.overrides || {}).forEach(function (y) { if (+y !== ty && +y !== ty + 1) ov[y] = d.holidays.overrides[y]; });
    d.holidays.overrides = ov;
    d.holidays.floating.count = +v("bfa_flCount") || 0; d.holidays.floating.list = lines(v("bfa_flList")); d.holidays.floating.note = v("bfa_flNote"); d.holidays.notes = lines(v("bfa_holNotes"));
    el.querySelectorAll("[data-l]").forEach(function (n) { var l = d.leave[+n.getAttribute("data-l")]; if (l) l[n.getAttribute("data-k")] = n.value; });
    d.leave.forEach(function (l, i) { var s = el.querySelector("#bfa_lic" + i); if (s) l.icon = s.value; });
    d.benefits.planYear = v("bfa_planYear"); d.benefits.guideUrl = v("bfa_guideUrl").trim(); d.benefits.guideLabel = v("bfa_guideLbl"); d.benefits.eligibility = v("bfa_elig"); d.benefits.notes = lines(v("bfa_benNotes"));
    el.querySelectorAll("[data-b]").forEach(function (n) { var b = d.benefits.items[+n.getAttribute("data-b")]; if (b) b[n.getAttribute("data-k")] = n.value; });
    d.benefits.items.forEach(function (b, i) { var s = el.querySelector("#bfa_bic" + i); if (s) b.icon = s.value; });
    var m = d.benefits.medical || (d.benefits.medical = { current: { plans: [] }, next: { plans: [] } });
    m.carrier = v("bfa_medCarrier"); m.switchDate = v("bfa_medSwitch").trim(); m.footnote = v("bfa_medFoot");
    m.current = m.current || { plans: [] }; m.next = m.next || { plans: [] }; m.current.label = v("bfa_medCurLbl"); m.next.label = v("bfa_medNextLbl");
    el.querySelectorAll("input[data-med]").forEach(function (n) { var set = m[n.getAttribute("data-med")], p = set && set.plans[+n.getAttribute("data-i")]; if (p) p[n.getAttribute("data-k")] = n.value.trim(); });
    (d.benefits.other || []).forEach(function (o, i) { o.name = v("bfa_oth_name" + i); o.carrier = v("bfa_oth_carrier" + i); var s = el.querySelector("#bfa_oth_icon" + i); if (s) o.icon = s.value; o.rows = lines(v("bfa_oth_rows" + i)).map(function (l) { var q = l.split("|"); return [(q[0] || "").trim(), (q.slice(1).join("|") || "").trim()]; }).filter(function (r) { return r[0]; }); });
    el.querySelectorAll("[data-lk]").forEach(function (n) { var l = d.links[+n.getAttribute("data-lk")]; if (l) l[n.getAttribute("data-k")] = n.value.trim(); });
    d.links.forEach(function (l, i) { var s = el.querySelector("#bfa_kic" + i); if (s) l.icon = s.value; });
    el.querySelectorAll("[data-c]").forEach(function (n) { var c = d.contacts[+n.getAttribute("data-c")]; if (c) c[n.getAttribute("data-k")] = n.value.trim(); });
    return d;
  }

  function status(msg, cls) { var s = document.getElementById("bfaStatus"); if (s) { s.textContent = msg; s.className = "bfa-status " + (cls || ""); } }
  function loadEditor() {
    var pane = document.querySelector('.admin-pane[data-admin-pane="' + ADMIN_TAB + '"]'); if (!pane) return;
    status("Loading…");
    load(true).then(function (d) {
      ED = clone(d);
      status(META && META.updated_at ? "Last saved " + new Date(META.updated_at).toLocaleString() + (META.updated_by ? " by " + META.updated_by : "") : (META && META.missing ? "Table not created yet. Run worker/benefits-info.sql in Supabase, then save." : "Showing built-in defaults. Save to store them."), META && META.missing ? "bad" : "");
      renderEditor();
    });
  }
  function mountAdmin() {
    if (document.querySelector('.admin-pane[data-admin-pane="' + ADMIN_TAB + '"]')) return;
    var ref = document.querySelector('.admin-pane[data-admin-pane="help-routes"]') || document.querySelector(".admin-pane"); if (!ref) return;
    var pane = document.createElement("div");
    pane.className = "admin-pane"; pane.setAttribute("data-admin-pane", ADMIN_TAB); pane.style.display = "none";
    pane.innerHTML = '<div class="admin-hero"><div class="eyebrow">Content &middot; Benefits</div><h2>Benefits &amp; PTO. <span style="color:var(--muted-light);">Everything team members see on the Benefits &amp; PTO tab.</span></h2><div class="dek">Edit, then Save. Changes are live for everyone the next time they open the tab. Lists are one item per line.</div></div>' +
      '<div class="bfa"><div class="bfa-bar"><button class="bfa-btn gold" id="bfaSave">' + ic("save") + 'Save</button><button class="bfa-btn" id="bfaReload">' + ic("refresh") + 'Reload</button><button class="bfa-btn" id="bfaReset" title="Put the built-in defaults back into the form (nothing is saved until you press Save)">Reset to defaults</button><span class="sp"></span><span class="bfa-status" id="bfaStatus"></span></div><div class="bfa-body"><div class="bf-empty">Open this section to load.</div></div></div>';
    ref.parentNode.insertBefore(pane, ref.nextSibling);
    pane.querySelector("#bfaSave").addEventListener("click", function () {
      var btn = this; collect(); btn.disabled = true; status("Saving…");
      save(ED).then(function (j) { btn.disabled = false; META = Object.assign(META || {}, { updated_at: j.updated_at, updated_by: j.updated_by, missing: false }); DATA = clone(ED); loadedAt = Date.now(); status("Saved " + new Date().toLocaleTimeString(), "good"); if (document.getElementById("bfRoot")) renderTab(); })
        .catch(function (e) { btn.disabled = false; status("Couldn't save: " + (e.message || e), "bad"); });
    });
    pane.querySelector("#bfaReload").addEventListener("click", loadEditor);
    pane.querySelector("#bfaReset").addEventListener("click", function () { if (!confirm("Replace the form with the built-in defaults? Nothing is saved until you press Save.")) return; ED = clone(DEFAULTS); renderEditor(); status("Defaults loaded into the form (not saved yet)."); });

    var after = document.querySelector('.admin-subnav-item[data-admin-tab="career-paths"]') || document.querySelector('.admin-subnav-item[data-admin-tab="home-branding"]') || document.querySelector('.admin-subnav-item[data-admin-tab="help-routes"]');
    if (after) {
      var b = document.createElement("button");
      b.className = "admin-subnav-item"; b.setAttribute("data-admin-tab", ADMIN_TAB); b.dataset.group = after.dataset.group || "";
      b.innerHTML = "<span>Benefits &amp; PTO</span>";
      after.parentNode.insertBefore(b, after.nextSibling);
      b.addEventListener("click", function () { if (window.switchAdminTab) window.switchAdminTab(ADMIN_TAB); setTimeout(loadEditor, 60); });
      /* .hide-for-role on this button is overridden by the stylesheet rule injected above, so no observer is needed. */
    }
  }

  /* ---------- boot ---------- */
  function boot(t) {
    t = t || 0;
    var ready = document.querySelector('.nav-item[data-tab="home"]') && document.getElementById("view-admin") && window.SPARK_SB && window.SPARK_SB.getToken;
    if (!ready) { if (t < 80) setTimeout(function () { boot(t + 1); }, 600); return; }
    injectCss(); mountTab(); mountAdmin();
    window.hqBenefits = { open: openTab, reload: function () { return load(true).then(renderTab); }, diag: function () { return DIAG.slice(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); }); else boot();
})();
