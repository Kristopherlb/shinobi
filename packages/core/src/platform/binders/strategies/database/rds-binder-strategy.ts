/**
 * RDS Binder Strategy (Unified)
 * Handles relational database bindings for Amazon RDS (PostgreSQL, MySQL, Aurora) with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '../../../contracts/unified-binder-strategy-base.js';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '../../../contracts/platform-binding-trigger-spec.js';
import type { IamPolicy, PostgresCapabilityData, MySQLCapabilityData } from '../../../contracts/bindings.js';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class RdsBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['db:postgres', 'db:mysql', 'db:aurora-postgres', 'db:aurora-mysql'];

  getStrategyName(): string {
    return 'RDS Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'rds-postgres',
        capability: 'db:postgres',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to RDS PostgreSQL database for relational database operations',
        examples: ['lambda-api -> db:postgres (read/write)']
      },
      {
        sourceType: '*',
        targetType: 'rds-postgres',
        capability: 'db:aurora-postgres',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to Aurora PostgreSQL cluster for relational database operations',
        examples: ['lambda-api -> db:aurora-postgres (read)']
      },
      {
        sourceType: '*',
        targetType: 'rds-mysql',
        capability: 'db:mysql',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to RDS MySQL database for relational database operations',
        examples: ['lambda-api -> db:mysql (read/write)']
      },
      {
        sourceType: '*',
        targetType: 'rds-mysql',
        capability: 'db:aurora-mysql',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to Aurora MySQL cluster for relational database operations',
        examples: ['lambda-api -> db:aurora-mysql (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for RDS binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite', 'admin'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for RDS binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for RDS binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Validate capability data structure
    if (!this.isDatabaseCapabilityData(targetCapabilityData)) {
      throw new Error(`Invalid database capability data structure for capability '${capability}'`);
    }

    // Route to binding method based on database type
    return await this.bindToDatabase(context, targetCapabilityData, access);
  }

  /**
   * Bind to RDS database (PostgreSQL, MySQL, Aurora)
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (PostgresCapabilityData or MySQLCapabilityData):
   *   - type (required): 'db:postgres' | 'db:mysql' | 'db:aurora-postgres' | 'db:aurora-mysql'
   *   - endpoints (required): { host: string, port: number, database: string }
   *   - resources (required): { arn: string, clusterArn?: string }
   *   - secrets (required): { masterSecretArn: string }
   *   - securityGroups (optional): string[] - Array of security group IDs (for metadata, network binding handled separately)
   *   - subnetGroup (optional): string - DB subnet group name (for metadata)
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToDatabase(
    context: BindingContext,
    targetData: PostgresCapabilityData | MySQLCapabilityData,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required fields
    if (!targetData.endpoints?.host) {
      throw new Error('Target component missing required endpoints.host property for RDS binding');
    }
    if (!targetData.endpoints?.port) {
      throw new Error('Target component missing required endpoints.port property for RDS binding');
    }
    if (!targetData.endpoints?.database) {
      throw new Error('Target component missing required endpoints.database property for RDS binding');
    }
    if (!targetData.resources?.arn) {
      throw new Error('Target component missing required resources.arn property for RDS binding');
    }
    if (!targetData.secrets?.masterSecretArn) {
      throw new Error('Target component missing required secrets.masterSecretArn property for RDS binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Create IAM policies for RDS access
    await this.createRdsIamPolicies(context, targetData, access, iamPolicies);

    // Generate environment variables
    this.generateEnvironmentVariables(context, targetData, environmentVariables);

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: [] // Network binding (security group rules) handled separately or via patches
    };
  }

  /**
   * Create IAM policies for RDS database access
   */
  private async createRdsIamPolicies(
    context: BindingContext,
    targetData: PostgresCapabilityData | MySQLCapabilityData,
    access: string[],
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    const { region, accountId } = context.source.context;

    // RDS metadata access (always required)
    const rdsResources = [targetData.resources.arn];
    if (targetData.resources.clusterArn) {
      rdsResources.push(targetData.resources.clusterArn);
    }

    const rdsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'rds:DescribeDBInstances',
        'rds:DescribeDBClusters',
        'rds:DescribeDBSubnetGroups',
        'rds:DescribeDBSecurityGroups'
      ],
      resources: rdsResources,
      conditions: region ? {
        StringEquals: {
          'aws:RequestedRegion': region
        }
      } : undefined
    });

    iamPolicies.push({
      statement: rdsStatement,
      description: 'RDS metadata access permissions',
      complianceRequirement: 'Least privilege IAM access'
    });

    // Secrets Manager access for database credentials (always required)
    const secretsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret'
      ],
      resources: [targetData.secrets.masterSecretArn],
      conditions: region ? {
        StringEquals: {
          'aws:RequestedRegion': region
        }
      } : undefined
    });

    iamPolicies.push({
      statement: secretsStatement,
      description: 'Database credentials access via Secrets Manager',
      complianceRequirement: 'Secrets management'
    });

    // KMS access for secrets decryption (always required when using Secrets Manager)
    const kmsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'kms:Decrypt',
        'kms:DescribeKey'
      ],
      resources: ['*'], // Secrets Manager uses service-managed keys or customer keys
      conditions: region ? {
        StringEquals: {
          'aws:RequestedRegion': region
        },
        'ForAnyValue:StringEquals': {
          'kms:ViaService': [
            `secretsmanager.${region}.amazonaws.com`
          ]
        }
      } : {
        'ForAnyValue:StringEquals': {
          'kms:ViaService': [
            'secretsmanager.*.amazonaws.com'
          ]
        }
      }
    });

    iamPolicies.push({
      statement: kmsStatement,
      description: 'KMS decryption permissions for database secrets',
      complianceRequirement: 'Encryption at rest'
    });
  }


  /**
   * Generate environment variables for database connection
   */
  private generateEnvironmentVariables(
    context: BindingContext,
    targetData: PostgresCapabilityData | MySQLCapabilityData,
    environmentVariables: Record<string, string>
  ): void {
    // Default environment variable mappings
    const defaultMappings = {
      host: 'DB_HOST',
      port: 'DB_PORT',
      database: 'DB_NAME',
      secretArn: 'DB_SECRET_ARN'
    };

    // Use custom mappings if provided via directive.env
    const customMappings = context.directive.env || {};
    const finalMappings = { ...defaultMappings, ...customMappings };

    // Set basic connection parameters
    environmentVariables[finalMappings.host] = targetData.endpoints.host;
    environmentVariables[finalMappings.port] = String(targetData.endpoints.port);
    environmentVariables[finalMappings.database] = targetData.endpoints.database;
    environmentVariables[finalMappings.secretArn] = targetData.secrets.masterSecretArn;

    // Generate connection string
    const protocol = this.getDatabaseProtocol(targetData.type);
    const connectionString = `${protocol}://${targetData.endpoints.host}:${targetData.endpoints.port}/${targetData.endpoints.database}`;
    environmentVariables['DB_CONNECTION_STRING'] = connectionString;

    // Set SSL mode (config-driven via options.preferredSslMode, not hard-coded framework branching)
    const sslMode = context.directive.options?.preferredSslMode;
    if (sslMode) {
      environmentVariables['DB_SSL_MODE'] = sslMode;
    } else {
      // Default SSL mode based on compliance framework (via config-driven rules)
      // For FedRAMP, prefer 'require' or 'verify-full'
      // For commercial, can be optional
      // This should ideally come from compliance rules, but for now use a sensible default
      environmentVariables['DB_SSL_MODE'] = 'prefer';
    }

    // Set database type for application use
    environmentVariables['DB_TYPE'] = targetData.type;

    // Add cluster ARN if present (Aurora)
    if (targetData.resources.clusterArn) {
      environmentVariables['DB_CLUSTER_ARN'] = targetData.resources.clusterArn;
    }
  }

  /**
   * Get database protocol from capability type
   */
  private getDatabaseProtocol(dbType: string): string {
    if (dbType.startsWith('db:postgres') || dbType.startsWith('db:aurora-postgres')) {
      return 'postgresql';
    } else if (dbType.startsWith('db:mysql') || dbType.startsWith('db:aurora-mysql')) {
      return 'mysql';
    }
    return 'unknown';
  }

  /**
   * Type guard for database capability data
   */
  private isDatabaseCapabilityData(capability: any): capability is PostgresCapabilityData | MySQLCapabilityData {
    return capability &&
      typeof capability === 'object' &&
      (capability.type === 'db:postgres' ||
       capability.type === 'db:mysql' ||
       capability.type === 'db:aurora-postgres' ||
       capability.type === 'db:aurora-mysql') &&
      capability.endpoints &&
      typeof capability.endpoints === 'object' &&
      typeof capability.endpoints.host === 'string' &&
      typeof capability.endpoints.port === 'number' &&
      typeof capability.endpoints.database === 'string' &&
      capability.resources &&
      typeof capability.resources === 'object' &&
      typeof capability.resources.arn === 'string' &&
      capability.secrets &&
      typeof capability.secrets === 'object' &&
      typeof capability.secrets.masterSecretArn === 'string';
  }
}

