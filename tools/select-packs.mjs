#!/usr/bin/env node
/**
 * Select knowledge base packs for compliance checking.
 * 
 * Replaces the removed tools/kb-load.mjs with explicit, maintainable pack selection.
 * 
 * Usage:
 *   node tools/select-packs.mjs <kbType> <serviceType> <framework>
 * 
 * Output: JSON object with { chosen: [{ meta: { id: ... } }], framework: ... }
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const [, , kbType = 'platform-kb', serviceType = 's3-bucket', framework = 'fedramp-moderate'] = process.argv;

function log(...args) {
  console.error('[select-packs]', ...args);
}

async function main() {
  // 1) If a KB directory exists (tools/kb or kb), attempt to load packs (convention-based)
  const repoRoot = process.cwd();
  const kbDirs = ['kb', 'tools/kb', 'data/kb', 'platform-kb'].map(p => path.join(repoRoot, p));
  
  for (const dir of kbDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      log(`Found KB directory: ${dir}`);
      // Example convention: packs stored as JSON files named <pack-id>.json or index.json
      const indexFile = path.join(dir, 'index.json');
      if (fs.existsSync(indexFile)) {
        try {
          const idx = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
          // You may need to adapt how pack IDs are derived; produce chosen[] matching existing pipeline expectation.
          const chosen = (idx.chosen || []).map(p => ({ meta: { id: p.meta?.id || p.id || p.name } }));
          console.log(JSON.stringify({ chosen, framework }, null, 2));
          return;
        } catch (e) {
          log('Failed to parse KB index.json:', e.message);
        }
      }
      // fallback: if a directory for the serviceType exists, pick it
      const svcDir = path.join(dir, serviceType);
      if (fs.existsSync(svcDir) && fs.statSync(svcDir).isDirectory()) {
        log(`Found service directory: ${svcDir}`);
        console.log(JSON.stringify({ chosen: [{ meta: { id: serviceType } }], framework }, null, 2));
        return;
      }
    }
  }

  // 2) Check packages/components/<serviceType> — if present, use it as a pack id
  const compPath = path.join(repoRoot, 'packages', 'components', serviceType);
  if (fs.existsSync(compPath) && fs.statSync(compPath).isDirectory()) {
    log(`Found component package at ${compPath}; selecting pack ${serviceType}`);
    console.log(JSON.stringify({ chosen: [{ meta: { id: serviceType } }], framework }, null, 2));
    return;
  }

  // 3) Default fallback: return serviceType as single chosen pack
  log('No KB or component found — using default pack selection');
  console.log(JSON.stringify({ chosen: [{ meta: { id: serviceType } }], framework }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

