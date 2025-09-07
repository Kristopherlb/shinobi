/**
 * RDS PostgreSQL Component - Contract API Example
 * 
 * This is an example implementation showing how to build components using
 * the Component API Contract v1.0. This component creates a new RDS PostgreSQL
 * database using the standardized contract interfaces.
 */

import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { 
  Component, 
  ComponentSpec, 
  ComponentContext, 
  ComponentCapabilities,
  DbPostgresCapability,
  ConfigBuilder,
  ComponentConfigSchema
} from '../../contracts';

/**
 * Configuration interface for RDS PostgreSQL component
 */
export interface RdsPostgresConfig {
  /** Database name */
  dbName: string;
  
  /** Database username */
  username: string;
  
  /** Instance class (optional, defaults to db.t3.micro) */
  instanceClass?: string;
  
  /** Allocated storage in GB (optional, defaults to 20) */
  allocatedStorage?: number;
  
  /** Whether to enable backup (optional, defaults to true) */
  backupEnabled?: boolean;
  
  /** Backup retention days (optional, defaults to 7) */
  backupRetentionDays?: number;
  
  /** Whether to enable encryption at rest (optional, defaults based on compliance) */
  encryptionEnabled?: boolean;
  
  /** VPC ID for database deployment */
  vpcId?: string;
}

/**
 * Configuration schema for RDS PostgreSQL component
 */
export const RDS_POSTGRES_CONFIG_SCHEMA: ComponentConfigSchema = {
  type: 'object',
  title: 'RDS PostgreSQL Configuration',
  description: 'Configuration for creating an RDS PostgreSQL database instance',
  required: ['dbName', 'username'],
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
      maxLength: 63
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
    backupEnabled: {
      type: 'boolean',
      description: 'Whether to enable automated backups',
      default: true
    },
    backupRetentionDays: {
      type: 'number',
      description: 'Number of days to retain backups',
      minimum: 0,
      maximum: 35,
      default: 7
    },
    encryptionEnabled: {
      type: 'boolean',
      description: 'Whether to enable encryption at rest'
    },
    vpcId: {
      type: 'string',
      description: 'VPC ID for database deployment (optional, uses default VPC if not specified)',
      pattern: '^vpc-[0-9a-f]{8,17}$'
    }
  },
  additionalProperties: false,
  defaults: {
    instanceClass: 'db.t3.micro',
    allocatedStorage: 20,
    backupEnabled: true,
    backupRetentionDays: 7
  }
};

/**
 * Configuration builder for RDS PostgreSQL component
 */
export class RdsPostgresConfigBuilder extends ConfigBuilder<RdsPostgresConfig> {
  constructor(context: any) {
    super(context, RDS_POSTGRES_CONFIG_SCHEMA);
  }

  async build(): Promise<RdsPostgresConfig> {
    // Apply schema defaults
    let config = { ...RDS_POSTGRES_CONFIG_SCHEMA.defaults, ...this.context.spec.config };
    
    // Apply compliance defaults
    config = this.applyComplianceDefaults(config);
    
    // Resolve environment interpolations
    config = this.resolveEnvironmentInterpolations(config);
    
    // Validate final configuration
    const validationResult = this.validateConfiguration(config);
    if (!validationResult.valid) {
      throw new Error(`Invalid RDS PostgreSQL configuration: ${validationResult.errors?.map(e => e.message).join(', ')}`);
    }
    
    return config as RdsPostgresConfig;
  }
}

/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
export class RdsPostgresComponent extends Component {
  private database?: rds.DatabaseInstance;
  private secret?: secretsmanager.Secret;
  private securityGroup?: ec2.SecurityGroup;
  private config?: RdsPostgresConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create RDS PostgreSQL database and related resources
   */
  public synth(): void {
    // Build and validate configuration
    const configBuilder = new RdsPostgresConfigBuilder({
      spec: this.spec,
      context: this.context,
      environmentConfig: this.context.environmentConfig || {},
      complianceDefaults: {}
    });
    
    // For demo purposes, we'll use a synchronous version
    this.config = this.buildConfigSync();
    
    // Create the database secret
    this.createDatabaseSecret();
    
    // Create security group
    this.createSecurityGroup();
    
    // Create the database instance
    this.createDatabaseInstance();
    
    // Register constructs for external access
    this.registerConstruct('database', this.database!);
    this.registerConstruct('secret', this.secret!);
    this.registerConstruct('securityGroup', this.securityGroup!);
    
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
   * Create the database secret with generated password
   */
  private createDatabaseSecret(): void {
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      description: `Database credentials for ${this.config!.dbName}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: this.config!.username }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        requireEachIncludedType: true
      }
    });
  }

  /**
   * Create security group for database access
   */
  private createSecurityGroup(): void {
    // For demo purposes, assume we have a VPC available
    // In real implementation, this would use VPC lookup or creation
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: this.config!.vpcId,
      isDefault: !this.config!.vpcId
    });

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
    // Get VPC for subnet group
    const vpc = ec2.Vpc.fromLookup(this, 'VpcForDb', {
      vpcId: this.config!.vpcId,
      isDefault: !this.config!.vpcId
    });

    this.database = new rds.DatabaseInstance(this, 'Database', {
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
      allocatedStorage: this.config!.allocatedStorage,
      storageEncrypted: this.config!.encryptionEnabled,
      backupRetention: this.config!.backupEnabled ? 
        rds.RetentionDays.SEVEN : rds.RetentionDays.ONE_DAY,
      deleteAutomatedBackups: false,
      deletionProtection: this.context.complianceFramework !== 'commercial'
    });
  }

  /**
   * Build the database capability data shape according to Platform Capability Naming Standard v1.0
   * 
   * Provides real, tokenized values from underlying CDK constructs for automated binding
   * following the mandatory data shape for `db:postgres` capability.
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
   * Simplified config building for demo purposes
   * In real implementation, this would be async and use the ConfigBuilder properly
   */
  private buildConfigSync(): RdsPostgresConfig {
    const config: RdsPostgresConfig = {
      dbName: this.spec.config?.dbName || 'defaultdb',
      username: this.spec.config?.username || 'postgres',
      instanceClass: this.spec.config?.instanceClass || 'db.t3.micro',
      allocatedStorage: this.spec.config?.allocatedStorage || 20,
      backupEnabled: this.spec.config?.backupEnabled !== false,
      backupRetentionDays: this.spec.config?.backupRetentionDays || 7,
      encryptionEnabled: this.determineEncryptionDefault(),
      vpcId: this.spec.config?.vpcId
    };

    return config;
  }

  /**
   * Determine encryption default based on compliance framework
   */
  private determineEncryptionDefault(): boolean {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
      case 'fedramp-high':
        return true;
      default:
        return false;
    }
  }
}