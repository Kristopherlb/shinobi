"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngine = void 0;
const fs = __importStar(require("fs/promises"));
const Mustache = __importStar(require("mustache"));
const config_loader_1 = require("../utils/config-loader");
class TemplateEngine {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    /**
     * Generate project files based on user inputs (AC-SI-2)
     */
    async generateProject(inputs) {
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
    async generateServiceManifest(inputs) {
        const config = await config_loader_1.ConfigLoader.getTemplateConfig();
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
    async generateGitignore() {
        const config = await config_loader_1.ConfigLoader.getTemplateConfig();
        await fs.writeFile('.gitignore', config.gitignore_template.trim());
        this.dependencies.logger.debug('Generated .gitignore');
    }
    async generateSourceFiles(inputs) {
        // Create src directory
        await fs.mkdir('src', { recursive: true });
        if (inputs.pattern === 'lambda-api-with-db') {
            await this.generateApiLambdaFiles();
        }
        else if (inputs.pattern === 'worker-with-queue') {
            await this.generateWorkerFiles();
        }
        else {
            // Empty pattern - just create a basic handler
            await this.generateBasicHandler();
        }
        this.dependencies.logger.debug('Generated source files');
    }
    async generatePatchesStub() {
        const config = await config_loader_1.ConfigLoader.getTemplateConfig();
        await fs.writeFile('patches.ts', config.patches_stub.trim());
        this.dependencies.logger.debug('Generated patches.ts stub');
    }
    getServiceTemplate(pattern, config) {
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
    async generateApiLambdaFiles() {
        const config = await config_loader_1.ConfigLoader.getTemplateConfig();
        await fs.writeFile('src/api.ts', config.source_files.api_lambda.trim());
    }
    async generateWorkerFiles() {
        const config = await config_loader_1.ConfigLoader.getTemplateConfig();
        await fs.writeFile('src/worker.ts', config.source_files.worker_lambda.trim());
    }
    async generateBasicHandler() {
        const config = await config_loader_1.ConfigLoader.getTemplateConfig();
        await fs.writeFile('src/handler.ts', config.source_files.basic_handler.trim());
    }
}
exports.TemplateEngine = TemplateEngine;
