/**
 * Plan Output Formatter Service
 * Responsible for rendering synthesis results into user-friendly summaries
 */

import { Logger } from '../cli/simple-console-logger';

export interface PlanOutputFormatterDependencies {
  logger: Logger;
}

export interface FormatterInput {
  synthesisResult: any;
  cdkDiff?: any;
  buildSummary?: any;
  cdkNagReport?: any;
  environment: string;
  complianceFramework: string;
}

export interface FormattedOutput {
  userFriendlySummary: string;
  structuredData: any;
  recommendations: string[];
  warnings: string[];
}

/**
 * Service for formatting and rendering plan outputs
 */
export class PlanOutputFormatter {
  constructor(private dependencies: PlanOutputFormatterDependencies) { }

  /**
   * Format synthesis results into comprehensive user-friendly output
   */
  formatPlanOutput(input: FormatterInput): FormattedOutput {
    const { synthesisResult, cdkDiff, environment, complianceFramework } = input;

    // Debug logging
    console.log('DEBUG: synthesisResult.resolvedManifest:', synthesisResult.resolvedManifest);
    console.log('DEBUG: components:', synthesisResult.resolvedManifest?.components);

    // Build user-friendly summary
    const summary = this.buildUserFriendlySummary(synthesisResult, cdkDiff, environment, complianceFramework);

    // Extract structured data for programmatic access
    const structuredData = this.buildStructuredData(synthesisResult, cdkDiff);

    // Generate recommendations based on analysis
    const recommendations = this.generateRecommendations(synthesisResult, complianceFramework);

    // Collect warnings from various sources
    const warnings = this.collectWarnings(synthesisResult, cdkDiff);

    return {
      userFriendlySummary: summary,
      structuredData,
      recommendations,
      warnings
    };
  }

  /**
   * Build comprehensive user-friendly summary
   */
  private buildUserFriendlySummary(
    synthesisResult: any,
    cdkDiff: Record<string, any> | undefined,
    environment: string,
    complianceFramework: string
  ): string {
    const lines = [
      '=== Infrastructure Plan Summary ===',
      '',
      `Environment: ${environment}`,
      `Compliance Framework: ${complianceFramework}`,
      `Synthesis Time: ${synthesisResult.synthesisTime}ms`,
      ''
    ];

    // Component summary
    lines.push('--- Components ---');
    if (synthesisResult.resolvedManifest?.components && synthesisResult.resolvedManifest.components.length > 0) {
      synthesisResult.resolvedManifest.components.forEach((component: any) => {
        lines.push(`  • ${component.name} (${component.type})`);

        if (component.config) {
          const configKeys = Object.keys(component.config);
          if (configKeys.length > 0) {
            lines.push(`    Config: ${configKeys.join(', ')}`);
          }
        }

        if (component.tags) {
          const tagCount = Object.keys(component.tags).length;
          lines.push(`    Tags: ${tagCount} applied`);
        }
      });
    } else {
      lines.push('  No components defined');
    }

    // Bindings summary
    lines.push('', '--- Component Bindings ---');
    if (synthesisResult.resolvedManifest?.binds && synthesisResult.resolvedManifest.binds.length > 0) {
      synthesisResult.resolvedManifest.binds.forEach((binding: any) => {
        lines.push(`  • ${binding.from} → ${binding.to} (${binding.capability})`);
      });
    } else {
      lines.push('  No component bindings defined');
    }

    // CDK diff summary
    const diffSummary = this.summarizeDiffMap(cdkDiff);
    if (diffSummary.stacks.length > 0) {
      lines.push('', '--- Infrastructure Changes ---');
      lines.push(`  Total resources to add: ${diffSummary.totals.added}`);
      lines.push(`  Total resources to modify: ${diffSummary.totals.modified}`);
      lines.push(`  Total resources to remove: ${diffSummary.totals.removed}`);

      diffSummary.stacks.forEach(stackDiff => {
        lines.push('', `  Stack: ${stackDiff.stackName}`);
        lines.push(`    Resources to add: ${stackDiff.changes.added}`);
        lines.push(`    Resources to modify: ${stackDiff.changes.modified}`);
        lines.push(`    Resources to remove: ${stackDiff.changes.removed}`);

        if (stackDiff.changes.added > 0) {
          lines.push('    New Resources:');
          const resources = Object.keys(stackDiff.resources.added || {});
          const groupedResources = this.groupResourcesByComponent(
            resources,
            synthesisResult.resolvedManifest?.components || []
          );

          groupedResources.forEach(group => {
            lines.push(`      + ${group.component}:`);
            group.resources.slice(0, 3).forEach(resource => {
              lines.push(`        • ${resource}`);
            });
            if (group.resources.length > 3) {
              lines.push(`        ... and ${group.resources.length - 3} more`);
            }
          });
        }

        if (!stackDiff.hasChanges) {
          lines.push('    No infrastructure changes detected for this stack');
        }
      });
    }

    // Cost estimation
    const costEstimate = this.estimateCosts(synthesisResult.resolvedManifest?.components || []);
    if (costEstimate.total > 0) {
      lines.push('', '--- Cost Estimation ---');
      lines.push(`  Monthly Cost: ~$${costEstimate.total.toFixed(2)}`);
      costEstimate.breakdown.forEach(item => {
        lines.push(`  ${item.component}: $${item.cost.toFixed(2)}`);
      });
    }

    // Patches summary
    if (synthesisResult.patchesApplied) {
      lines.push('', '--- Escape Hatch (Patches) ---');
      lines.push('  ⚠️  Custom patches detected and applied');
      lines.push('  📋 Review patches.ts for manual CDK modifications');
    }

    return lines.join('\n');
  }

  /**
   * Build structured data for programmatic access
   */
  private buildStructuredData(synthesisResult: any, cdkDiff: Record<string, any> | undefined): any {
    const diffSummary = this.summarizeDiffMap(cdkDiff);
    return {
      components: synthesisResult.components?.map((component: any) => ({
        name: component.spec.name,
        type: component.getType(),
        capabilities: component.getCapabilities(),
        constructs: Object.fromEntries(component.getAllConstructs())
      })) || [],
      bindings: synthesisResult.bindings || [],
      changes: diffSummary,
      changesByStack: cdkDiff || {},
      stacks: synthesisResult.stacks?.map((stack: any) => stack.stackName) || [],
      patchesApplied: synthesisResult.patchesApplied,
      synthesisTime: synthesisResult.synthesisTime
    };
  }

  /**
   * Generate framework-specific recommendations
   */
  private generateRecommendations(synthesisResult: any, complianceFramework: string): string[] {
    const recommendations: string[] = [];

    if (complianceFramework.startsWith('fedramp')) {
      recommendations.push('✓ FedRAMP compliance framework detected - enhanced security controls applied');

      if (complianceFramework === 'fedramp-high') {
        recommendations.push('🔒 FedRAMP High requires additional network isolation - verify VPC configuration');
      }

      // Check for encryption
      const hasUnencryptedResources = this.checkForUnencryptedResources(synthesisResult);
      if (hasUnencryptedResources) {
        recommendations.push('⚠️  Ensure all data at rest is encrypted for FedRAMP compliance');
      }
    }

    // Check for patches
    if (synthesisResult.patchesApplied) {
      recommendations.push('📋 Custom patches detected - ensure they maintain compliance requirements');
      recommendations.push('🧪 Test patches thoroughly in non-production environments first');
    }

    // Resource optimization
    const componentCount = synthesisResult.components?.length || 0;
    if (componentCount > 10) {
      recommendations.push('📊 Consider breaking large services into smaller, focused microservices');
    }

    return recommendations;
  }

  /**
   * Collect warnings from various sources
   */
  private collectWarnings(synthesisResult: any, cdkDiff: Record<string, any> | undefined): string[] {
    const warnings: string[] = [];

    // Check for potential issues in synthesis
    if (synthesisResult.synthesisTime > 5000) {
      warnings.push(`Synthesis took ${synthesisResult.synthesisTime}ms - consider optimizing component complexity`);
    }

    // Check CDK diff warnings
    if (cdkDiff) {
      Object.values(cdkDiff).forEach(diff => {
        if (diff?.security?.warnings) {
          warnings.push(...diff.security.warnings);
        }
      });
    }

    return warnings;
  }

  private summarizeDiffMap(cdkDiff: Record<string, any> | undefined): {
    stacks: Array<{
      stackName: string;
      hasChanges: boolean;
      changes: { added: number; modified: number; removed: number; total: number };
      resources: { added: Record<string, any>; modified: Record<string, any>; removed: Record<string, any> };
    }>;
    totals: { added: number; modified: number; removed: number; total: number };
    hasChanges: boolean;
  } {
    const stacks: Array<{
      stackName: string;
      hasChanges: boolean;
      changes: { added: number; modified: number; removed: number; total: number };
      resources: { added: Record<string, any>; modified: Record<string, any>; removed: Record<string, any> };
    }> = [];
    const totals = { added: 0, modified: 0, removed: 0, total: 0 };
    let hasChanges = false;

    if (!cdkDiff) {
      return { stacks, totals, hasChanges };
    }

    Object.entries(cdkDiff).forEach(([stackName, diff]) => {
      if (!diff) {
        return;
      }

      const resources = {
        added: diff.resources?.added || {},
        modified: diff.resources?.modified || {},
        removed: diff.resources?.removed || {}
      };

      const added = diff.changes?.added ?? Object.keys(resources.added).length;
      const modified = diff.changes?.modified ?? Object.keys(resources.modified).length;
      const removed = diff.changes?.removed ?? Object.keys(resources.removed).length;
      const total = diff.changes?.total ?? added + modified + removed;
      const stackHasChanges = diff.hasChanges ?? total > 0;

      stacks.push({
        stackName,
        hasChanges: stackHasChanges,
        changes: { added, modified, removed, total },
        resources
      });

      totals.added += added;
      totals.modified += modified;
      totals.removed += removed;
      hasChanges = hasChanges || stackHasChanges;
    });

    totals.total = totals.added + totals.modified + totals.removed;

    return { stacks, totals, hasChanges };
  }

  /**
   * Group resources by component for better display
   */
  private groupResourcesByComponent(resources: string[], components: any[]): Array<{ component: string, resources: string[] }> {
    const groups: { [key: string]: string[] } = {};

    // Initialize groups for each component
    components.forEach(component => {
      const componentName = component.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      groups[component.name] = [];
    });

    // Group resources by component name pattern
    resources.forEach(resource => {
      let assigned = false;
      for (const component of components) {
        const componentName = component.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (resource.toLowerCase().includes(componentName)) {
          groups[component.name].push(resource);
          assigned = true;
          break;
        }
      }

      // If no component match, put in "Other" group
      if (!assigned) {
        if (!groups['Other']) groups['Other'] = [];
        groups['Other'].push(resource);
      }
    });

    // Convert to array format
    return Object.entries(groups)
      .filter(([_, resources]) => resources.length > 0)
      .map(([component, resources]) => ({ component, resources }));
  }

  /**
   * Estimate costs for components
   */
  private estimateCosts(components: any[]): { total: number, breakdown: Array<{ component: string, cost: number }> } {
    const breakdown: Array<{ component: string, cost: number }> = [];
    let total = 0;

    components.forEach(component => {
      let cost = 0;

      switch (component.type) {
        case 'ec2-instance':
          const instanceType = component.config?.instanceType || 't3.micro';
          cost = this.getEC2Cost(instanceType);
          break;
        case 's3-bucket':
          cost = 2.30; // S3 standard storage
          break;
        case 'rds-postgres':
          cost = 15.00; // RDS t3.micro
          break;
        case 'lambda-api':
          cost = 1.00; // Lambda execution
          break;
        case 'elasticache-redis':
          cost = 8.00; // ElastiCache t3.micro
          break;
        default:
          cost = 5.00; // Default estimate
      }

      if (cost > 0) {
        breakdown.push({ component: component.name, cost });
        total += cost;
      }
    });

    return { total, breakdown };
  }

  /**
   * Get EC2 instance cost based on type
   */
  private getEC2Cost(instanceType: string): number {
    const costs: { [key: string]: number } = {
      't3.micro': 8.50,
      't3.small': 17.00,
      't3.medium': 34.00,
      't3.large': 68.00,
      'm5.large': 77.00,
      'm5.xlarge': 154.00
    };

    return costs[instanceType] || 10.00;
  }

  /**
   * Check for resources that should be encrypted in compliance frameworks
   */
  private checkForUnencryptedResources(synthesisResult: any): boolean {
    if (!synthesisResult.components) return false;

    return synthesisResult.components.some((component: any) => {
      const constructs = component.getAllConstructs();
      for (const [handle, construct] of constructs) {
        if (handle.includes('rds.DatabaseInstance') &&
          construct.properties?.storageEncrypted === false) {
          return true;
        }
        if (handle.includes('s3.Bucket') &&
          !construct.properties?.encryptionConfiguration) {
          return true;
        }
      }
      return false;
    });
  }
}