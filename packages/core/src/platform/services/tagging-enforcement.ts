/**
 * Tagging Enforcement Service
 * 
 * Enforces tagging standards and data classification requirements
 * across all platform components and resources.
 */

import { ComponentType, ComplianceFramework } from '../contracts/bindings.ts';
import { ComplianceControlMappingService } from './compliance-control-mapping.ts';

// Tagging configuration
export interface TaggingConfig {
  service: string;
  environment: string;
  owner: string;
  complianceFramework: ComplianceFramework;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'pii';
  sspId?: string;
  customTags?: Record<string, string>;
}

// Tag validation result
export interface TagValidationResult {
  valid: boolean;
  missingTags: string[];
  invalidTags: string[];
  errors: string[];
  warnings: string[];
}

// Resource tagging interface
export interface ResourceTags {
  [key: string]: string;
}

export class TaggingEnforcementService {
  private controlMappingService: ComplianceControlMappingService;

  constructor() {
    this.controlMappingService = new ComplianceControlMappingService();
  }

  /**
   * Apply compliance tags to a resource
   */
  applyComplianceTags(
    componentType: ComponentType,
    componentId: string,
    config: TaggingConfig
  ): ResourceTags {
    const mapping = this.controlMappingService.getControlMapping(componentType);
    if (!mapping) {
      throw new Error(`No control mapping found for component type: ${componentType}`);
    }

    const tags: ResourceTags = {
      Service: config.service,
      Component: componentId,
      ComponentType: componentType,
      Environment: config.environment,
      Owner: config.owner,
      ComplianceFramework: config.complianceFramework,
      ManagedBy: 'Shinobi'
    };

    // Add data classification if applicable
    if (config.dataClassification) {
      tags.DataClassification = config.dataClassification;
    }

    // Add framework-specific tags
    if (config.complianceFramework === 'fedramp-moderate' || config.complianceFramework === 'fedramp-high') {
      tags.FedRAMPCompliant = 'true';
      if (config.sspId) {
        tags.SSPId = config.sspId;
      }
    }

    // Add custom tags
    if (config.customTags) {
      Object.assign(tags, config.customTags);
    }

    return tags;
  }

  /**
   * Validate resource tags
   */
  validateTags(
    componentType: ComponentType,
    tags: ResourceTags,
    config: TaggingConfig
  ): TagValidationResult {
    const mapping = this.controlMappingService.getControlMapping(componentType);
    if (!mapping) {
      return {
        valid: false,
        missingTags: [],
        invalidTags: [],
        errors: [`No control mapping found for component type: ${componentType}`],
        warnings: []
      };
    }

    const missingTags: string[] = [];
    const invalidTags: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required tags
    const requiredTags = mapping.requiredTags;
    requiredTags.forEach(tagName => {
      if (!tags[tagName]) {
        missingTags.push(tagName);
        errors.push(`Required tag '${tagName}' is missing`);
      }
    });

    // Validate specific tag values
    this.validateTagValues(tags, config, errors, warnings);

    // Check data classification for data stores
    if (mapping.dataClassification && !tags.DataClassification) {
      errors.push(`Data classification tag is required for ${componentType} components`);
    }

    return {
      valid: errors.length === 0,
      missingTags,
      invalidTags,
      errors,
      warnings
    };
  }

  /**
   * Validate specific tag values
   */
  private validateTagValues(
    tags: ResourceTags,
    config: TaggingConfig,
    errors: string[],
    warnings: string[]
  ): void {
    // Validate Service tag
    if (tags.Service && tags.Service !== config.service) {
      errors.push(`Service tag mismatch: expected '${config.service}', got '${tags.Service}'`);
    }

    // Validate Environment tag
    if (tags.Environment && tags.Environment !== config.environment) {
      errors.push(`Environment tag mismatch: expected '${config.environment}', got '${tags.Environment}'`);
    }

    // Validate Owner tag
    if (tags.Owner && tags.Owner !== config.owner) {
      errors.push(`Owner tag mismatch: expected '${config.owner}', got '${tags.Owner}'`);
    }

    // Validate ComplianceFramework tag
    if (tags.ComplianceFramework && tags.ComplianceFramework !== config.complianceFramework) {
      errors.push(`ComplianceFramework tag mismatch: expected '${config.complianceFramework}', got '${tags.ComplianceFramework}'`);
    }

    // Validate DataClassification tag
    if (tags.DataClassification) {
      const validClassifications = ['public', 'internal', 'confidential', 'pii'];
      if (!validClassifications.includes(tags.DataClassification)) {
        errors.push(`Invalid data classification: '${tags.DataClassification}'. Must be one of: ${validClassifications.join(', ')}`);
      }
    }

    // Validate FedRAMP tags
    if (config.complianceFramework === 'fedramp-moderate' || config.complianceFramework === 'fedramp-high') {
      if (tags.FedRAMPCompliant !== 'true') {
        errors.push('FedRAMPCompliant tag must be set to "true" for FedRAMP environments');
      }

      if (config.sspId && tags.SSPId !== config.sspId) {
        errors.push(`SSPId tag mismatch: expected '${config.sspId}', got '${tags.SSPId}'`);
      }
    }
  }

  /**
   * Generate tagging policy for a component
   */
  generateTaggingPolicy(
    componentType: ComponentType,
    config: TaggingConfig
  ): {
    requiredTags: string[];
    tagValues: Record<string, string>;
    validationRules: string[];
  } {
    const mapping = this.controlMappingService.getControlMapping(componentType);
    if (!mapping) {
      throw new Error(`No control mapping found for component type: ${componentType}`);
    }

    const tagValues = this.applyComplianceTags(componentType, 'template', config);
    const validationRules = this.generateValidationRules(componentType, config);

    return {
      requiredTags: mapping.requiredTags,
      tagValues,
      validationRules
    };
  }

  /**
   * Generate validation rules for tags
   */
  private generateValidationRules(
    componentType: ComponentType,
    config: TaggingConfig
  ): string[] {
    const rules: string[] = [];

    rules.push('All resources must have required tags applied');
    rules.push('Tag values must match component configuration');

    if (config.complianceFramework === 'fedramp-moderate' || config.complianceFramework === 'fedramp-high') {
      rules.push('FedRAMP-specific tags must be present and valid');
    }

    const mapping = this.controlMappingService.getControlMapping(componentType);
    if (mapping?.dataClassification) {
      rules.push(`Data classification tag is required for ${componentType} components`);
    }

    return rules;
  }

  /**
   * Check if data classification is required for a component
   */
  isDataClassificationRequired(componentType: ComponentType): boolean {
    const mapping = this.controlMappingService.getControlMapping(componentType);
    return mapping?.dataClassification !== undefined;
  }

  /**
   * Get valid data classification values
   */
  getValidDataClassifications(): string[] {
    return ['public', 'internal', 'confidential', 'pii'];
  }

  /**
   * Validate data classification value
   */
  validateDataClassification(value: string): boolean {
    return this.getValidDataClassifications().includes(value);
  }

  /**
   * Generate CDK tagging configuration
   */
  generateCDKTaggingConfig(
    componentType: ComponentType,
    componentId: string,
    config: TaggingConfig
  ): any {
    const tags = this.applyComplianceTags(componentType, componentId, config);

    return {
      tags: tags,
      tagPolicy: {
        requiredTags: Object.keys(tags),
        tagValueConstraints: {
          ComplianceFramework: [config.complianceFramework],
          Environment: [config.environment],
          Service: [config.service]
        }
      }
    };
  }
}
