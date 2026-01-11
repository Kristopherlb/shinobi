import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as YAML from 'yaml';
import * as cdk from 'aws-cdk-lib';
import { CloudAssembly, CloudFormationStackArtifact } from 'aws-cdk-lib/cx-api';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { loadComponentCreators, ComponentCreatorEntry } from './component-loader.js';
import { ensureOutputDir } from './file-utils.js';

export interface ManifestComponent {
  name: string;
  type: string;
  config?: Record<string, any>;
}

export interface SimpleManifest {
  service: string;
  owner?: string;
  complianceFramework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  environment?: string;
  region?: string;
  accountId?: string;
  components: ManifestComponent[];
  tags?: Record<string, string>;
}

export interface ReadManifestOptions {
  manifestPath: string;
}

export const readManifest = async ({ manifestPath }: ReadManifestOptions): Promise<SimpleManifest> => {
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

  const components: ManifestComponent[] = parsed.components.map((component: any) => ({
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

export interface SynthesizeServiceOptions {
  manifestPath: string;
  environment?: string;
  region?: string;
  accountId?: string;
  outputDir?: string;
  includeExperimental?: boolean;
  cliContext?: Record<string, any>;
  stackName?: string;
}

export interface SynthesizedComponentSummary {
  name: string;
  type: string;
}

export interface SynthesizeServiceResult {
  manifest: SimpleManifest;
  assembly: CloudAssembly;
  stack: CloudFormationStackArtifact;
  outputDir: string;
  components: SynthesizedComponentSummary[];
}

export const synthesizeService = async (
  options: SynthesizeServiceOptions
): Promise<SynthesizeServiceResult> => {
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

  const missingComponents: string[] = [];
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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'service-synthesizer.ts:124',message:'Determining output directory',data:{targetOutDir,providedOutputDir:options.outputDir,isTemp:!options.outputDir,absolutePath:path.resolve(targetOutDir),manifestPath:options.manifestPath,manifestPathAbsolute:path.resolve(options.manifestPath)},timestamp:Date.now(),sessionId:'debug-session',runId:'run15',hypothesisId:'H'})}).catch(()=>{});
  // #endregion

  const previousOutdir = process.env.CDK_OUTDIR;
  process.env.CDK_OUTDIR = targetOutDir;

  await ensureOutputDir(targetOutDir);

  const app = new cdk.App({
    outdir: targetOutDir,
    context: options.cliContext ?? {}
  });
  const stackName = options.stackName ?? `${manifest.service}-${environment}`;
  const stack = new cdk.Stack(app, stackName, {
    env: {
      account: accountId,
      region
    },
    // Note: Stack-level tags removed to avoid conflicts with component tags.
    // Component tags already provide service-name, owner, and environment tags.
    // Stack tags are case-sensitive but AWS IAM tag keys are case-insensitive,
    // causing conflicts between stack tags (Service, Owner, Environment) and
    // component tags (service-name, owner, environment).
    tags: {
      ...manifest.tags
    }
  });

  const synthesizedComponents: SynthesizedComponentSummary[] = [];

  for (const component of manifest.components) {
    const catalogEntry = creators.get(component.type) as ComponentCreatorEntry;
    const creator = catalogEntry.creator;

    const componentContext: ComponentContext = {
      serviceName: manifest.service,
      environment,
      complianceFramework: compliance,
      scope: stack,
      region,
      accountId,
      owner: manifest.owner,
      tags: manifest.tags,
      // Store manifest path in context for logging/debugging (non-standard extension)
      manifestPath: options.manifestPath
    } as ComponentContext & { manifestPath?: string };

    const spec: ComponentSpec = {
      name: component.name,
      type: component.type,
      config: component.config ?? {}
    } as ComponentSpec;

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
