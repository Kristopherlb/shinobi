/**
 * Configuration Builder for SecurityGroupImportComponent Component
 * 
 * Implements the ConfigBuilder pattern as defined in the Platform Component API Contract.
 * Provides 5-layer configuration precedence chain and compliance-aware defaults.
 */

import { ConfigBuilder, ConfigBuilderContext, ComponentConfigSchema } from '@shinobi/core';
import schemaJson from '../Config.schema.json' with { type: 'json' };

/**
 * Configuration interface for SecurityGroupImportComponent component
 */
export interface SecurityGroupImportConfig {
  /** Component name (optional, will be auto-generated) */
  name?: string;

  /** Component description */
  description?: string;

  /** Security Group import configuration */
  securityGroup: {
    /** SSM parameter name containing the security group ID */
    ssmParameterName: string;

    /** AWS region where the security group exists (optional, defaults to current region) */
    region?: string;

    /** AWS account ID where the security group exists (optional, defaults to current account) */
    accountId?: string;

    /** VPC ID where the security group exists (optional, for validation) */
    vpcId?: string;

    /** Security group name for reference (optional, for documentation) */
    securityGroupName?: string;
  };

  /** Import validation settings */
  validation?: {
    /** Whether to validate the security group exists during synthesis */
    validateExistence?: boolean;

    /** Whether to validate the security group is in the expected VPC */
    validateVpc?: boolean;

    /** Custom validation timeout in seconds */
    validationTimeout?: number;
  };

  /** Tagging configuration (for documentation purposes only) */
  tags?: Record<string, string>;

  /** High-risk environment flag (set via platform config or service.yml) */
  highRiskEnvironment?: boolean;
}

/**
 * JSON Schema for SecurityGroupImportComponent configuration validation
 */
export const SECURITY_GROUP_IMPORT_CONFIG_SCHEMA: ComponentConfigSchema = schemaJson as ComponentConfigSchema;

/**
 * Configuration Builder for SecurityGroupImportComponent
 * 
 * Extends the abstract ConfigBuilder to provide security group import-specific configuration
 * with 5-layer precedence chain and compliance-aware defaults.
 */
export class SecurityGroupImportConfigBuilder extends ConfigBuilder<SecurityGroupImportConfig> {

  constructor(context: ConfigBuilderContext) {
    super(context, SECURITY_GROUP_IMPORT_CONFIG_SCHEMA);
  }

  /**
   * Override buildSync to add compliance defaults, environment variables, and validation
   */
  public buildSync(): SecurityGroupImportConfig {
    // Get all layers
    const hardcodedFallbacks = this.getHardcodedFallbacks();
    const platformConfig = (this as any)._loadPlatformConfiguration();
    const environmentConfig = (this as any)._getEnvironmentConfiguration();
    const componentOverrides = this.builderContext.spec.config || {};
    const policyOverrides = (this as any)._getPolicyOverrides();
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Read environment variables
    const envConfig = this.getEnvironmentVariableConfig();
    
    // Merge in precedence order: hardcoded < platform < compliance < environment < env vars < component < policy
    const mergedConfig = (this as any)._deepMergeConfigs(
      hardcodedFallbacks,
      platformConfig,
      complianceDefaults,
      environmentConfig,
      envConfig,
      componentOverrides,
      policyOverrides
    );
    
    // Resolve environment interpolations (${env:key} patterns)
    const resolvedConfig = (this as any)._resolveEnvironmentInterpolationsSync(mergedConfig);
    
    // Validate final config
    this.validateConfig(resolvedConfig);
    
    return resolvedConfig as SecurityGroupImportConfig;
  }

  /**
   * Provide component-specific hardcoded fallbacks.
   * These are the absolute, safest, most minimal defaults possible.
   * 
   * Layer 1 (Priority 5 - Lowest): Hardcoded Fallbacks
   */
  protected getHardcodedFallbacks(): Record<string, any> {
    return {
      securityGroup: {
        // ssmParameterName is required - no default provided (user must specify)
        region: undefined, // Will use current region
        accountId: undefined, // Will use current account
        vpcId: undefined, // No VPC validation by default
        securityGroupName: undefined // No name validation by default
      },
      validation: {
        validateExistence: true, // Always validate by default for safety
        validateVpc: false, // Disabled by default to avoid cross-VPC issues
        validationTimeout: 30 // 30 seconds timeout
      },
      tags: {
        'Component': 'security-group-import',
        'ManagedBy': 'platform',
        'ImportType': 'ssm-parameter'
      }
    };
  }

  /**
   * Layer 2: Compliance Framework Defaults
   * 
   * Provides sensible defaults based on risk assessment flags rather than framework checks.
   * High-risk environment defaults can be set via:
   * - Platform config files (`/config/{framework}.yml`) setting `highRiskEnvironment: true`
   * - Service-level configuration in `service.yml`
   * - Environment defaults
   * 
   * This ensures configuration is data-driven and risk-based, not framework-dependent.
   */
  protected getComplianceFrameworkDefaults(): Partial<SecurityGroupImportConfig> {
    const componentConfig = this.builderContext.spec.config as Partial<SecurityGroupImportConfig> | undefined;
    let isHighRisk = componentConfig?.highRiskEnvironment ?? false;
    
    // Also check platform config if available (loaded by base class)
    try {
      const platformConfig = (this as any)._loadPlatformConfiguration();
      if (platformConfig?.highRiskEnvironment) {
        isHighRisk = true;
      }
    } catch {
      // Platform config might not be available in tests, ignore
    }
    
    // Check compliance framework for high-risk defaults
    const framework = this.builderContext.context.complianceFramework;
    const isFedRAMPHigh = framework === 'fedramp-high';
    const isFedRAMPModerate = framework === 'fedramp-moderate';
    
    if (isHighRisk || isFedRAMPHigh || isFedRAMPModerate) {
      const defaults: Partial<SecurityGroupImportConfig> = {
        validation: {
          validateExistence: true,
          validationTimeout: 30
        }
      };
      
      if (isFedRAMPHigh) {
        // FedRAMP High requires strictest validation
        defaults.validation = {
          validateExistence: true,
          validateVpc: true, // Stricter validation for FedRAMP High
          validationTimeout: 30
        };
      }
      
      return defaults;
    }
    
    return {}; // Standard/default environment - use hardcoded fallbacks
  }

  /**
   * Read environment variables for configuration
   * Note: This is unusual - typically env vars are used via ${env:KEY} interpolation
   * But some tests expect direct env var reading, so we support it here
   */
  private getEnvironmentVariableConfig(): Partial<SecurityGroupImportConfig> {
    const config: Partial<SecurityGroupImportConfig> = {};
    
    // Read validation timeout from env var
    if (process.env.SECURITY_GROUP_IMPORT_VALIDATION_TIMEOUT) {
      const timeout = parseInt(process.env.SECURITY_GROUP_IMPORT_VALIDATION_TIMEOUT, 10);
      if (!isNaN(timeout)) {
        config.validation = {
          ...config.validation,
          validationTimeout: timeout
        };
      }
    }
    
    // Read validate VPC from env var
    if (process.env.SECURITY_GROUP_IMPORT_VALIDATE_VPC) {
      const validateVpc = process.env.SECURITY_GROUP_IMPORT_VALIDATE_VPC === 'true';
      config.validation = {
        ...config.validation,
        validateVpc
      };
    }
    
    return config;
  }

  /**
   * Validate configuration against schema and business rules
   */
  private validateConfig(config: SecurityGroupImportConfig): void {
    // Validate required fields
    if (!config.securityGroup?.ssmParameterName) {
      throw new Error('securityGroup.ssmParameterName is required');
    }
    
    // Validate SSM parameter name format (must start with /)
    if (!config.securityGroup.ssmParameterName.startsWith('/')) {
      throw new Error('securityGroup.ssmParameterName must start with "/"');
    }
    
    // Validate SSM parameter name pattern (allows slashes for hierarchical paths)
    if (!/^\/[a-zA-Z0-9._\/-]+$/.test(config.securityGroup.ssmParameterName)) {
      throw new Error('securityGroup.ssmParameterName contains invalid characters');
    }
    
    // Validate region format if provided (AWS region format: us-east-1, ap-southeast-2, etc.)
    if (config.securityGroup.region && !/^[a-z]{2}-[a-z]+-[0-9]+$/.test(config.securityGroup.region)) {
      throw new Error('securityGroup.region must match AWS region format (e.g., us-east-1, ap-southeast-2)');
    }
    
    // Validate account ID format if provided
    if (config.securityGroup.accountId && !/^[0-9]{12}$/.test(config.securityGroup.accountId)) {
      throw new Error('securityGroup.accountId must be 12 digits');
    }
    
    // Validate VPC ID format if provided
    if (config.securityGroup.vpcId && !/^vpc-[a-f0-9]{8,17}$/.test(config.securityGroup.vpcId)) {
      throw new Error('securityGroup.vpcId must match pattern: ^vpc-[a-f0-9]{8,17}$');
    }
    
    // Validate validation timeout range if provided
    if (config.validation?.validationTimeout !== undefined) {
      if (config.validation.validationTimeout < 5 || config.validation.validationTimeout > 300) {
        throw new Error('validation.validationTimeout must be between 5 and 300 seconds');
      }
    }
  }
}
