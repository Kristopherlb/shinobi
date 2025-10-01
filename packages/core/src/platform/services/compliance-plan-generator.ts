/**
 * Compliance Plan Generator
 * 
 * Generates and persists compliance plans for components,
 * including control mappings and audit information.
 */

import { ComponentType, ComplianceFramework } from '../contracts/bindings.js';
import { ComplianceControlMappingService, CompliancePlan } from './compliance-control-mapping.js';
import { TaggingEnforcementService } from './tagging-enforcement.js';
import * as fs from 'fs';
import * as path from 'path';

export interface CompliancePlanConfig {
  outputDir: string;
  includeAuditTrail: boolean;
  includeControlDetails: boolean;
  includeTaggingPolicy: boolean;
}

export class CompliancePlanGenerator {
  private controlMappingService: ComplianceControlMappingService;
  private taggingService: TaggingEnforcementService;

  constructor() {
    this.controlMappingService = new ComplianceControlMappingService();
    this.taggingService = new TaggingEnforcementService();
  }

  /**
   * Generate and persist compliance plan for a component
   */
  async generateCompliancePlan(
    componentId: string,
    componentType: ComponentType,
    framework: ComplianceFramework,
    componentConfig: any,
    config: CompliancePlanConfig
  ): Promise<CompliancePlan> {
    // Generate the compliance plan
    const plan = this.controlMappingService.generateCompliancePlan(
      componentId,
      componentType,
      framework,
      componentConfig
    );

    // Add tagging policy if requested
    if (config.includeTaggingPolicy) {
      const taggingPolicy = this.taggingService.generateTaggingPolicy(
        componentType,
        {
          service: componentConfig.service || 'unknown',
          environment: componentConfig.environment || 'unknown',
          owner: componentConfig.owner || 'unknown',
          complianceFramework: framework,
          dataClassification: componentConfig.dataClassification,
          sspId: componentConfig.sspId
        }
      );

      (plan as any).taggingPolicy = taggingPolicy;
    }

    // Add audit trail if requested
    if (config.includeAuditTrail) {
      (plan as any).auditTrail = {
        generatedBy: 'Shinobi Platform',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'component-synthesis'
      };
    }

    // Persist the plan
    await this.persistCompliancePlan(componentId, plan, config);

    return plan;
  }

  /**
   * Persist compliance plan to file
   */
  private async persistCompliancePlan(
    componentId: string,
    plan: CompliancePlan,
    config: CompliancePlanConfig
  ): Promise<void> {
    const fileName = `${componentId}.plan.json`;
    const filePath = path.join(config.outputDir, fileName);

    // Ensure output directory exists
    await fs.promises.mkdir(config.outputDir, { recursive: true });

    // Write the plan to file
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(plan, null, 2),
      'utf8'
    );
  }

  /**
   * Generate compliance summary for all components
   */
  async generateComplianceSummary(
    components: Array<{
      id: string;
      type: ComponentType;
      framework: ComplianceFramework;
      config: any;
    }>,
    config: CompliancePlanConfig
  ): Promise<{
    summary: {
      totalComponents: number;
      frameworks: Record<ComplianceFramework, number>;
      controls: Record<string, number>;
      dataClassifications: Record<string, number>;
    };
    components: Array<{
      id: string;
      type: ComponentType;
      framework: ComplianceFramework;
      controls: string[];
      dataClassification?: string;
      complianceStatus: 'compliant' | 'non-compliant' | 'partial';
    }>;
  }> {
    const summary = {
      totalComponents: components.length,
      frameworks: {} as Record<ComplianceFramework, number>,
      controls: {} as Record<string, number>,
      dataClassifications: {} as Record<string, number>
    };

    const componentSummaries = [];

    for (const component of components) {
      // Generate compliance plan
      const plan = await this.generateCompliancePlan(
        component.id,
        component.type,
        component.framework,
        component.config,
        config
      );

      // Update summary counts
      summary.frameworks[component.framework] = (summary.frameworks[component.framework] || 0) + 1;

      plan.controls.forEach(control => {
        summary.controls[control.id] = (summary.controls[control.id] || 0) + 1;
      });

      if (plan.dataClassification) {
        summary.dataClassifications[plan.dataClassification] = (summary.dataClassifications[plan.dataClassification] || 0) + 1;
      }

      // Determine compliance status
      const validation = this.controlMappingService.validateCompliance(component, component.framework);
      const complianceStatus = validation.valid ? 'compliant' :
        validation.errors.length === 0 ? 'partial' : 'non-compliant';

      componentSummaries.push({
        id: component.id,
        type: component.type,
        framework: component.framework,
        controls: plan.controls.map(c => c.id),
        dataClassification: plan.dataClassification,
        complianceStatus: complianceStatus as 'compliant' | 'non-compliant' | 'partial'
      });
    }

    return {
      summary,
      components: componentSummaries
    };
  }

  /**
   * Validate component manifest for compliance requirements
   */
  validateManifestCompliance(
    manifest: any,
    framework: ComplianceFramework
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    missingDataClassifications: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingDataClassifications: string[] = [];

    // Check if components have required data classification
    if (manifest.components) {
      for (const component of manifest.components) {
        const isDataClassificationRequired = this.taggingService.isDataClassificationRequired(component.type);

        if (isDataClassificationRequired) {
          if (!component.labels?.dataClassification) {
            missingDataClassifications.push(component.name || component.type);
            errors.push(`Component '${component.name || component.type}' requires data classification label`);
          } else if (!this.taggingService.validateDataClassification(component.labels.dataClassification)) {
            errors.push(`Invalid data classification for component '${component.name || component.type}': ${component.labels.dataClassification}`);
          }
        }
      }
    }

    // Check for required manifest fields
    if (!manifest.manifestVersion) {
      errors.push('Manifest version is required');
    }

    if (!manifest.service?.name) {
      errors.push('Service name is required');
    }

    if (!manifest.service?.owner) {
      errors.push('Service owner is required');
    }

    // Framework-specific validations
    if (framework === 'fedramp-moderate' || framework === 'fedramp-high') {
      if (!manifest.service?.sspId) {
        warnings.push('SSP ID is recommended for FedRAMP deployments');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingDataClassifications
    };
  }

  /**
   * Generate OPA policy for compliance validation
   */
  generateOPAPolicy(framework: ComplianceFramework): string {
    const policy = `
package shinobi.compliance

# Compliance validation policy for ${framework}

# Check if all required tags are present
has_required_tags[component] {
    component := input.components[_]
    required_tags := get_required_tags(component.type)
    all_tags_present(component.tags, required_tags)
}

# Get required tags for component type
get_required_tags("s3-bucket") := ["Service", "Component", "Environment", "Owner", "DataClassification", "ComplianceFramework"]
get_required_tags("lambda-api") := ["Service", "Component", "Environment", "Owner", "ComplianceFramework"]
get_required_tags("rds-postgres") := ["Service", "Component", "Environment", "Owner", "DataClassification", "ComplianceFramework"]
get_required_tags("ec2-instance") := ["Service", "Component", "Environment", "Owner", "ComplianceFramework"]

# Check if all required tags are present
all_tags_present(tags, required) {
    count(required) == count([tag | tag := required[_]; tags[tag]])
}

# Validate data classification
valid_data_classification[component] {
    component := input.components[_]
    component.labels.dataClassification
    component.labels.dataClassification in ["public", "internal", "confidential", "pii"]
}

# Check compliance framework
valid_compliance_framework[component] {
    component := input.components[_]
    component.tags.ComplianceFramework == "${framework}"
}

# Main compliance check
compliant {
    count(input.components) > 0
    has_required_tags
    valid_data_classification
    valid_compliance_framework
}
`;

    return policy.trim();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    components: Array<{
      id: string;
      type: ComponentType;
      framework: ComplianceFramework;
      config: any;
    }>,
    config: CompliancePlanConfig
  ): Promise<string> {
    const summary = await this.generateComplianceSummary(components, config);

    let report = `# Compliance Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Framework: ${components[0]?.framework || 'unknown'}\n\n`;

    report += `## Summary\n\n`;
    report += `- Total Components: ${summary.summary.totalComponents}\n`;
    report += `- Frameworks: ${JSON.stringify(summary.summary.frameworks, null, 2)}\n`;
    report += `- Controls: ${JSON.stringify(summary.summary.controls, null, 2)}\n`;
    report += `- Data Classifications: ${JSON.stringify(summary.summary.dataClassifications, null, 2)}\n\n`;

    report += `## Component Details\n\n`;
    summary.components.forEach(component => {
      report += `### ${component.id}\n`;
      report += `- Type: ${component.type}\n`;
      report += `- Framework: ${component.framework}\n`;
      report += `- Controls: ${component.controls.join(', ')}\n`;
      report += `- Data Classification: ${component.dataClassification || 'N/A'}\n`;
      report += `- Status: ${component.complianceStatus}\n\n`;
    });

    return report;
  }
}
