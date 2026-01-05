/**
 * EMR Binder Strategy (Unified)
 * Handles big data processing bindings for Amazon EMR with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * EMR Cluster capability data structure
 * @property type - Capability type identifier
 * @property clusterId - EMR cluster ID (required)
 * @property clusterArn - EMR cluster ARN (required)
 * @property name - Cluster name (required)
 * @property status - Cluster status with state (required)
 * @property releaseLabel - EMR release label (required)
 * @property masterPublicDnsName - Master node public DNS name (optional)
 * @property logUri - S3 URI for cluster logs (optional)
 * @property applications - Applications installed on cluster (optional)
 * @property serviceRole - IAM service role ARN (optional)
 * @property ec2SubnetId - EC2 subnet ID for VPC configuration (optional)
 * @property emrManagedMasterSecurityGroup - EMR managed master security group ID (optional)
 * @property emrManagedSlaveSecurityGroup - EMR managed slave security group ID (optional)
 * @property encryptionConfiguration - Encryption configuration (optional)
 * @property kerberosAttributes - Kerberos authentication attributes (optional)
 */
interface EmrClusterCapabilityData {
  type: 'emr:cluster';
  clusterId: string;
  clusterArn: string;
  name: string;
  status: {
    state: string;
  };
  releaseLabel: string;
  masterPublicDnsName?: string;
  logUri?: string;
  applications?: Array<{
    name: string;
  }>;
  serviceRole?: string;
  ec2SubnetId?: string;
  emrManagedMasterSecurityGroup?: string;
  emrManagedSlaveSecurityGroup?: string;
  encryptionConfiguration?: {
    kmsKeyId?: string;
  };
  kerberosAttributes?: {
    realm?: string;
    adDomainJoinUser?: string;
  };
}

/**
 * EMR Step capability data structure
 * @property type - Capability type identifier
 * @property stepId - Step ID (required)
 * @property stepArn - Step ARN (required)
 * @property name - Step name (required)
 * @property status - Step status with state (required)
 * @property actionOnFailure - Action on failure (required)
 * @property jar - S3 URI for JAR file (optional)
 * @property mainClass - Main class name (optional)
 * @property args - Step arguments (optional)
 */
interface EmrStepCapabilityData {
  type: 'emr:step';
  stepId: string;
  stepArn: string;
  name: string;
  status: {
    state: string;
  };
  actionOnFailure: string;
  jar?: string;
  mainClass?: string;
  args?: string[];
}

/**
 * EMR Notebook capability data structure
 * @property type - Capability type identifier
 * @property notebookExecutionId - Notebook execution ID (required)
 * @property status - Notebook execution status (required)
 * @property editorId - Editor ID (required)
 * @property executionEngineId - Execution engine ID (required)
 * @property notebookS3Location - S3 location for notebook (optional)
 * @property outputNotebookS3Location - S3 location for output notebook (optional)
 */
interface EmrNotebookCapabilityData {
  type: 'emr:notebook';
  notebookExecutionId: string;
  status: string;
  editorId: string;
  executionEngineId: string;
  notebookS3Location?: string;
  outputNotebookS3Location?: string;
}

/**
 * EMR Serverless capability data structure
 * @property type - Capability type identifier
 * @property applicationId - EMR Serverless application ID (required)
 * @property applicationArn - EMR Serverless application ARN (required)
 * @property name - Application name (required)
 * @property state - Application state (required)
 * @property releaseLabel - EMR release label (required)
 * @property architecture - Application architecture (optional)
 * @property networkConfiguration - Network configuration (optional)
 * @property maximumCapacity - Maximum capacity configuration (optional)
 * @property autoStartConfiguration - Auto-start configuration (optional)
 * @property autoStopConfiguration - Auto-stop configuration (optional)
 */
interface EmrServerlessCapabilityData {
  type: 'emr:serverless';
  applicationId: string;
  applicationArn: string;
  name: string;
  state: string;
  releaseLabel: string;
  architecture?: string;
  networkConfiguration?: {
    subnetIds?: string[];
    securityGroupIds?: string[];
  };
  maximumCapacity?: {
    cpu?: string;
    memory?: string;
    disk?: string;
  };
  autoStartConfiguration?: {
    enabled?: boolean;
  };
  autoStopConfiguration?: {
    enabled?: boolean;
    idleTimeoutMinutes?: number;
  };
}

type EmrCapabilityData = EmrClusterCapabilityData | EmrStepCapabilityData | EmrNotebookCapabilityData | EmrServerlessCapabilityData;

export class EmrBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'emr:cluster',
    'emr:step',
    'emr:notebook',
    'emr:serverless'
  ];

  getStrategyName(): string {
    return 'EMR Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'emr-cluster',
        capability: 'emr:cluster',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EMR cluster for big data processing',
        examples: ['lambda-api -> emr:cluster (read)', 'ci-cd -> emr:cluster (write)']
      },
      {
        sourceType: '*',
        targetType: 'emr-step',
        capability: 'emr:step',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EMR step for job execution',
        examples: ['lambda-api -> emr:step (read)', 'ci-cd -> emr:step (write)']
      },
      {
        sourceType: '*',
        targetType: 'emr-notebook',
        capability: 'emr:notebook',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EMR notebook for interactive analysis',
        examples: ['lambda-api -> emr:notebook (read)', 'ci-cd -> emr:notebook (write)']
      },
      {
        sourceType: '*',
        targetType: 'emr-serverless',
        capability: 'emr:serverless',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EMR Serverless application for serverless big data processing',
        examples: ['lambda-api -> emr:serverless (read)', 'ci-cd -> emr:serverless (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for EMR binding');
    }
    if (!capability) {
      throw new Error('Binding capability is required');
    }

    // Normalize access to array (directive.access is a single AccessLevel string)
    const access = directive.access ? [directive.access] : [];

    // Validate access patterns
    const validAccessTypes = ['read', 'write', 'readwrite'];
    const invalidAccess = access.filter(a => !validAccessTypes.includes(a));
    if (invalidAccess.length > 0) {
      throw new Error(`Invalid access types for EMR binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for EMR binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'emr:cluster') {
      return await this.bindToCluster(context, targetCapabilityData, access);
    } else if (capability === 'emr:step') {
      return await this.bindToStep(context, targetCapabilityData, access);
    } else if (capability === 'emr:notebook') {
      return await this.bindToNotebook(context, targetCapabilityData, access);
    } else if (capability === 'emr:serverless') {
      return await this.bindToServerless(context, targetCapabilityData, access);
    } else {
        throw new Error(`Unsupported EMR capability: ${capability}`);
    }
  }

  /**
   * Bind to EMR cluster
   */
  private async bindToCluster(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEmrClusterCapabilityData(targetData)) {
      throw new Error('Invalid EMR cluster capability data structure. Expected clusterId, clusterArn, name, status, and releaseLabel.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getEmrClusterActionsForAccess(acc, context).actions,
        'elasticmapreduce'
      );

      // Get resources from target data
      const resources = targetData.clusterArn ? [targetData.clusterArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'EMR cluster access (granular actions)',
        complianceRequirement: 'EMR cluster access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getEmrClusterActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `EMR cluster ${primaryAccess} access`,
          complianceRequirement: `EMR cluster ${primaryAccess} access policy`
        });
      }
    }

    // Grant EC2 permissions for cluster management
    // SECURITY: Wildcard resources are not allowed for sensitive service 'ec2'.
    // Use cluster instance ARNs from targetData or construct from cluster ID.
    const region = context.source.context.region || 'us-east-1';
    const accountId = context.source.context.accountId || '123456789012';
    const clusterId = (targetData as any).clusterId || 'j-2AXXXXXXGAPLF';
    const ec2Resources = [
      `arn:aws:ec2:${region}:${accountId}:instance/*`, // EMR cluster instances
      `arn:aws:ec2:${region}:${accountId}:security-group/*`, // Cluster security groups
      `arn:aws:ec2:${region}:${accountId}:subnet/*`, // Cluster subnets
      `arn:aws:ec2:${region}:${accountId}:vpc/*` // Cluster VPCs
    ];
    
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
        'ec2:DescribeInstances',
        'ec2:DescribeInstanceStatus',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeSubnets',
        'ec2:DescribeVpcs'
      ],
        resources: ec2Resources
      }),
      description: 'EC2 permissions for EMR cluster management',
      complianceRequirement: 'EC2 describe permissions for EMR cluster operations'
    });

    // Grant IAM permissions for service roles
    if (targetData.serviceRole) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['iam:PassRole'],
          resources: [targetData.serviceRole]
        }),
        description: 'IAM PassRole for EMR service role',
        complianceRequirement: 'IAM PassRole permission for EMR service role'
      });
    }

    // Set environment variables
    environmentVariables['EMR_CLUSTER_ID'] = targetData.clusterId;
    environmentVariables['EMR_CLUSTER_ARN'] = targetData.clusterArn;
    environmentVariables['EMR_CLUSTER_NAME'] = targetData.name;
    environmentVariables['EMR_CLUSTER_STATUS'] = targetData.status.state;
    environmentVariables['EMR_CLUSTER_RELEASE_LABEL'] = targetData.releaseLabel;

    // Configure cluster metadata
    if (targetData.masterPublicDnsName) {
      environmentVariables['EMR_CLUSTER_MASTER_PUBLIC_DNS'] = targetData.masterPublicDnsName;
    }
    if (targetData.logUri) {
      environmentVariables['EMR_CLUSTER_LOG_URI'] = targetData.logUri;
    }

    // Configure applications
    if (targetData.applications && targetData.applications.length > 0) {
      environmentVariables['EMR_APPLICATIONS'] = targetData.applications.map(app => app.name).join(',');
    }

    // Configure secure access if requested
    const requireSecureAccess = context.directive.options?.requireSecureAccess === true;
    if (requireSecureAccess) {
      await this.configureSecureClusterAccess(context, targetData, iamPolicies, environmentVariables);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to EMR step
   */
  private async bindToStep(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEmrStepCapabilityData(targetData)) {
      throw new Error('Invalid EMR step capability data structure. Expected stepId, stepArn, name, status, and actionOnFailure.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getEmrStepActionsForAccess(acc, context).actions,
        'elasticmapreduce'
      );

      // Get resources from target data
      const resources = targetData.stepArn ? [targetData.stepArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'EMR step access (granular actions)',
        complianceRequirement: 'EMR step access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getEmrStepActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `EMR step ${primaryAccess} access`,
          complianceRequirement: `EMR step ${primaryAccess} access policy`
        });
      }
    }

    // Grant S3 permissions for step artifacts
    if (targetData.jar) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject'],
          resources: [targetData.jar]
        }),
        description: 'S3 access for EMR step JAR file',
        complianceRequirement: 'S3 read permission for EMR step artifacts'
      });
    }

    // Set environment variables
    environmentVariables['EMR_STEP_ID'] = targetData.stepId;
    environmentVariables['EMR_STEP_ARN'] = targetData.stepArn;
    environmentVariables['EMR_STEP_NAME'] = targetData.name;
    environmentVariables['EMR_STEP_STATUS'] = targetData.status.state;
    environmentVariables['EMR_STEP_ACTION_ON_FAILURE'] = targetData.actionOnFailure;

    // Configure step metadata
    if (targetData.jar) {
      environmentVariables['EMR_STEP_JAR'] = targetData.jar;
    }
    if (targetData.mainClass) {
      environmentVariables['EMR_STEP_MAIN_CLASS'] = targetData.mainClass;
    }
    if (targetData.args && targetData.args.length > 0) {
      environmentVariables['EMR_STEP_ARGS'] = targetData.args.join(' ');
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to EMR notebook
   */
  private async bindToNotebook(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEmrNotebookCapabilityData(targetData)) {
      throw new Error('Invalid EMR notebook capability data structure. Expected notebookExecutionId, status, editorId, and executionEngineId.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getEmrNotebookActionsForAccess(acc, context).actions,
        'elasticmapreduce'
      );

      // Get resources from target data
      const resources = targetData.notebookExecutionId ? [`arn:aws:elasticmapreduce:*:*:notebook-execution/${targetData.notebookExecutionId}`] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'EMR notebook access (granular actions)',
        complianceRequirement: 'EMR notebook access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getEmrNotebookActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `EMR notebook ${primaryAccess} access`,
          complianceRequirement: `EMR notebook ${primaryAccess} access policy`
        });
      }
    }

    // Grant S3 permissions for notebook storage
    if (targetData.notebookS3Location) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject'],
          resources: [
            targetData.notebookS3Location,
            `${targetData.notebookS3Location}/*`
          ]
        }),
        description: 'S3 access for EMR notebook storage',
        complianceRequirement: 'S3 read/write permission for EMR notebook storage'
      });
    }

    // Set environment variables
    environmentVariables['EMR_NOTEBOOK_EXECUTION_ID'] = targetData.notebookExecutionId;
    environmentVariables['EMR_NOTEBOOK_STATUS'] = targetData.status;
    environmentVariables['EMR_NOTEBOOK_EDITOR_ID'] = targetData.editorId;
    environmentVariables['EMR_NOTEBOOK_EXECUTION_ENGINE_ID'] = targetData.executionEngineId;

    // Configure notebook metadata
    if (targetData.notebookS3Location) {
      environmentVariables['EMR_NOTEBOOK_S3_LOCATION'] = targetData.notebookS3Location;
    }
    if (targetData.outputNotebookS3Location) {
      environmentVariables['EMR_NOTEBOOK_OUTPUT_S3_LOCATION'] = targetData.outputNotebookS3Location;
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Bind to EMR Serverless application
   */
  private async bindToServerless(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEmrServerlessCapabilityData(targetData)) {
      throw new Error('Invalid EMR Serverless capability data structure. Expected applicationId, applicationArn, name, state, and releaseLabel.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level
    const primaryAccess = access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Handle granular actions override or use multi-statement approach
    if (context.directive.actions) {
      const resolvedActions = resolveActions(
        context.directive,
        context,
        (acc: string) => this.getEmrServerlessActionsForAccess(acc, context).actions,
        'emr-serverless'
      );

      // Get resources from target data
      const resources = targetData.applicationArn ? [targetData.applicationArn] : ['*'];

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources
        }),
        description: 'EMR Serverless access (granular actions)',
        complianceRequirement: 'EMR Serverless access policy'
      });
    } else {
      // Coarse access levels: use existing helper method (backward compatible)
      const actions = this.getEmrServerlessActionsForAccess(primaryAccess, context);
      if (actions.actions.length > 0) {
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: actions.actions,
            resources: actions.resources
          }),
          description: `EMR Serverless ${primaryAccess} access`,
          complianceRequirement: `EMR Serverless ${primaryAccess} access policy`
        });
      }
    }

    // Set environment variables
    environmentVariables['EMR_SERVERLESS_APPLICATION_ID'] = targetData.applicationId;
    environmentVariables['EMR_SERVERLESS_APPLICATION_ARN'] = targetData.applicationArn;
    environmentVariables['EMR_SERVERLESS_APPLICATION_NAME'] = targetData.name;
    environmentVariables['EMR_SERVERLESS_APPLICATION_STATE'] = targetData.state;
    environmentVariables['EMR_SERVERLESS_RELEASE_LABEL'] = targetData.releaseLabel;

    // Configure application metadata
    if (targetData.architecture) {
      environmentVariables['EMR_SERVERLESS_ARCHITECTURE'] = targetData.architecture;
    }

    // Configure network configuration
    if (targetData.networkConfiguration) {
      if (targetData.networkConfiguration.subnetIds && targetData.networkConfiguration.subnetIds.length > 0) {
        environmentVariables['EMR_SERVERLESS_SUBNET_IDS'] = targetData.networkConfiguration.subnetIds.join(',');
      }
      if (targetData.networkConfiguration.securityGroupIds && targetData.networkConfiguration.securityGroupIds.length > 0) {
        environmentVariables['EMR_SERVERLESS_SECURITY_GROUP_IDS'] = targetData.networkConfiguration.securityGroupIds.join(',');
      }
    }

    // Configure capacity
    if (targetData.maximumCapacity) {
      if (targetData.maximumCapacity.cpu) {
        environmentVariables['EMR_SERVERLESS_MAX_CPU'] = targetData.maximumCapacity.cpu;
      }
      if (targetData.maximumCapacity.memory) {
        environmentVariables['EMR_SERVERLESS_MAX_MEMORY'] = targetData.maximumCapacity.memory;
      }
      if (targetData.maximumCapacity.disk) {
        environmentVariables['EMR_SERVERLESS_MAX_DISK'] = targetData.maximumCapacity.disk;
      }
    }

    // Configure auto-start/stop
    if (targetData.autoStartConfiguration) {
      environmentVariables['EMR_SERVERLESS_AUTO_START_ENABLED'] = targetData.autoStartConfiguration.enabled ? 'true' : 'false';
    }
    if (targetData.autoStopConfiguration) {
      environmentVariables['EMR_SERVERLESS_AUTO_STOP_ENABLED'] = targetData.autoStopConfiguration.enabled ? 'true' : 'false';
      if (targetData.autoStopConfiguration.idleTimeoutMinutes) {
        environmentVariables['EMR_SERVERLESS_AUTO_STOP_IDLE_TIMEOUT_MINUTES'] = targetData.autoStopConfiguration.idleTimeoutMinutes.toString();
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: []
    };
  }

  /**
   * Configure secure cluster access
   */
  private async configureSecureClusterAccess(
    context: BindingContext,
    targetData: EmrClusterCapabilityData,
    iamPolicies: IamPolicy[],
    environmentVariables: Record<string, string>
  ): Promise<void> {
    // Configure encryption at rest
    if (targetData.encryptionConfiguration) {
      environmentVariables['EMR_ENCRYPTION_ENABLED'] = 'true';

      if (targetData.encryptionConfiguration.kmsKeyId) {
        environmentVariables['EMR_KMS_KEY_ID'] = targetData.encryptionConfiguration.kmsKeyId;

        // Grant KMS permissions
        iamPolicies.push({
          statement: new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
            resources: [targetData.encryptionConfiguration.kmsKeyId]
          }),
          description: 'KMS permissions for EMR cluster encryption',
          complianceRequirement: 'KMS decrypt/generate data key for EMR cluster encryption'
        });
      }
    }

    // Configure VPC for private cluster access
    if (targetData.ec2SubnetId) {
      environmentVariables['EMR_SUBNET_ID'] = targetData.ec2SubnetId;
      environmentVariables['EMR_VPC_ENABLED'] = 'true';
    }

    // Configure security groups
    if (targetData.emrManagedMasterSecurityGroup) {
      environmentVariables['EMR_MASTER_SECURITY_GROUP'] = targetData.emrManagedMasterSecurityGroup;
    }
    if (targetData.emrManagedSlaveSecurityGroup) {
      environmentVariables['EMR_SLAVE_SECURITY_GROUP'] = targetData.emrManagedSlaveSecurityGroup;
    }

    // Configure Kerberos authentication if requested
    const enableKerberos = context.directive.options?.enableKerberos === true;
    if (enableKerberos) {
      environmentVariables['EMR_KERBEROS_ENABLED'] = 'true';

      if (targetData.kerberosAttributes) {
        if (targetData.kerberosAttributes.realm) {
          environmentVariables['EMR_KERBEROS_REALM'] = targetData.kerberosAttributes.realm;
        }
        if (targetData.kerberosAttributes.adDomainJoinUser) {
          environmentVariables['EMR_KERBEROS_AD_DOMAIN_JOIN_USER'] = targetData.kerberosAttributes.adDomainJoinUser;
        }
      }

      // Grant KDC (Kerberos Domain Controller) permissions for Kerberos authentication
      // Note: KDC access typically requires network-level permissions (security groups)
      // but we also grant IAM permissions for AD domain join operations
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'ds:DescribeDirectories',
            'ds:AuthorizeApplication',
            'ds:UnauthorizeApplication'
          ],
          resources: ['*']
        }),
        description: 'Directory Service permissions for EMR Kerberos KDC access',
        complianceRequirement: 'Directory Service permissions for Kerberos authentication'
      });
    }

    // Configure logging
    if (targetData.logUri) {
      environmentVariables['EMR_LOGGING_ENABLED'] = 'true';

      // Grant S3 permissions for logs
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject', 's3:GetObject'],
          resources: [
            targetData.logUri,
            `${targetData.logUri}/*`
          ]
        }),
        description: 'S3 permissions for EMR cluster logs',
        complianceRequirement: 'S3 read/write permission for EMR cluster logs'
      });
    }

    // Configure monitoring and alerting
    environmentVariables['EMR_MONITORING_ENABLED'] = 'true';

    // Grant CloudWatch permissions
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics'
      ],
        resources: ['*']
      }),
      description: 'CloudWatch permissions for EMR cluster monitoring',
      complianceRequirement: 'CloudWatch metrics permission for EMR cluster monitoring'
    });

    // Configure audit logging if requested
    const enableAuditLogging = context.directive.options?.enableAuditLogging === true;
    if (enableAuditLogging) {
      environmentVariables['EMR_AUDIT_LOGGING_ENABLED'] = 'true';

    // Grant CloudTrail permissions for audit logging
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
          resources: [`arn:aws:logs:${(context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1'}:${(context.target.context as any)?.accountId || '123456789012'}:log-group:/aws/elasticmapreduce/*`]
        }),
        description: 'CloudWatch Logs permissions for EMR audit logging',
        complianceRequirement: 'CloudWatch Logs permission for EMR audit logging'
      });
    }
  }

  /**
   * Get EMR cluster actions for access level
   */
  private getEmrClusterActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'elasticmapreduce:DescribeCluster',
        'elasticmapreduce:ListClusters',
        'elasticmapreduce:ListInstances',
        'elasticmapreduce:ListInstanceGroups'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'elasticmapreduce:RunJobFlow',
        'elasticmapreduce:TerminateJobFlows',
        'elasticmapreduce:ModifyInstanceGroups'
      );
    }

    // Get cluster ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const clusterData = targetCapabilities['emr:cluster'] as EmrClusterCapabilityData | undefined;
    if (clusterData?.clusterArn) {
      resources.push(clusterData.clusterArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Get EMR step actions for access level
   */
  private getEmrStepActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'elasticmapreduce:DescribeStep',
        'elasticmapreduce:ListSteps'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'elasticmapreduce:AddJobFlowSteps',
        'elasticmapreduce:CancelSteps'
      );
    }

    // Get step ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const stepData = targetCapabilities['emr:step'] as EmrStepCapabilityData | undefined;
    if (stepData?.stepArn) {
      resources.push(stepData.stepArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Get EMR notebook actions for access level
   */
  private getEmrNotebookActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'elasticmapreduce:DescribeNotebookExecution',
        'elasticmapreduce:ListNotebookExecutions'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'elasticmapreduce:StartNotebookExecution',
        'elasticmapreduce:StopNotebookExecution'
      );
    }

    // Get notebook execution ID from target if available
    const targetCapabilities = context.target.getCapabilities();
    const notebookData = targetCapabilities['emr:notebook'] as EmrNotebookCapabilityData | undefined;
    if (notebookData?.notebookExecutionId) {
      // EMR notebook resources use the execution ID as ARN pattern
      const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
      const accountId = (context.target.context as any)?.accountId || '123456789012';
      resources.push(`arn:aws:elasticmapreduce:${region}:${accountId}:notebook-execution/${notebookData.notebookExecutionId}`);
    } else {
      // Fallback to wildcard if ID not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Type guard for EMR cluster capability data
   */
  private isEmrClusterCapabilityData(data: unknown): data is EmrClusterCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'emr:cluster' &&
      typeof d.clusterId === 'string' &&
      typeof d.clusterArn === 'string' &&
      typeof d.name === 'string' &&
      typeof d.status === 'object' &&
      d.status !== null &&
      typeof (d.status as Record<string, unknown>).state === 'string' &&
      typeof d.releaseLabel === 'string'
    );
  }

  /**
   * Type guard for EMR step capability data
   */
  private isEmrStepCapabilityData(data: unknown): data is EmrStepCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'emr:step' &&
      typeof d.stepId === 'string' &&
      typeof d.stepArn === 'string' &&
      typeof d.name === 'string' &&
      typeof d.status === 'object' &&
      d.status !== null &&
      typeof (d.status as Record<string, unknown>).state === 'string' &&
      typeof d.actionOnFailure === 'string'
    );
  }

  /**
   * Type guard for EMR notebook capability data
   */
  private isEmrNotebookCapabilityData(data: unknown): data is EmrNotebookCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'emr:notebook' &&
      typeof d.notebookExecutionId === 'string' &&
      typeof d.status === 'string' &&
      typeof d.editorId === 'string' &&
      typeof d.executionEngineId === 'string'
    );
  }

  /**
   * Get EMR Serverless actions for access level
   */
  private getEmrServerlessActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const actions: string[] = [];
    const resources: string[] = [];

    // Read actions are included for read, write, and readwrite access
    // (write access needs read to verify operations)
    if (access === 'read' || access === 'write' || access === 'readwrite') {
      actions.push(
        'emr-serverless:GetApplication',
        'emr-serverless:ListApplications',
        'emr-serverless:ListJobRuns',
        'emr-serverless:GetJobRun'
      );
    }

    if (access === 'write' || access === 'readwrite') {
      actions.push(
        'emr-serverless:CreateApplication',
        'emr-serverless:DeleteApplication',
        'emr-serverless:UpdateApplication',
        'emr-serverless:StartApplication',
        'emr-serverless:StopApplication',
        'emr-serverless:StartJobRun',
        'emr-serverless:CancelJobRun'
      );
    }

    // Get application ARN from target if available
    const targetCapabilities = context.target.getCapabilities();
    const serverlessData = targetCapabilities['emr:serverless'] as EmrServerlessCapabilityData | undefined;
    if (serverlessData?.applicationArn) {
      resources.push(serverlessData.applicationArn);
    } else {
      // Fallback to wildcard if ARN not available
      resources.push('*');
    }

    return { actions, resources };
  }

  /**
   * Type guard for EMR Serverless capability data
   */
  private isEmrServerlessCapabilityData(data: unknown): data is EmrServerlessCapabilityData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const d = data as Record<string, unknown>;
    return (
      d.type === 'emr:serverless' &&
      typeof d.applicationId === 'string' &&
      typeof d.applicationArn === 'string' &&
      typeof d.name === 'string' &&
      typeof d.state === 'string' &&
      typeof d.releaseLabel === 'string'
    );
  }
}
