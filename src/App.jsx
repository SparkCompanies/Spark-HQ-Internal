import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from "recharts";
import * as XLSX from "xlsx";
// Manual CSV parser (no external dependency)
var parseCSV = function(text) {
  var rows = [];
  var lines = text.split("\n");
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var cells = [];
    var inQuote = false;
    var cell = "";
    for (var j = 0; j < line.length; j++) {
      var ch = line[j];
      if (ch === '"' && !inQuote) { inQuote = true; }
      else if (ch === '"' && inQuote) {
        if (j + 1 < line.length && line[j + 1] === '"') { cell += '"'; j++; }
        else { inQuote = false; }
      } else if (ch === "," && !inQuote) { cells.push(cell); cell = ""; }
      else { cell += ch; }
    }
    cells.push(cell);
    rows.push(cells);
  }
  return rows;
};
/* ═══════════════════════════════════════════════════════════════
   SPARK COMMISSIONS v7.0 — CHARGE-FIRST ARCHITECTURE
   Weekly charge import is the foundation. Everything else hangs on it.
   ═══════════════════════════════════════════════════════════════ */
// ── Design Tokens ──────────────────────────────────────────────
var C={bg:"#11141B",bg2:"#141820",bgCard:"#181D27",bgCardHover:"#1E2433",bgSurface:"#1C2230",bgInput:"#0D1017",accent:"#FFD700",accentDim:"rgba(255,215,0,.06)",accentGlow:"rgba(255,215,0,.2)",border:"rgba(255,255,255,.07)",borderLight:"rgba(255,255,255,.1)",text:"#ECF0F6",textMuted:"#A0AEBF",textDim:"#6B7D95",green:"#34D058",greenDim:"rgba(52,208,88,.07)",greenGlow:"rgba(52,208,88,.2)",red:"#F85149",redDim:"rgba(248,81,73,.07)",redGlow:"rgba(248,81,73,.15)",blue:"#58A6FF",blueDim:"rgba(88,166,255,.07)",blueGlow:"rgba(88,166,255,.15)",orange:"#D29922",orangeDim:"rgba(210,153,34,.07)",purple:"#BC8CFF",purpleDim:"rgba(188,140,255,.07)",teal:"#39D0D8",tealDim:"rgba(57,208,216,.07)",gold:"#FFD700",goldDim:"rgba(255,215,0,.06)"};
var FM="'DM Sans','Outfit',system-ui,-apple-system,sans-serif";
var FU="'Outfit','DM Sans',system-ui,-apple-system,sans-serif";
var CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Outfit:wght@400;500;600;700;800;900&display=swap');
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 6px rgba(255,215,0,.05)}50%{box-shadow:0 0 12px rgba(255,215,0,.1)}}
*{box-sizing:border-box}
body{background:#0D1017;color:#ECF0F6}
.scanlines,.vignette{display:none}
.trow{transition:all .12s ease}.trow:hover{background:rgba(255,255,255,.03) !important}.trow:nth-child(even){background:rgba(255,255,255,.012)}
.panel{background:#13171F;border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.15);margin-bottom:12px}
.panel-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.06);background:#10141B}
.panel-hdr h3{font-size:12px;font-weight:700;color:#8B98AC;letter-spacing:1px;margin:0;font-family:'DM Sans',sans-serif;text-transform:none}
.panel-body{padding:16px}
.nav-item{transition:all .15s ease;position:relative;border-left:2px solid transparent}.nav-item:hover{background:rgba(255,215,0,.03) !important}.nav-item.active{border-left-color:#FFD700;background:rgba(255,215,0,.05) !important}
select,input[type="text"],input[type="number"],input[type="date"],textarea{background:#0B0E14 !important;color:#E8ECF2 !important;border:1px solid rgba(255,255,255,.06) !important;font-size:14px !important;border-radius:6px !important;transition:all .15s ease;font-family:'DM Sans',sans-serif !important}
::placeholder{color:#6B7A8D !important;opacity:1 !important}
input::placeholder{color:#6B7A8D !important;opacity:1 !important}
select:focus,input:focus,textarea:focus{border-color:#FFD70066 !important;outline:none;box-shadow:0 0 0 2px rgba(255,215,0,.08) !important}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.14)}
.btn-primary{background:linear-gradient(135deg,#FFD700 0%,#FFC000 100%);color:#0B0E14;border:none;font-weight:700;transition:all .15s ease;letter-spacing:.3px;box-shadow:0 2px 8px rgba(255,215,0,.2)}.btn-primary:hover{background:linear-gradient(135deg,#FFE033 0%,#FFD700 100%);transform:translateY(-1px);box-shadow:0 4px 16px rgba(255,215,0,.3)}
.btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.1);color:#8899AA;transition:all .15s ease;border-radius:6px;font-family:'DM Sans',sans-serif}.btn-ghost:hover{border-color:#FFD70044;color:#FFD700;background:rgba(255,215,0,.03)}
.glow-card{animation:glowPulse 3s ease-in-out infinite}
.stat-card{transition:all .15s ease;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:#181D27}.stat-card:hover{border-color:rgba(255,215,0,.12);background:#1C2230}
.fade-section{animation:fadeIn .25s ease}
table{border-collapse:separate;border-spacing:0}
button{cursor:pointer;font-family:'DM Sans',sans-serif}
select{font-family:'DM Sans',sans-serif}
@media(max-width:768px){.rep-grid4{grid-template-columns:repeat(2,1fr) !important}.rep-header{flex-direction:column !important;gap:10px !important;text-align:center}.rep-header select{width:100%}}
table{border-spacing:0}th{text-transform:none;letter-spacing:.5px}
`;
// ── Constants ──────────────────────────────────────────────────
var UNITS=["MI Metro","Light Industrial","Automation","Enterprise","Southeast","Spark Sales","Ignite","JJP","Fulfillment","Central","BPO"];
var CP_DEFAULTS=[
["Recruiter",0.15,0.05,0.15,0.05,0,0],
["DH Recruiter II",0.15,0.06,0.15,0.06,0,0],
["Sr. DH Recruiter II",0.15,0.06,0.15,0.06,0,0],
["Sr. Recruiter",0.15,0.06,0.15,0.06,0,0],
["Exec Recruiter",0.15,0.06,0.15,0.06,0,0],
["ARM Level II",0.15,0.06,0.15,0.06,0,0],
["ARM Level III",0.15,0.08,0.15,0.08,0,0],
["Acct Recruiting Exec",0.16,0.08,0.16,0.08,0,0],
["Sr Acct Exec Lead",0.16,0.08,0.16,0.08,0,0],
["Sr Acct Recruiting Exec",0.16,0.12,0.16,0.12,0,0],
["Account Executive",0.15,0.08,0.15,0.08,0,0],
["Sr Sales Executive",0,0.16,0.20,0.16,0,0],
["Sr Exec Sales Lead",0,0,0,0,0.05,0],
["Sr Dir Fulfillment",0,0,0,0,0.05,0],
["Sr Dir RPS",0,0,0,0,0.05,0],
["Director",0,0,0,0,0.05,0],
["Manager",0,0,0,0,0.05,0]
];
var FLOOR=25000;var FLOOR_ANNUAL=100000;var FLOOR_WEEKLY_DEDUCT=2500;var ENTITIES=["Talent","Ignite","JJP"];
var DEFAULT_CFG={
  floors:{weekly:2500,quarterly:25000,annual:100000},
  dhDefaults:{guaranteeDays:90},
  adminPin:"",
  branding:{companyName:"Spark Companies",emailDomain:"sparkcompanies.com",statementNote:""},
  careerPaths:[
    {id:"cp1",name:"Recruiter",fdDH:0.15,sDH:0.05,fdA:0.15,sA:0.05,flat:0,dhExempt:false},
    {id:"cp2",name:"Recruiter - Skilled Trades",fdDH:0.15,sDH:0.05,fdA:0.15,sA:0.05,flat:0,dhExempt:false},
    {id:"cp3",name:"Recruiter - Technical",fdDH:0.15,sDH:0.06,fdA:0.15,sA:0.06,flat:0,dhExempt:false},
    {id:"cp4",name:"Sr. Recruiter - Skilled Trades",fdDH:0.15,sDH:0.06,fdA:0.15,sA:0.08,flat:0,dhExempt:false},
    {id:"cp5",name:"Sr. Recruiter - Technical",fdDH:0.10,sDH:0.10,fdA:0.10,sA:0.10,flat:0,dhExempt:false},
    {id:"cp6",name:"Executive Recruiter",fdDH:0.15,sDH:0.06,fdA:0.15,sA:0.06,flat:0,dhExempt:false},
    {id:"cp7",name:"Executive Recruiter - Technical",fdDH:0.15,sDH:0.06,fdA:0.08,sA:0.06,flat:0,dhExempt:false},
    {id:"cp8",name:"Account Recruiting Manager",fdDH:0.15,sDH:0.06,fdA:0.15,sA:0.06,flat:0,dhExempt:false},
    {id:"cp9",name:"Account Recruiting Manager - Level 2",fdDH:0.15,sDH:0.08,fdA:0.15,sA:0.08,flat:0,dhExempt:false},
    {id:"cp10",name:"Account Recruiting Executive",fdDH:0.16,sDH:0.08,fdA:0.16,sA:0.08,flat:0,dhExempt:false},
    {id:"cp11",name:"Sr. Account Recruiting Executive",fdDH:0.16,sDH:0.08,fdA:0.16,sA:0.08,flat:0,dhExempt:false},
    {id:"cp12",name:"Sr. Account Recruiting Executive - PC",fdDH:0,sDH:0.16,fdA:0.20,sA:0.16,flat:0,dhExempt:false},
    {id:"cp13",name:"Sr. Sales Executive",fdDH:0,sDH:0.10,fdA:0,sA:0.10,flat:0,dhExempt:false},
    {id:"cp14",name:"Sr. Sales Executive - PC",fdDH:0.16,sDH:0.12,fdA:0.16,sA:0.12,flat:0,dhExempt:false},
    {id:"cp15",name:"Senior Regional Onsite Manager - PC",fdDH:0.16,sDH:0.08,fdA:0.16,sA:0.08,flat:0,dhExempt:false},
    {id:"cp16",name:"Sr. Director",fdDH:0,sDH:0,fdA:0,sA:0,flat:0.05,dhExempt:true},
  ],
  entities:["Talent","Ignite","JJP"],
  units:[
    {name:"MI Metro",color:"blue"},{name:"Light Industrial",color:"purple"},{name:"Automation",color:"teal"},
    {name:"Enterprise",color:"blue"},{name:"South East",color:"orange"},{name:"Spark Sales",color:"gold"},
    {name:"Ignite",color:"blue"},{name:"JJP",color:"orange"},{name:"Fulfillment",color:"green"},
    {name:"Central",color:"orange"},{name:"BPO",color:"teal"}
  ]
};
var getQ=function(dateStr){if(!dateStr)return 0;var d=new Date(dateStr);var m=d.getMonth();return m<3?1:m<6?2:m<9?3:4;};
var getQY=function(dateStr){if(!dateStr)return"";var d=new Date(dateStr);return getQ(dateStr)+"-"+d.getFullYear();};
var UC=["#4DA6FF","#F0B429","#00E68A","#A78BFA","#FF4757","#2DD4BF","#FF9F43","#EC4899","#F97316"];
var UB={"MI Metro":"blue","Light Industrial":"purple","Automation":"teal","Enterprise":"blue","Southeast":"orange","Spark Sales":"gold","Ignite":"blue","JJP":"orange","Fulfillment":"green","Central":"orange","BPO":"teal"};
var NAV=[{id:"command",icon:"grid",label:"Command Center"},{id:"charges",icon:"dollar",label:"Weekly Charges"},{id:"dh",icon:"briefcase",label:"Direct Hires"},{id:"team",icon:"users",label:"Team"},{id:"payroll",icon:"check",label:"Payroll"},{id:"floor",icon:"dollar",label:"Floor Tracker"},{id:"exec",icon:"briefcase",label:"Exec Summary"},{id:"recon",icon:"alert",label:"Recon"},{id:"audit",icon:"bar",label:"Audit Log"},{id:"admin",icon:"settings",label:"Admin Settings"}];
var ST_MAP={p:{l:"Pending",v:"orange"},o:{l:"On Charge",v:"blue"},c:{l:"Clear",v:"green"},d:{l:"Complete",v:"teal"},t:{l:"Terminated",v:"red"},r:{l:"Ready to Pay",v:"gold"}};
var ST_OPTS=[["p","Pending"],["o","On Charge"],["c","Clear"],["d","Complete"],["t","Terminated"]];
var NOW=new Date("2026-02-26");
// ── Real DH Data ───────────────────────────────────────────────
// DH data loads from storage. Start empty if no saved data.
var _DH=[];
// ── Real Team Roster ───────────────────────────────────────────
// [name, entity, manager, unit, careerPath, dhFullDesk, dhSplit, assignFullDesk, assignSplit, flat, drRate, notes]
var _T=[
["Aidan Juengel","Talent","Jamie Platt","MI Metro","Executive Recruiter - Technical",0.15,0.06,0.08,0.06,0,0,""],["Alec Czartoryski","Talent","Jamie Platt","MI Metro","Account Recruiting Manager - Level 2",0.15,0.08,0.15,0.08,0,0,""],["Amanda Bowman","JJP","","JJP","Account Recruiting Executive",0,0,0,0,0.05,0,"quarterly flat"],["Anja Domazet","Talent","Jamie Platt","MI Metro","Sr. Account Recruiting Executive",0.16,0.08,0.16,0.08,0,0,""],["Aron Carroll","Talent","Fletcher Kundtz","South East","Sr. Account Recruiting Executive",0.16,0.06,0.08,0.04,0,0.005,"HOLD - old comp plan until 2025 DH fully pays out"],["Ben Ockerman","Talent","Jamie Platt","MI Metro","Recruiter - Skilled Trades",0.15,0.05,0.15,0.05,0,0,""],["Brandon Shrewsberry","Talent","Jacob Patrico","Fulfillment","Sr. Recruiter - Skilled Trades",0.15,0.06,0.15,0.08,0,0,""],["Carlin McCrimmon","Ignite","Kevin MacKillop","Ignite","Sr. Recruiter - Technical",0.10,0.10,0.10,0.10,0,0,"Final 2025 DH $820.80; new comp plan eff 2/16/26"],["Charles Hemstrom","Talent","Jamie Platt","MI Metro","Account Recruiting Manager - Level 2",0.15,0.06,0.15,0.06,0,0,""],["Chris Bull","Talent","Jennifer Shy","Automation","Recruiter - Skilled Trades",0.15,0.05,0.15,0.05,0,0,""],["Christina Getz","Talent","Ryan Aymen","Light Industrial","Sr. Recruiter - Technical",0.15,0.06,0.15,0.06,0,0,""],["Chuck Chesner","Talent","Jamie Platt","MI Metro","Sr. Sales Executive",0,0.10,0,0.10,0,0,"commission floor until 3/1/2026"],["CJ Olaniyan","Talent","Jamie Platt","MI Metro","Account Recruiting Manager - Level 2",0.12,0.06,0.12,0.06,0,0,""],["Claire Woodrow","Talent","Kristin Voyer","Enterprise","Account Recruiting Manager - Level 2",0.15,0.06,0.15,0.06,0,0,""],["Colin Clancy","Talent","Jamie Platt","MI Metro","Account Recruiting Executive",0.16,0.08,0.16,0.08,0,0,""],["Cor'Sean Woodard","Talent","Jennifer Shy","Automation","Recruiter - Skilled Trades",0.15,0.05,0.15,0.05,0,0,""],["Darrell Templeton","Talent","Jamie Platt","Spark Sales","Sr. Account Recruiting Executive - PC",0,0.16,0.20,0.16,0,0,"no unit commission eff 12/14/2025"],["Ethan Zavier","Talent","Chuck Chesner","MI Metro","Sr. Recruiter - Skilled Trades",0.15,0.06,0.15,0.06,0,0,""],["Jacob Patrico","Talent","Jamie Platt","Fulfillment","Sr. Director",0,0,0,0,0.05,0,"quarterly 5% flat"],["Jacob Roux","Talent","Jacob Patrico","Fulfillment","Sr. Recruiter - Skilled Trades",0.15,0.06,0.15,0.06,0,0,""],["Jamie Bell","Talent","Jacob Patrico","Fulfillment","Executive Recruiter",0.15,0.06,0.15,0.06,0,0,""],["Jamie Platt","Talent","","MI Metro","Sr. Director",0,0,0,0,0.05,0,"quarterly 5% flat"],["Jennifer Neuenfeldt","JJP","Amanda Bowman","JJP","Sr. Recruiter - Technical",0.15,0.06,0.15,0.06,0,0,""],["Jennifer Shy","Talent","Ryan Aymen","Automation","Account Recruiting Manager - Level 2",0.15,0.06,0.15,0.06,0,0.005,"DR: Anthony Caucci"],["Julie Rinaldi","Talent","Jamie Platt","Automation","Sr. Sales Executive - PC",0.16,0.12,0.16,0.12,0,0,""],["Kade Manzo","Talent","Jacob Patrico","Fulfillment","Recruiter",0.15,0.05,0.15,0.05,0,0,""],["Kevin MacKillop","Ignite","","Ignite","Sr. Sales Executive - PC",0,0,0,0,0.05,0,"quarterly flat"],["Kristin Scarth","Talent","Jamie Platt","Enterprise","Sr. Director",0,0,0,0,0.05,0,"quarterly 5% flat"],["Luke Oliver","Talent","Jacob Patrico","Fulfillment","Sr. Recruiter - Skilled Trades",0.15,0.06,0.15,0.06,0,0,""],["Nathan Edmiston","Talent","Julie Rinaldi","Automation","Recruiter - Technical",0.15,0.06,0.15,0.06,0,0,""],["Nick Greenfelder","Talent","Ryan Aymen","Light Industrial","Account Recruiting Manager - Level 2",0.15,0.06,0.15,0.06,0,0,""],["Samantha Ban","Talent","","Enterprise","Recruiter - Technical",0.15,0.08,0.15,0.08,0,0,""],["Samantha Webb","Talent","Kristin Voyer","Enterprise","Account Recruiting Manager",0.15,0.06,0.15,0.06,0,0,""],["Sarah Keel","Talent","Darrell Templeton","Spark Sales","Account Recruiting Executive",0.16,0.08,0.16,0.08,0,0,""],["Scott Tanghe","Talent","Jamie Platt","MI Metro","Recruiter - Skilled Trades",0.05,0.05,0.05,0.05,0,0,"new hire"],["Sean Casey","Talent","Ryan Aymen","Light Industrial","Senior Regional Onsite Manager - PC",0.16,0.08,0.16,0.08,0,0.005,"DR: Nick Greenfelder"],["Theresa Ferencz","Talent","Kristin Voyer","Enterprise","Sr. Recruiter - Skilled Trades",0.15,0.06,0.15,0.06,0,0,""]
];
// ── Helpers ────────────────────────────────────────────────────
var fmt=function(n){return"$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0});};
var fmtD=function(n){return"$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});};
var parseCurrency=function(s){if(!s)return 0;var v=String(s).replace(/[$,\s]/g,"").replace(/[()]/g,function(m){return m==="("?"-":"";});return parseFloat(v)||0;};
function genPin(existingMembers){
  var used={};(existingMembers||[]).forEach(function(m){if(m.pin)used[m.pin]=true;});
  var pin;var attempts=0;
  do{pin=String(100000+Math.floor(Math.random()*900000));attempts++;}while(used[pin]&&attempts<1000);
  return pin;
}
var initM=function(t,allMembers){var p=genPin(allMembers||[]);return{id:Date.now()+Math.random(),name:t[0],entity:t[1]||"Talent",manager:t[2]||"",unit:t[3]||"MI Metro",careerPath:t[4]||"",rates:{fdDH:t[5]||0,sDH:t[6]||0,fdA:t[7]||0,sA:t[8]||0,flat:t[9]||0,drRate:t[10]||0},notes:t[11]||"",email:EMAIL_MAP[t[0]]||"",pin:p,guarantee:{amount:0,endDate:"",active:false}};};

var EMAIL_MAP={"Aidan Juengel":"ajuengel@sparkcompanies.com","Alec Czartoryski":"aczartoryski@sparkcompanies.com","Amanda Bowman":"abowman@sparkcompanies.com","Anja Domazet":"adomazet@sparkcompanies.com","Aron Carroll":"acarroll@sparkcompanies.com","Ben Ockerman":"bockerman@sparkcompanies.com","Brandon Shrewsberry":"bshrewsberry@sparkcompanies.com","Carlin McCrimmon":"cmccrimmon@sparkcompanies.com","Charles Hemstrom":"chemstrom@sparkcompanies.com","Chris Bull":"cbull@sparkcompanies.com","Christina Getz":"cgetz@sparkcompanies.com","Chuck Chesner":"cchesner@sparkcompanies.com","CJ Olaniyan":"colaniyan@sparkcompanies.com","Claire Woodrow":"cwoodrow@sparkcompanies.com","Colin Clancy":"cclancy@sparkcompanies.com","Cor'Sean Woodard":"cwoodard@sparkcompanies.com","Darrell Templeton":"dtempleton@sparkcompanies.com","Ethan Zavier":"ezavier@sparkcompanies.com","Jacob Patrico":"jpatrico@sparkcompanies.com","Jacob Roux":"jroux@sparkcompanies.com","Jamie Bell":"jbell@sparkcompanies.com","Jamie Platt":"jplatt@sparkcompanies.com","Jennifer Neuenfeldt":"jneuenfeldt@sparkcompanies.com","Jennifer Shy":"jshy@sparkcompanies.com","Julie Rinaldi":"jrinaldi@sparkcompanies.com","Kade Manzo":"kmanzo@sparkcompanies.com","Kevin MacKillop":"kmackillop@sparkcompanies.com","Kristin Scarth":"kscarth@sparkcompanies.com","Luke Oliver":"loliver@sparkcompanies.com","Nathan Edmiston":"nedmiston@sparkcompanies.com","Nick Greenfelder":"ngreenfelder@sparkcompanies.com","Samantha Ban":"sban@sparkcompanies.com","Samantha Webb":"swebb@sparkcompanies.com","Sarah Keel":"skeel@sparkcompanies.com","Scott Tanghe":"stanghe@sparkcompanies.com","Sean Casey":"scasey@sparkcompanies.com","Theresa Ferencz":"tferencz@sparkcompanies.com"};
var daysTo=function(dt){if(!dt)return null;return Math.ceil((new Date(dt)-NOW)/864e5);};
var isReady=function(d){if(d.st==="t"||d.paidOut)return false;return d.cd&&d.cd.length>0&&new Date(d.cd)<=NOW&&d.invPaid&&d.invPaid.length>0;};
var blockReason=function(d){if(d.st==="t")return"Termed";if(d.paidOut)return"Paid";if(d.st==="p")return"Pending";if(!d.cd)return"No clearance";var dt=daysTo(d.cd);if(dt>0)return"On charge ("+dt+"d)";if(!d.invPaid)return"No invoice";return null;};
// Fuzzy name matching — strips spaces, punctuation, case
var normName=function(s){return(s||"").toLowerCase().replace(/[^a-z]/g,"");};
var matchMember=function(csvName,members){var n=normName(csvName);var exact=members.find(function(m){return normName(m.name)===n;});if(exact)return exact;var best=null,bestScore=0;members.forEach(function(m){var mn=normName(m.name);var parts=n.split("").filter(function(c){return mn.indexOf(c)>=0;}).length;var score=parts/Math.max(n.length,mn.length);if(score>bestScore&&score>0.7){bestScore=score;best=m;}});return best;};
// Quick lookup: find member by name (fuzzy)
var findM=function(name,members){return matchMember(name,members);};
// DR mappings
var DR_MAP={};_T.forEach(function(t){var n=t[11]||"";var m=n.match(/DR:\s*(.+)/i);if(m&&t[10]>0){DR_MAP[t[0].toLowerCase()]=DR_MAP[t[0].toLowerCase()]||[];DR_MAP[t[0].toLowerCase()].push(m[1].trim().toLowerCase());}});
function detectAnomalies(dhData,members){var flags=[];dhData.forEach(function(d){if(d.st==="c"&&!d.invPaid)flags.push({type:"warn",msg:d.can+" @ "+d.cl+": Clear but no invoice paid"});if(d.st==="o"&&d.cd&&new Date(d.cd)<=NOW&&!d.invPaid)flags.push({type:"warn",msg:d.can+" @ "+d.cl+": past clearance, no invoice"});if(d.raw>d.inv&&d.st!=="t")flags.push({type:"err",msg:d.can+": raw exceeds invoice"});});
  // Guarantee expiration warnings (60 days)
  var today=new Date().toISOString().slice(0,10);var sixtyOut=new Date(Date.now()+60*24*60*60*1000).toISOString().slice(0,10);
  members.forEach(function(m){if(m.guarantee&&m.guarantee.active&&m.guarantee.endDate){
    if(m.guarantee.endDate<today)flags.push({type:"err",msg:m.name+": Floor EXPIRED on "+m.guarantee.endDate+" — still marked active"});
    else if(m.guarantee.endDate<=sixtyOut){var dLeft=Math.ceil((new Date(m.guarantee.endDate)-Date.now())/(1000*60*60*24));flags.push({type:"warn",msg:m.name+": Floor expires in "+dLeft+" days ("+m.guarantee.endDate+") — "+fmtD(m.guarantee.amount)+"/wk"});}
  }});
  return flags;}
// ── UI Components ──────────────────────────────────────────────
function Badge({v,children}){var m={green:{bg:C.greenDim,c:C.green},red:{bg:C.redDim,c:C.red},gold:{bg:C.goldDim,c:C.gold},blue:{bg:C.blueDim,c:C.blue},orange:{bg:C.orangeDim,c:C.orange},purple:{bg:C.purpleDim,c:C.purple},teal:{bg:C.tealDim,c:C.teal},muted:{bg:"rgba(255,255,255,.04)",c:C.textMuted}};var s=m[v]||m.muted;return <span style={{display:"inline-block",padding:"3px 9px",borderRadius:5,fontSize:12,fontWeight:600,fontFamily:FM,background:s.bg,color:s.c,whiteSpace:"nowrap"}}>{children}</span>;}
function Icon({name,sz,cl}){var s=sz||16,c=cl||C.textDim;var p={grid:"M3 3h7v7H3zM14 3h7v7H14zM3 14h7v7H3zM14 14h7v7H14z",upload:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",dollar:"M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",briefcase:"M2 7h20v14H2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",bar:"M18 20V10M12 20V4M6 20v-6",alert:"M12 9v4M12 17h.01M10.29 3.86l-8.6 14.86A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.71-2.98l-8.6-14.86a2 2 0 0 0-3.42 0z",edit:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",check:"M20 6L9 17l-5-5",download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",plus:"M12 5v14M5 12h14",mgr:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"};return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={p[name]||""}/></svg>;}
function Stat({l,v,s,c}){return <div style={{background:C.bgCard,border:"1px solid "+C.border,borderRadius:10,borderTop:"2px solid "+(c||C.accent)+"44",padding:"16px 18px",overflow:"hidden"}}><p style={{fontSize:12,color:C.textDim,margin:"0 0 6px",fontWeight:600,letterSpacing:".8px",fontFamily:FM}}>{l}</p><p style={{fontSize:26,fontWeight:800,margin:0,color:c||C.accent,fontFamily:FU,lineHeight:1.1}}>{v}</p>{s&&<p style={{fontSize:13,color:C.textMuted,margin:"6px 0 0",fontFamily:FM}}>{s}</p>}</div>;}
function Spark({data,w,h,color}){if(!data||data.length<2)return null;var mn=Math.min.apply(null,data),mx=Math.max.apply(null,data),range=mx-mn||1;var pts=data.map(function(d,i){return(i/(data.length-1))*w+","+(h-((d-mn)/range)*h);}).join(" ");var last=data[data.length-1],prev=data[data.length-2];var up=last>=prev;return <svg width={w} height={h} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color||(up?C.green:C.red)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx={w} cy={h-((last-mn)/range)*h} r="2" fill={color||(up?C.green:C.red)}/></svg>;}
function Panel({title,icon,right,children}){return <div className="panel"><div className="panel-hdr"><div style={{display:"flex",alignItems:"center",gap:6}}>{icon&&<Icon name={icon} sz={11} cl={C.textDim}/>}<h3>{title}</h3></div>{right&&<div style={{display:"flex",alignItems:"center",gap:4}}>{right}</div>}</div><div className="panel-body">{children}</div></div>;}
function Overlay({children,onClose}){return <div onClick={function(e){if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>{children}</div>;}
function TT({active,payload,label}){if(!active||!payload)return null;return <div style={{background:C.bgCard,border:"1px solid "+C.border,borderRadius:6,padding:"8px 12px",fontFamily:FM,fontSize:14,boxShadow:"0 4px 20px rgba(0,0,0,.5)"}}><p style={{margin:"0 0 4px",color:C.textMuted,fontSize:13}}>{label}</p>{payload.map(function(p,i){return <p key={i} style={{margin:0,color:p.color||C.accent,fontWeight:600}}>{p.name||""}: {fmt(p.value)}</p>;})}</div>;}
function DHEditModal({dh,onSave,onClose,onDelete}){
  var [d,setD]=useState(Object.assign({},dh));var up=function(k,v){setD(function(p){return Object.assign({},p,{[k]:v});});};
  var fi={width:"100%",borderRadius:4,padding:"7px 10px",fontSize:15,boxSizing:"border-box",fontFamily:FM};
  var lb={fontSize:12,color:C.textDim,fontWeight:700,textTransform:"uppercase",marginBottom:3,display:"block",letterSpacing:"1px",fontFamily:FM};
  var rf=function(l,k,w,ty){return <div key={k} style={{gridColumn:w?"span 2":undefined}}><label style={lb}>{l}</label>{ty==="select"?<select value={d[k]} onChange={function(e){up(k,e.target.value);}} style={fi}>{ST_OPTS.map(function(o){return <option key={o[0]} value={o[0]}>{o[1]}</option>;})}</select>:ty==="unit"?<select value={d[k]} onChange={function(e){up(k,e.target.value);}} style={fi}>{UNITS.map(function(u){return <option key={u}>{u}</option>;})}</select>:ty==="type"?<select value={d[k]} onChange={function(e){up(k,e.target.value);}} style={fi}><option value="S">Split</option><option value="FD">Full Desk</option></select>:<input value={d[k]||""} onChange={function(e){up(k,ty==="num"?+e.target.value||0:e.target.value);}} type={ty==="num"?"number":"text"} style={fi}/>}</div>;};
  return <Overlay onClose={onClose}><div className="panel" style={{maxWidth:600,width:"95%",maxHeight:"90vh",overflowY:"auto"}}><div className="panel-hdr"><h3>{dh.can?"EDIT DH PLACEMENT":"NEW DH PLACEMENT"}</h3></div><div className="panel-body" style={{padding:12}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>{rf("Client","cl",true)}{rf("Candidate","can")}{rf("Position","pos")}{rf("Account Manager","am")}{rf("Recruiter","rec")}{rf("Unit","unit",false,"unit")}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:8}}>{rf("Invoice","inv",false,"num")}{rf("Charge","chg",false,"num")}{rf("Raw","raw",false,"num")}{rf("Type","typ",false,"type")}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:8}}>{rf("Start Date","sd")}{rf("Guarantee Days","gd",false,"num")}{rf("Clearance","cd")}{rf("Status","st",false,"select")}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:8}}>{rf("Invoice Paid","invPaid")}{rf("Payroll WE","payrollWE")}{rf("Paid Date","paidDate")}</div>
    <div style={{marginBottom:16}}><label style={lb}>Notes</label><input value={d.notes||""} onChange={function(e){up("notes",e.target.value);}} style={fi} placeholder="Optional..."/></div>
    <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>{onDelete&&<button onClick={function(){onClose();onDelete();}} style={{marginRight:"auto",background:"transparent",border:"1px solid "+C.red+"44",color:C.red,padding:"5px 12px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>Delete</button>}<button onClick={onClose} className="btn-ghost" style={{padding:"5px 12px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>Cancel</button><button onClick={function(){onSave(d);}} className="btn-primary" style={{padding:"5px 12px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>Save</button></div>
  </div></div></Overlay>;
}
// ── Storage ────────────────────────────────────────────────────
var SK={members:"sc7-m",dh:"sc7-d",weeks:"sc7-w",locked:"sc7-lk",audit:"sc7-au",qsnap:"sc7-qs",dhsync:"sc7-ds",config:"sc7-cfg",overrides:"sc7-ov"};
// Storage functions replaced by API layer in production
// sav/ld are now no-ops locally — actual persistence handled by onSave prop
var _pendingSave=null;
async function sav(k,v){/* no-op — save handled by auto-save effect */}
async function ld(k){return null;/* load handled by initialData prop */}
// ═══════════════════════════════════════════════════════════════
export default function App({ initialData, userInfo, onSave, onReload, onLogout, loadError, conflictInfo, onDismissConflict }){
  // Auth from MSAL — no PINs needed
  var userRole = userInfo ? userInfo.role : "rep";
  var userEmail = userInfo ? userInfo.email : "";
  var userName = userInfo ? userInfo.name : "";
  var [members,setMembers]=useState(function(){
    if(initialData&&initialData.members&&initialData.members.length){
      var loaded=initialData.members.map(function(m){if(!m.email&&EMAIL_MAP[m.name])m=Object.assign({},m,{email:EMAIL_MAP[m.name]});return m;});
      loaded.forEach(function(m,i){if(!m.pin){loaded[i]=Object.assign({},m,{pin:genPin(loaded)});}});
      return loaded;
    }
    var list=[];_T.forEach(function(t){list.push(initM(t,list));});return list;
  });
  var [dhData,setDhData]=useState(initialData&&initialData.dhData&&initialData.dhData.length?initialData.dhData:_DH);
  // chargeWeeks: [{id, weekEnding, importedAt, rows:[{name, matchedId, ytdRaw, splitRec, splitAM, fullDesk, rawCharge}]}]
  var [chargeWeeks,setChargeWeeks]=useState(initialData&&initialData.chargeWeeks?initialData.chargeWeeks:[]);
  var [lockedWeeks,setLockedWeeks]=useState(initialData&&initialData.lockedWeeks?initialData.lockedWeeks:[]);
  var [auditLog,setAuditLog]=useState(initialData&&initialData.auditLog?initialData.auditLog:[]);
  // Quarter snapshots: [{qKey:"Q1-2026", members:[{id,name,ytdRaw}]}]
  var [qSnapshots,setQSnapshots]=useState(initialData&&initialData.qSnapshots?initialData.qSnapshots:[]);
  var [view,setView]=useState("command");
  var [cmdDrill,setCmdDrill]=useState(null); // null, "ytd", "floor", "dh", "guarantee"
  var [repMode,setRepMode]=useState(userRole === "rep");
  var [repId,setRepId]=useState(null);
  // MSAL handles auth — no login route or PIN needed
  var adminAuthenticated = userRole === "admin";
  var [selectedWeek,setSelectedWeek]=useState(null);
  var [editMemberId,setEditMemberId]=useState(null);
  var [dhFilter,setDhFilter]=useState("");var [dhSt,setDhSt]=useState("ALL");var [dhUnit,setDhUnit]=useState("ALL");var [dhAM,setDhAM]=useState("ALL");var [dhRec,setDhRec]=useState("ALL");
  var [teamUnit,setTeamUnit]=useState("ALL");var [teamEntity,setTeamEntity]=useState("ALL");var [teamSearch,setTeamSearch]=useState("");var [showInactive,setShowInactive]=useState(false);
  var [teamSortKey,setTeamSortKey]=useState("ytd");var [teamSortDir,setTeamSortDir]=useState("desc");
  var [showDHForm,setShowDHForm]=useState(false);var [dhFormatOpen,setDhFormatOpen]=useState(true);
  var [payrollOverrides,setPayrollOverrides]=useState(initialData&&initialData.payrollOverrides?initialData.payrollOverrides:{});var [editingPayout,setEditingPayout]=useState(null);var [editPayoutVal,setEditPayoutVal]=useState("");
  var [dhEditIdx,setDhEditIdx]=useState(null);var [dhLastSync,setDhLastSync]=useState(initialData&&initialData.dhLastSync?initialData.dhLastSync:null);
  var [dismissedRecon,setDismissedRecon]=useState([]);
  var [toast,setToast]=useState(null);
  var [importText,setImportText]=useState("");
  var [importWE,setImportWE]=useState("");
  var [importPreview,setImportPreview]=useState(null);
  var [loaded,setLoaded]=useState(!!initialData);
  var [config,setConfig]=useState(initialData&&initialData.config?Object.assign({},DEFAULT_CFG,initialData.config):DEFAULT_CFG);
  var [adminTab,setAdminTab]=useState("floors");
  var [applyPath,setApplyPath]=useState("");
  var [applyMember,setApplyMember]=useState("");
  // Dynamic floor values from config
  var FLOOR=config.floors.quarterly;var FLOOR_ANNUAL=config.floors.annual;var FLOOR_WEEKLY_DEDUCT=config.floors.weekly;
  var ENTITIES=config.entities;
  var UNITS=config.units.map(function(u){return u.name;});
  var UB={};config.units.forEach(function(u){UB[u.name]=u.color;});
  var [confirmDlg,setConfirm]=useState(null);
  var [exportModal,setExportModal]=useState(null); // {title, content, type:"text"|"html"}
  var showExport=function(title,content){setExportModal({title:title,content:content});};
  var [expandedRow,setExpandedRow]=useState(null);
  var [editingCharge,setEditingCharge]=useState(null); // {weekId, rowIdx}
  var log=useCallback(function(a,d){setAuditLog(function(p){return[{ts:new Date().toISOString(),action:a,detail:d}].concat(p).slice(0,500);});},[]);
  var showToast=function(m,t){setToast({msg:m,type:t||"ok"});setTimeout(function(){setToast(null);},3500);};
  // Data loaded from props (via Azure Function). Auto-detect rep if in rep mode.
  useEffect(function(){
    if(!loaded) { setLoaded(true); }
    // Auto-match rep by email on first load
    if(userRole==="rep"&&userEmail&&!repId){
      var match=members.find(function(m){return m.email&&m.email.toLowerCase()===userEmail.toLowerCase();});
      if(match){setRepId(match.id);setRepMode(true);}
    }
  },[]);
  // Auto-save
  var saveRef=useRef(null);
  var [saveStatus,setSaveStatus]=useState("saved"); // "saved","saving","unsaved"
  var prevCfgRef=useRef(null);
  var doSave=function(){
    if(userRole!=="admin"||!onSave)return;
    setSaveStatus("saving");
    var payload={members:members,dhData:dhData,chargeWeeks:chargeWeeks,lockedWeeks:lockedWeeks,auditLog:auditLog,qSnapshots:qSnapshots,config:config,payrollOverrides:payrollOverrides,dhLastSync:dhLastSync,lastSavedBy:userEmail,lastSavedAt:new Date().toISOString()};
    onSave(payload).then(function(r){setSaveStatus(r&&r.success?"saved":"error");if(!r||!r.success){if(r&&r.conflict){showToast("Conflict — another admin saved. Reload?","err");}else{showToast("Save failed","err");}}}).catch(function(){setSaveStatus("error");showToast("Save failed","err");});
  };
  useEffect(function(){
    if(!loaded)return;
    if(prevCfgRef.current){
      var prev=prevCfgRef.current;
      if(prev.floors.weekly!==config.floors.weekly)log("CONFIG_CHANGE","Weekly minimum: $"+prev.floors.weekly+" → $"+config.floors.weekly);
      if(prev.floors.quarterly!==config.floors.quarterly)log("CONFIG_CHANGE","Quarterly floor: $"+prev.floors.quarterly+" → $"+config.floors.quarterly);
      if(prev.floors.annual!==config.floors.annual)log("CONFIG_CHANGE","Annual unlock: $"+prev.floors.annual+" → $"+config.floors.annual);
      if(prev.careerPaths.length!==config.careerPaths.length)log("CONFIG_CHANGE","Career paths: "+prev.careerPaths.length+" → "+config.careerPaths.length);
      if(prev.entities.length!==config.entities.length)log("CONFIG_CHANGE","Entities: "+prev.entities.length+" → "+config.entities.length);
      if(prev.units.length!==config.units.length)log("CONFIG_CHANGE","Units: "+prev.units.length+" → "+config.units.length);
    }
    prevCfgRef.current=JSON.parse(JSON.stringify(config));
  },[config,loaded]);
  useEffect(function(){if(!loaded||userRole!=="admin")return;
    setSaveStatus("unsaved");if(saveRef.current)clearTimeout(saveRef.current);saveRef.current=setTimeout(function(){
      setSaveStatus("saving");
      var payload={members:members,dhData:dhData,chargeWeeks:chargeWeeks,lockedWeeks:lockedWeeks,auditLog:auditLog,qSnapshots:qSnapshots,config:config,payrollOverrides:payrollOverrides,dhLastSync:dhLastSync,lastSavedBy:userEmail,lastSavedAt:new Date().toISOString()};
      if(onSave){onSave(payload).then(function(r){setSaveStatus(r&&r.success?"saved":"error");}).catch(function(){setSaveStatus("error");});}
      else{setSaveStatus("saved");}
    },1200);
  },[members,dhData,chargeWeeks,lockedWeeks,auditLog,qSnapshots,dhLastSync,loaded,config,payrollOverrides]);
  // ── CSV PARSER — matches exact charge format ────────────
  var parseChargeCSV=useCallback(function(text){
    var rows_raw=parseCSV(text.trim());
    if(!rows_raw||rows_raw.length<2){showToast("No data found","err");return;}
    var hdr=rows_raw[0].map(function(h){return(h||"").toLowerCase().trim();});
    // Auto-detect columns
    var col=function(names){for(var j=0;j<names.length;j++){for(var i=0;i<hdr.length;i++){if(hdr[i]===names[j])return i;}}for(var j=0;j<names.length;j++){for(var i=0;i<hdr.length;i++){var re=new RegExp("(^|[^a-z])"+names[j].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^a-z])");if(re.test(hdr[i]))return i;}}return-1;};
    var iWE=col(["week ending","week end","we","weekending"]);
    var iName=col(["name","member","employee","rep"]);if(iName<0)iName=0;
    var iYTD=col(["ytd raw","ytd","year to date"]);
    var iRec=col(["split rec","split recruiting","recruiting","rec"]);
    var iAM=col(["split am","split sales","split sale","am/sales","am sales","am/sale","sales","sale am","account manager","acct mgr","sale","am"]);
    var iFD=col(["full desk","fulldesk","fd"]);
    var iRaw=col(["raw charge","raw","total charge","weekly raw"]);
    // Fallback to positional if no headers detected
    if(iYTD<0)iYTD=iName+1;if(iRec<0)iRec=iName+2;if(iAM<0)iAM=iName+3;if(iFD<0)iFD=iName+4;if(iRaw<0)iRaw=iName+5;
    var isBulk=iWE>=0;
    var detectedCols={WE:iWE>=0?hdr[iWE]:"—",Name:hdr[iName]||"—",YTD:iYTD>=0?hdr[iYTD]:"—",Rec:iRec>=0?hdr[iRec]:"(pos "+iRec+")",AM:iAM>=0?hdr[iAM]:"(pos "+iAM+")",FD:iFD>=0?hdr[iFD]:"(pos "+iFD+")",Raw:iRaw>=0?hdr[iRaw]:"(pos "+iRaw+")"};
    console.log("SparkV7 Column Detection:",detectedCols,"Headers:",hdr);
    var rows=[];
    for(var i=1;i<rows_raw.length;i++){
      var row=rows_raw[i];
      var name=(row[iName]||"").trim();
      if(!name)continue;
      var ytdRaw=parseCurrency(row[iYTD]);
      var splitRec=parseCurrency(row[iRec]);
      var splitAM=parseCurrency(row[iAM]);
      var fullDesk=parseCurrency(row[iFD]);
      var rawCharge=parseCurrency(row[iRaw]);
      if(ytdRaw===0&&splitRec===0&&splitAM===0&&fullDesk===0&&rawCharge===0)continue;
      var matched=matchMember(name,members);
      var we=isBulk?(row[iWE]||"").trim():"";
      rows.push({we:we,name:name,matchedId:matched?matched.id:null,matchedName:matched?matched.name:"UNMATCHED",ytdRaw:ytdRaw,splitRec:splitRec,splitAM:splitAM,fullDesk:fullDesk,rawCharge:rawCharge});
    }
    if(!rows.length){showToast("No valid rows","err");return;}
    if(isBulk){
      // Group by week ending
      var weekMap={};rows.forEach(function(r){if(!r.we)return;if(!weekMap[r.we])weekMap[r.we]=[];weekMap[r.we].push(r);});
      var weekKeys=Object.keys(weekMap).sort(function(a,b){
        var pa=a.split(/[-\/]/);var pb=b.split(/[-\/]/);
        var da=new Date(2000+(+pa[2]||0),+(pa[0]||1)-1,+(pa[1]||1));
        var db=new Date(2000+(+pb[2]||0),+(pb[0]||1)-1,+(pb[1]||1));
        return da-db;
      });
      if(weekKeys.length>1){
        setImportPreview({rows:rows,unmatchedCount:rows.filter(function(r){return!r.matchedId;}).length,bulk:true,weekMap:weekMap,weekKeys:weekKeys,detectedCols:detectedCols});
        return;
      }
    }
    setImportPreview({rows:rows,unmatchedCount:rows.filter(function(r){return!r.matchedId;}).length,bulk:false,detectedCols:detectedCols});
  },[members]);
  var commitBulkImport=function(){
    if(!importPreview||!importPreview.bulk)return;
    var weekMap=importPreview.weekMap;var weekKeys=importPreview.weekKeys;
    var added=0;var skipped=0;var totalMatched=0;var totalUnmatched=0;
    var newWeeks=chargeWeeks.slice();
    weekKeys.forEach(function(we){
      if(lockedWeeks.includes(we)){skipped++;return;}
      var allRows=weekMap[we];var rows=allRows.filter(function(r){return!!r.matchedId;});
      totalMatched+=rows.length;totalUnmatched+=(allRows.length-rows.length);
      if(!rows.length){skipped++;return;}
      var week={id:Date.now()+Math.random(),weekEnding:we,importedAt:new Date().toISOString(),rows:rows};
      var existIdx=newWeeks.findIndex(function(w){return w.weekEnding===we;});
      if(existIdx>=0){newWeeks[existIdx]=week;}else{newWeeks.push(week);}
      added++;
    });
    // Sort newest first
    newWeeks.sort(function(a,b){
      var pa=a.weekEnding.split(/[-\/]/);var pb=b.weekEnding.split(/[-\/]/);
      var da=new Date(2000+(+pa[2]||0),+(pa[0]||1)-1,+(pa[1]||1));
      var db=new Date(2000+(+pb[2]||0),+(pb[0]||1)-1,+(pb[1]||1));
      return db-da;
    });
    setChargeWeeks(newWeeks);
    setImportPreview(null);setImportText("");
    log("BULK_IMPORT",added+" weeks, "+totalMatched+" matched"+(totalUnmatched?", "+totalUnmatched+" unmatched skipped":""));
    showToast(added+" weeks imported, "+totalMatched+" rows"+(totalUnmatched?", "+totalUnmatched+" skipped":""));
    rebuildSnapshots(newWeeks);
    setView("charges");
  };
  var commitChargeImport=function(){
    if(!importPreview||!importWE){showToast("Set week ending date","err");return;}
    if(lockedWeeks.includes(importWE)){showToast("Week "+importWE+" is locked","err");return;}
    var existing=chargeWeeks.find(function(w){return w.weekEnding===importWE;});
    if(existing){setConfirm({msg:"Week ending "+importWE+" already exists with "+existing.rows.length+" rows. Overwrite with new import?",fn:function(){doCommitWeek(importWE,existing);}});return;}
    doCommitWeek(importWE,null);
  };
  var doCommitWeek=function(we,existing){
    var matched=importPreview.rows.filter(function(r){return!!r.matchedId;});
    var skipped=importPreview.rows.length-matched.length;
    if(!matched.length){showToast("No matched rows to import","err");return;}
    var week={id:Date.now(),weekEnding:we,importedAt:new Date().toISOString(),rows:matched};
    var newWeeks=existing?chargeWeeks.map(function(w){return w.weekEnding===we?week:w;}):[week].concat(chargeWeeks);
    setChargeWeeks(newWeeks);setSelectedWeek(week.id);
    setImportPreview(null);setImportText("");setConfirm(null);
    log("IMPORT_WEEK","WE "+we+" \u2014 "+matched.length+" matched"+(skipped?", "+skipped+" skipped: "+importPreview.rows.filter(function(r){return!r.matchedId;}).map(function(r){return r.name;}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(", "):""));
    showToast(matched.length+" rows imported"+(skipped?", "+skipped+" skipped":""));
    setView("charges");rebuildSnapshots(newWeeks);
  };
  // Rebuild quarter snapshots from all imported weeks
  // For each quarter, find the LATEST week and snapshot each member's YTD
  var rebuildSnapshots=function(weeks){
    var qMap={};
    (weeks||chargeWeeks).forEach(function(w){
      var we=w.weekEnding;var d=new Date(we);var q=getQ(we);var yr=d.getFullYear();
      var qKey="Q"+q+"-"+yr;
      if(!qMap[qKey]||new Date(w.weekEnding)>new Date(qMap[qKey].weekEnding)){
        qMap[qKey]={qKey:qKey,quarter:q,year:yr,weekEnding:w.weekEnding,members:w.rows.map(function(r){return{id:r.matchedId,name:r.matchedName||r.name,ytdRaw:r.ytdRaw};})};
      }
    });
    setQSnapshots(Object.values(qMap));
  };
  // ── Computed Data ────────────────────────────────────────────
  var readyDH=useMemo(function(){return dhData.map(function(d,i){return Object.assign({},d,{idx:i});}).filter(function(d){return isReady(d)&&!d.paidOut;});},[dhData]);
  var anomalies=useMemo(function(){var all=detectAnomalies(dhData,members);return all.filter(function(a){return!dismissedRecon.includes(a.msg);});},[dhData,members,dismissedRecon]);
  var activeWeek=useMemo(function(){return chargeWeeks.find(function(w){return w.id===selectedWeek;})||null;},[chargeWeeks,selectedWeek]);
  // ── FLOOR-AWARE COMMISSION ENGINE ─────────────────────────────
  // Floor rules:
  // - $25K QTD tier cumulative to unlock (resets each quarter)
  // - Below floor: deduct $2,500 from raw charge before splitting
  // - Cross $25K QTD tier mid-week: recalc from $0 (no deduction) that same week
  // - $100K YTD: floor permanently off rest of year
  // - DH commission only eligible after crossing $25K QTD tier
  // - Flat-rate members (managers) exempt from floor
  // Compute QTD for a member in a given week + when they crossed $25K
  var getFloorInfo=useCallback(function(row,week){
    if(!row.matchedId)return{qtd:0,ytd:0,belowFloor:false,deduction:0,reason:"unmatched",dhEligible:false,crossDate:null};
    var m=members.find(function(x){return x.id===row.matchedId;});
    if(!m)return{qtd:0,ytd:row.ytdRaw,belowFloor:false,deduction:0,reason:"no member",dhEligible:false,crossDate:null};
    // Flat-rate members exempt from floor
    if(m.rates.flat>0)return{qtd:row.ytdRaw,ytd:row.ytdRaw,belowFloor:false,deduction:0,reason:"Flat rate (exempt)",dhEligible:true,crossDate:null};
    var ytd=row.ytdRaw;
    // Annual unlock: $100K YTD
    if(ytd>=FLOOR_ANNUAL)return{qtd:ytd,ytd:ytd,belowFloor:false,deduction:0,reason:"$100K annual unlock",dhEligible:true,crossDate:null};
    // Compute QTD
    var we=week.weekEnding;var q=getQ(we);var yr=new Date(we).getFullYear();
    var qtd;
    if(q===1){
      qtd=ytd;
    }else{
      var priorQKey="Q"+(q-1)+"-"+yr;
      var snap=qSnapshots.find(function(s){return s.qKey===priorQKey;});
      var priorYtd=null;
      if(snap){var sm=snap.members.find(function(x){return x.id===row.matchedId;});if(sm)priorYtd=sm.ytdRaw;}
      if(priorYtd===null){
        var priorQEnd=null;
        chargeWeeks.forEach(function(w){
          if(w.id===week.id)return;
          var wq=getQ(w.weekEnding);var wy=new Date(w.weekEnding).getFullYear();
          if(wy===yr&&wq===q-1){
            var mrow=w.rows.find(function(r){return r.matchedId===row.matchedId;});
            if(mrow&&(!priorQEnd||new Date(w.weekEnding)>new Date(priorQEnd.we)))priorQEnd={we:w.weekEnding,ytd:mrow.ytdRaw};
          }
        });
        if(priorQEnd)priorYtd=priorQEnd.ytd;
      }
      if(priorYtd!==null){qtd=ytd-priorYtd;}else{
        qtd=0;
        chargeWeeks.forEach(function(w){
          var wq=getQ(w.weekEnding);var wy=new Date(w.weekEnding).getFullYear();
          if(wy===yr&&wq===q&&new Date(w.weekEnding)<=new Date(we)){
            var mrow=w.rows.find(function(r){return r.matchedId===row.matchedId;});
            if(mrow)qtd+=mrow.rawCharge;
          }
        });
      }
    }
    // Find when they crossed $25K QTD tier (for DH eligibility dating)
    var crossDate=null;
    if(qtd>=FLOOR){
      var sortedWeeks=chargeWeeks.slice().sort(function(a,b){return new Date(a.weekEnding)-new Date(b.weekEnding);});
      var running=0;
      for(var wi=0;wi<sortedWeeks.length;wi++){
        var w=sortedWeeks[wi];var wq=getQ(w.weekEnding);var wy=new Date(w.weekEnding).getFullYear();
        if(wy!==yr||wq!==q)continue;
        var mrow=w.rows.find(function(r){return r.matchedId===row.matchedId;});
        if(mrow){running+=mrow.rawCharge;if(running>=FLOOR){crossDate=w.weekEnding;break;}}
      }
    }
    // Floor check — detect mid-week crossing
    var priorQTD=qtd-row.rawCharge;
    var crossing=priorQTD<FLOOR&&qtd>=FLOOR;
    if(crossing){
      var belowPortion=FLOOR-priorQTD;
      var abovePortion=row.rawCharge-belowPortion;
      return{qtd:qtd,ytd:ytd,belowFloor:false,deduction:0,reason:"CROSSING $25K this week ("+fmtD(belowPortion)+" below + "+fmtD(abovePortion)+" above)",dhEligible:true,crossDate:crossDate,crossing:true,belowPortion:belowPortion,abovePortion:abovePortion,priorQTD:priorQTD};
    }
    if(qtd>=FLOOR)return{qtd:qtd,ytd:ytd,belowFloor:false,deduction:0,reason:"Above $25K QTD tier ("+fmt(qtd)+")",dhEligible:true,crossDate:crossDate,crossing:false,belowPortion:0,abovePortion:0,priorQTD:priorQTD};
    // Below floor: if raw < $2,500 => $0; if raw >= $2,500 => deduct $2,500
    var rawTotal=row.rawCharge;
    if(rawTotal<FLOOR_WEEKLY_DEDUCT){
      return{qtd:qtd,ytd:ytd,belowFloor:true,deduction:rawTotal,reason:fmt(qtd)+" QTD · raw "+fmtD(rawTotal)+" < $2,500 = $0",dhEligible:false,crossDate:null,crossing:false,belowPortion:0,abovePortion:0,priorQTD:priorQTD};
    }
    return{qtd:qtd,ytd:ytd,belowFloor:true,deduction:FLOOR_WEEKLY_DEDUCT,reason:fmt(qtd)+" QTD · "+fmtD(rawTotal)+" - $2,500 = "+fmtD(rawTotal-FLOOR_WEEKLY_DEDUCT)+" commissionable",dhEligible:false,crossDate:null,crossing:false,belowPortion:0,abovePortion:0,priorQTD:priorQTD};
  },[members,chargeWeeks,qSnapshots]);
  // Commission calc: pro-rata $2,500 deduction when below $25K QTD tier, full raw when above
  var calcRowComm=useCallback(function(row,floorInfo,week){
    var empty={splitRecComm:0,splitAMComm:0,fdComm:0,totalComm:0,deduction:0,trueUp:0,rate:"—",steps:[],floorInfo:null};
    if(!row.matchedId)return empty;
    var m=members.find(function(x){return x.id===row.matchedId;});
    if(!m)return empty;
    // Exception: HOLD members get $0 commission
    if(m.notes&&m.notes.toLowerCase().indexOf("hold")>=0){
      return{splitRecComm:0,splitAMComm:0,fdComm:0,totalComm:0,deduction:0,trueUp:0,rate:"HOLD",steps:[{t:"Commission Hold",d:m.notes,a:0}],floorInfo:floorInfo};
    }
    // Guaranteed weekly commission (fixed amount regardless of charges)
    if(m.guarantee&&m.guarantee.active&&m.guarantee.amount>0){
      var expired=m.guarantee.endDate&&week&&week.weekEnding>m.guarantee.endDate;
      if(!expired){
        return{splitRecComm:0,splitAMComm:0,fdComm:0,totalComm:m.guarantee.amount,deduction:0,trueUp:0,rate:"Floor",steps:[{t:"Weekly Floor",d:"Fixed "+fmtD(m.guarantee.amount)+"/week"+(m.guarantee.endDate?" through "+m.guarantee.endDate:""),a:m.guarantee.amount}],floorInfo:floorInfo};
      }
    }
    var r=m.rates,steps=[];
    var fi=floorInfo||{belowFloor:false,deduction:0};
    var rawTotal=row.rawCharge;
    // FD is embedded INSIDE Split AM — extract pure AM portion
    var pureSR=row.splitRec;
    var pureAM=Math.max(0,row.splitAM-row.fullDesk); // AM-only (subtract FD overlap)
    var pureFD=row.fullDesk;
    // Flat rate (managers) — exempt from floor, paid quarterly
    if(r.flat>0){
      var total=rawTotal*r.flat; // raw = splitRec + splitAM (FD already inside AM)
      steps.push({t:"Flat Rate (Quarterly)",d:"Paid quarterly, not weekly",a:0});
      if(pureSR)steps.push({t:"Split Rec (Flat)",d:fmtD(pureSR)+" × "+(r.flat*100)+"%",a:pureSR*r.flat});
      if(pureAM)steps.push({t:"Split AM (Flat)",d:fmtD(pureAM)+" × "+(r.flat*100)+"%",a:pureAM*r.flat});
      if(pureFD)steps.push({t:"Full Desk (Flat)",d:fmtD(pureFD)+" × "+(r.flat*100)+"%",a:pureFD*r.flat});
      return{splitRecComm:pureSR*r.flat,splitAMComm:pureAM*r.flat,fdComm:pureFD*r.flat,totalComm:total,deduction:0,trueUp:0,rate:(r.flat*100)+"%F",steps:steps,floorInfo:fi};
    }
    // Below $25K QTD tier floor logic
    if(fi.belowFloor){
      // Under $2,500 weekly raw = $0 commission, gone forever
      if(rawTotal<FLOOR_WEEKLY_DEDUCT){
        steps.push({t:"Below Weekly Minimum",d:fmtD(rawTotal)+" raw < $2,500 minimum — $0 commission",a:0});
        return{splitRecComm:0,splitAMComm:0,fdComm:0,totalComm:0,deduction:rawTotal,trueUp:0,rate:"$0",steps:steps,floorInfo:fi};
      }
      // At or above $2,500: commission on (raw - $2,500), pro-rata across buckets
      var commissionable=rawTotal-FLOOR_WEEKLY_DEDUCT;
      var ratio=rawTotal>0?commissionable/rawTotal:0;
      var adjSR=pureSR*ratio;var adjAM=pureAM*ratio;var adjFD=pureFD*ratio;
      steps.push({t:"Tier Deduction",d:fmtD(rawTotal)+" raw - $2,500 = "+fmtD(commissionable)+" commissionable (pro-rata)",a:0});
      var src=adjSR*r.sA;var sac=adjAM*r.sA;var fdc=adjFD*r.fdA;
      if(adjSR>0)steps.push({t:"Split Recruiter",d:fmtD(adjSR)+" (adj) × "+(r.sA*100)+"%",a:src});
      if(adjAM>0)steps.push({t:"Split AM/Sales",d:fmtD(adjAM)+" (adj from "+fmtD(row.splitAM)+" - "+fmtD(pureFD)+" FD) × "+(r.sA*100)+"%",a:sac});
      if(adjFD>0)steps.push({t:"Full Desk",d:fmtD(adjFD)+" (adj) × "+(r.fdA*100)+"%",a:fdc});
      return{splitRecComm:src,splitAMComm:sac,fdComm:fdc,totalComm:src+sac+fdc,deduction:FLOOR_WEEKLY_DEDUCT,trueUp:0,rate:(r.fdA*100)+"/"+(r.sA*100)+"%",steps:steps,floorInfo:fi};
    }
    // CROSSING WEEK: split charge into below and above portions
    if(fi.crossing){
      var belowP=fi.belowPortion;var aboveP=fi.abovePortion;
      var belowRatio=rawTotal>0?belowP/rawTotal:0;
      var aboveRatio=rawTotal>0?aboveP/rawTotal:0;
      steps.push({t:"Crossing $25K",d:"Prior QTD "+fmtD(fi.priorQTD)+" + "+fmtD(rawTotal)+" this week = "+fmtD(fi.qtd)+" QTD",a:0});
      // Below portion
      var belowComm=0;
      if(belowP<FLOOR_WEEKLY_DEDUCT){
        steps.push({t:"Below Portion",d:fmtD(belowP)+" (gap to $25K) < $2,500 → $0",a:0});
      }else{
        var belowCommissionable=belowP-FLOOR_WEEKLY_DEDUCT;
        var bRatio=belowP>0?belowCommissionable/belowP:0;
        var bSR=pureSR*belowRatio*bRatio;var bAM=pureAM*belowRatio*bRatio;var bFD=pureFD*belowRatio*bRatio;
        belowComm=bSR*r.sA+bAM*r.sA+bFD*r.fdA;
        steps.push({t:"Below Portion",d:fmtD(belowP)+" - $2,500 = "+fmtD(belowCommissionable)+" commissionable → "+fmtD(belowComm),a:belowComm});
      }
      // Above portion: full rate
      var aSR=pureSR*aboveRatio;var aAM=pureAM*aboveRatio;var aFD=pureFD*aboveRatio;
      var aboveComm=aSR*r.sA+aAM*r.sA+aFD*r.fdA;
      steps.push({t:"Above Portion",d:fmtD(aboveP)+" at full rate → "+fmtD(aboveComm),a:aboveComm});
      var totalC=belowComm+aboveComm;
      return{splitRecComm:(pureSR*belowRatio*(belowP>=FLOOR_WEEKLY_DEDUCT?(belowP-FLOOR_WEEKLY_DEDUCT)/belowP:0)+pureSR*aboveRatio)*r.sA,splitAMComm:(pureAM*belowRatio*(belowP>=FLOOR_WEEKLY_DEDUCT?(belowP-FLOOR_WEEKLY_DEDUCT)/belowP:0)+pureAM*aboveRatio)*r.sA,fdComm:(pureFD*belowRatio*(belowP>=FLOOR_WEEKLY_DEDUCT?(belowP-FLOOR_WEEKLY_DEDUCT)/belowP:0)+pureFD*aboveRatio)*r.fdA,totalComm:totalC,deduction:belowP<FLOOR_WEEKLY_DEDUCT?belowP:FLOOR_WEEKLY_DEDUCT,trueUp:0,rate:(r.fdA*100)+"/"+(r.sA*100)+"%",steps:steps,floorInfo:fi};
    }
    // Above $25K QTD tier (or $100K annual): full raw, no deduction
    var src2=pureSR*r.sA;var sac2=pureAM*r.sA;var fdc2=pureFD*r.fdA;
    if(pureSR>0)steps.push({t:"Split Recruiter",d:fmtD(pureSR)+" × "+(r.sA*100)+"%",a:src2});
    if(pureAM>0)steps.push({t:"Split AM/Sales",d:fmtD(pureAM)+" ("+fmtD(row.splitAM)+" - "+fmtD(pureFD)+" FD) × "+(r.sA*100)+"%",a:sac2});
    if(pureFD>0)steps.push({t:"Full Desk",d:fmtD(pureFD)+" × "+(r.fdA*100)+"%",a:fdc2});
    if(!fi.belowFloor&&fi.qtd>=FLOOR)steps.push({t:"Tier Status",d:"Above $25K QTD tier — no deduction, full raw commission",a:0});
    return{splitRecComm:src2,splitAMComm:sac2,fdComm:fdc2,totalComm:src2+sac2+fdc2,deduction:0,trueUp:0,rate:(r.fdA*100)+"/"+(r.sA*100)+"%",steps:steps,floorInfo:fi};
  },[members,chargeWeeks,getFloorInfo]);
  // Enriched week data with commissions + floor status
  var weekData=useMemo(function(){
    if(!activeWeek)return[];
    return activeWeek.rows.map(function(row,idx){
      var fi=getFloorInfo(row,activeWeek);
      var comm=calcRowComm(row,fi,activeWeek);
      var m=row.matchedId?members.find(function(x){return x.id===row.matchedId;}):null;
      return Object.assign({},row,comm,{member:m,aboveFloor:!fi.belowFloor,floorInfo:fi,origIdx:idx});
    }).sort(function(a,b){return b.rawCharge-a.rawCharge;});
  },[activeWeek,calcRowComm,getFloorInfo,members]);
  var weekTotals=useMemo(function(){
    var t={splitRec:0,splitAM:0,fullDesk:0,rawCharge:0,totalComm:0,trueUp:0,deductions:0};
    weekData.forEach(function(r){t.splitRec+=r.splitRec;t.splitAM+=r.splitAM;t.fullDesk+=r.fullDesk;t.rawCharge+=r.rawCharge;t.totalComm+=r.totalComm;t.trueUp+=(r.trueUp||0);t.deductions+=(r.deduction||0);});
    return t;
  },[weekData]);
  // YTD standings from latest week
  var ytdStandings=useMemo(function(){
    var latest=chargeWeeks.length?chargeWeeks[0]:null;
    if(!latest)return[];
    return latest.rows.map(function(r){
      var m=r.matchedId?members.find(function(x){return x.id===r.matchedId;}):null;
      var fi=getFloorInfo(r,latest);
      // Sparkline: weekly raw charges across all loaded weeks (chronological)
      var weeklyRaw=chargeWeeks.slice().reverse().map(function(w){
        var row=w.rows.find(function(x){return x.matchedId===r.matchedId;});
        return row?row.rawCharge:0;
      });
      // Floor forecast: weeks to $25K at avg weekly raw
      var avgWeekly=weeklyRaw.length?weeklyRaw.reduce(function(a,v){return a+v;},0)/weeklyRaw.length:0;
      var weeksTo25K=fi.qtd>=FLOOR?0:avgWeekly>0?Math.ceil((FLOOR-fi.qtd)/avgWeekly):null;
      return{name:r.matchedName||r.name,ytdRaw:r.ytdRaw,qtd:fi.qtd,aboveFloor:!fi.belowFloor,dhEligible:fi.dhEligible,unit:m?m.unit:"",member:m,floorInfo:fi,weeklyRaw:weeklyRaw,avgWeekly:avgWeekly,weeksTo25K:weeksTo25K};
    }).sort(function(a,b){return b.ytdRaw-a.ytdRaw;});
  },[chargeWeeks,members,getFloorInfo]);
  // DH filtered
  var dhF=useMemo(function(){var d=dhData.slice();if(dhSt==="r")d=d.filter(function(x){return isReady(x)&&!x.paidOut;});else if(dhSt!=="ALL")d=d.filter(function(x){return x.st===dhSt;});if(dhUnit!=="ALL")d=d.filter(function(x){return x.unit===dhUnit;});if(dhAM!=="ALL")d=d.filter(function(x){return x.am===dhAM;});if(dhRec!=="ALL")d=d.filter(function(x){return x.rec===dhRec;});if(dhFilter){var f=dhFilter.toLowerCase();d=d.filter(function(x){return(x.cl+x.can+x.rec+x.am+x.pos).toLowerCase().includes(f);});}return d;},[dhData,dhSt,dhFilter,dhUnit,dhAM,dhRec]);
  var dhUnits=useMemo(function(){var s=new Set();dhData.forEach(function(d){if(d.unit)s.add(d.unit);});return Array.from(s).sort();},[dhData]);
  var dhAMs=useMemo(function(){var s=new Set();dhData.forEach(function(d){if(d.am)s.add(d.am);});return Array.from(s).sort();},[dhData]);
  var dhRecs=useMemo(function(){var s=new Set();dhData.forEach(function(d){if(d.rec)s.add(d.rec);});return Array.from(s).sort();},[dhData]);
  var eM=editMemberId?members.find(function(x){return x.id===editMemberId;}):null;
  var goEdit=function(id){setEditMemberId(id);setView("edit");};
  var upM=function(id,fn){setMembers(function(p){return p.map(function(e){return e.id===id?fn(Object.assign({},e)):e;});});};
  var addMember=function(){var m=initM(["New Member","Talent","","MI Metro","Recruiter",0.15,0.05,0.15,0.05,0,0,""],members);setMembers(function(p){return p.concat(m);});goEdit(m.id);log("ADD_MEMBER","New Member (PIN: "+m.pin+")");showToast("New member added — 6-digit PIN auto-assigned");};
  // DH operations
  var blankDH={cl:"",am:"",rec:"",amId:null,recId:null,can:"",pos:"",inv:0,chg:0,typ:"S",raw:0,unit:"MI Metro",sd:"",gd:90,cd:"",st:"p",invPaid:"",payrollWE:"",paidDate:"",paidOut:false,notes:""};
  var saveDH=function(d){setDhData(function(p){if(dhEditIdx!==null&&dhEditIdx>=0){var n=p.slice();n[dhEditIdx]=d;return n;}return p.concat(d);});setDhEditIdx(null);log("DH_SAVE",d.can+" @ "+d.cl);showToast("DH saved");};
  var deleteDH=function(idx){setConfirm({msg:"Delete this DH placement?",fn:function(){setDhData(function(p){return p.filter(function(_,i){return i!==idx;});});setDhEditIdx(null);setConfirm(null);log("DH_DELETE","Index "+idx);showToast("DH deleted");}});};
  var markPaid=function(idx){var we=payrollWeek?payrollWeek.weekEnding:"";setDhData(function(p){var n=p.slice();n[idx]=Object.assign({},n[idx],{paidOut:true,paidDate:new Date().toISOString().slice(0,10),payrollWE:we});return n;});log("DH_PAID",dhData[idx].can+" WE "+we);showToast("Marked paid for WE "+we);};
  // DH Upload parser (like charge import)
  var [dhImportPreview,setDhImportPreview]=useState(null);
  var parseDHFile=useCallback(function(text){
    var rows_raw=parseCSV(text.trim());
    if(!rows_raw||rows_raw.length<2){showToast("No DH data found","err");return;}
    var hdr=rows_raw[0].map(function(h){return(h||"").toLowerCase().trim();});
    var col=function(names){for(var j=0;j<names.length;j++){for(var i=0;i<hdr.length;i++){if(hdr[i]===names[j])return i;}}for(var j=0;j<names.length;j++){for(var i=0;i<hdr.length;i++){var re=new RegExp("(^|[^a-z])"+names[j].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^a-z])");if(re.test(hdr[i]))return i;}}return-1;};
    var iCl=col(["client"]);var iAm=col(["am","account manager","account mgr","sales"]);
    var iRec=col(["rec","recruiter"]);var iCan=col(["candidate","cand"]);
    var iPos=col(["position","pos","title","job"]);var iRaw=col(["raw","charge","fee"]);
    var iTyp=col(["type","typ"]);var iUnit=col(["unit","bu","business"]);
    var iSd=col(["start","sd","start date"]);var iGd=col(["guarantee","gd","days"]);
    var iInv=col(["invoice total","invoice","inv total"]);var iInvPaid=col(["invoice paid","inv paid","invpaid"]);
    var iSt=col(["status","st"]);var iNotes=col(["notes","note"]);
    if(iCan<0&&iCl<0){showToast("Could not detect Client/Candidate columns","err");return;}
    var deals=[];
    for(var i=1;i<rows_raw.length;i++){
      var row=rows_raw[i];
      var can=(row[iCan>=0?iCan:0]||"").trim();
      var cl=(row[iCl>=0?iCl:1]||"").trim();
      if(!can&&!cl)continue;
      var raw=parseCurrency(row[iRaw>=0?iRaw:0]);
      if(raw<=0)continue;
      var am=(row[iAm>=0?iAm:0]||"").trim();
      var rec=(row[iRec>=0?iRec:0]||"").trim();
      var amMatch=matchMember(am,members);var recMatch=matchMember(rec,members);
      var typRaw=(row[iTyp>=0?iTyp:0]||"").toUpperCase().trim();
      var typ=typRaw.includes("FULL")||typRaw==="FD"||typRaw==="F"?"FD":"S";
      var sd=(row[iSd>=0?iSd:0]||"").trim();
      var gd=parseInt(row[iGd>=0?iGd:0])||90;
      var inv=parseCurrency(row[iInv>=0?iInv:0]);
      var invPaid=(row[iInvPaid>=0?iInvPaid:0]||"").trim();
      var stRaw=(row[iSt>=0?iSt:0]||"").toLowerCase().trim();
      var st=stRaw.includes("term")?"t":stRaw.includes("done")||stRaw.includes("paid out")?"d":stRaw.includes("clear")?"c":stRaw.includes("open")||stRaw.includes("active")?"o":"p";
      var notes=(row[iNotes>=0?iNotes:0]||"").trim();
      // Store fuzzy-matched IDs (user can override in assignment step)
      deals.push({cl:cl,am:amMatch?amMatch.name:am,rec:recMatch?recMatch.name:rec,amId:amMatch?amMatch.id:null,recId:recMatch?recMatch.id:null,can:can,pos:(row[iPos>=0?iPos:0]||"").trim(),inv:inv,chg:0,typ:typ,raw:raw,unit:(row[iUnit>=0?iUnit:0]||"").trim()||"MI Metro",sd:sd,gd:gd,cd:"",st:st,invPaid:invPaid,payrollWE:"",paidDate:"",paidOut:st==="d",notes:notes,_amRaw:am,_recRaw:rec,_idx:i-1});
    }
    if(!deals.length){showToast("No valid DH deals found","err");return;}
    setDhImportPreview({deals:deals,step:"assign"});setConfirm(null);
  },[members]);
  var updateDHPreview=function(idx,field,value){
    setDhImportPreview(function(prev){
      if(!prev)return prev;
      var deals=prev.deals.slice();deals[idx]=Object.assign({},deals[idx]);
      if(field==="amId"){
        var m=members.find(function(x){return String(x.id)===String(value);});
        deals[idx].amId=m?m.id:null;deals[idx].am=m?m.name:deals[idx]._amRaw;
      }else if(field==="recId"){
        var m=members.find(function(x){return String(x.id)===String(value);});
        deals[idx].recId=m?m.id:null;deals[idx].rec=m?m.name:deals[idx]._recRaw;
      }else{deals[idx][field]=value;}
      return Object.assign({},prev,{deals:deals});
    });
  };
  var doCommitDH=function(){
    if(!dhImportPreview||!dhImportPreview.deals||!dhImportPreview.deals.length){showToast("No DH deals to import","err");return;}
    var batchId="B"+Date.now();
    var clean=dhImportPreview.deals.map(function(d){var c=Object.assign({},d);delete c._amRaw;delete c._recRaw;delete c._idx;return c;});
    var dhKey=function(x){return(x.can+"|"+x.cl).toLowerCase().trim();};
    var added=0;var updated=0;
    setDhData(function(prev){
      var existing={};prev.forEach(function(d){existing[dhKey(d)]=d;});
      var merged=[];var seen={};
      clean.forEach(function(d){
        var k=dhKey(d);seen[k]=true;var old=existing[k];
        if(old){merged.push(Object.assign({},old,{am:d.am,rec:d.rec,amId:d.amId||old.amId,recId:d.recId||old.recId,pos:d.pos,inv:d.inv,typ:d.typ,raw:d.raw,unit:d.unit,sd:d.sd||old.sd,gd:d.gd,st:old.paidOut?"d":(d.st||old.st),invPaid:d.invPaid||old.invPaid,paidOut:old.paidOut||d.paidOut,paidDate:old.paidDate||d.paidDate,notes:d.notes||old.notes,lastSync:new Date().toISOString().slice(0,10)}));updated++;}
        else{merged.push(Object.assign({},d,{firstSeen:d.sd||new Date().toISOString().slice(0,10),lastSync:new Date().toISOString().slice(0,10),batchId:batchId}));added++;}
      });
      prev.forEach(function(d){var k=dhKey(d);if(!seen[k])merged.push(d);});
      return merged;
    });
    log("DH_IMPORT",batchId+" - "+clean.length+" deals");
    showToast(clean.length+" DH deals imported");
    setDhImportPreview(null);setDhLastSync(new Date().toISOString());setConfirm(null);
  };
  var commitDHImport=function(){
    if(!dhImportPreview)return;
    var unassigned=dhImportPreview.deals.filter(function(d){return!d.amId&&!d.recId;});
    if(unassigned.length>0){setConfirm({msg:unassigned.length+" deal"+(unassigned.length>1?"s have":" has")+" no AM or Recruiter assigned. Import anyway?",fn:function(){doCommitDH();}});return;}
    doCommitDH();
  };
  // Auto-promote DH statuses + auto-calc clearance dates
  useEffect(function(){
    if(!loaded||!dhData.length)return;
    var changed=false;
    var updated=dhData.map(function(d){
      if(d.paidOut||d.st==="t"||d.st==="d")return d;
      var cd=d.cd;
      if(!cd&&d.sd&&d.gd){var sdDate=new Date(d.sd);if(!isNaN(sdDate)){sdDate.setDate(sdDate.getDate()+d.gd);cd=sdDate.toISOString().slice(0,10);}}
      var newSt=d.st;
      if(cd&&new Date(cd)<=NOW&&(d.st==="o"||d.st==="p")){newSt="c";changed=true;}
      if((cd||"")!==(d.cd||"")||newSt!==d.st){changed=true;return Object.assign({},d,{cd:cd||d.cd,st:newSt});}
      return d;
    });
    if(changed)setDhData(updated);
  },[loaded]);
  // Mark invoice paid on a DH deal
  var markInvPaid=function(idx){setDhData(function(p){var n=p.slice();n[idx]=Object.assign({},n[idx],{invPaid:new Date().toISOString().slice(0,10)});return n;});log("DH_INV_PAID",dhData[idx].can);showToast("Invoice marked paid");};
  var deleteWeek=function(wid){var w=chargeWeeks.find(function(x){return x.id===wid;});if(w&&lockedWeeks.includes(w.weekEnding)){showToast("Cannot delete locked week "+w.weekEnding,"err");return;}setConfirm({msg:"Delete charge week WE "+w.weekEnding+"? ("+w.rows.length+" members)\n\nThis removes all charge data and commission calculations for this week. Cannot be undone.",fn:function(){setChargeWeeks(function(p){return p.filter(function(w){return w.id!==wid;});});if(selectedWeek===wid)setSelectedWeek(null);setConfirm(null);log("DELETE_WEEK","WE "+w.weekEnding+" — "+w.rows.length+" rows removed");showToast("Week "+w.weekEnding+" deleted");}});};
  var updateChargeRow=function(weekId,rowIdx,field,value){
    setChargeWeeks(function(prev){return prev.map(function(w){
      if(w.id!==weekId)return w;
      var rows=w.rows.slice();rows[rowIdx]=Object.assign({},rows[rowIdx]);
      rows[rowIdx][field]=+value||0;
      // Recalc rawCharge: Raw = Split Rec + Split AM (FD is INSIDE Split AM, not additive)
      if(field==="splitRec"||field==="splitAM"||field==="fullDesk"){
        rows[rowIdx].rawCharge=rows[rowIdx].splitRec+rows[rowIdx].splitAM;
      }
      return Object.assign({},w,{rows:rows});
    });});
  };
  // Payroll: combine contract commissions + DH payouts for a selected week
  var [payrollWeekId,setPayrollWeekId]=useState(null);
  var [payrollDHSelected,setPayrollDHSelected]=useState({});
  var [manualPayoutOpen,setManualPayoutOpen]=useState(false);
  var [manualPayoutMember,setManualPayoutMember]=useState("");
  var [manualPayoutAmount,setManualPayoutAmount]=useState("");
  var [manualPayoutReason,setManualPayoutReason]=useState("");
  var [stmtMember,setStmtMember]=useState(null);
  var payrollWeek=useMemo(function(){return chargeWeeks.find(function(w){return w.id===payrollWeekId;})||null;},[chargeWeeks,payrollWeekId]);
  var payrollData=useMemo(function(){
    var map={};
    // Contract commissions from selected charge week (with floor logic)
    if(payrollWeek){payrollWeek.rows.forEach(function(row){
      var fi=getFloorInfo(row,payrollWeek);
      var comm=calcRowComm(row,fi,payrollWeek);var m=row.matchedId?members.find(function(x){return x.id===row.matchedId;}):null;
      var key=row.matchedName||row.name;
      map[key]={name:key,unit:m?m.unit:"",contractComm:comm.totalComm,splitRecComm:comm.splitRecComm,splitAMComm:comm.splitAMComm,fdComm:comm.fdComm,deduction:comm.deduction,trueUp:0,dhPayouts:[],dhTotal:0,total:comm.totalComm,steps:comm.steps,rate:comm.rate,floorInfo:fi,dhEligible:fi.dhEligible,crossDate:fi.crossDate};
    });}
    // DH payouts — include SELECTED ready deals + deals already paid for this week
    var we=payrollWeek?payrollWeek.weekEnding:"";
    var selectedDH=readyDH.filter(function(d){return payrollDHSelected[d.idx];});
    // Also include DHs already paid out for this specific week
    var paidForWeek=dhData.filter(function(d){return d.paidOut&&d.payrollWE===we;}).map(function(d,i){return Object.assign({},d,{idx:"paid_"+i});});
    // Merge without duplicates (by candidate+client key)
    var dhKey=function(d){return(d.can+"|"+d.cl).toLowerCase();};
    var seen={};selectedDH.forEach(function(d){seen[dhKey(d)]=true;});
    paidForWeek.forEach(function(d){if(!seen[dhKey(d)]){selectedDH.push(d);seen[dhKey(d)]=true;}});
    selectedDH.forEach(function(d){
      var amM=d.amId?members.find(function(m){return m.id===d.amId;}):findM(d.am,members);
      var recM=d.recId?members.find(function(m){return m.id===d.recId;}):findM(d.rec,members);
      var amKey=amM?amM.name:d.am;var recKey=recM?recM.name:d.rec;
      var isFullDesk=d.typ==="FD";
      var dealStart=d.sd||"";
      // Check DH eligibility: must have crossed floor AND deal start date must be after crossing date
      var amEntry=map[amKey];var recEntry=map[recKey];
      var amCross=amEntry?amEntry.crossDate:null;var recCross=recEntry?recEntry.crossDate:null;
      var amEligible=amEntry&&amEntry.dhEligible&&(!amCross||!dealStart||dealStart>=amCross);
      var recEligible=recEntry&&recEntry.dhEligible&&(!recCross||!dealStart||dealStart>=recCross);
      if(isFullDesk){
        var r=amM?amM.rates.fdDH:0.15;var payout=amEligible?d.raw*r:0;
        if(!map[amKey])map[amKey]={name:amKey,unit:amM?amM.unit:"",contractComm:0,splitRecComm:0,splitAMComm:0,fdComm:0,deduction:0,dhPayouts:[],dhTotal:0,total:0,steps:[],rate:"",floorInfo:null,dhEligible:false,crossDate:null};
        map[amKey].dhPayouts.push({can:d.can,cl:d.cl,raw:d.raw,rate:r,payout:payout,typ:"FD",eligible:amEligible,reason:!amEligible?(amEntry&&amEntry.dhEligible?"Start date before crossing $25K":"Below $25K QTD tier"):""});
        map[amKey].dhTotal+=payout;map[amKey].total+=payout;
      }else{
        var amR=amM?amM.rates.sDH:0.06;var recR=recM?recM.rates.sDH:0.06;
        [[amKey,amM,amR,amEligible,amEntry],[recKey,recM,recR,recEligible,recEntry]].forEach(function(x){
          var k=x[0],m=x[1],rate=x[2],elig=x[3],entry=x[4];var payout=elig?d.raw*rate:0;
          if(!map[k])map[k]={name:k,unit:m?m.unit:"",contractComm:0,splitRecComm:0,splitAMComm:0,fdComm:0,deduction:0,dhPayouts:[],dhTotal:0,total:0,steps:[],rate:"",floorInfo:null,dhEligible:false,crossDate:null};
          map[k].dhPayouts.push({can:d.can,cl:d.cl,raw:d.raw,rate:rate,payout:payout,typ:k===amKey?"AM":"REC",eligible:elig,reason:!elig?(entry&&entry.dhEligible?"Start date before crossing $25K":"Below $25K QTD tier"):""});
          map[k].dhTotal+=payout;map[k].total+=payout;
        });
      }
    });
    // Inject guarantee members who may not have charge rows
    members.forEach(function(m){
      if(!m.guarantee||!m.guarantee.active||!m.guarantee.amount)return;
      if(map[m.name])return; // already has a charge row
      var expired=m.guarantee.endDate&&payrollWeek&&payrollWeek.weekEnding>m.guarantee.endDate;
      if(expired)return;
      map[m.name]={name:m.name,unit:m.unit||"",contractComm:m.guarantee.amount,splitRecComm:0,splitAMComm:0,fdComm:0,deduction:0,dhPayouts:[],dhTotal:0,total:m.guarantee.amount,steps:[{t:"Weekly Floor",d:"Fixed "+fmtD(m.guarantee.amount)+"/week"+(m.guarantee.endDate?" through "+m.guarantee.endDate:""),a:m.guarantee.amount}],rate:"Floor",floorInfo:null,dhEligible:false,crossDate:null};
    });
    return Object.values(map).sort(function(a,b){return b.total-a.total;});
  },[payrollWeek,readyDH,members,calcRowComm,getFloorInfo,payrollDHSelected]);
  // ── Executive Summary ────────────────────────────────────────
  var [execWeekId,setExecWeekId]=useState(null);
  var execWeek=useMemo(function(){return chargeWeeks.find(function(w){return w.id===execWeekId;})||null;},[chargeWeeks,execWeekId]);
  var execData=useMemo(function(){
    if(!execWeek)return null;
    var rows=execWeek.rows;var tContract=0,tDH=0,tFloor=0;
    var earners=0,floorCount=0,floorNames=[],belowFloorNames=[];
    var topEarner={name:"",total:0,contract:0,dh:0};
    var perMember={};
    // Contract commissions (floor-aware)
    rows.forEach(function(row){
      var fi=getFloorInfo(row,execWeek);
      var comm=calcRowComm(row,fi,execWeek);var m=row.matchedId?members.find(function(x){return x.id===row.matchedId;}):null;
      var key=row.matchedName||row.name;
      perMember[key]={name:key,unit:m?m.unit:"",contract:comm.totalComm,dh:0,floor:0,total:comm.totalComm,ytdRaw:row.ytdRaw,qtd:fi.qtd,aboveFloor:!fi.belowFloor,dhEligible:fi.dhEligible,rates:m?m.rates:null,splitRec:row.splitRec,splitAM:row.splitAM,fullDesk:row.fullDesk,rawCharge:row.rawCharge,deduction:comm.deduction,floorInfo:fi};
      tContract+=comm.totalComm;
      if(comm.totalComm>0)earners++;
      if(!fi.belowFloor){floorCount++;floorNames.push(key);}
      else{belowFloorNames.push(key);}
    });
    // DH payouts (eligibility-aware) — include ready + already paid for this week
    var dhPaidThisWeek=[];
    var execWE=execWeek?execWeek.weekEnding:"";
    var execDHList=readyDH.slice();
    var execDHSeen={};execDHList.forEach(function(d){execDHSeen[(d.can+"|"+d.cl).toLowerCase()]=true;});
    dhData.filter(function(d){return d.paidOut&&d.payrollWE===execWE;}).forEach(function(d){var k=(d.can+"|"+d.cl).toLowerCase();if(!execDHSeen[k]){execDHList.push(Object.assign({},d,{idx:"ep"}));execDHSeen[k]=true;}});
    execDHList.forEach(function(d){
      var amM=d.amId?members.find(function(m){return m.id===d.amId;}):findM(d.am,members);
      var recM=d.recId?members.find(function(m){return m.id===d.recId;}):findM(d.rec,members);
      var amName=amM?amM.name:d.am;var recName=recM?recM.name:d.rec;
      var amElig=perMember[amName]?perMember[amName].dhEligible:false;
      var recElig=perMember[recName]?perMember[recName].dhEligible:false;
      if(d.typ==="FD"){
        var r=amM?amM.rates.fdDH:0.15;var payout=amElig?d.raw*r:0;
        if(!perMember[amName])perMember[amName]={name:amName,unit:amM?amM.unit:"",contract:0,dh:0,floor:0,total:0,ytdRaw:0,qtd:0,aboveFloor:false,dhEligible:false,rates:null,splitRec:0,splitAM:0,fullDesk:0,rawCharge:0,deduction:0,floorInfo:null};
        perMember[amName].dh+=payout;perMember[amName].total+=payout;tDH+=payout;
        dhPaidThisWeek.push({can:d.can,cl:d.cl,raw:d.raw,payout:payout,am:amName,rec:recName,typ:"FD",eligible:amElig});
      }else{
        var amR=amM?amM.rates.sDH:0.06;var recR=recM?recM.rates.sDH:0.06;
        [[amName,amR,amM,amElig],[recName,recR,recM,recElig]].forEach(function(x){
          var k=x[0],rate=x[1],m=x[2],elig=x[3];var payout=elig?d.raw*rate:0;
          if(!perMember[k])perMember[k]={name:k,unit:m?m.unit:"",contract:0,dh:0,floor:0,total:0,ytdRaw:0,qtd:0,aboveFloor:false,dhEligible:false,rates:null,splitRec:0,splitAM:0,fullDesk:0,rawCharge:0,deduction:0,floorInfo:null};
          perMember[k].dh+=payout;perMember[k].total+=payout;tDH+=payout;
        });
        dhPaidThisWeek.push({can:d.can,cl:d.cl,raw:d.raw,payout:d.raw*(amR||0.06),am:amName,rec:recName,typ:"S",eligible:amElig&&recElig});
      }
    });
    var grandTotal=tContract+tDH+tFloor;
    // Add guarantee members who may not have charge rows
    var tGuarantee=0;
    var gMembers=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0&&(!m.guarantee.endDate||!execWeek||m.guarantee.endDate>=execWeek.weekEnding);});
    gMembers.forEach(function(m){
      if(!perMember[m.name]){
        perMember[m.name]={name:m.name,unit:m.unit||"",contract:m.guarantee.amount,dh:0,floor:0,total:m.guarantee.amount,ytdRaw:0,qtd:0,aboveFloor:false,dhEligible:false,rates:null,splitRec:0,splitAM:0,fullDesk:0,rawCharge:0,deduction:0,floorInfo:null};
        grandTotal+=m.guarantee.amount;earners++;
      }
      tGuarantee+=m.guarantee.amount;
    });
    var sorted=Object.values(perMember).sort(function(a,b){return b.total-a.total;});
    if(sorted.length)topEarner={name:sorted[0].name,total:sorted[0].total,contract:sorted[0].contract,dh:sorted[0].dh};
    var keyItems=[];
    if(readyDH.length>0)keyItems.push({icon:"check",color:C.green,title:readyDH.length+" DH Payout"+(readyDH.length>1?"s":"")+" Processing",desc:readyDH.map(function(d){return d.can+" ("+fmt(d.raw)+")";}).slice(0,4).join(", ")+(readyDH.length>4?" + "+(readyDH.length-4)+" more":"")});
    if(topEarner.total>0)keyItems.push({icon:"dollar",color:C.accent,title:"Top Earner: "+topEarner.name,desc:fmtD(topEarner.total)+" total ("+fmtD(topEarner.contract)+" contract"+(topEarner.dh>0?" + "+fmtD(topEarner.dh)+" DH":"")+")"});
    if(anomalies.length>0)keyItems.push({icon:"alert",color:C.red,title:anomalies.length+" Anomal"+(anomalies.length>1?"ies":"y")+" Flagged",desc:anomalies.slice(0,2).map(function(a){return a.msg;}).join(". ")});
    if(floorCount>0)keyItems.push({icon:"bar",color:C.green,title:floorCount+" Above $25K QTD tier Tier",desc:floorNames.slice(0,5).join(", ")+(floorNames.length>5?" + "+(floorNames.length-5)+" more":"")});
    if(belowFloorNames.length>0)keyItems.push({icon:"alert",color:C.orange,title:belowFloorNames.length+" Below Tier ($2,500 weekly deduction)",desc:belowFloorNames.slice(0,4).join(", ")+(belowFloorNames.length>4?" + "+(belowFloorNames.length-4)+" more":"")});
    var noEarners=rows.filter(function(r){return(r.splitRec+r.splitAM+r.fullDesk)===0;}).length;
    if(noEarners>0)keyItems.push({icon:"users",color:C.textDim,title:noEarners+" Member"+(noEarners>1?"s":"")+" at $0 This Week",desc:"No contract charges recorded for WE "+execWeek.weekEnding});
    if(gMembers.length>0)keyItems.push({icon:"dollar",color:C.accent,title:gMembers.length+" Weekly Floor"+(gMembers.length>1?"s":"")+" — "+fmtD(tGuarantee)+"/week",desc:gMembers.map(function(m){return m.name.split(" ")[0]+" ("+fmtD(m.guarantee.amount)+(m.guarantee.endDate?" → "+m.guarantee.endDate:"")+")";}).join(", ")});
    // Guarantee expiration warnings
    var today60=new Date(Date.now()+60*24*60*60*1000).toISOString().slice(0,10);var todayStr=new Date().toISOString().slice(0,10);
    var expiring=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.endDate&&m.guarantee.endDate>todayStr&&m.guarantee.endDate<=today60;});
    var expired=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.endDate&&m.guarantee.endDate<todayStr;});
    if(expiring.length>0)keyItems.push({icon:"alert",color:C.orange,title:expiring.length+" Guarantee"+(expiring.length>1?"s":"")+" Expiring Within 60 Days",desc:expiring.map(function(m){var dl=Math.ceil((new Date(m.guarantee.endDate)-Date.now())/(1000*60*60*24));return m.name.split(" ")[0]+" — "+dl+"d ("+m.guarantee.endDate+")";}).join(", ")});
    if(expired.length>0)keyItems.push({icon:"alert",color:C.red,title:expired.length+" Guarantee"+(expired.length>1?"s":"")+" EXPIRED — Still Active",desc:expired.map(function(m){return m.name.split(" ")[0]+" expired "+m.guarantee.endDate;}).join(", ")});
    var priorTotal=0;
    var execIdx=chargeWeeks.findIndex(function(w){return w.id===execWeekId;});
    if(execIdx>=0&&execIdx<chargeWeeks.length-1){
      var priorWeek=chargeWeeks[execIdx+1];
      priorWeek.rows.forEach(function(row){var fi=getFloorInfo(row,priorWeek);var c=calcRowComm(row,fi,priorWeek);priorTotal+=c.totalComm;});
    }
    var topContract=sorted.filter(function(s){return s.contract>0;}).slice(0,5);
    // Apply payroll overrides to sorted totals
    var we=execWeek?execWeek.weekEnding:"";
    sorted.forEach(function(s){var key=s.name+"|"+we;if(payrollOverrides[key]!==undefined){s.overrideTotal=payrollOverrides[key];s.hasOverride=true;}});
    var adjustedGrandTotal=sorted.reduce(function(a,s){return a+(s.hasOverride?s.overrideTotal:s.total);},0);
    var adjustedContract=sorted.reduce(function(a,s){if(s.hasOverride)return a+(s.overrideTotal-s.dh);return a+s.contract;},0);
    return{tContract:adjustedContract,tDH:tDH,tFloor:tFloor,tGuarantee:tGuarantee,gMembers:gMembers,grandTotal:adjustedGrandTotal,earners:earners,total:rows.length,floorCount:floorCount,belowFloorCount:belowFloorNames.length,topEarner:topEarner,keyItems:keyItems,sorted:sorted,topContract:topContract,dhPaidThisWeek:dhPaidThisWeek,perMember:perMember,priorWeekTotal:priorTotal,wow:adjustedGrandTotal-priorTotal,wowPct:priorTotal>0?Math.round((adjustedGrandTotal-priorTotal)/priorTotal*1000)/10:0};
  },[execWeek,readyDH,members,calcRowComm,getFloorInfo,anomalies,chargeWeeks,execWeekId,payrollOverrides]);
  // CSV export helper (no external dependency)
  var toCSV=function(rows){return rows.map(function(r){return r.map(function(c){var s=String(c==null?"":c);return s.indexOf(",")>=0||s.indexOf('"')>=0?'"'+s.replace(/"/g,'""')+'"':s;}).join(",");}).join("\n");};
  // Download helper — creates a real file download
  var dlFile=function(data,filename,type){
    try{var blob=new Blob([data],{type:type||"application/octet-stream"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);return true;}catch(e){return false;}
  };
  var dlCSV=function(name,headers,data){
    // Try real Excel download first, fall back to CSV text export
    try{
      var ws=XLSX.utils.aoa_to_sheet([headers].concat(data));
      var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Data");
      var xlsName=name.replace(/\.csv$/i,"")+".xlsx";
      var buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});
      if(dlFile(buf,xlsName,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")){
        showToast(xlsName+" downloaded");return;
      }
    }catch(e){}
    // Fallback: show in modal
    var csv=toCSV([headers].concat(data));
    showExport(name,csv);
  };
  var doExport=useCallback(function(){
    if(!activeWeek)return;
    var headers=["Name","Entity","Unit","Career Path","YTD Raw","QTD","Tier Status","DH Eligible","Rate","Split Rec","Split AM","Full Desk","Raw Charge","Deduction","Split Rec Comm","Split AM Comm","FD Comm","Total Comm"];
    var data=weekData.map(function(r){var fi=r.floorInfo||{};return[r.matchedName,r.member?r.member.entity:"",r.member?r.member.unit:"",r.member?r.member.careerPath:"",r.ytdRaw.toFixed(2),(fi.qtd||0).toFixed(2),fi.crossing?"Crossing $25K":r.aboveFloor?"Above Tier":"Below Tier",fi.dhEligible?"Yes":"No",r.rate||"",r.splitRec.toFixed(2),r.splitAM.toFixed(2),r.fullDesk.toFixed(2),r.rawCharge.toFixed(2),(r.deduction||0).toFixed(2),(r.splitRecComm||0).toFixed(2),(r.splitAMComm||0).toFixed(2),(r.fdComm||0).toFixed(2),(r.totalComm||0).toFixed(2)];});
    dlCSV("Charges_WE_"+activeWeek.weekEnding+".csv",headers,data);
    log("EXPORT","WE "+activeWeek.weekEnding+" — "+data.length+" rows");showToast("Full detail CSV exported");
  },[activeWeek,weekData]);
  // ── Styles ───────────────────────────────────────────────────
  var th={padding:"10px 14px",fontSize:12,fontWeight:600,color:C.textDim,borderBottom:"1px solid "+C.border,background:C.bg,position:"sticky",top:0,zIndex:1,textAlign:"left",letterSpacing:".5px",fontFamily:FM};
  var td={padding:"10px 14px",fontSize:14,borderBottom:"1px solid "+C.border,color:C.textMuted,fontFamily:FM};
  var card={background:C.bgCard,border:"1px solid "+C.border,borderRadius:10};
  var inp={width:"100%",borderRadius:6,padding:"10px 14px",fontSize:14,fontFamily:FM,boxSizing:"border-box",color:"#1a1a2e",fontWeight:500};
  // ════════ REP SELF-SERVICE PORTAL ════════
  var [repTab,setRepTab]=useState("overview");
  var [repExpandWeek,setRepExpandWeek]=useState(null);
  var [whatIfRaw,setWhatIfRaw]=useState("");
  var [repAuth,setRepAuth]=useState(true);var [repPinInput,setRepPinInput]=useState("");var [repPinError,setRepPinError]=useState(false);
  if(repMode){
    var repMember=repId?members.find(function(m){return m.id===repId;}):null;
    var repWeeks=repMember?chargeWeeks.map(function(w){var row=w.rows.find(function(r){return r.matchedId===repId;});if(!row)return null;var fi=getFloorInfo(row,w);var comm=calcRowComm(row,fi,w);return{weekEnding:w.weekEnding,rawCharge:row.rawCharge,splitRec:row.splitRec,splitAM:row.splitAM,fullDesk:row.fullDesk,ytdRaw:row.ytdRaw,qtd:fi.qtd,belowFloor:fi.belowFloor,deduction:comm.deduction,totalComm:comm.totalComm,steps:comm.steps,rate:comm.rate,crossDate:fi.crossDate,dhEligible:fi.dhEligible,crossing:fi.crossing};}).filter(Boolean):[];
    var repLatest=repWeeks.length?repWeeks[0]:null;
    var repYTD=repLatest?repLatest.ytdRaw:0;var repQTD=repLatest?repLatest.qtd:0;var repFloorOk=repLatest?!repLatest.belowFloor:false;
    var repTotalComm=repWeeks.reduce(function(a,w){return a+w.totalComm;},0);
    var repDH=repMember?dhData.filter(function(d){return d.amId===repId||d.recId===repId;}):[];
    var repQtdPct=Math.min(100,Math.round(repQTD/FLOOR*100));
    var repAvgWeekly=repWeeks.length?repWeeks.reduce(function(a,w){return a+w.rawCharge;},0)/repWeeks.length:0;
    var repWeeksTo25K=repFloorOk?0:(repAvgWeekly>0?Math.ceil((FLOOR-repQTD)/repAvgWeekly):null);
    var repBestWeek=repWeeks.length?repWeeks.slice().sort(function(a,b){return b.totalComm-a.totalComm;})[0]:null;
    // What-if calc
    var whatIfVal=parseFloat(whatIfRaw)||0;
    var whatIfNewQTD=repQTD+whatIfVal;
    var whatIfCrossing=!repFloorOk&&whatIfNewQTD>=FLOOR;
    var whatIfComm=0;
    if(whatIfVal>0&&repMember){
      var r=repMember.rates;
      if(repFloorOk||whatIfNewQTD>=FLOOR){whatIfComm=whatIfVal*(r.fdA||r.sA||0.1);}
      else if(whatIfVal>=FLOOR_WEEKLY_DEDUCT){whatIfComm=(whatIfVal-FLOOR_WEEKLY_DEDUCT)*(r.fdA||r.sA||0.1);}
    }
    // Greeting
    var hour=new Date().getHours();
    var greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
    return(
    <div style={{minHeight:"100vh",fontFamily:FU,background:"#0F1219",color:C.text}}>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      {toast&&<div style={{position:"fixed",top:12,right:12,zIndex:9999,padding:"6px 14px",borderRadius:6,fontSize:14,fontWeight:600,fontFamily:FM,background:toast.type==="err"?C.redDim:C.greenDim,color:toast.type==="err"?C.red:C.green,border:"1px solid "+(toast.type==="err"?C.red:C.green)+"33",animation:"fadeIn .2s ease"}}>{toast.msg}</div>}
      <div style={{height:3,background:"linear-gradient(90deg,#FFD700,#FFE033,#FFD700)"}}/>
      {/* Header */}
      <div style={{padding:"14px 24px",background:"#0B0E14",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="#FFD700"/></svg>
          <div><h1 style={{fontSize:18,fontWeight:800,margin:0,color:C.accent,fontFamily:FM,letterSpacing:"2px"}}>SPARK</h1><p style={{fontSize:10,color:C.textDim,margin:0,fontFamily:FM,letterSpacing:"1px"}}>MY COMMISSIONS</p></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {userRole==="admin"?<select value={repId||""} onChange={function(e){setRepId(e.target.value?+e.target.value||e.target.value:null);setRepTab("overview");setRepExpandWeek(null);}} style={{padding:"6px 12px",fontSize:14,borderRadius:6,fontFamily:FM,background:"#1A1F2E",color:C.text,border:"1px solid "+C.border}}>
            <option value="">Select your name...</option>
            {members.filter(function(m){return!m.inactive;}).sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}
          </select>:<span style={{fontSize:14,fontWeight:600,fontFamily:FM,color:C.text,padding:"6px 12px"}}>{repMember?repMember.name:"Loading..."}</span>}
          <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:"1px solid "+C.border}}>
            {adminAuthenticated&&<div onClick={function(){setRepMode(false);}} style={{padding:"6px 14px",fontSize:12,fontWeight:600,fontFamily:FM,cursor:"pointer",background:"transparent",color:C.textDim,transition:"all .15s",letterSpacing:".5px"}}>Admin</div>}
            <div style={{padding:"6px 14px",fontSize:12,fontWeight:700,fontFamily:FM,cursor:"default",background:C.accent+"15",color:C.accent,letterSpacing:".5px"}}>Rep View</div>
            <div onClick={function(){if(onLogout)onLogout();}} style={{padding:"6px 14px",fontSize:12,fontWeight:600,fontFamily:FM,cursor:"pointer",background:"transparent",color:C.red,transition:"all .15s",letterSpacing:".5px"}}>Sign Out</div>
          </div>
        </div>
      </div>
      {/* Auth handled by MSAL — no PIN modals needed */}
      {!repMember&&<div style={{maxWidth:500,margin:"80px auto",textAlign:"center",padding:"0 20px"}}>
        <svg viewBox="0 0 24 24" width="48" height="48" style={{margin:"0 auto 16px"}}><path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="#FFD700"/></svg>
        <h2 style={{fontSize:24,fontWeight:800,color:C.text,margin:"0 0 8px",fontFamily:FU}}>{userRole==="admin"?"Rep View Preview":"Welcome to Spark Commissions"}</h2>
        <p style={{fontSize:15,color:C.textMuted,fontFamily:FM}}>{userRole==="admin"?"Select a team member above to preview their dashboard.":"Your account ("+userEmail+") hasn't been matched to a team member yet. Contact your admin to ensure your email is set up in the system."}</p>
      </div>}
      {/* MSAL handles auth — reps go straight to dashboard */}
      {repMember&&<div style={{maxWidth:860,margin:"0 auto",padding:"20px 24px"}}>
        {/* Greeting + Insight */}
        <div style={{marginBottom:20}}>
          <h2 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",fontFamily:FU,color:C.text}}>{greeting}, {repMember.name.split(" ")[0]}</h2>
          <p style={{fontSize:14,color:C.textMuted,margin:0,fontFamily:FM}}>{
            repFloorOk&&repYTD>=FLOOR_ANNUAL?"You\'re in the $100K Club — floor is off for the year. Keep building.":
            repFloorOk?"You\'re above the $25K tier — earning full commission on every dollar.":
            repWeeksTo25K!==null&&repWeeksTo25K<=3?"At your current pace, you\'ll cross $25K in ~"+repWeeksTo25K+" week"+(repWeeksTo25K!==1?"s":"")+". Keep pushing.":
            repWeeksTo25K!==null?"You need "+fmtD(FLOOR-repQTD)+" more to cross $25K. That\'s about "+repWeeksTo25K+" weeks at your average.":
            repWeeks.length===0?"No charge data loaded yet. Your numbers will appear once payroll imports are processed.":
            "You need "+fmtD(FLOOR-repQTD)+" more this quarter to unlock full commission."
          }</p>
        </div>
        {/* Tab Nav */}
        <div style={{display:"flex",gap:2,marginBottom:16,borderBottom:"2px solid "+C.border,paddingBottom:0}}>
          {[["overview","Overview"],["history","Week History"],["dh","Direct Hires"+(repDH.length?" ("+repDH.length+")":"")],["plan","My Plan"]].map(function(t){var ac=repTab===t[0];return <button key={t[0]} onClick={function(){setRepTab(t[0]);}} style={{padding:"8px 16px",fontSize:14,fontWeight:ac?700:400,color:ac?C.accent:C.textMuted,background:"transparent",border:"none",borderBottom:ac?"2px solid "+C.accent:"2px solid transparent",cursor:"pointer",fontFamily:FM,marginBottom:-2}}>{t[1]}</button>;})}
        </div>
        {/* ── OVERVIEW TAB ── */}
        {repTab==="overview"&&<div style={{animation:"fadeIn .2s ease"}}>
          {/* KPI Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
            <Stat l="YTD Raw" v={fmtD(repYTD)} c={repYTD>=FLOOR_ANNUAL?C.green:C.accent}/>
            <Stat l="QTD Raw" v={fmtD(repQTD)} c={repFloorOk?C.green:C.orange} s={repFloorOk?"Above tier":repQtdPct+"% to $25K"}/>
            <Stat l="Commission Earned" v={fmtD(repTotalComm)} c={C.green} s={repWeeks.length+" week"+(repWeeks.length!==1?"s":"")}/>
            <Stat l="Avg Weekly Raw" v={fmtD(repAvgWeekly)} c={C.blue} s={repWeeks.length?repWeeks.length+" wk avg":""}/>
          </div>
          {/* Tier Progress — interactive */}
          <div style={Object.assign({},card,{padding:20,marginBottom:16})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h3 style={{fontSize:14,fontWeight:700,margin:0,color:C.text,fontFamily:FU}}>Tier Progress</h3>
              <span style={{fontSize:14,fontWeight:700,color:repFloorOk?C.green:C.orange,fontFamily:FM}}>{repFloorOk?"\u2713 Tier Unlocked":"· "+fmtD(Math.max(0,FLOOR-repQTD))+" to go"}</span>
            </div>
            <div style={{position:"relative",height:14,background:C.bg,borderRadius:7,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:repQtdPct+"%",background:repQtdPct>=100?"linear-gradient(90deg,"+C.green+","+C.teal+")":repQtdPct>=60?"linear-gradient(90deg,"+C.orange+","+C.accent+")":"linear-gradient(90deg,"+C.red+","+C.orange+")",borderRadius:7,transition:"width .5s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.textDim,fontFamily:FM}}>
              <span>{fmtD(repQTD)}</span>
              <span style={{color:C.accent,fontWeight:600}}>${(FLOOR/1000).toFixed(0)}K Floor</span>
              {repYTD<FLOOR_ANNUAL&&<span style={{color:C.textDim}}>${(FLOOR_ANNUAL/1000).toFixed(0)}K Club</span>}
            </div>
            {/* What the floor means right now */}
            <div style={{marginTop:12,padding:"10px 14px",background:repFloorOk?C.greenDim:C.orangeDim,borderRadius:6,border:"1px solid "+(repFloorOk?C.green:C.orange)+"33"}}>
              <p style={{fontSize:13,fontWeight:600,color:repFloorOk?C.green:C.orange,margin:0,fontFamily:FM}}>{repFloorOk?"No weekly deduction — every dollar you charge earns commission.":"Each week, the first $"+FLOOR_WEEKLY_DEDUCT.toLocaleString()+" of your raw charge is deducted before commission is calculated."}</p>
              {!repFloorOk&&<p style={{fontSize:12,color:C.textMuted,margin:"4px 0 0",fontFamily:FM}}>Weeks under ${FLOOR_WEEKLY_DEDUCT.toLocaleString()} total raw = $0 commission that week.</p>}
            </div>
          </div>
          {/* What-If Calculator */}
          <div style={Object.assign({},card,{padding:20,marginBottom:16})}>
            <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px",color:C.text,fontFamily:FU}}>What-If Calculator</h3>
            <p style={{fontSize:13,color:C.textMuted,margin:"0 0 10px",fontFamily:FM}}>See how additional charges would affect your commission this week.</p>
            <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:150}}>
                <label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM,display:"block",marginBottom:4}}>ADDITIONAL RAW CHARGE</label>
                <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:16,color:C.textDim}}>$</span><input type="number" value={whatIfRaw} onChange={function(e){setWhatIfRaw(e.target.value);}} placeholder="5000" style={{width:"100%",padding:"8px 12px",fontSize:16,borderRadius:6,fontFamily:FM,background:C.bgInput,border:"1px solid "+C.border,color:C.text}} step="500"/></div>
              </div>
              {whatIfVal>0&&<div style={{display:"flex",gap:12,flex:2,flexWrap:"wrap"}}>
                <div style={{padding:"10px 16px",background:C.bgSurface,borderRadius:6,border:"1px solid "+C.border,minWidth:120}}>
                  <p style={{fontSize:11,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>NEW QTD</p>
                  <p style={{fontSize:20,fontWeight:800,color:whatIfCrossing?C.green:C.accent,margin:0,fontFamily:FM}}>{fmtD(whatIfNewQTD)}</p>
                  {whatIfCrossing&&<p style={{fontSize:11,color:C.green,margin:"2px 0 0",fontFamily:FM}}>Crosses $25K!</p>}
                </div>
                <div style={{padding:"10px 16px",background:C.bgSurface,borderRadius:6,border:"1px solid "+C.border,minWidth:120}}>
                  <p style={{fontSize:11,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>EST. COMMISSION</p>
                  <p style={{fontSize:20,fontWeight:800,color:C.green,margin:0,fontFamily:FM}}>{fmtD(whatIfComm)}</p>
                  <p style={{fontSize:11,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>{repFloorOk?"Full rate":"After $2.5K deduction"}</p>
                </div>
                {whatIfCrossing&&<div style={{padding:"10px 16px",background:C.greenDim,borderRadius:6,border:"1px solid "+C.green+"33",minWidth:150}}>
                  <p style={{fontSize:11,color:C.green,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>TIER UNLOCK</p>
                  <p style={{fontSize:13,fontWeight:600,color:C.green,margin:0,fontFamily:FM}}>DH eligibility opens + no more weekly deductions!</p>
                </div>}
              </div>}
            </div>
          </div>
          {/* Earnings Trend */}
          {repWeeks.length>=2&&<div style={Object.assign({},card,{padding:20,marginBottom:16})}>
            <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px",color:C.text,fontFamily:FU}}>Earnings Trend</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={repWeeks.slice().reverse().map(function(w){return{we:w.weekEnding,raw:Math.round(w.rawCharge),comm:Math.round(w.totalComm*100)/100};})}>
                <defs><linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.3}/><stop offset="100%" stopColor={C.green} stopOpacity={0.02}/></linearGradient></defs>
                <XAxis dataKey="we" fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false}/>
                <YAxis fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false} tickFormatter={function(v){return"$"+Math.round(v/1000)+"K";}}/>
                <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload[0])return null;var d=p.payload[0].payload;return <div style={{background:C.bg,border:"1px solid "+C.border,borderRadius:6,padding:"8px 12px",fontFamily:FM,fontSize:13}}><p style={{margin:0,color:C.textDim}}>WE {d.we}</p><p style={{margin:"2px 0 0",fontWeight:700,color:C.accent}}>Raw: {fmtD(d.raw)}</p><p style={{margin:"2px 0 0",fontWeight:700,color:C.green}}>Comm: {fmtD(d.comm)}</p></div>;}}/>
                <Area type="monotone" dataKey="raw" stroke={C.accent} strokeWidth={2} fill="none" dot={{r:3,fill:C.accent}}/>
                <Area type="monotone" dataKey="comm" stroke={C.green} strokeWidth={2} fill="url(#repGrad)" dot={{r:3,fill:C.green}}/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:6}}>
              <span style={{fontSize:12,color:C.accent,fontFamily:FM}}>\u25CF Raw Charge</span>
              <span style={{fontSize:12,color:C.green,fontFamily:FM}}>\u25CF Commission</span>
            </div>
          </div>}
          {/* Best Week + DH Summary */}
          <div style={{display:"grid",gridTemplateColumns:repDH.length?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>
            {repBestWeek&&<div style={Object.assign({},card,{padding:16})}>
              <h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.textDim,fontFamily:FM,letterSpacing:"1px"}}>BEST WEEK</h3>
              <p style={{fontSize:20,fontWeight:800,color:C.green,margin:"0 0 2px",fontFamily:FM}}>{fmtD(repBestWeek.totalComm)}</p>
              <p style={{fontSize:12,color:C.textMuted,margin:0,fontFamily:FM}}>WE {repBestWeek.weekEnding} · {fmtD(repBestWeek.rawCharge)} raw</p>
            </div>}
            {repDH.length>0&&<div style={Object.assign({},card,{padding:16,cursor:"pointer",border:"1px solid "+C.teal+"33"})} onClick={function(){setRepTab("dh");}}>
              <h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.teal,fontFamily:FM,letterSpacing:"1px"}}>DH PIPELINE →</h3>
              <p style={{fontSize:20,fontWeight:800,color:C.teal,margin:"0 0 2px",fontFamily:FM}}>{repDH.length} deal{repDH.length>1?"s":""}</p>
              <p style={{fontSize:12,color:C.textMuted,margin:0,fontFamily:FM}}>{fmtD(repDH.reduce(function(a,d){return a+d.raw;},0))} raw · {repDH.filter(function(d){return isReady(d)&&!d.paidOut;}).length} ready</p>
            </div>}
          </div>
          {/* Guarantee */}
          {repMember.guarantee&&repMember.guarantee.active&&<div style={Object.assign({},card,{padding:16,marginBottom:16,borderColor:C.accent+"33"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><h3 style={{fontSize:12,fontWeight:700,margin:"0 0 4px",color:C.accent,fontFamily:FM,letterSpacing:"1px"}}>WEEKLY FLOOR</h3><p style={{fontSize:12,color:C.textMuted,margin:0,fontFamily:FM}}>{repMember.guarantee.endDate?"Through "+repMember.guarantee.endDate:"No end date"}</p></div><span style={{fontSize:26,fontWeight:800,color:C.accent,fontFamily:FM}}>{fmtD(repMember.guarantee.amount)}<span style={{fontSize:13,fontWeight:400,color:C.textDim}}>/wk</span></span></div>
          </div>}
        </div>}
        {/* ── HISTORY TAB ── */}
        {repTab==="history"&&<div style={{animation:"fadeIn .2s ease"}}>
          {repWeeks.length===0&&<div style={Object.assign({},card,{padding:24,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM}}>No weeks loaded yet.</p></div>}
          {repWeeks.map(function(w,wi){var isOpen=repExpandWeek===wi;return <div key={w.weekEnding} style={Object.assign({},card,{marginBottom:8,overflow:"hidden"})}>
            <div onClick={function(){setRepExpandWeek(isOpen?null:wi);}} style={{padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",background:isOpen?C.bgSurface:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14,color:isOpen?C.accent:C.textDim,fontFamily:FM}}>{isOpen?"\u25BC":"\u25B6"}</span>
                <div><p style={{fontSize:15,fontWeight:700,color:C.text,margin:0,fontFamily:FM}}>WE {w.weekEnding}</p><p style={{fontSize:12,color:C.textMuted,margin:"2px 0 0",fontFamily:FM}}>Raw: {fmtD(w.rawCharge)}{w.deduction>0?" · Deduction: -"+fmtD(w.deduction):""}</p></div>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{fontSize:18,fontWeight:800,color:w.totalComm>0?C.green:C.textDim,margin:0,fontFamily:FM}}>{w.totalComm>0?fmtD(w.totalComm):"$0"}</p>
                <p style={{fontSize:11,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>{w.belowFloor?"Below floor":"Above tier"}{w.crossing?" (crossing week)":""}</p>
              </div>
            </div>
            {isOpen&&<div style={{padding:"0 16px 14px",borderTop:"1px solid "+C.border+"66"}}>
              {/* Charge breakdown */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,margin:"12px 0"}}>
                <div style={{padding:"8px 10px",background:C.bg,borderRadius:4}}><p style={{fontSize:10,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>SPLIT REC</p><p style={{fontSize:16,fontWeight:700,color:C.blue,margin:0,fontFamily:FM}}>{fmtD(w.splitRec)}</p></div>
                <div style={{padding:"8px 10px",background:C.bg,borderRadius:4}}><p style={{fontSize:10,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>SPLIT AM</p><p style={{fontSize:16,fontWeight:700,color:C.purple,margin:0,fontFamily:FM}}>{fmtD(w.splitAM)}</p></div>
                <div style={{padding:"8px 10px",background:C.bg,borderRadius:4}}><p style={{fontSize:10,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>FULL DESK</p><p style={{fontSize:16,fontWeight:700,color:C.accent,margin:0,fontFamily:FM}}>{fmtD(w.fullDesk)}</p></div>
              </div>
              {/* Commission steps */}
              {(w.steps||[]).map(function(s,si){return <div key={si} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:si<(w.steps||[]).length-1?"1px solid "+C.border+"44":"none"}}>
                <div><span style={{fontSize:13,fontWeight:600,color:s.t.includes("Rec")?C.blue:s.t.includes("AM")?C.purple:s.t.includes("Full")?C.accent:s.t.includes("Floor")?C.orange:C.textMuted,fontFamily:FM}}>{s.t}</span><span style={{fontSize:12,color:C.textDim,marginLeft:8,fontFamily:FM}}>{s.d}</span></div>
                {s.a>0&&<span style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:FM}}>{fmtD(s.a)}</span>}
              </div>;})}
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8,paddingTop:8,borderTop:"1px solid "+C.accent+"33"}}><span style={{fontSize:16,fontWeight:800,color:C.accent,fontFamily:FM}}>TOTAL: {fmtD(w.totalComm)}</span></div>
            </div>}
          </div>;})}
        </div>}
        {/* ── DH TAB ── */}
        {repTab==="dh"&&<div style={{animation:"fadeIn .2s ease"}}>
          {repDH.length===0&&<div style={Object.assign({},card,{padding:24,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM}}>No direct hire deals linked to your profile.</p></div>}
          {repDH.length>0&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              <Stat l="Active Deals" v={repDH.filter(function(d){return!d.paidOut&&d.st!=="t"&&d.st!=="d";}).length} c={C.orange}/>
              <Stat l="Ready to Pay" v={repDH.filter(function(d){return isReady(d)&&!d.paidOut;}).length} c={C.green}/>
              <Stat l="Pipeline Value" v={fmtD(repDH.filter(function(d){return!d.paidOut&&d.st!=="t";}).reduce(function(a,d){return a+d.raw;},0))} c={C.accent}/>
            </div>
            {repDH.sort(function(a,b){if(isReady(a)&&!a.paidOut)return -1;if(isReady(b)&&!b.paidOut)return 1;return b.raw-a.raw;}).map(function(d,i){
              var rdy=isReady(d)&&!d.paidOut;var dt=d.cd?daysTo(d.cd):null;
              var stColor=rdy?C.green:d.paidOut?C.purple:d.st==="t"?C.red:(d.st==="o"||d.st==="p")?C.orange:C.teal;
              var stLabel=rdy?"Ready to Pay":d.paidOut?"Paid Out":d.st==="t"?"Terminated":d.st==="o"?"On Guarantee":d.st==="p"?"Pending":d.st==="c"?"Cleared":"Done";
              var rate=repMember.rates[d.typ==="FD"?"fdDH":"sDH"]||0;
              var estPay=d.raw*rate;
              return <div key={i} style={Object.assign({},card,{marginBottom:8,borderLeft:"3px solid "+stColor,overflow:"hidden"})}>
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <p style={{fontSize:16,fontWeight:700,color:C.text,margin:"0 0 2px",fontFamily:FU}}>{d.can}</p>
                      <p style={{fontSize:13,color:C.textMuted,margin:"0 0 6px",fontFamily:FM}}>{d.cl}{d.pos?" · "+d.pos:""}</p>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                        <Badge v={d.typ==="FD"?"gold":"muted"}>{d.typ==="FD"?"Full Desk":"Split"}</Badge>
                        <span style={{fontSize:13,color:stColor,fontWeight:700,fontFamily:FM}}>{stLabel}</span>
                        {dt!==null&&dt>0&&<span style={{fontSize:12,padding:"2px 8px",background:C.bg,borderRadius:4,color:dt<=7?C.green:dt<=30?C.orange:C.textDim,fontFamily:FM,fontWeight:600}}>{dt} days to clear</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",minWidth:100}}>
                      <p style={{fontSize:18,fontWeight:800,color:C.text,margin:"0 0 2px",fontFamily:FM}}>{fmtD(d.raw)}</p>
                      {rate>0&&<p style={{fontSize:12,fontWeight:600,color:C.green,margin:0,fontFamily:FM}}>{(rate*100)+"% = "+fmtD(estPay)}</p>}
                    </div>
                  </div>
                  {dt!==null&&dt>0&&d.gd>0&&<div style={{height:4,background:C.bg,borderRadius:2,overflow:"hidden",marginTop:10}}><div style={{height:"100%",width:Math.max(0,Math.round((1-dt/d.gd)*100))+"%",background:dt<=7?"linear-gradient(90deg,"+C.green+","+C.teal+")":dt<=30?C.orange:C.blue,borderRadius:2}}/></div>}
                  {d.sd&&<p style={{fontSize:11,color:C.textDim,margin:"6px 0 0",fontFamily:FM}}>Started: {d.sd}{d.cd?" · Clears: "+d.cd:""}{d.gd?" · "+d.gd+" day guarantee":""}</p>}
                </div>
              </div>;
            })}
          </div>}
        </div>}
        {/* ── MY PLAN TAB ── */}
        {repTab==="plan"&&repMember&&<div style={{animation:"fadeIn .2s ease"}}>
          {function(){
            var r=repMember.rates;
            var isFlat=r.flat>0;
            var path=repMember.careerPath||"Standard";
            var pureAMRate=r.sA||0;var fdRate=r.fdA||0;var recRate=r.sA||0;
            var dhFDRate=r.fdDH||0;var dhSplitRate=r.sDH||0;
            // Phases
            var phases=[
              {phase:"1",title:"Building Your Quarter",subtitle:"Under $"+Math.round(FLOOR/1000)+"K QTD",color:C.orange,bg:C.orangeDim,items:[
                {label:"Weekly Minimum",desc:"Your total weekly raw charge must hit $"+FLOOR_WEEKLY_DEDUCT.toLocaleString()+" to earn commission. Weeks below this = $0."},
                {label:"Deduction",desc:"When you hit the minimum, the first $"+FLOOR_WEEKLY_DEDUCT.toLocaleString()+" is deducted. Commission is calculated on the remainder."},
                {label:"DH Deals",desc:"Not eligible for direct hire payouts while under $"+Math.round(FLOOR/1000)+"K QTD."}
              ]},
              {phase:"2",title:"Performing",subtitle:"Above $"+Math.round(FLOOR/1000)+"K QTD",color:C.green,bg:C.greenDim,items:[
                {label:"Full Commission",desc:"No weekly deduction. You earn on every dollar from the week you cross $"+Math.round(FLOOR/1000)+"K."},
                {label:"DH Eligible",desc:"Direct hire deals with a start date after you crossed $"+Math.round(FLOOR/1000)+"K qualify for DH commission."},
                {label:"Quarterly Reset",desc:"The $"+Math.round(FLOOR/1000)+"K floor resets at the start of each quarter."}
              ]},
              {phase:"3",title:"$100K Club",subtitle:"Above $"+Math.round(FLOOR_ANNUAL/1000)+"K YTD",color:C.accent,bg:C.accentDim,items:[
                {label:"Tier Off",desc:"No deductions for the rest of the year. Full commission on everything."},
                {label:"DH Tier Unlocked",desc:"All DH deals with start dates after crossing $"+Math.round(FLOOR_ANNUAL/1000)+"K are eligible."}
              ]}
            ];
            return <div>
              {/* Career Path + Status */}
              <div style={Object.assign({},card,{padding:20,marginBottom:16})}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                  <div>
                    <h3 style={{fontSize:16,fontWeight:700,margin:"0 0 4px",color:C.text,fontFamily:FU}}>{path}</h3>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <Badge v={UB[repMember.unit]||"muted"}>{repMember.unit}</Badge>
                      <Badge v="muted">{repMember.entity}</Badge>
                      {isFlat&&<Badge v="gold">Flat Rate — Quarterly</Badge>}
                      {repMember.guarantee&&repMember.guarantee.active&&<Badge v="gold">Weekly Floor</Badge>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontSize:11,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM}}>CURRENT PHASE</p>
                    <Badge v={repFloorOk?(repYTD>=FLOOR_ANNUAL?"gold":"green"):"orange"}>{repYTD>=FLOOR_ANNUAL?"$100K Club":repFloorOk?"Phase 2 — Performing":"Phase 1 — Building"}</Badge>
                  </div>
                </div>
              </div>
              {/* My Rates */}
              <div style={Object.assign({},card,{padding:20,marginBottom:16})}>
                <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 14px",color:C.text,fontFamily:FU}}>My Commission Rates</h3>
                {isFlat?<div>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:C.accentDim,borderRadius:6,border:"1px solid "+C.accent+"33"}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:13,fontWeight:600,color:C.textMuted,margin:0,fontFamily:FM}}>Flat Rate (All Charge Types)</p>
                      <p style={{fontSize:12,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>Applied to total raw charge · Paid quarterly</p>
                    </div>
                    <span style={{fontSize:28,fontWeight:800,color:C.accent,fontFamily:FM}}>{(r.flat*100)+"%"}</span>
                  </div>
                </div>
                :<div>
                  <p style={{fontSize:12,color:C.textMuted,margin:"0 0 10px",fontFamily:FM}}>Contract commission is calculated by splitting your raw charge into buckets. Full Desk charge is inside your Split AM total — it's not added separately.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                    <div style={{padding:"12px 14px",background:C.bg,borderRadius:6,borderTop:"2px solid "+C.blue}}>
                      <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>SPLIT RECRUITING</p>
                      <p style={{fontSize:12,color:C.textMuted,margin:"0 0 6px",fontFamily:FM}}>You sourced the candidate</p>
                      <p style={{fontSize:26,fontWeight:800,color:C.blue,margin:0,fontFamily:FM}}>{(recRate*100)+"%"}</p>
                    </div>
                    <div style={{padding:"12px 14px",background:C.bg,borderRadius:6,borderTop:"2px solid "+C.purple}}>
                      <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>SPLIT AM / SALES</p>
                      <p style={{fontSize:12,color:C.textMuted,margin:"0 0 6px",fontFamily:FM}}>You sold the job order</p>
                      <p style={{fontSize:26,fontWeight:800,color:C.purple,margin:0,fontFamily:FM}}>{(pureAMRate*100)+"%"}</p>
                    </div>
                    <div style={{padding:"12px 14px",background:C.bg,borderRadius:6,borderTop:"2px solid "+C.accent}}>
                      <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>FULL DESK</p>
                      <p style={{fontSize:12,color:C.textMuted,margin:"0 0 6px",fontFamily:FM}}>You sourced AND sold</p>
                      <p style={{fontSize:26,fontWeight:800,color:C.accent,margin:0,fontFamily:FM}}>{(fdRate*100)+"%"}</p>
                    </div>
                  </div>
                  {(dhFDRate>0||dhSplitRate>0)&&<div>
                    <p style={{fontSize:12,fontWeight:700,color:C.teal,margin:"0 0 8px",fontFamily:FM,letterSpacing:".5px"}}>DIRECT HIRE RATES</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div style={{padding:"10px 14px",background:C.bg,borderRadius:6,borderLeft:"3px solid "+C.teal}}>
                        <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>DH FULL DESK</p>
                        <p style={{fontSize:22,fontWeight:800,color:C.teal,margin:0,fontFamily:FM}}>{(dhFDRate*100)+"%"}</p>
                      </div>
                      <div style={{padding:"10px 14px",background:C.bg,borderRadius:6,borderLeft:"3px solid "+C.teal+"88"}}>
                        <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>DH SPLIT</p>
                        <p style={{fontSize:22,fontWeight:800,color:C.teal,margin:0,fontFamily:FM}}>{(dhSplitRate*100)+"%"}</p>
                      </div>
                    </div>
                  </div>}
                </div>}
              </div>
              {/* How It Works — Phase Cards */}
              {!isFlat&&<div style={{marginBottom:16}}>
                <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px",color:C.text,fontFamily:FU}}>How the Tier System Works</h3>
                {phases.map(function(p,pi){var isCurrent=(p.phase==="1"&&!repFloorOk)||(p.phase==="2"&&repFloorOk&&repYTD<FLOOR_ANNUAL)||(p.phase==="3"&&repYTD>=FLOOR_ANNUAL);return <div key={pi} style={Object.assign({},card,{marginBottom:8,overflow:"hidden",border:isCurrent?"1px solid "+p.color+"55":"1px solid "+C.border,opacity:isCurrent?1:0.7})}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:isCurrent?p.bg:"transparent",borderBottom:"1px solid "+C.border+"44"}}>
                    <span style={{fontSize:18,fontWeight:800,color:p.color,fontFamily:FM}}>PHASE {p.phase}</span>
                    <div><p style={{fontSize:14,fontWeight:700,color:C.text,margin:0,fontFamily:FU}}>{p.title}</p><p style={{fontSize:12,color:C.textMuted,margin:0,fontFamily:FM}}>{p.subtitle}</p></div>
                    {isCurrent&&<Badge v={p.phase==="1"?"orange":p.phase==="2"?"green":"gold"}>YOU ARE HERE</Badge>}
                  </div>
                  <div style={{padding:"10px 16px"}}>
                    {p.items.map(function(item,ii){return <div key={ii} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:ii<p.items.length-1?"1px solid "+C.border+"33":"none"}}>
                      <span style={{fontSize:12,color:p.color,fontWeight:700,fontFamily:FM,minWidth:16}}>•</span>
                      <div><p style={{fontSize:13,fontWeight:600,color:C.text,margin:0,fontFamily:FM}}>{item.label}</p><p style={{fontSize:12,color:C.textMuted,margin:"2px 0 0",fontFamily:FM}}>{item.desc}</p></div>
                    </div>;})}
                  </div>
                </div>;})}
              </div>}
              {/* DH Eligibility Rules */}
              <div style={Object.assign({},card,{padding:20,marginBottom:16})}>
                <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 12px",color:C.text,fontFamily:FU}}>Direct Hire Payout Rules</h3>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 12px",fontFamily:FM}}>Three things must be true for a DH deal to pay out:</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    {num:"1",title:"You must be DH eligible",desc:"QTD raw above $"+Math.round(FLOOR/1000)+"K (or $"+Math.round(FLOOR_ANNUAL/1000)+"K YTD). The deal's start date must be after you crossed.",check:repFloorOk},
                    {num:"2",title:"Guarantee must clear",desc:"The candidate completes the guarantee period (typically 90 days) without termination.",check:null},
                    {num:"3",title:"Invoice must be paid",desc:"The client pays the placement invoice before commission is released.",check:null}
                  ].map(function(rule){return <div key={rule.num} style={{display:"flex",gap:10,padding:"10px 14px",background:C.bg,borderRadius:6,border:"1px solid "+C.border,alignItems:"flex-start"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:rule.check===true?C.greenDim:rule.check===false?C.redDim:C.bgSurface,border:"2px solid "+(rule.check===true?C.green:rule.check===false?C.red:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:14,fontWeight:800,color:rule.check===true?C.green:rule.check===false?C.red:C.textDim,fontFamily:FM}}>{rule.check===true?"\u2713":rule.num}</span></div>
                    <div><p style={{fontSize:13,fontWeight:700,color:C.text,margin:0,fontFamily:FM}}>{rule.title}</p><p style={{fontSize:12,color:C.textMuted,margin:"2px 0 0",fontFamily:FM}}>{rule.desc}</p></div>
                  </div>;})}
                </div>
                <div style={{marginTop:12,padding:"10px 14px",background:repFloorOk?C.greenDim:C.orangeDim,borderRadius:6,border:"1px solid "+(repFloorOk?C.green:C.orange)+"33"}}>
                  <p style={{fontSize:13,fontWeight:600,color:repFloorOk?C.green:C.orange,margin:0,fontFamily:FM}}>{repFloorOk?"You're DH eligible. Deals that started after you crossed $"+Math.round(FLOOR/1000)+"K qualify.":"You're not yet DH eligible. Cross $"+Math.round(FLOOR/1000)+"K QTD to unlock."}</p>
                </div>
              </div>
              {/* Guarantee */}
              {repMember.guarantee&&repMember.guarantee.active&&<div style={Object.assign({},card,{padding:20,marginBottom:16,borderColor:C.accent+"33"})}>
                <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 8px",color:C.accent,fontFamily:FU}}>Weekly Floor</h3>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>You're receiving a fixed weekly commission amount regardless of charges.</p>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:C.accentDim,borderRadius:6}}>
                  <span style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:FM}}>Floor Amount</span>
                  <span style={{fontSize:26,fontWeight:800,color:C.accent,fontFamily:FM}}>{fmtD(repMember.guarantee.amount)}<span style={{fontSize:13,fontWeight:400,color:C.textDim}}>/week</span></span>
                </div>
                {repMember.guarantee.endDate&&<p style={{fontSize:12,color:C.textDim,margin:"8px 0 0",fontFamily:FM}}>This guarantee runs through {repMember.guarantee.endDate}. After that date, weekly floor payment ends and commission is calculated based on your standard rates above.</p>}
              </div>}
            </div>;
          }()}
        </div>}
      </div>}
    </div>);
  }
  // ════════ ADMIN VIEW ════════
  // === AUTH HANDLED BY MSAL — NO LOGIN GATE NEEDED ===
  // Show load error if data couldn't be fetched
  if(loadError&&!appDataLoaded){return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:C.bg,fontFamily:FU}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <svg viewBox="0 0 24 24" width="48" height="48" style={{marginBottom:16}}><path d="M12 9v4M12 17h.01M10.29 3.86l-8.6 14.86A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.71-2.98l-8.6-14.86a2 2 0 0 0-3.42 0z" fill="none" stroke={C.orange} strokeWidth="2"/></svg>
      <h2 style={{fontSize:22,fontWeight:700,color:C.text,margin:"0 0 8px",fontFamily:FU}}>Data Load Error</h2>
      <p style={{fontSize:14,color:C.textMuted,margin:"0 0 20px",textAlign:"center",maxWidth:400,fontFamily:FM}}>{loadError}</p>
      <p style={{fontSize:12,color:C.textDim,fontFamily:FM}}>Using default roster data. Changes won't persist until the connection is restored.</p>
    </div>
  );}
  var appDataLoaded=!!initialData;

  return(
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",fontFamily:FU,background:C.bg,color:C.text}}>
      <div style={{height:2,background:"linear-gradient(90deg,transparent,#FFD700,transparent)",flexShrink:0}}/>
      <div style={{display:"flex",flex:1}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Source+Code+Pro:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style dangerouslySetInnerHTML={{__html:CSS}}/>
      <div className="scanlines"/><div className="vignette"/>
      {toast&&<div style={{position:"fixed",top:12,right:12,zIndex:9999,padding:"5px 12px",borderRadius:4,fontSize:14,fontWeight:600,fontFamily:FM,background:toast.type==="err"?C.redDim:C.greenDim,color:toast.type==="err"?C.red:C.green,border:"1px solid "+(toast.type==="err"?C.red:C.green)+"33",animation:"fadeIn .2s ease"}}>{toast.msg}</div>}
      {conflictInfo&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:9998,padding:"10px 20px",background:"linear-gradient(135deg,#7c2d12,#92400e)",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(0,0,0,.4)"}}><div style={{display:"flex",alignItems:"center",gap:8}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86l-8.6 14.86A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.71-2.98l-8.6-14.86a2 2 0 0 0-3.42 0z"/></svg><span style={{fontSize:13,fontWeight:600,color:"#fef3c7",fontFamily:FM}}>Data updated by {conflictInfo.savedBy||"another admin"} — your view may be out of date</span></div><div style={{display:"flex",gap:8}}><button onClick={function(){if(onReload)onReload().then(function(d){if(d){setMembers(d.members||[]);setDhData(d.dhData||[]);setChargeWeeks(d.chargeWeeks||[]);setLockedWeeks(d.lockedWeeks||[]);setAuditLog(d.auditLog||[]);setQSnapshots(d.qSnapshots||[]);if(d.config)setConfig(Object.assign({},DEFAULT_CFG,d.config));if(d.payrollOverrides)setPayrollOverrides(d.payrollOverrides);if(d.dhLastSync)setDhLastSync(d.dhLastSync);showToast("Reloaded latest data");}});}} style={{padding:"4px 12px",borderRadius:4,fontSize:12,fontWeight:700,background:"#fbbf24",color:"#0B0E14",border:"none",cursor:"pointer",fontFamily:FM}}>RELOAD</button><button onClick={onDismissConflict} style={{padding:"4px 12px",borderRadius:4,fontSize:12,fontWeight:600,background:"transparent",color:"#fef3c7",border:"1px solid rgba(254,243,199,.3)",cursor:"pointer",fontFamily:FM}}>DISMISS</button></div></div>}
      {confirmDlg&&<Overlay onClose={function(){setConfirm(null);}}><div className="panel" style={{maxWidth:360,width:"90%"}}><div className="panel-hdr"><h3>Confirm</h3></div><div className="panel-body"><p style={{margin:"0 0 12px",fontSize:15,color:C.text,fontFamily:FU,whiteSpace:"pre-wrap"}}>{confirmDlg.msg}</p><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><button onClick={function(){setConfirm(null);}} className="btn-ghost" style={{padding:"5px 12px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>Cancel</button><button onClick={confirmDlg.fn} className="btn-primary" style={{padding:"5px 12px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>Confirm</button></div></div></div></Overlay>}
      {exportModal&&<Overlay onClose={function(){setExportModal(null);}}><div className="panel" style={{maxWidth:exportModal.isHTML?760:700,width:"95%",maxHeight:"90vh",display:"flex",flexDirection:"column"}}><div className="panel-hdr"><h3>{exportModal.title}</h3><div style={{display:"flex",gap:6}}>
        {!exportModal.isHTML&&<button onClick={function(){try{var ta=document.getElementById("exportTA");ta.select();document.execCommand("copy");showToast("Copied to clipboard");}catch(e){showToast("Select all and copy manually","err");}}} className="btn-primary" style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:700}}>COPY ALL</button>}
        {exportModal.isHTML&&<button onClick={function(){try{var el=document.getElementById("stmtFrame");var win=el.contentWindow;win.focus();win.print();}catch(e){showToast("Use Ctrl+P to print","err");}}} className="btn-primary" style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:700}}>PRINT</button>}
        {exportModal.isHTML&&<button onClick={function(){try{dlFile(exportModal.content,(exportModal.title||"export").replace(/[^a-zA-Z0-9 ]/g,"").replace(/ +/g,"_")+".html","text/html");showToast("Downloaded — open in browser then Print → Save as PDF");}catch(e){showToast("Download failed","err");}}} className="btn-ghost" style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:700}}>DOWNLOAD</button>}
        <button onClick={function(){setExportModal(null);}} style={{background:"none",border:"none",color:C.textDim,fontSize:16,cursor:"pointer"}}>×</button>
      </div></div><div className="panel-body" style={{flex:1,overflow:"hidden",padding:10}}>
        {exportModal.isHTML?<iframe id="stmtFrame" srcDoc={exportModal.content} style={{width:"100%",height:"65vh",border:"1px solid "+C.border,borderRadius:6,background:"#fff"}}/>
        :<textarea id="exportTA" readOnly value={exportModal.content} style={{width:"100%",height:"60vh",background:C.bgInput,color:C.text,border:"1px solid "+C.border,borderRadius:6,padding:12,fontSize:12,fontFamily:"monospace",resize:"none"}} onClick={function(e){e.target.select();}}/>}
      </div></div></Overlay>}
      {/* ── SIDEBAR ── */}
      <div style={{width:180,background:"#0B0E12",padding:"10px 0",display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto",borderRight:"1px solid "+C.border,zIndex:10}}>
        <div style={{padding:"0 12px 10px",borderBottom:"1px solid "+C.border}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}><div style={{width:5,height:5,borderRadius:"50%",background:C.green,boxShadow:"0 0 6px "+C.greenGlow,animation:"pulse 2s ease infinite"}}/><span style={{fontSize:11,fontFamily:FM,color:C.green,fontWeight:600,letterSpacing:"1px"}}>ONLINE</span></div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <svg viewBox="0 0 24 24" width="16" height="16" style={{flexShrink:0}}><path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="#FFD700"/></svg>
            <div>
              <h1 style={{fontSize:16,fontWeight:800,margin:0,color:"#FFD700",fontFamily:FM,letterSpacing:"2px"}}>SPARK</h1>
              <p style={{fontSize:11,fontWeight:500,margin:0,color:C.textDim,fontFamily:FM,letterSpacing:"2px"}}>COMMISSIONS</p>
            </div>
          </div>
          <div style={{marginTop:8,padding:"5px 0",borderTop:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>TEAM</span><span style={{fontSize:12,color:"#FFD700",fontFamily:FM,fontWeight:600}}>{members.length}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>WEEKS</span><span style={{fontSize:12,color:C.blue,fontFamily:FM,fontWeight:600}}>{chargeWeeks.length}</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>DH READY</span><span style={{fontSize:12,color:readyDH.length?C.green:C.textDim,fontFamily:FM,fontWeight:600}}>{readyDH.length}</span></div>
          </div>
          <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid "+C.border}}>
            <button onClick={doSave} style={{width:"100%",padding:"5px 0",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600,border:"none",transition:"all .15s",background:saveStatus==="saved"?C.greenDim:saveStatus==="saving"?C.accentDim:C.orangeDim,color:saveStatus==="saved"?C.green:saveStatus==="saving"?C.accent:C.orange}}>
              {saveStatus==="saved"?"✓ Saved":saveStatus==="saving"?"Saving...":"● Unsaved"}
            </button>
          </div>
          {/* Mode Toggle */}
          <div style={{padding:"8px 12px",borderBottom:"1px solid "+C.border}}>
            <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:"1px solid "+C.border}}>
              <div style={{flex:1,padding:"6px 0",textAlign:"center",fontSize:12,fontWeight:700,fontFamily:FM,cursor:"default",background:C.accent+"15",color:C.accent,letterSpacing:".5px"}}>Admin</div>
              <div onClick={function(){setRepMode(true);setRepId(null);}} style={{flex:1,padding:"6px 0",textAlign:"center",fontSize:12,fontWeight:600,fontFamily:FM,cursor:"pointer",background:"transparent",color:C.textDim,letterSpacing:".5px",transition:"all .15s"}}>Rep View</div>
            </div>
            <div style={{padding:"4px 0",textAlign:"center",fontSize:10,color:C.textDim,fontFamily:FM,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{userName||userEmail}</div>
            <button onClick={function(){if(onLogout)onLogout();}} style={{width:"100%",marginTop:4,padding:"5px 0",borderRadius:4,fontSize:11,fontFamily:FM,fontWeight:600,border:"1px solid "+C.red+"33",color:C.red,background:"transparent",cursor:"pointer"}}>Sign Out</button>
          </div>
        </div>
        <div style={{padding:"6px 0",flex:1}}>{NAV.map(function(n){var ac=view===n.id||(view==="edit"&&n.id==="team");return <div key={n.id} onClick={function(){setView(n.id);if(n.id!=="edit")setEditMemberId(null);}} className={"nav-item"+(ac?" active":"")} style={{padding:"8px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,color:ac?C.accent:C.textMuted,fontSize:14,fontWeight:ac?600:400,fontFamily:FM,letterSpacing:".3px"}}><Icon name={n.icon} sz={13} cl={ac?C.accent:C.textDim}/><span>{n.label}</span>
          {n.id==="charges"&&chargeWeeks.length>0&&<span style={{marginLeft:"auto",fontSize:11,color:C.blue,fontFamily:FM}}>{chargeWeeks.length}</span>}
          {n.id==="dh"&&readyDH.length>0&&<span style={{marginLeft:"auto",background:C.green,color:C.bg,borderRadius:2,padding:"0px 4px",fontSize:11,fontWeight:700}}>{readyDH.length}</span>}
          {n.id==="recon"&&anomalies.length>0&&<span style={{marginLeft:"auto",background:C.red,color:"#fff",borderRadius:2,padding:"0px 4px",fontSize:11,fontWeight:700}}>{anomalies.length}</span>}
          {n.id==="floor"&&members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0;}).length>0&&<span style={{marginLeft:"auto",background:C.orange,color:"#fff",borderRadius:2,padding:"0px 4px",fontSize:11,fontWeight:700}}>{members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0;}).length}</span>}
        </div>;})}</div>
        <div style={{padding:"8px 12px",borderTop:"1px solid "+C.border,display:"flex",flexDirection:"column",gap:3}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>Q SNAPSHOTS</span><span style={{fontSize:11,color:qSnapshots.length?C.purple:C.textDim,fontFamily:FM}}>{qSnapshots.length||"—"}</span></div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>STORAGE</span><span style={{fontSize:11,color:C.green,fontFamily:FM}}>{loaded?"OK":"..."}</span></div>
          <p style={{fontSize:11,color:C.textDim,margin:"2px 0 0",fontFamily:FM,borderTop:"1px solid "+C.border,paddingTop:4}}><span style={{color:"#FFD700"}}>⚡</span> v7.0</p>
        </div>
      </div>
      {/* ── MAIN ── */}
      <div style={{flex:1,padding:"16px 20px",overflowY:"auto",maxHeight:"100vh",background:C.bg2}}>
        {/* ════════ COMMAND CENTER ════════ */}
        {view==="command"&&<div style={{animation:"fadeIn .2s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><svg viewBox="0 0 24 24" width="18" height="18"><path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="#FFD700"/></svg><h2 style={{fontSize:20,fontWeight:800,margin:0,fontFamily:FU,color:C.text}}>Spark Commission Tracker</h2><span style={{fontSize:13,color:C.textDim,fontFamily:FM,marginLeft:"auto"}}>{chargeWeeks.length?("Latest: WE "+chargeWeeks[0].weekEnding):new Date().toLocaleDateString()}</span></div>
          {/* ── TICKER BANNER ── */}
          {ytdStandings.length>0&&function(){
            var items=[];
            // Top 5 earners
            ytdStandings.slice(0,5).forEach(function(s,i){
              var arrow=i===0?"👑 ":"";
              items.push({text:arrow+s.name,value:fmtD(s.ytdRaw),color:i===0?C.accent:i<3?C.green:C.text,sub:"#"+(i+1)+" YTD"});
            });
            // Floor alerts
            var onFloor=ytdStandings.filter(function(s){return!s.aboveFloor;});
            if(onFloor.length>0)items.push({text:"⚠ "+onFloor.length+" ON FLOOR",value:"",color:C.red,sub:"below $25K QTD tier"});
            // DH ready
            if(readyDH.length>0)items.push({text:"✓ "+readyDH.length+" DH READY",value:fmtD(readyDH.reduce(function(a,d){return a+d.raw;},0)),color:C.green,sub:"to process"});
            // $100K club
            var club100=ytdStandings.filter(function(s){return s.ytdRaw>=FLOOR_ANNUAL;});
            if(club100.length>0)items.push({text:"💎 $100K CLUB",value:club100.length+" member"+(club100.length>1?"s":""),color:C.accent,sub:club100.map(function(s){return s.name.split(" ")[0];}).join(", ")});
            // Top weekly charge
            if(chargeWeeks.length>0){var topWeek=chargeWeeks[0].rows.slice().sort(function(a,b){return b.rawCharge-a.rawCharge;})[0];if(topWeek)items.push({text:"🔥 TOP WEEK",value:fmtD(topWeek.rawCharge),color:C.orange,sub:topWeek.matchedName||topWeek.name});}
            // Guarantees
            var gM=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0&&(!m.guarantee.endDate||m.guarantee.endDate>=new Date().toISOString().slice(0,10));});
            if(gM.length>0){var gTotal=gM.reduce(function(a,m){return a+m.guarantee.amount;},0);items.push({text:"💰 GUARANTEES",value:fmtD(gTotal)+"/wk",color:C.accent,sub:gM.length+" member"+(gM.length>1?"s":"")});}
            // Crossing alerts (members who just crossed $25K in latest week)
            if(chargeWeeks.length>=2){
              var latest=chargeWeeks[0],prior=chargeWeeks[1];
              latest.rows.forEach(function(r){if(!r.matchedId)return;var pRow=prior.rows.find(function(p){return p.matchedId===r.matchedId;});if(pRow&&pRow.ytdRaw<FLOOR&&r.ytdRaw>=FLOOR)items.push({text:"📈 CROSSED $25K",value:r.matchedName||r.name,color:C.green,sub:fmtD(pRow.ytdRaw)+" → "+fmtD(r.ytdRaw)});});
            }
            var tickerContent=items.concat(items);
            return <div style={{overflow:"hidden",background:"linear-gradient(90deg,"+C.bgCard+" 0%,"+C.bgSurface+" 50%,"+C.bgCard+" 100%)",borderRadius:6,border:"1px solid "+C.border,marginBottom:10,position:"relative",height:40}}>
              <div style={{position:"absolute",left:0,top:0,right:0,bottom:0,pointerEvents:"none",background:"linear-gradient(90deg,"+C.bgCard+" 0%,transparent 5%,transparent 95%,"+C.bgCard+" 100%)",zIndex:2}}/>
              <div style={{display:"flex",alignItems:"center",gap:0,whiteSpace:"nowrap",animation:"tickerScroll "+(items.length*4)+"s linear infinite",height:"100%"}}>
                {tickerContent.map(function(item,i){return <div key={i} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"0 20px",borderRight:"1px solid "+C.border+"44",height:"100%"}}>
                  <span style={{fontSize:13,fontWeight:700,color:item.color,fontFamily:FM}}>{item.text}</span>
                  {item.value&&<span style={{fontSize:14,fontWeight:800,color:item.color,fontFamily:FM}}>{item.value}</span>}
                  {item.sub&&<span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>{item.sub}</span>}
                </div>;})}
              </div>
            </div>;
          }()}
          {/* ── Hero KPIs ── */}
          {function(){
            var totalYTD=ytdStandings.reduce(function(a,s){return a+s.ytdRaw;},0);
            var aboveFloor=ytdStandings.filter(function(s){return s.aboveFloor;}).length;
            var onFloor=ytdStandings.length-aboveFloor;
            var pendDH=dhData.filter(function(d){return!d.paidOut&&d.st!=="t"&&d.st!=="d";});
            var pendRaw=pendDH.reduce(function(a,d){return a+d.raw;},0);
            var paidDH=dhData.filter(function(d){return d.paidOut||d.st==="d";});
            var paidRaw=paidDH.reduce(function(a,d){return a+d.raw;},0);
            // Weekly floor detail: who is above/below $2,500 this week
            var latestWeek=chargeWeeks.length?chargeWeeks[0]:null;
            var weeklyAbove=[],weeklyBelow=[],weeklyZero=[];
            if(latestWeek){latestWeek.rows.forEach(function(r){
              if(!r.matchedId)return;
              var m=members.find(function(x){return x.id===r.matchedId;});
              if(!m)return;
              var fi=getFloorInfo(r,latestWeek);
              if(r.rawCharge>=FLOOR_WEEKLY_DEDUCT)weeklyAbove.push({name:m.name,raw:r.rawCharge,qtd:fi.qtd,aboveFloor:!fi.belowFloor,id:m.id});
              else if(r.rawCharge>0)weeklyBelow.push({name:m.name,raw:r.rawCharge,qtd:fi.qtd,aboveFloor:!fi.belowFloor,id:m.id});
              else weeklyZero.push({name:m.name,raw:0,qtd:fi.qtd,aboveFloor:!fi.belowFloor,id:m.id});
            });}
            weeklyAbove.sort(function(a,b){return b.raw-a.raw;});weeklyBelow.sort(function(a,b){return b.raw-a.raw;});
            var tileStyle=function(color,active){return{background:C.bgCard,border:"1px solid "+(active?color+"55":C.border),borderRadius:10,padding:"20px 22px",borderTop:"3px solid "+color,cursor:"pointer",transition:"all .15s",boxShadow:active?"0 0 12px "+color+"15":"none"};};
            return <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:cmdDrill?0:16}}>
              <div style={tileStyle(C.accent,cmdDrill==="ytd")} onClick={function(){if(chargeWeeks.length)setCmdDrill(cmdDrill==="ytd"?null:"ytd");}}>
                <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,letterSpacing:".6px",fontFamily:FM}}>Total YTD Raw Charge</p>
                {chargeWeeks.length>0?<div>
                  <p style={{fontSize:30,fontWeight:800,margin:0,color:C.accent,fontFamily:FU}}>{fmtD(totalYTD)}</p>
                  <p style={{fontSize:12,color:C.textMuted,margin:"4px 0 0",fontFamily:FM}}>{ytdStandings.length} members · {chargeWeeks.length} week{chargeWeeks.length!==1?"s":""} · click to drill down</p>
                </div>
                :<div>
                  <p style={{fontSize:22,fontWeight:800,margin:0,color:C.textDim,fontFamily:FU}}>—</p>
                  <p style={{fontSize:12,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>No charge data loaded</p>
                </div>}
              </div>
              <div style={tileStyle(C.green,cmdDrill==="floor")} onClick={function(){if(chargeWeeks.length)setCmdDrill(cmdDrill==="floor"?null:"floor");}}>
                <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,letterSpacing:".6px",fontFamily:FM}}>Tier Status</p>
                {chargeWeeks.length>0?<div>
                  <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                    <p style={{fontSize:30,fontWeight:800,margin:0,color:C.green,fontFamily:FU}}>{aboveFloor}</p>
                    <span style={{fontSize:14,color:C.textMuted,fontFamily:FM}}>above</span>
                    {onFloor>0&&<><p style={{fontSize:30,fontWeight:800,margin:0,color:C.red,fontFamily:FU}}>{onFloor}</p><span style={{fontSize:14,color:C.textMuted,fontFamily:FM}}>below tier</span></>}
                  </div>
                  <div style={{height:6,background:C.bg,borderRadius:3,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:Math.round(aboveFloor/Math.max(1,ytdStandings.length)*100)+"%",background:"linear-gradient(90deg,"+C.green+","+C.teal+")",borderRadius:3}}/></div>
                </div>
                :<div>
                  <p style={{fontSize:22,fontWeight:800,margin:0,color:C.textDim,fontFamily:FU}}>—</p>
                  <p style={{fontSize:12,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>No charge data loaded</p>
                </div>}
              </div>
              <div style={tileStyle(C.teal,cmdDrill==="dh")} onClick={function(){if(dhData.length)setCmdDrill(cmdDrill==="dh"?null:"dh");}}>
                <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:700,letterSpacing:".6px",fontFamily:FM}}>DH Pipeline</p>
                {dhData.length>0?<div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <p style={{fontSize:30,fontWeight:800,margin:0,color:C.teal,fontFamily:FU}}>{pendDH.length}</p>
                    <span style={{fontSize:14,color:C.textMuted,fontFamily:FM}}>pending · {fmtD(pendRaw)}</span>
                  </div>
                  <p style={{fontSize:12,color:C.textMuted,margin:"4px 0 0",fontFamily:FM}}>{readyDH.length>0?<span style={{color:C.green,fontWeight:700}}>{readyDH.length+" ready to pay"}</span>:paidDH.length+" completed"}</p>
                </div>
                :<div>
                  <p style={{fontSize:22,fontWeight:800,margin:0,color:C.textDim,fontFamily:FU}}>—</p>
                  <p style={{fontSize:12,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>No DH deals loaded</p>
                </div>}
              </div>
            </div>
            {/* ── DRILL DOWN PANELS ── */}
            {cmdDrill==="ytd"&&chargeWeeks.length>0&&<div style={Object.assign({},card,{marginBottom:16,overflow:"hidden",animation:"fadeIn .2s ease"})}>
              <div style={{padding:"10px 16px",background:C.bg,borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.accent,margin:0,fontFamily:FM}}>YTD Raw Charge — All Members</h3>
                <button onClick={function(){setCmdDrill(null);}} style={{background:"none",border:"none",color:C.textDim,fontSize:16,cursor:"pointer"}}>×</button>
              </div>
              <div style={{maxHeight:"35vh",overflowY:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={Object.assign({},th,{width:30})}>#</th><th style={th}>Name</th><th style={th}>Unit</th><th style={Object.assign({},th,{textAlign:"right"})}>YTD Raw</th><th style={Object.assign({},th,{textAlign:"right"})}>QTD</th><th style={Object.assign({},th,{textAlign:"right"})}>Avg/Wk</th><th style={Object.assign({},th,{textAlign:"center"})}>Tier</th></tr></thead>
                <tbody>{ytdStandings.map(function(s,i){return <tr key={i} className="trow" onClick={function(){if(s.member)goEdit(s.member.id);}} style={{cursor:"pointer"}}>
                  <td style={Object.assign({},td,{textAlign:"center",color:i<3?C.accent:C.textDim,fontWeight:i<3?700:400})}>{i+1}</td>
                  <td style={Object.assign({},td,{fontWeight:600,color:C.text})}>{s.name}</td>
                  <td style={td}><Badge v={UB[s.unit]||"muted"}>{s.unit}</Badge></td>
                  <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.text})}>{fmtD(s.ytdRaw)}</td>
                  <td style={Object.assign({},td,{textAlign:"right",color:s.aboveFloor?C.green:C.orange})}>{fmtD(s.qtd||0)}</td>
                  <td style={Object.assign({},td,{textAlign:"right",color:C.textMuted})}>{s.avgWeekly>0?fmtD(s.avgWeekly):"—"}</td>
                  <td style={Object.assign({},td,{textAlign:"center"})}>{s.aboveFloor?<Badge v="green">{s.ytdRaw>=FLOOR_ANNUAL?"$100K":"OK"}</Badge>:<Badge v="red">{Math.round((s.qtd||0)/FLOOR*100)+"%"}</Badge>}</td>
                </tr>;})}</tbody>
              </table></div>
            </div>}
            {cmdDrill==="floor"&&chargeWeeks.length>0&&<div style={Object.assign({},card,{marginBottom:16,overflow:"hidden",animation:"fadeIn .2s ease"})}>
              <div style={{padding:"10px 16px",background:C.bg,borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.green,margin:0,fontFamily:FM}}>Tier Detail — WE {latestWeek?latestWeek.weekEnding:"(no data)"}</h3>
                <button onClick={function(){setCmdDrill(null);}} style={{background:"none",border:"none",color:C.textDim,fontSize:16,cursor:"pointer"}}>×</button>
              </div>
              <div style={{padding:16}}>
                {/* Weekly $2,500 breakdown */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
                  <Stat l="Above $2,500/wk" v={weeklyAbove.length} c={C.green} s={weeklyAbove.length?fmtD(weeklyAbove.reduce(function(a,r){return a+r.raw;},0))+" total raw":""}/>
                  <Stat l="Below $2,500/wk" v={weeklyBelow.length} c={C.red} s={weeklyBelow.length?fmtD(weeklyBelow.reduce(function(a,r){return a+r.raw;},0))+" total — $0 comm":""}/>
                  <Stat l="$0 Charge This Wk" v={weeklyZero.length} c={C.textDim}/>
                </div>
                {/* Below $2,500 list — these people are earning $0 */}
                {weeklyBelow.length>0&&<div style={{marginBottom:12}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.red,margin:"0 0 6px",fontFamily:FM}}>Below $2,500 weekly minimum — earning $0 commission this week:</p>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {weeklyBelow.map(function(r){return <div key={r.id} onClick={function(){goEdit(r.id);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",background:C.redDim,borderRadius:6,border:"1px solid "+C.red+"22",cursor:"pointer"}}>
                      <span style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:FM}}>{r.name}</span>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{fontSize:14,fontWeight:700,color:C.red,fontFamily:FM}}>{fmtD(r.raw)}</span>
                        <span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>need {fmtD(FLOOR_WEEKLY_DEDUCT-r.raw)} more</span>
                        {r.aboveFloor&&<Badge v="green">QTD OK</Badge>}
                      </div>
                    </div>;})}
                  </div>
                </div>}
                {weeklyZero.length>0&&<div style={{marginBottom:12}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM}}>$0 charge this week:</p>
                  <p style={{fontSize:13,color:C.textMuted,margin:0,fontFamily:FM}}>{weeklyZero.map(function(r){return r.name;}).join(", ")}</p>
                </div>}
                {/* QTD Floor breakdown */}
                <div style={{borderTop:"1px solid "+C.border,paddingTop:12,marginTop:4}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.green,margin:"0 0 6px",fontFamily:FM}}>Above $25K QTD tier — full commission, no deductions:</p>
                  <div style={{maxHeight:"20vh",overflowY:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th style={th}>Name</th><th style={Object.assign({},th,{textAlign:"right"})}>This Week</th><th style={Object.assign({},th,{textAlign:"right"})}>QTD</th><th style={Object.assign({},th,{textAlign:"center"})}>DH</th></tr></thead>
                    <tbody>{ytdStandings.filter(function(s){return s.aboveFloor;}).map(function(s,i){
                      var weekRow=latestWeek?latestWeek.rows.find(function(r){return r.matchedId===(s.member&&s.member.id);}):{rawCharge:0};
                      return <tr key={i} className="trow" onClick={function(){if(s.member)goEdit(s.member.id);}} style={{cursor:"pointer"}}>
                        <td style={Object.assign({},td,{fontWeight:600,color:C.text})}>{s.name}</td>
                        <td style={Object.assign({},td,{textAlign:"right"})}>{weekRow?fmtD(weekRow.rawCharge):"—"}</td>
                        <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.green})}>{fmtD(s.qtd||0)}</td>
                        <td style={Object.assign({},td,{textAlign:"center"})}><Badge v="green">Yes</Badge></td>
                      </tr>;
                    })}</tbody>
                  </table></div>
                </div>
                <div style={{borderTop:"1px solid "+C.border,paddingTop:12,marginTop:12}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.orange,margin:"0 0 6px",fontFamily:FM}}>Below $25K QTD tier — $2,500 weekly deduction applies:</p>
                  <div style={{maxHeight:"20vh",overflowY:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th style={th}>Name</th><th style={Object.assign({},th,{textAlign:"right"})}>This Week</th><th style={Object.assign({},th,{textAlign:"right"})}>QTD</th><th style={Object.assign({},th,{textAlign:"right"})}>To $25K</th><th style={Object.assign({},th,{textAlign:"center"})}>Weekly OK</th></tr></thead>
                    <tbody>{ytdStandings.filter(function(s){return!s.aboveFloor;}).map(function(s,i){
                      var weekRow=latestWeek?latestWeek.rows.find(function(r){return r.matchedId===(s.member&&s.member.id);}):{rawCharge:0};
                      var wkRaw=weekRow?weekRow.rawCharge:0;
                      return <tr key={i} className="trow" onClick={function(){if(s.member)goEdit(s.member.id);}} style={{cursor:"pointer"}}>
                        <td style={Object.assign({},td,{fontWeight:600,color:C.text})}>{s.name}</td>
                        <td style={Object.assign({},td,{textAlign:"right",color:wkRaw>=FLOOR_WEEKLY_DEDUCT?C.green:wkRaw>0?C.red:C.textDim})}>{wkRaw>0?fmtD(wkRaw):"$0"}</td>
                        <td style={Object.assign({},td,{textAlign:"right",color:C.orange})}>{fmtD(s.qtd||0)}</td>
                        <td style={Object.assign({},td,{textAlign:"right",color:C.textMuted})}>{fmtD(Math.max(0,FLOOR-(s.qtd||0)))}</td>
                        <td style={Object.assign({},td,{textAlign:"center"})}>{wkRaw>=FLOOR_WEEKLY_DEDUCT?<Badge v="green">Yes</Badge>:wkRaw>0?<Badge v="red">No — $0</Badge>:<Badge v="muted">—</Badge>}</td>
                      </tr>;
                    })}</tbody>
                  </table></div>
                </div>
              </div>
            </div>}
            {cmdDrill==="dh"&&dhData.length>0&&<div style={Object.assign({},card,{marginBottom:16,overflow:"hidden",animation:"fadeIn .2s ease"})}>
              <div style={{padding:"10px 16px",background:C.bg,borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <h3 style={{fontSize:13,fontWeight:700,color:C.teal,margin:0,fontFamily:FM}}>DH Pipeline — All Deals</h3>
                <button onClick={function(){setCmdDrill(null);}} style={{background:"none",border:"none",color:C.textDim,fontSize:16,cursor:"pointer"}}>×</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,padding:14}}>
                <Stat l="Pending" v={pendDH.length} c={C.orange} s={fmtD(pendRaw)}/>
                <Stat l="Ready to Pay" v={readyDH.length} c={C.green} s={readyDH.length?fmtD(readyDH.reduce(function(a,d){return a+d.raw;},0)):""}/>
                <Stat l="Completed" v={paidDH.length} c={C.purple} s={fmtD(paidRaw)}/>
                <Stat l="Terminated" v={dhData.filter(function(d){return d.st==="t";}).length} c={C.red}/>
              </div>
              <div style={{maxHeight:"30vh",overflowY:"auto",padding:"0 14px 14px"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Candidate</th><th style={th}>Client</th><th style={th}>AM</th><th style={th}>Rec</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th><th style={Object.assign({},th,{textAlign:"center"})}>Status</th></tr></thead>
                <tbody>{dhData.slice().sort(function(a,b){if(isReady(a)&&!a.paidOut)return -1;if(isReady(b)&&!b.paidOut)return 1;return b.raw-a.raw;}).map(function(d,i){
                  var rdy=isReady(d)&&!d.paidOut;var stColor=rdy?C.green:d.paidOut?C.purple:d.st==="t"?C.red:C.orange;
                  var stLabel=rdy?"Ready":d.paidOut?"Paid":d.st==="t"?"Term":d.st==="c"?"Clear":d.st==="o"?"Guar":"Pend";
                  return <tr key={i} className="trow" style={{opacity:d.st==="t"||d.paidOut?.5:1}}>
                    <td style={Object.assign({},td,{fontWeight:600})}>{d.can}</td>
                    <td style={td}>{d.cl}</td>
                    <td style={Object.assign({},td,{fontSize:12})}>{d.am}</td>
                    <td style={Object.assign({},td,{fontSize:12})}>{d.rec}</td>
                    <td style={Object.assign({},td,{textAlign:"right",fontWeight:700})}>{fmtD(d.raw)}</td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><Badge v={rdy?"green":d.paidOut?"purple":d.st==="t"?"red":"orange"}>{stLabel}</Badge></td>
                  </tr>;
                })}</tbody>
              </table></div>
            </div>}
            </div>;
          }()}
          {/* ── Weekly Floors Callout ── */}
          {function(){
            var gMembers=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0&&(!m.guarantee.endDate||m.guarantee.endDate>=new Date().toISOString().slice(0,10));});
            if(!gMembers.length)return null;
            var totalGuarantee=gMembers.reduce(function(a,m){return a+m.guarantee.amount;},0);
            var expiringSoon=gMembers.filter(function(m){if(!m.guarantee.endDate)return false;var d=new Date(m.guarantee.endDate);var diff=Math.ceil((d-NOW)/(1000*60*60*24));return diff<=30;});
            return <div style={{display:"flex",gap:8,marginBottom:14,padding:"10px 14px",background:C.accentDim,border:"1px solid "+C.accent+"33",borderRadius:6,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:16}}>💰</span>
                <span style={{fontSize:13,fontWeight:700,color:C.accent,fontFamily:FM}}>WEEKLY FLOORS</span>
              </div>
              <span style={{fontSize:14,fontWeight:800,color:C.accent,fontFamily:FM}}>{fmtD(totalGuarantee)}/week</span>
              <span style={{fontSize:12,color:C.textMuted,fontFamily:FM}}>across {gMembers.length} member{gMembers.length>1?"s":""}</span>
              <span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>—</span>
              {gMembers.map(function(m){return <span key={m.id} style={{fontSize:12,fontFamily:FM,padding:"2px 8px",background:C.bgCard,borderRadius:3,border:"1px solid "+C.border,color:C.text}}>{m.name.split(" ")[0]} <span style={{fontWeight:700,color:C.accent}}>{fmtD(m.guarantee.amount)}</span>{m.guarantee.endDate?<span style={{color:C.textDim,marginLeft:4}}>→ {m.guarantee.endDate}</span>:""}</span>;})}
              {expiringSoon.length>0&&<span style={{fontSize:12,color:C.orange,fontFamily:FM,fontWeight:600}}>⚠ {expiringSoon.length} expiring within 30 days</span>}
            </div>;
          }()}
          {/* ── YTD Raw by Business Unit + Pending DH side by side ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {/* Unit Breakdown */}
            <div className="panel"><div className="panel-hdr"><h3>YTD RAW BY BUSINESS UNIT</h3></div><div className="panel-body" style={{padding:10}}>
              {function(){
                var unitMap={};ytdStandings.forEach(function(s){var u=s.unit||"Other";unitMap[u]=(unitMap[u]||0)+s.ytdRaw;});
                var unitData=Object.keys(unitMap).map(function(u){return{name:u,raw:unitMap[u]};}).sort(function(a,b){return b.raw-a.raw;});
                var unitColors={"MI Metro":"#3B9EFF","Light Industrial":"#A78BFA","Automation":"#2DD4BF","Enterprise":"#3B9EFF","Spark Sales":"#FFD700","Ignite":"#60A5FA","JJP":"#E09F3E","Fulfillment":"#27C93F","South East":"#E09F3E","Central":"#E09F3E"};
                var maxRaw=unitData.length?unitData[0].raw:1;
                var totalRaw=unitData.reduce(function(a,u){return a+u.raw;},0);
                return <div>{unitData.map(function(u,i){var pct=Math.round(u.raw/totalRaw*100);return <div key={u.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:12,fontFamily:FM,color:C.textMuted,minWidth:90,textAlign:"right"}}>{u.name}</span>
                  <div style={{flex:1,height:22,background:C.bg,borderRadius:4,overflow:"hidden",position:"relative"}}>
                    <div style={{height:"100%",width:Math.round(u.raw/maxRaw*100)+"%",background:"linear-gradient(90deg,"+(unitColors[u.name]||C.accent)+"cc,"+(unitColors[u.name]||C.accent)+"66)",borderRadius:4,transition:"width .5s ease"}}/>
                    <span style={{position:"absolute",left:8,top:3,fontSize:11,fontWeight:700,fontFamily:FM,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,.5)"}}>{fmtD(u.raw)}</span>
                  </div>
                  <span style={{fontSize:11,fontFamily:FM,color:C.textDim,minWidth:32}}>{pct}%</span>
                </div>})}</div>;
              }()}
            </div></div>
            {/* Pending DH Payouts */}
            <div className="panel"><div className="panel-hdr"><h3>UPCOMING DH PAYOUTS</h3><span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>{dhData.filter(function(d){return!d.paidOut&&d.st!=="t"&&d.st!=="d";}).length} pending</span></div><div className="panel-body" style={{padding:8,maxHeight:"30vh",overflowY:"auto"}}>
              {function(){
                var pending=dhData.filter(function(d){return!d.paidOut&&d.st!=="t"&&d.st!=="d";}).map(function(d){
                  var dt=d.cd?Math.ceil((new Date(d.cd)-NOW)/864e5):null;
                  return Object.assign({},d,{daysLeft:dt});
                }).sort(function(a,b){
                  if(a.daysLeft===null&&b.daysLeft===null)return b.raw-a.raw;
                  if(a.daysLeft===null)return 1;if(b.daysLeft===null)return -1;
                  return a.daysLeft-b.daysLeft;
                });
                if(!pending.length)return <p style={{color:C.textDim,fontSize:13,fontFamily:FM,textAlign:"center",padding:12,margin:0}}>No pending DH deals</p>;
                return pending.slice(0,10).map(function(d,i){
                  var urgent=d.daysLeft!==null&&d.daysLeft<=0;
                  var soon=d.daysLeft!==null&&d.daysLeft>0&&d.daysLeft<=14;
                  var needsInv=urgent&&!d.invPaid;
                  return <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 4px",borderBottom:i<9?"1px solid "+C.border+"66":"none",background:urgent?C.greenDim:"transparent"}}>
                    <div style={{width:4,height:28,borderRadius:2,background:urgent?C.green:soon?C.orange:d.cd?C.blue:C.textDim}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:13,fontFamily:FU,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.can}</span>
                        <span style={{fontSize:13,fontFamily:FM,fontWeight:700,color:urgent?C.green:C.text}}>{fmtD(d.raw)}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:1}}>
                        <span style={{fontSize:11,color:C.textMuted,fontFamily:FM}}>{d.cl} · {d.rec.split(" ").pop()}</span>
                        <span style={{fontSize:11,fontFamily:FM,fontWeight:600,color:urgent?C.green:soon?C.orange:C.textDim}}>{d.daysLeft===null?"No clearance date":urgent?(needsInv?"CLEAR — need invoice":"CLEAR — ready"):(d.daysLeft+"d to clear")}</span>
                      </div>
                    </div>
                  </div>;
                });
              }()}
            </div></div>
          </div>
          {/* ── DATA INSIGHTS ── */}
          {chargeWeeks.length>0&&<div style={{display:"grid",gridTemplateColumns:chargeWeeks.length>=2?"2fr 1fr":"1fr",gap:8,marginBottom:16}}>
            {/* Team Velocity Chart */}
            {chargeWeeks.length>=2&&<div className="panel"><div className="panel-hdr"><h3>TEAM VELOCITY</h3><span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>{chargeWeeks.length} weeks</span></div><div className="panel-body" style={{padding:"8px 4px 2px 0"}}>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chargeWeeks.slice().reverse().map(function(w){var tRaw=w.rows.reduce(function(a,r){return a+r.rawCharge;},0);var tYTD=w.rows.reduce(function(a,r){return a+r.ytdRaw;},0);return{we:w.weekEnding,raw:Math.round(tRaw),ytd:Math.round(tYTD)};})}>
                  <defs><linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.3}/><stop offset="100%" stopColor={C.accent} stopOpacity={0.02}/></linearGradient></defs>
                  <XAxis dataKey="we" fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false}/>
                  <YAxis fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false} tickFormatter={function(v){return"$"+Math.round(v/1000)+"K";}}/>
                  <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload[0])return null;var d=p.payload[0].payload;return <div style={{background:C.bg,border:"1px solid "+C.border,borderRadius:4,padding:"6px 10px",fontFamily:FM,fontSize:12}}><p style={{margin:0,color:C.textDim}}>WE {d.we}</p><p style={{margin:"2px 0 0",fontWeight:700,color:C.accent}}>Raw: {fmtD(d.raw)}</p></div>;}}/>
                  <Area type="monotone" dataKey="raw" stroke={C.accent} strokeWidth={2} fill="url(#velGrad)" dot={{r:3,fill:C.accent}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div></div>}
            {/* Quick Insights */}
            <div className="panel"><div className="panel-hdr"><h3>INSIGHTS</h3></div><div className="panel-body" style={{padding:10}}>
              {function(){
                var onFloor=ytdStandings.filter(function(s){return!s.aboveFloor;});
                var approaching=onFloor.filter(function(s){return s.weeksTo25K!==null&&s.weeksTo25K<=4;});
                var club100=ytdStandings.filter(function(s){return s.ytdRaw>=FLOOR_ANNUAL;});
                var topAvg=ytdStandings.slice().sort(function(a,b){return b.avgWeekly-a.avgWeekly;})[0];
                var totalWeekly=ytdStandings.reduce(function(a,s){return a+s.avgWeekly;},0);
                var items=[];
                if(approaching.length>0)items.push({icon:"📈",color:C.green,text:approaching.map(function(s){return s.name.split(" ")[0];}).join(", ")+" approaching $25K tier",sub:approaching.map(function(s){return"~"+s.weeksTo25K+"w";}).join(", ")});
                if(onFloor.length>0)items.push({icon:"⚠",color:C.orange,text:onFloor.length+" member"+(onFloor.length>1?"s":"")+" below $25K QTD tier",sub:"No DH eligibility until crossed"});
                if(club100.length>0)items.push({icon:"💎",color:C.accent,text:club100.length+" in the $100K Club",sub:club100.map(function(s){return s.name.split(" ")[0];}).join(", ")});
                if(topAvg)items.push({icon:"🔥",color:C.accent,text:topAvg.name.split(" ")[0]+" leads weekly avg",sub:fmt(topAvg.avgWeekly)+"/week"});
                items.push({icon:"📊",color:C.blue,text:"Team avg weekly velocity",sub:fmtD(totalWeekly)+" combined"});
                var gMi=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0&&(!m.guarantee.endDate||m.guarantee.endDate>=new Date().toISOString().slice(0,10));});
                if(gMi.length>0){var gTi=gMi.reduce(function(a,m){return a+m.guarantee.amount;},0);items.push({icon:"💰",color:C.accent,text:gMi.length+" guarantee"+(gMi.length>1?"s":"")+": "+fmtD(gTi)+"/week",sub:gMi.map(function(m){return m.name.split(" ")[0];}).join(", ")});}
                if(chargeWeeks.length>=2){var w1=chargeWeeks[0].rows.reduce(function(a,r){return a+r.rawCharge;},0);var w2=chargeWeeks[1].rows.reduce(function(a,r){return a+r.rawCharge;},0);var delta=w1-w2;items.push({icon:delta>=0?"▲":"▼",color:delta>=0?C.green:C.red,text:"Week-over-week: "+(delta>=0?"+":"")+fmtD(delta),sub:fmtD(w2)+" → "+fmtD(w1)});}
                return <div style={{display:"flex",flexDirection:"column",gap:6}}>{items.slice(0,6).map(function(item,i){return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"5px 6px",borderRadius:4,background:i===0?item.color+"11":"transparent"}}><span style={{fontSize:14,lineHeight:"18px",flexShrink:0}}>{item.icon}</span><div><p style={{fontSize:13,fontWeight:600,color:C.text,margin:0,fontFamily:FM}}>{item.text}</p><p style={{fontSize:11,color:C.textMuted,margin:"1px 0 0",fontFamily:FM}}>{item.sub}</p></div></div>;})}</div>;
              }()}
            </div></div>
          </div>}
          {/* ── YTD Standings ── */}
          {ytdStandings.length>0&&<Panel title="YTD RAW STANDINGS" icon="bar" right={<span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>Latest Import</span>}>
          <div style={{overflow:"auto",maxHeight:"40vh"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={Object.assign({},th,{width:24})}>#</th><th style={th}>Member</th><th style={th}>Unit</th><th style={Object.assign({},th,{textAlign:"right"})}>YTD Raw</th><th style={Object.assign({},th,{textAlign:"right"})}>QTD</th><th style={Object.assign({},th,{textAlign:"right"})}>Avg/Wk</th><th style={Object.assign({},th,{width:60,textAlign:"center"})}>Trend</th><th style={Object.assign({},th,{textAlign:"center"})}>Tier</th><th style={Object.assign({},th,{width:"14%"})}>Progress</th></tr></thead>
          <tbody>{ytdStandings.map(function(s,i){var pct=Math.min(100,Math.round((s.qtd||0)/FLOOR*100));return <tr key={i} className="trow" onClick={function(){if(s.member)goEdit(s.member.id);}} style={{cursor:s.member?"pointer":"default"}}><td style={Object.assign({},td,{color:i<3?C.accent:C.textDim,fontWeight:i<3?800:400,textAlign:"center",fontSize:i<3?15:13})}>{i===0?"👑":i+1}</td><td style={Object.assign({},td,{fontWeight:600,color:C.text,borderLeft:"3px solid "+(s.aboveFloor?C.green:C.red)+"55",paddingLeft:8})}>{s.name}</td><td style={td}>{s.unit&&<Badge v={UB[s.unit]||"muted"}>{s.unit}</Badge>}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.text})}>{fmt(s.ytdRaw)}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:s.aboveFloor?C.green:C.orange})}>{fmt(s.qtd||0)}</td><td style={Object.assign({},td,{textAlign:"right",fontSize:12,color:s.avgWeekly>0?C.textMuted:C.textDim})}>{s.avgWeekly>0?fmt(s.avgWeekly):"--"}</td><td style={Object.assign({},td,{textAlign:"center"})}><Spark data={s.weeklyRaw} w={50} h={18}/></td><td style={Object.assign({},td,{textAlign:"center"})}>{s.aboveFloor?<Badge v="green">{s.ytdRaw>=FLOOR_ANNUAL?"$100K":"OK"}</Badge>:s.weeksTo25K!==null&&s.weeksTo25K<=4?<Badge v="orange">{"~"+s.weeksTo25K+"w"}</Badge>:<Badge v="red">{pct+"%"}</Badge>}</td><td style={td}><div style={{height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct>=100?"linear-gradient(90deg,"+C.green+","+C.teal+")":pct>=60?C.orange:C.red,borderRadius:3,transition:"width .5s ease"}}/></div></td></tr>;})}</tbody></table></div></Panel>}
          {ytdStandings.length===0&&<div className="panel"><div className="panel-hdr"><h3>YTD RAW STANDINGS</h3></div><div className="panel-body" style={{textAlign:"center",padding:24}}><p style={{color:C.textDim,fontSize:14,fontFamily:FM,margin:0}}>No charge weeks imported · Go to Weekly Charges to start</p></div></div>}
        </div>}
        {/* ════════ WEEKLY CHARGES ════════ */}
        {view==="charges"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:4}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Weekly Charges</h2>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {chargeWeeks.length>0&&<select value={selectedWeek||""} onChange={function(e){setSelectedWeek(+e.target.value||null);setExpandedRow(null);}} style={{padding:"3px 6px",fontSize:13,borderRadius:3,fontFamily:FM}}><option value="">Select week...</option>{chargeWeeks.map(function(w){return <option key={w.id} value={w.id}>{lockedWeeks.includes(w.weekEnding)?"🔒 ":""}{"WE "+w.weekEnding}</option>;})}</select>}
              {activeWeek&&<button onClick={doExport} className="btn-ghost" style={{padding:"3px 8px",borderRadius:3,fontSize:13,cursor:"pointer",fontFamily:FM}}>EXPORT FULL CSV</button>}
              {activeWeek&&!lockedWeeks.includes(activeWeek.weekEnding)&&<button onClick={function(){deleteWeek(activeWeek.id);}} style={{padding:"3px 8px",borderRadius:3,fontSize:13,cursor:"pointer",fontFamily:FM,background:"transparent",border:"1px solid "+C.red+"66",color:C.red}}>DELETE WEEK</button>}
              {activeWeek&&lockedWeeks.includes(activeWeek.weekEnding)&&<span style={{fontSize:12,fontWeight:700,color:C.green,fontFamily:FM}}>🔒 Locked</span>}
            </div>
          </div>
          {/* Import Section */}
          <div style={Object.assign({},card,{padding:14,marginBottom:14})}>
            <h3 style={{fontSize:13,fontWeight:700,margin:"0 0 8px",fontFamily:FM,color:C.accent,letterSpacing:"1px"}}>IMPORT CHARGE CSV</h3>
            <p style={{fontSize:13,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Format: Team Member | YTD Raw | Split-Rec Charge | Split-Sales Charge | Full Desk Charge | Raw Charge</p>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={{flex:1}}><textarea rows={3} value={importText} onChange={function(e){setImportText(e.target.value);}} placeholder="Paste CSV data here..." style={Object.assign({},inp,{resize:"vertical"})}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
                <label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>WEEK ENDING</label>
                <input type="date" value={importWE} onChange={function(e){setImportWE(e.target.value);}} style={Object.assign({},inp,{colorScheme:"dark",cursor:"pointer",fontSize:15,fontFamily:FM,padding:"8px 10px"})}/>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={function(e){var f=e.target.files&&e.target.files[0];if(!f)return;if(f.name.match(/\.xlsx?$/i)){var r=new FileReader();r.onload=function(ev){try{var wb=XLSX.read(ev.target.result,{type:"array"});var ws=wb.Sheets[wb.SheetNames[0]];var csv=XLSX.utils.sheet_to_csv(ws);setImportText(csv);parseChargeCSV(csv);}catch(err){showToast("XLSX parse error: "+err.message,"err");}};r.readAsArrayBuffer(f);}else{var r=new FileReader();r.onload=function(ev){setImportText(ev.target.result);parseChargeCSV(ev.target.result);};r.readAsText(f);}}} style={{display:"none"}} id="chargeFileInput"/>
                <button onClick={function(){document.getElementById("chargeFileInput").click();}} style={{padding:"6px 12px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,background:C.bgCard,border:"1px solid "+C.border,color:C.text}}>UPLOAD FILE (.csv / .xlsx)</button>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={function(){if(importText.trim())parseChargeCSV(importText);}} className="btn-primary" style={{padding:"5px 14px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>PARSE</button>
              {importPreview&&importPreview.bulk&&<button onClick={commitBulkImport} className="btn-primary" style={{padding:"5px 14px",borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:FM}}>IMPORT ALL {importPreview.weekKeys.length} WEEKS ({importPreview.rows.filter(function(r){return!!r.matchedId;}).length} matched rows)</button>}
              {importPreview&&!importPreview.bulk&&<button onClick={commitChargeImport} className="btn-primary" style={{padding:"5px 14px",borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:FM}}>IMPORT {importPreview.rows.filter(function(r){return!!r.matchedId;}).length} MATCHED ROWS</button>}
              {importPreview&&importPreview.unmatchedCount>0&&<span style={{fontSize:13,color:C.orange,fontFamily:FM,alignSelf:"center"}}>{importPreview.unmatchedCount} unmatched (will be skipped)</span>}
            </div>
          </div>
          {/* Import Preview */}
          {importPreview&&importPreview.bulk&&function(){
            var wk=importPreview.weekKeys;var wm=importPreview.weekMap;var locked=wk.filter(function(w){return lockedWeeks.includes(w);}).length;
            var totalRaw=importPreview.rows.reduce(function(a,r){return a+r.rawCharge;},0);
            return <div style={Object.assign({},card,{padding:16,marginBottom:16,borderColor:C.accent+"44"})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div>
                  <p style={{fontSize:16,fontWeight:700,color:C.accent,margin:0,fontFamily:FU}}>BULK IMPORT — {wk.length} WEEKS</p>
                  <p style={{fontSize:13,color:C.textMuted,margin:"4px 0 0",fontFamily:FM}}>{importPreview.rows.length} rows · {fmtD(totalRaw)} total raw{importPreview.unmatchedCount>0?" · "+importPreview.unmatchedCount+" unmatched will be skipped":""}{locked>0?<span style={{color:C.orange}}> · {locked} locked (skip)</span>:""}</p>
                  {importPreview.detectedCols&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>
                    <span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>Columns:</span>
                    {Object.keys(importPreview.detectedCols).map(function(k){var v=importPreview.detectedCols[k];var miss=v.startsWith("(pos")||v==="—";return <span key={k} style={{fontSize:11,padding:"1px 6px",borderRadius:3,fontFamily:FM,background:miss?C.redDim:C.greenDim,color:miss?C.red:C.green,border:"1px solid "+(miss?C.red:C.green)+"22"}}>{k}→{v}</span>;})}
                  </div>}
                  {importPreview.unmatchedCount>0&&function(){
                    var unmatched=importPreview.rows.filter(function(r){return!r.matchedId;});
                    var uniqueNames=[];var seen={};unmatched.forEach(function(r){if(!seen[r.name]){seen[r.name]=true;uniqueNames.push(r.name);}});
                    return <div style={{marginTop:8,padding:"10px 14px",background:C.redDim,borderRadius:6,border:"1px solid "+C.red+"33"}}>
                      <p style={{fontSize:13,fontWeight:700,color:C.red,margin:"0 0 6px",fontFamily:FM}}>Skipping {unmatched.length} row{unmatched.length>1?"s":""} — {uniqueNames.length} name{uniqueNames.length>1?"s":""} not found on roster:</p>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {uniqueNames.map(function(name){return <span key={name} style={{padding:"3px 10px",background:C.bgCard,borderRadius:5,border:"1px solid "+C.red+"33",fontSize:13,fontFamily:FM,color:C.text}}>{name}</span>;})}
                      </div>
                      <p style={{fontSize:12,color:C.textMuted,margin:"6px 0 0",fontFamily:FM}}>Fix the names in your source file to match the roster, or add these members in the Team tab first.</p>
                    </div>;
                  }()}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={commitBulkImport} className="btn-primary" style={{padding:"8px 18px",borderRadius:6,fontSize:15,cursor:"pointer",fontFamily:FM,fontWeight:700}}>IMPORT {wk.length-locked} WEEKS</button>
                  <button onClick={function(){setImportPreview(null);}} className="btn-ghost" style={{padding:"8px 14px",borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:FM}}>CANCEL</button>
                </div>
              </div>
              <div style={{overflow:"auto",maxHeight:"30vh"}}>
                {wk.map(function(we){var rows=wm[we];var isLocked=lockedWeeks.includes(we);var weekRaw=rows.reduce(function(a,r){return a+r.rawCharge;},0);var existing=chargeWeeks.find(function(w){return w.weekEnding===we;});
                  return <div key={we} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"1px solid "+C.border,opacity:isLocked?.5:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:FM,minWidth:80}}>WE {we}</span>
                      <span style={{fontSize:13,color:C.textMuted,fontFamily:FM}}>{rows.length} members</span>
                      {isLocked&&<Badge v="orange">LOCKED</Badge>}
                      {existing&&!isLocked&&<Badge v="blue">OVERWRITE</Badge>}
                    </div>
                    <span style={{fontSize:14,fontWeight:700,color:C.accent,fontFamily:FM}}>{fmtD(weekRaw)}</span>
                  </div>;
                })}
              </div>
            </div>;
          }()}
          {importPreview&&!importPreview.bulk&&function(){
            var tYTD=0,tRec=0,tAM=0,tFD=0,tRaw=0;
            importPreview.rows.forEach(function(r){tYTD+=r.ytdRaw;tRec+=r.splitRec;tAM+=r.splitAM;tFD+=r.fullDesk;tRaw+=r.rawCharge;});
            return <div className="glow-card" style={Object.assign({},card,{padding:14,marginBottom:14,borderColor:C.accent+"55"})}><p style={{fontSize:13,fontWeight:700,color:C.accent,margin:"0 0 8px",fontFamily:FM}}>PREVIEW ({importPreview.rows.length} members)</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
              <div style={{background:C.bg,borderRadius:4,padding:"6px 10px",textAlign:"center"}}><p style={{fontSize:11,color:C.textDim,margin:0,fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>YTD RAW TOTAL</p><p style={{fontSize:16,fontWeight:800,margin:"2px 0 0",color:C.text,fontFamily:FM}}>{fmtD(tYTD)}</p></div>
              <div style={{background:C.bg,borderRadius:4,padding:"6px 10px",textAlign:"center"}}><p style={{fontSize:11,color:C.textDim,margin:0,fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>SPLIT REC</p><p style={{fontSize:16,fontWeight:800,margin:"2px 0 0",color:C.blue,fontFamily:FM}}>{fmtD(tRec)}</p></div>
              <div style={{background:C.bg,borderRadius:4,padding:"6px 10px",textAlign:"center"}}><p style={{fontSize:11,color:C.textDim,margin:0,fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>SPLIT AM</p><p style={{fontSize:16,fontWeight:800,margin:"2px 0 0",color:C.purple,fontFamily:FM}}>{fmtD(tAM)}</p></div>
              <div style={{background:C.bg,borderRadius:4,padding:"6px 10px",textAlign:"center"}}><p style={{fontSize:11,color:C.textDim,margin:0,fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>FULL DESK</p><p style={{fontSize:16,fontWeight:800,margin:"2px 0 0",color:C.accent,fontFamily:FM}}>{fmtD(tFD)}</p></div>
              <div style={{background:C.bg,borderRadius:4,padding:"6px 10px",textAlign:"center",border:"1px solid "+C.accent+"33"}}><p style={{fontSize:11,color:C.textDim,margin:0,fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>RAW CHARGE</p><p style={{fontSize:16,fontWeight:800,margin:"2px 0 0",color:C.green,fontFamily:FM}}>{fmtD(tRaw)}</p></div>
            </div>
            <div style={{overflow:"auto",maxHeight:"30vh"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={th}>CSV Name</th><th style={th}>Matched To</th><th style={Object.assign({},th,{textAlign:"right"})}>YTD Raw</th><th style={Object.assign({},th,{textAlign:"right"})}>Split Rec</th><th style={Object.assign({},th,{textAlign:"right"})}>Split AM</th><th style={Object.assign({},th,{textAlign:"right"})}>Full Desk</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th></tr></thead>
            <tbody>{importPreview.rows.map(function(r,i){var skip=!r.matchedId;return <tr key={i} className="trow" style={{opacity:skip?.4:1}}><td style={Object.assign({},td,{fontFamily:FU,textDecoration:skip?"line-through":"none"})}>{r.name}</td><td style={td}>{r.matchedId?<Badge v="green">{r.matchedName}</Badge>:<Badge v="red">SKIP</Badge>}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700})}>{fmt(r.ytdRaw)}</td><td style={Object.assign({},td,{textAlign:"right",color:r.splitRec?C.blue:C.textDim})}>{fmtD(r.splitRec)}</td><td style={Object.assign({},td,{textAlign:"right",color:r.splitAM?C.purple:C.textDim})}>{fmtD(r.splitAM)}</td><td style={Object.assign({},td,{textAlign:"right",color:r.fullDesk?C.accent:C.textDim})}>{fmtD(r.fullDesk)}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700})}>{fmtD(r.rawCharge)}</td></tr>;})}</tbody>
            <tfoot><tr style={{borderTop:"2px solid "+C.accent+"44",background:C.bg2}}><td style={Object.assign({},td,{fontWeight:800,color:C.accent,fontFamily:FU})} colSpan={2}>TOTALS ({importPreview.rows.length} rows)</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:800,color:C.text})}>{fmtD(tYTD)}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:800,color:C.blue})}>{fmtD(tRec)}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:800,color:C.purple})}>{fmtD(tAM)}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:800,color:C.accent})}>{fmtD(tFD)}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:800,color:C.green})}>{fmtD(tRaw)}</td></tr></tfoot></table></div></div>;
          }()}
          {/* Active Week View */}
          {activeWeek&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:8}}>
              <Stat l="Split Rec" v={fmtD(weekTotals.splitRec)} c={C.blue} glow/><Stat l="Split AM" v={fmtD(weekTotals.splitAM)} c={C.purple} glow/><Stat l="Full Desk" v={fmtD(weekTotals.fullDesk)} c={C.accent} glow/><Stat l="Raw" v={fmtD(weekTotals.rawCharge)} c={C.green} glow/><Stat l="Deductions" v={weekTotals.deductions>0?"-"+fmtD(weekTotals.deductions):"--"} c={weekTotals.deductions>0?C.red:C.textDim}/><Stat l="Commission" v={fmtD(weekTotals.totalComm)} c={C.accent} s={"WE "+activeWeek.weekEnding} glow/>
            </div>
            {activeWeek&&lockedWeeks.includes(activeWeek.weekEnding)&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"6px 12px",background:C.greenDim,border:"1px solid "+C.green+"33",borderRadius:4}}><span style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:FM}}>🔒 WE {activeWeek.weekEnding} is locked — data is read-only</span></div>}
            <p style={{fontSize:12,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>CLICK ROW FOR COMMISSION BREAKDOWN</p>
            <div style={Object.assign({},card,{overflow:"auto",maxHeight:"50vh"})}>
              <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
                <th style={th}>Member</th><th style={th}>Unit</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.blue})}>Split Rec</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.purple})}>Split AM</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.accent})}>Full Desk</th>
                <th style={Object.assign({},th,{textAlign:"right"})}>Raw</th>
                <th style={Object.assign({},th,{textAlign:"right"})}>YTD Raw</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.green})}>Commission</th>
                <th style={Object.assign({},th,{textAlign:"center"})}>Tier</th>
              </tr></thead>
              <tbody>{weekData.map(function(r,i){return[<tr key={i} className="trow" onClick={function(){setExpandedRow(expandedRow===i?null:i);}} style={{cursor:"pointer"}}>
                <td style={Object.assign({},td,{fontWeight:600,fontFamily:FU,borderLeft:"2px solid "+(r.matchedId?r.aboveFloor?C.green:C.red:C.orange)+"66",paddingLeft:10})}>{expandedRow===i?"\u25BC ":""}{r.matchedName||r.name}</td>
                <td style={td}>{r.member&&<Badge v={UB[r.member.unit]||"muted"}>{r.member.unit}</Badge>}</td>
                <td style={Object.assign({},td,{textAlign:"right",color:r.splitRec?C.blue:C.textDim})}>{r.splitRec?fmtD(r.splitRec):"\u2014"}</td>
                <td style={Object.assign({},td,{textAlign:"right",color:r.splitAM?C.purple:C.textDim})}>{r.splitAM?fmtD(r.splitAM):"\u2014"}</td>
                <td style={Object.assign({},td,{textAlign:"right",color:r.fullDesk?C.accent:C.textDim})}>{r.fullDesk?fmtD(r.fullDesk):"\u2014"}</td>
                <td style={Object.assign({},td,{textAlign:"right",fontWeight:700})}>{fmtD(r.rawCharge)}</td>
                <td style={Object.assign({},td,{textAlign:"right",color:r.aboveFloor?C.green:C.text})}>{fmt(r.ytdRaw)}</td>
                <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:r.totalComm>0?C.green:C.textDim})}>{function(){var we2=activeWeek?activeWeek.weekEnding:"";var oKey=r.matchedName+"|"+we2;var ov=payrollOverrides[oKey];return ov!==undefined?<span style={{color:C.orange}}>{fmtD(ov)} <span style={{fontSize:9,verticalAlign:"super"}}>✎</span></span>:r.totalComm>0?fmtD(r.totalComm):"\u2014";}()}</td>
                <td style={Object.assign({},td,{textAlign:"center"})}>{r.floorInfo?r.aboveFloor?<Badge v="green">{r.floorInfo.ytd>=FLOOR_ANNUAL?"$100K":fmt(r.floorInfo.qtd)+" QTD"}</Badge>:<span style={{fontSize:13,color:C.orange,fontFamily:FM}}>{fmt(r.floorInfo.qtd||0)+" QTD"}<br/><span style={{color:C.red,fontSize:12}}>{"-"+fmt(r.deduction||0)}</span></span>:<Badge v="muted">?</Badge>}</td>
              </tr>,
              expandedRow===i&&<tr key={i+"_x"}><td colSpan={9} style={{padding:0,background:"linear-gradient(135deg,"+C.bgSurface+" 0%,"+C.bg2+" 100%)",borderBottom:"2px solid "+C.accent}}><div style={{padding:"10px 14px"}}>
                {r.floorInfo&&<p style={{fontSize:13,color:r.aboveFloor?C.green:C.orange,margin:"0 0 8px",fontFamily:FM,padding:"3px 8px",background:r.aboveFloor?C.greenDim:C.orangeDim,borderRadius:4,display:"inline-block"}}>{r.floorInfo.reason}</p>}
                {/* EDITABLE FIELDS */}
                {activeWeek&&!lockedWeeks.includes(activeWeek.weekEnding)&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:10,padding:"8px 10px",background:C.bg,borderRadius:4,border:"1px solid "+C.border}}>
                  <div><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM,display:"block",marginBottom:2}}>YTD RAW</label><input type="number" value={r.ytdRaw} onChange={function(e){updateChargeRow(activeWeek.id,r.origIdx,"ytdRaw",e.target.value);}} style={{width:"100%",padding:"4px 6px",fontSize:14,fontFamily:FM,borderRadius:3,fontWeight:600}} step="0.01"/></div>
                  <div><label style={{fontSize:11,color:C.blue,fontWeight:700,fontFamily:FM,display:"block",marginBottom:2}}>SPLIT REC</label><input type="number" value={r.splitRec} onChange={function(e){updateChargeRow(activeWeek.id,r.origIdx,"splitRec",e.target.value);}} style={{width:"100%",padding:"4px 6px",fontSize:14,fontFamily:FM,borderRadius:3,color:"#3B9EFF"}} step="0.01"/></div>
                  <div><label style={{fontSize:11,color:C.purple,fontWeight:700,fontFamily:FM,display:"block",marginBottom:2}}>SPLIT AM</label><input type="number" value={r.splitAM} onChange={function(e){updateChargeRow(activeWeek.id,r.origIdx,"splitAM",e.target.value);}} style={{width:"100%",padding:"4px 6px",fontSize:14,fontFamily:FM,borderRadius:3,color:"#A78BFA"}} step="0.01"/></div>
                  <div><label style={{fontSize:11,color:C.accent,fontWeight:700,fontFamily:FM,display:"block",marginBottom:2}}>FULL DESK</label><input type="number" value={r.fullDesk} onChange={function(e){updateChargeRow(activeWeek.id,r.origIdx,"fullDesk",e.target.value);}} style={{width:"100%",padding:"4px 6px",fontSize:14,fontFamily:FM,borderRadius:3,color:"#FFD700"}} step="0.01"/></div>
                  <div><label style={{fontSize:11,color:C.textMuted,fontWeight:700,fontFamily:FM,display:"block",marginBottom:2}}>RAW (Rec+AM)</label><div style={{padding:"4px 6px",fontSize:14,fontFamily:FM,fontWeight:700,color:C.text}}>{fmtD(r.rawCharge)}</div></div>
                </div>}
                {activeWeek&&lockedWeeks.includes(activeWeek.weekEnding)&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,padding:"6px 10px",background:C.greenDim,borderRadius:4,border:"1px solid "+C.green+"33"}}><span style={{fontSize:12,fontWeight:700,color:C.green,fontFamily:FM}}>🔒 This week is locked — editing disabled</span></div>}
                <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:"1px"}}>COMMISSION BREAKDOWN · {r.matchedName} · Rate: {r.rate}</p>
                {(r.steps||[]).map(function(s,si){return <div key={si} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:si<r.steps.length-1?"1px solid "+C.border+"66":"none"}}><div><span style={{fontSize:14,fontWeight:700,color:s.t.includes("Rec")?C.blue:s.t.includes("AM")?C.purple:C.accent,fontFamily:FM}}>{s.t}</span><span style={{fontSize:14,color:C.textMuted,marginLeft:10,fontFamily:FM}}>{s.d}</span></div><span style={{fontSize:15,fontFamily:FM,fontWeight:700,color:C.green}}>{fmtD(s.a)}</span></div>;})}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:6,paddingTop:6,borderTop:"1px solid "+C.border}}><span style={{fontSize:15,fontFamily:FM,fontWeight:700,color:C.accent}}>TOTAL: {function(){var we3=activeWeek?activeWeek.weekEnding:"";var oK=r.matchedName+"|"+we3;return payrollOverrides[oK]!==undefined?<span style={{color:C.orange}}>{fmtD(payrollOverrides[oK])} <span style={{fontSize:10,color:C.textDim,textDecoration:"line-through"}}>{fmtD(r.totalComm)}</span></span>:fmtD(r.totalComm);}()}</span></div>
              </div></td></tr>];})}</tbody>
              <tfoot><tr style={{background:C.bg2}}><td colSpan={5} style={Object.assign({},td,{fontWeight:700,textAlign:"right",color:C.textDim})}>TOTALS</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700})}>{fmtD(weekTotals.rawCharge)}</td><td/><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,fontSize:18,color:C.accent})}>{fmtD(weekTotals.totalComm)}</td><td/></tr></tfoot>
            </table></div>
          </div>}
          {!activeWeek&&!importPreview&&chargeWeeks.length===0&&<div style={Object.assign({},card,{padding:30,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM,margin:0}}>Upload a charge file (.csv or .xlsx) or paste charge data above to get started. Use the bulk import template to load all weeks at once.</p></div>}
        </div>}
        {/* ════════ DIRECT HIRES ════════ */}
        {view==="dh"&&<div style={{animation:"fadeIn .2s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Direct Hire Overview</h2>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={function(e){var f=e.target.files&&e.target.files[0];if(!f)return;if(f.name.match(/\.xlsx?$/i)){var r=new FileReader();r.onload=function(ev){try{var wb=XLSX.read(ev.target.result,{type:"array"});var ws=wb.Sheets[wb.SheetNames[0]];var csv=XLSX.utils.sheet_to_csv(ws);parseDHFile(csv);}catch(err){showToast("File parse error: "+err.message,"err");}};r.readAsArrayBuffer(f);}else{var r=new FileReader();r.onload=function(ev){parseDHFile(ev.target.result);};r.readAsText(f);}}} style={{display:"none"}} id="dhFileInput"/>
              <button onClick={function(){document.getElementById("dhFileInput").click();}} style={{padding:"6px 14px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM,fontWeight:700,background:"linear-gradient(135deg,"+C.accent+" 0%,#FFC000 100%)",color:"#0B0E14",border:"none"}}>UPLOAD DH FILE (.csv / .xlsx)</button>
              <button onClick={function(){setShowDHForm(true);}} className="btn-ghost" style={{padding:"6px 14px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM,fontWeight:600}}>+ ADD DEAL</button>
              {dhLastSync&&<span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>Last import: {new Date(dhLastSync).toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>}
            </div>
          </div>
          {/* DH Import Format Guide */}
          <div style={Object.assign({},card,{padding:14,marginBottom:14,border:"1px solid "+C.accent+"44",borderLeft:"3px solid "+C.accent})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={function(){setDhFormatOpen(!dhFormatOpen);}}>
              <p style={{fontSize:13,fontWeight:700,color:C.accent,margin:0,fontFamily:FM,letterSpacing:".5px"}}>IMPORT FORMAT GUIDE — REQUIRED COLUMNS ▾</p>
              <span style={{fontSize:12,color:C.accent,fontFamily:FM,fontWeight:600}}>{dhFormatOpen?"COLLAPSE":"EXPAND"}</span>
            </div>
            {dhFormatOpen&&<div style={{marginTop:10}}>
              <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Upload a .csv or .xlsx with these columns (header row required, order doesn't matter):</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:FM}}>
                <thead><tr style={{borderBottom:"1px solid "+C.border+"44"}}><th style={{textAlign:"left",padding:"4px 8px",color:C.accent,fontWeight:700}}>Column Name</th><th style={{textAlign:"left",padding:"4px 8px",color:C.textDim}}>Also Accepts</th><th style={{textAlign:"left",padding:"4px 8px",color:C.textDim}}>Example</th></tr></thead>
                <tbody>
                  {[["Client","client, company, cl","Autokiniton"],["Candidate","candidate, can, name","John Smith"],["Account Manager","am, account manager, acct mgr","Jamie Platt"],["Recruiter","rec, recruiter","Aidan Juengel"],["Position","pos, position, title","CNC Operator"],["Invoice","invoice, inv, invoice total","23750"],["Charge","charge, chg, charge total","23750"],["Raw","raw, raw charge","23750"],["Type","type, typ, FD/S","FD or Split"],["Start Date","start, start date, sd","2026-03-01"],["Guarantee Days","guarantee, gd, days","90"],["Unit","unit, bu, business unit","MI Metro"],["Status","status, st","p/o/c/d/t"]].map(function(r,i){return <tr key={i} style={{borderBottom:"1px solid "+C.border+"22"}}><td style={{padding:"3px 8px",color:C.text,fontWeight:600}}>{r[0]}</td><td style={{padding:"3px 8px",color:C.textMuted}}>{r[1]}</td><td style={{padding:"3px 8px",color:C.textDim,fontStyle:"italic"}}>{r[2]}</td></tr>;})}
                </tbody>
              </table>
              <p style={{fontSize:11,color:C.textMuted,margin:"8px 0 0",fontFamily:FM}}>Status codes: p = pending, o = on guarantee, c = cleared, d = completed, t = terminated. Minimum required: Client + Candidate + Raw.</p>
            </div>}
          </div>
          {/* DH Manual Entry Form */}
          {showDHForm&&<DHEditModal dh={blankDH} onClose={function(){setShowDHForm(false);}} onSave={function(d){
            var amMatch=matchMember(d.am,members);var recMatch=matchMember(d.rec,members);
            var clean=Object.assign({},d,{am:amMatch?amMatch.name:d.am,rec:recMatch?recMatch.name:d.rec,amId:amMatch?amMatch.id:null,recId:recMatch?recMatch.id:null,typ:d.typ==="F"?"FD":(d.typ||"S"),firstSeen:d.sd||new Date().toISOString().slice(0,10),lastSync:new Date().toISOString().slice(0,10)});
            setDhData(function(prev){return prev.concat([clean]);});
            log("DH_ADD",d.can+" @ "+d.cl);showToast("DH deal added");setShowDHForm(false);
          }}/>}
          {dhEditIdx!==null&&dhData[dhEditIdx]&&<DHEditModal dh={dhData[dhEditIdx]} onClose={function(){setDhEditIdx(null);}} onDelete={function(){deleteDH(dhEditIdx);}} onSave={function(d){
            var amMatch=matchMember(d.am,members);var recMatch=matchMember(d.rec,members);
            var clean=Object.assign({},d,{am:amMatch?amMatch.name:d.am,rec:recMatch?recMatch.name:d.rec,amId:amMatch?amMatch.id:null,recId:recMatch?recMatch.id:null});
            setDhData(function(p){var n=p.slice();n[dhEditIdx]=clean;return n;});
            setDhEditIdx(null);log("DH_EDIT",d.can+" @ "+d.cl);showToast("DH deal updated");
          }}/>}
          {/* DH Import — Assignment Step */}
          {dhImportPreview&&<div className="glow-card" style={Object.assign({},card,{padding:14,marginBottom:14,borderColor:C.accent+"55"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div>
                <p style={{fontSize:15,fontWeight:700,color:C.accent,margin:0,fontFamily:FM}}>ASSIGN TEAM MEMBERS ({dhImportPreview.deals.length} deals)</p>
                <p style={{fontSize:12,color:C.textMuted,margin:"2px 0 0",fontFamily:FM}}>Verify AM and Recruiter assignments below. Green = auto-matched. Red = needs your pick.</p>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={function(){try{commitDHImport();}catch(err){showToast("Import error: "+err.message,"err");}}} className="btn-primary" style={{padding:"6px 16px",borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:FM,fontWeight:700}}>CONFIRM & IMPORT ({dhImportPreview.deals.length} deals)</button>
                <button onClick={function(){setDhImportPreview(null);}} className="btn-ghost" style={{padding:"6px 12px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM}}>CANCEL</button>
              </div>
            </div>
            {function(){var noAM=dhImportPreview.deals.filter(function(d){return!d.amId;}).length;var noRec=dhImportPreview.deals.filter(function(d){return!d.recId;}).length;var totalRaw=dhImportPreview.deals.reduce(function(a,d){return a+d.raw;},0);
              return <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,margin:"8px 0 10px"}}>
                <Stat l="Deals" v={dhImportPreview.deals.length} c={C.blue}/>
                <Stat l="Total Raw" v={fmtD(totalRaw)} c={C.accent}/>
                <Stat l="AM Unassigned" v={noAM} c={noAM>0?C.red:C.green} s={noAM>0?"Needs selection":"All matched"}/>
                <Stat l="Rec Unassigned" v={noRec} c={noRec>0?C.red:C.green} s={noRec>0?"Needs selection":"All matched"}/>
              </div>;
            }()}
            <div style={{overflow:"auto",maxHeight:"40vh"}}>
              {dhImportPreview.deals.map(function(d,i){
                var sortedMembers=members.slice().sort(function(a,b){return a.name.localeCompare(b.name);});
                var selStyle={padding:"4px 6px",fontSize:13,borderRadius:4,fontFamily:FM,width:"100%",border:"1px solid "+(d.amId?C.green:C.red)+"66",background:d.amId?C.greenDim:C.redDim};
                var selStyle2=Object.assign({},selStyle,{border:"1px solid "+(d.recId?C.green:C.red)+"66",background:d.recId?C.greenDim:C.redDim});
                return <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 2fr 3fr 3fr 1fr 1.5fr",gap:6,alignItems:"center",padding:"6px 0",borderBottom:"1px solid "+C.border+"44"}}>
                  <div><span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:FM}}>{d.can}</span></div>
                  <div><span style={{fontSize:13,color:C.textMuted,fontFamily:FM}}>{d.cl}</span></div>
                  <div>
                    <label style={{fontSize:10,color:C.textDim,fontFamily:FM,display:"block"}}>AM {d._amRaw?"("+d._amRaw+")":""}</label>
                    <select value={d.amId||""} onChange={function(e){updateDHPreview(i,"amId",e.target.value);}} style={selStyle}>
                      <option value="">— Select AM —</option>
                      {sortedMembers.map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:10,color:C.textDim,fontFamily:FM,display:"block"}}>REC {d._recRaw?"("+d._recRaw+")":""}</label>
                    <select value={d.recId||""} onChange={function(e){updateDHPreview(i,"recId",e.target.value);}} style={selStyle2}>
                      <option value="">— Select Recruiter —</option>
                      {sortedMembers.map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}
                    </select>
                  </div>
                  <div style={{textAlign:"center"}}><Badge v={d.typ==="FD"?"gold":"muted"}>{d.typ==="FD"?"FD":"Split"}</Badge></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:FM}}>{fmtD(d.raw)}</span></div>
                </div>;
              })}
            </div>
            <div style={{display:"flex",gap:6,justifyContent:"flex-end",paddingTop:10,borderTop:"1px solid "+C.border}}>
              <button onClick={function(){setDhImportPreview(null);}} className="btn-ghost" style={{padding:"8px 14px",borderRadius:6,fontSize:14,cursor:"pointer",fontFamily:FM}}>Cancel</button>
              <button onClick={function(){try{commitDHImport();}catch(err){showToast("Error: "+err.message,"err");}}} className="btn-primary" style={{padding:"8px 20px",borderRadius:6,fontSize:15,cursor:"pointer",fontFamily:FM,fontWeight:700}}>CONFIRM & IMPORT {dhImportPreview.deals.length} DEALS</button>
            </div>
          </div>}
          {function(){
            var latestWk=chargeWeeks.length?chargeWeeks[0]:null;
            if(!latestWk&&dhData.length>0){return <div style={Object.assign({},card,{padding:20,marginBottom:14,borderColor:C.orange+"44"})}>
              <p style={{fontSize:14,fontWeight:700,color:C.orange,margin:"0 0 6px",fontFamily:FM}}>No charge data loaded — floor eligibility cannot be calculated</p>
              <p style={{fontSize:13,color:C.textMuted,margin:0,fontFamily:FM}}>Upload charge data on the Weekly Charges tab first. The DH eligibility checks require QTD raw charge data to determine who has crossed the $25K tier.</p>
            </div>;}
            if(!dhData.length)return <div style={Object.assign({},card,{padding:24,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM,margin:0}}>No DH deals loaded — upload your DH tracker (.csv or .xlsx) or add deals manually to get started</p></div>;
            // Build eligibility for each deal
            var dealAnalysis=dhData.map(function(d,origIdx){
              var amM=d.amId?members.find(function(m){return m.id===d.amId;}):findM(d.am,members);
              var recM=d.recId?members.find(function(m){return m.id===d.recId;}):findM(d.rec,members);
              // Get floor info for AM and Rec
              var amFloor=null,recFloor=null;
              if(latestWk&&amM){var amRow=latestWk.rows.find(function(r){return r.matchedId===amM.id;});if(amRow)amFloor=getFloorInfo(amRow,latestWk);}
              if(latestWk&&recM){var recRow=latestWk.rows.find(function(r){return r.matchedId===recM.id;});if(recRow)recFloor=getFloorInfo(recRow,latestWk);}
              var amAbove=amFloor?!amFloor.belowFloor:false;
              var recAbove=recFloor?!recFloor.belowFloor:false;
              var amCrossDate=amFloor?amFloor.crossDate:null;
              var recCrossDate=recFloor?recFloor.crossDate:null;
              var dealStart=d.sd||"";
              // Floor gate: member above $25K AND deal start after crossing
              var amFloorOk=amAbove&&(!amCrossDate||!dealStart||dealStart>=amCrossDate);
              var recFloorOk=recAbove&&(!recCrossDate||!dealStart||dealStart>=recCrossDate);
              // Guarantee gate
              var guaranteeCleared=d.cd&&new Date(d.cd)<=NOW&&d.st!=="t";
              var daysLeft=d.cd?daysTo(d.cd):null;
              // Invoice gate
              var invoicePaid=!!(d.invPaid&&d.invPaid.length);
              // Overall ready
              var isFullDesk=d.typ==="FD";
              var floorOk=isFullDesk?amFloorOk:(amFloorOk||recFloorOk);
              var fullyReady=guaranteeCleared&&invoicePaid&&floorOk&&!d.paidOut&&d.st!=="t";
              // Rates
              var amRate=amM?amM.rates[isFullDesk?"fdDH":"sDH"]:0;
              var recRate=recM?recM.rates.sDH:0;
              var estPayout=isFullDesk?(amFloorOk?d.raw*amRate:0):((amFloorOk?d.raw*amRate:0)+(recFloorOk?d.raw*recRate:0));
              // Block reasons
              var blocks=[];
              if(d.st==="t")blocks.push("Terminated");
              if(d.paidOut)blocks.push("Already paid");
              if(!guaranteeCleared&&d.st!=="t"&&!d.paidOut){blocks.push(daysLeft!==null&&daysLeft>0?"Guarantee: "+daysLeft+" days left":"No clearance date");}
              if(!invoicePaid&&d.st!=="t"&&!d.paidOut)blocks.push("Invoice not paid");
              if(!floorOk&&d.st!=="t"&&!d.paidOut){
                if(isFullDesk){if(!amAbove)blocks.push("AM "+((amM?amM.name.split(" ").pop():"?"))+" below $25K QTD tier");else if(!amFloorOk)blocks.push("Deal started before AM crossed");}
                else{if(!amAbove)blocks.push("AM "+(amM?amM.name.split(" ").pop():"?")+" below $25K");if(!recAbove)blocks.push("Rec "+(recM?recM.name.split(" ").pop():"?")+" below $25K");
                  if(amAbove&&!amFloorOk)blocks.push("AM: deal before crossing");if(recAbove&&!recFloorOk)blocks.push("Rec: deal before crossing");
                }
              }
              return{d:d,origIdx:origIdx,amM:amM,recM:recM,amAbove:amAbove,recAbove:recAbove,amFloorOk:amFloorOk,recFloorOk:recFloorOk,amCrossDate:amCrossDate,recCrossDate:recCrossDate,guaranteeCleared:guaranteeCleared,invoicePaid:invoicePaid,floorOk:floorOk,fullyReady:fullyReady,daysLeft:daysLeft,estPayout:estPayout,blocks:blocks,amRate:amRate,recRate:recRate};
            });
            var readyDeals=dealAnalysis.filter(function(a){return a.fullyReady;});
            var blockedByFloor=dealAnalysis.filter(function(a){return!a.floorOk&&!a.d.paidOut&&a.d.st!=="t";});
            var blockedByGuarantee=dealAnalysis.filter(function(a){return a.floorOk&&!a.guaranteeCleared&&!a.d.paidOut&&a.d.st!=="t";});
            var blockedByInvoice=dealAnalysis.filter(function(a){return a.floorOk&&a.guaranteeCleared&&!a.invoicePaid&&!a.d.paidOut&&a.d.st!=="t";});
            var paidDeals=dealAnalysis.filter(function(a){return a.d.paidOut;});
            var termedDeals=dealAnalysis.filter(function(a){return a.d.st==="t";});
            var totalEstPayout=readyDeals.reduce(function(a,x){return a+x.estPayout;},0);
            var gateIcon=function(ok){return ok?<span style={{color:C.green}}>\u2713</span>:<span style={{color:C.red}}>\u2717</span>;};
            return <div>
              {/* KPI Row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
                <Stat l="Ready to Pay" v={readyDeals.length} c={readyDeals.length?C.green:C.textDim} s={readyDeals.length?fmtD(totalEstPayout)+" est payout":""}/>
                <Stat l="Blocked: Floor" v={blockedByFloor.length} c={blockedByFloor.length?C.red:C.textDim} s={blockedByFloor.length?"AM/Rec below $25K":""}/>
                <Stat l="Blocked: Guarantee" v={blockedByGuarantee.length} c={blockedByGuarantee.length?C.orange:C.textDim} s={blockedByGuarantee.length?"Still in guarantee":""}/>
                <Stat l="Blocked: Invoice" v={blockedByInvoice.length} c={blockedByInvoice.length?C.teal:C.textDim} s={blockedByInvoice.length?"Needs invoice payment":""}/>
                <Stat l="Paid / Termed" v={paidDeals.length+" / "+termedDeals.length} c={C.purple} s={fmtD(paidDeals.reduce(function(a,x){return a+x.d.raw;},0))+" paid"}/>
              </div>
              {/* Ready to Pay Section */}
              {readyDeals.length>0&&<div className="panel" style={{marginBottom:12}}><div className="panel-hdr"><h3 style={{color:C.green}}>READY TO PAY ({readyDeals.length}) — {fmtD(totalEstPayout)} est payout</h3></div><div className="panel-body" style={{padding:10}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={th}>Candidate / Client</th><th style={th}>AM</th><th style={th}>Rec</th><th style={th}>Type</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th><th style={Object.assign({},th,{textAlign:"right"})}>Est Payout</th></tr></thead>
                  <tbody>{readyDeals.map(function(a,i){return <tr key={i} className="trow" onClick={function(){if(a.amM)goEdit(a.amM.id);}} style={{cursor:"pointer",background:C.greenDim}}>
                    <td style={Object.assign({},td,{fontWeight:600})}>{a.d.can} <span style={{color:C.textDim,fontWeight:400}}>@ {a.d.cl}</span></td>
                    <td style={Object.assign({},td,{color:a.amFloorOk?C.green:C.textDim})}>{a.amM?a.amM.name.split(" ").pop():"?"} {gateIcon(a.amFloorOk)}</td>
                    <td style={Object.assign({},td,{color:a.recFloorOk?C.green:C.textDim})}>{a.d.typ==="FD"?"—":(a.recM?a.recM.name.split(" ").pop():"?")} {a.d.typ!=="FD"&&gateIcon(a.recFloorOk)}</td>
                    <td style={td}><Badge v={a.d.typ==="FD"?"gold":"muted"}>{a.d.typ==="FD"?"FD":"Split"}</Badge></td>
                    <td style={Object.assign({},td,{textAlign:"right",fontWeight:600})}>{fmtD(a.d.raw)}</td>
                    <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.green})}>{fmtD(a.estPayout)}</td>
                  </tr>;})}</tbody>
                </table>
              </div></div>}
              {/* Blocked by Floor */}
              {blockedByFloor.length>0&&<div className="panel" style={{marginBottom:12}}><div className="panel-hdr"><h3 style={{color:C.red}}>BLOCKED BY FLOOR ({blockedByFloor.length})</h3><span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>AM or Recruiter below $25K QTD tier — no DH payout until they cross</span></div><div className="panel-body" style={{padding:10}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr><th style={th}>Candidate / Client</th><th style={th}>AM</th><th style={Object.assign({},th,{textAlign:"right"})}>AM QTD</th><th style={th}>Rec</th><th style={Object.assign({},th,{textAlign:"right"})}>Rec QTD</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th><th style={th}>Block Reason</th></tr></thead>
                  <tbody>{blockedByFloor.map(function(a,i){
                    var amQTD=a.amM&&latestWk?function(){var r=latestWk.rows.find(function(x){return x.matchedId===a.amM.id;});return r?getFloorInfo(r,latestWk).qtd:0;}():0;
                    var recQTD=a.recM&&latestWk?function(){var r=latestWk.rows.find(function(x){return x.matchedId===a.recM.id;});return r?getFloorInfo(r,latestWk).qtd:0;}():0;
                    return <tr key={i} className="trow" onClick={function(){if(a.amM)goEdit(a.amM.id);}} style={{cursor:"pointer"}}>
                      <td style={Object.assign({},td,{fontWeight:600})}>{a.d.can} <span style={{color:C.textDim,fontWeight:400}}>@ {a.d.cl}</span></td>
                      <td style={Object.assign({},td,{color:a.amAbove?C.green:C.red})}>{a.amM?a.amM.name.split(" ").pop():"?"} {gateIcon(a.amFloorOk)}</td>
                      <td style={Object.assign({},td,{textAlign:"right",color:a.amAbove?C.green:C.red})}>{fmtD(amQTD)}</td>
                      <td style={Object.assign({},td,{color:a.d.typ==="FD"?C.textDim:a.recAbove?C.green:C.red})}>{a.d.typ==="FD"?"—":(a.recM?a.recM.name.split(" ").pop():"?")} {a.d.typ!=="FD"&&gateIcon(a.recFloorOk)}</td>
                      <td style={Object.assign({},td,{textAlign:"right",color:a.d.typ==="FD"?C.textDim:a.recAbove?C.green:C.red})}>{a.d.typ==="FD"?"—":fmtD(recQTD)}</td>
                      <td style={Object.assign({},td,{textAlign:"right",fontWeight:600})}>{fmtD(a.d.raw)}</td>
                      <td style={Object.assign({},td,{fontSize:12,color:C.red})}>{a.blocks.filter(function(b){return b.includes("$25K")||b.includes("crossing");}).join("; ")}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div></div>}
              {/* Blocked by Guarantee */}
              {blockedByGuarantee.length>0&&<div className="panel" style={{marginBottom:12}}><div className="panel-hdr"><h3 style={{color:C.orange}}>IN GUARANTEE PERIOD ({blockedByGuarantee.length})</h3></div><div className="panel-body" style={{padding:10}}>
                {blockedByGuarantee.sort(function(a,b){return(a.daysLeft||999)-(b.daysLeft||999);}).map(function(a,i){var pct=a.d.gd>0?Math.max(0,Math.round((1-(a.daysLeft||0)/a.d.gd)*100)):0;return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i<blockedByGuarantee.length-1?"1px solid "+C.border+"44":"none"}}>
                  <div style={{width:44,textAlign:"center"}}><span style={{fontSize:18,fontWeight:800,color:a.daysLeft<=7?C.green:a.daysLeft<=30?C.orange:C.textMuted,fontFamily:FM}}>{a.daysLeft}</span><br/><span style={{fontSize:10,color:C.textDim,fontFamily:FM}}>days</span></div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:FM}}>{a.d.can} <span style={{color:C.textDim,fontWeight:400}}>@ {a.d.cl}</span></span><span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:FM}}>{fmtD(a.d.raw)}</span></div>
                    <div style={{height:4,background:C.bg,borderRadius:2,overflow:"hidden",marginTop:3}}><div style={{height:"100%",width:pct+"%",background:pct>=80?"linear-gradient(90deg,"+C.green+","+C.teal+")":pct>=50?C.orange:C.blue,borderRadius:2}}/></div>
                    <div style={{display:"flex",gap:8,marginTop:3}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>AM: {a.amM?a.amM.name.split(" ").pop():"?"} {gateIcon(a.amFloorOk)}</span><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>Rec: {a.recM?a.recM.name.split(" ").pop():"?"} {a.d.typ!=="FD"&&gateIcon(a.recFloorOk)}</span>{a.invoicePaid&&<span style={{fontSize:11,color:C.green,fontFamily:FM}}>Inv \u2713</span>}{!a.invoicePaid&&<span style={{fontSize:11,color:C.red,fontFamily:FM}}>Inv \u2717</span>}</div>
                  </div>
                </div>;})}
              </div></div>}
              {/* Blocked by Invoice */}
              {blockedByInvoice.length>0&&<div className="panel" style={{marginBottom:12}}><div className="panel-hdr"><h3 style={{color:C.teal}}>CLEARED — NEEDS INVOICE ({blockedByInvoice.length})</h3></div><div className="panel-body" style={{padding:10}}>
                {blockedByInvoice.map(function(a,i){var origIdx=dhData.indexOf(a.d);return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<blockedByInvoice.length-1?"1px solid "+C.border+"44":"none"}}>
                  <div><span style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:FM}}>{a.d.can}</span> <span style={{color:C.textDim}}>@ {a.d.cl}</span>
                    <div style={{display:"flex",gap:8,marginTop:2}}><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>AM: {a.amM?a.amM.name.split(" ").pop():"?"} {gateIcon(a.amFloorOk)}</span><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>Floor {gateIcon(a.floorOk)}</span><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>Guarantee {gateIcon(true)}</span><span style={{fontSize:11,color:C.red,fontFamily:FM}}>Invoice {gateIcon(false)}</span></div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:FM}}>{fmtD(a.d.raw)}</span>
                    <button onClick={function(e){e.stopPropagation();markInvPaid(origIdx);}} style={{padding:"3px 10px",fontSize:12,borderRadius:4,border:"1px solid "+C.teal,background:C.tealDim,color:C.teal,cursor:"pointer",fontFamily:FM,fontWeight:600}}>Mark Paid</button>
                  </div>
                </div>;})}
              </div></div>}
              {/* All Deals Table with 3-gate columns */}
              {dhData.length>0&&<div className="panel"><div className="panel-hdr"><h3>ALL DEALS — ELIGIBILITY ({dhData.length})</h3><div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>Click row to edit</span>
                <button onClick={function(){setConfirm({msg:"Delete ALL "+dhData.length+" DH deals? This cannot be undone.",fn:function(){var count=dhData.length;setDhData([]);sav(SK.dh,[]);setConfirm(null);log("DH_CLEAR_ALL",count+" deals removed");showToast(count+" DH deals deleted");}});}} style={{padding:"2px 8px",fontSize:11,borderRadius:3,border:"1px solid "+C.red+"66",color:C.red,background:"transparent",cursor:"pointer",fontFamily:FM}}>CLEAR ALL</button>
              </div></div><div className="panel-body" style={{padding:6,maxHeight:"35vh",overflowY:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={th}>Candidate</th><th style={th}>Client</th><th style={th}>AM</th><th style={th}>Rec</th><th style={Object.assign({},th,{textAlign:"center"})}>Tier</th><th style={Object.assign({},th,{textAlign:"center"})}>Guar</th><th style={Object.assign({},th,{textAlign:"center"})}>Inv</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th><th style={Object.assign({},th,{textAlign:"right"})}>Est Pay</th><th style={Object.assign({},th,{textAlign:"center"})}>Action</th></tr></thead>
                <tbody>{dealAnalysis.sort(function(a,b){if(a.fullyReady&&!b.fullyReady)return -1;if(!a.fullyReady&&b.fullyReady)return 1;return b.d.raw-a.d.raw;}).map(function(a,i){var origIdx=dhData.indexOf(a.d);var needsInv=a.floorOk&&a.guaranteeCleared&&!a.invoicePaid&&!a.d.paidOut&&a.d.st!=="t";
                  return <tr key={i} className="trow" style={{opacity:a.d.st==="t"||a.d.paidOut?.4:1,background:a.fullyReady?C.greenDim:"transparent",cursor:"pointer"}} onClick={function(){setDhEditIdx(origIdx);}}>
                    <td style={Object.assign({},td,{fontWeight:600})}>{a.d.can}</td>
                    <td style={Object.assign({},td,{color:C.textMuted,fontSize:12})}>{a.d.cl}</td>
                    <td style={Object.assign({},td,{fontSize:12,color:a.amFloorOk?C.green:a.amAbove?C.orange:C.red})}>{a.amM?a.amM.name.split(" ").pop():"?"}</td>
                    <td style={Object.assign({},td,{fontSize:12,color:a.d.typ==="FD"?C.textDim:a.recFloorOk?C.green:a.recAbove?C.orange:C.red})}>{a.d.typ==="FD"?"—":(a.recM?a.recM.name.split(" ").pop():"?")}</td>
                    <td style={Object.assign({},td,{textAlign:"center"})}>{gateIcon(a.floorOk)}</td>
                    <td style={Object.assign({},td,{textAlign:"center"})}>{a.d.st==="t"?<span style={{color:C.red}}>T</span>:a.daysLeft!==null&&a.daysLeft>0?<span style={{fontSize:11,color:C.orange,fontFamily:FM}}>{a.daysLeft}d</span>:gateIcon(a.guaranteeCleared)}</td>
                    <td style={Object.assign({},td,{textAlign:"center"})}>{gateIcon(a.invoicePaid)}</td>
                    <td style={Object.assign({},td,{textAlign:"right",fontWeight:600})}>{fmtD(a.d.raw)}</td>
                    <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:a.estPayout>0?C.green:C.textDim})}>{a.estPayout>0?fmtD(a.estPayout):"—"}</td>
                    <td style={Object.assign({},td,{textAlign:"center"})} onClick={function(e){e.stopPropagation();}}>{needsInv?<button onClick={function(){markInvPaid(origIdx);}} style={{padding:"2px 6px",fontSize:11,borderRadius:3,border:"1px solid "+C.teal,background:C.tealDim,color:C.teal,cursor:"pointer",fontFamily:FM,fontWeight:600}}>Inv</button>:a.fullyReady?<span style={{fontSize:11,color:C.green,fontFamily:FM,fontWeight:600}}>Pay →</span>:""}{!a.d.paidOut&&<button onClick={function(){deleteDH(origIdx);}} style={{padding:"1px 4px",fontSize:12,border:"none",background:"transparent",color:C.red+"88",cursor:"pointer",fontWeight:700,marginLeft:2}} title="Delete">×</button>}</td>
                  </tr>;})}</tbody>
                </table>
              </div></div>}
            </div>;
          }()}
                  </div>}

        {view==="payroll"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,flexWrap:"wrap",gap:6}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Payroll Processing</h2>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <select value={payrollWeekId||""} onChange={function(e){setPayrollWeekId(+e.target.value||null);setExpandedRow(null);}} style={{padding:"3px 6px",fontSize:14,borderRadius:3,fontFamily:FM}}><option value="">Select charge week...</option>{chargeWeeks.map(function(w){return <option key={w.id} value={w.id}>{lockedWeeks.includes(w.weekEnding)?"🔒 ":""}{"WE "+w.weekEnding}</option>;})}</select>
              {payrollData.length>0&&<button onClick={function(){
                var headers=["Name","Unit","Contract Comm","DH Payouts","Total","Override"];
                var data=payrollData.map(function(r){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;var hasOv=payrollOverrides[key]!==undefined;return[r.name,r.unit,r.contractComm.toFixed(2),r.dhTotal.toFixed(2),hasOv?payrollOverrides[key].toFixed(2):r.total.toFixed(2),hasOv?"Yes":""];});
                dlCSV("Payroll_"+(payrollWeek?payrollWeek.weekEnding:"export")+".csv",headers,data);
                log("PAYROLL_EXPORT","WE "+(payrollWeek?payrollWeek.weekEnding:""));showToast("Payroll exported");
              }} className="btn-ghost" style={{padding:"3px 8px",borderRadius:3,fontSize:13,cursor:"pointer",fontFamily:FM}}>EXPORT CSV</button>}
              {payrollData.length>0&&<button onClick={function(){setStmtMember("ALL");}} className="btn-ghost" style={{padding:"3px 8px",borderRadius:3,fontSize:13,cursor:"pointer",fontFamily:FM,background:C.accent+"22",borderColor:C.accent}}>GENERATE STATEMENTS</button>}
            </div>
          </div>
          {payrollData.length>0&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              <Stat l="Members" v={payrollData.filter(function(r){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;return r.total>0||(payrollOverrides[key]!==undefined&&payrollOverrides[key]>0);}).length} glow/>
              <Stat l="Contract Comm" v={fmtD(payrollData.reduce(function(a,r){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;if(payrollOverrides[key]!==undefined)return a+(payrollOverrides[key]-r.dhTotal);return a+r.contractComm;},0))} c={C.blue} glow/>
              <Stat l="DH Payouts" v={fmtD(payrollData.reduce(function(a,r){return a+r.dhTotal;},0))} c={C.green} s={readyDH.filter(function(d){return payrollDHSelected[d.idx];}).length+" of "+readyDH.length+" deals"} glow/>
              <Stat l="Total Payroll" v={fmtD(payrollData.reduce(function(a,r){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;return a+(payrollOverrides[key]!==undefined?payrollOverrides[key]:r.total);},0))} c={C.accent} glow/>
            </div>
            {/* DH Selection Panel */}
            {readyDH.length>0&&<div className="panel" style={{marginBottom:14}}><div className="panel-hdr"><h3 style={{color:C.green}}>DH DEALS READY TO PAY ({readyDH.length})</h3><div style={{display:"flex",gap:4}}>
              <button onClick={function(){var sel={};readyDH.forEach(function(d){sel[d.idx]=true;});setPayrollDHSelected(sel);}} className="btn-ghost" style={{padding:"3px 8px",borderRadius:3,fontSize:12,cursor:"pointer",fontFamily:FM}}>SELECT ALL</button>
              <button onClick={function(){setPayrollDHSelected({});}} className="btn-ghost" style={{padding:"3px 8px",borderRadius:3,fontSize:12,cursor:"pointer",fontFamily:FM}}>CLEAR ALL</button>
            </div></div><div className="panel-body" style={{padding:8,maxHeight:"22vh",overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={Object.assign({},th,{width:30})}></th><th style={th}>Candidate</th><th style={th}>Client</th><th style={th}>AM / Rec</th><th style={th}>Type</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th><th style={th}>Eligible</th></tr></thead>
              <tbody>{readyDH.map(function(d){
                var isSelected=!!payrollDHSelected[d.idx];
                // Check DH eligibility based on floor crossing
                var amM=d.amId?members.find(function(m){return m.id===d.amId;}):findM(d.am,members);
                var recM=d.recId?members.find(function(m){return m.id===d.recId;}):findM(d.rec,members);
                var amFI=null,recFI=null;
                if(payrollWeek&&amM){var amRow=payrollWeek.rows.find(function(r){return r.matchedId===amM.id;});if(amRow)amFI=getFloorInfo(amRow,payrollWeek);}
                if(payrollWeek&&recM){var recRow=payrollWeek.rows.find(function(r){return r.matchedId===recM.id;});if(recRow)recFI=getFloorInfo(recRow,payrollWeek);}
                var amElig=amFI&&amFI.dhEligible&&(!amFI.crossDate||!d.sd||d.sd>=amFI.crossDate);
                var recElig=recFI&&recFI.dhEligible&&(!recFI.crossDate||!d.sd||d.sd>=recFI.crossDate);
                var anyElig=d.typ==="FD"?amElig:(amElig||recElig);
                return <tr key={d.idx} className="trow" style={{opacity:isSelected?1:0.5,background:isSelected?C.greenDim:"transparent"}}>
                  <td style={Object.assign({},td,{textAlign:"center"})}><input type="checkbox" checked={isSelected} onChange={function(){setPayrollDHSelected(function(prev){var n=Object.assign({},prev);if(n[d.idx])delete n[d.idx];else n[d.idx]=true;return n;});}} style={{cursor:"pointer",width:16,height:16}}/></td>
                  <td style={Object.assign({},td,{fontWeight:600})}>{d.can}</td>
                  <td style={Object.assign({},td,{color:C.textMuted})}>{d.cl}</td>
                  <td style={Object.assign({},td,{fontSize:12,color:C.textMuted})}>{d.am}{d.typ!=="FD"?" / "+d.rec:""}</td>
                  <td style={td}><Badge v={d.typ==="FD"?"gold":"muted"}>{d.typ==="FD"?"FD":"Split"}</Badge></td>
                  <td style={Object.assign({},td,{textAlign:"right",fontWeight:600})}>{fmtD(d.raw)}</td>
                  <td style={td}>{anyElig?<Badge v="green">YES</Badge>:<Badge v="red">Below floor</Badge>}</td>
                </tr>;})}</tbody></table>
            </div></div>}
            {/* Process Button */}
            {readyDH.filter(function(d){return payrollDHSelected[d.idx];}).length>0&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:10,gap:6}}>
              <button onClick={function(){
                var selected=readyDH.filter(function(d){return payrollDHSelected[d.idx];});
                var we=payrollWeek?payrollWeek.weekEnding:new Date().toISOString().slice(0,10);
                setDhData(function(prev){
                  var n=prev.slice();
                  selected.forEach(function(d){
                    n[d.idx]=Object.assign({},n[d.idx],{paidOut:true,paidDate:new Date().toISOString().slice(0,10),payrollWE:we,st:"d"});
                  });
                  return n;
                });
                log("PAYROLL_DH_PROCESSED",selected.length+" DH deals marked paid for WE "+we);
                setPayrollDHSelected({});
                showToast(selected.length+" DH deals marked paid");
              }} className="btn-primary" style={{padding:"8px 16px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM,fontWeight:700}}>PROCESS {readyDH.filter(function(d){return payrollDHSelected[d.idx];}).length} DH DEALS & MARK PAID</button>
            </div>}
            {/* Lock Payroll */}
            {payrollWeek&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:8,gap:6}}>
              {lockedWeeks.includes(payrollWeek.weekEnding)?<div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:C.greenDim,border:"1px solid "+C.green+"33",borderRadius:4}}><span style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:FM}}>🔒 PAYROLL LOCKED — WE {payrollWeek.weekEnding}</span></div>
              :<button onClick={function(){setConfirm({msg:"Lock payroll for WE "+payrollWeek.weekEnding+"?\n\nThis prevents the charge week from being deleted or overwritten. You can unlock from Admin Settings.",fn:function(){setLockedWeeks(function(p){return p.concat([payrollWeek.weekEnding]);});setConfirm(null);log("PAYROLL_LOCKED","WE "+payrollWeek.weekEnding);showToast("Payroll locked for WE "+payrollWeek.weekEnding);}});}} className="btn-ghost" style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,fontWeight:600}}>🔒 LOCK PAYROLL</button>}
            </div>}
            <p style={{fontSize:12,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>CLICK ROW TO EXPAND BREAKDOWN</p>
            <div style={Object.assign({},card,{overflow:"auto",maxHeight:"55vh"})}>
              <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
                <th style={th}>Member</th><th style={th}>Unit</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.blue})}>Contract</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.green})}>DH Payouts</th>
                <th style={Object.assign({},th,{textAlign:"right",color:C.accent})}>Total</th>
              </tr></thead>
              <tbody>{payrollData.filter(function(r){return r.total>0||r.contractComm>0;}).map(function(r,i){return [<tr key={i} className="trow" onClick={function(){setExpandedRow(expandedRow===i?null:i);}} style={{cursor:"pointer"}}>
                <td style={Object.assign({},td,{fontWeight:600,fontFamily:FU,borderLeft:"2px solid "+(r.dhTotal>0?C.green:r.contractComm>0?C.blue:C.border),paddingLeft:10})}>{expandedRow===i?"\u25BC ":""}{r.name}</td>
                <td style={td}>{r.unit&&<Badge v={UB[r.unit]||"muted"}>{r.unit}</Badge>}</td>
                <td style={Object.assign({},td,{textAlign:"right",color:r.contractComm>0?C.blue:C.textDim})}>{function(){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;if(payrollOverrides[key]!==undefined){var adj=payrollOverrides[key]-r.dhTotal;return <span style={{color:C.orange}}>{fmtD(adj)}</span>;}return r.contractComm>0?fmtD(r.contractComm):"\u2014";}()}</td>
                <td style={Object.assign({},td,{textAlign:"right",color:r.dhTotal>0?C.green:C.textDim})}>{r.dhTotal>0?fmtD(r.dhTotal):"\u2014"}</td>
                <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,fontSize:15,color:C.accent})} onClick={function(e){e.stopPropagation();var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;setEditingPayout(key);setEditPayoutVal(payrollOverrides[key]!==undefined?String(payrollOverrides[key]):String(Math.round(r.total*100)/100));}}>{function(){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;var hasOverride=payrollOverrides[key]!==undefined;
                  if(editingPayout===key)return <input type="number" step="0.01" value={editPayoutVal} onChange={function(e){setEditPayoutVal(e.target.value);}} onBlur={function(){var val=parseFloat(editPayoutVal);if(!isNaN(val)){var we2=payrollWeek?payrollWeek.weekEnding:"";var k2=r.name+"|"+we2;setPayrollOverrides(function(p){var n=Object.assign({},p);n[k2]=val;return n;});log("PAYOUT_OVERRIDE",r.name+" WE "+we2+" → "+fmtD(val));}setEditingPayout(null);}} onKeyDown={function(e){if(e.key==="Enter")e.target.blur();if(e.key==="Escape"){setEditingPayout(null);}}} autoFocus style={{width:90,padding:"2px 4px",fontSize:14,textAlign:"right",borderRadius:3,fontFamily:FM,fontWeight:700,border:"2px solid "+C.accent,background:C.bgInput,color:C.accent}}/>;
                  return <span style={{cursor:"pointer",borderBottom:"1px dashed "+(hasOverride?C.orange:C.accent)+"66"}} title="Click to override">{hasOverride?fmtD(payrollOverrides[key]):fmtD(r.total)}{hasOverride&&<span style={{fontSize:9,color:C.orange,marginLeft:3,verticalAlign:"super"}}>✎</span>}</span>;
                }()}</td>
              </tr>,
              expandedRow===i&&<tr key={i+"_x"}><td colSpan={5} style={{padding:0,background:"linear-gradient(135deg,"+C.bgSurface+" 0%,"+C.bg2+" 100%)",borderBottom:"2px solid "+C.accent}}><div style={{padding:"10px 14px"}}>
                {r.steps&&r.steps.length>0&&<div style={{marginBottom:r.dhPayouts.length?10:0}}><p style={{fontSize:12,fontWeight:700,color:C.blue,margin:"0 0 5px",fontFamily:FM,letterSpacing:"1px"}}>CONTRACT COMMISSIONS · Rate: {r.rate}</p>
                  {r.steps.map(function(s,si){return <div key={si} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:si<r.steps.length-1?"1px solid "+C.border+"44":"none"}}><div><span style={{fontSize:14,fontWeight:700,color:s.t.includes("Rec")?C.blue:s.t.includes("AM")?C.purple:C.accent,fontFamily:FM}}>{s.t}</span><span style={{fontSize:13,color:C.textMuted,marginLeft:8,fontFamily:FM}}>{s.d}</span></div><span style={{fontSize:14,fontFamily:FM,fontWeight:700,color:C.blue}}>{fmtD(s.a)}</span></div>;})}
                </div>}
                {r.dhPayouts.length>0&&<div><p style={{fontSize:12,fontWeight:700,color:C.green,margin:"0 0 5px",fontFamily:FM,letterSpacing:"1px"}}>DH PAYOUTS ({r.dhPayouts.length})</p>
                  {r.dhPayouts.map(function(d,di){return <div key={di} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:di<r.dhPayouts.length-1?"1px solid "+C.border+"44":"none"}}><div><span style={{fontSize:14,fontWeight:700,color:C.accent,fontFamily:FM}}>{d.can}</span><span style={{fontSize:13,color:C.textDim,marginLeft:6,fontFamily:FM}}>{d.cl}</span><Badge v={d.typ==="FD"?"gold":"muted"}>{d.typ}</Badge></div><div style={{textAlign:"right"}}><span style={{fontSize:13,color:C.textMuted,fontFamily:FM}}>{fmt(d.raw)+" \u00D7 "+(d.rate*100)+"%"}</span><span style={{fontSize:14,fontFamily:FM,fontWeight:700,color:C.green,marginLeft:8}}>{fmtD(d.payout)}</span></div></div>;})}
                </div>}
                <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8,marginTop:6,paddingTop:6,borderTop:"1px solid "+C.border}}>
                  {function(){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;var hasOverride=payrollOverrides[key]!==undefined;
                    return <>{hasOverride&&<button onClick={function(e){e.stopPropagation();setPayrollOverrides(function(p){var n=Object.assign({},p);delete n[key];return n;});log("PAYOUT_OVERRIDE_CLEAR",r.name+" WE "+we);showToast("Override cleared for "+r.name);}} style={{padding:"2px 6px",fontSize:10,borderRadius:3,border:"1px solid "+C.orange+"44",color:C.orange,background:"transparent",cursor:"pointer",fontFamily:FM}}>Clear Override</button>}
                      {hasOverride&&<span style={{fontSize:12,color:C.textDim,fontFamily:FM,textDecoration:"line-through"}}>{fmtD(r.total)}</span>}
                      <span style={{fontSize:15,fontFamily:FM,fontWeight:700,color:hasOverride?C.orange:C.accent}}>TOTAL: {hasOverride?fmtD(payrollOverrides[key]):fmtD(r.total)}</span></>;
                  }()}
                </div>
              </div></td></tr>];})}</tbody>
              <tfoot><tr style={{background:C.bg2}}><td colSpan={2} style={Object.assign({},td,{fontWeight:700,textAlign:"right",color:C.textDim})}>TOTALS</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.blue})}>{fmtD(payrollData.reduce(function(a,r){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;if(payrollOverrides[key]!==undefined)return a+(payrollOverrides[key]-r.dhTotal);return a+r.contractComm;},0))}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.green})}>{fmtD(payrollData.reduce(function(a,r){return a+r.dhTotal;},0))}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,fontSize:18,color:C.accent})}>{fmtD(payrollData.reduce(function(a,r){var we=payrollWeek?payrollWeek.weekEnding:"";var key=r.name+"|"+we;return a+(payrollOverrides[key]!==undefined?payrollOverrides[key]:r.total);},0))}</td></tr></tfoot>
            </table></div>
            {/* Manual Payout Section */}
            <div className="panel" style={{marginTop:12}}><div className="panel-hdr"><h3>MANUAL PAYOUTS</h3><button onClick={function(){setManualPayoutOpen(!manualPayoutOpen);}} className="btn-ghost" style={{padding:"3px 8px",borderRadius:3,fontSize:12,cursor:"pointer",fontFamily:FM}}>{manualPayoutOpen?"CANCEL":"+ ADD MANUAL PAYOUT"}</button></div>
            {manualPayoutOpen&&<div className="panel-body" style={{padding:12}}>
              <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Add a one-time payout (bonus, adjustment, etc.) that will be tracked on the team member's card.</p>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 2fr auto",gap:8,alignItems:"end"}}>
                <div><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM}}>TEAM MEMBER</label><select value={manualPayoutMember} onChange={function(e){setManualPayoutMember(e.target.value);}} style={{width:"100%",padding:"6px 8px",fontSize:13,borderRadius:4,fontFamily:FM,background:C.bgInput,color:C.text,border:"1px solid "+C.border}}><option value="">Select...</option>{members.filter(function(m){return!m.inactive;}).sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}</select></div>
                <div><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM}}>AMOUNT</label><div style={{display:"flex",alignItems:"center",gap:2}}><span style={{color:C.textDim}}>$</span><input type="number" step="0.01" value={manualPayoutAmount} onChange={function(e){setManualPayoutAmount(e.target.value);}} placeholder="0.00" style={{width:"100%",padding:"6px 8px",fontSize:13,borderRadius:4,fontFamily:FM,background:C.bgInput,color:C.text,border:"1px solid "+C.border}}/></div></div>
                <div><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM}}>REASON</label><input value={manualPayoutReason} onChange={function(e){setManualPayoutReason(e.target.value);}} placeholder="Bonus, adjustment, etc." style={{width:"100%",padding:"6px 8px",fontSize:13,borderRadius:4,fontFamily:FM,background:C.bgInput,color:C.text,border:"1px solid "+C.border}}/></div>
                <button onClick={function(){if(!manualPayoutMember||!manualPayoutAmount){showToast("Select a member and enter an amount","err");return;}var amt=parseFloat(manualPayoutAmount);if(isNaN(amt)||amt===0){showToast("Enter a valid amount","err");return;}var m=members.find(function(x){return String(x.id)===String(manualPayoutMember);});var we=payrollWeek?payrollWeek.weekEnding:"";var payout={memberId:manualPayoutMember,memberName:m?m.name:"",amount:amt,reason:manualPayoutReason,weekEnding:we,addedAt:new Date().toISOString(),addedBy:userEmail};setPayrollOverrides(function(prev){var n=Object.assign({},prev);n._manualPayouts=(n._manualPayouts||[]).concat(payout);return n;});log("MANUAL_PAYOUT",(m?m.name:"")+" "+fmtD(amt)+" WE "+we+" — "+manualPayoutReason);showToast("Manual payout of "+fmtD(amt)+" added for "+(m?m.name:""));setManualPayoutMember("");setManualPayoutAmount("");setManualPayoutReason("");setManualPayoutOpen(false);}} className="btn-primary" style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,fontWeight:700,whiteSpace:"nowrap",height:34}}>ADD</button>
              </div>
            </div>}
            {function(){var we=payrollWeek?payrollWeek.weekEnding:"";var weekPayouts=(payrollOverrides._manualPayouts||[]).filter(function(p){return p.weekEnding===we;});if(weekPayouts.length===0)return null;return <div className="panel-body" style={{padding:"6px 12px",borderTop:"1px solid "+C.border}}><p style={{fontSize:11,fontWeight:700,color:C.textDim,margin:"0 0 4px",fontFamily:FM}}>MANUAL PAYOUTS THIS WEEK ({weekPayouts.length})</p>{weekPayouts.map(function(p,pi){return <div key={pi} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",borderBottom:pi<weekPayouts.length-1?"1px solid "+C.border+"33":"none"}}><span style={{fontSize:13,fontFamily:FM,color:C.text}}>{p.memberName} — <span style={{color:C.textMuted,fontSize:12}}>{p.reason||"Manual"}</span></span><span style={{fontSize:14,fontWeight:700,color:C.accent,fontFamily:FM}}>{fmtD(p.amount)}</span></div>;})}</div>;}()}
            </div>
          </div>}
          {!payrollWeekId&&chargeWeeks.length>0&&<div style={Object.assign({},card,{padding:20,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM,margin:0}}>Select a charge week above to calculate payroll</p>{readyDH.length>0&&<p style={{color:C.green,fontSize:14,fontFamily:FM,margin:"6px 0 0",textShadow:"0 0 6px "+C.greenGlow}}>{readyDH.length} DH ready to pay · {fmt(readyDH.reduce(function(a,d){return a+d.raw;},0))} raw</p>}</div>}
          {chargeWeeks.length===0&&<div style={Object.assign({},card,{padding:20,textAlign:"center"})}><p style={{color:C.textDim,fontSize:15,fontFamily:FM,margin:0}}>Import charge weeks first to process payroll</p></div>}
        </div>}
        {/* ════════ FLOOR GUARANTEE TRACKER ════════ */}
        {view==="floor"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Floor Guarantee Tracker</h2>
              <p style={{fontSize:13,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>Floor payment vs. comp plan commission — week over week</p>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {chargeWeeks.length>0&&function(){
                var floorMembers=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0;});
                if(!floorMembers.length)return null;
                return <select value={cmdDrill||""} onChange={function(e){setCmdDrill(e.target.value||null);}} style={{padding:"5px 10px",fontSize:14,borderRadius:6,fontFamily:FM}}>
                  <option value="">All Floor Members ({floorMembers.length})</option>
                  {floorMembers.map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}
                </select>;
              }()}
            </div>
          </div>
          {function(){
            var floorMembers=members.filter(function(m){return m.guarantee&&m.guarantee.active&&m.guarantee.amount>0;});
            if(!floorMembers.length)return <div style={Object.assign({},card,{padding:30,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM,margin:0}}>No team members on a floor guarantee. Activate a floor on Team → Member Dashboard to start tracking.</p></div>;
            if(!chargeWeeks.length)return <div style={Object.assign({},card,{padding:30,textAlign:"center"})}><p style={{color:C.textMuted,fontSize:15,fontFamily:FM,margin:0}}>Import charge weeks first — floor tracking requires charge data to calculate comp plan commission.</p></div>;
            var sortedWeeksAll=chargeWeeks.slice().sort(function(a,b){return new Date(a.weekEnding)-new Date(b.weekEnding);});
            var analyses=floorMembers.map(function(m){
              var weekDetails=[];var cumFloorPaid=0;var cumCompPlan=0;
              sortedWeeksAll.forEach(function(w){
                var row=w.rows.find(function(r){return r.matchedId===m.id;});
                if(!row)return;
                var floorThisWeek=m.guarantee.amount;
                cumFloorPaid+=floorThisWeek;
                var fi=getFloorInfo(row,w);
                var rawTotal=row.rawCharge;var pureSR=row.splitRec;
                var pureAM=Math.max(0,row.splitAM-row.fullDesk);var pureFD=row.fullDesk;
                var r=m.rates;var compComm=0;
                if(r.flat>0){compComm=rawTotal*r.flat;}
                else if(fi.belowFloor){
                  if(rawTotal<FLOOR_WEEKLY_DEDUCT){compComm=0;}
                  else{var commissionable=rawTotal-FLOOR_WEEKLY_DEDUCT;var ratio=rawTotal>0?commissionable/rawTotal:0;compComm=(pureSR*ratio)*r.sA+(pureAM*ratio)*r.sA+(pureFD*ratio)*r.fdA;}
                }else if(fi.crossing){
                  var belowP=fi.belowPortion;var aboveP=fi.abovePortion;
                  var belowRatio=rawTotal>0?belowP/rawTotal:0;var aboveRatio=rawTotal>0?aboveP/rawTotal:0;
                  var belowComm=0;
                  if(belowP>=FLOOR_WEEKLY_DEDUCT){var bc=belowP-FLOOR_WEEKLY_DEDUCT;var bR=belowP>0?bc/belowP:0;belowComm=(pureSR*belowRatio*bR+pureAM*belowRatio*bR)*r.sA+pureFD*belowRatio*bR*r.fdA;}
                  var aboveComm=(pureSR*aboveRatio)*r.sA+(pureAM*aboveRatio)*r.sA+(pureFD*aboveRatio)*r.fdA;
                  compComm=belowComm+aboveComm;
                }else{compComm=pureSR*r.sA+pureAM*r.sA+pureFD*r.fdA;}
                cumCompPlan+=compComm;
                weekDetails.push({we:w.weekEnding,rawCharge:rawTotal,splitRec:pureSR,splitAM:row.splitAM,fullDesk:pureFD,ytdRaw:row.ytdRaw,qtd:fi.qtd||0,belowFloor:fi.belowFloor,crossing:fi.crossing,floorPaid:floorThisWeek,compPlanComm:compComm,delta:floorThisWeek-compComm,cumFloor:cumFloorPaid,cumCompPlan:cumCompPlan,cumDelta:cumFloorPaid-cumCompPlan});
              });
              var weeksLoaded=weekDetails.length;var avgCompPerWeek=weeksLoaded>0?cumCompPlan/weeksLoaded:0;var avgFloorPerWeek=m.guarantee.amount;
              var totalBudget=0;
              if(m.guarantee.endDate){var s2=new Date(m.guarantee.startDate||"2026-01-01");var e2=new Date(m.guarantee.endDate);totalBudget=Math.max(1,Math.ceil((e2-s2)/(7*24*60*60*1000)))*avgFloorPerWeek;}
              else{totalBudget=52*avgFloorPerWeek;}
              var remaining=totalBudget-cumFloorPaid;
              var weeksRemaining=m.guarantee.endDate?Math.max(0,Math.ceil((new Date(m.guarantee.endDate)-NOW)/(7*24*60*60*1000))):null;
              var projectedTotalComp=weeksRemaining!==null?cumCompPlan+(avgCompPerWeek*weeksRemaining):null;
              var projectedTotalFloor=weeksRemaining!==null?cumFloorPaid+(avgFloorPerWeek*weeksRemaining):null;
              var willExceed=projectedTotalComp!==null&&projectedTotalFloor!==null&&projectedTotalComp>=projectedTotalFloor;
              var recentAvg=weekDetails.length>=4?weekDetails.slice(-4).reduce(function(a2,w2){return a2+w2.compPlanComm;},0)/4:avgCompPerWeek;
              var earlyAvg=weekDetails.length>=4?weekDetails.slice(0,Math.min(4,weekDetails.length)).reduce(function(a2,w2){return a2+w2.compPlanComm;},0)/Math.min(4,weekDetails.length):avgCompPerWeek;
              var trending=recentAvg>earlyAvg*1.05?"up":recentAvg<earlyAvg*0.95?"down":"flat";
              return{member:m,weeks:weekDetails,weeksLoaded:weeksLoaded,cumFloorPaid:cumFloorPaid,cumCompPlan:cumCompPlan,cumDelta:cumFloorPaid-cumCompPlan,avgCompPerWeek:avgCompPerWeek,avgFloorPerWeek:avgFloorPerWeek,totalBudget:totalBudget,remaining:remaining,weeksRemaining:weeksRemaining,projectedTotalComp:projectedTotalComp,projectedTotalFloor:projectedTotalFloor,willExceed:willExceed,trending:trending,recentAvg:recentAvg,earlyAvg:earlyAvg};
            });
            var filtered2=cmdDrill?analyses.filter(function(a2){return String(a2.member.id)===String(cmdDrill);}):analyses;
            var totalFloorPaid=analyses.reduce(function(a2,x){return a2+x.cumFloorPaid;},0);
            var totalCompPlan=analyses.reduce(function(a2,x){return a2+x.cumCompPlan;},0);
            var totalBudgetAll=analyses.reduce(function(a2,x){return a2+x.totalBudget;},0);
            var totalDelta=totalFloorPaid-totalCompPlan;
            return <div>
              {/* Global KPIs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
                <Stat l="Floor Members" v={analyses.length} c={C.accent} s={analyses.filter(function(a2){return a2.willExceed;}).length+" on track to exceed"}/>
                <Stat l="Total Floor Paid YTD" v={fmtD(totalFloorPaid)} c={C.orange}/>
                <Stat l="Comp Plan Would Be" v={fmtD(totalCompPlan)} c={C.blue} s="without floor guarantee"/>
                <Stat l="Floor Cost (Overpay)" v={fmtD(totalDelta)} c={totalDelta>0?C.red:C.green} s={totalDelta>0?"Floor costs "+fmtD(totalDelta)+" more":"Comp exceeds floor"}/>
                <Stat l="Total Floor Budget" v={fmtD(totalBudgetAll)} c={C.textMuted} s={fmtD(totalBudgetAll-totalFloorPaid)+" remaining"}/>
              </div>
              {/* Per-Member Cards */}
              {filtered2.map(function(a2){
                var m=a2.member;
                var pctUsed=a2.totalBudget>0?Math.round(a2.cumFloorPaid/a2.totalBudget*100):0;
                var compVsFloorPct=a2.cumFloorPaid>0?Math.round(a2.cumCompPlan/a2.cumFloorPaid*100):0;
                return <div key={m.id} className="panel" style={{marginBottom:14}}>
                  <div className="panel-hdr" style={{borderBottom:"2px solid "+(a2.willExceed?C.green:a2.trending==="up"?C.orange:C.red)+"33",cursor:"pointer"}} onClick={function(){setExpandedRow(expandedRow===m.id?null:m.id);}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <h3 style={{color:C.text,fontSize:16,fontWeight:700,fontFamily:FU,textTransform:"none",letterSpacing:0}}>{expandedRow===m.id?"\u25BC":"\u25B6"} {m.name}</h3>
                      <Badge v={UB[m.unit]||"muted"}>{m.unit}</Badge>
                      <Badge v={a2.trending==="up"?"green":a2.trending==="down"?"red":"muted"}>{a2.trending==="up"?"\u25B2 Up":a2.trending==="down"?"\u25BC Down":"— Flat"}</Badge>
                      {a2.willExceed&&<Badge v="green">On Track to Exceed</Badge>}
                      {!a2.willExceed&&a2.weeksRemaining!==null&&<Badge v="red">Floor Exceeds Comp</Badge>}
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.orange,fontFamily:FM}}>Floor: {fmtD(m.guarantee.amount)}/wk</span>
                      <span style={{fontSize:13,fontWeight:700,color:C.blue,fontFamily:FM}}>Comp: {fmtD(a2.avgCompPerWeek)}/wk avg</span>
                      <span style={{fontSize:14,fontWeight:800,color:a2.cumDelta>0?C.red:C.green,fontFamily:FM}}>{a2.cumDelta>0?"+":""}{fmtD(a2.cumDelta)}</span>
                    </div>
                  </div>
                  {expandedRow===m.id&&<div className="panel-body" style={{padding:14}}>
                    {/* KPI Row */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:14}}>
                      <div style={{padding:"10px 12px",background:C.orangeDim,borderRadius:6,border:"1px solid "+C.orange+"33"}}>
                        <p style={{fontSize:10,color:C.orange,margin:"0 0 2px",fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>FLOOR PAID YTD</p>
                        <p style={{fontSize:20,fontWeight:800,color:C.orange,margin:0,fontFamily:FM}}>{fmtD(a2.cumFloorPaid)}</p>
                      </div>
                      <div style={{padding:"10px 12px",background:C.blueDim,borderRadius:6,border:"1px solid "+C.blue+"33"}}>
                        <p style={{fontSize:10,color:C.blue,margin:"0 0 2px",fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>COMP PLAN WOULD BE</p>
                        <p style={{fontSize:20,fontWeight:800,color:C.blue,margin:0,fontFamily:FM}}>{fmtD(a2.cumCompPlan)}</p>
                      </div>
                      <div style={{padding:"10px 12px",background:a2.cumDelta>0?C.redDim:C.greenDim,borderRadius:6,border:"1px solid "+(a2.cumDelta>0?C.red:C.green)+"33"}}>
                        <p style={{fontSize:10,color:a2.cumDelta>0?C.red:C.green,margin:"0 0 2px",fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>FLOOR VS COMP</p>
                        <p style={{fontSize:20,fontWeight:800,color:a2.cumDelta>0?C.red:C.green,margin:0,fontFamily:FM}}>{a2.cumDelta>0?"+":""}{fmtD(a2.cumDelta)}</p>
                        <p style={{fontSize:11,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>{a2.cumDelta>0?"Floor costs more":"Comp exceeds floor"}</p>
                      </div>
                      <div style={{padding:"10px 12px",background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
                        <p style={{fontSize:10,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>COMP % OF FLOOR</p>
                        <p style={{fontSize:20,fontWeight:800,color:compVsFloorPct>=100?C.green:compVsFloorPct>=75?C.orange:C.red,margin:0,fontFamily:FM}}>{compVsFloorPct}%</p>
                        <p style={{fontSize:11,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>{compVsFloorPct>=100?"Self-sustaining":"Gap: "+fmtD(a2.cumFloorPaid-a2.cumCompPlan)}</p>
                      </div>
                      <div style={{padding:"10px 12px",background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
                        <p style={{fontSize:10,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>AVG COMP/WEEK</p>
                        <p style={{fontSize:20,fontWeight:800,color:C.text,margin:0,fontFamily:FM}}>{fmtD(a2.avgCompPerWeek)}</p>
                        <p style={{fontSize:11,color:a2.recentAvg>a2.earlyAvg?C.green:C.red,margin:"2px 0 0",fontFamily:FM}}>Recent 4wk: {fmtD(a2.recentAvg)}</p>
                      </div>
                      <div style={{padding:"10px 12px",background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
                        <p style={{fontSize:10,color:C.textDim,margin:"0 0 2px",fontWeight:700,fontFamily:FM,letterSpacing:".5px"}}>BUDGET REMAINING</p>
                        <p style={{fontSize:20,fontWeight:800,color:C.accent,margin:0,fontFamily:FM}}>{fmtD(a2.remaining)}</p>
                        <p style={{fontSize:11,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>{pctUsed}% of {fmtD(a2.totalBudget)} used</p>
                      </div>
                    </div>
                    {/* Budget Progress Bar */}
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.textMuted,fontFamily:FM}}>Floor Budget: {fmtD(a2.cumFloorPaid)} / {fmtD(a2.totalBudget)}</span>
                        <span style={{fontSize:12,color:C.textMuted,fontFamily:FM}}>{a2.weeksRemaining!==null?a2.weeksRemaining+" wks remaining":""}{m.guarantee.endDate?" · ends "+m.guarantee.endDate:""}</span>
                      </div>
                      <div style={{height:12,background:C.bg,borderRadius:6,overflow:"hidden",position:"relative"}}>
                        <div style={{position:"absolute",top:0,height:"100%",width:Math.min(100,pctUsed)+"%",background:"linear-gradient(90deg,"+C.orange+"cc,"+C.red+"cc)",borderRadius:6,transition:"width .5s ease"}}/>
                        <div style={{position:"absolute",top:0,height:"100%",width:Math.min(100,a2.totalBudget>0?Math.round(a2.cumCompPlan/a2.totalBudget*100):0)+"%",background:C.blue+"55",borderRadius:6}}/>
                      </div>
                      <div style={{display:"flex",gap:16,marginTop:4}}>
                        <span style={{fontSize:11,color:C.orange,fontFamily:FM}}>{"\u25A0"} Floor Paid ({pctUsed}%)</span>
                        <span style={{fontSize:11,color:C.blue,fontFamily:FM}}>{"\u25A0"} Comp Plan ({a2.totalBudget>0?Math.round(a2.cumCompPlan/a2.totalBudget*100):0}%)</span>
                      </div>
                    </div>
                    {/* Cumulative Chart */}
                    {a2.weeks.length>=2&&<div style={{marginBottom:14}}>
                      <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 8px",fontFamily:FM,letterSpacing:".5px"}}>CUMULATIVE — FLOOR PAID VS. COMP PLAN COMMISSION</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={a2.weeks.map(function(w2){return{we:w2.we,floor:Math.round(w2.cumFloor*100)/100,comp:Math.round(w2.cumCompPlan*100)/100,wFloor:Math.round(w2.floorPaid*100)/100,wComp:Math.round(w2.compPlanComm*100)/100};})} margin={{left:10,right:10,top:5,bottom:0}}>
                          <defs>
                            <linearGradient id={"fg"+m.id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.orange} stopOpacity={0.35}/><stop offset="100%" stopColor={C.orange} stopOpacity={0.02}/></linearGradient>
                            <linearGradient id={"cg"+m.id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity={0.35}/><stop offset="100%" stopColor={C.blue} stopOpacity={0.02}/></linearGradient>
                          </defs>
                          <XAxis dataKey="we" fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false}/>
                          <YAxis fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false} tickFormatter={function(v){return"$"+Math.round(v/1000)+"K";}}/>
                          <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload[0])return null;var d=p.payload[0].payload;return <div style={{background:C.bgCard,border:"1px solid "+C.border,borderRadius:6,padding:"8px 12px",fontFamily:FM,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,.5)"}}><p style={{margin:0,color:C.textDim,fontSize:12}}>WE {d.we}</p><p style={{margin:"3px 0",color:C.orange,fontWeight:700}}>Floor: {fmtD(d.wFloor)} (Cum: {fmtD(d.floor)})</p><p style={{margin:"0 0 3px",color:C.blue,fontWeight:700}}>Comp: {fmtD(d.wComp)} (Cum: {fmtD(d.comp)})</p><p style={{margin:0,color:d.floor>d.comp?C.red:C.green,fontWeight:600}}>Gap: {d.floor>d.comp?"+":""}{fmtD(d.floor-d.comp)}</p></div>;}}/>
                          <Area type="monotone" dataKey="floor" stroke={C.orange} strokeWidth={2.5} fill={"url(#fg"+m.id+")"} dot={{r:3,fill:C.orange,strokeWidth:0}}/>
                          <Area type="monotone" dataKey="comp" stroke={C.blue} strokeWidth={2.5} fill={"url(#cg"+m.id+")"} dot={{r:3,fill:C.blue,strokeWidth:0}}/>
                        </AreaChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:6}}>
                        <span style={{fontSize:12,color:C.orange,fontFamily:FM}}>{"\u25CF"} Cumulative Floor Paid</span>
                        <span style={{fontSize:12,color:C.blue,fontFamily:FM}}>{"\u25CF"} Cumulative Comp Plan</span>
                      </div>
                    </div>}
                    {/* Weekly Bar Chart */}
                    {a2.weeks.length>=2&&<div style={{marginBottom:14}}>
                      <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 8px",fontFamily:FM,letterSpacing:".5px"}}>WEEKLY — FLOOR vs. COMP PLAN</p>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={a2.weeks.map(function(w2){return{we:w2.we,floor:Math.round(w2.floorPaid*100)/100,comp:Math.round(w2.compPlanComm*100)/100};})} margin={{left:10,right:10,top:0,bottom:0}}>
                          <XAxis dataKey="we" fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false}/>
                          <YAxis fontSize={10} stroke={C.textDim} tick={{fontFamily:FM}} axisLine={false} tickLine={false} tickFormatter={function(v){return"$"+v;}}/>
                          <Tooltip content={function(p){if(!p.active||!p.payload)return null;var d=p.payload[0]?p.payload[0].payload:{};return <div style={{background:C.bgCard,border:"1px solid "+C.border,borderRadius:6,padding:"8px 12px",fontFamily:FM,fontSize:13}}><p style={{margin:0,color:C.textDim}}>WE {d.we}</p><p style={{margin:"2px 0",color:C.orange,fontWeight:600}}>Floor: {fmtD(d.floor)}</p><p style={{margin:0,color:C.blue,fontWeight:600}}>Comp: {fmtD(d.comp)}</p><p style={{margin:"3px 0 0",color:d.floor>d.comp?C.red:C.green,fontWeight:600}}>Delta: {d.floor>d.comp?"+":""}{fmtD(d.floor-d.comp)}</p></div>;}}/>
                          <Bar dataKey="floor" fill={C.orange} radius={[4,4,0,0]} barSize={16}/>
                          <Bar dataKey="comp" fill={C.blue} radius={[4,4,0,0]} barSize={16}/>
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{display:"flex",justifyContent:"center",gap:20,marginTop:4}}>
                        <span style={{fontSize:11,color:C.orange,fontFamily:FM}}>{"\u25A0"} Floor Paid</span>
                        <span style={{fontSize:11,color:C.blue,fontFamily:FM}}>{"\u25A0"} Comp Plan Commission</span>
                      </div>
                    </div>}
                    {/* Projections */}
                    {a2.weeksRemaining!==null&&a2.weeksRemaining>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                      <div style={{padding:"12px 14px",background:C.orangeDim,borderRadius:8,border:"1px solid "+C.orange+"33"}}>
                        <p style={{fontSize:11,color:C.orange,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>PROJECTED TOTAL FLOOR</p>
                        <p style={{fontSize:22,fontWeight:800,color:C.orange,margin:0,fontFamily:FM}}>{fmtD(a2.projectedTotalFloor)}</p>
                        <p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>{fmtD(a2.avgFloorPerWeek)}/wk × {a2.weeksRemaining} wk left</p>
                      </div>
                      <div style={{padding:"12px 14px",background:C.blueDim,borderRadius:8,border:"1px solid "+C.blue+"33"}}>
                        <p style={{fontSize:11,color:C.blue,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>PROJECTED COMP PLAN</p>
                        <p style={{fontSize:22,fontWeight:800,color:C.blue,margin:0,fontFamily:FM}}>{fmtD(a2.projectedTotalComp)}</p>
                        <p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>{fmtD(a2.avgCompPerWeek)}/wk avg pace</p>
                      </div>
                      <div style={{padding:"12px 14px",background:a2.willExceed?C.greenDim:C.redDim,borderRadius:8,border:"1px solid "+(a2.willExceed?C.green:C.red)+"33"}}>
                        <p style={{fontSize:11,color:a2.willExceed?C.green:C.red,margin:"0 0 4px",fontWeight:700,fontFamily:FM}}>PROJECTION</p>
                        <p style={{fontSize:16,fontWeight:800,color:a2.willExceed?C.green:C.red,margin:0,fontFamily:FM}}>{a2.willExceed?"COMP WILL EXCEED":"FLOOR EXCEEDS COMP"}</p>
                        <p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>Gap: {fmtD(Math.abs((a2.projectedTotalFloor||0)-(a2.projectedTotalComp||0)))}</p>
                      </div>
                    </div>}
                    {/* Rates Reference */}
                    <div style={{display:"flex",gap:8,marginBottom:12,padding:"8px 12px",background:C.bg,borderRadius:6,border:"1px solid "+C.border,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.textDim,fontFamily:FM}}>RATES:</span>
                      {m.rates.fdA>0&&<span style={{fontSize:12,color:C.accent,fontFamily:FM}}>FD {Math.round(m.rates.fdA*100)}%</span>}
                      {m.rates.sA>0&&<span style={{fontSize:12,color:C.blue,fontFamily:FM}}>Split {Math.round(m.rates.sA*100)}%</span>}
                      {m.rates.fdDH>0&&<span style={{fontSize:12,color:C.teal,fontFamily:FM}}>DH FD {Math.round(m.rates.fdDH*100)}%</span>}
                      {m.rates.sDH>0&&<span style={{fontSize:12,color:C.teal,fontFamily:FM}}>DH Split {Math.round(m.rates.sDH*100)}%</span>}
                      <span style={{color:C.border}}>|</span>
                      <span style={{fontSize:12,color:C.orange,fontFamily:FM,fontWeight:600}}>Floor: {fmtD(m.guarantee.amount)}/wk</span>
                    </div>
                    {/* Week Detail Table */}
                    <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>WEEK-BY-WEEK DETAIL ({a2.weeksLoaded} weeks)</p>
                    <div style={{overflow:"auto",maxHeight:"40vh",borderRadius:6,border:"1px solid "+C.border}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead><tr>
                          <th style={th}>WE</th>
                          <th style={Object.assign({},th,{textAlign:"right"})}>Raw Charge</th>
                          <th style={Object.assign({},th,{textAlign:"right"})}>QTD</th>
                          <th style={Object.assign({},th,{textAlign:"center"})}>Tier</th>
                          <th style={Object.assign({},th,{textAlign:"right",color:C.orange})}>Floor Paid</th>
                          <th style={Object.assign({},th,{textAlign:"right",color:C.blue})}>Comp Plan</th>
                          <th style={Object.assign({},th,{textAlign:"right"})}>Wkly Delta</th>
                          <th style={Object.assign({},th,{textAlign:"right",color:C.orange})}>Cum Floor</th>
                          <th style={Object.assign({},th,{textAlign:"right",color:C.blue})}>Cum Comp</th>
                          <th style={Object.assign({},th,{textAlign:"right"})}>Cum Delta</th>
                        </tr></thead>
                        <tbody>{a2.weeks.map(function(w2){return <tr key={w2.we} className="trow">
                          <td style={Object.assign({},td,{fontWeight:600,whiteSpace:"nowrap"})}>{w2.we}</td>
                          <td style={Object.assign({},td,{textAlign:"right"})}>{fmtD(w2.rawCharge)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",color:w2.belowFloor?C.orange:C.green})}>{fmtD(w2.qtd)}</td>
                          <td style={Object.assign({},td,{textAlign:"center"})}>{w2.crossing?<Badge v="green">Cross</Badge>:w2.belowFloor?<Badge v="red">Below</Badge>:<Badge v="green">Above</Badge>}</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:C.orange})}>{fmtD(w2.floorPaid)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:C.blue})}>{fmtD(w2.compPlanComm)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:w2.delta>0?C.red:C.green})}>{w2.delta>0?"+":""}{fmtD(w2.delta)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",color:C.orange})}>{fmtD(w2.cumFloor)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",color:C.blue})}>{fmtD(w2.cumCompPlan)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:w2.cumDelta>0?C.red:C.green})}>{w2.cumDelta>0?"+":""}{fmtD(w2.cumDelta)}</td>
                        </tr>;})}</tbody>
                        <tfoot><tr style={{background:C.bg2,borderTop:"2px solid "+C.accent+"33"}}>
                          <td style={Object.assign({},td,{fontWeight:700,color:C.accent})}>TOTALS</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:600})}>{fmtD(a2.weeks.reduce(function(s,w2){return s+w2.rawCharge;},0))}</td>
                          <td colSpan={2} style={td}></td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.orange})}>{fmtD(a2.cumFloorPaid)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.blue})}>{fmtD(a2.cumCompPlan)}</td>
                          <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:a2.cumDelta>0?C.red:C.green})}>{a2.cumDelta>0?"+":""}{fmtD(a2.cumDelta)}</td>
                          <td colSpan={3} style={td}></td>
                        </tr></tfoot>
                      </table>
                    </div>
                    {/* Export */}
                    <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:10}}>
                      <button onClick={function(){
                        var headers=["Week Ending","Raw Charge","Split Rec","Split AM","Full Desk","YTD Raw","QTD","Tier","Floor Paid","Comp Plan Comm","Weekly Delta","Cum Floor","Cum Comp Plan","Cum Delta"];
                        var data=a2.weeks.map(function(w2){return[w2.we,w2.rawCharge.toFixed(2),w2.splitRec.toFixed(2),w2.splitAM.toFixed(2),w2.fullDesk.toFixed(2),w2.ytdRaw.toFixed(2),(w2.qtd||0).toFixed(2),w2.belowFloor?"Below":"Above",w2.floorPaid.toFixed(2),w2.compPlanComm.toFixed(2),w2.delta.toFixed(2),w2.cumFloor.toFixed(2),w2.cumCompPlan.toFixed(2),w2.cumDelta.toFixed(2)];});
                        dlCSV("Floor_Tracker_"+m.name.replace(/ /g,"_")+".csv",headers,data);
                        log("FLOOR_EXPORT",m.name+" — "+a2.weeks.length+" weeks");
                      }} className="btn-ghost" style={{padding:"5px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM}}>EXPORT CSV</button>
                    </div>
                  </div>}
                </div>;
              })}
            </div>;
          }()}
        </div>}
        {/* ════════ EXEC SUMMARY ════════ */}
        {view==="exec"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
            <div>
              <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Commission Summary</h2>
              <p style={{fontSize:13,color:C.textDim,margin:"2px 0 0",fontFamily:FM}}>Spark Portfolio Commission</p>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <select value={execWeekId||""} onChange={function(e){setExecWeekId(+e.target.value||null);}} style={{padding:"3px 6px",fontSize:13,borderRadius:3,fontFamily:FM}}><option value="">Select week...</option>{chargeWeeks.map(function(w){return <option key={w.id} value={w.id}>{lockedWeeks.includes(w.weekEnding)?"🔒 ":""}{"WE "+w.weekEnding}</option>;})}</select>
              {execData&&<button onClick={function(){
                var we=execWeek?execWeek.weekEnding:"";
                var rows=execData.sorted.filter(function(s){return (s.hasOverride?s.overrideTotal:s.total)>0;});
                var headers=["Producer","Entity","Unit","Split Rec","Split AM","Full Desk","Weekly Raw","Contract Comm","Tier Deduction","DH Comm","Total Commission","QTD Raw","Tier Status","Override"];
                var data=rows.map(function(s){var m=members.find(function(x){return x.name===s.name;});return[s.name,m?m.entity:"",m?m.unit:"",Math.round((s.splitRec||0)*100)/100,Math.round((s.splitAM||0)*100)/100,Math.round((s.fullDesk||0)*100)/100,Math.round((s.rawCharge||0)*100)/100,Math.round(s.contract*100)/100,Math.round((s.deduction||0)*100)/100,Math.round(s.dh*100)/100,Math.round((s.hasOverride?s.overrideTotal:s.total)*100)/100,Math.round((s.qtd||0)*100)/100,s.aboveFloor?"Above":"Below",s.hasOverride?"Yes":""];});
                try{
                  var allRows=[["Spark Portfolio Commission\u2122 \u2014 Executive Summary"],["Week Ending: "+we,"","Generated: "+new Date().toLocaleDateString()],[],headers].concat(data).concat([[],["TOTALS","","","","","","",Math.round(execData.tContract*100)/100,"",Math.round(execData.tDH*100)/100,Math.round(execData.grandTotal*100)/100]]);
                  // Add DH detail sheet if any
                  var ws=XLSX.utils.aoa_to_sheet(allRows);
                  ws["!cols"]=[{wch:22},{wch:10},{wch:14},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14},{wch:14},{wch:12},{wch:16},{wch:14},{wch:12}];
                  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Exec Summary");
                  if(execData.dhPaidThisWeek&&execData.dhPaidThisWeek.length>0){
                    var dhHeaders=["Candidate","Client","AM","Recruiter","Type","Raw Charge","Payout","Eligible"];
                    var dhRows=execData.dhPaidThisWeek.map(function(d){return[d.can,d.cl,d.am,d.rec,d.typ,d.raw,Math.round(d.payout*100)/100,d.eligible?"Yes":"No"];});
                    var dhWs=XLSX.utils.aoa_to_sheet([["DH Payouts — WE "+we],[],dhHeaders].concat(dhRows));
                    dhWs["!cols"]=[{wch:20},{wch:22},{wch:18},{wch:18},{wch:6},{wch:12},{wch:12},{wch:8}];
                    XLSX.utils.book_append_sheet(wb,dhWs,"DH Payouts");
                  }
                  var buf=XLSX.write(wb,{bookType:"xlsx",type:"array"});
                  dlFile(buf,"Exec_Summary_WE_"+we+".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                  showToast("Exec Summary downloaded");log("EXEC_EXPORT","WE "+we);
                }catch(e){showToast("Export failed: "+e.message,"err");}
              }} className="btn-ghost" style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600}}>DOWNLOAD EXCEL</button>}
              {execData&&<button onClick={function(){
                var we=execWeek?execWeek.weekEnding:"";
                var rows=execData.sorted.filter(function(s){return (s.hasOverride?s.overrideTotal:s.total)>0;});
                var css="body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e;max-width:1000px;margin:0 auto}h1{font-size:20px;border-bottom:2px solid #d4a017;padding-bottom:4px;margin:0 0 2px}h2{font-size:13px;color:#666;margin:0 0 14px}h3{font-size:14px;margin:18px 0 6px;color:#1a1a2e;border-bottom:1px solid #ddd;padding-bottom:3px}table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}th{background:#1a1a2e;color:#fff;padding:4px 5px;text-align:left;font-size:9px}td{padding:3px 5px;border-bottom:1px solid #eee}.r{text-align:right}.tot{font-weight:700;background:#f5f5f5;border-top:2px solid #1a1a2e}.g{color:#16a34a}.rd{color:#dc2626}.kpi{display:inline-block;padding:6px 12px;background:#f8f8f8;border-radius:4px;margin:0 6px 6px 0;font-size:12px}.uc{display:inline-block;padding:8px 14px;background:#f8f8f8;border-left:3px solid #d4a017;border-radius:4px;margin:0 8px 8px 0;min-width:140px}@media print{body{padding:8px}}";
                var html="<html><head><title>Exec Summary WE "+we+"</title><style>"+css+"</style></head><body>";
                html+="<h1>Spark Portfolio Commission\u2122</h1><h2>Executive Summary \u2014 Week Ending "+we+"</h2>";
                html+="<div style='margin-bottom:12px'><span class='kpi'><b>Total Payout:</b> "+fmtD(execData.grandTotal)+"</span><span class='kpi'><b>Contract:</b> "+fmtD(execData.tContract)+"</span><span class='kpi'><b>DH:</b> "+fmtD(execData.tDH)+"</span>"+(execData.tGuarantee>0?"<span class='kpi'><b>Weekly Floors:</b> "+fmtD(execData.tGuarantee)+"/wk</span>":"")+"<span class='kpi'><b>Producers:</b> "+rows.length+"</span><span class='kpi'><b>Above Tier:</b> "+rows.filter(function(s){return s.aboveFloor;}).length+"</span></div>";
                var units={};rows.forEach(function(s){var u=s.unit||"Other";if(!units[u])units[u]={total:0,count:0};units[u].total+=(s.hasOverride?s.overrideTotal:s.total);units[u].count++;});
                var unitArr=Object.keys(units).sort(function(a,b){return units[b].total-units[a].total;});
                html+="<h3>Commission by Unit</h3><div>";
                unitArr.forEach(function(u){html+="<div class='uc'><div style='font-size:10px;color:#666;font-weight:700;text-transform:uppercase'>"+u+"</div><div style='font-size:16px;font-weight:700'>"+fmtD(units[u].total)+"</div><div style='font-size:10px;color:#888'>"+units[u].count+" producer"+(units[u].count>1?"s":"")+"</div></div>";});
                html+="</div>";
                html+="<h3>Commission by Producer</h3>";
                html+="<table><thead><tr><th>Producer</th><th>Unit</th><th class='r'>Weekly Raw</th><th class='r'>Contract Comm</th><th class='r'>DH Comm</th><th class='r'>Total</th><th class='r'>QTD Raw</th><th>Tier</th></tr></thead><tbody>";
                rows.forEach(function(s){var m=members.find(function(x){return x.name===s.name;});html+="<tr><td><b>"+s.name+"</b></td><td>"+(m?m.unit:"")+"</td><td class='r'>"+fmtD(s.rawCharge||0)+"</td><td class='r'>"+fmtD(s.hasOverride?(s.overrideTotal-s.dh):s.contract)+"</td><td class='r'>"+(s.dh>0?fmtD(s.dh):"\u2014")+"</td><td class='r'><b>"+fmtD(s.hasOverride?s.overrideTotal:s.total)+"</b>"+(s.hasOverride?" <span style='color:#e89b00;font-size:8px'>OVR</span>":"")+"</td><td class='r'>"+fmtD(s.qtd||0)+"</td><td class='"+(s.aboveFloor?"g":"rd")+"'>"+(s.aboveFloor?"Above":"Below")+"</td></tr>";});
                html+="<tr class='tot'><td colspan='2'>TOTALS</td><td></td><td class='r'>"+fmtD(execData.tContract)+"</td><td class='r'>"+fmtD(execData.tDH)+"</td><td class='r'><b>"+fmtD(execData.grandTotal)+"</b></td><td colspan='2'></td></tr></tbody></table>";
                if(execData.dhPaidThisWeek&&execData.dhPaidThisWeek.length>0){html+="<h3>Direct Hire Payouts ("+execData.dhPaidThisWeek.length+" deals)</h3><table><thead><tr><th>Candidate</th><th>Client</th><th>AM</th><th>Rec</th><th>Type</th><th class='r'>Raw</th><th class='r'>Payout</th></tr></thead><tbody>";execData.dhPaidThisWeek.forEach(function(d){html+="<tr><td><b>"+d.can+"</b></td><td>"+d.cl+"</td><td>"+d.am+"</td><td>"+d.rec+"</td><td>"+d.typ+"</td><td class='r'>"+fmtD(d.raw)+"</td><td class='r'><b>"+fmtD(d.payout)+"</b></td></tr>";});html+="</tbody></table>";}
                if(execData.gMembers&&execData.gMembers.length>0){html+="<h3>Weekly Floors ("+execData.gMembers.length+")</h3><table><thead><tr><th>Producer</th><th>Unit</th><th class='r'>Amount/Week</th><th>End Date</th><th>Status</th></tr></thead><tbody>";execData.gMembers.forEach(function(m){var dl=m.guarantee.endDate?Math.ceil((new Date(m.guarantee.endDate)-Date.now())/(1000*60*60*24)):null;var exp=dl!==null&&dl<0;html+="<tr><td><b>"+m.name+"</b></td><td>"+(m.unit||"")+"</td><td class='r'><b>"+fmtD(m.guarantee.amount)+"</b></td><td>"+(m.guarantee.endDate||"No end date")+"</td><td class='"+(exp?"rd":dl!==null&&dl<=60?"rd":"g")+"'>"+(exp?"EXPIRED":dl!==null?dl+" days left":"Ongoing")+"</td></tr>";});html+="<tr class='tot'><td colspan='2'>TOTAL</td><td class='r'><b>"+fmtD(execData.tGuarantee)+"</b>/wk</td><td colspan='2'></td></tr></tbody></table>";}
                html+="<p style='font-size:9px;color:#999;margin-top:16px'>Generated "+new Date().toLocaleString()+" \u2014 Spark Companies\u2122</p></body></html>";
                setExportModal({title:"Exec Summary \u2014 WE "+we,content:html,isHTML:true});
              }} className="btn-ghost" style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600}}>PREVIEW</button>}
              {execData&&<button onClick={function(){
                var we=execWeek?execWeek.weekEnding:"";
                var rows=execData.sorted.filter(function(s){return (s.hasOverride?s.overrideTotal:s.total)>0;});
                var css="body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e;max-width:1000px;margin:0 auto}h1{font-size:20px;border-bottom:2px solid #d4a017;padding-bottom:4px;margin:0 0 2px}h2{font-size:13px;color:#666;margin:0 0 14px}h3{font-size:14px;margin:18px 0 6px;color:#1a1a2e;border-bottom:1px solid #ddd;padding-bottom:3px}table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}th{background:#1a1a2e;color:#fff;padding:4px 5px;text-align:left;font-size:9px}td{padding:3px 5px;border-bottom:1px solid #eee}.r{text-align:right}.tot{font-weight:700;background:#f5f5f5;border-top:2px solid #1a1a2e}.g{color:#16a34a}.rd{color:#dc2626}.kpi{display:inline-block;padding:6px 12px;background:#f8f8f8;border-radius:4px;margin:0 6px 6px 0;font-size:12px}.uc{display:inline-block;padding:8px 14px;background:#f8f8f8;border-left:3px solid #d4a017;border-radius:4px;margin:0 8px 8px 0;min-width:140px}@media print{body{padding:8px}}";
                var html="<html><head><title>Exec Summary WE "+we+"</title><style>"+css+"</style></head><body>";
                html+="<h1>Spark Portfolio Commission\u2122</h1><h2>Executive Summary \u2014 Week Ending "+we+"</h2>";
                html+="<div style='margin-bottom:12px'><span class='kpi'><b>Total Payout:</b> "+fmtD(execData.grandTotal)+"</span><span class='kpi'><b>Contract:</b> "+fmtD(execData.tContract)+"</span><span class='kpi'><b>DH:</b> "+fmtD(execData.tDH)+"</span>"+(execData.tGuarantee>0?"<span class='kpi'><b>Weekly Floors:</b> "+fmtD(execData.tGuarantee)+"/wk</span>":"")+"<span class='kpi'><b>Producers:</b> "+rows.length+"</span><span class='kpi'><b>Above Tier:</b> "+rows.filter(function(s){return s.aboveFloor;}).length+"</span></div>";
                var units={};rows.forEach(function(s){var u=s.unit||"Other";if(!units[u])units[u]={total:0,count:0};units[u].total+=(s.hasOverride?s.overrideTotal:s.total);units[u].count++;});
                html+="<h3>Commission by Unit</h3><div>";
                Object.keys(units).sort(function(a,b){return units[b].total-units[a].total;}).forEach(function(u){html+="<div class='uc'><div style='font-size:10px;color:#666;font-weight:700;text-transform:uppercase'>"+u+"</div><div style='font-size:16px;font-weight:700'>"+fmtD(units[u].total)+"</div><div style='font-size:10px;color:#888'>"+units[u].count+" producer"+(units[u].count>1?"s":"")+"</div></div>";});
                html+="</div><h3>Commission by Producer</h3>";
                html+="<table><thead><tr><th>Producer</th><th>Unit</th><th class='r'>Weekly Raw</th><th class='r'>Contract Comm</th><th class='r'>DH Comm</th><th class='r'>Total</th><th class='r'>QTD Raw</th><th>Tier</th></tr></thead><tbody>";
                rows.forEach(function(s){var m=members.find(function(x){return x.name===s.name;});html+="<tr><td><b>"+s.name+"</b></td><td>"+(m?m.unit:"")+"</td><td class='r'>"+fmtD(s.rawCharge||0)+"</td><td class='r'>"+fmtD(s.hasOverride?(s.overrideTotal-s.dh):s.contract)+"</td><td class='r'>"+(s.dh>0?fmtD(s.dh):"\u2014")+"</td><td class='r'><b>"+fmtD(s.hasOverride?s.overrideTotal:s.total)+"</b>"+(s.hasOverride?" <span style='color:#e89b00;font-size:8px'>OVR</span>":"")+"</td><td class='r'>"+fmtD(s.qtd||0)+"</td><td class='"+(s.aboveFloor?"g":"rd")+"'>"+(s.aboveFloor?"Above":"Below")+"</td></tr>";});
                html+="<tr class='tot'><td colspan='2'>TOTALS</td><td></td><td class='r'>"+fmtD(execData.tContract)+"</td><td class='r'>"+fmtD(execData.tDH)+"</td><td class='r'><b>"+fmtD(execData.grandTotal)+"</b></td><td colspan='2'></td></tr></tbody></table>";
                if(execData.gMembers&&execData.gMembers.length>0){html+="<h3>Weekly Floors ("+execData.gMembers.length+") — "+fmtD(execData.tGuarantee)+"/week</h3><table><thead><tr><th>Producer</th><th>Unit</th><th class='r'>$/Week</th><th>End Date</th><th>Status</th></tr></thead><tbody>";execData.gMembers.forEach(function(m){var dl=m.guarantee.endDate?Math.ceil((new Date(m.guarantee.endDate)-Date.now())/(1000*60*60*24)):null;var ex=dl!==null&&dl<0;html+="<tr><td><b>"+m.name+"</b></td><td>"+(m.unit||"")+"</td><td class='r'><b>"+fmtD(m.guarantee.amount)+"</b></td><td>"+(m.guarantee.endDate||"No end date")+"</td><td class='"+(ex?"rd":dl!==null&&dl<=60?"":"")+"'>"+(ex?"EXPIRED":dl!==null?dl+"d left":"Open")+"</td></tr>";});html+="<tr class='tot'><td colspan='2'>TOTAL</td><td class='r'><b>"+fmtD(execData.tGuarantee)+"/wk</b></td><td colspan='2'></td></tr></tbody></table>";}
                if(execData.dhPaidThisWeek&&execData.dhPaidThisWeek.length>0){html+="<h3>Direct Hire Payouts ("+execData.dhPaidThisWeek.length+")</h3><table><thead><tr><th>Candidate</th><th>Client</th><th>AM</th><th>Rec</th><th>Type</th><th class='r'>Raw</th><th class='r'>Payout</th></tr></thead><tbody>";execData.dhPaidThisWeek.forEach(function(d){html+="<tr><td><b>"+d.can+"</b></td><td>"+d.cl+"</td><td>"+d.am+"</td><td>"+d.rec+"</td><td>"+d.typ+"</td><td class='r'>"+fmtD(d.raw)+"</td><td class='r'><b>"+fmtD(d.payout)+"</b></td></tr>";});html+="</tbody></table>";}
                if(execData.gMembers&&execData.gMembers.length>0){html+="<h3>Weekly Floors ("+execData.gMembers.length+")</h3><table><thead><tr><th>Producer</th><th>Unit</th><th class='r'>Amount/Week</th><th>End Date</th><th>Status</th></tr></thead><tbody>";execData.gMembers.forEach(function(m){var dl=m.guarantee.endDate?Math.ceil((new Date(m.guarantee.endDate)-Date.now())/(1000*60*60*24)):null;var exp=dl!==null&&dl<0;html+="<tr><td><b>"+m.name+"</b></td><td>"+(m.unit||"")+"</td><td class='r'><b>"+fmtD(m.guarantee.amount)+"</b></td><td>"+(m.guarantee.endDate||"No end date")+"</td><td class='"+(exp?"rd":dl!==null&&dl<=60?"rd":"g")+"'>"+(exp?"EXPIRED":dl!==null?dl+" days left":"Ongoing")+"</td></tr>";});html+="<tr class='tot'><td colspan='2'>TOTAL</td><td class='r'><b>"+fmtD(execData.tGuarantee)+"</b>/wk</td><td colspan='2'></td></tr></tbody></table>";}
                showToast("Downloaded — open the file and use Ctrl+P to save as PDF");
              }} className="btn-primary" style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:700}}>DOWNLOAD PDF</button>}
            </div>
          </div>
          {execData&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
              {[
                {l:"GRAND TOTAL PAYOUT",v:fmtD(execData.grandTotal),s:"All commission types combined",bc:C.accent},
                {l:"CONTRACT COMMISSION",v:fmtD(execData.tContract),s:execData.earners+" earners · "+(execData.grandTotal>0?Math.round(execData.tContract/execData.grandTotal*100):0)+"% of total",bc:C.green},
                {l:"DH COMMISSION",v:fmtD(execData.tDH),s:execData.dhPaidThisWeek.length+" deal"+(execData.dhPaidThisWeek.length!==1?"s":"")+(execData.grandTotal>0?" · "+Math.round(execData.tDH/execData.grandTotal*100)+"% of total":""),bc:C.purple},
                execData.tGuarantee>0?{l:"WEEKLY FLOORS",v:fmtD(execData.tGuarantee),s:execData.gMembers.length+" member"+(execData.gMembers.length>1?"s":"")+" · "+fmtD(execData.tGuarantee)+"/week",bc:C.orange}:null,
                {l:"ROSTER",v:execData.earners+" / "+execData.total,s:"Earning · "+(execData.total-execData.earners)+" at $0",bc:C.teal}
              ].filter(Boolean).map(function(c,i){return <div key={i} className="stat-card" style={{padding:"12px 14px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:c.bc}}/>
                <p style={{fontSize:11,color:C.textDim,margin:"0 0 4px",fontWeight:600,letterSpacing:".6px",fontFamily:FM}}>{c.l}</p>
                <p style={{fontSize:20,fontWeight:700,margin:0,color:C.text,fontFamily:FM}}>{c.v}</p>
                <p style={{fontSize:12,color:C.textMuted,margin:"3px 0 0",fontFamily:FM}}>{c.s}</p>
              </div>;})}
            </div>
            {/* Weekly Floors detail */}
            {execData.gMembers&&execData.gMembers.length>0&&<div className="panel" style={{marginBottom:14,border:"1px solid "+C.orange+"33"}}><div className="panel-hdr" style={{borderBottomColor:C.orange+"33"}}><h3 style={{color:C.orange}}>WEEKLY FLOORS ({execData.gMembers.length}) — {fmtD(execData.tGuarantee)}/week</h3></div><div className="panel-body" style={{padding:10}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th style={th}>Producer</th><th style={th}>Unit</th><th style={Object.assign({},th,{textAlign:"right"})}>$/Week</th><th style={th}>End Date</th><th style={Object.assign({},th,{textAlign:"center"})}>Status</th></tr></thead>
                <tbody>{execData.gMembers.map(function(m,i){var daysLeft=m.guarantee.endDate?Math.ceil((new Date(m.guarantee.endDate)-Date.now())/(1000*60*60*24)):null;var expired=daysLeft!==null&&daysLeft<0;return <tr key={i} className="trow">
                  <td style={Object.assign({},td,{fontWeight:600})}>{m.name}</td>
                  <td style={td}>{m.unit&&<Badge v={UB[m.unit]||"muted"}>{m.unit}</Badge>}</td>
                  <td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.accent})}>{fmtD(m.guarantee.amount)}</td>
                  <td style={td}>{m.guarantee.endDate||<span style={{color:C.textDim}}>No end date</span>}</td>
                  <td style={Object.assign({},td,{textAlign:"center"})}>{expired?<Badge v="red">EXPIRED</Badge>:daysLeft!==null&&daysLeft<=60?<Badge v="orange">{daysLeft}d left</Badge>:daysLeft!==null?<Badge v="muted">{daysLeft}d left</Badge>:<Badge v="muted">Open</Badge>}</td>
                </tr>;})}</tbody>
                <tfoot><tr style={{background:C.bg2}}><td colSpan={2} style={Object.assign({},td,{fontWeight:700,textAlign:"right",color:C.textDim})}>TOTAL</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.accent})}>{fmtD(execData.tGuarantee)}/wk</td><td colSpan={2}></td></tr></tfoot>
              </table>
            </div></div>}
            {execData.keyItems.length>0&&<div style={{marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {execData.keyItems.map(function(item,i){return <div key={i} className="panel"><div className="panel-body" style={{padding:8,display:"flex",gap:8,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:4,background:item.color+"12",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name={item.icon} sz={12} cl={item.color}/></div>
                  <div><p style={{fontSize:14,fontWeight:600,margin:"0 0 2px",fontFamily:FM,color:C.text}}>{item.title}</p><p style={{fontSize:12,color:C.textMuted,margin:0,fontFamily:FM,lineHeight:"1.4"}}>{item.desc}</p></div>
                </div></div>;})}
              </div>
            </div>}
            {/* ── Commission by Producer + Payout Breakdown ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              <Panel title="Commission by Producer" icon="bar">
                <ResponsiveContainer width="100%" height={Math.max(160,execData.sorted.filter(function(s){return (s.hasOverride?s.overrideTotal:s.total)>0;}).length*26+16)}>
                  <BarChart data={execData.sorted.filter(function(s){return (s.hasOverride?s.overrideTotal:s.total)>0;}).slice(0,14).map(function(s){var parts=s.name.split(" ");return{name:parts[0]+" "+(parts[1]||"").charAt(0)+".",total:Math.round((s.hasOverride?s.overrideTotal:s.total)*100)/100,fullName:s.name};})} layout="vertical" margin={{left:60,right:10,top:0,bottom:0}}>
                    <XAxis type="number" tickFormatter={function(v){return "$"+Math.round(v).toLocaleString();}} fontSize={8} stroke={C.textDim} tick={{fontFamily:FM}} hide/>
                    <YAxis type="category" dataKey="name" fontSize={9} width={55} stroke={C.textDim} tick={{fontFamily:FM,fill:C.textMuted}} axisLine={false} tickLine={false}/>
                    <Tooltip content={function(p){if(!p.active||!p.payload||!p.payload[0])return null;var d=p.payload[0].payload;return <div style={{background:C.bg,border:"1px solid "+C.border,borderRadius:4,padding:"6px 10px",fontFamily:FM,fontSize:13}}><p style={{margin:0,fontWeight:600,color:C.text}}>{d.fullName}</p><p style={{margin:"2px 0 0",color:C.accent,fontWeight:600}}>{fmtD(d.total)}</p></div>;}}/>
                    <Bar dataKey="total" radius={[0,3,3,0]} barSize={14} label={{position:"right",fontSize:12,fontFamily:FM,fill:C.textMuted,formatter:function(v){return fmtD(v);}}}>{execData.sorted.filter(function(s){return (s.hasOverride?s.overrideTotal:s.total)>0;}).slice(0,14).map(function(s,i){return <Cell key={i} fill={UC[i%UC.length]}/>;})}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
              <Panel title="Payout Breakdown" icon="dollar">
                <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                  <div style={{position:"relative",width:160,height:160}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={[{name:"Contract",value:Math.round(execData.tContract*100)/100},{name:"DH",value:Math.round(execData.tDH*100)/100},{name:"Floor",value:Math.round(execData.tFloor*100)/100},{name:"Floor",value:Math.round((execData.tGuarantee||0)*100)/100}].filter(function(d){return d.value>0;})} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={42} stroke={C.bgCard} strokeWidth={2}>
                        <Cell fill={C.green}/><Cell fill={C.teal}/><Cell fill={C.blue}/>
                      </Pie><Tooltip content={TT}/></PieChart>
                    </ResponsiveContainer>
                    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}><p style={{fontSize:20,fontWeight:700,margin:0,color:C.text,fontFamily:FM}}>{fmtD(execData.grandTotal)}</p><p style={{fontSize:11,color:C.textDim,margin:"1px 0 0",fontFamily:FM,letterSpacing:".5px"}}>TOTAL</p></div>
                  </div>
                </div>
                <div style={{borderTop:"1px solid "+C.border,paddingTop:8}}>
                  {[{l:"Contract",v:execData.tContract,c:C.green},{l:"Floor",v:execData.tFloor,c:C.blue},{l:"DH",v:execData.tDH,c:C.teal},{l:"Floor",v:execData.tGuarantee||0,c:C.orange}].filter(function(b){return b.v>0;}).map(function(b,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:1,background:b.c}}/><span style={{fontSize:13,fontFamily:FM,color:C.textMuted}}>{b.l}</span></div>
                    <span style={{fontSize:13,fontFamily:FM,fontWeight:600,color:C.text}}>{fmtD(b.v)}</span>
                  </div>;})}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",marginTop:4,borderTop:"1px solid "+C.border}}>
                    <span style={{fontSize:14,fontWeight:600,fontFamily:FM,color:C.text}}>Grand Total</span>
                    <span style={{fontSize:15,fontWeight:700,fontFamily:FM,color:C.accent}}>{fmtD(execData.grandTotal)}</span>
                  </div>
                  {execData.priorWeekTotal>0&&<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid "+C.border}}>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                      <span style={{fontSize:12,fontFamily:FM,color:C.textDim}}>Prior Week</span>
                      <span style={{fontSize:12,fontFamily:FM,fontWeight:600,color:C.textMuted}}>{fmtD(execData.priorWeekTotal)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0"}}>
                      <span style={{fontSize:15,fontFamily:FU,color:C.textMuted}}>Week-over-Week</span>
                      <span style={{fontSize:13,fontFamily:FM,fontWeight:600,color:execData.wow>=0?C.green:C.red}}>{execData.wow>=0?"+":""}{fmtD(execData.wow)} ({execData.wow>=0?"+":""}{execData.wowPct}%)</span>
                    </div>
                  </div>}
                </div>
              </Panel>
            </div>
            {/* ── Commission by Unit ── */}
            <Panel title="Commission by Unit" icon="grid">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                {function(){var units={};execData.sorted.forEach(function(s){var u=s.unit||"Unassigned";if(!units[u])units[u]={unit:u,total:0,count:0,contract:0,dh:0};var t=s.hasOverride?s.overrideTotal:s.total;units[u].total+=t;units[u].count++;units[u].contract+=s.hasOverride?(s.overrideTotal-s.dh):s.contract;units[u].dh+=s.dh;});return Object.values(units).sort(function(a,b){return b.total-a.total;}).filter(function(u){return u.total>0;}).map(function(u,i){return <div key={i} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:6,padding:"10px 12px",borderLeft:"3px solid "+(UC[i%UC.length])}}>
                  <p style={{fontSize:11,fontWeight:700,color:C.textDim,margin:"0 0 4px",fontFamily:FM,letterSpacing:".5px"}}>{u.unit.toUpperCase()}</p>
                  <p style={{fontSize:20,fontWeight:700,color:C.text,margin:"0 0 2px",fontFamily:FM}}>{fmtD(u.total)}</p>
                  <p style={{fontSize:11,color:C.textMuted,margin:0,fontFamily:FM}}>{u.count} producer{u.count>1?"s":""}{u.dh>0?" · "+fmtD(u.dh)+" DH":""}</p>
                </div>;});}()}
              </div>
            </Panel>
            {execData.dhPaidThisWeek.length>0&&<Panel title={"DH DEALS THIS WEEK ("+execData.dhPaidThisWeek.length+")"} icon="briefcase">
              <div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(execData.dhPaidThisWeek.length,3)+",1fr)",gap:6}}>
                {execData.dhPaidThisWeek.map(function(d,i){return <div key={i} style={{background:C.bg,border:"1px solid "+C.border,borderRadius:4,padding:"6px 8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><span style={{fontSize:13,fontWeight:600,fontFamily:FM,color:C.text}}>{d.can}</span><Badge v={d.typ==="FD"?"gold":"muted"}>{d.typ}</Badge></div>
                  <p style={{fontSize:12,color:C.textDim,margin:"0 0 2px",fontFamily:FM}}>{d.cl}</p>
                  <p style={{fontSize:15,fontWeight:700,color:C.green,margin:0,fontFamily:FM}}>{fmt(d.raw)}</p>
                </div>;})}
              </div>
            </Panel>}
            {/* ── Weekly Floors ── */}
          </div>}
          {!execWeekId&&chargeWeeks.length>0&&<div className="panel"><div className="panel-hdr"><h3>EXECUTIVE SUMMARY</h3></div><div className="panel-body" style={{textAlign:"center",padding:20}}><p style={{color:C.textDim,fontSize:14,fontFamily:FM,margin:0}}>Select a charge week to generate summary</p></div></div>}
          {chargeWeeks.length===0&&<div style={Object.assign({},card,{padding:30,textAlign:"center"})}><p style={{color:C.textDim,fontSize:15,fontFamily:FM,margin:0}}>Import charge weeks first</p></div>}
        </div>}
        {/* ════════ TEAM ════════ */}
        {view==="team"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10,flexWrap:"wrap",gap:6}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text}}>Team ({members.length})</h2>
            <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
              <input value={teamSearch} onChange={function(e){setTeamSearch(e.target.value);}} placeholder="Search..." style={{padding:"4px 8px",fontSize:14,borderRadius:4,fontFamily:FM,width:140,background:"#0B0E14",color:"#E8ECF2",border:"1px solid "+C.border,fontWeight:500}}/>
              <select value={teamUnit} onChange={function(e){setTeamUnit(e.target.value);}} style={{padding:"3px 6px",fontSize:14,borderRadius:3,fontFamily:FM}}><option value="ALL">All Units</option>{UNITS.map(function(u){return <option key={u} value={u}>{u}</option>;})}</select>
              <select value={teamEntity} onChange={function(e){setTeamEntity(e.target.value);}} style={{padding:"3px 6px",fontSize:14,borderRadius:3,fontFamily:FM}}><option value="ALL">All Entities</option>{ENTITIES.map(function(e){return <option key={e} value={e}>{e}</option>;})}</select>
              <button onClick={addMember} className="btn-primary" style={{padding:"4px 10px",borderRadius:4,fontSize:14,cursor:"pointer",fontFamily:FM}}>+ ADD MEMBER</button>
              <input type="file" accept=".csv,.xlsx,.xls" id="bulkMemberInput" style={{display:"none"}} onChange={function(e){
                var f=e.target.files&&e.target.files[0];if(!f)return;
                var processCSV=function(text){
                  var rows=parseCSV(text.trim());if(!rows||rows.length<2){showToast("No data found","err");return;}
                  var hdr=rows[0].map(function(h){return(h||"").toLowerCase().trim();});
                  var iName=-1,iEntity=-1,iUnit=-1,iPath=-1,iEmail=-1,iManager=-1;
                  hdr.forEach(function(h,i){
                    if(h==="name"||h==="member"||h==="employee")iName=i;
                    if(h==="entity"||h==="company")iEntity=i;
                    if(h==="unit"||h==="business unit"||h==="bu")iUnit=i;
                    if(h==="career path"||h==="path"||h==="role"||h==="title")iPath=i;
                    if(h==="email"||h==="e-mail")iEmail=i;
                    if(h==="manager"||h==="mgr"||h==="reports to"||h==="leader")iManager=i;
                  });
                  if(iName<0){iName=0;}
                  var added=0;var skipped=0;var newMembers=members.slice();
                  for(var i=1;i<rows.length;i++){
                    var row=rows[i];var name=(row[iName]||"").trim();if(!name)continue;
                    if(newMembers.find(function(m){return m.name.toLowerCase()===name.toLowerCase();})){skipped++;continue;}
                    var entity=iEntity>=0?(row[iEntity]||"").trim()||"Talent":"Talent";
                    var unit=iUnit>=0?(row[iUnit]||"").trim()||"MI Metro":"MI Metro";
                    var path=iPath>=0?(row[iPath]||"").trim()||"Recruiter":"Recruiter";
                    var email=iEmail>=0?(row[iEmail]||"").trim():"";
                    var manager=iManager>=0?(row[iManager]||"").trim():"";
                    var cp=config.careerPaths.find(function(c){return c.name.toLowerCase()===path.toLowerCase();});
                    var m=initM([name,entity,manager,unit,path,cp?cp.fdDH:0.15,cp?cp.sDH:0.05,cp?cp.fdA:0.15,cp?cp.sA:0.05,cp?cp.flat:0,0,""],newMembers);
                    if(email)m.email=email;
                    newMembers.push(m);added++;
                  }
                  if(added===0){showToast(skipped>0?skipped+" members already exist — 0 new":"No valid rows found","err");return;}
                  setMembers(newMembers);
                  log("BULK_MEMBER_IMPORT",added+" members added"+(skipped?", "+skipped+" duplicates skipped":""));
                  showToast(added+" members imported"+(skipped?", "+skipped+" already existed":""));
                };
                if(f.name.match(/\.xlsx?$/i)){var r=new FileReader();r.onload=function(ev){try{var wb=XLSX.read(ev.target.result,{type:"array"});var ws=wb.Sheets[wb.SheetNames[0]];processCSV(XLSX.utils.sheet_to_csv(ws));}catch(err){showToast("File error: "+err.message,"err");}};r.readAsArrayBuffer(f);}
                else{var r=new FileReader();r.onload=function(ev){processCSV(ev.target.result);};r.readAsText(f);}
                e.target.value="";
              }}/>
              <button onClick={function(){document.getElementById("bulkMemberInput").click();}} className="btn-ghost" style={{padding:"4px 10px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600}}>IMPORT ROSTER</button>
              <button onClick={function(){
                var headers=["Name","Entity","Unit","Career Path","Email","Leader","PIN","FD DH %","Split DH %","FD Assign %","Split Assign %","Flat %","Floor $/wk","Floor End","Notes","Status"];
                var rows=members.map(function(m){return[m.name,m.entity||"",m.unit||"",m.careerPath||"",m.email||"",m.manager||"",m.pin||"",Math.round(m.rates.fdDH*10000)/100,Math.round(m.rates.sDH*10000)/100,Math.round(m.rates.fdA*10000)/100,Math.round(m.rates.sA*10000)/100,Math.round((m.rates.flat||0)*10000)/100,m.guarantee&&m.guarantee.active?m.guarantee.amount:"",m.guarantee&&m.guarantee.endDate||"",m.notes||"",m.inactive?"Inactive":"Active"];});
                dlCSV("Spark_Roster_"+new Date().toISOString().slice(0,10),headers,rows);
                log("ROSTER_EXPORT",members.length+" members");
              }} className="btn-ghost" style={{padding:"4px 10px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600}}>EXPORT ROSTER</button>
              {members.filter(function(m){return m.inactive;}).length>0&&<button onClick={function(){setShowInactive(!showInactive);}} style={{padding:"4px 10px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600,border:"1px solid "+(showInactive?C.orange:C.border)+"66",color:showInactive?C.orange:C.textDim,background:showInactive?C.orangeDim:"transparent"}}>{showInactive?"Hide":"Show"} Inactive ({members.filter(function(m){return m.inactive;}).length})</button>}
            </div>
          </div>
          {function(){
          var mStats={};
          members.forEach(function(m){
            var weeks=chargeWeeks.map(function(w){var row=w.rows.find(function(r){return r.matchedId===m.id;});if(!row)return null;var fi=getFloorInfo(row,w);var comm=calcRowComm(row,fi,w);return{rawCharge:row.rawCharge,ytdRaw:row.ytdRaw,totalComm:comm.totalComm,deduction:comm.deduction,belowFloor:fi.belowFloor,qtd:fi.qtd};}).filter(Boolean);
            var latest=weeks.length?weeks[0]:null;
            mStats[m.id]={ytd:latest?latest.ytdRaw:0,qtd:latest?latest.qtd:0,lastComm:latest?latest.totalComm:0,totalComm:weeks.reduce(function(a,w){return a+w.totalComm;},0),totalDeduct:weeks.reduce(function(a,w){return a+w.deduction;},0),belowFloor:latest?latest.belowFloor:false,weeksLoaded:weeks.length};
          });
          var filtered=members.filter(function(m){if(!showInactive&&m.inactive)return false;if(teamUnit!=="ALL"&&m.unit!==teamUnit)return false;if(teamEntity!=="ALL"&&m.entity!==teamEntity)return false;if(teamSearch){var s=teamSearch.toLowerCase();if(!(m.name+m.manager+m.careerPath+m.notes).toLowerCase().includes(s))return false;}return true;});
          var sortedFiltered=filtered.slice().sort(function(a,b){
            var sa=mStats[a.id]||{ytd:0,qtd:0,lastComm:0,totalComm:0};
            var sb=mStats[b.id]||{ytd:0,qtd:0,lastComm:0,totalComm:0};
            var va,vb;
            if(teamSortKey==="name"){va=a.name.toLowerCase();vb=b.name.toLowerCase();return teamSortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va);}
            if(teamSortKey==="unit"){va=(a.unit||"").toLowerCase();vb=(b.unit||"").toLowerCase();return teamSortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va);}
            if(teamSortKey==="qtd"){va=sa.qtd;vb=sb.qtd;}
            else if(teamSortKey==="comm"){va=sa.lastComm;vb=sb.lastComm;}
            else{va=sa.ytd;vb=sb.ytd;}
            return teamSortDir==="asc"?va-vb:vb-va;
          });
          var teamYTD=sortedFiltered.reduce(function(a,m){return a+(mStats[m.id]?mStats[m.id].ytd:0);},0);
          var teamComm=sortedFiltered.reduce(function(a,m){return a+(mStats[m.id]?mStats[m.id].lastComm:0);},0);
          var onFloor=sortedFiltered.filter(function(m){return mStats[m.id]&&mStats[m.id].belowFloor;}).length;
          return <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            <Stat l="Members" v={sortedFiltered.length} c={C.blue} s={sortedFiltered.length!==members.length?"of "+members.length:""}/>
            <Stat l="Team YTD Raw" v={fmtD(teamYTD)} c={C.accent}/>
            <Stat l="Last Week Comm" v={fmtD(teamComm)} c={C.green}/>
            <Stat l="On Floor" v={onFloor} c={onFloor?C.red:C.green} s={onFloor?onFloor+" below $25K":"All clear"}/>
          </div>
          <p style={{fontSize:13,color:C.textDim,margin:"0 0 6px",fontFamily:FM}}>{sortedFiltered.length===members.length?sortedFiltered.length+" members":"showing "+sortedFiltered.length+" of "+members.length}</p><div style={Object.assign({},card,{overflow:"auto",maxHeight:"60vh"})}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{[["Name","name"],["Unit","unit"],["Title",""],["YTD Raw","ytd"],["QTD","qtd"],["Last Comm","comm"],["Floor",""],["Wks",""]].map(function(h,i){var key=h[1];var active=key&&teamSortKey===key;return <th key={h[0]} style={Object.assign({},th,{textAlign:i>=3&&i<=5?"right":i===6?"center":"left",cursor:key?"pointer":"default",color:active?C.accent:C.textDim,background:active?C.accentDim:C.bg})} onClick={key?function(){if(teamSortKey===key){setTeamSortDir(teamSortDir==="asc"?"desc":"asc");}else{setTeamSortKey(key);setTeamSortDir("desc");}}:undefined}>{h[0]}{active?(teamSortDir==="desc"?" ▼":" ▲"):""}</th>;})}</tr></thead>
          <tbody>{sortedFiltered.map(function(m){var s=mStats[m.id]||{ytd:0,qtd:0,lastComm:0,totalComm:0,belowFloor:false,weeksLoaded:0};var pct=s.qtd/FLOOR*100;return <tr key={m.id} className="trow" onClick={function(){goEdit(m.id);}} style={{cursor:"pointer",opacity:m.inactive?.45:1}}><td style={Object.assign({},td,{fontWeight:600,fontFamily:FU,borderLeft:"3px solid "+(m.inactive?C.textDim:s.belowFloor?C.red:s.ytd>=FLOOR_ANNUAL?C.green:s.ytd>0?C.accent:C.border),paddingLeft:10})}>{m.name}{m.inactive?" (inactive)":""}</td><td style={td}><Badge v={UB[m.unit]||"muted"}>{m.unit}</Badge></td><td style={Object.assign({},td,{fontSize:12,color:C.textMuted,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"})}>{m.careerPath}</td>
          <td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:s.ytd>=FLOOR_ANNUAL?C.green:s.ytd>0?C.text:C.textDim})}>{s.ytd>0?fmtD(s.ytd):"--"}</td>
          <td style={Object.assign({},td,{textAlign:"right",color:s.qtd>=FLOOR?C.green:s.qtd>0?C.orange:C.textDim})}>{s.qtd>0?fmt(s.qtd):"--"}</td>
          <td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:s.lastComm>0?C.green:C.textDim})}>{s.lastComm>0?fmtD(s.lastComm):"--"}</td>
          <td style={Object.assign({},td,{textAlign:"center"})}>{s.weeksLoaded===0?<Badge v="muted">--</Badge>:s.belowFloor?<Badge v="red">{Math.round(pct)}%</Badge>:s.ytd>=FLOOR_ANNUAL?<Badge v="green">$100K</Badge>:<Badge v="green">OK</Badge>}</td>
          <td style={Object.assign({},td,{textAlign:"right",color:C.textDim,fontSize:12})}>{s.weeksLoaded||"--"}</td>
          </tr>;})}</tbody></table></div></div>;}()}
        </div>}
        {/* ════════ MEMBER DASHBOARD ════════ */}
        {view==="edit"&&eM&&function(){
          var memberWeeks=chargeWeeks.map(function(w){var row=w.rows.find(function(r){return r.matchedId===editMemberId;});if(!row)return null;var fi=getFloorInfo(row,w);var comm=calcRowComm(row,fi,w);return{weekEnding:w.weekEnding,rawCharge:row.rawCharge,splitRec:row.splitRec,splitAM:row.splitAM,fullDesk:row.fullDesk,ytdRaw:row.ytdRaw,qtd:fi.qtd,belowFloor:fi.belowFloor,deduction:comm.deduction,totalComm:comm.totalComm,crossDate:fi.crossDate,dhEligible:fi.dhEligible};}).filter(Boolean);
          var latestWeek=memberWeeks.length?memberWeeks[0]:null;var ytdRaw=latestWeek?latestWeek.ytdRaw:0;var qtd=latestWeek?latestWeek.qtd:0;var floorOk=latestWeek?!latestWeek.belowFloor:false;
          var totalComm=memberWeeks.reduce(function(a,w){return a+w.totalComm;},0);var totalRaw=memberWeeks.reduce(function(a,w){return a+w.rawCharge;},0);var totalDeductions=memberWeeks.reduce(function(a,w){return a+w.deduction;},0);
          var memberDH=dhData.filter(function(d){
            // Primary: match by member ID
            if(d.amId===editMemberId||d.recId===editMemberId)return true;
            // Fallback for legacy data without IDs: name matching
            if(!d.amId&&!d.recId){
              var mName=(eM.name||"").toLowerCase().trim();
              var mLast=mName.split(" ").pop();
              var recL=(d.rec||"").toLowerCase().trim();var amL=(d.am||"").toLowerCase().trim();
              if(recL===mName||amL===mName)return true;
              if(mLast.length>2&&(recL.split(" ").pop()===mLast||amL.split(" ").pop()===mLast))return true;
            }
            return false;
          });var dhTotal=memberDH.reduce(function(a,d){return a+d.raw;},0);var qtdPct=Math.min(100,Math.round(qtd/FLOOR*100));
          return <div style={{animation:"fadeIn .2s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <button onClick={function(){setView("team");setEditMemberId(null);}} className="btn-ghost" style={{fontSize:14,padding:"3px 8px",borderRadius:4,cursor:"pointer",fontFamily:FM}}>&larr; BACK</button>
            <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:eM.inactive?C.textDim:C.text}}>{eM.name||"New Member"}</h2>
            <Badge v={UB[eM.unit]||"muted"}>{eM.unit}</Badge><Badge v={eM.entity==="Ignite"?"blue":eM.entity==="JJP"?"orange":"muted"}>{eM.entity}</Badge>
            {eM.inactive&&<Badge v="red">INACTIVE</Badge>}
            {!eM.inactive&&floorOk&&latestWeek&&<Badge v="green">{ytdRaw>=FLOOR_ANNUAL?"$100K UNLOCKED":"ABOVE TIER"}</Badge>}
            {!eM.inactive&&!floorOk&&latestWeek&&<Badge v="red">BELOW FLOOR</Badge>}
            <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
              <button onClick={function(){upM(editMemberId,function(x){x.inactive=!x.inactive;return x;});log(eM.inactive?"MEMBER_REACTIVATED":"MEMBER_DEACTIVATED",eM.name);showToast(eM.name+(eM.inactive?" reactivated":" deactivated"));}} style={{padding:"4px 10px",borderRadius:5,fontSize:12,fontFamily:FM,fontWeight:600,border:"1px solid "+(eM.inactive?C.green:C.orange)+"44",color:eM.inactive?C.green:C.orange,background:"transparent",cursor:"pointer"}}>{eM.inactive?"Reactivate":"Deactivate"}</button>
              <button onClick={function(){setConfirm({msg:"Delete "+eM.name+" from the roster?\n\nThis removes the member entirely. Their charge data in existing weeks will remain but show as UNMATCHED.\n\nConsider Deactivate instead if they may return.",fn:function(){setMembers(function(p){return p.filter(function(m){return m.id!==editMemberId;});});setView("team");setEditMemberId(null);setConfirm(null);log("MEMBER_DELETED",eM.name);showToast(eM.name+" deleted");}});}} style={{padding:"4px 10px",borderRadius:5,fontSize:12,fontFamily:FM,fontWeight:600,border:"1px solid "+C.red+"44",color:C.red,background:"transparent",cursor:"pointer"}}>Delete</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:14}}>
            <Stat l="YTD Raw" v={fmtD(ytdRaw)} c={ytdRaw>=FLOOR_ANNUAL?C.green:C.accent}/><Stat l="QTD Raw" v={fmtD(qtd)} c={floorOk?C.green:C.red} s={qtdPct+"% of $25K"}/><Stat l="Weeks Loaded" v={memberWeeks.length} c={C.blue}/><Stat l="Total Comm" v={fmtD(totalComm)} c={C.green}/><Stat l="Tier Deductions" v={fmtD(totalDeductions)} c={totalDeductions>0?C.red:C.textDim}/><Stat l="DH Eligible" v={floorOk?"YES":"NO"} c={floorOk?C.green:C.red} s={floorOk&&latestWeek&&latestWeek.crossDate?"Crossed WE "+latestWeek.crossDate:floorOk?"Flat/exempt":"Need $25K QTD tier"}/>{eM.guarantee&&eM.guarantee.active&&<Stat l="Floor" v={fmtD(eM.guarantee.amount)+"/wk"} c={eM.guarantee.endDate&&eM.guarantee.endDate<new Date().toISOString().slice(0,10)?C.red:C.accent} s={eM.guarantee.endDate?"Through "+eM.guarantee.endDate:"No end date"}/>}<Stat l="DH Pipeline" v={memberDH.length} c={memberDH.length?C.teal:C.textDim} s={memberDH.length?fmtD(dhTotal)+" raw":""}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:10}}>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={Object.assign({},card,{padding:12})}><h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.textDim,fontFamily:FM,letterSpacing:"1px",borderBottom:"1px solid "+C.border,paddingBottom:4}}>PROFILE</h3>
              {[["Name","name"],["Email","email"],["Leader","manager"],["Notes","notes"]].map(function(f){return <div key={f[1]} style={{marginBottom:5}}><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM}}>{f[0].toUpperCase()}{f[1]==="email"&&eM.name&&eM.name!=="New Member"&&<button onClick={function(){var parts=eM.name.trim().split(" ");if(parts.length>=2){var auto=(parts[0][0]+parts[parts.length-1]).toLowerCase()+"@"+(config.branding&&config.branding.emailDomain||"sparkcompanies.com");upM(editMemberId,function(x){x.email=auto;return x;});showToast("Email set to "+auto);}}} style={{marginLeft:6,padding:"1px 6px",fontSize:10,borderRadius:3,border:"1px solid "+C.accent+"44",color:C.accent,background:"transparent",cursor:"pointer",fontFamily:FM}}>{eM.email?"Regenerate":"Auto-generate"}</button>}</label><input value={eM[f[1]]||""} onChange={function(e){upM(editMemberId,function(x){x[f[1]]=e.target.value;return x;});}} type={f[1]==="email"?"email":"text"} placeholder={f[1]==="email"?(eM.name&&eM.name!=="New Member"?(eM.name.trim().split(" ")[0][0]+eM.name.trim().split(" ").pop()).toLowerCase()+"@"+(config.branding&&config.branding.emailDomain||"sparkcompanies.com"):"name@sparkcompanies.com"):""} style={inp}/></div>;})}
              <div style={{marginBottom:5}}><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM}}>REP VIEW PIN</label><div style={{display:"flex",gap:6,alignItems:"center"}}><input value={eM.pin||""} readOnly style={Object.assign({},inp,{width:100,letterSpacing:"4px",textAlign:"center",fontSize:16,background:C.bgSurface,cursor:"default",color:C.accent,fontWeight:700})}/><button onClick={function(){var np=genPin(members);upM(editMemberId,function(x){x.pin=np;return x;});log("PIN_RESET",eM.name+" → "+np);showToast("New PIN: "+np);}} style={{padding:"4px 10px",borderRadius:5,fontSize:12,fontFamily:FM,fontWeight:600,border:"1px solid "+C.accent+"44",color:C.accent,background:"transparent",cursor:"pointer"}}>Regenerate</button><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>6-digit · auto-assigned · unique</span></div></div>              <div style={{marginBottom:5}}><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM}}>CAREER PATH</label><select value={eM.careerPath} onChange={function(e){var v=e.target.value;upM(editMemberId,function(x){x.careerPath=v;var cp=config.careerPaths.find(function(c){return c.name===v;});if(cp){x.rates=Object.assign({},x.rates,{fdDH:cp.fdDH||0,sDH:cp.sDH||0,fdA:cp.fdA||0,sA:cp.sA||0,flat:cp.flat||0});}else{var cpDef=CP_DEFAULTS.find(function(c){return c[0]===v;});if(cpDef){x.rates={fdDH:cpDef[1],sDH:cpDef[2],fdA:cpDef[3],sA:cpDef[4],flat:cpDef[5],drRate:x.rates.drRate||cpDef[6]};}}return x;});}} style={inp}><option value="">— Select —</option>{config.careerPaths.map(function(c){return <option key={c.name||c.id} value={c.name}>{c.name}{c.flat>0?" ("+Math.round(c.flat*100)+"% flat)":""}</option>;})}{CP_DEFAULTS.filter(function(c){return!config.careerPaths.find(function(cp){return cp.name===c[0];});}).map(function(c){return <option key={c[0]} value={c[0]}>{c[0]}{c[5]>0?" ("+Math.round(c[5]*100)+"% flat)":""}</option>;})}</select></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}><div><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM}}>ENTITY</label><select value={eM.entity} onChange={function(e){upM(editMemberId,function(x){x.entity=e.target.value;return x;});}} style={inp}>{ENTITIES.map(function(e){return <option key={e}>{e}</option>;})}</select></div><div><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM}}>UNIT</label><select value={eM.unit} onChange={function(e){upM(editMemberId,function(x){x.unit=e.target.value;return x;});}} style={inp}>{UNITS.map(function(u){return <option key={u}>{u}</option>;})}</select></div></div></div>
            <div style={Object.assign({},card,{padding:12})}><h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.textDim,fontFamily:FM,letterSpacing:"1px",borderBottom:"1px solid "+C.border,paddingBottom:4}}>COMMISSION RATES</h3>
                {[["DH Full Desk","fdDH"],["DH Split","sDH"],["Assignment Full Desk","fdA"],["Assignment Split","sA"],["Flat Rate","flat"]].map(function(f){return <div key={f[1]} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><span style={{fontSize:13,fontFamily:FM,color:C.textMuted}}>{f[0]}</span><div style={{display:"flex",alignItems:"center",gap:2}}><input type="number" step="1" value={Math.round(eM.rates[f[1]]*100*100)/100} onChange={function(e){upM(editMemberId,function(x){x.rates=Object.assign({},x.rates);x.rates[f[1]]=(+e.target.value||0)/100;return x;});}} style={{width:50,padding:"3px 5px",fontSize:14,borderRadius:3,textAlign:"right",fontFamily:FM}}/><span style={{fontSize:13,color:C.textDim,fontFamily:FM}}>%</span></div></div>;})}</div>
              {/* Direct Report Commission */}
              <div style={Object.assign({},card,{padding:12,marginTop:6})}>
                <h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.textDim,fontFamily:FM,letterSpacing:"1px",borderBottom:"1px solid "+C.border,paddingBottom:4}}>DIRECT REPORT OVERRIDE</h3>
                <p style={{fontSize:11,color:C.textDim,margin:"0 0 6px",fontFamily:FM}}>This member receives a % of their direct reports' charge totals</p>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:13,fontFamily:FM,color:C.textMuted}}>DR Override Rate</span>
                  <div style={{display:"flex",alignItems:"center",gap:2}}>
                    <input type="number" step="0.1" value={Math.round((eM.rates.drRate||0)*100*100)/100} onChange={function(e){upM(editMemberId,function(x){x.rates=Object.assign({},x.rates);x.rates.drRate=(+e.target.value||0)/100;return x;});}} style={{width:50,padding:"3px 5px",fontSize:14,borderRadius:3,textAlign:"right",fontFamily:FM}}/>
                    <span style={{fontSize:13,color:C.textDim,fontFamily:FM}}>%</span>
                  </div>
                </div>
                <div style={{marginBottom:4}}><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM}}>DIRECT REPORTS (comma-separated names)</label>
                  <input value={eM.drMembers||""} onChange={function(e){upM(editMemberId,function(x){x.drMembers=e.target.value;return x;});}} placeholder="e.g. Anthony Caucci, Nick Greenfelder" style={Object.assign({},inp,{width:"100%",fontSize:12})}/>
                </div>
                {eM.rates.drRate>0&&eM.drMembers&&<div style={{marginTop:4,padding:"4px 8px",background:C.greenDim,borderRadius:4,border:"1px solid "+C.green+"22"}}><span style={{fontSize:11,color:C.green,fontFamily:FM}}>{eM.name} earns {Math.round(eM.rates.drRate*10000)/100}% on charge totals from: {eM.drMembers}</span></div>}
              </div>
              {/* Manual Payouts History */}
              {function(){var mPayouts=(payrollOverrides._manualPayouts||[]).filter(function(p){return p.memberId===editMemberId;});
                if(mPayouts.length===0)return null;
                return <div style={Object.assign({},card,{padding:12,marginTop:6})}><h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.textDim,fontFamily:FM,letterSpacing:"1px",borderBottom:"1px solid "+C.border,paddingBottom:4}}>MANUAL PAYOUTS</h3>
                  <div style={{maxHeight:"15vh",overflowY:"auto"}}>{mPayouts.map(function(p,pi){return <div key={pi} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid "+C.border+"44"}}><div><span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:FM}}>{fmtD(p.amount)}</span><span style={{fontSize:11,color:C.textDim,fontFamily:FM,marginLeft:6}}>{p.reason||"Manual payout"}</span></div><span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>WE {p.weekEnding||"N/A"}</span></div>;})}</div>
                  <div style={{marginTop:4,paddingTop:4,borderTop:"1px solid "+C.border}}><span style={{fontSize:13,fontWeight:700,color:C.accent,fontFamily:FM}}>Total Manual: {fmtD(mPayouts.reduce(function(a,p){return a+p.amount;},0))}</span></div>
                </div>;
              }()}
              {/* Guaranteed Commission */}
              <div style={{marginTop:6,padding:"8px 10px",background:C.bg,borderRadius:4,border:"1px solid "+C.border}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM}}>WEEKLY FLOOR</label>
                  <input type="checkbox" checked={eM.guarantee&&eM.guarantee.active} onChange={function(e){upM(editMemberId,function(x){x.guarantee=Object.assign({},x.guarantee||{amount:0,endDate:"",active:false},{active:e.target.checked});return x;});}} style={{width:14,height:14,cursor:"pointer"}}/>
                  <span style={{fontSize:12,color:eM.guarantee&&eM.guarantee.active?C.green:C.textDim,fontFamily:FM}}>{eM.guarantee&&eM.guarantee.active?"Active":"Off"}</span>
                </div>
                {eM.guarantee&&eM.guarantee.active&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <div><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM}}>$/WEEK</label><div style={{display:"flex",alignItems:"center",gap:3}}><span style={{color:C.textDim}}>$</span><input type="number" value={(eM.guarantee&&eM.guarantee.amount)||0} onChange={function(e){upM(editMemberId,function(x){x.guarantee=Object.assign({},x.guarantee||{},{amount:+e.target.value||0});return x;});}} style={Object.assign({},inp,{width:"100%"})} step="1"/></div></div>
                  <div><label style={{fontSize:11,color:C.textDim,fontWeight:700,fontFamily:FM}}>END DATE</label><input type="date" value={(eM.guarantee&&eM.guarantee.endDate)||""} onChange={function(e){upM(editMemberId,function(x){x.guarantee=Object.assign({},x.guarantee||{},{endDate:e.target.value});return x;});}} style={inp}/></div>
                </div>}
                {eM.guarantee&&eM.guarantee.active&&eM.guarantee.endDate&&new Date(eM.guarantee.endDate)<NOW&&<p style={{fontSize:11,color:C.red,margin:"4px 0 0",fontFamily:FM}}>Guarantee expired {eM.guarantee.endDate}</p>}
              </div>
              <button onClick={function(){setConfirm({msg:"Remove "+eM.name+"?",fn:function(){setMembers(function(p){return p.filter(function(e){return e.id!==editMemberId;});});setView("team");setConfirm(null);log("REMOVE",eM.name);}});}} style={{background:"transparent",border:"1px solid "+C.red+"66",color:C.red,padding:"5px 12px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM}}>REMOVE MEMBER</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={Object.assign({},card,{padding:12})}><h3 style={{fontSize:12,fontWeight:700,margin:"0 0 8px",color:C.textDim,fontFamily:FM,letterSpacing:"1px",borderBottom:"1px solid "+C.border,paddingBottom:4}}>FLOOR PROGRESS</h3>
                <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,color:C.textMuted,fontFamily:FM}}>QTD: {fmtD(qtd)}</span><span style={{fontSize:13,color:floorOk?C.green:C.red,fontFamily:FM,fontWeight:600}}>{fmtD(FLOOR)}</span></div>
                    <div style={{height:8,background:C.bg,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:qtdPct+"%",background:qtdPct>=100?"linear-gradient(90deg,"+C.green+","+C.teal+")":qtdPct>=60?"linear-gradient(90deg,"+C.orange+","+C.accent+")":"linear-gradient(90deg,"+C.red+","+C.orange+")",borderRadius:4,transition:"width .3s ease"}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>{qtdPct}%</span><span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>{floorOk?"No deduction":"$2,500/wk deduction"}</span></div>
                  </div>{ytdRaw>=FLOOR_ANNUAL&&<div style={{textAlign:"center",padding:"4px 10px",background:C.greenDim,border:"1px solid "+C.green+"33",borderRadius:4}}><p style={{fontSize:18,fontWeight:800,color:C.green,margin:0,fontFamily:FM}}>$100K</p><p style={{fontSize:11,color:C.green,margin:0,fontFamily:FM}}>UNLOCKED</p></div>}</div>
              </div>
              <div style={Object.assign({},card,{overflow:"hidden"})}><div style={{padding:"5px 10px",borderBottom:"1px solid "+C.border,background:C.bg,borderLeft:"2px solid #FFD70066"}}><h3 style={{fontSize:13,fontWeight:600,color:C.textDim,letterSpacing:".6px",margin:0,fontFamily:FM}}>WEEK-BY-WEEK HISTORY</h3></div>
                {memberWeeks.length===0&&<div style={{padding:16,textAlign:"center"}}><p style={{color:C.textDim,fontSize:13,fontFamily:FM,margin:0}}>No charge data yet</p></div>}
                {memberWeeks.length>0&&<div style={{overflow:"auto",maxHeight:"28vh"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={th}>Week</th><th style={Object.assign({},th,{textAlign:"right"})}>Raw</th><th style={Object.assign({},th,{textAlign:"right"})}>Split Rec</th><th style={Object.assign({},th,{textAlign:"right"})}>Split AM</th><th style={Object.assign({},th,{textAlign:"right"})}>Full Desk</th><th style={Object.assign({},th,{textAlign:"right"})}>Deduct</th><th style={Object.assign({},th,{textAlign:"right"})}>Comm</th><th style={Object.assign({},th,{textAlign:"center"})}>Tier</th><th style={Object.assign({},th,{textAlign:"center"})}>DH</th></tr></thead>
                <tbody>{memberWeeks.map(function(w){return <tr key={w.weekEnding} className="trow"><td style={Object.assign({},td,{fontWeight:600})}>{w.weekEnding}</td><td style={Object.assign({},td,{textAlign:"right"})}>{fmtD(w.rawCharge)}</td><td style={Object.assign({},td,{textAlign:"right",color:C.textMuted})}>{fmtD(w.splitRec)}</td><td style={Object.assign({},td,{textAlign:"right",color:C.textMuted})}>{fmtD(w.splitAM)}</td><td style={Object.assign({},td,{textAlign:"right",color:C.textMuted})}>{fmtD(w.fullDesk)}</td><td style={Object.assign({},td,{textAlign:"right",color:w.deduction>0?C.red:C.textDim})}>{w.deduction>0?"-"+fmtD(w.deduction):"--"}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:w.totalComm>0?C.green:C.textDim})}>{w.totalComm>0?fmtD(w.totalComm):"$0"}</td><td style={Object.assign({},td,{textAlign:"center"})}>{w.belowFloor?<Badge v="red">{Math.round(w.qtd/FLOOR*100)}%</Badge>:<Badge v="green">OK</Badge>}</td><td style={Object.assign({},td,{textAlign:"center"})}>{w.dhEligible?<Badge v="green">YES</Badge>:<Badge v="red">NO</Badge>}</td></tr>;})}</tbody>
                <tfoot><tr style={{borderTop:"1px solid "+C.accent+"33"}}><td style={Object.assign({},td,{fontWeight:700,color:C.accent})}>TOTALS</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.accent})}>{fmtD(totalRaw)}</td><td colSpan="3" style={td}></td><td style={Object.assign({},td,{textAlign:"right",fontWeight:600,color:totalDeductions>0?C.red:C.textDim})}>{totalDeductions>0?"-"+fmtD(totalDeductions):"--"}</td><td style={Object.assign({},td,{textAlign:"right",fontWeight:700,color:C.green})}>{fmtD(totalComm)}</td><td colSpan="2" style={td}></td></tr></tfoot></table></div>}
              </div>
              {/* ── DH PIPELINE ── */}
              <div style={Object.assign({},card,{overflow:"hidden",border:memberDH.length>0?"1px solid "+C.teal+"33":"1px solid "+C.border})}><div style={{padding:"8px 12px",borderBottom:"1px solid "+C.border,background:memberDH.length>0?"linear-gradient(90deg,"+C.teal+"11,transparent)":C.bg,borderLeft:"3px solid "+(memberDH.length>0?C.teal:C.border),display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <h3 style={{fontSize:13,fontWeight:700,color:memberDH.length>0?C.teal:C.textDim,letterSpacing:".6px",margin:0,fontFamily:FM}}>DIRECT HIRE PIPELINE</h3>
                {memberDH.length>0&&<span style={{fontSize:13,fontWeight:700,color:C.teal,fontFamily:FM}}>{memberDH.length} deal{memberDH.length>1?"s":""} · {fmtD(dhTotal)} raw</span>}
              </div>
                {memberDH.length===0&&<div style={{padding:16,textAlign:"center"}}><p style={{color:C.textDim,fontSize:13,fontFamily:FM,margin:0}}>No DH deals linked to {eM.name.split(" ")[0]}</p></div>}
                {memberDH.length>0&&<div style={{padding:10}}>
                  {/* Pipeline summary bar */}
                  {function(){
                    var rdyCount=memberDH.filter(function(d){return isReady(d)&&!d.paidOut;}).length;
                    var activeCount=memberDH.filter(function(d){return(d.st==="o"||d.st==="p")&&!d.paidOut;}).length;
                    var paidCount=memberDH.filter(function(d){return d.paidOut||d.st==="d";}).length;
                    var termCount=memberDH.filter(function(d){return d.st==="t";}).length;
                    var potentialPayout=memberDH.filter(function(d){
                      var crossDt=latestWeek?latestWeek.crossDate:null;var ds=d.sd||"";var hf=latestWeek&&!latestWeek.belowFloor;
                      return hf&&(!crossDt||!ds||ds>=crossDt)&&!d.paidOut&&d.st!=="t";
                    }).reduce(function(a,d){var rate=eM.rates[d.typ==="FD"?"fdDH":"sDH"]||0;return a+d.raw*rate;},0);
                    return <div style={{display:"flex",gap:8,marginBottom:14}}>
                      {rdyCount>0&&<div style={{flex:1,padding:"6px 10px",background:C.greenDim,borderRadius:4,border:"1px solid "+C.green+"33",textAlign:"center"}}><p style={{fontSize:18,fontWeight:800,color:C.green,margin:0,fontFamily:FM}}>{rdyCount}</p><p style={{fontSize:11,color:C.green,margin:0,fontFamily:FM}}>Ready</p></div>}
                      {activeCount>0&&<div style={{flex:1,padding:"6px 10px",background:C.orangeDim,borderRadius:4,border:"1px solid "+C.orange+"33",textAlign:"center"}}><p style={{fontSize:18,fontWeight:800,color:C.orange,margin:0,fontFamily:FM}}>{activeCount}</p><p style={{fontSize:11,color:C.orange,margin:0,fontFamily:FM}}>On Guarantee</p></div>}
                      {paidCount>0&&<div style={{flex:1,padding:"6px 10px",background:C.purpleDim,borderRadius:4,border:"1px solid "+C.purple+"33",textAlign:"center"}}><p style={{fontSize:18,fontWeight:800,color:C.purple,margin:0,fontFamily:FM}}>{paidCount}</p><p style={{fontSize:11,color:C.purple,margin:0,fontFamily:FM}}>Paid</p></div>}
                      {termCount>0&&<div style={{flex:1,padding:"6px 10px",background:C.redDim,borderRadius:4,border:"1px solid "+C.red+"33",textAlign:"center"}}><p style={{fontSize:18,fontWeight:800,color:C.red,margin:0,fontFamily:FM}}>{termCount}</p><p style={{fontSize:11,color:C.red,margin:0,fontFamily:FM}}>Termed</p></div>}
                      {potentialPayout>0&&<div style={{flex:1,padding:"6px 10px",background:C.accentDim,borderRadius:4,border:"1px solid "+C.accent+"33",textAlign:"center"}}><p style={{fontSize:16,fontWeight:800,color:C.accent,margin:0,fontFamily:FM}}>{fmtD(potentialPayout)}</p><p style={{fontSize:11,color:C.accent,margin:0,fontFamily:FM}}>Est. Payout</p></div>}
                    </div>;
                  }()}
                  {/* Deal cards */}
                  {memberDH.sort(function(a,b){
                    if(isReady(a)&&!a.paidOut)return -1;if(isReady(b)&&!b.paidOut)return 1;
                    var ord={o:1,p:2,c:3,d:4,t:5};return(ord[a.st]||9)-(ord[b.st]||9);
                  }).map(function(d,i){
                    var crossDt=latestWeek?latestWeek.crossDate:null;var dealStart=d.sd||"";
                    var hasFloor=latestWeek&&!latestWeek.belowFloor;
                    var elig=hasFloor&&(!crossDt||!dealStart||dealStart>=crossDt);
                    var rdy=isReady(d)&&!d.paidOut;
                    var dt=d.cd?daysTo(d.cd):null;
                    var rate=eM.rates[d.typ==="FD"?"fdDH":"sDH"]||0;
                    var estPay=elig?d.raw*rate:0;
                    var reason=!hasFloor?"Below $25K QTD tier — need "+fmtD(FLOOR-qtd)+" more":(!elig&&dealStart&&crossDt&&dealStart<crossDt?"Started before crossing $25K":"");
                    var stColor=rdy?C.green:d.paidOut?C.purple:d.st==="t"?C.red:d.st==="o"||d.st==="p"?C.orange:d.st==="c"?C.teal:C.textDim;
                    var stLabel=rdy?"\u2713 Ready to Pay":d.paidOut?"Paid Out":d.st==="t"?"Terminated":d.st==="o"?"On Guarantee":d.st==="p"?"Pending Start":d.st==="c"?"Cleared":"Done";
                    return <div key={i} style={{padding:"8px 10px",marginBottom:4,borderRadius:4,background:rdy?C.greenDim:d.paidOut?C.purpleDim+"44":"transparent",border:"1px solid "+(rdy?C.green:C.border)+"44",borderLeft:"3px solid "+stColor}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:FU}}>{d.can}</span>
                          <span style={{fontSize:13,color:C.textMuted,marginLeft:6,fontFamily:FM}}>@ {d.cl}</span>
                          <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
                            <Badge v={d.typ==="FD"?"gold":"muted"}>{d.typ==="FD"?"Full Desk":"Split"}</Badge>
                            <span style={{fontSize:12,color:stColor,fontWeight:600,fontFamily:FM}}>{stLabel}</span>
                            {dt!==null&&dt>0&&<span style={{fontSize:12,color:C.textDim,fontFamily:FM}}>{dt}d to clear</span>}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <p style={{fontSize:15,fontWeight:700,color:C.text,margin:0,fontFamily:FM}}>{fmtD(d.raw)}</p>
                          {elig&&estPay>0&&<p style={{fontSize:12,fontWeight:600,color:C.green,margin:"2px 0 0",fontFamily:FM}}>{(rate*100)+"% = "+fmtD(estPay)}</p>}
                          {!elig&&!d.paidOut&&d.st!=="t"&&<p style={{fontSize:11,color:C.red,margin:"2px 0 0",fontFamily:FM}}>{reason||"Not eligible"}</p>}
                        </div>
                      </div>
                      {dt!==null&&dt>0&&d.gd>0&&<div style={{height:3,background:C.bg,borderRadius:2,overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:Math.max(0,Math.round((1-dt/d.gd)*100))+"%",background:dt<=7?"linear-gradient(90deg,"+C.green+","+C.teal+")":dt<=30?C.orange:C.blue,borderRadius:2}}/></div>}
                    </div>;
                  })}
                </div>}
              </div>
            </div>
          </div>
        </div>;}()}
        {/* ════════ RECON ════════ */}
        {view==="recon"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0,fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Reconciliation ({anomalies.length})</h2>
            <div style={{display:"flex",gap:6}}>
              {anomalies.length>0&&<button onClick={function(){setDismissedRecon(function(p){return p.concat(anomalies.map(function(a){return a.msg;}));});showToast("All notices dismissed");}} style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600,border:"1px solid "+C.border,color:C.textDim,background:"transparent"}}>Dismiss All</button>}
              {dismissedRecon.length>0&&<button onClick={function(){setDismissedRecon([]);showToast("Dismissed notices restored");}} style={{padding:"4px 12px",borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:FM,fontWeight:600,border:"1px solid "+C.orange+"44",color:C.orange,background:"transparent"}}>Restore Dismissed ({dismissedRecon.length})</button>}
            </div>
          </div>
          {anomalies.length===0&&<div style={Object.assign({},card,{padding:20,textAlign:"center"})}><p style={{color:C.green,fontSize:15,fontFamily:FM}}>ALL CLEAR{dismissedRecon.length>0?" ("+dismissedRecon.length+" dismissed)":""}</p></div>}
          {anomalies.length>0&&<div style={Object.assign({},card,{overflow:"auto"})}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={Object.assign({},th,{width:80})}>Severity</th><th style={th}>Finding</th><th style={Object.assign({},th,{width:80,textAlign:"center"})}>Action</th></tr></thead>
          <tbody>{anomalies.map(function(a,i){return <tr key={i} className="trow" style={{borderLeft:"2px solid "+(a.type==="err"?C.red:C.orange)}}><td style={td}><Badge v={a.type==="err"?"red":"orange"}>{a.type==="err"?"ERR":"WARN"}</Badge></td><td style={Object.assign({},td,{fontSize:14})}>{a.msg}</td><td style={Object.assign({},td,{textAlign:"center"})}><button onClick={function(){setDismissedRecon(function(p){return p.concat([a.msg]);});showToast("Dismissed");}} style={{padding:"2px 8px",fontSize:11,borderRadius:3,border:"1px solid "+C.border,color:C.textDim,background:"transparent",cursor:"pointer",fontFamily:FM}}>Dismiss</button></td></tr>;})}</tbody></table></div>}
        </div>}
        {/* ════════ AUDIT ════════ */}
        {view==="audit"&&<div style={{animation:"fadeIn .3s ease"}}>
          <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 10px",fontFamily:FU,color:C.text,borderBottom:"2px solid #FFD70033",paddingBottom:4,display:"inline-block"}}>Audit Log ({auditLog.length})</h2>
          {auditLog.length===0&&<div style={Object.assign({},card,{padding:20,textAlign:"center"})}><p style={{color:C.textDim,fontSize:15,fontFamily:FM}}>No events yet.</p></div>}
          {auditLog.length>0&&<div style={Object.assign({},card,{overflow:"auto",maxHeight:"65vh"})}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={th}>Time</th><th style={th}>Action</th><th style={th}>Detail</th></tr></thead>
          <tbody>{auditLog.map(function(e,i){var dt=new Date(e.ts);return <tr key={i} className="trow"><td style={Object.assign({},td,{fontSize:13,color:C.textDim,whiteSpace:"nowrap"})}>{dt.toLocaleDateString()+" "+dt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td><td style={td}><Badge v="blue">{e.action}</Badge></td><td style={Object.assign({},td,{fontSize:14})}>{e.detail}</td></tr>;})}</tbody></table></div>}
        </div>}
        {/* ════════ ADMIN SETTINGS ════════ */}
        {view==="admin"&&<div style={{animation:"fadeIn .3s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Icon name="settings" sz={18} cl={C.accent}/><h2 style={{fontSize:20,fontWeight:800,margin:0,fontFamily:FU,color:C.text}}>Admin Settings</h2></div>
          {function(){
            var tabs=[{id:"floors",label:"Floor Thresholds"},{id:"paths",label:"Career Paths"},{id:"entities",label:"Entities"},{id:"units",label:"Business Units"},{id:"branding",label:"Branding"},{id:"data",label:"Data Management"}];
            var inputS={padding:"6px 8px",fontSize:14,borderRadius:4,fontFamily:FM,background:C.bgCard,border:"1px solid "+C.border,color:C.text,width:"100%"};
            var labelS={fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 3px",fontFamily:FM,letterSpacing:".5px",textTransform:"uppercase"};
            return <div>
              <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>{tabs.map(function(t){return <button key={t.id} onClick={function(){setAdminTab(t.id);}} style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,fontWeight:adminTab===t.id?700:400,background:adminTab===t.id?C.accent+"22":"transparent",border:"1px solid "+(adminTab===t.id?C.accent:C.border),color:adminTab===t.id?C.accent:C.textMuted}}>{t.label}</button>;})}</div>
              {/* ── TIER THRESHOLDS ── */}
              {adminTab==="floors"&&<div className="panel"><div className="panel-hdr"><h3>Floor Thresholds</h3></div><div className="panel-body" style={{padding:14}}>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 12px",fontFamily:FM}}>These thresholds control the commission tier logic across all team members.</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  <div><p style={labelS}>Weekly Minimum</p><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:14,color:C.textDim}}>$</span><input type="number" value={config.floors.weekly} onChange={function(e){var v=+e.target.value||0;setConfig(function(p){return Object.assign({},p,{floors:Object.assign({},p.floors,{weekly:v})});});}} style={inputS}/></div><p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>Below this weekly raw = $0 commission</p></div>
                  <div><p style={labelS}>Quarterly Floor (QTD)</p><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:14,color:C.textDim}}>$</span><input type="number" value={config.floors.quarterly} onChange={function(e){var v=+e.target.value||0;setConfig(function(p){return Object.assign({},p,{floors:Object.assign({},p.floors,{quarterly:v})});});}} style={inputS}/></div><p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>Must cross this QTD for DH eligibility & full raw commission</p></div>
                  <div><p style={labelS}>Annual Unlock (YTD)</p><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:14,color:C.textDim}}>$</span><input type="number" value={config.floors.annual} onChange={function(e){var v=+e.target.value||0;setConfig(function(p){return Object.assign({},p,{floors:Object.assign({},p.floors,{annual:v})});});}} style={inputS}/></div><p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>Floor off for rest of year once crossed</p></div>
                </div>
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.border}}>
                  <p style={labelS}>DH Default Guarantee Days</p>
                  <input type="number" value={config.dhDefaults.guaranteeDays} onChange={function(e){var v=+e.target.value||90;setConfig(function(p){return Object.assign({},p,{dhDefaults:Object.assign({},p.dhDefaults,{guaranteeDays:v})});});}} style={Object.assign({},inputS,{width:100})}/>
                </div>
              </div></div>}
              {/* ── CAREER PATHS ── */}
              {adminTab==="paths"&&<div className="panel"><div className="panel-hdr"><h3>Career Path Templates ({config.careerPaths.length})</h3><button onClick={function(){var id="cp"+Date.now();setConfig(function(p){return Object.assign({},p,{careerPaths:p.careerPaths.concat([{id:id,name:"New Path",fdDH:0.15,sDH:0.06,fdA:0.15,sA:0.06,flat:0,dhExempt:false}])});});}} className="btn-ghost" style={{padding:"3px 10px",borderRadius:3,fontSize:12,cursor:"pointer",fontFamily:FM}}>+ ADD PATH</button></div><div className="panel-body" style={{padding:8,maxHeight:"55vh",overflowY:"auto"}}>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 10px",fontFamily:FM}}>Define rate templates. Assign a path to a team member to auto-fill their rates.</p>
                <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
                  <th style={Object.assign({},th,{minWidth:180})}>Path Name</th>
                  <th style={Object.assign({},th,{textAlign:"center",width:70})}>FD Rate</th>
                  <th style={Object.assign({},th,{textAlign:"center",width:70})}>Split Rate</th>
                  <th style={Object.assign({},th,{textAlign:"center",width:70})}>FD DH</th>
                  <th style={Object.assign({},th,{textAlign:"center",width:70})}>Split DH</th>
                  <th style={Object.assign({},th,{textAlign:"center",width:70})}>Flat</th>
                  <th style={Object.assign({},th,{textAlign:"center",width:60})}>DH Exempt</th>
                  <th style={Object.assign({},th,{width:60})}></th>
                </tr></thead><tbody>{config.careerPaths.map(function(cp,idx){
                  var upd=function(field,val){setConfig(function(p){var nPaths=p.careerPaths.slice();nPaths[idx]=Object.assign({},nPaths[idx]);nPaths[idx][field]=val;return Object.assign({},p,{careerPaths:nPaths});});};
                  var pctIn={style:Object.assign({},inputS,{width:60,textAlign:"center"}),type:"number",step:"1",min:"0",max:"100"};
                  var inUse=members.filter(function(m){return m.careerPath===cp.name;}).length;
                  return <tr key={cp.id} className="trow">
                    <td style={td}><input value={cp.name} onChange={function(e){upd("name",e.target.value);}} style={Object.assign({},inputS,{fontWeight:600})}/>{inUse>0&&<span style={{fontSize:11,color:C.textDim,fontFamily:FM,marginLeft:4}}>{inUse} member{inUse>1?"s":""}</span>}</td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><input {...pctIn} value={Math.round(cp.fdA*100)} onChange={function(e){upd("fdA",(+e.target.value||0)/100);}}/><span style={{fontSize:11,color:C.textDim}}>%</span></td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><input {...pctIn} value={Math.round(cp.sA*100)} onChange={function(e){upd("sA",(+e.target.value||0)/100);}}/><span style={{fontSize:11,color:C.textDim}}>%</span></td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><input {...pctIn} value={Math.round(cp.fdDH*100)} onChange={function(e){upd("fdDH",(+e.target.value||0)/100);}}/><span style={{fontSize:11,color:C.textDim}}>%</span></td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><input {...pctIn} value={Math.round(cp.sDH*100)} onChange={function(e){upd("sDH",(+e.target.value||0)/100);}}/><span style={{fontSize:11,color:C.textDim}}>%</span></td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><input {...pctIn} value={Math.round(cp.flat*100)} onChange={function(e){upd("flat",(+e.target.value||0)/100);}}/><span style={{fontSize:11,color:C.textDim}}>%</span></td>
                    <td style={Object.assign({},td,{textAlign:"center"})}><input type="checkbox" checked={cp.dhExempt} onChange={function(e){upd("dhExempt",e.target.checked);}} style={{width:16,height:16,cursor:"pointer"}}/></td>
                    <td style={Object.assign({},td,{textAlign:"center"})}>{inUse===0&&<button onClick={function(){setConfig(function(p){return Object.assign({},p,{careerPaths:p.careerPaths.filter(function(_,i){return i!==idx;})});});}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,fontWeight:700}}>×</button>}</td>
                  </tr>;})}</tbody></table>
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.green,margin:"0 0 6px",fontFamily:FM}}>APPLY PATH TO TEAM MEMBERS</p>
                  <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Select a career path and member below to auto-assign rates.</p>
                  <div style={{display:"flex",gap:6,alignItems:"flex-end",flexWrap:"wrap"}}>
                      <div><p style={labelS}>Career Path</p><select value={applyPath} onChange={function(e){setApplyPath(e.target.value);}} style={Object.assign({},inputS,{width:250})}><option value="">Select path...</option>{config.careerPaths.map(function(cp){return <option key={cp.id} value={cp.id}>{cp.name}</option>;})}</select></div>
                      <div><p style={labelS}>Team Member</p><select value={applyMember} onChange={function(e){setApplyMember(e.target.value);}} style={Object.assign({},inputS,{width:250})}><option value="">Select member...</option>{members.slice().sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(m){return <option key={m.id} value={m.id}>{m.name} — {m.careerPath||"no path"}</option>;})}</select></div>
                      <button disabled={!applyPath||!applyMember} onClick={function(){
                        var cp=config.careerPaths.find(function(p){return p.id===applyPath;});
                        if(!cp)return;
                        setMembers(function(prev){return prev.map(function(m){
                          if(String(m.id)!==applyMember)return m;
                          return Object.assign({},m,{careerPath:cp.name,rates:{fdDH:cp.fdDH,sDH:cp.sDH,fdA:cp.fdA,sA:cp.sA,flat:cp.flat,drRate:m.rates.drRate||0}});
                        });});
                        log("PATH_ASSIGN",cp.name+" → "+members.find(function(m){return String(m.id)===applyMember;}).name);
                        showToast("Rates applied from "+cp.name);setApplyPath("");setApplyMember("");
                      }} className="btn-primary" style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,fontWeight:700,opacity:(!applyPath||!applyMember)?0.4:1}}>APPLY RATES</button>
                    </div>
                </div>
              </div></div>}
              {/* ── ENTITIES ── */}
              {adminTab==="entities"&&<div className="panel"><div className="panel-hdr"><h3>Entities ({config.entities.length})</h3></div><div className="panel-body" style={{padding:14}}>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 10px",fontFamily:FM}}>Portfolio companies shown in team member entity dropdowns.</p>
                {config.entities.map(function(ent,idx){
                  return <div key={idx} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                    <input value={ent} onChange={function(e){setConfig(function(p){var n=p.entities.slice();n[idx]=e.target.value;return Object.assign({},p,{entities:n});});}} style={Object.assign({},inputS,{width:250})}/>
                    <span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>{members.filter(function(m){return m.entity===ent;}).length} members</span>
                    {members.filter(function(m){return m.entity===ent;}).length===0&&<button onClick={function(){setConfig(function(p){return Object.assign({},p,{entities:p.entities.filter(function(_,i){return i!==idx;})});});}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,fontWeight:700}}>×</button>}
                  </div>;
                })}
                <button onClick={function(){setConfig(function(p){return Object.assign({},p,{entities:p.entities.concat(["New Entity"])});});}} className="btn-ghost" style={{padding:"4px 12px",borderRadius:3,fontSize:12,cursor:"pointer",fontFamily:FM,marginTop:6}}>+ ADD ENTITY</button>
              </div></div>}
              {/* ── BUSINESS UNITS ── */}
              {adminTab==="units"&&<div className="panel"><div className="panel-hdr"><h3>Business Units ({config.units.length})</h3></div><div className="panel-body" style={{padding:14}}>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 10px",fontFamily:FM}}>Business units with assigned badge colors.</p>
                {function(){
                  var colors=["blue","purple","teal","orange","gold","green","red","muted"];
                  return <div>{config.units.map(function(u,idx){
                    return <div key={idx} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                      <input value={u.name} onChange={function(e){setConfig(function(p){var n=p.units.slice();n[idx]=Object.assign({},n[idx],{name:e.target.value});return Object.assign({},p,{units:n});});}} style={Object.assign({},inputS,{width:200})}/>
                      <select value={u.color} onChange={function(e){setConfig(function(p){var n=p.units.slice();n[idx]=Object.assign({},n[idx],{color:e.target.value});return Object.assign({},p,{units:n});});}} style={Object.assign({},inputS,{width:100})}>{colors.map(function(c){return <option key={c} value={c}>{c}</option>;})}</select>
                      <Badge v={u.color}>{u.name}</Badge>
                      <span style={{fontSize:11,color:C.textDim,fontFamily:FM}}>{members.filter(function(m){return m.unit===u.name;}).length}</span>
                      {members.filter(function(m){return m.unit===u.name;}).length===0&&<button onClick={function(){setConfig(function(p){return Object.assign({},p,{units:p.units.filter(function(_,i){return i!==idx;})});});}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,fontWeight:700}}>×</button>}
                    </div>;
                  })}
                  <button onClick={function(){setConfig(function(p){return Object.assign({},p,{units:p.units.concat([{name:"New Unit",color:"blue"}])});});}} className="btn-ghost" style={{padding:"4px 12px",borderRadius:3,fontSize:12,cursor:"pointer",fontFamily:FM,marginTop:6}}>+ ADD UNIT</button>
                  </div>;
                }()}
              </div></div>}
              {/* ── DATA MANAGEMENT ── */}
              {adminTab==="branding"&&<div className="panel"><div className="panel-hdr"><h3>Branding & Statements</h3></div><div className="panel-body" style={{padding:14}}>
                <p style={{fontSize:13,color:C.textMuted,margin:"0 0 12px",fontFamily:FM}}>Customize company branding, email defaults, and commission statement text.</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <div><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM,display:"block",marginBottom:4}}>Company Name</label><input value={(config.branding&&config.branding.companyName)||""} onChange={function(e){setConfig(function(p){return Object.assign({},p,{branding:Object.assign({},p.branding||{},{companyName:e.target.value})});});}} style={inp} placeholder="Spark Companies™"/></div>
                  <div><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM,display:"block",marginBottom:4}}>Email Domain</label><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:C.textDim,fontSize:14,fontFamily:FM}}>@</span><input value={(config.branding&&config.branding.emailDomain)||""} onChange={function(e){setConfig(function(p){return Object.assign({},p,{branding:Object.assign({},p.branding||{},{emailDomain:e.target.value})});});}} style={inp} placeholder="sparkcompanies.com"/></div><p style={{fontSize:11,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>Used for auto-generating member emails (first initial + last name)</p></div>
                </div>
                <div style={{marginBottom:14}}><label style={{fontSize:12,color:C.textDim,fontWeight:700,fontFamily:FM,display:"block",marginBottom:4}}>Statement Footer Note</label><textarea value={(config.branding&&config.branding.statementNote)||""} onChange={function(e){setConfig(function(p){return Object.assign({},p,{branding:Object.assign({},p.branding||{},{statementNote:e.target.value})});});}} rows={3} style={Object.assign({},inp,{resize:"vertical"})} placeholder="Optional note shown at the bottom of all commission statements (e.g. payment terms, contact info)"/></div>
                <div style={{padding:"10px 14px",background:C.bgSurface,borderRadius:6,border:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM}}>AUTO-EMAIL FORMAT</p>
                  <p style={{fontSize:13,color:C.textMuted,margin:0,fontFamily:FM}}>When a new member is added, their email is auto-generated as: <span style={{color:C.accent,fontWeight:600}}>[first initial][last name]@{(config.branding&&config.branding.emailDomain)||"sparkcompanies.com"}</span></p>
                  <p style={{fontSize:12,color:C.textDim,margin:"4px 0 0",fontFamily:FM}}>Example: John Smith → jsmith@{(config.branding&&config.branding.emailDomain)||"sparkcompanies.com"} · Override per-member on their profile card</p>
                </div>
              </div></div>}
              {adminTab==="data"&&<div className="panel"><div className="panel-hdr"><h3>Data Management</h3></div><div className="panel-body" style={{padding:14}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{padding:14,background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
                    <p style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 4px",fontFamily:FM}}>Export Configuration</p>
                    <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Download all settings as a JSON backup file.</p>
                    <button onClick={function(){
                      var json=JSON.stringify(config,null,2);
                      dlFile(json,"SparkV7_Config_"+new Date().toISOString().slice(0,10)+".json","application/json");
                      showToast("Config exported");
                    }} className="btn-ghost" style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM}}>EXPORT CONFIG JSON</button>
                  </div>
                  <div style={{padding:14,background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
                    <p style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 4px",fontFamily:FM}}>Import Configuration</p>
                    <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Upload a previously exported JSON config file.</p>
                    <input type="file" accept=".json" onChange={function(e){
                      var f=e.target.files[0];if(!f)return;var reader=new FileReader();
                      reader.onload=function(ev){try{var parsed=JSON.parse(ev.target.result);setConfig(function(prev){return Object.assign({},prev,parsed);});log("CONFIG_IMPORT","Imported config from "+f.name);showToast("Config imported");}catch(err){showToast("Invalid JSON file","err");}};
                      reader.readAsText(f);
                    }} style={{fontSize:13,fontFamily:FM,color:C.textMuted}}/>
                  </div>
                  <div style={{padding:14,background:C.bg,borderRadius:6,border:"1px solid "+C.border}}>
                    <p style={{fontSize:14,fontWeight:700,color:C.text,margin:"0 0 4px",fontFamily:FM}}>Export Full Data</p>
                    <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Download all data (members, charges, DH, config) as one JSON backup.</p>
                    <button onClick={function(){
                      var full={config:config,members:members,dhData:dhData,chargeWeeks:chargeWeeks,qSnapshots:qSnapshots,auditLog:auditLog.slice(-200),exportDate:new Date().toISOString()};
                      var json=JSON.stringify(full,null,2);
                      dlFile(json,"SparkV7_Backup_"+new Date().toISOString().slice(0,10)+".json","application/json");
                      log("BACKUP_EXPORT","Full backup");showToast("Full backup downloaded");
                    }} className="btn-ghost" style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM}}>EXPORT FULL BACKUP</button>
                  </div>
                  <div style={{padding:14,background:C.bg,borderRadius:6,border:"1px solid "+C.red+"33"}}>
                    <p style={{fontSize:14,fontWeight:700,color:C.red,margin:"0 0 4px",fontFamily:FM}}>Reset to Defaults</p>
                    <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Reset all settings to factory defaults. Does NOT delete team or charge data.</p>
                    <button onClick={function(){setConfirm({msg:"Reset all settings to defaults? This won't delete team data or charge history.",fn:function(){setConfig(DEFAULT_CFG);setConfirm(null);log("CONFIG_RESET","Reset to defaults");showToast("Settings reset to defaults");}});}} style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,fontWeight:700,background:C.red+"22",border:"1px solid "+C.red,color:C.red}}>RESET SETTINGS</button>
                  </div>
                </div>
                {/* Clear All Weeks */}
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>CHARGE DATA</p>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:13,color:C.textMuted,fontFamily:FM}}>{chargeWeeks.length} week{chargeWeeks.length!==1?"s":""} loaded</span>
                    {chargeWeeks.length>0&&<button onClick={function(){setConfirm({msg:"Delete ALL "+chargeWeeks.length+" charge weeks? This removes all commission data and cannot be undone.",fn:function(){var count=chargeWeeks.length;setChargeWeeks([]);sav(SK.weeks,[]);setSelectedWeek(null);setConfirm(null);log("CLEAR_ALL_WEEKS",count+" weeks removed");showToast(count+" charge weeks deleted");}});}} style={{padding:"4px 10px",fontSize:12,borderRadius:4,border:"1px solid "+C.red+"66",color:C.red,background:"transparent",cursor:"pointer",fontFamily:FM,fontWeight:600}}>CLEAR ALL WEEKS</button>}
                  </div>
                </div>
                {/* Quarter Rollover */}
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>QUARTER ROLLOVER</p>
                  <p style={{fontSize:12,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Snapshot current quarter YTD data before starting a new quarter. This preserves the QTD boundary so floor calculations work correctly across quarters.</p>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    {qSnapshots.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{qSnapshots.map(function(s){return <Badge key={s.qKey} v="purple">{s.qKey} ({s.members.length} members)</Badge>;})}</div>}
                    <button onClick={function(){
                      if(!chargeWeeks.length){showToast("No charge weeks to snapshot","err");return;}
                      var latest=chargeWeeks[0];var we=latest.weekEnding;var q=getQ(we);var yr=new Date(we).getFullYear();
                      var qKey="Q"+q+"-"+yr;
                      var doSnap=function(){
                        var snapMembers=latest.rows.filter(function(r){return r.matchedId;}).map(function(r){return{id:r.matchedId,name:r.matchedName,ytdRaw:r.ytdRaw};});
                        setQSnapshots(function(prev){var filtered=prev.filter(function(s){return s.qKey!==qKey;});return filtered.concat([{qKey:qKey,members:snapMembers,createdAt:new Date().toISOString()}]);});
                        log("QUARTER_SNAPSHOT",qKey);showToast(qKey+" snapshot saved");setConfirm(null);
                      };
                      if(qSnapshots.find(function(s){return s.qKey===qKey;})){setConfirm({msg:qKey+" snapshot already exists. Overwrite?",fn:doSnap});return;}
                      doSnap();
                    }} className="btn-primary" style={{padding:"6px 14px",borderRadius:4,fontSize:13,cursor:"pointer",fontFamily:FM,fontWeight:700}}>SNAPSHOT CURRENT QUARTER</button>
                  </div>
                </div>
                {/* Locked Payroll Weeks */}
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>LOCKED PAYROLL WEEKS ({lockedWeeks.length})</p>
                  {lockedWeeks.length===0&&<p style={{fontSize:13,color:C.textMuted,fontFamily:FM,margin:0}}>No weeks locked yet. Lock weeks from the Payroll tab after processing.</p>}
                  {lockedWeeks.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{lockedWeeks.map(function(we){return <div key={we} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:C.greenDim,border:"1px solid "+C.green+"33",borderRadius:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.green,fontFamily:FM}}>🔒 WE {we}</span>
                    <button onClick={function(){setConfirm({msg:"Unlock WE "+we+"?\n\nThis allows the week to be edited, overwritten, or deleted.",fn:function(){setLockedWeeks(function(p){return p.filter(function(x){return x!==we;});});setConfirm(null);log("PAYROLL_UNLOCKED","WE "+we);showToast("WE "+we+" unlocked");}});}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,fontWeight:700,marginLeft:4}}>×</button>
                  </div>;})}</div>}
                </div>
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.border}}>
                {/* Member PIN Status */}
                <div style={{marginBottom:14,paddingBottom:10,borderBottom:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>REP VIEW PINS</p>
                  <p style={{fontSize:13,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Every member gets a unique 6-digit PIN auto-assigned. PINs are required to access Rep View.</p>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <Badge v="green">{members.filter(function(m){return m.pin&&!m.inactive;}).length} active with PIN</Badge>
                    {members.filter(function(m){return!m.pin&&!m.inactive;}).length>0&&<Badge v="orange">{members.filter(function(m){return!m.pin&&!m.inactive;}).length} missing PIN</Badge>}
                  </div>
                  {members.filter(function(m){return!m.pin&&!m.inactive;}).length>0&&<div style={{padding:"8px 12px",background:C.orangeDim,borderRadius:6,border:"1px solid "+C.orange+"33",marginBottom:8}}>
                    <p style={{fontSize:12,fontWeight:600,color:C.orange,margin:"0 0 4px",fontFamily:FM}}>Members without a PIN can't access Rep View:</p>
                    <p style={{fontSize:12,color:C.textMuted,margin:0,fontFamily:FM}}>{members.filter(function(m){return!m.pin&&!m.inactive;}).map(function(m){return m.name;}).join(", ")}</p>
                  </div>}
                  <button onClick={function(){
                    var noPins=members.filter(function(m){return!m.pin&&!m.inactive;});
                    if(!noPins.length){showToast("All active members already have PINs");return;}
                    setConfirm({msg:"Auto-generate unique 6-digit PINs for "+noPins.length+" members who don't have one?\n\nExisting PINs won't be changed. All new PINs are guaranteed unique.",fn:function(){
                      setMembers(function(prev){
                        var updated=prev.slice();
                        updated.forEach(function(m,i){
                          if(m.pin||m.inactive)return;
                          updated[i]=Object.assign({},m,{pin:genPin(updated)});
                        });
                        return updated;
                      });
                      setConfirm(null);log("PINS_GENERATED",noPins.length+" PINs auto-generated");showToast(noPins.length+" PINs generated");
                    }});
                  }} className="btn-ghost" style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:FM,fontWeight:600,cursor:"pointer"}}>Fill Missing PINs</button>
                  <button onClick={function(){
                    setConfirm({msg:"Regenerate ALL PINs for all "+members.filter(function(m){return!m.inactive;}).length+" active members?\n\nThis will replace every existing PIN with a new unique 6-digit code. You'll need to redistribute PINs to the team.",fn:function(){
                      setMembers(function(prev){
                        var updated=prev.map(function(m){return Object.assign({},m,{pin:""});});
                        updated.forEach(function(m,i){if(!m.inactive){updated[i]=Object.assign({},m,{pin:genPin(updated)});}});
                        return updated;
                      });
                      setConfirm(null);log("PINS_REGENERATED_ALL","All PINs reset");showToast("All PINs regenerated");
                    }});
                  }} className="btn-ghost" style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:FM,fontWeight:600,cursor:"pointer"}}>Regenerate All PINs</button>
                  <button onClick={function(){
                    var pinned=members.filter(function(m){return m.pin&&!m.inactive;}).sort(function(a,b){return a.name.localeCompare(b.name);});
                    if(!pinned.length){showToast("No PINs set yet","err");return;}
                    var lines=pinned.map(function(m){return m.name+": "+m.pin;}).join("\n");
                    showExport("Rep View PINs",lines);
                  }} className="btn-ghost" style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:FM,fontWeight:600,cursor:"pointer",marginLeft:6}}>Print PIN List</button>
                </div>
                {/* Admin PIN */}
                <div style={{marginBottom:14,paddingBottom:10,borderBottom:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>ADMIN ACCESS PIN</p>
                  <p style={{fontSize:13,color:C.textMuted,margin:"0 0 8px",fontFamily:FM}}>Set a PIN to protect admin access. Recruiters in Rep View will need this PIN to switch to admin.</p>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="text" value={config.adminPin||""} onChange={function(e){setConfig(function(p){return Object.assign({},p,{adminPin:e.target.value});});}} placeholder="No PIN set" style={{padding:"6px 12px",fontSize:14,borderRadius:6,fontFamily:FM,background:C.bgInput,border:"1px solid "+C.border,color:C.text,width:160}} maxLength={8}/>
                    {config.adminPin?<Badge v="green">PIN Active</Badge>:<Badge v="muted">Open</Badge>}
                    {config.adminPin&&<button onClick={function(){setConfig(function(p){return Object.assign({},p,{adminPin:""});});showToast("PIN removed");}} style={{padding:"4px 10px",fontSize:12,borderRadius:4,border:"1px solid "+C.red+"44",color:C.red,background:"transparent",fontFamily:FM,cursor:"pointer"}}>Remove</button>}
                  </div>
                </div>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>STORAGE OVERVIEW</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    <Stat l="Members" v={members.length}/><Stat l="Charge Weeks" v={chargeWeeks.length} c={C.blue}/><Stat l="DH Deals" v={dhData.length} c={C.teal}/><Stat l="Audit Events" v={auditLog.length} c={C.purple}/>
                  </div>
                </div>
                {/* Backup & Restore */}
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.border}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.textDim,margin:"0 0 8px",fontFamily:FM,letterSpacing:".5px"}}>BACKUP & RESTORE</p>
                  <p style={{fontSize:13,color:C.textMuted,margin:"0 0 10px",fontFamily:FM}}>Export all data as a JSON file for backup or transfer to another device. Import to restore.</p>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={function(){
                      var backup={version:"SparkV7",exportedAt:new Date().toISOString(),members:members,dhData:dhData,chargeWeeks:chargeWeeks,lockedWeeks:lockedWeeks,auditLog:auditLog.slice(-500),qSnapshots:qSnapshots,config:config};
                      var json=JSON.stringify(backup,null,2);
                      dlFile(json,"SparkV7_Backup_"+new Date().toISOString().slice(0,10)+".json","application/json");
                      log("BACKUP_EXPORT","Full backup");showToast("Backup downloaded");
                    }} className="btn-primary" style={{padding:"6px 14px",borderRadius:6,fontSize:13,fontFamily:FM,fontWeight:700}}>EXPORT BACKUP</button>
                    <label style={{padding:"6px 14px",borderRadius:6,fontSize:13,fontFamily:FM,fontWeight:700,border:"1px solid "+C.border,color:C.text,cursor:"pointer",background:C.bgCard,display:"inline-block"}}>
                      IMPORT BACKUP
                      <input type="file" accept=".json,.txt" style={{display:"none"}} onChange={function(e){
                        var f=e.target.files&&e.target.files[0];if(!f)return;
                        var reader=new FileReader();reader.onload=function(ev){
                          try{
                            var data=JSON.parse(ev.target.result);
                            if(!data.version||!data.members){showToast("Invalid backup file","err");return;}
                            setConfirm({msg:"Restore backup from "+new Date(data.exportedAt).toLocaleString()+"?\n\n"+data.members.length+" members, "+(data.chargeWeeks||[]).length+" charge weeks, "+(data.dhData||[]).length+" DH deals\n\nThis will REPLACE all current data.",fn:function(){
                              if(data.members)setMembers(data.members);
                              if(data.dhData)setDhData(data.dhData);
                              if(data.chargeWeeks)setChargeWeeks(data.chargeWeeks);
                              if(data.lockedWeeks)setLockedWeeks(data.lockedWeeks);
                              if(data.auditLog)setAuditLog(data.auditLog);
                              if(data.qSnapshots)setQSnapshots(data.qSnapshots);
                              if(data.config)setConfig(function(prev){return Object.assign({},prev,data.config);});
                              setConfirm(null);log("BACKUP_RESTORE","From "+data.exportedAt);showToast("Backup restored");
                            }});
                          }catch(err){showToast("Failed to parse: "+err.message,"err");}
                        };reader.readAsText(f);e.target.value="";
                      }}/>
                    </label>
                  </div>
                </div>
                {/* Danger Zone */}
                <div style={{marginTop:14,paddingTop:10,borderTop:"1px solid "+C.red+"22"}}>
                  <p style={{fontSize:12,fontWeight:700,color:C.red,margin:"0 0 6px",fontFamily:FM,letterSpacing:".5px"}}>DANGER ZONE</p>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={function(){setConfirm({msg:"Clear ALL "+chargeWeeks.length+" charge weeks?\n\nThis removes all imported charge data and commission calculations. Cannot be undone.",fn:function(){var ct=chargeWeeks.length;setChargeWeeks([]);sav(SK.weeks,[]);setSelectedWeek(null);setConfirm(null);log("CLEAR_ALL_WEEKS",ct+" weeks");showToast(ct+" charge weeks cleared");}});}} style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:FM,fontWeight:600,border:"1px solid "+C.red+"44",color:C.red,background:"transparent"}}>Clear All Charge Weeks</button>
                    <button onClick={function(){setConfirm({msg:"FACTORY RESET — Delete ALL data?\n\nMembers, charge weeks, DH deals, audit history, settings — everything.\n\nExport a backup first!",fn:function(){
                      // Explicitly write empty to all storage keys FIRST
                      sav(SK.members,[]);sav(SK.dh,[]);sav(SK.weeks,[]);sav(SK.locked,[]);sav(SK.audit,[]);sav(SK.qsnap,[]);sav(SK.config,DEFAULT_CFG);sav(SK.dhsync,"");sav(SK.overrides,{});
                      // Then clear React state
                      setMembers([]);setDhData([]);setChargeWeeks([]);setLockedWeeks([]);setAuditLog([]);setQSnapshots({});setConfig(DEFAULT_CFG);setDhLastSync(null);setPayrollOverrides({});
                      setConfirm(null);showToast("All data cleared — reload to start fresh");
                    }});}} style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontFamily:FM,fontWeight:600,border:"1px solid "+C.red+"44",color:C.red,background:"transparent"}}>Factory Reset</button>
                  </div>
                </div>
              </div></div>}
            </div>;
          }()}
        </div>}
      </div>
    </div>
    {/* ════════ COMMISSION STATEMENT OVERLAY ════════ */}
    {stmtMember&&payrollWeek&&function(){
      var stmtList=stmtMember==="ALL"?payrollData.filter(function(r){return r.total>0||r.contractComm>0;}):payrollData.filter(function(r){return r.name===stmtMember;});
      var buildStmtHTML=function(r){
        var m=members.find(function(x){return x.name===r.name;});
        var weekRow=payrollWeek?payrollWeek.rows.find(function(x){return(x.matchedName||x.name)===r.name;}):null;
        var fi=r.floorInfo;
        var html='<div style="margin-bottom:24px;page-break-after:always;font-family:Arial,sans-serif;color:#1a1a2e">';
        // Header
        html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #FFD700">';
        html+='<div><div style="font-size:22px;font-weight:800">'+r.name+'</div><div style="font-size:13px;color:#666;margin-top:2px">'+(m?m.careerPath:"")+(m?" · "+m.entity:"")+(m?" · "+m.unit:"")+'</div></div>';
        html+='<div style="text-align:right"><div style="font-size:11px;color:#999;letter-spacing:1px;font-weight:700">WEEK ENDING</div><div style="font-size:18px;font-weight:800;margin-top:2px">'+payrollWeek.weekEnding+'</div></div></div>';
        // Floor status
        var floorBg=fi&&!fi.belowFloor?"#e8f5e9":"#fff3e0";var floorBorder=fi&&!fi.belowFloor?"#a5d6a7":"#ffe0b2";var floorColor=fi&&!fi.belowFloor?"#2e7d32":"#e65100";
        html+='<div style="display:flex;gap:12px;margin-bottom:14px;padding:10px 14px;background:'+floorBg+';border-radius:6px;border:1px solid '+floorBorder+'">';
        html+='<div style="flex:1"><div style="font-size:11px;color:#666;font-weight:700">QTD RAW</div><div style="font-size:18px;font-weight:800;color:'+floorColor+';margin-top:2px">'+(fi?fmtD(fi.qtd):"--")+'</div></div>';
        html+='<div style="flex:1"><div style="font-size:11px;color:#666;font-weight:700">YTD RAW</div><div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-top:2px">'+(fi?fmtD(fi.ytd):"--")+'</div></div>';
        html+='<div style="flex:1"><div style="font-size:11px;color:#666;font-weight:700">FLOOR STATUS</div><div style="font-size:14px;font-weight:700;color:'+floorColor+';margin-top:4px">'+(fi?(fi.belowFloor?"Below $25K Floor":fi.ytd>=FLOOR_ANNUAL?"$100K Tier Unlocked":"Above Tier"):"--")+'</div></div></div>';
        // Contract commission
        if(r.contractComm>0){
          html+='<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#1565c0;margin-bottom:6px;letter-spacing:.5px">CONTRACT COMMISSION · Rate: '+r.rate+'</div>';
          html+='<table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0"><thead><tr style="background:#f5f5f5"><th style="padding:6px 10px;text-align:left;font-size:12px;color:#666;font-weight:700">Charge Type</th><th style="padding:6px 10px;text-align:right;font-size:12px;color:#666;font-weight:700">Detail</th><th style="padding:6px 10px;text-align:right;font-size:12px;color:#666;font-weight:700">Commission</th></tr></thead><tbody>';
          r.steps.filter(function(s){return s.a>0;}).forEach(function(s){html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 10px;font-size:13px;color:#333">'+s.t+'</td><td style="padding:6px 10px;font-size:12px;color:#666;text-align:right">'+s.d+'</td><td style="padding:6px 10px;font-size:14px;font-weight:700;color:#1565c0;text-align:right">'+fmtD(s.a)+'</td></tr>';});
          if(fi&&fi.belowFloor&&r.deduction>0){html+='<tr style="border-bottom:1px solid #eee;background:#fff8e1"><td style="padding:6px 10px;font-size:13px;color:#e65100">Tier Deduction</td><td style="padding:6px 10px;font-size:12px;color:#e65100;text-align:right">Weekly minimum</td><td style="padding:6px 10px;font-size:14px;font-weight:700;color:#e65100;text-align:right">-'+fmtD(r.deduction)+'</td></tr>';}
          html+='</tbody><tfoot><tr style="background:#e3f2fd"><td colspan="2" style="padding:8px 10px;font-size:13px;font-weight:700;color:#1565c0">Contract Commission Total</td><td style="padding:8px 10px;font-size:16px;font-weight:800;color:#1565c0;text-align:right">'+fmtD(r.contractComm)+'</td></tr></tfoot></table></div>';
        }
        // DH payouts
        if(r.dhPayouts.length>0){
          html+='<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#2e7d32;margin-bottom:6px;letter-spacing:.5px">DIRECT HIRE PAYOUTS ('+r.dhPayouts.length+')</div>';
          html+='<table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0"><thead><tr style="background:#f5f5f5"><th style="padding:6px 10px;text-align:left;font-size:12px;color:#666;font-weight:700">Candidate</th><th style="padding:6px 10px;text-align:left;font-size:12px;color:#666;font-weight:700">Client</th><th style="padding:6px 10px;text-align:right;font-size:12px;color:#666;font-weight:700">Raw</th><th style="padding:6px 10px;text-align:center;font-size:12px;color:#666;font-weight:700">Rate</th><th style="padding:6px 10px;text-align:right;font-size:12px;color:#666;font-weight:700">Payout</th></tr></thead><tbody>';
          r.dhPayouts.forEach(function(d){html+='<tr style="border-bottom:1px solid #eee"><td style="padding:6px 10px;font-size:13px;font-weight:600">'+d.can+'</td><td style="padding:6px 10px;font-size:13px;color:#666">'+d.cl+'</td><td style="padding:6px 10px;font-size:13px;text-align:right">'+fmtD(d.raw)+'</td><td style="padding:6px 10px;font-size:13px;text-align:center">'+(d.rate*100)+'%</td><td style="padding:6px 10px;font-size:14px;font-weight:700;color:'+(d.eligible?"#2e7d32":"#999")+';text-align:right">'+(d.eligible?fmtD(d.payout):"$0 (ineligible)")+'</td></tr>';});
          html+='</tbody><tfoot><tr style="background:#e8f5e9"><td colspan="4" style="padding:8px 10px;font-size:13px;font-weight:700;color:#2e7d32">DH Payout Total</td><td style="padding:8px 10px;font-size:16px;font-weight:800;color:#2e7d32;text-align:right">'+fmtD(r.dhTotal)+'</td></tr></tfoot></table></div>';
        }
        // Grand total
        html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:linear-gradient(135deg,#1a1a2e 0%,#2d2d44 100%);border-radius:6px;margin-top:8px"><span style="font-size:14px;font-weight:700;color:#FFD700;letter-spacing:1px">TOTAL COMMISSION</span><span style="font-size:24px;font-weight:800;color:#FFD700">'+fmtD(r.total)+'</span></div>';
        if(r.contractComm===0&&r.dhTotal===0){html+='<div style="padding:12px 16px;background:#fff3e0;border-radius:6px;margin-top:8px;text-align:center"><span style="font-size:13px;color:#e65100;font-weight:600">'+(fi&&fi.belowFloor&&weekRow&&weekRow.rawCharge<FLOOR_WEEKLY_DEDUCT?"Weekly raw charge below $"+FLOOR_WEEKLY_DEDUCT.toLocaleString()+" minimum":"No commissionable activity this week")+'</span></div>';}
        html+='</div>';
        return html;
      };
      var buildFullHTML=function(list){
        return '<html><head><title>Commission Statements — WE '+payrollWeek.weekEnding+'</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:20px;color:#1a1a2e;font-size:14px}@media print{body{padding:10px}div{page-break-inside:avoid}}</style></head><body>'+list.map(function(r){return buildStmtHTML(r);}).join("")+'</body></html>';
      };
      var emailOne=function(r){
        var m=members.find(function(x){return x.name===r.name;});
        var email=m&&m.email?m.email:"";
        var subject="Commission Statement — WE "+payrollWeek.weekEnding;
        var body="Hi "+r.name.split(" ")[0]+",\n\nPlease see your commission breakdown for the week ending "+payrollWeek.weekEnding+":\n\n";
        body+="CONTRACT COMMISSION: "+fmtD(r.contractComm)+"\n";
        if(r.dhPayouts.length>0)body+="DH PAYOUTS: "+fmtD(r.dhTotal)+" ("+r.dhPayouts.length+" deal"+(r.dhPayouts.length>1?"s":"")+")\n";
        body+="TOTAL: "+fmtD(r.total)+"\n\n";
        if(r.steps&&r.steps.length>0){body+="Breakdown:\n";r.steps.filter(function(s){return s.a>0;}).forEach(function(s){body+="  "+s.t+": "+fmtD(s.a)+" ("+s.d+")\n";});}
        if(r.dhPayouts.length>0){body+="\nDH Details:\n";r.dhPayouts.forEach(function(d){body+="  "+d.can+" @ "+d.cl+": "+fmtD(d.raw)+" × "+(d.rate*100)+"% = "+(d.eligible?fmtD(d.payout):"$0 ineligible")+"\n";});}
        body+="\nQuestions? Reach out to the operations team.\n\n— Spark Companies\u2122";
        try{window.location.href="mailto:"+encodeURIComponent(email)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);}catch(e){showToast("Could not open email client","err");}
      };
      var emailAllCount=stmtList.filter(function(r){var m=members.find(function(x){return x.name===r.name;});return m&&m.email;}).length;
      return <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",justifyContent:"center",alignItems:"flex-start",overflowY:"auto",padding:"20px 10px"}}>
      <div style={{background:"#fff",borderRadius:8,maxWidth:700,width:"100%",padding:0,position:"relative",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"2px solid #FFD70066",background:"#1a1a2e",borderRadius:"8px 8px 0 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z" fill="#FFD700"/></svg>
            <span style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:FU}}>Commission Statements</span>
            <span style={{fontSize:12,color:"#FFD70099",fontFamily:FM}}>WE {payrollWeek.weekEnding}</span>
          </div>
          <button onClick={function(){setStmtMember(null);}} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",fontWeight:700,lineHeight:1}}>×</button>
        </div>
        {/* Toolbar */}
        <div style={{display:"flex",gap:6,padding:"10px 20px",background:"#f8f9fa",borderBottom:"1px solid #e0e0e0",flexWrap:"wrap",alignItems:"center"}}>
          <select value={stmtMember} onChange={function(e){setStmtMember(e.target.value||"ALL");}} style={{padding:"5px 10px",fontSize:13,borderRadius:4,border:"1px solid #ccc",fontFamily:FM}}>
            <option value="ALL">All Members ({stmtList.length})</option>
            {payrollData.filter(function(r){return r.total>0||r.contractComm>0;}).map(function(r){var m=members.find(function(x){return x.name===r.name;});return <option key={r.name} value={r.name}>{r.name}{m&&m.email?" ✉":""}</option>;})}
          </select>
          <button onClick={function(){
            var html=buildFullHTML(stmtList);
            setExportModal({title:"Commission Statement"+(stmtMember==="ALL"?" — All Members":" — "+stmtMember),content:html,isHTML:true});
          }} style={{padding:"5px 12px",fontSize:13,borderRadius:4,border:"1px solid #ccc",background:"#fff",cursor:"pointer",fontFamily:FM,fontWeight:600}}>🖨 Print{stmtMember==="ALL"?" All":""}</button>
          {stmtMember!=="ALL"&&function(){
            var r=stmtList[0];if(!r)return null;
            var m=members.find(function(x){return x.name===r.name;});
            return <button onClick={function(){emailOne(r);}} style={{padding:"5px 12px",fontSize:13,borderRadius:4,border:"1px solid #ccc",background:m&&m.email?"#e3f2fd":"#f5f5f5",cursor:m&&m.email?"pointer":"not-allowed",fontFamily:FM,fontWeight:600,color:m&&m.email?"#1565c0":"#999"}} disabled={!m||!m.email} title={m&&m.email?m.email:"No email on file"}>✉ Email{m&&m.email?" "+m.email:""}</button>;
          }()}
          {stmtMember==="ALL"&&emailAllCount>0&&<button onClick={function(){
            setConfirm({msg:"Open "+emailAllCount+" email drafts?\n\nEach team member with an email on file will get their own commission statement.",fn:function(){
              stmtList.forEach(function(r){
                var m=members.find(function(x){return x.name===r.name;});
                if(m&&m.email)setTimeout(function(){emailOne(r);},0);
              });
              log("STMT_EMAIL_ALL","Emailed "+emailAllCount+" statements for WE "+payrollWeek.weekEnding);
              showToast(emailAllCount+" email drafts opened");setConfirm(null);
            }});
          }} style={{padding:"5px 12px",fontSize:13,borderRadius:4,border:"1px solid #1565c0",background:"#e3f2fd",cursor:"pointer",fontFamily:FM,fontWeight:600,color:"#1565c0"}}>✉ Email All ({emailAllCount})</button>}
          {stmtMember==="ALL"&&emailAllCount<stmtList.length&&<span style={{fontSize:11,color:"#999",fontFamily:FM,alignSelf:"center"}}>{stmtList.length-emailAllCount} missing email</span>}
        </div>
        {/* Statement Content */}
        <div style={{padding:"20px 24px",maxHeight:"70vh",overflowY:"auto"}}>
          {stmtList.map(function(r,idx){
            var m=members.find(function(x){return x.name===r.name;});
            var weekRow=payrollWeek?payrollWeek.rows.find(function(x){return(x.matchedName||x.name)===r.name;}):null;
            var fi=r.floorInfo;
            return <div key={r.name} style={{marginBottom:idx<stmtList.length-1?24:0}}>
              {/* Per-member email button when viewing all */}
              {stmtMember==="ALL"&&<div style={{display:"flex",justifyContent:"flex-end",gap:4,marginBottom:4}}>
                <button onClick={function(){
                  setExportModal({title:"Statement — "+r.name,content:buildFullHTML([r]),isHTML:true});
                }} style={{padding:"2px 8px",fontSize:11,borderRadius:3,border:"1px solid #ccc",background:"#fff",cursor:"pointer",fontFamily:FM}}>🖨</button>
                {m&&m.email&&<button onClick={function(){emailOne(r);}} style={{padding:"2px 8px",fontSize:11,borderRadius:3,border:"1px solid #90caf9",background:"#e3f2fd",cursor:"pointer",fontFamily:FM,color:"#1565c0"}}>✉ {m.email}</button>}
              </div>}
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,paddingBottom:10,borderBottom:"2px solid #FFD700"}}>
                <div>
                  <p style={{fontSize:22,fontWeight:800,color:"#1a1a2e",margin:0,fontFamily:"'Outfit',sans-serif"}}>{r.name}</p>
                  <p style={{fontSize:13,color:"#666",margin:"2px 0 0"}}>{m?m.careerPath:""}{m?" · "+m.entity:""}{m?" · "+m.unit:""}</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:11,color:"#999",margin:0,letterSpacing:"1px",fontWeight:700}}>WEEK ENDING</p>
                  <p style={{fontSize:18,fontWeight:800,color:"#1a1a2e",margin:"2px 0 0"}}>{payrollWeek.weekEnding}</p>
                </div>
              </div>
              {/* Tier Status */}
              <div style={{display:"flex",gap:12,marginBottom:14,padding:"10px 14px",background:fi&&!fi.belowFloor?"#e8f5e9":"#fff3e0",borderRadius:6,border:"1px solid "+(fi&&!fi.belowFloor?"#a5d6a7":"#ffe0b2")}}>
                <div style={{flex:1}}><p style={{fontSize:11,color:"#666",margin:0,fontWeight:700}}>QTD RAW</p><p style={{fontSize:18,fontWeight:800,color:fi&&!fi.belowFloor?"#2e7d32":"#e65100",margin:"2px 0 0"}}>{fi?fmtD(fi.qtd):"--"}</p></div>
                <div style={{flex:1}}><p style={{fontSize:11,color:"#666",margin:0,fontWeight:700}}>YTD RAW</p><p style={{fontSize:18,fontWeight:800,color:"#1a1a2e",margin:"2px 0 0"}}>{fi?fmtD(fi.ytd):"--"}</p></div>
                <div style={{flex:1}}><p style={{fontSize:11,color:"#666",margin:0,fontWeight:700}}>FLOOR STATUS</p><p style={{fontSize:14,fontWeight:700,color:fi&&!fi.belowFloor?"#2e7d32":"#e65100",margin:"4px 0 0"}}>{fi?(fi.belowFloor?"Below $25K Floor":fi.ytd>=FLOOR_ANNUAL?"$100K Tier Unlocked":"Above Tier"):"--"}</p></div>
              </div>
              {/* Contract Commission */}
              {r.contractComm>0&&<div style={{marginBottom:12}}>
                <p style={{fontSize:12,fontWeight:700,color:"#1565c0",margin:"0 0 6px",letterSpacing:".5px"}}>CONTRACT COMMISSION · Rate: {r.rate}</p>
                <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e0e0e0"}}><thead><tr style={{background:"#f5f5f5"}}><th style={{padding:"6px 10px",textAlign:"left",fontSize:12,color:"#666",fontWeight:700}}>Charge Type</th><th style={{padding:"6px 10px",textAlign:"right",fontSize:12,color:"#666",fontWeight:700}}>Detail</th><th style={{padding:"6px 10px",textAlign:"right",fontSize:12,color:"#666",fontWeight:700}}>Commission</th></tr></thead>
                <tbody>{r.steps.filter(function(s){return s.a>0;}).map(function(s,si){return <tr key={si} style={{borderBottom:"1px solid #eee"}}><td style={{padding:"6px 10px",fontSize:13,color:"#333"}}>{s.t}</td><td style={{padding:"6px 10px",fontSize:12,color:"#666",textAlign:"right"}}>{s.d}</td><td style={{padding:"6px 10px",fontSize:14,fontWeight:700,color:"#1565c0",textAlign:"right"}}>{fmtD(s.a)}</td></tr>;})}
                {fi&&fi.belowFloor&&r.deduction>0&&<tr style={{borderBottom:"1px solid #eee",background:"#fff8e1"}}><td style={{padding:"6px 10px",fontSize:13,color:"#e65100"}}>Tier Deduction</td><td style={{padding:"6px 10px",fontSize:12,color:"#e65100",textAlign:"right"}}>Weekly minimum</td><td style={{padding:"6px 10px",fontSize:14,fontWeight:700,color:"#e65100",textAlign:"right"}}>-{fmtD(r.deduction)}</td></tr>}
                </tbody>
                <tfoot><tr style={{background:"#e3f2fd"}}><td colSpan={2} style={{padding:"8px 10px",fontSize:13,fontWeight:700,color:"#1565c0"}}>Contract Commission Total</td><td style={{padding:"8px 10px",fontSize:16,fontWeight:800,color:"#1565c0",textAlign:"right"}}>{fmtD(r.contractComm)}</td></tr></tfoot></table>
              </div>}
              {/* DH Payouts */}
              {r.dhPayouts.length>0&&<div style={{marginBottom:12}}>
                <p style={{fontSize:12,fontWeight:700,color:"#2e7d32",margin:"0 0 6px",letterSpacing:".5px"}}>DIRECT HIRE PAYOUTS ({r.dhPayouts.length})</p>
                <table style={{width:"100%",borderCollapse:"collapse",border:"1px solid #e0e0e0"}}><thead><tr style={{background:"#f5f5f5"}}><th style={{padding:"6px 10px",textAlign:"left",fontSize:12,color:"#666",fontWeight:700}}>Candidate</th><th style={{padding:"6px 10px",textAlign:"left",fontSize:12,color:"#666",fontWeight:700}}>Client</th><th style={{padding:"6px 10px",textAlign:"right",fontSize:12,color:"#666",fontWeight:700}}>Raw</th><th style={{padding:"6px 10px",textAlign:"center",fontSize:12,color:"#666",fontWeight:700}}>Rate</th><th style={{padding:"6px 10px",textAlign:"right",fontSize:12,color:"#666",fontWeight:700}}>Payout</th></tr></thead>
                <tbody>{r.dhPayouts.map(function(d,di){return <tr key={di} style={{borderBottom:"1px solid #eee"}}><td style={{padding:"6px 10px",fontSize:13,fontWeight:600}}>{d.can}</td><td style={{padding:"6px 10px",fontSize:13,color:"#666"}}>{d.cl}</td><td style={{padding:"6px 10px",fontSize:13,textAlign:"right"}}>{fmtD(d.raw)}</td><td style={{padding:"6px 10px",fontSize:13,textAlign:"center"}}>{(d.rate*100)+"%"}</td><td style={{padding:"6px 10px",fontSize:14,fontWeight:700,color:d.eligible?"#2e7d32":"#999",textAlign:"right"}}>{d.eligible?fmtD(d.payout):"$0 (ineligible)"}</td></tr>;})}</tbody>
                <tfoot><tr style={{background:"#e8f5e9"}}><td colSpan={4} style={{padding:"8px 10px",fontSize:13,fontWeight:700,color:"#2e7d32"}}>DH Payout Total</td><td style={{padding:"8px 10px",fontSize:16,fontWeight:800,color:"#2e7d32",textAlign:"right"}}>{fmtD(r.dhTotal)}</td></tr></tfoot></table>
              </div>}
              {/* Grand Total */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",background:"linear-gradient(135deg,#1a1a2e 0%,#2d2d44 100%)",borderRadius:6,marginTop:8}}>
                <span style={{fontSize:14,fontWeight:700,color:"#FFD700",letterSpacing:"1px"}}>TOTAL COMMISSION</span>
                <span style={{fontSize:24,fontWeight:800,color:"#FFD700"}}>{fmtD(r.total)}</span>
              </div>
              {r.contractComm===0&&r.dhTotal===0&&<div style={{padding:"12px 16px",background:"#fff3e0",borderRadius:6,marginTop:8,textAlign:"center"}}><p style={{fontSize:13,color:"#e65100",margin:0,fontWeight:600}}>{fi&&fi.belowFloor&&weekRow&&weekRow.rawCharge<FLOOR_WEEKLY_DEDUCT?"Weekly raw charge below $"+FLOOR_WEEKLY_DEDUCT.toLocaleString()+" minimum":"No commissionable activity this week"}</p></div>}
              {idx<stmtList.length-1&&<hr style={{border:"none",borderTop:"2px dashed #e0e0e0",margin:"20px 0"}}/>}
            </div>;
          })}
        </div>
      </div>
    </div>;
    }()}
    </div>
  );
}
