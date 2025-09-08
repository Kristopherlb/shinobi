/**
 * RDS PostgreSQL Component
 * 
 * A managed PostgreSQL relational database with comprehensive compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 * 
 * @platform/component Compliant with Platform Standards v1.0:
 * - Extends BaseComponent for shared functionality
 * - Uses ConfigBuilder for 5-layer configuration precedence
 * - Integrates with ObservabilityService via Service Injector Pattern
 * - Integrates with LoggingService for structured logging
 */

import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder
} from '../../platform/contracts';

/**
 * Configuration interface for RDS PostgreSQL component
 * Simplified developer experience as specified in n-components-spec.md
 */
export interface RdsPostgresConfig {
  /** Database name (required) */
  dbName: string;
  
  /** Instance class - simple, business-logic parameter */
  instanceClass?: string;
  
  /** Allocated storage in GB - simple, business-logic parameter */
  allocatedStorage?: number;
  
  /** Max allocated storage for auto-scaling */
  maxAllocatedStorage?: number;
  
  /** Internal configuration managed by platform (compliance-aware) */
  username?: string;
  multiAz?: boolean;
  backupRetentionDays?: number;
  backupWindow?: string;
  maintenanceWindow?: string;
  encryptionEnabled?: boolean;
  kmsKeyArn?: string;
  deletionProtection?: boolean;
  performanceInsights?: {
    enabled?: boolean;
    retentionPeriod?: number;
  };
  enhancedMonitoring?: {
    enabled?: boolean;
    interval?: number;
    monitoringRoleArn?: string; // IAM role for enhanced monitoring
  };
  
  /** PostgreSQL log exports configuration (Platform Observability Standard v1.0) */
  logExports?: {
    postgresql?: boolean; // Export PostgreSQL logs to CloudWatch
    slowQuery?: boolean;  // Export slow query logs  
    errorLog?: boolean;   // Export error logs
  };
  
  /** Connection monitoring configuration */
  connectionMonitoring?: {
    enabled?: boolean;
    deadlockDetection?: boolean;
    connectionPoolMetrics?: boolean;
  };
  
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
  };
}

/**
 * Configuration schema for RDS PostgreSQL component
 */
export const RDS_POSTGRES_CONFIG_SCHEMA = {
  type: 'object',
  title: 'RDS PostgreSQL Configuration',
  description: 'Configuration for creating an RDS PostgreSQL database instance',
  required: ['dbName'],
  properties: {
    dbName: {
      type: 'string',
      description: 'The name of the database to create',
      pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
      minLength: 1,
      maxLength: 63
    },
    username: {
      type: 'string',
      description: 'The master username for the database',
      pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
      minLength: 1,
      maxLength: 63,
      default: 'postgres'
    },
    instanceClass: {
      type: 'string',
      description: 'The EC2 instance class for the database',
      enum: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.t3.large', 
             'db.r5.large', 'db.r5.xlarge', 'db.r5.2xlarge', 'db.r5.4xlarge'],
      default: 'db.t3.micro'
    },
    allocatedStorage: {
      type: 'number',
      description: 'The initial storage allocation in GB',
      minimum: 20,
      maximum: 65536,
      default: 20
    },
    maxAllocatedStorage: {
      type: 'number',
      description: 'Maximum storage allocation for auto-scaling in GB',
      minimum: 20,
      maximum: 65536
    },
    multiAz: {
      type: 'boolean',
      description: 'Enable Multi-AZ deployment for high availability',
      default: false
    },
    backupRetentionDays: {
      type: 'number',
      description: 'Number of days to retain backups',
      minimum: 0,
      maximum: 35,
      default: 7
    },
    backupWindow: {
      type: 'string',
      description: 'Daily backup window in UTC (HH:mm-HH:mm format)',
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
    },
    maintenanceWindow: {
      type: 'string',
      description: 'Weekly maintenance window (ddd:HH:mm-ddd:HH:mm format)',
      pattern: '^(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]-(sun|mon|tue|wed|thu|fri|sat):[0-2][0-9]:[0-5][0-9]$'
    },
    encryptionEnabled: {
      type: 'boolean',
      description: 'Enable encryption at rest for the database',
      default: false
    },
    kmsKeyArn: {
      type: 'string',
      description: 'KMS key ARN for encryption (if not provided, AWS managed key is used)',
      pattern: '^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]{36}$'
    },
    vpc: {
      type: 'object',
      description: 'VPC configuration for database deployment',
      properties: {
        vpcId: {
          type: 'string',
          description: 'VPC ID for database deployment',
          pattern: '^vpc-[a-f0-9]{8,17}$'
        },
        subnetIds: {
          type: 'array',
          description: 'Subnet IDs for database subnet group',
          items: {
            type: 'string',
            pattern: '^subnet-[a-f0-9]{8,17}$'
          },
          minItems: 2,
          maxItems: 6
        },
        securityGroupIds: {
          type: 'array',
          description: 'Security group IDs for database access',
          items: {
            type: 'string',
            pattern: '^sg-[a-f0-9]{8,17}$'
          },
          maxItems: 5
        }
      },
      additionalProperties: false
    },
    performanceInsights: {
      type: 'object',
      description: 'Performance Insights configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable Performance Insights',
          default: false
        },
        retentionPeriod: {
          type: 'number',
          description: 'Performance Insights retention period in days',
          enum: [7, 31, 93, 186, 372, 731, 1095, 1827, 2555],
          default: 7
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        retentionPeriod: 7
      }
    },
    enhancedMonitoring: {
      type: 'object',
      description: 'Enhanced monitoring configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable enhanced monitoring',
          default: false
        },
        interval: {
          type: 'number',
          description: 'Monitoring interval in seconds',
          enum: [1, 5, 10, 15, 30, 60],
          default: 60
        }
      },
      additionalProperties: false,
      default: {
        enabled: false,
        interval: 60
      }
    },
    
    logExports: {
      type: 'object',
      description: 'PostgreSQL log exports configuration (Platform Observability Standard v1.0)',
      properties: {
        postgresql: {
          type: 'boolean',
          description: 'Export PostgreSQL general logs to CloudWatch',
          default: true
        },
        slowQuery: {
          type: 'boolean',
          description: 'Export slow query logs to CloudWatch',
          default: true
        },
        errorLog: {
          type: 'boolean',
          description: 'Export PostgreSQL error logs to CloudWatch',
          default: true
        }
      },
      additionalProperties: false,
      default: {
        postgresql: true,
        slowQuery: true,
        errorLog: true
      }
    },
    
    connectionMonitoring: {
      type: 'object',
      description: 'Connection and performance monitoring configuration',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable connection monitoring',
          default: true
        },
        deadlockDetection: {
          type: 'boolean',
          description: 'Enable deadlock detection and monitoring',
          default: true
        },
        connectionPoolMetrics: {
          type: 'boolean',
          description: 'Enable connection pool metrics collection',
          default: true
        }
      },
      additionalProperties: false,
      default: {
        enabled: true,
        deadlockDetection: true,
        connectionPoolMetrics: true
      }
    }
  },
  additionalProperties: false,
  defaults: {
    username: 'postgres',
    instanceClass: 'db.t3.micro',
    allocatedStorage: 20,
    backupRetentionDays: 7,
    multiAz: false,
    encryptionEnabled: false,
    performanceInsights: {
      enabled: false,
      retentionPeriod: 7
    },
    enhancedMonitoring: {
      enabled: false,
      interval: 60
    }
  }
};

/**
 * Configuration builder for RDS PostgreSQL component
 * Extends the abstract ConfigBuilder to ensure consistent configuration lifecycle
 */
export class RdsPostgresConfigBuilder extends ConfigBuilder<RdsPostgresConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    super({ context, spec }, RDS_POSTGRES_CONFIG_SCHEMA);
  }

  /**
   * Get security-safe hardcoded fallbacks for RDS PostgreSQL
   * Compliant with Platform Configuration Standard v1.0 Section 3.1
   * 
   * SECURITY PRINCIPLE: Hardcoded fallbacks must be ultra-safe, minimal defaults
   * that force explicit configuration of security-sensitive values.
   */
  protected getHardcodedFallbacks(): RdsPostgresConfig {
    return {
      // ✅ REQUIRED: dbName must be provided explicitly - no default database name
      dbName: '', // Empty forces explicit configuration (will cause validation error if not provided)
      
      // ✅ SECURITY-SAFE: Ultra-minimal defaults that work in any environment
      username: 'dbadmin', // Generic admin user, not service-specific
      instanceClass: 'db.t3.micro', // Smallest available instance - cost-optimized
      allocatedStorage: 20, // Minimum storage allocation
      backupRetentionDays: 1, // Minimum backup retention (not 0 to ensure some backup)
      multiAz: false, // Single-AZ for cost optimization (compliance frameworks override)
      encryptionEnabled: false, // Disabled by default (compliance frameworks override)
      deletionProtection: false, // Disabled for dev flexibility (compliance frameworks override)
      performanceInsights: {
        enabled: false, // Disabled for cost optimization (compliance frameworks override)
        retentionPeriod: 7 // Minimum retention when enabled
      },
      enhancedMonitoring: {
        enabled: false, // Disabled for cost optimization (compliance frameworks override)
        interval: 60 // Least frequent monitoring when enabled (1 minute)
      },
      logExports: {
        postgresql: false, // Disabled for cost optimization (compliance frameworks override)
        slowQuery: false, // Disabled for cost optimization (compliance frameworks override)
        errorLog: false // Disabled for cost optimization (compliance frameworks override)
      },
      connectionMonitoring: {
        enabled: false, // Disabled for cost optimization (compliance frameworks override)
        deadlockDetection: false, // Disabled for cost optimization (compliance frameworks override)
        connectionPoolMetrics: false // Disabled for cost optimization (compliance frameworks override)
      }
    };
  }

  // NOTE: Configuration merging is now handled by the base ConfigBuilder's 5-layer precedence chain.
  // No component-specific merge utilities are needed per Platform Configuration Standard v1.0.

  // REMOVED: getPlatformDefaults() - Platform defaults are now loaded from /config/*.yml files
  // by the base ConfigBuilder._loadPlatformConfiguration() method per Platform Configuration Standard v1.0.

  // REMOVED: getComplianceFrameworkDefaults() - Compliance-specific configuration is now handled
  // by the base ConfigBuilder loading from compliance-segregated /config/{framework}.yml files
  // per Platform Configuration Standard v1.0.

  // REMOVED: All getDefault* and getCompliance* methods - These bypass methods violated
  // Platform Configuration Standard v1.0 by circumventing the 5-layer precedence chain.
  // 
  // Platform configuration is now loaded from compliance-segregated YAML files:
  // - /config/commercial.yml      (Layer 2 for commercial framework)
  // - /config/fedramp-moderate.yml (Layer 2 for fedramp-moderate framework)  
  // - /config/fedramp-high.yml     (Layer 2 for fedramp-high framework)
  //
  // The base ConfigBuilder._loadPlatformConfiguration() handles all platform defaults
  // and compliance-specific configuration automatically.
}

/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
export class RdsPostgresComponent extends BaseComponent {
  private database?: rds.DatabaseInstance;
  private secret?: secretsmanager.Secret;
  private securityGroup?: ec2.SecurityGroup;
  private kmsKey?: kms.Key;
  private parameterGroup?: rds.ParameterGroup;
  private monitoringRole?: iam.Role;
  private config?: RdsPostgresConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create RDS PostgreSQL database with compliance hardening
   * Compliant with Platform Logging Standard v1.0 and Service Injector Pattern
   */
  public synth(): void {
    const logger = this.getLogger();
    const timer = logger.startTimer();
    
    logger.info('Starting RDS PostgreSQL synthesis', {
      context: { 
        action: 'component_synthesis', 
        resource: 'rds_postgres',
        component: 'rds-postgres'
      },
      data: { 
        dbName: this.spec.config?.dbName,
        instanceClass: this.spec.config?.instanceClass,
        complianceFramework: this.context.complianceFramework
      }
    });
    
    try {
      // Build configuration using standards-compliant ConfigBuilder
      const configBuilder = new RdsPostgresConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      logger.debug('Configuration built successfully', {
        context: { action: 'config_built', resource: 'rds_postgres' },
        data: {
          dbName: this.config.dbName,
          instanceClass: this.config.instanceClass,
          multiAz: this.config.multiAz,
          encryptionEnabled: this.config.encryptionEnabled
        }
      });
      
      // Create KMS key for encryption if needed
      this.createKmsKeyIfNeeded();
      
      // Create database secret
      this.createDatabaseSecret();
      
      // Create parameter group for STIG compliance if needed
      this.createParameterGroupIfNeeded();
      
      // Create security group
      this.createSecurityGroup();
      
      // Create monitoring role for enhanced monitoring (Platform Observability Standard v1.0)
      this.createMonitoringRoleIfNeeded();
      
      // Create database instance
      this.createDatabaseInstance();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('database', this.database!);
      this.registerConstruct('secret', this.secret!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      if (this.parameterGroup) {
        this.registerConstruct('parameterGroup', this.parameterGroup);
      }
      
      // Register capabilities
      this.registerCapability('db:postgres', this.buildDatabaseCapability());
      
      // Log successful completion with security context
      timer.finish('RDS PostgreSQL synthesis completed successfully', {
        context: { 
          action: 'synthesis_success', 
          resource: 'rds_postgres',
          component: 'rds-postgres'
        },
        data: { 
          instanceId: this.database!.instanceIdentifier,
          encryptionEnabled: this.shouldEnableEncryption(),
          multiAz: this.shouldEnableMultiAz(),
          performanceInsights: this.shouldEnableRdsPerformanceInsights()
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'database_created'
        }
      });
      
    } catch (error) {
      logger.error('RDS PostgreSQL synthesis failed', error, {
        context: { 
          action: 'synthesis_error', 
          resource: 'rds_postgres',
          component: 'rds-postgres'
        },
        data: { 
          dbName: this.config?.dbName,
          complianceFramework: this.context.complianceFramework
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'database_creation_failed'
        }
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
    return 'rds-postgres';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      const logger = this.getLogger();
      
      logger.info('Creating customer-managed KMS key for database encryption', {
        context: { 
          action: 'kms_key_creation', 
          resource: 'database_encryption',
          component: 'rds-postgres'
        },
        data: {
          keyRotationEnabled: this.context.complianceFramework === 'fedramp-high',
          complianceFramework: this.context.complianceFramework,
          dbName: this.spec.config?.dbName
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'encryption_key_created'
        }
      });
      
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} PostgreSQL database`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });
      
      // Apply platform standard tags plus component-specific tags
      this.applyStandardTags(this.kmsKey, {
        'key-usage': 'rds-encryption',
        'key-rotation-enabled': (this.context.complianceFramework === 'fedramp-high').toString(),
        'database-name': this.spec.config?.dbName || this.spec.name,
        'encryption-type': 'customer-managed'
      });

      // Grant RDS service access to the key
      this.kmsKey.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'AllowRDSService',
        principals: [new iam.ServicePrincipal('rds.amazonaws.com')],
        actions: [
          'kms:Decrypt',
          'kms:GenerateDataKey*',
          'kms:CreateGrant',
          'kms:DescribeKey'
        ],
        resources: ['*']
      }));
      
      logger.info('KMS key policy configured for RDS service access', {
        context: { 
          action: 'kms_policy_configured', 
          resource: 'database_encryption',
          component: 'rds-postgres'
        },
        data: { 
          keyArn: this.kmsKey.keyArn,
          servicePrincipal: 'rds.amazonaws.com'
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'kms_policy_applied'
        }
      });
    }
  }

  /**
   * Create database secret with generated password
   */
  private createDatabaseSecret(): void {
    const logger = this.getLogger();
    logger.info('Creating database credentials secret', {
      context: { 
        action: 'secret_creation', 
        resource: 'database_credentials',
        component: 'rds-postgres'
      },
      data: {
        dbName: this.config!.dbName,
        username: this.config!.username, // Username is not PII
        passwordLength: 32,
        kmsEncrypted: !!this.kmsKey
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'database_credentials_created'
      }
    });
    
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      description: `Database credentials for ${this.config!.dbName}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: this.config!.username }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        requireEachIncludedType: true,
        passwordLength: 32
      },
      encryptionKey: this.kmsKey
    });
    
    // Apply platform standard tags plus component-specific tags
    this.applyStandardTags(this.secret, {
      'secret-type': 'database-credentials',
      'database-name': this.config!.dbName,
      'rotation-enabled': 'true',
      'kms-encrypted': (!!this.kmsKey).toString()
    });
  }

  /**
   * Create parameter group for STIG compliance in FedRAMP High
   */
  private createParameterGroupIfNeeded(): void {
    if (this.context.complianceFramework === 'fedramp-high') {
      this.parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15_4
        }),
        description: 'STIG-compliant parameter group for PostgreSQL',
        parameters: {
          // STIG compliance parameters
          'log_statement': 'all',
          'log_min_duration_statement': '0',
          'log_connections': '1',
          'log_disconnections': '1',
          'log_duration': '1',
          'log_hostname': '1',
          'log_line_prefix': '%t:%r:%u@%d:[%p]:',
          'shared_preload_libraries': 'pgaudit',
          'pgaudit.log': 'all',
          'pgaudit.log_catalog': '1',
          'pgaudit.log_parameter': '1',
          'pgaudit.log_statement_once': '1',
          'ssl': '1',
          'ssl_ciphers': 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
          'password_encryption': 'scram-sha-256'
        }
      });
      
      // Apply platform standard tags plus component-specific tags
      this.applyStandardTags(this.parameterGroup, {
        'parameter-group-type': 'stig-compliance',
        'database-engine': 'postgres',
        'compliance-framework': 'fedramp-high',
        'audit-logging-enabled': 'true',
        'ssl-required': 'true'
      });
    }
  }

  /**
   * Create security group for database access
   * Compliant with Platform Configuration Standard v1.0 - no hardcoded network rules
   */
  private createSecurityGroup(): void {
    const logger = this.getLogger();
    
    // VPC configuration must be explicitly provided - no default VPC assumptions
    const vpcConfig = this.config!.vpc;
    if (!vpcConfig?.vpcId) {
      const error = new Error('VPC configuration is required for RDS deployment - cannot use default VPC for security compliance');
      logger.error('VPC configuration missing', error, {
        context: { 
          action: 'security_group_creation', 
          resource: 'database_vpc',
          component: 'rds-postgres'
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'vpc_config_missing'
        }
      });
      throw error;
    }
    
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: vpcConfig.vpcId });

    logger.info('Creating database security group with explicit VPC configuration', {
      context: { 
        action: 'security_group_creation', 
        resource: 'database_security_group',
        component: 'rds-postgres'
      },
      data: {
        vpcId: vpcConfig.vpcId,
        allowAllOutbound: false
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'database_security_group_created'
      }
    });

    this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: `Security group for ${this.config!.dbName} PostgreSQL database`,
      allowAllOutbound: false
    });
    
    // Apply platform standard tags plus component-specific tags
    this.applyStandardTags(this.securityGroup, {
      'security-group-type': 'database',
      'database-engine': 'postgres',
      'network-tier': 'database',
      'vpc-id': vpcConfig.vpcId
    });

    // NOTE: No hardcoded ingress rules - network access will be configured by binding strategies
    logger.info('Security group created - network access rules will be configured by binding strategies', {
      context: { 
        action: 'security_group_ready', 
        resource: 'database_security_group',
        component: 'rds-postgres'
      },
      data: {
        securityGroupId: this.securityGroup.securityGroupId,
        defaultIngressRules: 'none'
      }
    });
  }

  /**
   * Create IAM role for RDS Enhanced Monitoring (Platform Observability Standard v1.0)
   */
  private createMonitoringRoleIfNeeded(): void {
    // Only create if enhanced monitoring is enabled or will be enabled by compliance
    const enhancedMonitoringEnabled = this.config!.enhancedMonitoring?.enabled || 
                                     this.isComplianceFramework();
    
    if (!enhancedMonitoringEnabled) {
      return;
    }
    
    const logger = this.getLogger();
    
    // Use provided role ARN if available, otherwise create new role
    if (this.config!.enhancedMonitoring?.monitoringRoleArn) {
      logger.info('Using provided monitoring role ARN for enhanced monitoring', {
        context: { 
          action: 'monitoring_role_assignment', 
          resource: 'iam_role',
          component: 'rds-postgres'
        },
        data: {
          roleArn: this.config!.enhancedMonitoring.monitoringRoleArn,
          complianceFramework: this.context.complianceFramework
        }
      });
      return;
    }
    
    // Create new monitoring role
    this.monitoringRole = new iam.Role(this, 'MonitoringRole', {
      assumedBy: new iam.ServicePrincipal('monitoring.rds.amazonaws.com'),
      description: `Enhanced monitoring role for ${this.config!.dbName} PostgreSQL database`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole')
      ]
    });
    
    // Apply platform standard tags
    this.applyStandardTags(this.monitoringRole, {
      'role-purpose': 'rds-enhanced-monitoring',
      'database-name': this.config!.dbName,
      'monitoring-interval': this.config!.enhancedMonitoring?.interval?.toString() || '60'
    });
    
    logger.info('Created RDS Enhanced Monitoring IAM role', {
      context: { 
        action: 'monitoring_role_created', 
        resource: 'iam_role',
        component: 'rds-postgres'
      },
      data: {
        roleArn: this.monitoringRole.roleArn,
        managedPolicies: ['AmazonRDSEnhancedMonitoringRole']
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'iam_role_created'
      }
    });
  }

  /**
   * Create the RDS database instance
   */
  private createDatabaseInstance(): void {
    // Use the same VPC configuration as security group - no default VPC assumptions
    const vpcConfig = this.config!.vpc;
    if (!vpcConfig?.vpcId) {
      throw new Error('VPC configuration is required for RDS deployment');
    }
    
    const vpc = ec2.Vpc.fromLookup(this, 'VpcForDb', { vpcId: vpcConfig.vpcId });

    const props: rds.DatabaseInstanceProps = {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      credentials: rds.Credentials.fromSecret(this.secret!),
      vpc,
      securityGroups: [this.securityGroup!],
      databaseName: this.config!.dbName,
      allocatedStorage: this.config!.allocatedStorage || 20,
      maxAllocatedStorage: this.config!.maxAllocatedStorage,
      storageEncrypted: this.shouldEnableEncryption(),
      storageEncryptionKey: this.kmsKey,
      backupRetention: cdk.Duration.days(this.getBackupRetentionDays()),
      deleteAutomatedBackups: false,
      deletionProtection: this.isComplianceFramework(),
      multiAz: this.shouldEnableMultiAz(),
      parameterGroup: this.parameterGroup,
      
      // Enhanced Monitoring Configuration (Platform Observability Standard v1.0)
      monitoringInterval: this.getEnhancedMonitoringInterval(),
      monitoringRole: this.getMonitoringRole(),
      
      // Performance Insights Configuration (Platform Observability Standard v1.0)
      enablePerformanceInsights: this.shouldEnableRdsPerformanceInsights(),
      performanceInsightRetention: this.getPerformanceInsightsRetention(),
      performanceInsightEncryptionKey: this.kmsKey,
      
      // PostgreSQL Log Exports to CloudWatch (Platform Observability Standard v1.0)
      cloudwatchLogsExports: this.getCloudWatchLogExports(),
      
      removalPolicy: this.isComplianceFramework() ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    };

    this.database = new rds.DatabaseInstance(this, 'Database', props);
    
    // Apply platform standard tags plus component-specific tags
    this.applyStandardTags(this.database, {
      'database-name': this.config!.dbName,
      'database-engine': 'postgres',
      'database-version': '15.4',
      'instance-class': this.config!.instanceClass || 'db.t3.micro',
      'multi-az': (!!this.config!.multiAz).toString(),
      'backup-retention-days': this.getBackupRetentionDays().toString(),
      'performance-insights': this.shouldEnableRdsPerformanceInsights().toString(),
      'enhanced-monitoring': (!!this.config!.enhancedMonitoring?.enabled).toString(),
      'deletion-protection': (!!this.config!.deletionProtection).toString(),
      'encryption-enabled': this.shouldEnableEncryption().toString()
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
    const logger = this.getLogger();
    logger.info('Applying commercial security configuration', {
      context: { 
        action: 'compliance_hardening', 
        resource: 'rds_postgres',
        component: 'rds-postgres'
      },
      data: {
        complianceFramework: 'commercial',
        rotationEnabled: true,
        backupRetentionDays: this.getBackupRetentionDays()
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'commercial_hardening_applied'
      }
    });
    
    // Basic logging configuration
    if (this.database) {
      // Enable basic logging
      this.database.addRotationSingleUser();
    }
  }

  private applyFedrampModerateHardening(): void {
    const logger = this.getLogger();
    logger.info('Applying FedRAMP Moderate security hardening', {
      context: { 
        action: 'compliance_hardening', 
        resource: 'rds_postgres',
        component: 'rds-postgres'
      },
      data: {
        complianceFramework: 'fedramp-moderate',
        backupRetentionDays: this.getBackupRetentionDays(),
        multiAzEnabled: this.shouldEnableMultiAz()
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'fedramp_moderate_hardening_applied'
      }
    });

    // Enable automated backups with longer retention
    // This is handled in createDatabaseInstance with getBackupRetentionDays()
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    const logger = this.getLogger();
    logger.info('Applying FedRAMP High additional security hardening', {
      context: { 
        action: 'compliance_hardening', 
        resource: 'rds_postgres',
        component: 'rds-postgres'
      },
      data: {
        complianceFramework: 'fedramp-high',
        iamDatabaseAuthEnabled: true,
        auditLoggingEnabled: true
      },
      security: {
        classification: 'cui',
        auditRequired: true,
        securityEvent: 'fedramp_high_hardening_applied'
      }
    });

    // Enable IAM database authentication
    if (this.database) {
      const cfnInstance = this.database.node.defaultChild as rds.CfnDBInstance;
      cfnInstance.enableIamDatabaseAuthentication = true;
      
      logger.info('IAM database authentication enabled', {
        context: { 
          action: 'security_configuration', 
          resource: 'database_authentication',
          component: 'rds-postgres'
        },
        security: {
          classification: 'cui',
          auditRequired: true,
          securityEvent: 'iam_db_auth_enabled'
        }
      });
    }

    // Create immutable backup copies (would be implemented with cross-region backup)
    // This would copy snapshots to the WORM S3 bucket created by S3 component
  }

  /**
   * Build database capability data shape
   */
  private buildDatabaseCapability(): any {
    return {
      host: this.database!.instanceEndpoint.hostname,
      port: this.database!.instanceEndpoint.port,
      dbName: this.config!.dbName,
      secretArn: this.secret!.secretArn,
      sgId: this.securityGroup!.securityGroupId,
      instanceArn: this.database!.instanceArn
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableEncryption(): boolean {
    return this.context.complianceFramework !== 'commercial' || !!this.config!.encryptionEnabled;
  }

  private shouldEnableMultiAz(): boolean {
    return this.context.complianceFramework !== 'commercial' || !!this.config!.multiAz;
  }

  // REMOVED: Duplicate method - replaced with enhanced version that supports both compliance and explicit config

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getBackupRetentionDays(): number {
    return this.config!.backupRetentionDays || 7;
  }

  private getEnhancedMonitoringInterval(): cdk.Duration | undefined {
    if (this.config!.enhancedMonitoring?.enabled) {
      return cdk.Duration.seconds(this.config!.enhancedMonitoring.interval || 60);
    }
    return undefined;
  }

  private getPerformanceInsightsRetention(): rds.PerformanceInsightRetention | undefined {
    if (!this.config!.performanceInsights?.enabled) {
      return undefined;
    }
    
    const days = this.config!.performanceInsights.retentionPeriod || 7;
    if (days >= 2555) {
      return rds.PerformanceInsightRetention.LONG_TERM;
    } else if (days >= 93) {
      return rds.PerformanceInsightRetention.DEFAULT;
    }
    return rds.PerformanceInsightRetention.DEFAULT;
  }



  /**
   * Get Performance Insights retention period based on compliance framework
   */
  private getPerformanceInsightsRetentionDays(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 2555; // 7 years for FedRAMP High
      case 'fedramp-moderate':
        return 1095; // 3 years for FedRAMP Moderate
      default:
        return 7; // Default minimum for commercial
    }
  }

  /**
   * Get enhanced monitoring interval based on compliance requirements
   */
  private getDatabaseMonitoringInterval(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-high':
        return 1; // 1 second for high-frequency monitoring
      case 'fedramp-moderate':
        return 5; // 5 seconds for standard monitoring
      default:
        return 60; // 1 minute for cost-effective monitoring
    }
  }

  /**
   * Get monitoring role for enhanced monitoring (Platform Observability Standard v1.0)
   */
  private getMonitoringRole(): iam.IRole | undefined {
    const enhancedMonitoringEnabled = this.config!.enhancedMonitoring?.enabled || 
                                     this.isComplianceFramework();
    
    if (!enhancedMonitoringEnabled) {
      return undefined;
    }

    // Use provided role ARN if available
    if (this.config!.enhancedMonitoring?.monitoringRoleArn) {
      return iam.Role.fromRoleArn(
        this, 
        'ExistingMonitoringRole', 
        this.config!.enhancedMonitoring.monitoringRoleArn
      );
    }
    
    // Return created monitoring role
    return this.monitoringRole;
  }

  /**
   * Get CloudWatch log exports configuration (Platform Observability Standard v1.0)
   * Required: PostgreSQL logs, Slow query logs, Error logs
   */
  private getCloudWatchLogExports(): string[] | undefined {
    const logExportsConfig = this.config!.logExports;
    const exports: string[] = [];

    // For compliance frameworks, enable all log exports by default
    const enableAll = this.isComplianceFramework();
    
    if (enableAll || logExportsConfig?.postgresql !== false) {
      exports.push('postgresql');
    }
    
    if (enableAll || logExportsConfig?.slowQuery !== false) {
      // Note: For PostgreSQL, slow queries are logged to the general postgresql log
      // The actual slow query configuration is done via parameter groups
      // This is just ensuring the logs get exported to CloudWatch
    }
    
    if (enableAll || logExportsConfig?.errorLog !== false) {
      // Note: PostgreSQL error logs are part of the general postgresql log
      // Separate error log type not applicable to PostgreSQL
    }

    // If no exports specified and not compliance framework, return undefined
    if (exports.length === 0 && !enableAll) {
      return undefined;
    }
    
    return exports.length > 0 ? exports : ['postgresql'];
  }

  /**
   * Update Performance Insights configuration based on compliance and config
   */
  private shouldEnableRdsPerformanceInsights(): boolean {
    // Enable for compliance frameworks or if explicitly configured
    return this.isComplianceFramework() || 
           !!this.config!.performanceInsights?.enabled;
  }

}