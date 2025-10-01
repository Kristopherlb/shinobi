import * as fs from 'fs/promises';
import Mustache from 'mustache';
import { ConfigLoader } from '@shinobi/core';
export class TemplateEngine {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async generateProject(inputs) {
        this.dependencies.logger.debug('Generating service from template', { data: inputs });
        await this.generateServiceManifest(inputs);
        await this.generateGitignore();
        await this.generateSourceFiles(inputs.pattern);
        await this.generatePatchesStub();
        this.dependencies.logger.success(`Project scaffolding complete for ${inputs.name}`);
    }
    async generateServiceManifest(inputs) {
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
    async generateGitignore() {
        const config = await ConfigLoader.getTemplateConfig();
        await fs.writeFile('.gitignore', config.gitignore_template.trim(), 'utf8');
        this.dependencies.logger.debug('Generated .gitignore');
    }
    async generateSourceFiles(pattern) {
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
    async generatePatchesStub() {
        const config = await ConfigLoader.getTemplateConfig();
        await fs.writeFile('patches.ts', config.patches_stub.trim(), 'utf8');
        this.dependencies.logger.debug('Generated patches.ts stub');
    }
    resolveServiceTemplate(pattern, config) {
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
