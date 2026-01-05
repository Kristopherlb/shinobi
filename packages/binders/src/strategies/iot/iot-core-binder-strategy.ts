/**
 * IoT Core Binder Strategy (Unified)
 * Handles IoT device management bindings for AWS IoT Core with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class IoTCoreBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = ['iot:thing', 'iot:certificate', 'iot:policy', 'iot:topic-rule', 'iot:thing-group', 'iot:job'];

  getStrategyName(): string {
    return 'IoT Core Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'iot:thing',
        capability: 'iot:thing',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to IoT thing for device registration, shadow access, and attributes',
        examples: ['lambda-api -> iot:thing (read/write)', 'ecs-task -> iot:thing (read)']
      },
      {
        sourceType: '*',
        targetType: 'iot:certificate',
        capability: 'iot:certificate',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to IoT certificate for X.509 certificate management and policy attachment',
        examples: ['lambda-api -> iot:certificate (read)']
      },
      {
        sourceType: '*',
        targetType: 'iot:policy',
        capability: 'iot:policy',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to IoT policy for fine-grained connect, publish, subscribe, and receive permissions',
        examples: ['lambda-api -> iot:policy (readwrite)']
      },
      {
        sourceType: '*',
        targetType: 'iot:topic-rule',
        capability: 'iot:topic-rule',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to IoT topic rule with actions (S3, Lambda, SNS, SQS, Kinesis, Firehose, etc.)',
        examples: ['lambda-api -> iot:topic-rule (read)']
      },
      {
        sourceType: '*',
        targetType: 'iot:thing-group',
        capability: 'iot:thing-group',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to IoT thing group for fleet management operations',
        examples: ['lambda-api -> iot:thing-group (readwrite)']
      },
      {
        sourceType: '*',
        targetType: 'iot:job',
        capability: 'iot:job',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to IoT job for OTA updates and fleet job management',
        examples: ['lambda-api -> iot:job (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for IoT Core binding');
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
      throw new Error(`Invalid access types for IoT Core binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for IoT Core binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method
    switch (capability) {
      case 'iot:thing':
        return await this.bindToThing(context, targetCapabilityData, access);
      case 'iot:certificate':
        return await this.bindToCertificate(context, targetCapabilityData, access);
      case 'iot:policy':
        return await this.bindToPolicy(context, targetCapabilityData, access);
      case 'iot:topic-rule':
        return await this.bindToTopicRule(context, targetCapabilityData, access);
      case 'iot:thing-group':
        return await this.bindToThingGroup(context, targetCapabilityData, access);
      case 'iot:job':
        return await this.bindToJob(context, targetCapabilityData, access);
      default:
        throw new Error(`Unsupported IoT Core capability: ${capability}. Supported capabilities: ${this.supportedCapabilities.join(', ')}`);
    }
  }

  /**
   * Bind to IoT thing
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - thingArn (required): string - ARN of the IoT thing
   *   - thingName (required): string - Name of the IoT thing
   *   - thingTypeName?: string - Thing type name
   *   - version?: number - Thing version number
   *   - attributes?: Record<string, string> - Thing attributes
   *   - requireMutualTls?: boolean - Require mutual TLS (when requireSecureAccess is true)
   *   - enableVpcEndpoint?: boolean - Enable VPC endpoint (when requireSecureAccess is true)
   * @param access - Array of access levels (read, write, readwrite, admin)
   */
  private async bindToThing(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.thingArn) {
      throw new Error('Target component missing required thingArn property for IoT thing binding');
    }
    if (!targetData?.thingName) {
      throw new Error('Target component missing required thingName property for IoT thing binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const primaryAccess = access[0] || 'read';
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getIoTThingActionsForAccess(acc),
        'iot'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.thingArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT thing access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant thing access permissions
      if (access.includes('read') || access.includes('readwrite') || access.includes('admin')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:DescribeThing',
            'iot:ListThings',
            'iot:DescribeThingGroup',
            'iot:ListThingGroups'
          ],
          resources: [targetData.thingArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT thing read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite') || access.includes('admin')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:CreateThing',
            'iot:DeleteThing',
            'iot:UpdateThing',
            'iot:AttachThingPrincipal',
            'iot:DetachThingPrincipal'
          ],
          resources: [targetData.thingArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT thing write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Grant device shadow permissions (shadow access is implicit with thing access, but can be explicit)
    if (context.directive.options?.shadowAccess === true || access.includes('admin')) {
      const shadowResource = `arn:aws:iot:${region}:${accountId}:thing/${targetData.thingName}`;
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'iot:GetThingShadow',
          'iot:UpdateThingShadow',
          'iot:DeleteThingShadow'
        ],
        resources: [shadowResource]
      });
      iamPolicies.push({
        statement,
        description: 'IoT thing shadow access permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set thing environment variables
    environmentVariables['IOT_THING_NAME'] = targetData.thingName;
    environmentVariables['IOT_THING_ARN'] = targetData.thingArn;
    if (targetData.thingTypeName) {
      environmentVariables['IOT_THING_TYPE_NAME'] = targetData.thingTypeName;
    }
    if (targetData.version !== undefined) {
      environmentVariables['IOT_THING_VERSION'] = targetData.version.toString();
    }

    // Configure thing attributes
    if (targetData.attributes && typeof targetData.attributes === 'object') {
      Object.entries(targetData.attributes).forEach(([key, value]) => {
        environmentVariables[`IOT_THING_ATTR_${key.toUpperCase()}`] = String(value);
      });
    }

    // Configure secure access when requested via options/config
    if (context.directive.options?.requireSecureAccess === true) {
      const secureConfig = await this.buildSecureThingAccessConfig(context, targetData);
      Object.assign(environmentVariables, secureConfig.environmentVariables);
      iamPolicies.push(...secureConfig.iamPolicies);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to IoT certificate
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - certificateArn (required): string - ARN of the IoT certificate
   *   - certificateId (required): string - Certificate ID
   *   - status?: string - Certificate status (e.g., 'ACTIVE', 'INACTIVE')
   *   - creationDate?: string - Certificate creation date
   *   - lastModifiedDate?: string - Certificate last modified date
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToCertificate(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.certificateArn) {
      throw new Error('Target component missing required certificateArn property for IoT certificate binding');
    }
    if (!targetData?.certificateId) {
      throw new Error('Target component missing required certificateId property for IoT certificate binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const primaryAccess = access[0] || 'read';
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getIoTCertificateActionsForAccess(acc),
        'iot'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.certificateArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT certificate access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant certificate access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:DescribeCertificate',
            'iot:ListCertificates'
          ],
          resources: [targetData.certificateArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT certificate read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:CreateCertificateFromCsr',
            'iot:DeleteCertificate',
            'iot:UpdateCertificate'
          ],
          resources: [targetData.certificateArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT certificate write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Grant certificate policy permissions (for attaching/detaching policies)
    if (context.directive.options?.policyAccess === true || access.includes('readwrite')) {
      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'iot:AttachPolicy',
          'iot:DetachPolicy',
          'iot:ListAttachedPolicies'
        ],
        resources: [targetData.certificateArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT certificate policy attachment permissions',
        complianceRequirement: 'Least privilege IAM access'
      });
    }

    // Set certificate environment variables
    environmentVariables['IOT_CERTIFICATE_ID'] = targetData.certificateId;
    environmentVariables['IOT_CERTIFICATE_ARN'] = targetData.certificateArn;
    if (targetData.status) {
      environmentVariables['IOT_CERTIFICATE_STATUS'] = targetData.status;
    }
    if (targetData.creationDate) {
      environmentVariables['IOT_CERTIFICATE_CREATION_DATE'] = targetData.creationDate;
    }
    if (targetData.lastModifiedDate) {
      environmentVariables['IOT_CERTIFICATE_LAST_MODIFIED'] = targetData.lastModifiedDate;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to IoT policy
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - policyName (required): string - Name of the IoT policy
   *   - policyArn?: string - ARN of the IoT policy
   *   - policyDocument?: object - Policy document JSON
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToPolicy(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.policyName) {
      throw new Error('Target component missing required policyName property for IoT policy binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';
    const policyArn = targetData.policyArn || `arn:aws:iot:${region}:${accountId}:policy/${targetData.policyName}`;

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const primaryAccess = access[0] || 'read';
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getIoTPolicyActionsForAccess(acc),
        'iot'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [policyArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT policy access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant policy access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:GetPolicy',
            'iot:ListPolicies',
            'iot:ListPolicyVersions'
          ],
          resources: [policyArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT policy read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:CreatePolicy',
            'iot:DeletePolicy',
            'iot:CreatePolicyVersion',
            'iot:DeletePolicyVersion',
            'iot:SetDefaultPolicyVersion'
          ],
          resources: [policyArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT policy write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set policy environment variables
    environmentVariables['IOT_POLICY_NAME'] = targetData.policyName;
    environmentVariables['IOT_POLICY_ARN'] = policyArn;
    if (targetData.policyDocument) {
      environmentVariables['IOT_POLICY_DOCUMENT'] = JSON.stringify(targetData.policyDocument);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to IoT topic rule
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - ruleName (required): string - Name of the topic rule
   *   - ruleArn (required): string - ARN of the topic rule
   *   - ruleState?: string - Rule state (e.g., 'ENABLED', 'DISABLED')
   *   - sql?: string - SQL statement for the rule
   *   - description?: string - Rule description
   *   - actions?: Array<{s3?: {bucketName: string}, lambda?: {functionArn: string}, kinesis?: {streamName: string}, sns?: {targetArn: string}, sqs?: {queueUrl: string}}> - Rule actions
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToTopicRule(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.ruleName) {
      throw new Error('Target component missing required ruleName property for IoT topic rule binding');
    }
    if (!targetData?.ruleArn) {
      throw new Error('Target component missing required ruleArn property for IoT topic rule binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const primaryAccess = access[0] || 'read';
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getIoTTopicRuleActionsForAccess(acc),
        'iot'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [targetData.ruleArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT topic rule access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant rule access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:GetTopicRule',
            'iot:ListTopicRules'
          ],
          resources: [targetData.ruleArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT topic rule read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:CreateTopicRule',
            'iot:DeleteTopicRule',
            'iot:ReplaceTopicRule',
            'iot:EnableTopicRule',
            'iot:DisableTopicRule'
          ],
          resources: [targetData.ruleArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT topic rule write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Grant action permissions for rule actions
    if (targetData.actions && Array.isArray(targetData.actions)) {
      const actionStatements: PolicyStatement[] = [];
      
      for (const action of targetData.actions) {
        if (action.s3?.bucketName) {
          actionStatements.push(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:PutObject'],
            resources: [`arn:aws:s3:::${action.s3.bucketName}/*`]
          }));
        } else if (action.lambda?.functionArn) {
          actionStatements.push(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [action.lambda.functionArn]
          }));
        } else if (action.kinesis?.streamName) {
          actionStatements.push(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kinesis:PutRecord'],
            resources: [action.kinesis.streamName]
          }));
        } else if (action.sns?.targetArn) {
          actionStatements.push(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['sns:Publish'],
            resources: [action.sns.targetArn]
          }));
        } else if (action.sqs?.queueUrl) {
          actionStatements.push(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['sqs:SendMessage'],
            resources: [action.sqs.queueUrl]
          }));
        }
      }

      if (actionStatements.length > 0) {
        // Combine all action statements into one policy for simplicity
        actionStatements.forEach(statement => {
          iamPolicies.push({
            statement,
            description: 'IoT topic rule action permissions',
            complianceRequirement: 'Least privilege IAM access'
          });
        });
      }
    }

    // Set rule environment variables
    environmentVariables['IOT_RULE_NAME'] = targetData.ruleName;
    environmentVariables['IOT_RULE_ARN'] = targetData.ruleArn;
    if (targetData.ruleState) {
      environmentVariables['IOT_RULE_STATE'] = targetData.ruleState;
    }
    if (targetData.sql) {
      environmentVariables['IOT_RULE_SQL'] = targetData.sql;
    }
    if (targetData.description) {
      environmentVariables['IOT_RULE_DESCRIPTION'] = targetData.description;
    }
    if (targetData.actions && Array.isArray(targetData.actions)) {
      environmentVariables['IOT_RULE_ACTIONS'] = JSON.stringify(targetData.actions);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to IoT thing group
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - thingGroupName (required): string - Name of the thing group
   *   - thingGroupArn?: string - ARN of the thing group
   *   - parentGroupName?: string - Parent group name
   *   - thingGroupProperties?: object - Thing group properties
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToThingGroup(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.thingGroupName) {
      throw new Error('Target component missing required thingGroupName property for IoT thing group binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';
    const thingGroupArn = targetData.thingGroupArn || `arn:aws:iot:${region}:${accountId}:thinggroup/${targetData.thingGroupName}`;

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const primaryAccess = access[0] || 'read';
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getIoTThingGroupActionsForAccess(acc),
        'iot'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [thingGroupArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT thing group access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant thing group access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:DescribeThingGroup',
            'iot:ListThingGroups',
            'iot:ListThingsInThingGroup'
          ],
          resources: [thingGroupArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT thing group read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:CreateThingGroup',
            'iot:DeleteThingGroup',
            'iot:UpdateThingGroup',
            'iot:AddThingToThingGroup',
            'iot:RemoveThingFromThingGroup'
          ],
          resources: [thingGroupArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT thing group write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set thing group environment variables
    environmentVariables['IOT_THING_GROUP_NAME'] = targetData.thingGroupName;
    environmentVariables['IOT_THING_GROUP_ARN'] = thingGroupArn;
    if (targetData.parentGroupName) {
      environmentVariables['IOT_THING_GROUP_PARENT'] = targetData.parentGroupName;
    }
    if (targetData.thingGroupProperties) {
      environmentVariables['IOT_THING_GROUP_PROPERTIES'] = JSON.stringify(targetData.thingGroupProperties);
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Bind to IoT job
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - jobId (required): string - Job ID
   *   - jobArn?: string - ARN of the job
   *   - jobStatus?: string - Job status (e.g., 'IN_PROGRESS', 'COMPLETED', 'FAILED')
   *   - targetSelection?: string - Target selection type (e.g., 'CONTINUOUS', 'SNAPSHOT')
   * @param access - Array of access levels (read, write, readwrite)
   */
  private async bindToJob(
    context: BindingContext,
    targetData: any,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    // Validate required target properties
    if (!targetData?.jobId) {
      throw new Error('Target component missing required jobId property for IoT job binding');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';
    const jobArn = targetData.jobArn || `arn:aws:iot:${region}:${accountId}:job/${targetData.jobId}`;

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      // Granular actions provided: create single statement with resolved actions
      const primaryAccess = access[0] || 'read';
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc) => this.getIoTJobActionsForAccess(acc),
        'iot'
      );

      const statement = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: resolvedActions,
        resources: [jobArn]
      });
      iamPolicies.push({
        statement,
        description: 'IoT job access permissions (granular actions)',
        complianceRequirement: 'Least privilege IAM access'
      });
    } else {
      // Coarse access levels: use multi-statement approach (backward compatible)
      // Grant job access permissions
      if (access.includes('read') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:DescribeJob',
            'iot:DescribeJobExecution',
            'iot:ListJobs',
            'iot:ListJobExecutionsForThing'
          ],
          resources: [jobArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT job read access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }

      if (access.includes('write') || access.includes('readwrite')) {
        const statement = new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'iot:CreateJob',
            'iot:DeleteJob',
            'iot:UpdateJob',
            'iot:CancelJob',
            'iot:UpdateJobExecution'
          ],
          resources: [jobArn]
        });
        iamPolicies.push({
          statement,
          description: 'IoT job write access permissions',
          complianceRequirement: 'Least privilege IAM access'
        });
      }
    }

    // Set job environment variables
    environmentVariables['IOT_JOB_ID'] = targetData.jobId;
    environmentVariables['IOT_JOB_ARN'] = jobArn;
    if (targetData.jobStatus) {
      environmentVariables['IOT_JOB_STATUS'] = targetData.jobStatus;
    }
    if (targetData.targetSelection) {
      environmentVariables['IOT_JOB_TARGET_SELECTION'] = targetData.targetSelection;
    }

    return {
      environmentVariables,
      iamPolicies,
      securityGroupRules: []
    };
  }

  /**
   * Build secure access configuration for IoT thing
   * 
   * @param context - Binding context
   * @param targetData - Expected structure:
   *   - thingArn: string - ARN of the IoT thing
   *   - thingName: string - Name of the IoT thing
   *   - requireMutualTls?: boolean - Require mutual TLS
   *   - enableVpcEndpoint?: boolean - Enable VPC endpoint
   * @returns Secure access configuration with environment variables and IAM policies
   */
  private async buildSecureThingAccessConfig(
    context: BindingContext,
    targetData: any
  ): Promise<{ environmentVariables: Record<string, string>; iamPolicies: IamPolicy[] }> {
    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '*';

    // Configure device authentication
    environmentVariables['IOT_DEVICE_AUTHENTICATION_ENABLED'] = 'true';

    // Optionally enable mutual TLS when requested
    if (targetData.requireMutualTls === true) {
      environmentVariables['IOT_MUTUAL_TLS_ENABLED'] = 'true';
    }

    // Configure device registry
    if (targetData.thingTypeName) {
      environmentVariables['IOT_THING_TYPE_ENABLED'] = 'true';
    }

    // Configure audit logging
    environmentVariables['IOT_AUDIT_LOGGING_ENABLED'] = 'true';

    // Grant CloudWatch Logs permissions for audit logging
    const logsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/iot/*`]
    });
    iamPolicies.push({
      statement: logsStatement,
      description: 'CloudWatch Logs permissions for IoT audit logging',
      complianceRequirement: 'Audit logging and compliance'
    });

    // Configure device monitoring
    environmentVariables['IOT_DEVICE_MONITORING_ENABLED'] = 'true';

    // Grant CloudWatch permissions for device metrics
    // NOTE: cloudwatch:PutMetricData requires wildcard resources per AWS IAM documentation
    // This is a legitimate use case for custom metrics that don't have specific ARNs
    const cloudWatchStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics'
      ],
      resources: ['*'] // Required by AWS for PutMetricData - cannot be scoped to specific metrics
    });
    iamPolicies.push({
      statement: cloudWatchStatement,
      description: 'CloudWatch permissions for IoT device monitoring',
      complianceRequirement: 'Observability and monitoring'
    });

    // Configure VPC endpoints for private connectivity when requested
    if (targetData.enableVpcEndpoint === true) {
      environmentVariables['IOT_VPC_ENDPOINT_ENABLED'] = 'true';
    }

    // Configure device defender for security monitoring
    environmentVariables['IOT_DEVICE_DEFENDER_ENABLED'] = 'true';

    // Grant Device Defender permissions
    // NOTE: IoT Device Defender metrics are account-scoped and don't have specific ARNs
    // This wildcard is required for device metrics operations
    const deviceDefenderStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'iotdevice:GetDeviceMetrics',
        'iotdevice:ListDeviceMetrics'
      ],
      resources: ['*'] // Required for account-scoped device metrics - no specific ARN available
    });
    iamPolicies.push({
      statement: deviceDefenderStatement,
      description: 'IoT Device Defender permissions for security monitoring',
      complianceRequirement: 'Security monitoring and compliance'
    });

    return { environmentVariables, iamPolicies };
  }

  /**
   * Get IoT thing actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite, admin)
   * @returns Array of IAM action strings
   */
  private getIoTThingActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'iot:DescribeThing',
          'iot:ListThings',
          'iot:DescribeThingGroup',
          'iot:ListThingGroups'
        ];
      case 'write':
        return [
          'iot:CreateThing',
          'iot:DeleteThing',
          'iot:UpdateThing',
          'iot:AttachThingPrincipal',
          'iot:DetachThingPrincipal'
        ];
      case 'readwrite':
        return [
          'iot:DescribeThing',
          'iot:ListThings',
          'iot:DescribeThingGroup',
          'iot:ListThingGroups',
          'iot:CreateThing',
          'iot:DeleteThing',
          'iot:UpdateThing',
          'iot:AttachThingPrincipal',
          'iot:DetachThingPrincipal'
        ];
      case 'admin':
        return ['iot:*'];
      default:
        throw new Error(`Unsupported IoT thing access level: ${access}`);
    }
  }

  /**
   * Get IoT certificate actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getIoTCertificateActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'iot:DescribeCertificate',
          'iot:ListCertificates'
        ];
      case 'write':
        return [
          'iot:CreateCertificateFromCsr',
          'iot:DeleteCertificate',
          'iot:UpdateCertificate'
        ];
      case 'readwrite':
        return [
          'iot:DescribeCertificate',
          'iot:ListCertificates',
          'iot:CreateCertificateFromCsr',
          'iot:DeleteCertificate',
          'iot:UpdateCertificate'
        ];
      default:
        throw new Error(`Unsupported IoT certificate access level: ${access}`);
    }
  }

  /**
   * Get IoT policy actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getIoTPolicyActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'iot:GetPolicy',
          'iot:ListPolicies',
          'iot:ListPolicyVersions'
        ];
      case 'write':
        return [
          'iot:CreatePolicy',
          'iot:DeletePolicy',
          'iot:CreatePolicyVersion',
          'iot:DeletePolicyVersion',
          'iot:SetDefaultPolicyVersion'
        ];
      case 'readwrite':
        return [
          'iot:GetPolicy',
          'iot:ListPolicies',
          'iot:ListPolicyVersions',
          'iot:CreatePolicy',
          'iot:DeletePolicy',
          'iot:CreatePolicyVersion',
          'iot:DeletePolicyVersion',
          'iot:SetDefaultPolicyVersion'
        ];
      default:
        throw new Error(`Unsupported IoT policy access level: ${access}`);
    }
  }

  /**
   * Get IoT topic rule actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getIoTTopicRuleActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'iot:GetTopicRule',
          'iot:ListTopicRules'
        ];
      case 'write':
        return [
          'iot:CreateTopicRule',
          'iot:DeleteTopicRule',
          'iot:ReplaceTopicRule',
          'iot:EnableTopicRule',
          'iot:DisableTopicRule'
        ];
      case 'readwrite':
        return [
          'iot:GetTopicRule',
          'iot:ListTopicRules',
          'iot:CreateTopicRule',
          'iot:DeleteTopicRule',
          'iot:ReplaceTopicRule',
          'iot:EnableTopicRule',
          'iot:DisableTopicRule'
        ];
      default:
        throw new Error(`Unsupported IoT topic rule access level: ${access}`);
    }
  }

  /**
   * Get IoT thing group actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getIoTThingGroupActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'iot:DescribeThingGroup',
          'iot:ListThingGroups',
          'iot:ListThingsInThingGroup'
        ];
      case 'write':
        return [
          'iot:CreateThingGroup',
          'iot:DeleteThingGroup',
          'iot:UpdateThingGroup',
          'iot:AddThingToThingGroup',
          'iot:RemoveThingFromThingGroup'
        ];
      case 'readwrite':
        return [
          'iot:DescribeThingGroup',
          'iot:ListThingGroups',
          'iot:ListThingsInThingGroup',
          'iot:CreateThingGroup',
          'iot:DeleteThingGroup',
          'iot:UpdateThingGroup',
          'iot:AddThingToThingGroup',
          'iot:RemoveThingFromThingGroup'
        ];
      default:
        throw new Error(`Unsupported IoT thing group access level: ${access}`);
    }
  }

  /**
   * Get IoT job actions based on access level
   * Used by resolveActions to compute base actions from coarse access level
   * 
   * @param access - Access level (read, write, readwrite)
   * @returns Array of IAM action strings
   */
  private getIoTJobActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'iot:DescribeJob',
          'iot:DescribeJobExecution',
          'iot:ListJobs',
          'iot:ListJobExecutionsForThing'
        ];
      case 'write':
        return [
          'iot:CreateJob',
          'iot:DeleteJob',
          'iot:UpdateJob',
          'iot:CancelJob',
          'iot:UpdateJobExecution'
        ];
      case 'readwrite':
        return [
          'iot:DescribeJob',
          'iot:DescribeJobExecution',
          'iot:ListJobs',
          'iot:ListJobExecutionsForThing',
          'iot:CreateJob',
          'iot:DeleteJob',
          'iot:UpdateJob',
          'iot:CancelJob',
          'iot:UpdateJobExecution'
        ];
      default:
        throw new Error(`Unsupported IoT job access level: ${access}`);
    }
  }
}