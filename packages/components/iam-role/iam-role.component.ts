/**
 * IAM Role Component
 * 
 * AWS IAM Role for secure resource access with least privilege security patterns.
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
  IamRoleConfig,
  IamRoleComponentConfigBuilder,
  IamRoleLogConfig
} from './iam-role.builder.ts';

/**
 * IAM Role Component implementing Component API Contract v1.0
 */
export class IamRoleComponent extends Component {
  private role?: iam.Role;
  private config?: IamRoleConfig;
  private instanceProfile?: iam.CfnInstanceProfile;
  private accessLogGroup?: logs.LogGroup;
  private auditLogGroup?: logs.LogGroup;
  private sessionAlarm?: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create IAM Role with compliance hardening
   */
  public synth(): void {
    // Log component synthesis start
    this.logComponentEvent('synthesis_start', 'Starting IAM Role component synthesis', {
      roleName: this.spec.config?.roleName,
      assumedByCount: this.spec.config?.assumedBy?.length || 0
    });
    
    const startTime = Date.now();
    
    try {
      const configBuilder = new IamRoleComponentConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();

      this.logComponentEvent('config_built', 'IAM Role configuration built successfully', {
        roleName: this.config.roleName,
        maxSessionDuration: this.config.maxSessionDuration,
        managedPoliciesCount: this.config.managedPolicies?.length || 0
      });

      this.createRole();
      this.applyControlsFromConfig();
      this.applyLoggingConfiguration();
      this.configureMonitoringFromConfig();
      this.applyServiceTags();

      this.registerConstruct('role', this.role!);
      if (this.instanceProfile) {
        this.registerConstruct('instanceProfile', this.instanceProfile);
        this.registerCapability('iam:instance-profile', {
          instanceProfileName: this.instanceProfile.ref,
          roleName: this.role!.roleName
        });
      }
      if (this.accessLogGroup) {
        this.registerConstruct('accessLogGroup', this.accessLogGroup);
      }
      if (this.auditLogGroup) {
        this.registerConstruct('auditLogGroup', this.auditLogGroup);
      }
      if (this.sessionAlarm) {
        this.registerConstruct('sessionAlarm', this.sessionAlarm);
      }

      this.registerCapability('iam:role', this.buildRoleCapability());

      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });

      this.logComponentEvent('synthesis_complete', 'IAM Role component synthesis completed successfully', {
        roleCreated: 1,
        policiesAttached: (this.config?.managedPolicies?.length || 0) + (this.config?.inlinePolicies?.length || 0)
      });

    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'iam-role',
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
    return 'iam-role';
  }

  /**
   * Create the IAM Role
   */
  private createRole(): void {
    // Build assume role policy based on configuration
    const assumedBy = this.buildAssumedByPrincipal();
    const roleProps: iam.RoleProps = {
      roleName: this.buildRoleName(),
      description: this.config?.description,
      assumedBy,
      maxSessionDuration: cdk.Duration.seconds(this.config?.maxSessionDuration ?? 3600),
      path: this.config?.path ?? '/',
      externalIds: this.config?.externalId ? [this.config.externalId] : undefined,
      permissionsBoundary: this.resolvePermissionsBoundary()
    };

    this.role = new iam.Role(this, 'Role', roleProps);

    this.config?.managedPolicies?.forEach((policyArn, index) => {
      const policy = iam.ManagedPolicy.fromManagedPolicyArn(this, `ManagedPolicy${index}`, policyArn);
      this.role!.addManagedPolicy(policy);
    });

    this.config?.inlinePolicies?.forEach((policySpec, index) => {
      const policyDocument = iam.PolicyDocument.fromJson(policySpec.document);
      this.role!.attachInlinePolicy(new iam.Policy(this, `InlinePolicy${index}`, {
        policyName: policySpec.name,
        document: policyDocument
      }));
    });

    this.logResourceCreation('iam-role', this.role.roleName, {
      assumedByPrincipals: this.config?.assumedBy?.length || 0,
      managedPoliciesCount: this.config?.managedPolicies?.length || 0,
      inlinePoliciesCount: this.config?.inlinePolicies?.length || 0
    });
  }

  /**
   * Build the principal that can assume this role
   */
  private buildAssumedByPrincipal(): iam.IPrincipal {
    if (!this.config!.assumedBy || this.config!.assumedBy.length === 0) {
      // Default to Lambda service if no principal specified
      return new iam.ServicePrincipal('lambda.amazonaws.com');
    }

    const principals: iam.IPrincipal[] = [];

    this.config!.assumedBy.forEach(assumedBy => {
      if (assumedBy.service) {
        principals.push(new iam.ServicePrincipal(assumedBy.service));
      } else if (assumedBy.accountId) {
        principals.push(new iam.AccountPrincipal(assumedBy.accountId));
      } else if (assumedBy.roleArn) {
        principals.push(new iam.ArnPrincipal(assumedBy.roleArn));
      } else if (assumedBy.federatedProvider) {
        principals.push(new iam.FederatedPrincipal(assumedBy.federatedProvider, {}));
      }
    });

    return principals.length === 1 ? 
      principals[0] : 
      new iam.CompositePrincipal(...principals);
  }

  /**
   * Build role name
   */
  private buildRoleName(): string | undefined {
    if (this.config!.roleName) {
      return this.config!.roleName;
    }
    return `${this.context.serviceName}-${this.spec.name}`;
  }

  /**
   * Apply compliance-specific hardening
   */

  private resolvePermissionsBoundary(): iam.IManagedPolicy | undefined {
    if (!this.config?.permissionsBoundary) {
      if (this.config?.controls?.enforceBoundary) {
        this.logComponentEvent('permissions_boundary_missing', 'Boundary enforcement requested but no permissionsBoundary provided', {
          roleName: this.buildRoleName()
        });
      }
      return undefined;
    }

    return iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      'PermissionsBoundary',
      this.config.permissionsBoundary
    );
  }

  private applyControlsFromConfig(): void {
    if (!this.role || !this.config?.controls) {
      return;
    }

    const controls = this.config.controls;
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

    statements.push(...this.mapConfiguredStatements(controls.additionalStatements));

    if (statements.length > 0) {
      this.role.attachInlinePolicy(new iam.Policy(this, 'RoleControlPolicy', {
        policyName: `${this.role.roleName}-controls`,
        document: new iam.PolicyDocument({ statements })
      }));
    }

    this.applyTrustPolicyControls(controls.trustPolicies);

    if (controls.requireInstanceProfile) {
      this.instanceProfile = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
        roles: [this.role.roleName],
        path: this.config?.path ?? '/'
      });
    }
  }

  private applyTrustPolicyControls(trustControls?: ReturnType<IamRoleComponentConfigBuilder['buildSync']>['controls']['trustPolicies']): void {
    if (!trustControls || !this.role?.assumeRolePolicy) {
      return;
    }

    if (trustControls.enforceMfa) {
      this.role.assumeRolePolicy.addStatements(new iam.PolicyStatement({
        sid: 'RequireMFAForAssumeRole',
        effect: iam.Effect.DENY,
        actions: ['sts:AssumeRole'],
        principals: [new iam.AnyPrincipal()],
        resources: ['*'],
        conditions: {
          BoolIfExists: {
            'aws:MultiFactorAuthPresent': 'false'
          }
        }
      }));
    }

    if (trustControls.allowedServicePrincipals && trustControls.allowedServicePrincipals.length > 0) {
      this.role.assumeRolePolicy.addStatements(new iam.PolicyStatement({
        sid: 'RestrictServicePrincipals',
        effect: iam.Effect.DENY,
        actions: ['sts:AssumeRole'],
        principals: [new iam.AnyPrincipal()],
        resources: ['*'],
        conditions: {
          StringNotEquals: {
            'aws:PrincipalService': trustControls.allowedServicePrincipals
          }
        }
      }));
    }

    if (trustControls.allowExternalId === false && this.config?.externalId) {
      this.logComponentEvent('external_id_disallowed', 'External ID provided but trust policy disallows it', {
        roleName: this.buildRoleName(),
        externalId: this.config.externalId
      });
    }

    if (trustControls.externalIdCondition) {
      this.role.assumeRolePolicy.addStatements(new iam.PolicyStatement({
        sid: 'RequireExternalIdMatch',
        effect: iam.Effect.DENY,
        actions: ['sts:AssumeRole'],
        principals: [new iam.AnyPrincipal()],
        resources: ['*'],
        conditions: {
          StringNotEquals: {
            'sts:ExternalId': trustControls.externalIdCondition
          }
        }
      }));
    }
  }

  private mapConfiguredStatements(statements?: Array<{ sid?: string; effect: 'Allow' | 'Deny'; actions: string[]; resources?: string[]; conditions?: Record<string, any>; }>): iam.PolicyStatement[] {
    if (!statements || statements.length === 0) {
      return [];
    }

    return statements.map(stmt => new iam.PolicyStatement({
      sid: stmt.sid,
      effect: stmt.effect === 'Allow' ? iam.Effect.ALLOW : iam.Effect.DENY,
      actions: stmt.actions,
      resources: stmt.resources && stmt.resources.length > 0 ? stmt.resources : undefined,
      conditions: stmt.conditions
    }));
  }

  private applyLoggingConfiguration(): void {
    if (!this.role) {
      return;
    }

    const logging = this.config?.logging;
    if (!logging) {
      return;
    }

    this.accessLogGroup = this.createLogGroupFromConfig('AccessLogGroup', logging.access, 'access-log');
    this.auditLogGroup = this.createLogGroupFromConfig('AuditLogGroup', logging.audit, 'audit-log');
  }

  private createLogGroupFromConfig(id: string, config: IamRoleLogConfig | undefined, defaultLogType: string): logs.LogGroup | undefined {
    if (!config?.enabled) {
      return undefined;
    }

    const roleName = this.buildRoleName();
    const suffix = config.logGroupNameSuffix ? `/${config.logGroupNameSuffix}` : '';
    const logGroupName = config.logGroupName ?? `/aws/iam/role/${roleName}${suffix}`;

    const logGroup = new logs.LogGroup(this, id, {
      logGroupName,
      retention: this.resolveLogRetention(config.retentionInDays),
      removalPolicy: this.resolveRemovalPolicy(config.removalPolicy)
    });

    this.applyStandardTags(logGroup, {
      'log-type': defaultLogType,
      'role-name': roleName,
      ...(config.tags ?? {})
    });

    return logGroup;
  }

  private configureMonitoringFromConfig(): void {
    const monitoring = this.config?.monitoring;
    if (!this.role || !monitoring?.enabled || !monitoring.sessionAlarm?.enabled) {
      return;
    }

    const periodMinutes = monitoring.sessionAlarm.periodMinutes ?? 60;
    const threshold = monitoring.sessionAlarm.thresholdMinutes ?? 15;

    this.sessionAlarm = new cloudwatch.Alarm(this, 'RoleSessionAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-session-duration`,
      alarmDescription: 'IAM role session duration threshold exceeded',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudTrail',
        metricName: 'AssumeRole',
        dimensionsMap: {
          RoleName: this.role.roleName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(periodMinutes)
      }),
      threshold,
      evaluationPeriods: monitoring.sessionAlarm.evaluationPeriods ?? 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: this.resolveTreatMissingData(monitoring.sessionAlarm.treatMissingData)
    });

    this.applyStandardTags(this.sessionAlarm, {
      'alarm-type': 'session-duration',
      'threshold': threshold.toString(),
      ...(monitoring.sessionAlarm.tags ?? {})
    });
  }

  private applyServiceTags(): void {
    if (!this.role) {
      return;
    }

    const standardTags = {
      'component-type': 'iam-role',
      'max-session-duration': (this.config?.maxSessionDuration ?? 3600).toString()
    };

    this.applyStandardTags(this.role, standardTags);

    Object.entries(this.config?.tags ?? {}).forEach(([key, value]) => {
      cdk.Tags.of(this.role!).add(key, value);
    });

    [this.accessLogGroup, this.auditLogGroup].forEach(logGroup => {
      if (logGroup) {
        this.applyStandardTags(logGroup, standardTags);
      }
    });
  }

  private buildRoleCapability(): any {
    return {
      roleArn: this.role!.roleArn,
      roleName: this.role!.roleName,
      maxSessionDuration: this.config?.maxSessionDuration ?? 3600,
      permissionsBoundary: this.config?.permissionsBoundary,
      instanceProfileName: this.instanceProfile ? this.instanceProfile.ref : undefined
    };
  }

  private resolveLogRetention(retentionInDays?: number): logs.RetentionDays | undefined {
    if (!retentionInDays) {
      return undefined;
    }

    const retention = (logs.RetentionDays as unknown as Record<number, logs.RetentionDays>)[retentionInDays];
    if (retention) {
      return retention;
    }

    this.logComponentEvent('log_retention_defaulted', 'Unsupported log retention requested; defaulting to 90 days', {
      requestedRetentionInDays: retentionInDays
    });

    return logs.RetentionDays.THREE_MONTHS;
  }

  private resolveRemovalPolicy(removalPolicy?: string): cdk.RemovalPolicy {
    if (removalPolicy === 'destroy') {
      return cdk.RemovalPolicy.DESTROY;
    }
    return cdk.RemovalPolicy.RETAIN;
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
