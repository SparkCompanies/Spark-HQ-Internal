// RESUME_DUBBER_v1 — adds a native "Resume Dubber" tool to Spark HQ.
// Takes a raw candidate resume, applies the seven Spark dub rules, and returns a
// clean submittal-ready document plus a reviewer flag list.
// Everything is injected at runtime so no existing markup is edited.
// Run from repo root:  node apply-resume-dubber.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("RESUME_DUBBER_v1")) { console.log("Already applied."); process.exit(0); }
function die(m){ console.error("ABORT — " + m + " (no changes written)"); process.exit(1); }

// sanity: the tool we mirror must exist
if (h.indexOf("openResumeDrop") < 0) die("Resume Drop not found — wrong file?");
const bi = h.lastIndexOf("</body>");
if (bi < 0) die("no </body>");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-dubber-" + stamp + ".html", h);

const BLOCK = `
<style id="dubber-css">/* RESUME_DUBBER_v1 */
.dub-workspace{display:none;margin:18px 0 8px}
.dub-workspace.open{display:block}
.dub-shell{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.dub-head{display:flex;align-items:flex-start;gap:14px;padding:18px 22px;border-bottom:1px solid var(--line);background:var(--paper-warm)}
.dub-eyebrow{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold-dark)}
.dub-head h2{margin:3px 0 2px;font-size:19px;font-weight:700;color:var(--ink)}
.dub-dek{font-size:12.5px;color:#6f6a5e;line-height:1.5;max-width:640px}
.dub-close{margin-left:auto;background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#8a8578}
.dub-grid{display:grid;grid-template-columns:minmax(300px,1fr) minmax(340px,1.25fr);gap:0}
@media (max-width:1080px){.dub-grid{grid-template-columns:1fr}}
.dub-pane{padding:18px 22px}
.dub-pane+.dub-pane{border-left:1px solid var(--line)}
@media (max-width:1080px){.dub-pane+.dub-pane{border-left:none;border-top:1px solid var(--line)}}
.dub-lbl{font-size:10.5px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#8a8578;margin-bottom:7px}
.dub-dz{border:1.5px dashed #d8d2c2;border-radius:12px;padding:22px 16px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s}
.dub-dz:hover,.dub-dz.hot{border-color:var(--gold);background:var(--paper-warm)}
.dub-dz-t{font-size:14px;font-weight:600;color:var(--ink)}
.dub-dz-s{font-size:11.5px;color:#8a8578;margin-top:3px}
.dub-or{text-align:center;font-size:10.5px;letter-spacing:1.2px;color:#a8a294;margin:12px 0 8px;text-transform:uppercase}
.dub-ta{width:100%;min-height:150px;border:1px solid var(--line);border-radius:10px;padding:11px 13px;font-size:12.5px;font-family:inherit;resize:vertical;outline:none;color:var(--ink);background:#fdfcf9}
.dub-ta:focus{border-color:var(--gold)}
.dub-in{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 13px;font-size:12.5px;font-family:inherit;outline:none;color:var(--ink);background:#fdfcf9}
.dub-in:focus{border-color:var(--gold)}
.dub-go{width:100%;margin-top:13px;background:var(--gold);color:var(--ink);border:none;border-radius:10px;padding:13px 0;font-weight:700;font-size:13px;letter-spacing:.08em;cursor:pointer;font-family:inherit}
.dub-go:disabled{opacity:.45;cursor:not-allowed}
.dub-note{font-size:11px;color:#8a8578;line-height:1.5;margin-top:10px}
.dub-chosen{font-size:12px;color:#3E9E7E;font-weight:600;margin-top:8px;min-height:16px}
.dub-status{display:flex;align-items:center;gap:11px;padding:14px 0;font-size:13px;color:#6f6a5e}
.dub-spin{width:16px;height:16px;border:2px solid #e7e2d4;border-top-color:var(--gold);border-radius:50%;animation:dubspin .8s linear infinite;flex-shrink:0}
@keyframes dubspin{to{transform:rotate(360deg)}}
.dub-err{color:#B3261E;font-size:12.5px;line-height:1.55;padding:10px 0}
.dub-empty{color:#a8a294;font-size:12.5px;padding:22px 0;text-align:center;line-height:1.6}
.dub-actions{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.dub-btn{background:var(--ink);color:#fff;border:none;border-radius:8px;padding:8px 15px;font-size:11.5px;font-weight:700;letter-spacing:.05em;cursor:pointer;font-family:inherit}
.dub-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.dub-flags{border:1px solid #f0e4c8;background:#fffdf4;border-radius:10px;padding:12px 14px;margin-bottom:14px}
.dub-flags-h{font-size:10.5px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold-dark);margin-bottom:8px}
.dub-flag{display:flex;gap:9px;font-size:12.5px;line-height:1.5;color:#4a463d;padding:4px 0}
.dub-flag b{font-weight:700;color:var(--ink)}
.dub-doc{border:1px solid var(--line);border-radius:10px;padding:26px 28px;background:#fff;font-size:13px;line-height:1.6;color:#1a1a1a;max-height:620px;overflow-y:auto}
.dub-doc h1{font-size:21px;margin:0 0 2px;letter-spacing:.02em}
.dub-doc .dub-headline{font-size:13px;color:#6f6a5e;margin-bottom:14px}
.dub-doc h2{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold-dark);margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid #ece7d9}
.dub-doc .dub-job{margin-bottom:13px}
.dub-doc .dub-job-h{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dub-doc .dub-job-t{font-weight:700}
.dub-doc .dub-job-d{font-size:12px;color:#6f6a5e;white-space:nowrap}
.dub-doc .dub-job-c{font-size:12.5px;color:#4a463d;margin-bottom:4px}
.dub-doc ul{margin:4px 0 0;padding-left:18px}
.dub-doc li{margin-bottom:3px}
.dub-doc .dub-skills{font-size:12.5px}
.dub-foot{margin-top:14px;padding-top:10px;border-top:1px solid #ece7d9;font-size:10.5px;color:#a8a294;letter-spacing:.4px}
</style>
<script>/* RESUME_DUBBER_v1 */
(function(){
  var dubFile = null, dubBusy = false, dubOut = null;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function el(id){ return document.getElementById(id); }

  var PROMPT = [
    'You are a staffing recruiter at Spark Companies preparing a candidate resume for client submittal.',
    'This process is called "dubbing": rebuilding the resume into the Spark format so every submittal is clean,',
    'consistent, and easy to read. The facts stay the candidate\\'s. The presentation is ours.',
    '',
    'RULES (follow exactly):',
    '1. REMOVE all personal contact details - phone, personal email, street address, LinkedIn, personal website.',
    '   The client\\'s path to the candidate is the recruiter.',
    '2. REMOVE anything that invites bias or is not job-related: date of birth, age, marital status, family',
    '   details, photo references, nationality, religion, health, salary history, current or desired wage.',
    '3. NEVER add, inflate, or invent. Dubbing is presentation, not fiction. If a skill or claim is vague or',
    '   unverifiable, keep it only if clearly stated on the resume and FLAG it for the recruiter to verify.',
    '4. Rebuild the work history newest first with clean consistent dates (Mon YYYY - Mon YYYY, or "Present"),',
    '   real titles, and real company names.',
    '5. Tighten every bullet: action first, quantified where the resume already gives numbers. Max 4 bullets per',
    '   role, max ~22 words each. Do not invent metrics.',
    '6. FIX every typo, spelling error, and inconsistent capitalization or formatting.',
    '7. If target requirements are supplied, order the summary and skills so the matching experience surfaces',
    '   first. Do not fabricate alignment that is not there.',
    '',
    'Return ONLY a JSON object, no prose and no markdown fences:',
    '{',
    '  "name": "candidate full name",',
    '  "headline": "short professional headline, e.g. CNC Machinist - 10 years",',
    '  "summary": "2-3 sentence factual summary drawn only from the resume",',
    '  "skills": ["skill", "..."],',
    '  "experience": [{"title":"","company":"","location":"","dates":"","bullets":["",""]}],',
    '  "education": [{"credential":"","institution":"","year":""}],',
    '  "certifications": [{"name":"","detail":""}],',
    '  "flags": [{"type":"removed|fixed|verify","note":"what you did or what the recruiter must confirm"}]',
    '}',
    'Every removal, typo fix, and unverified claim MUST appear in flags. Be specific in each note.'
  ].join('\\n');

  window.openResumeDubber = function(){
    var ws = el('dubWorkspace');
    if(!ws) return;
    ws.classList.add('open');
    try { ws.scrollIntoView({behavior:'smooth', block:'start'}); } catch(_){}
  };
  window.closeResumeDubber = function(){
    var ws = el('dubWorkspace'); if(ws) ws.classList.remove('open');
  };
  window.dubPickFile = function(){ var i = el('dubFileInput'); if(i) i.click(); };

  window.dubHandleFile = function(f){
    if(!f) return;
    var isPdf = /\\.pdf$/i.test(f.name);
    if(f.size > 10*1024*1024){ dubStatus('error','File too large (max 10 MB).'); return; }
    var reader = new FileReader();
    if(isPdf){
      reader.onload = function(){
        dubFile = { name:f.name, kind:'pdf', base64: reader.result.split(',')[1] };
        dubChosen();
      };
      reader.readAsDataURL(f);
    } else {
      reader.onload = function(){
        dubFile = { name:f.name, kind:'text', text: reader.result };
        dubChosen();
      };
      reader.readAsText(f);
    }
  };
  function dubChosen(){
    var c = el('dubChosen'); if(c && dubFile) c.textContent = '\\u2713 ' + dubFile.name;
    var b = el('dubGo'); if(b) b.disabled = false;
  }
  window.dubOnInput = function(){
    var t = el('dubPaste'), b = el('dubGo');
    if(b) b.disabled = !(dubFile || (t && t.value.trim().length > 40));
  };

  function dubStatus(kind, msg){
    var out = el('dubResult'); if(!out) return;
    if(kind === 'busy'){
      out.innerHTML = '<div class="dub-status"><div class="dub-spin"></div><div>' + esc(msg) + '</div></div>';
    } else if(kind === 'error'){
      out.innerHTML = '<div class="dub-err"><b>Dub failed.</b><br>' + esc(msg) + '</div>';
    }
  }

  window.dubRun = async function(){
    if(dubBusy) return;
    var paste = el('dubPaste'), reqs = el('dubReqs'), btn = el('dubGo');
    var pasted = paste ? paste.value.trim() : '';
    if(!dubFile && pasted.length < 40){ dubStatus('error','Drop a resume or paste at least a few lines of text.'); return; }
    dubBusy = true;
    if(btn){ btn.disabled = true; btn.textContent = 'DUBBING\\u2026'; }
    dubStatus('busy','Rebuilding into the Spark format\\u2026');
    try {
      var content = [];
      if(dubFile && dubFile.kind === 'pdf'){
        content.push({ type:'document', source:{ type:'base64', media_type:'application/pdf', data: dubFile.base64 } });
      }
      var ask = 'Dub this resume.';
      if(reqs && reqs.value.trim()) ask += '\\n\\nTarget requirement / must-haves:\\n' + reqs.value.trim();
      if(dubFile && dubFile.kind === 'text') ask += '\\n\\nResume:\\n' + dubFile.text;
      else if(pasted) ask += '\\n\\nResume:\\n' + pasted;
      content.push({ type:'text', text: ask });

      var headers = {
        'Content-Type':'application/json',
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      };
      if(typeof providerCreds !== 'undefined' && providerCreds.anthropic && providerCreds.anthropic.apiKey){
        headers['x-api-key'] = providerCreds.anthropic.apiKey;
      }
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers: headers,
        body: JSON.stringify({
          model:'claude-sonnet-4-6', max_tokens:3000,
          system: PROMPT,
          messages:[{ role:'user', content: content }]
        })
      });
      if(!response.ok){
        var t = await response.text();
        throw new Error('API ' + response.status + ' \\u2014 ' + t.slice(0,160));
      }
      var data = await response.json();
      var raw = data.content.filter(function(c){ return c.type === 'text'; }).map(function(c){ return c.text; }).join('\\n');
      dubOut = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g,'').trim());
      dubRender(dubOut);
    } catch(e){
      var extra = (String(e.message).indexOf('401') >= 0 || String(e.message).indexOf('Failed to fetch') >= 0)
        ? ' \\u2014 set your Anthropic key under Admin \\u2192 AI Settings.' : '';
      dubStatus('error', e.message + extra);
    } finally {
      dubBusy = false;
      if(btn){ btn.disabled = false; btn.textContent = 'DUB RESUME'; }
    }
  };

  function docHtml(c){
    var h = '';
    h += '<h1>' + esc(c.name || 'Candidate') + '</h1>';
    if(c.headline) h += '<div class="dub-headline">' + esc(c.headline) + '</div>';
    if(c.summary){ h += '<h2>Summary</h2><div>' + esc(c.summary) + '</div>'; }
    if(c.skills && c.skills.length){
      h += '<h2>Skills</h2><div class="dub-skills">' + c.skills.map(esc).join(' &nbsp;\\u00b7&nbsp; ') + '</div>';
    }
    if(c.experience && c.experience.length){
      h += '<h2>Experience</h2>';
      c.experience.forEach(function(j){
        h += '<div class="dub-job"><div class="dub-job-h"><div class="dub-job-t">' + esc(j.title||'') + '</div>' +
             '<div class="dub-job-d">' + esc(j.dates||'') + '</div></div>' +
             '<div class="dub-job-c">' + esc(j.company||'') + (j.location ? ' \\u00b7 ' + esc(j.location) : '') + '</div>';
        if(j.bullets && j.bullets.length){
          h += '<ul>' + j.bullets.map(function(b){ return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
        }
        h += '</div>';
      });
    }
    if(c.education && c.education.length){
      h += '<h2>Education</h2>';
      c.education.forEach(function(e){
        h += '<div>' + esc(e.credential||'') + (e.institution ? ' \\u2014 ' + esc(e.institution) : '') +
             (e.year ? ' (' + esc(e.year) + ')' : '') + '</div>';
      });
    }
    if(c.certifications && c.certifications.length){
      h += '<h2>Certifications</h2>';
      c.certifications.forEach(function(e){
        h += '<div>' + esc(e.name||'') + (e.detail ? ' \\u2014 ' + esc(e.detail) : '') + '</div>';
      });
    }
    h += '<div class="dub-foot">Presented by Spark Companies \\u00b7 Contact your Spark representative regarding this candidate</div>';
    return h;
  }

  function dubRender(c){
    var out = el('dubResult'); if(!out || !c) return;
    var h = '';
    h += '<div class="dub-actions">' +
         '<button class="dub-btn" onclick="dubDownload()">Download .doc</button>' +
         '<button class="dub-btn ghost" onclick="dubCopy()">Copy text</button>' +
         '<button class="dub-btn ghost" onclick="dubPrint()">Print / PDF</button>' +
         '</div>';
    if(c.flags && c.flags.length){
      h += '<div class="dub-flags"><div class="dub-flags-h">Review before you submit</div>';
      c.flags.forEach(function(f){
        var label = (f.type === 'removed') ? 'Removed' : (f.type === 'fixed') ? 'Fixed' : 'Verify';
        h += '<div class="dub-flag"><b>' + esc(label) + '</b><span>' + esc(f.note||'') + '</span></div>';
      });
      h += '</div>';
    }
    h += '<div class="dub-doc" id="dubDoc">' + docHtml(c) + '</div>';
    out.innerHTML = h;
  }

  window.dubCopy = function(){
    var d = el('dubDoc'); if(!d) return;
    var t = d.innerText;
    if(navigator.clipboard) navigator.clipboard.writeText(t);
    else { var ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  };
  window.dubDownload = function(){
    if(!dubOut) return;
    var style = 'body{font-family:Century Gothic,Calibri,sans-serif;font-size:11pt;color:#1a1a1a;line-height:1.5}' +
      'h1{font-size:17pt;margin:0 0 2pt}h2{font-size:9pt;letter-spacing:1.2pt;text-transform:uppercase;color:#8a6d0b;margin:14pt 0 5pt;border-bottom:1px solid #ddd;padding-bottom:2pt}' +
      'ul{margin:3pt 0 0 16pt;padding:0}li{margin-bottom:2pt}.dub-headline{color:#555;margin-bottom:10pt}' +
      '.dub-job{margin-bottom:9pt}.dub-job-t{font-weight:bold}.dub-job-d{color:#555;font-size:10pt}.dub-job-c{color:#333;font-size:10.5pt}' +
      '.dub-foot{margin-top:12pt;padding-top:6pt;border-top:1px solid #ddd;font-size:8pt;color:#888}';
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' +
      '<head><meta charset="utf-8"><style>' + style + '</style></head><body>' + docHtml(dubOut) + '</body></html>';
    var blob = new Blob(['\\ufeff', html], { type:'application/msword' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ((dubOut.name || 'candidate').replace(/[^\\w\\s-]/g,'').trim().replace(/\\s+/g,'_')) + '_Spark.doc';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };
  window.dubPrint = function(){
    var d = el('dubDoc'); if(!d) return;
    var w = window.open('', '_blank');
    if(!w) return;
    w.document.write('<html><head><meta charset="utf-8"><title>' + esc(dubOut && dubOut.name || 'Candidate') + '</title>' +
      '<style>body{font-family:Century Gothic,Calibri,sans-serif;font-size:11pt;line-height:1.55;color:#1a1a1a;max-width:7.5in;margin:0 auto;padding:24px}' +
      'h1{font-size:19pt;margin:0 0 2px}h2{font-size:9.5pt;letter-spacing:1.3px;text-transform:uppercase;color:#8a6d0b;margin:16px 0 6px;border-bottom:1px solid #e0dbd0;padding-bottom:3px}' +
      'ul{margin:4px 0 0;padding-left:18px}.dub-headline{color:#666;margin-bottom:12px}.dub-job{margin-bottom:11px}' +
      '.dub-job-h{display:flex;justify-content:space-between}.dub-job-t{font-weight:700}.dub-job-d{color:#666;font-size:10pt}' +
      '.dub-job-c{color:#333;font-size:10.5pt}.dub-foot{margin-top:16px;padding-top:8px;border-top:1px solid #e0dbd0;font-size:8.5pt;color:#999}</style>' +
      '</head><body>' + d.innerHTML + '</body></html>');
    w.document.close();
    setTimeout(function(){ try{ w.print(); }catch(_){ } }, 350);
  };

  var WORKSPACE = '<div class="dub-workspace" id="dubWorkspace">' +
    '<div class="dub-shell">' +
      '<div class="dub-head">' +
        '<div><div class="dub-eyebrow">Built by Spark \\u00b7 AI tool</div>' +
        '<h2>Resume Dubber</h2>' +
        '<div class="dub-dek">Drop a raw resume, get it rebuilt into the Spark submittal format. Personal contact and bias-inviting details come off, work history is rebuilt newest first, typos are fixed, and anything unverified is flagged for you rather than quietly dropped. Review every flag before you send it.</div></div>' +
        '<button class="dub-close" onclick="closeResumeDubber()" title="Close">\\u00d7</button>' +
      '</div>' +
      '<div class="dub-grid">' +
        '<div class="dub-pane">' +
          '<div class="dub-lbl">Candidate resume</div>' +
          '<div class="dub-dz" id="dubDz" onclick="dubPickFile()">' +
            '<div class="dub-dz-t">Drop a resume here</div>' +
            '<div class="dub-dz-s">PDF or text \\u00b7 max 10 MB \\u00b7 or click to browse</div>' +
          '</div>' +
          '<input type="file" id="dubFileInput" accept=".pdf,.txt,.md,.rtf,.doc,.docx" style="display:none" ' +
            'onchange="dubHandleFile(this.files[0])">' +
          '<div class="dub-chosen" id="dubChosen"></div>' +
          '<div class="dub-or">or paste the text</div>' +
          '<textarea class="dub-ta" id="dubPaste" placeholder="Paste the resume text here\\u2026" oninput="dubOnInput()"></textarea>' +
          '<div class="dub-lbl" style="margin-top:14px">Target req \\u2014 optional</div>' +
          '<input class="dub-in" id="dubReqs" placeholder="e.g. CNC Machinist, 3-axis Haas, 2nd shift, Troy MI">' +
          '<div class="dub-note">Adding the must-haves lets the dub surface matching experience first. It will not invent alignment that is not on the resume.</div>' +
          '<button class="dub-go" id="dubGo" onclick="dubRun()" disabled>DUB RESUME</button>' +
          '<div class="dub-note">Resumes are sent to the API for rebuilding only \\u2014 nothing is stored. Set your key under Admin \\u2192 AI Settings.</div>' +
        '</div>' +
        '<div class="dub-pane">' +
          '<div class="dub-lbl">Dubbed submittal</div>' +
          '<div id="dubResult"><div class="dub-empty">The rebuilt resume appears here.<br>Download as Word, copy the text, or print to PDF.</div></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  function mount(){
    if(el('dubWorkspace')) return true;
    var rd = el('rdWorkspace');
    if(!rd || !rd.parentNode) return false;
    rd.insertAdjacentHTML('afterend', WORKSPACE);
    var dz = el('dubDz');
    if(dz){
      ['dragenter','dragover'].forEach(function(ev){
        dz.addEventListener(ev, function(e){ e.preventDefault(); dz.classList.add('hot'); });
      });
      ['dragleave','drop'].forEach(function(ev){
        dz.addEventListener(ev, function(e){ e.preventDefault(); dz.classList.remove('hot'); });
      });
      dz.addEventListener('drop', function(e){
        if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) dubHandleFile(e.dataTransfer.files[0]);
      });
    }
    return true;
  }

  function addTile(){
    if(document.getElementById('dubTile')) return true;
    var rdTile = document.querySelector('a.tool-tile[onclick*="openResumeDrop"]');
    if(!rdTile || !rdTile.parentNode) return false;
    var a = document.createElement('a');
    a.id = 'dubTile';
    a.className = rdTile.className;
    a.href = '#';
    a.setAttribute('onclick', 'openResumeDubber(); return false;');
    a.innerHTML = '<div class="mark" style="background: var(--ink); color: var(--gold); font-size: 15px;">\\u270e</div>' +
      '<div><div class="label">Resume Dubber<span class="native-badge">AI</span></div>' +
      '<div class="role">Raw resume \\u2192 Spark submittal format</div></div>';
    rdTile.parentNode.insertBefore(a, rdTile.nextSibling);
    // bump the "N tools" counter on this category
    var cat = rdTile.closest('.tools-cat');
    var cnt = cat && cat.querySelector('.tools-cat-label .count');
    if(cnt){
      var n = (cat.querySelectorAll('.tools-cat-grid a.tool-tile') || []).length;
      if(n) cnt.textContent = n + ' tools';
    }
    return true;
  }

  var tries = 0;
  var iv = setInterval(function(){
    var a = mount(), b = addTile();
    if((a && b) || ++tries > 40) clearInterval(iv);
  }, 250);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ mount(); addTile(); });
  } else { mount(); addTile(); }
})();
</script>
`;

h = h.slice(0, bi) + BLOCK + h.slice(bi);
fs.writeFileSync(F, h);
console.log("APPLIED RESUME_DUBBER_v1");
console.log("  tile added next to Resume Drop under Built by Spark");
console.log("  workspace mounts after #rdWorkspace at runtime (no markup edited)");
console.log("  backup: index.backup-dubber-" + stamp + ".html");
