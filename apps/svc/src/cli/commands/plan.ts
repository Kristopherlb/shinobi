/**
 * svc plan Command Implementation
 * 
 * Generates a comprehensive plan of changes and configurations with
 * structured output for CI/CD integration and compliance auditing.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  PlanArtifact,
  ComponentPlanArtifact,
  PlanSummary,
  ValidationResult,
  ComplianceSummary,
  CLIOutputOptions,
  CLIOutputFormat
} from '@shinobi/core';
import { ServiceManifestParser } from '@shinobi/core';
import { ManifestParser } from '@shinobi/core';
import { ComponentFactory } from '@shinobi/core';
import { ComplianceControlMappingService } from '@shinobi/core';
import { TaggingEnforcementService } from '@shinobi/core';
import { CompliancePlanGenerator } from '@shinobi/core';
import { ArtifactWriter } from '@shinobi/core';
import { StandardArtifactWriter } from '@shinobi/core';
import { ArtifactSerializerFactory } from '@shinobi/core';

interface PlanCommandOptions {
  env?: string;
  json?: boolean;
  output?: string;
  quiet?: boolean;
  verbose?: boolean;
  color?: boolean;
  includeCompliance?: boolean;
  includeCosts?: boolean;
}

export class PlanCommand {
  private manifestParser: ManifestParser;
  private serviceManifestParser: ServiceManifestParser;
  private componentFactory: ComponentFactory;
  private complianceService: ComplianceControlMappingService;
  private taggingService: TaggingEnforcementService;
  private compliancePlanGenerator: CompliancePlanGenerator;
  private artifactWriter: ArtifactWriter;

  constructor() {
    this.componentFactory = new ComponentFactory(
      new (require('../../platform/contracts/components/component-registry').ComponentRegistry)(),
      new (require('../../platform/contracts/components/component-config-builder').ComponentConfigBuilder)()
    );
    this.manifestParser = new ManifestParser({ logger: console as any });
    this.serviceManifestParser = new ServiceManifestParser(this.componentFactory);
    this.complianceService = new ComplianceControlMappingService();
    this.taggingService = new TaggingEnforcementService();
    this.compliancePlanGenerator = new CompliancePlanGenerator();
    this.artifactWriter = new StandardArtifactWriter();
  }

  async execute(manifestPath: string, options: PlanCommandOptions): Promise<void> {
    try {
      // Parse manifest
      const rawManifest = await this.manifestParser.parseManifest(manifestPath);
      const environment = options.env || 'dev';
      const parsedResult = this.serviceManifestParser.parseManifest(rawManifest, environment);

      // Validate manifest
      const validation = await this.validateManifest(rawManifest);
      if (!validation.valid && !options.verbose) {
        console.error('❌ Manifest validation failed:');
        validation.errors.forEach(error => {
          console.error(`  - ${error.message}`);
        });
        process.exit(1);
      }

      // Generate plan artifact
      const planArtifact = await this.generatePlanArtifact(rawManifest, parsedResult, options);

      // Write artifacts
      const outputDir = options.output || './.shinobi/plan';
      const writtenFiles = await this.artifactWriter.writePlanArtifact(planArtifact, outputDir);

      // Output to console
      await this.outputToConsole(planArtifact, options);

      // Output file summary
      if (!options.quiet) {
        console.log(`\n📁 Plan artifacts written to: ${outputDir}`);
        console.log(`   Files created: ${writtenFiles.length}`);
        if (options.verbose) {
          writtenFiles.forEach((file: string) => console.log(`   - ${file}`));
        }
      }

    } catch (error) {
      console.error('❌ Plan generation failed:', error);
      process.exit(1);
    }
  }

  private async validateManifest(manifest: any): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const complianceErrors: any[] = [];

    // Basic manifest validation
    if (!manifest.manifestVersion) {
      errors.push({ field: 'manifestVersion', message: 'Manifest version is required' });
    }

    if (!manifest.service?.name) {
      errors.push({ field: 'service.name', message: 'Service name is required' });
    }

    if (!manifest.service?.owner) {
      errors.push({ field: 'service.owner', message: 'Service owner is required' });
    }

    // Component validation
    if (manifest.components) {
      for (const component of manifest.components) {
        // Validate component structure
        if (!component.name) {
          errors.push({
            componentId: component.name,
            field: 'name',
            message: 'Component name is required'
          });
        }

        if (!component.type) {
          errors.push({
            componentId: component.name,
            field: 'type',
            message: 'Component type is required'
          });
        }

        // Validate data classification for data stores
        const isDataClassificationRequired = this.taggingService.isDataClassificationRequired(component.type);
        if (isDataClassificationRequired && !component.labels?.dataClassification) {
          errors.push({
            componentId: component.name,
            field: 'labels.dataClassification',
            message: `Data classification is required for ${component.type} components`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      complianceErrors
    };
  }

  private async generatePlanArtifact(manifest: any, parsedResult: any, options: PlanCommandOptions): Promise<PlanArtifact> {
    const environment = options.env || 'dev';
    const complianceFramework = manifest.service?.complianceFramework || 'commercial';

    // Generate component plans
    const componentPlans: ComponentPlanArtifact[] = [];

    if (parsedResult.components) {
      for (const [componentId, component] of parsedResult.components) {
        try {

          // Generate compliance plan (mock for now)
          const compliancePlan = `Mock compliance plan for ${componentId}`;

          // Get compliance controls (mock for now)
          const complianceControls = ['AC-2', 'SC-7', 'SI-3'];

          // Generate component plan
          const componentPlan: ComponentPlanArtifact = {
            componentId,
            componentType: 's3-bucket' as any, // Mock type
            config: {
              final: { componentId, type: 'mock' },
              appliedDefaults: {}, // TODO: Extract from config builder
              environmentOverrides: {}, // TODO: Extract from config builder
              complianceDefaults: {} // TODO: Extract from config builder
            },
            complianceControls,
            compliancePlan: JSON.stringify(compliancePlan, null, 2),
            dependencies: [], // TODO: Extract from bindings
            resources: [], // Mock resources
            changes: {
              added: [],
              modified: [],
              removed: [],
              unchanged: []
            }
          };

          componentPlans.push(componentPlan);
        } catch (error) {
          console.warn(`⚠️  Failed to generate plan for component ${componentId}: ${error}`);
        }
      }
    }

    // Generate summary
    const summary = this.generatePlanSummary(componentPlans, manifest);

    // Generate validation result
    const validation = await this.validateManifest(manifest);

    // Generate compliance summary
    const compliance = await this.generateComplianceSummary(componentPlans, complianceFramework);

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      command: 'plan',
      environment,
      serviceName: manifest.service.name,
      complianceFramework,
      components: componentPlans,
      summary,
      validation,
      compliance
    };
  }

  private async generatePlannedResources(component: any): Promise<any[]> {
    // TODO: Extract planned resources from component synthesis
    // This would involve analyzing the CDK constructs that would be created
    return [];
  }

  private generatePlanSummary(components: ComponentPlanArtifact[], manifest: any): PlanSummary {
    const totalResources = components.reduce((sum, comp) => sum + comp.resources.length, 0);

    return {
      totalComponents: components.length,
      totalResources,
      changes: {
        added: [],
        modified: [],
        removed: [],
        unchanged: []
      },
      complianceStatus: 'compliant', // TODO: Calculate based on validation
      warnings: [],
      errors: []
    };
  }

  private async generateComplianceSummary(components: ComponentPlanArtifact[], framework: string): Promise<ComplianceSummary> {
    const controls = new Set<string>();
    let compliantComponents = 0;
    let nonCompliantComponents = 0;
    let partialCompliantComponents = 0;

    for (const component of components) {
      component.complianceControls.forEach(control => controls.add(control));
      // TODO: Determine compliance status for each component
      compliantComponents++;
    }

    return {
      framework: framework as any,
      totalControls: controls.size,
      compliantComponents,
      nonCompliantComponents,
      partialCompliantComponents,
      controls: Array.from(controls).map(controlId => ({
        controlId,
        title: this.complianceService.getNISTControl(controlId)?.title || controlId,
        affectedComponents: components.filter(c => c.complianceControls.includes(controlId)).length,
        complianceStatus: 'compliant' as const
      }))
    };
  }

  private async outputToConsole(artifact: PlanArtifact, options: PlanCommandOptions): Promise<void> {
    if (options.quiet) return;

    const outputFormat: CLIOutputFormat = {
      format: options.json ? 'json' : 'table',
      includeDetails: options.verbose || false,
      includeCompliance: options.includeCompliance || false,
      includeCosts: options.includeCosts || false
    };

    if (outputFormat.format === 'json') {
      const serializer = ArtifactSerializerFactory.create('json');
      console.log(serializer.serialize(artifact));
    } else {
      // Human-readable output
      console.log(`📋 Plan for ${artifact.serviceName} (${artifact.environment})`);
      console.log(`   Framework: ${artifact.complianceFramework}`);
      console.log(`   Components: ${artifact.summary.totalComponents}`);
      console.log(`   Resources: ${artifact.summary.totalResources}`);
      console.log(`   Status: ${artifact.validation.valid ? '✅ Valid' : '❌ Invalid'}`);

      if (artifact.validation.errors.length > 0) {
        console.log('\n❌ Validation Errors:');
        artifact.validation.errors.forEach(error => {
          console.log(`   - ${error.message}`);
        });
      }

      if (artifact.components.length > 0) {
        console.log('\n📦 Components:');
        artifact.components.forEach(component => {
          console.log(`   - ${component.componentId} (${component.componentType})`);
          if (outputFormat.includeCompliance) {
            console.log(`     Controls: ${component.complianceControls.join(', ')}`);
          }
        });
      }
    }
  }
}

export function createPlanCommand(): Command {
  const command = new Command('plan');
  const planCommand = new PlanCommand();

  command
    .description('Generate a comprehensive plan of changes and configurations')
    .argument('<manifest>', 'Path to service manifest file')
    .option('-e, --env <environment>', 'Environment to plan for', 'dev')
    .option('--json', 'Output in JSON format')
    .option('-o, --output <path>', 'Output directory for artifacts', './.shinobi/plan')
    .option('-q, --quiet', 'Suppress console output')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-color', 'Disable colored output')
    .option('--include-compliance', 'Include compliance details')
    .option('--include-costs', 'Include cost estimates')
    .action(async (manifest: string, options: PlanCommandOptions) => {
      await planCommand.execute(manifest, options);
    });

  return command;
}
