/* =====================================================================
   SBX_JOBMETA_WORKER_v1 — /sbx-job-meta route
   Drop into the worker that already holds your Salesforce secrets
   (TimeKeep worker is the natural home — it already does SF auth
   for /tk-hours-push and /tk-hours-preview).

   WIRING (2 lines in your existing fetch handler):
     if (url.pathname === '/sbx-job-meta') {
       return handleSbxJobMeta(request, env, ctx);
     }

   ASSUMES: you have a working getSfToken(env) helper already (the one
   TimeKeep uses). If its name differs, change ONE line below (marked).
   It must return { access_token, instance_url }.

   OPTIONAL ENV VARS:
     SBX_JOB_OBJECT  — Job object API name (e.g. asymbl_ats__Job__c).
                       If unset, the route auto-discovers it by label.

   CACHING: edge cache, 6h TTL. Force refresh: /sbx-job-meta?refresh=1
===================================================================== */

const SBX_ALLOWED_ORIGINS = [
  'https://sparkcompanies.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];
const SF_API = 'v60.0';

function sbxCors(request) {
  const origin = request.headers.get('Origin') || '';
  const ok = SBX_ALLOWED_ORIGINS.some(o => origin === o);
  return {
    'Access-Control-Allow-Origin': ok ? origin : SBX_ALLOWED_ORIGINS[0],
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

async function sfGet(path, auth) {
  const r = await fetch(auth.instance_url + path, {
    headers: { Authorization: 'Bearer ' + auth.access_token }
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error('SF ' + r.status + ' on ' + path + ': ' + body.slice(0, 300));
  }
  return r.json();
}

/* Find the Job object if SBX_JOB_OBJECT isn't set. Prefers a custom
   object labeled exactly "Job" (Asymbl's is namespaced). */
async function discoverJobObject(auth) {
  const all = await sfGet('/services/data/' + SF_API + '/sobjects/', auth);
  const cand = (all.sobjects || []).filter(s =>
    s.label === 'Job' && s.custom === true && s.queryable
  );
  if (!cand.length) throw new Error('Could not auto-discover the Job object. Set SBX_JOB_OBJECT.');
  /* If multiple, prefer the namespaced (managed package) one */
  cand.sort((a, b) => (b.name.split('__').length - a.name.split('__').length));
  return cand[0].name;
}

async function handleSbxJobMeta(request, env, ctx) {
  const url = new URL(request.url);
  const cors = sbxCors(request);
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  /* ---- edge cache ---- */
  const cacheKey = new Request(url.origin + '/sbx-job-meta', request);
  const cache = caches.default;
  if (!url.searchParams.get('refresh')) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  try {
    /* >>> ONE LINE TO MATCH YOUR WORKER <<< */
    const auth = await getSfToken(env);

    const objName = env.SBX_JOB_OBJECT || url.searchParams.get('obj') || await discoverJobObject(auth);

    /* ---- 1) object-info: fields, types, required flags, record type ---- */
    const info = await sfGet('/services/data/' + SF_API + '/ui-api/object-info/' + objName, auth);
    const rtId = info.defaultRecordTypeId || '012000000000000AAA';

    const fields = {};
    for (const [api, f] of Object.entries(info.fields || {})) {
      fields[api] = {
        label: f.label,
        type: f.dataType,
        required: !!f.required,
        controller: f.controllingFields && f.controllingFields.length ? f.controllingFields[0] : null,
        calculated: !!f.calculated
      };
    }

    /* ---- 2) picklist values + dependency maps for the record type ---- */
    const pk = await sfGet(
      '/services/data/' + SF_API + '/ui-api/object-info/' + objName + '/picklist-values/' + rtId,
      auth
    );
    const picklists = {};
    const dependencies = {};
    for (const [api, pv] of Object.entries(pk.picklistFieldValues || {})) {
      picklists[api] = (pv.values || []).map(v => v.label);
      const ctlValues = pv.controllerValues || {};
      const ctlNames = Object.keys(ctlValues);        /* controllerValue -> index */
      if (ctlNames.length && fields[api] && fields[api].controller) {
        /* invert: for each controller value, which dependent values are valid */
        const map = {};
        ctlNames.forEach(cv => { map[cv] = []; });
        (pv.values || []).forEach(v => {
          (v.validFor || []).forEach(idx => {
            const cv = ctlNames.find(k => ctlValues[k] === idx);
            if (cv) map[cv].push(v.label);
          });
        });
        dependencies[api] = { controller: fields[api].controller, map };
      }
    }

    /* ---- 3) validation rules: query, then per-Id fetch for formulas ---- */
    const q = encodeURIComponent(
      "SELECT Id, ValidationName, Active, ErrorDisplayField, ErrorMessage " +
      "FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = '" + objName + "'"
    );
    const vq = await sfGet('/services/data/' + SF_API + '/tooling/query/?q=' + q, auth);
    const rules = [];
    for (const rec of (vq.records || []).slice(0, 40)) {
      let formula = null;
      try {
        const full = await sfGet(
          '/services/data/' + SF_API + '/tooling/sobjects/ValidationRule/' + rec.Id, auth
        );
        formula = full.Metadata ? full.Metadata.errorConditionFormula : null;
      } catch (e) { /* formula fetch is best-effort */ }
      rules.push({
        name: rec.ValidationName,
        active: rec.Active,
        field: rec.ErrorDisplayField || null,
        message: rec.ErrorMessage,
        formula
      });
    }

    const payload = JSON.stringify({
      object: objName,
      recordTypeId: rtId,
      generatedAt: new Date().toISOString(),
      fields, picklists, dependencies, rules
    });

    const res = new Response(payload, {
      headers: { ...cors, 'Cache-Control': 'public, max-age=21600' }
    });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), {
      status: 500, headers: cors
    });
  }
}
