const fs = require('fs');
const F = 'spark-boards.html';
let src = fs.readFileSync(F, 'utf8');
const hadCRLF = src.indexOf('\r\n') !== -1;
let h = src.replace(/\r\n/g, '\n');
const done = [];
function sub(name, from, to) {
  const i = h.indexOf(from);
  if (i === -1) { console.log('MISS  ' + name); return; }
  if (h.indexOf(from, i + 1) !== -1) { console.log('AMBIG ' + name); return; }
  h = h.slice(0, i) + to + h.slice(i + from.length);
  done.push(name);
}
sub('greeting', '"Good morning, Allie"',
  "(function(){var x=new Date().getHours();var g=x<12?'Good morning':x<18?'Good afternoon':'Good evening';return g+', '+sparkMe().name.split(' ')[0];})()");
sub('profile', "  }), u.name.split(' ')[0])", "  }), (u && u.name ? u.name : sparkMe().name).split(' ')[0])");
if (done.length !== 2) { console.log('APPLIED ' + done.length + '/2. NOT WRITTEN.'); process.exit(1); }
fs.writeFileSync(F, hadCRLF ? h.replace(/\n/g, '\r\n') : h);
console.log('APPLIED: ' + done.join(', '));
