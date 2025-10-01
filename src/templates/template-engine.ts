import * as fs from 'fs/promises';
import * as path from 'path';
import * as Mustache from 'mustache';
import { Logger } from '../utils/logger.js';
import { ConfigLoader } from '../utils/config-loader.js';

export interface ProjectInputs {
  name: string;
  owner: string;
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  pattern: string; // Now accepts any dynamically discovered template
}

interface TemplateEngineDependencies {
  logger: Logger;
}

export class TemplateEngine {
  constructor(private dependencies: TemplateEngineDependencies) {}

  /**
   * Generate project files based on user inputs (AC-SI-2)
   */
  async generateProject(inputs: ProjectInputs): Promise<void> {
    this.dependencies.logger.debug('Generating project files', inputs);

    // Create service.yml from template
    await this.generateServiceManifest(inputs);
    
    // Create .gitignore
    await this.generateGitignore();
    
    // Create source directory and files
    await this.generateSourceFiles(inputs);
    
    // Create patches.ts stub
    await this.generatePatchesStub();

    this.dependencies.logger.debug('Project generation completed');
  }

  private async generateServiceManifest(inputs: ProjectInputs): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    const template = this.getServiceTemplate(inputs.pattern, config);
    
    const serviceManifest = Mustache.render(template, {
      serviceName: inputs.name,
      owner: inputs.owner,
      complianceFramework: inputs.framework,
      isCommercial: inputs.framework === 'commercial',
      isFedRAMP: inputs.framework.startsWith('fedramp'),
      isHighSecurity: inputs.framework === 'fedramp-high'
    });

    await fs.writeFile('service.yml', serviceManifest);
    this.dependencies.logger.debug('Generated service.yml');
  }

  private async generateGitignore(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('.gitignore', config.gitignore_template.trim());
    this.dependencies.logger.debug('Generated .gitignore');
  }

  private async generateSourceFiles(inputs: ProjectInputs): Promise<void> {
    // Create src directory
    await fs.mkdir('src', { recursive: true });

    if (inputs.pattern === 'lambda-api-with-db') {
      await this.generateApiLambdaFiles();
    } else if (inputs.pattern === 'worker-with-queue') {
      await this.generateWorkerFiles();
    } else {
      // Empty pattern - just create a basic handler
      await this.generateBasicHandler();
    }

    this.dependencies.logger.debug('Generated source files');
  }

  private async generatePatchesStub(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('patches.ts', config.patches_stub.trim());
    this.dependencies.logger.debug('Generated patches.ts stub');
  }

  private getServiceTemplate(pattern: string, config: any): string {
    const baseTemplate = config.templates.service_base;

    switch (pattern) {
      case 'lambda-api-with-db':
        return baseTemplate + config.templates.lambda_api_with_db;
      case 'worker-with-queue':
        return baseTemplate + config.templates.worker_with_queue;
      default: // empty
        return baseTemplate + config.templates.empty_service;
    }
  }

  private async generateApiLambdaFiles(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('src/api.ts', config.source_files.api_lambda.trim());
  }

  private async generateWorkerFiles(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('src/worker.ts', config.source_files.worker_lambda.trim());
  }

  private async generateBasicHandler(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('src/handler.ts', config.source_files.basic_handler.trim());
  }
}