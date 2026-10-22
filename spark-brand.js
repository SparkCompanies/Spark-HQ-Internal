/* Spark Brand Hub — logo grid, swatches, post maker, signature. No dependencies. */
(function () {
  "use strict";

  var BRANDS = [
    { key:"companies", name:"Spark Companies", mark:"®", svg:"brand/spark-companies.svg", png:"brand/spark-companies-logo.png", rev:"brand/spark-companies-reversed.svg", revPng:"brand/spark-companies-reversed.png",
      gold:"#FFC800", logoGold:"#FBD20F", dark:"#0D0E1A", house:true,
      note:"The house brand. Its gold is the portfolio color — use it for anything that spans more than one entity." },
    { key:"talent", name:"Spark Talent Acquisition", mark:"™", svg:"brand/spark-talent.svg", png:"brand/spark-talent-logo.png", rev:"brand/spark-talent-reversed.svg", revPng:"brand/spark-talent-reversed.png",
      gold:"#FCD20E", dark:"#000000", note:"Staffing and direct hire. Carries ™, not ®." },
    { key:"ignite", name:"Ignite Search", mark:"", svg:"brand/ignite-search.svg", png:"brand/ignite-search-logo.png", rev:"brand/ignite-search-reversed.svg", revPng:"brand/ignite-search-reversed.png",
      gold:"#F2D216", dark:"#000000", note:"Executive search and strategy, and IT staffing." },
    { key:"jjp", name:"John Joseph Partners", mark:"®", svg:"brand/jjp.svg", png:"brand/jjp-logo.png", rev:"brand/jjp-reversed.svg", revPng:"brand/jjp-reversed.png",
      gold:"#FAD110", dark:"#000000", note:"IT staffing and search. Registered mark.",
      alts:[ {label:"Mark only", svg:"brand/jjp-mark.svg", png:"brand/jjp-mark-light.png"},
             {label:"Mark, reversed", png:"brand/jjp-mark-dark.png"} ] },
    { key:"flex", name:"Flex Workforce Solutions", mark:"\u2122", svg:"brand/flex.svg", png:"brand/flex-logo.png", rev:"brand/flex-reversed.svg", revPng:"brand/flex-reversed.png",
      gold:"#EC8F2F", dark:"#0C2745", orange:true,
      note:"The one brand that is deliberately not gold. Orange and navy, its own identity — do not “correct” it." },
    { key:"packaging", name:"Spark Packaging", mark:"\u2122", svg:"brand/spark-packaging.svg", png:"brand/spark-packaging-wordmark.png", rev:"brand/spark-packaging-reversed.svg", revPng:"brand/spark-packaging-reversed.png",
      gold:"#FFDE59", dark:"#3E3E3E", note:"Packaging and co-manufacturing talent. Carries \u2122 while the mark is pending.",
      alts:[ {label:"Circle badge", png:"brand/spark-packaging-logo.png"},
             {label:"Reversed", png:"brand/spark-packaging-reversed.png"} ] },
    { key:"bolt", name:"Bolt Creative", mark:"", svg:"brand/bolt-creative.svg", png:"bolt-creative-logo.png",
      rev:"brand/bolt-creative-lime.svg",
      gold:"#C6FF3D", dark:"#0D0E1A", note:"The in-house creative studio. Lime on dark, ink on light." }
  ];

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  };
  var dlIcon = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';

  /* ---------------- logos ---------------- */
  function logoCard(b, idx) {
    var main = b.svg || b.png;
    var alts = (b.alts || []).map(function (a, i) {
      return '<button class="btn ghost" data-alt="' + b.key + ':' + i + '">' + esc(a.label) + "</button>";
    }).join("");
    return '<div class="card lcard" data-brand="' + b.key + '" style="--i:' + (idx || 0) + ';--glow:' + (b.gold || "#FFC800") + '">' +
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



  /* ---------------- ready-made cards: the eight core values ---------------- */
  var VALUES = [
    ["01", "Leading by example isn’t just a way, it’s the ONLY way", "Titus 2:7"],
    ["02", "Do the right thing", "Luke 6:31"],
    ["03", "Conquering adversity is a recipe to success", "Proverbs 24:16"],
    ["04", "Be humble. Crave improvement", "Proverbs 27:17"],
    ["05", "We are people driven and service focused", "Galatians 5:13"],
    ["06", "Dominate the day, don’t let the day dominate you", "Ephesians 5:15–16"],
    ["07", "Find a way to deliver value", "Matthew 5:41"],
    ["08", "Mindset is the foundation of excellence", "Romans 12:2"]
  ];

  function sFonts() {
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    return Promise.all([ document.fonts.load("400 100px 'Bebas Neue'"),
                         document.fonts.load("400 30px 'Jost'") ]).catch(function () {});
  }

  var sImg = {};
  function sLoad(src) {
    if (!src) return Promise.resolve(null);
    if (sImg[src]) return Promise.resolve(sImg[src]);
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { sImg[src] = im; res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  /* one renderer, any pixel size - S scales every measurement off the 1080 design */
  function drawValue(cv, b, val, tall) {
    var W = cv.width, H = cv.height, S = W / 1080, x = cv.getContext("2d");
    var acc = b.gold || "#FFC800", bg = b.dark || "#0d0e1a";
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    var rgb = (function (hx) {            // the wash should be the brand's own accent, not always gold
      var m = /^#?([0-9a-f]{6})$/i.exec(hx || "");
      if (!m) return "255,200,0";
      var n = parseInt(m[1], 16);
      return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
    })(acc);
    var g = x.createRadialGradient(W * 0.16, -H * 0.06, 0, W * 0.16, -H * 0.06, Math.max(W, H) * 1.05);
    g.addColorStop(0, "rgba(" + rgb + ",.2)"); g.addColorStop(0.55, "rgba(" + rgb + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    var pad = Math.round(84 * S);
    x.textBaseline = "top"; x.textAlign = "left";

    // measure first, then centre the whole block: value 01 runs to four lines, 02 to one
    var size = Math.round((tall ? 96 : 88) * S), lh = Math.round(size * 0.92), maxW = W - pad * 2;
    x.font = "400 " + size + "px 'Bebas Neue', Impact, sans-serif";
    var words = val[1].toUpperCase().split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);

    var numH = Math.round(104 * S), gap = Math.round(22 * S);
    var tailH = Math.round(30 * S) + Math.round(5 * S) + Math.round(30 * S) + Math.round(34 * S);
    var blockH = numH + gap + lines.length * lh + tailH;
    var y = Math.max(Math.round(H * 0.26), Math.round((H - blockH) / 2));

    x.font = "400 " + Math.round(132 * S) + "px 'Bebas Neue', Impact, sans-serif";
    x.fillStyle = acc; x.fillText(val[0], pad, y);
    y += numH + gap;

    x.font = "400 " + size + "px 'Bebas Neue', Impact, sans-serif";
    x.fillStyle = "#fff";
    lines.forEach(function (ln) { x.fillText(ln, pad, y); y += lh; });

    y += Math.round(30 * S);
    x.fillStyle = acc; x.fillRect(pad, y, Math.round(92 * S), Math.round(5 * S));
    y += Math.round(30 * S);
    x.font = "400 " + Math.round(30 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
    x.fillStyle = "rgba(255,255,255,.72)";
    x.fillText(val[2], pad, y);

    x.font = "400 " + Math.round(44 * S) + "px 'Bebas Neue', Impact, sans-serif";
    x.fillStyle = acc; x.textBaseline = "alphabetic";
    x.fillText("#JWU", pad, H - pad);
    x.textBaseline = "top";
    x.fillStyle = acc; x.fillRect(0, H - Math.round(10 * S), W, Math.round(10 * S));

    return sLoad(b.rev || b.svg || b.png).then(function (im) {
      if (!im) return;
      var boxW = Math.round(300 * S), boxH = Math.round(104 * S);
      var r = Math.min(boxW / im.naturalWidth, boxH / im.naturalHeight);
      var lw = im.naturalWidth * r, lh2 = im.naturalHeight * r;
      x.drawImage(im, W - pad - lw, pad, lw, lh2);
    });
  }

  var ssw = document.getElementById("ssw"), sgrid = document.getElementById("sgrid");
  if (ssw && sgrid) {
    ssw.innerHTML = BRANDS.map(function (b) {
      return '<button data-sb="' + b.key + '" style="--c:' + (b.gold || "#FFC800") + '">' +
             '<span class="dot"></span>' + esc(b.name) + "</button>";
    }).join("");

    function download(b, val, tall) {
      var cv = document.createElement("canvas");
      cv.width = 1080; cv.height = tall ? 1920 : 1080;
      sFonts().then(function () { return drawValue(cv, b, val, tall); }).then(function () {
        cv.toBlob(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "spark-" + b.key + "-value-" + val[0] + (tall ? "-story" : "-square") + ".png";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        }, "image/png");
      });
    }

    var sBrand = BRANDS[0];
    function paintSocial(key) {
      sBrand = BRANDS.filter(function (x) { return x.key === key; })[0] || BRANDS[0];
      ssw.querySelectorAll("button").forEach(function (x) {
        x.classList.toggle("on", x.getAttribute("data-sb") === sBrand.key);
      });
      sgrid.innerHTML = VALUES.map(function (v, i) {
        return '<div class="scard"><canvas width="540" height="540" data-v="' + i + '"></canvas>' +
          '<div class="sb"><button class="btn" data-dl="' + i + ':sq">' + dlIcon + "SQUARE</button>" +
          '<button class="btn ghost" data-dl="' + i + ':st">STORY</button></div></div>';
      }).join("");
      // preview at half size; the download re-renders at full 1080 so nothing is upscaled
      VALUES.forEach(function (v, i) {
        drawValue(sgrid.querySelector('canvas[data-v="' + i + '"]'), sBrand, v, false);
      });
    }

    ssw.addEventListener("click", function (e) {
      var t = e.target.closest("[data-sb]"); if (t) paintSocial(t.getAttribute("data-sb"));
    });
    sgrid.addEventListener("click", function (e) {
      var t = e.target.closest("[data-dl]"); if (!t) return;
      var p = t.getAttribute("data-dl").split(":");
      download(sBrand, VALUES[+p[0]], p[1] === "st");
    });

    paintSocial(BRANDS[0].key);
    sFonts().then(function () { paintSocial(sBrand.key); });
    setTimeout(function () { paintSocial(sBrand.key); }, 1100);
  }


  /* ---------------- video backdrops ---------------- */
  /* Rules a backdrop has to obey, which is most of why these look the way they do:
     the middle third stays quiet because a head sits there, contrast stays low so video
     compression does not boil it, and nothing fine-grained survives a 720p call anyway. */
  var BACKDROPS = [
    { id:"studio",  name:"Studio",      note:"Dark, one light source" },
    { id:"soft",    name:"Soft light",  note:"Cream, for bright rooms" },
    { id:"planes",  name:"Planes",      note:"Angled, with depth" },
    { id:"bokeh",   name:"Defocused",   note:"Reads like a real room" },
    { id:"cool",    name:"Slate",       note:"Off the gold entirely" },
    { id:"glass",   name:"Glass wall",   note:"Office partition, logo in vinyl" },
    { id:"board",   name:"Boardroom",    note:"Backlit sign on a dark wall" }
  ];

  function rgbOf(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return [255, 200, 0];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var rgba = function (hex, a) { var c = rgbOf(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; };

  /* grain drawn once into a small tile and repeated - doing it per pixel at 1920 is slow
     and, worse, it crawls when the video codec re-encodes it */
  var grainTile = null;
  function grain(x, W, H, alpha) {
    if (!grainTile) {
      var t = document.createElement("canvas"); t.width = t.height = 128;
      var tc = t.getContext("2d"), im = tc.createImageData(128, 128);
      for (var i = 0; i < im.data.length; i += 4) {
        var v = 120 + Math.random() * 135;
        im.data[i] = im.data[i+1] = im.data[i+2] = v; im.data[i+3] = 255;
      }
      tc.putImageData(im, 0, 0); grainTile = t;
    }
    x.save(); x.globalAlpha = alpha; x.globalCompositeOperation = "overlay";
    var p = x.createPattern(grainTile, "repeat"); x.fillStyle = p; x.fillRect(0, 0, W, H);
    x.restore();
  }


  /* The two room looks are drawn sharp into an offscreen canvas and then composited
     through a blur, which is what a real lens does to anything behind you. Drawing
     them blurred directly gives you mush; blurring a sharp scene gives you depth. */
  function roomScene(b, style, W, H, side) {
    var o = document.createElement("canvas"); o.width = W; o.height = H;
    var x = o.getContext("2d"), S = W / 1920, acc = b.gold || "#FFC800";
    var right = side !== "left";

    if (style === "glass") {
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#f2f3f5"); g.addColorStop(0.46, "#e4e6ea"); g.addColorStop(1, "#cfd3d9");
      x.fillStyle = g; x.fillRect(0, 0, W, H);

      /* ceiling run, in perspective, with the panels that actually light these rooms */
      x.fillStyle = "#e9ebee"; x.beginPath();
      x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W * 0.86, H * 0.27); x.lineTo(W * 0.14, H * 0.27);
      x.closePath(); x.fill();
      for (var i = 0; i < 4; i++) {
        var t = i / 3, y0 = H * (0.03 + t * 0.17), inset = W * (0.1 + t * 0.07), hh = H * 0.028 * (1 - t * 0.35);
        var lg = x.createLinearGradient(0, y0, 0, y0 + hh);
        lg.addColorStop(0, "rgba(255,255,255,.98)"); lg.addColorStop(1, "rgba(255,255,255,.72)");
        x.fillStyle = lg; x.fillRect(inset, y0, W - inset * 2, hh);
        var hal = x.createRadialGradient(W / 2, y0 + hh / 2, 0, W / 2, y0 + hh / 2, W * 0.5);
        hal.addColorStop(0, "rgba(255,255,255,.3)"); hal.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = hal; x.fillRect(0, y0 - hh * 3, W, hh * 7);
      }

      /* glass partition: panels, mullions, and the sheen that gives glass away */
      var top = H * 0.27, panels = 5, pw = W / panels;
      for (var p = 0; p < panels; p++) {
        var px = p * pw;
        var pg = x.createLinearGradient(px, top, px + pw, H);
        pg.addColorStop(0, "rgba(255,255,255,.34)"); pg.addColorStop(0.4, "rgba(246,248,250,.14)");
        pg.addColorStop(1, "rgba(210,216,224,.3)");
        x.fillStyle = pg; x.fillRect(px, top, pw, H - top);
        x.fillStyle = "rgba(150,158,170,.5)"; x.fillRect(px, top, Math.max(2, 3 * S), H - top);
      }
      x.fillStyle = "rgba(150,158,170,.55)"; x.fillRect(0, top, W, Math.max(2, 4 * S));
      var sheen = x.createLinearGradient(W * 0.1, top, W * 0.62, H);
      sheen.addColorStop(0, "rgba(255,255,255,.4)"); sheen.addColorStop(0.5, "rgba(255,255,255,.05)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = sheen; x.fillRect(0, top, W, H - top);
      /* floor beyond the glass */
      x.fillStyle = "rgba(186,192,200,.55)"; x.fillRect(0, H * 0.88, W, H * 0.12);
    } else {
      var gw = x.createLinearGradient(0, 0, W, H);
      gw.addColorStop(0, "#2a2a30"); gw.addColorStop(0.5, "#1d1e24"); gw.addColorStop(1, "#141519");
      x.fillStyle = gw; x.fillRect(0, 0, W, H);
      /* wall panels - vertical seams catch the wash and give the surface a direction */
      for (var w = 0; w < 7; w++) {
        var wx = w * (W / 7);
        x.fillStyle = w % 2 ? "rgba(255,255,255,.016)" : "rgba(0,0,0,.05)";
        x.fillRect(wx, 0, W / 7, H);
        x.fillStyle = "rgba(255,255,255,.035)"; x.fillRect(wx, 0, Math.max(1, 2 * S), H);
      }
      var wash = x.createRadialGradient(W * 0.5, -H * 0.3, 0, W * 0.5, -H * 0.3, W * 0.72);
      wash.addColorStop(0, "rgba(255,240,200,.22)"); wash.addColorStop(1, "rgba(255,240,200,0)");
      x.fillStyle = wash; x.fillRect(0, 0, W, H);
      x.fillStyle = "rgba(0,0,0,.4)"; x.fillRect(0, H * 0.9, W, H * 0.1);   /* floor shadow */
    }
    return o;
  }

  function roomLogo(x, im, b, style, W, H, side) {
    var S = W / 1920, right = side !== "left";
    var boxH = H * (style === "glass" ? 0.3 : 0.26);
    var boxW = boxH * (im.naturalWidth / im.naturalHeight);
    var max = W * 0.4;
    if (boxW > max) { boxW = max; boxH = boxW * (im.naturalHeight / im.naturalWidth); }
    var lx = right ? W * 0.52 : W * 0.48 - boxW;
    /* keep the whole mark on the canvas - a logo running off the edge reads as a mistake,
       and Teams crops a little more off the sides again */
    var edge = W * 0.07;
    if (lx + boxW > W - edge) lx = W - edge - boxW;
    if (lx < edge) lx = edge;
    var ly = H * (style === "glass" ? 0.4 : 0.34);
    if (style === "glass") {
      x.save(); x.globalAlpha = 0.9; x.drawImage(im, lx, ly, boxW, boxH); x.restore();
    } else {
      /* backlit: the halo behind the sign, then the sign, then a faint wall bounce */
      var cx = lx + boxW / 2, cy = ly + boxH / 2;
      var halo = x.createRadialGradient(cx, cy, 0, cx, cy, boxW * 0.95);
      halo.addColorStop(0, rgba(b.gold || "#FFC800", 0.5));
      halo.addColorStop(0.45, rgba(b.gold || "#FFC800", 0.14));
      halo.addColorStop(1, rgba(b.gold || "#FFC800", 0));
      x.fillStyle = halo; x.fillRect(cx - boxW, cy - boxH * 1.6, boxW * 2, boxH * 3.2);
      x.save(); x.globalAlpha = 0.5; x.drawImage(im, lx + 3 * S, ly + 5 * S, boxW, boxH); x.restore();
      x.drawImage(im, lx, ly, boxW, boxH);
    }
  }

  function drawBackdrop(cv, b, style, side) {
    var W = cv.width, H = cv.height, S = W / 1920, x = cv.getContext("2d");
    var acc = b.gold || "#FFC800", dark = b.dark || "#0d0e1a";
    var right = side !== "left";
    x.clearRect(0, 0, W, H);

    if (style === "soft") {
      var g0 = x.createLinearGradient(0, 0, W, H);
      g0.addColorStop(0, "#fffdf7"); g0.addColorStop(0.55, "#faf9f6"); g0.addColorStop(1, "#efece2");
      x.fillStyle = g0; x.fillRect(0, 0, W, H);
      var warm = x.createRadialGradient(W * 0.14, H * 0.1, 0, W * 0.14, H * 0.1, W * 0.75);
      warm.addColorStop(0, rgba(acc, 0.3)); warm.addColorStop(0.5, rgba(acc, 0.07)); warm.addColorStop(1, rgba(acc, 0));
      x.fillStyle = warm; x.fillRect(0, 0, W, H);
      var cool = x.createRadialGradient(W * 0.9, H * 1.05, 0, W * 0.9, H * 1.05, W * 0.6);
      cool.addColorStop(0, "rgba(120,130,150,.17)"); cool.addColorStop(1, "rgba(120,130,150,0)");
      x.fillStyle = cool; x.fillRect(0, 0, W, H);
    } else if (style === "planes") {
      x.fillStyle = dark; x.fillRect(0, 0, W, H);
      /* three angled planes, lit from the top left, pushed out of the centre third */
      var plane = function (cx, w, tilt, a1, a2) {
        var g = x.createLinearGradient(cx - w / 2, 0, cx + w / 2, H);
        g.addColorStop(0, rgba(acc, a1)); g.addColorStop(1, rgba(acc, a2));
        x.save(); x.beginPath();
        x.moveTo(cx - w / 2 + tilt, -10); x.lineTo(cx + w / 2 + tilt, -10);
        x.lineTo(cx + w / 2 - tilt, H + 10); x.lineTo(cx - w / 2 - tilt, H + 10);
        x.closePath(); x.fillStyle = g; x.fill(); x.restore();
      };
      plane(W * 0.1,  W * 0.3,  W * 0.07, 0.17, 0.02);
      plane(W * 0.26, W * 0.12, W * 0.06, 0.09, 0.01);
      plane(W * 0.9,  W * 0.3,  -W * 0.07, 0.13, 0.02);
      plane(W * 0.74, W * 0.1,  -W * 0.06, 0.07, 0.01);
      var lift = x.createRadialGradient(W * 0.2, -H * 0.1, 0, W * 0.2, -H * 0.1, W * 0.8);
      lift.addColorStop(0, rgba(acc, 0.18)); lift.addColorStop(1, rgba(acc, 0));
      x.fillStyle = lift; x.fillRect(0, 0, W, H);
    } else if (style === "bokeh") {
      var gb = x.createLinearGradient(0, 0, W * 0.4, H);
      gb.addColorStop(0, "#15161f"); gb.addColorStop(1, dark);
      x.fillStyle = gb; x.fillRect(0, 0, W, H);
      /* lights cluster at the edges and fall away from the middle third */
      var seed = 7;
      var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      for (var i = 0; i < 46; i++) {
        var edge = rnd() < 0.5 ? rnd() * 0.3 : 0.7 + rnd() * 0.3;
        var cx = edge * W, cy = rnd() * H, r = (24 + rnd() * 120) * S * 1.6;
        var a = 0.05 + rnd() * 0.17;
        var g2 = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g2.addColorStop(0, rgba(acc, a)); g2.addColorStop(0.65, rgba(acc, a * 0.35)); g2.addColorStop(1, rgba(acc, 0));
        x.fillStyle = g2; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      }
    } else if (style === "glass" || style === "board") {
      var scene = roomScene(b, style, W, H, side);
      var art = style === "glass" ? (b.svg || b.png) : (b.rev || b.svg || b.png);
      return sLoad(art).then(function (im) {
        var sx = scene.getContext("2d");
        if (im) roomLogo(sx, im, b, style, W, H, side);
        x.save();
        x.filter = "blur(" + Math.max(2, Math.round(7 * S)) + "px)";
        /* overdraw the edges so the blur does not pull the page background in at the sides */
        x.drawImage(scene, -W * 0.03, -H * 0.03, W * 1.06, H * 1.06);
        x.restore();
        if (style === "board") {
          var v2 = x.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, W * 0.8);
          v2.addColorStop(0, "rgba(0,0,0,0)"); v2.addColorStop(1, "rgba(0,0,0,.45)");
          x.fillStyle = v2; x.fillRect(0, 0, W, H);
        }
        grain(x, W, H, 0.05);
        x.fillStyle = acc; x.fillRect(0, H - Math.round(7 * S), W, Math.round(7 * S));
      });
    } else if (style === "cool") {
      /* for the days when another gold backdrop is the last thing anyone wants */
      var gc = x.createLinearGradient(0, 0, W, H);
      gc.addColorStop(0, "#232a3b"); gc.addColorStop(0.55, "#161b27"); gc.addColorStop(1, "#0e1119");
      x.fillStyle = gc; x.fillRect(0, 0, W, H);
      var steel = x.createRadialGradient(W * 0.82, -H * 0.15, 0, W * 0.82, -H * 0.15, W * 0.8);
      steel.addColorStop(0, "rgba(150,180,225,.22)"); steel.addColorStop(0.5, "rgba(150,180,225,.05)");
      steel.addColorStop(1, "rgba(150,180,225,0)");
      x.fillStyle = steel; x.fillRect(0, 0, W, H);
      var edgeX = right ? W * 0.9 : W * 0.1;
      var line = x.createLinearGradient(0, 0, 0, H);
      line.addColorStop(0, rgba(acc, 0)); line.addColorStop(0.45, rgba(acc, 0.5)); line.addColorStop(1, rgba(acc, 0));
      x.fillStyle = line; x.fillRect(edgeX, 0, Math.max(2, 4 * S), H);
    } else {
      x.fillStyle = dark; x.fillRect(0, 0, W, H);
      var key = x.createRadialGradient(W * 0.17, -H * 0.12, 0, W * 0.17, -H * 0.12, W * 0.95);
      key.addColorStop(0, rgba(acc, 0.38)); key.addColorStop(0.42, rgba(acc, 0.09)); key.addColorStop(1, rgba(acc, 0));
      x.fillStyle = key; x.fillRect(0, 0, W, H);
      var fill = x.createRadialGradient(W * 0.95, H * 1.1, 0, W * 0.95, H * 1.1, W * 0.6);
      fill.addColorStop(0, "rgba(90,120,170,.2)"); fill.addColorStop(1, "rgba(90,120,170,0)");
      x.fillStyle = fill; x.fillRect(0, 0, W, H);
    }

    /* vignette: pulls the eye off the corners and back to the person */
    if (style !== "soft") {
      var v = x.createRadialGradient(W / 2, H * 0.46, H * 0.3, W / 2, H * 0.5, W * 0.78);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)");
      x.fillStyle = v; x.fillRect(0, 0, W, H);
    }
    grain(x, W, H, style === "soft" ? 0.05 : 0.07);

    /* accent rule along the base, thin enough to survive compression */
    x.fillStyle = acc; x.fillRect(0, H - Math.round(7 * S), W, Math.round(7 * S));

    var pad = Math.round(78 * S);
    return sLoad(style === "soft" ? (b.svg || b.png) : (b.rev || b.svg || b.png)).then(function (im) {
      if (!im) return;
      var boxH = Math.round(74 * S), boxW = boxH * (im.naturalWidth / im.naturalHeight);
      var lx = right ? W - pad - boxW : pad;
      x.drawImage(im, lx, H - pad - boxH - Math.round(14 * S), boxW, boxH);
    });
  }

  var bdsw = document.getElementById("bdsw"), bdgrid = document.getElementById("bdgrid");
  if (bdsw && bdgrid) {
    var bdBrand = BRANDS[0], bdSide = "right";

    bdsw.innerHTML = BRANDS.map(function (b) {
      return '<button data-bd="' + b.key + '" style="--c:' + (b.gold || "#FFC800") + '">' +
             '<span class="dot"></span>' + esc(b.name) + "</button>";
    }).join("") + '<button data-bdside="1" style="--c:#0d0e1a"><span class="dot"></span>Logo: right</button>';

    function bdDownload(style) {
      var cv = document.createElement("canvas");
      cv.width = 1920; cv.height = 1080;
      sFonts().then(function () { return drawBackdrop(cv, bdBrand, style, bdSide); }).then(function () {
        cv.toBlob(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "spark-" + bdBrand.key + "-backdrop-" + style + ".jpg";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        }, "image/jpeg", 0.92);
      });
    }

    function paintBackdrops() {
      bdsw.querySelectorAll("button").forEach(function (el) {
        if (el.hasAttribute("data-bd")) el.classList.toggle("on", el.getAttribute("data-bd") === bdBrand.key);
        else el.textContent = "";
      });
      var sideBtn = bdsw.querySelector("[data-bdside]");
      if (sideBtn) sideBtn.innerHTML = '<span class="dot"></span>Logo: ' + bdSide;
      bdgrid.innerHTML = BACKDROPS.map(function (s) {
        return '<div class="bdcard"><canvas width="576" height="324" data-bdc="' + s.id + '"></canvas>' +
          '<div class="bb"><span class="bn">' + esc(s.name) + "<small>" + esc(s.note) + "</small></span>" +
          '<button class="btn" data-bddl="' + s.id + '">' + dlIcon + "1920 × 1080</button></div></div>";
      }).join("");
      BACKDROPS.forEach(function (s) {
        drawBackdrop(bdgrid.querySelector('canvas[data-bdc="' + s.id + '"]'), bdBrand, s.id, bdSide);
      });
    }

    bdsw.addEventListener("click", function (e) {
      var t = e.target.closest("[data-bd]");
      if (t) { bdBrand = BRANDS.filter(function (x) { return x.key === t.getAttribute("data-bd"); })[0] || BRANDS[0]; paintBackdrops(); return; }
      if (e.target.closest("[data-bdside]")) { bdSide = bdSide === "right" ? "left" : "right"; paintBackdrops(); }
    });
    bdgrid.addEventListener("click", function (e) {
      var t = e.target.closest("[data-bddl]");
      if (t) bdDownload(t.getAttribute("data-bddl"));
    });

    paintBackdrops();
    setTimeout(paintBackdrops, 700);
  }

  /* ---------------- templates, one set per brand ---------------- */
  var TPLS = [
    { slug:"deck-template", name:"Deck template", doc:false,
      copy:"Five layouts — title, section divider, content, big numbers, closing — with the theme and placeholders wired in, so new slides come out right without styling anything." },
    { slug:"client-proposal", name:"Client proposal", doc:false,
      copy:"Six slides that argue a case: what they told us, how we would run it, proof, commercials, next step. The commercial table is there to be overwritten, not sent as-is." },
    { slug:"qbr", name:"QBR / business review", doc:false,
      copy:"The quarter in four numbers, what worked and what did not, a live chart of where the time actually went, and a commitments table with owners and dates." },
    { slug:"recruiting-pitch", name:"Recruiting pitch", doc:false,
      copy:"For selling the role, not the company. Who we are, the numbers, and an honest read of the job including the hard part — which is what candidates actually trust." },
    { slug:"capability-sheet", name:"Capability one-pager", doc:false,
      copy:"The leave-behind after a first conversation. What this brand does, the numbers, where we work, and one person to call. One page on purpose." },
    { slug:"job-flyer", name:"Job flyer", doc:false,
      copy:"Letter size, built for a break room wall or a job fair table: role, pay, shift, what the work is, and a slot for your apply code. Print it, do not email it." },
    { slug:"rate-sheet", name:"Rate sheet", doc:true,
      copy:"Roles, pay, bill, markup and OT in one table, what the bill rate actually covers, and the conversion tiers. Quote it from here rather than working out a markup in the car." },
    { slug:"sow", name:"Statement of work", doc:true,
      copy:"Parties block, scope, what is explicitly out of scope, deliverables with owners and dates, fees, and a signature page. Hangs off the signed service agreement \u2014 it does not replace it." },
    { slug:"letterhead", name:"Letterhead", doc:true,
      copy:"Header with the Inc. 5000 line, the entity strip across the footer, and heading, lede and pull-quote styles already in the Styles gallery." }
  ];
  // the generated files are named after the logo file, so one brand never needs its own lookup table
  function fileOf(b) { return (b.svg || "").replace(/^brand\//, "").replace(/\.svg$/, "") || b.key; }

  function tplCards(b) {
    var base = "brand/" + fileOf(b) + "-";
    return TPLS.map(function (t) {
      var ext = t.doc ? ["dotx", "docx"] : ["potx", "pptx"];
      return '<div class="card tplc">' +
        '<div class="shot"><img src="' + base + t.slug + '-preview.jpg" alt="' + esc(b.name + " " + t.name) + ' preview" loading="lazy"></div>' +
        '<div class="b"><h4>' + esc(t.name) + "</h4><p>" + esc(t.copy) + "</p>" +
        '<div class="lrow">' +
          '<a class="btn" href="' + base + t.slug + "." + ext[0] + '" download>' + dlIcon + ext[0].toUpperCase() + "</a>" +
          '<a class="btn ghost" href="' + base + t.slug + "." + ext[1] + '" download>' + ext[1].toUpperCase() + "</a>" +
        "</div></div></div>";
    }).join("");
  }

  var tsw = document.getElementById("tsw"), tplGrid = document.getElementById("tplGrid");
  if (tsw && tplGrid) {
    tsw.innerHTML = BRANDS.map(function (b) {
      return '<button data-tb="' + b.key + '" style="--c:' + (b.gold || "#FFC800") + '">' +
             '<span class="dot"></span>' + esc(b.name) + "</button>";
    }).join("");
    var paintT = function (key) {
      var b = BRANDS.filter(function (x) { return x.key === key; })[0] || BRANDS[0];
      tplGrid.innerHTML = tplCards(b);
      tsw.querySelectorAll("button").forEach(function (x) {
        x.classList.toggle("on", x.getAttribute("data-tb") === key);
      });
    };
    tsw.addEventListener("click", function (e) {
      var t = e.target.closest("[data-tb]");
      if (t) paintT(t.getAttribute("data-tb"));
    });
    paintT(BRANDS[0].key);
  }

  /* ---------------- color ---------------- */
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
  SW.push({ nm:"Packaging charcoal", hex:"#3E3E3E", who:"Spark Packaging", dark:true });
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
    "<code>#FFC800</code>, <code>#FCD20E</code>, <code>#F2D216</code>, <code>#FAD110</code>, <code>#FFDE59</code>. " +
    "Side by side on one slide the difference shows. Use the house gold for anything portfolio-wide, and the entity value when you are working inside a single brand.";

  /* ---------------- post maker ---------------- */
  var C = document.getElementById("pmCanvas");
  if (C) {
    var ctx = C.getContext("2d");
    var SIZES = { "li-link":[1200,627], square:[1080,1080], portrait:[1080,1350], story:[1080,1920], wide:[1920,1080] };
    var sel = document.getElementById("pmBrand");
    sel.innerHTML = BRANDS.map(function (b) { return '<option value="' + b.key + '">' + esc(b.name) + "</option>"; }).join("");
    var G = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; };
    var K = function (id) { var e = document.getElementById(id); return !!(e && e.checked); };
    var photoImg = null;
    var drawSeq = 0;   // async art (logo, recruiter photo) must not land on a later repaint

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
    function drawQR(text, x, y, size, fg, bg) {
      if (!window.qrcode) return false;
      var q; try { q = window.qrcode(0, "M"); q.addData(text); q.make(); } catch (e) { return false; }
      var n = q.getModuleCount(), cell = size / (n + 4), off = cell * 2;
      ctx.fillStyle = bg; roundRect(x, y, size, size, size * 0.07); ctx.fill();
      ctx.fillStyle = fg;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
        if (q.isDark(r, c)) ctx.fillRect(Math.floor(x + off + c * cell), Math.floor(y + off + r * cell), Math.ceil(cell), Math.ceil(cell));
      return true;
    }
    /* cover-fit a photo, honouring a vertical focal point */
    function drawCover(im, W, H, focal) {
      var r = Math.max(W / im.naturalWidth, H / im.naturalHeight);
      var w = im.naturalWidth * r, h = im.naturalHeight * r;
      ctx.drawImage(im, (W - w) / 2, (H - h) * focal, w, h);
    }

    /* the logo is placed from a corner and never overlaps the text column, because the
       text block is laid out inside a box that already excludes the logo's corner */
    function logoBox(W, H, S, pad, pos, sizeMul) {
      if (pos === "none") return null;
      var maxW = Math.min(300 * S * sizeMul, W * 0.34), maxH = 84 * S * sizeMul;
      var x = /l$/.test(pos) ? pad : W - pad - maxW;
      var y = /^t/.test(pos) ? pad : H - pad - maxH;
      return { x: x, y: y, w: maxW, h: maxH, top: /^t/.test(pos), left: /l$/.test(pos) };
    }
    function placeLogo(b, theme, box, seq) {
      if (!box) return Promise.resolve();
      var useRev = (theme === "night" || theme === "photo") && b.rev;
      return loadImg(useRev ? b.rev : (b.svg || b.png)).then(function (im) {
        if (!im || seq !== drawSeq) return;
        var r = Math.min(box.w / im.naturalWidth, box.h / im.naturalHeight);
        var lw = im.naturalWidth * r, lh = im.naturalHeight * r;
        var lx = box.left ? box.x : box.x + box.w - lw;
        var ly = box.top ? box.y : box.y + box.h - lh;
        if (!useRev && theme === "gold") {
          ctx.fillStyle = "rgba(255,255,255,.95)";
          roundRect(lx - 16, ly - 14, lw + 32, lh + 28, 12); ctx.fill();
        }
        ctx.drawImage(im, lx, ly, lw, lh);
      });
    }

    function draw() {
      var seq = ++drawSeq;
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0];
      var fmt = G("pmFormat"), kind = G("pmKind"), theme = G("pmTheme");
      var align = G("pmAlign"), hScale = parseFloat(G("pmScale")) || 1;
      var logoPos = G("pmLogoPos"), logoMul = parseFloat(G("pmLogoSize")) || 1;
      var d = SIZES[fmt]; C.width = d[0]; C.height = d[1];
      var W = d[0], H = d[1], S = Math.min(W, H) / 1080, pad = Math.round(76 * S);
      document.getElementById("pmDims").textContent = W + " × " + H + " px · " + b.name + " · " + kind;

      var fg, accent, dim;
      if (theme === "night")      { ctx.fillStyle = b.dark || "#0d0e1a"; ctx.fillRect(0,0,W,H); fg = "#fff"; accent = b.gold; }
      else if (theme === "gold")  { ctx.fillStyle = b.gold; ctx.fillRect(0,0,W,H); fg = b.orange ? "#0C2745" : "#17150d"; accent = b.dark || "#0d0e1a"; }
      else if (theme === "light") { ctx.fillStyle = "#faf9f6"; ctx.fillRect(0,0,W,H); fg = "#16140e"; accent = b.gold; }
      else                        { ctx.fillStyle = b.dark || "#0d0e1a"; ctx.fillRect(0,0,W,H); fg = "#fff"; accent = b.gold; }

      if (theme === "photo" && photoImg) {
        drawCover(photoImg, W, H, parseFloat(G("pmFocal")) || 0.5);
        var sc = (parseInt(G("pmScrim"), 10) || 0) / 100;
        if (sc > 0) {
          var g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "rgba(8,9,16," + (sc * 0.92).toFixed(3) + ")");
          g.addColorStop(0.55, "rgba(8,9,16," + (sc * 0.62).toFixed(3) + ")");
          g.addColorStop(1, "rgba(8,9,16," + (sc * 0.98).toFixed(3) + ")");
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
      } else if (theme === "night") {
        var rg = ctx.createRadialGradient(W*0.14, -H*0.08, 0, W*0.14, -H*0.08, Math.max(W,H)*1.05);
        rg.addColorStop(0, "rgba(255,200,0,.22)"); rg.addColorStop(0.55, "rgba(255,200,0,0)");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
      dim = (theme === "gold") ? "rgba(0,0,0,.64)" : (theme === "light" ? "#6f6a5d" : "rgba(255,255,255,.76)");
      if (K("pmBar")) { ctx.fillStyle = accent; ctx.fillRect(0, H - 10 * S, W, 10 * S); }

      var box = logoBox(W, H, S, pad, logoPos, logoMul);
      /* text column shrinks only on the side the logo actually occupies */
      var colW = W - pad * 2;
      if (box && box.top) colW = Math.min(colW, W - pad * 2 - box.w - 30 * S);

      ctx.textBaseline = "top";
      var cx = align === "center" ? W / 2 : pad;
      ctx.textAlign = align === "center" ? "center" : "left";
      var textW = align === "center" ? W - pad * 2 : colW;
      var topStart = pad + (box && box.top ? Math.max(0, box.h - 40 * S) + 34 * S : 26 * S);
      // tall canvases (portrait, story) look wrong with everything pinned to the top edge
      var aspect = H / W;
      if (aspect > 1.15) topStart = Math.max(topStart, Math.round(H * (aspect > 1.5 ? 0.26 : 0.16)));
      var y = topStart;

      function block(lines, font, lh, color) {
        ctx.font = font; ctx.fillStyle = color;
        lines.forEach(function (ln) { ctx.fillText(ln, cx, y); y += lh; });
      }

      if (kind === "statement") {
        var hf = "400 " + Math.round((fmt === "li-link" ? 88 : 106) * S * hScale) + "px 'Bebas Neue', Impact, sans-serif";
        block(wrap((G("pmHead") || " ").toUpperCase(), textW, hf), hf, (fmt === "li-link" ? 84 : 100) * S * hScale, fg);
        var sub = G("pmSub");
        if (sub) { y += 18 * S;
          var sf = "400 " + Math.round(34 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
          block(wrap(sub, textW, sf), sf, 44 * S, dim); }
      } else if (kind === "quote") {
        ctx.font = "400 " + Math.round(150 * S) + "px 'Bebas Neue', Impact, sans-serif";
        ctx.fillStyle = accent; ctx.fillText("“", cx, y - 36 * S);
        y += 66 * S;
        var qf = "400 " + Math.round(58 * S * hScale) + "px 'Century Gothic', Jost, Arial, sans-serif";
        block(wrap(G("pmQuote") || " ", textW, qf), qf, 78 * S * hScale, fg);
        var at = G("pmAttr");
        if (at) { y += 22 * S;
          var af = "400 " + Math.round(27 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
          block(wrap("— " + at, textW, af), af, 38 * S, dim); }
      } else {
        var role = G("pmRole") || "Open role", pay = G("pmPay"), shift = G("pmShift"),
            loc = G("pmLoc"), apply = G("pmApply"), recEmail = G("pmRec");
        ctx.font = "700 " + Math.round(26 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
        ctx.fillStyle = accent;
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (7 * S) + "px";
        ctx.fillText("NOW HIRING", cx, y);
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
        y += 56 * S;
        var rf = "400 " + Math.round((fmt === "li-link" ? 92 : 110) * S * hScale) + "px 'Bebas Neue', Impact, sans-serif";
        block(wrap(role.toUpperCase(), textW, rf), rf, (fmt === "li-link" ? 86 : 102) * S * hScale, fg);
        var meta = [loc, shift].filter(Boolean).join("   ·   ");
        if (meta) { y += 10 * S;
          var mf = "400 " + Math.round(31 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
          block([meta], mf, 52 * S, dim); }
        if (pay) {
          y += 20 * S;
          if (align !== "center") { ctx.fillStyle = accent; ctx.fillRect(pad, y, 76 * S, 5 * S); y += 26 * S; }
          var pf = "400 " + Math.round(84 * S * hScale) + "px 'Bebas Neue', Impact, sans-serif";
          block([pay], pf, 96 * S, accent);
        }
        ctx.textAlign = "left";
        /* recruiter and apply code sit in the base band */
        if (recEmail) {
          var rp = (window.__pmPeople || {})[recEmail] || {}, ph = (window.__pmPhotos || {})[recEmail];
          var rx = pad, rad = 44 * S, ry = H - pad - 48 * S;
          var after = function () {
            ctx.textBaseline = "alphabetic";
            ctx.font = "700 " + Math.round(27 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = fg; ctx.fillText(rp.name || recEmail.split("@")[0], rx + rad * 2 + 20 * S, ry - 2 * S);
            ctx.font = "400 " + Math.round(21 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = dim; ctx.fillText(rp.title || "Talk to me about this role", rx + rad * 2 + 20 * S, ry + 26 * S);
            ctx.textBaseline = "top";
          };
          if (ph) loadImg(ph).then(function (im) {
            if (seq !== drawSeq) return;
            if (im) { ctx.save(); ctx.beginPath(); ctx.arc(rx + rad, ry, rad, 0, Math.PI*2); ctx.clip();
              ctx.drawImage(im, rx, ry - rad, rad*2, rad*2); ctx.restore();
              ctx.beginPath(); ctx.arc(rx + rad, ry, rad, 0, Math.PI*2); ctx.strokeStyle = accent; ctx.lineWidth = 3*S; ctx.stroke(); }
            after();
          });
          else { ctx.beginPath(); ctx.arc(rx + rad, ry, rad, 0, Math.PI*2); ctx.fillStyle = accent; ctx.fill(); after(); }
        }
        if (apply) {
          var qs = 150 * S, qx = W - pad - qs, qy = H - pad - qs - 4 * S;
          if (!drawQR(apply, qx, qy, qs, "#17150d", "#ffffff")) {
            ctx.font = "400 " + Math.round(22 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = dim; ctx.textAlign = "right";
            ctx.fillText(apply.replace(/^https?:\/\//, ""), W - pad, H - pad - 4 * S); ctx.textAlign = "left";
          } else {
            ctx.font = "400 " + Math.round(19 * S) + "px 'Century Gothic', Jost, Arial, sans-serif";
            ctx.fillStyle = dim; ctx.textAlign = "center";
            ctx.fillText("Scan to apply", qx + qs / 2, qy + qs + 12 * S); ctx.textAlign = "left";
          }
        }
        window.__pmSlots = { left: !!recEmail, right: !!apply };
      }
      ctx.textAlign = "left";

      if (K("pmJwu")) {
        var slots = (kind === "hiring" && window.__pmSlots) || { left: false, right: false };
        var bottomLogo = box && !box.top;
        ctx.font = "400 " + Math.round(44 * S) + "px 'Bebas Neue', Impact, sans-serif";
        ctx.fillStyle = accent; ctx.textBaseline = "alphabetic";
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (3 * S) + "px";
        var leftTaken = slots.left || (bottomLogo && box.left), rightTaken = slots.right || (bottomLogo && !box.left);
        if (!leftTaken) ctx.fillText("#JWU", pad, H - pad - 6 * S);
        else if (!rightTaken) { ctx.textAlign = "right"; ctx.fillText("#JWU", W - pad, H - pad - 6 * S); ctx.textAlign = "left"; }
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
        ctx.textBaseline = "top";
      }

      if (K("pmSafe")) {
        ctx.save(); ctx.strokeStyle = "rgba(255,0,110,.75)"; ctx.setLineDash([12, 10]); ctx.lineWidth = 2;
        ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
        if (fmt === "story") { ctx.strokeStyle = "rgba(255,0,110,.45)";
          ctx.strokeRect(0, H * 0.14, W, H * 0.72); }
        ctx.restore();
      }
      placeLogo(b, theme, box, seq);
    }
    window.__pmDraw = draw;

    var ids = ["pmBrand","pmFormat","pmKind","pmTheme","pmAlign","pmScale","pmLogoPos","pmLogoSize",
               "pmJwu","pmBar","pmSafe","pmHead","pmSub","pmQuote","pmAttr","pmRole","pmPay","pmShift",
               "pmLoc","pmApply","pmRec","pmScrim","pmFocal"];
    ids.forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      var ev = (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "range") ? "change" : "input";
      el.addEventListener(ev, function () {
        if (id === "pmKind") {
          var k = G("pmKind");
          document.getElementById("pmStatementFields").style.display = k === "statement" ? "" : "none";
          document.getElementById("pmQuoteFields").style.display = k === "quote" ? "" : "none";
          document.getElementById("pmHiringFields").style.display = k === "hiring" ? "" : "none";
        }
        if (id === "pmTheme") document.getElementById("pmPhotoWrap").style.display = G("pmTheme") === "photo" ? "" : "none";
        draw();
      });
      if (el.type === "range") el.addEventListener("input", function () {
        document.getElementById("pmScrimV").textContent = el.value + "%"; draw();
      });
    });

    document.getElementById("pmPhoto").addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { var im = new Image(); im.onload = function () { photoImg = im; draw(); }; im.src = fr.result; };
      fr.readAsDataURL(f);
    });
    document.getElementById("pmReset").addEventListener("click", function () { location.hash = "#posts"; location.reload(); });

    document.getElementById("pmDl").addEventListener("click", function () {
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0];
      var safe = document.getElementById("pmSafe"), was = safe.checked;
      if (was) { safe.checked = false; draw(); }          // guides are for you, not the post
      setTimeout(function () {
        C.toBlob(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "spark-" + b.key + "-" + G("pmKind") + "-" + G("pmFormat") + ".png";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
          if (was) { safe.checked = true; draw(); }
        }, "image/png");
      }, 60);
    });


    /* ---- layout presets: one click sets every control ---- */
    var PRESETS = [
      { id:"bold",   name:"Bold statement", note:"Night, left, large",
        set:{ pmKind:"statement", pmTheme:"night", pmAlign:"left", pmScale:"1.18", pmLogoPos:"tr", pmLogoSize:"1", pmBar:true } },
      { id:"centre", name:"Centered", note:"Quiet and symmetrical",
        set:{ pmKind:"statement", pmTheme:"night", pmAlign:"center", pmScale:"1", pmLogoPos:"tr", pmLogoSize:"0.78", pmBar:true } },
      { id:"photo",  name:"Photo hero", note:"Your image behind",
        set:{ pmKind:"statement", pmTheme:"photo", pmAlign:"center", pmScale:"1.18", pmLogoPos:"tr", pmLogoSize:"1", pmBar:false } },
      { id:"block",  name:"Color block", note:"Brand color, loud",
        set:{ pmKind:"statement", pmTheme:"gold", pmAlign:"left", pmScale:"1.18", pmLogoPos:"br", pmLogoSize:"1", pmBar:false } },
      { id:"clean",  name:"Light & clean", note:"Cream, understated",
        set:{ pmKind:"statement", pmTheme:"light", pmAlign:"left", pmScale:"1", pmLogoPos:"tr", pmLogoSize:"0.78", pmBar:true } },
      { id:"hire",   name:"Hiring card", note:"Role, pay, apply code",
        set:{ pmKind:"hiring", pmTheme:"night", pmAlign:"left", pmScale:"1", pmLogoPos:"tr", pmLogoSize:"1", pmBar:true } },
      { id:"hirep",  name:"Hiring on photo", note:"Role over an image",
        set:{ pmKind:"hiring", pmTheme:"photo", pmAlign:"left", pmScale:"1", pmLogoPos:"tr", pmLogoSize:"1", pmBar:false } },
      { id:"quote",  name:"Quote", note:"Client words, centered",
        set:{ pmKind:"quote", pmTheme:"night", pmAlign:"center", pmScale:"1", pmLogoPos:"tr", pmLogoSize:"0.78", pmBar:true } },
      { id:"story",  name:"Story", note:"Vertical for Reels",
        set:{ pmKind:"statement", pmTheme:"night", pmAlign:"center", pmScale:"1", pmFormat:"story", pmLogoPos:"tr", pmLogoSize:"0.78", pmBar:true } }
    ];
    /* each thumbnail is drawn from the preset's own settings, so it previews the real thing */
    function mini(pr) {
      var b = BRANDS.filter(function (x) { return x.key === sel.value; })[0] || BRANDS[0];
      var t = pr.set.pmTheme, bg, ink, acc;
      if (t === "night") { bg = b.dark || "#0d0e1a"; ink = "#fff"; acc = b.gold; }
      else if (t === "gold") { bg = b.gold; ink = "#17150d"; acc = "#0d0e1a"; }
      else if (t === "light") { bg = "#faf9f6"; ink = "#16140e"; acc = b.gold; }
      else { bg = "linear-gradient(145deg,#4a4a52,#1b1c24)"; ink = "#fff"; acc = b.gold; }
      var ctr = pr.set.pmAlign === "center";
      var bars = ctr
        ? '<i style="left:18%;top:30%;width:64%;height:8px;background:' + ink + '"></i>' +
          '<i style="left:26%;top:44%;width:48%;height:8px;background:' + ink + '"></i>' +
          '<i style="left:33%;top:57%;width:34%;height:4px;background:' + acc + '"></i>'
        : '<i style="left:12%;top:28%;width:62%;height:9px;background:' + ink + '"></i>' +
          '<i style="left:12%;top:43%;width:44%;height:9px;background:' + ink + '"></i>' +
          '<i style="left:12%;top:58%;width:26%;height:4px;background:' + acc + '"></i>';
      var lg = pr.set.pmLogoPos, lx = /l$/.test(lg) ? "left:10%" : "right:10%", ly = /^t/.test(lg) ? "top:10%" : "bottom:14%";
      var logo = '<i style="' + lx + ";" + ly + ';width:22%;height:7px;background:' + acc + ';opacity:.95"></i>';
      var bar = pr.set.pmBar ? '<i style="left:0;bottom:0;width:100%;height:5px;background:' + acc + '"></i>' : "";
      return '<span class="mini" style="background:' + bg + '">' + bars + logo + bar + "</span>";
    }
    function paintPresets() {
      var host = document.getElementById("pmPresets"); if (!host) return;
      host.innerHTML = PRESETS.map(function (p) {
        return '<button class="pre" data-pre="' + p.id + '">' + mini(p) +
          '<span class="cap">' + esc(p.name) + "<small>" + esc(p.note) + "</small></span></button>";
      }).join("");
    }
    paintPresets();
    document.getElementById("pmPresets").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-pre]"); if (!btn) return;
      var pr = PRESETS.filter(function (x) { return x.id === btn.getAttribute("data-pre"); })[0];
      Object.keys(pr.set).forEach(function (id) {
        var el = document.getElementById(id); if (!el) return;
        if (el.type === "checkbox") el.checked = !!pr.set[id]; else el.value = pr.set[id];
      });
      var k = G("pmKind");
      document.getElementById("pmStatementFields").style.display = k === "statement" ? "" : "none";
      document.getElementById("pmQuoteFields").style.display = k === "quote" ? "" : "none";
      document.getElementById("pmHiringFields").style.display = k === "hiring" ? "" : "none";
      document.getElementById("pmPhotoWrap").style.display = G("pmTheme") === "photo" ? "" : "none";
      [].forEach.call(document.querySelectorAll(".pre"), function (x) { x.classList.remove("on"); });
      btn.classList.add("on");
      draw();
    });
    sel.addEventListener("change", paintPresets);   // thumbnails follow the chosen brand

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
      a: ["Whichever gold you like", "The house gold, #FFC800", "Ignite’s #F2D216", "Mix them"], right: 1,
      why: "Entity golds are for work inside that one brand. Anything portfolio-wide uses the house gold." },
    { q: "You need the Ignite logo on a black background. What do you grab?",
      a: ["The normal logo", "The normal logo with the background removed", "The reversed version from the hub", "Recolor it yourself"], right: 2,
      why: "Every brand has a reversed version in the hub. Never recolor a logo by hand." },
    { q: "The Inc. 5000 badge needs to fit a tight space. What is allowed?",
      a: ["Crop it", "Recolor it to gold", "Stretch it", "Scale it proportionally, nothing else"], right: 3,
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
      '<div class="step"><h3><span class="n">3</span>Dark backgrounds</h3><p>Every brand has a reversed version in the hub. Use it rather than putting the normal logo on black or recoloring one yourself.</p></div>' +
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
        .catch(function (e) {
          // Never trap someone behind the gate because the save failed: they passed, let them in.
          console.error("brand training save failed", e && e.message);
          gate.classList.remove("on"); document.body.style.overflow = "";
          loadPeople();
        });
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
