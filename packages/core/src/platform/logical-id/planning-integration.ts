/**
 * Planning Phase Integration for Logical ID Preservation
 * Integrates logical ID mapping with the planning phase to ensure zero drift
 */

import * as cdk from 'aws-cdk-lib';
import { Logger } from '../logger/src/index.ts';
import { LogicalIdManager, LogicalIdMap, LogicalIdPreservationAspect } from './logical-id-manager.ts';
import { ComponentContext } from '../contracts/component-interfaces.ts';

export interface PlanningContext {
  stackName: string;
  environment: string;
  logicalIdMapPath?: string;
  enableDriftAvoidance: boolean;
  validateBeforePlan: boolean;
}

export interface PlanningResult {
  success: boolean;
  logicalIdMap?: LogicalIdMap;
  appliedMappings: string[];
  driftAvoidanceReport?: any;
  template?: any;
  errors: string[];
  warnings: string[];
}

/**
 * Planning Phase Logical ID Integration
 * Handles logical ID preservation during the planning phase
 */
export class PlanningLogicalIdIntegration {
  private readonly logicalIdManager: LogicalIdManager;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.logicalIdManager = new LogicalIdManager(logger, {
      enableDeterministicNaming: true,
      preserveResourceOrder: true,
      validateBeforeApply: true,
      allowedResourceTypes: [],
      blockedResourceTypes: [
        'AWS::CloudFormation::Stack',
        'AWS::CDK::Metadata'
      ]
    });
  }

  /**
   * Apply logical ID preservation during planning phase
   */
  async applyLogicalIdPreservationToPlan(
    stack: cdk.Stack,
    context: PlanningContext
  ): Promise<PlanningResult> {
    const result: PlanningResult = {
      success: false,
      appliedMappings: [],
      errors: [],
      warnings: []
    };

    try {
      this.logger.info(`Applying logical ID preservation for planning phase: ${context.stackName}`);

      // Load existing logical ID map if available
      let logicalIdMap: LogicalIdMap | null = null;
      if (context.logicalIdMapPath) {
        logicalIdMap = await this.logicalIdManager.loadLogicalIdMap(context.logicalIdMapPath);
        if (logicalIdMap) {
          this.logger.info(`Loaded logical ID map with ${Object.keys(logicalIdMap.mappings).length} mappings`);
        } else {
          this.logger.warn(`Could not load logical ID map from: ${context.logicalIdMapPath}`);
        }
      }

      // If no logical ID map exists, create a new one
      if (!logicalIdMap) {
        logicalIdMap = this.logicalIdManager.generateLogicalIdMap(
          context.stackName,
          context.environment
        );
        this.logger.info('Created new logical ID map for planning phase');
      }

      // Apply logical ID preservation aspect
      const aspect = this.logicalIdManager.applyLogicalIdPreservation(stack, logicalIdMap);

      // Synthesize the stack to apply aspects
      const app = stack.node.root as cdk.App;
      const synthesizedStack = app.synth().getStackByName(stack.stackName);

      if (synthesizedStack) {
        result.template = synthesizedStack.template;
        result.appliedMappings = aspect.getAppliedMappings();
        result.logicalIdMap = logicalIdMap;

        // Generate drift avoidance report
        if (context.enableDriftAvoidance) {
          result.driftAvoidanceReport = this.logicalIdManager.generateDriftAvoidanceReport(
            logicalIdMap,
            result.appliedMappings
          );
        }

        // Validate the result
        if (context.validateBeforePlan) {
          const validationResult = this.validatePlanningResult(result);
          if (!validationResult.valid) {
            result.errors.push(...validationResult.errors);
            result.warnings.push(...validationResult.warnings);
          }
        }

        result.success = result.errors.length === 0;
        this.logger.info(`Planning phase logical ID preservation completed: ${result.appliedMappings.length} mappings applied`);
      } else {
        result.errors.push(`Failed to synthesize stack: ${stack.stackName}`);
      }

    } catch (error) {
      result.errors.push(`Planning phase logical ID preservation failed: ${error}`);
      this.logger.error(`Planning phase logical ID preservation failed: ${error}`);
    }

    return result;
  }

  /**
   * Generate planning report with logical ID preservation details
   */
  generatePlanningReport(planningResult: PlanningResult): string {
    const report: string[] = [];

    report.push('=== Logical ID Preservation Planning Report ===');
    report.push('');

    if (planningResult.success) {
      report.push('✅ Logical ID preservation applied successfully');
      report.push(`📊 Applied ${planningResult.appliedMappings.length} logical ID mappings`);

      if (planningResult.driftAvoidanceReport) {
        const summary = planningResult.driftAvoidanceReport.summary;
        report.push('');
        report.push('📈 Drift Avoidance Summary:');
        report.push(`   • Total mappings: ${summary.totalMappings}`);
        report.push(`   • Applied mappings: ${summary.appliedMappings}`);
        report.push(`   • Skipped mappings: ${summary.skippedMappings}`);
        report.push(`   • Deterministic naming: ${summary.deterministicNaming ? 'enabled' : 'disabled'}`);

        if (planningResult.driftAvoidanceReport.details.conflicts.length > 0) {
          report.push('');
          report.push('⚠️  Conflicts detected:');
          planningResult.driftAvoidanceReport.details.conflicts.forEach((conflict: string) => {
            report.push(`   • ${conflict}`);
          });
        }

        if (planningResult.driftAvoidanceReport.recommendations.length > 0) {
          report.push('');
          report.push('💡 Recommendations:');
          planningResult.driftAvoidanceReport.recommendations.forEach((rec: string) => {
            report.push(`   • ${rec}`);
          });
        }
      }
    } else {
      report.push('❌ Logical ID preservation failed');
      report.push('');
      report.push('Errors:');
      planningResult.errors.forEach(error => {
        report.push(`   • ${error}`);
      });
    }

    if (planningResult.warnings.length > 0) {
      report.push('');
      report.push('⚠️  Warnings:');
      planningResult.warnings.forEach(warning => {
        report.push(`   • ${warning}`);
      });
    }

    if (planningResult.appliedMappings.length > 0) {
      report.push('');
      report.push('🔗 Applied Mappings:');
      planningResult.appliedMappings.forEach(mapping => {
        report.push(`   • ${mapping}`);
      });
    }

    return report.join('\n');
  }

  /**
   * Validate planning result
   */
  private validatePlanningResult(planningResult: PlanningResult): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if template was generated
    if (!planningResult.template) {
      errors.push('No template generated during planning phase');
    }

    // Check if logical ID map exists
    if (!planningResult.logicalIdMap) {
      warnings.push('No logical ID map available - resources may not be preserved');
    }

    // Validate applied mappings
    if (planningResult.logicalIdMap && planningResult.appliedMappings.length === 0) {
      warnings.push('No logical ID mappings were applied - check mapping configuration');
    }

    // Check for template structure
    if (planningResult.template) {
      if (!planningResult.template.Resources) {
        errors.push('Generated template missing Resources section');
      } else {
        const resourceCount = Object.keys(planningResult.template.Resources).length;
        if (resourceCount === 0) {
          warnings.push('Generated template contains no resources');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Compare templates with and without logical ID preservation
   */
  async compareTemplatesWithAndWithoutPreservation(
    stack: cdk.Stack,
    context: PlanningContext
  ): Promise<{
    withPreservation: any;
    withoutPreservation: any;
    differences: string[];
  }> {
    this.logger.info('Comparing templates with and without logical ID preservation');

    // Generate template without preservation
    const appWithoutPreservation = new cdk.App();
    const stackWithoutPreservation = new cdk.Stack(appWithoutPreservation, 'ComparisonStack');

    // Copy constructs from original stack (simplified - in real implementation, you'd need to deep copy)
    // This is a placeholder for the actual implementation
    const templateWithoutPreservation = appWithoutPreservation.synth().getStackByName('ComparisonStack').template;

    // Generate template with preservation
    const planningResult = await this.applyLogicalIdPreservationToPlan(stack, context);
    const templateWithPreservation = planningResult.template;

    // Compare templates
    const differences = this.findTemplateDifferences(templateWithoutPreservation, templateWithPreservation);

    return {
      withPreservation: templateWithPreservation,
      withoutPreservation: templateWithoutPreservation,
      differences
    };
  }

  /**
   * Find differences between two CloudFormation templates
   */
  private findTemplateDifferences(template1: any, template2: any): string[] {
    const differences: string[] = [];

    // Compare Resources section
    const resources1 = template1.Resources || {};
    const resources2 = template2.Resources || {};

    const allResourceIds = new Set([
      ...Object.keys(resources1),
      ...Object.keys(resources2)
    ]);

    for (const resourceId of allResourceIds) {
      const resource1 = resources1[resourceId];
      const resource2 = resources2[resourceId];

      if (!resource1) {
        differences.push(`Resource ${resourceId} exists in template 2 but not in template 1`);
      } else if (!resource2) {
        differences.push(`Resource ${resourceId} exists in template 1 but not in template 2`);
      } else {
        // Compare resource properties (simplified comparison)
        if (resource1.Type !== resource2.Type) {
          differences.push(`Resource ${resourceId} has different types: ${resource1.Type} vs ${resource2.Type}`);
        }
      }
    }

    return differences;
  }

  /**
   * Save logical ID map for future use
   */
  async saveLogicalIdMapForPlanning(
    logicalIdMap: LogicalIdMap,
    context: PlanningContext
  ): Promise<void> {
    if (context.logicalIdMapPath) {
      await this.logicalIdManager.saveLogicalIdMap(logicalIdMap, context.logicalIdMapPath);
      this.logger.info(`Saved logical ID map for planning phase: ${context.logicalIdMapPath}`);
    }
  }

  /**
   * Load logical ID map for planning
   */
  async loadLogicalIdMapForPlanning(
    context: PlanningContext
  ): Promise<LogicalIdMap | null> {
    if (context.logicalIdMapPath) {
      return await this.logicalIdManager.loadLogicalIdMap(context.logicalIdMapPath);
    }
    return null;
  }
}
