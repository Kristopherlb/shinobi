#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const args = Object.fromEntries(process.argv.slice(2).map((a,i,arr)=> a.startsWith("--") ? [a.replace(/^--/,''), arr[i+1]] : null).filter(Boolean));
const IN = args.in || "./vendor/aws-packs";
const OUT = args.out || "./platform-kb/packs/aws";
const INDEX = args.index || "./platform-kb/packs/index.yaml";
const SCOPE = args.scope ? args.scope.split(',') : ["compliance"];
const ID_PREFIX = args["id-prefix"] || "aws.custom.pack";

function loadYaml(p) { return yaml.parse(fs.readFileSync(p, 'utf-8')); }
function saveYaml(p, obj) { fs.writeFileSync(p, yaml.stringify(obj)); }

function inferServicesFromRuleName(ruleName) {
  const lower = ruleName.toLowerCase();
  if (lower.includes('s3')) return ['s3-bucket'];
  if (lower.includes('api') && lower.includes('gateway')) return ['apigw'];
  if (lower.includes('apigw')) return ['apigw'];
  if (lower.includes('rds')) return ['rds-postgres','rds-mysql'];
  if (lower.includes('ebs')) return ['ec2'];
  if (lower.includes('lambda')) return ['lambda-api','lambda-worker'];
  if (lower.includes('cloudtrail')) return ['account-global'];
  if (lower.includes('vpc')) return ['vpc'];
  if (lower.includes('dynamodb')) return ['dynamodb-table'];
  if (lower.includes('sns')) return ['sns-topic'];
  if (lower.includes('sqs')) return ['sqs-queue'];
  if (lower.includes('kms')) return ['kms-key'];
  if (lower.includes('cloudfront')) return ['cloudfront-distribution'];
  return ['*'];
}

function normalizePack(name, awsYaml) {
  const rawRules = (awsYaml?.rules || awsYaml?.ConfigRules || awsYaml || []);
  const rules = [];
  for (const r of rawRules) {
    const ruleName = r?.name || r?.ConfigRuleName || r?.check?.name;
    if (!ruleName) continue;
    const id = ruleName.replace(/[^A-Za-z0-9_-]/g,'_').toUpperCase();
    const title = r?.description || r?.title || ruleName;
    const nist_controls = r?.nist_controls || [];
    const services = inferServicesFromRuleName(ruleName);
    const severity = 'medium';
    rules.push({
      id,
      title,
      severity,
      nist_controls,
      services,
      check: { type: 'aws-config-rule', name: ruleName }
    });
  }
  return {
    "$schema": "platform-kb/pack@v1",
    pack: {
      id: `${ID_PREFIX}.${name}`,
      version: new Date().toISOString().slice(0,10),
      description: `Imported from AWS pack: ${name}`
    },
    rules
  };
}

function updateIndex(indexPath, packId, relFile, title) {
  const idx = yaml.parse(fs.readFileSync(indexPath, 'utf-8'));
  idx.packs = idx.packs || [];
  const entry = { id: packId, title: title || packId, version: new Date().toISOString().slice(0,10), scope: SCOPE, file: relFile };
  const i = idx.packs.findIndex(p => p.id === packId);
  if (i >= 0) idx.packs[i] = entry; else idx.packs.push(entry);
  fs.writeFileSync(indexPath, yaml.stringify(idx));
}

fs.mkdirSync(OUT, { recursive: true });
const files = fs.existsSync(IN) ? fs.readdirSync(IN).filter(f => /\.(yml|yaml)$/i.test(f)) : [];
for (const file of files) {
  const src = path.join(IN, file);
  const name = path.basename(file).replace(/\.(yml|yaml)$/i,'');
  const data = loadYaml(src);
  const normalized = normalizePack(name, data);
  const outFile = path.join(OUT, `${name}.yaml`);
  saveYaml(outFile, normalized);
  updateIndex(INDEX, `${ID_PREFIX}.${name}`, `aws/${name}.yaml`, `Imported: ${name}`);
  console.log(`[import] ${file} -> ${outFile}`);
}
console.log('Import complete. Run generate-mappings next.');
