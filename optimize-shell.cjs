#!/usr/bin/env node
/* OPTIMIZE_SHELL_v1 — build-time slimming of index.html. Runs in the deploy workflow on the build copy only;
   the repo's index.html stays the single, editable source. Idempotent: skips any step whose anchor is gone.

   Usage: node optimize-shell.cjs <index.html> <out-dir>
   Writes the slimmed page to <out-dir>/index.html plus the extracted assets:

   1. Territory Map county/state TopoJSON (~820 KB) -> data/us-counties.json, fetched when the map first opens.
      It was inline JSON that every visitor downloaded and the parser walked, for a tab most never open.
   2. d3 + topojson-client (~280 KB) -> vendor/sl-d3.js as a cacheable external script, same load order.
   3. The Spark Standard PDF (~360 KB base64) -> docs/spark-standard-2026.pdf, linked normally.
   4. Home "burst" photos (11 base64 JPEGs, ~150 KB) -> img/burst/NN.jpg.

   Net: roughly 1.3 MB of the 3 MB page leaves the first load. No behavior change. */
const fs = require("fs");
const path = require("path");

const [,, inFile, outDir] = process.argv;
if (!inFile || !outDir) { console.error("usage: node optimize-shell.cjs <index.html> <out-dir>"); process.exit(2); }

let html = fs.readFileSync(inFile, "utf8");
const originalLen = html.length;
const log = (m) => console.log("  " + m);
function writeOut(rel, data) {
  const p = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
}
function once(s, from, to, label) {
  const i = s.indexOf(from);
  if (i < 0) { log("= skip (anchor missing): " + label); return s; }
  if (s.indexOf(from, i + 1) >= 0) { log("! anchor not unique, skipped: " + label); return s; }
  log("+ " + label);
  return s.slice(0, i) + to + s.slice(i + from.length);
}

console.log("OPTIMIZE_SHELL_v1 " + inFile + " (" + Math.round(originalLen / 1024) + " KB)");

/* ---------- 1. TopoJSON out of the page, map loads it on demand ---------- */
{
  const open = '<script id="sl-usdata" type="application/json">';
  const a = html.indexOf(open);
  if (a >= 0) {
    const b = html.indexOf("</script>", a);
    const json = html.slice(a + open.length, b);
    if (json.length > 100000 && json.trim().startsWith('{"type":"Topology"')) {
      writeOut("data/us-counties.json", json);
      html = html.slice(0, a + open.length) + html.slice(b);
      log("+ TopoJSON -> data/us-counties.json (" + Math.round(json.length / 1024) + " KB)");
      html = once(html,
        'function loadGeo(){\n  const topo=JSON.parse(document.getElementById("sl-usdata").textContent);\n  window.__SL_TOPOLOGY=topo;',
        'function loadGeo(){\n  return fetch("/data/us-counties.json", { cache: "force-cache" }).then(function(r){ if(!r.ok) throw new Error("map data " + r.status); return r.json(); }).then(function(topo){\n  window.__SL_TOPOLOGY=topo;',
        "loadGeo(): fetch instead of inline parse");
      html = once(html,
        '  countyMesh=topojson.mesh(topo, topo.objects.counties, (a,b)=>a!==b);\n}',
        '  countyMesh=topojson.mesh(topo, topo.objects.counties, (a,b)=>a!==b);\n  });\n}',
        "loadGeo(): close promise");
      html = once(html,
        'function boot(){\n  buildTerrList();\n  try{ loadGeo(); } catch(e){ document.getElementById("sl-loading").textContent="Map data failed to parse."; console.error(e); return; }\n  requestAnimationFrame(async ()=>{',
        'function boot(){\n  buildTerrList();\n  loadGeo().then(function(){\n  requestAnimationFrame(async ()=>{',
        "boot(): wait for map data");
      html = once(html,
        '    selectTerr("mi");\n    slBuildFilters();\n    refresh();\n  });\n}',
        '    selectTerr("mi");\n    slBuildFilters();\n    refresh();\n  });\n  }).catch(function(e){ document.getElementById("sl-loading").textContent="Map data failed to load."; console.error(e); });\n}',
        "boot(): error path");
    } else log("= skip: sl-usdata not the expected TopoJSON");
  } else log("= skip: sl-usdata already external");
}

/* ---------- 2. d3 + topojson-client as an external, cacheable script ---------- */
{
  const a = html.indexOf("/*sl-d3*/");
  const t = html.indexOf("/*sl-topojson*/");
  if (a >= 0 && t > a) {
    const tail = html.slice(t, t + 60000);
    const m = tail.match(/\}\);\s*\n/);
    if (m) {
      const end = t + m.index + m[0].length;
      const vendor = html.slice(a, end);
      if (/^\/\*sl-d3\*\/\/\/ https:\/\/d3js\.org/.test(vendor) && vendor.length > 200000) {
        writeOut("vendor/sl-d3.js", vendor);
        html = html.slice(0, a) + '</script>\n<script src="/vendor/sl-d3.js"></script>\n<script>\n' + html.slice(end);
        log("+ d3 + topojson -> vendor/sl-d3.js (" + Math.round(vendor.length / 1024) + " KB)");
      } else log("= skip: vendor block did not look like d3");
    }
  } else log("= skip: d3 already external");
}

/* ---------- 3. Spark Standard PDF ---------- */
{
  const key = 'href="data:application/pdf;base64,';
  const a = html.indexOf(key);
  if (a >= 0) {
    const b = html.indexOf('"', a + key.length);
    const b64 = html.slice(a + key.length, b);
    writeOut("docs/spark-standard-2026.pdf", Buffer.from(b64, "base64"));
    html = html.slice(0, a) + 'href="/docs/spark-standard-2026.pdf' + html.slice(b);
    log("+ Spark Standard PDF -> docs/spark-standard-2026.pdf (" + Math.round(b64.length * 0.75 / 1024) + " KB)");
  } else log("= skip: PDF already external");
}

/* ---------- 4. Home burst photos ---------- */
{
  const marker = "window.SPARK_SOCIAL_DEFAULT = [";
  const a = html.indexOf(marker);
  if (a >= 0) {
    const b = html.indexOf("];", a);
    let block = html.slice(a, b);
    let n = 0;
    block = block.replace(/'data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+\/=]+)'/g, function (_, ext, b64) {
      n++;
      const name = "img/burst/" + String(n).padStart(2, "0") + "." + (ext === "jpeg" ? "jpg" : ext);
      writeOut(name, Buffer.from(b64, "base64"));
      return "'/" + name + "'";
    });
    if (n) { html = html.slice(0, a) + block + html.slice(b); log("+ " + n + " burst photos -> img/burst/"); }
    else log("= skip: burst photos already external");
  } else log("= skip: SPARK_SOCIAL_DEFAULT not found");
}

writeOut("index.html", html);
console.log("Done: " + Math.round(originalLen / 1024) + " KB -> " + Math.round(html.length / 1024) + " KB (" + Math.round((1 - html.length / originalLen) * 100) + "% smaller)");
