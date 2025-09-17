/**
 * CLI Integration for Logical ID Preservation
 * Integrates logical ID preservation with the svc plan command
 */

import * as path from 'path';
import { Logger } from '../logger/src';
import { LogicalIdManager, LogicalIdMap } from './logical-id-manager';
import { PlanningLogicalIdIntegration, PlanningContext } from './planning-integration';
import { DriftAvoidanceEngine } from './drift-avoidance';

export interface LogicalIdCliOptions {
  stackName: string;
  environment: string;
  logicalIdMapPath?: string;
  enableDriftAvoidance: boolean;
  validateBeforePlan: boolean;
  outputFormat: 'json' | 'pretty' | 'table';
  saveLogicalIdMap?: boolean;
  compareTemplates?: boolean;
}

export interface LogicalIdCliResult {
  success: boolean;
  logicalIdMap?: LogicalIdMap;
  appliedMappings: string[];
  driftAnalysis?: any;
  template?: any;
  report: string;
  errors: string[];
  warnings: string[];
}

/**
 * CLI Integration for Logical ID Preservation
 * Handles logical ID preservation from command line interface
 */
export class LogicalIdCliIntegration {
  private readonly logger: Logger;
  private readonly logicalIdManager: LogicalIdManager;
  private readonly planningIntegration: PlanningLogicalIdIntegration;
  private readonly driftAvoidanceEngine: DriftAvoidanceEngine;

  constructor(logger: Logger) {
    this.logger = logger;
    this.logicalIdManager = new LogicalIdManager(logger);
    this.planningIntegration = new PlanningLogicalIdIntegration(logger);
    this.driftAvoidanceEngine = new DriftAvoidanceEngine(logger);
  }

  /**
   * Execute logical ID preservation for svc plan command
   */
  async executeLogicalIdPreservation(
    stack: any, // CDK Stack
    options: LogicalIdCliOptions
  ): Promise<LogicalIdCliResult> {
    this.logger.info(`Executing logical ID preservation for stack: ${options.stackName}`);

    const result: LogicalIdCliResult = {
      success: false,
      appliedMappings: [],
      report: '',
      errors: [],
      warnings: []
    };

    try {
      // Load or create logical ID map
      let logicalIdMap: LogicalIdMap | null = null;

      if (options.logicalIdMapPath) {
        logicalIdMap = await this.logicalIdManager.loadLogicalIdMap(options.logicalIdMapPath);
        if (logicalIdMap) {
          this.logger.info(`Loaded logical ID map with ${Object.keys(logicalIdMap.mappings).length} mappings`);
        } else {
          this.logger.warn(`Could not load logical ID map from: ${options.logicalIdMapPath}`);
        }
      }

      // Create new logical ID map if none exists
      if (!logicalIdMap) {
        logicalIdMap = this.logicalIdManager.generateLogicalIdMap(
          options.stackName,
          options.environment
        );
        this.logger.info('Created new logical ID map');
      }

      // Set up planning context
      const planningContext: PlanningContext = {
        stackName: options.stackName,
        environment: options.environment,
        logicalIdMapPath: options.logicalIdMapPath,
        enableDriftAvoidance: options.enableDriftAvoidance,
        validateBeforePlan: options.validateBeforePlan
      };

      // Apply logical ID preservation
      const planningResult = await this.planningIntegration.applyLogicalIdPreservationToPlan(
        stack,
        planningContext
      );

      result.success = planningResult.success;
      result.appliedMappings = planningResult.appliedMappings;
      result.logicalIdMap = planningResult.logicalIdMap;
      result.template = planningResult.template;
      result.errors = planningResult.errors;
      result.warnings = planningResult.warnings;

      // Perform drift analysis if enabled
      if (options.enableDriftAvoidance && logicalIdMap) {
        const driftAnalysis = this.driftAvoidanceEngine.analyzeDrift(stack, logicalIdMap);
        result.driftAnalysis = driftAnalysis;
      }

      // Generate report
      result.report = this.generateCliReport(planningResult, options);

      // Save logical ID map if requested
      if (options.saveLogicalIdMap && logicalIdMap && options.logicalIdMapPath) {
        await this.logicalIdManager.saveLogicalIdMap(logicalIdMap, options.logicalIdMapPath);
        this.logger.info(`Saved logical ID map to: ${options.logicalIdMapPath}`);
      }

      // Compare templates if requested
      if (options.compareTemplates) {
        const comparison = await this.planningIntegration.compareTemplatesWithAndWithoutPreservation(
          stack,
          planningContext
        );
        result.report += '\n\n' + this.generateComparisonReport(comparison);
      }

    } catch (error) {
      result.errors.push(`Logical ID preservation failed: ${error}`);
      this.logger.error(`Logical ID preservation failed: ${error}`);
    }

    return result;
  }

  /**
   * Generate CLI report
   */
  private generateCliReport(planningResult: any, options: LogicalIdCliOptions): string {
    const report: string[] = [];

    report.push('=== Logical ID Preservation Report ===');
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
      }
    } else {
      report.push('❌ Logical ID preservation failed');
      report.push('');
      report.push('Errors:');
      planningResult.errors.forEach((error: string) => {
        report.push(`   • ${error}`);
      });
    }

    if (planningResult.warnings.length > 0) {
      report.push('');
      report.push('⚠️  Warnings:');
      planningResult.warnings.forEach((warning: string) => {
        report.push(`   • ${warning}`);
      });
    }

    if (planningResult.appliedMappings.length > 0) {
      report.push('');
      report.push('🔗 Applied Mappings:');
      planningResult.appliedMappings.forEach((mapping: string) => {
        report.push(`   • ${mapping}`);
      });
    }

    // Add recommendations
    if (options.enableDriftAvoidance && planningResult.driftAvoidanceReport?.recommendations) {
      report.push('');
      report.push('💡 Recommendations:');
      planningResult.driftAvoidanceReport.recommendations.forEach((rec: string) => {
        report.push(`   • ${rec}`);
      });
    }

    return report.join('\n');
  }

  /**
   * Generate template comparison report
   */
  private generateComparisonReport(comparison: any): string {
    const report: string[] = [];

    report.push('=== Template Comparison Report ===');
    report.push('');

    if (comparison.differences.length === 0) {
      report.push('✅ Templates are identical - zero drift achieved!');
      report.push('🎉 Logical ID preservation is working correctly');
    } else {
      report.push(`⚠️  Found ${comparison.differences.length} differences between templates:`);
      report.push('');
      comparison.differences.forEach((diff: string) => {
        report.push(`   • ${diff}`);
      });
      report.push('');
      report.push('💡 These differences may indicate drift that needs to be addressed');
    }

    return report.join('\n');
  }

  /**
   * Validate logical ID map file
   */
  async validateLogicalIdMap(mapPath: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const logicalIdMap = await this.logicalIdManager.loadLogicalIdMap(mapPath);

    if (!logicalIdMap) {
      return {
        valid: false,
        issues: ['Could not load logical ID map file'],
        recommendations: ['Check file path and format']
      };
    }

    return this.driftAvoidanceEngine.validateDriftAvoidanceConfig(logicalIdMap);
  }

  /**
   * Generate logical ID map from existing template
   */
  async generateLogicalIdMapFromTemplate(
    templatePath: string,
    stackName: string,
    environment: string
  ): Promise<LogicalIdMap> {
    // This would analyze an existing CloudFormation template and generate mappings
    // For now, return a basic map structure
    return this.logicalIdManager.generateLogicalIdMap(stackName, environment);
  }

  /**
   * Check for logical ID map file in project
   */
  findLogicalIdMapFile(projectRoot: string): string | null {
    const possiblePaths = [
      path.join(projectRoot, 'logical-id-map.json'),
      path.join(projectRoot, '.shinobi', 'logical-id-map.json'),
      path.join(projectRoot, 'migration', 'logical-id-map.json')
    ];

    for (const mapPath of possiblePaths) {
      if (require('fs').existsSync(mapPath)) {
        return mapPath;
      }
    }

    return null;
  }

  /**
   * Initialize logical ID preservation for a project
   */
  async initializeLogicalIdPreservation(
    projectRoot: string,
    stackName: string,
    environment: string
  ): Promise<string> {
    const logicalIdMap = this.logicalIdManager.generateLogicalIdMap(stackName, environment);
    const mapPath = path.join(projectRoot, 'logical-id-map.json');

    await this.logicalIdManager.saveLogicalIdMap(logicalIdMap, mapPath);

    this.logger.info(`Initialized logical ID preservation: ${mapPath}`);
    return mapPath;
  }
}
