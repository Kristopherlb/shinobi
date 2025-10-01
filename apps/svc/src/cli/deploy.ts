import { Logger } from './utils/logger.js';
import { FileDiscovery } from './utils/file-discovery.js';

export interface DeployOptions {
  file?: string;
  env?: string;
  target?: string;
}

export interface DeployResult {
  success: boolean;
  exitCode: number;
  data?: {
    resolvedManifest: any;
    warnings: string[];
  };
  error?: string;
}

interface DeployDependencies {
  fileDiscovery: FileDiscovery;
  logger: Logger;
}

/**
 * Placeholder deploy command – we surface a clear error instead of a Potemkin success.
 */
export class DeployCommand {
  constructor(private dependencies: DeployDependencies) {}

  async execute(options: DeployOptions): Promise<DeployResult> {
    this.dependencies.logger.debug('Starting deploy command', { data: options });

    const manifestPath = options.file
      ? options.file
      : await this.dependencies.fileDiscovery.findManifest('.');

    if (!manifestPath) {
      return {
        success: false,
        exitCode: 2,
        error: 'No service.yml found in this directory or any parent directories.'
      };
    }

    this.dependencies.logger.warn(
      'shinobi deploy is not yet supported. Run "shinobi plan" and deploy through your CDK pipeline or CI workflow.'
    );

    return {
      success: false,
      exitCode: 64,
      error: 'Deployment command not yet implemented'
    };
  }
}
