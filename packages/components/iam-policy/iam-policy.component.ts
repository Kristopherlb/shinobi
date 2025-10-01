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
  Component,
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '@platform/contracts';
import {
  IamPolicyConfig,
  IamPolicyComponentConfigBuilder,
  IamPolicyLogConfig,
  IamPolicyControlsConfig
} from './iam-policy.builder.js';

/**
 * IAM Policy Component implementing Component API Contract v1.0
 */
export class IamPolicyComponent extends Component {
  private policy?: iam.ManagedPolicy | iam.Policy;
  private config?: IamPolicyConfig;

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
    
      this.registerConstruct('policy', this.policy!);
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

      this.applyStandardTags(this.policy, {
        'policy-type': 'managed',
        'policy-name': policyName,
        'statements-count': policyDocument.statementCount.toString()
      });
    } else {
      // For inline policies, we'll create them when attaching to entities
      this.policy = new iam.Policy(this, 'Policy', {
        policyName: policyName,
        document: policyDocument
      });

      this.applyStandardTags(this.policy, {
        'policy-type': 'inline',
        'policy-name': policyName,
        'statements-count': policyDocument.statementCount.toString()
      });
    }

    if (this.config!.tags) {
      Object.entries(this.config!.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.policy!).add(key, value);
      });
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

      case 'power-user':
        statements.push(new iam.PolicyStatement({
          sid: 'PowerUserAccess',
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: ['*']
        }));
        statements.push(new iam.PolicyStatement({
          sid: 'DenyIAMAccess',
          effect: iam.Effect.DENY,
          actions: [
            'iam:*',
            'organizations:*',
            'account:*'
          ],
          resources: ['*']
        }));
        break;

      case 'admin':
        statements.push(new iam.PolicyStatement({
          sid: 'AdministratorAccess',
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: ['*']
        }));
        break;
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
    if (!this.policy || !(this.policy instanceof iam.ManagedPolicy)) {
      return;
    }

    const managedPolicy = this.policy as iam.ManagedPolicy;

    this.config?.groups?.forEach(groupName => {
      const group = iam.Group.fromGroupName(this, `Group${groupName}`, groupName);
      group.addManagedPolicy(managedPolicy);
    });

    this.config?.roles?.forEach(roleName => {
      const role = iam.Role.fromRoleName(this, `Role${roleName}`, roleName);
      role.addManagedPolicy(managedPolicy);
    });

    this.config?.users?.forEach(userName => {
      const user = iam.User.fromUserName(this, `User${userName}`, userName);
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
      statements.push(new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        actions: ['*'],
        resources: ['*'],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      }));
    }

    if (controls.requireMfaForActions && controls.requireMfaForActions.length > 0) {
      statements.push(new iam.PolicyStatement({
        sid: 'RequireMFAForSensitiveActions',
        effect: iam.Effect.DENY,
        actions: controls.requireMfaForActions,
        resources: ['*'],
        conditions: {
          BoolIfExists: {
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

    this.createLogGroupFromConfig('UsageLogGroup', logging.usage, '', 'usageLogGroup');
    this.createLogGroupFromConfig('ComplianceLogGroup', logging.compliance, 'compliance', 'complianceLogGroup');
    this.createLogGroupFromConfig('AuditLogGroup', logging.audit, 'audit', 'auditLogGroup');
  }

  private createLogGroupFromConfig(id: string, config: IamPolicyLogConfig | undefined, defaultSuffix: string, registerKey: string): void {
    if (!config?.enabled) {
      return;
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

    const baseTags = {
      'log-type': registerKey.replace(/LogGroup$/i, '').replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, ''),
      'policy-name': policyName
    };

    this.applyStandardTags(logGroup, {
      ...baseTags,
      ...(config.tags ?? {})
    });

    this.registerConstruct(registerKey, logGroup);
  }

  private resolveLogRetention(retentionInDays?: number): logs.RetentionDays | undefined {
    if (!retentionInDays) {
      return undefined;
    }

    const retentionMap = logs.RetentionDays as unknown as Record<number, logs.RetentionDays>;
    const retention = retentionMap[retentionInDays];

    if (retention) {
      return retention;
    }

    this.logComponentEvent('log_retention_defaulted', 'Unsupported log retention requested for IAM policy log group', {
      requestedRetentionInDays: retentionInDays,
      defaultApplied: logs.RetentionDays.THREE_MONTHS
    });

    return logs.RetentionDays.THREE_MONTHS;
  }

  private resolveRemovalPolicy(removalPolicy?: string): cdk.RemovalPolicy {
    if (removalPolicy === 'destroy') {
      return cdk.RemovalPolicy.DESTROY;
    }
    return cdk.RemovalPolicy.RETAIN;
  }

  private buildPolicyCapability(): any {
    const policyArn = this.policy instanceof iam.ManagedPolicy ?
      (this.policy as iam.ManagedPolicy).managedPolicyArn :
      (this.policy as iam.Policy).policyName;

    return {
      policyArn,
      policyName: this.buildPolicyName()
    };
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

    const policyName = this.buildPolicyName();
    const threshold = usageAlarmConfig.threshold ?? 1000;
    const evaluationPeriods = usageAlarmConfig.evaluationPeriods ?? 2;
    const periodMinutes = usageAlarmConfig.periodMinutes ?? 60;

    const policyUsageAlarm = new cloudwatch.Alarm(this, 'PolicyUsageAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-policy-usage`,
      alarmDescription: 'IAM policy usage monitoring alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/IAM',
        metricName: 'PolicyUsage',
        dimensionsMap: { PolicyName: policyName },
        statistic: 'Sum',
        period: cdk.Duration.minutes(periodMinutes)
      }),
      threshold,
      evaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: this.resolveTreatMissingData(usageAlarmConfig.treatMissingData)
    });

    this.applyStandardTags(policyUsageAlarm, {
      'alarm-type': 'policy-usage',
      'metric-type': 'security',
      'threshold': threshold.toString(),
      ...(usageAlarmConfig.tags ?? {})
    });

    this.registerConstruct('policyUsageAlarm', policyUsageAlarm);

    this.logComponentEvent('observability_configured', 'IAM policy monitoring configured', {
      policyName,
      threshold,
      evaluationPeriods,
      periodMinutes
    });
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

export { IamPolicyComponent as IamPolicyComponentComponent };
