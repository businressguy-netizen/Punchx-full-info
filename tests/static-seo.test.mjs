import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const robots = readFileSync(resolve(root, 'public/robots.txt'), 'utf8');
const sitemap = readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8');

test('landing page has one semantic H1 and useful no-JavaScript content', () => {
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'expected exactly one H1 in static HTML');
  assert.match(html, /id="static-seo-fallback"/);
  assert.match(html, /Connecting people with trusted local professionals\./);
  for (const service of ['Electrical', 'Plumbing', 'AC repair', 'Cleaning', 'Carpentry', 'Painting']) {
    assert.match(html, new RegExp(service, 'i'), `missing service: ${service}`);
  }
  assert.doesNotMatch(html, /Please enable JavaScript to continue/i);
});

test('SEO metadata is present and avoids obsolete keywords metadata', () => {
  assert.match(html, /<title>PunchX \| Local Service Professionals<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.punchxapp\.co\.in\/"\s*\/>/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /name="twitter:card"/);
  assert.doesNotMatch(html, /<meta\s+name="keywords"/i);
});

test('JSON-LD is valid and includes Organization, WebSite and Service', () => {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(match, 'missing JSON-LD script');
  const data = JSON.parse(match[1]);
  const types = data['@graph'].map((entry) => entry['@type']);
  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('Service'));
});

test('robots.txt points to the sitemap and sitemap excludes the login route', () => {
  assert.match(robots, /Sitemap:\s*https:\/\/www\.punchxapp\.co\.in\/sitemap\.xml/i);
  assert.match(sitemap, /<loc>https:\/\/www\.punchxapp\.co\.in\/<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/www\.punchxapp\.co\.in\/(auth|login)<\/loc>/i);
});
