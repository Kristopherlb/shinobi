#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const args = Object.fromEntries(process.argv.slice(2).map((a,i,arr)=>a.startsWith('--')?[a.slice(2),arr[i+1]]:null).filter(Boolean));
const KB_ROOT = args['kb-root'] || 'platform-kb';
const NAME = args['component'];
const SERVICE = args['service-type'];
const FRAMEWORK = args['framework'] || 'commercial';
if (!NAME || !SERVICE) {
  console.error("Usage: --component <name> --service-type <svc> [--framework <...>] [--packs <packs.json>|--packs-id <id1,id2>] [--controls <csv>]");
  process.exit(2);
}

const COMP_DIR = path.join('packages','components', NAME);
const SRC_DIR = path.join(COMP_DIR, 'src');
const TEST_DIR = path.join(COMP_DIR, 'tests','unit');
const AUDIT_DIR = path.join(COMP_DIR, 'audit');
const OBS_DIR = path.join(COMP_DIR, 'observability');
fs.mkdirSync(SRC_DIR, { recursive: true });
fs.mkdirSync(TEST_DIR, { recursive: true });
fs.mkdirSync(AUDIT_DIR, { recursive: true });
fs.mkdirSync(OBS_DIR, { recursive: true });

function loadKBIndex() {
  const index = JSON.parse(fs.readFileSync(path.join(KB_ROOT,'index.json'),'utf8'));
  return { index, packsIndex: yaml.parse(fs.readFileSync(path.join(KB_ROOT, index.packs[0]), 'utf8')).packs };
}
function choosePacks() {
  if (args['packs']) {
    const chosen = JSON.parse(fs.readFileSync(args['packs'],'utf8')).chosen || [];
    return chosen.map(c => c.meta.id);
  }
  if (args['packs-id']) return args['packs-id'].split(',').map(s=>s.trim()).filter(Boolean);
  const svcKey = SERVICE.replace(/:.*/,''); // normalize
  const want = new Set(['aws.global.logging','aws.global.monitoring', `aws.service.${svcKey}`, `aws.${FRAMEWORK}`]);
  const { packsIndex } = loadKBIndex();
  const chosen = [];
  for (const p of packsIndex) {
    for (const w of want) if (p.id === w || p.id.endsWith('.'+w.split('.').slice(-1)[0])) chosen.push(p.id);
  }
  return Array.from(new Set(chosen));
}
function flattenRules(ids) {
  const { index, packsIndex } = loadKBIndex();
  const out = [];
  for (const id of ids) {
    const meta = packsIndex.find(p => p.id === id);
    if (!meta) continue;
    const packPath = path.join(KB_ROOT, meta.file);
    if (!fs.existsSync(packPath)) continue;
    const pack = yaml.parse(fs.readFileSync(packPath,'utf8'));
    for (const r of (pack.rules || [])) {
      const services = r.services || [];
      if (services.includes('*') || services.includes(SERVICE) || services.includes(SERVICE.replace(/:.*/,''))) {
        out.push({ id: r.id, check: r.check?.name || r.check?.type, nist_controls: r.nist_controls || [], services });
      }
    }
  }
  return out;
}
function writePlan(packs, rules, controls) {
  const plan = { component: NAME, service_type: SERVICE, framework: FRAMEWORK, packs, rules: rules.map(r => ({ id: r.id, check: r.check })), nist_controls: controls, gaps: [] };
  fs.writeFileSync(path.join(AUDIT_DIR, 'component.plan.json'), JSON.stringify(plan, null, 2));
}
function mergeControls(rules, extraCsv) {
  const set = new Set();
  for (const r of rules) (r.nist_controls || []).forEach(c => set.add(c));
  (extraCsv ? extraCsv.split(',') : []).map(s=>s.trim()).filter(Boolean).forEach(c => set.add(c));
  return Array.from(set);
}
function writeObservability() {
  const svc2 = SERVICE.replace(/:.*/,'');
  const recipePath = path.join(KB_ROOT, 'observability','recipes', `${svc2}.yaml`);
  if (fs.existsSync(recipePath)) {
    const recipe = yaml.parse(fs.readFileSync(recipePath, 'utf8'));
    fs.writeFileSync(path.join(OBS_DIR, 'alarms-config.json'), JSON.stringify(recipe.telemetry?.alarms || [], null, 2));
    fs.writeFileSync(path.join(OBS_DIR, 'otel-dashboard-template.json'), JSON.stringify(recipe.dashboards || [], null, 2));
  } else {
    fs.writeFileSync(path.join(OBS_DIR, 'README.md'), `No recipe found for ${SERVICE}. Add one under platform-kb/observability/recipes/${svc2}.yaml`);
  }
}
function writeSrc() {
  const pascal = NAME.split(/[-_]/).map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join('');
  fs.writeFileSync(path.join(SRC_DIR, `${NAME}.component.ts`), `// TODO: BaseComponent subclass with 6-step synth()\nexport class ${pascal}Component {}\n`);
  fs.writeFileSync(path.join(SRC_DIR, `${NAME}.builder.ts`), `// TODO: ConfigBuilder with getHardcodedFallbacks() and getComplianceFrameworkDefaults()\n`);
  fs.writeFileSync(path.join(SRC_DIR, `${NAME}.creator.ts`), `// TODO: IComponentCreator (validateSpec, createComponent)\n`);
  fs.writeFileSync(path.join(SRC_DIR, `index.ts`), `export * from './${NAME}.component';\n`);
}
function writeTests(rules) {
  const basic = `import { Template } from 'aws-cdk-lib/assertions';\n// TODO: create stack and test synthesized template\n`;
  fs.writeFileSync(path.join(TEST_DIR, `component.test.ts`), basic);
  fs.writeFileSync(path.join(TEST_DIR, `builder.test.ts`), `// TODO: verify precedence chain and framework defaults\n`);
  const hints = rules.map(r => `// assert: ${r.id} -> check ${r.check}`).join('\\n');
  fs.writeFileSync(path.join(AUDIT_DIR, `assertion-hints.txt`), hints+"\\n");
}
function writeReadme(controls, packs) {
  const md = `# ${NAME}\\n\\nService type: \\`${SERVICE}\\`  \\nFramework: \\`${FRAMEWORK}\\`\\n\\n## Compliance\\n- Packs: ${packs.map(p=>`\\`${p}\\``).join(', ')}\\n- NIST Controls: ${controls.map(c=>`\\`${c}\\``).join(', ')}\\n\\n## Observability\\nSee files under \\`observability/\\`.\\n`;
  fs.writeFileSync(path.join(COMP_DIR, 'README.md'), md);
}

const packIds = choosePacks();
const rules = flattenRules(packIds);
const controls = mergeControls(rules, args['controls'] || '');
writePlan(packIds, rules, controls);
writeObservability();
writeSrc();
writeTests(rules);
writeReadme(controls, packIds);
console.log(`[agent-scaffold] created ${COMP_DIR}`);
