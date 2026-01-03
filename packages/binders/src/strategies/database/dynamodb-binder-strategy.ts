/**
 * DynamoDB Binder Strategy (Unified)
 * Handles NoSQL database bindings for Amazon DynamoDB with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class DynamoDbBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['db:dynamodb', 'dynamodb:table', 'dynamodb:index', 'dynamodb:stream', 'dynamodb:backup'];

  getStrategyName(): string {
    return 'DynamoDB Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'dynamodb:table',
        capability: 'db:dynamodb',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to DynamoDB table for NoSQL database operations',
        examples: ['lambda-api -> db:dynamodb (read/write)']
      },
      {
        sourceType: '*',
        targetType: 'dynamodb:table',
        capability: 'dynamodb:table',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to DynamoDB table (alias for db:dynamodb)',
        examples: ['lambda-api -> dynamodb:table (read)']
      },
      {
        sourceType: '*',
        targetType: 'dynamodb:index',
        capability: 'dynamodb:index',
        supportedAccess: ['read', 'write'],
        description: 'Bind to DynamoDB index (GSI or LSI) for query operations',
        examples: ['lambda-api -> dynamodb:index (read)']
      },
      {
        sourceType: '*',
        targetType: 'dynamodb:stream',
        capability: 'dynamodb:stream',
        supportedAccess: ['read', 'write'],
        description: 'Bind to DynamoDB stream for change data capture',
        examples: ['lambda-api -> dynamodb:stream (read)']
      },
      {
        sourceType: '*',
        targetType: 'dynamodb:table',
        capability: 'dynamodb:backup',
        supportedAccess: ['read', 'write'],
        description: 'Bind to DynamoDB table for backup and restore operations',
        examples: ['lambda-backup -> dynamodb:backup (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for DynamoDB binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns (only standard AccessLevel values are allowed)
    const validAccessTypes = ['read', 'write', 'readwrite', 'admin'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for DynamoDB binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for DynamoDB binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'db:dynamodb':
      case 'dynamodb:table':
        return await this.bindToTable(context, targetCapabilityData, access);
      case 'dynamodb:index':
        return await this.bindToIndex(context, targetCapabilityData, access);
      case 'dynamodb:stream':
        return await this.bindToStream(context, targetCapabilityData, access);
      case 'dynamodb:backup':
        return await this.bindToBackup(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported DynamoDB capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to DynamoDB table
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - tableArn (required): string - ARN of the DynamoDB table
   *   - tableName (required): string - Name of the DynamoDB table
   *   - tableStatus?: string - Status of the table (e.g., 'ACTIVE')
   *   - keySchema?: object - Key schema definition
   *   - attributeDefinitions?: object[] - Attribute definitions
   *   - billingMode?: string - Billing mode ('PAY_PER_REQUEST' or 'PROVISIONED')
   *   - sseSpecification?: { sseEnabled: boolean; sseType?: string; kmsMasterKeyId?: string }
   *   - pointInTimeRecoverySpecification?: { pointInTimeRecoveryEnabled: boolean }
   *   - globalTableVersion?: string - Global table version
   * @param access - Array of access levels (read, write, admin, backup)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToTable(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.tableArn) {
      throw new Error('Target component missing required tableArn property for DynamoDB table binding');
    }
    if (!targetData?.tableName) {
      throw new Error('Target component missing required tableName property for DynamoDB table binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant table access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:BatchGetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable',
          'dynamodb:ListTables'
        ],
        resources: [
          targetData.tableArn,
          `${targetData.tableArn}/index/*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB table read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite') || access.includes('admin')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:PutItem',
          'dynamodb:BatchWriteItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem'
        ],
        resources: [
          targetData.tableArn,
          `${targetData.tableArn}/index/*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB table write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('admin')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:CreateTable',
          'dynamodb:UpdateTable',
          'dynamodb:DeleteTable',
          'dynamodb:DescribeTable',
          'dynamodb:DescribeTimeToLive',
          'dynamodb:ListTables'
        ],
        resources: [targetData.tableArn]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB table administration permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Grant backup and restore permissions (note: backup is not a standard AccessLevel,
    // but admin access includes backup permissions)
    if (access.includes('admin')) {
      // Extract region and account from table ARN if possible, otherwise use wildcard
      const arnParts = targetData.tableArn?.match(/^arn:aws:dynamodb:([^:]+):(\d+):table\//);
      const region = arnParts?.[1] || '*';
      const accountId = arnParts?.[2] || '*';
      
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:CreateBackup',
          'dynamodb:DeleteBackup',
          'dynamodb:DescribeBackup',
          'dynamodb:ListBackups',
          'dynamodb:RestoreTableFromBackup',
          'dynamodb:RestoreTableToPointInTime'
        ],
        resources: [
          targetData.tableArn,
          `arn:aws:dynamodb:${region}:${accountId}:table/${targetData.tableName}/backup/*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB backup and restore permissions',
        complianceRequirement: 'Data protection and recovery'
      });
    }

    // Set table environment variables
    environmentVariables['DYNAMODB_TABLE_NAME'] = targetData.tableName;
    environmentVariables['DYNAMODB_TABLE_ARN'] = targetData.tableArn;
    if (targetData.tableStatus) {
      environmentVariables['DYNAMODB_TABLE_STATUS'] = targetData.tableStatus;
    }
    // Extract region from table ARN if available
    const arnParts = targetData.tableArn?.match(/^arn:aws:dynamodb:([^:]+):/);
    if (arnParts?.[1]) {
      environmentVariables['DYNAMODB_REGION'] = arnParts[1];
    }

    // Configure table metadata
    if (targetData.keySchema) {
      environmentVariables['DYNAMODB_KEY_SCHEMA'] = JSON.stringify(targetData.keySchema);
    }
    if (targetData.attributeDefinitions) {
      environmentVariables['DYNAMODB_ATTRIBUTE_DEFINITIONS'] = JSON.stringify(targetData.attributeDefinitions);
    }

    // Configure billing mode
    environmentVariables['DYNAMODB_BILLING_MODE'] = targetData.billingMode || 'PAY_PER_REQUEST';

    // Configure server-side encryption
    if (targetData.sseSpecification?.sseEnabled) {
      environmentVariables['DYNAMODB_SSE_ENABLED'] = 'true';
      if (targetData.sseSpecification.sseType) {
        environmentVariables['DYNAMODB_SSE_TYPE'] = targetData.sseSpecification.sseType;
      }
      if (targetData.sseSpecification.kmsMasterKeyId) {
        environmentVariables['DYNAMODB_KMS_KEY_ID'] = targetData.sseSpecification.kmsMasterKeyId;

        // Grant KMS permissions for encryption
        const kmsStatement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'kms:Decrypt',
            'kms:GenerateDataKey'
          ],
          resources: [targetData.sseSpecification.kmsMasterKeyId]
        });
        iamPolicies.push({
          statement: kmsStatement,
          description: 'KMS permissions for DynamoDB encryption',
          complianceRequirement: 'Encryption at rest'
        });
      }
    }

    // Configure point-in-time recovery
    if (targetData.pointInTimeRecoverySpecification?.pointInTimeRecoveryEnabled) {
      environmentVariables['DYNAMODB_PITR_ENABLED'] = 'true';
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      await this.configureSecureTableAccess(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to DynamoDB index
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - indexArn (required): string - ARN of the DynamoDB index
   *   - indexName (required): string - Name of the index
   *   - indexStatus?: string - Status of the index
   *   - indexType?: string - Type of index ('GSI' or 'LSI')
   *   - keySchema?: object - Index key schema
   *   - projection?: object - Index projection configuration
   *   - tableArn?: string - ARN of the parent table
   * @param access - Array of access levels (read, write)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToIndex(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Resolve index target (may be array or single object)
    const resolvedIndex = this.resolveIndexTarget(targetData, context);

    if (!resolvedIndex?.indexArn) {
      throw new Error('Target component missing required indexArn property for DynamoDB index binding');
    }
    if (!resolvedIndex?.indexName) {
      throw new Error('Target component missing required indexName property for DynamoDB index binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant index access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable'
        ],
        resources: [resolvedIndex.indexArn]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB index read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:CreateGlobalSecondaryIndex',
          'dynamodb:UpdateGlobalSecondaryIndex',
          'dynamodb:DeleteGlobalSecondaryIndex',
          'dynamodb:CreateLocalSecondaryIndex',
          'dynamodb:UpdateLocalSecondaryIndex',
          'dynamodb:DeleteLocalSecondaryIndex'
        ],
        resources: [resolvedIndex.indexArn]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB index write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set index environment variables
    environmentVariables['DYNAMODB_INDEX_NAME'] = resolvedIndex.indexName;
    environmentVariables['DYNAMODB_INDEX_ARN'] = resolvedIndex.indexArn;
    if (resolvedIndex.indexStatus) {
      environmentVariables['DYNAMODB_INDEX_STATUS'] = resolvedIndex.indexStatus;
    }
    if (resolvedIndex.indexType) {
      environmentVariables['DYNAMODB_INDEX_TYPE'] = resolvedIndex.indexType;
    }

    // Configure index metadata
    if (resolvedIndex.keySchema) {
      environmentVariables['DYNAMODB_INDEX_KEY_SCHEMA'] = JSON.stringify(resolvedIndex.keySchema);
    }
    if (resolvedIndex.projection) {
      environmentVariables['DYNAMODB_INDEX_PROJECTION'] = JSON.stringify(resolvedIndex.projection);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to DynamoDB stream
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - streamArn (required): string - ARN of the DynamoDB stream
   *   - streamViewType?: string - Stream view type (e.g., 'KEYS_ONLY', 'NEW_AND_OLD_IMAGES')
   *   - streamLabel?: string - Stream label
   *   - lambdaTriggerArn?: string - ARN of Lambda function triggered by stream
   * @param access - Array of access levels (read, write)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToStream(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.streamArn) {
      throw new Error('Target component missing required streamArn property for DynamoDB stream binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Grant stream access permissions
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:DescribeStream',
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:ListStreams'
        ],
        resources: [targetData.streamArn]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB stream read access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:UpdateTable',
          'dynamodb:EnableStreaming',
          'dynamodb:DisableStreaming'
        ],
        resources: [targetData.streamArn]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB stream write access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set stream environment variables
    environmentVariables['DYNAMODB_STREAM_ARN'] = targetData.streamArn;
    const streamLabel = targetData.streamLabel || this.deriveStreamLabel(targetData.streamArn);
    if (streamLabel) {
      environmentVariables['DYNAMODB_STREAM_LABEL'] = streamLabel;
    }
    if (targetData.streamViewType) {
      environmentVariables['DYNAMODB_STREAM_VIEW_TYPE'] = targetData.streamViewType;
    }

    // Configure stream processing
    if (targetData.lambdaTriggerArn) {
      environmentVariables['DYNAMODB_LAMBDA_TRIGGER_ARN'] = targetData.lambdaTriggerArn;
      environmentVariables['DYNAMODB_LAMBDA_TRIGGER_ENABLED'] = 'true';

      // Grant Lambda invoke permissions for stream processing
      const lambdaStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [targetData.lambdaTriggerArn]
      });
      iamPolicies.push({
        statement: lambdaStatement,
        description: 'Lambda invocation permissions for DynamoDB stream processing',
        complianceRequirement: 'Stream processing automation'
      });
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to DynamoDB backup
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - tableArn (required): string - ARN of the DynamoDB table
   *   - tableName (required): string - Name of the DynamoDB table
   *   - backupPlanArn?: string - ARN of the AWS Backup plan (optional)
   * @param access - Array of access levels (read, write)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToBackup(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!targetData?.tableArn) {
      throw new Error('Target component missing required tableArn property for DynamoDB backup binding');
    }
    if (!targetData?.tableName) {
      throw new Error('Target component missing required tableName property for DynamoDB backup binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Extract region and account from table ARN
    const arnParts = targetData.tableArn?.match(/^arn:aws:dynamodb:([^:]+):(\d+):table\//);
    const region = arnParts?.[1] || '*';
    const accountId = arnParts?.[2] || '*';

    // Grant backup read permissions (list, describe backups)
    if (access.includes('read') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:DescribeBackup',
          'dynamodb:ListBackups',
          'dynamodb:DescribeContinuousBackups',
          'dynamodb:ListContributorInsights'
        ],
        resources: [
          targetData.tableArn,
          `arn:aws:dynamodb:${region}:${accountId}:table/${targetData.tableName}/backup/*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB backup read access permissions',
        complianceRequirement: 'Data protection and recovery'
      });
    }

    // Grant backup write permissions (create, delete, restore)
    if (access.includes('write') || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:CreateBackup',
          'dynamodb:DeleteBackup',
          'dynamodb:RestoreTableFromBackup',
          'dynamodb:RestoreTableToPointInTime'
        ],
        resources: [
          targetData.tableArn,
          `arn:aws:dynamodb:${region}:${accountId}:table/${targetData.tableName}/backup/*`
        ]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB backup write access permissions',
        complianceRequirement: 'Data protection and recovery'
      });
    }

    // Set backup environment variables
    environmentVariables['DYNAMODB_TABLE_NAME'] = targetData.tableName;
    environmentVariables['DYNAMODB_TABLE_ARN'] = targetData.tableArn;
    if (targetData.backupPlanArn) {
      environmentVariables['DYNAMODB_BACKUP_PLAN_ARN'] = targetData.backupPlanArn;
    }
    if (arnParts?.[1]) {
      environmentVariables['DYNAMODB_REGION'] = arnParts[1];
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Resolve index target from capability data
   * Handles both array of indexes and single index object
   */
  private resolveIndexTarget(targetData: any, context: BindingContext): any {
    const extractRequestedName = (): string | undefined => {
      const options: any = context.directive.options ?? {};
      return options.indexName || options.name;
    };

    // If targetData is an array of indexes
    if (Array.isArray(targetData)) {
      return this.pickIndex(targetData, extractRequestedName);
    }

    // If targetData has an indexes array
    if (Array.isArray(targetData?.indexes)) {
      return this.pickIndex(targetData.indexes, extractRequestedName);
    }

    // Assume targetData is the index object itself
    return targetData;
  }

  /**
   * Pick index from array based on requested name
   */
  private pickIndex(indexes: any[], getRequestedName: () => string | undefined): any {
    if (indexes.length === 0) {
      throw new Error('No DynamoDB indexes were provided by the target component capability.');
    }

    const requestedName = getRequestedName();

    if (!requestedName) {
      if (indexes.length > 1) {
        throw new Error('Multiple DynamoDB indexes available; specify binding.options.indexName to select a target index.');
      }
      return indexes[0];
    }

    const match = indexes.find(index => index.indexName === requestedName);
    if (!match) {
      throw new Error(`DynamoDB index '${requestedName}' not found on target component. Available indexes: ${indexes.map(index => index.indexName).join(', ')}`);
    }

    return match;
  }

  /**
   * Derive stream label from stream ARN
   */
  private deriveStreamLabel(streamArn: string | undefined): string | undefined {
    if (!streamArn) {
      return undefined;
    }
    const parts = streamArn.split('/');
    return parts.length > 0 ? parts[parts.length - 1] : undefined;
  }

  /**
   * Configure secure table access features
   * Applies additional security configurations when requireSecureAccess is enabled
   */
  private async configureSecureTableAccess(
    context: BindingContext,
    targetData: any,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    // Configure backup retention when specified via options
    if (context.directive.options?.backupRetentionDays !== undefined) {
      const retention = String(context.directive.options.backupRetentionDays);
      environmentVariables['DYNAMODB_BACKUP_RETENTION_DAYS'] = retention;
    }

    // PITR enablement check: Verify point-in-time recovery is enabled when specification is present
    if (targetData.pointInTimeRecoverySpecification) {
      const pitrEnabled = targetData.pointInTimeRecoverySpecification.pointInTimeRecoveryEnabled === true;
      if (!pitrEnabled) {
        // Log warning but don't fail - this is a compliance recommendation
        // The compliance evaluator will catch this via compliance rules
        environmentVariables['DYNAMODB_PITR_WARNING'] = 'Point-in-time recovery specification present but not enabled';
      }
      // Ensure PITR environment variable reflects actual state
      environmentVariables['DYNAMODB_PITR_ENABLED'] = pitrEnabled ? 'true' : 'false';
    }

    // Configure global tables for high availability
    if (targetData.globalTableVersion) {
      environmentVariables['DYNAMODB_GLOBAL_TABLE_VERSION'] = targetData.globalTableVersion;

      // Grant global table permissions
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:DescribeGlobalTable',
          'dynamodb:DescribeGlobalTableSettings',
          'dynamodb:UpdateGlobalTable',
          'dynamodb:UpdateGlobalTableSettings'
        ],
        resources: [targetData.tableArn]
      });
      iamPolicies.push({
        statement,
        description: 'DynamoDB global table permissions',
        complianceRequirement: 'High availability and disaster recovery'
      });
    }

    // Add contributor identity permissions for multi-account replication
    // This is needed for DynamoDB global tables with cross-account replication via AWS Resource Access Manager (RAM)
    if (targetData.contributorInsightsEnabled || context.directive.options?.enableContributorInsights === true) {
      const contributorStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'dynamodb:DescribeContributorInsights',
          'dynamodb:ListContributorInsights'
        ],
        resources: [targetData.tableArn]
      });
      iamPolicies.push({
        statement: contributorStatement,
        description: 'DynamoDB contributor insights permissions for multi-account replication',
        complianceRequirement: 'Cross-account resource access'
      });

      environmentVariables['DYNAMODB_CONTRIBUTOR_INSIGHTS_ENABLED'] = 'true';
    }

    // If contributor identities are explicitly provided, grant additional permissions
    if (context.directive.options?.contributorIdentities && Array.isArray(context.directive.options.contributorIdentities)) {
      // For RAM-based resource sharing, contributor identities need describe permissions
      // Note: Actual RAM permissions are managed at the resource share level, not IAM
      // This documents the intent for compliance auditing
      environmentVariables['DYNAMODB_CONTRIBUTOR_IDENTITIES'] = JSON.stringify(context.directive.options.contributorIdentities);
    }

    // Configure VPC endpoints for private access when requested
    if (context.directive.options?.enableVpcEndpoint === true) {
      environmentVariables['DYNAMODB_VPC_ENDPOINT_ENABLED'] = 'true';
    }
  }
}
