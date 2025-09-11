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
exports.InitCommand = void 0;
class InitCommand {
    dependencies;
    options;
    constructor(dependencies, options) {
        this.dependencies = dependencies;
        this.options = options;
    }
    async execute(options) {
        // Store options for force flag access
        this.options = options;
        this.dependencies.logger.debug('Starting init command', options);
        try {
            // Pre-flight checks
            const preflightResult = await this.performPreflightChecks();
            if (!preflightResult.success) {
                return {
                    success: false,
                    exitCode: 1,
                    error: preflightResult.error
                };
            }
            // Discover available templates dynamically
            const availableTemplates = await this.discoverTemplates();
            // Validate provided pattern against discovered templates
            if (options.pattern && !availableTemplates.some(t => t.value === options.pattern)) {
                this.dependencies.logger.warn(`Pattern '${options.pattern}' not found in available templates. Available: ${availableTemplates.map(t => t.value).join(', ')}`);
                // Remove invalid pattern to trigger prompt
                options = { ...options, pattern: undefined };
            }
            // Gather inputs through interactive prompts or use provided options
            const inputs = await this.gatherInputs(options, availableTemplates);
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.dependencies.logger.error('Failed to initialize service:', error);
            return {
                success: false,
                exitCode: 1,
                error: errorMessage
            };
        }
    }
    /**
     * Perform pre-flight checks before initialization
     */
    async performPreflightChecks() {
        // 1. Check if current directory is empty or get user confirmation
        const directoryCheck = await this.checkCurrentDirectory();
        if (!directoryCheck.success) {
            return directoryCheck;
        }
        // 2. Check system dependencies
        const dependencyCheck = await this.checkSystemDependencies();
        if (!dependencyCheck.success) {
            return dependencyCheck;
        }
        // 3. Check if service.yml already exists
        const existingManifest = await this.dependencies.fileDiscovery.findManifest('.');
        if (existingManifest) {
            return {
                success: false,
                error: `Service manifest already exists at: ${existingManifest}`
            };
        }
        return { success: true };
    }
    /**
     * Check if current directory is empty or get user confirmation
     */
    async checkCurrentDirectory() {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const files = await fs.readdir('.');
            // Filter out common hidden files that are safe to ignore
            const ignoredFiles = new Set(['.git', '.gitignore', '.DS_Store', '.npmrc', '.nvmrc', '.editorconfig', '.env.example']);
            const significantFiles = files.filter(file => !ignoredFiles.has(file) && !file.startsWith('.'));
            if (significantFiles.length > 0) {
                this.dependencies.logger.warn(`Current directory is not empty. Found ${significantFiles.length} files/directories.`);
                // Check for --force flag to skip confirmation
                if (this.options?.force) {
                    this.dependencies.logger.info('--force flag detected, proceeding with initialization in non-empty directory');
                }
                else {
                    const { confirmInit } = await this.dependencies.prompter.prompt([{
                            type: 'confirm',
                            name: 'confirmInit',
                            message: 'Initialize service in non-empty directory?',
                            default: false
                        }]);
                    if (!confirmInit) {
                        return {
                            success: false,
                            error: 'Initialization cancelled. Please run in an empty directory or use --force to proceed.'
                        };
                    }
                }
            }
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to check directory: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Check for required system dependencies
     */
    async checkSystemDependencies() {
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
        const execAsync = promisify(exec);
        const dependencies = [
            { name: 'git', command: 'git --version' },
            { name: 'node', command: 'node --version' }
        ];
        const missing = [];
        for (const dep of dependencies) {
            try {
                await execAsync(dep.command);
                this.dependencies.logger.debug(`✓ ${dep.name} is available`);
            }
            catch {
                missing.push(dep.name);
            }
        }
        if (missing.length > 0) {
            return {
                success: false,
                error: `Missing required dependencies: ${missing.join(', ')}. Please install them before initializing.`
            };
        }
        return { success: true };
    }
    /**
     * Dynamically discover available templates
     */
    async discoverTemplates() {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            // Robust path resolution for templates directory
            const possiblePaths = [
                path.resolve(process.cwd(), 'src/templates/patterns'),
                path.resolve(process.cwd(), 'templates/patterns'),
                path.resolve(__dirname, '../templates/patterns'),
                path.resolve(__dirname, '../../src/templates/patterns')
            ];
            let templatesDir = '';
            for (const possiblePath of possiblePaths) {
                try {
                    await fs.access(possiblePath);
                    templatesDir = possiblePath;
                    break;
                }
                catch {
                    // Continue to next path
                }
            }
            if (!templatesDir) {
                this.dependencies.logger.debug('No templates directory found in standard locations');
                throw new Error('Templates directory not found');
            }
            try {
                const templateDirs = await fs.readdir(templatesDir, { withFileTypes: true });
                const templates = [];
                for (const entry of templateDirs) {
                    if (entry.isDirectory()) {
                        const templateName = entry.name;
                        // Try to read template metadata
                        const metadataPath = path.join(templatesDir, templateName, 'metadata.json');
                        let displayName = templateName;
                        let description = '';
                        try {
                            const metadataContent = await fs.readFile(metadataPath, 'utf8');
                            const metadata = JSON.parse(metadataContent);
                            displayName = metadata.displayName || templateName;
                            description = metadata.description || '';
                        }
                        catch {
                            // No metadata file, use directory name
                            displayName = templateName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                        templates.push({
                            name: description ? `${displayName} - ${description}` : displayName,
                            value: templateName,
                            description
                        });
                    }
                }
                if (templates.length > 0) {
                    this.dependencies.logger.debug(`Discovered ${templates.length} templates: ${templates.map(t => t.value).join(', ')}`);
                    return templates;
                }
            }
            catch (error) {
                this.dependencies.logger.debug(`Templates directory not found at ${templatesDir}, using fallback templates`, error);
            }
            // Fallback to hardcoded templates if directory doesn't exist
            return [
                { name: 'Empty (minimal setup)', value: 'empty', description: 'Basic service.yml only' },
                { name: 'Lambda API with Database', value: 'lambda-api-with-db', description: 'REST API with RDS PostgreSQL' },
                { name: 'Worker with Queue', value: 'worker-with-queue', description: 'Background processing with SQS' }
            ];
        }
        catch (error) {
            this.dependencies.logger.debug('Failed to discover templates, using fallback:', error);
            // Return fallback templates
            return [
                { name: 'Empty (minimal setup)', value: 'empty' },
                { name: 'Lambda API with Database', value: 'lambda-api-with-db' },
                { name: 'Worker with Queue', value: 'worker-with-queue' }
            ];
        }
    }
    async gatherInputs(options, availableTemplates) {
        const questions = [];
        if (!options.name) {
            questions.push({
                type: 'input',
                name: 'name',
                message: 'Service name:',
                default: 'my-service',
                validate: (input) => {
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
                choices: availableTemplates,
                default: availableTemplates[0]?.value || 'empty'
            });
        }
        const answers = questions.length > 0 ? await this.dependencies.prompter.prompt(questions) : {};
        return {
            name: options.name || answers.name,
            owner: options.owner || answers.owner,
            framework: options.framework || answers.framework,
            pattern: options.pattern || answers.pattern,
            force: options.force || false
        };
    }
}
exports.InitCommand = InitCommand;
