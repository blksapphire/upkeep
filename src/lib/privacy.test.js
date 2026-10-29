import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The privacy promise ("your dates never leave the device") rests on the app having no
// way to reach the network. This fails if any shipped source file gains one.

const libDir = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(libDir, '..');
const repoRoot = path.resolve(srcRoot, '..');
const FORBIDDEN = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|import\(\s*['"`]https?:/;

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js')) files.push(full);
  }
  return files;
}

test('app source contains no network primitives', () => {
  const files = sourceFiles(srcRoot);
  assert.ok(files.length >= 8, 'scan finds the app source');
  const offenders = [];
  for (const file of files) {
    const match = stripComments(fs.readFileSync(file, 'utf8')).match(FORBIDDEN);
    if (match) offenders.push(`${path.relative(repoRoot, file)}: ${match[0]}`);
  }
  assert.deepEqual(offenders, []);
});

test('the guard catches violations and ignores comments', () => {
  assert.ok(FORBIDDEN.test('await fetch("https://x.test")'));
  assert.ok(FORBIDDEN.test('navigator.sendBeacon(url, data)'));
  assert.ok(FORBIDDEN.test('import("https://x.test/lib.js")'));
  assert.ok(!FORBIDDEN.test(stripComments('// fetch is not used here\nconst a = 1;')));
});

test('the shipped CSP stays locked to its own origin', () => {
  const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'));
  const csp = config.headers[0].headers.find((header) => header.key === 'Content-Security-Policy').value;
  assert.match(csp, /connect-src 'self'(;|$)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /script-src[^;]*https?:/);
});

test('the document loads only local assets', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
  assert.doesNotMatch(html, /<link[^>]+href="https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"/i);
  assert.match(html, /<script type="module" src="\/src\/main\.jsx"><\/script>/);
});
