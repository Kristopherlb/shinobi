// tools/lib/kb.ts
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

export type PackRule = {
  id: string;
  check: { type: string; name: string };
  services?: string[];
  nist_controls?: string[];
  resource_kinds?: string[];
};

export type ComponentPlan = {
  component: string;
  service_type: string;
  framework: 'commercial' | 'fedramp-low' | 'fedramp-moderate' | 'fedramp-high';
  packs: string[];
  rules: { id: string; check: string }[];
  nist_controls: string[];
  gaps: string[];
  timestamp: string;
  version: string;
};

export type KBIndex = {
  packs: string[];
  maps: {
    nist_to_config: string;
    config_to_service: string;
    service_to_otel: string;
  };
};

export type PackMeta = {
  id: string;
  file: string;
  description?: string;
};

export type Pack = {
  meta: PackMeta;
  rules: any[];
};

export function loadKB(root = 'platform-kb') {
  const indexPath = path.join(root, 'index.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`KB index not found: ${indexPath}`);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as KBIndex;
  const packsIdxPath = path.join(root, index.packs[0]);

  if (!fs.existsSync(packsIdxPath)) {
    throw new Error(`Packs index not found: ${packsIdxPath}`);
  }

  const packsIndex = yaml.parse(fs.readFileSync(packsIdxPath, 'utf8')).packs as PackMeta[];

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

export function choosePacks(opts: {
  kbRoot?: string;
  serviceType: string;
  framework: string;
  explicitIds?: string[];
}): string[] {
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

  const chosen = new Set<string>();

  for (const p of packsIndex) {
    for (const w of want) {
      if (p.id === w || p.id.endsWith('.' + w.split('.').at(-1))) {
        chosen.add(p.id);
      }
    }
  }

  return [...chosen];
}

export function flattenRules(kbRoot: string, packsIndex: PackMeta[], ids: string[], serviceType: string): PackRule[] {
  const svc = serviceType.replace(/:.*/, '');
  const rules: PackRule[] = [];

  for (const id of ids) {
    const meta = packsIndex.find((x) => x.id === id);
    if (!meta) continue;

    const packPath = path.join(kbRoot, meta.file);
    if (!fs.existsSync(packPath)) {
      console.warn(`Pack file not found: ${packPath}`);
      continue;
    }

    const pack = yaml.parse(fs.readFileSync(packPath, 'utf8'));

    for (const r of pack.rules as any[]) {
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

export function buildPlan(params: {
  component: string;
  serviceType: string;
  framework: ComponentPlan['framework'];
  extraControls?: string[];
  explicitPackIds?: string[];
  kbRoot?: string;
}): ComponentPlan {
  const { root, packsIndex } = loadKB(params.kbRoot);
  const packs = choosePacks({
    kbRoot: root,
    serviceType: params.serviceType,
    framework: params.framework,
    explicitIds: params.explicitPackIds
  });

  const rules = flattenRules(root, packsIndex, packs, params.serviceType);
  const controlSet = new Set<string>();

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

export function writePlan(plan: ComponentPlan, componentDir: string): void {
  const auditDir = path.join(componentDir, 'audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const planPath = path.join(auditDir, 'component.plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
}
