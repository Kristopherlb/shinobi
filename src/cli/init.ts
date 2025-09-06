import inquirer from 'inquirer';
import { Logger } from '../utils/logger';
import { FileDiscovery } from '../utils/file-discovery';
import { TemplateEngine } from '../templates/template-engine';

export interface InitOptions {
  name?: string;
  owner?: string;
  framework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  pattern?: 'empty' | 'lambda-api-with-db' | 'worker-with-queue';
}

export interface InitResult {
  success: boolean;
  exitCode: number;
  error?: string;
}

interface InitDependencies {
  templateEngine: TemplateEngine;
  fileDiscovery: FileDiscovery;
  logger: Logger;
  prompter: typeof inquirer;
}

export class InitCommand {
  constructor(private dependencies: InitDependencies) {}

  async execute(options: InitOptions): Promise<InitResult> {
    this.dependencies.logger.debug('Starting init command', options);

    try {
      // Check if service.yml already exists
      const existingManifest = await this.dependencies.fileDiscovery.findManifest('.');

      if (existingManifest) {
        return {
          success: false,
          exitCode: 1,
          error: `Service manifest already exists at: ${existingManifest}`
        };
      }

      // Gather inputs through interactive prompts or use provided options
      const inputs = await this.gatherInputs(options);
      
      this.dependencies.logger.info('Generating service files...');
      
      // Generate files using template engine
      await this.dependencies.templateEngine.generateProject(inputs);
      
      this.dependencies.logger.success(`Service '${inputs.name}' initialized successfully!`);
      this.dependencies.logger.info('Next steps:');
      this.dependencies.logger.info('  1. Edit service.yml to customize your service');
      this.dependencies.logger.info('  2. Run "svc validate" to check your configuration');
      this.dependencies.logger.info('  3. Run "svc plan" to see resolved configuration');
      
      return {
        success: true,
        exitCode: 0
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.dependencies.logger.error('Failed to initialize service:', error);
      
      return {
        success: false,
        exitCode: 1,
        error: errorMessage
      };
    }
  }

  private async gatherInputs(options: InitOptions): Promise<Required<InitOptions>> {
    const questions = [];

    if (!options.name) {
      questions.push({
        type: 'input',
        name: 'name',
        message: 'Service name:',
        default: 'my-service',
        validate: (input: string) => {
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Service name must contain only lowercase letters, numbers, and hyphens';
          }
          return true;
        }
      });
    }

    if (!options.owner) {
      questions.push({
        type: 'input',
        name: 'owner',
        message: 'Owner (team name):',
        default: 'platform-team'
      });
    }

    if (!options.framework) {
      questions.push({
        type: 'list',
        name: 'framework',
        message: 'Compliance framework:',
        choices: [
          { name: 'Commercial (standard security)', value: 'commercial' },
          { name: 'FedRAMP Moderate', value: 'fedramp-moderate' },
          { name: 'FedRAMP High', value: 'fedramp-high' }
        ],
        default: 'commercial'
      });
    }

    if (!options.pattern) {
      questions.push({
        type: 'list',
        name: 'pattern',
        message: 'Initial pattern:',
        choices: [
          { name: 'Empty (minimal setup)', value: 'empty' },
          { name: 'Lambda API with Database', value: 'lambda-api-with-db' },
          { name: 'Worker with Queue', value: 'worker-with-queue' }
        ],
        default: 'empty'
      });
    }

    const answers = questions.length > 0 ? await this.dependencies.prompter.prompt(questions as any[]) : {};

    return {
      name: options.name || answers.name,
      owner: options.owner || answers.owner,
      framework: options.framework || answers.framework,
      pattern: options.pattern || answers.pattern
    };
  }
}