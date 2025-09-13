#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const PACKS_DIR = process.argv[2] || './platform-kb/packs/aws';
const MAP_N2C = './platform-kb/controls/maps/nist-to-config.yaml';
const MAP_C2S = './platform-kb/controls/maps/config-to-service.yaml';

function loadYaml(p) { return yaml.parse(fs.readFileSync(p, 'utf-8')); }
function saveYaml(p, obj) { fs.writeFileSync(p, yaml.stringify(obj)); }

const n2c = fs.existsSync(MAP_N2C) ? loadYaml(MAP_N2C) : { "$schema": "platform-kb/nist-config-map@v1", mappings: {} };
const c2s = fs.existsSync(MAP_C2S) ? loadYaml(MAP_C2S) : { "$schema": "platform-kb/config-service-map@v1", mappings: {} };

for (const file of (fs.existsSync(PACKS_DIR) ? fs.readdirSync(PACKS_DIR) : []).filter(f => /\.(yaml|yml)$/i.test(f))) {
  const pack = loadYaml(path.join(PACKS_DIR, file));
  for (const r of (pack.rules || [])) {
    const cfgName = r.check?.name;
    if (!cfgName) continue;
    const services = r.services && r.services.length ? r.services : ['*'];
    c2s.mappings[cfgName] = Array.from(new Set([ ...(c2s.mappings[cfgName] || []), ...services ]));
    for (const ctrl of (r.nist_controls || [])) {
      n2c.mappings[ctrl] = Array.from(new Set([ ...(n2c.mappings[ctrl] || []), cfgName ]));
    }
  }
}

saveYaml(MAP_N2C, n2c);
saveYaml(MAP_C2S, c2s);
console.log('[mappings] nist-to-config & config-to-service refreshed.');
