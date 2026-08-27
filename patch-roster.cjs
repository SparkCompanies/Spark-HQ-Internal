// ============================================================================
// patch-roster.cjs - person columns, pickers, automations, and My Work now run
// on the REAL company roster (HQ profiles via /boards-people) instead of the
// hardcoded 7. Existing u1-u7 assignments keep working; everyone else appears
// with a stable id matching how login already identifies them.
//
//   cd ~/Desktop/Spark-HQ-Internal
//   node patch-roster.cjs
//   git add -A && git commit -m "Boards: real user roster" && git push
// ============================================================================
const fs = require("fs");
if (!fs.existsSync(".git")) throw new Error("Run from the repo root: cd ~/Desktop/Spark-HQ-Internal");
const FILE = "spark-boards.html";
let src = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (src.includes("hydrateTeam")) throw new Error(FILE + " already patched. Nothing written.");

const EDITS = [
  ["const userById = id => TEAM.find(u => u.id === id);", "const userById = id => TEAM.find(u => u.id === id);\nconst hydrateTeam = list => {\n  try {\n    const pal = ['#D4A843', '#579BFC', '#A25DDC', '#00C875', '#E14B8A', '#00A9A5', '#FDAB3D', '#7E5BD6'];\n    (list || []).forEach(p => {\n      const email = (p.email || '').toLowerCase();\n      if (!email) return;\n      const user = email.split('@')[0];\n      const nm = p.full_name || SPARK_NAME_MAP[user] || user.split(/[._-]+/).filter(Boolean).map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' ');\n      const hit = TEAM.find(t => t.name.toLowerCase() === String(nm).toLowerCase() || t.email && t.email === email);\n      if (hit) {\n        hit.email = email;\n        return;\n      }\n      if (TEAM.some(t => t.id === 'sb_' + user)) return;\n      let n = 0;\n      for (let i = 0; i < email.length; i++) n = (n * 31 + email.charCodeAt(i)) >>> 0;\n      TEAM.push({\n        id: 'sb_' + user,\n        name: nm,\n        color: pal[n % pal.length],\n        email: email\n      });\n    });\n    TEAM.sort((a, b) => {\n      const au = a.id.charAt(0) === 'u' ? 0 : 1;\n      const bu = b.id.charAt(0) === 'u' ? 0 : 1;\n      return au !== bu ? au - bu : au === 0 ? 0 : a.name.localeCompare(b.name);\n    });\n  } catch (e) {}\n};"],
  ["const [users, setUsers] = useState(seedDirectory);", "const [users, setUsers] = useState(seedDirectory);\n  const [rosterV, setRosterV] = useState(0);\n  useEffect(() => {\n    let on = true;\n    API.call('/boards-people').then(d => {\n      if (!on || !d || !d.users) return;\n      hydrateTeam(d.users);\n      setRosterV(v => v + 1);\n    }).catch(() => {});\n    return () => {\n      on = false;\n    };\n  }, []);"]
];
for (const [i, [o]] of EDITS.entries()) {
  const n = src.split(o).length - 1;
  if (n !== 1) throw new Error("edit #" + (i + 1) + ": anchor found " + n + " times (need 1). NOTHING written.");
}
fs.writeFileSync(FILE + ".bak-roster", fs.readFileSync(FILE));
for (const [o, nw] of EDITS) src = src.replace(o, nw);
fs.writeFileSync(FILE, src);
console.log("PATCHED " + FILE + " (backup .bak-roster)");
console.log('Next: git add -A && git commit -m "Boards: real user roster" && git push');
