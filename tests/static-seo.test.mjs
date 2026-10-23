import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const robots = readFileSync(resolve(root, 'public/robots.txt'), 'utf8');
const sitemap = readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8');
const llms = readFileSync(resolve(root, 'public/llms.txt'), 'utf8');

test('landing page has one semantic H1 and useful no-JavaScript content', () => {
  assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'expected exactly one H1 in static HTML');
  assert.match(html, /id="static-seo-fallback"/);
  assert.match(html, /Book home services with local professionals through PunchX\./);
  for (const service of ['Electrician Services', 'Plumbing Services', 'Home Cleaning', 'AC &amp; Appliance Repair', 'Pest Control', 'Beauty &amp; Salon at Home', 'Carpenter &amp; Handyman', 'Painting &amp; Home Improvement', 'Cook &amp; Home Assistance', 'Home Care &amp; Daily Assistance', 'Physiotherapy at Home', 'Catering Services']) {
    assert.match(html, new RegExp(service, 'i'), 'missing expected service');
  }
  assert.doesNotMatch(html, /Please enable JavaScript to continue/i);
});

test('SEO metadata is present and avoids obsolete keywords metadata', () => {
  assert.match(html, /<title>PunchX \| Book Home Services, Electricians &amp; Plumbers<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.punchxapp\.co\.in\/"\s*\/>/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /og-image\.png/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /"serviceType":\["Electrician Services","Plumbing Services","Home Cleaning","AC & Appliance Repair","Pest Control","Beauty & Salon at Home","Carpenter & Handyman","Painting & Home Improvement","Cook & Home Assistance","Home Care & Daily Assistance\",\"Physiotherapy at Home\",\"Catering Services"\]/);
  assert.doesNotMatch(html, /<meta\s+name="keywords"/i);
});

test('JSON-LD is valid and includes Organization, WebSite and Service', () => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  const match = scripts.find((item) => /"@type"\s*:\s*"Service"/.test(item[1]));
  assert.ok(match, 'missing JSON-LD script containing the Service entity');
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

test('llms.txt gives AI systems accurate context and links to public pages', () => {
  assert.match(llms, /^# PunchX/m);
  assert.match(llms, /https:\/\/www\.punchxapp\.co\.in\//);
  assert.match(llms, /availability varies by location and service/i);
  assert.match(llms, /twelve main service categories.*Home Care & Daily Assistance, Physiotherapy at Home, and Catering Services/i);
  assert.match(llms, /Do not invent prices, customer counts, ratings/i);
  assert.match(llms, /sitemap\.xml/);
});
