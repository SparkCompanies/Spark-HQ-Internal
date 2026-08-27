const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');

if (h.indexOf('function sparkMe(') !== -1) { console.log('already applied'); process.exit(1); }
const anchor = 'const TEAM = [{';
if (h.indexOf(anchor) === -1) { console.log('MISS anchor'); process.exit(1); }

const fn = [
'var SPARK_NAME_MAP = {',
"  aspegel: 'Allie Spegel', mpatrico: 'Mary Patrico', pmalani: 'Priyanka Malani',",
"  tcoleman: 'Tamika Coleman', aopalewski: 'Aaron Opalewski', eurisitti: 'Erica Urisitti',",
"  bnamma: 'Bedros Naama', copalewski: 'Chad Opalewski', dveres: 'Dave Veres',",
"  fkundtz: 'Fletcher Kundtz', modeesh: 'Maryam Odeesh', shoensheid: 'Sarah Hoensheid'",
'};',
'function sparkMe() {',
'  try {',
"    var raw = localStorage.getItem('spark_hq_sb_auth');",
'    if (!raw) return TEAM[0];',
'    var v = JSON.parse(raw), s = v.currentSession || v;',
'    if (!s || !s.access_token) return TEAM[0];',
"    var part = s.access_token.split('.')[1];",
"    var p = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));",
"    var email = (p.email || '').toLowerCase();",
'    if (!email) return TEAM[0];',
"    var user = email.split('@')[0];",
'    var md = p.user_metadata || {};',
'    var nm = md.full_name || md.name || SPARK_NAME_MAP[user] || null;',
'    if (!nm) {',
'      nm = user.split(/[._-]+/).filter(Boolean).map(function (x) {',
'        return x.charAt(0).toUpperCase() + x.slice(1);',
"      }).join(' ');",
'    }',
'    var hit = TEAM.filter(function (t) { return t.name.toLowerCase() === nm.toLowerCase(); })[0];',
'    if (hit) return hit;',
"    var pal = ['#D4A843', '#579BFC', '#A25DDC', '#00C875', '#E14B8A', '#00A9A5', '#FDAB3D', '#7E5BD6'];",
'    var n = 0;',
'    for (var i = 0; i < email.length; i++) n = (n * 31 + email.charCodeAt(i)) >>> 0;',
"    return { id: 'sb_' + user, name: nm, color: pal[n % pal.length], email: email };",
'  } catch (e) { return TEAM[0]; }',
'}',
''].join('\n');

const i = h.indexOf(anchor);
h = h.slice(0, i) + fn + h.slice(i);

const before = (h.match(/TEAM\[0\]/g) || []).length;
h = h.split('return TEAM[0];').join('return __TEAMZERO__;');
h = h.split('TEAM[0]').join('sparkMe()');
h = h.split('__TEAMZERO__').join('TEAM[0]');
const after = (h.match(/sparkMe\(\)/g) || []).length;

fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('TEAM[0] refs found: ' + before);
console.log('replaced with sparkMe(): ' + (after - 1));
