/* MY_LINKS_v1 + MY_PHOTO_UPLOAD_v1
   Loaded into the HQ shell (index.html) by spark-home.html, because index.html is too large to edit on github.com.
   - "My links": a personal links menu next to Quick Actions. Saved per person (spark_hq_my_links) through the worker /my-links.
   - "Update my photo": in the account menu. Sends a square JPG to the worker /my-photo, which writes it to that
     person's own Microsoft 365 profile (Outlook, Teams, HQ). Needs Graph ProfilePhoto.ReadWrite.All with admin consent. */
(function () {
  if (window.__hqMyLinks) return;
  window.__hqMyLinks = true;
  var W = 'https://spark-hq-worker.sparkcompanies.workers.dev';
  var d = document;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function tok() {
    return (window.SPARK_SB && window.SPARK_SB.getToken) ? Promise.resolve(window.SPARK_SB.getToken()) : Promise.resolve('');
  }
  function api(path, method, body) {
    return tok().then(function (t) {
      var h = { 'Authorization': 'Bearer ' + t };
      if (body) h['Content-Type'] = 'application/json';
      return fetch(W + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined })
        .then(function (r) { return r.json(); });
    });
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

  var css = ''
    + '.ml-wrap{position:relative;margin-right:10px;flex:none;z-index:61}'
    + '.ml-btn{display:inline-flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:9px;border:1px solid var(--line,#e7e4dc);background:#fff;color:var(--ink,#111);font:500 12.5px "Jost",sans-serif;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s}'
    + '.ml-btn:hover,.ml-btn[aria-expanded=true]{background:#fffbe6;border-color:rgba(255,200,0,.6)}'
    + '.ml-btn .ic{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:linear-gradient(145deg,#2a2d4a,#0d0e1a);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}'
    + '.ml-btn .ic svg{width:13px;height:13px;stroke:#FFC800;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + '.ml-btn .ct{color:#8a8577;font-weight:400}'
    + '.ml-pop{position:absolute;top:calc(100% + 8px);left:0;width:330px;background:#fff;border:1px solid var(--line,#e7e4dc);border-radius:14px;box-shadow:0 18px 40px -12px rgba(13,14,26,.35);padding:12px;display:none}'
    + '.ml-pop.open{display:block}'
    + '.ml-h{font:700 10px "Jost",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#8a8577;margin:2px 6px 8px}'
    + '.ml-row{display:flex;align-items:center;border-radius:9px}'
    + '.ml-row:hover{background:#fffbe6}'
    + '.ml-row a{flex:1;min-width:0;display:flex;align-items:center;gap:8px;padding:8px;color:#111;text-decoration:none;font:500 13px "Jost",sans-serif}'
    + '.ml-row .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.ml-row .dom{color:#8a8577;font-size:11px;margin-left:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.ml-row .rm{border:0;background:transparent;color:#b4ae9f;cursor:pointer;font-size:17px;line-height:1;padding:4px 7px;border-radius:6px;margin-right:2px}'
    + '.ml-row .rm:hover{color:#c0392b;background:#fdecea}'
    + '.ml-empty{padding:4px 8px 10px;color:#6b6a64;font:400 12.5px "Jost",sans-serif}'
    + '.ml-form{border-top:1px solid var(--line,#eee);margin-top:6px;padding-top:10px;display:grid;gap:6px}'
    + '.ml-form input{border:1px solid #e3dfd3;border-radius:8px;padding:8px 10px;font:400 13px "Jost",sans-serif;outline:none}'
    + '.ml-form input:focus{border-color:#FFC800;box-shadow:0 0 0 3px rgba(255,200,0,.2)}'
    + '.ml-form button{border:0;border-radius:8px;padding:9px 10px;background:#111;color:#FFC800;font:600 12.5px "Jost",sans-serif;cursor:pointer}'
    + '.ml-msg{font:400 11.5px "Jost",sans-serif;min-height:14px;color:#6b6a64}'
    + '.ml-msg.err{color:#c0392b}'
    + '@media (max-width:999px){.ml-wrap{display:none}}';
  var st = d.createElement('style'); st.id = 'myLinksCss'; st.textContent = css; d.head.appendChild(st);

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';

  /* ---------- My links ---------- */
  var links = [], built = false;
  function render() {
    var l = d.getElementById('mlList'); if (!l) return;
    l.innerHTML = links.length ? links.map(function (x) {
      return '<div class="ml-row"><a href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="nm">' + esc(x.label) + '</span><span class="dom">' + esc(host(x.url)) + '</span></a>'
        + '<button type="button" class="rm" data-rm="' + esc(x.id) + '" aria-label="Remove ' + esc(x.label) + '" title="Remove">&times;</button></div>';
    }).join('') : '<div class="ml-empty">Save the sites you use every day. Only you see these.</div>';
    var c = d.getElementById('mlCount'); if (c) c.textContent = links.length ? String(links.length) : '';
  }
  function buildLinks() {
    if (built) return;
    var bar = d.getElementById('favBar'); if (!bar || !bar.parentNode) return;
    built = true;
    var w = d.createElement('div'); w.className = 'ml-wrap';
    w.innerHTML = '<button type="button" class="ml-btn" id="mlBtn" aria-haspopup="true" aria-expanded="false"><span class="ic">' + STAR + '</span>My links <span class="ct" id="mlCount"></span></button>'
      + '<div class="ml-pop" id="mlPop" role="dialog" aria-label="My links"><div class="ml-h">My links</div><div id="mlList"></div>'
      + '<form class="ml-form" id="mlForm" autocomplete="off"><input id="mlLabel" maxlength="40" placeholder="Name, like FB Marketplace" aria-label="Link name" required>'
      + '<input id="mlUrl" maxlength="500" placeholder="Web address, like facebook.com/marketplace" aria-label="Web address" required>'
      + '<div class="ml-msg" id="mlMsg" aria-live="polite"></div><button type="submit">Add link</button></form></div>';
    bar.parentNode.insertBefore(w, bar.nextSibling);
    var btn = d.getElementById('mlBtn'), pop = d.getElementById('mlPop'), msg = d.getElementById('mlMsg');
    function close() { pop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var o = pop.classList.toggle('open'); btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (o) setTimeout(function () { d.getElementById('mlLabel').focus(); }, 30);
    });
    d.addEventListener('click', function (e) { if (!w.contains(e.target)) close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    d.getElementById('mlList').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]'); if (!b) return;
      e.preventDefault();
      api('/my-links', 'POST', { remove: b.getAttribute('data-rm') }).then(function (j) { if (j && j.ok) { links = j.links || []; render(); } });
    });
    d.getElementById('mlForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target; msg.className = 'ml-msg'; msg.textContent = 'Saving…';
      api('/my-links', 'POST', { label: d.getElementById('mlLabel').value, url: d.getElementById('mlUrl').value })
        .then(function (j) {
          if (j && j.ok) { links = j.links || []; render(); msg.textContent = ''; f.reset(); d.getElementById('mlLabel').focus(); }
          else { msg.className = 'ml-msg err'; msg.textContent = (j && j.error) || 'Could not save that link'; }
        })
        .catch(function () { msg.className = 'ml-msg err'; msg.textContent = 'Could not save that link'; });
    });
    render();
    api('/my-links', 'GET').then(function (j) { if (j && j.ok) { links = j.links || []; render(); } }).catch(function () {});
  }

  /* ---------- Update my photo ---------- */
  function buildPhoto() {
    var menu = d.getElementById('userMenu'); if (!menu || d.getElementById('umPhotoBtn')) return !!menu;
    var lo = [].slice.call(menu.querySelectorAll('button,a')).filter(function (b) { return /log ?out|sign ?out/i.test(b.textContent); })[0];
    var b = d.createElement('button'); b.type = 'button'; b.id = 'umPhotoBtn'; b.textContent = 'Update my photo';
    if (lo) { b.className = lo.className; lo.parentNode.insertBefore(b, lo); } else menu.appendChild(b);
    var inp = d.createElement('input'); inp.type = 'file'; inp.accept = 'image/jpeg,image/png'; inp.style.display = 'none'; d.body.appendChild(inp);
    var label = 'Update my photo';
    function say(t, ms) { b.textContent = t; if (ms) setTimeout(function () { b.textContent = label; }, ms); }
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); inp.value = ''; inp.click(); });
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      say('Uploading…');
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var s = Math.min(img.width, img.height), c = d.createElement('canvas');
        c.width = c.height = 648;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 648, 648);
        URL.revokeObjectURL(url);
        var data = c.toDataURL('image/jpeg', 0.88);
        api('/my-photo', 'POST', { image: data }).then(function (j) {
          if (j && j.ok) {
            ['userAvatar', 'umAvatar'].forEach(function (id) {
              var el = d.getElementById(id); if (!el) return;
              el.style.backgroundImage = 'url("' + data + '")'; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center';
              el.style.color = 'transparent'; el.setAttribute('data-photo', '1');
            });
            say('Photo updated. Outlook and Teams can take a few hours to catch up.', 6000);
          } else {
            say((j && j.error) || 'Could not update your photo', 6000);
          }
        }).catch(function () { say('Could not update your photo', 5000); });
      };
      img.onerror = function () { URL.revokeObjectURL(url); say('Use a JPG or PNG photo', 5000); };
      img.src = url;
    });
    return true;
  }

  var tries = 0;
  (function wait() {
    var ready = window.SPARK_SB && window.SPARK_SB.whoami && window.SPARK_SB.whoami();
    if (ready) { buildLinks(); if (buildPhoto() && built) return; }
    if (tries++ < 80) setTimeout(wait, 750);
  })();
})();
