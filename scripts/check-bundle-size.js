/**
 * Bundle Size Gate Script
 * Analyzes the dist/ output after build and enforces size limits.
 * 
 * Thresholds:
 * - Single chunk warning: > 500KB (raw)
 * - Total JS+CSS failure: > 2200KB (raw; measured current production bundle is ~2.03MB)
 * 
 * Usage: node scripts/check-bundle-size.js
 */

import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const DIST_DIR = join(process.cwd(), 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');

// Thresholds in bytes (raw, not gzipped — gzipped is ~30-40% of raw)
const SINGLE_CHUNK_WARN_KB = 500;
const TOTAL_FAIL_KB = 2200; // 2.15MiB — keeps modest headroom above the measured ~2.03MB JS+CSS build

const SINGLE_CHUNK_WARN = SINGLE_CHUNK_WARN_KB * 1024;
const TOTAL_FAIL = TOTAL_FAIL_KB * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function getFiles(dir, extensions) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getFiles(fullPath, extensions));
      } else if (extensions.includes(extname(entry.name).toLowerCase())) {
        results.push({
          name: entry.name,
          path: fullPath,
          size: statSync(fullPath).size,
        });
      }
    }
  } catch {
    // Directory may not exist
  }
  return results;
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

  let totalSize = 0;
  let hasWarnings = false;
  let hasFailed = false;

  // Print header
  console.log('\n' + '┌' + '─'.repeat(40) + '┬' + '─'.repeat(12) + '┬' + '─'.repeat(8) + '┐');
  console.log('│' + ' File'.padEnd(40) + '│' + ' Size'.padEnd(12) + '│' + ' Status'.padEnd(8) + '│');
  console.log('├' + '─'.repeat(40) + '┼' + '─'.repeat(12) + '┼' + '─'.repeat(8) + '┤');

  // Sort by size descending
  allFiles.sort((a, b) => b.size - a.size);

  for (const file of allFiles) {
    totalSize += file.size;
    let status = '✅';

    if (file.size > SINGLE_CHUNK_WARN) {
      status = '⚠️';
      hasWarnings = true;
    }

    const name = file.name.length > 38 ? file.name.substring(0, 35) + '...' : file.name;
    console.log(
      '│' + ` ${name}`.padEnd(40) +
      '│' + ` ${formatSize(file.size)}`.padEnd(12) +
      '│' + ` ${status}`.padEnd(8) + '│'
    );
  }

  console.log('├' + '─'.repeat(40) + '┼' + '─'.repeat(12) + '┼' + '─'.repeat(8) + '┤');

  // Total row
  if (totalSize > TOTAL_FAIL) {
    hasFailed = true;
  }

  const totalStatus = hasFailed ? '❌' : '✅';
  console.log(
    '│' + ' TOTAL'.padEnd(40) +
    '│' + ` ${formatSize(totalSize)}`.padEnd(12) +
    '│' + ` ${totalStatus}`.padEnd(8) + '│'
  );
  console.log('└' + '─'.repeat(40) + '┴' + '─'.repeat(12) + '┴' + '─'.repeat(8) + '┘');

  // Summary
  console.log(`\n📊 JS files: ${jsFiles.length} (${formatSize(jsFiles.reduce((s, f) => s + f.size, 0))})`);
  console.log(`📊 CSS files: ${cssFiles.length} (${formatSize(cssFiles.reduce((s, f) => s + f.size, 0))})`);
  console.log(`📊 Total: ${formatSize(totalSize)}`);

  // Thresholds
  console.log(`\n📏 Single chunk warning threshold: ${SINGLE_CHUNK_WARN_KB} KB`);
  console.log(`📏 Total bundle failure threshold: ${TOTAL_FAIL_KB} KB`);

  if (hasWarnings) {
    console.log('\n⚠️  WARNING: Some chunks exceed the single-chunk size warning threshold.');
    console.log('   Consider code-splitting or lazy-loading large modules.');
  }

  if (hasFailed) {
    console.log(`\n❌ FAILED: Total bundle size (${formatSize(totalSize)}) exceeds ${TOTAL_FAIL_KB} KB limit.`);
    console.log('   Reduce bundle size by:');
    console.log('   - Removing unused dependencies');
    console.log('   - Using dynamic imports for heavy components');
    console.log('   - Checking for duplicate packages in node_modules');
    process.exit(1);
  }

  console.log('\n✅ Bundle size check PASSED.\n');
}

main();
