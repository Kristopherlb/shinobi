/**
 * Neptune Binder Strategy (Unified)
 * Handles graph database bindings for Amazon Neptune with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class NeptuneBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['neptune:cluster', 'neptune:instance', 'neptune:query', 'neptune:backup'];

  getStrategyName(): string {
    return 'Neptune Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'neptune:cluster',
        capability: 'neptune:cluster',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Neptune cluster for graph database cluster operations',
        examples: ['lambda-api -> neptune:cluster (read/write)']
      },
      {
        sourceType: '*',
        targetType: 'neptune:instance',
        capability: 'neptune:instance',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Neptune instance for graph database instance operations',
        examples: ['lambda-api -> neptune:instance (read)']
      },
      {
        sourceType: '*',
        targetType: 'neptune:query',
        capability: 'neptune:query',
        supportedAccess: ['read', 'write'],
        description: 'Bind to Neptune query endpoint for graph database query operations',
        examples: ['lambda-api -> neptune:query (read)']
      },
      {
        sourceType: '*',
        targetType: 'neptune:cluster',
        capability: 'neptune:backup',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Neptune cluster for backup and restore operations',
        examples: ['lambda-backup -> neptune:backup (read/write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for Neptune binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns (only standard AccessLevel values are allowed)
    const validAccessTypes = ['read', 'write', 'readwrite'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for Neptune binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for Neptune binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'neptune:cluster':
        return await this.bindToCluster(context, targetCapabilityData, access);
      case 'neptune:instance':
        return await this.bindToInstance(context, targetCapabilityData, access);
      case 'neptune:query':
        return await this.bindToQuery(context, targetCapabilityData, access);
      case 'neptune:backup':
        return await this.bindToBackup(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported Neptune capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to Neptune cluster
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - clusterArn (required): string - ARN of the Neptune cluster
   *   - clusterIdentifier (required): string - Identifier of the cluster
   *   - clusterEndpoint (required): string - Cluster endpoint URL
   *   - port (required): number - Cluster port number
   *   - status?: string - Cluster status (e.g., 'available')
   *   - engine?: string - Engine version (e.g., 'neptune')
   *   - storageEncrypted?: boolean - Encryption at rest enabled
   *   - kmsKeyId?: string - KMS key ID for encryption
   *   - backupRetentionPeriod?: number - Backup retention period in days
   *   - vpcSecurityGroupIds?: string[] - VPC security group IDs
   *   - dbSubnetGroupName?: string - DB subnet group name
   * @param access - Array of access levels (read, write, readwrite)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToCluster(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.clusterArn) {
      throw new Error('Target component missing required clusterArn property for Neptune cluster binding');
    }
    if (!targetData?.clusterIdentifier) {
      throw new Error('Target component missing required clusterIdentifier property for Neptune cluster binding');
    }
    if (!targetData?.clusterEndpoint) {
      throw new Error('Target component missing required clusterEndpoint property for Neptune cluster binding');
    }
    if (targetData?.port === undefined || targetData?.port === null) {
      throw new Error('Target component missing required port property for Neptune cluster binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant cluster access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'rds:DescribeDBClusters',
          'rds:DescribeDBClusterEndpoints',
          'rds:DescribeDBClusterParameters'
        ],
        resources: [targetData.clusterArn]
      });
      iamPolicies.push({
        statement,
        description: 'Neptune cluster read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'rds:CreateDBCluster',
          'rds:ModifyDBCluster',
          'rds:DeleteDBCluster',
          'rds:StartDBCluster',
          'rds:StopDBCluster'
        ],
        resources: [targetData.clusterArn]
      });
      iamPolicies.push({
        statement,
        description: 'Neptune cluster write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set cluster environment variables
    environmentVariables['NEPTUNE_CLUSTER_IDENTIFIER'] = targetData.clusterIdentifier;
    environmentVariables['NEPTUNE_CLUSTER_ARN'] = targetData.clusterArn;
    environmentVariables['NEPTUNE_CLUSTER_ENDPOINT'] = targetData.clusterEndpoint;
    environmentVariables['NEPTUNE_CLUSTER_PORT'] = String(targetData.port);
    if (targetData.status) {
      environmentVariables['NEPTUNE_CLUSTER_STATUS'] = targetData.status;
    }
    if (targetData.engine) {
      environmentVariables['NEPTUNE_CLUSTER_ENGINE'] = targetData.engine;
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      await this.configureSecureClusterAccess(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Neptune instance
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - instanceArn (required): string - ARN of the Neptune instance
   *   - instanceIdentifier (required): string - Identifier of the instance
   *   - endpoint (required): string - Instance endpoint URL
   *   - port (required): number - Instance port number
   *   - dbInstanceStatus?: string - Instance status (e.g., 'available')
   *   - dbInstanceClass?: string - Instance class (e.g., 'db.r5.xlarge')
   * @param access - Array of access levels (read, write, readwrite)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToInstance(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.instanceArn) {
      throw new Error('Target component missing required instanceArn property for Neptune instance binding');
    }
    if (!targetData?.instanceIdentifier) {
      throw new Error('Target component missing required instanceIdentifier property for Neptune instance binding');
    }
    if (!targetData?.endpoint) {
      throw new Error('Target component missing required endpoint property for Neptune instance binding');
    }
    if (targetData?.port === undefined || targetData?.port === null) {
      throw new Error('Target component missing required port property for Neptune instance binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant instance access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'rds:DescribeDBInstances',
          'rds:DescribeDBInstanceStatus'
        ],
        resources: [targetData.instanceArn]
      });
      iamPolicies.push({
        statement,
        description: 'Neptune instance read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'rds:CreateDBInstance',
          'rds:ModifyDBInstance',
          'rds:DeleteDBInstance',
          'rds:RebootDBInstance',
          'rds:StartDBInstance',
          'rds:StopDBInstance'
        ],
        resources: [targetData.instanceArn]
      });
      iamPolicies.push({
        statement,
        description: 'Neptune instance write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set instance environment variables
    environmentVariables['NEPTUNE_INSTANCE_IDENTIFIER'] = targetData.instanceIdentifier;
    environmentVariables['NEPTUNE_INSTANCE_ARN'] = targetData.instanceArn;
    environmentVariables['NEPTUNE_INSTANCE_ENDPOINT'] = targetData.endpoint;
    environmentVariables['NEPTUNE_INSTANCE_PORT'] = String(targetData.port);
    if (targetData.dbInstanceStatus) {
      environmentVariables['NEPTUNE_INSTANCE_STATUS'] = targetData.dbInstanceStatus;
    }
    if (targetData.dbInstanceClass) {
      environmentVariables['NEPTUNE_INSTANCE_CLASS'] = targetData.dbInstanceClass;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Neptune query endpoint
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - queryEndpoint (required): string - Query endpoint URL
   *   - port (required): number - Query port number
   *   - supportedQueryLanguages?: string[] - Supported query languages (e.g., ['sparql', 'gremlin'])
   *   - sparqlEndpoint?: string - SPARQL-specific endpoint URL
   *   - gremlinEndpoint?: string - Gremlin-specific endpoint URL
   *   - iamDatabaseAuthenticationEnabled?: boolean - IAM authentication enabled
   *   - enableCloudwatchLogsExports?: string[] - CloudWatch log exports enabled
   *   - performanceInsightsEnabled?: boolean - Performance Insights enabled
   * @param access - Array of access levels (read, write)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToQuery(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.queryEndpoint) {
      throw new Error('Target component missing required queryEndpoint property for Neptune query binding');
    }
    if (targetData?.port === undefined || targetData?.port === null) {
      throw new Error('Target component missing required port property for Neptune query binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Set query endpoint environment variables
    environmentVariables['NEPTUNE_QUERY_ENDPOINT'] = targetData.queryEndpoint;
    environmentVariables['NEPTUNE_QUERY_PORT'] = String(targetData.port);
    environmentVariables['NEPTUNE_QUERY_PROTOCOL'] = 'https';

    // Configure query languages
    if (targetData.supportedQueryLanguages && Array.isArray(targetData.supportedQueryLanguages)) {
      environmentVariables['NEPTUNE_QUERY_LANGUAGES'] = targetData.supportedQueryLanguages.join(',');
    }

    // Configure SPARQL endpoint
    if (targetData.sparqlEndpoint) {
      environmentVariables['NEPTUNE_SPARQL_ENDPOINT'] = targetData.sparqlEndpoint;
    }

    // Configure Gremlin endpoint
    if (targetData.gremlinEndpoint) {
      environmentVariables['NEPTUNE_GREMLIN_ENDPOINT'] = targetData.gremlinEndpoint;
    }

    // Configure secure query access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      await this.configureSecureQueryAccess(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to Neptune cluster for backup operations
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - clusterArn (required): string - ARN of the Neptune cluster
   *   - clusterIdentifier (required): string - Identifier of the cluster
   *   - backupRetentionPeriod?: number - Backup retention period in days
   *   - snapshotIdentifier?: string - Snapshot identifier for restore operations
   * @param access - Array of access levels (read, write, readwrite)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToBackup(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.clusterArn) {
      throw new Error('Target component missing required clusterArn property for Neptune backup binding');
    }
    if (!targetData?.clusterIdentifier) {
      throw new Error('Target component missing required clusterIdentifier property for Neptune backup binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const { region, accountId } = context.source.context;

    // Grant backup read permissions (describe, list snapshots)
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'rds:DescribeDBClusterSnapshots',
          'rds:DescribeDBClusters',
          'rds:ListTagsForResource'
        ],
        resources: [
          targetData.clusterArn,
          `arn:aws:rds:${region}:${accountId}:cluster-snapshot:${targetData.clusterIdentifier}-*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'Neptune backup read access permissions',
        complianceRequirement: 'Data protection and recovery'
      });
    }

    // Grant backup write permissions (create, delete, restore snapshots)
    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'rds:CreateDBClusterSnapshot',
          'rds:DeleteDBClusterSnapshot',
          'rds:RestoreDBClusterFromSnapshot',
          'rds:RestoreDBClusterToPointInTime',
          'rds:CopyDBClusterSnapshot'
        ],
        resources: [
          targetData.clusterArn,
          `arn:aws:rds:${region}:${accountId}:cluster-snapshot:${targetData.clusterIdentifier}-*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'Neptune backup write access permissions',
        complianceRequirement: 'Data protection and recovery'
      });
    }

    // Set backup environment variables
    environmentVariables['NEPTUNE_CLUSTER_ARN'] = targetData.clusterArn;
    environmentVariables['NEPTUNE_CLUSTER_IDENTIFIER'] = targetData.clusterIdentifier;
    if (targetData.backupRetentionPeriod !== undefined && targetData.backupRetentionPeriod !== null) {
      environmentVariables['NEPTUNE_BACKUP_RETENTION_DAYS'] = String(targetData.backupRetentionPeriod);
    }
    if (targetData.snapshotIdentifier) {
      environmentVariables['NEPTUNE_SNAPSHOT_IDENTIFIER'] = targetData.snapshotIdentifier;
    }
    if (region) {
      environmentVariables['NEPTUNE_REGION'] = region;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure cluster access features
   * Applies additional security configurations when requireSecureAccess is enabled
   */
  private async configureSecureClusterAccess(
    context: BindingContext,
    targetData: any,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    // Configure encryption at rest
    if (targetData.storageEncrypted === true) {
      environmentVariables['NEPTUNE_ENCRYPTION_ENABLED'] = 'true';

      if (targetData.kmsKeyId) {
        environmentVariables['NEPTUNE_KMS_KEY_ID'] = targetData.kmsKeyId;

        // Grant KMS permissions
        const kmsStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          resources: [targetData.kmsKeyId]
        });
        iamPolicies.push({
          statement: kmsStatement,
          description: 'KMS permissions for Neptune encryption',
          complianceRequirement: 'Encryption at rest'
        });
      }
    }

    // Configure backup retention when specified
    if (targetData.backupRetentionPeriod !== undefined && targetData.backupRetentionPeriod !== null) {
      environmentVariables['NEPTUNE_BACKUP_RETENTION_DAYS'] = String(targetData.backupRetentionPeriod);
    }

    // Configure VPC security groups for private access
    if (targetData.vpcSecurityGroupIds && Array.isArray(targetData.vpcSecurityGroupIds)) {
      environmentVariables['NEPTUNE_SECURITY_GROUPS'] = targetData.vpcSecurityGroupIds.join(',');
    }

    // Configure subnet group for private networking
    if (targetData.dbSubnetGroupName) {
      environmentVariables['NEPTUNE_SUBNET_GROUP'] = targetData.dbSubnetGroupName;
    }
  }

  /**
   * Configure secure query access features
   * Applies additional security configurations when requireSecureAccess is enabled
   */
  private async configureSecureQueryAccess(
    context: BindingContext,
    targetData: any,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    // Configure IAM authentication for secure access
    if (targetData.iamDatabaseAuthenticationEnabled === true) {
      environmentVariables['NEPTUNE_IAM_AUTH_ENABLED'] = 'true';
    }

    // Configure SSL/TLS for encrypted connections
    environmentVariables['NEPTUNE_SSL_ENABLED'] = 'true';
    environmentVariables['NEPTUNE_SSL_MODE'] = 'require';

    // Configure audit logging for compliance
    if (targetData.enableCloudwatchLogsExports && Array.isArray(targetData.enableCloudwatchLogsExports)) {
      environmentVariables['NEPTUNE_AUDIT_LOGGING_ENABLED'] = 'true';
      environmentVariables['NEPTUNE_CLOUDWATCH_LOGS'] = targetData.enableCloudwatchLogsExports.join(',');

      // Grant CloudWatch Logs permissions if audit logging is enabled
      const logsStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams'
        ],
        resources: ['*'] // Neptune log groups are created automatically, use wildcard for log group ARN
      });
      iamPolicies.push({
        statement: logsStatement,
        description: 'CloudWatch Logs permissions for Neptune audit logging',
        complianceRequirement: 'Audit logging and compliance'
      });
    }

    // Configure performance insights for monitoring
    if (targetData.performanceInsightsEnabled === true) {
      environmentVariables['NEPTUNE_PERFORMANCE_INSIGHTS_ENABLED'] = 'true';
    }
  }
}
