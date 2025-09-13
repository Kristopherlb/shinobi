// tools/lib/kb.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

export function loadKB(root = 'platform-kb') {
  const indexPath = path.join(root, 'index.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`KB index not found: ${indexPath}`);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const packsIdxPath = path.join(root, index.packs[0]);

  if (!fs.existsSync(packsIdxPath)) {
    throw new Error(`Packs index not found: ${packsIdxPath}`);
  }

  const packsIndex = yaml.parse(fs.readFileSync(packsIdxPath, 'utf8')).packs;

  const maps = {
    nistToConfig: fs.existsSync(path.join(root, index.maps.nist_to_config))
      ? yaml.parse(fs.readFileSync(path.join(root, index.maps.nist_to_config), 'utf8'))
      : {},
    configToService: fs.existsSync(path.join(root, index.maps.config_to_service))
      ? yaml.parse(fs.readFileSync(path.join(root, index.maps.config_to_service), 'utf8'))
      : {},
    serviceToOtel: fs.existsSync(path.join(root, index.maps.service_to_otel))
      ? yaml.parse(fs.readFileSync(path.join(root, index.maps.service_to_otel), 'utf8'))
      : {},
  };

  return { root, packsIndex, maps, index };
}

export function choosePacks(opts) {
  const { packsIndex } = loadKB(opts.kbRoot);

  if (opts.explicitIds?.length) {
    return opts.explicitIds;
  }

  const svc = opts.serviceType.replace(/:.*/, '');
  const want = new Set([
    'aws.global.logging',
    'aws.global.monitoring',
    `aws.service.${svc}`,
    `aws.${opts.framework}`,
  ]);

  const chosen = new Set();

  for (const p of packsIndex) {
    for (const w of want) {
      if (p.id === w || p.id.endsWith('.' + w.split('.').at(-1))) {
        chosen.add(p.id);
      }
    }
  }

  return [...chosen];
}

export function flattenRules(kbRoot, packsIndex, ids, serviceType) {
  const svc = serviceType.replace(/:.*/, '');
  const rules = [];

  for (const id of ids) {
    const meta = packsIndex.find((x) => x.id === id);
    if (!meta) continue;

    const packPath = path.join(kbRoot, meta.file);
    if (!fs.existsSync(packPath)) {
      console.warn(`Pack file not found: ${packPath}`);
      continue;
    }

    const pack = yaml.parse(fs.readFileSync(packPath, 'utf8'));

    for (const r of pack.rules) {
      const services = r.services || [];
      const keep = services.includes('*') ||
        services.includes(serviceType) ||
        services.includes(svc);

      if (!keep) continue;

      rules.push({
        id: r.id,
        check: { type: r.check?.type || 'unknown', name: r.check?.name || r.id },
        services: services,
        nist_controls: r.nist_controls || [],
        resource_kinds: r.resource_kinds || []
      });
    }
  }

  return rules;
}

export function buildPlan(params) {
  const { root, packsIndex } = loadKB(params.kbRoot);
  const packs = choosePacks({
    kbRoot: root,
    serviceType: params.serviceType,
    framework: params.framework,
    explicitIds: params.explicitPackIds
  });

  const rules = flattenRules(root, packsIndex, packs, params.serviceType);
  const controlSet = new Set();

  rules.forEach(r => (r.nist_controls || []).forEach(c => controlSet.add(c)));
  (params.extraControls || []).forEach(c => controlSet.add(c));

  return {
    component: params.component,
    service_type: params.serviceType,
    framework: params.framework,
    packs,
    rules: rules.map(r => ({ id: r.id, check: r.check.name || r.check.type })),
    nist_controls: [...controlSet],
    gaps: [],
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
}

export function writePlan(plan, componentDir) {
  const auditDir = path.join(componentDir, 'audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const planPath = path.join(auditDir, 'component.plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
}
