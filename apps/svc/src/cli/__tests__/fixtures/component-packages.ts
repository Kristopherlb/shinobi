/**
 * Component Package Test Fixtures
 * 
 * Provides factory functions for creating test component package structures.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';

export interface ComponentPackageStructure {
  packageDir: string;
  packageJson: any;
  catalogInfo?: any;
  creatorFile?: string;
  creatorContent?: string;
}

/**
 * Creates a mock component package structure in a temporary directory
 */
export async function createMockComponentPackage(
  name: string,
  type: string,
  lifecycle: 'production' | 'experimental' | 'deprecated' = 'production',
  tempDir: string
): Promise<ComponentPackageStructure> {
  const packageDir = path.join(tempDir, name);
  await fs.mkdir(packageDir, { recursive: true });

  const packageJson = {
    name: `@shinobi/${name}`,
    version: '0.1.0',
    type: 'module'
  };

  await fs.writeFile(
    path.join(packageDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  const catalogInfo = {
    componentType: type,
    displayName: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `Test component ${name}`,
    lifecycle,
    capabilities: ['test-capability'],
    tags: ['test']
  };

  await fs.writeFile(
    path.join(packageDir, 'catalog-info.yaml'),
    YAML.stringify(catalogInfo)
  );

  return {
    packageDir,
    packageJson,
    catalogInfo
  };
}

/**
 * Creates a component package with a valid creator
 */
export async function createComponentPackageWithCreator(
  name: string,
  type: string,
  tempDir: string
): Promise<ComponentPackageStructure> {
  const base = await createMockComponentPackage(name, type, 'production', tempDir);
  
  const creatorContent = `
import { ComponentCreator } from '@platform/contracts';

export class ${type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Creator implements ComponentCreator {
  getRequiredCapabilities(): string[] {
    return ['test-capability'];
  }
  
  create(context: any, spec: any): any {
    return {};
  }
}
`;

  const creatorFile = path.join(base.packageDir, 'src', 'index.ts');
  await fs.mkdir(path.dirname(creatorFile), { recursive: true });
  await fs.writeFile(creatorFile, creatorContent);

  return {
    ...base,
    creatorFile,
    creatorContent
  };
}

/**
 * Creates a component package without a creator (should be skipped)
 */
export async function createComponentPackageWithoutCreator(
  name: string,
  type: string,
  tempDir: string
): Promise<ComponentPackageStructure> {
  return await createMockComponentPackage(name, type, 'production', tempDir);
}

/**
 * Creates a component package with catalog-info.yaml
 */
export async function createComponentPackageWithCatalogInfo(
  name: string,
  type: string,
  catalogInfo: any,
  tempDir: string
): Promise<ComponentPackageStructure> {
  const packageDir = path.join(tempDir, name);
  await fs.mkdir(packageDir, { recursive: true });

  const packageJson = {
    name: `@shinobi/${name}`,
    version: '0.1.0',
    type: 'module'
  };

  await fs.writeFile(
    path.join(packageDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  await fs.writeFile(
    path.join(packageDir, 'catalog-info.yaml'),
    YAML.stringify(catalogInfo)
  );

  return {
    packageDir,
    packageJson,
    catalogInfo
  };
}



