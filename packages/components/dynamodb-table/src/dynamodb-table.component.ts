/**
 * DynamoDB Table Component implementing Component API Contract v1.0
 * 
 * A managed NoSQL database table with comprehensive compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../platform/contracts/src';

/**
 * Configuration interface for DynamoDB Table component
 */
export interface DynamoDbTableConfig {
  /** Table name (optional, defaults to component name) */
  tableName?: string;
  
  /** Partition key configuration */
  partitionKey: {
    name: string;
    type: 'string' | 'number' | 'binary';
  };
  
  /** Sort key configuration (optional) */
  sortKey?: {
    name: string;
    type: 'string' | 'number' | 'binary';
  };
  
  /** Billing mode */
  billingMode?: 'pay-per-request' | 'provisioned';
  
  /** Provisioned throughput (required if billingMode is provisioned) */
  provisioned?: {
    readCapacity: number;
    writeCapacity: number;
  };
  
  /** Global Secondary Indexes */
  globalSecondaryIndexes?: Array<{
    indexName: string;
    partitionKey: {
      name: string;
      type: 'string' | 'number' | 'binary';
    };
    sortKey?: {
      name: string;
      type: 'string' | 'number' | 'binary';
    };
    projectionType?: 'all' | 'keys-only' | 'include';
    nonKeyAttributes?: string[];
    provisioned?: {
      readCapacity: number;
      writeCapacity: number;
    };
  }>;
  
  /** Local Secondary Indexes */
  localSecondaryIndexes?: Array<{
    indexName: string;
    sortKey: {
      name: string;
      type: 'string' | 'number' | 'binary';
    };
    projectionType?: 'all' | 'keys-only' | 'include';
    nonKeyAttributes?: string[];
  }>;
  
  /** Time to Live configuration */
  timeToLive?: {
    attributeName: string;
  };
  
  /** Stream configuration */
  stream?: {
    viewType: 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images';
  };
  
  /** Point-in-time recovery */
  pointInTimeRecovery?: boolean;
  
  /** Encryption configuration */
  encryption?: {
    type: 'aws-managed' | 'customer-managed';
    kmsKeyArn?: string;
  };
  
  /** Backup configuration */
  backup?: {
    enabled?: boolean;
    retentionPeriod?: number;
  };
  
  /** Tags for the table */
  tags?: Record<string, string>;
}

/**
 * Configuration schema for DynamoDB Table component
 */
export const DYNAMODB_TABLE_CONFIG_SCHEMA = {
  type: 'object',
  title: 'DynamoDB Table Configuration',
  description: 'Configuration for creating a DynamoDB table',
  required: ['partitionKey'],
  properties: {
    tableName: {
      type: 'string',
      description: 'Name of the DynamoDB table',
      pattern: '^[a-zA-Z0-9_.-]+$',
      minLength: 3,
      maxLength: 255
    },
    partitionKey: {
      type: 'object',
      description: 'Partition key configuration',
      required: ['name', 'type'],
      properties: {
        name: {
          type: 'string',
          description: 'Name of the partition key attribute',
          pattern: '^[a-zA-Z0-9_.-]+$',
          minLength: 1,
          maxLength: 255
        },
        type: {
          type: 'string',
          description: 'Data type of the partition key',
          enum: ['string', 'number', 'binary'],
          default: 'string'
        }
      }
    },
    sortKey: {
      type: 'object',
      description: 'Sort key configuration (optional)',
      required: ['name', 'type'],
      properties: {
        name: {
          type: 'string',
          description: 'Name of the sort key attribute',
          pattern: '^[a-zA-Z0-9_.-]+$',
          minLength: 1,
          maxLength: 255
        },
        type: {
          type: 'string',
          description: 'Data type of the sort key',
          enum: ['string', 'number', 'binary'],
          default: 'string'
        }
      }
    },
    billingMode: {
      type: 'string',
      description: 'Billing mode for the table',
      enum: ['pay-per-request', 'provisioned'],
      default: 'pay-per-request'
    },
    provisioned: {
      type: 'object',
      description: 'Provisioned throughput settings',
      required: ['readCapacity', 'writeCapacity'],
      properties: {
        readCapacity: {
          type: 'number',
          description: 'Provisioned read capacity units',
          minimum: 1,
          maximum: 40000,
          default: 5
        },
        writeCapacity: {
          type: 'number',
          description: 'Provisioned write capacity units',
          minimum: 1,
          maximum: 40000,
          default: 5
        }
      }
    },
    globalSecondaryIndexes: {
      type: 'array',
      description: 'Global Secondary Indexes',
      items: {
        type: 'object',
        required: ['indexName', 'partitionKey'],
        properties: {
          indexName: {
            type: 'string',
            description: 'Name of the GSI',
            pattern: '^[a-zA-Z0-9_.-]+$',
            minLength: 3,
            maxLength: 255
          },
          partitionKey: {
            type: 'object',
            description: 'GSI partition key',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string', pattern: '^[a-zA-Z0-9_.-]+$' },
              type: { type: 'string', enum: ['string', 'number', 'binary'] }
            }
          },
          sortKey: {
            type: 'object',
            description: 'GSI sort key (optional)',
            required: ['name', 'type'],
            properties: {
              name: { type: 'string', pattern: '^[a-zA-Z0-9_.-]+$' },
              type: { type: 'string', enum: ['string', 'number', 'binary'] }
            }
          },
          projectionType: {
            type: 'string',
            description: 'Projection type for GSI',
            enum: ['all', 'keys-only', 'include'],
            default: 'all'
          }
        }
      }
    },
    pointInTimeRecovery: {
      type: 'boolean',
      description: 'Enable point-in-time recovery',
      default: false
    },
    encryption: {
      type: 'object',
      description: 'Encryption configuration',
      properties: {
        type: {
          type: 'string',
          description: 'Encryption type',
          enum: ['aws-managed', 'customer-managed'],
          default: 'aws-managed'
        },
        kmsKeyArn: {
          type: 'string',
          description: 'KMS key ARN for customer-managed encryption',
          pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]+$'
        }
      }
    },
    stream: {
      type: 'object',
      description: 'DynamoDB Streams configuration',
      properties: {
        viewType: {
          type: 'string',
          description: 'Stream view type',
          enum: ['keys-only', 'new-image', 'old-image', 'new-and-old-images'],
          default: 'new-and-old-images'
        }
      }
    }
  },
  additionalProperties: false
};

/**
 * Configuration builder for DynamoDB Table component
 */
export class DynamoDbTableConfigBuilder {
  private context: ComponentContext;
  private spec: ComponentSpec;
  
  constructor(context: ComponentContext, spec: ComponentSpec) {
    this.context = context;
    this.spec = spec;
  }

  /**
   * Builds the final configuration by applying platform defaults, compliance frameworks, and user overrides
   */
  public async build(): Promise<DynamoDbTableConfig> {
    return this.buildSync();
  }

  /**
   * Synchronous version of build for use in synth() method
   */
  public buildSync(): DynamoDbTableConfig {
    // Start with platform defaults
    const platformDefaults = this.getPlatformDefaults();
    
    // Apply compliance framework defaults
    const complianceDefaults = this.getComplianceFrameworkDefaults();
    
    // Merge user configuration from spec
    const userConfig = this.spec.config || {};
    
    // Merge configurations (user config takes precedence)
    let mergedConfig = this.mergeConfigs(
      this.mergeConfigs(platformDefaults, complianceDefaults),
      userConfig
    );
    
    // Apply feature flag-driven configuration overrides
    mergedConfig = this.applyFeatureFlagOverrides(mergedConfig);
    
    return mergedConfig as DynamoDbTableConfig;
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
   * Get platform-wide defaults for DynamoDB Table
   */
  private getPlatformDefaults(): Record<string, any> {
    return {
      billingMode: 'pay-per-request',
      pointInTimeRecovery: false,
      encryption: {
        type: 'aws-managed'
      },
      backup: {
        enabled: false,
        retentionPeriod: 7
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
          pointInTimeRecovery: true, // Mandatory for compliance
          encryption: {
            type: 'customer-managed' // Customer-managed KMS required
          },
          backup: {
            enabled: true,
            retentionPeriod: 30 // Extended retention for compliance
          }
        };
        
      case 'fedramp-high':
        return {
          pointInTimeRecovery: true, // Mandatory for high compliance
          encryption: {
            type: 'customer-managed' // Customer-managed KMS required
          },
          backup: {
            enabled: true,
            retentionPeriod: 90 // Maximum retention for high compliance
          }
        };
        
      default: // commercial
        return {
          pointInTimeRecovery: false, // Cost optimization
          encryption: {
            type: 'aws-managed' // AWS-managed encryption sufficient
          }
        };
    }
  }

  /**
   * Apply feature flag-driven configuration overrides
   */
  private applyFeatureFlagOverrides(config: Record<string, any>): Record<string, any> {
    const result = { ...config };

    // Evaluate feature flags for enhanced backup strategy
    if (this.evaluateFeatureFlag('enable-enhanced-backup', false)) {
      result.backupRetention = Math.max(result.backupRetention || 7, 30); // At least 30 days
      result.pointInTimeRecovery = true;
    }

    // Evaluate feature flags for performance mode
    if (this.evaluateFeatureFlag('enable-performance-mode', false)) {
      result.billingMode = 'provisioned';
      result.readCapacity = Math.max(result.readCapacity || 5, 20);
      result.writeCapacity = Math.max(result.writeCapacity || 5, 20);
    }

    // Evaluate feature flags for enhanced encryption
    if (this.evaluateFeatureFlag('force-customer-managed-encryption', false)) {
      result.encryption = {
        type: 'customer-managed'
      };
    }

    return result;
  }

  /**
   * Evaluate a feature flag with fallback to default value
   */
  private evaluateFeatureFlag(flagKey: string, defaultValue: boolean): boolean {
    // In a real implementation, this would:
    // 1. Connect to the bound OpenFeature provider component
    // 2. Evaluate the flag using the provider's client
    // 3. Return the result with proper error handling
    
    // For now, return enhanced behavior for compliance frameworks
    if (this.context.complianceFramework !== 'commercial') {
      return true; // Enable enhanced features for compliance frameworks
    }
    
    return defaultValue;
  }
}

/**
 * DynamoDB Table Component implementing Component API Contract v1.0
 */
export class DynamoDbTableComponent extends Component {
  private table?: dynamodb.Table;
  private kmsKey?: kms.Key;
  private config?: DynamoDbTableConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create DynamoDB table with compliance hardening
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting DynamoDB table synthesis');
    
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new DynamoDbTableConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Create KMS key if customer-managed encryption is required
      this.createKmsKeyIfNeeded();
      
      // Create DynamoDB table
      this.createDynamoDbTable();
      
      // Configure observability (OpenTelemetry Standard)
      this.configureObservabilityForTable();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('table', this.table!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      
      // Register capabilities
      this.registerCapability('db:dynamodb', this.buildDynamoDbCapability());
      
      this.logComponentEvent('synthesis_complete', 'DynamoDB table synthesis completed successfully');
    } catch (error) {
      this.logError(error as Error, 'DynamoDB table synthesis');
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
    return 'dynamodb-table';
  }

  /**
   * Create KMS key for customer-managed encryption if needed
   */
  private createKmsKeyIfNeeded(): void {
    if (this.config!.encryption?.type === 'customer-managed') {
      this.kmsKey = new kms.Key(this, 'TableKmsKey', {
        description: `DynamoDB encryption key for ${this.context.serviceName}-${this.spec.name}`,
        enableKeyRotation: true,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        policy: this.buildKmsKeyPolicy(),
        removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
      });

      // Apply standard tags
      this.applyStandardTags(this.kmsKey, {
        'resource-type': 'kms-key',
        'encryption-scope': 'dynamodb-table'
      });

      this.logResourceCreation('kms-key', this.kmsKey.keyId);
    }
  }

  /**
   * Create DynamoDB table with configuration
   */
  private createDynamoDbTable(): void {
    const tableName = this.config!.tableName || `${this.context.serviceName}-${this.spec.name}`;
    
    // Build partition key
    const partitionKey = this.buildAttribute(this.config!.partitionKey);
    
    // Build sort key if specified
    const sortKey = this.config!.sortKey ? this.buildAttribute(this.config!.sortKey) : undefined;
    
    // Create table
    this.table = new dynamodb.Table(this, 'Table', {
      tableName,
      partitionKey,
      sortKey,
      billingMode: this.config!.billingMode === 'provisioned' 
        ? dynamodb.BillingMode.PROVISIONED 
        : dynamodb.BillingMode.PAY_PER_REQUEST,
      readCapacity: this.config!.billingMode === 'provisioned' ? this.config!.provisioned?.readCapacity : undefined,
      writeCapacity: this.config!.billingMode === 'provisioned' ? this.config!.provisioned?.writeCapacity : undefined,
      pointInTimeRecovery: this.config!.pointInTimeRecovery,
      encryption: this.buildEncryptionSpec(),
      stream: this.config!.stream ? this.mapStreamViewType(this.config!.stream.viewType) : undefined,
      timeToLiveAttribute: this.config!.timeToLive?.attributeName,
      removalPolicy: this.isComplianceFramework() ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Add Global Secondary Indexes
    this.addGlobalSecondaryIndexes();
    
    // Add Local Secondary Indexes
    this.addLocalSecondaryIndexes();

    // Apply standard tags
    this.applyStandardTags(this.table, {
      'resource-type': 'dynamodb-table',
      'billing-mode': this.config!.billingMode || 'pay-per-request',
      ...this.config!.tags
    });

    this.logResourceCreation('dynamodb-table', this.table.tableName);
  }

  /**
   * Build attribute definition for keys
   */
  private buildAttribute(keyConfig: { name: string; type: string }): dynamodb.Attribute {
    const attributeType = this.mapAttributeType(keyConfig.type);
    return {
      name: keyConfig.name,
      type: attributeType
    };
  }

  /**
   * Map string attribute type to DynamoDB attribute type
   */
  private mapAttributeType(type: string): dynamodb.AttributeType {
    switch (type) {
      case 'string':
        return dynamodb.AttributeType.STRING;
      case 'number':
        return dynamodb.AttributeType.NUMBER;
      case 'binary':
        return dynamodb.AttributeType.BINARY;
      default:
        throw new Error(`Unsupported attribute type: ${type}`);
    }
  }

  /**
   * Build encryption specification
   */
  private buildEncryptionSpec(): dynamodb.TableEncryption {
    const encryptionConfig = this.config!.encryption;
    
    if (encryptionConfig?.type === 'customer-managed') {
      return dynamodb.TableEncryption.CUSTOMER_MANAGED;
    }
    
    return dynamodb.TableEncryption.AWS_MANAGED;
  }

  /**
   * Map stream view type string to DynamoDB enum
   */
  private mapStreamViewType(viewType: string): dynamodb.StreamViewType {
    switch (viewType) {
      case 'keys-only':
        return dynamodb.StreamViewType.KEYS_ONLY;
      case 'new-image':
        return dynamodb.StreamViewType.NEW_IMAGE;
      case 'old-image':
        return dynamodb.StreamViewType.OLD_IMAGE;
      case 'new-and-old-images':
        return dynamodb.StreamViewType.NEW_AND_OLD_IMAGES;
      default:
        throw new Error(`Unsupported stream view type: ${viewType}`);
    }
  }

  /**
   * Add Global Secondary Indexes to the table
   */
  private addGlobalSecondaryIndexes(): void {
    if (!this.config!.globalSecondaryIndexes) return;

    for (const gsiConfig of this.config!.globalSecondaryIndexes) {
      const partitionKey = this.buildAttribute(gsiConfig.partitionKey);
      const sortKey = gsiConfig.sortKey ? this.buildAttribute(gsiConfig.sortKey) : undefined;
      
      this.table!.addGlobalSecondaryIndex({
        indexName: gsiConfig.indexName,
        partitionKey,
        sortKey,
        projectionType: this.mapProjectionType(gsiConfig.projectionType || 'all'),
        nonKeyAttributes: gsiConfig.nonKeyAttributes,
        readCapacity: gsiConfig.provisioned?.readCapacity,
        writeCapacity: gsiConfig.provisioned?.writeCapacity
      });
    }
  }

  /**
   * Add Local Secondary Indexes to the table
   */
  private addLocalSecondaryIndexes(): void {
    if (!this.config!.localSecondaryIndexes) return;

    for (const lsiConfig of this.config!.localSecondaryIndexes) {
      const sortKey = this.buildAttribute(lsiConfig.sortKey);
      
      this.table!.addLocalSecondaryIndex({
        indexName: lsiConfig.indexName,
        sortKey,
        projectionType: this.mapProjectionType(lsiConfig.projectionType || 'all'),
        nonKeyAttributes: lsiConfig.nonKeyAttributes
      });
    }
  }

  /**
   * Map projection type string to DynamoDB enum
   */
  private mapProjectionType(projectionType: string): dynamodb.ProjectionType {
    switch (projectionType) {
      case 'all':
        return dynamodb.ProjectionType.ALL;
      case 'keys-only':
        return dynamodb.ProjectionType.KEYS_ONLY;
      case 'include':
        return dynamodb.ProjectionType.INCLUDE;
      default:
        throw new Error(`Unsupported projection type: ${projectionType}`);
    }
  }

  /**
   * Build KMS key policy for DynamoDB encryption
   */
  private buildKmsKeyPolicy(): iam.PolicyDocument {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'Enable IAM User Permissions',
          effect: iam.Effect.ALLOW,
          principals: [new iam.AccountRootPrincipal()],
          actions: ['kms:*'],
          resources: ['*']
        }),
        new iam.PolicyStatement({
          sid: 'Allow DynamoDB Service',
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal('dynamodb.amazonaws.com')],
          actions: [
            'kms:Decrypt',
            'kms:DescribeKey',
            'kms:Encrypt',
            'kms:GenerateDataKey*',
            'kms:ReEncrypt*'
          ],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'kms:ViaService': `dynamodb.${this.context.region || 'us-east-1'}.amazonaws.com`
            }
          }
        })
      ]
    });
  }

  /**
   * Build DynamoDB capability data shape
   */
  private buildDynamoDbCapability(): any {
    return {
      tableName: this.table!.tableName,
      tableArn: this.table!.tableArn,
      streamArn: this.table!.tableStreamArn
    };
  }


  /**
   * Configure OpenTelemetry Observability Standard - CloudWatch Alarms for DynamoDB Table
   */
  private configureObservabilityForTable(): void {
    const tableName = this.table!.tableName;

    // 1. Throttled Requests Alarm - Read
    new cloudwatch.Alarm(this, 'ReadThrottleAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-read-throttles`,
      alarmDescription: 'DynamoDB table read throttles alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ReadThrottledRequests',
        dimensionsMap: {
          TableName: tableName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. Throttled Requests Alarm - Write
    new cloudwatch.Alarm(this, 'WriteThrottleAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-write-throttles`,
      alarmDescription: 'DynamoDB table write throttles alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'WriteThrottledRequests',
        dimensionsMap: {
          TableName: tableName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. System Errors Alarm
    new cloudwatch.Alarm(this, 'SystemErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-system-errors`,
      alarmDescription: 'DynamoDB table system errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'SystemErrors',
        dimensionsMap: {
          TableName: tableName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 4. User Errors Alarm  
    new cloudwatch.Alarm(this, 'UserErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-user-errors`,
      alarmDescription: 'DynamoDB table user errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'UserErrors',
        dimensionsMap: {
          TableName: tableName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to DynamoDB table', {
      alarmsCreated: 4,
      tableName: tableName,
      metricsEnabled: true
    });
  }

  /**
   * Apply compliance hardening with auto-scaling for FedRAMP environments
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  /**
   * Apply FedRAMP High compliance hardening with mandatory auto-scaling
   */
  private applyFedrampHighHardening(): void {
    // Enable auto-scaling for provisioned tables in compliance environments
    this.configureAutoScaling();
    
    this.logComplianceEvent('fedramp_high_hardening_applied', 'Applied FedRAMP High hardening to DynamoDB table', {
      encryptionEnabled: true,
      pointInTimeRecovery: this.config!.pointInTimeRecovery,
      backupEnabled: this.config!.backup?.enabled,
      autoScalingConfigured: this.isProvisionedMode()
    });
  }

  /**
   * Apply FedRAMP Moderate compliance hardening with auto-scaling
   */
  private applyFedrampModerateHardening(): void {
    // Enable auto-scaling for provisioned tables in compliance environments
    this.configureAutoScaling();
    
    this.logComplianceEvent('fedramp_moderate_hardening_applied', 'Applied FedRAMP Moderate hardening to DynamoDB table', {
      encryptionEnabled: true,
      pointInTimeRecovery: this.config!.pointInTimeRecovery,
      autoScalingConfigured: this.isProvisionedMode()
    });
  }

  /**
   * Apply commercial hardening
   */
  private applyCommercialHardening(): void {
    this.logComponentEvent('commercial_hardening_applied', 'Applied commercial security hardening to DynamoDB table');
  }

  /**
   * Configure auto-scaling for provisioned throughput to prevent throttling
   */
  private configureAutoScaling(): void {
    if (!this.isProvisionedMode()) {
      return; // Auto-scaling only applies to provisioned mode
    }

    const tableName = this.table!.tableName;

    // Configure table-level auto-scaling
    this.enableTableAutoScaling(tableName);

    // Configure GSI auto-scaling if GSIs exist
    if (this.config!.globalSecondaryIndexes) {
      for (const gsi of this.config!.globalSecondaryIndexes) {
        if (gsi.provisioned) {
          this.enableGsiAutoScaling(tableName, gsi.indexName);
        }
      }
    }

    this.logComponentEvent('autoscaling_configured', 'Auto-scaling configured for DynamoDB table', {
      tableName: tableName,
      gsiCount: this.config!.globalSecondaryIndexes?.length || 0
    });
  }

  /**
   * Enable auto-scaling for table read/write capacity
   */
  private enableTableAutoScaling(tableName: string): void {
    // Read capacity auto-scaling
    const readTarget = new applicationautoscaling.ScalableTarget(this, 'TableReadTarget', {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: 'dynamodb:table:ReadCapacityUnits',
      resourceId: `table/${tableName}`,
      minCapacity: this.config!.provisioned?.readCapacity || 5,
      maxCapacity: Math.max((this.config!.provisioned?.readCapacity || 5) * 10, 40000)
    });

    readTarget.scaleToTrackMetric('TableReadCapacityUtilization', {
      targetValue: 70.0,
      predefinedMetric: applicationautoscaling.PredefinedMetric.DYNAMODB_READ_CAPACITY_UTILIZATION,
      scaleOutCooldown: cdk.Duration.minutes(1),
      scaleInCooldown: cdk.Duration.minutes(1)
    });

    // Write capacity auto-scaling
    const writeTarget = new applicationautoscaling.ScalableTarget(this, 'TableWriteTarget', {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: 'dynamodb:table:WriteCapacityUnits',
      resourceId: `table/${tableName}`,
      minCapacity: this.config!.provisioned?.writeCapacity || 5,
      maxCapacity: Math.max((this.config!.provisioned?.writeCapacity || 5) * 10, 40000)
    });

    writeTarget.scaleToTrackMetric('TableWriteCapacityUtilization', {
      targetValue: 70.0,
      predefinedMetric: applicationautoscaling.PredefinedMetric.DYNAMODB_WRITE_CAPACITY_UTILIZATION,
      scaleOutCooldown: cdk.Duration.minutes(1),
      scaleInCooldown: cdk.Duration.minutes(1)
    });
  }

  /**
   * Enable auto-scaling for GSI read/write capacity
   */
  private enableGsiAutoScaling(tableName: string, indexName: string): void {
    const gsiConfig = this.config!.globalSecondaryIndexes?.find(gsi => gsi.indexName === indexName);
    if (!gsiConfig?.provisioned) return;

    // GSI Read capacity auto-scaling
    const gsiReadTarget = new applicationautoscaling.ScalableTarget(this, `Gsi${indexName}ReadTarget`, {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: 'dynamodb:index:ReadCapacityUnits',
      resourceId: `table/${tableName}/index/${indexName}`,
      minCapacity: gsiConfig.provisioned.readCapacity,
      maxCapacity: Math.max(gsiConfig.provisioned.readCapacity * 10, 40000)
    });

    gsiReadTarget.scaleToTrackMetric(`Gsi${indexName}ReadCapacityUtilization`, {
      targetValue: 70.0,
      predefinedMetric: applicationautoscaling.PredefinedMetric.DYNAMODB_READ_CAPACITY_UTILIZATION,
      scaleOutCooldown: cdk.Duration.minutes(1),
      scaleInCooldown: cdk.Duration.minutes(1)
    });

    // GSI Write capacity auto-scaling
    const gsiWriteTarget = new applicationautoscaling.ScalableTarget(this, `Gsi${indexName}WriteTarget`, {
      serviceNamespace: applicationautoscaling.ServiceNamespace.DYNAMODB,
      scalableDimension: 'dynamodb:index:WriteCapacityUnits',
      resourceId: `table/${tableName}/index/${indexName}`,
      minCapacity: gsiConfig.provisioned.writeCapacity,
      maxCapacity: Math.max(gsiConfig.provisioned.writeCapacity * 10, 40000)
    });

    gsiWriteTarget.scaleToTrackMetric(`Gsi${indexName}WriteCapacityUtilization`, {
      targetValue: 70.0,
      predefinedMetric: applicationautoscaling.PredefinedMetric.DYNAMODB_WRITE_CAPACITY_UTILIZATION,
      scaleOutCooldown: cdk.Duration.minutes(1),
      scaleInCooldown: cdk.Duration.minutes(1)
    });
  }

  /**
   * Check if table is using provisioned billing mode
   */
  private isProvisionedMode(): boolean {
    return this.config!.billingMode === 'provisioned';
  }

  /**
   * Check if this is a compliance framework
   */
  private isComplianceFramework(): boolean {
    return this.context.complianceFramework !== 'commercial';
  }
}