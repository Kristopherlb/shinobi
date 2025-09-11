"use strict";
/**
 * CLI Command for Migration Tool
 * Implements the interactive workflow for svc migrate
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMigrateCommand = createMigrateCommand;
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const migration_engine_1 = require("../migration/migration-engine");
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
function createMigrateCommand() {
    const command = new commander_1.Command('migrate');
    command
        .description('Migrate existing CDK project to platform service')
        .option('--cdk-project <path>', 'Path to existing CDK project')
        .option('--stack-name <name>', 'CDK stack name to migrate')
        .option('--service-name <name>', 'Name for the new platform service')
        .option('--output <path>', 'Output directory for migrated service')
        .option('--compliance <framework>', 'Compliance framework (commercial, fedramp-moderate, fedramp-high)')
        .option('--non-interactive', 'Run without prompts (requires all options)')
        .action(async (options) => {
        const logger = new logger_1.Logger();
        try {
            await runMigration(options, logger);
        }
        catch (error) {
            logger.error('Migration failed:', error);
            process.exit(1);
        }
    });
    return command;
}
async function runMigration(options, logger) {
    logger.info(chalk_1.default.bold('🚀 Platform Migration Tool'));
    logger.info('Migrating existing CDK project to platform service format\n');
    // Gather migration parameters
    const migrationOptions = options.nonInteractive
        ? await getNonInteractiveOptions(options, logger)
        : await getInteractiveOptions(options, logger);
    // Display migration summary
    displayMigrationSummary(migrationOptions, logger);
    // Confirm before proceeding
    if (!options.nonInteractive) {
        const { proceed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: 'Proceed with migration?',
                default: true
            }
        ]);
        if (!proceed) {
            logger.info('Migration cancelled.');
            return;
        }
    }
    // Execute migration
    const migrationEngine = new migration_engine_1.MigrationEngine(logger);
    const result = await executeMigration(migrationEngine, migrationOptions, logger);
    // Display results
    displayResults(result, logger);
}
async function getInteractiveOptions(options, logger) {
    const questions = [];
    // CDK Project Path
    if (!options.cdkProject) {
        questions.push({
            type: 'input',
            name: 'cdkProjectPath',
            message: '📁 Path to your existing CDK project:',
            validate: (input) => {
                if (!input.trim())
                    return 'Path is required';
                if (!fs.existsSync(input))
                    return 'Path does not exist';
                return true;
            }
        });
    }
    // Stack Name (dynamic based on CDK project)
    questions.push({
        type: 'input',
        name: 'stackName',
        message: '📚 Which stack do you want to migrate?:',
        when: (answers) => !options.stackName,
        validate: async (input, answers) => {
            if (!input.trim())
                return 'Stack name is required';
            const projectPath = options.cdkProject || answers.cdkProjectPath;
            const availableStacks = await getAvailableStacks(projectPath, logger);
            if (availableStacks.length > 0 && !availableStacks.includes(input)) {
                return `Stack not found. Available stacks: ${availableStacks.join(', ')}`;
            }
            return true;
        }
    });
    // Service Name
    if (!options.serviceName) {
        questions.push({
            type: 'input',
            name: 'serviceName',
            message: '🏷️  What is the name of the new service?:',
            validate: (input) => {
                if (!input.trim())
                    return 'Service name is required';
                if (!/^[a-z][a-z0-9-]*$/.test(input)) {
                    return 'Service name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens';
                }
                return true;
            }
        });
    }
    // Output Path
    if (!options.output) {
        questions.push({
            type: 'input',
            name: 'outputPath',
            message: '📂 Where should the new project be created?:',
            default: (answers) => `./${answers.serviceName || options.serviceName}`,
            validate: (input) => {
                if (!input.trim())
                    return 'Output path is required';
                if (fs.existsSync(input))
                    return 'Output directory already exists';
                return true;
            }
        });
    }
    // Compliance Framework
    if (!options.compliance) {
        questions.push({
            type: 'list',
            name: 'complianceFramework',
            message: '🔒 What compliance framework should the service use?:',
            choices: [
                { name: 'Commercial (Standard business applications)', value: 'commercial' },
                { name: 'FedRAMP Moderate (Government cloud)', value: 'fedramp-moderate' },
                { name: 'FedRAMP High (Classified/sensitive data)', value: 'fedramp-high' }
            ],
            default: 'commercial'
        });
    }
    const answers = await inquirer_1.default.prompt(questions);
    return {
        cdkProjectPath: options.cdkProject || answers.cdkProjectPath,
        stackName: options.stackName || answers.stackName,
        serviceName: options.serviceName || answers.serviceName,
        outputPath: options.output || answers.outputPath,
        complianceFramework: options.compliance || answers.complianceFramework,
        interactive: true
    };
}
async function getNonInteractiveOptions(options, logger) {
    const requiredFields = ['cdkProject', 'stackName', 'serviceName', 'output'];
    const missing = requiredFields.filter(field => !options[field]);
    if (missing.length > 0) {
        throw new Error(`Missing required options for non-interactive mode: ${missing.join(', ')}`);
    }
    return {
        cdkProjectPath: options.cdkProject,
        stackName: options.stackName,
        serviceName: options.serviceName,
        outputPath: options.output,
        complianceFramework: options.compliance || 'commercial',
        interactive: false
    };
}
async function getAvailableStacks(projectPath, logger) {
    try {
        const { execSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const output = execSync('npx cdk list', {
            cwd: projectPath,
            encoding: 'utf8',
            stdio: 'pipe'
        });
        return output.trim().split('\n').filter(line => line.trim());
    }
    catch (error) {
        logger.debug('Could not list CDK stacks:', error);
        return [];
    }
}
function displayMigrationSummary(options, logger) {
    logger.info(chalk_1.default.bold('\n📋 Migration Summary:'));
    logger.info(`   Source Project: ${chalk_1.default.cyan(options.cdkProjectPath)}`);
    logger.info(`   Stack Name: ${chalk_1.default.cyan(options.stackName)}`);
    logger.info(`   Target Service: ${chalk_1.default.green(options.serviceName)}`);
    logger.info(`   Output Directory: ${chalk_1.default.cyan(options.outputPath)}`);
    logger.info(`   Compliance: ${chalk_1.default.yellow(options.complianceFramework)}`);
    logger.info('');
}
async function executeMigration(engine, options, logger) {
    const startTime = Date.now();
    logger.info(chalk_1.default.bold(`Migrating '${options.stackName}' to '${options.serviceName}'...\n`));
    try {
        const result = await engine.migrate(options);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info(chalk_1.default.green(`\n✅ Migration completed in ${duration}s`));
        return result;
    }
    catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.error(chalk_1.default.red(`\n❌ Migration failed after ${duration}s:`));
        throw error;
    }
}
function displayResults(result, logger) {
    logger.info(chalk_1.default.bold('\n🎯 Migration Results:'));
    logger.info('-------------------');
    // Success/Failure status
    if (result.success && result.finalDiffResult === 'NO CHANGES') {
        logger.info(chalk_1.default.green('✅ Migration Status: SUCCESS'));
        logger.info(chalk_1.default.green('✅ Template Diff: NO CHANGES (Safe to deploy)'));
    }
    else if (result.success && result.finalDiffResult === 'HAS CHANGES') {
        logger.info(chalk_1.default.yellow('⚠️  Migration Status: SUCCESS WITH WARNINGS'));
        logger.info(chalk_1.default.yellow('⚠️  Template Diff: HAS CHANGES (Review required)'));
    }
    else {
        logger.info(chalk_1.default.red('❌ Migration Status: FAILED'));
        logger.info(chalk_1.default.red('❌ Template Diff: UNKNOWN'));
    }
    // Resource summary
    logger.info(`📊 Resources Found: ${chalk_1.default.cyan(result.resourcesFound)}`);
    logger.info(`📊 Resources Mapped: ${chalk_1.default.green(result.resourcesMapped)}`);
    if (result.resourcesUnmappable > 0) {
        logger.info(`📊 Resources Unmappable: ${chalk_1.default.yellow(result.resourcesUnmappable)}`);
    }
    // Generated files
    logger.info(`📁 Files Generated: ${result.generatedFiles.length}`);
    // Report location
    logger.info(`📖 Detailed Report: ${chalk_1.default.cyan(result.reportPath)}`);
    // Next steps
    logger.info(chalk_1.default.bold('\n🚀 Next Steps:'));
    if (result.unmappableResources.length > 0) {
        logger.info(`1. Review unmappable resources in: ${chalk_1.default.cyan(result.reportPath)}`);
        logger.info(`2. Add unmappable resources to: ${chalk_1.default.cyan('patches.ts')}`);
        logger.info('3. Test with: svc plan');
        logger.info('4. Validate with: cdk diff');
    }
    else if (result.finalDiffResult === 'NO CHANGES') {
        logger.info('1. Update the owner field in service.yml');
        logger.info('2. Test locally: svc local up');
        logger.info('3. Deploy when ready: svc deploy');
        logger.info(chalk_1.default.green('🎉 Your migration achieved zero CloudFormation changes!'));
    }
    else {
        logger.info(`1. Review template differences in: ${chalk_1.default.cyan(result.reportPath)}`);
        logger.info('2. Verify stateful resources maintain their logical IDs');
        logger.info('3. Test with: svc plan');
        logger.info('4. Compare with: cdk diff');
    }
    logger.info('');
    logger.info(chalk_1.default.dim('For detailed information, see the migration report.'));
}
