#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const ROOT = path.resolve(process.cwd(), 'platform-kb');
const must = [
  'index.json',
  'packs/index.yaml',
  'controls/catalogs/nist-800-53r5.min.json',
  'controls/maps/nist-to-config.yaml',
  'controls/maps/config-to-service.yaml',
  'controls/maps/service-to-otel.yaml',
];

let ok = true;
for (const rel of must) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.error(`[KB] Missing: ${rel}`); ok = false; }
}

function loadYaml(p){ return yaml.parse(fs.readFileSync(p,'utf-8')); }
function tryLoad(p){ try { return loadYaml(p); } catch(e) { console.error(`[KB] YAML parse failed: ${p}`, e.message); ok = false; return null; } }

const packsIndex = tryLoad(path.join(ROOT, 'packs/index.yaml'));
if (packsIndex?.packs) {
  for (const p of packsIndex.packs) {
    const fp = path.join(ROOT, p.file);
    if (!fs.existsSync(fp)) { console.error(`[KB] Pack file missing: ${p.file}`); ok = false; }
  }
}

if (!ok) { process.exit(1); }
console.log('[KB] Validation passed.');
