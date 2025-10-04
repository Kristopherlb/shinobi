import * as fs from 'fs';
import { Dirent } from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { sync as globSync } from 'glob';
import { loadComponentCatalog, ComponentCatalogEntry, formatCatalogDisplayName } from './component-catalog.js';
import type { IComponentCreator } from '@shinobi/core';

interface LoadCreatorsOptions {
  includeNonProduction?: boolean;
  autoBuild?: boolean;
}

type PlatformComponentCreator = IComponentCreator & { componentType: string };

export interface ComponentCreatorEntry {
  entry: ComponentCatalogEntry;
  creator: PlatformComponentCreator;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(moduleDir, '../../../../../');
const canImportTypeScript = Boolean(
  process.env.TS_NODE_PROJECT ||
  process.env.TS_NODE_COMPILER_OPTIONS ||
  process.env.NODE_OPTIONS?.includes('ts-node')
);

export const loadComponentCreators = async (
  options?: LoadCreatorsOptions
): Promise<Map<string, ComponentCreatorEntry>> => {
  const componentsDir = path.join(rootDir, 'packages/components');
  const catalogEntries = await loadComponentCatalog({ includeNonProduction: true });
  const catalogByType = new Map<string, ComponentCatalogEntry>(catalogEntries.map(entry => [entry.componentType, entry]));

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

    const componentRoot = path.join(componentsDir, packageDir);
    const candidatePaths: string[] = [];
    const primaryIndex = path.join(componentRoot, 'index.ts');
    if (fs.existsSync(primaryIndex)) {
      candidatePaths.push(primaryIndex);
    }

    const creatorGlob = globSync('src/**/*creator.ts', {
      cwd: componentRoot,
      absolute: true
    });
    candidatePaths.push(...creatorGlob);

    const sourceCandidates = buildSourceCandidates(candidatePaths);
    let moduleExports = await loadFirstResolvedModule(sourceCandidates);

    if (!moduleExports) {
      const distCandidates = buildDistCandidates(rootDir, componentRoot, packageDir, candidatePaths);
      moduleExports = await loadFirstResolvedModule(distCandidates);
    }

    if (!moduleExports && options?.autoBuild) {
      console.warn(`Component package ${packageName} is not built; skipping. Set TEMPLATE_CONFIG_PATH or run build first.`);
    }

    if (!moduleExports) {
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

const buildSourceCandidates = (candidatePaths: string[]): string[] => {
  const results = new Set<string>();

  for (const candidate of candidatePaths) {
    if (!canImportTypeScript) {
      const jsSibling = candidate.replace(/\.ts$/, '.js');
      results.add(jsSibling);
      continue;
    }

    results.add(candidate);
    results.add(candidate.replace(/\.ts$/, '.js'));
  }

  return Array.from(results);
};

const buildDistCandidates = (
  workspaceRoot: string,
  componentRoot: string,
  packageDir: string,
  candidatePaths: string[]
): string[] => {
  const distRoots = [
    path.join(workspaceRoot, 'dist/packages/components', packageDir),
    path.join(componentRoot, 'dist')
  ];

  const results = new Set<string>();

  for (const candidate of candidatePaths) {
    const relative = path.relative(componentRoot, candidate);
    const candidates = buildDistRelativePaths(relative);

    for (const distRoot of distRoots) {
      for (const rel of candidates) {
        const fullPath = path.join(distRoot, rel);
        results.add(fullPath);
      }
    }
  }

  return Array.from(results);
};

const buildDistRelativePaths = (relative: string): string[] => {
  const results: string[] = [];

  if (relative === 'index.ts') {
    results.push('index.js');
    return results;
  }

  const jsRelative = relative.replace(/\.ts$/, '.js');
  results.push(jsRelative);

  if (relative.startsWith(`src${path.sep}`) || relative.startsWith('src/')) {
    const stripped = jsRelative.replace(/^src[\/]/, '');
    results.push(path.join('src', stripped));
    results.push(stripped);
  }

  return results;
};

const loadFirstResolvedModule = async (candidatePaths: string[]): Promise<Record<string, any> | undefined> => {
  for (const candidate of candidatePaths) {
    try {
      const stat = await fsp.stat(candidate);
      if (!stat.isFile()) {
        continue;
      }

      const moduleUrl = pathToFileURL(candidate).href;
      return (await import(moduleUrl)) as Record<string, any>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        continue;
      }
    }
  }

  return undefined;
};
