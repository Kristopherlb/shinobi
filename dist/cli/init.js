"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitCommand = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const logger_1 = require("../utils/logger");
const file_discovery_1 = require("../utils/file-discovery");
const template_engine_1 = require("../templates/template-engine");
class InitCommand {
    constructor() {
        this.templateEngine = new template_engine_1.TemplateEngine();
    }
    async execute(options) {
        logger_1.logger.debug('Starting init command', options);
        // Check if service.yml already exists
        const fileDiscovery = new file_discovery_1.FileDiscovery();
        const existingManifest = await fileDiscovery.findManifest('.');
        if (existingManifest) {
            logger_1.logger.error(`Service manifest already exists at: ${existingManifest}`);
            throw new Error('Service already initialized');
        }
        // Gather inputs through interactive prompts or use provided options
        const inputs = await this.gatherInputs(options);
        logger_1.logger.info('Generating service files...');
        // Generate files using template engine
        await this.templateEngine.generateProject(inputs);
        logger_1.logger.success(`Service '${inputs.name}' initialized successfully!`);
        logger_1.logger.info('Next steps:');
        logger_1.logger.info('  1. Edit service.yml to customize your service');
        logger_1.logger.info('  2. Run "svc validate" to check your configuration');
        logger_1.logger.info('  3. Run "svc plan" to see resolved configuration');
    }
    async gatherInputs(options) {
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
                choices: [
                    { name: 'Empty (minimal setup)', value: 'empty' },
                    { name: 'Lambda API with Database', value: 'lambda-api-with-db' },
                    { name: 'Worker with Queue', value: 'worker-with-queue' }
                ],
                default: 'empty'
            });
        }
        const answers = questions.length > 0 ? await inquirer_1.default.prompt(questions) : {};
        return {
            name: options.name || answers.name,
            owner: options.owner || answers.owner,
            framework: options.framework || answers.framework,
            pattern: options.pattern || answers.pattern
        };
    }
}
exports.InitCommand = InitCommand;
