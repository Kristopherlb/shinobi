import * as path from 'path';
import * as os from 'os';
import * as fsp from 'fs/promises';
import * as YAML from 'yaml';
import {
  CloudFormationClient,
  GetTemplateCommand
} from '@aws-sdk/client-cloudformation';
import { Logger } from './utils/logger';
import { FileDiscovery } from './utils/file-discovery';
import {
  synthesizeService,
  SimpleManifest,
  readManifest
} from './utils/service-synthesizer';
import { diffCloudFormationTemplates, TemplateDiff } from './utils/template-diff';

export interface DiffOptions {
  file?: string;
  env?: string;
  region?: string;
  account?: string;
  profile?: string;
  json?: boolean;
  includeExperimental?: boolean;
  stack?: string;
  output?: string;
  keepOutput?: boolean;
  suppressLogSummary?: boolean;
}

export interface DiffResult {
  success: boolean;
  exitCode: number;
  data?: {
    stackName: string;
    stackExists: boolean;
    diff: TemplateDiff;
    synthesizedTemplatePath: string;
    synthesizedAssetDirectory: string;
    components: { name: string; type: string }[];
    keptArtifacts: boolean;
  };
  error?: string;
}

interface DiffDependencies {
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

const isStackNotFound = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { name?: string; message?: string };
  if (err.name === 'ValidationError' && err.message?.includes('does not exist')) {
    return true;
  }
  return false;
};

const parseTemplateBody = (templateBody: string | undefined): any => {
  if (!templateBody) {
    return undefined;
  }

  try {
    return JSON.parse(templateBody);
  } catch {
    try {
      return YAML.parse(templateBody);
    } catch {
      return undefined;
    }
  }
};

export class DiffCommand {
  constructor(private readonly dependencies: DiffDependencies) {}

  async execute(options: DiffOptions): Promise<DiffResult> {
    const logger = this.dependencies.logger;

    try {
      const manifestPath = options.file
        ? path.resolve(options.file)
        : await this.dependencies.fileDiscovery.findManifest('.');

      if (!manifestPath) {
        return {
          success: false,
          exitCode: 2,
          error: 'No service.yml found in this directory or any parent directories.'
        };
      }

      const manifest: SimpleManifest = await readManifest({ manifestPath });
      const environment = options.env ?? manifest.environment ?? 'dev';
      const region = options.region ?? manifest.region ?? 'us-east-1';
      const accountId = options.account ?? manifest.accountId ?? '123456789012';
      const profile = options.profile;

      if (profile) {
        process.env.AWS_PROFILE = profile;
        logger.info(`Using AWS profile: ${profile}`);
      }

      let outputDir: string;
      let shouldCleanupOutput = false;

      if (options.output) {
        outputDir = path.resolve(options.output);
      } else {
        outputDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'shinobi-diff-'));
        shouldCleanupOutput = !options.keepOutput;
      }

      logger.info(`Synthesizing ${manifest.service} (${environment}) for diff`);

      const synthResult = await synthesizeService({
        manifestPath,
        environment,
        region,
        accountId,
        outputDir,
        includeExperimental: options.includeExperimental
      });

      const stackName = options.stack ?? synthResult.stack.stackName;

      const cfnClient = new CloudFormationClient({ region });

      let currentTemplate: any | undefined;
      let stackExists = true;

      try {
        const templateResponse = await cfnClient.send(
          new GetTemplateCommand({ StackName: stackName, TemplateStage: 'Original' })
        );
        currentTemplate = parseTemplateBody(templateResponse.TemplateBody);
      } catch (error) {
        if (isStackNotFound(error)) {
          stackExists = false;
          logger.warn(`Stack ${stackName} does not exist in account ${accountId}.`);
        } else {
          throw error;
        }
      }

      const desiredTemplate = synthResult.stack.template;

      const diff = diffCloudFormationTemplates(stackName, currentTemplate, desiredTemplate);

      const showSummary = !options.suppressLogSummary;

      if (!stackExists && showSummary) {
        logger.info('All resources will be created because the stack does not exist.');
      }

      if (showSummary) {
        if (!diff.hasChanges) {
          logger.success('No changes detected between deployed stack and synthesized template.');
        } else {
          logger.info('Infrastructure drift detected');
          renderSummary(logger, diff);
        }
      }

      const data = {
        success: true,
        exitCode: diff.hasChanges ? 3 : 0,
        data: {
          stackName,
          stackExists,
          diff,
          synthesizedTemplatePath: path.join(outputDir, synthResult.stack.templateFile),
          synthesizedAssetDirectory: outputDir,
          components: synthResult.components,
          keptArtifacts: !shouldCleanupOutput
        }
      } as DiffResult;

      if (shouldCleanupOutput) {
        try {
          await fsp.rm(outputDir, { recursive: true, force: true });
        } catch (cleanupError) {
          logger.warn(`Failed to remove temporary directory ${outputDir}: ${(cleanupError as Error).message}`);
        }
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Diff failed', error);
      return {
        success: false,
        exitCode: 2,
        error: message
      };
    }
  }
}

const renderSummary = (logger: Logger, diff: TemplateDiff): void => {
  logger.info('Summary:');
  logger.info(`  • Resources to add: ${diff.addedResources.length}`);
  logger.info(`  • Resources to remove: ${diff.removedResources.length}`);
  logger.info(`  • Resources to modify: ${diff.changedResources.length}`);
  logger.info(`  • Outputs to add: ${diff.addedOutputs.length}`);
  logger.info(`  • Outputs to remove: ${diff.removedOutputs.length}`);
  logger.info(`  • Outputs to modify: ${diff.changedOutputs.length}`);

  const sections: Array<{ title: string; items: string[] }> = [
    { title: 'Resources to add', items: diff.addedResources },
    { title: 'Resources to remove', items: diff.removedResources },
    { title: 'Outputs to add', items: diff.addedOutputs },
    { title: 'Outputs to remove', items: diff.removedOutputs }
  ];

  sections.forEach(section => {
    if (section.items.length === 0) {
      return;
    }
    logger.info(`\n${section.title}:`);
    formatList(section.items, 4).forEach(line => logger.info(line));
  });

  if (diff.changedResources.length > 0) {
    logger.info('\nResources to modify:');
    diff.changedResources.forEach(resourceDiff => {
      logger.info(`  ${resourceDiff.resource}`);
      formatList(resourceDiff.changePaths, 6).forEach(line => logger.info(line));
    });
  }

  if (diff.changedOutputs.length > 0) {
    logger.info('\nOutputs to modify:');
    diff.changedOutputs.forEach(outputDiff => {
      logger.info(`  ${outputDiff.resource}`);
      formatList(outputDiff.changePaths, 6).forEach(line => logger.info(line));
    });
  }
};

const formatList = (items: string[], indentSpaces = 2, limit = 12): string[] => {
  const indent = ' '.repeat(indentSpaces);
  const display = items.slice(0, limit).map(item => `${indent}- ${item}`);
  if (items.length > limit) {
    display.push(`${indent}… ${items.length - limit} more`);
  }
  return display;
};
