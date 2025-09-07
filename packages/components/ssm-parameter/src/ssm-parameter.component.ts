/**
 * SSM Parameter Component
 * 
 * AWS Systems Manager Parameter Store for configuration management and application parameters.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';

/**
 * Configuration interface for SSM Parameter component
 */
export interface SsmParameterConfig {
  /** Parameter name (required) */
  parameterName: string;
  
  /** Parameter description */
  description?: string;
  
  /** Parameter type */
  type?: 'String' | 'StringList' | 'SecureString';
  
  /** Parameter value */
  value?: string;
  
  /** Parameter tier (Standard or Advanced) */
  tier?: 'Standard' | 'Advanced';
  
  /** Policies for parameter access */
  policies?: string;
  
  /** Allowed pattern for parameter value */
  allowedPattern?: string;
  
  /** Data type for parameter */
  dataType?: string;
  
  /** Encryption configuration for SecureString parameters */
  encryption?: {
    /** KMS key ARN for encryption */
    kmsKeyArn?: string;
  };
  
  /** Tags for the parameter */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for SSM Parameter component
 */
export const SSM_PARAMETER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'SSM Parameter Configuration',
  description: 'Configuration for creating an SSM Parameter Store parameter',
  required: ['parameterName'],
  properties: {
    parameterName: {
      type: 'string',
      description: 'Name of the parameter (must start with /)',
      pattern: '^/[a-zA-Z0-9_.-/]+$',
      minLength: 1,
      maxLength: 2048
    },
    description: {
      type: 'string',
      description: 'Description of the parameter',
      maxLength: 1024
    },
    type: {
      type: 'string',
      description: 'Parameter type',
      enum: ['String', 'StringList', 'SecureString'],
      default: 'String'
    },
    value: {
      type: 'string',
      description: 'Parameter value',
      maxLength: 4096
    },
    tier: {
      type: 'string',
      description: 'Parameter tier',
      enum: ['Standard', 'Advanced'],
      default: 'Standard'
    },
    policies: {
      type: 'string',
      description: 'Parameter policies JSON'
    },
    allowedPattern: {
      type: 'string',
      description: 'Regular expression to validate parameter value'
    },
    dataType: {
      type: 'string',
      description: 'Data type for parameter (text, aws:ec2:image, etc.)',
      default: 'text'
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for SecureString encryption'
        }
      },
      additionalProperties: false
    },
    tags: {
      type: 'object',
      description: 'Tags for the parameter',
      additionalProperties: {
        type: 'string'
      },
      default: {}
    }
  },
  additionalProperties: false,
  defaults: {
    type: 'String',
    tier: 'Standard',
    dataType: 'text',
    tags: {}
  }
};

/**
 * Configuration builder for SSM Parameter component
 */
export class SsmParameterConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<SsmParameterConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): SsmParameterConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    const mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    return mergedConfig as SsmParameterConfig;
  }

  /**
   * Simple merge utility for combining configuration objects
   */
  private mergeConfigs(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get platform-wide defaults for SSM Parameter
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      type: this.getDefaultParameterType(),
      tier: this.getDefaultTier(),
      dataType: 'text'
    };
  }

  /**
   * Get compliance framework specific defaults
   */
  private getComplianceFrameworkDefaults(): Record<string, any> {
    const framework = this.context.complianceFramework;
    
    switch (framework) {
      case 'fedramp-moderate':
        return {
          type: 'SecureString', // Required for sensitive configuration
          tier: 'Advanced', // Advanced features for compliance
          // Additional compliance tags
          tags: {
            'compliance-framework': 'fedramp-moderate',
            'data-classification': 'sensitive'
          }
        };
        
      case 'fedramp-high':
        return {
          type: 'SecureString', // Mandatory for high compliance
          tier: 'Advanced', // Required features
          // Stricter compliance tags
          tags: {
            'compliance-framework': 'fedramp-high',
            'data-classification': 'confidential',
            'retention-period': 'indefinite'
          }
        };
        
      default: // commercial
        return {
          tags: {
            'environment': this.context.environment
          }
        };
    }
  }

  /**
   * Get default parameter type based on compliance framework
   */
  private getDefaultParameterType(): string {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? 'SecureString' : 'String';
  }

  /**
   * Get default tier based on compliance framework
   */
  private getDefaultTier(): string {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) 
      ? 'Advanced' : 'Standard';
  }
}

/**
 * SSM Parameter Component implementing Component API Contract v1.0
 */
export class SsmParameterComponent extends Component {
  private parameter?: ssm.StringParameter | ssm.StringListParameter;
  private kmsKey?: kms.Key;
  private config?: SsmParameterConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create SSM Parameter with compliance hardening
   */
  public synth(): void {
    // Log component synthesis start
    this.logComponentEvent('synthesis_start', 'Starting SSM Parameter component synthesis', {
      parameterName: this.spec.config?.parameterName,
      parameterType: this.spec.config?.type
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new SsmParameterConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Log configuration built
      this.logComponentEvent('config_built', 'SSM Parameter configuration built successfully', {
        parameterName: this.config.parameterName,
        parameterType: this.config.type,
        tier: this.config.tier
      });
      
      // Create KMS key for SecureString parameters if needed
      this.createKmsKeyIfNeeded();
    
      // Create SSM Parameter
      this.createParameter();
    
      // Apply compliance hardening
      this.applyComplianceHardening();
    
      // Configure observability
      this.configureObservabilityForParameter();
    
      // Register constructs
      this.registerConstruct('parameter', this.parameter!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
    
      // Register capabilities
      this.registerCapability('parameter:ssm', this.buildParameterCapability());
    
      // Log successful synthesis completion
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'SSM Parameter component synthesis completed successfully', {
        parameterCreated: 1,
        kmsKeyCreated: !!this.kmsKey,
        parameterType: this.config.type
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'ssm-parameter',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'ssm-parameter';
  }

  /**
   * Create KMS key for SecureString parameters if required
   */
  private createKmsKeyIfNeeded(): void {
    if (this.config!.type === 'SecureString' && this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} SSM parameter`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      // Apply standard tags
      this.applyStandardTags(this.kmsKey, {
        'encryption-type': 'customer-managed',
        'key-rotation': (this.context.complianceFramework === 'fedramp-high').toString(),
        'resource-type': 'ssm-parameter-encryption'
      });

      // Grant SSM service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSSMService',
        principals: [new iam.ServicePrincipal('ssm.amazonaws.com')],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey*',
          'kms:DescribeKey'
        ],
        resources: ['*']
      }));
    }
  }

  /**
   * Create the SSM Parameter
   */
  private createParameter(): void {
    const baseProps = {
      parameterName: this.config!.parameterName,
      description: this.config!.description,
      tier: this.config!.tier === 'Advanced' ? 
        ssm.ParameterTier.ADVANCED : ssm.ParameterTier.STANDARD,
      allowedPattern: this.config!.allowedPattern,
      dataType: ssm.ParameterDataType.TEXT,
      policies: this.config!.policies
    };

    // Create parameter based on type
    switch (this.config!.type) {
      case 'String':
        this.parameter = new ssm.StringParameter(this, 'Parameter', {
          ...baseProps,
          stringValue: this.config!.value || ''
        });
        break;

      case 'StringList':
        this.parameter = new ssm.StringListParameter(this, 'Parameter', {
          ...baseProps,
          stringListValue: this.config!.value ? 
            this.config!.value.split(',') : []
        });
        break;

      case 'SecureString':
        this.parameter = new ssm.StringParameter(this, 'Parameter', {
          ...baseProps,
          stringValue: this.config!.value || '',
          type: ssm.ParameterType.SECURE_STRING,
          keyId: this.kmsKey?.keyArn || this.config!.encryption?.kmsKeyArn
        });
        break;

      default:
        throw new Error(`Unsupported parameter type: ${this.config!.type}`);
    }

    // Apply standard tags
    this.applyStandardTags(this.parameter, {
      'parameter-type': this.config!.type!,
      'tier': this.config!.tier!,
      'data-type': this.config!.dataType!,
      'encryption-enabled': (this.config!.type === 'SecureString').toString()
    });

    // Apply additional user tags
    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.parameter!).add(key, value);
      });
    }
    
    // Log parameter creation
    this.logResourceCreation('ssm-parameter', this.config!.parameterName, {
      parameterType: this.config!.type,
      tier: this.config!.tier,
      encryptionEnabled: this.config!.type === 'SecureString'
    });
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic access policies - no additional restrictions for commercial
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Enhanced logging for compliance
    if (this.parameter) {
      const logGroup = new logs.LogGroup(this, 'ParameterAccessLogGroup', {
        logGroupName: `/aws/ssm/parameter/${this.config!.parameterName.replace(/\//g, '-')}`,
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply standard tags
      this.applyStandardTags(logGroup, {
        'log-type': 'parameter-access',
        'retention': '1-year',
        'compliance': 'fedramp-moderate'
      });
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Additional restrictions for high compliance
    if (this.parameter) {
      // Create audit log group with extended retention
      const auditLogGroup = new logs.LogGroup(this, 'ParameterAuditLogGroup', {
        logGroupName: `/aws/ssm/parameter/${this.config!.parameterName.replace(/\//g, '-')}/audit`,
        retention: logs.RetentionDays.TEN_YEARS,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });

      // Apply standard tags
      this.applyStandardTags(auditLogGroup, {
        'log-type': 'audit',
        'retention': '10-years',
        'compliance': 'fedramp-high'
      });
    }
  }

  /**
   * Build parameter capability data shape
   */
  private buildParameterCapability(): any {
    return {
      parameterName: this.config!.parameterName,
      parameterArn: this.parameter!.parameterArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
           !!this.config!.encryption?.kmsKeyArn;
  }

  /**
   * Configure CloudWatch observability for SSM Parameter
   */
  private configureObservabilityForParameter(): void {
    // Enable monitoring for compliance frameworks only
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const parameterName = this.config!.parameterName;

    // 1. Parameter Access Errors Alarm
    const accessErrorsAlarm = new cloudwatch.Alarm(this, 'ParameterAccessErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-access-errors`,
      alarmDescription: 'SSM Parameter access errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SSM',
        metricName: 'ParameterStoreErrors',
        dimensionsMap: {
          ParameterName: parameterName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(accessErrorsAlarm, {
      'alarm-type': 'access-errors',
      'metric-type': 'error-rate',
      'threshold': '5'
    });

    // 2. High Access Rate Alarm (potential security concern)
    const highAccessRateAlarm = new cloudwatch.Alarm(this, 'HighAccessRateAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-high-access-rate`,
      alarmDescription: 'SSM Parameter high access rate alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SSM',
        metricName: 'ParameterStoreRequests',
        dimensionsMap: {
          ParameterName: parameterName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1000, // High threshold for potential abuse
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(highAccessRateAlarm, {
      'alarm-type': 'high-access-rate',
      'metric-type': 'usage-pattern',
      'threshold': '1000'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to SSM Parameter', {
      alarmsCreated: 2,
      parameterName: parameterName,
      monitoringEnabled: true
    });
  }
}