/* Spark HQ v2.4 — Trainual Content Pre-loaded */
import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

/* ── THEME ── */
const ThemeCtx = createContext({ dark: true, toggle: () => {} });
function useTheme() { return useContext(ThemeCtx); }

const Y = "#FFD200";
const YD = "#EDBD00";
const YL = "#FFE34D";
const YW = "#F59E0B";
const BG = "#f7f7f5";
const CARD = "#fff";
const GLASS = "#fff";
const BORDER = "#eee";

const SparkLogo = ({ height = 32 }) => {
const s = height / 32;
return (
<svg width={180 * s} height={height} viewBox="0 0 180 32" fill="none">
<path d="M14.5 2L8 16h7l-3.5 14L22 14h-7.5L18.5 2h-4z" fill="#FFC629" stroke="#E5AD00" strokeWidth="0.5"/>
<text x="30" y="18" fontFamily="Outfit,sans-serif" fontSize="14" fontWeight="800" fill="#1a1a2e" letterSpacing="3">SPARK</text>
<text x="30" y="29" fontFamily="Outfit,sans-serif" fontSize="7.5" fontWeight="400" fill="#999" letterSpacing="4">COMPANIES</text>
<text x="105" y="24" fontFamily="Outfit,sans-serif" fontSize="5" fill="#bbb">{"™"}</text>
</svg>
);
};

const I = ({ name, size = 16, color = "currentColor", sw = 1.5 }) => {
const d = {
home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3"/></>,
users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>,
clipboard: <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>,
target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
chevDown: <polyline points="6 9 12 15 18 9"/>,
chevRight: <polyline points="9 18 15 12 9 6"/>,
chevLeft: <polyline points="15 18 9 12 15 6"/>,
chevUp: <polyline points="18 15 12 9 6 15"/>,
ext: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
check: <polyline points="20 6 9 17 4 12"/>,
award: <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>,
map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
play: <><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></>,
file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
phone: <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.81.36 1.6.69 2.35a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.75.33 1.54.56 2.35.69a2 2 0 011.72 2.01z"/></>,
search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
compass: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>,
send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>,
heart: <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>,
globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>,
info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>,
};
return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d[name]}</svg>;
};

function useW() {
const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1080);
useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
return w;
}

function Reveal({ children, delay = 0, style = {} }) {
const ref = useRef(null);
const [vis, setVis] = useState(false);
useEffect(() => {
const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.08 });
if (ref.current) o.observe(ref.current);
return () => o.disconnect();
}, []);
return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: `all 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`, ...style }}>{children}</div>;
}

/* ────── DATA ────── */

const DIVISIONS = [
{ name: "Spark Talent Acquisition", abbr: "STA", color: "#FFD200", desc: "Skilled trades, engineering, light industrial, professional services. Temp, contract-to-hire, direct placement nationwide.", url: "https://sparktalentinc.com", founded: "2013" },
{ name: "Spark Packaging", abbr: "SPK", color: "#FF6B35", desc: "Niche staffing for converting, printing, packaging, food & beverage. Data-driven recruiting with Packaging School-trained recruiters.", url: "https://sparkpackaginginc.com", founded: "2018" },
{ name: "Flex Workforce Solutions", abbr: "FLX", color: "#4ECDC4", desc: "Specialized in automation industry staffing: engineers, programmers, project managers for robotics and automation.", url: "https://flexworkforceco.com", founded: "2020" },
{ name: "Ignite Search", abbr: "IGN", color: "#FF3366", desc: "Executive and leadership search in manufacturing, finance, and special projects. CFOs, COOs, VPs, and Directors.", url: "https://ignitesearch.com", founded: "2022" },
{ name: "John Joseph Partners", abbr: "JJP", color: "#7C5CFC", desc: "IT staffing for the MSP ecosystem: MSPs, MSSPs, TSPs, VARs. Help desk through C-suite technology roles.", url: "https://johnjosephpartners.com", founded: "2021" },
];

const CAREER_TRACKS = [
{ name: "Recruiter Career Path", icon: "search", color: "#FFD200", tag: "PRODUCTION", desc: "Technical/Skilled Trades/Light Industrial recruiting roles", keyMetrics: "$29K Target Raw Total Monthly · $40K Goal Raw Total Monthly",
levels: [
{ title: "Recruiter", salary: "$50,000", rates: [{ label: "Recruiting", val: "5% (10% of raw total)" }, { label: "Full Desk", val: "15% — Needs Executive Approval" }], floor: true, criteria: "$25K/quarter commission floor", promo: "$50K in one quarter + completed checklist in first 6 months, or $200K cumulative annual if past 6 months → Sr. Recruiter" },
{ title: "Sr. Recruiter", salary: "$60,000", rates: [{ label: "Recruiting", val: "6% (12% of raw total)" }, { label: "Full Desk", val: "15% — Needs Executive Approval" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $286K raw total charge → Executive Recruiter (commission to 8%)" },
{ title: "Executive Recruiter", salary: "$60,000", rates: [{ label: "Recruiting", val: "8% (16% of raw total)" }, { label: "Full Desk", val: "15% — Needs Executive Approval" }], floor: true, criteria: "$25K/quarter commission floor. Must achieve 2 annual contests", promo: "Cross $338K raw total + 2 annual contests → Presidents Club ($70K base, floor removed)" },
{ title: "Executive Recruiter — Presidents Club", salary: "$70,000", rates: [{ label: "Recruiting", val: "8% (16% of raw total)" }, { label: "Full Desk", val: "15% — Needs Executive Approval" }], floor: false, criteria: "No commission floor ($16K annual raise = 23% base increase). Must achieve 3 annual contests", promo: "Cross $442K raw total + 3 annual contests → Sr. Exec Recruiter PC" },
{ title: "Sr. Executive Recruiter — Presidents Club", salary: "$70,000 → $80,000", rates: [{ label: "Recruiting", val: "8% (16% of raw total)" }, { label: "Full Desk", val: "15% — Needs Executive Approval" }], floor: false, criteria: "No commission floor. Cross $500K to move to $80K base", promo: "Cross $552K raw total charge → top tier ($80K base)" },
] },
{ name: "Account Recruiting Manager (ARM)", icon: "star", color: "#4ECDC4", tag: "PRODUCTION", desc: "Full desk account management — split and full desk commission", keyMetrics: "$29K Target Raw Total Monthly · $40K Goal Raw Total Monthly",
levels: [
{ title: "ARM Level I", salary: "$50,000", rates: [{ label: "Full Desk", val: "15% (12% of raw total)" }, { label: "Split", val: "6% (12% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "$50K in one quarter + checklist in first 6 months, or $200K cumulative annual → ARM Level II" },
{ title: "ARM Level II", salary: "$60,000", rates: [{ label: "Full Desk", val: "15% (12% of raw total)" }, { label: "Split", val: "6% (12% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross contest $312K → Account Recruiting Executive. Miss contest 2 years → demotion" },
{ title: "Account Recruiting Executive", salary: "$60,000", rates: [{ label: "Full Desk", val: "16% (16% of raw total)" }, { label: "Split", val: "8% (16% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $390K → Sr. ARE ($70K base). Miss contest 2 years → demotion" },
{ title: "Sr. Account Recruiting Executive", salary: "$70,000", rates: [{ label: "Full Desk", val: "16% (16% of raw total)" }, { label: "Split", val: "8% (16% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $442K → Presidents Club (floor removed). Miss contest 2 years → demotion" },
{ title: "Sr. ARE — Presidents Club", salary: "$70,000 → $80,000", rates: [{ label: "Full Desk", val: "16% (16% of raw total)" }, { label: "Split", val: "8% (16% of raw total)" }], floor: false, criteria: "No commission floor ($16K annual raise). Cross $500K → $80K base", promo: "Cross $552K raw total charge → top tier" },
] },
{ name: "Sales Career Path", icon: "trending", color: "#FF6B35", tag: "PRODUCTION", desc: "Business development through split commission on account sales", keyMetrics: "$29K Target Raw Total Monthly · $40K Goal Raw Total Monthly",
levels: [
{ title: "Sales Manager Level I", salary: "$50,000", rates: [{ label: "Split", val: "6% (12% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "$50K in one quarter + checklist in first 6 months, or $200K cumulative annual → Level II" },
{ title: "Sales Manager Level II", salary: "$60,000", rates: [{ label: "Split", val: "8% (16% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross contest $312K → Sales Executive. Miss contest 2 years → demotion" },
{ title: "Sales Executive", salary: "$60,000", rates: [{ label: "Split", val: "10% (20% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $390K → Sr. Sales Exec ($70K base). Miss contest 2 years → demotion" },
{ title: "Sr. Sales Executive", salary: "$70,000", rates: [{ label: "Split", val: "10% (20% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $442K → Presidents Club (floor removed). Miss contest 2 years → demotion" },
{ title: "Sr. Sales Executive — Presidents Club", salary: "$70,000 → $80,000", rates: [{ label: "Split", val: "12% (24% of raw total)" }], floor: false, criteria: "No commission floor ($20K annual raise). Above $500K paid at 12%. Cross $500K → $80K base", promo: "Cross $552K raw total charge → top tier" },
] },
{ name: "Onsite Manager Career Path", icon: "map", color: "#FF3366", tag: "PRODUCTION", desc: "Client-embedded management with full desk & split commission", keyMetrics: "Client-site based · Full desk + split structure",
levels: [
{ title: "Onsite Manager", salary: "$55,000", rates: [{ label: "Full Desk", val: "15% (12% of raw total)" }, { label: "Split", val: "6% (12% of raw total)" }], floor: false, criteria: "Client-site production role", promo: "$50K in one quarter + checklist in first 6 months, or $200K cumulative annual → Sr. Onsite Manager" },
{ title: "Sr. Onsite Manager", salary: "$60,000", rates: [{ label: "Full Desk", val: "15% (12% of raw total)" }, { label: "Split", val: "6% (12% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $286K contest → Regional Onsite Manager PC. Miss contest 2 years → demotion" },
{ title: "Regional Onsite Manager — Presidents Club", salary: "$70,000", rates: [{ label: "Full Desk", val: "16% (16% of raw total)" }, { label: "Split", val: "8% (16% of raw total)" }], floor: true, criteria: "$25K/quarter commission floor", promo: "Cross $442K → Regional Onsite Executive PC. Miss contest 2 years → demotion" },
{ title: "Regional Onsite Executive — Presidents Club", salary: "$70,000", rates: [{ label: "Full Desk", val: "16% (16% of raw total)" }, { label: "Split", val: "8% (16% of raw total)" }], floor: false, criteria: "No commission floor", promo: "Cross $500K → Sr. Regional ($80K base). Miss contest 2 years → demotion" },
{ title: "Sr. Regional Onsite Executive — Presidents Club", salary: "$80,000", rates: [{ label: "Full Desk", val: "16% (16% of raw total)" }, { label: "Split", val: "8% (16% of raw total)" }], floor: false, criteria: "No commission floor ($16K annual raise)", promo: "Cross $552K raw total charge → top tier" },
] },
{ name: "Business Development Associate", icon: "rocket", color: "#7C5CFC", tag: "PRODUCTION", desc: "Entry-level business development with contest-based salary progression", keyMetrics: "3% Signed Accounts + 3% Recruiting commission",
levels: [
{ title: "BD Associate — Contest 1", salary: "$40–50K", rates: [{ label: "Signed Accounts", val: "3%" }, { label: "Recruiting", val: "3%" }], floor: false, criteria: "Entry level business development", promo: "$143K cumulative charge → $45K base" },
{ title: "BD Associate — Contest 2", salary: "$45K → $47K", rates: [{ label: "Signed Accounts", val: "3%" }, { label: "Recruiting", val: "3%" }], floor: false, criteria: "Contest Level 2 achieved", promo: "$286K cumulative charge → $47K base" },
{ title: "BD Associate — Contest 3", salary: "$47K → $50K", rates: [{ label: "Signed Accounts", val: "3%" }, { label: "Recruiting", val: "3%" }], floor: false, criteria: "Contest Level 3 achieved", promo: "$429K cumulative charge → $50K base" },
{ title: "BD Executive — Contest 4–8", salary: "$53K → $70K", rates: [{ label: "Signed Accounts", val: "3%" }, { label: "Recruiting", val: "3%" }], floor: false, criteria: "Contest levels 4–8 with increasing salary. 18 months from signature date", promo: "Continue advancing through contest levels to Sr. BD Executive" },
] },
{ name: "BD Lead / Client Success Manager", icon: "award", color: "#E84393", tag: "PRODUCTION", desc: "Account leadership — BD Lead, Client Success Manager, Director progression", keyMetrics: "3–3.5% Signed Accounts + 3–3.5% Recruiting",
levels: [
{ title: "Business Development Lead", salary: "$60K → $75K", rates: [{ label: "Signed Accounts", val: "3%" }, { label: "Recruiting", val: "3%" }], floor: false, criteria: "Contest-based progression through 4 tiers", promo: "Team Igniter Achieved → Client Success Manager" },
{ title: "Client Success Manager", salary: "$65K → $100K", rates: [{ label: "Signed Accounts", val: "3.5%" }, { label: "Recruiting", val: "3.5%" }], floor: false, criteria: "Elevated commission rate. Contest-based progression through 4 tiers", promo: "Team Igniter Achieved → Director of Client Success" },
{ title: "Director of Client Success", salary: "$75K → $100K", rates: [{ label: "Signed Accounts", val: "3.5%" }, { label: "Recruiting", val: "3.5%" }], floor: false, criteria: "Director-level leadership. Contest-based through 4 tiers", promo: "Team Igniter Achieved → Sr. Director of Business Development" },
] },
{ name: "Operations Track", icon: "settings", color: "#636e72", tag: "BACK OFFICE", desc: "Systems, data, process, and operational excellence", keyMetrics: "Internal role · Salaried",
levels: [
{ title: "Internal Recruiter", salary: "Varies", rates: [], floor: false, criteria: "Internal talent pipeline, job postings, interview coordination", promo: "Operations Coordinator or HR track based on interest" },
{ title: "Data Analyst", salary: "Varies", rates: [], floor: false, criteria: "Salesforce reporting, fill ratio analysis, recruiting metrics, business intelligence", promo: "Systems Operations Manager" },
{ title: "Systems Operations Manager", salary: "Varies", rates: [], floor: false, criteria: "ATS management, tech tools, vendor relationships, system integrations", promo: "Director of Operations" },
{ title: "Director of Operations", salary: "Varies", rates: [], floor: false, criteria: "Champion ATS, job boards, career mapping, onboarding & training, HR service projects", promo: "VP of Operations" },
] },
{ name: "Payroll Track", icon: "dollar", color: "#00b894", tag: "BACK OFFICE", desc: "Payroll processing, compliance, and financial operations", keyMetrics: "Internal role · Salaried",
levels: [
{ title: "Payroll Specialist", salary: "Varies", rates: [], floor: false, criteria: "Weekly payroll processing, timesheet verification, tax filing support, employee pay inquiries", promo: "Demonstrate accuracy, volume handling, multi-entity expertise → Payroll Manager" },
{ title: "Payroll Manager", salary: "Varies", rates: [], floor: false, criteria: "Full payroll oversight across all entities, tax compliance, Greenshades admin, team leadership", promo: "Senior leadership / VP of Operations support" },
] },
{ name: "HR Track", icon: "shield", color: "#fd79a8", tag: "BACK OFFICE", desc: "Human resources, compliance, and team member experience", keyMetrics: "Internal role · Salaried",
levels: [
{ title: "HR Generalist", salary: "Varies", rates: [], floor: false, criteria: "Onboarding, benefits administration, employee relations, compliance documentation, background checks", promo: "Demonstrate leadership in compliance, escalation handling, training → HR Lead" },
{ title: "HR Lead", salary: "Varies", rates: [], floor: false, criteria: "Team leadership, policy development, escalation management, compliance training", promo: "HR Manager or VP of Operations pathway" },
] },
];

const BONUS_SCHEDULE = { quarterly: [
{ level: 1, charge: 87000, bonus: 1250 },{ level: 2, charge: 90000, bonus: 1500 },{ level: 3, charge: 95500, bonus: 1750 },{ level: 4, charge: 102000, bonus: 2000 },{ level: 5, charge: 108500, bonus: 2250 },{ level: 6, charge: 115000, bonus: 2500 },{ level: 7, charge: 121500, bonus: 2750 },{ level: 8, charge: 136000, bonus: 3000 },{ level: 9, charge: 144000, bonus: 3250 },
], annual: [
{ level: 1, charge: 286000, bonus: 4500, uars: 1000 },{ level: 2, charge: 312000, bonus: 5000, uars: 1500 },{ level: 3, charge: 338000, bonus: 5500, uars: 2000 },{ level: 4, charge: 364000, bonus: 6000, uars: 2500 },{ level: 5, charge: 390000, bonus: 6500, uars: 3000 },{ level: 6, charge: 416000, bonus: 6500, uars: 3000 },{ level: 7, charge: 442000, bonus: 7000, uars: 3500 },{ level: 8, charge: 500000, bonus: 7500, uars: 4000 },{ level: 9, charge: 552000, bonus: 8000, uars: 5000 },
]};
const TRAINING_SECTIONS = [
{ cat: "Computer Setup & Onboarding", icon: "settings", assignedGroups: ["All Employees"], items: [
  { name: "Computer Setup & Microsoft Authenticator", quiz: false, desc: "First-day tech setup: password, Wi-Fi, OneDrive, Chrome, MFA", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Change Your Password & Connect", body: "Go to microsoft.com, click sign in, then click your profile photo > View Account > Change Password. Connect to Wi-Fi (SparkWireless / PW: Spark2015 if in Troy office). Download the Microsoft Outlook app on your phone." },
    { heading: "OneDrive & Browser Setup", body: "Check the cloud icon at the bottom of your screen. If it says 'up to date' you're good. If there's a no-smoking sign, sign in with your email and password. Always save files under OneDrive. Use Google Chrome — not Internet Explorer." },
    { heading: "Microsoft Authenticator Setup", body: "Open the Authenticator app on your phone. Select Add Account (+). Choose Work Account. Sign in with your company email/password, or scan the QR code. After your account appears, use one-time codes to sign into Microsoft 365." },
    { heading: "Power, Display & Notification Settings", body: "Set power settings so closing the lid doesn't shut down unexpectedly. Pin key apps to taskbar: Chrome, Teams, Outlook, Files, Excel, Word, Snip. Set up multiple monitors under Settings > System > Display." },
    { heading: "Set Default Browser", body: "In Windows Settings: search 'default apps', scroll to browser, switch to Chrome. In Teams: three dots > Settings > Files and Links > set to 'default browser'." }
  ] },
  { name: "Tech Stack & Teams Setup", quiz: false, desc: "All the tools you'll use daily and how to configure Teams", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Your Daily Tech Stack", body: "Microsoft 365, Monday.com, SharePoint, Salesforce/Asymbl, LinkedIn/Indeed/ZipRecruiter/ZoomInfo, GreenEmployee. Download on phone: Outlook, Teams, LinkedIn, Microsoft Authenticator, GreenEmployee." },
    { heading: "Teams Backdrop & Auto-Start", body: "Save company backdrop. Teams > Calendar > Meet Now > Camera > Effects > More > Add New > select backdrop. Auto-start: three dots > Settings > General > check Auto-Start." },
    { heading: "Teams Channels & Group Chats", body: "Spark Portfolio Channel: weekly announcements, tracker updates, charge reports. Spark Portfolio ALL TEAM Chat: quick company-wide messages — birthdays, reminders." }
  ] },
  { name: "Outlook Signature & Communication Guide", quiz: false, desc: "Email signature setup and when to use Teams vs Email", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Outlook Signature Setup", body: "Outlook > Settings > Account > Signature > Add New. Copy/paste template, fill in your info. Right-click LinkedIn photo > Edit Link > paste your profile URL. Set as default for new messages and replies." },
    { heading: "Teams vs Email", body: "Teams: quick response, short questions, real-time collaboration, file sharing. Email: detailed/formal info, external contacts, documenting decisions, non-urgent." },
    { heading: "Never Miss a Teams Message", body: "Profile > Settings > Notifications > Missed Activity Emails > 'As soon as possible'. Customize @mentions, replies, and chat alerts." }
  ] },
  { name: "LinkedIn, Google & Bookmarks Setup", quiz: false, desc: "Brand your LinkedIn, Google account, essential bookmarks, Bookings", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "LinkedIn Profile", body: "Profile > Edit > add title and company. Update header photo with Spark backdrop. Add position under Experience." },
    { heading: "Google & Bookmarks", body: "Create Google account with Spark email. Bookmark: Paycor, LinkedIn, Michigan Talent Bank, Microsoft 365, Trainual, PI Board, SharePoint, Monday." },
    { heading: "Microsoft Bookings", body: "office.com > All Apps > Bookings. Name = Your Name, add logo, Hours = M-F 8-5 PM. Customize and publish." }
  ] },
] },
{ cat: "Company Culture & Core Values", icon: "star", assignedGroups: ["All Employees"], items: [
  { name: "Welcome to Spark Companies", quiz: true, desc: "History, purpose, family of companies, org structure, dress code", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "History & Purpose", body: "Founded 2013 by Aaron Opalewski. Michigan-headquartered recruiting and staffing. Purpose: help PEOPLE grow — 100,000 annual opportunities nationwide. Money follows service, it doesn't lead. We're in the people development business." },
    { heading: "Family of Companies", body: "1 Management Company (Spark Companies), 1 Content Company (Bolt Creative), 5 Staffing Companies: Spark Talent, Spark Packaging, John Joseph Partners, Ignite Executive Search, Flex Workforce Solutions." },
    { heading: "Key Leadership", body: "CEO: Aaron Opalewski. VP Ops: Allie Spegel. CSO: Dave Veres. VP Professional Dev: Alex Gorman. VP ARMs: Ryan Aymen. Dir of Ops: Mary Patrico. Payroll Mgr: Priyanka Malani." },
    { heading: "Dress Code", body: "Casual but appropriate. No offensive imagery. Company logo apparel encouraged. Business casual for client meetings. No lounge/sweatpants. Shorts on Fridays in summer. Hats only Fridays unless company logo." }
  ] },
  { name: "Core Values Deep Dive", quiz: false, desc: "All 8 core values with detailed explanations", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Leading by Example", body: "It isn't just a way — it's the ONLY way. Every person leads by example regardless of title. Be willing to do hard tasks. Model behavior. Seek feedback." },
    { heading: "Do the Right Thing", body: "Integrity and respect — always. Act with honesty. Maintain ethics even when no one is watching." },
    { heading: "Conquering Adversity", body: "Challenges are normal. Use mistakes to learn. Stay persistent. Celebrate successes when they come." },
    { heading: "Be Humble, Crave Improvement", body: "Be coachable. No matter how good, there's another level. Ask for and apply feedback." },
    { heading: "People Driven; Service Focused", body: "Go the extra mile. Same professionalism to colleagues as clients. Listen before offering solutions." },
    { heading: "Dominate the Day", body: "Take control with determination. Prepare today for tomorrow. Each day is a chance to excel." },
    { heading: "Deliver Value & Mindset", body: "Understand needs first. Stay curious and committed. Positive mindset is the foundation — obstacles are opportunities." }
  ] },
  { name: "Language, Meetings & Igniters", quiz: false, desc: "Words matter, mandatory meetings, PI Board, terminology", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Words Matter", body: "'Team members' not 'employees'. 'My pleasure' not 'No problem'. In sales: 'investment' not 'fee', 'invoice' not 'bill'." },
    { heading: "Mandatory Meetings", body: "Bi-weekly Company: Tuesdays 4 PM (everyone). Sales/Recruiting Trainings (production). PI Board: 8:45 AM Mon & Fri (production). Igniters = division GP goals." }
  ] },
] },
{ cat: "Recruiting Process Training", icon: "search", assignedGroups: ["All Employees"], items: [
  { name: "The Complete Recruiting Lifecycle", quiz: true, desc: "Req qualification through placement, ongoing service, and terminations", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Staffing Fundamentals", body: "Staffing: strategically identifying, recruiting, and placing talent. Components: workforce planning, recruitment, selection, onboarding, retention & development." },
    { heading: "Req Qualification & Research", body: "Clarify expectations with Account Manager. Understand opening type. Identify must-haves vs. nice-to-haves. Study JD, research client industry and culture." },
    { heading: "Sourcing & Contact", body: "Boolean search strings with keywords, locations, titles, certifications. Tools: LinkedIn, Indeed, ZipRecruiter, ZoomInfo, ATS. Daily phone screen goals per KPIs. Call sheets prepared night before." },
    { heading: "Prescreening & References", body: "Flow: Intro > Candidate Overview > Role Overview > Q&A > Next Steps. Asymbl templates: CTRL + . in text box. References use TEDW: Tell me, Explain, Describe, Walk me through." },
    { heading: "Submittals & Interviews", body: "Use submittal template. Attach resume. For interviews: schedule, send candidate prep, share tips, debrief both sides after." },
    { heading: "Offer Through Ongoing Service", body: "Call with excitement for offers. Send details to TMX. Prep email 2 days before start. Day-before check-in. First-day follow-up. Regular check-ins throughout." },
    { heading: "Terminations", body: "Get client feedback. Call directly — never voicemail details. Factual and calm. Document in ATS. Notify payroll. Offer future help." }
  ] },
  { name: "Salesforce: Jobs, Sourcing & Call Sheets", quiz: false, desc: "Creating posts, sourcing in ATS, managing KanBan", type: "process", location: "All Team Members", url: null, content: [
    { heading: "Job Posts", body: "Job > Details tab > External Job Description > paste JD > check 'Post Externally'. Update logo to correct entity." },
    { heading: "Sourcing & Call Sheets", body: "Search with Filters or via Job > Applicants & Match. Task button on profiles to schedule calls. Call sheet in ATS KanBan. Log all activities." }
  ] },
] },
{ cat: "Recruiting & Employment Law", icon: "shield", assignedGroups: ["All Employees"], items: [
  { name: "Federal Laws & Protected Classes", quiz: true, desc: "EEOC, 8 key federal laws, interview compliance tips", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Protected Classes", body: "Spark is Equal Opportunity. Protected: national origin, race, color, sex, age 40+, religion, genetic info, marital status, height/weight, arrest record, disability." },
    { heading: "Key Federal Laws", body: "Title VII (1964), Equal Pay Act (1963), ADA, ADEA, Immigration Reform Act (1986), Bankruptcy Act, EEOC Act, Civil Rights Act (1966)." },
    { heading: "Compliance Tips", body: "Be conversational. If candidate mentions protected class, pivot and note EEOC compliance. Never ask personal questions. Document only facts." }
  ] },
  { name: "Terminations & Michigan Law", quiz: true, desc: "At-will employment, legal do's and don'ts", type: "doc", location: "All Team Members", url: null, content: [
    { heading: "Michigan At-Will", body: "Can terminate anytime for any legal reason. Illegal: discrimination (Elliott-Larsen), retaliation (Whistleblowers' Act), breach of contract." },
    { heading: "Do's", body: "Document with objective language. Review policies. Communicate clearly and privately. Provide final details. Update ATS." },
    { heading: "Don'ts", body: "Don't discriminate or retaliate. No voicemail terminations. Don't apologize or get personal. Don't violate confidentiality." }
  ] },
] },
{ cat: "Sales Process Training", icon: "trending", assignedGroups: ["Production"], items: [
  { name: "Prospect: Target Strategy", quiz: true, desc: "Top 20/Next 20, ZoomInfo, daily prospecting discipline", type: "doc", location: "ARM's and Sales", url: null, content: [
    { heading: "Top 20 / Next 20", body: "20 primary + 20 secondary accounts. Criteria: use staffing, hire 3-5x/year technical or 5+ contractors/week, your top 5 skills, competitive pay, local decision-maker. Target 3-5 managers per account. Tag by skill sets." },
    { heading: "Daily Discipline", body: "80% of time on target accounts. Track outreach consistently. ZoomInfo: set workflows/alerts for prospect activity and manager changes." }
  ] },
  { name: "Engage: Discovery & Meetings", quiz: false, desc: "Preparation, productive meetings, consultative positioning", type: "doc", location: "ARM's and Sales", url: null, content: [
    { heading: "Discovery Prep", body: "Research careers page/job boards. Identify similar clients. Questions: hiring volume, pain points, decision structure, budget/timeline. Bring candidates to meetings." },
    { heading: "Meeting Execution", body: "Agenda: discovery, candidate review, next steps. Gather intel on org structure, process, procurement, competition. Position as consultative partner." }
  ] },
  { name: "Qualify: The 4 P's", quiz: false, desc: "Position, Pay, Process, People — negotiation and sourcing strategy", type: "doc", location: "ARM's and Sales", url: null, content: [
    { heading: "The 4 P's", body: "Position: role/responsibilities/skills. Pay: competitive? Process: interviews/timeline/decision-makers. People: stakeholders — HM, leads, procurement." },
    { heading: "Close Qualification", body: "Get 2 technical questions from HM. Negotiate win/win/win. Create sourcing strategy with recruiter. Schedule interviews during qualification." }
  ] },
  { name: "Deliver, Service & Knowledge", quiz: false, desc: "Screening, influence, ongoing service, documentation", type: "doc", location: "ARM's and Sales", url: null, content: [
    { heading: "Deliver", body: "Collaborate with recruiter pre-submit. Review past candidates. Call don't email. Sell strengths. Sit in on interviews. Debrief both sides." },
    { heading: "Service", body: "Contractor performance feedback. Intro to other managers. Always ask for next req. Liaison for hours/pay." },
    { heading: "Knowledge", body: "Log everything in ATS. Involve recruiter in docs. Teach lead generation from talent and reference techniques." }
  ] },
] },
{ cat: "Recruiter Compliance Refresher", icon: "shield", assignedGroups: ["Production"], items: [
  { name: "Compliance Training & Assessment", quiz: true, desc: "Protected categories, FCRA, drug screening, social media, AI in hiring", type: "doc", location: "Recruiting", url: null, content: [
    { heading: "What's Covered", body: "Protected categories, compliant vs. non-compliant questions, red flag phrases, drug screening/marijuana laws, background checks (FCRA, Ban the Box, adverse action), social media screening, AI/technology regulations." },
    { heading: "Tools & Resources", body: "State-by-state alerts (CA, NY, IL, MA, TX, CO, WA, FL). Compliance timeline. Escalation flowchart. Note-taking guide. Accommodation handling. Communication templates." },
    { heading: "Assessment", body: "Practice scenarios + 12-question quiz. Need 10/12 to pass. Reflects general U.S. employment law. Consult legal for jurisdiction-specific guidance." }
  ] },
] },
{ cat: "Leader-Based Training Activities", icon: "award", assignedGroups: ["All Employees"], items: [
  { name: "KPI, Call Sheet & Boolean Activities", quiz: false, desc: "Hands-on leader-guided training exercises", type: "interactive", location: "All Team Members", url: null, content: [
    { heading: "Reading KPIs", body: "Leader explains PI Board KPIs, shows each section, covers daily meeting updates, and explains how to exceed metrics." },
    { heading: "Call Sheet Activity", body: "Leader shows their call sheet. Together, build yours with a curated candidate list." },
    { heading: "Boolean Search", body: "Create an in-depth Boolean string for a current opening — location, titles, certifications." }
  ] },
  { name: "Contact, Prescreen & Submittal Activities", quiz: false, desc: "Message templates, role-play, dummy submittals, reference practice", type: "interactive", location: "All Team Members", url: null, content: [
    { heading: "Message Template", body: "Leader helps create outreach message for a current opening. Send to candidate and work through response together." },
    { heading: "Prescreen Role-Play", body: "Mock prescreen with real JD. Take turns as recruiter/candidate. Focus on tone, flow, questions. Debrief." },
    { heading: "Submittal & Reference", body: "Create 1-2 dummy submittals with resume, notes, feedback. Role-play reference call with leader as 'client'." }
  ] },
] },
{ cat: "Sales Mastery", icon: "trending", assignedGroups: ["Production"], items: [
    { name: "Sales Mastery Day 1: Objection Handling", quiz: true, desc: "Recognize the 6 objection types, diagnose the real concern beneath the words, and respond with empathy and evidence.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Why objections are a buying signal", body: "Objections aren't rejection — they're requests for more information. A prospect who pushes back is engaged. A prospect who says 'sounds great, send me info' is usually gone. Treat every objection as an invitation to go deeper. The reps who close the most deals are the ones who hear the most objections — because they're earning trust at every step instead of running from friction." },
      { heading: "The 6 objection types", body: "1) PRICE — 'It costs too much.' 2) VALUE — 'I don't see the ROI.' 3) NEED — 'We're not hiring right now.' 4) TIMING — 'Not the right quarter.' 5) TRUST — 'I've never heard of you.' 6) COMPETITOR — 'We already work with someone.' Every objection you'll ever hear maps to one of these six. Your first job is to label it correctly — because the response for Price is completely different from the response for Trust." },
      { heading: "Root cause analysis: What are they really saying?", body: "'It's too expensive' rarely means the price is too high. It usually means: 'I don't see enough value to justify the cost,' OR 'I haven't sold this internally yet,' OR 'I'm comparing apples to oranges.' Your job is to ask one more question before you respond. 'Help me understand — too expensive compared to what?' That single question separates pros from amateurs." },
      { heading: "Active listening and mirroring", body: "Mirroring = repeat the last 2-3 words of what they said as a question. Prospect: 'We just don't have the bandwidth right now.' You: 'Don't have the bandwidth?' This forces them to elaborate, and 80% of the time they'll reveal the real concern. Don't interrupt. Don't problem-solve until they've fully unloaded. People feel heard when you slow down." },
      { heading: "Probing questions that diagnose the real issue", body: "Ask: 'When you say it's too much, are you reacting to the per-hour rate, the total spend, or the comparison to your last vendor?' / 'If price weren't a factor, would you move forward?' / 'What would have to be true for this to be a no-brainer?' These questions surface whether you have a price problem, a value problem, or a buy-in problem — and each requires a different play." },
      { heading: "The Acknowledge → Reframe → Evidence → Confirm framework", body: "ACKNOWLEDGE: 'I hear you, that's a fair concern.' REFRAME: 'Let me put this in context — most of our clients felt the same way before they saw the cost of the open role.' EVIDENCE: Use a specific case study, ROI number, or reference. CONFIRM: 'Does that change how you're thinking about it?' Never skip the confirm — it tells you whether the objection is handled or whether you need another lap." }
    ] },
    { name: "Sales Mastery Day 2: Negotiation Strategies", quiz: true, desc: "Shift conversations from price to value, anchor strong, bundle instead of discount, and walk away with confidence.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Shift the conversation from price to value", body: "When a prospect leads with price, you've already lost the frame. Reset it: 'Before we talk numbers, let's make sure we're solving the right problem. What's the cost to you of this role staying open another 30 days?' Now you're negotiating on impact, not invoice. The prospect who anchors on price is comparing you to a commodity. Your job is to refuse the commodity frame." },
      { heading: "Anchor early and high", body: "Whoever anchors first sets the gravity of the negotiation. State your standard fee with confidence and zero apology: '20% of first-year base, paid net 30 on start date.' Don't preface with 'normally' or 'we usually.' Don't trail off. Anchoring high gives you room to negotiate; anchoring low gives the prospect a floor to push beneath." },
      { heading: "Bundle, don't discount", body: "If a prospect pushes for a discount, never just lower the number. INSTEAD: add or remove scope. 'I can hit that number if we move from 90-day to 60-day guarantee.' OR 'At that rate, we'd run a 4-week exclusive instead of 6.' Discounting trains the prospect that your price was inflated. Bundling teaches them that price tracks value. Every concession should cost them something in return." },
      { heading: "Leverage urgency and opportunity cost", body: "Reinforce what they lose by waiting: 'The role has been open 47 days. At your loaded cost of vacancy of $1,800/day, that's $84,600 in lost productivity. Our average time-to-fill is 21 days. Even at our full rate, the ROI is in week one.' Make the cost of inaction more vivid than the cost of action." },
      { heading: "Scripts: 'Can you do better on price?'", body: "RESPONSE A: 'I appreciate the ask. Help me understand — if we hit your number, are we moving forward today, or is there another step?' (Surfaces real authority.) RESPONSE B: 'I have flexibility, but it's tied to scope. Are you open to a different guarantee window or exclusivity period?' (Bundles instead of discounts.) RESPONSE C: 'The fee reflects the search depth this role requires. If we cut the fee, we'd cut the depth — and that's not a win for either of us.' (Holds the line on value.)" },
      { heading: "Walk away with confidence", body: "The most powerful word in negotiation is the willingness to use 'no.' If the deal economics don't work, name it: 'It sounds like we're not aligned on investment level. I'd rather pass than under-deliver. If your situation changes, I'm here.' 90% of the time, the prospect comes back. The other 10%, you saved yourself a money-losing engagement. Either outcome is a win." }
    ] },
    { name: "Sales Mastery Day 3: Value-Based Selling", quiz: true, desc: "Sell results, not features. Make the buyer the hero. Tie every benefit to a business goal.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Sell results, not features", body: "Features tell. Results sell. 'We have 50 recruiters' is a feature. 'We fill controls roles in 18 days versus the industry's 47' is a result. Every feature in your pitch needs a 'so that' — 'We have a dedicated industry team SO THAT your role is filled by someone who already speaks PLC.' If you can't finish the 'so that,' cut the feature." },
      { heading: "Make the buyer the hero", body: "Your prospect isn't buying staffing services — they're buying the version of themselves who solved a problem and got promoted. Frame every win in their language: 'When we fill this role, you'll be the one who unblocked the production line and got the plant back to capacity.' You are Yoda, not Luke. Their wins are the story. Your service is the lightsaber." },
      { heading: "Tie benefits to business goals", body: "Don't sell faster fills — sell shorter time-to-revenue. Don't sell quality candidates — sell reduced turnover cost. Every conversation should map your offering to one of: revenue growth, cost reduction, risk mitigation, or speed to market. If a prospect can't tell their CFO why they bought you in those terms, you didn't sell value — you sold features." },
      { heading: "Personalize by stakeholder", body: "CFO: lead with ROI, payback period, cost-of-vacancy math. OPS LEADER: lead with time saved, throughput, headache reduction. CEO: lead with strategic capacity, market position, growth enablement. HR/TA: lead with workload relief, candidate experience, brand. Same service, four different pitches. Identify the stakeholder before you build the pitch — never the reverse." },
      { heading: "Create urgency with the value gap", body: "The value gap = the cost of inaction minus the cost of action. Make it concrete: 'You're losing $1,800/day in vacancy. Our fee amortized over the year is $42/day. Every day you wait costs you 43x our daily fee.' When the gap is vivid, urgency follows automatically. You don't have to manufacture pressure — the math does it for you." }
    ] },
    { name: "Sales Mastery Day 4: Time Management", quiz: true, desc: "Spend your hours on revenue-generating activity. Build a system that protects your top of the day from chaos.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "High-value vs low-value activities", body: "HIGH-VALUE (revenue-driving): client calls, candidate prescreens, submissions, closes, prospect outreach, deal-stage progression. LOW-VALUE (feels productive but doesn't drive revenue): inbox triage, internal Slack threads, formatting resumes, debating org charts. Every morning, ask: 'Of the next 4 hours, how many will be on the high-value list?' If the answer is less than 3, your day is already broken." },
      { heading: "Time blocking", body: "Block your calendar like it's a client meeting. 8:30-10:00 prospecting calls. 10:00-11:30 candidate prescreens. 11:30-12:00 submissions. 1:00-2:30 client follow-ups. 2:30-4:00 second prospecting block. Email and Slack get specific windows — they don't get to interrupt the blocks. If you don't own your calendar, someone else will." },
      { heading: "The 2-minute rule", body: "If a task takes less than 2 minutes — do it now. Reply to the candidate confirming the interview. Log the call. Send the calendar invite. Anything else goes on a list for the next batch window. The cost of context-switching from calls to admin all day is enormous. The cost of letting tiny tasks pile up to 50 unanswered emails is also enormous. The 2-minute rule is the cutoff." },
      { heading: "Inbox zero (or near it)", body: "Process email in batches, not continuously. Three windows: morning (8:00-8:30), midday (12:00-12:30), end of day (4:30-5:00). Each email gets one of four actions: REPLY (if under 2 min), DELEGATE (forward with one-line ask), DEFER (add to task list), DELETE. Don't 'check email' between client calls — you'll never close the loop, and every glance taxes your focus." },
      { heading: "Weekly review framework", body: "Friday afternoon, 30 minutes: Review the week's activity numbers (calls, submissions, meetings) against KPIs. Identify the top 3 deals that moved and the top 3 that stalled. Plan next week's pipeline pressure points. Reset your calendar blocks. Top reps don't out-hustle other reps — they out-plan them." }
    ] },
    { name: "Sales Mastery Day 5: Listening & Questioning", quiz: true, desc: "Be a doctor: diagnose before you prescribe. Master the question types that surface the real deal.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "The consultative selling goal", body: "Average reps talk 70% of the call. Top reps talk 30%. The job isn't to perform — it's to diagnose. Every minute you're talking, you're not learning. Every minute they're talking, you're earning the right to recommend something specific. If you walked out of a doctor's office and they prescribed before they asked any questions, you'd never go back. Don't be that rep." },
      { heading: "Core listening skills", body: "Three layers: (1) HEAR the words. (2) UNDERSTAND the meaning. (3) FEEL the emotion. Most reps only operate at layer 1. Layer 2 is paraphrasing back: 'So what I'm hearing is the last vendor missed the cultural fit and you ended up with two terms in 90 days.' Layer 3 is reading the energy: 'Sounds like that one was painful to live through.' Layer 3 is where trust is built." },
      { heading: "Open-ended questions", body: "Closed: 'Are you happy with your current vendor?' (Yes/no — dead end.) Open: 'Walk me through your experience with your current vendor — what's working, what isn't?' (Story.) Open-ended starts with: What, How, Tell me about, Walk me through, Help me understand. Ban 'Are' and 'Do' from your discovery vocabulary." },
      { heading: "Diagnostic questions", body: "These surface PAIN. 'What happens to the team when this role stays open?' / 'When was the last time you tried to fill this and what happened?' / 'What's the impact on production each week this isn't filled?' Pain is the fuel for action. Without quantified pain, your proposal is a nice-to-have." },
      { heading: "Quantifying questions", body: "Move pain from vague to specific: 'When you say it's costing you a lot, what does a lot mean in dollars or hours per week?' / 'How many candidates have you seen so far?' / 'How long has this been open?' Numbers get budget approved. Adjectives get ignored." },
      { heading: "Stakeholder questions", body: "Surface the room: 'Besides yourself, who else is involved in this decision?' / 'Has someone else been burned by a vendor on a search like this?' / 'Who signs the contract — and is that the same person who signs the check?' If you don't know who else has a vote, you're going to lose to someone you never met." },
      { heading: "Future-state questions", body: "Help them see the win: 'Picture this role filled and ramped — what changes for your week?' / 'If we hit your target start date, what does Q2 look like?' Once a prospect can SEE the outcome, your job is mostly done. They start selling themselves." }
    ] },
    { name: "Sales Mastery Day 7: Running Effective Follow-Ups", quiz: true, desc: "Pre-schedule your cadence. Bump with value. Use breakup emails to flush stalled deals.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Pre-schedule the next touch before the call ends", body: "Never end a call without a confirmed next step on the calendar. 'Let's lock in 15 minutes Thursday at 2 — I'll send the invite now.' If you leave it as 'I'll follow up next week,' the deal is in 50/50 land. Calendar invites are commitments. Promises to circle back are not." },
      { heading: "The cadence framework: Days 1-14+", body: "DAY 1: Recap email — what we discussed, what you're sending, when you'll be back. DAY 3: Value bump — relevant case study or industry insight. DAY 7: LinkedIn touch — comment on a post or connect. DAY 10: Direct check-in — 'Where are your thoughts?' DAY 14: Breakup. After 14 days, if no response, move them to a long-tail nurture, not your active pipeline." },
      { heading: "Bump with value, not 'just checking in'", body: "'Just checking in' is dead. Every follow-up needs to give them something: an article relevant to their challenge, a candidate that fits their ICP, a benchmark from a similar client, a piece of news about a competitor of theirs. Every touch should make them slightly smarter or slightly better at their job. Otherwise you're noise." },
      { heading: "The 'bump with value' formula", body: "Subject: [Specific topic that matters to them]. Body: 'Saw this and thought of you — [link or insight]. The reason it's relevant: [one sentence on why]. While I have you — any update on [the thing we discussed]?' Three sentences. Always tied to their world. Never about you." },
      { heading: "The breakup email", body: "Subject: 'Should I close the loop?' Body: 'Hi [Name] — I haven't heard back, which usually means one of three things: (1) you've decided to go a different direction, (2) the timing isn't right, or (3) you've been buried. No problem with any of those. Could you reply with 1, 2, or 3 so I know how to be helpful? If 1, I'll close the file and stop reaching out. — [You]' Breakups have a 30-40% response rate. Your unanswered 'just checking in' has 2%." },
      { heading: "Template: First follow-up email after a discovery call", body: "Subject: Recap — [their company] / Spark next steps\n\nHi [Name],\nThanks for the time today. Quick recap:\n• You're looking for [role] by [date], driven by [pain].\n• Top must-haves: [skill 1], [skill 2], [skill 3].\n• Compensation target: $[X].\n\nI'll have 3 vetted candidates to you by [day]. In the meantime, attached is a quick overview of how we approach [their industry] searches.\n\nCalendar holds for our next sync — Thursday 10am or Friday 2pm. Which works?\n\n— [You]" }
    ] },
    { name: "Sales Mastery Day 10: Closing Techniques", quiz: true, desc: "5 close types, the staffing-objection playbook, and the Cost of Vacancy formula every rep needs in their pocket.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "The Assumptive Close", body: "Don't ask if they want to move forward — ask which version. 'Should we send the agreement to you or your procurement contact?' / 'Do you want me to start sourcing today or kick off Monday?' Assumptive closes work because they skip the binary yes/no and move straight to logistics. The prospect either says 'send to me' or surfaces the real objection." },
      { heading: "The Summary Close", body: "Recap the wins back to them: 'So we've agreed: 21-day fill target, 90-day guarantee, locked rate at 22%. Sound right?' Get three yeses in a row, then: 'Great — I'll send the agreement.' The summary close works because the prospect has already verbally committed to every component. The signature is just paperwork." },
      { heading: "The Urgency Close", body: "Tie the close to a real, specific deadline they care about: 'If we kick off this week, we have someone starting before your busy season. If we wait two weeks, we miss it.' Manufactured urgency ('this rate expires Friday!') destroys trust. REAL urgency tied to their calendar wins deals." },
      { heading: "The Calendar Close", body: "Skip the contract conversation entirely. 'Let's get the kickoff call on the calendar — Tuesday at 10 work?' Once it's on the calendar, the contract becomes a formality. People defend their calendar more than their inbox. Calendar = commitment." },
      { heading: "The Option Close", body: "Two yeses, never a yes/no. 'Do you want to start with the controls engineer search first, or run both in parallel?' Both options move forward. Neither option is 'no.' This closes 30% better than 'are you ready to start?' because it removes the easiest answer (no)." },
      { heading: "Staffing objection responses", body: "'WE'RE WORKING WITH ANOTHER FIRM' → 'Most of our best clients started by adding us as a second source. We don't ask for exclusivity — we ask for a shot.' 'YOUR FEE IS HIGHER' → 'I'd rather be the firm that fills it once than the cheaper firm that fills it twice.' 'WE'RE TRYING INTERNALLY FIRST' → 'Smart. While you do, we'll line up backups so if internal stalls, you don't lose 30 days.'" },
      { heading: "The Cost of Vacancy calculator", body: "FORMULA: Annual loaded labor cost ÷ 220 working days = daily cost of role. Loaded = base salary × 1.3 (benefits, taxes, overhead). Example: $80K base × 1.3 = $104K loaded ÷ 220 = $473/day. If the role is open 30 days, you've spent $14,190 in vacancy. Our fee on a $80K role at 20% = $16,000. The role pays for itself in roughly 34 days of fill — and every day past that is pure ROI." },
      { heading: "ROI pitch phrases", body: "'Our fee is roughly 34 days of vacancy cost. After that, every day this person is in the seat is profit.' / 'You're not buying a recruiter — you're buying back 60-90 days of lost output.' / 'If we fill this in 21 days versus your average 60, that's 39 days of recovered productivity. At your daily cost of vacancy, that's [$X] in your pocket.'" }
    ] },
    { name: "Sales Mastery Day 12: Handling Complex Procurement", quiz: true, desc: "Procurement isn't the enemy — they're a buyer with different incentives. Learn the 5-step framework to navigate big-company purchasing.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "The 5-step framework for complex procurement", body: "1) MAP the buying structure (who are all the players?). 2) IDENTIFY the executive sponsor (who actually wants this to happen?). 3) UNDERSTAND procurement's incentives (cost, risk, vendor consolidation, compliance). 4) BUILD a compliant proposal that makes them look smart. 5) CO-SELL with your sponsor — never go around them. Most reps lose at step 1 because they treat procurement as the buyer when they're really the gatekeeper." },
      { heading: "Map the buying structure", body: "Five roles in any complex deal: ECONOMIC BUYER (signs the check), USER BUYER (will use the service), TECHNICAL BUYER (verifies it meets requirements), CHAMPION (advocates internally), GATEKEEPER (procurement, legal). You need direct or indirect contact with all five. Map them on paper before your next call. If you can't fill in all five names, you have a discovery problem, not a closing problem." },
      { heading: "Multi-thread the deal", body: "Single-threaded deals die when your one contact gets reorged, fired, or distracted. Always have at least 3 active relationships inside the account. Get introduced to your champion's boss. LinkedIn-connect with the user buyer. Ask procurement who else needs to weigh in. The more threads, the more resilient the deal." },
      { heading: "Procurement hurdles", body: "Common procurement asks: MSA in their paper (not yours), insurance certificates, vendor questionnaires, security reviews, diversity supplier data, payment terms negotiation, fee benchmarking. Have these answers and documents READY before they ask. Speed of response on procurement asks is a deal accelerator. Slow responses signal a small/inexperienced vendor." },
      { heading: "Procurement value creation", body: "Procurement's job is to demonstrate savings, reduce risk, and consolidate vendors. Speak their language: 'We can offer a master pricing schedule that saves you X% on volume.' 'Our 90-day guarantee transfers risk back to us.' 'We can replace three of your existing point vendors with one MSA.' Every point you make should map to ONE of those three procurement KPIs." },
      { heading: "Soft control statements", body: "Maintain process control without being pushy: 'In my experience, deals like this typically need [X], [Y], and [Z] to get to signature. Where are we on each?' / 'Just so I'm helpful — what's the slowest part of your typical process? I'd like to start that piece now.' These statements position you as a guide, not a vendor begging for next steps." },
      { heading: "Procurement objection responses", body: "'WE NEED 3 BIDS' → 'Happy to participate. What criteria are you weighting heaviest?' (Get the rubric.) 'NET 60 PAYMENT' → 'We can do net 30 standard or net 60 with a 1.5% fee adjustment.' (Make terms a tradeoff.) 'MUST USE OUR MSA' → 'Send it over. We'll redline within 48 hours.' (Speed wins.) 'YOUR FEE IS ABOVE BENCHMARK' → 'Happy to walk through what's in the fee. Most benchmarks include only sourcing — ours includes guarantee, replacement, and dedicated team.' (Reframe scope.)" }
    ] },
    { name: "Sales Mastery Day 14: Handling No-Decision", quiz: true, desc: "Most deals don't lose to competitors — they lose to the status quo. Learn to prevent stalls and re-engage stalled deals.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Why deals stall", body: "Five reasons a deal goes to no-decision: (1) URGENCY wasn't real. (2) BUY-IN — your champion couldn't sell internally. (3) BUDGET wasn't actually approved. (4) STATUS QUO felt safer than change. (5) WEAK CASE — you didn't quantify pain. The most common is #4: doing nothing was the easiest option. Your job is to make doing nothing feel risky." },
      { heading: "Prevent stalls with discovery questions", body: "Ask EARLY, not late: 'What happens if you don't fix this in the next 90 days?' / 'Has anyone tried to solve this before? What happened?' / 'Walk me through how decisions like this typically get approved here.' / 'On a scale of 1-10, how urgent is this for you personally?' If the answer to the last one is below an 8, you don't have a deal yet — you have a conversation." },
      { heading: "The cost-of-vacancy pitch", body: "Make inaction expensive. Use real math: 'Your loaded cost on this role is $473/day. You've already been open 60 days — that's $28,380 in lost productivity. Every additional 30 days costs another $14,190. Our fee is $16,000.' Now they're not deciding whether to spend $16K — they're deciding whether to keep losing $14K/month. Same money, completely different frame." },
      { heading: "Surface the real risk of waiting", body: "Every stall has hidden risk the prospect isn't seeing. Articulate it: 'If you wait until Q3, your competitors will have hired the talent pool you need.' / 'The candidates we're tracking now will be off the market in 4-6 weeks.' / 'Your team is showing turnover signals — adding capacity now is also a retention play.' Don't manufacture risk. Find the real risks they haven't named yet." },
      { heading: "Re-engagement framework for stalled deals", body: "Don't keep sending 'just checking in.' Instead: (1) NEW INSIGHT — 'Saw a hiring trend in your industry I want to share.' (2) NEW STAKEHOLDER — 'Want to introduce you to one of our subject matter experts.' (3) NEW URGENCY — 'A candidate I think you'd love just came on the market.' (4) NEW ANGLE — 'I've been thinking about your situation and have a different way to approach it.' Each restart is a NEW reason to talk." },
      { heading: "Re-engagement email template", body: "Subject: New angle on your [role/challenge]\n\nHi [Name],\nWhen we spoke in [month], you mentioned [specific challenge]. I haven't been able to stop thinking about it because [reason it's interesting].\n\nA few things have changed since:\n• [New insight, candidate, or industry data]\n• [Something that affects their timeline]\n\nI'd love 15 minutes to share — even if you've already moved a different direction, the data might be useful for next time. Calendar: [link]\n\n— [You]" }
    ] },
    { name: "Sales Mastery Day 19: Effective Prospecting", quiz: true, desc: "Build your ICP, run a multi-channel cadence, and craft outreach that earns a response.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Define your ICP (Ideal Client Profile)", body: "Your ICP is the intersection of: INDUSTRY (where we win), SIZE (50-2000 employees is our sweet spot for most segments), GEOGRAPHY (Michigan, Ohio, Indiana, Illinois primarily), HIRING SIGNALS (recent funding, growth job postings, leadership changes), PAIN (chronic open reqs, post-attrition, expansion). Spend 80% of prospecting time on accounts that hit 4-of-5. The 20% that hit 5-of-5 are your A-list — they get personal touches every 30 days regardless of response." },
      { heading: "Multi-channel cadence (7-day)", body: "DAY 1: LinkedIn connection request (no pitch, just relevance). DAY 2: Email with value-led intro. DAY 3: Phone call + voicemail. DAY 4: LinkedIn engagement (comment on their post). DAY 5: Email — different angle, new insight. DAY 6: Phone call + voicemail. DAY 7: Breakup email. After Day 7, drop them into a 60-day nurture. Multi-channel beats single-channel by 4-6x on response." },
      { heading: "Micro-personalization with triggers", body: "Generic outreach is dead. Lead with a SPECIFIC trigger: 'Saw your team posted a Senior Controls Engineer req on Indeed 11 days ago — usually a sign you've burned through internal channels.' / 'Noticed [Company] just announced expansion into the Tier 2 line — that usually drives 8-12 manufacturing hires over the next 6 months.' / 'Your post about plant capacity hit my feed. I work with companies in your spot.' Triggers signal you did your homework. They respond at 5-10x the rate of generic outreach." },
      { heading: "Problem → Impact → Solution → CTA formula", body: "PROBLEM: 'Manufacturers like yours typically lose 60-90 days filling senior controls roles internally.' IMPACT: 'At your scale, that's roughly $40K-$60K in vacancy cost and 1-2 missed production milestones.' SOLUTION: 'We fill these in 18-24 days because we have a dedicated controls bench.' CTA: 'Worth a 15-minute conversation to see if we'd be a fit?' Four sentences. Always in this order. Never reverse it." },
      { heading: "The give-to-get offer", body: "Lead with something they get whether they buy or not. 'Happy to share our 2026 manufacturing comp benchmarks for your region — even if we never work together, you'll find them useful for your next req.' / 'I'll send our top 3 controls engineer talent profiles in your area — yours to use as a benchmark or to reach out directly.' Give-to-get offers triple meeting rates because they remove the 'what's in it for me?' friction." },
      { heading: "What kills outreach", body: "Avoid: 'I hope you're well' (lazy opener). 'I wanted to reach out' (everyone wanted to). 'Quick question' (no it isn't). Mentioning your service in sentence 1. Sending a 6-paragraph email. Sending a calendar link before they've shown interest. Asking 'what keeps you up at night.' Talking about yourself before talking about them. Cut all of these from your templates today." },
      { heading: "Prospecting math", body: "100 outreach touches → 10 conversations → 3 meetings → 1 deal (typical staffing benchmarks). To hit 1 new deal/week, you need ~100 outbound touches/week — about 20/day. KPIs reflect this: 30 calls/day, 10 submissions/week. The numbers work IF the targeting is good. Bad list × big volume = nothing. Good list × big volume = pipeline." }
    ] },
    { name: "Sales Voicemails & Role Plays", quiz: true, desc: "7 voicemail templates and 7 role-play scenarios you'll face every week.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Voicemail principles", body: "Keep it under 25 seconds. State your name and company up front. Lead with relevance, not pitch. Always end with a specific reason to call back. Smile while you talk — it's audible. NEVER leave a 'just calling to introduce myself' VM. They'll hear it once and delete. Every VM needs a reason to return the call." },
      { heading: "VM Template 1: Cold (first contact)", body: "'Hi [Name], this is [You] with Spark. Reason for the call — saw [trigger: their job posting / news / LinkedIn activity]. We help [industry] hiring leaders fill [role type] in roughly half the time most internal teams take. Worth a quick chat? My number is [X]. Following up by email today either way.'" },
      { heading: "VM Template 2: Job posting", body: "'Hi [Name], [You] with Spark. Saw your [role] posting — appears it's been live about [X] days. That usually means internal channels haven't worked. We've filled three of those exact roles in the last 90 days for [comparable company type]. Quick 10 minutes to see if we should be involved? [Phone number].'" },
      { heading: "VM Template 3: Reference call follow-up", body: "'Hi [Name], [You] with Spark. [Reference name] at [Company] suggested I reach out — they mentioned you're in the same spot they were last quarter on [pain]. We helped them solve it in [time]. Wanted to see if a similar approach makes sense for you. Call me at [X].'" },
      { heading: "VM Template 4: Recruiter lead", body: "'Hi [Name], [You] with Spark. One of our recruiters is in active conversation with a [title] candidate who specifically asked about your team. Wanted to make sure you knew before they got recruited elsewhere. Quick callback? [Phone].'" },
      { heading: "VM Template 5: Rate negotiation", body: "'Hi [Name], [You] with Spark. Following up on the rate question. I've put together two options that both work — one keeps the original scope, one adjusts on guarantee. Want 5 minutes to walk through? [Phone].'" },
      { heading: "VM Template 6: Differentiation", body: "'Hi [Name], [You] with Spark. I know you're talking to other firms. Two things make us different from the rest — [point 1] and [point 2]. Worth 10 minutes to see if either one matters for your situation? [Phone].'" },
      { heading: "VM Template 7: Rate pushback", body: "'Hi [Name], [You] with Spark. Heard the feedback that the rate was higher than expected. Before you make a decision, I want to walk through what's IN the fee that benchmarks usually leave out. 7 minutes — call me back at [X].'" },
      { heading: "Role-play scenarios (practice with your AM)", body: "Pick one each week and practice live: (1) Cold call from a job posting trigger. (2) Reference-check conversion (prospect calls you to ask about a candidate, you flip to discovery). (3) Recruiter lead → AM handoff. (4) Rate negotiation — prospect asks for 15% off. (5) Differentiation — prospect says 'we already have 3 firms.' (6) Rate pushback — prospect says you're 5 points above another vendor. (7) Re-engagement — prospect ghosted 30 days ago and you're calling to restart." }
    ] },
    { name: "GP Discussion: Margins, Tiers & A-Player Standards", quiz: true, desc: "Contract GP minimums, A-player vs B-player standards, and the 6 traits that define top Sales/ARM performers at Spark.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Contract GP minimums and targets", body: "By category, the minimum and target GP percentages are:\n• Light Industrial: minimum 15%, target 20%\n• Skilled Trades: minimum 20%, target 35%\n• Technical / Engineering: minimum 35%, target 50%\nMinimum is the floor — anything below requires explicit approval. Target is what an A-player consistently lands. If you're regularly hitting minimum but not target, that's a coaching conversation, not a celebration." },
      { heading: "Why GP discipline matters", body: "Spark wins by being known for quality, not by being the cheap option. Every dollar of GP funds: (1) the depth of search we do, (2) the speed of fill, (3) the guarantees we honor, (4) commission for the producer, (5) the company's ability to invest in better tools, training, and people. GP isn't an abstract finance metric — it's the budget for everything that makes us better than the firm down the street." },
      { heading: "A-player vs B-player definitions", body: "A-PLAYER: hits target GP consistently, owns their pipeline, multi-threads accounts, books their own meetings, finishes the week with the next week already planned. They don't need to be managed — they need to be coached. B-PLAYER: hits minimums but not targets, depends on inbound or assigned leads, has a couple of strong months and a couple of weak ones, needs prompting to follow up. B-players become A-players through accountability, not encouragement." },
      { heading: "Trait 1: Hunger", body: "Top performers have an internal scoreboard that runs 24/7. They know their submission count, their meeting count, their pipeline value, their year-to-date GP — without checking. If you have to look it up, you don't care enough. Hunger isn't volume for its own sake — it's the unwillingness to end a week below standard." },
      { heading: "Trait 2: Curiosity", body: "A-players ask 3 more questions on every discovery call than B-players. They learn the prospect's industry, the prospect's competitors, the prospect's career path. Curiosity is what turns a vendor into a trusted advisor — and trusted advisors don't compete on price." },
      { heading: "Trait 3: Discipline", body: "Same routine, every week. Same number of calls, same time blocks, same Friday review. Discipline is boring. Discipline is what separates a 12-month performer from a 3-month flash. The fanciest sales tactic in the world doesn't beat showing up Monday morning at 8am with a list and a plan." },
      { heading: "Trait 4: Coachability", body: "Top performers ask their leader, 'What's one thing I should be doing differently?' — and then actually do it. B-players defend, deflect, or nod and ignore. Coachability is the single highest predictor of who becomes great in this industry." },
      { heading: "Trait 5: Resilience", body: "You will lose deals. You will get hung up on. You will have weeks where nothing closes. The A-player doesn't let one bad week become two. They understand that activity drives outcomes — and that the slump ends the same way every time: by going back to the basics that built the pipeline in the first place." },
      { heading: "Trait 6: Ownership", body: "When something goes wrong — a candidate falls off, a client delays, a deal slips — the A-player asks 'what could I have done differently?' before asking 'whose fault is it?' Ownership doesn't mean blame. It means treating every account like it's yours, not the company's." }
    ] }
] },
{ cat: "Value Proposition Deep Dives", icon: "award", assignedGroups: ["Production"], items: [
    { name: "Value Prop: RPO Deep Dive", quiz: true, desc: "The hidden cost of open roles, the RPO savings model, and how to position RPO to procurement, HR, and the C-suite.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "What RPO actually is", body: "RPO (Recruitment Process Outsourcing) is when Spark embeds inside the client's hiring function — handling sourcing, screening, scheduling, and offer management at scale. Unlike contingent search (paid only on hire), RPO is a subscription-style engagement: a fixed monthly fee or per-hire fee for managed volume. The client gets dedicated capacity that scales without adding headcount." },
      { heading: "The hidden cost of open roles", body: "Open requisitions look like inactive expense lines on a budget — but they're the most expensive line item in the company. EVERY open role has: (1) lost productivity from the missing seat, (2) burnout cost on the team covering, (3) overtime spend, (4) recruiter time, (5) hiring manager time, (6) onboarding rework if the eventual hire fails. Internal teams capture (4) on a spreadsheet. The other 5 are invisible until you map them — which is why RPO sells when you make the invisible visible." },
      { heading: "Vacancy as a cost center, not a savings", body: "Most leaders think 'we saved money this quarter — we had 12 open reqs and only paid for 8 hires.' Wrong. They paid for the 8 hires AND the 12 reqs in lost output. At an average loaded cost of $400-$600/day per role, 12 open reqs for 60 days = $300K-$432K in evaporated value. RPO converts that invisible loss into a visible spend that's a fraction of the cost." },
      { heading: "The RPO savings model", body: "Compare with-and-without: WITHOUT RPO — internal recruiter ($85K loaded) handles 30 hires/year, time-to-fill 55 days, fail rate 12% (4 turn within 90 days), each turn costs ~$15K = $60K. Total: $145K + 30 × 55 days vacancy = enormous. WITH RPO — Spark fee ($120K/yr managed), 30 hires in 28 days average, fail rate 4% (1 turn = $15K). Total: $135K + 30 × 28 days vacancy = roughly half the with-out scenario when you include vacancy cost." },
      { heading: "Procurement pitch for RPO", body: "Procurement loves: VENDOR CONSOLIDATION (one MSA replaces multiple staffing firms). VARIABLE COST (scales up/down with hiring volume — no fixed headcount). RISK TRANSFER (Spark eats the cost of bad hires under guarantee). MEASURABLE KPIs (time-to-fill, cost-per-hire, candidate quality scores). When pitching procurement, lead with these four. NEVER lead with 'better candidates' — that's a pitch for HR, not procurement." },
      { heading: "Challenge → Solution matrix", body: "CHALLENGE: 'TA team can't keep up with hiring volume' → SOLUTION: dedicated Spark recruiter pod scales with req load. CHALLENGE: 'Time-to-fill is 60+ days' → SOLUTION: pre-built talent pipeline cuts to 21-28. CHALLENGE: 'Quality is inconsistent' → SOLUTION: structured intake, calibrated scoring, slate reviews. CHALLENGE: 'Multiple agencies with no accountability' → SOLUTION: single MSA, single point of contact, single scorecard. CHALLENGE: 'Hiring spikes break the team' → SOLUTION: variable model — pay for what you use." },
      { heading: "7 RPO benefits", body: "(1) SPEED — sub-30-day time-to-fill at scale. (2) COST — 30-50% lower than agency-by-agency. (3) QUALITY — calibrated, scored, multi-stakeholder evaluation. (4) FLEXIBILITY — scale up/down without HR layoffs. (5) BRAND — every candidate experience reflects positively on the client. (6) DATA — real-time dashboards on funnel, source, time-to-fill, cost-per-hire. (7) FOCUS — internal HR can stop sourcing and start strategic work." },
      { heading: "Best people to pitch for RPO", body: "VP HR — feels the pain daily, owns the budget. DIRECTOR OF TA — usually the one drowning, wants help. VP OPERATIONS — feels the cost of vacancy directly. VP PROCUREMENT — if they're consolidating vendors, they're a buyer. CFO — only when the deal is large enough to matter at their level (typically 50+ hires/year). Avoid pitching RPO to managers below VP — they don't have authority to switch." },
      { heading: "RPO outreach email template", body: "Subject: [Company] hiring volume — quick benchmark question\n\nHi [Name],\nI work with manufacturing/[industry] companies that have hit a hiring volume wall — usually around the 30-50 reqs/year range — where the internal TA team can't scale without adding fixed headcount.\n\nIs that something you're seeing? If yes, I can share how a few of our clients converted that pain into a 30-50% reduction in cost-per-hire by moving to an embedded RPO model.\n\nWorth 15 minutes? I have Tuesday at 10 or Thursday at 2 open.\n\n— [You]" }
    ] },
    { name: "Value Prop: Engaged Search", quiz: true, desc: "Why engaged search beats contingent for senior roles, the cost of a mis-hire, and how to pitch it across stakeholders.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Three search models — quick comparison", body: "CONTINGENT: paid only on hire, no exclusivity, multiple firms competing on same role. ENGAGED: partial fee up front (engagement), exclusive or semi-exclusive, dedicated team, 6-8 week structured search. RETAINED: full fee in three installments, fully exclusive, comprehensive process, typically C-suite or specialized roles. Engaged is the sweet spot for senior individual contributors and director-level roles where contingent isn't deep enough but retained is overkill." },
      { heading: "Why contingent fails on senior roles", body: "Contingent recruiters work the easiest reqs first — the ones most likely to close fast. Senior roles ($120K+) take longer, require deeper sourcing, and have lower fill probability. So they get worked LAST or ABANDONED when an easier req comes in. Result: senior roles linger 90-120+ days. Engaged search fixes this because the engagement fee buys the prospect priority." },
      { heading: "Value prop by audience: HR/TA", body: "FOR HR/TA — engaged search reduces the burden on internal sourcing, ensures every candidate is calibrated, gives HR back time for strategic work. Pitch language: 'You'll see 4-6 vetted, scored candidates per role within 21 days — not 60 unscreened resumes you have to filter.'" },
      { heading: "Value prop by audience: Ops/Hiring Managers", body: "FOR OPS/HMs — engaged search fills the seat with someone who can actually do the job, not someone who looked good on paper. Pitch language: 'I'll spend 4 hours with you up front to learn what 'great' looks like in this role. Every candidate I send has been measured against that profile — so you spend 1 hour interviewing, not 8.'" },
      { heading: "Value prop by audience: Executives", body: "FOR EXECS — engaged search is risk reduction on a high-impact hire. Pitch language: 'A bad senior hire costs you 3-5x their first-year salary in lost productivity and team disruption. Engaged search front-loads the work that prevents that bad hire — at a fraction of the cost of fixing one.'" },
      { heading: "Cost of a mis-hire", body: "Standard finance estimate: 3-5x first-year salary for a senior mis-hire. Components: (1) salary paid during the failed tenure, (2) severance/transition cost, (3) recruiting cost #2, (4) onboarding cost #2, (5) lost productivity during ramp/stall, (6) team morale and turnover ripple. On a $120K role, that's $360K-$600K. The engaged search fee is $20K-$30K. The math is unambiguous." },
      { heading: "Engaged search comparison table (use in proposals)", body: "CONTINGENT — Fee: 20-25% on hire. Exclusivity: none. Avg time-to-fill: 60-90 days. Fill rate: 40-50%. Best for: junior/mid roles with broad talent pools.\n\nENGAGED — Fee: 25-30% (1/3 engagement, 2/3 on hire). Exclusivity: yes, 60-90 days. Avg time-to-fill: 35-50 days. Fill rate: 80-90%. Best for: senior IC, director-level, niche skill sets.\n\nRETAINED — Fee: 30-35% (1/3 retainer, 1/3 short-list, 1/3 hire). Exclusivity: yes, full search. Avg time-to-fill: 60-90 days. Fill rate: 95%+. Best for: VP, C-suite, board-level, board-search-required roles." },
      { heading: "7-step engaged search process flow", body: "1) INTAKE (4 hrs) — calibrate role, success criteria, scorecard. 2) MARKET MAP (week 1) — 100-200 target candidates identified. 3) OUTREACH (weeks 1-3) — multi-channel cadence, 50%+ response. 4) SCREENING (weeks 2-4) — structured interview + scoring. 5) SLATE PRESENTATION (week 4-5) — 4-6 ranked candidates with scorecards. 6) INTERVIEW MANAGEMENT (weeks 5-7) — coordination, debriefs, calibration. 7) OFFER & CLOSE (week 7-8) — negotiation support, counter-offer prep, start date confirmation." },
      { heading: "Engaged search outreach email template", body: "Subject: [Role] — engaged search proposal for [Company]\n\nHi [Name],\nFor a role like [title], contingent typically delivers in 60-90 days with a 40-50% fill rate. That's because contingent works the easiest reqs first — and senior roles aren't easy.\n\nOur engaged model gets you 4-6 calibrated candidates in 21 days and fills at 85%+. The investment is roughly $X up front, balance on hire.\n\nGiven the cost of this seat staying open and the cost of a mis-hire (3-5x salary), the math typically works out in week one.\n\nWorth 20 minutes to walk through?\n\n— [You]" }
    ] }
] },
{ cat: "Contract Needs Talk Track", icon: "clipboard", assignedGroups: ["Production"], items: [
    { name: "Contract Needs Talk Track", quiz: true, desc: "Leadership directive on contract visibility — what every client-facing rep is expected to cover and confirm.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Why contract visibility matters", body: "Most lost deals don't lose at the close — they lose because nobody asked the right contract questions early. A signed MSA without clear visibility into spend caps, headcount limits, rate schedules, and renewal dates is a deal that's slowly leaking value. Every Sales and ARM is expected to know — not guess — the contract terms governing their book of business." },
      { heading: "What every client-facing rep should be able to answer", body: "For every active client, you should know without checking: (1) Current rate schedule by category. (2) Volume commitments or caps. (3) Guarantee terms (length, replacement vs refund). (4) Exclusivity terms. (5) Renewal/auto-renewal date and notice period. (6) Diversity requirements or carve-outs. (7) MSA expiration. If you can't answer 5 of 7 for your top accounts, you're flying blind." },
      { heading: "Contract review cadence", body: "Top 10 accounts: review contract terms quarterly. Active mid-tier: review at every QBR. New deals: review at 30/60/90 days post-signature. Renewal alerts: 90 days, 60 days, 30 days before renewal date. Set Salesforce reminders. The renewal you forgot is the renewal that auto-extends on terms you would have negotiated up." },
      { heading: "How to surface contract conversation with a client", body: "Don't wait for problems. Open with: 'It's been [X] months since we signed — want to do a quick review of how the contract is working? I want to make sure the terms still make sense for both sides.' This positions you as a partner, not a vendor. It also surfaces issues BEFORE they become losses or breach disputes." },
      { heading: "What to flag to leadership", body: "Escalate immediately to Allie/Aaron/Dave: any rate concession requested below contract minimums, any scope change request that affects guarantee terms, any signal of vendor consolidation or RFP pressure, any client request to renegotiate exclusivity, any breach of payment terms beyond 30 days. Don't try to handle these alone — leadership needs visibility to protect the relationship and the company." },
      { heading: "Action item for every rep", body: "Within 7 days: pull your top 5 active clients. For each, write down the 7 contract data points listed in step 2. Cross-check against the actual signed MSA. Anywhere you guessed, you have homework. Send the completed sheet to your manager. This is a hard expectation, not a suggestion." }
    ] }
] },
{ cat: "Back Office Operations", icon: "briefcase", assignedGroups: ["Back Office"], items: [
    { name: "Back Office Training Overview", quiz: true, desc: "Who TMX is, the onboarding process, payroll basics, and I-9 acceptable documents.", type: "doc", location: "Back Office", url: null, content: [
      { heading: "Who is TMX?", body: "TMX is the Spark internal team that handles every administrative touchpoint with our placed contractors — onboarding, badging, drug screens, I-9 verification, payroll setup, benefits enrollment, and ongoing employee relations. From the contractor's first hello to their last paycheck, TMX is the team that makes Spark feel professional and human. Knowing how TMX works is non-negotiable for any back-office or production team member." },
      { heading: "The onboarding process at a glance", body: "Five steps: (1) OFFER ACCEPTED — TMX gets handoff from recruiter. (2) PRE-EMPLOYMENT — background check (Asurint), drug screen (in-house or Concentra), I-9 verification. (3) NEW HIRE PAPERWORK — Greenshades enrollment, direct deposit, W-4. (4) DAY ONE — meet TMX, badge, plant orientation. (5) FIRST 30 DAYS — benefits enrollment window, check-ins, role calibration." },
      { heading: "Paycor vs Greenshades — what's what", body: "GREENSHADES is Spark's primary payroll system for our W-2 contractor population. Daniel is our tax specialist contact at Greenshades. Employees access pay stubs, W-2s, and direct deposit settings through the Greenshades portal. PAYCOR is used for [internal employees on certain entities — confirm with payroll team for current scope]. Don't confuse the two. If you're directing a contractor to a portal, it's Greenshades 95% of the time." },
      { heading: "Payroll basics every rep needs to know", body: "Payroll runs WEDNESDAY, employees are paid FRIDAY. Cutoff for time submission is Wednesday 3pm. Pay change requests use the Pay Change Authorization Form (Conga). Pre-payroll audit happens Wednesday at 10am. Variance alerts at ±$50 or ±5% trigger review. If a contractor calls Friday morning panicked about their check, the answer is almost always: their timecard wasn't approved by the Wednesday cutoff." },
      { heading: "External benefits — quick reference", body: "30-day enrollment window from start date (do not miss this). Coverage options: MEC (Minimum Essential Coverage — basic preventative), Major Medical via Priority Health, dental (Ameritas Classic PPO, $500/yr), vision (VSP Choice via Ameritas), and Teladoc telehealth (free 24/7 — 1-800-835-2362). Employees who miss the 30-day window have to wait until the next open enrollment unless they qualify for a life event." },
      { heading: "I-9 acceptable documents — what counts", body: "LIST A (proves both identity AND work authorization, ONE doc is enough): U.S. passport, Permanent Resident Card, Foreign Passport with I-551 stamp/I-94, Employment Authorization Document. LIST B + LIST C (one from each — identity + work authorization): LIST B: Driver's license, school ID with photo, voter registration. LIST C: Social Security Card (unrestricted), original/certified birth certificate, U.S. citizen ID card. NEVER accept a photocopy. NEVER accept an expired document. NEVER ask which documents the employee is going to bring — they choose." },
      { heading: "Workers' comp basics", body: "If a contractor is injured on assignment: (1) Get them medical attention IMMEDIATELY. (2) Notify TMX within 4 hours. (3) Notify the client. (4) Document the incident on the WC form. (5) TMX initiates the claim with WESCO INS. Do NOT delay reporting — late reporting tanks our experience modifier and increases premiums for everyone next year." }
    ] },
    { name: "Back Office: TMX Detailed Presentation", quiz: true, desc: "Comprehensive 21-page TMX walkthrough — meet the team, the 5-step onboarding, scheduling, IDs, background, drug, payroll, PTO, benefits, workers' comp, contacts.", type: "doc", location: "Back Office", url: null, content: [
      { heading: "Meet the TMX & Payroll team", body: "TAMIKA — TMX lead, owns onboarding orchestration end-to-end. ALLIE — VP Operations, oversees payroll, HR, compliance. MARYAM — TMX coordinator, day-to-day onboarding execution. ERICA — payroll/back-office support, timecards and corrections. PRIYANKA — Payroll Manager (pmalani@sparkcompanies.com), owns weekly payroll runs and tax compliance. Know who does what — calling the wrong person costs everyone time." },
      { heading: "Onboarding 5-step flow (detail)", body: "STEP 1 — OFFER HANDOFF: recruiter triggers TMX with offer details, start date, location, role, pay rate. STEP 2 — PRE-EMPLOYMENT KICKOFF: TMX schedules badging appointment, sends Asurint background invitation, schedules drug test. STEP 3 — NEW HIRE PAPERWORK: contractor completes Greenshades registration, direct deposit, W-4, I-9 Section 1. STEP 4 — DAY ONE: contractor reports to TMX office or designated location, completes I-9 Section 2 in person, receives badge, completes plant-specific orientation. STEP 5 — POST-START: TMX confirms first timecard, monitors first 30 days, opens benefits enrollment." },
      { heading: "Scheduling in Outlook", body: "All TMX appointments are booked through Outlook calendar invites. When a recruiter triggers onboarding, TMX sends the contractor an Outlook invite for: badging appointment, drug screen (if Concentra), in-person I-9 verification. Always include: TMX office address (901 Wilshire Dr, Suite 585, Troy, MI 48084), required documents list, parking instructions, contact phone for questions. If the contractor doesn't show, follow up within 30 minutes — most no-shows are confusion, not rejection." },
      { heading: "IDs and I-9 — the rules in detail", body: "Federal law requires I-9 Section 2 verification IN PERSON within 3 business days of start. Contractor presents original (no copies) documents from List A OR (List B + List C). TMX physically inspects and signs. If documents are deficient: (a) explain what's needed, (b) give the contractor 3 days to return with valid docs, (c) document the conversation. NEVER advise which documents to bring — that's a federal violation. NEVER accept expired documents (except expired U.S. passports for List A in some cases — confirm current rule)." },
      { heading: "Greenshades new hire registration", body: "Contractor receives email invite to Greenshades portal. They complete: personal info, direct deposit (TMX recommends 100% direct deposit — paper checks are deprecated), W-4 federal and state withholding, voluntary deductions if any. TMX verifies completion BEFORE first timecard runs. Incomplete Greenshades = delayed first paycheck = unhappy contractor + angry client. Catching this on Day 1 saves the relationship." },
      { heading: "Asurint background checks", body: "Asurint runs SSN trace, county criminal (7 years), federal criminal (7 years), motor vehicle (when role requires), employment verification (when client requires). Standard turnaround: 24-72 hours. If a contractor's background returns with a hit, follow the EEOC-compliant adjudication process: review nature of offense vs role requirements, give contractor a chance to explain, document the decision. Never make a unilateral 'no hire' call without TMX leadership review." },
      { heading: "Drug testing — in-house and Concentra", body: "IN-HOUSE: TMX runs basic instant tests at Spark office for low-volume locations. Result available in 5-10 minutes. CONCENTRA: used for clients requiring lab-confirmed results, expanded panels, or DOT compliance. Concentra appointments scheduled by TMX, contractor goes to nearest Concentra location, results return in 24-72 hours. Negative dilute results trigger an automatic retest. Positive results trigger MRO review before final adjudication." },
      { heading: "Greenshades employee access and self-service", body: "After registration, contractors access Greenshades self-service for: viewing pay stubs (current and historical), W-2s (Jan-Feb each year), updating direct deposit, updating tax withholding (W-4), viewing PTO balance (where applicable), updating address. Train every contractor on Day 1: 'You don't need to call us for these — log into Greenshades.' Reduces back-office volume by 60%+." },
      { heading: "Payroll dates — the rhythm", body: "TIMECARDS submitted by contractor: by end of day Sunday for the prior week. SUPERVISOR APPROVAL: by end of day Monday. PRE-PAYROLL AUDIT: Wednesday 10am (Allie/Priyanka). PAYROLL RUNS: Wednesday afternoon. DIRECT DEPOSIT HITS: Friday morning. POST-PAYROLL VARIANCE REPORT: following Monday. Anything that misses Wednesday 3pm cutoff goes to next week's run." },
      { heading: "Pay change forms", body: "All pay rate changes — raises, role changes, role exits, location changes — require a Pay Change Authorization Form filed via Conga. The form requires: contractor name, current rate, new rate, effective date, reason, client approval. Manager submits, payroll approves, change reflects in Greenshades within one pay cycle. NEVER make a verbal commitment to a rate change without filing the form — verbal commits aren't binding and create payroll disputes." },
      { heading: "PTO requests", body: "Eligible contractors (per client agreement) request PTO through Greenshades self-service. Manager approves in Greenshades. PTO accrual is tracked automatically — current balance visible to contractor. Unused PTO at end of assignment: depends on state law and client contract. Michigan: typically not paid out unless contract specifies. California: paid out always. Know your state." },
      { heading: "30-day benefits enrollment", body: "From start date, contractor has 30 calendar days to enroll in benefits. Reminder emails sent at Day 7, Day 14, Day 25. Coverage options: MEC (basic preventative, low cost), Major Medical via Priority Health (full coverage, higher premium), Dental via Ameritas Classic PPO ($500/yr cap), Vision via VSP/Ameritas. ELIGIBILITY: typically 30+ hours/week, but check client-specific rules. After Day 30: contractor must wait for open enrollment OR qualifying life event (marriage, baby, loss of other coverage)." },
      { heading: "Coverage options — what to recommend", body: "MEC: best for healthy contractors who want catastrophic backup, very low premium. MAJOR MEDICAL (Priority Health): best for contractors with families or chronic conditions, real coverage but higher cost. DENTAL: ALWAYS recommend — $500/yr cap pays for itself with one cleaning + one filling. VISION: recommend if they wear glasses/contacts. TELADOC: free, automatic, 24/7 — make sure contractors know they have it. NEVER advise on specific medical decisions, but DO make sure contractors understand what's available." },
      { heading: "Workers' comp process — full detail", body: "INJURY OCCURS → (1) IMMEDIATE: get medical attention, document time/location/witnesses. (2) WITHIN 4 HOURS: contractor or supervisor notifies TMX. (3) WITHIN 24 HOURS: incident report filed by TMX. (4) WITHIN 48 HOURS: claim opened with WESCO INS. (5) ONGOING: TMX coordinates return-to-work, light-duty if applicable. (6) CLOSED: claim resolved, file documented. Spark's mod rate is currently 0.73 (excellent — 35% below industry). Late or missed reporting destroys this. Take it seriously." },
      { heading: "Contact directory", body: "TMX MAIN: sterlingtmx@sparktalentinc.com / 586-930-5000. PAYROLL: Priyanka Malani (pmalani@sparkcompanies.com). HR/COMPLIANCE: Allie Spegel. GREENSHADES SUPPORT: Daniel (tax specialist) — route through TMX first. WORKERS' COMP CARRIER: WESCO INS, claims line in Greenshades portal. BENEFITS QUESTIONS: route to TMX first; for medical specifics, contractors call carrier directly (Priority Health, Ameritas, VSP, Teladoc). When in doubt: TMX first, they triage." }
    ] }
] },
{ cat: "KPI Performance Standards", icon: "target", assignedGroups: ["All Employees"], items: [
    { name: "KPI Performance Standards", quiz: true, desc: "The exact weekly KPIs every Recruiter, ARM, and Sales rep is measured against — and the growth goals beyond them.", type: "doc", location: "All Team Members", url: null, content: [
      { heading: "Why KPIs exist", body: "KPIs aren't a punishment — they're the activity floor that produces predictable results. Every great rep at Spark has, at some point, hit these numbers consistently. Below the floor, you're not yet generating enough activity for outcomes to follow. At the floor, you're earning the right to be coached on quality. Above the floor, you're ready for stretch goals. The KPIs are simple — the discipline to hit them every week is the hard part." },
      { heading: "Recruiter KPIs — weekly", body: "10 SUBMISSIONS per week (qualified candidates submitted to clients). 30 CALLS per day (outbound to candidates and prospects — voicemails count IF you also send a follow-up email/text). 25 PRESCREENS per week (full structured screening calls, 20-30 min each, scored against the role). These three numbers together produce: active pipeline, fill velocity, and recruiter gross profit. Miss one, the funnel breaks. Miss two, you're below standard." },
      { heading: "ARM KPIs — weekly", body: "5 CLIENT MEETINGS per week (in-person or video, 20+ minutes, with a hiring manager or stakeholder). 1 NEW MEETING per week (a client or prospect you've never met before — net new logo or new stakeholder at existing logo). 20 PRESCREENS per week (you should know your candidate side as well as your client side — every ARM is half-recruiter at heart). New logos are the lifeblood. An ARM without weekly net-new is an ARM coasting on existing book." },
      { heading: "Sales KPIs — weekly", body: "10 CLIENT MEETINGS per week (full discovery, scoping, or relationship meetings). 2 NEW MEETINGS per week (net new logos — first-time meetings with prospects). Sales is responsible for the top of the funnel — without 2 net-new meetings/week, the pipeline runs dry in 60-90 days. Every Monday morning, you should know your 10 meetings for the week and which 2 are net-new." },
      { heading: "Why prescreens matter even for ARM and Sales", body: "The fastest way to lose credibility with a client is to recommend a candidate you haven't actually talked to. Every ARM and Sales rep is expected to maintain prescreen volume because: (1) you stay sharp on candidate evaluation, (2) you can speak to candidate quality firsthand, (3) you can fill in for recruiters during volume spikes, (4) you understand the candidate market your clients are competing in. Prescreens aren't 'recruiter work' — they're table stakes for everyone client-facing." },
      { heading: "Tracking and accountability", body: "Weekly KPI reports run every Monday. Numbers come from Salesforce — calls logged, submissions in Asymbl, meetings on calendar with notes. If your numbers don't match what you THINK you did, you're not logging activity. Logging IS part of the job. 'I made the calls but didn't log them' = you didn't make the calls, from a measurement standpoint. KPI reviews happen every Friday in 1:1s. Three consecutive weeks below standard triggers a structured improvement plan." },
      { heading: "Growth goals beyond KPIs", body: "Hitting KPIs gets you to standard. Going beyond gets you to top-tier comp and promotion. STRETCH MARKERS by role: RECRUITER → 15+ submissions/wk, 35+ prescreens/wk, 1+ start/wk. ARM → 7+ client meetings/wk, 2+ new/wk, 30+ prescreens/wk. SALES → 12+ meetings/wk, 4+ new/wk. Top performers don't aim for the floor — they aim for the ceiling. The floor is the qualifying round." }
    ] }
] },
{ cat: "Salesforce & ATS Training", icon: "grid", assignedGroups: ["All Employees"], items: [
    { name: "Learning Salesforce & Asymbl ATS", quiz: true, desc: "The core Salesforce/Asymbl object model, Outlook sync setup, and how to log everything from your inbox.", type: "doc", location: "All Team Members", url: null, content: [
      { heading: "Why this matters", body: "Salesforce is Spark's source of truth for every client, every candidate, every job, every placement, every dollar. If activity isn't in Salesforce, it didn't happen. If a placement isn't in Salesforce, commissions don't get paid. If a candidate's status isn't in Salesforce, two recruiters work the same person. Master Salesforce and you master your job. Avoid Salesforce and you'll fight the system every day." },
      { heading: "The core object model — definitions", body: "LEAD: a prospect we haven't qualified yet — top of funnel. Once qualified, converts to Account + Contact + Opportunity. ACCOUNT: a company. CLIENT CONTACT: a person inside an account (Hiring Manager, HR, etc.). OPPORTUNITY: a deal — usually tied to a job order or a master agreement. JOB: a specific requisition we're working. CANDIDATE: a person in our talent database. ATS APPLICANT: the link between a Candidate and a Job — it's a candidate APPLIED to a specific job, with status (sourced → screened → submitted → interview → offer → placed). PLACEMENT: a closed-won applicant — the contractor or perm hire we billed for." },
      { heading: "How the objects connect", body: "Account → has many → Client Contacts. Account → has many → Opportunities. Opportunity → has many → Jobs. Job → has many → ATS Applicants. ATS Applicant → links to one → Candidate. Candidate → can have many → ATS Applicants (across different jobs). Placement is the final stage of an ATS Applicant. Understanding this model means you'll never be confused about where to log what — every piece of activity belongs to an object." },
      { heading: "The Asymbl namespace (bpats__)", body: "Asymbl is the staffing ATS layer built on Salesforce. Custom objects and fields use the bpats__ prefix (e.g., bpats__Job__c, bpats__Applicant__c). When you build reports or formulas, you'll see this everywhere. It's not a bug — it's the namespace that separates Asymbl's package from native Salesforce. Don't try to rename or remove it. When in doubt about a field, search for the bpats__ version first." },
      { heading: "Outlook email sync — initial setup", body: "Step 1: in Salesforce, navigate to Setup → Email Integration → Outlook Integration. Step 2: install the Outlook plugin from Microsoft AppSource (search 'Salesforce'). Step 3: in Outlook, click the Salesforce icon in the ribbon, sign in with your Spark Salesforce credentials. Step 4: link your Outlook account to your Salesforce user. After setup, the Salesforce panel appears in every email — showing related records and giving you one-click logging." },
      { heading: "Viewing and editing records from Outlook", body: "When an email comes in from a contact in Salesforce, the Outlook plugin automatically shows: the contact, the related account, recent opportunities, recent jobs, recent activities. You can edit the record directly from Outlook — update phone, add notes, change opportunity stage — without leaving your inbox. Most reps double their CRM hygiene the first week they use this feature properly." },
      { heading: "Creating records from Outlook", body: "If an email is from someone NOT in Salesforce, the plugin offers: Create Lead, Create Contact, Create Account. One click captures the email signature into a new record. ALWAYS create the record at the time of first email — adding it 'later' means it doesn't get added. Treat the inbox as the on-ramp into Salesforce. Every meaningful email becomes a record." },
      { heading: "Logging emails to records", body: "Every email related to a deal, job, or placement should be logged. From Outlook, click 'Log to Salesforce' and select the record (account, opportunity, job). The email becomes part of the activity history. RULE: if you're cc'd on something deal-relevant, log it. Six months from now, when the deal is at risk, the activity history is your only memory." },
      { heading: "Tracking former client engagement", body: "When a client contact leaves their job, do NOT delete the contact — mark them 'No Longer With Company' and update their LinkedIn / new email if known. Former clients often resurface at new companies as new buyers. The contact who left ABC Corp last year may be the buyer at XYZ Corp this year — and YOU should be the first call they make. Keeping former-client relationships alive is the single highest-ROI activity in this business." },
      { heading: "Daily Salesforce hygiene", body: "End of every day, 10 minutes: (1) Log every call (use Outlook plugin or quick-log on phone). (2) Update opportunity stages on anything that moved. (3) Note next steps on each active deal. (4) Check tomorrow's calendar — pull each meeting record up and review history. Reps who do this finish weeks ahead of reps who don't. The compound effect of clean data is enormous." }
    ] },
    { name: "Recruiter's Salesforce Playbook", quiz: true, desc: "Find requisitions, post jobs, drag candidates through Kanban, source efficiently, and log activity that compounds over time.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Finding job requisitions", body: "Top nav → Jobs tab → list view 'My Open Jobs' (or 'All Open Jobs' for full visibility). Filter by: Account, Recruiter Assignment, Status (Open / On Hold / Closed), Date Posted, Priority. Bookmark 'My Open Jobs' as your home view. Every morning, you should be able to see your full active load on one screen — if you can't, your view is misconfigured." },
      { heading: "Creating a job posting", body: "From the Job record, click 'Post to Job Boards' → select boards (Indeed, LinkedIn, ZipRecruiter as available) → confirm description, location, salary range, must-haves. ALWAYS preview before publishing. Job postings with: clear title, clear must-haves in first 3 bullets, salary range posted, manager intro line — get 3-5x the application rate of generic postings. Treat every posting as a marketing piece." },
      { heading: "Adding candidates to the Kanban board", body: "From the Job record → Kanban view. Drag a candidate from 'Sourced' into 'Screened' once you've completed a prescreen. Drag from 'Screened' into 'Submitted' when the client has the resume. Drag from 'Submitted' into 'Interview' when the interview is scheduled. The drag-and-drop IS the system of record — when you move the card, statuses, dates, and counters update everywhere automatically." },
      { heading: "Drag-and-drop best practices", body: "Move candidates the SAME DAY the status changes — not at the end of the week. The Kanban board feeds: client-facing dashboards, your KPI numbers, the AM's pipeline view, payroll commission timing. A candidate stuck in 'Screened' for 5 days when they're actually 'Submitted' costs everyone — and your KPI submission count is artificially low. Move the card. Always." },
      { heading: "Sourcing inside Salesforce (existing talent pool)", body: "Top nav → Candidates → list view 'All Candidates'. Filter by: skill tags, location, last activity date, preferred industry. Always source EXISTING candidates first before posting jobs externally — there's gold in the database that hasn't been called in 6+ months. A 'cold' candidate from your own database who already knows Spark closes 3-5x faster than a cold external hit." },
      { heading: "Sourcing inside the job posting", body: "From Job record → 'Applicants' tab. As applications roll in from job boards, this is where they land. Triage daily: review, score (5-star or pass), prescreen the 5-stars, reject (with auto-email) the others. Letting applications sit destroys candidate experience and your time-to-fill. Top recruiters touch every applicant within 24 hours of receipt." },
      { heading: "Finding applicants across multiple jobs", body: "Sometimes a great applicant for Job A would also fit Job B you're working. From the Candidate record → 'Match to Other Jobs' → Salesforce surfaces compatible open reqs. Two-fer placements (one screen, two submission options) are pure efficiency gain. Check every prescreen completion against your open req board for cross-fits." },
      { heading: "Logging activities — the discipline", body: "Every call, every email, every text, every LinkedIn message related to a candidate or client should be logged. Use Quick Log: from any record → 'Log a Call' → 60 seconds to capture date, type, outcome, next step. Reps who hit 30 calls/day and log all 30 hit their KPI numbers automatically. Reps who don't log are eventually fired for being below standard — even if they're actually doing the work." },
      { heading: "Onboarding and placements", body: "When a candidate accepts an offer: (1) Move ATS Applicant to 'Offer Accepted'. (2) Create Placement record (auto-prompted in most cases). (3) Confirm: start date, pay rate, bill rate, location, supervisor. (4) Trigger TMX handoff (auto-email or Slack notification depending on your setup). (5) Log final commission-relevant data — first-day-billed date, guarantee end date, fee amount. Errors at this step cost the company in commission disputes and payroll problems. Slow down and verify." },
      { heading: "Reports every recruiter should run weekly", body: "(1) MY ACTIVE JOBS — open reqs by stage. (2) MY KPI DASHBOARD — calls, prescreens, submissions vs target. (3) FILL RATIO REPORT — submissions to placements (Job report type, not Applicant). (4) AT-RISK SUBMISSIONS — submitted candidates with no movement in 7+ days (need a nudge). (5) MY UPCOMING STARTS — placements starting in next 14 days (verify everything is locked). Run them every Monday in 15 minutes — sets your week." }
    ] }
] },
{ cat: "Industry Knowledge — Plastics", icon: "layers", assignedGroups: ["Production"], items: [
    { name: "Industry Knowledge: Plastics", quiz: true, desc: "Sourcing strategies, search terms, press types, and robot types for the plastics industry.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Why plastics matters for Spark", body: "Injection molding and thermoplastics manufacturing is one of Spark's strongest industry verticals — particularly automotive plastics, packaging, and medical components. The skill set is specialized enough that internal HR teams struggle to find qualified people. That's where we come in. The recruiter who can speak press tonnage, robot programming, and process tech has a permanent edge over recruiters who can't." },
      { heading: "Maintenance role search terms", body: "Use these in Indeed, LinkedIn, and ZipRecruiter searches: 'injection molding technician,' 'process technician,' 'mold setter,' 'tool & die,' 'press maintenance,' 'plastics maintenance technician,' 'auxiliary equipment technician,' 'robot technician plastics,' 'molding mechanic.' Combine with location and pay range filters. Boolean: ('injection molding' OR 'plastics manufacturing') AND ('maintenance' OR 'technician' OR 'mechanic')." },
      { heading: "Process tech search terms", body: "Process technicians are the bridge between operators and engineering. Search terms: 'process technician,' 'process engineer,' 'molding process tech,' 'plastics process specialist,' 'scientific molding,' 'RJG certified,' 'Master Molder.' RJG and Master Molder certifications are gold — candidates with these certifications command 15-25% premium and are in chronic short supply. Always ask: 'Are you RJG certified?' on the prescreen." },
      { heading: "Common press types — vocabulary", body: "EMAG — German-engineered, common in automotive. UBE — Japanese, large tonnage capability, hybrid hydraulic-electric. ENGEL — Austrian, premium brand, all-electric and hybrid lines. WITTMANN — Austrian, often paired with Wittmann Battenfeld auxiliaries. ARBURG — German, reliable workhorses, very common in medical and small parts. KRAUSS-MAFFEI — German, large tonnage and multi-component capability. MILACRON — American, common across automotive and packaging. NEGRI BOSSI — Italian, growing share. When a candidate mentions one of these by name, they're real." },
      { heading: "Robot types in plastics manufacturing", body: "STAR — Star Automation, American-made, common in mid-tonnage cells. RANGER — Ranger Automation, similar mid-market position. SEPRO — French, premium positioning, common in European-OEM-supplied plants. WITTMANN — paired with Wittmann presses, fully integrated. YUSHIN — Japanese, often paired with Japanese presses. When a candidate says they 'program robots,' ask which brand and what they program — pick-and-place vs sprue removal vs full insert molding are very different skill sets." },
      { heading: "Search technique tips", body: "ZIPCODE RADIUS: plastics talent is very location-sensitive — 30-mile radius is usually max viable commute. CERTIFICATION FILTERS: RJG, Master Molder, Six Sigma. SHIFT PREFERENCE: ask early — many plastics ops are 12-hour rotating shifts, not everyone can do them. PAY RATE: research before posting — undershooting market rate kills response rate. Use BLS data + local Indeed salary insights as your benchmark." },
      { heading: "Qualifying questions for plastics candidates", body: "(1) What press brands have you worked on, and what tonnage range? (2) Have you done mold changes, and how long is your typical changeover time? (3) RJG certified? Master Molder? (4) What auxiliary equipment — chillers, dryers, conveyors, robots? (5) Have you led process improvements or troubleshooting? Give me an example. (6) What's your shift preference and is rotating shift OK? (7) What's your pay expectation? Use these on EVERY prescreen — they separate real plastics talent from people who 'kind of worked at a plastics plant.'" }
    ] }
] },
{ cat: "Industry Knowledge — Automation", icon: "zap", assignedGroups: ["Production"], items: [
    { name: "Industry Knowledge: Automation & Controls", quiz: true, desc: "The deep dive — controls vocabulary, robot brands, protocols, and a job-by-job breakdown of 17 automation roles with pay ranges, search terms, and qualifying questions.", type: "doc", location: "ARM's and Sales", url: null, content: [
      { heading: "Why automation is Spark's deepest vertical", body: "Automation and controls is the niche where Spark wins almost every search we engage on. Why? Because the skill set is specialized enough that most internal HR teams and most generic recruiters can't tell a real Controls Engineer from someone who watched a YouTube video. The vocabulary is dense, the pay rates are high ($70K-$150K range), and the candidate pool is small. If you become fluent in this language, you become irreplaceable to your clients." },
      { heading: "Controls engineering basics — what controls people actually do", body: "A Controls Engineer designs, programs, and commissions the systems that make automated equipment work. Think: the brain that tells the conveyor when to start, the robot when to grab a part, the press when to close, the inspection station when to fail a part. They write code (PLC ladder logic, structured text, function blocks), wire panels, configure HMIs (touch screens), and integrate sensors and motors. A great controls engineer can take a customer requirement and deliver a fully working production line." },
      { heading: "Major PLC/PAC brands", body: "ALLEN-BRADLEY (Rockwell Automation) — the dominant brand in North American automotive and food/bev. Software: Studio 5000 (formerly RSLogix 5000), CompactLogix and ControlLogix lines. SIEMENS — dominant in Europe, growing in North America. Software: TIA Portal, S7-1500/S7-1200. OMRON — common in food/bev and packaging, especially Japanese-owned plants. Software: Sysmac Studio. MITSUBISHI — common in Japanese-owned auto plants and machine tool. Software: GX Works. When a candidate says they 'program PLCs,' ALWAYS ask which brand and which software. AB and Siemens experience aren't fully interchangeable." },
      { heading: "Industrial communication protocols", body: "ETHERNET/IP — Allen-Bradley's protocol, dominant where AB is dominant. PROFINET — Siemens' protocol, dominant where Siemens is dominant. MODBUS TCP — vendor-neutral, common for legacy and third-party device integration. DEVICENET — older AB protocol, still common in legacy plants. PROFIBUS — older Siemens protocol, still in older Siemens plants. When evaluating candidates: 'What protocols have you worked with?' is a great filter — they should be able to name 2-3 fluently." },
      { heading: "Major industrial robot brands", body: "FANUC — Japanese, the dominant robot brand globally and in automotive. Yellow color is iconic. Programming language: Karel and TPP. KUKA — German, premium brand, very common in BMW/Mercedes/automotive supply chain. Programming: KRL. ABB — Swedish, strong in welding and material handling. Programming: RAPID. YASKAWA / MOTOMAN — Japanese, strong in welding. Programming: INFORM. When a candidate says they 'program robots,' ask: which brand, what application (welding, material handling, painting, inspection), and how many cells they've programmed. Numbers separate real candidates from imposters." },
      { heading: "Great qualifying questions for any automation engineer", body: "(1) Walk me through your last project — what did you design or program? (2) Which PLC platform are you strongest on, and how many years? (3) Which HMI software? (Wonderware, FactoryTalk, WinCC, Ignition, Rockwell PanelView). (4) Have you commissioned equipment on the customer floor, or only programmed in the office? (Commissioning experience is the dividing line between mid and senior.) (5) What protocols have you used? (6) Have you led a team? How many people? (7) Travel tolerance — some commissioning roles are 50%+ travel." },
      { heading: "Job 1: Controls Engineer ($71K-$120K)", body: "PRIMARY ROLE: Designs and programs control systems for industrial equipment. Combines electrical engineering with software. KEY TOOLS: PLC software (Studio 5000, TIA Portal), HMI software, CAD (AutoCAD Electrical, EPLAN). SEARCH TERMS: 'controls engineer,' 'PLC programmer,' 'automation engineer.' QUALIFYING: 'What PLC platforms? How many lines have you programmed end-to-end? Commissioning experience?' EDUCATION: BS Electrical Engineering or Mechatronics typical, but degree-equivalent experience common in this field." },
      { heading: "Job 2: Controls Project Engineer ($77K-$120K)", body: "PRIMARY ROLE: Owns full project lifecycle — scope, design, build, commission, customer signoff. The Controls Engineer who also project-manages. KEY TOOLS: Same as Controls Engineer + Microsoft Project / Smartsheet for scheduling. SEARCH TERMS: 'controls project engineer,' 'controls PM,' 'automation project engineer.' QUALIFYING: 'How many projects have you owned end-to-end? Largest project budget you've managed? Customer-facing experience?' Pay premium over standard Controls Engineer reflects the project ownership and customer-facing skill." },
      { heading: "Job 3: Controls Technician ($53K-$89K)", body: "PRIMARY ROLE: Hands-on technician who installs, troubleshoots, and maintains automated systems. NOT typically a programmer — they support systems engineers programmed. KEY TOOLS: Multimeter, oscilloscope, PLC software (read-only typically), basic ladder logic understanding. SEARCH TERMS: 'controls technician,' 'automation technician,' 'electrical technician PLC.' QUALIFYING: 'Can you read ladder logic? Can you troubleshoot a PLC fault? Can you wire a panel?' EDUCATION: Associate's in electronics or industrial electrical typical." },
      { heading: "Job 4: Electrical Engineer ($68K-$115K)", body: "PRIMARY ROLE: Designs electrical systems — power distribution, motor control, panel design, schematic generation. May or may not also do controls programming. KEY TOOLS: AutoCAD Electrical, EPLAN, SolidWorks Electrical. SEARCH TERMS: 'electrical engineer,' 'controls electrical engineer,' 'panel designer.' QUALIFYING: 'What electrical CAD tool? NEC code knowledge? UL panel design? Single-line diagram experience?' EDUCATION: BS Electrical Engineering required for higher end of range." },
      { heading: "Job 5: Field Service Engineer ($63K-$105K)", body: "PRIMARY ROLE: Travels to customer sites to install, troubleshoot, and service equipment. Heavy travel role (50-75%). KEY TOOLS: Diagnostic tools, customer's PLC software, troubleshooting documentation. SEARCH TERMS: 'field service engineer,' 'service technician,' 'field service technician automation.' QUALIFYING: 'Travel tolerance? Customer-facing comfort? Troubleshooting under pressure? Available for emergency calls?' This role is ALL about temperament — the technical skills are easier to find than the customer skills." },
      { heading: "Job 6: Machine Tool Builder ($16-$34/hr)", body: "PRIMARY ROLE: Skilled hands-on assembler who physically builds large machine tools — drilling, milling, grinding equipment from raw castings to finished machine. KEY TOOLS: Precision measurement tools, hand tools, overhead cranes. SEARCH TERMS: 'machine tool builder,' 'machine tool assembler,' 'machinery builder.' QUALIFYING: 'What size machines have you built? Heavy equipment experience? Read mechanical prints? Tolerance to .0001?' EDUCATION: Apprenticeship traditionally, on-the-job training increasingly common. Hourly role, often unionized." },
      { heading: "Job 7: Machine Tool Electrician ($13-$34/hr)", body: "PRIMARY ROLE: Wires the electrical systems of machine tools — power, motors, sensors, control panels. KEY TOOLS: Schematic reading, multimeter, conduit benders, hand tools. SEARCH TERMS: 'machine tool electrician,' 'industrial electrician,' 'panel wirer.' QUALIFYING: 'Read electrical prints? Conduit experience? UL panel wiring? Three-phase power familiarity? Voltage levels you've worked on?' Often paired with Machine Tool Builder on the same project." },
      { heading: "Job 8: Machine Tool Pipefitter ($17-$47/hr)", body: "PRIMARY ROLE: Installs and maintains hydraulic, pneumatic, and coolant piping systems on machine tools. Often the highest-paid hourly role due to specialization. KEY TOOLS: Pipe benders, threaders, welders, pressure testers. SEARCH TERMS: 'machine tool pipefitter,' 'industrial pipefitter,' 'hydraulic pipefitter.' QUALIFYING: 'High-pressure hydraulic experience? Stainless steel piping? Tube bending vs threading? Welding certifications?' Often unionized." },
      { heading: "Job 9: Manufacturing Engineer ($69K-$122K)", body: "PRIMARY ROLE: Improves manufacturing processes — layout, throughput, cycle time, quality. Lives between Engineering and Operations. KEY TOOLS: Lean tools, Six Sigma methods, CAD, time studies, simulation software. SEARCH TERMS: 'manufacturing engineer,' 'process engineer,' 'production engineer,' 'industrial engineer.' QUALIFYING: 'Lean certifications? Six Sigma belt? Process improvement projects led? Cost savings delivered?' EDUCATION: BS Mechanical, Industrial, or Manufacturing Engineering." },
      { heading: "Job 10: Mechanical Engineer ($80K-$122K)", body: "PRIMARY ROLE: Designs mechanical systems — machinery, fixtures, tooling, structures. The 'CAD jockey' but also the design owner. KEY TOOLS: SolidWorks, Inventor, Creo, AutoCAD; FEA tools (ANSYS); GD&T fluency. SEARCH TERMS: 'mechanical engineer,' 'mechanical design engineer,' 'machine designer.' QUALIFYING: 'Primary CAD tool? GD&T experience? FEA exposure? Largest assembly modeled? Industries served?' EDUCATION: BS Mechanical Engineering." },
      { heading: "Job 11: Process Engineer ($80K-$115K)", body: "PRIMARY ROLE: Specific to a manufacturing process — molding, welding, machining, casting. Owns process parameters, troubleshooting, optimization. KEY TOOLS: SPC software, DOE design, process simulation. SEARCH TERMS: 'process engineer,' specific to the process: 'welding process engineer,' 'molding process engineer.' QUALIFYING: 'Which process are you the expert in? Years in that process? Cost savings or quality improvements driven? Six Sigma?' EDUCATION: BS Engineering, often specialized." },
      { heading: "Job 12: Robot Commissioning Engineer ($74K-$120K)", body: "PRIMARY ROLE: Integrates and commissions industrial robots into customer cells. Heavy on-site / customer-facing work. KEY TOOLS: Robot programming software (Fanuc Roboguide, KUKA WorkVisual, ABB RobotStudio), simulation, safety systems. SEARCH TERMS: 'robot commissioning,' 'robot integration engineer,' 'robotic systems engineer.' QUALIFYING: 'Which robot brands? Largest cell commissioned? Travel tolerance? Customer-facing comfort? Safety system experience (Pilz, Sick)?' Travel-heavy role." },
      { heading: "Job 13: Robotics Engineer ($90K-$135K)", body: "PRIMARY ROLE: Designs robotic systems and integrations from scratch — picks the robot, designs the cell, programs the application. Higher on the value chain than Robot Commissioning. KEY TOOLS: Same as Commissioning + simulation + offline programming + cell design. SEARCH TERMS: 'robotics engineer,' 'robotic systems designer,' 'automation engineer (robots).' QUALIFYING: 'Designed cells from scratch? Robot brand expertise? Vision system integration (Cognex, Keyence)? Force-torque integration?' Premium role." },
      { heading: "Job 14: Robot Programmer ($55K-$98K)", body: "PRIMARY ROLE: Pure programmer — given a designed cell and robot, writes the program to make it do the work. Less project ownership, more technical depth. KEY TOOLS: Robot programming languages (Karel, KRL, RAPID, INFORM), teach pendant, offline programming. SEARCH TERMS: 'robot programmer,' 'robotics programmer,' 'industrial robot programmer.' QUALIFYING: 'Robot brand depth? Application type (welding, material handling, painting)? Online vs offline programming? Vision system integration?'" },
      { heading: "Job 15: Simulation Engineer ($63K-$108K)", body: "PRIMARY ROLE: Builds digital twins and simulations of manufacturing cells before physical build — proves the design works, optimizes layout. KEY TOOLS: Tecnomatix Process Simulate, Robcad, RobotStudio, Visual Components, Delmia. SEARCH TERMS: 'simulation engineer,' 'digital twin engineer,' 'process simulate engineer.' QUALIFYING: 'Which simulation platform? Industries simulated? Largest cell simulated? Hand-off to commissioning experience?' Niche but high-demand." },
      { heading: "Job 16: Software Engineer ($86K-$153K)", body: "PRIMARY ROLE: In automation context — typically writes higher-level software that interfaces with PLCs, MES systems, databases, dashboards. Bridge between IT and OT. KEY TOOLS: C#, Python, SQL, sometimes C++. SCADA platforms (Ignition, Wonderware), MES systems. SEARCH TERMS: 'software engineer manufacturing,' 'controls software engineer,' 'MES software engineer.' QUALIFYING: 'Languages? Manufacturing/industrial domain experience? PLC integration? Database design? SCADA platforms?' Highest pay band in the automation list — strong demand." },
      { heading: "Job 17: Systems Engineer ($81K-$125K)", body: "PRIMARY ROLE: Owns the integration of multiple subsystems — controls + mechanical + software + safety — into one working system. Often the lead role on large projects. KEY TOOLS: Systems engineering frameworks, project management, deep cross-discipline knowledge. SEARCH TERMS: 'systems engineer automation,' 'integration engineer,' 'lead systems engineer.' QUALIFYING: 'Largest system integrated? Cross-discipline experience? Customer-facing? Project budget owned?' Senior, broad role." },
      { heading: "Prescreen template: Machine Tool Builder", body: "Required questions: (1) Years building machine tools, and what types/sizes? (2) Comfortable reading mechanical assembly prints? (3) Heavy lifting capacity (50+ lbs)? Overhead crane operation? (4) Tolerance levels — have you measured to .0001? Mic, indicator, surface plate? (5) Apprenticeship completed, or how many years OJT? (6) Shift preference and OT willingness? (7) Pay expectation per hour? (8) Why are you looking? (9) Notice required at current role? (10) Closest cities you'll commute to." },
      { heading: "Prescreen template: Machine Tool Electrician", body: "Required questions: (1) Years wiring industrial control panels? (2) Read electrical schematics fluently? (3) UL 508A panel build experience? (4) Voltage levels you've worked on (control voltage 24VDC, 120/240VAC, 480V three-phase)? (5) Conduit bending and pulling — pipe sizes? (6) Motor wiring — VFDs, soft starts? (7) Apprenticeship complete or hours? (8) Pay expectation? (9) Travel willingness if applicable? (10) References from previous machine builders?" },
      { heading: "Prescreen template: Machine Tool Pipefitter", body: "Required questions: (1) Years pipefitting on machine tools or industrial equipment? (2) Hydraulic system experience — what pressures? (3) Pneumatic system experience? (4) Welding certifications (TIG, MIG, stainless)? (5) Pipe materials — black iron, stainless, copper, hose? (6) Tube bending experience? (7) Pressure testing methods? (8) Apprenticeship status? (9) Pay expectation? (10) Heavy lifting OK? Confined space comfortable?" },
      { heading: "Active automation client targets", body: "Spark has active engagements or warm relationships with the following automation segment clients. Don't cold-call these without checking with your AM first — but DO know they're active accounts: 27 companies across automotive supply, machine tool, robotic integrators, and end-of-line automation. Confirm current target list with your manager. Cross-reference any new lead against existing account list before initiating outreach to avoid stepping on a colleague's deal." },
      { heading: "Final word: become the automation expert", body: "If you commit to learning this material — really learning it, not just skimming — you will out-recruit every generic competitor in this space. Clients can tell within 30 seconds whether a recruiter speaks their language. The recruiter who says 'We have someone with 8 years on AB ControlLogix, programmed three full automotive body-shop cells, and commissioned them on-site at GM Lordstown' wins the call. The recruiter who says 'We have controls people' loses every time. Vocabulary is the moat." }
    ] }
] }
];



const QUIZZES = {
"Company Culture & Core Values": [
  { q: "When was Spark Talent Acquisition founded?", opts: ["2010", "2013", "2015", "2018"], answer: 1 },
  { q: "Who founded Spark Companies?", opts: ["Dave Veres", "Fletcher Kundtz", "Aaron Opalewski", "Ryan Aymen"], answer: 2 },
  { q: "How many staffing companies are under Spark?", opts: ["3", "4", "5", "6"], answer: 2 },
  { q: "Which is NOT a Spark core value?", opts: ["Dominate the Day", "Maximize Profit", "Be Humble", "Do the Right Thing"], answer: 1 },
  { q: "What is Spark's stated purpose?", opts: ["Maximize revenue", "Help PEOPLE grow", "Become largest staffing firm", "Win market share"], answer: 1 },
  { q: "What should you say instead of 'No problem'?", opts: ["You're welcome", "My pleasure or Absolutely", "Sure thing", "Don't mention it"], answer: 1 },
  { q: "When are hats allowed?", opts: ["Any day", "Only Fridays unless company logo", "Never", "Only outside"], answer: 1 },
],
"Recruiting Process Training": [
  { q: "What does TEDW stand for?", opts: ["Track, Evaluate, Document, Wrap-up", "Tell me, Explain, Describe, Walk me through", "Test, Engage, Deliver, Win", "Time, Effort, Dedication, Work"], answer: 1 },
  { q: "How to access prescreen templates in Asymbl?", opts: ["Settings > Templates", "CTRL + . in the text box", "File > New > Template", "Ask your manager"], answer: 1 },
  { q: "Correct prescreen flow?", opts: ["Q&A > Intro > Overview", "Intro > Candidate > Role > Q&A > Next Steps", "Screen > Test > Evaluate", "Background > Interview > Offer"], answer: 1 },
  { q: "When to send first-day prep email?", opts: ["Day of", "1 day before", "At least 2 business days before", "1 week before"], answer: 2 },
  { q: "How to handle a termination call?", opts: ["Leave a voicemail", "Send email", "Call directly, factual and calm", "Have coworker deliver"], answer: 2 },
],
"Recruiting & Employment Law": [
  { q: "Which act protects workers 40+?", opts: ["Title VII", "ADA", "ADEA", "FCRA"], answer: 2 },
  { q: "If candidate mentions protected class:", opts: ["End interview", "Write it down", "Pivot, note EEOC compliance", "Ask follow-up questions"], answer: 2 },
  { q: "Michigan at-will employment means:", opts: ["Must give 2 weeks", "Terminate anytime for legal reason", "Must provide severance", "Contracts required"], answer: 1 },
  { q: "Illegal termination reason?", opts: ["Poor attendance", "Budget cuts", "Retaliation for whistleblowing", "Job elimination"], answer: 2 },
  { q: "Termination notes should contain:", opts: ["Personal opinions", "Only facts, objective language", "Protected class mentions", "Informal observations"], answer: 1 },
],
"Terminations & Michigan Law": [
  { q: "Michigan follows which employment doctrine?", opts: ["Right to work", "At-will", "Just cause", "Employment contract"], answer: 1 },
  { q: "Which Michigan law prohibits discrimination?", opts: ["Whistleblowers' Act", "Elliott-Larsen Civil Rights Act", "FCRA", "OSHA"], answer: 1 },
  { q: "You should NEVER deliver termination via:", opts: ["Phone call", "Voicemail", "In-person meeting", "Video call"], answer: 1 },
],
"Sales Process Training": [
  { q: "How many primary target accounts?", opts: ["5", "10", "20", "50"], answer: 2 },
  { q: "% of time on target accounts?", opts: ["50%", "60%", "80%", "100%"], answer: 2 },
  { q: "The 4 P's of every requirement?", opts: ["Product, Price, Place, Promotion", "Position, Pay, Process, People", "Plan, Prepare, Present, Perform", "Prospect, Pipeline, Pitch, Place"], answer: 1 },
  { q: "Managers to target per account?", opts: ["1-2", "3-5", "6-8", "10+"], answer: 1 },
  { q: "After a placement, always ask:", opts: ["For a bonus", "For a reference", "What's coming up next?", "For extension"], answer: 2 },
],
"Recruiter Compliance Refresher": [
  { q: "Score needed to pass compliance quiz?", opts: ["8/12", "9/12", "10/12", "12/12"], answer: 2 },
  { q: "Highest-risk compliance area?", opts: ["Phone screening", "Social media screening", "Reference checks", "Job postings"], answer: 1 },
  { q: "FCRA regulates:", opts: ["Fair pay", "Background checks", "Social media", "Interviews"], answer: 1 },
  { q: "Ban the Box restricts:", opts: ["Drug testing", "Salary history", "Criminal history on initial apps", "Social media"], answer: 2 },
],
"New Hire Onboarding": [
  { q: "What system does Spark use for electronic onboarding paperwork?", opts: ["Workday", "Greenshades", "ADP", "Paycor"], answer: 1 },
  { q: "What is the GreenEmployee company code for Spark?", opts: ["sparktalent", "sparkco", "sparkportfolio", "sparkgroup"], answer: 2 },
  { q: "What should candidates download for paystubs and time tracking?", opts: ["Spark Group app", "GreenEmployee app", "Greenshades Portal", "ADP Mobile"], answer: 1 },
  { q: "Who should recruiters direct candidates to for onboarding questions?", opts: ["Their manager", "Allie Spegel", "Tamika Coleman / HR", "Payroll team"], answer: 2 },
  { q: "What triggers the onboarding workflow for a new hire?", opts: ["Email to HR", "Placement approved in Salesforce", "Phone call to Tamika", "SharePoint form"], answer: 1 },
],
"Benefits & Enrollment": [
  { q: "What is the effective date of the current benefits plan?", opts: ["01/01/2026", "11/21/2025", "03/01/2026", "07/01/2025"], answer: 1 },
  { q: "How do you enroll in benefits?", opts: ["SharePoint form", "TheAmericanWorker.com or call (855) 495-1190", "Email HR", "GreenEmployee app"], answer: 1 },
  { q: "What is the annual deductible for the Priority Health Major Medical plan?", opts: ["$3,000", "$5,000", "$6,350", "$10,000"], answer: 2 },
  { q: "Which network provides dental coverage?", opts: ["VSP Choice", "First Health", "Ameritas Classic PPO", "Delta Dental"], answer: 2 },
  { q: "What does Teladoc provide?", opts: ["Dental cleanings", "24/7 virtual doctor consultations at no cost", "Vision exams", "Prescription delivery"], answer: 1 },
  { q: "When can you change benefits coverage?", opts: ["Anytime", "Only during Open Enrollment or within 30 days of qualifying life event", "Monthly", "Every 6 months"], answer: 1 },
],
"Compliance & Legal": [
  { q: "What does Ban the Box legislation restrict?", opts: ["Drug testing", "Salary history questions", "Criminal history questions on initial applications", "Social media screening"], answer: 2 },
  { q: "What federal law governs background checks in employment?", opts: ["HIPAA", "FCRA", "FMLA", "OSHA"], answer: 1 },
  { q: "Before taking adverse action based on a background check, what must you send?", opts: ["Termination letter", "Pre-adverse action notice", "Final paycheck", "COBRA notice"], answer: 1 },
  { q: "Which of these is an illegal interview question?", opts: ["Tell me about your experience", "What year did you graduate?", "Are you authorized to work in the US?", "Describe a challenge you overcame"], answer: 1 },
],
"Systems & Tools": [
  { q: "What is Spark's primary ATS?", opts: ["Indeed", "Salesforce", "Greenshades", "Workday"], answer: 1 },
  { q: "Where are 2025 W-2s located?", opts: ["GreenEmployee", "Greenshades", "Paycor", "SharePoint"], answer: 2 },
  { q: "What is the Salesforce URL for Spark?", opts: ["salesforce.com/spark", "spark-companies.my.salesforce.com", "sparktalent.salesforce.com", "crm.sparkcompanies.com"], answer: 1 },
],
"Performance Management": [
  { q: "What are the three steps in Spark's performance management process?", opts: ["Warning, Write-up, Termination", "Friendly Conversation, Serious Discussion, Opportunity Plan", "Verbal, Written, Final", "Coaching, PIP, Separation"], answer: 1 },
  { q: "What should you do FIRST when behavior doesn't align?", opts: ["Put them on an opportunity plan", "Have a friendly conversation", "Document it formally", "Escalate to HR"], answer: 1 },
  { q: "Why is it called an 'Opportunity Plan'?", opts: ["Legal requirement", "It sounds nicer", "It's a chance to grow and most promoted leaders have been on one", "To avoid HR paperwork"], answer: 2 },
  { q: "What is a leadership failure per Aaron's framework?", opts: ["Not hitting revenue", "Sticking on friendly conversations then suddenly firing someone", "Not documenting every conversation", "Allowing too many opportunity plans"], answer: 1 },
  { q: "When having a serious discussion, what should you explicitly state?", opts: ["That you're disappointed", "That this is a serious discussion", "That they're about to be fired", "That HR is involved"], answer: 1 },
  { q: "An opportunity plan always means termination if no improvement.", opts: ["True", "False — consequences could include promo ineligibility, bonuses, or role changes", "True — company policy", "Only for production roles"], answer: 1 },
  { q: "Which Spark core value ties to overcoming an opportunity plan?", opts: ["Leading by example", "Conquering adversity is the recipe for success", "Do the right thing", "Be humble, crave improvement"], answer: 1 },
],
"AI & Technology": [
  { q: "What Microsoft platform enables low-code automation at Spark?", opts: ["Azure DevOps", "Power Platform", "Visual Studio", "GitHub Actions"], answer: 1 },
  { q: "What Microsoft platform enables automation at Spark?", opts: ["Azure DevOps", "Power Platform", "Visual Studio", "GitHub Actions"], answer: 1 },
],

"Sales Mastery": [
  { q: "An objection of 'It's too expensive' most often means:", opts: ["The prospect can't afford it", "They don't yet see enough value to justify the cost", "You should immediately discount", "They want to end the call"], answer: 1 },
  { q: "Mirroring in objection handling means:", opts: ["Copying their body language", "Repeating their last 2-3 words as a question", "Agreeing with everything they say", "Sending them a similar-style email"], answer: 1 },
  { q: "After answering an objection, you should always:", opts: ["Move to the close", "Send a follow-up email", "Confirm whether the concern is resolved", "Lower the price"], answer: 2 },
  { q: "When a prospect asks for a discount, the best move is to:", opts: ["Discount immediately to close fast", "Add or remove scope as a tradeoff", "Refuse to discuss price", "Walk away from the deal"], answer: 1 },
  { q: "Anchoring early and high in negotiation:", opts: ["Scares prospects off", "Sets the gravity of the negotiation in your favor", "Is unprofessional", "Only works for senior reps"], answer: 1 },
  { q: "Walking away from a bad deal is:", opts: ["A sign of weakness", "Only for top reps", "A negotiation power move that often brings the prospect back", "Always the wrong call"], answer: 2 },
  { q: "The phrase that turns a feature into a benefit is:", opts: ["'And also'", "'So that'", "'In addition'", "'Furthermore'"], answer: 1 },
  { q: "When pitching a CFO, lead with:", opts: ["Candidate quality stories", "ROI, payback period, cost-of-vacancy math", "Recruiter headcount", "Office locations"], answer: 1 },
  { q: "The 'value gap' refers to:", opts: ["Salary compression", "Cost of inaction minus cost of action", "Fee discount room", "Market wage variance"], answer: 1 },
  { q: "The 2-minute rule says:", opts: ["Take 2-minute breaks every hour", "If a task takes under 2 minutes, do it now", "Limit calls to 2 minutes", "Reply to every email within 2 minutes"], answer: 1 },
  { q: "Email should be processed:", opts: ["Continuously throughout the day", "In scheduled batches", "Only at the end of the day", "Only on your phone"], answer: 1 },
  { q: "Time blocking means:", opts: ["Blocking unwanted callers", "Reserving calendar slots for specific activity types", "Working only during business hours", "Refusing all meetings"], answer: 1 },
  { q: "On a discovery call, top reps talk roughly:", opts: ["70% of the time", "50% of the time", "30% of the time", "90% of the time"], answer: 2 },
  { q: "Open-ended questions start with:", opts: ["'Are' and 'Do'", "'What' and 'How'", "'Will' and 'Can'", "'Did' and 'Have'"], answer: 1 },
  { q: "Quantifying questions exist to:", opts: ["Test the prospect", "Move pain from vague to specific dollars/hours", "Slow down the call", "Show off your knowledge"], answer: 1 },
  { q: "Every follow-up should:", opts: ["Just check in", "Apologize for bothering them", "Give the prospect something of value", "Ask for the close"], answer: 2 },
  { q: "The breakup email response rate vs 'just checking in':", opts: ["About the same", "Roughly 15-20x higher", "Slightly lower", "Same — both are weak"], answer: 1 },
  { q: "Before ending a discovery call, you should:", opts: ["Promise to circle back", "Lock in the next meeting on the calendar", "Send a thank-you", "Wait for the prospect to follow up"], answer: 1 },
  { q: "The Assumptive Close moves the conversation to:", opts: ["Whether they want to buy", "Logistics — which version, when, who", "A discount discussion", "Another meeting"], answer: 1 },
  { q: "The Cost of Vacancy formula uses what multiplier on base salary?", opts: ["1.0x", "1.1x", "1.3x", "2.0x"], answer: 2 },
  { q: "When a prospect says 'we're working with another firm,' the best response is:", opts: ["Walk away", "Ask to be added as a second source", "Aggressively criticize the competitor", "Offer a steep discount"], answer: 1 },
  { q: "The five buying roles in a complex deal include:", opts: ["Boss, employee, contractor, vendor, customer", "Economic, User, Technical, Champion, Gatekeeper", "Sales, Marketing, Operations, Finance, HR", "CEO, COO, CFO, CMO, CHRO"], answer: 1 },
  { q: "Procurement's three core KPIs are:", opts: ["Savings, risk reduction, vendor consolidation", "Speed, quality, price", "Innovation, scale, brand", "Hiring, firing, payroll"], answer: 0 },
  { q: "When procurement says 'we need 3 bids,' the best response is:", opts: ["Drop your price", "Walk away", "Ask what criteria are weighted heaviest", "Bid lower than competitors"], answer: 2 },
  { q: "The most common reason deals stall is:", opts: ["Price", "Status quo felt safer than change", "Competition", "Bad timing"], answer: 1 },
  { q: "On urgency scoring, you don't have a real deal until the prospect rates urgency at:", opts: ["1+", "5+", "8+", "10"], answer: 2 },
  { q: "A re-engagement email should lead with:", opts: ["'Just checking in'", "An apology for bothering them", "A new insight, stakeholder, or angle", "A discount offer"], answer: 2 },
  { q: "An ideal client profile is the intersection of:", opts: ["Industry, size, geography, hiring signals, pain", "Just industry and size", "Whoever responds to email", "Companies in your CRM"], answer: 0 },
  { q: "The Problem-Impact-Solution-CTA formula uses how many sentences?", opts: ["One", "Two", "Four", "Eight"], answer: 2 },
  { q: "A 'give-to-get' offer means:", opts: ["Discounting your fee", "Leading with something the prospect gets whether they buy or not", "Asking for a referral", "Offering a free trial"], answer: 1 },
  { q: "A great voicemail is under:", opts: ["10 seconds", "25 seconds", "60 seconds", "2 minutes"], answer: 1 },
  { q: "Every voicemail should end with:", opts: ["An apology", "A specific reason to call back", "A long pitch", "Your full email signature"], answer: 1 },
  { q: "The voicemail you should NEVER leave is:", opts: ["A cold trigger-based VM", "A reference-call follow-up", "A 'just calling to introduce myself' VM", "A rate-negotiation VM"], answer: 2 },
  { q: "The minimum GP target on a Skilled Trades contract is:", opts: ["10%", "15%", "20%", "35%"], answer: 2 },
  { q: "The target GP on a Technical/Engineering contract is:", opts: ["20%", "35%", "50%", "65%"], answer: 2 },
  { q: "The single highest predictor of becoming great in sales is:", opts: ["Charisma", "Coachability", "Industry experience", "College degree"], answer: 1 }
],
"Value Proposition Deep Dives": [
  { q: "RPO differs from contingent search because:", opts: ["It's cheaper", "It's a subscription/managed-volume model with embedded capacity", "It only handles executive roles", "It's only for tech companies"], answer: 1 },
  { q: "When pitching procurement on RPO, lead with:", opts: ["Better candidates", "Vendor consolidation, variable cost, risk transfer, measurable KPIs", "Lower base fees", "Faster onboarding"], answer: 1 },
  { q: "RPO is best pitched to:", opts: ["Front-line hiring managers", "VP HR, Director TA, VP Ops, VP Procurement, CFO (at scale)", "Only the CEO", "HR Coordinators"], answer: 1 },
  { q: "Engaged search is the right model for:", opts: ["High-volume light industrial", "Senior IC and director-level roles where contingent isn't deep enough", "Only C-suite roles", "Only roles under $50K"], answer: 1 },
  { q: "The cost of a senior mis-hire is approximately:", opts: ["1x salary", "1.5x salary", "3-5x first-year salary", "10x salary"], answer: 2 },
  { q: "Contingent fails on senior roles because:", opts: ["Recruiters aren't qualified", "Recruiters work the easiest reqs first and abandon hard ones", "Contingent doesn't allow exclusivity", "Senior candidates don't respond to contingent recruiters"], answer: 1 }
],
"Contract Needs Talk Track": [
  { q: "How often should top 10 accounts have their contract terms reviewed?", opts: ["Annually", "Quarterly", "Every 5 years", "Only at renewal"], answer: 1 },
  { q: "Renewal alerts should be set at:", opts: ["7 days only", "90, 60, and 30 days before renewal", "1 day before renewal", "After renewal"], answer: 1 },
  { q: "If a client requests a rate concession below contract minimums, you should:", opts: ["Approve it to keep the relationship", "Ignore it", "Escalate immediately to leadership", "Counter with a higher rate"], answer: 2 }
],
"Back Office Operations": [
  { q: "Spark's primary payroll system for the W-2 contractor population is:", opts: ["Paycor", "Greenshades", "ADP", "Paychex"], answer: 1 },
  { q: "Payroll runs on what day of the week?", opts: ["Monday", "Wednesday", "Friday", "Sunday"], answer: 1 },
  { q: "The benefits enrollment window for new hires is:", opts: ["7 days", "30 days from start date", "90 days", "Open year-round"], answer: 1 },
  { q: "Federal law requires I-9 Section 2 to be completed within how many business days of start?", opts: ["Same day", "3 business days", "10 business days", "30 days"], answer: 1 },
  { q: "Pay rate changes require:", opts: ["A verbal commitment", "A Pay Change Authorization Form via Conga", "A text message", "Just an email"], answer: 1 },
  { q: "When should TMX be notified after a workplace injury?", opts: ["Within 4 hours", "Within a week", "Only if it's serious", "Only after the contractor returns to work"], answer: 0 },
  { q: "When advising a contractor on I-9 documents, you should:", opts: ["Tell them which documents to bring", "Let them choose from the acceptable list", "Require a passport only", "Accept photocopies"], answer: 1 }
],
"KPI Performance Standards": [
  { q: "A Recruiter's weekly submission target is:", opts: ["5", "10", "20", "30"], answer: 1 },
  { q: "An ARM's weekly net-new meeting target is:", opts: ["1", "5", "10", "20"], answer: 0 },
  { q: "A Sales rep's weekly client meeting target is:", opts: ["3", "5", "10", "20"], answer: 2 },
  { q: "Three consecutive weeks below KPI standard triggers:", opts: ["Termination", "A bonus", "A structured improvement plan", "Nothing"], answer: 2 }
],
"Salesforce & ATS Training": [
  { q: "An ATS Applicant is best described as:", opts: ["A new client", "The link between a Candidate and a Job, with a status", "A placement", "A signed offer letter"], answer: 1 },
  { q: "The Asymbl namespace prefix in Salesforce is:", opts: ["sf__", "asymbl_", "bpats__", "spark_"], answer: 2 },
  { q: "When an email arrives from a person NOT yet in Salesforce, you should:", opts: ["Ignore it", "Reply and create the record later", "Use the Outlook plugin to create the Lead/Contact immediately", "Add it manually next week"], answer: 2 },
  { q: "When a client contact leaves their job, you should:", opts: ["Delete the record", "Mark 'No Longer With Company' and update with their new info", "Move them to a 'do not contact' list", "Email their replacement immediately"], answer: 1 },
  { q: "When a candidate's status changes, you should update the Kanban:", opts: ["At the end of the week", "Same day", "Whenever you remember", "Only at month-end"], answer: 1 },
  { q: "Before posting a job externally, you should first:", opts: ["Email the client for approval", "Source your existing Salesforce candidate database", "Run a credit check", "Update your LinkedIn"], answer: 1 },
  { q: "The Fill Ratio report should be built using which report type?", opts: ["Applicant", "Job", "Account", "Opportunity"], answer: 1 },
  { q: "When a candidate accepts an offer, the FIRST system step is:", opts: ["Email the recruiter team", "Move the ATS Applicant to 'Offer Accepted' and create the Placement record", "Start the background check", "Send a thank-you email"], answer: 1 }
],
"Industry Knowledge — Plastics": [
  { q: "RJG and Master Molder certifications indicate:", opts: ["Entry-level training", "Premium process tech credentials in short supply", "Safety certifications", "Forklift operation"], answer: 1 },
  { q: "Sepro is a brand of:", opts: ["Injection press", "Robot for plastics manufacturing", "Mold material", "Conveyor system"], answer: 1 },
  { q: "Plastics talent is sensitive to:", opts: ["Pay rate only", "Commute distance — typically 30-mile max", "Job title only", "Company logo"], answer: 1 }
],
"Industry Knowledge — Automation": [
  { q: "Allen-Bradley's primary PLC programming software is:", opts: ["TIA Portal", "Studio 5000", "Sysmac Studio", "GX Works"], answer: 1 },
  { q: "EtherNet/IP is most associated with:", opts: ["Siemens", "Allen-Bradley/Rockwell", "Mitsubishi", "Omron"], answer: 1 },
  { q: "Which robot brand uses the KRL programming language?", opts: ["Fanuc", "ABB", "KUKA", "Yaskawa"], answer: 2 },
  { q: "A Field Service Engineer role is best suited for someone who:", opts: ["Wants a desk job", "Tolerates 50-75% travel and is customer-facing", "Only wants to write code", "Doesn't like troubleshooting"], answer: 1 },
  { q: "The dividing line between mid-level and senior automation engineers is typically:", opts: ["College degree", "Years of experience only", "Commissioning experience on the customer floor", "Knowing AutoCAD"], answer: 2 },
  { q: "If a candidate says they 'program robots' you should ALWAYS ask:", opts: ["Their salary expectation first", "Which brand, application, and how many cells", "Whether they have a passport", "Their college GPA"], answer: 1 }
],
};

const TEAM_ROSTER = [
{ name: "Aaron Opalewski", role: "CEO", div: "Spark Companies", isManager: true, manager: null },
{ name: "Dave Veres", role: "EVP / CSO", div: "Spark Companies", isManager: true, manager: "Aaron Opalewski" },
{ name: "Allie Spegel", role: "VP Operations", div: "Spark Companies", isManager: true, manager: "Aaron Opalewski" },
{ name: "Mary Patrico", role: "Dir. of Operations", div: "Spark Companies", isManager: true, manager: "Allie Spegel" },
{ name: "Priyanka Malani", role: "Payroll Manager", div: "Spark Companies", isManager: true, manager: "Allie Spegel" },
{ name: "Tamika Coleman", role: "HR Lead", div: "Spark Companies", isManager: true, manager: "Allie Spegel" },
{ name: "Aidan Juengel", role: "Recruiter", div: "Spark Talent", manager: "Jamie Platt" },
{ name: "Alec Czartoryski", role: "Recruiter", div: "Spark Talent", manager: "Jamie Platt" },
{ name: "Jamie Platt", role: "Team Lead", div: "Spark Talent", isManager: true, manager: "Dave Veres" },
{ name: "Kristin Scarth", role: "Team Lead", div: "Ignite Search", isManager: true, manager: "Dave Veres" },
{ name: "Jamie Bell", role: "Recruiter", div: "Spark Talent", manager: "Jamie Platt" },
{ name: "Chad Opalewski", role: "Operations", div: "Spark Companies", manager: "Mary Patrico" },
{ name: "Julie Rinaldi", role: "Sr. Recruiter", div: "Spark Talent", manager: "Jamie Platt" },
{ name: "Carlin McCrimmon", role: "Recruiter", div: "Spark Talent", manager: "Jamie Platt" },
{ name: "Maven Namma", role: "IT / Systems", div: "Spark Companies", manager: "Allie Spegel" },
{ name: "Bedros Namma", role: "Finance", div: "Spark Companies", manager: "Aaron Opalewski" },
{ name: "Erica Urisitti", role: "Operations", div: "Spark Companies", manager: "Mary Patrico" },
{ name: "Sam Ban", role: "BPO Services", div: "Spark Companies", manager: "Mary Patrico" },
];

const SOP_SECTIONS = [
{ cat: "Payroll", icon: "dollar", items: ["Weekly payroll processing (every Friday)", "Timesheet submission & verification", "Rapid! PayCard enrollment", "Direct deposit setup / changes", "PTO accrual tracking", "W-2 distribution", "Multi-entity payroll", "Tax filing & compliance", "Garnishment processing"] },
{ cat: "HR & Onboarding", icon: "users", items: ["New hire onboarding checklist", "Background check initiation (FCRA)", "I-9 verification & E-Verify", "Benefits enrollment (30-day window)", "Employee handbook acknowledgment", "Drug screening coordination", "Workers' comp injury reporting", "Termination processing", "Exit interview procedure"] },
{ cat: "Recruiting Operations", icon: "search", items: ["Job order creation & posting", "Candidate screening workflow", "Submittal process to clients", "Interview scheduling", "Offer letter generation", "Commission calculation & tracking", "Fill ratio reporting", "Client VMS management", "Referral program processing ($100/$50)"] },
{ cat: "Systems & IT", icon: "settings", items: ["M365 account provisioning", "Salesforce user setup", "GreenEmployee enrollment", "VPN / remote access setup", "Laptop provisioning & imaging", "Software license management", "SharePoint site administration", "Data backup & recovery", "Security incident response"] },
];

const CORE_VALUES = [
{ num: 1, title: "Leading by Example Isn't Just a Way, It's the Only Way", standard: "Every Spark team member sets the tone through their own actions.", behaviors: ["Arrive prepared for meetings with data, insights, and action steps","Demonstrate punctuality and professionalism","Actively collaborate across units"], tactics: ["Stick to your Blueprint","Show up office-ready for client meetings","Have call sheets ready with 25 names","Show up to plug-ins 20–30 min early","Understand what others are working on"] },
{ num: 2, title: "Do the Right Thing", standard: "Decisions reflect integrity, transparency, and respect — always.", behaviors: ["Follow through on commitments","Communicate openly about mistakes","Safeguard trust","Make the right decision for the team"], tactics: ["Stay within pricing/conversion framework","When we take a req it is a commitment to deliver","If submitting a candidate, commit to finding a job for them"] },
{ num: 3, title: "Conquering Adversity is the Recipe to Success", standard: "Adversity is inevitable — our response defines us.", behaviors: ["Approach obstacles solutions-first","Share lessons from setbacks","Rally together when facing challenges","Learn from failure"], tactics: ["Share successes and struggles openly","Share talk-tracks through role-plays"] },
{ num: 4, title: "Be Humble, Crave Improvement", standard: "We are lifelong learners who seek feedback without ego.", behaviors: ["To be humble you first must be good","No matter how good, there's another level","Engage in coaching and development","Ask for and apply feedback","Celebrate team before personal"], tactics: ["Be maniacal learning about our staffing industry","Be maniacal about our customers' industries"] },
{ num: 5, title: "People Driven; Service Focused", standard: "People are at the heart of our service.", behaviors: ["Proactive, consistent communication","Treat every candidate with respect","Same professionalism to colleagues as clients"], tactics: ["Listen and DIG before offering solutions","Listen through THEIR eyes","We cannot get clarity without asking questions","World class service at every level","White glove Ritz Carlton experience"] },
{ num: 6, title: "Dominate the Day, Don't Let the Day Dominate You", standard: "We bring energy, focus, and discipline daily.", behaviors: ["Start with clear priorities, execute with urgency","Set and achieve measurable goals","Inspire through consistent energy"], tactics: ["Show up prepared!","Commit to improving yourself and others","Create certainty through a repeatable blueprint","Positive attitude is contagious"] },
{ num: 7, title: "Find a Way to Deliver Value", standard: "We innovate, adapt, and go beyond expectations.", behaviors: ["Fully understand needs before proposing solutions","Anticipate challenges proactively","Share market insights as a trusted advisor"], tactics: ["Value is relative — understand what's valuable","Deliver on what you say","Don't just contact when you need something","Help even if it doesn't directly help us"] },
{ num: 8, title: "Mindset is the Foundation of Excellence", standard: "A positive, growth-oriented mindset drives excellence.", behaviors: ["Begin with solution-focused energy","Maintain composure under stress","Approach with optimism","How you look at things affects results"], tactics: ["Be solution oriented","Seek to understand before being understood","Be the listener you'd want others to be"] },
];

const SPARK_NUMBERS = {
daily: { recruiter: ["25 names on call sheet aligned with reqs","Contact candidates set to interview today","Contact candidates set to start","Contact starts at end of first day"], sales: ["25 names on call sheet aligned with reqs"] },
weekly: { recruiter: ["150 contacts per week","25 pre-screens","10 submittals","REFERENCES ON EVERY CANDIDATE","Push candidates to sales rep for skill marketing","Contact active contract employees not working 40 hours","Track real-time labor market analytics"], sales: ["150 contacts per week","10 meetings per week (2 new)","15 market skill submittals","Re-qualify reqs with no submittal in 7 days","Schedule manager feedback within 2 hours of interview","Track hiring trends by client industries","Track competitive analytics"] },
monthly: { recruiter: ["$17,000 cumulative raw total charge (baseline)","Target Low: $29,000 ($348K annually)","Target High: $40,000 ($480K annually)","$1,000 monthly net growth in contract charge"], sales: ["$17,000 cumulative raw total charge (baseline)","Target Low: $29,000","Target High: $40,000","$1,000 monthly net growth","Track monthly performance + trend","Track quarterly goal attainment","Ensure team focus is inline with Blueprint"] },
annual: { recruiter: ["15% Y-O-Y growth","Minimum: $180K raw total","Target Low: $348K raw total","Target High: $480K raw total","Charge should be 3x your Gross Income","Stay cutting edge on recruiting tactics","Identify new and emerging skills"], sales: ["$180K minimum after Year 1","Once contest crossed, grow past next minimum","15% Y-O-Y growth","Target Low: $348K","Target High: $480K","Charge should be 3x Gross Income","Stay cutting edge on tactics","Identify new and emerging skills"] },
};

const TOOL_LINKS = [
{ cat: "Core Systems", items: [
{ name: "Salesforce", desc: "ATS, CRM, job orders, candidate management, pipeline", url: "https://spark-companies.my.salesforce.com/", icon: "search", color: "#00A1E0" },
{ name: "SparkV7 Commissions", desc: "Commission tracker, statements, DH pipeline", url: "https://nice-beach-07b54f71e4.azurestaticapps.net", icon: "trending", color: "#FFD200" },
{ name: "Microsoft 365 Portal", desc: "Email, Teams, SharePoint, OneDrive, Word, Excel", url: "https://www.office.com", icon: "grid", color: "#0078D4" },
{ name: "Microsoft Teams", desc: "Chat, meetings, collaboration", url: "https://teams.microsoft.com", icon: "mail", color: "#6264A7" },
{ name: "SharePoint", desc: "Shared documents, company resources", url: "https://sparktalent.sharepoint.com/sites/SparkCompanies", icon: "file", color: "#036C70" },
]},
{ cat: "Recruiter Tools", items: [
{ name: "Indeed", desc: "Job postings, candidate sourcing, sponsored jobs", url: "https://employers.indeed.com", icon: "search", color: "#2164f3" },
{ name: "ZipRecruiter", desc: "Job distribution, candidate matching, AI sourcing", url: "https://www.ziprecruiter.com/employer", icon: "target", color: "#5ba23b" },
{ name: "LinkedIn Recruiter", desc: "Talent search, InMail, pipeline management", url: "https://www.linkedin.com/talent/hire", icon: "users", color: "#0A66C2" },
{ name: "Compliance Training", desc: "50-state interactive maps — Ban the Box, FCRA, salary transparency", url: "https://sparkcompanies.github.io/compliance-training", icon: "shield", color: "#FF6B35" },
]},
{ cat: "Sales & Business Development", items: [
{ name: "LinkedIn Sales Navigator", desc: "Lead search, account mapping, InMail outreach", url: "https://www.linkedin.com/sales", icon: "trending", color: "#0A66C2" },
{ name: "ZoomInfo", desc: "Contact data, company intel, intent signals", url: "https://app.zoominfo.com", icon: "globe", color: "#6D2ED1" },
{ name: "Apollo.io", desc: "Prospecting, sequences, engagement tracking", url: "https://app.apollo.io", icon: "send", color: "#5B5FC7" },
]},
{ cat: "Payroll & Benefits", items: [
{ name: "Greenshades Online", desc: "Payroll processing, tax filing, W-2 generation (admin)", url: "https://www.greenshadesonline.com", icon: "dollar", color: "#2ecc71" },
{ name: "GreenEmployee", desc: "Paystubs, direct deposit, PTO, tax docs — Code: sparkportfolio", url: "https://www.greenemployee.com", icon: "file", color: "#27ae60" },
{ name: "Paycor (2025 W-2 Only)", desc: "Your 2025 W-2 is here ONLY. 2026+ in GreenEmployee", url: "https://hcm.paycor.com/authentication/signin", icon: "file", color: "#FF6B35" },
{ name: "Rapid! PayCard", desc: "FREE prepaid Visa debit — no bank account needed", url: "mailto:Timecards@sparktalentinc.com?subject=Rapid%20PayCard%20Inquiry", icon: "dollar", color: "#e74c3c" },
{ name: "The American Worker", desc: "Benefits enrollment — medical, dental, vision, disability", url: "https://www.theamericanworker.com", icon: "heart", color: "#FF3366" },
]},
{ cat: "Employee Resources", items: [
{ name: "Team Member Portal", desc: "Employee resources, W-2 info, safety, referrals", url: "https://sparkcompanies.github.io/spark-hub", icon: "home", color: "#FFD200" },
{ name: "Submit a Referral ($100)", desc: "Refer someone → 520 hours → you earn $100, they earn $50", url: "https://wkf.ms/3IydKBx", icon: "send", color: "#2ecc71" },
{ name: "Teladoc", desc: "24/7 virtual doctor — free consultations, no appointment needed", url: "https://www.teladoc.com", icon: "heart", color: "#00BFA5" },
{ name: "Timecards Email", desc: "Timesheet questions, PayCard requests, pay inquiries", url: "mailto:Timecards@sparktalentinc.com", icon: "mail", color: "#3498db" },
{ name: "Sterling TMX Email", desc: "General operations and support requests", url: "mailto:sterlingtmx@sparktalentinc.com", icon: "mail", color: "#e67e22" },
]},
];

/* ────── COMPONENTS ────── */

const tabs = [
{ id: "home", label: "Home", icon: "home" },
{ id: "training", label: "Training", icon: "book" },
{ id: "standard", label: "Spark Standard", icon: "star" },
{ id: "careers", label: "Career Paths", icon: "rocket" },
{ id: "team", label: "People", icon: "users" },
{ id: "tools", label: "Software & Tools", icon: "link" },
{ id: "docs", label: "Documents", icon: "file" },
{ id: "sops", label: "SOPs", icon: "clipboard" },
{ id: "performance", label: "Performance", icon: "target" },
{ id: "admin", label: "Admin", icon: "shield", adminOnly: true },
];

function Navbar({ tab, setTab, w, adminMode }) {
const { dark, toggle } = useTheme();
const [mobileOpen, setMobileOpen] = useState(false);
const mob = w < 900;
const visibleTabs = tabs.filter(t => !t.adminOnly || adminMode);
return (
<>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'); body { font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; margin: 0; } *, *::before, *::after { box-sizing: border-box; } button, input, textarea, a { outline: none; -webkit-tap-highlight-color: transparent; font-family: inherit; } button:focus-visible, a:focus-visible { outline: 2px solid rgba(245,158,11,0.3); outline-offset: 2px; border-radius: 6px; } ::selection { background: rgba(255,210,0,0.15); } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 99px; } @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } } @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } } @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }`}</style>
{!mob && (
<div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, background: "linear-gradient(180deg, #fff 0%, #fefcf8 100%)", borderRight: "1px solid #eee", zIndex: 40, display: "flex", flexDirection: "column" }}>
<div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #eee" }}>
<svg width={120} height={28} viewBox="0 0 180 32" fill="none"><path d="M14.5 2L8 16h7l-3.5 14L22 14h-7.5L18.5 2h-4z" fill="#FFC629" stroke="#E5AD00" strokeWidth="0.5"/><text x="30" y="20" fontFamily="Plus Jakarta Sans,sans-serif" fontSize="15" fontWeight="800" fill="#1a1a2e" letterSpacing="2.5">SPARK</text><text x="30" y="29" fontFamily="Plus Jakarta Sans,sans-serif" fontSize="6.5" fontWeight="500" fill="#999" letterSpacing="3">COMPANIES</text></svg>
</div>
<div style={{ padding: "12px 12px", flex: 1, overflowY: "auto" }}>
{visibleTabs.map(t => { const active = tab === t.id; return (
<div key={t.id}><button onClick={() => setTab(t.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: active ? "linear-gradient(90deg, #FFF8E1, #fff)" : "transparent", color: active ? "#D97706" : "#64748b", fontSize: 14, fontWeight: active ? 600 : 500, textAlign: "left", transition: "all 0.15s", marginBottom: 2 }} onMouseOver={e => { if (!active) e.currentTarget.style.background = "#fafafa"; }} onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}><I name={t.icon} size={18} color={active ? "#D97706" : "#94a3b8"} sw={active ? 2 : 1.5} />{t.label}</button></div>
); })}
</div>
<div style={{ padding: "12px 16px", borderTop: "1px solid #eee" }}><button onClick={toggle} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#94a3b8", fontSize: 13, fontWeight: 500 }}><I name={dark ? "sun" : "moon"} size={16} color="#94a3b8" />{dark ? "Light mode" : "Dark mode"}</button></div>
</div>
)}
<div style={{ position: "fixed", top: 0, left: mob ? 0 : 240, right: 0, height: 56, background: "#fff", borderBottom: "1px solid #eee", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", zIndex: 45, display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
{mob && <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><I name={mobileOpen ? "x" : "menu"} size={22} color="#64748b" /></button>}
{mob && <svg width={90} height={22} viewBox="0 0 180 32" fill="none"><path d="M14.5 2L8 16h7l-3.5 14L22 14h-7.5L18.5 2h-4z" fill="#FFC629" stroke="#E5AD00" strokeWidth="0.5"/><text x="30" y="20" fontFamily="Plus Jakarta Sans,sans-serif" fontSize="15" fontWeight="800" fill="#1a1a2e" letterSpacing="2.5">SPARK</text></svg>}
<div style={{ flex: 1, maxWidth: 480 }}><div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8f8f8", borderRadius: 10, padding: "8px 14px", border: "1px solid #eee" }}><I name="search" size={16} color="#94a3b8" /><input placeholder="Search or ask a question" style={{ background: "none", border: "none", color: "#1a1a2e", fontSize: 14, flex: 1, outline: "none", fontFamily: "inherit" }} /></div></div>
<div style={{ flex: 1 }} />
<button style={{ background: "none", border: "none", cursor: "pointer", padding: 6, position: "relative" }}><I name="info" size={18} color="#94a3b8" /></button>
<button style={{ background: "none", border: "none", cursor: "pointer", padding: 6, position: "relative" }}><I name="mail" size={18} color="#94a3b8" /><div style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} /></button>
<div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>{!mob && <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 }}>Allie Spegel</div><div style={{ fontSize: 9, fontWeight: 600, color: "#D97706", lineHeight: 1.2 }}>VP of Operations</div></div>}<div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", border: "2px solid #fff", boxShadow: "0 0 0 2px #fbbf24" }}>AS</div></div>
</div>
{mob && mobileOpen && (
<div style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 0, background: "#fff", zIndex: 44, padding: 12, overflowY: "auto" }}>
{visibleTabs.map((t, i) => { const active = tab === t.id; return (
<button key={t.id} onClick={() => { setTab(t.id); setMobileOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: active ? "linear-gradient(90deg, #FFF8E1, #fff)" : "transparent", color: active ? "#D97706" : "#64748b", fontSize: 15, fontWeight: active ? 600 : 500, textAlign: "left", animation: `slideIn 0.2s ease ${i * 0.03}s both` }}><I name={t.icon} size={20} color={active ? "#D97706" : "#94a3b8"} />{t.label}</button>
); })}
</div>
)}
</>
);
}

function Card({ children, style = {}, glow = false }) {
return (<div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)", ...style }}>{children}</div>);
}

function SectionHeader({ icon, title, subtitle }) {
return (<Reveal><div style={{ marginBottom: 20 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 4, height: 24, borderRadius: 2, background: "linear-gradient(180deg, #fbbf24, #f59e0b)" }} /><h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.3, margin: 0 }}>{title}</h2></div>{subtitle && <p style={{ fontSize: 14, color: "#047857", lineHeight: 1.5, margin: "6px 0 0" }}>{subtitle}</p>}</div></Reveal>);
}

function HomePage({ setTab, w }) {
const { dark } = useTheme();
const mob = w < 768;
const [hovCard, setHovCard] = useState(null);
const [quoteIdx, setQuoteIdx] = useState(0);
const [searchFocused, setSearchFocused] = useState(false);
const [searchVal, setSearchVal] = useState("");
const [hovDock, setHovDock] = useState(null);
const [announcements, setAnnouncements] = useState([]);
const [recognition, setRecognition] = useState([]);
const [events, setEvents] = useState([]);
const [homeAdmin, setHomeAdmin] = useState(false);
const [homePinInput, setHomePinInput] = useState("");
const [showHomePin, setShowHomePin] = useState(false);
const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "", pinned: false });
const [newShoutout, setNewShoutout] = useState({ from: "", to: "", message: "" });
const [newEvent, setNewEvent] = useState({ title: "", date: "", desc: "" });
const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
const [showShoutoutForm, setShowShoutoutForm] = useState(false);
const [showEventForm, setShowEventForm] = useState(false);
useEffect(() => { const t = setInterval(() => setQuoteIdx(i => (i + 1) % 7), 7000); return () => clearInterval(t); }, []);
useEffect(() => { const load = async () => { try {
const a = await window.storage.get("spark-hq-announcements", true); if (a?.value) setAnnouncements(JSON.parse(a.value));
const r = await window.storage.get("spark-hq-recognition", true); if (r?.value) setRecognition(JSON.parse(r.value));
const e = await window.storage.get("spark-hq-events", true); if (e?.value) setEvents(JSON.parse(e.value));
} catch(e){} }; if (window.storage) load(); }, []);
const saveAnn = async (a) => { setAnnouncements(a); try { if(window.storage) await window.storage.set("spark-hq-announcements", JSON.stringify(a), true); } catch(e){} };
const saveRec = async (r) => { setRecognition(r); try { if(window.storage) await window.storage.set("spark-hq-recognition", JSON.stringify(r), true); } catch(e){} };
const saveEvt = async (e) => { setEvents(e); try { if(window.storage) await window.storage.set("spark-hq-events", JSON.stringify(e), true); } catch(e){} };
const postAnnouncement = () => { if (!newAnnouncement.title) return; saveAnn([{ ...newAnnouncement, id: Date.now(), date: new Date().toLocaleDateString(), author: "Admin" }, ...announcements]); setNewAnnouncement({ title: "", body: "", pinned: false }); setShowAnnouncementForm(false); };
const postShoutout = () => { if (!newShoutout.to || !newShoutout.message) return; saveRec([{ ...newShoutout, id: Date.now(), date: new Date().toLocaleDateString() }, ...recognition]); setNewShoutout({ from: "", to: "", message: "" }); setShowShoutoutForm(false); };
const postEvent = () => { if (!newEvent.title) return; saveEvt([...events, { ...newEvent, id: Date.now() }].sort((a,b) => new Date(a.date) - new Date(b.date))); setNewEvent({ title: "", date: "", desc: "" }); setShowEventForm(false); };
const hour = new Date().getHours();
const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const now = new Date();
const dateStr = dayNames[now.getDay()] + ", " + monthNames[now.getMonth()] + " " + now.getDate();
const quotes = [
{ text: "Leading by example isn't just a way — it's the only way.", val: 1, color: "#FFD200" },
{ text: "Do the right thing — even when no one is watching.", val: 2, color: "#4ECDC4" },
{ text: "Conquering adversity is the recipe to success.", val: 3, color: "#FF6B35" },
{ text: "Be humble, crave improvement.", val: 4, color: "#7C5CFC" },
{ text: "People driven; service focused — always.", val: 5, color: "#FF3366" },
{ text: "Dominate the day. Don't let the day dominate you.", val: 6, color: "#E84393" },
{ text: "Find a way to deliver value — every time.", val: 7, color: "#2ecc71" },
];
const q = quotes[quoteIdx];
const dock = [
{ name: "Salesforce", icon: "search", color: "#00A1E0", url: "https://spark-companies.my.salesforce.com/", sub: "ATS" },
{ name: "GreenEmployee", icon: "dollar", color: "#27ae60", url: "https://www.greenemployee.com", sub: "Pay" },
{ name: "Teams", icon: "mail", color: "#6264A7", url: "https://teams.microsoft.com", sub: "Chat" },
{ name: "SharePoint", icon: "file", color: "#036C70", url: "https://sparktalent.sharepoint.com/sites/SparkCompanies", sub: "Docs" },
{ name: "M365", icon: "grid", color: "#0078D4", url: "https://www.office.com", sub: "Office" },
{ name: "Greenshades", icon: "shield", color: "#2ecc71", url: "https://www.greenshadesonline.com", sub: "Payroll" },
{ name: "Commissions", icon: "trending", color: "#FFD200", url: "https://nice-beach-07b54f71e4.azurestaticapps.net", sub: "SparkV7" },
];
const searchables = [
{ label: "Spark Standard", desc: "Core values & daily behaviors", tab: "standard", icon: "star", color: "#FFD200" },
{ label: "Career Paths", desc: "2026 comp plans & promotion tracks", tab: "careers", icon: "rocket", color: "#4ECDC4" },
{ label: "Training Hub", desc: "Onboarding, compliance & development", tab: "training", icon: "book", color: "#FF6B35" },
{ label: "Tools & Systems", desc: "All system logins & links", tab: "tools", icon: "link", color: "#7C5CFC" },
{ label: "Team Directory", desc: "Org chart, contacts & divisions", tab: "team", icon: "users", color: "#FF3366" },
{ label: "Salesforce", desc: "ATS, CRM, job orders, pipeline", icon: "search", color: "#00A1E0", url: "https://spark-companies.my.salesforce.com/" },
{ label: "GreenEmployee", desc: "Paystubs, direct deposit, W-2, PTO", icon: "dollar", color: "#27ae60", url: "https://www.greenemployee.com" },
{ label: "Compliance Training", desc: "50-state interactive maps & guides", icon: "shield", color: "#FF6B35", url: "https://sparkcompanies.github.io/compliance-training" },
];
const searchHits = searchVal.length > 0 ? searchables.filter(s => s.label.toLowerCase().includes(searchVal.toLowerCase()) || s.desc.toLowerCase().includes(searchVal.toLowerCase())) : [];
const actions = [
{ label: "Check My Pay", desc: "Paystubs & tax docs", icon: "dollar", color: "#2ecc71", url: "https://www.greenemployee.com" },
{ label: "My Commissions", desc: "SparkV7 tracker", icon: "trending", color: "#FFD200", url: "https://nice-beach-07b54f71e4.azurestaticapps.net" },
{ label: "Submit a Referral", desc: "Earn $100", icon: "send", color: "#FFD200", url: "https://wkf.ms/3IydKBx" },
{ label: "Find Someone", desc: "Team directory", icon: "users", color: "#7C5CFC", tab: "team" },
{ label: "Compliance Training", desc: "50-state laws", icon: "shield", color: "#FF6B35", url: "https://sparkcompanies.github.io/compliance-training" },
{ label: "Timecard Help", desc: "Email timecards team", icon: "clock", color: "#3498db", url: "mailto:Timecards@sparktalentinc.com" },
{ label: "My Career Path", desc: "2026 comp tracks", icon: "trending", color: "#E84393", tab: "careers" },
{ label: "Employee Portal", desc: "W-2 & resources", icon: "home", color: "#4ECDC4", url: "https://sparkcompanies.github.io/spark-hub" },
];
const hub = [
{ tab: "standard", icon: "star", title: "The Spark Standard", desc: "8 core values and activity expectations.", color: "#FFD200", tag: "CULTURE" },
{ tab: "careers", icon: "rocket", title: "Career Paths", desc: "Production + back office tracks with salary bands.", color: "#4ECDC4", tag: "2026 COMP" },
{ tab: "training", icon: "book", title: "Training", desc: "LMS courses, quizzes, progress tracking.", color: "#FF6B35", tag: "LEARNING" },
{ tab: "tools", icon: "link", title: "Tools & Systems", desc: "Every login and quick action.", color: "#7C5CFC", tag: "SYSTEMS" },
{ tab: "team", icon: "users", title: "Team Directory", desc: "Org chart with search and filters.", color: "#FF3366", tag: "ORG CHART" },
{ tab: "sops", icon: "clipboard", title: "SOPs & Playbooks", desc: "Operating procedures by department.", color: "#E84393", tag: "PROCEDURES" },
{ tab: "performance", icon: "target", title: "Performance", desc: "Blueprint templates, KPI frameworks.", color: "#2ecc71", tag: "KPIS" },
];
const contacts = [
{ name: "Aaron Opalewski", role: "CEO", email: "aopalewski@sparkcompanies.com", phone: "(586) 864-3746", color: "#FFD200" },
{ name: "Dave Veres", role: "EVP / CSO", email: "dveres@sparkcompanies.com", phone: "(773) 398-5074", color: "#FF6B35" },
{ name: "Allie Spegel", role: "VP Operations", email: "aspegel@sparkcompanies.com", phone: "(248) 632-3560", color: "#4ECDC4" },
{ name: "Mary Patrico", role: "Dir. of Operations", email: "mpatrico@sparkcompanies.com", phone: "(586) 202-7211", color: "#E84393" },
{ name: "Priyanka Malani", role: "Payroll Manager", email: "pmalani@sparkcompanies.com", color: "#2ecc71" },
{ name: "Tamika Coleman", role: "HR Lead", email: "tcoleman@sparkcompanies.com", color: "#FF3366" },
];
const ActionBtn = ({ a }) => {
const inner = (<div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: 10, background: a.color + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I name={a.icon} size={15} color={a.color} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{a.label}</div><div style={{ fontSize: 9, color: "#b0b8c4", marginTop: 1 }}>{a.desc}</div></div><I name="chevRight" size={10} color="#e2e8f0" /></div>);
const s = { background: GLASS, border: "1px solid " + BORDER, borderRadius: 12, padding: mob ? "11px" : "12px 14px", cursor: "pointer", transition: "all 0.25s", width: "100%", textAlign: "left", color: "#1a1a2e", textDecoration: "none", display: "block" };
return a.url ? <a href={a.url} target={a.url.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer" style={s}>{inner}</a> : <button onClick={() => setTab(a.tab)} style={s}>{inner}</button>;
};
return (
<div>
<div style={{ position: "relative", overflow: "hidden", padding: mob ? "32px 20px 28px" : "40px 40px 36px", background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 25%, #fbbf24 50%, #f59e0b 75%, #d97706 100%)", borderRadius: "0 0 12px 12px" }}>
<div style={{ position: "absolute", inset: 0, opacity: 1, backgroundImage: "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
<div style={{ position: "relative", margin: "0 auto" }}>
<Reveal><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "pulse 2s ease infinite" }} /><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, textTransform: "uppercase" }}>Spark Companies{"™"} Internal</span><div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.3)" }} /><span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{dateStr}</span></div></Reveal>
<Reveal delay={0.05}><h1 style={{ fontSize: mob ? 26 : 34, fontWeight: 700, lineHeight: 1.2, marginBottom: 10 }}><span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 400 }}>{greeting}, Allie.</span><br /><span style={{ color: "#fff" }}>Welcome to </span><span style={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>Spark HQ</span></h1></Reveal>
<Reveal delay={0.1}><p style={{ fontSize: mob ? 14 : 16, color: "rgba(255,255,255,0.85)", maxWidth: 540, lineHeight: 1.6, marginBottom: 20 }}>Everything our team needs — one place.</p></Reveal>
<Reveal delay={0.15}><div style={{ position: "relative", maxWidth: 520, zIndex: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: searchHits.length > 0 ? "14px 14px 0 0" : 14, padding: "14px 18px" }}><I name="search" size={17} color="rgba(255,255,255,0.6)" /><input value={searchVal} onChange={e => setSearchVal(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)} placeholder="Search sections, tools, resources..." style={{ background: "none", border: "none", color: "#fff", fontSize: 14, flex: 1, outline: "none", fontFamily: "inherit" }} />{searchVal && <button onClick={() => setSearchVal("")} style={{ background: "#f0f0f0", border: "none", color: "#94a3b8", cursor: "pointer", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>Clear</button>}</div>
{searchHits.length > 0 && (<div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #eee", borderTop: "none", borderRadius: "0 0 14px 14px", maxHeight: 300, overflow: "auto", boxShadow: "0 20px 48px rgba(0,0,0,0.3)" }}>{searchHits.map((h, i) => (<button key={i} onMouseDown={e => e.preventDefault()} onClick={() => { if (h.tab) setTab(h.tab); else if (h.url) window.open(h.url, "_blank"); setSearchVal(""); }} style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #f8f8f8", color: "#1a1a2e", padding: "11px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }} onMouseOver={e => e.currentTarget.style.background = "#f5f5f5"} onMouseOut={e => e.currentTarget.style.background = "transparent"}><div style={{ width: 30, height: 30, borderRadius: 9, background: h.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}><I name={h.icon} size={14} color={h.color} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{h.label}</div><div style={{ fontSize: 10, color: "#b0b8c4" }}>{h.desc}</div></div><I name={h.tab ? "chevRight" : "ext"} size={10} color="#e2e8f0" /></button>))}</div>)}
</div></Reveal>
</div></div>
<div style={{ padding: mob ? "0 14px 48px" : "0 40px 56px", margin: "0 auto" }}>
{/* Dock */}
<div style={{ transform: "translateY(-26px)", marginBottom: -10 }}><div style={{ display: "flex", justifyContent: "center", gap: mob ? 6 : 10, flexWrap: "wrap", background: "#fff", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: mob ? "14px 12px" : "18px 28px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>{dock.map((d, i) => (<a key={i} href={d.url} target="_blank" rel="noopener noreferrer" onMouseOver={() => setHovDock(i)} onMouseOut={() => setHovDock(null)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: mob ? "8px 10px" : "10px 16px", borderRadius: 10, textDecoration: "none", color: "#1a1a2e", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)", transform: hovDock === i ? "translateY(-6px) scale(1.05)" : "none" }}><div style={{ width: mob ? 40 : 46, height: mob ? 40 : 46, borderRadius: 10, background: d.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}><I name={d.icon} size={mob ? 18 : 20} color={d.color} /></div><div style={{ textAlign: "center" }}><div style={{ fontSize: mob ? 10 : 11, fontWeight: 700 }}>{d.name}</div>{!mob && <div style={{ fontSize: 8, color: "#cbd5e1", marginTop: 1 }}>{d.sub}</div>}</div></a>))}</div></div>
{/* Quote */}
<Reveal><div onClick={() => setTab("standard")} style={{ background: q.color + "08", border: "1px solid " + q.color + "15", borderRadius: 10, padding: mob ? "12px 14px" : "14px 20px", marginBottom: 32, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}><div style={{ width: 38, height: 38, borderRadius: 11, background: q.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 15, fontWeight: 900, color: q.color }}>{q.val}</span></div><div style={{ flex: 1 }}><div style={{ fontSize: 9, fontWeight: 800, color: q.color, opacity: 0.7, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>Spark Standard</div><div style={{ fontSize: mob ? 12 : 13, color: "#64748b", fontStyle: "italic", lineHeight: 1.4 }}>"{q.text}"</div></div><I name="chevRight" size={14} color={q.color + "50"} /></div></Reveal>
{/* Quick Actions */}
<div style={{ marginBottom: 36 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><I name="zap" size={14} color={Y} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: Y, textTransform: "uppercase" }}>Quick Actions</span><div style={{ flex: 1, height: 1, background: BORDER }} /></div><div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 10 }}>{actions.map((a, i) => <Reveal key={i} delay={Math.min(i * 0.03, 0.2)}><ActionBtn a={a} /></Reveal>)}</div></div>
{/* Announcements */}
<div style={{ marginBottom: 36 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><I name="mail" size={14} color={Y} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: Y, textTransform: "uppercase" }}>Announcements</span><div style={{ flex: 1, height: 1, background: BORDER }} />{homeAdmin && <button onClick={() => setShowAnnouncementForm(!showAnnouncementForm)} style={{ background: Y + "10", border: "1px solid " + Y + "25", color: Y, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>+ Post</button>}</div>
{showAnnouncementForm && homeAdmin && (<div style={{ background: GLASS, border: "1px solid " + BORDER, borderRadius: 12, padding: 16, marginBottom: 10 }}><input value={newAnnouncement.title} onChange={e => setNewAnnouncement(p => ({...p, title: e.target.value}))} placeholder="Title" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#f8f8f8", color: "#1a1a2e", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: "inherit", marginBottom: 8 }} /><textarea value={newAnnouncement.body} onChange={e => setNewAnnouncement(p => ({...p, body: e.target.value}))} placeholder="Details..." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#f8f8f8", color: "#1a1a2e", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", marginBottom: 8 }} /><div style={{ display: "flex", gap: 8 }}><label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94a3b8" }}><input type="checkbox" checked={newAnnouncement.pinned} onChange={e => setNewAnnouncement(p => ({...p, pinned: e.target.checked}))} /> Pin</label><div style={{ flex: 1 }} /><button onClick={() => setShowAnnouncementForm(false)} style={{ background: "#f5f5f5", border: "1px solid #eee", color: "#94a3b8", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Cancel</button><button onClick={postAnnouncement} style={{ background: Y + "15", border: "1px solid " + Y + "25", color: Y, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Post</button></div></div>)}
{announcements.length === 0 && <div style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic", padding: "12px 0" }}>No announcements yet</div>}
{[...announcements].sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0)).slice(0, 4).map((ann, i) => (<Reveal key={ann.id} delay={i * 0.04}><div style={{ background: ann.pinned ? "rgba(255,210,0,0.04)" : GLASS, border: "1px solid " + (ann.pinned ? "rgba(255,210,0,0.15)" : BORDER), borderRadius: 12, padding: "14px 16px", marginBottom: 6, position: "relative" }}>{ann.pinned && <div style={{ position: "absolute", top: 8, right: 10, fontSize: 8, fontWeight: 800, color: Y, background: Y + "12", padding: "2px 6px", borderRadius: 4 }}>PINNED</div>}<div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{ann.title}</div>{ann.body && <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 6 }}>{ann.body}</div>}<div style={{ display: "flex", gap: 8, fontSize: 10, color: "#cbd5e1" }}><span>{ann.date}</span><span>·</span><span>{ann.author}</span>{homeAdmin && <button onClick={() => saveAnn(announcements.filter(a => a.id !== ann.id))} style={{ marginLeft: "auto", background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 9 }}>Remove</button>}</div></div></Reveal>))}
</div>
{/* Hub Cards */}
<div style={{ marginBottom: 36 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><I name="layers" size={14} color={Y} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: Y, textTransform: "uppercase" }}>The Hub</span><div style={{ flex: 1, height: 1, background: BORDER }} /></div><div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 14 }}>{hub.map((s, i) => (<Reveal key={i} delay={Math.min(i * 0.04, 0.25)}><button onClick={() => setTab(s.tab)} onMouseOver={() => setHovCard(s.tab)} onMouseOut={() => setHovCard(null)} style={{ width: "100%", textAlign: "left", cursor: "pointer", color: "#1a1a2e", background: hovCard === s.tab ? s.color + "0a" : GLASS, border: "1px solid " + (hovCard === s.tab ? s.color + "28" : BORDER), borderRadius: 12, padding: mob ? 18 : 24, transition: "all 0.2s", transform: hovCard === s.tab ? "translateY(-3px)" : "none", position: "relative", overflow: "hidden" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}><I name={s.icon} size={20} color={s.color} /></div><span style={{ fontSize: 8, fontWeight: 800, color: s.color, opacity: 0.5, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.tag}</span></div><div style={{ fontSize: mob ? 15 : 17, fontWeight: 700, marginBottom: 5 }}>{s.title}</div><div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 10 }}>{s.desc}</div><div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: s.color }}>Open <I name="chevRight" size={13} color={s.color} /></div></button></Reveal>))}</div></div>
{/* Recognition */}
<div style={{ marginBottom: 36 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><I name="award" size={14} color={Y} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: Y, textTransform: "uppercase" }}>Shout-Outs</span><div style={{ flex: 1, height: 1, background: BORDER }} /><button onClick={() => setShowShoutoutForm(!showShoutoutForm)} style={{ background: "#E8439310", border: "1px solid #E8439325", color: "#E84393", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>+ Give Props</button></div>
{showShoutoutForm && (<div style={{ background: GLASS, border: "1px solid " + BORDER, borderRadius: 12, padding: 16, marginBottom: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}><input value={newShoutout.from} onChange={e => setNewShoutout(p => ({...p, from: e.target.value}))} placeholder="Your name" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#f8f8f8", color: "#1a1a2e", fontSize: 12, outline: "none", fontFamily: "inherit" }} /><input value={newShoutout.to} onChange={e => setNewShoutout(p => ({...p, to: e.target.value}))} placeholder="Who?" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#f8f8f8", color: "#1a1a2e", fontSize: 12, outline: "none", fontFamily: "inherit" }} /></div><textarea value={newShoutout.message} onChange={e => setNewShoutout(p => ({...p, message: e.target.value}))} placeholder="What did they do?" rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #eee", background: "#f8f8f8", color: "#1a1a2e", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", marginBottom: 8 }} /><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => setShowShoutoutForm(false)} style={{ background: "#f5f5f5", border: "1px solid #eee", color: "#94a3b8", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Cancel</button><button onClick={postShoutout} style={{ background: "#E8439315", border: "1px solid #E8439325", color: "#E84393", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Post</button></div></div>)}
{recognition.length === 0 && <div style={{ fontSize: 12, color: "#cbd5e1", fontStyle: "italic", padding: "12px 0" }}>Be the first to recognize a teammate!</div>}
<div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 8 }}>{recognition.slice(0, 6).map((r, i) => (<Reveal key={r.id} delay={i * 0.04}><div style={{ background: GLASS, border: "1px solid " + BORDER, borderRadius: 12, padding: "14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><div style={{ width: 30, height: 30, borderRadius: 10, background: "#E8439322", display: "flex", alignItems: "center", justifyContent: "center" }}><I name="award" size={14} color="#E84393" /></div><div><div style={{ fontSize: 12, fontWeight: 700, color: "#E84393" }}>{r.to}</div><div style={{ fontSize: 9, color: "#cbd5e1" }}>by {r.from || "Anonymous"} · {r.date}</div></div></div><div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, fontStyle: "italic" }}>"{r.message}"</div></div></Reveal>))}</div></div>
{/* Contacts */}
<div style={{ marginBottom: 36 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><I name="phone" size={14} color={Y} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: Y, textTransform: "uppercase" }}>Key Contacts</span><div style={{ flex: 1, height: 1, background: BORDER }} /></div><div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>{contacts.map((c, i) => (<Reveal key={i} delay={i * 0.03}><div style={{ background: GLASS, border: "1px solid " + BORDER, borderRadius: 10, padding: mob ? 14 : 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}><div style={{ width: 34, height: 34, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.color }}>{c.name.split(" ").map(n => n[0]).join("")}</div><div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{c.name}</div><div style={{ fontSize: 9, color: c.color, fontWeight: 700 }}>{c.role}</div></div></div><div style={{ display: "flex", gap: 5 }}><a href={"mailto:" + c.email} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, background: c.color + "0c", border: "1px solid " + c.color + "12", borderRadius: 7, padding: "5px 0", textDecoration: "none", fontSize: 10, fontWeight: 600, color: c.color }}><I name="mail" size={10} color={c.color} /> Email</a>{c.phone && <a href={"tel:" + c.phone} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, background: "#f8f8f8", border: "1px solid #f0f0f0", borderRadius: 7, padding: "5px 0", textDecoration: "none", fontSize: 10, fontWeight: 600, color: "#94a3b8" }}><I name="phone" size={10} /> Call</a>}</div></div></Reveal>))}</div></div>
{/* Portfolio */}
<div><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><I name="globe" size={14} color={Y} /><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: Y, textTransform: "uppercase" }}>Our Portfolio</span><div style={{ flex: 1, height: 1, background: BORDER }} /></div><div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>{DIVISIONS.map((d, i) => (<Reveal key={i} delay={i * 0.04}><a href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: GLASS, border: "1px solid " + BORDER, borderRadius: 10, padding: 16, textDecoration: "none", color: "#1a1a2e", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: d.color, opacity: 0.7 }} /><div style={{ display: "flex", gap: 12 }}><div style={{ width: 36, height: 36, borderRadius: 10, background: d.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: d.color }}>{d.abbr}</div><div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{d.name}</div><div style={{ fontSize: 10, color: "#b0b8c4", lineHeight: 1.5, marginBottom: 6 }}>{d.desc}</div><div style={{ display: "flex", gap: 8, fontSize: 9 }}><span style={{ color: "#cbd5e1" }}>Est. {d.founded}</span><span style={{ color: d.color, fontWeight: 700 }}>Visit <I name="ext" size={8} color={d.color} /></span></div></div></div></a></Reveal>))}</div></div>
</div></div>);
}

function CareerPage({ w }) {
const mob = w < 768;
const [expandedTrack, setExpandedTrack] = useState(0);
const [showBonus, setShowBonus] = useState(false);
const [filter, setFilter] = useState("ALL");
const fmt = n => "$" + n.toLocaleString();
const filteredTracks = filter === "ALL" ? CAREER_TRACKS : CAREER_TRACKS.filter(t => t.tag === filter);
return (
<div style={{ padding: mob ? "30px 16px 40px" : "40px 40px 50px", margin: "0 auto" }}>
<SectionHeader icon="rocket" title="Career Paths" subtitle="2026 production and back office career progression" />
<Reveal><Card glow style={{ marginBottom: 20, background: "rgba(255,210,0,0.04)", border: "1px solid rgba(255,210,0,0.15)" }}>
<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><I name="zap" size={18} color={Y} /><span style={{ fontSize: 14, fontWeight: 700, color: Y }}>Global Rules</span></div>
<div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
{[{t:"COMMISSION FLOOR",c:"#e74c3c",d:"$25K quarterly minimum. Below = $0 payout."},{t:"PRESIDENTS CLUB",c:"#2ecc71",d:"PC roles exempt from floor."},{t:"DEMOTION RULE",c:"#f39c12",d:"Miss contest 2 years → transition back."}].map((r,i)=>(<div key={i} style={{ background: "#f8f8f8", borderRadius: 8, padding: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: r.c, marginBottom: 4 }}>{r.t}</div><div style={{ fontSize: 13, color: "#334155" }}>{r.d}</div></div>))}
</div></Card></Reveal>
<div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
{["ALL","PRODUCTION","BACK OFFICE"].map(f=>(<button key={f} onClick={()=>{setFilter(f);setExpandedTrack(0);}} style={{ background: filter===f?Y+"12":GLASS, border:"1px solid "+(filter===f?Y+"25":BORDER), color:filter===f?Y:"#64748b", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700 }}>{f==="ALL"?"All":f==="PRODUCTION"?"Production":"Back Office"}</button>))}
<button onClick={()=>setShowBonus(!showBonus)} style={{ background:showBonus?"#4ECDC412":GLASS, border:"1px solid "+(showBonus?"#4ECDC425":BORDER), color:showBonus?"#4ECDC4":"#64748b", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700, marginLeft:"auto" }}>{showBonus?"Hide":"Show"} Bonus Schedule</button>
</div>
{showBonus && <Reveal><Card style={{ marginBottom: 20, overflow: "auto" }}><div style={{ fontSize: 14, fontWeight: 700, color: "#4ECDC4", marginBottom: 14 }}>Contest & Bonus Schedule</div><div style={{ display: "grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap: 16 }}><div><div style={{ fontSize: 11, fontWeight: 700, color: Y, marginBottom: 8 }}>QUARTERLY</div>{BONUS_SCHEDULE.quarterly.map((r,i)=>(<div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f5f5f5", fontSize:12 }}><span style={{color:"#64748b"}}>L{r.level}</span><span style={{color:"#475569",fontFamily:"monospace"}}>{fmt(r.charge)}</span><span style={{color:"#2ecc71",fontWeight:600}}>{fmt(r.bonus)}</span></div>))}</div><div><div style={{ fontSize: 11, fontWeight: 700, color: Y, marginBottom: 8 }}>ANNUAL</div>{BONUS_SCHEDULE.annual.map((r,i)=>(<div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f5f5f5", fontSize:12, gap:8 }}><span style={{color:"#64748b"}}>L{r.level}</span><span style={{fontFamily:"monospace",color:"#475569"}}>{fmt(r.charge)}</span><span style={{color:"#2ecc71",fontWeight:600}}>{fmt(r.bonus)}</span><span style={{color:"#7C5CFC",fontSize:10}}>+{fmt(r.uars)}</span></div>))}</div></div></Card></Reveal>}
{filteredTracks.map((track, ti) => (<Reveal key={track.name} delay={ti * 0.06}><div style={{ marginBottom: 16 }}><button onClick={() => setExpandedTrack(expandedTrack === ti ? -1 : ti)} style={{ width: "100%", background: expandedTrack === ti ? track.color + "10" : GLASS, border: "1px solid " + (expandedTrack === ti ? track.color + "30" : BORDER), borderRadius: expandedTrack === ti ? "14px 14px 0 0" : 14, padding: "16px 18px", cursor: "pointer", color: "#1a1a2e", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 42, height: 42, borderRadius: 12, background: track.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><I name={track.icon} size={20} color={track.color} /></div><div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{track.name}</span><span style={{ fontSize: 9, fontWeight: 700, color: track.tag==="PRODUCTION"?Y:"#64748b", background: track.tag==="PRODUCTION"?Y+"15":"#f0f0f0", padding: "2px 7px", borderRadius: 4 }}>{track.tag}</span></div><div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{track.desc}</div></div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: track.color, fontWeight: 600, background: track.color + "15", padding: "3px 10px", borderRadius: 12 }}>{track.levels.length} levels</span><I name={expandedTrack === ti ? "chevUp" : "chevDown"} size={16} color="#b0b8c4" /></div></button>
{expandedTrack === ti && (<div style={{ border: "1px solid " + track.color + "30", borderTop: "none", borderRadius: "0 0 14px 14px", background: "#f2f1ee", padding: mob ? 14 : 22, animation: "fadeUp 0.3s ease" }}>{track.keyMetrics && <div style={{ marginBottom: 16, padding: "8px 12px", background: track.color + "08", borderRadius: 8, border: "1px solid " + track.color + "12", fontSize: 11, color: track.color, fontWeight: 600 }}>{track.keyMetrics}</div>}<div style={{ position: "relative", paddingLeft: mob ? 20 : 36 }}><div style={{ position: "absolute", left: mob ? 8 : 16, top: 10, bottom: 10, width: 2, background: track.color + "44" }} />{track.levels.map((level, li) => (<div key={li} style={{ position: "relative", marginBottom: li < track.levels.length - 1 ? 20 : 0 }}><div style={{ position: "absolute", left: mob ? -16 : -24, top: 6, width: 12, height: 12, borderRadius: "50%", background: li === track.levels.length - 1 ? track.color : track.color + "60", border: "2px solid #f7f7f5" }} /><div style={{ background: "#f8f8f8", borderRadius: 10, padding: mob ? 12 : 16, border: "1px solid #f0f0f0" }}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{level.title}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#2ecc71", background: "rgba(46,204,113,0.1)", padding: "2px 8px", borderRadius: 6 }}>{level.salary}</span>{level.floor ? <span style={{ fontSize: 9, fontWeight: 700, color: "#e74c3c", background: "rgba(231,76,60,0.1)", padding: "2px 7px", borderRadius: 4 }}>$25K FLOOR</span> : <span style={{ fontSize: 9, fontWeight: 700, color: "#2ecc71", background: "rgba(46,204,113,0.1)", padding: "2px 7px", borderRadius: 4 }}>NO FLOOR</span>}</div></div>{level.rates && level.rates.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>{level.rates.map((r, ri) => (<div key={ri} style={{ fontSize: 11, color: "#475569", background: "#f5f5f5", padding: "4px 8px", borderRadius: 6 }}><span style={{ fontWeight: 700, color: track.color }}>{r.label}:</span> {r.val}</div>))}</div>}<div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 }}>{level.criteria}</div><div style={{ fontSize: 11, color: track.color, fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 5, padding: "6px 10px", background: track.color + "08", borderRadius: 6, lineHeight: 1.4 }}><I name="arrowUp" size={12} color={track.color} /> {level.promo}</div></div></div>))}</div></div>)}</div></Reveal>))}
</div>);
}

function SOPsPage({ w }) {
const mob = w < 768;
const [expanded, setExpanded] = useState(0);
const deptColors = ["#FFD200", "#FF3366", "#4ECDC4", "#7C5CFC"];
return (<div style={{ padding: mob?"30px 16px 40px":"40px 40px 50px", margin: "0 auto" }}><SectionHeader icon="clipboard" title="SOPs & Playbooks" subtitle="Standard operating procedures by department" />{SOP_SECTIONS.map((section, si) => { const c = deptColors[si]; return (<Reveal key={si} delay={si * 0.06}><div style={{ marginBottom: 14 }}><button onClick={() => setExpanded(expanded === si ? -1 : si)} style={{ width: "100%", background: expanded===si?c+"08":GLASS, border:"1px solid "+(expanded===si?c+"25":BORDER), borderRadius:expanded===si?"12px 12px 0 0":12, padding:"16px 18px", cursor:"pointer", color:"#1a1a2e", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between" }}><div style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ width:36, height:36, borderRadius:10, background:c+"15", display:"flex", alignItems:"center", justifyContent:"center" }}><I name={section.icon} size={18} color={c} /></div><div><span style={{ fontSize:14, fontWeight:700 }}>{section.cat}</span><span style={{ fontSize:11, color:"#b0b8c4", marginLeft:10 }}>{section.items.length} procedures</span></div></div><I name={expanded===si?"chevUp":"chevDown"} size={16} color="#b0b8c4" /></button>{expanded === si && (<div style={{ border:"1px solid "+c+"25", borderTop:"none", borderRadius:"0 0 12px 12px", background:"#f5f4f1", padding:mob?14:20, animation:"fadeUp 0.25s ease" }}>{section.items.map((item, ii) => (<div key={ii} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:ii<section.items.length-1?"1px solid #f5f5f5":"none" }}><div style={{ width:24, height:24, borderRadius:6, background:c+"10", display:"flex", alignItems:"center", justifyContent:"center" }}><I name="check" size={12} color={c} /></div><div style={{ fontSize:13, color:"#334155" }}>{item}</div></div>))}</div>)}</div></Reveal>); })}</div>);
}

function ToolsPage({ w }) {
const mob = w < 768;
return (<div style={{ padding: mob?"30px 16px 40px":"40px 40px 50px", margin: "0 auto" }}><SectionHeader icon="link" title="Tools & Systems" subtitle="Your launchpad to every system and resource" />{TOOL_LINKS.map((section, si) => (<Reveal key={si} delay={si * 0.06}><div style={{ marginBottom: 24 }}><div style={{ fontSize:12, fontWeight:700, color:Y, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>{section.cat}</div><div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:10 }}>{section.items.map((tool, ti) => (<a key={ti} href={tool.url} target="_blank" rel="noopener noreferrer" style={{ background:GLASS, border:"1px solid "+BORDER, borderRadius:12, padding:16, textDecoration:"none", color:"#1a1a2e", display:"flex", gap:14, alignItems:"center" }}><div style={{ width:42, height:42, borderRadius:10, background:tool.color+"15", display:"flex", alignItems:"center", justifyContent:"center" }}><I name={tool.icon} size={20} color={tool.color} /></div><div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{tool.name}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{tool.desc}</div></div><I name="ext" size={14} color="#cbd5e1" /></a>))}</div></div></Reveal>))}<SectionHeader icon="phone" title="Key Contacts" /><div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr", gap:10 }}>{[{name:"Payroll",contact:"Priyanka Malani",email:"pmalani@sparkcompanies.com",color:"#2ecc71"},{name:"HR",contact:"Tamika Coleman",email:"tcoleman@sparkcompanies.com",color:"#FF3366"},{name:"Operations",contact:"Allie Spegel",email:"aspegel@sparkcompanies.com",phone:"(248) 632-3560",color:"#4ECDC4"},{name:"Timecards",contact:"Timecards Inbox",email:"Timecards@sparktalentinc.com",color:"#FF6B35"},{name:"General",contact:"Sterling TMX",email:"sterlingtmx@sparktalentinc.com",phone:"(586) 930-5000",color:Y},{name:"CEO",contact:"Aaron Opalewski",email:"aopalewski@sparkcompanies.com",phone:"(586) 864-3746",color:"#7C5CFC"}].map((c, i) => (<Reveal key={i} delay={i*0.04}><Card style={{ borderTop:"3px solid "+c.color, padding:16 }}><div style={{ fontSize:11, fontWeight:700, color:c.color, marginBottom:6 }}>{c.name}</div><div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:4 }}>{c.contact}</div><a href={"mailto:"+c.email} style={{ fontSize:11, color:"#94a3b8", textDecoration:"none", display:"block", marginBottom:2 }}>{c.email}</a>{c.phone && <div style={{ fontSize:11, color:"#94a3b8" }}>{c.phone}</div>}</Card></Reveal>))}</div></div>);
}

function SparkStandardPage({ w }) {
const mob = w < 768;
const [expandedValue, setExpandedValue] = useState(0);
const [numTab, setNumTab] = useState("daily");
const valColors = ["#FFD200","#4ECDC4","#FF6B35","#7C5CFC","#FF3366","#2ecc71","#E84393","#3498db"];
return (<div style={{ padding:mob?"30px 16px 40px":"40px 40px 50px", maxWidth:1000, margin:"0 auto" }}><Reveal><Card glow style={{ marginBottom:28, background:"linear-gradient(135deg, rgba(255,210,0,0.06), rgba(255,210,0,0.02))", border:"1px solid rgba(255,210,0,0.15)", textAlign:"center", padding:mob?24:36 }}><div style={{ fontSize:11, fontWeight:700, color:Y, letterSpacing:3, textTransform:"uppercase", marginBottom:16 }}>The Spark Standard</div><div style={{ fontSize:mob?15:18, fontStyle:"italic", color:"#334155", lineHeight:1.6, maxWidth:600, margin:"0 auto 16px" }}>"Championship teams don't chase the scoreboard. They chase the standard."</div><div style={{ fontSize:12, color:"#94a3b8" }}>— Nick Saban</div></Card></Reveal>
<SectionHeader icon="star" title="8 Core Values" subtitle="Our cultural manifesto" />
{CORE_VALUES.map((cv, i) => { const c = valColors[i]; return (<Reveal key={i} delay={i*0.04}><div style={{ marginBottom:12 }}><button onClick={()=>setExpandedValue(expandedValue===i?-1:i)} style={{ width:"100%", background:expandedValue===i?c+"10":GLASS, border:"1px solid "+(expandedValue===i?c+"30":BORDER), borderRadius:expandedValue===i?"12px 12px 0 0":12, padding:"14px 16px", cursor:"pointer", color:"#1a1a2e", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between" }}><div style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ width:36, height:36, borderRadius:10, background:c+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:c }}>{cv.num}</div><div style={{ fontSize:14, fontWeight:700, flex:1 }}>{cv.title}</div></div><I name={expandedValue===i?"chevUp":"chevDown"} size={16} color="#b0b8c4" /></button>{expandedValue === i && (<div style={{ border:"1px solid "+c+"30", borderTop:"none", borderRadius:"0 0 12px 12px", background:"#f5f4f1", padding:mob?14:20, animation:"fadeUp 0.25s ease" }}><div style={{ fontSize:13, color:"#334155", lineHeight:1.6, marginBottom:16, padding:"10px 14px", background:c+"08", borderRadius:8, borderLeft:"3px solid "+c }}><span style={{fontWeight:700,color:c}}>Standard: </span>{cv.standard}</div><div style={{ marginBottom:14 }}><div style={{ fontSize:11, fontWeight:700, color:c, marginBottom:8 }}>BEHAVIORS</div>{cv.behaviors.map((b,bi)=>(<div key={bi} style={{ display:"flex", gap:8, padding:"5px 0" }}><I name="check" size={12} color={c} sw={2.5} /><span style={{ fontSize:12, color:"#475569" }}>{b}</span></div>))}</div><div><div style={{ fontSize:11, fontWeight:700, color:Y, marginBottom:8 }}>TACTICS</div>{cv.tactics.map((t,ti)=>(<div key={ti} style={{ display:"flex", gap:8, padding:"5px 0" }}><I name="zap" size={11} color={Y} /><span style={{ fontSize:12, color:"#64748b" }}>{t}</span></div>))}</div></div>)}</div></Reveal>); })}
<div style={{ marginTop:36 }}><SectionHeader icon="trending" title="Spark By The Numbers" /><div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>{["daily","weekly","monthly","annual"].map(p=>(<button key={p} onClick={()=>setNumTab(p)} style={{ background:numTab===p?Y+"12":GLASS, border:"1px solid "+(numTab===p?Y+"25":BORDER), color:numTab===p?Y:"#64748b", padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, textTransform:"capitalize" }}>{p}</button>))}</div><div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:14 }}>{[{label:"Recruiter",data:SPARK_NUMBERS[numTab].recruiter,color:"#4ECDC4"},{label:"Sales",data:SPARK_NUMBERS[numTab].sales,color:"#FF6B35"}].map((r,ri)=>(<Card key={ri} style={{ borderTop:"3px solid "+r.color }}><div style={{ fontSize:13, fontWeight:700, color:r.color, marginBottom:12 }}>{r.label}</div>{r.data.map((item,i)=>(<div key={i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:i<r.data.length-1?"1px solid #f5f5f5":"none" }}><div style={{ width:5, height:5, borderRadius:"50%", background:r.color, marginTop:6 }} /><span style={{ fontSize:12, color:"#475569" }}>{item}</span></div>))}</Card>))}</div></div></div>);
}

function PerformancePage({ w }) {
const mob = w < 768;
const bps = [{title:"Daily Igniters",icon:"zap",color:"#FFD200",items:["Morning planning (15 min)","Priority task ID","Key igniter activities","End-of-day review"]},{title:"Time Blocking",icon:"clock",color:"#4ECDC4",items:["Focus blocks","Meeting windows","Admin blocks","Learning time"]},{title:"Weekly Planning",icon:"map",color:"#FF6B35",items:["Monday priorities","Mid-week check","Friday wrap","KPI tracking"]},{title:"Growth",icon:"trending",color:"#7C5CFC",items:["Quarterly assessment","Career tracking","Coach check-ins","Cross-training"]}];
const reviews = [{period:"30 Days",focus:"Onboarding, systems, culture",who:"Manager + VP"},{period:"60 Days",focus:"Role execution, initiative, team",who:"Manager + VP"},{period:"90 Days",focus:"Full review, goals, career path",who:"Manager + VP + CEO"},{period:"Annual",focus:"Comp review, development plan",who:"Manager + VP + CEO"}];
return (<div style={{ padding:mob?"30px 16px 40px":"40px 40px 50px", maxWidth:1000, margin:"0 auto" }}><SectionHeader icon="target" title="Performance & Goals" subtitle="Blueprint framework, reviews, KPIs" /><div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:12, marginBottom:40 }}>{bps.map((s,i)=>(<Reveal key={i} delay={i*0.06}><Card style={{ borderTop:"3px solid "+s.color }}><div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}><I name={s.icon} size={20} color={s.color} /><div style={{ fontSize:14, fontWeight:700 }}>{s.title}</div></div>{s.items.map((item,ii)=>(<div key={ii} style={{ display:"flex", gap:8, padding:"6px 0" }}><div style={{ width:5, height:5, borderRadius:"50%", background:s.color, marginTop:6 }} /><div style={{ fontSize:12, color:"#475569" }}>{item}</div></div>))}</Card></Reveal>))}</div><SectionHeader icon="award" title="Review Cadence" /><div style={{ display:"flex", flexDirection:"column", gap:10 }}>{reviews.map((r,i)=>{ const colors=["#4ECDC4","#FFD200","#FF6B35","#FF3366"]; const c=colors[i]; return (<Reveal key={i} delay={i*0.06}><Card style={{ display:"flex", gap:16, alignItems:mob?"flex-start":"center", flexDirection:mob?"column":"row" }}><div style={{ width:60, height:60, borderRadius:12, background:c+"12", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{textAlign:"center"}}><div style={{ fontSize:18, fontWeight:800, color:c }}>{r.period.split(" ")[0]}</div><div style={{ fontSize:9, fontWeight:600, color:c, opacity:0.7 }}>{r.period.split(" ")[1]||""}</div></div></div><div style={{flex:1}}><div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:4 }}>{r.focus}</div><div style={{ fontSize:11, color:"#94a3b8" }}>By: {r.who}</div></div></Card></Reveal>); })}</div></div>);
}

function DocumentsPage({ w }) {
const mob = w < 768;
const [activeCat, setActiveCat] = useState(0);
const docCategories = [
{ cat: "Performance", icon: "trending", items: [{ name: "Opportunity Plan Template", desc: "Formal improvement plan", format: "DOCX", color: "#4ECDC4" },{ name: "Blueprint Template", desc: "KPI goal-setting", format: "DOCX", color: "#FFD200" }] },
{ cat: "Onboarding", icon: "users", items: [{ name: "New Hire Checklist", desc: "Complete onboarding checklist", format: "DOCX", color: "#7C5CFC" },{ name: "Employee Handbook", desc: "86-page handbook, 13 states", format: "PDF", color: "#FF6B35", url: "https://sparktalent.sharepoint.com/sites/SparkCompanies" }] },
{ cat: "Benefits", icon: "heart", items: [{ name: "Benefits Guide", desc: "Full package — medical, dental, vision", format: "PDF", color: "#FF3366", url: "https://www.theamericanworker.com" }] },
{ cat: "Compliance", icon: "shield", items: [{ name: "I-9 Form", desc: "Employment Eligibility", format: "PDF", color: "#7C5CFC", url: "https://www.uscis.gov/i-9" }] },
{ cat: "Operations", icon: "dollar", items: [{ name: "Direct Deposit Form", desc: "Update banking", format: "PDF", color: "#2ecc71", url: "https://www.greenemployee.com" },{ name: "Rapid! PayCard", desc: "Prepaid Visa", format: "PDF", color: "#e74c3c", url: "mailto:Timecards@sparktalentinc.com?subject=Rapid%20PayCard" }] },
{ cat: "Recruiting", icon: "search", items: [{ name: "Referral Flyer", desc: "$100/$50 referral program", format: "PDF", color: "#FFD200", url: "https://wkf.ms/3IydKBx" }] },
];
return (<div style={{ padding:mob?"30px 16px 40px":"40px 40px 50px", maxWidth:1000, margin:"0 auto" }}><SectionHeader icon="file" title="Documents & Templates" /><div style={{ display:"flex", gap:6, marginBottom:24, flexWrap:"wrap" }}>{docCategories.map((c,i)=>(<button key={i} onClick={()=>setActiveCat(i)} style={{ background:activeCat===i?Y+"12":GLASS, border:"1px solid "+(activeCat===i?Y+"25":BORDER), color:activeCat===i?Y:"#64748b", padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}><I name={c.icon} size={14} color={activeCat===i?Y:"#b0b8c4"} />{c.cat}</button>))}</div><div style={{ display:"flex", flexDirection:"column", gap:8 }}>{docCategories[activeCat].items.map((doc,i)=>{ const Wrap = doc.url ? "a" : "div"; const wp = doc.url ? { href:doc.url, target:"_blank", rel:"noopener noreferrer", style:{textDecoration:"none",color:"#1a1a2e",display:"block"} } : {}; return (<Reveal key={i} delay={i*0.04}><Wrap {...wp}><div style={{ background:GLASS, border:"1px solid "+BORDER, borderRadius:12, padding:mob?14:18, display:"flex", alignItems:"center", gap:14 }}><div style={{ width:42, height:42, borderRadius:11, background:doc.color+"14", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}><I name="file" size={16} color={doc.color} /><span style={{ fontSize:7, fontWeight:800, color:doc.color }}>{doc.format}</span></div><div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{doc.name}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{doc.desc}</div></div>{doc.url ? <div style={{ background:doc.color+"12", color:doc.color, padding:"6px 12px", borderRadius:7, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>Open <I name="ext" size={9} color={doc.color} /></div> : <div style={{ fontSize:9, color:"#e2e8f0", padding:"6px 10px", border:"1px solid #f0f0f0", borderRadius:6 }}>Soon</div>}</div></Wrap></Reveal>); })}</div></div>);
}

function TrainingPage({ w, setTab }) {
const mob = w < 768;
const ADMIN_PIN = "9999";
const ROLE_GROUPS = ["All Employees", "New Hires", "Production", "Back Office"];
const secColors = ["#FFD200","#E84393","#FF3366","#4ECDC4","#7C5CFC","#FF6B35","#2ecc71","#636e72","#00b894","#fd79a8","#3498db"];
const iconOptions = ["book","rocket","star","shield","heart","zap","layers","settings","users","target","award","compass","briefcase","globe","trending","clipboard"];
const [activeCourse, setActiveCourse] = useState(null);
const [activeStep, setActiveStep] = useState(0);
const [stepCompletions, setStepCompletions] = useState({});
const [quizCompletions, setQuizCompletions] = useState({});
const [quizState, setQuizState] = useState({ idx: 0, answers: [], score: null, active: false });
const [sidebarOpen, setSidebarOpen] = useState(!mob);
const [customSubjects, setCustomSubjects] = useState([]);
const [adminMode, setAdminMode] = useState(false);
const [pinInput, setPinInput] = useState("");
const [pinError, setPinError] = useState(false);
const [showPinModal, setShowPinModal] = useState(false);
const [editorOpen, setEditorOpen] = useState(false);
const [editingSubject, setEditingSubject] = useState(null);
const [userGroup, setUserGroup] = useState("All Employees");
const [filterGroup, setFilterGroup] = useState("all");
const [deleteConfirm, setDeleteConfirm] = useState(null);
const [stepRatings, setStepRatings] = useState({});
const [stepFlags, setStepFlags] = useState([]);
const [moduleComments, setModuleComments] = useState({});
const [showFlagModal, setShowFlagModal] = useState(false);
const [flagReason, setFlagReason] = useState("");
const [commentDraft, setCommentDraft] = useState("");
const [showHealthPanel, setShowHealthPanel] = useState(false);
const [showTeamPanel, setShowTeamPanel] = useState(false);
const [activityLog, setActivityLog] = useState([]);
const [userName, setUserName] = useState("Team Member");
const [showNamePrompt, setShowNamePrompt] = useState(false);
const [nameInput, setNameInput] = useState("");

useEffect(() => { const load = async () => { try {
const r = await window.storage.get("spark-hq-step-completions"); if (r?.value) setStepCompletions(JSON.parse(r.value));
const q = await window.storage.get("spark-hq-completions"); if (q?.value) setQuizCompletions(JSON.parse(q.value));
const g = await window.storage.get("spark-hq-user-group"); if (g?.value) setUserGroup(g.value);
const n = await window.storage.get("spark-hq-user-name"); if (n?.value) { setUserName(n.value); } else { setShowNamePrompt(true); }
} catch(e){} try { const c = await window.storage.get("spark-hq-custom-subjects", true); if (c?.value) setCustomSubjects(JSON.parse(c.value)); } catch(e){} try {
const fr = await window.storage.get("spark-hq-step-ratings", true); if (fr?.value) setStepRatings(JSON.parse(fr.value));
const ff = await window.storage.get("spark-hq-step-flags", true); if (ff?.value) setStepFlags(JSON.parse(ff.value));
const fc = await window.storage.get("spark-hq-module-comments", true); if (fc?.value) setModuleComments(JSON.parse(fc.value));
const al = await window.storage.get("spark-hq-activity-log", true); if (al?.value) setActivityLog(JSON.parse(al.value));
} catch(e){} }; if (window.storage) load(); }, []);

const saveSteps = async (s) => { setStepCompletions(s); try { if(window.storage) await window.storage.set("spark-hq-step-completions", JSON.stringify(s)); } catch(e){} };
const saveQuiz = async (cat) => { const c = { ...quizCompletions, [cat]: true }; setQuizCompletions(c); try { if(window.storage) await window.storage.set("spark-hq-completions", JSON.stringify(c)); } catch(e){} logActivity({ type: "quiz_passed", cat }); };
const saveCustom = async (subs) => { setCustomSubjects(subs); try { if(window.storage) await window.storage.set("spark-hq-custom-subjects", JSON.stringify(subs), true); } catch(e){} };
const saveGroup = async (g) => { setUserGroup(g); try { if(window.storage) await window.storage.set("spark-hq-user-group", g); } catch(e){} };
const saveName = async (n) => { setUserName(n); try { if(window.storage) await window.storage.set("spark-hq-user-name", n); } catch(e){} };
const saveRatings = async (r) => { setStepRatings(r); try { if(window.storage) await window.storage.set("spark-hq-step-ratings", JSON.stringify(r), true); } catch(e){} };
const saveFlags = async (f) => { setStepFlags(f); try { if(window.storage) await window.storage.set("spark-hq-step-flags", JSON.stringify(f), true); } catch(e){} };
const saveComments = async (c) => { setModuleComments(c); try { if(window.storage) await window.storage.set("spark-hq-module-comments", JSON.stringify(c), true); } catch(e){} };
const logActivity = async (event) => { if (!userName || userName === "Team Member") return; try { if (!window.storage) return; const r = await window.storage.get("spark-hq-activity-log", true); const log = r?.value ? JSON.parse(r.value) : []; log.push({ ...event, by: userName, at: new Date().toISOString() }); const trimmed = log.slice(-2000); await window.storage.set("spark-hq-activity-log", JSON.stringify(trimmed), true); } catch(e){} };
const rateStep = (si, ii, idx, rating) => { const k = `${si}-${ii}-${idx}`; const r = { ...stepRatings }; if (!r[k]) r[k] = { up: 0, down: 0, voters: {} }; const prev = r[k].voters[userName]; if (prev === rating) { r[k][rating]--; delete r[k].voters[userName]; } else { if (prev) r[k][prev]--; r[k][rating]++; r[k].voters[userName] = rating; } saveRatings(r); };
const flagStep = (si, ii, idx, sectionCat, itemName, stepHeading, reason) => { const f = [...stepFlags, { id: Date.now(), si, ii, idx, sectionCat, itemName, stepHeading, reason, by: userName, at: new Date().toISOString(), resolved: false }]; saveFlags(f); };
const resolveFlag = (id) => saveFlags(stepFlags.map(f => f.id === id ? {...f, resolved: true, resolvedAt: new Date().toISOString()} : f));
const addComment = (moduleKey, text) => { const c = { ...moduleComments, [moduleKey]: [...(moduleComments[moduleKey] || []), { id: Date.now(), text, by: userName, at: new Date().toISOString() }] }; saveComments(c); };
const deleteComment = (moduleKey, id) => { const c = { ...moduleComments, [moduleKey]: (moduleComments[moduleKey] || []).filter(x => x.id !== id) }; saveComments(c); };
const markStepDone = (si, ii, idx) => { const k = `${si}-${ii}-${idx}`; if (!stepCompletions[k]) { saveSteps({ ...stepCompletions, [k]: true }); const sec = allSections.find(s => s._idx === si); const it = sec?.items?.[ii]; const stp = it && getSteps(it)[idx]; if (sec && it && stp) logActivity({ type: "step_done", cat: sec.cat, item: it.name, step: stp.heading, sectionIdx: si, itemIdx: ii, stepIdx: idx }); } };
const isStepDone = (si, ii, idx) => stepCompletions[`${si}-${ii}-${idx}`] === true;

const allSections = [
...TRAINING_SECTIONS.map((s, i) => ({ ...s, _type: "builtin", _idx: i, assignedGroups: s.assignedGroups || ["All Employees"] })),
...customSubjects.filter(s => s.published).map((s, i) => ({ cat: s.name, icon: s.icon, _type: "custom", _idx: TRAINING_SECTIONS.length + i, _customId: s.id, assignedGroups: s.assignedGroups || ["All Employees"], items: [{ name: s.name, desc: s.description, type: "doc", location: "Custom", content: s.steps.filter(st => st.type === "content").map(st => ({ heading: st.heading, body: st.body })), video: s.steps.find(st => st.type === "video")?.video || null, quiz: s.quiz && s.quiz.length > 0, _customQuiz: s.quiz || [] }] })),
];
const filteredSections = filterGroup === "all" ? allSections : allSections.filter(s => s.assignedGroups?.includes(filterGroup));
const getSteps = (item) => { const steps = []; if (item.video) steps.push({ type: "video", heading: "Watch: " + item.name, video: item.video }); if (item.content) item.content.forEach(c => steps.push({ type: "content", ...c })); if (item.url && !item.video) steps.push({ type: "link", heading: "Open Resource", url: item.url, name: item.name }); return steps; };
const getQuizForSection = (section, item) => { if (item._customQuiz && item._customQuiz.length > 0) return { cat: section._customId || section.cat, quiz: item._customQuiz }; if (QUIZZES[section.cat]) return { cat: section.cat, quiz: QUIZZES[section.cat] }; return null; };
const getSubjectProgress = (section) => { const si = section._idx; let total = 0, done = 0; section.items.forEach((item, ii) => { getSteps(item).forEach((_, idx) => { total++; if (isStepDone(si, ii, idx)) done++; }); }); const qInfo = section.items[0] ? getQuizForSection(section, section.items[0]) : null; if (qInfo && section.items[0]?.quiz) { total++; if (quizCompletions[qInfo.cat]) done++; } return { total, done, pct: total > 0 ? Math.round(done / total * 100) : 0 }; };

const PinModal = () => showPinModal ? (<div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => { setShowPinModal(false); setPinInput(""); setPinError(false); }}><div onClick={e => e.stopPropagation()} style={{ background: "#f7f7f5", border: "1px solid " + BORDER, borderRadius: 12, padding: 32, width: 340, textAlign: "center" }}><div style={{ width: 52, height: 52, borderRadius: 10, background: Y + "10", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><I name="shield" size={24} color={Y} /></div><div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>Admin Access</div><input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={e => { setPinInput(e.target.value.replace(/\D/g,"")); setPinError(false); }} placeholder="PIN" style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "1px solid " + (pinError ? "#e74c3c" : "#eee"), background: "#f8f8f8", color: "#1a1a2e", fontSize: 20, fontWeight: 700, textAlign: "center", letterSpacing: 8, outline: "none", fontFamily: "inherit" }} autoFocus />{pinError && <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 8 }}>Incorrect PIN</div>}<button onClick={() => { if (pinInput === ADMIN_PIN) { setAdminMode(true); setShowPinModal(false); setPinInput(""); } else setPinError(true); }} style={{ width: "100%", marginTop: 16, background: Y + "15", border: "1px solid " + Y + "25", color: Y, padding: 12, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Unlock</button></div></div>) : null;

const FlagModal = () => showFlagModal ? (<div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => { setShowFlagModal(false); setFlagReason(""); }}><div onClick={e => e.stopPropagation()} style={{ background: "#f7f7f5", border: "1px solid " + BORDER, borderRadius: 12, padding: 28, width: 420 }}><div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: 14 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}><I name="info" size={18} color="#d97706" /></div><div><div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Flag for review</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Help us keep training accurate.</div></div></div><div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12 }}><div style={{ color: "#94a3b8", marginBottom: 2, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{showFlagModal.sectionCat} · {showFlagModal.itemName}</div><div style={{ color: "#1a1a2e", fontWeight: 600 }}>{showFlagModal.stepHeading}</div></div><textarea value={flagReason} onChange={e => setFlagReason(e.target.value)} placeholder="What's wrong? (e.g., 'pay range is outdated', 'wrong contact name', 'policy changed in Q3')" rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #eee", background: "#fff", color: "#1a1a2e", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", marginBottom: 14 }} autoFocus /><div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button onClick={() => { setShowFlagModal(false); setFlagReason(""); }} style={{ background: "#f5f5f5", border: "1px solid #eee", color: "#64748b", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button><button onClick={() => { if (flagReason.trim()) { flagStep(showFlagModal.si, showFlagModal.ii, showFlagModal.idx, showFlagModal.sectionCat, showFlagModal.itemName, showFlagModal.stepHeading, flagReason.trim()); setShowFlagModal(false); setFlagReason(""); } }} disabled={!flagReason.trim()} style={{ background: flagReason.trim() ? "#fef3c7" : "#f5f5f5", border: "1px solid " + (flagReason.trim() ? "#fde68a" : "#eee"), color: flagReason.trim() ? "#92400e" : "#cbd5e1", padding: "9px 18px", borderRadius: 8, cursor: flagReason.trim() ? "pointer" : "default", fontSize: 12, fontWeight: 700 }}>Submit flag</button></div></div></div>) : null;

const NamePrompt = () => showNamePrompt ? (<div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}><div style={{ background: "#f7f7f5", border: "1px solid " + BORDER, borderRadius: 12, padding: 32, width: 380 }}><div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: 16 }}><div style={{ width: 44, height: 44, borderRadius: 10, background: Y + "12", display: "flex", alignItems: "center", justifyContent: "center" }}><I name="users" size={20} color={Y} /></div><div><div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Welcome to Spark HQ</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Quick — who are you?</div></div></div><div style={{ fontSize: 12, color: "#475569", marginBottom: 14, lineHeight: 1.5 }}>Pick your name so completions and feedback get credited to you. Managers can see their team's progress.</div><select value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #eee", background: "#fff", color: "#1a1a2e", fontSize: 14, fontWeight: 600, outline: "none", fontFamily: "inherit", marginBottom: 14 }} autoFocus><option value="">Select your name…</option>{TEAM_ROSTER.map(p => (<option key={p.name} value={p.name}>{p.name} — {p.role}</option>))}</select><button onClick={() => { if (nameInput) { saveName(nameInput); setShowNamePrompt(false); } }} disabled={!nameInput} style={{ width: "100%", background: nameInput ? Y + "15" : "#f5f5f5", border: "1px solid " + (nameInput ? Y + "25" : "#eee"), color: nameInput ? Y : "#cbd5e1", padding: 12, borderRadius: 10, cursor: nameInput ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>Continue</button><div style={{ fontSize: 10, color: "#cbd5e1", textAlign: "center", marginTop: 12 }}>You can change this anytime in Settings.</div></div></div>) : null;

const submitAnswer = (ansIdx) => { if (!activeCourse) return; const section = allSections.find(s => s._idx === activeCourse.sectionIdx); const item = section?.items?.[activeCourse.itemIdx]; const qInfo = item ? getQuizForSection(section, item) : null; if (!qInfo) return; const quiz = qInfo.quiz; const newA = [...quizState.answers, ansIdx]; if (quizState.idx + 1 >= quiz.length) { const score = newA.reduce((s, a, i) => s + (a === quiz[i].answer ? 1 : 0), 0); const passed = score / quiz.length >= 0.8; setQuizState({ idx: quizState.idx, answers: newA, score, passed, active: true }); if (passed) saveQuiz(qInfo.cat); } else setQuizState({ idx: quizState.idx + 1, answers: newA, score: null, active: true }); };

if (activeCourse) {
const si = activeCourse.sectionIdx; const ii = activeCourse.itemIdx;
const section = allSections.find(s => s._idx === si); const item = section?.items?.[ii];
if (!item) { setActiveCourse(null); return null; }
const steps = getSteps(item); const qInfo = item.quiz ? getQuizForSection(section, item) : null;
const hasQuiz = qInfo && qInfo.quiz && qInfo.quiz.length > 0;
const totalSteps = steps.length + (hasQuiz ? 1 : 0); const isOnQuiz = activeStep >= steps.length && hasQuiz;
const completedSteps = steps.filter((_, idx) => isStepDone(si, ii, idx)).length + (hasQuiz && quizCompletions[qInfo?.cat] ? 1 : 0);
const progressPct = totalSteps > 0 ? Math.round(completedSteps / totalSteps * 100) : 0;
const c = secColors[si % secColors.length];
const goNext = () => { markStepDone(si, ii, activeStep); if (activeStep < totalSteps - 1) { setActiveStep(activeStep + 1); setQuizState({ idx:0,answers:[],score:null,active:false }); } else { setActiveCourse(null); setActiveStep(0); } };
const goPrev = () => { if (activeStep > 0) { setActiveStep(activeStep - 1); setQuizState({ idx:0,answers:[],score:null,active:false }); } };

const Sidebar = () => (<div style={{ width: mob ? "100%" : 280, flexShrink: 0, borderRight: mob ? "none" : "1px solid " + BORDER, background: "#f8f8f6", padding: "16px 0", overflowY: "auto", maxHeight: mob ? 300 : "calc(100vh - 180px)" }}><div style={{ padding: "0 16px 12px", borderBottom: "1px solid #f0f0f0" }}><button onClick={() => { setActiveCourse(null); setActiveStep(0); }} style={{ background: "none", border: "none", color: c, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}><I name="chevLeft" size={12} color={c} /> All Subjects</button><div style={{ fontSize: 9, fontWeight: 800, color: c, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{section.cat}</div><div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{item.name}</div><div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 4, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: progressPct + "%", background: c, borderRadius: 2, transition: "width 0.3s" }} /></div><span style={{ fontSize: 10, fontWeight: 700, color: progressPct === 100 ? "#2ecc71" : c }}>{progressPct}%</span></div></div><div style={{ padding: "8px 0" }}>{steps.map((step, idx) => { const done = isStepDone(si, ii, idx); const isCur = activeStep === idx && !isOnQuiz; return (<button key={idx} onClick={() => { setActiveStep(idx); setQuizState({idx:0,answers:[],score:null,active:false}); if(mob) setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", cursor: "pointer", textAlign: "left", color: "#1a1a2e", background: isCur ? c + "12" : "transparent", border: "none", borderLeft: isCur ? `3px solid ${c}` : "3px solid transparent" }}><div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#2ecc71" : isCur ? c + "20" : "#f0f0f0" }}>{done ? <I name="check" size={12} color="#fff" sw={2.5} /> : <span style={{ fontSize: 9, fontWeight: 700, color: isCur ? c : "#b0b8c4" }}>{idx + 1}</span>}</div><div><div style={{ fontSize: 12, fontWeight: isCur ? 700 : 500, color: isCur ? "#1a1a2e" : "#475569" }}>{step.heading}</div><div style={{ fontSize: 9, color: done ? "#2ecc71" : "#cbd5e1", fontWeight: 600, marginTop: 2 }}>{done ? "Done" : step.type}</div></div></button>); })}{hasQuiz && (<button onClick={() => { setActiveStep(steps.length); setQuizState({idx:0,answers:[],score:null,active:false}); if(mob) setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", cursor: "pointer", textAlign: "left", color: "#1a1a2e", background: isOnQuiz ? "#4ECDC412" : "transparent", border: "none", borderLeft: isOnQuiz ? "3px solid #4ECDC4" : "3px solid transparent", borderTop: "1px solid #f0f0f0", marginTop: 4, paddingTop: 14 }}><div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: quizCompletions[qInfo.cat] ? "#2ecc71" : "#f0f0f0" }}>{quizCompletions[qInfo.cat] ? <I name="check" size={12} color="#fff" sw={2.5} /> : <I name="target" size={11} color="#4ECDC4" />}</div><div><div style={{ fontSize: 12, fontWeight: isOnQuiz ? 700 : 500 }}>Knowledge Check</div><div style={{ fontSize: 9, color: quizCompletions[qInfo.cat] ? "#2ecc71" : "#4ECDC4", fontWeight: 600, marginTop: 2 }}>{quizCompletions[qInfo.cat] ? "Passed" : qInfo.quiz.length + " questions"}</div></div></button>)}</div></div>);

const MainContent = () => {
if (isOnQuiz && hasQuiz) {
const quiz = qInfo.quiz; const isDone = quizCompletions[qInfo.cat]; const isFinished = quizState.score !== null;
if (isDone && !quizState.active) return (<div style={{ flex:1, padding:mob?20:40, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}><div style={{ width:72, height:72, borderRadius:"50%", background:"#2ecc7120", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}><I name="check" size={32} color="#2ecc71" /></div><div style={{fontSize:22,fontWeight:800,marginBottom:20}}>Quiz Passed!</div><div style={{display:"flex",gap:10}}><button onClick={()=>setQuizState({idx:0,answers:[],score:null,active:true})} style={{background:"#f5f5f5",border:"1px solid #eee",color:"#64748b",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:12}}>Retake</button><button onClick={goNext} style={{background:c+"15",border:"1px solid "+c+"30",color:c,padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700}}>Continue</button></div></div>);
if (!quizState.active) return (<div style={{ flex:1, padding:mob?20:40, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}><div style={{ width:72, height:72, borderRadius:"50%", background:"#4ECDC420", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}><I name="target" size={32} color="#4ECDC4" /></div><div style={{fontSize:22,fontWeight:800,marginBottom:20}}>Knowledge Check</div><div style={{fontSize:13,color:"#94a3b8",marginBottom:20}}>{quiz.length} questions · 80% to pass</div><button onClick={()=>setQuizState({idx:0,answers:[],score:null,active:true})} style={{background:"#4ECDC420",border:"1px solid #4ECDC430",color:"#4ECDC4",padding:"12px 28px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700}}>Start Quiz</button></div>);
if (isFinished) return (<div style={{ flex:1, padding:mob?20:40, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}><div style={{ width:72, height:72, borderRadius:"50%", background:quizState.passed?"#2ecc7120":"#FF6B3520", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}><I name={quizState.passed?"check":"x"} size={32} color={quizState.passed?"#2ecc71":"#FF6B35"} /></div><div style={{fontSize:24,fontWeight:800,marginBottom:6}}>{quizState.passed?"Passed!":"Not Quite"}</div><div style={{fontSize:14,color:"#94a3b8",marginBottom:24}}>{quizState.score}/{quiz.length} ({Math.round(quizState.score/quiz.length*100)}%)</div><div style={{display:"flex",gap:10}}>{!quizState.passed&&<button onClick={()=>setQuizState({idx:0,answers:[],score:null,active:true})} style={{background:"#4ECDC415",border:"1px solid #4ECDC430",color:"#4ECDC4",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700}}>Retry</button>}<button onClick={goNext} style={{background:"#f5f5f5",border:"1px solid #eee",color:"#64748b",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:12}}>Back</button></div></div>);
return (<div style={{ flex:1, padding:mob?20:40, maxWidth:640, margin:"0 auto" }}><div style={{ display:"flex", gap:4, marginBottom:28 }}>{quiz.map((_,i)=>(<div key={i} style={{ flex:1, height:5, borderRadius:3, background:i<quizState.idx?"#2ecc71":i===quizState.idx?"#4ECDC4":"#f0f0f0" }} />))}</div><div style={{ fontSize:10, color:"#4ECDC4", fontWeight:700, marginBottom:8 }}>QUESTION {quizState.idx+1} OF {quiz.length}</div><div style={{ fontSize:18, fontWeight:700, color:"#1a1a2e", lineHeight:1.5, marginBottom:28 }}>{quiz[quizState.idx].q}</div><div style={{ display:"flex", flexDirection:"column", gap:10 }}>{quiz[quizState.idx].opts.map((opt,oi)=>(<button key={oi} onClick={()=>submitAnswer(oi)} style={{ background:"#fafafa", border:"1px solid #eee", borderRadius:12, padding:"16px 20px", cursor:"pointer", color:"#1a1a2e", fontSize:14, textAlign:"left", display:"flex", alignItems:"center", gap:14 }}><div style={{ width:32, height:32, borderRadius:10, border:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#94a3b8" }}>{String.fromCharCode(65+oi)}</div>{opt}</button>))}</div></div>);
}
const step = steps[activeStep]; if (!step) return null;
return (<div style={{ flex:1, padding:mob?"20px 18px":"32px 48px", overflowY:"auto" }}><div style={{ maxWidth:700 }}><div style={{ fontSize:10, fontWeight:800, color:c, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>Step {activeStep+1} of {totalSteps}</div><h3 style={{ fontSize:mob?20:26, fontWeight:800, color:"#1a1a2e", marginBottom:20 }}>{step.heading}</h3>{step.type==="video"&&(()=>{const vidId=step.video?.split("/embed/")[1]?.split("?")[0]||step.video?.split("v=")[1]?.split("&")[0]||"";return vidId?(<a href={"https://www.youtube.com/watch?v="+vidId} target="_blank" rel="noopener noreferrer" style={{ display:"block", marginBottom:24, borderRadius:14, overflow:"hidden", border:"1px solid #eee", position:"relative", maxWidth:700, aspectRatio:"16/9", background:"#000", textDecoration:"none" }}><img src={"https://img.youtube.com/vi/"+vidId+"/hqdefault.jpg"} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.7 }} /><div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(255,0,0,0.9)", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ width:0, height:0, borderTop:"12px solid transparent", borderBottom:"12px solid transparent", borderLeft:"22px solid #fff", marginLeft:5 }} /></div></div></a>):null;})()}{step.type==="link"&&(<a href={step.url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:8, fontSize:14, fontWeight:700, color:c, textDecoration:"none", padding:"14px 24px", background:c+"10", border:"1px solid "+c+"25", borderRadius:12, marginBottom:20 }}><I name="ext" size={16} color={c} /> Open {step.name||"Resource"}</a>)}{step.type==="content"&&(<div style={{ fontSize:14, color:"#334155", lineHeight:1.8, whiteSpace:"pre-line" }}>{step.body}</div>)}
{/* === FEEDBACK BAR === */}
{(() => { const fk=`${si}-${ii}-${activeStep}`; const r=stepRatings[fk]||{up:0,down:0,voters:{}}; const myVote=r.voters[userName]; return (
  <div style={{ marginTop:24, padding:"14px 16px", background:"#fafafa", border:"1px solid #f0f0f0", borderRadius:10, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
    <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:0.5, textTransform:"uppercase", marginRight:4 }}>Was this helpful?</div>
    <button onClick={()=>rateStep(si,ii,activeStep,"up")} style={{ background:myVote==="up"?"#ecfdf5":"#fff", border:"1px solid "+(myVote==="up"?"#86efac":"#eee"), color:myVote==="up"?"#059669":"#64748b", padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>👍 {r.up>0?r.up:""}</button>
    <button onClick={()=>rateStep(si,ii,activeStep,"down")} style={{ background:myVote==="down"?"#fef2f2":"#fff", border:"1px solid "+(myVote==="down"?"#fca5a5":"#eee"), color:myVote==="down"?"#dc2626":"#64748b", padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>👎 {r.down>0?r.down:""}</button>
    <div style={{ flex:1 }} />
    <button onClick={()=>{ setShowFlagModal({si,ii,idx:activeStep,sectionCat:section.cat,itemName:item.name,stepHeading:step.heading}); setFlagReason(""); }} style={{ background:"transparent", border:"1px solid #eee", color:"#94a3b8", padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}><I name="info" size={11} color="#94a3b8" /> Flag for review</button>
  </div>
);})()}
{/* === COMMENT THREAD (only on last step) === */}
{activeStep===steps.length-1 && (() => { const mk=`${section._idx}-${ii}`; const cms=moduleComments[mk]||[]; return (
  <div style={{ marginTop:20, padding:"16px 18px", background:"#fff", border:"1px solid #eee", borderRadius:10 }}>
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
      <I name="users" size={14} color="#64748b" />
      <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>Module Discussion</div>
      <div style={{ fontSize:11, color:"#cbd5e1" }}>{cms.length} comment{cms.length!==1?"s":""}</div>
    </div>
    {cms.length>0 && <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>{cms.map(cm=>(<div key={cm.id} style={{ background:"#fafafa", borderRadius:8, padding:"10px 12px" }}><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}><div style={{ fontSize:11, fontWeight:700, color:"#1a1a2e" }}>{cm.by}</div><div style={{ fontSize:10, color:"#cbd5e1" }}>{new Date(cm.at).toLocaleDateString()}</div>{(cm.by===userName||adminMode) && <button onClick={()=>deleteComment(mk,cm.id)} style={{ marginLeft:"auto", background:"none", border:"none", color:"#cbd5e1", cursor:"pointer", fontSize:10 }}>Delete</button>}</div><div style={{ fontSize:13, color:"#334155", lineHeight:1.5 }}>{cm.text}</div></div>))}</div>}
    <div style={{ display:"flex", gap:8 }}>
      <input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Add a comment, question, or correction..." style={{ flex:1, padding:"9px 12px", borderRadius:8, border:"1px solid #eee", background:"#fafafa", fontSize:12, outline:"none", fontFamily:"inherit" }} />
      <button onClick={()=>{ if(commentDraft.trim()){ addComment(mk,commentDraft.trim()); setCommentDraft(""); } }} disabled={!commentDraft.trim()} style={{ background:commentDraft.trim()?Y+"15":"#f5f5f5", border:"1px solid "+(commentDraft.trim()?Y+"25":"#eee"), color:commentDraft.trim()?Y:"#cbd5e1", padding:"9px 16px", borderRadius:8, cursor:commentDraft.trim()?"pointer":"default", fontSize:12, fontWeight:700 }}>Post</button>
    </div>
  </div>
);})()}
<div style={{ display:"flex", justifyContent:"space-between", marginTop:36, paddingTop:20, borderTop:"1px solid #f0f0f0" }}><button onClick={goPrev} disabled={activeStep===0} style={{ background:"#f0f0f0", border:"1px solid #eee", color:activeStep===0?"#e2e8f0":"#64748b", padding:"10px 20px", borderRadius:10, cursor:activeStep===0?"default":"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5, opacity:activeStep===0?0.5:1 }}><I name="chevLeft" size={14} /> Previous</button><button onClick={goNext} style={{ background:c+"20", border:"1px solid "+c+"30", color:c, padding:"10px 20px", borderRadius:10, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>{activeStep<totalSteps-1?"Mark Complete & Next":"Complete"} <I name="chevRight" size={14} color={c} /></button></div></div></div>);
};

return (<div style={{ display:"flex", flexDirection:mob?"column":"row", minHeight:"calc(100vh - 120px)" }}>{mob&&(<button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 18px", background:"#f8f8f6", border:"none", borderBottom:"1px solid "+BORDER, color:c, cursor:"pointer", fontSize:12, fontWeight:700, width:"100%" }}><I name={sidebarOpen?"chevUp":"menu"} size={14} color={c} /> {sidebarOpen?"Hide Steps":"Step "+(activeStep+1)+"/"+totalSteps}</button>)}{(sidebarOpen||!mob)&&<Sidebar />}<MainContent /></div>);
}

// CATALOG VIEW
return (<div style={{ padding: mob ? "24px 16px 40px" : "32px 40px 50px", margin: "0 auto" }}>
<PinModal />
<FlagModal />
<NamePrompt />
{/* Training Portal Header */}
<div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)", borderRadius: 12, border: "1px solid #bbf7d0", padding: mob ? "28px 20px" : "36px 40px", marginBottom: 28, position: "relative", overflow: "hidden" }}>
<div style={{ display: "flex", alignItems: mob ? "flex-start" : "center", gap: mob ? 16 : 32, flexDirection: mob ? "column" : "row" }}>
<div style={{ flex: 1 }}><div style={{ fontSize: 10, fontWeight: 700, color: "#059669", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Spark Learning</div><div style={{ fontSize: mob ? 22 : 28, fontWeight: 700, color: "#065f46", marginBottom: 8 }}>Training Portal</div><div style={{ fontSize: 14, color: "#94a3b8" }}>Courses, quizzes, and certifications.</div></div>
{(() => { const allProgs = filteredSections.map(s => getSubjectProgress(s)); const totalDone = allProgs.reduce((s,p) => s + p.done, 0); const totalAll = allProgs.reduce((s,p) => s + p.total, 0); const overallPct = totalAll > 0 ? Math.round(totalDone / totalAll * 100) : 0; const completedSubjects = allProgs.filter(p => p.pct === 100).length; const r = 44; const circ = 2 * Math.PI * r; const offset = circ - (overallPct / 100) * circ; return (<div style={{ display: "flex", alignItems: "center", gap: 20 }}><div style={{ position: "relative", width: 100, height: 100 }}><svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r={r} fill="none" stroke="rgba(5,150,105,0.15)" strokeWidth="8" /><circle cx="50" cy="50" r={r} fill="none" stroke="#059669" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.8s ease" }} /></svg><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: "#065f46" }}>{overallPct}%</div><div style={{ fontSize: 8, fontWeight: 600, color: "#059669" }}>COMPLETE</div></div></div><div><div style={{ fontSize: 13, color: "#065f46", fontWeight: 700 }}>{completedSubjects}/{filteredSections.length} subjects</div><div style={{ fontSize: 11, color: "#047857", marginTop: 4 }}>{totalDone}/{totalAll} steps</div></div></div>); })()}
</div></div>
<div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}><SectionHeader icon="book" title="Subjects" subtitle="Click into a subject to start learning" /><button onClick={() => adminMode ? setAdminMode(false) : setShowPinModal(true)} style={{ background: adminMode ? Y + "12" : "#f5f5f5", border: "1px solid " + (adminMode ? Y + "25" : "#eee"), color: adminMode ? Y : "#94a3b8", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, marginBottom: 32 }}><I name={adminMode ? "x" : "shield"} size={13} /> {adminMode ? "Exit Admin" : "Admin"}</button></div>
{/* Role Filter */}
<div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#b0b8c4", marginRight: 4 }}>MY ROLE:</span>{ROLE_GROUPS.map(g => (<button key={g} onClick={() => { saveGroup(g); setFilterGroup(g === userGroup && filterGroup === g ? "all" : g); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid " + (userGroup === g ? "#2ecc7130" : "#f0f0f0"), background: userGroup === g ? "#2ecc7110" : "#fafafa", color: userGroup === g ? "#2ecc71" : "#94a3b8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{g}</button>))}<div style={{ flex: 1 }} /><button onClick={() => setFilterGroup(filterGroup === "all" ? userGroup : "all")} style={{ fontSize: 10, fontWeight: 600, color: filterGroup !== "all" ? Y : "#b0b8c4", background: filterGroup !== "all" ? Y + "10" : "#f8f8f8", border: "1px solid " + (filterGroup !== "all" ? Y + "20" : "#f0f0f0"), padding: "5px 12px", borderRadius: 8, cursor: "pointer" }}>{filterGroup !== "all" ? "Showing: " + filterGroup : "Show: All"}</button></div>
{/* Admin bar */}
{adminMode && (<Reveal><div style={{ marginBottom: 20, padding: 18, background: Y + "06", border: "1px dashed " + Y + "25", borderRadius: 10 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}><div><div style={{ fontSize: 13, fontWeight: 700, color: Y }}>Admin Mode Active</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Custom subjects sync to all team members.</div></div><div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{(() => { const pending = stepFlags.filter(f => !f.resolved).length; return (<button onClick={() => { setShowHealthPanel(!showHealthPanel); setShowTeamPanel(false); }} style={{ background: pending > 0 ? "#fef3c7" : "#fff", border: "1px solid " + (pending > 0 ? "#fde68a" : "#eee"), color: pending > 0 ? "#92400e" : "#64748b", padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><I name="info" size={14} color={pending > 0 ? "#92400e" : "#64748b"} /> Content Health{pending > 0 && <span style={{ background: "#dc2626", color: "#fff", padding: "1px 7px", borderRadius: 10, fontSize: 10 }}>{pending}</span>}</button>); })()}<button onClick={() => { setShowTeamPanel(!showTeamPanel); setShowHealthPanel(false); }} style={{ background: "#fff", border: "1px solid #eee", color: "#64748b", padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><I name="users" size={14} color="#64748b" /> Team Progress</button><button onClick={() => { setEditingSubject(null); setEditorOpen(true); }} style={{ background: Y + "15", border: "1px solid " + Y + "25", color: Y, padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}><I name="zap" size={14} color={Y} /> New Subject</button></div></div>{showHealthPanel && (<div style={{ marginTop: 16, padding: 16, background: "#fff", borderRadius: 10, border: "1px solid #f0f0f0" }}>
{/* Pending flags */}
<div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><I name="info" size={13} color="#d97706" /> Pending flags ({stepFlags.filter(f => !f.resolved).length})</div>
{stepFlags.filter(f => !f.resolved).length === 0 ? (<div style={{ fontSize: 12, color: "#94a3b8", padding: "12px 0" }}>No flags pending. Content looks healthy.</div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>{stepFlags.filter(f => !f.resolved).map(f => (<div key={f.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px" }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><div style={{ flex: 1 }}><div style={{ fontSize: 10, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 }}>{f.sectionCat} · {f.itemName}</div><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{f.stepHeading}</div><div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>{f.reason}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>Flagged by {f.by} · {new Date(f.at).toLocaleDateString()}</div></div><button onClick={() => resolveFlag(f.id)} style={{ background: "#ecfdf5", border: "1px solid #86efac", color: "#059669", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>Resolve</button></div></div>))}</div>)}
{/* Low-rated steps */}
{(() => { const lowRated = Object.entries(stepRatings).filter(([k,v]) => v.down > v.up && v.down >= 1); return lowRated.length > 0 && (<><div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>👎 Low-rated steps ({lowRated.length})</div><div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>{lowRated.map(([k,v]) => { const [si, ii, idx] = k.split("-").map(Number); const sec = allSections.find(s => s._idx === si); const it = sec?.items?.[ii]; const stp = it && getSteps(it)[idx]; return sec && it && stp ? (<div key={k} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", display:"flex", alignItems:"center", gap:8 }}><div style={{ flex: 1 }}><div style={{ fontSize: 10, color: "#991b1b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{sec.cat} · {it.name}</div><div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{stp.heading}</div></div><div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700 }}>👍 {v.up} / 👎 {v.down}</div></div>) : null; })}</div></>); })()}
{/* Resolved flags collapsed summary */}
{stepFlags.filter(f => f.resolved).length > 0 && (<div style={{ fontSize: 11, color: "#94a3b8", paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>{stepFlags.filter(f => f.resolved).length} resolved flag{stepFlags.filter(f => f.resolved).length !== 1 ? "s" : ""} in history</div>)}
</div>)}
{/* === TEAM PROGRESS DASHBOARD === */}
{showTeamPanel && (() => {
  // Compute progress per person from activity log
  const totalRequiredSteps = filteredSections.reduce((sum, s) => sum + s.items.reduce((sum2, it) => sum2 + getSteps(it).length, 0), 0);
  const totalRequiredQuizzes = filteredSections.reduce((sum, s) => sum + s.items.filter(it => it.quiz).length, 0);
  // Build per-user stats from log
  const byUser = {};
  activityLog.forEach(ev => {
    if (!byUser[ev.by]) byUser[ev.by] = { stepsDone: new Set(), quizzesPassed: new Set(), lastActivity: ev.at };
    if (ev.type === "step_done") byUser[ev.by].stepsDone.add(`${ev.sectionIdx}-${ev.itemIdx}-${ev.stepIdx}`);
    if (ev.type === "quiz_passed") byUser[ev.by].quizzesPassed.add(ev.cat);
    if (ev.at > byUser[ev.by].lastActivity) byUser[ev.by].lastActivity = ev.at;
  });
  // Build manager-direct-report tree
  const myReports = TEAM_ROSTER.filter(p => p.manager === userName);
  // Ensure even people with no activity still show up
  const allShownPeople = TEAM_ROSTER.map(p => ({ ...p, stats: byUser[p.name] || { stepsDone: new Set(), quizzesPassed: new Set(), lastActivity: null } }));
  return (<div style={{ marginTop: 16, padding: 16, background: "#fff", borderRadius: 10, border: "1px solid #f0f0f0" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}><I name="users" size={14} color="#1a1a2e" /> Team Progress</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Live data from {activityLog.length} activity records · viewing as {userName}</div>
      </div>
      {myReports.length > 0 && <div style={{ background: Y+"12", border: "1px solid "+Y+"25", color: Y, padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{myReports.length} direct report{myReports.length !== 1 ? "s" : ""}</div>}
    </div>
    {/* My direct reports first if any */}
    {myReports.length > 0 && (<>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>My direct reports</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {myReports.map(p => { const s = byUser[p.name] || { stepsDone: new Set(), quizzesPassed: new Set(), lastActivity: null }; const stepsPct = totalRequiredSteps > 0 ? Math.round(s.stepsDone.size / totalRequiredSteps * 100) : 0; const quizPct = totalRequiredQuizzes > 0 ? Math.round(s.quizzesPassed.size / totalRequiredQuizzes * 100) : 0; const stale = s.lastActivity && (Date.now() - new Date(s.lastActivity).getTime()) > 7*24*60*60*1000; return (<div key={p.name} style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ flex: "1 1 200px", minWidth: 180 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{p.name}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>{p.role} · {p.div}</div></div><div style={{ flex: "0 0 auto", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}><div style={{ minWidth: 100 }}><div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 }}>STEPS</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ flex: 1, height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", minWidth: 60 }}><div style={{ height: "100%", width: stepsPct+"%", background: stepsPct === 100 ? "#059669" : Y, borderRadius: 3 }} /></div><span style={{ fontSize: 11, fontWeight: 700, color: stepsPct === 100 ? "#059669" : "#1a1a2e", minWidth: 30 }}>{stepsPct}%</span></div></div><div style={{ minWidth: 100 }}><div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 }}>QUIZZES</div><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ flex: 1, height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", minWidth: 60 }}><div style={{ height: "100%", width: quizPct+"%", background: quizPct === 100 ? "#059669" : "#4ECDC4", borderRadius: 3 }} /></div><span style={{ fontSize: 11, fontWeight: 700, color: quizPct === 100 ? "#059669" : "#1a1a2e", minWidth: 30 }}>{quizPct}%</span></div></div><div style={{ fontSize: 10, color: stale ? "#dc2626" : "#94a3b8", fontWeight: stale ? 700 : 500 }}>{s.lastActivity ? (stale ? "⚠ Stale: " : "") + new Date(s.lastActivity).toLocaleDateString() : "No activity yet"}</div></div></div>); })}
      </div>
    </>)}
    {/* Everyone else */}
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>All team members</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {allShownPeople.filter(p => !myReports.find(r => r.name === p.name)).map(p => { const s = p.stats; const stepsPct = totalRequiredSteps > 0 ? Math.round(s.stepsDone.size / totalRequiredSteps * 100) : 0; const quizPct = totalRequiredQuizzes > 0 ? Math.round(s.quizzesPassed.size / totalRequiredQuizzes * 100) : 0; return (<div key={p.name} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#475569", flexWrap: "wrap" }}><div style={{ flex: "1 1 180px", minWidth: 140 }}><span style={{ fontWeight: 600, color: "#1a1a2e" }}>{p.name}</span><span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 10 }}>{p.role}</span></div><div style={{ display: "flex", gap: 14 }}><span>Steps: <b style={{ color: stepsPct === 100 ? "#059669" : "#1a1a2e" }}>{stepsPct}%</b></span><span>Quizzes: <b style={{ color: quizPct === 100 ? "#059669" : "#1a1a2e" }}>{quizPct}%</b></span></div></div>); })}
    </div>
    <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 12, paddingTop: 10, borderTop: "1px solid #f0f0f0", lineHeight: 1.5 }}>Note: progress data is gathered from completion events shared across the team. New users won't appear until they complete their first step.</div>
  </div>);
})()}</div></Reveal>)}
{/* Subject Cards */}
<div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 16 }}>{filteredSections.map((section, si) => { const c = secColors[section._idx % secColors.length]; const prog = getSubjectProgress(section); const isAssigned = section.assignedGroups?.includes(userGroup); return (<Reveal key={section._idx} delay={si * 0.04}><div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, overflow: "hidden", cursor: "pointer" }} onMouseOver={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseOut={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}><div style={{ height: 3, background: c }} /><div style={{ padding: mob ? "16px 16px 18px" : "20px 22px 22px" }}><div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}><div style={{ width: 44, height: 44, borderRadius: 12, background: c + "10", display: "flex", alignItems: "center", justifyContent: "center" }}><I name={section.icon} size={20} color={c} /></div><div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>{section.cat}</span>{isAssigned && <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "3px 8px", borderRadius: 6 }}>REQUIRED</span>}{section._type === "custom" && <span style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "3px 8px", borderRadius: 6 }}>CUSTOM</span>}</div><div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>{section.items.length} topic{section.items.length !== 1 ? "s" : ""} · {prog.total} steps</div></div>{prog.pct === 100 && <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}><I name="check" size={14} color="#fff" sw={2.5} /></div>}</div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}><div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: Math.max(prog.pct, 0) + "%", background: prog.pct === 100 ? "#059669" : c, borderRadius: 3, transition: "width 0.4s" }} /></div><span style={{ fontSize: 13, fontWeight: 700, color: prog.pct === 100 ? "#059669" : prog.pct > 0 ? c : "#cbd5e1" }}>{prog.pct}%</span></div><div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>{section.items.slice(0, 4).map((item, ii) => { const steps = getSteps(item); const done = steps.filter((_, idx) => isStepDone(section._idx, ii, idx)).length; const allDone = done === steps.length && steps.length > 0; return (<button key={ii} onClick={() => { if (steps.length > 0) { setActiveCourse({ sectionIdx: section._idx, itemIdx: ii }); setActiveStep(0); setQuizState({idx:0,answers:[],score:null,active:false}); } else if (item.url) window.open(item.url,"_blank"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: allDone ? "#f0fdf4" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", color: "#1a1a2e", width: "100%" }} onMouseOver={e => { if(!allDone) e.currentTarget.style.background = "#f8fafc"; }} onMouseOut={e => { if(!allDone) e.currentTarget.style.background = "transparent"; }}><div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: allDone ? "#059669" : "#f1f5f9", border: allDone ? "none" : "1.5px solid #e2e8f0" }}>{allDone ? <I name="check" size={12} color="#fff" sw={2.5} /> : <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{ii + 1}</span>}</div><span style={{ fontSize: 13, fontWeight: 500, color: allDone ? "#059669" : "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: allDone ? "line-through" : "none" }}>{item.name}</span>{steps.length > 0 && <span style={{ fontSize: 11, color: "#cbd5e1" }}>{done}/{steps.length}</span>}</button>); })}{section.items.length > 4 && <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 42 }}>+{section.items.length - 4} more</div>}</div><button onClick={() => { const fi = section.items.findIndex(it => getSteps(it).length > 0); if (fi >= 0) { setActiveCourse({ sectionIdx: section._idx, itemIdx: fi }); setActiveStep(0); } }} style={{ width: "100%", background: prog.pct === 100 ? "#f0fdf4" : c + "0c", border: "1px solid " + (prog.pct === 100 ? "#bbf7d0" : c + "20"), color: prog.pct === 100 ? "#059669" : c, padding: "11px 0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{prog.pct > 0 && prog.pct < 100 ? "Continue" : prog.pct === 100 ? "Review" : "Start Subject"} <I name="chevRight" size={14} color={prog.pct === 100 ? "#059669" : c} /></button></div></div></Reveal>); })}</div>
</div>);
}

function TeamPage({ w }) {
const mob = w < 768;
const [selectedPerson, setSelectedPerson] = useState(null);
const [searchTerm, setSearchTerm] = useState("");
const [expandedNodes, setExpandedNodes] = useState({"aaron":true,"dave":true,"allie":true});
const [viewMode, setViewMode] = useState("chart");
const [hoverNode, setHoverNode] = useState(null);
const toggle = id => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));

const ORG = {
id:"aaron",name:"Aaron Opalewski",title:"Chief Executive Officer",entity:"Spark Companies",email:"aopalewski@sparkcompanies.com",phone:"(586) 864-3746",color:"#FFD200",
children:[
{id:"dave",name:"Dave Veres",title:"Executive VP / COO",entity:"Spark Companies",email:"dveres@sparkcompanies.com",color:"#FF6B35",tag:"EXECUTIVE",children:[
{id:"jamie",name:"Jamie Platt",title:"Director — MI Metro",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO",children:[
{id:"chuck",name:"Chuck Chesner",title:"Sr. Sales Executive — PC",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"aidan",name:"Aidan Juengel",title:"Executive Recruiter",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"alec",name:"Alec Czartoyski",title:"ARM Level II",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"benjamin",name:"Benjamin Ockerman",title:"Recruiter",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"charles",name:"Charles Hemstrom",title:"ARM Level II",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"cj",name:"CJ Olaniyan",title:"ARM Level II",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"colin",name:"Colin Clancy",title:"Account Recruiting Executive",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"robert",name:"Robert Laing",title:"Sr. ARE",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"anja",name:"Anja Domazet",title:"Sr. ARE — PC",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
{id:"scott_t",name:"Scott Tanghe",title:"Recruiter",entity:"Spark Talent",color:"#FFD200",tag:"MI METRO"},
]},
{id:"fletcher",name:"Fletcher Kundtz",title:"Director — Technical Sales",entity:"Spark Talent",color:"#E84393",tag:"TALENT",children:[{id:"aron",name:"Aron Carroll",title:"Sr. ARE",entity:"Spark Talent",color:"#E84393",tag:"TALENT"}]},
{id:"kristinv",name:"Kristin Voyer",title:"Sr. Director — Enterprise",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE",children:[
{id:"kristins",name:"Kristin Scarth",title:"Sr. Director",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"claire",name:"Claire Woodrow",title:"ARM Level II",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"sam",name:"Samantha Webb",title:"Technical ARE",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"sara_w",name:"Sara Woods",title:"ARM Level II",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"ian",name:"Ian Shiemke",title:"ARM Level II",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"theresa",name:"Theresa Ferencz",title:"Sr. Recruiter",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"brittney",name:"Brittney Bowman",title:"ARM Level II",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
{id:"samantha_b",name:"Samantha Ban",title:"Technical Recruiter II",entity:"Spark Talent",color:"#7C5CFC",tag:"ENTERPRISE"},
]},
{id:"ryan",name:"Ryan Aymen",title:"VP — ARM",entity:"Spark Talent",email:"raymen@sparkcompanies.com",color:"#4ECDC4",tag:"AUTOMATION",children:[
{id:"jennifer",name:"Jennifer Shy",title:"ARM Level II",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION",children:[{id:"anthony",name:"Anthony Caucci",title:"Recruiter",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION"},{id:"chris_b",name:"Chris Bull",title:"Recruiter",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION"},{id:"corsean",name:"Cor'sean Woodard",title:"Recruiter",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION"}]},
{id:"julie",name:"Julie Rinaldi",title:"President — Flex",entity:"Flex Workforce Solutions",color:"#4ECDC4",tag:"FLEX",children:[{id:"nathan",name:"Nathan Edmiston",title:"Sr. Technical Recruiter",entity:"Flex Workforce Solutions",color:"#4ECDC4",tag:"FLEX"}]},
{id:"christina",name:"Christina Getz",title:"Sr. Recruiter",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION"},
{id:"nick",name:"Nick Greenfelder",title:"ARM Level I",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION"},
{id:"sean",name:"Sean Casey",title:"ARM — PC",entity:"Spark Talent",color:"#4ECDC4",tag:"AUTOMATION"},
]},
{id:"jacob_p",name:"Jacob Patrico",title:"Sr. Director — Fulfillment",entity:"Spark Talent",color:"#FF6B35",tag:"FULFILLMENT",children:[
{id:"jacob_r",name:"Jacob Roux",title:"VMS ARM",entity:"Spark Talent",color:"#FF6B35",tag:"FULFILLMENT"},
{id:"luke",name:"Luke Oliver",title:"Sr. Recruiter",entity:"Spark Talent",color:"#FF6B35",tag:"FULFILLMENT"},
{id:"brandon",name:"Brandon Shrewsberry",title:"Sr. Recruiter",entity:"Spark Talent",color:"#FF6B35",tag:"FULFILLMENT"},
{id:"jamie_b",name:"Jamie Bell",title:"Executive Recruiter",entity:"Spark Talent",color:"#FF6B35",tag:"FULFILLMENT"},
{id:"kade",name:"Kade Manzo",title:"Recruiter",entity:"Spark Talent",color:"#FF6B35",tag:"FULFILLMENT"},
]},
{id:"darrell",name:"Darrell Templeton",title:"Sr. Director — National",entity:"Spark Talent",color:"#E84393",tag:"NATIONAL",children:[{id:"sarah_k",name:"Sarah Keel",title:"ARE",entity:"Spark Talent",color:"#E84393",tag:"NATIONAL"}]},
{id:"lauren",name:"Lauren Camill",title:"BD Lead",entity:"Spark Companies",color:"#FF3366",tag:"BD"},
{id:"kevin",name:"Kevin MacKillop",title:"Sr. Director — BD",entity:"Ignite Search",color:"#FF3366",tag:"IGNITE",children:[{id:"carlin",name:"Carlin McCrimmon",title:"Account Executive",entity:"Ignite Search",color:"#FF3366",tag:"IGNITE"}]},
{id:"jenny",name:"Jennifer Neuenfeldt",title:"Sr. Talent Advisor",entity:"John Joseph Partners",color:"#9b59b6",tag:"JJP"},
]},
{id:"allie",name:"Allie Spegel",title:"VP of Operations",entity:"Spark Companies",email:"aspegel@sparkcompanies.com",phone:"(248) 632-3560",color:"#4ECDC4",tag:"BACK OFFICE",children:[
{id:"priyanka",name:"Priyanka Malani",title:"Payroll Manager",entity:"Spark Companies",email:"pmalani@sparkcompanies.com",color:"#2ecc71",tag:"PAYROLL"},
{id:"erica",name:"Erica Ursitti",title:"Payroll Specialist",entity:"Spark Companies",color:"#2ecc71",tag:"PAYROLL"},
{id:"tamika",name:"Tamika Coleman",title:"HR Lead",entity:"Spark Companies",email:"tcoleman@sparkcompanies.com",color:"#FF3366",tag:"HR"},
{id:"maryam",name:"Maryam Odeesh",title:"HR Generalist",entity:"Spark Companies",color:"#FF3366",tag:"HR"},
{id:"mary",name:"Mary Patrico",title:"Sr. Operations Manager",entity:"Spark Companies",email:"mpatrico@sparkcompanies.com",color:"#FF6B35",tag:"OPS"},
{id:"chad",name:"Chad Opalewski",title:"Data Analyst",entity:"Spark Companies",color:"#7C5CFC",tag:"OPS"},
{id:"anna",name:"Anna Opalewski",title:"Operations Manager",entity:"Spark Companies",color:"#FF6B35",tag:"OPS"},
{id:"bedros",name:"Bedros Naama",title:"AR Specialist",entity:"Spark Companies",color:"#FF6B35",tag:"ACCOUNTING"},
]},
]};

const flat = []; const walkTree = (node, parent = null, depth = 0) => { flat.push({ ...node, _parent: parent, _depth: depth }); if (node.children) node.children.forEach(c => walkTree(c, node, depth + 1)); }; walkTree(ORG);
const totalPeople = flat.length;
const countAll = (node) => { let c = 0; if (node.children) { c = node.children.length; node.children.forEach(ch => c += countAll(ch)); } return c; };
const searchResults = searchTerm.length>1 ? flat.filter(p=> p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.title.toLowerCase().includes(searchTerm.toLowerCase())) : [];

const OrgCard = ({ person, depth = 0 }) => {
const hasKids = person.children && person.children.length > 0;
const isExpanded = expandedNodes[person.id]; const isSelected = selectedPerson?.id === person.id;
const initials = person.name.split(" ").map(n => n[0]).join("").slice(0,2);
const c = person.color; const avSz = depth===0?52:depth===1?44:depth===2?38:32;
const mL = mob ? Math.min(depth*20,60) : Math.min(depth*32,160);
return (<div><div onClick={()=>setSelectedPerson(isSelected?null:person)} onMouseOver={()=>setHoverNode(person.id)} onMouseOut={()=>setHoverNode(null)} style={{ display:"flex", alignItems:"center", gap:mob?10:14, padding:mob?"10px 12px":depth<=1?"14px 18px":"10px 14px", cursor:"pointer", marginBottom:2, marginLeft:mL, background:isSelected?c+"14":hoverNode===person.id?"#f8f8f8":"transparent", border:"1px solid "+(isSelected?c+"35":"transparent"), borderRadius:12 }}><div style={{width:avSz,height:avSz,borderRadius:depth<=1?14:"50%",flexShrink:0,background:depth===0?c:c+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:avSz*0.3,fontWeight:800,color:depth===0?"#f7f7f5":c}}>{initials}</div><div style={{ flex:1 }}><div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}><span style={{ fontSize:depth<=1?15:13, fontWeight:depth<=1?800:600, color:"#1a1a2e" }}>{person.name}</span>{person.tag && depth>0 && <span style={{ fontSize:8, fontWeight:800, color:c, background:c+"12", padding:"2px 7px", borderRadius:4 }}>{person.tag}</span>}</div><div style={{ fontSize:Math.max(10,12-depth), color:"#94a3b8", marginTop:2 }}>{person.title}</div></div>{hasKids && (<button onClick={e=>{e.stopPropagation();toggle(person.id);}} style={{ background:isExpanded?c+"15":"#f5f5f5", border:"1px solid "+(isExpanded?c+"25":"#f0f0f0"), borderRadius:8, minWidth:32, height:28, display:"flex", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", color:isExpanded?c:"#94a3b8", fontSize:10, fontWeight:700, padding:"0 8px" }}><span>{countAll(person)}</span><I name={isExpanded?"chevUp":"chevDown"} size={10} /></button>)}</div>
{isSelected && person.email && (<div style={{ marginLeft:mL+32, padding:"10px 16px", marginBottom:6, background:c+"08", borderRadius:"0 0 12px 12px" }}><div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>{person.email && <a href={`mailto:${person.email}`} style={{ fontSize:11, color:c, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4, background:c+"08", padding:"4px 10px", borderRadius:6 }}><I name="mail" size={11} color={c} /> {person.email}</a>}{person.phone && <a href={`tel:${person.phone}`} style={{ fontSize:11, color:"#FF6B35", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4, background:"rgba(255,107,53,0.08)", padding:"4px 10px", borderRadius:6 }}><I name="phone" size={11} color="#FF6B35" /> {person.phone}</a>}</div></div>)}
{hasKids && isExpanded && (<div style={{ borderLeft:"2px solid "+c+"12", marginLeft:mL+(mob?16:25), paddingTop:2 }}>{person.children.map(child=><OrgCard key={child.id} person={child} depth={depth+1} />)}</div>)}
</div>);
};

return (<div style={{ padding:mob?"24px 14px 40px":"36px 36px 50px", maxWidth:1100, margin:"0 auto" }}>
<div style={{ marginBottom:28 }}><h2 style={{ fontSize:mob?22:28, fontWeight:700, color:"#1a1a2e", margin:0 }}>People</h2><div style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>{totalPeople} team members across Spark Companies</div></div>
<div style={{ marginBottom:16, position:"relative", zIndex:20 }}><div style={{ display:"flex", alignItems:"center", gap:10, background:"#f8f8f8", border:"1px solid #eee", borderRadius:searchResults.length>0?"12px 12px 0 0":12, padding:"12px 16px" }}><I name="search" size={16} color="#cbd5e1" /><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search name or title..." style={{ background:"none", border:"none", color:"#1a1a2e", fontSize:13, flex:1, outline:"none", fontFamily:"inherit" }} />{searchTerm && <button onClick={()=>setSearchTerm("")} style={{ background:"#f0f0f0", border:"none", color:"#94a3b8", cursor:"pointer", padding:"4px 8px", borderRadius:6, fontSize:10 }}>Clear</button>}</div>{searchResults.length>0 && (<div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #eee", borderTop:"none", borderRadius:"0 0 12px 12px", maxHeight:280, overflow:"auto" }}>{searchResults.map(p=>(<button key={p.id} onClick={()=>{setSelectedPerson(p);setSearchTerm("");}} style={{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #f8f8f8", color:"#1a1a2e", padding:"10px 14px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:12 }}><div style={{ width:32, height:32, borderRadius:10, background:p.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:p.color }}>{p.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{p.name}</div><div style={{fontSize:10,color:"#b0b8c4"}}>{p.title}</div></div></button>))}</div>)}</div>
<div style={{ display:"flex", gap:6, marginBottom:12 }}>{[{v:"chart",icon:"layers",label:"Org Chart"},{v:"directory",icon:"grid",label:"Directory"}].map(m=>(<button key={m.v} onClick={()=>setViewMode(m.v)} style={{ background:viewMode===m.v?Y+"10":"#f5f5f5", border:"1px solid "+(viewMode===m.v?Y+"20":"#f0f0f0"), color:viewMode===m.v?Y:"#94a3b8", padding:"8px 16px", cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:6, borderRadius:8 }}><I name={m.icon} size={13} />{m.label}</button>))}</div>
{viewMode==="chart" && (<Card style={{ padding:mob?10:16, overflow:"auto", background:"#fafafa" }}><OrgCard person={ORG} depth={0} /></Card>)}
{viewMode==="directory" && (<div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"repeat(3,1fr)", gap:10 }}>{flat.sort((a,b)=>(a._depth||0)-(b._depth||0)).map((person,i)=>{ const c=person.color; const initials=person.name.split(" ").map(n=>n[0]).join("").slice(0,2); return (<Reveal key={person.id} delay={Math.min(i*0.02,0.4)}><div onClick={()=>setSelectedPerson(selectedPerson?.id===person.id?null:person)} style={{ background:selectedPerson?.id===person.id?c+"12":GLASS, border:"1px solid "+(selectedPerson?.id===person.id?c+"30":BORDER), borderRadius:14, padding:16, cursor:"pointer" }}><div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:c, opacity:0.5 }} /><div style={{ display:"flex", gap:12 }}><div style={{ width:40, height:40, borderRadius:12, background:c+"25", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:c }}>{initials}</div><div><div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>{person.name}</div><div style={{fontSize:10,color:"#94a3b8"}}>{person.title}</div>{person.tag&&<span style={{fontSize:8,fontWeight:800,color:c,background:c+"12",padding:"2px 6px",borderRadius:4}}>{person.tag}</span>}</div></div>{selectedPerson?.id===person.id && person.email && (<div style={{marginTop:12,paddingTop:10,borderTop:"1px solid "+c+"15"}}><a href={"mailto:"+person.email} onClick={e=>e.stopPropagation()} style={{fontSize:10,color:c,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3,background:c+"08",padding:"3px 8px",borderRadius:5}}><I name="mail" size={10} color={c} /> {person.email}</a></div>)}</div></Reveal>); })}</div>)}
<div style={{ marginTop:36 }}><div style={{ fontSize:10, fontWeight:800, letterSpacing:2, color:Y, marginBottom:12, textTransform:"uppercase" }}>Division Profiles</div><div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:10 }}>{DIVISIONS.map((d,i)=>(<Reveal key={i} delay={i*0.04}><Card style={{ borderLeft:"3px solid "+d.color }}><div style={{fontSize:14,fontWeight:800,marginBottom:4}}>{d.name}</div><div style={{fontSize:11,color:"#94a3b8",lineHeight:1.5,marginBottom:8}}>{d.desc}</div><div style={{display:"flex",gap:12,fontSize:10,color:"#cbd5e1"}}><span>Est. {d.founded}</span><a href={d.url} target="_blank" rel="noopener noreferrer" style={{color:d.color,textDecoration:"none",fontWeight:700}}>Visit <I name="ext" size={8} color={d.color} /></a></div></Card></Reveal>))}</div></div>
</div>);
}

/* ────── MAIN APP ────── */

const THEME_VARS = {
dark: {"--bg":"#0c0a06","--text":"#fff"},
light: {"--bg":"#f5f5f0","--text":"#1a1a2e"},
};

function AdminPage({ w, setTab, adminMode }) {
const [view, setView] = useState("overview");
const mob = w < 900;

const [stats, setStats] = useState({ flags: 0, comments: 0, lowRated: 0, stale: 0, activeUsers: 0, completion: 0, stepsTotal: 0, customSubjects: 0 });
const [needsAttention, setNeedsAttention] = useState([]);
const [recentActivity, setRecentActivity] = useState([]);
const [teamSummary, setTeamSummary] = useState([]);

useEffect(() => { (async () => { try {
  if (!window.storage) return;
  const f = await window.storage.get("spark-hq-step-flags", true);
  const c = await window.storage.get("spark-hq-module-comments", true);
  const r = await window.storage.get("spark-hq-step-ratings", true);
  const s = await window.storage.get("spark-hq-custom-subjects", true);
  const a = await window.storage.get("spark-hq-activity-log", true);

  const flags = f?.value ? JSON.parse(f.value) : [];
  const pendingFlags = flags.filter(x => !x.resolved);
  const comments = c?.value ? Object.values(JSON.parse(c.value)).flat() : [];
  const ratings = r?.value ? JSON.parse(r.value) : {};
  const lowRated = Object.values(ratings).filter(x => x.down > x.up && x.down > 0).length;
  const activity = a?.value ? JSON.parse(a.value) : [];
  const customSubjects = s?.value ? JSON.parse(s.value).length : 0;

  const last7 = activity.filter(e => Date.now() - new Date(e.at).getTime() < 7*24*60*60*1000);
  const activeUserSet = new Set(last7.map(e => e.by));

  const byUser = {};
  activity.forEach(ev => {
    if (!byUser[ev.by]) byUser[ev.by] = { stepsDone: 0, lastActivity: ev.at };
    if (ev.type === "step_done") byUser[ev.by].stepsDone++;
    if (ev.at > byUser[ev.by].lastActivity) byUser[ev.by].lastActivity = ev.at;
  });
  const stale = TEAM_ROSTER.filter(p => {
    const u = byUser[p.name];
    if (!u) return true;
    return Date.now() - new Date(u.lastActivity).getTime() > 7*24*60*60*1000;
  }).length;

  const totalPossibleSteps = TEAM_ROSTER.length * 50;
  const totalStepsDone = Object.values(byUser).reduce((s, u) => s + u.stepsDone, 0);
  const completion = totalPossibleSteps > 0 ? Math.round((totalStepsDone / totalPossibleSteps) * 100) : 0;

  setStats({
    flags: pendingFlags.length,
    comments: comments.length,
    lowRated,
    stale,
    activeUsers: activeUserSet.size,
    completion: Math.min(100, completion),
    stepsTotal: totalStepsDone,
    customSubjects,
  });

  setNeedsAttention(pendingFlags.slice(0, 3).map(flag => ({
    id: flag.id, title: `${flag.itemName} · ${flag.stepHeading || "step"}`, sub: `${flag.by} · ${timeAgo(flag.at)}`, reason: flag.reason, type: "flag"
  })));

  setRecentActivity(activity.slice(0, 8).map(e => ({
    by: e.by, action: e.type === "step_done" ? "completed step" : e.type === "quiz_passed" ? "passed quiz" : "did something", target: e.step || e.cat || "", at: e.at
  })));

  const teams = {};
  TEAM_ROSTER.forEach(p => {
    const mgr = p.manager || "Independent";
    if (!teams[mgr]) teams[mgr] = { members: [], totalSteps: 0, stale: 0 };
    teams[mgr].members.push(p);
    const u = byUser[p.name];
    if (u) teams[mgr].totalSteps += u.stepsDone;
    if (!u || Date.now() - new Date(u.lastActivity).getTime() > 7*24*60*60*1000) teams[mgr].stale++;
  });
  setTeamSummary(Object.entries(teams).slice(0, 4).map(([mgr, t]) => ({
    manager: mgr, count: t.members.length, avgSteps: Math.round(t.totalSteps / Math.max(1, t.members.length)), stale: t.stale
  })));
} catch(e){ console.warn("Admin data load failed:", e); } })(); }, []);

if (!adminMode) {
  return (<div style={{ padding: 60, textAlign: "center" }}>
    <div style={{ width: 60, height: 60, borderRadius: 14, background: Y+"12", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
      <I name="shield" size={28} color={Y} />
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Admin access required</div>
    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>Unlock admin mode to manage Spark HQ.</div>
    <button onClick={() => setTab("home")} style={{ background: "#fff", border: "1px solid #eee", color: "#64748b", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>← Back to Home</button>
  </div>);
}

const greeting = (() => { const h = new Date().getHours(); if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; return "Good evening"; })();
const profile = window.__sparkHQProfile;
const displayName = profile?.first_name || profile?.full_name?.split(" ")[0] || "there";

const inboxItems = [
  { id: "overview", label: "Overview", icon: "home", count: stats.flags + stats.comments + stats.lowRated + stats.stale, accent: Y },
  { id: "flags", label: "Flags", icon: "info", count: stats.flags, accent: "#dc2626", urgent: stats.flags > 0 },
  { id: "low-rated", label: "Low rated", icon: "info", count: stats.lowRated, accent: "#94a3b8" },
  { id: "comments", label: "Comments", icon: "info", count: stats.comments, accent: "#94a3b8" },
  { id: "stale", label: "Stale users", icon: "info", count: stats.stale, accent: "#94a3b8" },
];

const libraryItems = [
  { id: "training", label: "Training", icon: "book" },
  { id: "announcements", label: "Announcements", icon: "info" },
  { id: "events", label: "Events", icon: "calendar" },
  { id: "team", label: "Team", icon: "users" },
  { id: "settings", label: "Settings", icon: "shield" },
];

return (<div style={{ padding: 0, background: "#fafafa", minHeight: "calc(100vh - 56px)" }}>

  {/* Header */}
  <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: mob ? "16px 18px" : "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: Y, textTransform: "uppercase" }}>Admin Console</div>
      <div style={{ fontSize: mob ? 18 : 22, fontWeight: 700, color: "#1a1a2e", marginTop: 2 }}>{greeting}, {displayName}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ background: "#ecfdf5", color: "#059669", padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
        {stats.activeUsers} active this week
      </div>
      <div style={{ background: "#1a1a2e", color: Y, padding: "5px 12px", borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>ADMIN</div>
    </div>
  </div>

  {/* Quick action bar */}
  <div style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0", padding: mob ? "10px 18px" : "10px 28px", display: "flex", gap: 6, flexWrap: "wrap" }}>
    <button onClick={() => alert("Coming soon: inline announcement composer")} style={{ background: "#fff", border: "1px solid #eee", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 5 }}>
      <I name="info" size={12} color="#64748b" /> + Announcement
    </button>
    <button onClick={() => setTab("training")} style={{ background: "#fff", border: "1px solid #eee", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 5 }}>
      <I name="book" size={12} color="#64748b" /> + Training subject
    </button>
    <button onClick={() => alert("Coming soon: inline event composer")} style={{ background: "#fff", border: "1px solid #eee", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 5 }}>
      <I name="calendar" size={12} color="#64748b" /> + Event
    </button>
    <button onClick={() => alert("Coming soon: inline recognition")} style={{ background: "#fff", border: "1px solid #eee", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 5 }}>
      <I name="heart" size={12} color="#64748b" /> + Recognition
    </button>
  </div>

  {/* Sidebar + content */}
  <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "200px 1fr", minHeight: 600 }}>

    {/* Sidebar */}
    <div style={{ background: "#fff", borderRight: mob ? "none" : "1px solid #f0f0f0", borderBottom: mob ? "1px solid #f0f0f0" : "none", padding: "16px 0" }}>
      <div style={{ padding: "4px 18px", fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Inbox</div>
      {inboxItems.map(item => { const active = view === item.id; return (
        <button key={item.id} onClick={() => setView(item.id)} style={{ width: "100%", padding: "8px 18px", border: "none", background: active ? Y+"15" : "transparent", borderLeft: active ? `3px solid ${Y}` : "3px solid transparent", color: active ? "#1a1a2e" : "#475569", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }} onMouseOver={e => { if (!active) e.currentTarget.style.background = "#fafafa"; }} onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <I name={item.icon} size={13} color={active ? Y : "#94a3b8"} />
            {item.label}
          </span>
          {item.count > 0 && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: item.urgent ? "#dc2626" : item.accent === Y ? Y : "#e2e8f0", color: item.urgent ? "#fff" : item.accent === Y ? "#1a1a2e" : "#475569", fontWeight: 700 }}>{item.count}</span>}
        </button>
      ); })}

      <div style={{ padding: "16px 18px 4px", fontSize: 9, fontWeight: 800, letterSpacing: 1, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Library</div>
      {libraryItems.map(item => { const active = view === item.id; return (
        <button key={item.id} onClick={() => setView(item.id)} style={{ width: "100%", padding: "8px 18px", border: "none", background: active ? Y+"15" : "transparent", borderLeft: active ? `3px solid ${Y}` : "3px solid transparent", color: active ? "#1a1a2e" : "#475569", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }} onMouseOver={e => { if (!active) e.currentTarget.style.background = "#fafafa"; }} onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
          <I name={item.icon} size={13} color={active ? Y : "#94a3b8"} />
          {item.label}
        </button>
      ); })}
    </div>

    {/* Content panel */}
    <div style={{ padding: mob ? "18px" : "22px 28px" }}>
      {view === "overview" && <AdminOverview stats={stats} needsAttention={needsAttention} recentActivity={recentActivity} teamSummary={teamSummary} setView={setView} />}
      {view === "flags" && <AdminFlagsView stats={stats} />}
      {view === "low-rated" && <AdminLowRated />}
      {view === "comments" && <AdminCommentsView />}
      {view === "stale" && <AdminStaleUsers />}
      {view === "training" && <AdminLibraryTraining setTab={setTab} />}
      {view === "announcements" && <AdminLibraryStub label="Announcements" />}
      {view === "events" && <AdminLibraryStub label="Events" />}
      {view === "team" && <AdminLibraryTeam />}
      {view === "settings" && <AdminSettingsView />}
    </div>
  </div>
</div>);
}

// ─── Helpers ────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / (1000*60*60*24));
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return d + "d ago";
  if (d < 30) return Math.floor(d/7) + "w ago";
  return Math.floor(d/30) + "mo ago";
}

// ─── Admin Overview (the landing) ───────────────────────────────────
function AdminOverview({ stats, needsAttention, recentActivity, teamSummary, setView }) {
const statCards = [
  { label: "Pending", value: stats.flags, sub: "flags to resolve", color: stats.flags > 0 ? "#dc2626" : "#94a3b8" },
  { label: "Active", value: stats.activeUsers, sub: "users this week", color: "#1a1a2e" },
  { label: "Completion", value: stats.completion + "%", sub: "team average", color: "#059669" },
  { label: "Steps", value: stats.stepsTotal, sub: "total completed", color: "#1a1a2e" },
];

return (<div>
  {/* Stat cards */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 18 }}>
    {statCards.map((c, i) => (
      <div key={i} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700 }}>{c.label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: c.color, marginTop: 4, lineHeight: 1 }}>{c.value}</div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{c.sub}</div>
      </div>
    ))}
  </div>

  {/* 2x2 panel grid */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>

    {/* Needs attention */}
    <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
          <I name="info" size={14} color="#dc2626" /> Needs attention
        </div>
        <button onClick={() => setView("flags")} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>View all →</button>
      </div>
      {needsAttention.length === 0 ? (
        <div style={{ fontSize: 11, color: "#94a3b8", padding: "16px 0", textAlign: "center" }}>You're all clear.</div>
      ) : needsAttention.map((item, i) => (
        <div key={item.id || i} style={{ padding: "8px 0", borderBottom: i < needsAttention.length - 1 ? "1px solid #f5f5f5" : "none" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e", marginBottom: 2 }}>{item.title}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>{item.sub}</div>
        </div>
      ))}
    </div>

    {/* Team progress */}
    <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
          <I name="users" size={14} color="#3b82f6" /> Team progress
        </div>
        <button onClick={() => setView("team")} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>View all →</button>
      </div>
      {teamSummary.length === 0 ? (
        <div style={{ fontSize: 11, color: "#94a3b8", padding: "16px 0", textAlign: "center" }}>No team data yet.</div>
      ) : teamSummary.map((t, i) => (
        <div key={i} style={{ padding: "7px 0", borderBottom: i < teamSummary.length - 1 ? "1px solid #f5f5f5" : "none", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#1a1a2e", fontWeight: 600 }}>{t.manager}'s team</span>
          <span style={{ color: "#475569" }}>
            <strong style={{ color: "#1a1a2e" }}>{t.avgSteps}</strong>
            <span style={{ color: "#94a3b8" }}> avg · {t.stale > 0 ? <span style={{ color: "#dc2626" }}>{t.stale} stale</span> : <span style={{ color: "#059669" }}>all active</span>}</span>
          </span>
        </div>
      ))}
    </div>

    {/* Recent activity */}
    <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
          <I name="info" size={14} color="#7c3aed" /> Recent activity
        </div>
      </div>
      {recentActivity.length === 0 ? (
        <div style={{ fontSize: 11, color: "#94a3b8", padding: "16px 0", textAlign: "center" }}>Nothing yet.</div>
      ) : recentActivity.slice(0, 4).map((e, i) => (
        <div key={i} style={{ padding: "6px 0", fontSize: 11, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{e.by}</span>
          <span style={{ color: "#64748b" }}> {e.action} </span>
          <span style={{ color: "#1a1a2e" }}>{e.target}</span>
          <span style={{ color: "#94a3b8", fontSize: 10, marginLeft: 6 }}>{timeAgo(e.at)}</span>
        </div>
      ))}
    </div>

    {/* Engagement */}
    <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
          <I name="target" size={14} color="#0891b2" /> Engagement
        </div>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>7d</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#64748b" }}>Custom subjects</span>
          <strong style={{ color: "#1a1a2e" }}>{stats.customSubjects}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#64748b" }}>Comments</span>
          <strong style={{ color: "#1a1a2e" }}>{stats.comments}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#64748b" }}>Low-rated steps</span>
          <strong style={{ color: stats.lowRated > 0 ? "#dc2626" : "#1a1a2e" }}>{stats.lowRated}</strong>
        </div>
      </div>
    </div>

  </div>
</div>);
}

// ─── Inbox sub-views ────────────────────────────────────────────────
function AdminFlagsView({ stats }) {
const [flags, setFlags] = useState([]);
const [filter, setFilter] = useState("pending");
useEffect(() => { (async () => { try {
  if (!window.storage) return;
  const f = await window.storage.get("spark-hq-step-flags", true);
  if (f?.value) setFlags(JSON.parse(f.value));
} catch(e){} })(); }, []);

const filtered = flags.filter(f => filter === "all" || (filter === "pending" && !f.resolved) || (filter === "resolved" && f.resolved));
const resolveFlag = async (id) => {
  const updated = flags.map(f => f.id === id ? { ...f, resolved: true, resolvedAt: new Date().toISOString() } : f);
  setFlags(updated);
  try { if (window.storage) await window.storage.set("spark-hq-step-flags", JSON.stringify(updated), true); } catch(e){}
};

return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Flags</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Review content the team flagged for errors or stale info.</div>
  </div>
  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
    {[{ id: "pending", label: `Pending (${flags.filter(f => !f.resolved).length})` }, { id: "resolved", label: "Resolved" }, { id: "all", label: "All" }].map(t => { const active = filter === t.id; return (
      <button key={t.id} onClick={() => setFilter(t.id)} style={{ background: active ? "#1a1a2e" : "#fff", border: "1px solid "+(active ? "#1a1a2e" : "#eee"), color: active ? "#fff" : "#64748b", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{t.label}</button>
    ); })}
  </div>
  {filtered.length === 0 ? (
    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>No {filter} flags.</div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {filtered.map(f => (
        <div key={f.id} style={{ background: f.resolved ? "#fafafa" : "#fffbeb", border: "1px solid "+(f.resolved ? "#eee" : "#fde68a"), borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: f.resolved ? "#94a3b8" : "#92400e", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 3 }}>{f.sectionCat} · {f.itemName}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{f.stepHeading}</div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>{f.reason}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Flagged by {f.by} · {timeAgo(f.at)}</div>
            </div>
            {!f.resolved && <button onClick={() => resolveFlag(f.id)} style={{ background: "#ecfdf5", border: "1px solid #86efac", color: "#059669", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Resolve</button>}
          </div>
        </div>
      ))}
    </div>
  )}
</div>);
}

function AdminLowRated() {
const [ratings, setRatings] = useState({});
useEffect(() => { (async () => { try {
  if (!window.storage) return;
  const r = await window.storage.get("spark-hq-step-ratings", true);
  if (r?.value) setRatings(JSON.parse(r.value));
} catch(e){} })(); }, []);

const lowRated = Object.entries(ratings).filter(([k, v]) => v.down > v.up && v.down > 0).sort((a, b) => (b[1].down - b[1].up) - (a[1].down - a[1].up));

return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Low-rated steps</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Steps with more thumbs-down than thumbs-up.</div>
  </div>
  {lowRated.length === 0 ? (
    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Nothing's poorly rated yet.</div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lowRated.map(([key, r]) => (
        <div key={key} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "#1a1a2e", fontWeight: 600, fontFamily: "monospace" }}>{key}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            <span style={{ color: "#059669" }}>👍 {r.up}</span>
            <span style={{ margin: "0 8px" }}>·</span>
            <span style={{ color: "#dc2626" }}>👎 {r.down}</span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>);
}

function AdminCommentsView() {
const [comments, setComments] = useState([]);
useEffect(() => { (async () => { try {
  if (!window.storage) return;
  const c = await window.storage.get("spark-hq-module-comments", true);
  if (c?.value) {
    const all = [];
    Object.entries(JSON.parse(c.value)).forEach(([modKey, modComments]) => {
      modComments.forEach(cmt => all.push({ ...cmt, modKey }));
    });
    setComments(all.sort((a, b) => new Date(b.at) - new Date(a.at)));
  }
} catch(e){} })(); }, []);

return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Comments</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>All comments from training modules. Sorted by most recent.</div>
  </div>
  {comments.length === 0 ? (
    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>No comments yet.</div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {comments.map((c, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 }}>{c.modKey}</div>
          <div style={{ fontSize: 12, color: "#1a1a2e", marginBottom: 4 }}>{c.text}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>{c.by} · {timeAgo(c.at)}</div>
        </div>
      ))}
    </div>
  )}
</div>);
}

function AdminStaleUsers() {
const [activity, setActivity] = useState([]);
useEffect(() => { (async () => { try {
  if (!window.storage) return;
  const a = await window.storage.get("spark-hq-activity-log", true);
  if (a?.value) setActivity(JSON.parse(a.value));
} catch(e){} })(); }, []);

const byUser = {};
activity.forEach(ev => {
  if (!byUser[ev.by]) byUser[ev.by] = { stepsDone: 0, lastActivity: ev.at };
  if (ev.type === "step_done") byUser[ev.by].stepsDone++;
  if (ev.at > byUser[ev.by].lastActivity) byUser[ev.by].lastActivity = ev.at;
});
const stale = TEAM_ROSTER.filter(p => {
  const u = byUser[p.name];
  if (!u) return true;
  return Date.now() - new Date(u.lastActivity).getTime() > 7*24*60*60*1000;
}).map(p => ({ ...p, lastActivity: byUser[p.name]?.lastActivity }));

return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Stale users</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>People who haven't been active in 7+ days.</div>
  </div>
  {stale.length === 0 ? (
    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 13 }}>Everyone's been active recently.</div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {stale.map(p => (
        <div key={p.name} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{p.name}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{p.role} · {p.div}</div>
          </div>
          <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
            {p.lastActivity ? timeAgo(p.lastActivity) : "Never active"}
          </div>
        </div>
      ))}
    </div>
  )}
</div>);
}

function AdminLibraryTraining({ setTab }) {
return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Training</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Manage training subjects and content.</div>
  </div>
  <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 20 }}>
    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>Training subjects are managed from the Training tab. Click below to open it.</div>
    <button onClick={() => setTab("training")} style={{ background: Y, border: "1px solid "+Y, color: "#1a1a2e", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Open Training tab →</button>
  </div>
</div>);
}

function AdminLibraryTeam() {
const [activity, setActivity] = useState([]);
useEffect(() => { (async () => { try {
  if (!window.storage) return;
  const a = await window.storage.get("spark-hq-activity-log", true);
  if (a?.value) setActivity(JSON.parse(a.value));
} catch(e){} })(); }, []);

const byUser = {};
activity.forEach(ev => {
  if (!byUser[ev.by]) byUser[ev.by] = { stepsDone: 0, quizzesPassed: 0, lastActivity: ev.at };
  if (ev.type === "step_done") byUser[ev.by].stepsDone++;
  if (ev.type === "quiz_passed") byUser[ev.by].quizzesPassed++;
  if (ev.at > byUser[ev.by].lastActivity) byUser[ev.by].lastActivity = ev.at;
});

return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Team</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Per-person training activity across the company.</div>
  </div>
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {TEAM_ROSTER.map(p => { const u = byUser[p.name]; const stale = !u || Date.now() - new Date(u.lastActivity).getTime() > 7*24*60*60*1000; return (
      <div key={p.name} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 14, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{p.name}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>{p.role} · {p.div}</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>{u?.stepsDone || 0}</div>
          <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.5, fontWeight: 700, textTransform: "uppercase" }}>Steps</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>{u?.quizzesPassed || 0}</div>
          <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.5, fontWeight: 700, textTransform: "uppercase" }}>Quizzes</div>
        </div>
        <div style={{ textAlign: "right", minWidth: 90, fontSize: 10, color: stale ? "#dc2626" : "#94a3b8", fontWeight: stale ? 700 : 500 }}>
          {u?.lastActivity ? timeAgo(u.lastActivity) : "—"}
        </div>
      </div>
    ); })}
  </div>
</div>);
}

function AdminLibraryStub({ label }) {
return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>{label}</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Manage {label.toLowerCase()} from the Home tab for now.</div>
  </div>
  <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 20, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
    Inline editor coming soon. For now, {label.toLowerCase()} are managed in their respective spots on the main site.
  </div>
</div>);
}

function AdminSettingsView() {
return (<div>
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Settings</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Admin users and site info.</div>
  </div>
  <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 16, marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>Admins</div>
    <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "#1a1a2e", lineHeight: 1.8 }}>
      <li>Allie Spegel (aspegel@sparkcompanies.com)</li>
      <li>Mary Patrico (mpatrico@sparkcompanies.com)</li>
      <li>Aaron Opalewski (aopalewski@sparkcompanies.com)</li>
      <li>Priyanka Malani (pmalani@sparkcompanies.com)</li>
    </ul>
  </div>
  <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 10, padding: 16, fontSize: 12, color: "#475569", lineHeight: 1.8 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>Site</div>
    <div><b>Version:</b> 2.1 (Hybrid Admin)</div>
    <div><b>Backend:</b> Supabase</div>
    <div><b>Auth:</b> Microsoft Entra SSO</div>
    <div><b>Hosting:</b> Azure Static Web Apps</div>
  </div>
</div>);
}


export default function SparkTeamSite() {
const [tab, setTab] = useState("home");
const [dark, setDark] = useState(false);
const w = useW();
useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [tab]);
useEffect(() => { const tryLoad = async () => { try { const r = await window.storage.get("spark-hq-theme"); if (r && r.value) setDark(r.value === "dark"); } catch(e){} }; if (window.storage) tryLoad(); }, []);
const toggleTheme = async () => { const nd = !dark; setDark(nd); try { if (window.storage) await window.storage.set("spark-hq-theme", nd ? "dark" : "light"); } catch(e){} };
const themeVars = dark ? THEME_VARS.dark : THEME_VARS.light;
const renderPage = () => { switch (tab) { case "home": return <HomePage setTab={setTab} w={w} />; case "standard": return <SparkStandardPage w={w} />; case "careers": return <CareerPage w={w} />; case "training": return <TrainingPage w={w} setTab={setTab} />; case "tools": return <ToolsPage w={w} />; case "team": return <TeamPage w={w} />; case "sops": return <SOPsPage w={w} />; case "docs": return <DocumentsPage w={w} />; case "performance": return <PerformancePage w={w} />; case "admin": return <AdminPage w={w} setTab={setTab} adminMode={adminMode} />; default: return <HomePage setTab={setTab} w={w} />; } };
const mob = w < 900;
return (<ThemeCtx.Provider value={{ dark, toggle: toggleTheme }}><div style={{ minHeight: "100vh", paddingTop: 56, paddingLeft: mob ? 0 : 240, background: dark ? "#0c0a06" : "#f5f5f0", color: dark ? "#fff" : "#1a1a2e", transition: "background 0.3s, color 0.3s", ...themeVars }}><Navbar tab={tab} setTab={setTab} w={w} adminMode={adminMode} /><div style={{ maxWidth: 1000, margin: "0 auto", padding: mob ? "0" : "0 16px" }}>{renderPage()}</div><footer style={{ borderTop: "2px solid transparent", borderImage: "linear-gradient(90deg, #fbbf24, #4ecdc4, #7c5cfc) 1", padding: "24px 20px", textAlign: "center" }}><div style={{ fontSize: 11, color: "#94a3b8" }}>{"©"} 2026 Spark Companies{"™"} · 901 Wilshire Dr., Suite 585, Troy, MI 48084 · (586) 930-5000</div></footer></div></ThemeCtx.Provider>);
}
