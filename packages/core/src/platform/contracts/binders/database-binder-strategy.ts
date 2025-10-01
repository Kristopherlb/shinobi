/**
 * Database Binder Strategy
 * Handles binding between compute components and database components (RDS, PostgreSQL, etc.)
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EnhancedBinderStrategy } from '../enhanced-binder-strategy.js';
import { validateOptions } from './binding-options.js';
import {
  EnhancedBindingContext,
  EnhancedBindingResult,
  IamPolicy,
  SecurityGroupRule,
  ComplianceAction,
  DbCapability,
  Capability,
  PostgresCapabilityData,
  MySQLCapabilityData
} from '../bindings.js';

/**
 * Database binder strategy for RDS/PostgreSQL connections
 */
export class DatabaseBinderStrategy extends EnhancedBinderStrategy {

  getStrategyName(): string {
    return 'DatabaseBinderStrategy';
  }

  canHandle(sourceType: string, targetCapability: Capability): boolean {
    // Handle any compute component binding to database capabilities
    const computeTypes = this.getSupportedSourceTypes();
    const databaseCapabilities: DbCapability[] = ['db:postgres', 'db:mysql', 'db:aurora-postgres', 'db:aurora-mysql'];

    return computeTypes.includes(sourceType) && databaseCapabilities.includes(targetCapability as DbCapability);
  }

  async bind(context: EnhancedBindingContext): Promise<EnhancedBindingResult> {
    this.validateBindingContext(context);

    const capabilityKey = (context.targetCapabilityData?.type || 'db:postgres') as any;
    const validation = validateOptions(capabilityKey, context.options);
    if (!validation.valid) {
      throw new Error(`Invalid binding options: ${validation.errors.join(', ')}`);
    }

    const capability = context.targetCapabilityData;
    const access = context.directive.access;


    // Validate access level
    const validAccessLevels = ['read', 'write', 'readwrite', 'admin'];
    if (!this.isValidAccessLevel(access, validAccessLevels)) {
      throw this.createContextualError(`Invalid access level: ${access}`, context);
    }

    // Type guard for database capability data
    if (!this.isDatabaseCapabilityData(capability)) {
      throw this.createContextualError('Invalid database capability data', context);
    }

    // Create IAM policies
    const iamPolicies = this.createDatabaseIamPolicies(context, capability, access);

    // Create security group rules
    const securityGroupRules = this.createSecurityGroupRules(context, capability);

    // Create compliance actions
    const complianceActions = this.createComplianceActions(context, capability, access);

    // Generate environment variables
    const environmentVariables = this.generateEnvironmentVariables(context, {}, capability);

    return this.createBindingResult(
      environmentVariables,
      iamPolicies,
      securityGroupRules,
      complianceActions,
      {
        networkConfig: this.createDatabaseNetworkConfig(context, capability)
      }
    );
  }

  /**
   * Create IAM policies for database access
   */
  private createDatabaseIamPolicies(
    context: EnhancedBindingContext,
    capability: PostgresCapabilityData | MySQLCapabilityData,
    access: string
  ): IamPolicy[] {
    const policies: IamPolicy[] = [];

    // RDS connection policy
    const rdsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rds:DescribeDBInstances',
        'rds:DescribeDBClusters',
        'rds:DescribeDBSubnetGroups',
        'rds:DescribeDBSecurityGroups'
      ],
      resources: [
        capability.resources.arn,
        ...(capability.resources.clusterArn ? [capability.resources.clusterArn] : [])
      ],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: rdsPolicy,
      description: `RDS metadata access for ${context.source.getName()} -> ${context.target.getName()}`,
      complianceRequirement: 'rds_metadata'
    });

    // Secrets Manager access for database credentials
    const secretsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret'
      ],
      resources: [capability.secrets.masterSecretArn],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        }
      }
    });

    policies.push({
      statement: secretsPolicy,
      description: `Database credentials access for ${context.source.getName()}`,
      complianceRequirement: 'secrets_access'
    });

    // KMS access for secrets decryption
    const kmsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Decrypt',
        'kms:DescribeKey'
      ],
      resources: ['*'],
      conditions: {
        'StringEquals': {
          'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
        },
        'ForAnyValue:StringEquals': {
          'kms:ViaService': [
            `secretsmanager.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
          ]
        }
      }
    });

    policies.push({
      statement: kmsPolicy,
      description: `KMS decryption for database secrets`,
      complianceRequirement: 'kms_decryption'
    });

    return policies;
  }

  /**
   * Create security group rules for database access
   */
  private createSecurityGroupRules(
    context: EnhancedBindingContext,
    capability: PostgresCapabilityData | MySQLCapabilityData
  ): SecurityGroupRule[] {
    const rules: SecurityGroupRule[] = [];

    // Get database port from capability data
    const dbPort = capability.endpoints.port;
    const sourceCapabilityData = context.source.getCapabilityData() as any;
    const sourceSecurityGroups = sourceCapabilityData?.securityGroups || [];

    // Allow ingress from source security groups
    for (const sourceSgId of sourceSecurityGroups) {
      rules.push({
        type: 'ingress',
        peer: { kind: 'sg', id: sourceSgId },
        port: {
          from: dbPort,
          to: dbPort,
          protocol: 'tcp'
        },
        description: `Database access from ${context.source.getName()}`
      });
    }

    // Add egress rule for database responses
    rules.push({
      type: 'egress',
      peer: { kind: 'sg', id: capability.securityGroups[0] },
      port: {
        from: dbPort,
        to: dbPort,
        protocol: 'tcp'
      },
      description: `Database response to ${context.source.getName()}`
    });

    return rules;
  }

  /**
   * Create compliance actions
   */
  private createComplianceActions(
    context: EnhancedBindingContext,
    capability: PostgresCapabilityData | MySQLCapabilityData,
    access: string
  ): ComplianceAction[] {
    const actions: ComplianceAction[] = [];

    // Log access level for audit
    actions.push(this.createComplianceAction(
      'DB-ACCESS-001',
      'info',
      `Database access granted: ${access}`,
      context.complianceFramework,
      undefined,
      {
        source: context.source.getName(),
        target: context.target.getName(),
        access,
        databaseType: capability.type
      }
    ));

    // FedRAMP High specific actions
    if (context.complianceFramework === 'fedramp-high') {
      actions.push(this.createComplianceAction(
        'DB-HIGH-001',
        'info',
        'FedRAMP High compliance: Database access requires encryption in transit',
        context.complianceFramework,
        'Ensure SSL/TLS encryption is enabled for database connections',
        {
          encryptionRequired: true,
          sslMode: 'require'
        }
      ));
    }

    return actions;
  }

  /**
   * Generate environment variables for database connection
   */
  protected generateEnvironmentVariables(
    context: EnhancedBindingContext,
    defaultMappings: Record<string, string>,
    capabilityData: Record<string, any>
  ): Record<string, string> {
    const capability = capabilityData as PostgresCapabilityData | MySQLCapabilityData;
    const envVars: Record<string, string> = {};

    // Default mappings
    const mappings = {
      host: 'DB_HOST',
      port: 'DB_PORT',
      database: 'DB_NAME',
      username: 'DB_USER',
      password: 'DB_PASSWORD',
      secretArn: 'DB_SECRET_ARN'
    };

    // Use custom mappings if provided
    const customMappings = context.directive.env || {};
    const finalMappings = { ...mappings, ...customMappings };

    // Set basic connection parameters
    envVars[finalMappings.host] = capability.endpoints.host;
    envVars[finalMappings.port] = capability.endpoints.port.toString();
    envVars[finalMappings.database] = capability.endpoints.database;
    envVars[finalMappings.secretArn] = capability.secrets.masterSecretArn;

    // Generate connection string
    const protocol = capability.type.startsWith('db:postgres') ? 'postgresql' : 'mysql';
    const connectionString = `${protocol}://${capability.endpoints.host}:${capability.endpoints.port}/${capability.endpoints.database}`;
    envVars['DB_CONNECTION_STRING'] = connectionString;

    // Set SSL mode for FedRAMP compliance
    if (context.complianceFramework === 'fedramp-high' || context.complianceFramework === 'fedramp-moderate') {
      envVars['DB_SSL_MODE'] = 'require';
    }

    return envVars;
  }

  /**
   * Create database network configuration
   */
  private createDatabaseNetworkConfig(
    context: EnhancedBindingContext,
    capability: PostgresCapabilityData | MySQLCapabilityData
  ): Record<string, unknown> {
    return {
      vpcId: capability.subnetGroup,
      securityGroups: capability.securityGroups,
      port: capability.endpoints.port,
      encryption: {
        inTransit: context.complianceFramework !== 'commercial',
        atRest: true
      }
    };
  }

  /**
   * Type guard for database capability data
   */
  private isDatabaseCapabilityData(capability: any): capability is PostgresCapabilityData | MySQLCapabilityData {
    return capability &&
      (capability.type === 'db:postgres' || capability.type === 'db:mysql') &&
      capability.endpoints &&
      capability.resources &&
      capability.secrets;
  }
}