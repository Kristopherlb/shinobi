/**
 * RDS Postgres Component - Enterprise-grade managed database
 * Implements CDK Construct Composer pattern with FedRAMP compliance
 */

import { 
  ComponentSpec, 
  ComponentContext, 
  ComponentCapabilities,
  IComponent,
  IConstruct 
} from '@platform/contracts';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';

export interface RdsPostgresConfig {
  dbName: string;
  instanceClass?: string;
  allocatedStorage?: number;
  backupRetention?: number;
  multiAz?: boolean;
  encrypted?: boolean;
  kmsKeyId?: string;
  subnetIds?: string[];
  vpcId?: string;
  allowedCidrs?: string[];
}

/**
 * RDS Postgres component following CDK Construct Composer pattern
 */
export class RdsPostgresComponent implements IComponent {
  private readonly constructs: Map<string, IConstruct> = new Map();
  private capabilities: ComponentCapabilities = {};
  private synthesized: boolean = false;

  constructor(
    public readonly spec: ComponentSpec,
    private readonly context: ComponentContext
  ) {}

  getType(): string {
    return 'rds-postgres';
  }

  synth(): void {
    // Step 1: Build comprehensive properties using helper methods
    const finalInstanceProps: rds.DatabaseInstanceProps = {
      engine: this.getDatabaseEngine(),
      instanceType: this.getInstanceType(),
      vpc: this.context.vpc,
      vpcSubnets: this.getSubnetSelection(),
      credentials: this.getDatabaseCredentials(),
      databaseName: this.spec.config.dbName,
      allocatedStorage: this.getAllocatedStorage(),
      storageEncrypted: this.isEncryptionEnabled(),
      kmsKey: this.getKMSKey(),
      backupRetention: this.getBackupRetention(),
      multiAz: this.isMultiAZEnabled(),
      securityGroups: this.getSecurityGroups(),
      deletionProtection: this.isDeletionProtectionEnabled(),
      monitoringInterval: this.getMonitoringInterval(),
      enablePerformanceInsights: this.isPerformanceInsightsEnabled(),
      removalPolicy: this.getRemovalPolicy()
    };

    // Step 2: Instantiate the CDK L2 construct
    const rdsInstance = new rds.DatabaseInstance(
      this.context.scope, 
      `${this.spec.name}-db`, 
      finalInstanceProps
    );

    // Step 3: Store construct handles for binder access
    this.constructs.set('main', rdsInstance);
    this.constructs.set('database', rdsInstance);
    this.constructs.set('secret', rdsInstance.secret!);

    // Step 4: Set capabilities with tokenized outputs
    this.setCapabilities({
      'database:rds': {
        host: rdsInstance.instanceEndpoint.hostname,
        port: rdsInstance.instanceEndpoint.port,
        database: this.spec.config.dbName,
        secretArn: rdsInstance.secret!.secretArn,
        instanceId: rdsInstance.instanceIdentifier,
        instanceArn: rdsInstance.instanceArn,
        connectionString: `postgresql://{username}:{password}@${rdsInstance.instanceEndpoint.hostname}:${rdsInstance.instanceEndpoint.port}/${this.spec.config.dbName}`
      }
    });
  }

  getCapabilities(): ComponentCapabilities {
    this.ensureSynthesized();
    return this.capabilities;
  }

  getConstruct(handle: string): IConstruct | undefined {
    return this.constructs.get(handle);
  }

  getAllConstructs(): Map<string, IConstruct> {
    return new Map(this.constructs);
  }

  hasConstruct(handle: string): boolean {
    return this.constructs.has(handle);
  }

  getName(): string {
    return this.spec.name;
  }

  private setCapabilities(capabilities: ComponentCapabilities): void {
    this.capabilities = capabilities;
    this.synthesized = true;
  }

  private ensureSynthesized(): void {
    if (!this.synthesized) {
      throw new Error(`Component '${this.spec.name}' must be synthesized before accessing capabilities. Call synth() first.`);
    }
  }

  // Helper Methods for CDK Construct Composition

  private getDatabaseEngine(): rds.IInstanceEngine {
    const version = this.spec.config.postgresVersion || '15.4';
    return rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.of(version, version)
    });
  }

  private getInstanceType(): ec2.InstanceType {
    const instanceClass = this.spec.config.instanceClass || 
      (this.context.complianceFramework.startsWith('fedramp') ? 'db.t3.medium' : 'db.t3.micro');
    return new ec2.InstanceType(instanceClass);
  }

  private getSubnetSelection(): ec2.SubnetSelection {
    if (this.context.complianceFramework.startsWith('fedramp')) {
      return { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
    }
    return { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
  }

  private getDatabaseCredentials(): rds.Credentials {
    const username = this.spec.config.username || 'postgres';
    return rds.Credentials.fromGeneratedSecret(username, {
      secretName: `${this.context.serviceName}-${this.spec.name}-credentials`,
      excludeCharacters: ` %+~\`#$&*()|[]{}:;<>?!'/@"\\`
    });
  }

  private getAllocatedStorage(): number {
    return this.spec.overrides?.database?.allocatedStorage || 
           this.spec.config.allocatedStorage || 20;
  }

  private isEncryptionEnabled(): boolean {
    return this.context.complianceFramework.startsWith('fedramp') || 
           this.spec.config.encrypted === true;
  }

  private getKMSKey(): cdk.aws_kms.IKey | undefined {
    if (!this.isEncryptionEnabled()) return undefined;
    
    // For FedRAMP, use customer-managed KMS key
    if (this.context.complianceFramework.startsWith('fedramp')) {
      return cdk.aws_kms.Key.fromKeyId(
        this.context.scope,
        `${this.spec.name}-kms-key-ref`,
        this.spec.config.kmsKeyId || 'alias/aws/rds'
      );
    }
    
    return undefined; // Use default AWS managed key
  }

  private getBackupRetention(): cdk.Duration {
    const days = this.spec.overrides?.database?.backupRetention || 
                 this.spec.config.backupRetention || 
                 (this.context.complianceFramework.startsWith('fedramp') ? 30 : 7);
    return cdk.Duration.days(days);
  }

  private isMultiAZEnabled(): boolean {
    return this.context.complianceFramework.startsWith('fedramp') || 
           this.spec.config.multiAz === true;
  }

  private getSecurityGroups(): ec2.ISecurityGroup[] {
    const sg = new ec2.SecurityGroup(this.context.scope, `${this.spec.name}-sg`, {
      vpc: this.context.vpc!,
      description: `Security group for ${this.spec.name} RDS instance`,
      allowAllOutbound: false
    });

    // FedRAMP requires more restrictive security groups
    if (this.context.complianceFramework.startsWith('fedramp')) {
      // Only allow inbound connections from specified CIDRs
      const allowedCidrs = this.spec.config.allowedCidrs || ['10.0.0.0/16'];
      allowedCidrs.forEach(cidr => {
        sg.addIngressRule(
          ec2.Peer.ipv4(cidr),
          ec2.Port.tcp(5432),
          'PostgreSQL access from trusted networks'
        );
      });
    }

    return [sg];
  }

  private isDeletionProtectionEnabled(): boolean {
    return this.context.complianceFramework.startsWith('fedramp') || 
           this.spec.overrides?.database?.deletionProtection === true;
  }

  private getMonitoringInterval(): number {
    return this.context.complianceFramework.startsWith('fedramp') ? 60 : 0;
  }

  private isPerformanceInsightsEnabled(): boolean {
    return this.context.complianceFramework.startsWith('fedramp');
  }

  private getRemovalPolicy(): cdk.RemovalPolicy {
    if (this.context.complianceFramework.startsWith('fedramp')) {
      return cdk.RemovalPolicy.RETAIN;
    }
    return this.context.environment === 'production' 
      ? cdk.RemovalPolicy.RETAIN 
      : cdk.RemovalPolicy.DESTROY;
  }
}