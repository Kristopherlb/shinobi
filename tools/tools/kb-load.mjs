#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const ROOT = process.argv[2] || 'platform-kb';
const svcType = process.argv[3];
const framework = process.argv[4];
const explicit = process.argv.slice(5); // optional pack IDs

const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'index.json'), 'utf8'));
const packsIndex = yaml.parse(fs.readFileSync(path.join(ROOT, index.packs[0]), 'utf8')).packs;

const pick = (id) => {
  const hit = packsIndex.find(p => p.id === id || p.id.endsWith('.' + id));
  if (!hit) return null;
  const full = yaml.parse(fs.readFileSync(path.join(ROOT, hit.file), 'utf8'));
  return { meta: hit, pack: full };
};

// heuristic selection if none specified
const want = new Set(explicit.length ? explicit : [
  'aws.global.logging', 'aws.global.monitoring',
  `aws.service.${svcType.replace(/:.*/, '')}`,
  `aws.${framework}` // supports imported ids that end with .<name>
]);

const chosen = [];
for (const cand of packsIndex) {
  for (const w of want) {
    if (cand.id === w || cand.id.endsWith('.' + w.split('.').slice(-1)[0])) {
      const full = pick(cand.id);
      if (full) chosen.push(full);
    }
  }
}

process.stdout.write(JSON.stringify({ chosen }, null, 2));
