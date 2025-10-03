/**
 * Plan Output Formatter Service
 * Responsible for rendering synthesis results into user-friendly summaries
 */

import { Logger } from '../platform/logger/src/index.ts';

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
    cdkDiff: any,
    environment: string,
    complianceFramework: string
  ): string {
    const lines = [
      '=== Infrastructure Plan Summary ===',
      '',
      `Environment: ${environment}`,
      `Compliance Framework: ${complianceFramework}`,
      `Synthesis Time: ${synthesisResult.synthesisTime ?? 0}ms`,
      ''
    ];

    // Component summary
    lines.push('--- Components ---');
    const manifestComponents = Array.isArray(synthesisResult.resolvedManifest?.components)
      ? synthesisResult.resolvedManifest.components
      : [];

    if (manifestComponents.length > 0) {
      manifestComponents.forEach((component: any) => {
        const componentName = component.name || component.spec?.name || 'unnamed-component';
        const componentType = component.type || component.spec?.type || 'unknown';
        lines.push(`  • ${componentName} (${componentType})`);

        const config = component.config || component.spec?.config;
        if (config && Object.keys(config).length > 0) {
          lines.push(`    Config keys: ${Object.keys(config).join(', ')}`);
        }

        const tags = component.tags || component.spec?.tags;
        if (tags && Object.keys(tags).length > 0) {
          lines.push(`    Tags: ${Object.keys(tags).length} applied`);
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
    if (cdkDiff) {
      lines.push('', '--- Infrastructure Changes ---');
      if (cdkDiff.resources) {
        const added = Object.keys(cdkDiff.resources.added || {}).length;
        const modified = Object.keys(cdkDiff.resources.modified || {}).length;
        const removed = Object.keys(cdkDiff.resources.removed || {}).length;

        lines.push(`  Resources to add: ${added}`);
        lines.push(`  Resources to modify: ${modified}`);
        lines.push(`  Resources to remove: ${removed}`);

        if (added > 0) {
          lines.push('', '  New Resources:');
          const resources = Object.keys(cdkDiff.resources.added || {});

          // Group resources by component
          const groupedResources = this.groupResourcesByComponent(resources, synthesisResult.resolvedManifest?.components || []);

          groupedResources.forEach(group => {
            lines.push(`    + ${group.component}:`);
            group.resources.slice(0, 3).forEach(resource => {
              lines.push(`      • ${resource}`);
            });
            if (group.resources.length > 3) {
              lines.push(`      ... and ${group.resources.length - 3} more`);
            }
          });
        }
      }
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
  private buildStructuredData(synthesisResult: any, cdkDiff: any): any {
    const components = Array.isArray(synthesisResult.components)
      ? synthesisResult.components.map((component: any) => {
          if (typeof component.getType === 'function') {
            return {
              name: component.spec?.name ?? component.name,
              type: component.getType(),
              capabilities: typeof component.getCapabilities === 'function' ? component.getCapabilities() : [],
              constructs: typeof component.getAllConstructs === 'function'
                ? Object.fromEntries(component.getAllConstructs())
                : {}
            };
          }

          return {
            name: component.name,
            type: component.type,
            capabilities: component.capabilities || [],
            constructs: component.constructs || {}
          };
        })
      : [];

    return {
      components,
      bindings: synthesisResult.bindings || [],
      changes: cdkDiff || {},
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
  private collectWarnings(synthesisResult: any, cdkDiff: any): string[] {
    const warnings: string[] = [];

    // Check for potential issues in synthesis
    if (synthesisResult.synthesisTime > 5000) {
      warnings.push(`Synthesis took ${synthesisResult.synthesisTime}ms - consider optimizing component complexity`);
    }

    // Check CDK diff warnings
    if (cdkDiff?.security?.warnings) {
      warnings.push(...cdkDiff.security.warnings);
    }

    return warnings;
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
    if (!Array.isArray(synthesisResult.components) || synthesisResult.components.length === 0) {
      return false;
    }

    return synthesisResult.components.some((component: any) => {
      const constructSource =
        typeof component?.getAllConstructs === 'function'
          ? component.getAllConstructs()
          : component?.constructs;

      if (!constructSource) {
        return false;
      }

      const entries: Iterable<[string, any]> =
        typeof (constructSource as any)[Symbol.iterator] === 'function'
          ? (constructSource as Iterable<[string, any]>)
          : Object.entries(constructSource as Record<string, any>);

      for (const [handle, construct] of entries) {
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
