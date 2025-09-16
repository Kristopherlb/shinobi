// src/platform/contracts/components/base-component.ts
// Abstract base component class for all Shinobi components

import { IComponent, CapabilityData, ComplianceFramework, ComponentType } from '../bindings';
import { ComponentContext } from './component-context';
import { ComponentConfigBuilder } from './component-config-builder';
import { ComplianceControlMappingService, CompliancePlan } from '../../services/compliance-control-mapping';
import { TaggingEnforcementService, TaggingConfig } from '../../services/tagging-enforcement';
import { CompliancePlanGenerator, CompliancePlanConfig } from '../../services/compliance-plan-generator';

/**
 * Abstract base component class
 * All Shinobi components must extend this class
 */
export abstract class BaseComponent implements IComponent {
  protected config: Record<string, any>;
  protected context: ComponentContext;
  protected configBuilder: ComponentConfigBuilder;
  protected complianceMappingService: ComplianceControlMappingService;
  protected taggingService: TaggingEnforcementService;
  protected compliancePlanGenerator: CompliancePlanGenerator;
  protected compliancePlan?: CompliancePlan;

  constructor(config: Record<string, any>, context: ComponentContext) {
    this.config = config;
    this.context = context;
    this.configBuilder = new ComponentConfigBuilder();
    this.complianceMappingService = new ComplianceControlMappingService();
    this.taggingService = new TaggingEnforcementService();
    this.compliancePlanGenerator = new CompliancePlanGenerator();
  }

  /**
   * Get component name (must be implemented by subclasses)
   */
  abstract getName(): string;

  /**
   * Get component ID (must be implemented by subclasses)
   */
  abstract getId(): string;

  /**
   * Get component type (must be implemented by subclasses)
   */
  abstract getType(): string;

  /**
   * Get component capability data (must be implemented by subclasses)
   */
  abstract getCapabilityData(): CapabilityData;

  /**
   * Get service name from context
   */
  getServiceName(): string {
    return this.context.serviceName;
  }

  /**
   * Synthesize CDK constructs (must be implemented by subclasses)
   */
  abstract synth(): void;

  /**
   * Get component configuration
   */
  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Get component context
   */
  getContext(): ComponentContext {
    return { ...this.context };
  }

  /**
   * Get compliance framework
   */
  getComplianceFramework(): ComplianceFramework {
    return this.context.complianceFramework;
  }

  /**
   * Get environment name
   */
  getEnvironment(): string {
    return this.context.environment;
  }

  /**
   * Get AWS region
   */
  getRegion(): string {
    return this.context.region;
  }

  /**
   * Get AWS account ID
   */
  getAccountId(): string {
    return this.context.accountId;
  }

  /**
   * Get component tags with compliance enforcement
   */
  getTags(): Record<string, string> {
    const taggingConfig: TaggingConfig = {
      service: this.context.serviceName,
      environment: this.context.environment,
      owner: this.context.owner || 'unknown',
      complianceFramework: this.context.complianceFramework,
      dataClassification: this.config.labels?.dataClassification,
      sspId: this.config.sspId,
      customTags: this.context.tags
    };

    return this.taggingService.applyComplianceTags(
      this.getType() as any,
      this.getId(),
      taggingConfig
    );
  }

  /**
   * Get component metadata
   */
  getMetadata(): Record<string, any> {
    return {
      type: this.getType(),
      serviceName: this.getServiceName(),
      environment: this.getEnvironment(),
      complianceFramework: this.getComplianceFramework(),
      region: this.getRegion(),
      accountId: this.getAccountId(),
      config: this.getConfig(),
      tags: this.getTags()
    };
  }

  /**
   * Validate component configuration
   */
  public validateConfig(): void {
    // Basic validation - can be overridden by subclasses
    if (!this.config) {
      throw new Error('Component configuration is required');
    }
    if (!this.context) {
      throw new Error('Component context is required');
    }
    if (!this.context.serviceName) {
      throw new Error('Service name is required in context');
    }
    if (!this.context.environment) {
      throw new Error('Environment is required in context');
    }
    if (!this.context.complianceFramework) {
      throw new Error('Compliance framework is required in context');
    }
  }

  /**
   * Apply compliance-specific configuration
   */
  protected applyComplianceConfig(): void {
    const framework = this.getComplianceFramework();

    switch (framework) {
      case 'commercial':
        this.applyCommercialConfig();
        break;
      case 'fedramp-moderate':
        this.applyFedrampModerateConfig();
        break;
      case 'fedramp-high':
        this.applyFedrampHighConfig();
        break;
      default:
        throw new Error(`Unsupported compliance framework: ${framework}`);
    }
  }

  /**
   * Apply commercial compliance configuration
   * Can be overridden by subclasses
   */
  protected applyCommercialConfig(): void {
    // Default commercial configuration
    // Subclasses can override for specific requirements
  }

  /**
   * Apply FedRAMP Moderate compliance configuration
   * Can be overridden by subclasses
   */
  protected applyFedrampModerateConfig(): void {
    // Default FedRAMP Moderate configuration
    // Subclasses can override for specific requirements
  }

  /**
   * Apply FedRAMP High compliance configuration
   * Can be overridden by subclasses
   */
  protected applyFedrampHighConfig(): void {
    // Default FedRAMP High configuration
    // Subclasses can override for specific requirements
  }

  /**
   * Get configuration value with fallback
   */
  protected getConfigValue<T>(key: string, defaultValue: T): T {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get nested configuration value with fallback
   */
  protected getNestedConfigValue<T>(path: string, defaultValue: T): T {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Check if configuration key exists
   */
  protected hasConfigKey(key: string): boolean {
    return key in this.config;
  }

  /**
   * Check if nested configuration key exists
   */
  protected hasNestedConfigKey(path: string): boolean {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate compliance plan for this component
   */
  async generateCompliancePlan(outputDir: string = './.shinobi/compliance'): Promise<CompliancePlan> {
    const config: CompliancePlanConfig = {
      outputDir,
      includeAuditTrail: true,
      includeControlDetails: true,
      includeTaggingPolicy: true
    };

    this.compliancePlan = await this.compliancePlanGenerator.generateCompliancePlan(
      this.getId(),
      this.getType() as any,
      this.getComplianceFramework(),
      this.getConfig(),
      config
    );

    return this.compliancePlan;
  }

  /**
   * Get compliance plan (generates if not exists)
   */
  async getCompliancePlan(): Promise<CompliancePlan> {
    if (!this.compliancePlan) {
      return await this.generateCompliancePlan();
    }
    return this.compliancePlan;
  }

  /**
   * Validate component compliance
   */
  validateCompliance(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.complianceMappingService.validateCompliance(
      {
        type: this.getType(),
        config: this.getConfig()
      },
      this.getComplianceFramework()
    );
  }

  /**
   * Check if data classification is required
   */
  isDataClassificationRequired(): boolean {
    return this.taggingService.isDataClassificationRequired(this.getType() as any);
  }

  /**
   * Validate data classification
   */
  validateDataClassification(): {
    valid: boolean;
    error?: string;
  } {
    if (!this.isDataClassificationRequired()) {
      return { valid: true };
    }

    const dataClassification = this.config.labels?.dataClassification;
    if (!dataClassification) {
      return {
        valid: false,
        error: `Data classification is required for ${this.getType()} components`
      };
    }

    if (!this.taggingService.validateDataClassification(dataClassification)) {
      return {
        valid: false,
        error: `Invalid data classification: ${dataClassification}. Must be one of: ${this.taggingService.getValidDataClassifications().join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Get compliance controls for this component
   */
  getComplianceControls(): string[] {
    const mapping = this.complianceMappingService.getControlMapping(this.getType() as any);
    return mapping?.controls || [];
  }

  /**
   * Get NIST control details
   */
  getNISTControlDetails(controlId: string) {
    return this.complianceMappingService.getNISTControl(controlId);
  }

  /**
   * Enhanced validation that includes compliance checks
   */
  public validateConfigWithCompliance(): void {
    // Run basic validation
    this.validateConfig();

    // Validate data classification
    const dataClassificationValidation = this.validateDataClassification();
    if (!dataClassificationValidation.valid) {
      throw new Error(dataClassificationValidation.error);
    }

    // Validate compliance
    const complianceValidation = this.validateCompliance();
    if (!complianceValidation.valid) {
      const errorMessage = `Compliance validation failed:\n${complianceValidation.errors.join('\n')}`;
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (complianceValidation.warnings.length > 0) {
      console.warn(`Compliance warnings for ${this.getId()}:\n${complianceValidation.warnings.join('\n')}`);
    }
  }

  /**
   * Enhanced synthesis that includes compliance plan generation
   */
  async synthWithCompliance(): Promise<void> {
    // Validate configuration with compliance
    this.validateConfigWithCompliance();

    // Generate compliance plan
    await this.generateCompliancePlan();

    // Run normal synthesis
    this.synth();
  }
}
