/* patch-sfuser-team.cjs — show team members, not every Salesforce login
   The picker listed all active Salesforce users, which is a long scroll of logins.
   It now cross-references your Spark HQ directory (the same profiles list the
   people columns use) and shows only Salesforce users who are actually on your
   team, matched by name or by email local-part, with a few known aliases.
   The stored value is still the Salesforce User Id, so credits stay valid.
   A "Show all Salesforce users" toggle covers anyone the match misses.
   Run from the repo root:  node patch-sfuser-team.cjs
*/
const fs = require('fs');
const PAGE = 'spark-boards.html';

function read(f) {
  if (!fs.existsSync(f)) throw new Error('Cannot find ' + f + ' - run this from the repo root.');
  return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
}
function must(hay, needle, label) {
  const n = hay.split(needle).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + label + ': expected 1 match, found ' + n + '. Aborting, nothing written.');
}
let p = read(PAGE);
if (p.indexOf('SFUserCell') === -1) throw new Error('Run patch-sfuser-column.cjs first. Aborting.');
if (p.indexOf('SFU.team') !== -1) throw new Error('Already applied. Aborting.');

/* 1. load both lists and intersect them */
const aLoad = `  load() {
    if (this.list) return Promise.resolve(this.list);
    if (this.loading) return this.loading;
    this.loading = API.call('/charge-sf-users').then(d => {
      this.list = (d && d.users) || [];
      this.list.forEach(u => {
        this.byId[u.id] = u.name;
      });
      return this.list;
    }).catch(() => {
      this.loading = null;
      return [];
    });
    return this.loading;
  },`;
must(p, aLoad, 'sfu-load');
p = p.replace(aLoad, `  team: null,
  load() {
    if (this.list) return Promise.resolve(this.list);
    if (this.loading) return this.loading;
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    const ALIAS = {
      'nickgreenfelder': 'nicholasgreenfelder',
      'cjolaniyan': 'kazeemolaniyan'
    };
    const key = s => {
      const n = norm(s);
      return ALIAS[n] || n;
    };
    this.loading = Promise.all([
      API.call('/charge-sf-users').catch(() => ({})),
      API.call('/boards-people').catch(() => ({}))
    ]).then(([su, hp]) => {
      this.list = (su && su.users) || [];
      this.list.forEach(u => {
        this.byId[u.id] = u.name;
      });
      const staff = {};
      ((hp && (hp.people || hp.profiles)) || []).forEach(pr => {
        const nm = pr.full_name || pr.name || '';
        const em = String(pr.email || '');
        if (nm) staff[key(nm)] = true;
        const local = em.split('@')[0];
        if (local) staff[key(local.replace(/[._-]+/g, ' '))] = true;
      });
      const hits = this.list.filter(u => staff[key(u.name)]);
      this.team = hits.length ? hits : null;
      return this.list;
    }).catch(() => {
      this.loading = null;
      return [];
    });
    return this.loading;
  },`);

/* 2. picker defaults to the team list, with a toggle */
const aState = `  const [users, setUsers] = useState(SFU.list || []);
  const [q, setQ] = useState('');`;
must(p, aState, 'sfu-state');
p = p.replace(aState, `  const [users, setUsers] = useState(SFU.list || []);
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);`);

const aShown = `  const shown = (users || []).filter(u => !q.trim() || u.name.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1).slice(0, 60);`;
must(p, aShown, 'sfu-shown');
p = p.replace(aShown, `  const source = !showAll && SFU.team && SFU.team.length ? SFU.team : users || [];
  const shown = source.filter(u => !q.trim() || u.name.toLowerCase().indexOf(q.trim().toLowerCase()) !== -1).slice(0, showAll ? 60 : 40);
  const hiddenCount = !showAll && SFU.team ? Math.max(0, (users || []).length - SFU.team.length) : 0;`);

const aClear = `      React.createElement('button', {
        className: 'sfu-clear',
        onClick: () => {
          onChange('');
          setOpen(false);
        }
      }, 'Clear')));
}`;
must(p, aClear, 'sfu-clear');
p = p.replace(aClear, `      hiddenCount > 0 && React.createElement('button', {
        className: 'sfu-clear',
        onClick: () => setShowAll(true)
      }, 'Show all Salesforce users (' + hiddenCount + ' more)'),
      React.createElement('button', {
        className: 'sfu-clear',
        onClick: () => {
          onChange('');
          setOpen(false);
        }
      }, 'Clear')));
}`);

fs.writeFileSync(PAGE + '.bak-sfuteam', fs.readFileSync(PAGE));
fs.writeFileSync(PAGE, p.replace(/\n/g, '\r\n'));
console.log('OK  picker shows your team first, matched against the Spark HQ directory');
console.log('OK  still stores the Salesforce User Id');
console.log('OK  "Show all Salesforce users" if someone is not matched');
console.log('Backup: spark-boards.html.bak-sfuteam');
