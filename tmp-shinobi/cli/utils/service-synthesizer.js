import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as YAML from 'yaml';
import * as cdk from 'aws-cdk-lib';
import { loadComponentCreators } from './component-loader.js';
export const readManifest = async ({ manifestPath }) => {
    const raw = await fsp.readFile(manifestPath, 'utf8');
    const parsed = YAML.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Manifest must be a YAML object');
    }
    if (!parsed.service || typeof parsed.service !== 'string') {
        throw new Error('Manifest is missing required field "service"');
    }
    if (!Array.isArray(parsed.components) || parsed.components.length === 0) {
        throw new Error('Manifest must declare at least one component');
    }
    const components = parsed.components.map((component) => ({
        name: component.name,
        type: component.type,
        config: component.config ?? {}
    }));
    return {
        service: parsed.service,
        owner: parsed.owner,
        complianceFramework: parsed.complianceFramework,
        environment: parsed.environment,
        region: parsed.region,
        accountId: parsed.accountId !== undefined ? String(parsed.accountId) : undefined,
        components,
        tags: parsed.tags ?? parsed.labels ?? {}
    };
};
const ensureOutputDir = async (dir) => {
    await fsp.mkdir(dir, { recursive: true });
};
export const synthesizeService = async (options) => {
    const manifest = await readManifest({ manifestPath: options.manifestPath });
    const environment = options.environment ?? manifest.environment ?? 'dev';
    const compliance = manifest.complianceFramework ?? 'commercial';
    const region = (options.region ?? manifest.region ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1').toString();
    const accountId = String(options.accountId ?? manifest.accountId ?? process.env.CDK_DEFAULT_ACCOUNT ?? '123456789012');
    const creators = await loadComponentCreators({
        includeNonProduction: options.includeExperimental,
        autoBuild: false
    });
    if (creators.size === 0) {
        throw new Error('No platform components are registered. Run shinobi catalog to verify available components.');
    }
    const missingComponents = [];
    for (const component of manifest.components) {
        if (!creators.has(component.type)) {
            missingComponents.push(component.type);
        }
    }
    if (missingComponents.length > 0) {
        throw new Error(`No creators registered for component type(s): ${missingComponents.join(', ')}`);
    }
    const targetOutDir = options.outputDir
        ? path.resolve(options.outputDir)
        : await fsp.mkdtemp(path.join(os.tmpdir(), 'shinobi-synth-'));
    const previousOutdir = process.env.CDK_OUTDIR;
    process.env.CDK_OUTDIR = targetOutDir;
    await ensureOutputDir(targetOutDir);
    const app = new cdk.App({
        outdir: targetOutDir,
        context: options.cliContext ?? {}
    });
    const stackName = `${manifest.service}-${environment}`;
    const stack = new cdk.Stack(app, stackName, {
        env: {
            account: accountId,
            region
        },
        tags: {
            Service: manifest.service,
            Owner: manifest.owner ?? 'unknown',
            Environment: environment,
            ...manifest.tags
        }
    });
    const synthesizedComponents = [];
    for (const component of manifest.components) {
        const catalogEntry = creators.get(component.type);
        const creator = catalogEntry.creator;
        const componentContext = {
            serviceName: manifest.service,
            environment,
            complianceFramework: compliance,
            scope: stack,
            region,
            accountId,
            owner: manifest.owner,
            tags: manifest.tags
        };
        const spec = {
            name: component.name,
            type: component.type,
            config: component.config ?? {}
        };
        const instance = creator.createComponent(spec, componentContext);
        instance.synth();
        synthesizedComponents.push({
            name: component.name,
            type: component.type
        });
    }
    const assembly = app.synth({ force: true });
    process.env.CDK_OUTDIR = previousOutdir;
    const stackArtifact = assembly.getStackByName(stackName);
    return {
        manifest,
        assembly,
        stack: stackArtifact,
        outputDir: targetOutDir,
        components: synthesizedComponents
    };
};
