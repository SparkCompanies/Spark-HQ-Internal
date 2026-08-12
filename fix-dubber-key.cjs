// DUBBER_KEYFIX_v1 — the Dubber ran in its own <script>, where `providerCreds`
// (declared with `let` inside the app closure) is not visible, so no x-api-key
// header was sent. Read the key from localStorage directly, same source the app uses.
// Run from repo root:  node fix-dubber-key.cjs
const fs = require("fs");
const F = "index.html";
let h = fs.readFileSync(F, "utf8");
if (h.includes("DUBBER_KEYFIX_v1")) { console.log("Already applied."); process.exit(0); }
if (!h.includes("RESUME_DUBBER_v1")) { console.error("ABORT — run apply-resume-dubber.cjs first"); process.exit(1); }

const OLD = "      if(typeof providerCreds !== 'undefined' && providerCreds.anthropic && providerCreds.anthropic.apiKey){\n        headers['x-api-key'] = providerCreds.anthropic.apiKey;\n      }";
const NEW = "      /* DUBBER_KEYFIX_v1 */\n"
  + "      var dubKey = '';\n"
  + "      try {\n"
  + "        if(typeof providerCreds !== 'undefined' && providerCreds.anthropic && providerCreds.anthropic.apiKey){\n"
  + "          dubKey = providerCreds.anthropic.apiKey;\n"
  + "        }\n"
  + "      } catch(_){}\n"
  + "      if(!dubKey){\n"
  + "        try { dubKey = localStorage.getItem('spark_hq_anthropic_key') || localStorage.getItem('spark_hq_api_key') || ''; } catch(_){}\n"
  + "      }\n"
  + "      if(!dubKey){\n"
  + "        throw new Error('No Anthropic key found. Set it under Admin \\u2192 AI Settings, then reload this page.');\n"
  + "      }\n"
  + "      headers['x-api-key'] = dubKey;";

let target = OLD, replacement = NEW;
if (h.split(target).length - 1 !== 1) {
  const crlf = OLD.replace(/\n/g, "\r\n");
  if (h.split(crlf).length - 1 === 1) { target = crlf; replacement = NEW.replace(/\n/g, "\r\n"); }
}
if (h.split(target).length - 1 !== 1) {
  console.error("ABORT — key block not found exactly once (no changes written)");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync("index.backup-dubkey-" + stamp + ".html", h);
h = h.split(target).join(replacement);
fs.writeFileSync(F, h);
console.log("APPLIED DUBBER_KEYFIX_v1 — key now read from localStorage fallback");
console.log("  backup: index.backup-dubkey-" + stamp + ".html");
