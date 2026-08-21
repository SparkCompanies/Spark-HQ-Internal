#!/usr/bin/env node
/* apply-block-editor.cjs — LMS_BLOCKS_v1
 * Trainual-style block editor for Admin -> Training admin topic editing.
 *
 * What it installs (as an override layer — legacy editor code stays intact):
 *  - Topics become a stack of blocks: Text (rich toolbar), Callout, Image,
 *    Video (YouTube), Document (styled link row, SVG icon).
 *  - Reorder via drag handle or Up/Down; Duplicate; Delete.
 *  - Autosave to a per-topic localStorage draft slot every ~1s while editing,
 *    with Restore/Discard bar on reopen. "Save topic" commits for real.
 *  - Blocks compile to the same HTML the lesson viewer already renders
 *    (topic.content), with block source kept in topic.blocks. Existing topics
 *    open as a single Text block. Zero viewer changes.
 *
 * Wiring strategy: the patch DISCOVERS the topic-editor opener function name
 * from the file (nearest window.X = function before the modal-open call) and
 * wraps it; window.saveTopic is overridden. If the editor body isn't the
 * block UI (unknown code path), save falls through to the legacy handler.
 * Safety: backup before write; every anchor verified; throws before writing.
 */
const fs = require('fs');

const FILE = 'index.html';
const fail = (m) => { console.error('\u2717 ' + m); process.exit(1); };
const ok = (m) => console.log('\u2713 ' + m);

let h;
try { h = fs.readFileSync(FILE, 'utf8'); } catch (e) { fail('cannot read ' + FILE + ' — run from the repo root. ' + e.message); }

/* ---------- idempotency + prerequisites ---------- */
if (h.includes('LMS_BLOCKS_v1')) fail('LMS_BLOCKS_v1 already applied.');
const MERGE_MARK = '  /* ==================== LMS_MERGE_v1 ==================== */';
if (!h.includes(MERGE_MARK)) fail('LMS_MERGE_v1 marker not found — run the earlier patches first.');
['editingTopicDraft', 'trainingAdminSubjectId', 'function persistLmsData', 'window.saveTopic = function', "getElementById('topicEditorBody')", 'function escLms', 'window.closeTopicEditor'].forEach(sig => {
  if (!h.includes(sig)) fail('required code signature missing: ' + JSON.stringify(sig));
});
ok('prerequisites present');

/* ---------- discover the topic-editor opener function name ---------- */
const OPEN_CALL = "topicEditorModal').classList.add('open')";
const openIdx = h.indexOf(OPEN_CALL);
if (openIdx < 0) fail('modal-open call not found: ' + OPEN_CALL);
const beforeOpen = h.slice(0, openIdx);
const assigns = [...beforeOpen.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function/g)];
if (!assigns.length) fail('no window.X = function assignment found before the modal-open call.');
const OPENER = assigns[assigns.length - 1][1];
if (!/topic|edit/i.test(OPENER)) fail('discovered opener "' + OPENER + '" does not look like a topic editor function — stopping. Paste this name back to Claude.');
if (OPENER === 'saveTopic' || OPENER === 'closeTopicEditor') fail('discovery landed on "' + OPENER + '" — ambiguous, stopping.');
ok('topic editor opener discovered: window.' + OPENER);

/* ---------- the module (same script scope; no backticks, no ${ inside) ---------- */
const MODULE = `  /* ==================== LMS_BLOCKS_v1 ==================== */
  /* Trainual-style block editor. Installed as an override layer: the legacy
     opener runs first (sets editingTopicDraft, opens the modal), then the
     modal body is repainted with the block UI. saveTopic compiles blocks to
     the same HTML the viewer already renders and keeps block source on the
     topic. If the block UI isn't present, save falls through to legacy. */
  (function(){
    var GOLD = '#F5C518';

    /* ---- styles ---- */
    var css = ''
      + '.blk-meta{display:flex;gap:12px;margin-bottom:14px;}'
      + '.blk-meta label{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a8578;flex:1;}'
      + '.blk-meta label:last-child{flex:0 0 90px;}'
      + '.blk-meta input{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;color:inherit;font:inherit;}'
      + '.blk-card{border:1px solid rgba(255,255,255,.10);border-radius:10px;margin-bottom:10px;background:rgba(255,255,255,.02);}'
      + '.blk-card.blk-dragover{border-color:' + GOLD + ';}'
      + '.blk-head{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.06);}'
      + '.blk-grip{cursor:grab;color:#8a8578;display:flex;align-items:center;}'
      + '.blk-type{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:' + GOLD + ';font-weight:700;}'
      + '.blk-head .sp{flex:1;}'
      + '.blk-btn{background:none;border:1px solid rgba(255,255,255,.12);border-radius:6px;color:#8a8578;font-size:10.5px;padding:2px 7px;cursor:pointer;}'
      + '.blk-btn:hover{color:' + GOLD + ';border-color:' + GOLD + ';}'
      + '.blk-body{padding:10px;}'
      + '.blk-tb{display:flex;gap:4px;margin-bottom:6px;}'
      + '.blk-tb button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:inherit;font-size:11px;min-width:26px;padding:2px 7px;cursor:pointer;}'
      + '.blk-tb button:hover{border-color:' + GOLD + ';}'
      + '.blk-ce{min-height:64px;border:1px solid rgba(255,255,255,.10);border-radius:8px;padding:10px;outline:none;font-size:13.5px;line-height:1.55;}'
      + '.blk-ce:focus{border-color:' + GOLD + ';}'
      + '.blk-field{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;}'
      + '.blk-field label{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#8a8578;}'
      + '.blk-field input{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 9px;color:inherit;font:inherit;font-size:12.5px;}'
      + '.blk-addrow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.12);}'
      + '.blk-addrow .lbl{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#8a8578;margin-right:2px;}'
      + '.blk-add{background:rgba(255,200,0,.08);border:1px solid rgba(255,200,0,.35);border-radius:7px;color:' + GOLD + ';font-size:11.5px;font-weight:700;padding:5px 11px;cursor:pointer;}'
      + '.blk-add:hover{background:rgba(255,200,0,.16);}'
      + '.blk-chip{font-size:11px;color:#8a8578;margin-top:8px;min-height:14px;}'
      + '.blk-restore{display:flex;align-items:center;gap:8px;font-size:12px;background:rgba(184,145,46,.12);border:1px solid rgba(184,145,46,.4);border-radius:8px;padding:8px 10px;margin-bottom:12px;color:#B8912E;}'
      + '.blk-restore button{background:none;border:1px solid rgba(184,145,46,.5);border-radius:6px;color:#B8912E;font-size:11px;padding:3px 9px;cursor:pointer;}'
      + '.blk-imgprev{max-width:180px;border-radius:8px;margin-top:6px;display:block;}'
      + '.lms-doc-row{display:flex;align-items:center;gap:10px;border:1px solid rgba(255,200,0,.4);border-radius:10px;padding:10px 14px;margin:12px 0;text-decoration:none;color:inherit;}'
      + '.lms-doc-row .nm{font-weight:700;flex:1;}'
      + '.lms-doc-row .op{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:' + GOLD + ';font-weight:700;}';
    try { document.head.insertAdjacentHTML('beforeend', '<style id="lmsBlocksCss">' + css + '</style>'); } catch(e) {}

    var GRIP_SVG = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true"><circle cx="2.5" cy="2.5" r="1.6"/><circle cx="7.5" cy="2.5" r="1.6"/><circle cx="2.5" cy="8" r="1.6"/><circle cx="7.5" cy="8" r="1.6"/><circle cx="2.5" cy="13.5" r="1.6"/><circle cx="7.5" cy="13.5" r="1.6"/></svg>';
    var DOC_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + GOLD + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

    function blkEsc(s){ return escLms(String(s == null ? '' : s)); }
    function ytId(u){
      u = String(u || '').trim();
      if (/^[\\w-]{11}$/.test(u)) return u;
      var m = u.match(/(?:youtu\\.be\\/|[?&]v=|\\/embed\\/|\\/shorts\\/)([\\w-]{11})/);
      return m ? m[1] : '';
    }

    /* ---- compile blocks -> viewer HTML ---- */
    window.lmsBlocksToHtml = function(blocks){
      return (blocks || []).map(function(b){
        if (!b || !b.type) return '';
        if (b.type === 'text') return b.html || '';
        if (b.type === 'callout') return '<div class="std-callout"><span class="lbl">' + blkEsc(b.label || 'Note') + '</span>' + (b.html || '') + '</div>';
        if (b.type === 'image') {
          if (!b.url) return '';
          return '<figure style="margin:14px 0;"><img src="' + blkEsc(b.url) + '" alt="' + blkEsc(b.caption || '') + '" style="max-width:100%;border-radius:10px;"/>' + (b.caption ? '<figcaption style="font-size:12px;color:#8a8578;margin-top:6px;">' + blkEsc(b.caption) + '</figcaption>' : '') + '</figure>';
        }
        if (b.type === 'video') {
          var id = ytId(b.url);
          if (!id) return '';
          return '<div style="position:relative;padding-top:56.25%;margin:14px 0;border-radius:10px;overflow:hidden;"><iframe src="https://www.youtube-nocookie.com/embed/' + blkEsc(id) + '" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
        }
        if (b.type === 'doc') {
          if (!b.url) return '';
          return '<a class="lms-doc-row" href="' + blkEsc(b.url) + '" target="_blank" rel="noopener">' + DOC_SVG + '<span class="nm">' + blkEsc(b.name || 'Document') + '</span><span class="op">Open</span></a>';
        }
        return b.html || '';
      }).join('');
    };

    function topicToBlocks(t){
      if (t && Array.isArray(t.blocks) && t.blocks.length) return JSON.parse(JSON.stringify(t.blocks));
      return [{ type: 'text', html: (t && t.content) || '<p></p>' }];
    }

    /* ---- editor state ---- */
    var blkList = [];
    var blkTopicId = null;
    var blkTimer = null;
    var blkDragIdx = -1;

    function draftKey(){ return 'spark_hq_blkdraft_' + blkTopicId; }
    function chip(msg, warn){
      var c = document.getElementById('blkChip');
      if (c) { c.textContent = msg || ''; c.style.color = warn ? '#B8912E' : '#8a8578'; }
    }
    function scheduleAutosave(){
      if (blkTimer) clearTimeout(blkTimer);
      blkTimer = setTimeout(function(){
        try {
          var tEl = document.getElementById('te-title');
          var mEl = document.getElementById('te-minutes');
          localStorage.setItem(draftKey(), JSON.stringify({
            at: Date.now(),
            title: tEl ? tEl.value : '',
            minutes: mEl ? mEl.value : '',
            blocks: blkList
          }));
          chip('Draft saved ' + new Date().toLocaleTimeString());
        } catch(e) {}
      }, 900);
    }

    /* ---- render ---- */
    window.lmsRenderBlockEditor = function(){
      var body = document.getElementById('topicEditorBody');
      if (!body || !editingTopicDraft) return;
      blkTopicId = editingTopicDraft.id;
      blkList = topicToBlocks(editingTopicDraft);
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch(e) {}
      var restore = '';
      if (saved && saved.blocks) {
        restore = '<div class="blk-restore" id="blkRestoreBar"><span>Unsaved draft from ' + blkEsc(new Date(saved.at).toLocaleString()) + '</span><button onclick="lmsRestoreDraft()">Restore</button><button onclick="lmsDiscardDraft()">Discard</button></div>';
      }
      body.innerHTML = restore
        + '<div class="blk-meta">'
        + '<label>Title<input id="te-title" value="' + blkEsc(editingTopicDraft.title || '') + '"/></label>'
        + '<label>Minutes<input id="te-minutes" type="number" min="1" value="' + blkEsc(editingTopicDraft.estimatedMinutes || 5) + '"/></label>'
        + '</div>'
        + '<div id="blkStack"></div>'
        + '<div class="blk-addrow"><span class="lbl">Add block</span>'
        + '<button class="blk-add" onclick="lmsAddBlock(\\'text\\')">Text</button>'
        + '<button class="blk-add" onclick="lmsAddBlock(\\'callout\\')">Callout</button>'
        + '<button class="blk-add" onclick="lmsAddBlock(\\'image\\')">Image</button>'
        + '<button class="blk-add" onclick="lmsAddBlock(\\'video\\')">Video</button>'
        + '<button class="blk-add" onclick="lmsAddBlock(\\'doc\\')">Document</button>'
        + '</div><div class="blk-chip" id="blkChip"></div>';
      var t = document.getElementById('te-title'); if (t) t.addEventListener('input', scheduleAutosave);
      var m = document.getElementById('te-minutes'); if (m) m.addEventListener('input', scheduleAutosave);
      paintStack();
    };

    window.lmsRestoreDraft = function(){
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch(e) {}
      if (!saved) return;
      blkList = saved.blocks || blkList;
      var t = document.getElementById('te-title'); if (t && saved.title) t.value = saved.title;
      var m = document.getElementById('te-minutes'); if (m && saved.minutes) m.value = saved.minutes;
      var bar = document.getElementById('blkRestoreBar'); if (bar) bar.remove();
      paintStack();
      chip('Draft restored — Save topic to keep it', true);
    };
    window.lmsDiscardDraft = function(){
      try { localStorage.removeItem(draftKey()); } catch(e) {}
      var bar = document.getElementById('blkRestoreBar'); if (bar) bar.remove();
      chip('Draft discarded');
    };
    window.lmsAddBlock = function(type){
      var b = { type: type };
      if (type === 'text') b.html = '<p></p>';
      if (type === 'callout') { b.label = 'Standard'; b.html = ''; }
      if (type === 'image') { b.url = ''; b.caption = ''; }
      if (type === 'video') { b.url = ''; }
      if (type === 'doc') { b.name = ''; b.url = ''; }
      blkList.push(b);
      paintStack();
      scheduleAutosave();
      var stack = document.getElementById('blkStack');
      if (stack && stack.lastChild && stack.lastChild.scrollIntoView) stack.lastChild.scrollIntoView({ block: 'nearest' });
    };

    function exec(cmd, val){ try { document.execCommand(cmd, false, val || null); } catch(e) {} }
    function toolbar(){
      return '<div class="blk-tb">'
        + '<button type="button" data-tb="bold"><b>B</b></button>'
        + '<button type="button" data-tb="italic"><i>I</i></button>'
        + '<button type="button" data-tb="h3">H</button>'
        + '<button type="button" data-tb="ul">List</button>'
        + '<button type="button" data-tb="link">Link</button>'
        + '<button type="button" data-tb="gold" style="color:' + GOLD + ';">Gold</button>'
        + '</div>';
    }
    function wireToolbar(card, ce){
      card.querySelectorAll('[data-tb]').forEach(function(btn){
        btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
        btn.addEventListener('click', function(){
          ce.focus();
          var k = btn.getAttribute('data-tb');
          if (k === 'bold') exec('bold');
          else if (k === 'italic') exec('italic');
          else if (k === 'h3') exec('formatBlock', '<h3>');
          else if (k === 'ul') exec('insertUnorderedList');
          else if (k === 'gold') exec('foreColor', GOLD);
          else if (k === 'link') { var u = prompt('Link URL:'); if (u) exec('createLink', u); }
        });
      });
    }

    function paintStack(){
      var stack = document.getElementById('blkStack');
      if (!stack) return;
      stack.innerHTML = '';
      blkList.forEach(function(b, i){ stack.appendChild(card(b, i)); });
    }

    function field(lbl, val, onInput, ph){
      var w = document.createElement('div'); w.className = 'blk-field';
      w.innerHTML = '<label>' + blkEsc(lbl) + '</label>';
      var inp = document.createElement('input');
      inp.value = val || '';
      if (ph) inp.placeholder = ph;
      inp.addEventListener('input', function(){ onInput(inp.value); scheduleAutosave(); });
      w.appendChild(inp);
      return w;
    }

    function card(b, i){
      var el = document.createElement('div');
      el.className = 'blk-card';
      var names = { text: 'Text', callout: 'Callout', image: 'Image', video: 'Video', doc: 'Document' };
      var head = document.createElement('div');
      head.className = 'blk-head';
      head.innerHTML = '<span class="blk-grip">' + GRIP_SVG + '</span><span class="blk-type">' + (names[b.type] || 'Block') + '</span><span class="sp"></span>'
        + '<button class="blk-btn" data-a="up">Up</button>'
        + '<button class="blk-btn" data-a="down">Down</button>'
        + '<button class="blk-btn" data-a="dup">Copy</button>'
        + '<button class="blk-btn" data-a="del">Delete</button>';
      el.appendChild(head);
      var body = document.createElement('div');
      body.className = 'blk-body';
      el.appendChild(body);

      if (b.type === 'text' || b.type === 'callout') {
        if (b.type === 'callout') body.appendChild(field('Callout label', b.label, function(v){ b.label = v; }, 'Standard'));
        body.insertAdjacentHTML('beforeend', toolbar());
        var ce = document.createElement('div');
        ce.className = 'blk-ce';
        ce.contentEditable = 'true';
        ce.innerHTML = b.html || '<p></p>';
        ce.addEventListener('input', function(){ b.html = ce.innerHTML; scheduleAutosave(); });
        body.appendChild(ce);
        wireToolbar(el, ce);
      } else if (b.type === 'image') {
        var prev = document.createElement('img'); prev.className = 'blk-imgprev';
        body.appendChild(field('Image URL', b.url, function(v){ b.url = v; prev.src = v; prev.style.display = v ? 'block' : 'none'; }, 'https://...'));
        body.appendChild(field('Caption (optional)', b.caption, function(v){ b.caption = v; }));
        if (b.url) prev.src = b.url; else prev.style.display = 'none';
        prev.onerror = function(){ prev.style.display = 'none'; };
        body.appendChild(prev);
      } else if (b.type === 'video') {
        body.appendChild(field('YouTube URL or video ID', b.url, function(v){ b.url = v; }, 'https://youtu.be/...'));
      } else if (b.type === 'doc') {
        body.appendChild(field('Document name', b.name, function(v){ b.name = v; }, 'Charge Calculation Guide'));
        body.appendChild(field('Link (SharePoint or URL)', b.url, function(v){ b.url = v; }, 'https://sparktalent.sharepoint.com/...'));
      } else {
        body.innerHTML = '<div style="font-size:12px;color:#8a8578;">Unknown block type — kept as-is.</div>';
      }

      head.querySelectorAll('[data-a]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var a = btn.getAttribute('data-a');
          if (a === 'up' && i > 0) { blkList.splice(i - 1, 0, blkList.splice(i, 1)[0]); }
          else if (a === 'down' && i < blkList.length - 1) { blkList.splice(i + 1, 0, blkList.splice(i, 1)[0]); }
          else if (a === 'dup') { blkList.splice(i + 1, 0, JSON.parse(JSON.stringify(b))); }
          else if (a === 'del') { if (!confirm('Delete this block?')) return; blkList.splice(i, 1); }
          paintStack();
          scheduleAutosave();
        });
      });

      /* drag reorder via the grip */
      var grip = head.querySelector('.blk-grip');
      grip.addEventListener('mousedown', function(){ el.draggable = true; });
      el.addEventListener('mouseup', function(){ el.draggable = false; });
      el.addEventListener('dragstart', function(ev){ blkDragIdx = i; try { ev.dataTransfer.setData('text/plain', String(i)); } catch(e) {} });
      el.addEventListener('dragend', function(){ el.draggable = false; blkDragIdx = -1; document.querySelectorAll('.blk-dragover').forEach(function(x){ x.classList.remove('blk-dragover'); }); });
      el.addEventListener('dragover', function(ev){ ev.preventDefault(); el.classList.add('blk-dragover'); });
      el.addEventListener('dragleave', function(){ el.classList.remove('blk-dragover'); });
      el.addEventListener('drop', function(ev){
        ev.preventDefault();
        el.classList.remove('blk-dragover');
        if (blkDragIdx < 0 || blkDragIdx === i) return;
        blkList.splice(i, 0, blkList.splice(blkDragIdx, 1)[0]);
        blkDragIdx = -1;
        paintStack();
        scheduleAutosave();
      });
      return el;
    }

    /* ---- override the opener: legacy runs, then we repaint the body ---- */
    var __blkOrigOpen = window.__OPENER__;
    window.__OPENER__ = function(){
      __blkOrigOpen.apply(this, arguments);
      try { window.lmsRenderBlockEditor(); }
      catch(e) { try { console.error('[LMS blocks] editor upgrade failed — legacy editor left in place', e); } catch(_) {} }
    };

    /* ---- override save: compile blocks; fall through to legacy if block UI absent ---- */
    var __blkOrigSave = window.saveTopic;
    window.saveTopic = function(){
      if (!editingTopicDraft || !document.getElementById('blkStack')) { return __blkOrigSave(); }
      if (blkTimer) clearTimeout(blkTimer);
      var tEl = document.getElementById('te-title');
      var mEl = document.getElementById('te-minutes');
      editingTopicDraft.title = (tEl ? tEl.value : '').trim();
      editingTopicDraft.estimatedMinutes = parseInt(mEl ? mEl.value : '5', 10) || 5;
      if (!editingTopicDraft.title) { alert('Title required.'); return; }
      var cleaned = blkList.filter(function(b){
        if (!b) return false;
        if (b.type === 'image' || b.type === 'video' || b.type === 'doc') return !!b.url;
        return true;
      });
      editingTopicDraft.blocks = JSON.parse(JSON.stringify(cleaned));
      editingTopicDraft.content = window.lmsBlocksToHtml(cleaned);
      var subj = LMS_DATA.subjects.find(function(s){ return s.id === trainingAdminSubjectId; });
      if (!subj) { alert('Subject not found — reopen the editor from the subject list.'); return; }
      if (!subj.topics) subj.topics = [];
      var idx = subj.topics.findIndex(function(t){ return t.id === editingTopicDraft.id; });
      if (idx >= 0) subj.topics[idx] = editingTopicDraft; else subj.topics.push(editingTopicDraft);
      try { localStorage.removeItem(draftKey()); } catch(e) {}
      persistLmsData();
      closeTopicEditor();
      renderTrainingAdmin();
      try { renderLmsRail(); } catch(e) {}
      try { renderLmsContent(); } catch(e) {}
    };
  })();

`;

/* ---------- assemble ---------- */
const moduleFinal = MODULE.split('__OPENER__').join(OPENER);
const markIdx = h.indexOf(MERGE_MARK);
const out = h.slice(0, markIdx) + moduleFinal + h.slice(markIdx);

/* ---------- verify ---------- */
if (out.split('LMS_BLOCKS_v1').length - 1 < 1) fail('module marker missing after splice.');
if ((out.match(/window\.saveTopic\s*=\s*function/g) || []).length !== 2) fail('expected exactly 2 saveTopic assignments after patch (legacy + override).');
const openerAssignments = (out.match(new RegExp('window\\.' + OPENER + '\\s*=\\s*function', 'g')) || []).length;
if (openerAssignments !== 2) fail('expected exactly 2 assignments of window.' + OPENER + ' after patch, found ' + openerAssignments + '.');
if (out.includes('__OPENER__')) fail('opener placeholder not fully substituted.');
ok('output verified: override layer in place for window.' + OPENER + ' and window.saveTopic');

/* ---------- backup, write ---------- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bak = 'index.html.backup-blocks-' + stamp;
fs.writeFileSync(bak, h);
ok('backup written: ' + bak);
fs.writeFileSync(FILE, out);
ok('index.html written (' + out.length + ' bytes, was ' + h.length + ')');
console.log('\nDone. Commit, push, wait ~2 min for Azure, then Ctrl+Shift+R and open any topic in Training admin.');
