/**
 * IAM Policy Component
 * 
 * AWS IAM Policy for granular access control with least privilege security patterns.
 * Implements three-tiered compliance model (Commercial/FedRAMP Moderate/FedRAMP High).
 */

import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@shinobi/core';
import {
  IamPolicyConfig,
  IamPolicyComponentConfigBuilder,
  IamPolicyLogConfig,
  IamPolicyControlsConfig
} from './iam-policy.builder.js';

/**
 * IAM Policy Component implementing Component API Contract v1.0
 */
export class IamPolicyComponent extends BaseComponent {
  private policy?: iam.ManagedPolicy | iam.Policy;
  private config?: IamPolicyConfig;
  private usageLogGroup?: logs.LogGroup;
  private complianceLogGroup?: logs.LogGroup;
  private auditLogGroup?: logs.LogGroup;
  private policyUsageAlarm?: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting IAM Policy component synthesis', {
      policyName: this.spec.config?.policyName,
      policyType: this.spec.config?.policyType
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new IamPolicyComponentConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      this.logComponentEvent('config_built', 'IAM Policy configuration built successfully', {
        policyName: this.config.policyName,
        policyType: this.config.policyType,
        hasTemplate: !!this.config.policyTemplate
      });
      
      this.createPolicy();
      this.attachPolicyToEntities();
      this.applyLoggingConfiguration();
      this.configureObservabilityForPolicy();
    
      // Register constructs
      this.registerConstruct('main', this.policy!);
      this.registerConstruct('policy', this.policy!);
      
      if (this.usageLogGroup) {
        this.registerConstruct('usageLogGroup', this.usageLogGroup);
      }
      if (this.complianceLogGroup) {
        this.registerConstruct('complianceLogGroup', this.complianceLogGroup);
      }
      if (this.auditLogGroup) {
        this.registerConstruct('auditLogGroup', this.auditLogGroup);
      }
      if (this.policyUsageAlarm) {
        this.registerConstruct('policyUsageAlarm', this.policyUsageAlarm);
      }
    
      this.registerCapability('iam:policy', this.buildPolicyCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'IAM Policy component synthesis completed successfully', {
        policyCreated: 1,
        policyType: this.config.policyType,
        attachmentsCount: (this.config.groups?.length || 0) + (this.config.roles?.length || 0) + (this.config.users?.length || 0)
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'iam-policy',
        stage: 'synthesis'
      });
      throw error;
    }
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'iam-policy';
  }

  private createPolicy(): void {
    const policyDocument = this.buildPolicyDocument();
    const policyName = this.buildPolicyName();

    if (this.config!.policyType === 'managed') {
      this.policy = new iam.ManagedPolicy(this, 'Policy', {
        managedPolicyName: policyName,
        description: this.config!.description,
        path: this.config!.path,
        document: policyDocument
      });

      // Only managed policies support tags
      // Apply tags using Tags.of() - this works for ManagedPolicy constructs
      this.applyStandardTags(this.policy, {
        'policy-type': 'managed',
        'policy-name': policyName,
        'statements-count': policyDocument.statementCount.toString()
      });
      
      if (this.config!.tags) {
        Object.entries(this.config!.tags).forEach(([key, value]) => {
          cdk.Tags.of(this.policy!).add(key, value);
        });
      }
      
      // Also apply tags directly to the CloudFormation construct to ensure they appear in the template
      const cfnPolicy = this.policy.node.defaultChild as iam.CfnManagedPolicy;
      if (cfnPolicy) {
        // Use addPropertyOverride to set tags on the CloudFormation resource
        const taggingContext = {
          serviceName: this.context.serviceName,
          serviceLabels: this.context.serviceLabels,
          componentName: this.spec.name,
          componentType: this.getType(),
          environment: this.context.environment,
          region: this.context.region,
          accountId: this.context.accountId,
          complianceFramework: this.context.complianceFramework,
          tags: this.context.tags,
          governance: this.governanceMetadata
        };
        
        const standardTags = this.taggingService.buildStandardTags(taggingContext);
        const additionalTags = {
          'policy-type': 'managed',
          'policy-name': policyName,
          'statements-count': policyDocument.statementCount.toString()
        };
        
        const allTags = { ...standardTags, ...additionalTags, ...(this.config!.tags || {}) };
        cfnPolicy.addPropertyOverride('Tags', Object.entries(allTags).map(([key, value]) => ({
          Key: key,
          Value: String(value)
        })));
      }
    } else {
      // For inline policies - note: IAM::Policy resources do NOT support tags
      this.policy = new iam.Policy(this, 'Policy', {
        policyName: policyName,
        document: policyDocument
      });
      
      // Inline policies cannot be tagged - AWS limitation
      if (this.config!.tags && Object.keys(this.config!.tags).length > 0) {
        this.logComponentEvent('tags_not_supported', 'Tags specified for inline policy but AWS::IAM::Policy does not support tags', {
          policyName,
          tagsCount: Object.keys(this.config!.tags).length
        });
      }
    }
    
    this.logResourceCreation('iam-policy', policyName, {
      policyType: this.config!.policyType,
      statementsCount: policyDocument.statementCount,
      hasTemplate: !!this.config!.policyTemplate
    });
  }

  private buildPolicyDocument(): iam.PolicyDocument {
    let statements: iam.PolicyStatement[] = [];

    // Add statements from policy document
    if (this.config!.policyDocument) {
      // Null check for Statement array
      if (!this.config!.policyDocument.Statement || !Array.isArray(this.config!.policyDocument.Statement)) {
        throw new Error('policyDocument must have a Statement array');
      }
      
      if (this.config!.policyDocument.Statement.length === 0) {
        throw new Error('policyDocument.Statement cannot be empty');
      }
      
      statements = this.config!.policyDocument.Statement.map(stmt => 
        new iam.PolicyStatement({
          sid: stmt.Sid,
          effect: stmt.Effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
          actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
          resources: stmt.Resource ? (Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource]) : undefined,
          conditions: stmt.Condition
        })
      );
    }

    // Add statements from template
    if (this.config!.policyTemplate) {
      const templateStatements = this.buildTemplateStatements();
      statements.push(...templateStatements);
    }

    // Add control statements from configuration
    const controlStatements = this.buildControlStatements();
    statements.push(...controlStatements);

    if (statements.length === 0) {
      throw new Error('Policy must have at least one statement');
    }

    return new iam.PolicyDocument({
      statements: statements
    });
  }

  private buildTemplateStatements(): iam.PolicyStatement[] {
    const template = this.config!.policyTemplate!;
    const resources = template.resources || ['*'];
    
    let statements: iam.PolicyStatement[] = [];

    switch (template.type) {
      case 'read-only':
        statements.push(new iam.PolicyStatement({
          sid: 'ReadOnlyAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            'cloudwatch:Describe*',
            'cloudwatch:Get*',
            'cloudwatch:List*',
            'ec2:Describe*',
            's3:Get*',
            's3:List*',
            'iam:Get*',
            'iam:List*'
          ],
          resources: resources
        }));
        break;

      case 'lambda-execution':
        statements.push(new iam.PolicyStatement({
          sid: 'LambdaExecutionRole',
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: ['arn:aws:logs:*:*:*']
        }));
        break;

      case 'ecs-task':
        statements.push(new iam.PolicyStatement({
          sid: 'ECSTaskExecution',
          effect: iam.Effect.ALLOW,
          actions: [
            'ecr:GetAuthorizationToken',
            'ecr:BatchCheckLayerAvailability',
            'ecr:GetDownloadUrlForLayer',
            'ecr:BatchGetImage',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: resources
        }));
        break;

      case 's3-access':
        statements.push(new iam.PolicyStatement({
          sid: 'S3Access',
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
            's3:ListBucket'
          ],
          resources: resources
        }));
        break;

      case 'rds-access':
        statements.push(new iam.PolicyStatement({
          sid: 'RDSAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            'rds:Describe*',
            'rds-db:connect'
          ],
          resources: resources
        }));
        break;

      case 'dynamodb-access':
        statements.push(new iam.PolicyStatement({
          sid: 'DynamoDBAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:Scan',
            'dynamodb:BatchGetItem',
            'dynamodb:BatchWriteItem'
          ],
          resources: resources
        }));
        break;

      case 'custom':
        // Custom template - no default statements, only additionalStatements
        break;

      default:
        throw new Error(`Unknown policy template type: ${template.type}. Supported types: read-only, lambda-execution, ecs-task, s3-access, rds-access, dynamodb-access, custom`);
    }

    // Add additional statements from template
    if (template.additionalStatements) {
      const additionalStatements = template.additionalStatements.map(stmt => 
        new iam.PolicyStatement({
          sid: stmt.Sid,
          effect: stmt.Effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
          actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
          resources: stmt.Resource ? (Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource]) : undefined,
          conditions: stmt.Condition
        })
      );
      statements.push(...additionalStatements);
    }

    return statements;
  }

  private buildPolicyName(): string {
    if (this.config?.policyName) {
      return this.config.policyName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  private attachPolicyToEntities(): void {
    if (!this.policy) {
      return;
    }

    // Only managed policies support direct attachment
    // Inline policies must be attached via patches.ts using getConstruct('policy')
    if (this.config!.policyType !== 'managed') {
      if ((this.config?.groups && this.config.groups.length > 0) || 
          (this.config?.roles && this.config.roles.length > 0) || 
          (this.config?.users && this.config.users.length > 0)) {
        this.logComponentEvent('inline_attachment_skipped', 'Inline policies cannot be auto-attached. Use patches.ts to attach via getConstruct("policy")', {
          policyName: this.buildPolicyName(),
          requestedAttachments: (this.config.groups?.length || 0) + (this.config.roles?.length || 0) + (this.config.users?.length || 0)
        });
      }
      return;
    }

    const managedPolicy = this.policy as iam.ManagedPolicy;

    this.config?.groups?.forEach((groupName, index) => {
      const group = iam.Group.fromGroupName(this, `Group${index}`, groupName);
      group.addManagedPolicy(managedPolicy);
    });

    this.config?.roles?.forEach((roleName, index) => {
      const role = iam.Role.fromRoleName(this, `Role${index}`, roleName);
      role.addManagedPolicy(managedPolicy);
    });

    this.config?.users?.forEach((userName, index) => {
      const user = iam.User.fromUserName(this, `User${index}`, userName);
      user.addManagedPolicy(managedPolicy);
    });
  }

  private buildControlStatements(): iam.PolicyStatement[] {
    const controls = this.config?.controls;
    if (!controls) {
      return [];
    }

    const statements: iam.PolicyStatement[] = [];

    if (controls.denyInsecureTransport) {
      // Scope to transport-relevant services, not all actions
      statements.push(new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        actions: [
          's3:*',
          'sqs:*',
          'sns:*',
          'kinesis:*',
          'dynamodb:*',
          'rds:*',
          'secretsmanager:*'
        ],
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }

    if (controls.requireMfaForActions && controls.requireMfaForActions.length > 0) {
      // Use Bool not BoolIfExists to properly enforce MFA
      statements.push(new iam.PolicyStatement({
        sid: 'RequireMFAForSensitiveActions',
        effect: iam.Effect.DENY,
        actions: controls.requireMfaForActions,
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:MultiFactorAuthPresent': 'false'
          }
        }
      }));
    }

    statements.push(...this.mapConfiguredStatements(controls.additionalStatements));

    return statements;
  }

  private mapConfiguredStatements(statements?: IamPolicyControlsConfig['additionalStatements']): iam.PolicyStatement[] {
    if (!statements || statements.length === 0) {
      return [];
    }

    return statements.map(stmt => new iam.PolicyStatement({
      sid: stmt?.sid,
      effect: stmt.effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
      actions: stmt.actions,
      resources: stmt.resources && stmt.resources.length > 0 ? stmt.resources : undefined,
      conditions: stmt.conditions
    }));
  }

  private applyLoggingConfiguration(): void {
    if (!this.policy) {
      return;
    }

    const logging = this.config?.logging;
    if (!logging) {
      return;
    }

    this.usageLogGroup = this.createLogGroupFromConfig('UsageLogGroup', logging.usage, '', 'usage');
    this.complianceLogGroup = this.createLogGroupFromConfig('ComplianceLogGroup', logging.compliance, 'compliance', 'compliance');
    this.auditLogGroup = this.createLogGroupFromConfig('AuditLogGroup', logging.audit, 'audit', 'audit');
  }

  private createLogGroupFromConfig(id: string, config: IamPolicyLogConfig | undefined, defaultSuffix: string, logType: string): logs.LogGroup | undefined {
    if (!config?.enabled) {
      return undefined;
    }

    const policyName = this.buildPolicyName();
    const suffix = config.logGroupNameSuffix ?? defaultSuffix;
    const suffixPart = suffix ? `/${suffix}` : '';
    const logGroupName = config.logGroupName ?? `/aws/iam/policy/${policyName}${suffixPart}`;

    const logGroup = new logs.LogGroup(this, id, {
      logGroupName,
      retention: this.resolveLogRetention(config.retentionInDays),
      removalPolicy: this.resolveRemovalPolicy(config.removalPolicy)
    });

    this.applyStandardTags(logGroup, {
      'log-type': logType,
      'policy-name': policyName,
      ...(config.tags ?? {})
    });

    return logGroup;
  }

  private resolveLogRetention(retentionInDays?: number): logs.RetentionDays | undefined {
    if (!retentionInDays) {
      return undefined;
    }

    // Map retention days to CloudWatch enum values
    switch (retentionInDays) {
      case 1: return logs.RetentionDays.ONE_DAY;
      case 3: return logs.RetentionDays.THREE_DAYS;
      case 5: return logs.RetentionDays.FIVE_DAYS;
      case 7: return logs.RetentionDays.ONE_WEEK;
      case 14: return logs.RetentionDays.TWO_WEEKS;
      case 30: return logs.RetentionDays.ONE_MONTH;
      case 60: return logs.RetentionDays.TWO_MONTHS;
      case 90: return logs.RetentionDays.THREE_MONTHS;
      case 120: return logs.RetentionDays.FOUR_MONTHS;
      case 150: return logs.RetentionDays.FIVE_MONTHS;
      case 180: return logs.RetentionDays.SIX_MONTHS;
      case 365: return logs.RetentionDays.ONE_YEAR;
      case 400: return logs.RetentionDays.THIRTEEN_MONTHS;
      case 545: return logs.RetentionDays.EIGHTEEN_MONTHS;
      case 731: return logs.RetentionDays.TWO_YEARS;
      case 1827: return logs.RetentionDays.FIVE_YEARS;
      case 3653: return logs.RetentionDays.TEN_YEARS;
      default:
        this.logComponentEvent('log_retention_defaulted', 'Unsupported log retention requested; defaulting to 90 days', {
          requestedRetentionInDays: retentionInDays,
          defaultApplied: 90,
          complianceFramework: this.context.complianceFramework
        });
        return logs.RetentionDays.THREE_MONTHS;
    }
  }

  private resolveRemovalPolicy(removalPolicy?: string): cdk.RemovalPolicy {
    if (removalPolicy === 'destroy') {
      return cdk.RemovalPolicy.DESTROY;
    }
    return cdk.RemovalPolicy.RETAIN;
  }

  private buildPolicyCapability(): any {
    if (this.policy instanceof iam.ManagedPolicy) {
      // Managed policies have real ARNs
      return {
        policyArn: this.policy.managedPolicyArn,
        policyName: this.policy.managedPolicyName,
        policyType: 'managed'
      };
    } else {
      // Inline policies don't have ARNs - return serializable reference
      // Note: To use inline policy in patches.ts, call getConstruct('policy')
      return {
        policyRef: this.policy!.node.path,
        policyName: (this.policy as iam.Policy).policyName,
        policyType: 'inline',
        // Provide construct ID for getConstruct() lookup
        constructId: 'policy'
      };
    }
  }

  private configureObservabilityForPolicy(): void {
    const monitoring = this.config?.monitoring;
    if (!monitoring?.enabled) {
      return;
    }

    const usageAlarmConfig = monitoring.usageAlarm;
    if (!usageAlarmConfig?.enabled) {
      return;
    }

    // NOTE: AWS/IAM namespace does not publish a PolicyUsage metric
    // IAM monitoring requires CloudTrail event-based metrics
    // This alarm is disabled until a valid metric source is configured
    
    this.logComponentEvent('observability_skipped', 'IAM policy usage monitoring not available - AWS/IAM namespace does not provide PolicyUsage metric. Use CloudTrail event metrics instead.', {
      policyName: this.buildPolicyName(),
      recommendation: 'Configure CloudTrail log metric filter for iam:AttachPolicy, iam:PutPolicy events'
    });
    
    // TODO: Implement CloudTrail-based metric filter alarm when CloudTrail integration is available
    // For now, monitoring is logged but not enforced to avoid INSUFFICIENT_DATA alarms
  }

  private resolveTreatMissingData(value?: string): cloudwatch.TreatMissingData {
    switch (value) {
      case 'breaching':
        return cloudwatch.TreatMissingData.BREACHING;
      case 'ignore':
        return cloudwatch.TreatMissingData.IGNORE;
      case 'missing':
        return cloudwatch.TreatMissingData.MISSING;
      default:
        return cloudwatch.TreatMissingData.NOT_BREACHING;
    }
  }
}

// Export alias for backward compatibility
export { IamPolicyComponent as IamPolicyComponentComponent };
