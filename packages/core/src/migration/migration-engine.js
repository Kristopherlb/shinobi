/**
 * Platform Migration Engine
 * Implements the 4-phase migration workflow for CDK -> Platform conversion
 */
import { CloudFormationAnalyzer } from './cloudformation-analyzer.js';
import { ResourceMapper } from './resource-mapper.js';
import { LogicalIdPreserver } from './logical-id-preserver.js';
import { MigrationValidator } from './migration-validator.js';
import { MigrationReporter } from './migration-reporter.js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
/**
 * Main migration engine orchestrating the 4-phase process
 */
export class MigrationEngine {
    logger;
    analyzer;
    mapper;
    preserver;
    validator;
    reporter;
    constructor(logger) {
        this.logger = logger;
        this.analyzer = new CloudFormationAnalyzer(logger);
        this.mapper = new ResourceMapper(logger);
        this.preserver = new LogicalIdPreserver(logger);
        this.validator = new MigrationValidator(logger);
        this.reporter = new MigrationReporter(logger);
    }
    /**
     * Execute the complete 4-phase migration process
     */
    async migrate(options) {
        this.logger.info(`Starting migration: '${options.stackName}' -> '${options.serviceName}'`);
        try {
            // Phase 1: Analysis (Read-Only)
            this.logger.info('(1/4) Analyzing existing stack...');
            const analysisResult = await this.analyzer.analyzeStack(options.cdkProjectPath, options.stackName);
            this.logger.success(`Found ${analysisResult.resources.length} resources.`);
            // Phase 2: Mapping & Manifest Generation
            this.logger.info('(2/4) Mapping resources and generating manifest...');
            const mappingResult = await this.mapper.mapResources(analysisResult, options.serviceName, options.complianceFramework || 'commercial');
            this.logger.success(`Mapped ${mappingResult.mappedResources.length} resources to ${mappingResult.components.length} components.`);
            if (mappingResult.unmappableResources.length > 0) {
                this.logger.warn(`Flagged ${mappingResult.unmappableResources.length} resources as unmappable.`);
            }
            // Phase 3: Logical ID Preservation
            this.logger.info('(3/4) Generating Logical ID map...');
            const preservationResult = await this.preserver.generateLogicalIdMap(analysisResult, mappingResult);
            this.logger.success('Logical ID mapping generated.');
            // Create output directory and generate files
            const outputDir = this.createOutputDirectory(options.outputPath);
            const generatedFiles = await this.generateFiles(outputDir, mappingResult, preservationResult, options);
            // Phase 4: Validation & Reporting
            this.logger.info('(4/4) Validating migrated stack...');
            const validationResult = await this.validator.validateMigration(outputDir, analysisResult.templatePath, options);
            // Generate comprehensive report
            const reportPath = await this.reporter.generateReport(outputDir, analysisResult, mappingResult, validationResult, options);
            const result = {
                success: validationResult.success,
                phase: 'complete',
                resourcesFound: analysisResult.resources.length,
                resourcesMapped: mappingResult.mappedResources.length,
                resourcesUnmappable: mappingResult.unmappableResources.length,
                finalDiffResult: validationResult.diffResult,
                reportPath,
                generatedFiles,
                unmappableResources: mappingResult.unmappableResources
            };
            this.logger.success('Migration Complete!');
            this.logger.info(`Final Diff Result: ${result.finalDiffResult}`);
            this.logger.info(`Report Location: ${reportPath}`);
            if (result.unmappableResources.length > 0) {
                this.logger.warn('Next Steps: Review the report and manually migrate unmappable resources.');
            }
            return result;
        }
        catch (error) {
            this.logger.error('Migration failed:', error);
            throw error;
        }
    }
    createOutputDirectory(outputPath) {
        if (fs.existsSync(outputPath)) {
            throw new Error(`Output directory '${outputPath}' already exists. Please choose a different path or remove the existing directory.`);
        }
        fs.mkdirSync(outputPath, { recursive: true });
        // Create standard directory structure
        fs.mkdirSync(path.join(outputPath, 'src'), { recursive: true });
        return outputPath;
    }
    async generateFiles(outputDir, mappingResult, preservationResult, options) {
        const generatedFiles = [];
        // Generate service.yml
        const serviceManifest = {
            service: options.serviceName,
            owner: 'migrated-from-cdk', // User should update this
            complianceFramework: options.complianceFramework || 'commercial',
            components: mappingResult.components,
            ...(mappingResult.bindings.length > 0 && { bindings: mappingResult.bindings })
        };
        const serviceYmlPath = path.join(outputDir, 'service.yml');
        fs.writeFileSync(serviceYmlPath, yaml.stringify(serviceManifest));
        generatedFiles.push(serviceYmlPath);
        // Generate logical-id-map.json
        const logicalIdMapPath = path.join(outputDir, 'logical-id-map.json');
        fs.writeFileSync(logicalIdMapPath, JSON.stringify(preservationResult.logicalIdMap, null, 2));
        generatedFiles.push(logicalIdMapPath);
        // Generate patches.ts template
        const patchesPath = path.join(outputDir, 'patches.ts');
        const patchesTemplate = this.generatePatchesTemplate(mappingResult.unmappableResources);
        fs.writeFileSync(patchesPath, patchesTemplate);
        generatedFiles.push(patchesPath);
        // Copy source code if it exists
        const originalSrcPath = path.join(options.cdkProjectPath, 'src');
        if (fs.existsSync(originalSrcPath)) {
            this.copyDirectory(originalSrcPath, path.join(outputDir, 'src'));
            generatedFiles.push(path.join(outputDir, 'src'));
        }
        // Generate basic .gitignore
        const gitignorePath = path.join(outputDir, '.gitignore');
        fs.writeFileSync(gitignorePath, this.generateGitignoreTemplate());
        generatedFiles.push(gitignorePath);
        return generatedFiles;
    }
    generatePatchesTemplate(unmappableResources) {
        const hasUnmappable = unmappableResources.length > 0;
        return `/**
 * Patches for migrated service
 * ${hasUnmappable ? 'Contains unmappable resources that require manual migration' : 'No unmappable resources - this file can be deleted if unused'}
 */

import * as cdk from 'aws-cdk-lib';

export const patchInfo = {
  name: 'Migration Patches',
  version: '1.0.0',
  description: 'Patches for resources that could not be automatically migrated',
  author: 'migration-tool'
};

export async function applyPatches(context: any) {
  const { stack, components, config, constructs } = context;
  
  ${hasUnmappable ? '// TODO: Manually add the following unmappable resources:' : '// No patches required - migration was complete'}
  
${unmappableResources.map(resource => `
  // ${resource.logicalId} (${resource.type})
  // Reason: ${resource.reason}
  // Suggested Action: ${resource.suggestedAction}
  /*
  ${JSON.stringify(resource.cfnDefinition, null, 2)}
  */
`).join('\n')}

  return {
    resourcesAdded: ${hasUnmappable ? unmappableResources.map(r => `'${r.type}'`).join(', ') : '/* none */'},
    patchesApplied: ${unmappableResources.length}
  };
}
`;
    }
    generateGitignoreTemplate() {
        return `# Platform migration artifacts
MIGRATION_REPORT.md

# CDK build artifacts
cdk.out/
*.js
*.d.ts
node_modules/

# Logs
*.log
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
    }
    copyDirectory(source, destination) {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }
        const items = fs.readdirSync(source);
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const destPath = path.join(destination, item);
            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, destPath);
            }
            else {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }
}
//# sourceMappingURL=migration-engine.js.map