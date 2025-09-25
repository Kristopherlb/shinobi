import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as YAML from 'yaml';
import * as cdk from 'aws-cdk-lib';
import { CloudAssembly } from 'aws-cdk-lib/cx-api';
import { Command } from 'commander';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { loadComponentCreators, ComponentCreatorEntry } from './utils/component-loader';

interface SynthOptions {
  file?: string;
  env?: string;
  region?: string;
  account?: string;
  output?: string;
  json?: boolean;
  includeExperimental?: boolean;
}

interface ManifestComponent {
  name: string;
  type: string;
  config?: Record<string, any>;
}

interface SimpleManifest {
  service: string;
  owner?: string;
  complianceFramework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  environment?: string;
  region?: string;
  accountId?: string;
  components: ManifestComponent[];
  tags?: Record<string, string>;
}

const defaultOutputDir = 'cdk.out';

const readManifest = async (manifestPath: string): Promise<SimpleManifest> => {
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
    accountId: parsed.accountId,
    components,
    tags: parsed.tags ?? parsed.labels ?? {}
  };
};

const ensureOutputDir = async (outDir: string) => {
  await fsp.mkdir(outDir, { recursive: true });
};

interface StackSummary {
  id: string;
  templateFile?: string;
  displayName?: string;
}

const summarizeStacks = (assembly: CloudAssembly): StackSummary[] => {
  return assembly.stacks.map(stack => ({
    id: stack.id,
    templateFile: stack.templateFile,
    displayName: stack.displayName
  }));
};

export const createSynthCommand = (): Command => {
  const command = new Command('synth');

  command
    .description('Synthesize a service manifest into AWS CDK templates')
    .option('--file, -f <file>', 'Path to service manifest', 'service.yml')
    .option('--env <environment>', 'Target environment (defaults to manifest value or dev)')
    .option('--region <region>', 'AWS region', process.env.CDK_DEFAULT_REGION || 'us-east-1')
    .option('--account <account>', 'AWS account ID', process.env.CDK_DEFAULT_ACCOUNT || '123456789012')
    .option('--output <dir>', 'CDK output directory', defaultOutputDir)
    .option('--json', 'Emit synthesis summary as JSON')
    .option('--include-experimental', 'Include non-production components when resolving creators', false)
    .action(async (options: SynthOptions) => {
      try {
        const manifestPath = path.resolve(options.file ?? 'service.yml');
        const manifest = await readManifest(manifestPath);

        const environment = options.env ?? manifest.environment ?? 'dev';
        const compliance = manifest.complianceFramework ?? 'commercial';
        const region = options.region ?? manifest.region ?? 'us-east-1';
        const accountId = options.account ?? manifest.accountId ?? '123456789012';

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

        const app = new cdk.App();
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

        const synthesizedComponents: Array<{ name: string; type: string }> = [];

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
            tags: manifest.tags
          };

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

        const outputDir = path.resolve(options.output ?? defaultOutputDir);
        await ensureOutputDir(outputDir);

        const previousOutdir = process.env.CDK_OUTDIR;
        process.env.CDK_OUTDIR = outputDir;
        const assembly = app.synth({ force: true });
        process.env.CDK_OUTDIR = previousOutdir;
        const stacks = summarizeStacks(assembly);

        if (options.json) {
          console.log(JSON.stringify({
            service: manifest.service,
            environment,
            outputDir,
            stacks,
            components: synthesizedComponents
          }, null, 2));
        } else {
          console.log(`Synthesis completed for ${manifest.service} (${environment}).`);
          console.log(`Output directory: ${outputDir}`);
          console.log('Stacks:');
          stacks.forEach((stackInfo: StackSummary) => {
            console.log(`  - ${stackInfo.displayName ?? stackInfo.id}`);
            if (stackInfo.templateFile) {
              console.log(`    template: ${stackInfo.templateFile}`);
            }
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Synthesis failed: ${message}`);
        if (error instanceof Error && error.stack) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return command;
};
