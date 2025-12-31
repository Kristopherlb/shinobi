import * as fs from 'fs/promises';
import { Dirent } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as YAML from 'yaml';
import { findRepoRoot } from './repo-root.js';

export interface ComponentCatalogEntry {
  componentType: string;
  displayName: string;
  description?: string;
  lifecycle: string;
  category?: string;
  capabilities: string[];
  tags: string[];
  packageDir: string;
  packageName: string;
}

export interface ComponentCatalogOptions {
  includeNonProduction?: boolean;
}

const formatDisplayName = (value: string): string =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
let rootDirCache: string | null = null;

export const loadComponentCatalog = async (
  options?: ComponentCatalogOptions
): Promise<ComponentCatalogEntry[]> => {
  // Cache root directory resolution to avoid repeated filesystem traversal
  if (!rootDirCache) {
    rootDirCache = await findRepoRoot(moduleDir);
  }
  const componentsDir = path.join(rootDirCache, 'packages/components');

  let dirEntries: Dirent[];
  try {
    dirEntries = await fs.readdir(componentsDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Unable to read component registry directory (${componentsDir}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const entries: ComponentCatalogEntry[] = [];

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const componentDir = path.join(componentsDir, entry.name);
    const packageJsonPath = path.join(componentDir, 'package.json');
    const catalogPath = path.join(componentDir, 'catalog-info.yaml');

    let packageName: string | undefined;
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      packageName = packageJson?.name;
    } catch {
      continue;
    }

    if (!packageName) {
      continue;
    }

    try {
      const catalogContent = await fs.readFile(catalogPath, 'utf8');
      const catalog = YAML.parse(catalogContent) ?? {};

      const lifecycle = catalog?.spec?.lifecycle ?? 'unknown';
      if (!options?.includeNonProduction && lifecycle !== 'production') {
        continue;
      }

      const annotations = catalog?.metadata?.annotations ?? {};
      const componentType =
        annotations['platform.shinobi.dev/component-type'] ??
        catalog?.spec?.metadata?.platform?.componentType ??
        catalog?.metadata?.name;

      if (!componentType) {
        continue;
      }

      const displayName =
        catalog?.metadata?.title ?? formatDisplayName(catalog?.metadata?.name ?? componentType);
      const description =
        catalog?.metadata?.description ?? catalog?.spec?.metadata?.platform?.description;
      const category = catalog?.spec?.type ?? catalog?.spec?.metadata?.platform?.category;

      // Safe access to nested properties using local variables
      const rawCapabilities = catalog?.spec?.metadata?.platform?.capabilities;
      const capabilities: string[] = Array.isArray(rawCapabilities) ? rawCapabilities : [];

      const rawMetadataTags = catalog?.metadata?.tags;
      const metadataTags: string[] = Array.isArray(rawMetadataTags) ? rawMetadataTags : [];
      
      const rawPlatformTags = catalog?.spec?.metadata?.platform?.tags?.required;
      const platformTags: string[] = Array.isArray(rawPlatformTags) ? rawPlatformTags : [];
      const tags = Array.from(new Set([...metadataTags, ...platformTags]));

      entries.push({
        componentType,
        displayName,
        description,
        lifecycle,
        category,
        capabilities,
        tags,
        packageDir: entry.name,
        packageName
      });
    } catch (error) {
      // Skip directories that lack catalog metadata
      continue;
    }
  }

  entries.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return entries;
};

export const formatCatalogDisplayName = formatDisplayName;
