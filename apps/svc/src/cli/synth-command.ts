/**
 * Synth Command
 *
 * Implements the `shinobi synth` command, which synthesizes a service manifest
 * into AWS CDK templates. This command:
 *
 * - Resolves the service manifest file
 * - Synthesizes the manifest to CDK constructs
 * - Generates CloudFormation templates
 * - Outputs synthesis results (stacks, components, output directory)
 * - Supports JSON output for programmatic consumption
 *
 * This command does not deploy anything to AWS. It's useful for:
 * - Validating that manifests synthesize correctly
 * - Generating templates for external deployment tools
 * - Inspecting the generated CloudFormation templates
 *
 * Exit codes:
 * - 0: Synthesis successful
 * - 1: Synthesis failed (CDK errors, component errors)
 * - 2: Missing manifest file
 */

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
        try {
          await fsp.access(cwdPath, fs.constants.F_OK);
          manifestPath = cwdPath;
        } catch {
          // Try resolving as absolute path
          const absPath = path.resolve(options.file);
          try {
            await fsp.access(absPath, fs.constants.F_OK);
            manifestPath = absPath;
          } catch {
            // Try resolving from repo root (simplified: walk up until no parent)
            let repoRoot = process.cwd();
            let parent = path.dirname(repoRoot);
            while (repoRoot !== parent) {
              repoRoot = parent;
              parent = path.dirname(repoRoot);
            }
            // Found filesystem root - use it as repo root
            const repoPath = path.resolve(repoRoot, options.file);
            try {
              await fsp.access(repoPath, fs.constants.F_OK);
              manifestPath = repoPath;
            } catch {
              manifestPath = absPath; // Will fail with proper error below
            }
          }
        }
      } else {
        // Default: look for service.yml starting from cwd, walking up to repo root
        // fileDiscovery is designed for this and handles monorepo detection properly
        const foundManifest = await this.dependencies.fileDiscovery.findManifest('.');
        if (foundManifest) {
          manifestPath = foundManifest;
        } else {
          manifestPath = path.resolve(process.cwd(), 'service.yml');
        }
      }

      // Verify manifest file exists
      try {
        await fsp.access(manifestPath, fs.constants.F_OK);
      } catch {
        return {
          success: false,
          exitCode: 2,
          error: `Service manifest not found: ${manifestPath}`
        };
      }

      const manifest: SimpleManifest = await readManifest({ manifestPath });
      const environment = options.env ?? manifest.environment ?? 'dev';
      const region = options.region ?? manifest.region ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1';
      
      // Account ID resolution: prefer explicit option, then manifest, then environment variable
      // Fail early if we can't determine account ID (no fake fallback)
      const accountId = options.account ?? manifest.accountId ?? process.env.CDK_DEFAULT_ACCOUNT;
      if (!accountId) {
        return {
          success: false,
          exitCode: 2,
          error: 'Could not determine AWS account ID. Set via --account, manifest accountId, or CDK_DEFAULT_ACCOUNT environment variable.'
        };
      }
      
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

