/* Spark Brand Hub — logo grid, swatches, post maker, signature. No dependencies. */
(function () {
  "use strict";

  var BRANDS = [
    { key:"companies", name:"Spark Companies", mark:"®", svg:"brand/spark-companies.svg", png:"brand/spark-companies-logo.png",
      gold:"#FFC800", logoGold:"#FBD20F", dark:"#0D0E1A", house:true,
      note:"The house brand. Its gold is the portfolio colour — use it for anything that spans more than one entity." },
    { key:"talent", name:"Spark Talent Acquisition", mark:"™", svg:"brand/spark-talent.svg", png:"brand/spark-talent-logo.png",
      gold:"#FCD20E", dark:"#000000", note:"Staffing and direct hire. Carries ™, not ®." },
    { key:"ignite", name:"Ignite Search", mark:"", svg:"brand/ignite-search.svg", png:"brand/ignite-search-logo.png",
      gold:"#F2D416", dark:"#000000", note:"Executive search and strategy, and IT staffing." },
    { key:"jjp", name:"John Joseph Partners", mark:"®", svg:"brand/jjp.svg", png:"brand/jjp-logo.png",
      gold:"#FAD110", dark:"#000000", note:"IT staffing and search. Registered mark.",
      alts:[ {label:"Mark only", svg:"brand/jjp-mark.svg", png:"brand/jjp-mark-light.png"},
             {label:"Mark, reversed", png:"brand/jjp-mark-dark.png"} ] },
    { key:"flex", name:"Flex Workforce Solutions", mark:"", svg:"brand/flex.svg", png:"brand/flex-logo.png",
      gold:"#EC8F2F", dark:"#0C2745", orange:true,
      note:"The one brand that is deliberately not gold. Orange and navy, its own identity — do not “correct” it." },
    { key:"packaging", name:"Spark Packaging", mark:"", svg:"brand/spark-packaging.svg", png:"brand/spark-packaging-wordmark.png",
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
        stage.classList.toggle("dark", p[1] === "dark");
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
  var SW = [];
  BRANDS.forEach(function (b) {
    if (b.key === "bolt") return;
    SW.push({ nm: b.house ? "House gold" : b.name.split(" ")[0] + " gold", hex: b.gold,
              who: b.house ? "Portfolio-wide" : b.name, dark: false });
  });
  SW.push({ nm:"Night", hex:"#0D0E1A", who:"Spark Companies, Spark HQ", dark:true });
  SW.push({ nm:"Flex navy", hex:"#0C2745", who:"Flex Workforce Solutions", dark:true });
  SW.push({ nm:"Packaging charcoal", hex:"#3D3D3D", who:"Spark Packaging", dark:true });
  SW.push({ nm:"Cream", hex:"#FAF9F6", who:"Backgrounds, everywhere", dark:false });

  var swEl = document.getElementById("swatches");
  if (swEl) {
    swEl.innerHTML = SW.map(function (s) {
      return '<button class="sw" data-hex="' + s.hex + '">' +
        '<span class="chip" style="background:' + s.hex + (s.hex.toUpperCase() === "#FAF9F6" ? ";border-bottom:1px solid var(--line)" : "") + '"></span>' +
        '<span class="meta"><p class="nm">' + esc(s.nm) + '</p><span class="hex">' + s.hex + "</span>" +
        '<div class="who">' + esc(s.who) + "</div></span></button>";
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

    var imgCache = {};
    function loadLogo(b, cb) {
      var src = b.svg || b.png;
      if (imgCache[src]) return cb(imgCache[src]);
      var im = new Image();
      im.onload = function () { imgCache[src] = im; cb(im); };
      im.onerror = function () { cb(null); };
      im.src = src;
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

    function draw() {
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0];
      var fmt = document.getElementById("pmFormat").value;
      var kind = document.getElementById("pmKind").value;
      var theme = document.getElementById("pmTheme").value;
      var head = document.getElementById("pmHead").value || " ";
      var sub = document.getElementById("pmSub").value || "";
      var jwu = document.getElementById("pmJwu").checked;
      var d = SIZES[fmt]; C.width = d[0]; C.height = d[1];
      var W = d[0], H = d[1], S = Math.min(W, H) / 1080;      // scale off the short edge
      document.getElementById("pmDims").textContent = W + " × " + H + " px · " + b.name;

      var bgCol, fgCol, accent;
      if (theme === "night") { bgCol = b.dark || "#0d0e1a"; fgCol = "#ffffff"; accent = b.gold; }
      else if (theme === "gold") { bgCol = b.gold; fgCol = b.orange ? "#0C2745" : "#17150d"; accent = b.dark || "#0d0e1a"; }
      else { bgCol = "#faf9f6"; fgCol = "#16140e"; accent = b.gold; }

      ctx.fillStyle = bgCol; ctx.fillRect(0, 0, W, H);
      if (theme === "night") {
        var g = ctx.createRadialGradient(W * 0.14, -H * 0.1, 0, W * 0.14, -H * 0.1, Math.max(W, H) * 1.05);
        g.addColorStop(0, "rgba(255,200,0,.20)"); g.addColorStop(0.55, "rgba(255,200,0,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = accent; ctx.fillRect(0, H - 10 * S, W, 10 * S);

      var pad = 78 * S;
      var y = pad + 20 * S;

      if (kind === "hiring") {
        ctx.font = "700 " + (30 * S) + "px Jost, Arial, sans-serif";
        ctx.fillStyle = accent;
        ctx.letterSpacing = (6 * S) + "px";
        ctx.fillText("WE'RE HIRING", pad, y);
        ctx.letterSpacing = "0px";
        y += 46 * S;
      }

      var hFont = "400 " + (Math.round((fmt === "li-link" ? 88 : 108) * S)) + "px 'Bebas Neue', Impact, sans-serif";
      var lines = wrap(head.toUpperCase(), W - pad * 2, hFont);
      ctx.font = hFont; ctx.fillStyle = fgCol; ctx.textBaseline = "top";
      var lh = (fmt === "li-link" ? 84 : 102) * S;
      lines.forEach(function (ln) { ctx.fillText(ln, pad, y); y += lh; });

      if (sub) {
        y += 18 * S;
        var sFont = "400 " + Math.round(34 * S) + "px Jost, Arial, sans-serif";
        var slines = wrap(sub, W - pad * 2, sFont);
        ctx.font = sFont; ctx.fillStyle = theme === "night" ? "rgba(255,255,255,.76)" : (theme === "gold" ? "rgba(0,0,0,.66)" : "#6f6a5d");
        slines.forEach(function (ln) { ctx.fillText(ln, pad, y); y += 44 * S; });
      }

      if (jwu) {
        ctx.font = "400 " + Math.round(44 * S) + "px 'Bebas Neue', Impact, sans-serif";
        ctx.fillStyle = accent; ctx.textBaseline = "alphabetic";
        ctx.letterSpacing = (3 * S) + "px";
        ctx.fillText("#JWU", pad, H - pad + 6 * S);
        ctx.letterSpacing = "0px";
      }

      loadLogo(b, function (im) {
        if (!im) return;
        var maxW = Math.min(340 * S, W * 0.42), maxH = 92 * S;
        var r = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
        var lw = im.naturalWidth * r, lh2 = im.naturalHeight * r;
        var lx = W - pad - lw, ly = H - pad - lh2 + 10 * S;
        var needsPlate = (theme === "night" && b.key !== "jjp") || theme === "gold";
        if (needsPlate) {
          var px = 20 * S;
          ctx.fillStyle = theme === "gold" ? "rgba(255,255,255,.96)" : "rgba(255,255,255,.95)";
          var rr = 14 * S, x0 = lx - px, y0 = ly - px, w0 = lw + px * 2, h0 = lh2 + px * 2;
          ctx.beginPath();
          ctx.moveTo(x0 + rr, y0); ctx.lineTo(x0 + w0 - rr, y0); ctx.quadraticCurveTo(x0 + w0, y0, x0 + w0, y0 + rr);
          ctx.lineTo(x0 + w0, y0 + h0 - rr); ctx.quadraticCurveTo(x0 + w0, y0 + h0, x0 + w0 - rr, y0 + h0);
          ctx.lineTo(x0 + rr, y0 + h0); ctx.quadraticCurveTo(x0, y0 + h0, x0, y0 + h0 - rr);
          ctx.lineTo(x0, y0 + rr); ctx.quadraticCurveTo(x0, y0, x0 + rr, y0); ctx.closePath(); ctx.fill();
        }
        ctx.drawImage(im, lx, ly, lw, lh2);
      });
    }

    ["pmBrand","pmFormat","pmKind","pmHead","pmSub","pmTheme","pmJwu"].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener(el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input", function () {
        if (id === "pmKind") {
          var hiring = document.getElementById("pmKind").value === "hiring";
          document.getElementById("pmSubLbl").textContent = hiring ? "Role and location" : "Supporting line";
          if (hiring && !/,/.test(document.getElementById("pmSub").value))
            document.getElementById("pmSub").value = "Recruiter · Troy, MI";
        }
        draw();
      });
    });

    document.getElementById("pmDl").addEventListener("click", function () {
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0];
      C.toBlob(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "spark-" + b.key + "-" + document.getElementById("pmFormat").value + ".png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      }, "image/png");
    });

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); else draw();
    setTimeout(draw, 900);
  }

  /* ---------------- signature ---------------- */
  var sgE = document.getElementById("sgEntity");
  if (sgE) {
    var ENT = {
      companies:["Spark Companies®","sparkcompanies.com"],
      talent:["Spark Talent Acquisition™","sparktalentinc.com"],
      ignite:["Ignite Search","ignitesearch.com"],
      jjp:["John Joseph Partners®","johnjosephpartners.com"],
      flex:["Flex Workforce Solutions","flexworkforceco.com"],
      packaging:["Spark Packaging","sparkcompanies.com"],
      bolt:["Bolt Creative","sparkcompanies.com"]
    };
    sgE.innerHTML = Object.keys(ENT).map(function (k) {
      return '<option value="' + k + '">' + esc(ENT[k][0]) + "</option>";
    }).join("");

    var sigHtml = function () {
      var g = function (id) { return document.getElementById(id).value.trim(); };
      var e = ENT[sgE.value];
      return '<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#111;"><tr><td>' +
        '<div style="font-size:15px;font-weight:bold;color:#111;">' + esc(g("sgName")) + "</div>" +
        '<div style="font-size:12.5px;color:#6f6a5d;">' + esc(g("sgTitle")) + " &middot; " + esc(e[0]) + "</div>" +
        '<div style="height:2px;width:40px;background:#FFC800;margin:9px 0;font-size:0;line-height:0;">&nbsp;</div>' +
        '<div style="font-size:12.5px;color:#111;">' + esc(g("sgPhone")) +
          ' &nbsp;|&nbsp; <a href="mailto:' + esc(g("sgEmail")) + '" style="color:#7a5d00;text-decoration:none;">' + esc(g("sgEmail")) + "</a></div>" +
        '<div style="font-size:12.5px;color:#6f6a5d;">' + esc(e[1]) + " &nbsp;|&nbsp; Troy, MI &middot; Franklin, TN</div>" +
        '<div style="font-size:11px;color:#9a9486;padding-top:7px;letter-spacing:1px;">JUST WATCH US</div>' +
        "</td></tr></table>";
    };
    var paint = function () { document.getElementById("sigPrev").innerHTML = sigHtml(); };
    ["sgName","sgTitle","sgEntity","sgPhone","sgEmail"].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", paint);
    });
    paint();

    document.getElementById("sigCopy").addEventListener("click", function () {
      var btn = this, html = sigHtml();
      var done = function () { var t = btn.innerHTML; btn.innerHTML = "Copied"; setTimeout(function () { btn.innerHTML = t; }, 1300); };
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([document.getElementById("sigPrev").innerText], { type: "text/plain" })
        })]).then(done, fallback);
      } else fallback();
      function fallback() {
        var r = document.createRange(); r.selectNode(document.getElementById("sigPrev"));
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { document.execCommand("copy"); done(); } catch (x) {}
        s.removeAllRanges();
      }
    });
  }
})();
