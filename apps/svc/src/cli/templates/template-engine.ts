import * as fs from 'fs/promises';
import Mustache from 'mustache';
import { ConfigLoader } from '@shinobi/core';
import { Logger } from '../utils/logger.js';

export interface ProjectInputs {
  name: string;
  owner: string;
  framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high';
  pattern: string;
}

interface TemplateEngineDependencies {
  logger: Logger;
}

export class TemplateEngine {
  constructor(private readonly dependencies: TemplateEngineDependencies) {}

  async generateProject(inputs: ProjectInputs): Promise<void> {
    this.dependencies.logger.debug('Generating service from template', { data: inputs });

    await this.generateServiceManifest(inputs);
    await this.generateGitignore();
    await this.generateSourceFiles(inputs.pattern);
    await this.generatePatchesStub();

    this.dependencies.logger.success(`Project scaffolding complete for ${inputs.name}`);
  }

  private async generateServiceManifest(inputs: ProjectInputs): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    const template = this.resolveServiceTemplate(inputs.pattern, config);

    const manifestContent = Mustache.render(template, {
      serviceName: inputs.name,
      owner: inputs.owner,
      complianceFramework: inputs.framework,
      isCommercial: inputs.framework === 'commercial',
      isFedRAMP: inputs.framework.startsWith('fedramp'),
      isHighSecurity: inputs.framework === 'fedramp-high'
    });

    await fs.writeFile('service.yml', manifestContent, 'utf8');
    this.dependencies.logger.debug('Generated service.yml');
  }

  private async generateGitignore(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('.gitignore', config.gitignore_template.trim(), 'utf8');
    this.dependencies.logger.debug('Generated .gitignore');
  }

  private async generateSourceFiles(pattern: string): Promise<void> {
    await fs.mkdir('src', { recursive: true });
    const config = await ConfigLoader.getTemplateConfig();

    switch (pattern) {
      case 'lambda-api-with-db':
        await fs.writeFile('src/api.ts', config.source_files.api_lambda.trim(), 'utf8');
        break;
      case 'worker-with-queue':
        await fs.writeFile('src/worker.ts', config.source_files.worker_lambda.trim(), 'utf8');
        break;
      default:
        await fs.writeFile('src/handler.ts', config.source_files.basic_handler.trim(), 'utf8');
        break;
    }

    this.dependencies.logger.debug('Generated application source files');
  }

  private async generatePatchesStub(): Promise<void> {
    const config = await ConfigLoader.getTemplateConfig();
    await fs.writeFile('patches.ts', config.patches_stub.trim(), 'utf8');
    this.dependencies.logger.debug('Generated patches.ts stub');
  }

  private resolveServiceTemplate(pattern: string, config: Awaited<ReturnType<typeof ConfigLoader.getTemplateConfig>>): string {
    const base = config.templates.service_base;

    switch (pattern) {
      case 'lambda-api-with-db':
        return base + config.templates.lambda_api_with_db;
      case 'worker-with-queue':
        return base + config.templates.worker_with_queue;
      default:
        return base + config.templates.empty_service;
    }
  }
}
