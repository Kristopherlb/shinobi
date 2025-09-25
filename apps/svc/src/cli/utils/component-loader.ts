import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { loadComponentCatalog, ComponentCatalogEntry } from './component-catalog';
import { IComponentCreator } from '@shinobi/core';

interface LoadCreatorsOptions {
  includeNonProduction?: boolean;
  autoBuild?: boolean;
}

type PlatformComponentCreator = IComponentCreator & { componentType: string };

export interface ComponentCreatorEntry {
  entry: ComponentCatalogEntry;
  creator: PlatformComponentCreator;
}

let tsRuntimePrepared = false;

const prepareTsRuntime = () => {
  if (tsRuntimePrepared) {
    return;
  }
  try {
    require('ts-node/register/transpile-only');
    try {
      require('tsconfig-paths/register');
    } catch (pathError) {
      console.warn('tsconfig-paths/register not found; TypeScript path aliases may not resolve.');
    }
    tsRuntimePrepared = true;
  } catch (error) {
    throw new Error(`Failed to prepare TypeScript runtime. ${(error as Error).message}`);
  }
};

const ensurePackageBuilt = async (rootDir: string, entry: ComponentCatalogEntry) => {
  const distIndex = path.join(rootDir, 'dist/packages/components', entry.packageDir, 'index.js');
  if (fs.existsSync(distIndex)) {
    return distIndex;
  }

  // Attempt to build the component package
  const packageName = entry.packageName;
  try {
    execSync(`pnpm --filter ${packageName} build`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } catch (error) {
    throw new Error(`Failed to build component package ${packageName}: ${(error as Error).message}`);
  }

  if (!fs.existsSync(distIndex)) {
    throw new Error(`Component package ${packageName} did not produce dist output at ${distIndex}`);
  }

  return distIndex;
};

const findCreatorExport = (moduleExports: Record<string, any>): PlatformComponentCreator | undefined => {
  for (const exported of Object.values(moduleExports)) {
    if (typeof exported === 'function') {
      try {
        const instance = new exported();
        if (instance && typeof instance.createComponent === 'function' && typeof instance.componentType === 'string') {
          return instance as PlatformComponentCreator;
        }
      } catch {
        continue;
      }
    }
  }
  return undefined;
};

export const loadComponentCreators = async (
  options?: LoadCreatorsOptions
): Promise<Map<string, ComponentCreatorEntry>> => {
  const rootDir = path.resolve(__dirname, '../../../../../');
  const componentsDir = path.join(rootDir, 'packages/components');
  const catalogEntries = await loadComponentCatalog({ includeNonProduction: true });
  const catalogByType = new Map<string, ComponentCatalogEntry>(catalogEntries.map(entry => [entry.componentType, entry]));

  prepareTsRuntime();

  let componentDirs: Dirent[];
  try {
    componentDirs = await fsp.readdir(componentsDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Unable to read component directory ${componentsDir}: ${(error as Error).message}`);
  }

  const creators = new Map<string, ComponentCreatorEntry>();

  for (const dirEntry of componentDirs) {
    if (!dirEntry.isDirectory()) {
      continue;
    }

    const packageDir = dirEntry.name;
    const packageJsonPath = path.join(componentsDir, packageDir, 'package.json');

    let packageJson: any;
    try {
      const raw = await fsp.readFile(packageJsonPath, 'utf8');
      packageJson = JSON.parse(raw);
    } catch {
      continue;
    }

    const packageName: string | undefined = packageJson?.name;
    if (!packageName) {
      continue;
    }

    let moduleExports: Record<string, any> | undefined;
    try {
      const sourceIndex = path.join(rootDir, 'packages/components', packageDir, 'index.ts');
      moduleExports = require(sourceIndex);
    } catch (error) {
      console.warn(`Skipping component package ${packageName}: ${(error as Error).message}`);
      continue;
    }

    const creator = findCreatorExport(moduleExports ?? {});
    if (!creator) {
      continue;
    }

    const catalogEntry = catalogByType.get(creator.componentType);
    const lifecycle = catalogEntry?.lifecycle ?? 'production';
    if (!options?.includeNonProduction && lifecycle !== 'production') {
      continue;
    }

    const displayName = catalogEntry?.displayName ?? (creator as any).displayName ?? formatCatalogDisplayName(creator.componentType);
    const description = catalogEntry?.description ?? (creator as any).description;
    const category = catalogEntry?.category ?? (creator as any).category;

    let capabilities: string[] = [];
    if (catalogEntry?.capabilities?.length) {
      capabilities = catalogEntry.capabilities;
    } else if (typeof (creator as any).getProvidedCapabilities === 'function') {
      const provided = (creator as any).getProvidedCapabilities();
      if (Array.isArray(provided)) {
        capabilities = provided;
      }
    }

    let tags: string[] = [];
    if (catalogEntry?.tags?.length) {
      tags = catalogEntry.tags;
    } else if (Array.isArray((creator as any).tags)) {
      tags = (creator as any).tags;
    }

    const entry: ComponentCatalogEntry = {
      componentType: creator.componentType,
      displayName,
      description,
      lifecycle,
      category,
      capabilities,
      tags,
      packageDir,
      packageName
    };

    creators.set(creator.componentType, { entry, creator });
  }

  return creators;
};
