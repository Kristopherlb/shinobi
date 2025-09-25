#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const componentsDir = path.join(rootDir, 'packages/components');

if (!fs.existsSync(componentsDir)) {
  console.error(`Components directory not found: ${componentsDir}`);
  process.exit(1);
}

const toTitleCase = (value) =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const dirs = fs.readdirSync(componentsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory());

const created = [];

for (const dir of dirs) {
  const packageDir = path.join(componentsDir, dir.name);
  const catalogPath = path.join(packageDir, 'catalog-info.yaml');

  if (fs.existsSync(catalogPath)) {
    continue;
  }

  const packageJsonPath = path.join(packageDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (error) {
    console.warn(`Skipping ${dir.name}: unable to read package.json (${error.message})`);
    continue;
  }

  const componentType = pkg?.shinobi?.componentType || pkg?.name?.split('/').pop() || dir.name;
  const displayName = pkg?.shinobi?.displayName || toTitleCase(componentType);
  const description = pkg?.description || `Shinobi component ${displayName}.`;
  const lifecycle = pkg?.shinobi?.lifecycle || 'experimental';
  const specType = pkg?.shinobi?.category || 'library';
  const tags = Array.isArray(pkg?.keywords) ? pkg.keywords : [];

  const yaml = `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${componentType}
  title: ${displayName}
  description: ${description}
  annotations:
    platform.shinobi.dev/component-type: ${componentType}
spec:
  type: ${specType}
  lifecycle: ${lifecycle}
  owner: group:default/platform-engineering
  system: system:default/shinobi
  metadata:
    platform:
      componentType: ${componentType}
      version: ${pkg?.version || '0.0.1'}
      description: ${description}
      capabilities: []
      tags: ${JSON.stringify(tags)}
`;

  fs.writeFileSync(catalogPath, yaml, 'utf8');
  created.push(dir.name);
}

if (created.length === 0) {
  console.log('No catalog-info.yaml files needed to be generated.');
} else {
  console.log(`Generated catalog-info.yaml for ${created.length} component(s):`);
  created.forEach(name => console.log(` - ${name}`));
}
