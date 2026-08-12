// LMS_TRACKS_v2 — adds the 13-part Sales Bootcamp and the full HR/Payroll track.
// Requires LMS_TRACKS_v1 (run apply-lms-tracks.cjs first).
// Run from repo root:  node apply-lms-tracks-v2.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("LMS_TRACKS_v2")) { console.log("Already applied."); process.exit(0); }
if (!h.includes("LMS_TRACKS_v1")) { console.error("ABORT — run apply-lms-tracks.cjs first (v1 not found)"); process.exit(1); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const BOOTCAMP = [
 {
  "id": "sb-d1-objections",
  "title": "Day 1 — Objection handling mastery",
  "estimatedMinutes": 7,
  "content": "<p class=\"lead\">An objection is information. Before you can answer one, you have to know which kind you are hearing and whether it is real.</p><h3>What objections actually are</h3><p>Most objections trace back to one of four roots: <strong>fear, budget, timing, or trust</strong>. The critical read is whether you are hearing a true objection — a real barrier they want solved — or a brush-off, which is a polite exit.</p><h3>The six you will hear</h3><ul><li><strong>Price</strong> — “It's too expensive.”</li><li><strong>Value</strong> — “I'm not sure it's worth it.”</li><li><strong>Need</strong> — “I don't think we need this.”</li><li><strong>Timing</strong> — “We're not ready right now.”</li><li><strong>Trust</strong> — “I've never heard of your company.”</li><li><strong>Competitor</strong> — “We're using someone else.”</li></ul><h3>Uncovering the real one</h3><ul><li><strong>Active listening and mirroring</strong> — reflect their words back before you respond to them</li><li><strong>Probing and clarifying questions</strong> — the stated objection is often a proxy for the actual one</li></ul><p>Answering the surface objection when the real one is trust wastes the call. Slow down and find out which you are dealing with.</p>"
 },
 {
  "id": "sb-d2-negotiation",
  "title": "Day 2 — Negotiation: closing without discounting",
  "estimatedMinutes": 8,
  "content": "<p class=\"lead\">Discounting is the fastest way to close and the fastest way to erode what we are worth. These are the moves that hold rate.</p><h3>The script</h3><blockquote><p><strong>Client:</strong> “Can you do it for less?”</p><p><strong>You:</strong> “I totally understand wanting the best deal. Just to be transparent — what we're offering is priced on the value and outcomes we deliver. If we reduce the price, we'd have to reduce scope, support model, or priority, and I want to make sure we exceed your expectations.”</p></blockquote><h3>1. Shift from price to value</h3><ul><li>Lead with ROI, time savings, risk reduction, competitive edge</li><li>Use case studies and real results to make it tangible</li><li>Ask: <em>“What would it cost your team to keep doing things the current way?”</em></li></ul><h3>2. Anchor high early</h3><p>Establish premium positioning from the first conversation: <em>“We are not designed to be the cheapest option.”</em> — <em>“Our clients don't choose us because we're cheap. They choose us because we deliver.”</em></p><h3>3. Understand the why behind the price objection</h3><ul><li><em>“What's making the price feel like a concern?”</em></li><li><em>“What would need to happen for you to see this as a no-brainer investment?”</em></li></ul><h3>4. Bundle instead of discount</h3><p>Add value through service or bundled offerings rather than cutting the rate.</p><h3>5. Use urgency ethically</h3><p><em>“The sooner we start, the sooner you see results.”</em> Real timeline pressure only — manufactured urgency costs you trust.</p><h3>6. Reinforce opportunity cost</h3><p>Help them quantify inaction: <em>“What happens to your goals if this is delayed another three months?”</em></p><h3>7. Be ready to walk away</h3><p>Sometimes the strongest move is walking with confidence. Know your walk-away point before the call and hold it. Discounting erodes brand value long after the deal closes.</p>"
 },
 {
  "id": "sb-d3-value-selling",
  "title": "Day 3 — Value-based selling: outcomes and ROI",
  "estimatedMinutes": 6,
  "content": "<p class=\"lead\">Five principles that move a conversation from what we do to what they get.</p><h3>1. Sell results, not features</h3><p>Talk about what the service <em>enables</em> — time back for key initiatives, higher conversion, lower risk — not the mechanics of how it works.</p><h3>2. Make the buyer the hero</h3><p>Frame the investment around how it makes <em>them</em> more successful: faster execution, more efficient, less risk, more competitive for top talent.</p><h3>3. Tie every benefit to a business goal</h3><p>Revenue growth, cost savings, risk reduction, scalability, time-to-market. If a benefit does not ladder to one of those, it is a feature wearing a costume.</p><h3>4. Personalize by stakeholder</h3><ul><li><strong>CFO</strong> — ROI and total cost</li><li><strong>Ops</strong> — time savings and process improvement</li><li><strong>CEO</strong> — strategic alignment and market advantage</li></ul><h3>5. Use the value gap to create urgency</h3><p>Help them see the distance between where they are and where they want to be, in their own numbers: <em>“Right now you're losing X hours a week to slow decision-making. Over a year that's $Y in lost revenue.”</em></p>"
 },
 {
  "id": "sb-d4-time",
  "title": "Day 4 — Time management",
  "estimatedMinutes": 6,
  "content": "<p class=\"lead\">Prioritize high-impact work, cut the time sinks, and protect the hours that actually generate revenue.</p><h3>Important versus urgent</h3><p>The whole discipline is telling those apart. Urgent things announce themselves. Important things wait quietly until they are urgent.</p><h3>Revenue-generating activities</h3><ul><li>Prospecting new leads</li><li>Following up on warm opportunities</li><li>Client meetings</li><li>Proposals</li><li>Strategic account planning</li></ul><h3>Low-value tasks</h3><ul><li>Admin and data entry</li><li>Internal emails and meetings with no agenda</li><li>Excessive research with no goal</li><li>Chasing unqualified leads</li></ul><h3>Time blocking</h3><p>Block specific hours daily for prospecting, account reviews, and pipeline management. <strong>Treat those blocks like client meetings — non-negotiable.</strong></p><h3>Focus techniques</h3><ul><li><strong>2-minute rule</strong> — if it takes under two minutes, do it now</li><li><strong>Inbox discipline</strong> — block time for email instead of checking constantly; roughly hourly</li><li><strong>Use the system</strong> — Salesforce alerts, tasks, and calendar. Do not rely on memory</li></ul><h3>Weekly review</h3><p>Good material for your 1-on-1: What did I accomplish this week? What should I stop or start doing? What blocked me? Where did my time go — and did it drive revenue?</p>"
 },
 {
  "id": "sb-d5-listening",
  "title": "Day 5 — Listening & questioning (consultative selling)",
  "estimatedMinutes": 7,
  "content": "<p class=\"lead\">Your role is a doctor's: diagnose before you prescribe. Sell the solution to their problem, not the product.</p><h3>What consultative selling is for</h3><ul><li>Build trust through empathy and understanding</li><li>Uncover their real challenges, goals, and buying motives</li><li>Co-create a tailored solution instead of pushing a generic pitch</li></ul><h3>Core listening skills</h3><ul><li><strong>Silence after questions</strong> — let them speak, do not interrupt</li><li><strong>Verbal affirmations</strong> — “I see.” “That makes sense.” “Go on.”</li><li><strong>Summarize and paraphrase</strong> — “So what I'm hearing is…”</li><li><strong>Body language</strong> on video or in person — eye contact, nodding, leaning in</li></ul><h3>Avoid</h3><ul><li>Jumping to solutions too early</li><li>Thinking ahead to your pitch while they are still talking</li><li>Interrupting, or filling the silence yourself</li></ul><h3>Five types of question</h3><p><strong>Open-ended (exploratory)</strong></p><ul><li>“Can you walk me through your current process?”</li><li>“What challenges are you experiencing right now?”</li><li>“Why do you think this keeps happening?”</li></ul><p><strong>Diagnostic</strong></p><ul><li>“How is this impacting your team, you, the company?”</li></ul><p><strong>Quantifying</strong></p><ul><li>“How much time or money is this costing you per month?”</li><li>“If you solved this, what would the upside look like?”</li></ul><p><strong>Stakeholder</strong></p><ul><li>“Who else is involved in this decision?”</li><li>“How do you typically evaluate vendors like us?”</li></ul><p><strong>Future-state</strong></p><ul><li>“If we removed this bottleneck, what else could you focus on?”</li></ul>"
 },
 {
  "id": "sb-d6-pitch",
  "title": "Day 6 — Effective pitch delivery",
  "estimatedMinutes": 6,
  "content": "<p class=\"lead\">If you don't diagnose the right problem, your solution won't matter.</p><h3>Discovery comes first</h3><p>Before you pitch anything, run a discovery call and understand their pain points, goals, budget, timeline, and stakeholders. A pitch built on assumptions is a guess with slides.</p><h3>The pitch flow</h3><ul><li><strong>Problem</strong> — reiterate the pain and challenges <em>they</em> shared</li><li><strong>Impact</strong> — quantify or describe what is at stake</li><li><strong>Solution / outcome</strong> — how you address it, and the return</li></ul><p>Notice the order: two-thirds of the pitch is their situation before you say a word about us.</p><h3>Customize by buyer type</h3><ul><li><strong>CFO / Finance</strong> — ROI, cost control, risk mitigation</li><li><strong>Ops Manager</strong> — efficiency, time savings, process improvement</li><li><strong>CEO / Founder</strong> — growth, strategic advantage, competitive edge</li><li><strong>IT / Technical</strong> — integration, data security, scalability</li></ul>"
 },
 {
  "id": "sb-d7-followup",
  "title": "Day 7 — Running effective follow-ups",
  "estimatedMinutes": 8,
  "content": "<p class=\"lead\">Follow-up is not “checking in.” Every touch either adds value or asks for a decision.</p><h3>What follow-up is for</h3><ul><li>Reignite stalled conversations</li><li>Add new value, not just presence</li><li>Maintain urgency and interest</li><li>Guide them through the decision</li></ul><h3>Set next steps before you hang up</h3><ul><li>Lock the next meeting or deadline on the call</li><li>Send calendar invites with agendas</li><li>Recap in writing: <em>“Per our call, I'll follow up Thursday with the updated proposal and ROI calculator.”</em></li></ul><p><strong>Follow-ups work when they are pre-scheduled, not reactive.</strong></p><h3>Follow-up message template</h3><blockquote><p><strong>Subject:</strong> Next steps from our conversation</p><p>Hi [Name],</p><p>Great speaking with you. As discussed, here are the key takeaways:</p><p>• [Pain point or challenge]<br>• [How we help]<br>• [Next step: proposal, demo, pricing]</p><p>I've attached [resource] covering the ROI and workflow.</p><p>Looking forward to connecting [day/time].</p></blockquote><h3>Cadence framework</h3><ul><li><strong>Day 1</strong> — recap email with takeaways and next steps</li><li><strong>Day 2–3</strong> — send a value add: case study or insight</li><li><strong>Day 5</strong> — light nudge: “Still aligned on next steps?”</li><li><strong>Day 7–10</strong> — ask directly: “Is this still a priority for you?”</li><li><strong>Day 14+</strong> — breakup email or final attempt</li></ul><h3>Bump with value</h3><p>Instead of <em>“Just checking in…”</em> try <em>“Wanted to bump this to the top of your inbox and share a quick tip I think you'll find useful.”</em></p><h3>The breakup email</h3><p>After four or five touches with no response:</p><blockquote><p><strong>Subject:</strong> Should I close your file?</p><p>Hi [Name],</p><p>I haven't heard back and I don't want to keep bugging you. If this isn't a priority right now, I'll close your file.</p><p>If timing changes, reach out — I'd love to help when it's right.</p></blockquote><p>This gets responses more often than any nudge. Even “not now” is clarity you can plan around.</p>"
 },
 {
  "id": "sb-d10-closing",
  "title": "Day 10 — Closing techniques & cost of vacancy",
  "estimatedMinutes": 9,
  "content": "<p class=\"lead\">Five closes, the staffing objections you will actually hear, and the calculator that makes urgency a number instead of an opinion.</p><h3>1. Assumptive close</h3><p><em>When:</em> they have shown urgency or liked the profiles.</p><blockquote><p>“We'll get the candidate scheduled for an interview Wednesday — does 10 AM or 2 PM work better for your team?”</p></blockquote><p>Positions you as a proactive partner rather than a vendor waiting for instructions.</p><h3>2. Summary close</h3><p><em>When:</em> you have reviewed the needs, pain points, and ideal profile.</p><blockquote><p>“You need someone who can hit the ground running, has 3+ years in X, and can start by the 1st. We've got 2 strong matches ready to interview. Shall I send both for same-day scheduling?”</p></blockquote><h3>3. Urgency close</h3><p><em>When:</em> high-demand candidates, short-notice openings, project deadlines.</p><blockquote><p>“Heads-up — this candidate is also interviewing at two other firms. If we want to move forward, we should schedule in the next 24 hours.”</p></blockquote><h3>4. Calendar close</h3><p><em>When:</em> after a strong intro call or submission. Prevents ghosting.</p><blockquote><p>“Let's get 15 minutes Thursday to align on feedback and next steps — I can hold a couple of slots.”</p></blockquote><h3>5. Option close</h3><p><em>When:</em> they are unsure or want to “wait and see more candidates.”</p><blockquote><p>“Would you prefer to interview Candidate A this week, or wait for the second round early next week?”</p></blockquote><p>Both paths are progress — that is the point.</p><h3>Staffing objections</h3><ul><li><strong>“Your fee is too high.”</strong> — “Understood. Let's compare that to the cost of a vacancy or a bad hire over 3–6 months. Want me to send a cost-of-vacancy analysis?”</li><li><strong>“We're working with another agency.”</strong> — “That makes sense. We're not looking to replace them, just to give you better-qualified options faster. Want to compare our top candidate side by side?”</li><li><strong>“We need more time.”</strong> — “Totally fair. Just know high-demand candidates move fast. Want me to hold them while you review internally?”</li></ul><h3>Cost of vacancy calculator</h3><p><strong>Cost of Vacancy = (Annual Revenue ÷ Employees) × Role Impact Factor × Days Vacant ÷ 260</strong></p><p><em>Worked example — a company at $20M revenue with 200 employees, hiring an Enterprise AE, vacant 30 days:</em></p><ul><li>Revenue per employee: $20,000,000 ÷ 200 = <strong>$100,000</strong></li><li>Impact-adjusted: $100,000 × 2.5 = $250,000 ÷ 260 workdays = <strong>$961/day</strong></li><li>30 days vacant = <strong>$28,830</strong></li></ul><h3>Role impact factor</h3><ul><li>Revenue-generating (sales, BD, consultants) — <strong>2.0–3.0×</strong></li><li>Product / engineering — <strong>1.5–2.0×</strong></li><li>Customer support, ops — <strong>1.0–1.2×</strong></li><li>Admin, HR, internal support — <strong>0.5–1.0×</strong></li></ul><p>The pitch line: <em>“Every month this role stays open is costing you nearly $29,000 in missed revenue — that's why moving fast on top candidates matters.”</em></p><h3>Phrases that close</h3><ul><li><strong>Confirming buy-in</strong> — “Is there anything preventing us from moving forward?”</li><li><strong>Soft commitment</strong> — “If you had to decide today, what would you choose?”</li><li><strong>Reiterating ROI</strong> — “Based on what you shared, this could help with X. Worth locking in now?”</li><li><strong>Risk reversal</strong> — “Let's start small. You can scale once you see results.”</li><li><strong>Gaining confidence</strong> — “Our last three clients in your space saw results within 20 days.”</li></ul>"
 },
 {
  "id": "sb-d12-procurement",
  "title": "Day 12 — Handling complex procurement",
  "estimatedMinutes": 8,
  "content": "<p class=\"lead\">Enterprise deals do not stall on candidates. They stall on gatekeepers you did not know existed.</p><h3>1. Understand the buying structure early</h3><ul><li>“Who else is involved in the decision?”</li><li>“What's your vendor approval process like?”</li><li>“Do you work through an MSP, or direct relationships?”</li></ul><p>This is how you avoid discovering an unknown gatekeeper or a hidden RFP three weeks in.</p><h3>2. Multi-thread the relationship</h3><p>Build across the hiring manager, procurement, HR/TA, and legal/compliance. Map the org chart, note who influences whom, and find your champion by asking who is most motivated to get this filled. <strong>Deals stall when you rely on one contact.</strong></p><h3>3. Anticipate procurement hurdles</h3><p>Come prepared with W9, COI, DEI policies, rate card, MSA, your background check and compliance process, plus references and case studies.</p><blockquote><p>“To keep things moving quickly, I've attached our vendor onboarding pack — it covers most compliance requests in advance.”</p></blockquote><h3>4. Create procurement value, not just hiring value</h3><p>Procurement cares about risk reduction, standardization, cost control, and contract clarity — not great candidates. Speak their language: <em>“We reduce rogue spend by integrating with your MSP, offer fixed investment structures for predictability, and meet compliance.”</em></p><h3>5. Control the process without pushing</h3><ul><li>“Once we've confirmed candidate fit with the hiring team, can you help us navigate procurement steps to avoid delays?”</li><li>“We've worked with similar approval structures — would it help to pre-align terms with legal?”</li></ul><h3>Procurement objections</h3><ul><li><strong>“We only work through MSPs.”</strong> — “Happy to align. Many clients start us as a specialty sub-vendor for niche roles or backup sourcing.”</li><li><strong>“We can't add new vendors right now.”</strong> — “Can I be introduced to your procurement lead for pre-approval if a critical role comes up?”</li><li><strong>“Your rate is too high.”</strong> — “Let's review cost-of-vacancy versus discounting. Quality saves 4–6× in rehire and retraining costs.”</li></ul>"
 },
 {
  "id": "sb-d14-no-decision",
  "title": "Day 14 — Handling the no-decision outcome",
  "estimatedMinutes": 7,
  "content": "<p class=\"lead\">You lose more deals to indecision than to competitors. No-decision is preventable, and recoverable.</p><h3>Why it happens</h3><ul><li><strong>Lack of urgency</strong> — “We'll wait to see more candidates…”</li><li><strong>No internal buy-in</strong> — the hiring manager wants to hire, HR blocks it</li><li><strong>Budget not secured</strong> — “Let's revisit next quarter…”</li><li><strong>Status quo bias</strong> — “We're managing without the role for now”</li><li><strong>Weak business case</strong> — no cost-of-vacancy, no pressure to act</li></ul><h3>Prevention: expose risk in discovery</h3><ul><li>“What happens if this role stays open another 30 days?”</li><li>“How urgent is this to the business versus nice-to-have?”</li><li>“Who has final authority to greenlight the hire?”</li></ul><h3>Prevention: get explicit commitments</h3><ul><li>“After presenting candidates, what's the timeline for feedback and interviews?”</li><li>“What's your decision criteria and timeline after second interviews?”</li></ul><p>Ambiguity becomes the excuse later. Nail it down early.</p><h3>Prevention: build the case with numbers</h3><p><em>“Every month this remains open is costing you around $28,000, and delaying revenue or straining your team.”</em> When the cost of inaction is concrete, people act.</p><h3>Rescue: the re-engagement email</h3><blockquote><p><strong>Subject:</strong> Still hiring for the [role]?</p><p>Hi [Name],</p><p>I noticed we haven't finalized next steps for [role]. If the need is still there, I'd love to help move it forward — especially since the candidate we discussed is still available, for now.</p><p>Here's what's at stake: each month without this role is costing roughly $___ in lost productivity.</p><p>If it's not a current priority, just let me know. Either way, I'm here to help.</p></blockquote><h3>Rescue: offer a lighter entry point</h3><ul><li>“Would a hiring planning session for next quarter help?”</li><li>“Would temp or contract-to-hire make this easier to justify now?”</li></ul><p>Convert indecision into a smaller yes.</p>"
 },
 {
  "id": "sb-d16-champions",
  "title": "Day 16 — Building champions in accounts",
  "estimatedMinutes": 8,
  "content": "<p class=\"lead\">A champion is not a friendly contact. It is an insider with influence who wins when you win.</p><h3>What a champion actually is</h3><ul><li>An insider with influence, formal or informal</li><li>Personally invested in solving the hiring problem</li><li>Willing to advocate for you internally</li><li>Helps you get information, build urgency, and navigate procurement</li></ul><h3>Where they come from</h3><ul><li><strong>Hiring Manager</strong> — direct pain from the open role, urgency to solve it</li><li><strong>Team Lead / Peer</strong> — living the overwork from the vacancy, wants relief</li><li><strong>Talent Acquisition</strong> — needs qualified candidates fast, under pressure to deliver</li><li><strong>Operations Manager</strong> — understands the revenue or cost impact of delay</li><li><strong>Former client</strong> — has used you before, now at a new company</li></ul><h3>1. Identify shared goals</h3><ul><li>“How does filling this role impact your team personally?”</li><li>“What's the consequence if this doesn't get filled soon?”</li><li>“How are you measured on hiring success?”</li></ul><p>Align your outcomes to their success metrics.</p><h3>2. Deliver insights that make them look smart</h3><p>Champions back partners who make them faster and more credible. Send market salary data, speed-to-fill benchmarks, candidate scorecards, cost-of-vacancy breakdowns — framed as <em>“you can use this with your boss to reinforce why this hire matters.”</em></p><h3>3. Ask for internal intel</h3><ul><li>“Who else needs to weigh in?”</li><li>“Is there a vendor approval process I should know about?”</li><li>“Is there anything I should <em>not</em> say in the next meeting?”</li></ul><p>That last one gets you the real story.</p><h3>4. Equip them to sell internally</h3><p>Make it easy to pitch you when you are not in the room: a plain-language candidate summary, ROI bullets they can forward, and a short email draft they can send up the chain.</p><h3>5. Recognize their wins</h3><p>After a placement or a key meeting, call out their leadership — a thank-you note, a LinkedIn shoutout, <em>“you were key in making this happen.”</em> Champions stay when they feel valued.</p><h3>Champion mapping</h3><p>Per account, track: name, role, motivation, influence level, champion potential. In pipeline reviews the questions are: <em>Who's your champion here and how do you know? What are they personally motivated by? What did they do to move the deal this week?</em></p>"
 },
 {
  "id": "sb-d17-followup-strategy",
  "title": "Day 17 — Follow-up strategies that create urgency",
  "estimatedMinutes": 7,
  "content": "<p class=\"lead\">“Just checking in to see if you had a chance to review…” gets ignored, because it adds nothing, creates no urgency, and advances nothing.</p><h3>What follow-up is for</h3><ul><li>Stay top of mind</li><li>Advance the deal, not just check in</li><li>Reinforce value and urgency</li><li>Keep control of the sales cycle</li></ul><h3>The 3 V's</h3><p>Every follow-up carries at least one:</p><ul><li><strong>Value</strong> — insight, ROI reminder, testimonial</li><li><strong>Velocity</strong> — a reason to move quickly</li><li><strong>Vision</strong> — the future state if they act</li></ul><h3>Five-step model</h3><p><strong>1. Recap the last conversation</strong> — in their words. <em>“Last week you mentioned wanting to improve time-to-fill and reduce team workload…”</em></p><p><strong>2. Reinforce business value</strong> — tie it to their problem. <em>“We cut time-to-fill by 75%, which is roughly $X saved per hire based on your vacancy cost.”</em></p><p><strong>3. Introduce urgency</strong> — scarcity or timing, both real. <em>“We're holding a candidate who matches everything you asked for, and they're actively interviewing.”</em></p><p><strong>4. Offer a next step</strong> — with specific slots, a clear reason to meet, and an expected outcome. <em>“Can we take 15 minutes this week to align next steps or move forward with Candidate A?”</em></p><p><strong>5. Stay consistent without being annoying</strong> — run the cadence, then let the breakup email do its job.</p><h3>Cadence</h3><ul><li><strong>Day 0</strong> — recap, value points, next steps</li><li><strong>Day 2–3</strong> — new value: case study, testimonial, ROI calculator</li><li><strong>Day 5–7</strong> — light urgency: candidate still available, window closing</li><li><strong>Day 10+</strong> — breakup: “Should I close your file, or are you still considering?”</li></ul>"
 },
 {
  "id": "sb-d19-prospecting",
  "title": "Day 19 — Effective prospecting",
  "estimatedMinutes": 8,
  "content": "<p class=\"lead\">Don't prospect everyone. Prospect the accounts most likely to buy, and reach them where they actually respond.</p><h3>Know your ICP and territory</h3><ul><li><strong>Industry</strong> — manufacturing, automation</li><li><strong>Growth stage</strong> — hiring rapidly or post-funding</li><li><strong>Hiring pain</strong> — multiple openings, long time-to-fill, internal team overwhelmed</li><li><strong>Job roles</strong> — hires frequently for roles we actually staff</li><li><strong>Hiring model</strong> — open to contract, contract-to-hire, or niche perm</li></ul><p>Build niche prospect lists rather than one long one.</p><h3>Multi-channel outreach</h3><ul><li><strong>Email</strong> — scale and speed</li><li><strong>LinkedIn</strong> — personal and professional at once</li><li><strong>Phone</strong> — low response rate, high commitment when answered</li><li><strong>Voicemail drops</strong> — quick value</li><li><strong>Video messages</strong> — stand out</li></ul><h3>7-day cadence</h3><ul><li><strong>Day 1</strong> — email: value prop plus a relevant trigger</li><li><strong>Day 2</strong> — LinkedIn connect and message: warm intro</li><li><strong>Day 3</strong> — call plus voicemail: direct ask</li><li><strong>Day 4</strong> — email: case study or testimonial</li><li><strong>Day 6</strong> — LinkedIn voice or video: personalized</li><li><strong>Day 7</strong> — breakup email: “Should I close your file?”</li></ul><h3>Micro-personalization</h3><p>Drop the mass templates. Use signals:</p><ul><li><strong>Hiring signals</strong> — job ads, multiple open roles, new office openings</li><li><strong>Funding news</strong> — “Congrats on the Series B — now comes the hiring crunch.”</li><li><strong>Pain indicators</strong> — negative Glassdoor reviews, long hiring cycles</li><li><strong>Past hires</strong> — “You've hired 8 SDRs in 3 months — need help scaling?”</li></ul><h3>Message formula: Problem → Impact → Solution → CTA</h3><blockquote><p><strong>Subject:</strong> Struggling to fill [role] quickly?</p><p>Hi [First Name],</p><p>I noticed you're hiring multiple [role]s, and I imagine your team is under pressure to keep things moving while protecting quality.</p><p>We help companies like yours cut time-to-fill by 75%, often placing pre-vetted [role type]s within 72 hours.</p><p>Open to a quick 10-minute intro call this week?</p></blockquote><h3>Give-to-get offers</h3><ul><li>“Want a free 10-minute salary benchmark for [role] in [region]?”</li><li>“We'll send 2 pre-vetted profiles at no cost — just review them.”</li><li>“I ran your open reqs through our cost-of-vacancy calculator — want the results?”</li></ul><p>People respond to immediate, low-risk value.</p>"
 }
];
const HR_TOPICS = [
 {
  "id": "hp-meet-tmx",
  "title": "Meet TMX — who to contact for what",
  "estimatedMinutes": 4,
  "content": "<p class=\"lead\">TMX is the Team Member Experience group: HR and Payroll. Sending a question to the right half saves a day.</p><h3>Contact HR about</h3><ul><li>External team member onboarding</li><li>Greenshades password resets and username retrieval</li><li>Benefits, internal and external</li><li>Medical support notices</li><li>Compliance inquiries</li><li>Workers' compensation and injuries</li><li>Outlook password resets (internal only)</li></ul><h3>Contact Payroll about</h3><ul><li>Pay rate changes, internal and external</li><li>Vacation and PTO inquiries</li><li>Questions on reported hours</li><li>Wage garnishments and child support orders</li><li>Pay discrepancies and general payroll questions</li><li>Pay stubs and tax updates</li><li>Verifications of Employment (VOE)</li></ul><h3>Email distributions</h3><ul><li><strong>HR</strong> — sterlingTMX@sparktalentinc.com</li><li><strong>Payroll</strong> — timecards@sparktalentinc.com</li></ul><p>Use the distribution lists rather than individuals. It gets covered when someone is out.</p>"
 },
 {
  "id": "hp-onboarding-flow",
  "title": "Onboarding — the five steps",
  "estimatedMinutes": 5,
  "content": "<p class=\"lead\">From offer accepted to cleared to work. Know this cold — a candidate showing up uncleared is the mistake that costs a client relationship.</p><h3>Steps to know</h3><ol><li>Move the candidate to <strong>Onboarding</strong> on the Salesforce Kanban</li><li>TMX receives the offer through an email trigger notification</li><li>Paperwork is sent and onboarding is scheduled</li><li>Candidate completes pre-employment requirements</li><li><strong>Candidates can ONLY go to work once the recruiter sees on the Monday tracker that they are CLEAR</strong></li></ol><h3>Scheduling an in-office onboarding</h3><p>Send a calendar invite so there is room in the interview rooms and TMX is prepared:</p><ul><li>Title: <strong>“[Candidate Name] Onboarding”</strong></li><li>Invite <strong>Maryam Odeesh</strong> and <strong>sterlingTMX@sparktalentinc.com</strong></li><li>Pick the date and time the candidate wants to come in</li><li>In the body, say whether you need TMX assistance or are handling it yourself</li></ul>"
 },
 {
  "id": "hp-ids-i9",
  "title": "IDs and I-9 verification",
  "estimatedMinutes": 4,
  "content": "<p class=\"lead\">Employers are required by law to verify identity and work authorization. Valid IDs are required from every candidate before they are cleared to start.</p><h3>The two options</h3><ul><li><strong>Option 1</strong> — one valid ID from <strong>List A</strong></li><li><strong>Option 2</strong> — one valid ID from <strong>List B</strong> AND one from <strong>List C</strong></li></ul><h3>Two rules people miss</h3><ul><li><strong>IDs must be verified in the candidate's possession</strong> — in person with the documents, or virtually by having them hold the documents up</li><li><strong>IDs cannot be expired</strong> — the expiration date has to fall <em>after</em> the projected start date</li></ul><p>See the Acceptable Documents form for the full I-9 list.</p>"
 },
 {
  "id": "hp-screening",
  "title": "Drug testing & background checks",
  "estimatedMinutes": 5,
  "content": "<p class=\"lead\">Most clients require one or both. Which vendor and which method depends on the client, so check the offer notes.</p><h3>Drug testing — in house</h3><ul><li>Candidate signs the consent form <strong>before</strong> testing</li><li>Whoever performs the test, recruiter or TMX, signs and marks the boxes matching the results</li><li><strong>Results are instant</strong></li></ul><h3>Drug testing — clinic or lab</h3><ul><li>Used when the candidate cannot come into the office, or the client requires Concentra</li><li>TMX sets up an <strong>e-Passport</strong> the candidate takes to the clinic to be scanned</li><li>The passport carries the candidate name, expiration date, and location — <strong>it only works at the location it was set up for</strong></li><li>Specify the clinic requirement and the candidate's birthday in the offer notes so HR can build the authorization</li><li><strong>Results can take up to a week.</strong> Plan for it when you ask TMX to set up an e-pass</li></ul><h3>Background checks</h3><ul><li><strong>Asurint</strong> — most clients, using our Spark Rapid package. The candidate gets an email link, fills out the consent form and screening info. Custom packages can be built for unique client needs</li><li><strong>Shield</strong> — KUKA and UTEC use Shield Screening for a customized package</li></ul>"
 },
 {
  "id": "hp-greenshades",
  "title": "Greenshades — registration & employee access",
  "estimatedMinutes": 4,
  "content": "<p class=\"lead\">Greenshades New Hire Onboarding is part of pre-employment for every contract candidate.</p><h3>New hires</h3><p>Candidates receive an email from the SterlingTMX distribution containing the offer letter and the link to complete Greenshades. They fill in four pieces of information, click Continue, and move into personal information.</p><h3>Rehires</h3><p>Same email, different link. <strong>The rehire link is only needed if the candidate has not worked with us in over 30 days.</strong> Most rehires already have a Greenshades profile but will need to create login credentials — the steps are in the email.</p><h3>What team members can do in Greenshades</h3><ul><li>View and download pay stubs and year-end tax forms</li><li>View vacation bank and accrual, and request paid time off</li><li>Update tax withholding</li><li>Update direct deposit</li><li>Update personal and contact information</li></ul><p>All of it on the browser version.</p>"
 },
 {
  "id": "hp-payroll",
  "title": "Payroll — dates, deadlines & forms",
  "estimatedMinutes": 5,
  "content": "<p class=\"lead\">The dates are fixed. Missing a cutoff moves someone's money by a week, so know them by heart.</p><h3>The weekly rhythm</h3><ul><li>Payroll runs every <strong>Wednesday</strong></li><li>Team members are paid every <strong>Friday</strong></li><li>Payroll weeks run <strong>Monday through Sunday</strong></li><li>Direct deposit and tax withholding changes must be in by <strong>10:00 AM EST Wednesday</strong></li></ul><h3>Pay rate change form</h3><p>Required for a change in pay rate, bill rate, or shift premium. <strong>Forms must be turned in before the effective date</strong> and emailed to timecards@sparktalentinc.com.</p><h3>PTO request form</h3><p>Submit to timecards@sparktalentinc.com <strong>no later than Monday of the current week's pay run</strong>. Anything after Monday lands on the following week's paycheck.</p>"
 },
 {
  "id": "hp-benefits",
  "title": "External benefits & workers' comp",
  "estimatedMinutes": 5,
  "content": "<p class=\"lead\">New external team members have <strong>30 days from their first day</strong> to enroll. That window is unforgiving.</p><h3>During the 30-day window they can</h3><ol><li>Make benefits selections from the available options</li><li>Change existing selections, including opting back out</li></ol><p><strong>If no selection is made in 30 days, they cannot sign up until the next open enrollment</strong> unless they have a qualifying life event.</p><h3>Coverage options</h3><ul><li><strong>Minimum Essential Coverage (MEC)</strong> — satisfies the ACA requirement and covers many common screenings and preventive services at 100%</li><li><strong>Major Medical / Priority Health / HSA</strong> — better fit for someone with an illness requiring regular visits or hospital stays</li></ul><h3>Spark HR versus American Worker</h3><p><strong>Spark HR handles:</strong> digital insurance cards, coverage options and pricing, adding employees to the American Worker portal, emailing a benefits election form, open enrollment for qualifying life events.</p><p><strong>American Worker handles:</strong> physical insurance cards and member IDs, coverage and prescription questions, finding in-network doctors, choosing the right coverage, elections over the phone.</p><h3>Workers' compensation</h3><ol><li><strong>Immediate medical attention</strong> — life-threatening, call 911. Non-emergency, contact TMX to coordinate care at an approved occupational health clinic</li><li><strong>Injury reporting</strong> — the client completes an Injury Report as soon as possible and submits it to TMX</li><li><strong>Return to work</strong> — status is based on the doctor's evaluation; restrictions come from the medical provider</li></ol><h3>For external team members</h3><p>The external team member site covers all things onboarding: <a href=\"https://sparkcompanies.github.io/External-TeamMemberSite/\" target=\"_blank\" rel=\"noopener\">sparkcompanies.github.io/External-TeamMemberSite</a></p>"
 }
];

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
let data;
try { data = JSON.parse(h.slice(start, end + 1)); } catch (e) { die("LMS_DATA not parseable: " + e.message); }

fs.writeFileSync("index.backup-lmsv2-" + stamp + ".html", h);

const sales = data.subjects.find(s => s.id === "sales");
if (!sales) die("sales track not found — was v1 applied?");
const hrTrack = data.subjects.find(s => s.id === "hr-payroll");
if (!hrTrack) die("hr-payroll track not found — was v1 applied?");

// 1. Sales Bootcamp as its own track, so the process track stays clean
let bootTrack = data.subjects.find(s => s.id === "sales-bootcamp");
if (!bootTrack) {
  bootTrack = {
    id: "sales-bootcamp",
    name: "Sales Bootcamp",
    description: "Thirteen sessions on objections, negotiation, closing, and prospecting.",
    color: "#E0703A",
    category: "By function",
    topics: []
  };
  data.subjects.push(bootTrack);
}
const haveBoot = new Set(bootTrack.topics.map(t => t.id));
let addedBoot = 0;
BOOTCAMP.forEach(t => { if (!haveBoot.has(t.id)) { bootTrack.topics.push(t); addedBoot++; } });

// 2. HR/Payroll — replace the stub overview with the full set
const stubIdx = hrTrack.topics.findIndex(t => t.id === "hp-back-office");
if (stubIdx >= 0) hrTrack.topics.splice(stubIdx, 1);
const haveHr = new Set(hrTrack.topics.map(t => t.id));
let addedHr = 0;
HR_TOPICS.forEach(t => { if (!haveHr.has(t.id)) { hrTrack.topics.push(t); addedHr++; } });

// keep Everyone tracks ahead of By function
const rank = s => (s.category === "Everyone" ? 0 : 1);
data.subjects.sort((a, b) => rank(a) - rank(b));

h = h.slice(0, start) + JSON.stringify(data, null, 2) + h.slice(end + 1);
const bi = h.lastIndexOf("</body>");
if (bi < 0) die("no </body>");
h = h.slice(0, bi) + "<!-- LMS_TRACKS_v2 -->\n" + h.slice(bi);
fs.writeFileSync(F, h);

const topics = data.subjects.reduce((a, s) => a + (s.topics || []).length, 0);
console.log("APPLIED LMS_TRACKS_v2");
console.log("  Sales Bootcamp: +" + addedBoot + " sessions");
console.log("  HR / Payroll:   +" + addedHr + " topics (stub replaced)");
console.log("  now: " + data.subjects.length + " subjects / " + topics + " topics");
data.subjects.forEach(s => console.log("     [" + (s.category||"?") + "] " + s.name + " — " + (s.topics||[]).length));
console.log("  backup: index.backup-lmsv2-" + stamp + ".html");
