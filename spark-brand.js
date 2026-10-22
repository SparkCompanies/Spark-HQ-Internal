/* Spark Brand Hub — logo grid, swatches, post maker, signature. No dependencies. */
(function () {
  "use strict";

  var BRANDS = [
    { key:"companies", name:"Spark Companies", mark:"®", svg:"brand/spark-companies.svg", png:"brand/spark-companies-logo.png", rev:"brand/spark-companies-reversed.svg", revPng:"brand/spark-companies-reversed.png",
      gold:"#FFC800", logoGold:"#FBD20F", dark:"#0D0E1A", house:true,
      note:"The house brand. Its gold is the portfolio colour — use it for anything that spans more than one entity." },
    { key:"talent", name:"Spark Talent Acquisition", mark:"™", svg:"brand/spark-talent.svg", png:"brand/spark-talent-logo.png", rev:"brand/spark-talent-reversed.svg", revPng:"brand/spark-talent-reversed.png",
      gold:"#FCD20E", dark:"#000000", note:"Staffing and direct hire. Carries ™, not ®." },
    { key:"ignite", name:"Ignite Search", mark:"", svg:"brand/ignite-search.svg", png:"brand/ignite-search-logo.png", rev:"brand/ignite-search-reversed.svg", revPng:"brand/ignite-search-reversed.png",
      gold:"#F2D416", dark:"#000000", note:"Executive search and strategy, and IT staffing." },
    { key:"jjp", name:"John Joseph Partners", mark:"®", svg:"brand/jjp.svg", png:"brand/jjp-logo.png", rev:"brand/jjp-reversed.svg", revPng:"brand/jjp-reversed.png",
      gold:"#FAD110", dark:"#000000", note:"IT staffing and search. Registered mark.",
      alts:[ {label:"Mark only", svg:"brand/jjp-mark.svg", png:"brand/jjp-mark-light.png"},
             {label:"Mark, reversed", png:"brand/jjp-mark-dark.png"} ] },
    { key:"flex", name:"Flex Workforce Solutions", mark:"", svg:"brand/flex.svg", png:"brand/flex-logo.png", rev:"brand/flex-reversed.svg", revPng:"brand/flex-reversed.png",
      gold:"#EC8F2F", dark:"#0C2745", orange:true,
      note:"The one brand that is deliberately not gold. Orange and navy, its own identity — do not “correct” it." },
    { key:"packaging", name:"Spark Packaging", mark:"", svg:"brand/spark-packaging.svg", png:"brand/spark-packaging-wordmark.png", rev:"brand/spark-packaging-reversed.svg", revPng:"brand/spark-packaging-reversed.png",
      gold:"#FFDD5F", dark:"#3D3D3D", note:"Packaging and co-manufacturing talent.",
      alts:[ {label:"Circle badge", png:"brand/spark-packaging-logo.png"},
             {label:"Reversed", png:"brand/spark-packaging-reversed.png"} ] },
    { key:"bolt", name:"Bolt Creative", mark:"", png:"bolt-creative-logo.png",
      gold:"#FFC800", dark:"#0D0E1A", note:"The in-house creative studio. Vector version still to come." }
  ];

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  };
  var dlIcon = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';

  /* ---------------- logos ---------------- */
  function logoCard(b) {
    var main = b.svg || b.png;
    var alts = (b.alts || []).map(function (a, i) {
      return '<button class="btn ghost" data-alt="' + b.key + ':' + i + '">' + esc(a.label) + "</button>";
    }).join("");
    return '<div class="card lcard" data-brand="' + b.key + '">' +
      '<div class="lstage" data-stage="' + b.key + '"><img src="' + esc(main) + '" alt="' + esc(b.name) + ' logo" loading="lazy"></div>' +
      '<div class="lbody">' +
        '<p class="lname">' + esc(b.name) + (b.mark ? '<span class="lmark">' + esc(b.mark) + "</span>" : "") + "</p>" +
        '<p class="lnote">' + esc(b.note) + "</p>" +
        '<div class="lrow">' +
          (b.svg ? '<a class="btn" href="' + esc(b.svg) + '" download>' + dlIcon + "SVG</a>"
                 : '<span class="btn dim">SVG soon</span>') +
          '<a class="btn" href="' + esc(b.png) + '" download>' + dlIcon + "PNG</a>" +
          (b.rev ? '<a class="btn" href="' + esc(b.rev) + '" download title="White artwork, for dark backgrounds">' + dlIcon + "REVERSED</a>" : "") +
          alts +
          '<span class="toggle"><button class="on" data-bg="' + b.key + ':light">LIGHT</button>' +
          '<button data-bg="' + b.key + ':dark">DARK</button></span>' +
        "</div></div></div>";
  }

  var grid = document.getElementById("lgrid");
  if (grid) {
    grid.innerHTML = BRANDS.map(logoCard).join("");
    grid.addEventListener("click", function (e) {
      var bg = e.target.closest("[data-bg]");
      if (bg) {
        var p = bg.getAttribute("data-bg").split(":");
        var stage = grid.querySelector('[data-stage="' + p[0] + '"]');
        var isDark = p[1] === "dark";
        stage.classList.toggle("dark", isDark);
        var br = BRANDS.filter(function (x) { return x.key === p[0]; })[0];
        var im = stage.querySelector("img");
        if (br && im) im.src = isDark ? (br.rev || br.svg || br.png) : (br.svg || br.png);
        bg.parentNode.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        bg.classList.add("on");
        return;
      }
      var alt = e.target.closest("[data-alt]");
      if (alt) {
        var q = alt.getAttribute("data-alt").split(":");
        var brand = BRANDS.filter(function (x) { return x.key === q[0]; })[0];
        var a = brand.alts[+q[1]];
        var img = grid.querySelector('[data-stage="' + q[0] + '"] img');
        img.src = a.svg || a.png;
        if (/revers/i.test(a.label)) grid.querySelector('[data-stage="' + q[0] + '"]').classList.add("dark");
      }
    });
  }

  /* ---------------- colour ---------------- */
  // Named explicitly: deriving from the brand name gave two "Spark gold"s and called Flex's orange gold.
  var SWNAME = { companies:"House gold", talent:"Spark Talent gold", ignite:"Ignite gold",
                 jjp:"JJP gold", flex:"Flex orange", packaging:"Packaging gold" };
  var SW = [];
  BRANDS.forEach(function (b) {
    if (b.key === "bolt") return;
    SW.push({ nm: SWNAME[b.key] || b.name, hex: b.gold, who: b.house ? "Portfolio-wide" : b.name });
  });
  SW.push({ nm:"Night", hex:"#0D0E1A", who:"Spark Companies, Spark HQ", dark:true });
  SW.push({ nm:"Flex navy", hex:"#0C2745", who:"Flex Workforce Solutions", dark:true });
  SW.push({ nm:"Packaging charcoal", hex:"#3D3D3D", who:"Spark Packaging", dark:true });
  SW.push({ nm:"Cream", hex:"#FAF9F6", who:"Backgrounds, everywhere", dark:false });

  var swEl = document.getElementById("swatches");
  if (swEl) {
    var lum = function (hex) {
      var h = hex.replace("#", "");
      var r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
      var f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    swEl.innerHTML = SW.map(function (s) {
      var ink = lum(s.hex) > 0.42 ? "#17150d" : "#ffffff";   // contrast against the tile itself
      return '<button class="sw" data-hex="' + s.hex + '" style="background:' + s.hex + ';color:' + ink + '" title="Copy ' + s.hex + '">' +
        '<span class="meta"><p class="nm">' + esc(s.nm) + '</p><span class="hex">' + s.hex + "</span>" +
        '<span class="who">' + esc(s.who) + "</span></span></button>";
    }).join("");
    swEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-hex]"); if (!b) return;
      var hex = b.getAttribute("data-hex"), el = b.querySelector(".hex"), was = el.textContent;
      var done = function () { el.textContent = "Copied"; el.classList.add("copied");
        setTimeout(function () { el.textContent = was; el.classList.remove("copied"); }, 1100); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(hex).then(done, function () {});
      else { var t = document.createElement("textarea"); t.value = hex; document.body.appendChild(t); t.select();
             try { document.execCommand("copy"); done(); } catch (x) {} document.body.removeChild(t); }
    });
  }
  var gn = document.getElementById("goldNote");
  if (gn) gn.innerHTML = "<b>Why five golds?</b> Each entity logo was drawn at a different time, so each carries its own value — " +
    "<code>#FFC800</code>, <code>#FCD20E</code>, <code>#F2D416</code>, <code>#FAD110</code>, <code>#FFDD5F</code>. " +
    "Side by side on one slide the difference shows. Use the house gold for anything portfolio-wide, and the entity value when you are working inside a single brand.";

  /* ---------------- post maker ---------------- */
  var C = document.getElementById("pmCanvas");
  if (C) {
    var ctx = C.getContext("2d");
    var SIZES = { "li-link":[1200,627], square:[1080,1080], portrait:[1080,1350], story:[1080,1920] };
    var sel = document.getElementById("pmBrand");
    sel.innerHTML = BRANDS.map(function (b) { return '<option value="' + b.key + '">' + esc(b.name) + "</option>"; }).join("");
    var G = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; };

    var imgCache = {};
    function loadImg(src) {
      if (!src) return Promise.resolve(null);
      if (imgCache[src]) return Promise.resolve(imgCache[src]);
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () { imgCache[src] = im; res(im); };
        im.onerror = function () { res(null); };
        im.src = src;
      });
    }

    function wrap(text, maxW, font) {
      ctx.font = font;
      var words = String(text).split(/\s+/), lines = [], cur = "";
      words.forEach(function (w) {
        var t = cur ? cur + " " + w : w;
        if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
      });
      if (cur) lines.push(cur);
      return lines;
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }

    /* QR, drawn from qrcode-generator if it loaded; silently absent if the CDN is blocked */
    function drawQR(text, x, y, size, fg, bg) {
      if (!window.qrcode) return false;
      var q;
      try { q = window.qrcode(0, "M"); q.addData(text); q.make(); } catch (e) { return false; }
      var n = q.getModuleCount(), cell = size / (n + 4), off = cell * 2;
      ctx.fillStyle = bg; roundRect(x, y, size, size, size * 0.07); ctx.fill();
      ctx.fillStyle = fg;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        if (q.isDark(r, c)) ctx.fillRect(Math.floor(x + off + c * cell), Math.floor(y + off + r * cell), Math.ceil(cell), Math.ceil(cell));
      }
      return true;
    }

    function paintBg(b, theme, W, H, S) {
      var bgCol, fg, accent;
      if (theme === "night") { bgCol = b.dark || "#0d0e1a"; fg = "#ffffff"; accent = b.gold; }
      else if (theme === "gold") { bgCol = b.gold; fg = b.orange ? "#0C2745" : "#17150d"; accent = b.dark || "#0d0e1a"; }
      else { bgCol = "#faf9f6"; fg = "#16140e"; accent = b.gold; }
      ctx.fillStyle = bgCol; ctx.fillRect(0, 0, W, H);
      if (theme === "night") {
        var g = ctx.createRadialGradient(W * 0.14, -H * 0.08, 0, W * 0.14, -H * 0.08, Math.max(W, H) * 1.05);
        g.addColorStop(0, "rgba(255,200,0,.22)"); g.addColorStop(0.55, "rgba(255,200,0,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        var g2 = ctx.createRadialGradient(W * 0.92, H * 1.02, 0, W * 0.92, H * 1.02, Math.max(W, H) * 0.8);
        g2.addColorStop(0, "rgba(255,213,19,.13)"); g2.addColorStop(1, "rgba(255,213,19,0)");
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = accent; ctx.fillRect(0, H - 10 * S, W, 10 * S);
      return { fg: fg, accent: accent, bg: bgCol };
    }

    function placeLogo(b, theme, W, H, S, pad) {
      var useRev = (theme === "night") && b.rev;
      var src = useRev ? b.rev : (b.svg || b.png);
      return loadImg(src).then(function (im) {
        if (!im) return;
        var maxW = Math.min(300 * S, W * 0.38), maxH = 78 * S;
        var r = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
        var lw = im.naturalWidth * r, lh = im.naturalHeight * r;
        var lx = W - pad - lw, ly = pad;
        if (!useRev && theme === "gold") {
          ctx.fillStyle = "rgba(255,255,255,.95)";
          roundRect(lx - 16 * S, ly - 14 * S, lw + 32 * S, lh + 28 * S, 12 * S); ctx.fill();
        }
        ctx.drawImage(im, lx, ly, lw, lh);
      });
    }

    function draw() {
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0];
      var fmt = G("pmFormat"), kind = G("pmKind"), theme = G("pmTheme");
      var jwu = document.getElementById("pmJwu").checked;
      var d = SIZES[fmt]; C.width = d[0]; C.height = d[1];
      var W = d[0], H = d[1], S = Math.min(W, H) / 1080, pad = 76 * S;
      document.getElementById("pmDims").textContent = W + " × " + H + " px · " + b.name + (kind === "hiring" ? " · hiring" : "");

      var col = paintBg(b, theme, W, H, S);
      var fg = col.fg, accent = col.accent;
      var dim = theme === "night" ? "rgba(255,255,255,.72)" : (theme === "gold" ? "rgba(0,0,0,.62)" : "#6f6a5d");
      ctx.textBaseline = "top";

      if (kind === "statement") {
        var y = pad + 26 * S;
        var hFont = "400 " + Math.round((fmt === "li-link" ? 88 : 108) * S) + "px 'Bebas Neue', Impact, sans-serif";
        ctx.font = hFont; ctx.fillStyle = fg;
        var lh = (fmt === "li-link" ? 84 : 102) * S;
        wrap(G("pmHead").toUpperCase() || " ", W - pad * 2, hFont).forEach(function (ln) { ctx.fillText(ln, pad, y); y += lh; });
        var sub = G("pmSub");
        if (sub) {
          y += 18 * S;
          var sFont = "400 " + Math.round(34 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
          ctx.font = sFont; ctx.fillStyle = dim;
          wrap(sub, W - pad * 2, sFont).forEach(function (ln) { ctx.fillText(ln, pad, y); y += 44 * S; });
        }
      } else {
        /* hiring: the role leads, the pay is the hook, everything else is optional furniture */
        var role = G("pmRole") || "Open role", pay = G("pmPay"), shift = G("pmShift"),
            loc = G("pmLoc"), apply = G("pmApply"), recEmail = G("pmRec");
        var bottomBand = !!(recEmail || apply);
        var y2 = pad + (bottomBand ? 22 * S : Math.round(H * 0.11));
        ctx.font = "700 " + Math.round(26 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
        ctx.fillStyle = accent;
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (7 * S) + "px";
        ctx.fillText("NOW HIRING", pad, y2);
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
        y2 += 56 * S;

        var rFont = "400 " + Math.round((fmt === "li-link" ? 92 : 112) * S) + "px 'Bebas Neue', Impact, sans-serif";
        ctx.font = rFont; ctx.fillStyle = fg;
        var rlh = (fmt === "li-link" ? 86 : 104) * S;
        wrap(role.toUpperCase(), W - pad * 2 - (120 * S), rFont).forEach(function (ln) { ctx.fillText(ln, pad, y2); y2 += rlh; });

        var meta = [loc, shift].filter(Boolean).join("   ·   ");
        if (meta) {
          y2 += 10 * S;
          ctx.font = "400 " + Math.round(31 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
          ctx.fillStyle = dim; ctx.fillText(meta, pad, y2); y2 += 52 * S;
        }
        if (pay) {
          y2 += 20 * S;
          ctx.fillStyle = accent; ctx.fillRect(pad, y2, 76 * S, 5 * S);
          y2 += 26 * S;
          ctx.font = "400 " + Math.round(84 * S) + "px 'Bebas Neue', Impact, sans-serif";
          ctx.fillStyle = accent; ctx.fillText(pay, pad, y2);
          y2 += 96 * S;
        }
        window.__pmJwuY = y2 + 46 * S;

        /* recruiter chip, bottom left */
        var chipY = H - pad - 92 * S;
        if (recEmail) {
          var rp = (window.__pmPeople || {})[recEmail] || {};
          var ph = (window.__pmPhotos || {})[recEmail];
          var cx = pad, cyc = chipY + 46 * S, rad = 44 * S;
          var after = function () {
            ctx.font = "700 " + Math.round(27 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = fg; ctx.textBaseline = "alphabetic";
            ctx.fillText(rp.name || recEmail.split("@")[0], cx + rad * 2 + 20 * S, cyc - 2 * S);
            ctx.font = "400 " + Math.round(21 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = dim;
            ctx.fillText(rp.title || "Talk to me about this role", cx + rad * 2 + 20 * S, cyc + 26 * S);
            ctx.textBaseline = "top";
          };
          if (ph) {
            loadImg(ph).then(function (im) {
              if (im) {
                ctx.save(); ctx.beginPath(); ctx.arc(cx + rad, cyc, rad, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
                ctx.drawImage(im, cx, cyc - rad, rad * 2, rad * 2); ctx.restore();
                ctx.beginPath(); ctx.arc(cx + rad, cyc, rad, 0, Math.PI * 2);
                ctx.strokeStyle = accent; ctx.lineWidth = 3 * S; ctx.stroke();
              }
              after();
            });
          } else {
            ctx.beginPath(); ctx.arc(cx + rad, cyc, rad, 0, Math.PI * 2);
            ctx.fillStyle = accent; ctx.fill();
            ctx.font = "700 " + Math.round(30 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = "#17150d"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(((rp.name || recEmail)[0] || "?").toUpperCase(), cx + rad, cyc);
            ctx.textAlign = "left"; ctx.textBaseline = "top";
            after();
          }
        }

        /* apply code, bottom right */
        var hasQR = false;
        if (apply) {
          var qs = 150 * S, qx = W - pad - qs, qy = H - pad - qs - 4 * S;
          hasQR = drawQR(apply, qx, qy, qs, "#17150d", "#ffffff");
          if (hasQR) {
            ctx.font = "400 " + Math.round(19 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = dim; ctx.textAlign = "center";
            ctx.fillText("Scan to apply", qx + qs / 2, qy + qs + 12 * S);
            ctx.textAlign = "left";
          } else {
            // generator unavailable: show the link so the graphic still carries a way in
            ctx.font = "400 " + Math.round(22 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = dim; ctx.textAlign = "right";
            ctx.fillText(apply.replace(/^https?:\/\//, ""), W - pad, H - pad - 4 * S);
            ctx.textAlign = "left";
          }
        }
        window.__pmSlots = { left: !!recEmail, right: !!apply };
      }

      if (jwu) {
        var slots = (kind === "hiring" && window.__pmSlots) || { left: false, right: false };
        ctx.font = "400 " + Math.round(44 * S) + "px 'Bebas Neue', Impact, sans-serif";
        ctx.fillStyle = accent; ctx.textBaseline = "alphabetic";
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (3 * S) + "px";
        if (!slots.left) {                       // bottom left is free
          ctx.fillText("#JWU", pad, H - pad - 6 * S);
        } else if (!slots.right) {               // recruiter took the left, use the right
          ctx.textAlign = "right"; ctx.fillText("#JWU", W - pad, H - pad - 6 * S); ctx.textAlign = "left";
        } else if (window.__pmJwuY) {            // both corners taken: sit it under the pay block
          ctx.fillText("#JWU", pad, window.__pmJwuY);
        }
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
        ctx.textBaseline = "top";
      }
      placeLogo(b, theme, W, H, S, pad);
    }
    window.__pmDraw = draw;

    ["pmBrand","pmFormat","pmKind","pmTheme","pmJwu","pmHead","pmSub","pmRole","pmPay","pmShift","pmLoc","pmApply","pmRec"].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", function () {
        if (id === "pmKind") {
          var hiring = G("pmKind") === "hiring";
          document.getElementById("pmStatementFields").style.display = hiring ? "none" : "";
          document.getElementById("pmHiringFields").style.display = hiring ? "" : "none";
        }
        draw();
      });
    });

    document.getElementById("pmDl").addEventListener("click", function () {
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0];
      C.toBlob(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "spark-" + b.key + "-" + G("pmKind") + "-" + G("pmFormat") + ".png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      }, "image/png");
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
    setTimeout(draw, 900);
  }

  /* ---------------- hero brand strip ---------------- */
  var trk = document.getElementById("bTrack");
  if (trk) {
    var marks = BRANDS.filter(function (b) { return b.rev; }).map(function (b) {
      return '<img src="' + esc(b.rev) + '" alt="' + esc(b.name) + '" loading="lazy">';
    }).join("");
    trk.innerHTML = marks + marks;   // duplicated so the -50% drift loops seamlessly
  }
})();

/* ---------------- BRAND_TRAINING_v1: the hub is gated behind a short course ---------------- */
(function () {
  "use strict";
  var W = "https://spark-hq-worker.sparkcompanies.workers.dev";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]; }); };

  function tok() {
    try { if (window.parent && window.parent !== window && window.parent.SPARK_SB && window.parent.SPARK_SB.getToken)
      return Promise.resolve(window.parent.SPARK_SB.getToken()); } catch (e) {}
    try { var a = JSON.parse(localStorage.getItem("spark_hq_sb_auth") || "{}");
      return Promise.resolve(a.access_token || (a.currentSession && a.currentSession.access_token) || (a.session && a.session.access_token) || ""); }
    catch (e) { return Promise.resolve(""); }
  }
  var api = function (path, opts) {
    return tok().then(function (t) {
      if (!t) throw new Error("no session");
      opts = opts || {}; opts.headers = Object.assign({ Authorization: "Bearer " + t }, opts.headers || {});
      return fetch(W + path, opts).then(function (r) { return r.json(); });
    });
  };

  /* recruiter picker + photos, only useful once the gate is open */
  function loadPeople() {
    var selR = document.getElementById("pmRec"); if (!selR) return;
    api("/directory").then(function (j) {
      var people = j.people || j || [];
      if (!people.length) return;
      window.__pmPeople = {};
      people.forEach(function (p) { if (p.email) window.__pmPeople[p.email] = p; });
      selR.innerHTML = '<option value="">None</option>' + people
        .slice().sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); })
        .map(function (p) { return '<option value="' + esc(p.email) + '">' + esc(p.name) + "</option>"; }).join("");
      return api("/photos");
    }).then(function (j) {
      if (j && j.photos) { window.__pmPhotos = j.photos; try { window.__pmDraw && window.__pmDraw(); } catch (e) {} }
    }).catch(function () {
      var h = document.getElementById("pmRecHint");
      if (h) h.textContent = "Directory unavailable, so photos are off — the rest still works.";
    });
  }

  var QUIZ = [
    { q: "Which is the registered trademark?",
      a: ["Spark Companies®", "Spark®", "SPARK™", "All of them"], right: 0,
      why: "The mark sits on the full name. “Spark” alone is not registered." },
    { q: "You are building a slide that shows all seven brands together. Which gold do you use for the slide itself?",
      a: ["Whichever gold you like", "The house gold, #FFC800", "Ignite’s #F2D416", "Mix them"], right: 1,
      why: "Entity golds are for work inside that one brand. Anything portfolio-wide uses the house gold." },
    { q: "You need the Ignite logo on a black background. What do you grab?",
      a: ["The normal logo", "The normal logo with the background removed", "The reversed version from the hub", "Recolour it yourself"], right: 2,
      why: "Every brand has a reversed version in the hub. Never recolour a logo by hand." },
    { q: "The Inc. 5000 badge needs to fit a tight space. What is allowed?",
      a: ["Crop it", "Recolour it to gold", "Stretch it", "Scale it proportionally, nothing else"], right: 3,
      why: "The badge stays in its original, unmodified form." }
  ];

  var gate = document.getElementById("bGate"), gin = document.getElementById("bGateIn");
  if (!gate || !gin) return;
  var answers = {};

  function render() {
    gin.innerHTML =
      '<p class="gk">BEFORE YOU USE THE BRAND</p>' +
      '<h2>Four questions.<br><em>Then it is yours.</em></h2>' +
      '<p class="gl">The brand only holds together if everyone applies it the same way. Read these, answer four questions, and the hub opens — once, not every time.</p>' +
      '<div class="step"><h3><span class="n">1</span>The registered mark</h3><p><b>Spark Companies®</b> is the registered trademark, not <code>Spark</code> on its own. John Joseph Partners is registered too. Spark Talent carries <code>™</code>.</p></div>' +
      '<div class="step"><h3><span class="n">2</span>Which gold</h3><p>There are five. Use the house gold <code>#FFC800</code> for anything spanning more than one brand, and the entity’s own value when you are working inside that brand. Flex is orange and navy on purpose — do not “fix” it.</p></div>' +
      '<div class="step"><h3><span class="n">3</span>Dark backgrounds</h3><p>Every brand has a reversed version in the hub. Use it rather than putting the normal logo on black or recolouring one yourself.</p></div>' +
      '<div class="step"><h3><span class="n">4</span>Leave the artwork alone</h3><p>No stretching, rotating, shadows, gradients or rebuilt wordmarks. The Inc. 5000 badge stays exactly as it is. Need a variant that is not here? Ask.</p></div>' +
      '<div style="height:26px"></div>' +
      QUIZ.map(function (q, i) {
        return '<div class="q" data-q="' + i + '"><p>' + (i + 1) + ". " + esc(q.q) + "</p>" +
          q.a.map(function (a, j) {
            return '<label class="opt" data-opt="' + i + ":" + j + '"><input type="radio" name="bq' + i + '" value="' + j + '"><span>' + esc(a) + "</span></label>";
          }).join("") + "</div>";
      }).join("") +
      '<div class="gact"><button class="gbtn" id="bGateGo" disabled>Unlock the Brand hub</button>' +
      '<span class="gmsg" id="bGateMsg">Answer all four to continue.</span></div>';

    gin.addEventListener("change", function (e) {
      var inp = e.target.closest('input[type="radio"]'); if (!inp) return;
      var lab = inp.closest(".opt"), p = lab.getAttribute("data-opt").split(":");
      answers[+p[0]] = +p[1];
      var done = QUIZ.every(function (_, i) { return answers[i] !== undefined; });
      document.getElementById("bGateGo").disabled = !done;
      var m = document.getElementById("bGateMsg");
      m.className = "gmsg"; m.textContent = done ? "Ready." : "Answer all four to continue.";
    });

    document.getElementById("bGateGo").addEventListener("click", function () {
      var btn = this, msg = document.getElementById("bGateMsg");
      var wrong = [];
      QUIZ.forEach(function (q, i) {
        var chosen = answers[i];
        var lab = gin.querySelector('[data-opt="' + i + ":" + chosen + '"]');
        if (chosen === q.right) { lab.classList.add("right"); lab.classList.remove("wrong"); }
        else { lab.classList.add("wrong"); wrong.push(i); }
      });
      if (wrong.length) {
        msg.className = "gmsg bad";
        msg.textContent = wrong.length === 1
          ? "One to look at again. " + QUIZ[wrong[0]].why
          : wrong.length + " to look at again — the explanation is in the numbered points above.";
        return;
      }
      btn.disabled = true; msg.className = "gmsg"; msg.textContent = "Saving…";
      api("/brand-training", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: QUIZ.length, total: QUIZ.length }) })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || "Could not record it");
          gate.classList.remove("on"); document.body.style.overflow = "";
          loadPeople();
        })
        .catch(function (e) { btn.disabled = false; msg.className = "gmsg bad"; msg.textContent = "Could not save that: " + (e.message || e); });
    });
  }

  api("/brand-training").then(function (j) {
    if (j && j.complete) { loadPeople(); return; }
    render(); gate.classList.add("on"); document.body.style.overflow = "hidden";
  }).catch(function () {
    // No session reachable (opened outside the shell): leave the hub open rather than
    // locking someone out of their own logos over an auth hiccup.
    loadPeople();
  });
})();
