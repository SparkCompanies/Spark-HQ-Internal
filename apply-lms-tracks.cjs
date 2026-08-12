// LMS_TRACKS_v1 — restructures the Training curriculum into recurring tracks:
// retires the Onboarding subject (Spark Launch/Circuit owns it now) and adds
// Everyone + By-function tracks extracted natively from the Trainual library.
// Run from repo root:  node apply-lms-tracks.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("LMS_TRACKS_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const NEW_SUBJECTS = [
 {
  "id": "performance-kpis",
  "name": "Performance & KPIs",
  "description": "The numbers your desk is measured on, by role.",
  "color": "#F5C518",
  "category": "Everyone",
  "topics": [
   {
    "id": "kpi-sheet",
    "title": "The KPI Performance Sheet",
    "estimatedMinutes": 6,
    "content": "<p class=\"lead\">Every desk at Spark runs against a weekly number. These are the standing minimums by role — the same numbers your leader reviews in PI Board meetings.</p><h3>Recruiters</h3><ul><li><strong>10 submissions per week</strong></li><li><strong>10 active candidates in process</strong> at all times</li><li><strong>30 calls per day</strong> on your requirement</li><li><strong>25 pre-screens per week</strong></li></ul><p><em>Light Industrial (volume recruiting) carries roughly 50% more submissions per week. In-process counts hold steady, because most of that business is go-to-work.</em></p><h3>Account Recruiting Managers</h3><ul><li><strong>5 meetings per week</strong></li><li><strong>1 new meeting per week</strong></li><li><strong>20 candidate pre-screens per week</strong></li></ul><h3>Sales</h3><ul><li><strong>10 client meetings per week</strong></li><li><strong>2 new client meetings per week</strong></li><li>Have your recruiting team set up on their requirements <strong>each day</strong></li></ul><h3>Why these numbers</h3><p>The minimums are not a ceiling and they are not a stretch goal. They are the activity level that reliably produces placements at Spark's conversion rates. Miss the activity and the results follow a few weeks later, which is why the board tracks leading numbers (calls, pre-screens, meetings) instead of only placements.</p><p>Know your own numbers before the meeting. Walking in able to say where you stand without looking it up is the difference between reporting and owning.</p>"
   }
  ]
 },
 {
  "id": "tools-security",
  "name": "Tools & Security",
  "description": "Accounts, access, and the security habits that protect client and candidate data.",
  "color": "#4A9DE0",
  "category": "Everyone",
  "topics": [
   {
    "id": "ts-mfa",
    "title": "Multifactor Authentication",
    "estimatedMinutes": 5,
    "content": "<p class=\"lead\">Your password proves you know something. MFA proves you <em>are</em> someone. Spark requires both.</p><h3>Why it matters</h3><ul><li>Requires more than one form of verification to reach an account</li><li>Blocks unauthorized access even when a password leaks</li><li>Cuts the likelihood of a data breach reaching candidate and client records</li></ul><h3>Set up the Microsoft Authenticator app</h3><ol><li>Open the Authenticator app</li><li>Select <strong>Add account</strong> (the + at the top, next to Search)</li><li>Choose <strong>Work account</strong></li><li>Select <strong>Sign in</strong> and use your Spark email and password, or scan the QR code if one was provided</li><li>Once the account appears, use the one-time codes to sign in to Microsoft 365</li></ol><h3>How it actually protects you</h3><p>If someone steals your credentials, they are signing in from their own device. Microsoft 365 sees an unfamiliar device and asks for the second factor — your authenticator app or fingerprint. They do not have it, so they do not get in.</p><p>You will be prompted the first time you sign in on any new device or browser. That prompt is the system working.</p>"
   },
   {
    "id": "ts-judy",
    "title": "Judy Password Manager",
    "estimatedMinutes": 6,
    "content": "<p class=\"lead\">Judy stores your logins so you are not reusing one password across systems or keeping them in a notebook.</p><h3>Getting in</h3><ol><li>Select Judy from your browser's extension bar. If the icon is not there, click the puzzle icon, then pin Judy</li><li>Sign in with your company email address as your username</li><li>A two-factor code is emailed to you. You have 15 minutes to enter your password and the code</li><li>Forgot your password? Use <strong>Forgot Password</strong> and follow the prompts</li></ol><h3>Create your vault</h3><p>A vault is a folder for credentials. One vault is enough to start. Select <strong>Create Vault</strong>, name it, and it appears in your vault list. Open it and choose <strong>New Credential</strong> to add a login.</p><p>Finding the right login URL sometimes takes a try or two. The reliable trick: sign out of the site, let it redirect to the login page, and copy that URL.</p><h3>Password standards</h3><ul><li>Judy rates password strength as you type and rejects anything under 8 characters</li><li>Aim for <strong>16+ characters</strong> mixing upper and lower case, numbers, and symbols</li><li>Edit a credential any time from the vault side menu</li></ul><p>Your Judy dashboard doubles as a launch point for everything you use daily.</p>"
   }
  ]
 },
 {
  "id": "sales",
  "name": "Sales",
  "description": "The Spark sales process, stage by stage.",
  "color": "#E0703A",
  "category": "By function",
  "topics": [
   {
    "id": "sp-prospect",
    "title": "Prospect — target strategy",
    "estimatedMinutes": 7,
    "content": "<p class=\"lead\">Prospecting is the foundation. It is identifying and qualifying clients who actually fit what we deliver — not building the longest list you can.</p><h3>Build your Top 20 / Next 20</h3><p>Identify 20 primary and 20 secondary accounts in the system. Every target should clear these:</p><ul><li>Do they use staffing or services?</li><li>Do they hire 3–5 times a year for technical roles, or 5+ contractors a week?</li><li>Do they need the top 5 skill sets your team specializes in?</li><li>Are their pay rates and shifts competitive for the local market?</li><li>Is there a local decision-maker who can sign an agreement?</li></ul><h3>Go wide inside each account</h3><ul><li>Target <strong>3–5 managers per account</strong>, focused on people who influence or own hiring</li><li>Tag each manager by the skill sets they procure so outreach and submittals can be tailored</li></ul><h3>Work the call sheet daily</h3><p>Spend <strong>80% of your time on target accounts</strong> and track outreach and follow-ups consistently. If you use ZoomInfo, set alerts for what prospects are viewing and for manager changes — a new manager in a target account is a timed opening.</p><h3>Do this now</h3><ul><li>Build your Top 20 / Next 20 and enter it in the system</li><li>Tag 3–5 managers per account with their skill sets</li><li>Plan tomorrow's outreach off your call sheet</li></ul>"
   },
   {
    "id": "sp-engage",
    "title": "Engage — account activity",
    "estimatedMinutes": 7,
    "content": "<p class=\"lead\">Engagement is conversation that uncovers need and moves the relationship. Preparation and personalization are the whole game.</p><h3>Prepare discovery questions first</h3><p>Research their careers page and job boards for active hiring. Identify similar companies you already serve so you bring industry credibility. Write questions that surface:</p><ul><li>Hiring volume and frequency</li><li>Pain points in their current staffing process</li><li>Who actually decides</li><li>Budget and timeline</li></ul><h3>Bring candidates to meetings</h3><p>Always walk in with relevant candidate profiles matched to the skill sets that manager procures. It moves you from pitching capability to demonstrating it.</p><h3>Run the meeting on an agenda</h3><p>Discovery questions, candidate review, next steps. Use the time to learn their org structure, hiring process, procurement preferences, and who else they use.</p><h3>Demonstrate value</h3><p>Share results from similar clients. Lead with speed, quality, and market expertise. Position yourself as a consultative partner rather than a vendor — vendors compete on price.</p><h3>Do this now</h3><ul><li>Draft 5 discovery questions for your top target</li><li>Prepare 2 candidate profiles for your next meeting</li><li>Build a reusable meeting agenda template</li><li>Role-play a discovery meeting with a peer or leader</li></ul>"
   },
   {
    "id": "sp-qualify",
    "title": "Qualify — the 4 P's",
    "estimatedMinutes": 6,
    "content": "<p class=\"lead\">Qualification makes sure a req is viable, market-aligned, and ready to source before anyone spends a day on it.</p><h3>Get the 4 P's on every requirement</h3><ul><li><strong>Position</strong> — the role, responsibilities, and required skill set</li><li><strong>Pay</strong> — is the rate competitive against the market?</li><li><strong>Process</strong> — interviews, timeline, decision-makers</li><li><strong>People</strong> — hiring manager, team leads, procurement</li></ul><h3>Ask for two technical questions</h3><p>Get two technical questions from the hiring manager you can use in reference checks. They validate real expertise and keep submittals aligned to what the role actually needs.</p><h3>Negotiate win / win / win</h3><p>The candidate, the client, and Spark all have to come out ahead. Align on pay and bill rates, contract terms, and expectations before sourcing starts.</p><h3>Set up the recruiter and the calendar</h3><ul><li>Build the sourcing strategy together: channels, must-have versus nice-to-have, timelines</li><li>Schedule interview slots during the qualification call — it compresses the timeline and signals you are organized</li></ul><h3>Do this now</h3><ul><li>Qualify a live req using the 4 P's</li><li>Draft 2 technical questions for a sample role</li><li>Role-play a rate negotiation with a peer</li></ul>"
   },
   {
    "id": "sp-deliver",
    "title": "Deliver — requirement fulfillment",
    "estimatedMinutes": 6,
    "content": "<p class=\"lead\">Delivery is execution with influence: screen properly, make interviews count, and use feedback to steer the decision.</p><h3>Screen with your recruiter</h3><ul><li>Review every candidate together before anyone is submitted</li><li>Revisit candidates screened and passed on previously — they may fit this req or another in your territory</li><li><strong>Call candidates.</strong> Do not just email. Rapport is how you assess fit</li><li>Sell the candidate: strengths up front, concerns addressed, positioned as the solution</li><li>Agree a feedback timeline with the client <em>before</em> the interview</li></ul><h3>Influence the interview</h3><ul><li>Raise red flags proactively rather than letting the client discover them</li><li>Highlight the strengths that map to the role and the team</li><li>Sit in when you can — you cannot steer a conversation you did not hear</li></ul><h3>Debrief both sides</h3><p>Get the candidate's read first, then use it to open the client conversation. Ask the client for both positive and constructive feedback — on the candidate <em>and</em> on your performance. That is how the next submittal gets sharper.</p><h3>Do this now</h3><ul><li>Role-play a screening call with your recruiter</li><li>Sit in on an interview and practice influencing it</li><li>Complete a post-interview debrief on a recent candidate</li></ul>"
   },
   {
    "id": "sp-service",
    "title": "Service — after the placement",
    "estimatedMinutes": 5,
    "content": "<p class=\"lead\">Service is what turns one placement into an account. It is the part most people skip.</p><h3>Work contractor performance feedback</h3><p>Check in with placed contractors regularly and relay what you learn to the hiring manager. It shows attentiveness, and it surfaces redeployment opportunities and problems while they are still small.</p><h3>Earn introductions</h3><p>Use the relationships you have to reach the ones you do not. Ask contractors and hiring managers to introduce you to other decision-makers, and work toward saturating departments rather than holding one contact.</p><h3>Always ask for the next req</h3><p>After a placement lands or feedback comes back positive: <em>“What's coming up next?”</em> and <em>“Are there other roles we can support?”</em> Momentum is easier to keep than to restart.</p><h3>Do this now</h3><ul><li>Run a contractor check-in and document the feedback</li><li>Ask one manager for an introduction to another department</li><li>Practice a next-req conversation with a peer</li></ul>"
   },
   {
    "id": "sp-knowledge",
    "title": "Knowledge — helping people grow",
    "estimatedMinutes": 5,
    "content": "<p class=\"lead\">Documenting your work and teaching your recruiter is not overhead. It is how a desk survives you being out for a week.</p><h3>Document everything in the system</h3><p>Every note, call, and update belongs in Salesforce. A well-documented account is easy to revisit and grow; an undocumented one starts from zero when it changes hands.</p><h3>Bring your recruiter inside the process</h3><p>Walk them through your thinking, not just your conclusions. Explaining why you qualified a req the way you did accelerates their learning curve faster than any training deck.</p><h3>Teach them to mine talent for leads</h3><p>Show recruiters how to ask candidates about the companies they have worked for, the managers they reported to, and openings they have heard about. Those conversations are a business development channel hiding inside a pre-screen.</p><h3>Teach the reference check</h3><ul><li>Ask for references early in the process</li><li>Use reference calls to validate skills <em>and</em> uncover leads</li><li>Log the feedback where the next person can find it</li></ul><h3>Do this now</h3><ul><li>Document a full candidate lifecycle in the ATS</li><li>Role-play uncovering a lead from a candidate conversation</li><li>Share one documentation habit with your recruiter</li></ul>"
   }
  ]
 },
 {
  "id": "arm-account-management",
  "name": "ARM / Account Management",
  "description": "Account status, target qualification, and how territories are built.",
  "color": "#7B5AA6",
  "category": "By function",
  "topics": [
   {
    "id": "arm-status",
    "title": "Account status framework",
    "estimatedMinutes": 6,
    "content": "<p class=\"lead\">Status labels exist to create movement, not to file accounts away. Every account should be somewhere on this ladder, and you should know what moves it up.</p><ul><li><strong>Prospect</strong> — we are actively trying to engage, with limited intel on hiring, volume, or process</li><li><strong>Target</strong> — qualified, uses staffing, fits our skill sets and criteria, but no relationship or active business yet</li><li><strong>Signed Client</strong> — agreement in place (MSA/SOW) but not yet producing meaningful activity. The whole focus is converting to first start</li><li><strong>Active Client</strong> — generating business now: open reqs, starts, charge. Ongoing fulfillment and account management, focused on growth</li><li><strong>Former Client</strong> — did business with Spark before, no active reqs or revenue now (no bill for 90 days). Strong re-engagement opportunity</li><li><strong>Target — Former/Signed</strong> — warm accounts with lower barriers and a faster path back to starts</li><li><strong>Flagged Account</strong> — known issues: billing, safety, DNU. Requires internal review before anyone moves forward</li><li><strong>Vendor</strong> — provides services to Spark. Not part of the sales flow</li></ul><p>The two statuses people underuse are Former Client and Target — Former/Signed. Someone already knows us there, which is a materially shorter path than a cold prospect.</p>"
   },
   {
    "id": "arm-qualify-target",
    "title": "How to qualify a target",
    "estimatedMinutes": 6,
    "content": "<p class=\"lead\">Six filters. Run them before an account earns a spot on your list, not after you have spent a month on it.</p><h3>Volume</h3><ul><li>Non-skilled roles: should use around <strong>5 contractors per week</strong></li><li>Skilled and technical roles: <strong>3–5 placements per year</strong></li></ul><p>We want volume that drives spread, not one-off placements.</p><h3>Company size</h3><p>Ideal is <strong>100+ employees</strong> — at that size contract labor is usually part of the strategy. Be careful with 400+ employee companies unless there is a local decision-maker; large companies route staffing through procurement, which limits your influence.</p><h3>Skill set</h3><p>Are they hiring inside our top 5 skill sets? If not, we are stretching outside our strengths and the fill rate will show it.</p><h3>Pay rate</h3><p>Is the pay aligned to current market? Rates that are too low produce fast turnover, which damages client results and our margin at the same time.</p><h3>Work environment</h3><p>Is it somewhere people want to work? Clean, safe, manageable conditions drive retention. Harsh environments make redeployment harder for years.</p><h3>Hiring process</h3><p>Multiple interviews? Testing? Drug and background screens? Physicals? Every added step shrinks the qualified pool. If the barriers raise our effort to fill, the markup needs to move with them.</p>"
   },
   {
    "id": "arm-opportunities",
    "title": "What counts as an Opportunity",
    "estimatedMinutes": 5,
    "content": "<p class=\"lead\">Opportunities are not a general sales tracker. Creating them for low-volume or early-stage activity buries the real demand.</p><p>By keeping Opportunities to fewer, better-defined records, leaders can get hyper-focused, engage at the right moment, and help win the business that matters. As a guideline, a rep with roughly <strong>40 targets should have about 5–8 well-defined Opportunities</strong> representing real, actionable demand.</p><h3>What belongs</h3><ul><li>Ramp-ups</li><li>High-confidence req flow</li><li>Projects</li><li>Large account saturation</li><li>CAPEX and expansions</li></ul><h3>Two rules</h3><ul><li>Opportunities track <strong>Revenue</strong>, not Charge</li><li><strong>If it is not forecasted, it should not be an Opportunity</strong></li></ul>"
   },
   {
    "id": "arm-territory",
    "title": "Territory setup & tracking",
    "estimatedMinutes": 5,
    "content": "<p class=\"lead\">Your territory is built and managed in Salesforce through account ownership and account status. That is what makes it visible and scalable.</p><h3>What it gives us</h3><ul><li>What each rep owns</li><li>How their territory is built</li><li>Where the best growth opportunities sit</li></ul><p>Keep targets capped around <strong>40</strong>. Past that, coverage gets thin and the list stops being a plan.</p><h3>How it is maintained</h3><ul><li><strong>Account lists by rep</strong> — build and manage focused lists (Targets, Active Clients, Former Clients) so you are always working the right accounts</li><li><strong>Standard reporting</strong> — we track accounts by status and activity inside target accounts</li></ul><h3>Still being worked out</h3><p>Plus/deltas on account ownership are a manual process to start, with automation layered in over time. If ownership looks wrong on an account, raise it rather than working around it.</p>"
   }
  ]
 },
 {
  "id": "recruiting",
  "name": "Recruiting",
  "description": "Compliance, systems, and the verticals we staff.",
  "color": "#3E9E7E",
  "category": "By function",
  "topics": [
   {
    "id": "rec-compliance",
    "title": "Recruiter compliance refresher",
    "estimatedMinutes": 8,
    "content": "<p class=\"lead\">What you can and cannot ask a candidate. As a recruiter you are the front line of our hiring practices, which makes you the first point of legal exposure.</p><h3>Core training</h3><ul><li>Federally protected categories and why they matter</li><li>Compliant versus non-compliant questions for every common topic</li><li>Casual “red flag” phrases that create real legal risk</li></ul><h3>Deep dives</h3><ul><li>Drug screening compliance and state marijuana laws</li><li>Background check compliance — FCRA, Ban the Box, adverse action</li><li>Social media screening, the highest-risk area in modern recruiting</li><li>AI and technology in hiring, and the regulations forming around it</li></ul><h3>Tools you get</h3><ul><li>State-by-state compliance alerts (CA, NY, IL, MA, TX, CO, WA, FL)</li><li>A timeline showing when in the process you can ask what</li><li>An escalation flowchart for when you are not sure</li><li>Interview note-taking guide — what to document and what never to write down</li><li>Accommodation request handling and ready-to-use templates</li></ul><h3>Assessment</h3><p>Practice scenarios plus a 12-question quiz. <strong>You need 10 of 12 to pass.</strong></p><p><a href=\"https://sparktalent.sharepoint.com/sites/ComplianceTraining/SitePages/Recruitment-Compliance-Training.aspx\" target=\"_blank\" rel=\"noopener\"><strong>Open the full Recruitment Compliance Training →</strong></a></p><p><em>This training covers general U.S. employment law principles. Laws vary by state, county, and city — check with legal before changing any hiring practice.</em></p>"
   }
  ]
 },
 {
  "id": "hr-payroll",
  "name": "HR / Payroll",
  "description": "Back office: onboarding paperwork, Paycor, payroll, and benefits.",
  "color": "#C8577B",
  "category": "By function",
  "topics": [
   {
    "id": "hp-back-office",
    "title": "Back office overview",
    "estimatedMinutes": 5,
    "content": "<p class=\"lead\">The back office runs everything that happens after a candidate says yes: paperwork, pay, and benefits.</p><h3>What this covers</h3><ul><li>Who TMX is and what they handle for us</li><li>The onboarding process end to end</li><li>Paycor employee access</li><li>Payroll</li><li>External benefits</li></ul><h3>I-9 verification</h3><p>Employers are required by law to verify a potential employee's identity and their authorization to work in the United States. The List of Acceptable Documents governs what can be used for I-9 verification when starting a candidate in Paycor.</p><p>Get this right the first time. I-9 errors are among the easiest compliance failures to avoid and among the most expensive to be caught with.</p>"
   }
  ]
 }
];

// locate LMS_DATA = { ... } and parse it as JSON (it is pure JSON in the bundle)
const key = "LMS_DATA = {";
const ki = h.indexOf(key);
if (ki < 0) die("LMS_DATA not found");
const start = h.indexOf("{", ki);
let depth = 0, instr = false, esc = false, q = null, end = -1;
for (let i = start; i < h.length; i++) {
  const c = h[i];
  if (instr) {
    if (esc) esc = false;
    else if (c === "\\") esc = true;
    else if (c === q) instr = false;
  } else {
    if (c === '"' || c === "'") { instr = true; q = c; }
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
}
if (end < 0) die("could not find end of LMS_DATA");
const raw = h.slice(start, end + 1);
let data;
try { data = JSON.parse(raw); } catch (e) { die("LMS_DATA is not parseable JSON: " + e.message); }
if (!data.subjects || !data.subjects.length) die("LMS_DATA has no subjects");

fs.writeFileSync("index.backup-lmstracks-" + stamp + ".html", h);

const before = data.subjects.map(s => s.id);

// 1. retire Onboarding — Spark Launch owns first-week content now
const dropped = [];
data.subjects = data.subjects.filter(s => {
  if (s.id === "onboarding") { dropped.push(s.id + " (" + (s.topics||[]).length + " topics)"); return false; }
  return true;
});

// 2. tag the two surviving company-wide subjects
data.subjects.forEach(s => {
  if (s.id === "spark-standard" || s.id === "career-paths") s.category = "Everyone";
});

// 3. append new tracks, skipping any that somehow already exist
const have = new Set(data.subjects.map(s => s.id));
let added = 0;
NEW_SUBJECTS.forEach(s => { if (!have.has(s.id)) { data.subjects.push(s); added++; } });

// 4. order: Everyone tracks first, then By function
const rank = s => (s.category === "Everyone" ? 0 : 1);
data.subjects.sort((a, b) => rank(a) - rank(b));

h = h.slice(0, start) + JSON.stringify(data, null, 2) + h.slice(end + 1);
const bi = h.lastIndexOf("</body>");
if (bi < 0) die("no </body>");
h = h.slice(0, bi) + "<!-- LMS_TRACKS_v1 -->\n" + h.slice(bi);
fs.writeFileSync(F, h);

const topics = data.subjects.reduce((a, s) => a + (s.topics || []).length, 0);
console.log("APPLIED LMS_TRACKS_v1");
console.log("  retired: " + (dropped.join(", ") || "none"));
console.log("  added:   " + added + " tracks");
console.log("  now:     " + data.subjects.length + " subjects / " + topics + " topics");
data.subjects.forEach(s => console.log("     [" + (s.category||"?") + "] " + s.name + " — " + (s.topics||[]).length));
console.log("  backup: index.backup-lmstracks-" + stamp + ".html");
