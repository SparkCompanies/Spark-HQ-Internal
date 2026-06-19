#!/usr/bin/env node
/**
 * Smoke test for Spark HQ.
 *
 * The production site is the single hand-written `index.html` (it is what the
 * deploy workflow copies to Azure Static Web Apps). Because that file is large
 * and edited by hand, the most common failure mode is an edit that accidentally
 * truncates the file or deletes a whole feature section. These checks are a
 * cheap guard against shipping a broken core site.
 *
 * Run with: node scripts/smoke-test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];
const pass = [];

function check(name, condition, detail = '') {
  if (condition) pass.push(name);
  else failures.push(detail ? `${name} - ${detail}` : name);
}

let html = '';
try {
  html = readFileSync(join(root, 'index.html'), 'utf8');
} catch (e) {
  failures.push(`index.html could not be read - ${e.message}`);
}

if (html) {
  check('index.html is non-trivial in size', html.length > 500000,
    `only ${html.length} bytes - file may be truncated`);
  check('index.html opens with a doctype', /^\s*<!DOCTYPE html>/i.test(html));
  check('index.html has <head> and <body>', /<head[\s>]/i.test(html) && /<body[\s>]/i.test(html));
  check('index.html closes cleanly', /<\/body>\s*<\/html>\s*$/i.test(html.trimEnd() + '\n'),
    'missing trailing </body></html> - file may be cut off');

  const opens = (html.match(/<div\b/gi) || []).length;
  const closes = (html.match(/<\/div>/gi) || []).length;
  check('<div> tags are roughly balanced', Math.abs(opens - closes) <= 5,
    `${opens} opening vs ${closes} closing <div> tags`);

  const requiredSections = [
    'Spark HQ', 'Command Center', 'Headcount', 'Jarvis',
    'Salesforce', 'Billing', 'Recognition', 'Announcements',
  ];
  for (const section of requiredSections) {
    check(`feature present: "${section}"`, html.includes(section),
      'section appears to have been removed');
  }

  check('no leftover template placeholders', !/\{\{[^}]+\}\}/.test(html),
    'found {{...}} placeholder in shipped HTML');
}

try {
  const cfg = JSON.parse(readFileSync(join(root, 'staticwebapp.config.json'), 'utf8'));
  check('staticwebapp.config.json is valid JSON', true);
  check('navigationFallback is configured', !!cfg.navigationFallback);
} catch (e) {
  failures.push(`staticwebapp.config.json invalid - ${e.message}`);
}

console.log(`\nSpark HQ smoke test`);
console.log(`  passed: ${pass.length}`);
console.log(`  failed: ${failures.length}\n`);

if (failures.length) {
  console.error('FAILURES:');
  for (const f of failures) console.error(`  x ${f}`);
  console.error('');
  process.exit(1);
}

console.log('All smoke checks passed\n');
