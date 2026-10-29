/**
 * Bundle Size Gate Script
 *
 * Reports every emitted JS/CSS asset but fails only on the eager-loaded
 * module graph for the HTML entry point. Lazy-loaded routes are downloaded
 * only when users visit them, so summing every route as the initial bundle
 * would overstate the first-page payload.
 *
 * Thresholds:
 * - Single emitted JS chunk warning: > 500 KB raw
 * - Initial JS+CSS failure: > 2048 KB raw
 *
 * Usage: node scripts/check-bundle-size.js
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');
const MANIFEST_PATHS = [join(DIST_DIR, '.vite', 'manifest.json'), join(DIST_DIR, 'manifest.json')];

const SINGLE_CHUNK_WARN_KB = 500;
const INITIAL_FAIL_KB = 2048;
const SINGLE_CHUNK_WARN = SINGLE_CHUNK_WARN_KB * 1024;
const INITIAL_FAIL = INITIAL_FAIL_KB * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function getFiles(dir, extensions) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFiles(fullPath, extensions));
    } else if (extensions.includes(extname(entry.name).toLowerCase())) {
      results.push({ name: entry.name, path: fullPath, size: statSync(fullPath).size });
    }
  }
  return results;
}

function collectInitialFiles(manifest, entryKey) {
  const collected = new Set();
  const visited = new Set();

  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);

    const item = manifest[key];
    if (!item) {
      throw new Error(`Vite manifest is missing static import entry: ${key}`);
    }

    if (item.file) collected.add(item.file);
    for (const cssFile of item.css || []) collected.add(cssFile);
    for (const importedKey of item.imports || []) visit(importedKey);
  }

  visit(entryKey);
  return [...collected];
}

function main() {
  console.log('\n📦 Bundle Size Analysis');
  console.log('═'.repeat(60));

  const jsFiles = getFiles(ASSETS_DIR, ['.js', '.mjs']);
  const cssFiles = getFiles(ASSETS_DIR, ['.css']);
  const allFiles = [...jsFiles, ...cssFiles];

  if (allFiles.length === 0) {
    console.error('❌ No JS/CSS files found in dist/assets/. Did the build succeed?');
    process.exit(1);
  }

  // Vite versions differ in whether the manifest is emitted at dist/.vite/manifest.json or dist/manifest.json.
  const manifestPath = MANIFEST_PATHS.find((candidate) => existsSync(candidate));
  if (!manifestPath) {
    console.error('❌ Vite build manifest not found in dist/.vite/manifest.json or dist/manifest.json. Enable build.manifest in vite.config.ts.');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry && (key === 'index.html' || key.endsWith('/main.tsx') || manifest[key].src?.endsWith('/main.tsx')));
  if (!entryKey) {
    console.error('❌ Could not find the HTML/main.tsx entry in the Vite manifest.');
    process.exit(1);
  }

  const initialPaths = collectInitialFiles(manifest, entryKey);
  const initialFiles = initialPaths.map((relativePath) => {
    const filePath = join(DIST_DIR, relativePath);
    if (!existsSync(filePath)) {
      throw new Error(`Initial bundle asset is missing: ${relativePath}`);
    }
    return { name: relativePath.split('/').pop(), path: filePath, size: statSync(filePath).size };
  });

  let fullSize = 0;
  let hasWarnings = false;
  for (const file of allFiles.sort((a, b) => b.size - a.size)) {
    fullSize += file.size;
    const warning = extname(file.name).toLowerCase() !== '.css' && file.size > SINGLE_CHUNK_WARN;
    if (warning) hasWarnings = true;
    const name = file.name.length > 38 ? file.name.substring(0, 35) + '...' : file.name;
    console.log(
      '│' + ` ${name}`.padEnd(40) +
      '│' + ` ${formatSize(file.size)}`.padEnd(12) +
      '│' + ` ${warning ? '⚠️' : '✅'}`.padEnd(8) + '│'
    );
  }

  const initialSize = initialFiles.reduce((sum, file) => sum + file.size, 0);
  const initialFailed = initialSize > INITIAL_FAIL;
  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Emitted JS files: ${jsFiles.length} (${formatSize(jsFiles.reduce((sum, file) => sum + file.size, 0))})`);
  console.log(`📊 Emitted CSS files: ${cssFiles.length} (${formatSize(cssFiles.reduce((sum, file) => sum + file.size, 0))})`);
  console.log(`📊 Total emitted JS+CSS (including lazy routes): ${formatSize(fullSize)}`);
  console.log(`📊 Initial-load files (${initialFiles.length} files): ${formatSize(initialSize)}`);
  console.log(`📏 Single JS chunk warning threshold: ${SINGLE_CHUNK_WARN_KB} KB`);
  console.log(`📏 Initial JS+CSS failure threshold: ${INITIAL_FAIL_KB} KB`);

  if (hasWarnings) {
    console.log('\n⚠️ Some individual JS chunks exceed the warning threshold. Review the largest chunks.');
  }

  if (initialFailed) {
    console.error(`\n❌ FAILED: Initial bundle size (${formatSize(initialSize)}) exceeds ${INITIAL_FAIL_KB} KB.`);
    process.exit(1);
  }

  console.log('\n✅ Initial bundle size check PASSED.\n');
}

main();
