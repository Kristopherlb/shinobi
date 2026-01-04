/**
 * EKS Binder Strategy (Unified)
 * Handles Kubernetes service bindings for Amazon EKS clusters with mandatory compliance enforcement
 */

import { UnifiedBinderStrategyBase, resolveActions } from '@shinobi/core';
import type { BindingContext, EnhancedBindingResult, CompatibilityEntry } from '@shinobi/core';
import type { IamPolicy } from '@shinobi/core';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * EKS Cluster capability data structure
 * @property type - Capability type identifier
 * @property clusterArn - EKS cluster ARN (required)
 * @property clusterName - EKS cluster name (required)
 * @property clusterEndpoint - EKS cluster endpoint URL (required)
 * @property clusterCertificateAuthority - Cluster CA certificate (optional)
 * @property version - Kubernetes version (optional)
 * @property status - Cluster status (optional)
 */
interface EksClusterCapabilityData {
  type: 'eks:cluster';
  clusterArn: string;
  clusterName: string;
  clusterEndpoint: string;
  clusterCertificateAuthority?: string;
  version?: string;
  status?: string;
}

/**
 * EKS Node Group capability data structure
 * @property type - Capability type identifier
 * @property nodeGroupArn - Node group ARN (required)
 * @property nodeGroupName - Node group name (required)
 * @property clusterName - EKS cluster name (required)
 * @property instanceTypes - Instance types used by the node group (optional)
 * @property scalingConfig - Scaling configuration (optional)
 */
interface EksNodeGroupCapabilityData {
  type: 'eks:nodegroup';
  nodeGroupArn: string;
  nodeGroupName: string;
  clusterName: string;
  instanceTypes?: string[];
  scalingConfig?: {
    minSize?: number;
    maxSize?: number;
    desiredSize?: number;
  };
}

/**
 * EKS Pod capability data structure
 * @property type - Capability type identifier
 * @property clusterArn - EKS cluster ARN (required)
 * @property clusterName - EKS cluster name (required)
 * @property namespace - Kubernetes namespace (optional, defaults to 'default')
 * @property podName - Pod name (optional)
 * @property serviceAccount - Kubernetes service account name (optional)
 */
interface EksPodCapabilityData {
  type: 'eks:pod';
  clusterArn: string;
  clusterName: string;
  namespace?: string;
  podName?: string;
  serviceAccount?: string;
}

/**
 * EKS Service capability data structure
 * @property type - Capability type identifier
 * @property clusterArn - EKS cluster ARN (required)
 * @property clusterName - EKS cluster name (required)
 * @property serviceName - Kubernetes service name (required)
 * @property servicePort - Service port number (optional)
 * @property serviceProtocol - Service protocol (optional, defaults to 'TCP')
 * @property serviceType - Service type (optional, e.g., 'LoadBalancer', 'ClusterIP')
 * @property loadBalancerHostname - Load balancer hostname (optional, for LoadBalancer type)
 * @property loadBalancerIP - Load balancer IP (optional, for LoadBalancer type)
 */
interface EksServiceCapabilityData {
  type: 'eks:service';
  clusterArn: string;
  clusterName: string;
  serviceName: string;
  servicePort?: number;
  serviceProtocol?: string;
  serviceType?: string;
  loadBalancerHostname?: string;
  loadBalancerIP?: string;
}

type EksCapabilityData =
  | EksClusterCapabilityData
  | EksNodeGroupCapabilityData
  | EksPodCapabilityData
  | EksServiceCapabilityData;

export class EksBinderStrategy extends UnifiedBinderStrategyBase {
  readonly supportedCapabilities = [
    'eks:cluster',
    'eks:nodegroup',
    'eks:pod',
    'eks:service'
  ];

  getStrategyName(): string {
    return 'EKS Binder Strategy';
  }

  canHandle(sourceType: string, targetCapability: string): boolean {
    return this.supportedCapabilities.includes(targetCapability);
  }

  getCompatibilityMatrix(): CompatibilityEntry[] {
    return [
      {
        sourceType: '*',
        targetType: 'eks-cluster',
        capability: 'eks:cluster',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to EKS cluster for Kubernetes orchestration',
        examples: ['lambda-api -> eks:cluster (read)', 'eks-pod -> eks:cluster (write)']
      },
      {
        sourceType: '*',
        targetType: 'eks-nodegroup',
        capability: 'eks:nodegroup',
        supportedAccess: ['read', 'write', 'readwrite', 'admin'],
        description: 'Bind to EKS node group for node management',
        examples: ['lambda-api -> eks:nodegroup (read)', 'eks-cluster -> eks:nodegroup (write)']
      },
      {
        sourceType: '*',
        targetType: 'eks-pod',
        capability: 'eks:pod',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to EKS pod for pod-level operations',
        examples: ['lambda-api -> eks:pod (read)', 'eks-service -> eks:pod (write)']
      },
      {
        sourceType: '*',
        targetType: 'eks-service',
        capability: 'eks:service',
        supportedAccess: ['read', 'write', 'readwrite'],
        description: 'Bind to Kubernetes service for service discovery',
        examples: ['lambda-api -> eks:service (read)', 'eks-pod -> eks:service (write)']
      }
    ];
  }

  protected async doBind(context: BindingContext): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    const { source, target, directive } = context;
    const { capability } = directive;

    // Validate inputs
    if (!target) {
      throw new Error('Target component is required for EKS binding');
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
      throw new Error(`Invalid access types for EKS binding: ${invalidAccess.join(', ')}. Valid types: ${validAccessTypes.join(', ')}`);
    }
    if (access.length === 0) {
      throw new Error('Access cannot be empty for EKS binding');
    }

    // Get target capability data
    const targetCapabilities = target.getCapabilities();
    const targetCapabilityData = targetCapabilities[capability];
    if (!targetCapabilityData) {
      throw new Error(`Target component does not provide capability '${capability}'`);
    }

    // Route to appropriate binding method based on capability
    if (capability === 'eks:cluster') {
      return await this.bindToCluster(context, targetCapabilityData, access);
    } else if (capability === 'eks:nodegroup') {
      return await this.bindToNodeGroup(context, targetCapabilityData, access);
    } else if (capability === 'eks:pod') {
      return await this.bindToPod(context, targetCapabilityData, access);
    } else if (capability === 'eks:service') {
      return await this.bindToService(context, targetCapabilityData, access);
    } else {
      throw new Error(`Unsupported EKS capability: ${capability}`);
    }
  }

  /**
   * Bind to EKS cluster
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EksClusterCapabilityData):
   *   - type: 'eks:cluster'
   *   - clusterArn (required): EKS cluster ARN
   *   - clusterName (required): EKS cluster name
   *   - clusterEndpoint (required): EKS cluster endpoint URL
   *   - clusterCertificateAuthority (optional): Cluster CA certificate
   *   - version (optional): Kubernetes version
   *   - status (optional): Cluster status
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToCluster(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEksClusterCapabilityData(targetData)) {
      throw new Error('Invalid EKS cluster capability data structure. Expected clusterArn, clusterName, and clusterEndpoint.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Get base actions and resources
    const baseActions = this.getEksClusterActionsForAccess(primaryAccess, context);
    
    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getEksClusterActionsForAccess(acc, context).actions,
      'eks'
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
        description: `EKS cluster ${primaryAccess} access`,
        complianceRequirement: `EKS cluster ${primaryAccess} access policy`
      });
    }

    // Grant Kubernetes API access (required for all cluster bindings)
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'eks:AccessKubernetesApi',
          'eks:DescribeCluster'
        ],
        resources: [targetData.clusterArn]
      }),
      description: 'Kubernetes API access permissions',
      complianceRequirement: 'Kubernetes API access for cluster operations'
    });

    // Get region and account ID from target component context
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    // Set environment variables
    environmentVariables['EKS_CLUSTER_NAME'] = targetData.clusterName;
    environmentVariables['EKS_CLUSTER_ARN'] = targetData.clusterArn;
    environmentVariables['EKS_CLUSTER_ENDPOINT'] = targetData.clusterEndpoint;
    environmentVariables['AWS_REGION'] = region;

    if (targetData.clusterCertificateAuthority) {
      environmentVariables['EKS_CLUSTER_CA_CERT'] = targetData.clusterCertificateAuthority;
    }

    if (targetData.version) {
      environmentVariables['EKS_CLUSTER_VERSION'] = targetData.version;
    }

    if (targetData.status) {
      environmentVariables['EKS_CLUSTER_STATUS'] = targetData.status;
    }

    // Configure kubectl access
    environmentVariables['KUBECONFIG'] = `/tmp/kubeconfig-${targetData.clusterName}`;

    // Configure service mesh access if requested via options
    if (context.directive.options?.enableServiceMesh === true) {
      await this.configureServiceMeshAccess(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to EKS node group
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EksNodeGroupCapabilityData):
   *   - type: 'eks:nodegroup'
   *   - nodeGroupArn (required): Node group ARN
   *   - nodeGroupName (required): Node group name
   *   - clusterName (required): EKS cluster name
   *   - instanceTypes (optional): Instance types used by the node group
   *   - scalingConfig (optional): Scaling configuration
   * @param access - Array of access levels (read, write, readwrite, admin)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToNodeGroup(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEksNodeGroupCapabilityData(targetData)) {
      throw new Error('Invalid EKS node group capability data structure. Expected nodeGroupArn, nodeGroupName, and clusterName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Determine primary access level for action mapping
    const primaryAccess = access.includes('admin') ? 'admin' : access.includes('readwrite') ? 'readwrite' : access.includes('write') ? 'write' : 'read';

    // Resolve actions (granular override or coarse access)
    const resolvedActions = resolveActions(
      context.directive,
      context,
      (acc) => this.getEksNodeGroupActionsForAccess(acc, context),
      'eks'
    );

    // Create IAM policies based on access level
    if (resolvedActions.length > 0) {
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: resolvedActions,
          resources: [targetData.nodeGroupArn]
        }),
        description: `EKS node group ${primaryAccess} access`,
        complianceRequirement: `EKS node group ${primaryAccess} access policy`
      });
    }

    // Set environment variables
    environmentVariables['EKS_NODEGROUP_NAME'] = targetData.nodeGroupName;
    environmentVariables['EKS_NODEGROUP_ARN'] = targetData.nodeGroupArn;
    environmentVariables['EKS_CLUSTER_NAME'] = targetData.clusterName;

    if (targetData.instanceTypes && targetData.instanceTypes.length > 0) {
      environmentVariables['EKS_NODEGROUP_INSTANCE_TYPES'] = targetData.instanceTypes.join(',');
    }

    // Always expose scaling config env vars (set to empty string if not provided for visibility)
    if (targetData.scalingConfig) {
      environmentVariables['EKS_NODEGROUP_MIN_SIZE'] = targetData.scalingConfig.minSize?.toString() ?? '';
      environmentVariables['EKS_NODEGROUP_MAX_SIZE'] = targetData.scalingConfig.maxSize?.toString() ?? '';
      environmentVariables['EKS_NODEGROUP_DESIRED_SIZE'] = targetData.scalingConfig.desiredSize?.toString() ?? '';
    } else {
      // Expose empty values to indicate scaling config is not configured
      environmentVariables['EKS_NODEGROUP_MIN_SIZE'] = '';
      environmentVariables['EKS_NODEGROUP_MAX_SIZE'] = '';
      environmentVariables['EKS_NODEGROUP_DESIRED_SIZE'] = '';
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to EKS pod
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EksPodCapabilityData):
   *   - type: 'eks:pod'
   *   - clusterArn (required): EKS cluster ARN
   *   - clusterName (required): EKS cluster name
   *   - namespace (optional): Kubernetes namespace (defaults to 'default')
   *   - podName (optional): Pod name
   *   - serviceAccount (optional): Kubernetes service account name
   * @param access - Array of access levels (read, write, readwrite)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToPod(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEksPodCapabilityData(targetData)) {
      throw new Error('Invalid EKS pod capability data structure. Expected clusterArn and clusterName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Grant Kubernetes API access for pod operations
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'eks:AccessKubernetesApi'
        ],
        resources: [targetData.clusterArn]
      }),
      description: 'Kubernetes API access for pod operations',
      complianceRequirement: 'Kubernetes pod access permissions'
    });

    // Set environment variables
    environmentVariables['KUBERNETES_NAMESPACE'] = targetData.namespace || 'default';
    environmentVariables['EKS_CLUSTER_NAME'] = targetData.clusterName;
    environmentVariables['EKS_CLUSTER_ARN'] = targetData.clusterArn;

    if (targetData.podName) {
      environmentVariables['KUBERNETES_POD_NAME'] = targetData.podName;
    }

    if (targetData.serviceAccount) {
      environmentVariables['KUBERNETES_SERVICE_ACCOUNT'] = targetData.serviceAccount;
    }

    // Configure service mesh access if requested via options
    if (context.directive.options?.enableServiceMesh === true) {
      await this.configureServiceMeshAccess(context, targetData, environmentVariables, iamPolicies);
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Bind to Kubernetes service
   * 
   * @param context - Binding context
   * @param targetData - Expected structure (EksServiceCapabilityData):
   *   - type: 'eks:service'
   *   - clusterArn (required): EKS cluster ARN
   *   - clusterName (required): EKS cluster name
   *   - serviceName (required): Kubernetes service name
   *   - servicePort (optional): Service port number
   *   - serviceProtocol (optional): Service protocol (defaults to 'TCP')
   *   - serviceType (optional): Service type (e.g., 'LoadBalancer', 'ClusterIP')
   *   - loadBalancerHostname (optional): Load balancer hostname (for LoadBalancer type)
   *   - loadBalancerIP (optional): Load balancer IP (for LoadBalancer type)
   * @param access - Array of access levels (read, write, readwrite)
   * @returns Enhanced binding result without compliance block
   */
  private async bindToService(
    context: BindingContext,
    targetData: unknown,
    access: string[]
  ): Promise<Omit<EnhancedBindingResult, 'compliance'>> {
    if (!this.isEksServiceCapabilityData(targetData)) {
      throw new Error('Invalid EKS service capability data structure. Expected clusterArn, clusterName, and serviceName.');
    }

    const iamPolicies: IamPolicy[] = [];
    const environmentVariables: Record<string, string> = {};

    // Grant Kubernetes API access for service operations
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'eks:AccessKubernetesApi'
        ],
        resources: [targetData.clusterArn]
      }),
      description: 'Kubernetes API access for service operations',
      complianceRequirement: 'Kubernetes service access permissions'
    });

    // Set environment variables with defaults
    environmentVariables['KUBERNETES_SERVICE_NAME'] = targetData.serviceName;
    environmentVariables['EKS_CLUSTER_NAME'] = targetData.clusterName;
    environmentVariables['EKS_CLUSTER_ARN'] = targetData.clusterArn;
    
    // Set port with default (80 if not specified)
    environmentVariables['KUBERNETES_SERVICE_PORT'] = (targetData.servicePort ?? 80).toString();
    
    // Set protocol with default (TCP if not specified)
    environmentVariables['KUBERNETES_SERVICE_PROTOCOL'] = targetData.serviceProtocol ?? 'TCP';
    
    // Set service type if provided
    if (targetData.serviceType) {
      environmentVariables['KUBERNETES_SERVICE_TYPE'] = targetData.serviceType;
    }

    // Configure load balancer metadata for external services
    if (targetData.serviceType === 'LoadBalancer') {
      if (targetData.loadBalancerHostname) {
        environmentVariables['LOAD_BALANCER_HOSTNAME'] = targetData.loadBalancerHostname;
      }
      if (targetData.loadBalancerIP) {
        environmentVariables['LOAD_BALANCER_IP'] = targetData.loadBalancerIP;
      }
      // Expose load balancer metadata even if not provided (empty string for visibility)
      if (!targetData.loadBalancerHostname) {
        environmentVariables['LOAD_BALANCER_HOSTNAME'] = '';
      }
      if (!targetData.loadBalancerIP) {
        environmentVariables['LOAD_BALANCER_IP'] = '';
      }
    }

    return {
      iamPolicies,
      environmentVariables,
      securityGroupRules: [] // Network binding handled separately
    };
  }

  /**
   * Configure service mesh access (AWS App Mesh)
   * Applies additional configurations when enableServiceMesh is enabled
   * Always grants App Mesh permissions when enabled, even if specific mesh details aren't provided
   */
  private async configureServiceMeshAccess(
    context: BindingContext,
    targetData: any,
    environmentVariables: Record<string, string>,
    iamPolicies: IamPolicy[]
  ): Promise<void> {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    // Always grant basic App Mesh permissions when service mesh is enabled
    iamPolicies.push({
      statement: new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'appmesh:DescribeMesh',
          'appmesh:ListMeshes',
          'appmesh:DescribeVirtualNode',
          'appmesh:ListVirtualNodes',
          'appmesh:DescribeVirtualService',
          'appmesh:ListVirtualServices'
        ],
        resources: [`arn:aws:appmesh:${region}:${accountId}:mesh/*`]
      }),
      description: 'App Mesh basic access permissions for service mesh operations',
      complianceRequirement: 'Service mesh access for secure service-to-service communication'
    });

    // Configure App Mesh if virtual node/service names are provided
    if (targetData.virtualNodeName && targetData.meshName) {
      environmentVariables['APPMESH_VIRTUAL_NODE_NAME'] = targetData.virtualNodeName;
      environmentVariables['APPMESH_MESH_NAME'] = targetData.meshName;

      // Grant specific virtual node permissions
      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'appmesh:DescribeVirtualNode',
            'appmesh:DescribeVirtualService'
          ],
          resources: [
            `arn:aws:appmesh:${region}:${accountId}:mesh/${targetData.meshName}/virtualNode/${targetData.virtualNodeName}`
          ]
        }),
        description: 'App Mesh virtual node access permissions',
        complianceRequirement: 'Service mesh access for secure service-to-service communication'
      });
    }

    if (targetData.virtualServiceName && targetData.meshName) {
      environmentVariables['APPMESH_VIRTUAL_SERVICE_NAME'] = targetData.virtualServiceName;

      iamPolicies.push({
        statement: new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'appmesh:DescribeVirtualService'
          ],
          resources: [
            `arn:aws:appmesh:${region}:${accountId}:mesh/${targetData.meshName}/virtualService/${targetData.virtualServiceName}`
          ]
        }),
        description: 'App Mesh virtual service access permissions',
        complianceRequirement: 'Service mesh access for secure service-to-service communication'
      });
    }
  }

  /**
   * Get EKS cluster IAM actions and resources for access level
   */
  private getEksClusterActionsForAccess(
    access: string,
    context: BindingContext
  ): { actions: string[]; resources: string[] } {
    const region = (context.target.context as any)?.region || process.env.AWS_REGION || 'us-east-1';
    const accountId = (context.target.context as any)?.accountId || '123456789012';

    switch (access) {
      case 'read':
        return {
          actions: [
            'eks:DescribeCluster',
            'eks:ListClusters',
            'eks:DescribeNodegroup',
            'eks:ListNodegroups'
          ],
          resources: ['*'] // DescribeCluster requires * or specific ARN
        };
      case 'write':
      case 'readwrite':
        return {
          actions: [
            'eks:DescribeCluster',
            'eks:ListClusters',
            'eks:DescribeNodegroup',
            'eks:ListNodegroups',
            'eks:CreateNodegroup',
            'eks:UpdateNodegroup',
            'eks:DeleteNodegroup',
            'eks:UpdateClusterConfig',
            'eks:UpdateClusterVersion'
          ],
          resources: [
            '*', // For DescribeCluster
            `arn:aws:eks:${region}:${accountId}:nodegroup/*/*`
          ]
        };
      case 'admin':
        // Admin access includes high-privilege actions (tagging, identity provider management)
        // Consider requiring explicit opt-in via directive.options.allowAdminOperations for production use
        const adminActions = [
          'eks:DescribeCluster',
          'eks:ListClusters',
          'eks:DescribeNodegroup',
          'eks:ListNodegroups',
          'eks:CreateNodegroup',
          'eks:UpdateNodegroup',
          'eks:DeleteNodegroup',
          'eks:UpdateClusterConfig',
          'eks:UpdateClusterVersion'
        ];

        // Only include high-privilege admin actions if explicitly allowed
        if (context.directive.options?.allowAdminOperations === true) {
          adminActions.push(
            'eks:TagResource',
            'eks:UntagResource',
            'eks:AssociateIdentityProviderConfig',
            'eks:DisassociateIdentityProviderConfig'
          );
        }

        return {
          actions: adminActions,
          resources: [
            '*',
            `arn:aws:eks:${region}:${accountId}:nodegroup/*/*`,
            `arn:aws:eks:${region}:${accountId}:cluster/*`
          ]
        };
      default:
        return { actions: [], resources: [] };
    }
  }

  /**
   * Get EKS node group IAM actions for access level
   */
  private getEksNodeGroupActionsForAccess(access: string, context: BindingContext): string[] {
    switch (access) {
      case 'read':
        return [
          'eks:DescribeNodegroup',
          'eks:ListNodegroups'
        ];
      case 'write':
      case 'readwrite':
        return [
          'eks:DescribeNodegroup',
          'eks:ListNodegroups',
          'eks:UpdateNodegroup',
          'eks:DeleteNodegroup',
          'eks:CreateNodegroup'
        ];
      case 'admin':
        // Admin access includes high-privilege actions (tagging)
        // Consider requiring explicit opt-in via directive.options.allowAdminOperations for production use
        const adminActions = [
          'eks:DescribeNodegroup',
          'eks:ListNodegroups',
          'eks:UpdateNodegroup',
          'eks:DeleteNodegroup',
          'eks:CreateNodegroup'
        ];

        // Only include high-privilege admin actions if explicitly allowed
        if (context.directive.options?.allowAdminOperations === true) {
          adminActions.push('eks:TagResource', 'eks:UntagResource');
        }

        return adminActions;
      default:
        return [];
    }
  }

  // Type guards

  private isEksClusterCapabilityData(data: unknown): data is EksClusterCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'eks:cluster' &&
      typeof d.clusterArn === 'string' &&
      typeof d.clusterName === 'string' &&
      typeof d.clusterEndpoint === 'string'
    );
  }

  private isEksNodeGroupCapabilityData(data: unknown): data is EksNodeGroupCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'eks:nodegroup' &&
      typeof d.nodeGroupArn === 'string' &&
      typeof d.nodeGroupName === 'string' &&
      typeof d.clusterName === 'string'
    );
  }

  private isEksPodCapabilityData(data: unknown): data is EksPodCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'eks:pod' &&
      typeof d.clusterArn === 'string' &&
      typeof d.clusterName === 'string'
    );
  }

  private isEksServiceCapabilityData(data: unknown): data is EksServiceCapabilityData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return (
      d.type === 'eks:service' &&
      typeof d.clusterArn === 'string' &&
      typeof d.clusterName === 'string' &&
      typeof d.serviceName === 'string'
    );
  }
}
