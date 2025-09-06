import inquirer from 'inquirer';
import { logger } from '../utils/logger';
import { FileDiscovery } from '../utils/file-discovery';
import { TemplateEngine } from '../templates/template-engine';

export interface InitOptions {
  name?: string;
  owner?: string;
  framework?: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  pattern?: 'empty' | 'lambda-api-with-db' | 'worker-with-queue';
}

export class InitCommand {
  private templateEngine: TemplateEngine;

  constructor() {
    this.templateEngine = new TemplateEngine();
  }

  async execute(options: InitOptions): Promise<void> {
    logger.debug('Starting init command', options);

    // Check if service.yml already exists
    const fileDiscovery = new FileDiscovery();
    const existingManifest = await fileDiscovery.findManifest('.');

    if (existingManifest) {
      logger.error(`Service manifest already exists at: ${existingManifest}`);
      throw new Error('Service already initialized');
    }

    // Gather inputs through interactive prompts or use provided options
    const inputs = await this.gatherInputs(options);
    
    logger.info('Generating service files...');
    
    // Generate files using template engine
    await this.templateEngine.generateProject(inputs);
    
    logger.success(`Service '${inputs.name}' initialized successfully!`);
    logger.info('Next steps:');
    logger.info('  1. Edit service.yml to customize your service');
    logger.info('  2. Run "svc validate" to check your configuration');
    logger.info('  3. Run "svc plan" to see resolved configuration');
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

    const answers = questions.length > 0 ? await inquirer.prompt(questions as any[]) : {};

    return {
      name: options.name || answers.name,
      owner: options.owner || answers.owner,
      framework: options.framework || answers.framework,
      pattern: options.pattern || answers.pattern
    };
  }
}