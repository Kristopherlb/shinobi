/**
 * RDS PostgreSQL Component
 * 
 * A managed PostgreSQL relational database with comprehensive compliance hardening.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  ConfigBuilder,
  ComponentConfigSchema,
  DbPostgresCapability
} from '../../contracts';

/**
 * Configuration interface for RDS PostgreSQL component
 */
export interface RdsPostgresConfig {
  /** Database name (required) */
  dbName: string;
  
  /** Master username */
  username?: string;
  
  /** Instance class */
  instanceClass?: string;
  
  /** Allocated storage in GB */
  allocatedStorage?: number;
  
  /** Max allocated storage for auto-scaling */
  maxAllocatedStorage?: number;
  
  /** Multi-AZ deployment */
  multiAz?: boolean;
  
  /** Backup retention period in days */
  backupRetentionDays?: number;
  
  /** Backup window */
  backupWindow?: string;
  
  /** Maintenance window */
  maintenanceWindow?: string;
  
  /** Enable encryption at rest */
  encryptionEnabled?: boolean;
  
  /** KMS key ARN for encryption */
  kmsKeyArn?: string;
  
  /** VPC configuration */
  vpc?: {
    vpcId?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
  };
  
  /** Performance Insights configuration */
  performanceInsights?: {
    enabled?: boolean;
    retentionPeriod?: number;
  };
  
  /** Enhanced Monitoring */
  enhancedMonitoring?: {
    enabled?: boolean;
    interval?: number;
  };
}

/**
 * Configuration schema for RDS PostgreSQL component
 */
export const RDS_POSTGRES_CONFIG_SCHEMA: ComponentConfigSchema = {
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
             'db.r5.large', 'db.r5.xlarge', 'db.r5.2xlarge'],
      default: 'db.t3.micro'
    },
    allocatedStorage: {
      type: 'number',
      description: 'The initial storage allocation in GB',
      minimum: 20,
      maximum: 65536,
      default: 20
    },
    backupRetentionDays: {
      type: 'number',
      description: 'Number of days to retain backups',
      minimum: 0,
      maximum: 35,
      default: 7
    },
    multiAz: {
      type: 'boolean',
      description: 'Enable Multi-AZ deployment for high availability',
      default: false
    }
  },
  additionalProperties: false,
  defaults: {
    username: 'postgres',
    instanceClass: 'db.t3.micro',
    allocatedStorage: 20,
    backupRetentionDays: 7,
    multiAz: false
  }
};

/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
export class RdsPostgresComponent extends Component {
  private database?: rds.DatabaseInstance;
  private secret?: secretsmanager.Secret;
  private securityGroup?: ec2.SecurityGroup;
  private kmsKey?: kms.Key;
  private parameterGroup?: rds.ParameterGroup;
  private config?: RdsPostgresConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create RDS PostgreSQL database with compliance hardening
   */
  public synth(): void {
    // Build configuration
    this.config = this.buildConfigSync();
    
    // Create KMS key for encryption if needed
    this.createKmsKeyIfNeeded();
    
    // Create database secret
    this.createDatabaseSecret();
    
    // Create parameter group for STIG compliance if needed
    this.createParameterGroupIfNeeded();
    
    // Create security group
    this.createSecurityGroup();
    
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
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} PostgreSQL database`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
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
    }
  }

  /**
   * Create database secret with generated password
   */
  private createDatabaseSecret(): void {
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
    }
  }

  /**
   * Create security group for database access
   */
  private createSecurityGroup(): void {
    // For demo purposes, create a VPC or use default
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });

    this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: `Security group for ${this.config!.dbName} PostgreSQL database`,
      allowAllOutbound: false
    });

    // Add ingress rule for PostgreSQL port (will be refined by binding strategies)
    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'PostgreSQL access from VPC'
    );
  }

  /**
   * Create the RDS database instance
   */
  private createDatabaseInstance(): void {
    const vpc = ec2.Vpc.fromLookup(this, 'VpcForDb', { isDefault: true });

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
      enhancedMonitoringInterval: this.getEnhancedMonitoringInterval(),
      enablePerformanceInsights: this.shouldEnablePerformanceInsights(),
      performanceInsightRetention: this.getPerformanceInsightsRetention(),
      performanceInsightEncryptionKey: this.kmsKey,
      removalPolicy: this.isComplianceFramework() ? 
        cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    };

    this.database = new rds.DatabaseInstance(this, 'Database', props);
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
    // Basic logging configuration
    if (this.database) {
      // Enable basic logging
      this.database.addRotationSingleUser();
    }
  }

  private applyFedrampModerateHardening(): void {
    // Enhanced monitoring and logging
    new logs.LogGroup(this, 'DatabaseLogGroup', {
      logGroupName: `/aws/rds/instance/${this.database!.instanceIdentifier}/postgresql`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Enable automated backups with longer retention
    // This is handled in createDatabaseInstance with getBackupRetentionDays()
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Extended audit logging
    new logs.LogGroup(this, 'AuditLogGroup', {
      logGroupName: `/aws/rds/instance/${this.database!.instanceIdentifier}/audit`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Enable IAM database authentication
    if (this.database) {
      const cfnInstance = this.database.node.defaultChild as rds.CfnDBInstance;
      cfnInstance.enableIamDatabaseAuthentication = true;
    }

    // Create immutable backup copies (would be implemented with cross-region backup)
    // This would copy snapshots to the WORM S3 bucket created by S3 component
  }

  /**
   * Build database capability data shape
   */
  private buildDatabaseCapability(): DbPostgresCapability {
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
    return this.context.complianceFramework !== 'commercial' || this.config!.encryptionEnabled;
  }

  private shouldEnableMultiAz(): boolean {
    return this.context.complianceFramework !== 'commercial' || this.config!.multiAz;
  }

  private shouldEnablePerformanceInsights(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private isComplianceFramework(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getBackupRetentionDays(): number {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        return 30;
      case 'fedramp-high':
        return 90;
      default:
        return this.config!.backupRetentionDays || 7;
    }
  }

  private getEnhancedMonitoringInterval(): cdk.Duration | undefined {
    if (['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework)) {
      return cdk.Duration.seconds(60);
    }
    return undefined;
  }

  private getPerformanceInsightsRetention(): rds.PerformanceInsightRetention | undefined {
    if (this.context.complianceFramework === 'fedramp-high') {
      return rds.PerformanceInsightRetention.LONG_TERM;
    } else if (this.context.complianceFramework === 'fedramp-moderate') {
      return rds.PerformanceInsightRetention.DEFAULT;
    }
    return undefined;
  }

  /**
   * Simplified config building for demo purposes
   */
  private buildConfigSync(): RdsPostgresConfig {
    const config: RdsPostgresConfig = {
      dbName: this.spec.config?.dbName || 'defaultdb',
      username: this.spec.config?.username || 'postgres',
      instanceClass: this.spec.config?.instanceClass || 'db.t3.micro',
      allocatedStorage: this.spec.config?.allocatedStorage || 20,
      maxAllocatedStorage: this.spec.config?.maxAllocatedStorage,
      multiAz: this.spec.config?.multiAz,
      backupRetentionDays: this.spec.config?.backupRetentionDays || 7,
      encryptionEnabled: this.spec.config?.encryptionEnabled,
      kmsKeyArn: this.spec.config?.kmsKeyArn
    };

    return config;
  }
}