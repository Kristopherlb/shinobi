/**
 * EKS Binder Strategy
 * Handles Kubernetes service bindings for Amazon EKS clusters
 */

import { IBinderStrategy } from '../binder-strategy.js';
import { BindingContext } from '../../binding-context.js';
import { ComponentBinding } from '../../component-binding.js';
// Compliance framework branching removed; use binding.options/config instead

export class EksBinderStrategy implements IBinderStrategy {
  readonly supportedCapabilities = ['eks:cluster', 'eks:nodegroup', 'eks:pod', 'eks:service'];

  async bind(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { capability, access } = binding;

    switch (capability) {
      case 'eks:cluster':
        await this.bindToCluster(sourceComponent, targetComponent, binding, context);
        break;
      case 'eks:nodegroup':
        await this.bindToNodeGroup(sourceComponent, targetComponent, binding, context);
        break;
      case 'eks:pod':
        await this.bindToPod(sourceComponent, targetComponent, binding, context);
        break;
      case 'eks:service':
        await this.bindToService(sourceComponent, targetComponent, binding, context);
        break;
      default:
        throw new Error(`Unsupported EKS capability: ${capability}`);
    }
  }

  private async bindToCluster(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant EKS cluster access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'eks:DescribeCluster',
          'eks:ListClusters',
          'eks:DescribeNodegroup',
          'eks:ListNodegroups'
        ],
        Resource: targetComponent.clusterArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'eks:CreateNodegroup',
          'eks:UpdateNodegroup',
          'eks:DeleteNodegroup',
          'eks:UpdateClusterConfig',
          'eks:UpdateClusterVersion'
        ],
        Resource: [
          targetComponent.clusterArn,
          `arn:aws:eks:${context.region}:${context.accountId}:nodegroup/${targetComponent.clusterName}/*`
        ]
      });
    }

    // Grant Kubernetes API access
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'eks:AccessKubernetesApi',
        'eks:DescribeCluster'
      ],
      Resource: targetComponent.clusterArn
    });

    // Inject cluster environment variables
    sourceComponent.addEnvironment('EKS_CLUSTER_NAME', targetComponent.clusterName);
    sourceComponent.addEnvironment('EKS_CLUSTER_ARN', targetComponent.clusterArn);
    sourceComponent.addEnvironment('EKS_CLUSTER_ENDPOINT', targetComponent.clusterEndpoint);
    sourceComponent.addEnvironment('EKS_CLUSTER_CA_CERT', targetComponent.clusterCertificateAuthority);

    // Configure kubectl access
    sourceComponent.addEnvironment('KUBECONFIG', `/tmp/kubeconfig-${targetComponent.clusterName}`);
  }

  private async bindToNodeGroup(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant node group access permissions
    if (access.includes('read')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'eks:DescribeNodegroup',
          'eks:ListNodegroups'
        ],
        Resource: targetComponent.nodeGroupArn
      });
    }

    if (access.includes('write')) {
      sourceComponent.addToRolePolicy({
        Effect: 'Allow',
        Action: [
          'eks:UpdateNodegroup',
          'eks:DeleteNodegroup',
          'eks:CreateNodegroup'
        ],
        Resource: targetComponent.nodeGroupArn
      });
    }

    // Inject node group environment variables
    sourceComponent.addEnvironment('EKS_NODEGROUP_NAME', targetComponent.nodeGroupName);
    sourceComponent.addEnvironment('EKS_NODEGROUP_ARN', targetComponent.nodeGroupArn);
    sourceComponent.addEnvironment('EKS_NODEGROUP_INSTANCE_TYPES', targetComponent.instanceTypes.join(','));
  }

  private async bindToPod(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant pod access permissions (via Kubernetes RBAC)
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'eks:AccessKubernetesApi'
      ],
      Resource: targetComponent.clusterArn
    });

    // Configure pod-level environment variables
    sourceComponent.addEnvironment('KUBERNETES_NAMESPACE', targetComponent.namespace || 'default');
    sourceComponent.addEnvironment('KUBERNETES_POD_NAME', targetComponent.podName);
    sourceComponent.addEnvironment('KUBERNETES_SERVICE_ACCOUNT', targetComponent.serviceAccount);

    // Configure service mesh access if requested by manifest/config
    if (binding.options?.enableServiceMesh) {
      await this.configureServiceMeshAccess(sourceComponent, targetComponent, context);
    }
  }

  private async bindToService(
    sourceComponent: any,
    targetComponent: any,
    binding: ComponentBinding,
    context: BindingContext
  ): Promise<void> {
    const { access } = binding;

    // Grant Kubernetes service access
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'eks:AccessKubernetesApi'
      ],
      Resource: targetComponent.clusterArn
    });

    // Inject service environment variables
    sourceComponent.addEnvironment('KUBERNETES_SERVICE_NAME', targetComponent.serviceName);
    sourceComponent.addEnvironment('KUBERNETES_SERVICE_PORT', targetComponent.servicePort.toString());
    sourceComponent.addEnvironment('KUBERNETES_SERVICE_PROTOCOL', targetComponent.serviceProtocol);

    // Configure load balancer access for external services
    if (targetComponent.serviceType === 'LoadBalancer') {
      sourceComponent.addEnvironment('LOAD_BALANCER_HOSTNAME', targetComponent.loadBalancerHostname);
      sourceComponent.addEnvironment('LOAD_BALANCER_IP', targetComponent.loadBalancerIP);
    }
  }

  private async configureServiceMeshAccess(
    sourceComponent: any,
    targetComponent: any,
    context: BindingContext
  ): Promise<void> {
    // Configure AWS App Mesh for secure service-to-service communication
    sourceComponent.addEnvironment('APPMESH_VIRTUAL_NODE_NAME', targetComponent.virtualNodeName);
    sourceComponent.addEnvironment('APPMESH_VIRTUAL_SERVICE_NAME', targetComponent.virtualServiceName);

    // Grant App Mesh permissions
    sourceComponent.addToRolePolicy({
      Effect: 'Allow',
      Action: [
        'appmesh:DescribeVirtualNode',
        'appmesh:DescribeVirtualService'
      ],
      Resource: [
        `arn:aws:appmesh:${context.region}:${context.accountId}:mesh/${targetComponent.meshName}/virtualNode/${targetComponent.virtualNodeName}`,
        `arn:aws:appmesh:${context.region}:${context.accountId}:mesh/${targetComponent.meshName}/virtualService/${targetComponent.virtualServiceName}`
      ]
    });
  }
}
