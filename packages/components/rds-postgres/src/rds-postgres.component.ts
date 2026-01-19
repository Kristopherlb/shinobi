/**
 * RDS PostgreSQL Component
 *
 * A managed PostgreSQL relational database with comprehensive controls that are
 * fully driven by configuration defaults supplied via the ConfigBuilder. The
 * component no longer embeds compliance-specific decision trees; instead it
 * consumes the resolved configuration and applies infrastructure as code
 * accordingly.
 */

import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities,
  applySecurityGroupTags,
  resolveVpcForSubnetGroups
} from '@shinobi/core';
import {
  RdsPostgresComponentConfigBuilder,
  RdsPostgresConfig,
  RdsPostgresLogConfig,
  RdsPostgresMonitoringAlarmsConfig,
  RdsPostgresAlarmConfig
} from './rds-postgres.builder.js';

/**
 * RDS PostgreSQL Component implementing Component API Contract v1.0
 */
export class RdsPostgresComponent extends BaseComponent {
  private database?: rds.DatabaseInstance;
  private secret?: secretsmanager.Secret;
  private securityGroup?: ec2.SecurityGroup;
  private kmsKey?: kms.Key;
  private parameterGroup?: rds.ParameterGroup;
  private subnetGroup?: rds.ISubnetGroup;
  private config?: RdsPostgresConfig;
  private vpc?: ec2.IVpc;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  private configureSecretRotation(): void {
    if (!this.database || !this.secret) {
      return;
    }

    const rotation = this.config?.rotation;
    if (!rotation?.enabled) {
      return;
    }

    const automaticallyAfter = cdk.Duration.days(rotation.scheduleInDays ?? 30);

    if (rotation.mode === 'multi-user') {
      this.database.addRotationMultiUser('DatabaseRotationMultiUser', {
        secret: this.secret,
        automaticallyAfter
      });
    } else {
      this.database.addRotationSingleUser({
        automaticallyAfter
      });
    }
  }

  private resolveLogRetention(days: number): logs.RetentionDays {
    return this.mapLogRetentionDays(days);
  }

  private resolveComparisonOperator(value?: string): cloudwatch.ComparisonOperator {
    switch (value) {
      case 'gt':
        return cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD;
      case 'lt':
        return cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD;
      case 'lte':
        return cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD;
      case 'gte':
      default:
        return cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD;
    }
  }

  private resolveTreatMissingData(value?: string): cloudwatch.TreatMissingData {
    switch (value) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      case 'not-breaching':
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }

  /**
   * Synthesis phase - create RDS PostgreSQL database using resolved configuration
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting RDS Postgres component synthesis', {
      component: this.spec.name
    });

    const startTime = Date.now();

    try {
      const configBuilder = new RdsPostgresComponentConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();

      this.logComponentEvent('config_built', 'Resolved RDS Postgres configuration', {
        dbName: this.config.dbName,
        instanceType: this.config.instance?.instanceType,
        multiAz: this.config.instance?.multiAz ?? false
      });

      this.createKmsKeyIfNeeded();
      this.createDatabaseSecret();
      this.createParameterGroupFromConfig();
      this.createSecurityGroup();
      this.createDatabaseInstance();
      this.configureSecretRotation();
      this.configureLogGroups();
      this.configureMonitoringAlarms();
      this.configureObservabilityForDatabase();

      this.registerConstruct('database', this.database!);
      this.registerConstruct('secret', this.secret!);
      this.registerConstruct('securityGroup', this.securityGroup!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
      if (this.parameterGroup) {
        this.registerConstruct('parameterGroup', this.parameterGroup);
      }
      if (this.subnetGroup) {
        this.registerConstruct('subnetGroup', this.subnetGroup);
      }

      this.registerCapability('db:postgres', this.buildDatabaseCapability());

      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });

      this.logComponentEvent('synthesis_complete', 'RDS Postgres component synthesis completed successfully', {
        databaseCreated: !!this.database,
        secretCreated: !!this.secret,
        kmsKeyCreated: !!this.kmsKey,
        parameterGroupCreated: !!this.parameterGroup
      });
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'rds-postgres',
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
    return 'rds-postgres';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    const encryption = this.config?.encryption;
    if (!encryption?.enabled) {
      if (encryption?.kmsKeyArn) {
        this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedEncryptionKey', encryption.kmsKeyArn) as kms.Key;
      }
      return;
    }

    if (encryption?.kmsKeyArn) {
      this.kmsKey = kms.Key.fromKeyArn(this, 'ImportedEncryptionKey', encryption.kmsKeyArn) as kms.Key;
      return;
    }

    if (!encryption?.customerManagedKey?.create) {
      this.kmsKey = undefined;
      return;
    }

    this.kmsKey = new kms.Key(this, 'EncryptionKey', {
      description: `Encryption key for ${this.spec.name} PostgreSQL database`,
      enableKeyRotation: encryption.customerManagedKey.enableRotation ?? false,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });

    this.applyStandardTags(this.kmsKey, {
      'key-usage': 'rds-encryption',
      'key-rotation-enabled': (encryption.customerManagedKey.enableRotation ?? false).toString()
    });

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
    
    // Apply standard tags to secret
    this.applyStandardTags(this.secret, {
      'secret-type': 'database-credentials',
      'database-name': this.config!.dbName
    });
  }

  /**
   * Create parameter group for STIG compliance in FedRAMP High
   */
  private createParameterGroupFromConfig(): void {
    const parameterGroupConfig = this.config?.parameterGroup;
    if (!parameterGroupConfig?.enabled) {
      this.parameterGroup = undefined;
      return;
    }

    this.parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: this.resolveEngineVersion()
      }),
      description: parameterGroupConfig.description ?? `Parameter group for ${this.spec.name}`,
      parameters: parameterGroupConfig.parameters ?? {}
    });

    this.applyStandardTags(this.parameterGroup, {
      'parameter-group': this.parameterGroup.node.id,
      'database-engine': 'postgres'
    });
  }

  /**
   * Create security group for database access
   */
  private createSecurityGroup(): void {
    const networking = this.config?.networking ?? {};


    try {
      // Use platform VPC resolver utility for consistent resolution across all components
      const availabilityZones = networking.availabilityZones && networking.availabilityZones.length > 0
        ? networking.availabilityZones
        : this.getDefaultAvailabilityZones();

      this.vpc = resolveVpcForSubnetGroups(this, 'Vpc', {
        vpcId: networking.vpcId,
        subnetIds: networking.subnetIds,
        availabilityZones: availabilityZones,
        region: this.context.region,
        vpcCidrBlock: networking.vpcCidrBlock,
        useDefaultVpc: networking.useDefaultVpc ?? true, // RDS defaults to true
        context: this.context,
        componentName: this.spec.name
      });

      // #region agent log
      // Avoid accessing this.vpc.vpcId directly - it may trigger CDK validation requiring vpcCidrBlock
      fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:303',message:'VPC resolved via platform resolver',data:{vpcId:networking.vpcId,vpcType:'ImportedVpc2 (fromVpcAttributes)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run19',hypothesisId:'Q'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      this.logError(
        error as Error,
        'rds-postgres:vpc-resolution',
        {
          guidance: 'Provide networking.vpcId, inject context.vpc, or set networking.useDefaultVpc to true.'
        }
      );
      throw error;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:326',message:'About to create SecurityGroup with VPC',data:{vpcId:networking.vpcId,hasVpc:!!this.vpc,vpcCidrBlockProvided:!!networking.vpcCidrBlock},timestamp:Date.now(),sessionId:'debug-session',runId:'run22',hypothesisId:'T'})}).catch(()=>{});
    // #endregion

    this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for ${this.config!.dbName} PostgreSQL database`,
      allowAllOutbound: false
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:333',message:'SecurityGroup created successfully',data:{vpcId:networking.vpcId,securityGroupId:this.securityGroup.securityGroupId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    this.applyStandardTags(this.securityGroup, {
      'security-group-type': 'database',
      'database-engine': 'postgres'
    });

    // Apply security-group-specific tags (SG-009)
    applySecurityGroupTags(this.securityGroup, {
      ingressPolicy: 'binder-managed',
      tier: 'db'
    });

    const ingressCidrs = networking.ingressCidrs ?? [];
    const port = networking.port ?? 5432;

    // Use VPC CIDR from config if available
    // If VPC was imported via attributes without CIDR, use ingressCidrs or default
    // NOTE: We don't try to access this.vpc.vpcCidrBlock because fromVpcAttributes()
    // without vpcCidrBlock will cause validation errors when accessing the property
    const vpcCidr: string | undefined = networking.vpcCidrBlock;

    if (ingressCidrs.length === 0 && vpcCidr) {
      this.securityGroup.addIngressRule(
        ec2.Peer.ipv4(vpcCidr),
        ec2.Port.tcp(port),
        'Default PostgreSQL access from VPC'
      );
    } else if (ingressCidrs.length === 0) {
      // Fallback to default CIDR if VPC CIDR is not available
      this.securityGroup.addIngressRule(
        ec2.Peer.ipv4('10.0.0.0/16'),
        ec2.Port.tcp(port),
        'Default PostgreSQL access (fallback CIDR)'
      );
    } else {
      ingressCidrs.forEach((cidr: string, index: number) => {
        this.securityGroup!.addIngressRule(
          ec2.Peer.ipv4(cidr),
          ec2.Port.tcp(port),
          `Configured PostgreSQL access ${index + 1}`
        );
      });
    }
  }

  /**
   * Get default availability zones for the current region
   * Returns at least 2 AZs for high availability
   */
  private getDefaultAvailabilityZones(): string[] {
    const region = this.context.region || 'us-east-1';
    // Extract region base (e.g., 'us-west-2' -> 'us-west-2')
    const regionBase = region.split('-').slice(0, 2).join('-');
    const regionNumber = region.split('-').pop() || '1';
    
    // Return at least 2 AZs for the region (most AWS regions have at least 2)
    // Common pattern: {region}-{a,b,c,d}
    // Return first 2-3 AZs (most regions have at least 2, many have 3+)
    const azs: string[] = [];
    for (let i = 0; i < 3; i++) {
      const azSuffix = String.fromCharCode(97 + i); // 'a', 'b', 'c'
      azs.push(`${regionBase}-${regionNumber}${azSuffix}`);
    }
    return azs;
  }

  /**
   * Create DB subnet group when explicit subnet IDs are provided
   * 
   * Strategy:
   * - If VPC is fromLookup() (fully resolved): Don't create subnet group, use vpcSubnets with Subnet.fromSubnetId()
   * - If VPC is fromVpcAttributes() (no subnet info): Create subnet group with explicit subnet IDs as strings
   * 
   * Returns a custom ISubnetGroup wrapper that delegates to the CfnDBSubnetGroup,
   * avoiding the need to use fromSubnetGroupName() which expects an existing subnet group
   */
  private createSubnetGroup(): rds.ISubnetGroup | undefined {
    const networking = this.config?.networking ?? {};
    
    if (!networking.subnetIds || networking.subnetIds.length === 0) {
      return undefined;
    }

    if (!this.vpc) {
      throw new Error('RDS Postgres component attempted to create a subnet group before the VPC was initialised.');
    }

    // Always create subnet group when explicit subnet IDs are provided
    // Using Subnet.fromSubnetId() causes early validation issues because it lacks route table info
    // Creating a subnet group with string IDs allows CloudFormation to validate directly

    const instanceConfig = this.config!.instance ?? {};
    const removalPolicy = (instanceConfig.removalPolicy ?? 'destroy') === 'retain'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:407',message:'createSubnetGroup entry',data:{subnetIds:networking.subnetIds,vpcId:networking.vpcId,region:this.context.region,accountId:this.context.accountId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A,B,C,D'})}).catch(()=>{});
    // #endregion

    // Use L1 CfnDBSubnetGroup with string subnet IDs (like ElastiCache pattern)
    // This avoids CloudFormation early validation issues with Subnet references
    // We'll use the L2 SubnetGroup.fromSubnetGroupName() to create an ISubnetGroup
    // that DatabaseInstance can use, but we need to pass the actual name, not a ref
    const subnetGroupName = `${this.spec.name}-subnet-group`;
    
    // #region agent log
    // Avoid accessing this.vpc.vpcId - may trigger CDK validation requiring vpcCidrBlock
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:435',message:'Creating L1 CfnDBSubnetGroup with string subnet IDs',data:{subnetGroupName,subnetIds:networking.subnetIds,vpcId:networking.vpcId},timestamp:Date.now(),sessionId:'debug-session',runId:'run11',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Create L1 CfnDBSubnetGroup with string subnet IDs directly
    // This passes subnet IDs as strings, not as subnet references, avoiding early validation issues
    const cfnSubnetGroup = new rds.CfnDBSubnetGroup(this, 'SubnetGroup', {
      dbSubnetGroupDescription: `DB subnet group for ${this.config!.dbName}`,
      subnetIds: networking.subnetIds, // Pass as strings directly
      dbSubnetGroupName: subnetGroupName // Explicit name
    });

    // Apply removal policy
    if (removalPolicy === cdk.RemovalPolicy.RETAIN) {
      cfnSubnetGroup.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    }

    // Apply standard tags
    this.applyStandardTags(cfnSubnetGroup, {
      'subnet-group-type': 'rds-db',
      'database-name': this.config!.dbName
    });

    this.logResourceCreation('rds-subnet-group', cfnSubnetGroup.ref, {
      subnetCount: networking.subnetIds.length,
      subnetIds: networking.subnetIds
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:443',message:'CfnDBSubnetGroup created, creating ISubnetGroup wrapper',data:{subnetGroupName,cfnRef:cfnSubnetGroup.ref,cfnLogicalId:cfnSubnetGroup.logicalId},timestamp:Date.now(),sessionId:'debug-session',runId:'run11',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Create ISubnetGroup wrapper that uses the actual subnet group name
    // DatabaseInstance will use this to reference the subnet group in the template
    // We use the explicit name (string) so DatabaseInstance can create a proper Ref
    class CfnSubnetGroupWrapper extends Construct implements rds.ISubnetGroup {
      public readonly subnetGroupName: string;

      constructor(scope: Construct, id: string, private readonly cfnSubnetGroup: rds.CfnDBSubnetGroup, name: string) {
        super(scope, id);
        // Use the explicit subnet group name (string) so DatabaseInstance can reference it
        // DatabaseInstance will use this name to create a Ref to the subnet group
        this.subnetGroupName = name;
      }

      public get stack(): cdk.Stack {
        return this.cfnSubnetGroup.stack;
      }

      public get env(): cdk.ResourceEnvironment {
        return this.cfnSubnetGroup.env;
      }

      public applyRemovalPolicy(policy: cdk.RemovalPolicy): void {
        this.cfnSubnetGroup.applyRemovalPolicy(policy);
      }
    }

    const subnetGroup = new CfnSubnetGroupWrapper(this, 'SubnetGroupWrapper', cfnSubnetGroup, subnetGroupName);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:443',message:'ISubnetGroup wrapper created with explicit name',data:{subnetGroupName:subnetGroup.subnetGroupName,explicitName:subnetGroupName,cfnRef:cfnSubnetGroup.ref,nameType:typeof subnetGroup.subnetGroupName},timestamp:Date.now(),sessionId:'debug-session',runId:'run11',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return subnetGroup;
  }

  /**
   * Create the RDS database instance
   */
  private createDatabaseInstance(): void {
    if (!this.vpc) {
      throw new Error('RDS Postgres component attempted to create a database before the VPC was initialised.');
    }

    const instanceConfig = this.config!.instance ?? {};
    const backupConfig = this.config!.backup ?? {};
    const monitoringConfig = this.config!.monitoring ?? {};
    const encryptionEnabled = this.config!.encryption?.enabled ?? false;

    const monitoringInterval = monitoringConfig.enhancedMonitoring?.enabled
      ? cdk.Duration.seconds(monitoringConfig.enhancedMonitoring.intervalSeconds ?? 60)
      : undefined;

    const performanceInsightsEnabled = monitoringConfig.performanceInsights?.enabled ?? false;
    const performanceInsightsRetention = performanceInsightsEnabled
      ? this.resolvePerformanceInsightsRetention()
      : undefined;

    const performanceInsightsKey = (monitoringConfig.performanceInsights?.useCustomerManagedKey ?? false)
      ? this.kmsKey
      : undefined;

    // Create explicit subnet group if subnet IDs are provided
    // This ensures RDS has a valid subnet group even when VPC is imported via fromVpcAttributes()
    this.subnetGroup = this.createSubnetGroup();

    // Determine subnet selection based on VPC and publiclyAccessible setting
    // Only used when subnet group is not explicitly created
    const publiclyAccessible = instanceConfig.publiclyAccessible ?? false;
    const networking = this.config?.networking ?? {};
    let vpcSubnets: ec2.SubnetSelection | undefined;
    
    // Subnet group is created when explicit subnet IDs are provided
    // Otherwise, determine subnet selection for automatic subnet group creation
    if (!this.subnetGroup) {
      // No explicit subnet IDs - determine subnet selection for automatic subnet group creation
      // Check if VPC was created via fromVpcAttributes (no subnet info available)
      // When using fromVpcAttributes, we can't select subnets by type
      // RDS will use the default subnet group for the VPC
      const isImportedVpc = networking.vpcId && !networking.useDefaultVpc;
      
      if (isImportedVpc) {
        // For imported VPCs, don't specify vpcSubnets - let RDS use default subnet group
        // This works because RDS will automatically use the VPC's default subnet group
        vpcSubnets = undefined;
      } else {
        // For VPCs created via fromLookup, we can select by subnet type
        if (publiclyAccessible) {
          vpcSubnets = { subnetType: ec2.SubnetType.PUBLIC };
        } else {
          // Try to use private subnets, but fall back to public if none exist
          try {
            const privateSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });
            if (privateSubnets.subnets.length > 0) {
              vpcSubnets = { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
            } else {
              // No private subnets available, use public subnets as fallback
              vpcSubnets = { subnetType: ec2.SubnetType.PUBLIC };
            }
          } catch {
            // If subnet selection fails, don't specify vpcSubnets
            // RDS will use the default subnet group
            vpcSubnets = undefined;
          }
        }
      }
    }

    const props: rds.DatabaseInstanceProps = {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: this.resolveEngineVersion()
      }),
      instanceType: new ec2.InstanceType(instanceConfig.instanceType ?? 't3.micro'),
      credentials: rds.Credentials.fromSecret(this.secret!),
      vpc: this.vpc,
      // Use explicit subnet group if created, otherwise use vpcSubnets (mutually exclusive)
      ...(this.subnetGroup 
        ? (() => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:577',message:'Using subnetGroup wrapper with explicit name',data:{subnetGroupName:this.subnetGroup.subnetGroupName,subnetGroupType:this.subnetGroup.constructor.name,nameType:typeof this.subnetGroup.subnetGroupName},timestamp:Date.now(),sessionId:'debug-session',runId:'run11',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            return { subnetGroup: this.subnetGroup };
          })()
        : { vpcSubnets }
      ),
      securityGroups: [this.securityGroup!],
      databaseName: this.config!.dbName,
      allocatedStorage: instanceConfig.allocatedStorage ?? 20,
      maxAllocatedStorage: instanceConfig.maxAllocatedStorage,
      storageEncrypted: encryptionEnabled,
      storageEncryptionKey: this.kmsKey,
      backupRetention: cdk.Duration.days(backupConfig.retentionDays ?? 7),
      copyTagsToSnapshot: backupConfig.copyTagsToSnapshots ?? true,
      preferredBackupWindow: backupConfig.preferredWindow,
      deleteAutomatedBackups: false,
      deletionProtection: instanceConfig.deletionProtection ?? false,
      multiAz: instanceConfig.multiAz ?? false,
      parameterGroup: this.parameterGroup,
      monitoringInterval,
      enablePerformanceInsights: performanceInsightsEnabled,
      performanceInsightRetention: performanceInsightsRetention,
      performanceInsightEncryptionKey: performanceInsightsKey,
      iamAuthentication: this.config?.security?.iamAuthentication ?? false,
      removalPolicy: (instanceConfig.removalPolicy ?? 'destroy') === 'retain'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      publiclyAccessible: instanceConfig.publiclyAccessible ?? false,
      cloudwatchLogsExports: this.config?.observability?.logExports
    };

    this.database = new rds.DatabaseInstance(this, 'Database', props);

    this.applyStandardTags(this.database, {
      'database-name': this.config!.dbName,
      'database-engine': 'postgres',
      'database-version': this.config!.instance?.engineVersion ?? '18.1',
      'instance-type': instanceConfig.instanceType ?? 't3.micro',
      'multi-az': (instanceConfig.multiAz ?? false).toString(),
      'backup-retention-days': (backupConfig.retentionDays ?? 7).toString()
    });

    this.logResourceCreation('rds-postgres-instance', this.database.instanceIdentifier, {
      dbName: this.config!.dbName,
      engine: 'postgres',
      instanceType: instanceConfig.instanceType ?? 't3.micro',
      multiAz: instanceConfig.multiAz ?? false,
      encryptionEnabled,
      performanceInsightsEnabled
    });
  }

  private configureLogGroups(): void {
    if (!this.database) {
      return;
    }

    const logging = this.config?.logging;
    this.createLogGroupFromConfig('DatabaseLogs', logging?.database, 'database');
    this.createLogGroupFromConfig('AuditLogs', logging?.audit, 'audit');
  }

  private configureMonitoringAlarms(): void {
    if (!this.database) {
      return;
    }

    const alarms = this.config?.monitoring?.alarms ?? {} as RdsPostgresMonitoringAlarmsConfig;
    const dbIdentifier = this.database.instanceIdentifier;

    this.createAlarmFromConfig(
      'CpuUtilizationAlarm',
      alarms.cpuUtilization,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-db-cpu`,
        metricName: 'CPUUtilization',
        namespace: 'AWS/RDS',
        dimensions: { DBInstanceIdentifier: dbIdentifier }
      }
    );

    this.createAlarmFromConfig(
      'DatabaseConnectionsAlarm',
      alarms.databaseConnections,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-db-connections`,
        metricName: 'DatabaseConnections',
        namespace: 'AWS/RDS',
        dimensions: { DBInstanceIdentifier: dbIdentifier }
      }
    );

    this.createAlarmFromConfig(
      'FreeStorageSpaceAlarm',
      alarms.freeStorageSpaceBytes,
      {
        alarmName: `${this.context.serviceName}-${this.spec.name}-db-storage`,
        metricName: 'FreeStorageSpace',
        namespace: 'AWS/RDS',
        dimensions: { DBInstanceIdentifier: dbIdentifier }
      }
    );
  }

  private createAlarmFromConfig(
    id: string,
    alarmConfig: RdsPostgresAlarmConfig | undefined,
    options: { alarmName: string; metricName: string; namespace: string; dimensions: Record<string, string> }
  ): void {
    if (!alarmConfig?.enabled) {
      return;
    }

    const period = cdk.Duration.minutes(alarmConfig.periodMinutes ?? 5);
    const metric = new cloudwatch.Metric({
      namespace: options.namespace,
      metricName: options.metricName,
      dimensionsMap: options.dimensions,
      statistic: alarmConfig.statistic ?? 'Average',
      period
    });

    const alarm = new cloudwatch.Alarm(this, id, {
      alarmName: options.alarmName,
      alarmDescription: `${options.metricName} alarm for ${this.spec.name}`,
      metric,
      threshold: alarmConfig.threshold ?? 0,
      evaluationPeriods: alarmConfig.evaluationPeriods ?? 1,
      comparisonOperator: this.resolveComparisonOperator(alarmConfig.comparisonOperator),
      treatMissingData: this.resolveTreatMissingData(alarmConfig.treatMissingData)
    });

    this.applyStandardTags(alarm, {
      'alarm-metric': options.metricName,
      ...(alarmConfig.tags ?? {})
    });

    this.registerConstruct(`${id}Construct`, alarm);
  }

  private createLogGroupFromConfig(
    id: string,
    logConfig: RdsPostgresLogConfig | undefined,
    logType: string
  ): void {
    if (!logConfig?.enabled) {
      return;
    }

    const logGroupName = logConfig.logGroupName
      ?? `/aws/rds/instance/${this.database!.instanceIdentifier}/${logType}`;

    const logGroup = new logs.LogGroup(this, id, {
      logGroupName,
      retention: logConfig.retentionInDays
        ? this.resolveLogRetention(logConfig.retentionInDays)
        : undefined,
      removalPolicy: logConfig.removalPolicy === 'destroy'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN
    });

    this.applyStandardTags(logGroup, {
      'log-type': logType,
      'database-name': this.config!.dbName,
      ...(logConfig.tags ?? {})
    });

    this.registerConstruct(`${logType}LogGroup`, logGroup);
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
      instanceArn: this.database!.instanceArn,
      securityProfile: this.config!.hardeningProfile ?? 'baseline'
    };
  }

  /**
   * Configure OpenTelemetry observability for database monitoring according to Platform Observability Standard
   */
  private configureObservabilityForDatabase(): void {
    if (!this.database) {
      return;
    }

    const instanceConfig = this.config!.instance ?? {};
    const backupConfig = this.config!.backup ?? {};
    const monitoringConfig = this.config!.monitoring ?? {};

    this.configureObservability(this.database, {
      customAttributes: {
        'database.engine': 'postgres',
        'database.version': instanceConfig.engineVersion ?? '18.1',
        'database.name': this.config!.dbName,
        'database.instance.type': instanceConfig.instanceType ?? 't3.micro',
        'database.multi.az': (instanceConfig.multiAz ?? false).toString(),
        'database.backup.retention': (backupConfig.retentionDays ?? 7).toString(),
        'database.performance.insights': (monitoringConfig.performanceInsights?.enabled ?? false).toString()
      }
    });

    const cfnInstance = this.database.node.defaultChild as rds.CfnDBInstance;

    if (monitoringConfig.performanceInsights?.enabled ?? false) {
      cfnInstance.enablePerformanceInsights = true;
      cfnInstance.performanceInsightsRetentionPeriod = this.config!.monitoring!.performanceInsights!.retentionDays ?? 7;
      if ((monitoringConfig.performanceInsights?.useCustomerManagedKey ?? false) && this.kmsKey) {
        cfnInstance.performanceInsightsKmsKeyId = this.kmsKey.keyArn;
      }
    }

    if (monitoringConfig.enhancedMonitoring?.enabled ?? false) {
      cfnInstance.monitoringInterval = monitoringConfig.enhancedMonitoring?.intervalSeconds ?? 60;
    } else {
      cfnInstance.monitoringInterval = 0;
    }

    if (this.config?.observability?.logExports?.length) {
      cfnInstance.enableCloudwatchLogsExports = this.config!.observability!.logExports!;
    }
  }


  private resolveEngineVersion(): rds.PostgresEngineVersion {
    const rawVersion = this.config?.instance?.engineVersion ?? '18.1';
    // Ensure version is always a string (YAML may parse 18.1 as a number)
    const version = String(rawVersion);
    const major = version.split('.')[0] ?? '18';
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/31cd8a5c-c5a9-4c85-9dba-5f04dc91dc42',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'rds-postgres.component.ts:833',message:'resolveEngineVersion called',data:{rawVersion,configInstanceEngineVersion:this.config?.instance?.engineVersion,resolvedVersion:version,major,versionType:typeof rawVersion},timestamp:Date.now(),sessionId:'debug-session',runId:'run18',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    
    return rds.PostgresEngineVersion.of(version, major);
  }

  private resolvePerformanceInsightsRetention(): rds.PerformanceInsightRetention | undefined {
    if (!(this.config?.monitoring?.performanceInsights?.enabled ?? false)) {
      return undefined;
    }

    const days = this.config?.monitoring?.performanceInsights?.retentionDays ?? 7;
    return days >= 2555
      ? rds.PerformanceInsightRetention.LONG_TERM
      : rds.PerformanceInsightRetention.DEFAULT;
  }
}
