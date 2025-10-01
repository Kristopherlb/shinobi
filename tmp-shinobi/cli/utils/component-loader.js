import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import { loadComponentCatalog, formatCatalogDisplayName } from './component-catalog.js';
import { sync as globSync } from 'glob';
const ensurePackageBuilt = (rootDir, packageDir, packageName) => {
    const distIndex = path.join(rootDir, 'dist/packages/components', packageDir, 'index.js');
    if (fs.existsSync(distIndex)) {
        return distIndex;
    }
    try {
        execSync(`pnpm --filter ${packageName} build`, {
            cwd: rootDir,
            stdio: 'inherit'
        });
    }
    catch (error) {
        throw new Error(`Failed to build component package ${packageName}: ${error.message}`);
    }
    if (!fs.existsSync(distIndex)) {
        throw new Error(`Component package ${packageName} did not produce dist output at ${distIndex}`);
    }
    return distIndex;
};
const findCreatorExport = (moduleExports) => {
    for (const exported of Object.values(moduleExports)) {
        if (typeof exported === 'function') {
            try {
                const instance = new exported();
                if (instance && typeof instance.createComponent === 'function' && typeof instance.componentType === 'string') {
                    return instance;
                }
            }
            catch {
                continue;
            }
        }
    }
    return undefined;
};
export const loadComponentCreators = async (options) => {
    const rootDir = path.resolve(__dirname, '../../../../../');
    const componentsDir = path.join(rootDir, 'packages/components');
    const catalogEntries = await loadComponentCatalog({ includeNonProduction: true });
    const catalogByType = new Map(catalogEntries.map(entry => [entry.componentType, entry]));
    let componentDirs;
    try {
        componentDirs = await fsp.readdir(componentsDir, { withFileTypes: true });
    }
    catch (error) {
        throw new Error(`Unable to read component directory ${componentsDir}: ${error.message}`);
    }
    const creators = new Map();
    for (const dirEntry of componentDirs) {
        if (!dirEntry.isDirectory()) {
            continue;
        }
        const packageDir = dirEntry.name;
        const packageJsonPath = path.join(componentsDir, packageDir, 'package.json');
        let packageJson;
        try {
            const raw = await fsp.readFile(packageJsonPath, 'utf8');
            packageJson = JSON.parse(raw);
        }
        catch {
            continue;
        }
        const packageName = packageJson?.name;
        if (!packageName) {
            continue;
        }
        const componentRoot = path.join(componentsDir, packageDir);
        const candidatePaths = [];
        const primaryIndex = path.join(componentRoot, 'index.ts');
        if (fs.existsSync(primaryIndex)) {
            candidatePaths.push(primaryIndex);
        }
        const creatorGlob = globSync('src/**/*creator.ts', {
            cwd: componentRoot,
            absolute: true
        });
        candidatePaths.push(...creatorGlob);
        const shouldBuild = options?.autoBuild !== false;
        const distIndex = shouldBuild ? ensurePackageBuilt(rootDir, packageDir, packageName) : path.join(rootDir, 'dist/packages/components', packageDir, 'index.js');
        if (!fs.existsSync(distIndex)) {
            continue;
        }
        let moduleExports;
        let loadError;
        for (const candidate of candidatePaths) {
            const distCandidate = toDistPath(rootDir, packageDir, candidate);
            if (!distCandidate || !fs.existsSync(distCandidate)) {
                continue;
            }
            try {
                const moduleUrl = pathToFileURL(distCandidate).href;
                moduleExports = await import(moduleUrl);
                break;
            }
            catch (error) {
                loadError = error;
                continue;
            }
        }
        if (!moduleExports) {
            if (loadError) {
                console.warn(`Skipping component package ${packageName}: ${loadError.message}`);
            }
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
        const displayName = catalogEntry?.displayName ?? creator.displayName ?? formatCatalogDisplayName(creator.componentType);
        const description = catalogEntry?.description ?? creator.description;
        const category = catalogEntry?.category ?? creator.category;
        let capabilities = [];
        if (catalogEntry?.capabilities?.length) {
            capabilities = catalogEntry.capabilities;
        }
        else if (typeof creator.getProvidedCapabilities === 'function') {
            const provided = creator.getProvidedCapabilities();
            if (Array.isArray(provided)) {
                capabilities = provided;
            }
        }
        let tags = [];
        if (catalogEntry?.tags?.length) {
            tags = catalogEntry.tags;
        }
        else if (Array.isArray(creator.tags)) {
            tags = creator.tags;
        }
        const entry = {
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
const toDistPath = (rootDir, packageDir, candidatePath) => {
    const componentRoot = path.join(rootDir, 'packages/components', packageDir);
    const relative = path.relative(componentRoot, candidatePath);
    if (relative === 'index.ts') {
        return path.join(rootDir, 'dist/packages/components', packageDir, 'index.js');
    }
    if (relative.startsWith('src') && candidatePath.endsWith('.ts')) {
        const distRelative = relative.replace(/\.ts$/, '.js');
        return path.join(rootDir, 'dist/packages/components', packageDir, distRelative);
    }
    return null;
};
