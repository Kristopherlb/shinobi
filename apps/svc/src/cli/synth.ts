import { Command } from 'commander';
import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import {
  readManifest,
  synthesizeService,
  SimpleManifest
} from './utils/service-synthesizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SynthOptions {
  file?: string;
  env?: string;
  region?: string;
  account?: string;
  output?: string;
  json?: boolean;
  includeExperimental?: boolean;
}

const ensureOutputDir = async (dir: string) => {
  await fsp.mkdir(dir, { recursive: true });
};

export const createSynthCommand = (): Command => {
  const command = new Command('synth');

  command
    .description('Synthesize a service manifest into AWS CDK templates')
    .option('--file, -f <file>', 'Path to service manifest', 'service.yml')
    .option('--env <environment>', 'Target environment (defaults to manifest value or dev)')
    .option('--region <region>', 'AWS region', process.env.CDK_DEFAULT_REGION || 'us-east-1')
    .option('--account <account>', 'AWS account ID', process.env.CDK_DEFAULT_ACCOUNT || '123456789012')
    .option('--output <dir>', 'CDK output directory', 'cdk.out')
    .option('--json', 'Emit synthesis summary as JSON')
    .option('--include-experimental', 'Include non-production components when resolving creators', false)
    .action(async (options: SynthOptions) => {
      try {
        // Resolve manifest path - try current dir first, then repo root
        let manifestPath: string;
        if (options.file) {
          // Try resolving from current working directory first
          const cwdPath = path.resolve(process.cwd(), options.file);
          if (fs.existsSync(cwdPath)) {
            manifestPath = cwdPath;
          } else {
            // Try resolving as absolute path
            const absPath = path.resolve(options.file);
            if (fs.existsSync(absPath)) {
              manifestPath = absPath;
            } else {
              // Try resolving from repo root (find by looking for root package.json)
              let repoRoot = process.cwd();
              while (repoRoot !== path.dirname(repoRoot)) {
                if (fs.existsSync(path.join(repoRoot, 'package.json'))) {
                  const rootPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
                  if (rootPackageJson.workspaces || rootPackageJson.name === 'workspace') {
                    break; // Found monorepo root
                  }
                }
                repoRoot = path.dirname(repoRoot);
              }
              const repoPath = path.resolve(repoRoot, options.file);
              if (fs.existsSync(repoPath)) {
                manifestPath = repoPath;
              } else {
                manifestPath = absPath; // Will fail with proper error
              }
            }
          }
        } else {
          // Default: look for service.yml starting from cwd, walking up to repo root
          let searchDir = process.cwd();
          while (searchDir !== path.dirname(searchDir)) {
            const candidate = path.join(searchDir, 'service.yml');
            if (fs.existsSync(candidate)) {
              manifestPath = candidate;
              break;
            }
            searchDir = path.dirname(searchDir);
          }
          if (!manifestPath!) {
            manifestPath = path.resolve(process.cwd(), 'service.yml');
          }
        }
        const manifest: SimpleManifest = await readManifest({ manifestPath });
        const environment = options.env ?? manifest.environment ?? 'dev';
        const region = options.region ?? manifest.region ?? 'us-east-1';
        const accountId = options.account ?? manifest.accountId ?? '123456789012';
        const outputDir = path.resolve(options.output ?? 'cdk.out');

        await ensureOutputDir(outputDir);

        const synthResult = await synthesizeService({
          manifestPath,
          environment,
          region,
          accountId,
          outputDir,
          includeExperimental: options.includeExperimental
        });

        const stacks = synthResult.assembly.stacks.map(stack => ({
          id: stack.id,
          templateFile: stack.templateFile,
          displayName: stack.displayName
        }));

        if (options.json) {
          console.log(JSON.stringify({
            service: manifest.service,
            environment,
            outputDir: synthResult.outputDir,
            stacks,
            components: synthResult.components
          }, null, 2));
        } else {
          console.log(`Synthesis completed for ${manifest.service} (${environment}).`);
          console.log(`Output directory: ${synthResult.outputDir}`);
          if (stacks.length === 0) {
            console.log('No stacks were synthesized.');
          } else {
            console.log('Stacks:');
            stacks.forEach(stackSummary => {
              console.log(`  - ${stackSummary.displayName ?? stackSummary.id}`);
              if (stackSummary.templateFile) {
                console.log(`    template: ${stackSummary.templateFile}`);
              }
            });
          }
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
