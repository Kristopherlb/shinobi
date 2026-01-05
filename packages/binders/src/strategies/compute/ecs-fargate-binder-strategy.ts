/**
 * ECS Fargate Binder Strategy (Unified)
 * Handles container orchestration bindings for AWS ECS Fargate with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * ECS Cluster capability data structure
 * @property type - Capability type identifier
 * @property clusterArn - ECS cluster ARN (required)
 * @property clusterName - ECS cluster name (required)
 * @property capacityProviders - List of capacity providers (optional)
 * @property executeCommandEnabled - Whether ECS Exec is enabled (optional)
 */
interface EcsClusterCapabilityData {
  type: 'ecs:cluster';
  clusterArn: string;
  clusterName: string;
  capacityProviders?: string[];
  executeCommandEnabled?: boolean;
}

/**
 * ECS Service capability data structure
 * @property type - Capability type identifier
 * @property serviceArn - ECS service ARN (required)
 * @property serviceName - ECS service name (required)
 * @property clusterName - ECS cluster name (required)
 * @property taskDefinitionArn - Task definition ARN (optional)
 * @property desiredCount - Desired task count (optional)
 */
interface EcsServiceCapabilityData {
  type: 'ecs:service';
  serviceArn: string;
  serviceName: string;
  clusterName: string;
  taskDefinitionArn?: string;
  desiredCount?: number;
}

/**
 * ECS Task Definition capability data structure
 * @property type - Capability type identifier
 * @property taskDefinitionArn - Task definition ARN (required)
 * @property taskDefinitionFamily - Task definition family (optional)
 * @property revision - Task definition revision (optional)
 */
interface EcsTaskDefinitionCapabilityData {
  type: 'ecs:task-definition';
  taskDefinitionArn: string;
  taskDefinitionFamily?: string;
  revision?: number;
}

/**
 * OpenTelemetry environment capability data structure
 * @property type - Capability type identifier
 * @property otelEndpoint - OpenTelemetry collector endpoint (optional)
 * @property otelServiceName - Service name for OpenTelemetry (optional)
 * @property otelResourceAttributes - Resource attributes as key-value pairs (optional)
 */
interface OtelEnvironmentCapabilityData {
  type: 'otel:environment';
  otelEndpoint?: string;
  otelServiceName?: string;
  otelResourceAttributes?: Record<string, string>;
}

type EcsCapabilityData =
  | EcsClusterCapabilityData
  | EcsServiceCapabilityData
  | EcsTaskDefinitionCapabilityData
  | OtelEnvironmentCapabilityData;

export class EcsFargateBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'ecs:cluster',
    'ecs:service',
    'ecs:task-definition',
    'otel:environment'
  ];

  getStrategyName(): string {
    return 'ECS Fargate Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'ecs-cluster',
        capability: 'ecs:cluster',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to ECS cluster for container orchestration',
        examples: ['lambda-api -> ecs:cluster (read)', 'ecs-task -> ecs:cluster (write)']
      },
      {
        sourceType: '*',
        targetType: 'ecs-service',
        capability: 'ecs:service',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to ECS service for service management',
        examples: ['lambda-api -> ecs:service (read)', 'ecs-task -> ecs:service (write)']
      },
      {
        sourceType: '*',
        targetType: 'ecs-task-definition',
        capability: 'ecs:task-definition',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to ECS task definition for task definition management',
        examples: ['lambda-api -> ecs:task-definition (read)', 'ci-cd -> ecs:task-definition (write)']
      },
      {
        sourceType: '*',
        targetType: '*',
        capability: 'otel:environment',
        supportedAccess: ['read'],
        description: 'Bind to OpenTelemetry environment for observability configuration',
        examples: ['ecs-task -> otel:environment (read)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for ECS binding');
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
      throw new Error(`Invalid access types for ECS binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for ECS binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'ecs:cluster') {
      return await this.bindToCluster(context, targetCapabilityData, access);
    } else if (capability === 'ecs:service') {
      return await this.bindToService(context, targetCapabilityData, access);
    } else if (capability === 'ecs:task-definition') {
      return await this.bindToTaskDefinition(context, targetCapabilityData, access);
    } else if (capability === 'otel:environment') {
      return await this.bindTelemetryEnvironment(context, targetCapabilityData, directive);
    } else {
      throw new Error(`Unsupported ECS Fargate capability: ${capability}`);
    }
  }

  /**
   * Bind to ECS cluster
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EcsClusterCapabilityData):
   *   - type: 'ecs:cluster'
   *   - clusterArn (required): ECS cluster ARN
   *   - clusterName (required): ECS cluster name
   *   - capacityProviders (optional): List of capacity providers
   *   - executeCommandEnabled (optional): Whether ECS Exec is enabled
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToCluster(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEcsClusterCapabilityData(targetData)) {
      throw new Error('Invalid ECS cluster capability data structure. Expected clusterArn and clusterName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Get base actions and resources
    const baseActions = this.getEcsClusterActionsForAccess(primaryAccess, context);
    
    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getEcsClusterActionsForAccess(acc, context).actions,
      'ecs'
    );

    // Use resolved actions if granular override provided, otherwise use base actions
    const finalActions = context.directive.actions ? resolvedActions : baseActions.actions;

    // Create IAM policies based on access level
    if (finalActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: finalActions,
          resources: baseActions.resources
        }),
        description: `ECS cluster ${primaryAccess} access`,
        complianceRequirement: `ECS cluster ${primaryAccess} access policy`
      });
    }

    // Get region and account ID from target component context
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    // Set environment variables
    environmentVariables['ECS_CLUSTER_NAME'] = targetData.clusterName;
    environmentVariables['ECS_CLUSTER_ARN'] = targetData.clusterArn;
    environmentVariables['AWS_REGION'] = region;

    if (targetData.capacityProviders && targetData.capacityProviders.length > 0) {
      environmentVariables['ECS_CAPACITY_PROVIDERS'] = targetData.capacityProviders.join(',');
    }

    if (targetData.executeCommandEnabled !== undefined) {
      environmentVariables['ECS_EXEC_ENABLED'] = targetData.executeCommandEnabled.toString();
    }

    // Configure secure network connectivity when requested via options
    if (context.directive.options?.requireSecureNetworking === true) {
      if (context.directive.options?.enablePrivateEcsEndpoint === true) {
        environmentVariables['ECS_ENDPOINT'] = `https://ecs.${region}.amazonaws.com`;
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to ECS service
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EcsServiceCapabilityData):
   *   - type: 'ecs:service'
   *   - serviceArn (required): ECS service ARN
   *   - serviceName (required): ECS service name
   *   - clusterName (required): ECS cluster name
   *   - taskDefinitionArn (optional): Task definition ARN
   *   - desiredCount (optional): Desired task count
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToService(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEcsServiceCapabilityData(targetData)) {
      throw new Error('Invalid ECS service capability data structure. Expected serviceArn, serviceName, and clusterName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Get base actions and resources
    const baseActions = this.getEcsServiceActionsForAccess(primaryAccess, context, targetData.clusterName);
    
    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getEcsServiceActionsForAccess(acc, context, targetData.clusterName).actions,
      'ecs'
    );

    // Use resolved actions if granular override provided, otherwise use base actions
    const finalActions = context.directive.actions ? resolvedActions : baseActions.actions;

    // Create IAM policies based on access level
    if (finalActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: finalActions,
          resources: baseActions.resources
        }),
        description: `ECS service ${primaryAccess} access`,
        complianceRequirement: `ECS service ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['ECS_SERVICE_NAME'] = targetData.serviceName;
    environmentVariables['ECS_SERVICE_ARN'] = targetData.serviceArn;
    environmentVariables['ECS_CLUSTER_NAME'] = targetData.clusterName;

    if (targetData.taskDefinitionArn) {
      environmentVariables['ECS_TASK_DEFINITION'] = targetData.taskDefinitionArn;
    }

    if (targetData.desiredCount !== undefined) {
      environmentVariables['ECS_SERVICE_DESIRED_COUNT'] = targetData.desiredCount.toString();
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to ECS task definition
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EcsTaskDefinitionCapabilityData):
   *   - type: 'ecs:task-definition'
   *   - taskDefinitionArn (required): Task definition ARN
   *   - taskDefinitionFamily (optional): Task definition family
   *   - revision (optional): Task definition revision
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToTaskDefinition(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEcsTaskDefinitionCapabilityData(targetData)) {
      throw new Error('Invalid ECS task definition capability data structure. Expected taskDefinitionArn.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc: string) => this.getEcsTaskDefinitionActionsForAccess(acc),
      'ecs'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.taskDefinitionArn]
        }),
        description: `ECS task definition ${primaryAccess} access`,
        complianceRequirement: `ECS task definition ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['ECS_TASK_DEFINITION_ARN'] = targetData.taskDefinitionArn;

    if (targetData.taskDefinitionFamily) {
      environmentVariables['ECS_TASK_DEFINITION_FAMILY'] = targetData.taskDefinitionFamily;
    }

    if (targetData.revision !== undefined) {
      environmentVariables['ECS_TASK_DEFINITION_REVISION'] = targetData.revision.toString();
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to OpenTelemetry environment
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (OtelEnvironmentCapabilityData):
   *   - type: 'otel:environment'
   *   - otelEndpoint (optional): OpenTelemetry collector endpoint
   *   - otelServiceName (optional): Service name for OpenTelemetry
   *   - otelResourceAttributes (optional): Resource attributes as key-value pairs
   * @param directive - Binding directive with optional env overrides and IAM permissions
   * @returns Enhanced binding result without compliance block
   */
  private async bindTelemetryEnvironment(
    context: BindingContext,
    targetData: unknown,
    directive: any
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isOtelEnvironmentCapabilityData(targetData)) {
      throw new Error('Invalid OpenTelemetry environment capability data structure.');
    }

    const environmentVariables: Record<string, string> = {};
    const iamPolicies: IamPolicy[] = [];
    const envOverrides = directive.env ?? {};

    // Track which OpenTelemetry keys have been mapped to avoid duplicates
    const mappedOtelKeys = new Set<string>();

    // Map OpenTelemetry environment variables
    if (targetData.otelEndpoint) {
      const key = envOverrides['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'OTEL_EXPORTER_OTLP_ENDPOINT';
      environmentVariables[key] = targetData.otelEndpoint;
      mappedOtelKeys.add('OTEL_EXPORTER_OTLP_ENDPOINT');
    }

    if (targetData.otelServiceName) {
      const key = envOverrides['OTEL_SERVICE_NAME'] ?? 'OTEL_SERVICE_NAME';
      environmentVariables[key] = targetData.otelServiceName;
      mappedOtelKeys.add('OTEL_SERVICE_NAME');
    }

    if (targetData.otelResourceAttributes) {
      const attributes = Object.entries(targetData.otelResourceAttributes)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      const key = envOverrides['OTEL_RESOURCE_ATTRIBUTES'] ?? 'OTEL_RESOURCE_ATTRIBUTES';
      environmentVariables[key] = attributes;
      mappedOtelKeys.add('OTEL_RESOURCE_ATTRIBUTES');
    }

    // Apply any additional env overrides from directive (skip already mapped OpenTelemetry keys)
    Object.entries(envOverrides).forEach(([key, value]) => {
      if (typeof value === 'string' && !mappedOtelKeys.has(key) && !environmentVariables[key]) {
        environmentVariables[key] = value;
      }
    });

    // Optional: Add CloudWatch/OTel collector IAM permissions if requested
    if (directive.options?.enableCloudWatchPermissions === true) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogStreams'
          ],
          resources: ['*'] // Log groups are created dynamically
        }),
        description: 'CloudWatch Logs permissions for OpenTelemetry observability',
        complianceRequirement: 'Observability and monitoring'
      });
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Get ECS cluster IAM actions and resources for access level
   */
  private getEcsClusterActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    switch (access) {
      case 'read':
        return {
          actions: [
            'ecs:DescribeClusters',
            'ecs:ListServices',
            'ecs:ListTasks'
          ],
          resources: ['*'] // DescribeClusters requires * or specific ARN
        };
      case 'write':
      case 'readwrite':
        return {
          actions: [
            'ecs:DescribeClusters',
            'ecs:ListServices',
            'ecs:ListTasks',
            'ecs:CreateService',
            'ecs:UpdateService',
            'ecs:DeleteService',
            'ecs:RegisterTaskDefinition',
            'ecs:DeregisterTaskDefinition'
          ],
          resources: [
            '*', // For DescribeClusters
            `arn:aws:ecs:${region}:${accountId}:service/*`,
            `arn:aws:ecs:${region}:${accountId}:task-definition/*`
          ]
        };
      case 'admin':
        return {
          actions: [
            'ecs:DescribeClusters',
            'ecs:ListServices',
            'ecs:ListTasks',
            'ecs:CreateService',
            'ecs:UpdateService',
            'ecs:DeleteService',
            'ecs:RegisterTaskDefinition',
            'ecs:DeregisterTaskDefinition',
            'ecs:PutClusterCapacityProviders',
            'ecs:UpdateCluster',
            'ecs:TagResource',
            'ecs:UntagResource'
          ],
          resources: [
            '*',
            `arn:aws:ecs:${region}:${accountId}:service/*`,
            `arn:aws:ecs:${region}:${accountId}:task-definition/*`,
            `arn:aws:ecs:${region}:${accountId}:cluster/*`
          ]
        };
      default:
        return { actions: [], resources: [] };
    }
  }

  /**
   * Get ECS service IAM actions and resources for access level
   */
  private getEcsServiceActionsForAccess(
    access: string,
    context: BindingContext,
    clusterName: string
  ): { actions: string[]; resources: string[] } {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    switch (access) {
      case 'read':
        return {
          actions: [
            'ecs:DescribeServices',
            'ecs:ListTasks',
            'ecs:DescribeTasks'
          ],
          resources: [
            '*', // DescribeServices requires * or specific ARN
            `arn:aws:ecs:${region}:${accountId}:task/${clusterName}/*`
          ]
        };
      case 'write':
      case 'readwrite':
        return {
          actions: [
            'ecs:DescribeServices',
            'ecs:ListTasks',
            'ecs:DescribeTasks',
            'ecs:UpdateService',
            'ecs:DeleteService',
            'ecs:StopTask',
            'ecs:StartTask'
          ],
          resources: [
            '*',
            `arn:aws:ecs:${region}:${accountId}:task/${clusterName}/*`
          ]
        };
      case 'admin':
        // Admin access includes high-privilege actions (service tagging, resource management)
        // Consider requiring explicit opt-in via directive.options.allowAdminOperations for production use
        return {
          actions: [
            'ecs:DescribeServices',
            'ecs:ListTasks',
            'ecs:DescribeTasks',
            'ecs:UpdateService',
            'ecs:DeleteService',
            'ecs:StopTask',
            'ecs:StartTask',
            'ecs:TagResource',
            'ecs:UntagResource'
          ],
          resources: [
            '*',
            `arn:aws:ecs:${region}:${accountId}:task/${clusterName}/*`
          ]
        };
      default:
        return { actions: [], resources: [] };
    }
  }

  /**
   * Get ECS task definition IAM actions for access level
   */
  private getEcsTaskDefinitionActionsForAccess(access: string): string[] {
    switch (access) {
      case 'read':
        return [
          'ecs:DescribeTaskDefinition',
          'ecs:ListTaskDefinitions'
        ];
      case 'write':
      case 'readwrite':
        return [
          'ecs:DescribeTaskDefinition',
          'ecs:ListTaskDefinitions',
          'ecs:RegisterTaskDefinition',
          'ecs:DeregisterTaskDefinition'
        ];
      case 'admin':
        // Admin access includes high-privilege actions (task definition tagging, resource management)
        // Consider requiring explicit opt-in via directive.options.allowAdminOperations for production use
        return [
          'ecs:DescribeTaskDefinition',
          'ecs:ListTaskDefinitions',
          'ecs:RegisterTaskDefinition',
          'ecs:DeregisterTaskDefinition',
          'ecs:TagResource',
          'ecs:UntagResource'
        ];
      default:
        return [];
    }
  }

  // Type guards

  private isEcsClusterCapabilityData(data: unknown): data is EcsClusterCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'ecs:cluster' &&
      typeof d.clusterArn === 'string' &&
      typeof d.clusterName === 'string'
    );
  }

  private isEcsServiceCapabilityData(data: unknown): data is EcsServiceCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'ecs:service' &&
      typeof d.serviceArn === 'string' &&
      typeof d.serviceName === 'string' &&
      typeof d.clusterName === 'string'
    );
  }

  private isEcsTaskDefinitionCapabilityData(data: unknown): data is EcsTaskDefinitionCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'ecs:task-definition' &&
      typeof d.taskDefinitionArn === 'string'
    );
  }

  private isOtelEnvironmentCapabilityData(data: unknown): data is OtelEnvironmentCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return d.type === 'otel:environment';
  }
}
