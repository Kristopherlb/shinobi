import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import { Logger } from './console-logger.js';
import { FileDiscovery } from './utils/file-discovery.js';
import {
  readManifest,
  synthesizeService,
  SimpleManifest
} from './utils/service-synthesizer.js';

export interface SynthOptions {
  file?: string;
  env?: string;
  region?: string;
  account?: string;
  output?: string;
  json?: boolean;
  includeExperimental?: boolean;
}

export interface SynthResult {
  success: boolean;
  exitCode: number;
  data?: {
    service: string;
    environment: string;
    outputDir: string;
    stacks: Array<{
      id: string;
      templateFile?: string;
      displayName?: string;
    }>;
    components: Array<{
      name: string;
      type: string;
    }>;
  };
  error?: string;
}

interface SynthDependencies {
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

const ensureOutputDir = async (dir: string) => {
  await fsp.mkdir(dir, { recursive: true });
};

export class SynthCommand {
  constructor(private readonly dependencies: SynthDependencies) {}

  async execute(options: SynthOptions): Promise<SynthResult> {
    const logger = this.dependencies.logger;

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
        const foundManifest = await this.dependencies.fileDiscovery.findManifest('.');
        if (foundManifest) {
          manifestPath = foundManifest;
        } else {
          manifestPath = path.resolve(process.cwd(), 'service.yml');
        }
      }

      if (!fs.existsSync(manifestPath)) {
        return {
          success: false,
          exitCode: 2,
          error: `Service manifest not found: ${manifestPath}`
        };
      }

      const manifest: SimpleManifest = await readManifest({ manifestPath });
      const environment = options.env ?? manifest.environment ?? 'dev';
      const region = options.region ?? manifest.region ?? 'us-east-1';
      const accountId = options.account ?? manifest.accountId ?? '123456789012';
      const outputDir = path.resolve(options.output ?? 'cdk.out');

      await ensureOutputDir(outputDir);

      logger.info(`Synthesizing ${manifest.service} (${environment})`);

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

      const data = {
        service: manifest.service,
        environment,
        outputDir: synthResult.outputDir,
        stacks,
        components: synthResult.components
      };

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        logger.success(`Synthesis completed for ${manifest.service} (${environment})`);
        logger.info(`Output directory: ${synthResult.outputDir}`);
        if (stacks.length === 0) {
          logger.warn('No stacks were synthesized.');
        } else {
          logger.info('Stacks:');
          stacks.forEach(stackSummary => {
            logger.info(`  - ${stackSummary.displayName ?? stackSummary.id}`);
            if (stackSummary.templateFile) {
              logger.info(`    template: ${stackSummary.templateFile}`);
            }
          });
        }
      }

      return {
        success: true,
        exitCode: 0,
        data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Synthesis failed', error);
      return {
        success: false,
        exitCode: 1,
        error: message
      };
    }
  }
}

