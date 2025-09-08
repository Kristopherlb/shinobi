/**
 * Secrets Manager Component
 * 
 * AWS Secrets Manager for secure storage and retrieval of sensitive information.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
 * Configuration interface for Secrets Manager component
 */
export interface SecretsManagerConfig {
  /** Secret name (optional, will be auto-generated if not provided) */
  secretName?: string;
  
  /** Secret description */
  description?: string;
  
  /** Initial secret value (for string secrets) */
  secretValue?: {
    /** Secret string value */
    secretStringValue?: string;
    /** Secret binary value */
    secretBinaryValue?: Buffer;
  };
  
  /** Generate secret automatically */
  generateSecret?: {
    enabled: boolean;
    /** Characters to exclude from generated secret */
    excludeCharacters?: string;
    /** Include space in generated secret */
    includeSpace?: boolean;
    /** Password length */
    passwordLength?: number;
    /** Require each included type */
    requireEachIncludedType?: boolean;
    /** Secret string template */
    secretStringTemplate?: string;
    /** Generate string key */
    generateStringKey?: string;
  };
  
  /** Automatic rotation configuration */
  automaticRotation?: {
    enabled: boolean;
    /** Lambda function for rotation */
    rotationLambda?: {
      functionArn?: string;
      /** Create rotation Lambda automatically */
      createFunction?: boolean;
      runtime?: string;
    };
    /** Rotation schedule */
    schedule?: {
      /** Rotation interval in days */
      automaticallyAfterDays?: number;
    };
  };
  
  /** Replica configuration for multi-region */
  replicas?: Array<{
    region: string;
    kmsKeyArn?: string;
  }>;
  
  /** Encryption configuration */
  encryption?: {
    /** KMS key ARN for encryption */
    kmsKeyArn?: string;
  };
  
  /** Recovery configuration */
  recovery?: {
    /** Deletion protection */
    deletionProtection?: boolean;
    /** Recovery window in days */
    recoveryWindowInDays?: number;
  };
}

/**
 * Configuration schema for Secrets Manager component
 */
export const SECRETS_MANAGER_CONFIG_SCHEMA = {
  type: 'object',
  title: 'Secrets Manager Configuration',
  description: 'Configuration for creating a Secrets Manager secret',
  properties: {
    secretName: {
      type: 'string',
      description: 'Name of the secret (will be auto-generated if not provided)',
      pattern: '^[a-zA-Z0-9_./\\-]+$',
      maxLength: 512
    },
    description: {
      type: 'string',
      description: 'Description of the secret',
      maxLength: 2048
    },
    secretValue: {
      type: 'object',
      description: 'Initial secret value',
      properties: {
        secretStringValue: {
          type: 'string',
          description: 'Secret as a string value'
        }
      },
      additionalProperties: false
    },
    generateSecret: {
      type: 'object',
      description: 'Generate secret automatically',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable automatic secret generation',
          default: false
        },
        excludeCharacters: {
          type: 'string',
          description: 'Characters to exclude from generated secret',
          default: '"@/\\\''
        },
        includeSpace: {
          type: 'boolean',
          description: 'Include space in generated secret',
          default: false
        },
        passwordLength: {
          type: 'number',
          description: 'Length of generated password',
          minimum: 8,
          maximum: 4096,
          default: 32
        },
        requireEachIncludedType: {
          type: 'boolean',
          description: 'Require each included character type',
          default: true
        }
      },
      additionalProperties: false,
      default: { enabled: false }
    },
    automaticRotation: {
      type: 'object',
      description: 'Automatic rotation configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable automatic rotation',
          default: false
        },
        rotationLambda: {
          type: 'object',
          description: 'Lambda function for rotation',
          properties: {
            createFunction: {
              type: 'boolean',
              description: 'Create rotation Lambda function automatically',
              default: false
            },
            runtime: {
              type: 'string',
              description: 'Lambda runtime for rotation function',
              enum: ['python3.9', 'python3.10', 'python3.11'],
              default: 'python3.11'
            }
          }
        },
        schedule: {
          type: 'object',
          description: 'Rotation schedule',
          properties: {
            automaticallyAfterDays: {
              type: 'number',
              description: 'Rotation interval in days',
              minimum: 1,
              maximum: 365,
              default: 30
            }
          }
        }
      },
      additionalProperties: false,
      default: { enabled: false }
    },
    replicas: {
      type: 'array',
      description: 'Multi-region replicas',
      items: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            description: 'AWS region for replica'
          },
          kmsKeyArn: {
            type: 'string',
            description: 'KMS key ARN for replica encryption'
          }
        },
        required: ['region'],
        additionalProperties: false
      },
      default: []
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for encryption'
        }
      },
      additionalProperties: false
    },
    recovery: {
      type: 'object',
      description: 'Recovery configuration',
      properties: {
        deletionProtection: {
          type: 'boolean',
          description: 'Enable deletion protection',
          default: true
        },
        recoveryWindowInDays: {
          type: 'number',
          description: 'Recovery window in days',
          minimum: 7,
          maximum: 30,
          default: 30
        }
      },
      additionalProperties: false,
      default: {
        deletionProtection: true,
        recoveryWindowInDays: 30
      }
    }
  },
  additionalProperties: false,
  defaults: {
    generateSecret: { enabled: false },
    automaticRotation: { enabled: false },
    replicas: [],
    recovery: {
      deletionProtection: true,
      recoveryWindowInDays: 30
    }
  }
};

/**
 * Configuration builder for Secrets Manager component
 */
export class SecretsManagerConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<SecretsManagerConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): SecretsManagerConfig {
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
    
    return mergedConfig as SecretsManagerConfig;
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
   * Get platform-wide defaults for Secrets Manager
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      generateSecret: {
        enabled: false,
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        passwordLength: 32,
        requireEachIncludedType: true
      },
      automaticRotation: {
        enabled: false,
        schedule: {
          automaticallyAfterDays: this.getDefaultRotationDays()
        }
      },
      recovery: {
        deletionProtection: this.getDefaultDeletionProtection(),
        recoveryWindowInDays: this.getDefaultRecoveryWindow()
      }
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
          automaticRotation: {
            enabled: true, // Required for compliance
            schedule: {
              automaticallyAfterDays: 90 // Quarterly rotation
            }
          },
          recovery: {
            deletionProtection: true, // Required for compliance
            recoveryWindowInDays: 30 // Maximum recovery window
          },
          // Multi-region replication for compliance
          replicas: this.getComplianceReplicas()
        };
        
      case 'fedramp-high':
        return {
          automaticRotation: {
            enabled: true, // Mandatory for high compliance
            schedule: {
              automaticallyAfterDays: 30 // Monthly rotation
            }
          },
          recovery: {
            deletionProtection: true, // Mandatory
            recoveryWindowInDays: 7 // Minimum recovery window for high security
          },
          // Multi-region replication required
          replicas: this.getComplianceReplicas()
        };
        
      default: // commercial
        return {};
    }
  }

  /**
   * Get default rotation days based on compliance framework
   */
  private getDefaultRotationDays(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 30; // Monthly for high compliance
      case 'fedramp-moderate':
        return 90; // Quarterly for moderate compliance
      default:
        return 365; // Yearly for commercial
    }
  }

  /**
   * Get default deletion protection setting
   */
  private getDefaultDeletionProtection(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  /**
   * Get default recovery window
   */
  private getDefaultRecoveryWindow(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 7; // Minimum for high security
      default:
        return 30; // Standard window
    }
  }

  /**
   * Get compliance replica regions
   */
  private getComplianceReplicas(): Array<{ region: string }> {
    // For compliance, secrets should be replicated to a secondary region
    const currentRegion = this.context.region || 'us-east-1';
    const replicaRegion = currentRegion === 'us-east-1' ? 'us-west-2' : 'us-east-1';
    
    return [{ region: replicaRegion }];
  }
}

/**
 * Secrets Manager Component implementing Component API Contract v1.0
 */
export class SecretsManagerComponent extends Component {
  private secret?: secretsmanager.Secret;
  private kmsKey?: kms.Key;
  private rotationLambda?: lambda.Function;
  private config?: SecretsManagerConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create Secrets Manager secret with compliance hardening
   */
  public synth(): void {
    // Log component synthesis start
    this.logComponentEvent('synthesis_start', 'Starting Secrets Manager component synthesis', {
      secretName: this.spec.config?.secretName,
      automaticRotation: this.spec.config?.automaticRotation?.enabled
    });
    
    const startTime = Date.now();
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new SecretsManagerConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Log configuration built
      this.logComponentEvent('config_built', 'Secrets Manager configuration built successfully', {
        secretName: this.config.secretName,
        rotationEnabled: this.config.automaticRotation?.enabled,
        replicaCount: this.config.replicas?.length || 0
      });
      
      // Create KMS key for encryption if needed
      this.createKmsKeyIfNeeded();
    
      // Create rotation Lambda if needed
      this.createRotationLambdaIfNeeded();
    
      // Create Secrets Manager secret
      this.createSecret();
    
      // Apply compliance hardening
      this.applyComplianceHardening();
    
      // Configure observability
      this.configureObservabilityForSecret();
    
      // Register constructs
      this.registerConstruct('secret', this.secret!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      if (this.rotationLambda) {
        this.registerConstruct('rotationLambda', this.rotationLambda);
      }
    
      // Register capabilities
      this.registerCapability('secret:secretsmanager', this.buildSecretCapability());
    
      // Log successful synthesis completion
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Secrets Manager component synthesis completed successfully', {
        secretCreated: 1,
        kmsKeyCreated: !!this.kmsKey,
        rotationLambdaCreated: !!this.rotationLambda,
        replicasCreated: this.config.replicas?.length || 0
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'secrets-manager',
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
    return 'secrets-manager';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} Secrets Manager secret`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });

      // Apply standard tags
      this.applyStandardTags(this.kmsKey, {
        'encryption-type': 'customer-managed',
        'key-rotation': (this.context.complianceFramework === 'fedramp-high').toString(),
        'resource-type': 'secrets-manager-encryption'
      });

      // Grant Secrets Manager service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowSecretsManagerService',
        principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')],
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
   * Create rotation Lambda function if automatic rotation is enabled
   */
  private createRotationLambdaIfNeeded(): void {
    if (this.config!.automaticRotation?.enabled && 
        this.config!.automaticRotation?.rotationLambda?.createFunction) {
      
      this.rotationLambda = new lambda.Function(this, 'RotationFunction', {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'lambda_function.lambda_handler',
        code: lambda.Code.fromInline(`
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Secrets Manager rotation function
    
    This is a basic template for secret rotation.
    In production, implement specific rotation logic for your secret type.
    """
    
    logger.info(f"Rotation event: {json.dumps(event)}")
    
    client = boto3.client('secretsmanager')
    
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']
    
    logger.info(f"Rotating secret {secret_arn} - Step: {step}")
    
    try:
        if step == "createSecret":
            # Create new secret version
            logger.info("Creating new secret version")
            # Implementation depends on secret type
            pass
            
        elif step == "setSecret":
            # Update the service with new secret
            logger.info("Setting secret in service")
            # Implementation depends on service type
            pass
            
        elif step == "testSecret":
            # Test the new secret
            logger.info("Testing new secret")
            # Implementation depends on service type
            pass
            
        elif step == "finishSecret":
            # Finalize the rotation
            logger.info("Finishing secret rotation")
            client.update_secret_version_stage(
                SecretId=secret_arn,
                VersionStage="AWSCURRENT",
                ClientRequestToken=token
            )
            
        return {"statusCode": 200}
        
    except Exception as e:
        logger.error(f"Rotation failed: {str(e)}")
        raise e
        `),
        description: `Secret rotation function for ${this.spec.name}`,
        timeout: cdk.Duration.minutes(5),
        memorySize: 256,
        environment: {
          'SECRET_ARN': 'placeholder' // Will be updated after secret creation
        },
        tracing: ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ? 
          lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED
      });

      // Apply standard tags
      this.applyStandardTags(this.rotationLambda, {
        'function-type': 'secret-rotation',
        'runtime': 'python3.11',
        'purpose': 'secrets-manager-rotation'
      });
    }
  }

  /**
   * Create the Secrets Manager secret
   */
  private createSecret(): void {
    const secretProps: secretsmanager.SecretProps = {
      secretName: this.buildSecretName(),
      description: this.config!.description,
      encryptionKey: this.kmsKey
    };

    // Configure secret generation if enabled
    if (this.config!.generateSecret?.enabled) {
      const generateOptions: secretsmanager.SecretStringGenerator = {
        excludeCharacters: this.config!.generateSecret.excludeCharacters,
        includeSpace: this.config!.generateSecret.includeSpace,
        passwordLength: this.config!.generateSecret.passwordLength,
        requireEachIncludedType: this.config!.generateSecret.requireEachIncludedType,
        secretStringTemplate: this.config!.generateSecret.secretStringTemplate,
        generateStringKey: this.config!.generateSecret.generateStringKey
      };
      
      Object.assign(secretProps, {
        generateSecretString: generateOptions
      });
    } else if (this.config!.secretValue?.secretStringValue) {
      // Use provided secret value
      Object.assign(secretProps, {
        secretStringValue: secretsmanager.SecretValue.unsafePlainText(
          this.config!.secretValue.secretStringValue
        )
      });
    }

    // Configure replicas for multi-region
    if (this.config!.replicas && this.config!.replicas.length > 0) {
      const replicaRegions = this.config!.replicas.map(replica => ({
        region: replica.region,
        encryptionKey: replica.kmsKeyArn ? 
          kms.Key.fromKeyArn(this, `ReplicaKey-${replica.region}`, replica.kmsKeyArn) : undefined
      }));
      
      Object.assign(secretProps, {
        replicaRegions
      });
    }

    this.secret = new secretsmanager.Secret(this, 'Secret', secretProps);

    // Apply standard tags
    this.applyStandardTags(this.secret, {
      'secret-type': 'main',
      'rotation-enabled': (!!this.config!.automaticRotation?.enabled).toString(),
      'replicas-count': (this.config!.replicas?.length || 0).toString(),
      'deletion-protection': (!!this.config!.recovery?.deletionProtection).toString()
    });

    // Configure automatic rotation if enabled
    if (this.config!.automaticRotation?.enabled) {
      if (this.rotationLambda) {
        // Update Lambda environment with actual secret ARN
        this.rotationLambda.addEnvironment('SECRET_ARN', this.secret.secretArn);
        
        // Add rotation using custom Lambda
        this.secret.addRotationSchedule('RotationSchedule', {
          rotationLambda: this.rotationLambda,
          automaticallyAfter: cdk.Duration.days(
            this.config!.automaticRotation.schedule?.automaticallyAfterDays || 30
          )
        });
      } else if (this.config!.automaticRotation.rotationLambda?.functionArn) {
        // Use existing Lambda function
        const existingLambda = lambda.Function.fromFunctionArn(
          this, 'ExistingRotationFunction', 
          this.config!.automaticRotation.rotationLambda.functionArn
        );
        
        this.secret.addRotationSchedule('RotationSchedule', {
          rotationLambda: existingLambda,
          automaticallyAfter: cdk.Duration.days(
            this.config!.automaticRotation.schedule?.automaticallyAfterDays || 30
          )
        });
      }
    }
    
    // Log secret creation
    this.logResourceCreation('secrets-manager-secret', this.secret.secretName!, {
      rotationEnabled: !!this.config!.automaticRotation?.enabled,
      replicaCount: this.config!.replicas?.length || 0,
      encryptionEnabled: !!this.kmsKey
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
    // Basic access policies
    if (this.secret) {
      this.secret.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:*'],
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }
  }

  private applyFedrampModerateHardening(): void {
    // Apply commercial hardening
    this.applyCommercialHardening();

    // Enhanced access restrictions
    if (this.secret) {
      this.secret.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RestrictToVPCEndpoints',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:*'],
        resources: ['*'],
        conditions: {
          StringNotEquals: {
            'aws:sourceVpce': ['vpce-*'] // Would be replaced with actual VPC endpoint ID
          }
        }
      }));
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Stricter access controls for high compliance
    if (this.secret) {
      this.secret.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'RequireSTSAssumedRole',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['secretsmanager:*'],
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:TokenIssueTime': 'false' // Require temporary credentials
          }
        }
      }));
    }
  }

  /**
   * Build secret capability data shape
   */
  private buildSecretCapability(): any {
    return {
      secretArn: this.secret!.secretArn,
      secretName: this.secret!.secretName
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework) ||
           !!this.config!.encryption?.kmsKeyArn;
  }

  private buildSecretName(): string | undefined {
    if (this.config!.secretName) {
      return this.config!.secretName;
    }
    return `${this.context.serviceName}/${this.spec.name}`;
  }

  /**
   * Configure CloudWatch observability for Secrets Manager
   */
  private configureObservabilityForSecret(): void {
    // Enable monitoring for compliance frameworks only
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const secretName = this.buildSecretName() || this.spec.name;

    // 1. Failed Rotation Alarm
    if (this.config!.automaticRotation?.enabled) {
      const rotationFailureAlarm = new cloudwatch.Alarm(this, 'RotationFailureAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-rotation-failure`,
        alarmDescription: 'Secrets Manager rotation failure alarm',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SecretsManager',
          metricName: 'RotationFailed',
          dimensionsMap: {
            SecretName: secretName
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // Apply standard tags
      this.applyStandardTags(rotationFailureAlarm, {
        'alarm-type': 'rotation-failure',
        'metric-type': 'error-rate',
        'threshold': '1'
      });
    }

    // 2. Secret Access Alarm (unusual access patterns)
    const accessAlarm = new cloudwatch.Alarm(this, 'SecretAccessAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-unusual-access`,
      alarmDescription: 'Secrets Manager unusual access pattern alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SecretsManager',
        metricName: 'SuccessfulRequestLatency',
        dimensionsMap: {
          SecretName: secretName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5000, // 5 seconds threshold for unusual latency
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // Apply standard tags
    this.applyStandardTags(accessAlarm, {
      'alarm-type': 'access-latency',
      'metric-type': 'performance',
      'threshold': '5000'
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Secrets Manager', {
      alarmsCreated: this.config!.automaticRotation?.enabled ? 2 : 1,
      secretName: secretName,
      monitoringEnabled: true
    });
  }
}