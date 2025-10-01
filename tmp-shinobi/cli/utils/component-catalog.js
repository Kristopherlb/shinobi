import * as fs from 'fs/promises';
import * as path from 'path';
import * as YAML from 'yaml';
const formatDisplayName = (value) => value
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
export const loadComponentCatalog = async (options) => {
    const rootDir = path.resolve(__dirname, '../../../../../');
    const componentsDir = path.join(rootDir, 'packages/components');
    let dirEntries;
    try {
        dirEntries = await fs.readdir(componentsDir, { withFileTypes: true });
    }
    catch (error) {
        throw new Error(`Unable to read component registry directory (${componentsDir}): ${error instanceof Error ? error.message : String(error)}`);
    }
    const entries = [];
    for (const entry of dirEntries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const componentDir = path.join(componentsDir, entry.name);
        const packageJsonPath = path.join(componentDir, 'package.json');
        const catalogPath = path.join(componentDir, 'catalog-info.yaml');
        let packageName;
        try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);
            packageName = packageJson?.name;
        }
        catch {
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
            const componentType = annotations['platform.shinobi.dev/component-type'] ??
                catalog?.spec?.metadata?.platform?.componentType ??
                catalog?.metadata?.name;
            if (!componentType) {
                continue;
            }
            const displayName = catalog?.metadata?.title ?? formatDisplayName(catalog?.metadata?.name ?? componentType);
            const description = catalog?.metadata?.description ?? catalog?.spec?.metadata?.platform?.description;
            const category = catalog?.spec?.type ?? catalog?.spec?.metadata?.platform?.category;
            const capabilities = Array.isArray(catalog?.spec?.metadata?.platform?.capabilities)
                ? catalog.spec.metadata.platform.capabilities
                : [];
            const metadataTags = Array.isArray(catalog?.metadata?.tags)
                ? catalog.metadata.tags
                : [];
            const platformTags = Array.isArray(catalog?.spec?.metadata?.platform?.tags?.required)
                ? catalog.spec.metadata.platform.tags.required
                : [];
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
        }
        catch (error) {
            // Skip directories that lack catalog metadata
            continue;
        }
    }
    entries.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return entries;
};
export const formatCatalogDisplayName = formatDisplayName;
