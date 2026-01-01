/**
 * Unit Tests: EKS Binder Strategy (Unified)
 * Tests for EKS Kubernetes orchestration bindings with compliance enforcement
 */

import { EksBinderStrategy } from '../eks-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('EksBinderStrategy', () => {
  describe('EksBind__ValidClusterAccess__ReturnsClusterEnvVars', () => {
    const metadata = {
      id: 'TP-binders-eks-001',
      level: 'unit' as const,
      capability: 'Returns EKS cluster environment variables for valid cluster access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ValidClusterAccess',
        outcome: 'ReturnsClusterEnvVars'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include EKS_CLUSTER_NAME, EKS_CLUSTER_ARN, EKS_CLUSTER_ENDPOINT',
        'IAM policies include EKS read actions (DescribeCluster, ListClusters)',
        'IAM policies include Kubernetes API access (AccessKubernetesApi)',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:cluster capability and read access',
        notes: 'Basic EKS cluster read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ValidClusterAccess__ReturnsClusterEnvVars', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-cluster', {
        'eks:cluster': {
          type: 'eks:cluster',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          clusterEndpoint: 'https://ABC.gr7.us-east-1.eks.amazonaws.com',
          clusterCertificateAuthority: 'BASE64CACERT'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:cluster',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Cluster environment variables are set
      expect(result.environmentVariables['EKS_CLUSTER_NAME']).toBe('test-cluster');
      expect(result.environmentVariables['EKS_CLUSTER_ARN']).toBe('arn:aws:eks:us-east-1:123456789012:cluster/test-cluster');
      expect(result.environmentVariables['EKS_CLUSTER_ENDPOINT']).toBe('https://ABC.gr7.us-east-1.eks.amazonaws.com');
      expect(result.environmentVariables['EKS_CLUSTER_CA_CERT']).toBe('BASE64CACERT');
      expect(result.environmentVariables['KUBECONFIG']).toContain('kubeconfig-test-cluster');
      
      // Assert IAM policies include EKS read actions
      const clusterPolicy = result.iamPolicies.find(p => p.description.includes('cluster') && p.description.includes('read'));
      expect(clusterPolicy).toBeDefined();
      expect(clusterPolicy!.statement.actions).toContain('eks:DescribeCluster');
      expect(clusterPolicy!.statement.actions).toContain('eks:ListClusters');
      
      // Assert Kubernetes API access is granted
      const apiPolicy = result.iamPolicies.find(p => p.description.includes('Kubernetes API'));
      expect(apiPolicy).toBeDefined();
      expect(apiPolicy!.statement.actions).toContain('eks:AccessKubernetesApi');
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('EksBind__ClusterWriteAccess__GrantsClusterWriteActions', () => {
    const metadata = {
      id: 'TP-binders-eks-002',
      level: 'unit' as const,
      capability: 'Grants EKS cluster write actions including CreateNodegroup and UpdateClusterConfig for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ClusterWriteAccess',
        outcome: 'GrantsClusterWriteActions'
      },
      invariants: [
        'IAM policies include EKS write actions (CreateNodegroup, UpdateNodegroup, DeleteNodegroup, UpdateClusterConfig)',
        'Read actions are included in write access',
        'Resources include node group ARNs'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:cluster capability and write access',
        notes: 'EKS cluster write access with node group management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ClusterWriteAccess__GrantsClusterWriteActions', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-cluster', {
        'eks:cluster': {
          type: 'eks:cluster',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          clusterEndpoint: 'https://ABC.gr7.us-east-1.eks.amazonaws.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:cluster',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('cluster') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('eks:CreateNodegroup');
      expect(writePolicy!.statement.actions).toContain('eks:UpdateNodegroup');
      expect(writePolicy!.statement.actions).toContain('eks:DeleteNodegroup');
      expect(writePolicy!.statement.actions).toContain('eks:UpdateClusterConfig');
      expect(writePolicy!.statement.actions).toContain('eks:DescribeCluster');
    });
  });

  describe('EksBind__ValidNodeGroupAccess__ReturnsNodeGroupEnvVars', () => {
    const metadata = {
      id: 'TP-binders-eks-003',
      level: 'unit' as const,
      capability: 'Returns EKS node group environment variables for valid node group access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ValidNodeGroupAccess',
        outcome: 'ReturnsNodeGroupEnvVars'
      },
      invariants: [
        'Environment variables include EKS_NODEGROUP_NAME, EKS_NODEGROUP_ARN, EKS_CLUSTER_NAME',
        'IAM policies include EKS node group read actions',
        'Instance types are included in environment variables if provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:nodegroup capability and read access',
        notes: 'Basic EKS node group read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ValidNodeGroupAccess__ReturnsNodeGroupEnvVars', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-nodegroup', {
        'eks:nodegroup': {
          type: 'eks:nodegroup',
          nodeGroupArn: 'arn:aws:eks:us-east-1:123456789012:nodegroup/test-cluster/test-nodegroup/abc123',
          nodeGroupName: 'test-nodegroup',
          clusterName: 'test-cluster',
          instanceTypes: ['t3.medium', 't3.large']
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:nodegroup',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Node group environment variables are set
      expect(result.environmentVariables['EKS_NODEGROUP_NAME']).toBe('test-nodegroup');
      expect(result.environmentVariables['EKS_NODEGROUP_ARN']).toBe('arn:aws:eks:us-east-1:123456789012:nodegroup/test-cluster/test-nodegroup/abc123');
      expect(result.environmentVariables['EKS_CLUSTER_NAME']).toBe('test-cluster');
      expect(result.environmentVariables['EKS_NODEGROUP_INSTANCE_TYPES']).toBe('t3.medium,t3.large');
      
      // Assert IAM policies include node group read actions
      const nodeGroupPolicy = result.iamPolicies.find(p => p.description.includes('node group') && p.description.includes('read'));
      expect(nodeGroupPolicy).toBeDefined();
      expect(nodeGroupPolicy!.statement.actions).toContain('eks:DescribeNodegroup');
      expect(nodeGroupPolicy!.statement.actions).toContain('eks:ListNodegroups');
    });
  });

  describe('EksBind__ValidPodAccess__ReturnsPodEnvVars', () => {
    const metadata = {
      id: 'TP-binders-eks-004',
      level: 'unit' as const,
      capability: 'Returns EKS pod environment variables for valid pod access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ValidPodAccess',
        outcome: 'ReturnsPodEnvVars'
      },
      invariants: [
        'Environment variables include KUBERNETES_NAMESPACE, EKS_CLUSTER_NAME, EKS_CLUSTER_ARN',
        'IAM policies include Kubernetes API access (AccessKubernetesApi)',
        'Namespace defaults to "default" if not provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:pod capability and read access',
        notes: 'Basic EKS pod read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ValidPodAccess__ReturnsPodEnvVars', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-pod', {
        'eks:pod': {
          type: 'eks:pod',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          namespace: 'production',
          podName: 'test-pod',
          serviceAccount: 'test-service-account'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:pod',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Pod environment variables are set
      expect(result.environmentVariables['KUBERNETES_NAMESPACE']).toBe('production');
      expect(result.environmentVariables['KUBERNETES_POD_NAME']).toBe('test-pod');
      expect(result.environmentVariables['KUBERNETES_SERVICE_ACCOUNT']).toBe('test-service-account');
      expect(result.environmentVariables['EKS_CLUSTER_NAME']).toBe('test-cluster');
      expect(result.environmentVariables['EKS_CLUSTER_ARN']).toBe('arn:aws:eks:us-east-1:123456789012:cluster/test-cluster');
      
      // Assert IAM policies include Kubernetes API access
      const apiPolicy = result.iamPolicies.find(p => p.description.includes('pod'));
      expect(apiPolicy).toBeDefined();
      expect(apiPolicy!.statement.actions).toContain('eks:AccessKubernetesApi');
    });
  });

  describe('EksBind__ValidServiceAccess__ReturnsServiceEnvVars', () => {
    const metadata = {
      id: 'TP-binders-eks-005',
      level: 'unit' as const,
      capability: 'Returns Kubernetes service environment variables for valid service access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ValidServiceAccess',
        outcome: 'ReturnsServiceEnvVars'
      },
      invariants: [
        'Environment variables include KUBERNETES_SERVICE_NAME, EKS_CLUSTER_NAME, EKS_CLUSTER_ARN',
        'IAM policies include Kubernetes API access (AccessKubernetesApi)',
        'Load balancer environment variables are set for LoadBalancer service type'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:service capability and read access',
        notes: 'Basic Kubernetes service read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ValidServiceAccess__ReturnsServiceEnvVars', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-service', {
        'eks:service': {
          type: 'eks:service',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          serviceName: 'test-service',
          servicePort: 8080,
          serviceProtocol: 'TCP',
          serviceType: 'LoadBalancer',
          loadBalancerHostname: 'test-service.example.com',
          loadBalancerIP: '10.0.0.1'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Service environment variables are set
      expect(result.environmentVariables['KUBERNETES_SERVICE_NAME']).toBe('test-service');
      expect(result.environmentVariables['KUBERNETES_SERVICE_PORT']).toBe('8080');
      expect(result.environmentVariables['KUBERNETES_SERVICE_PROTOCOL']).toBe('TCP');
      expect(result.environmentVariables['EKS_CLUSTER_NAME']).toBe('test-cluster');
      expect(result.environmentVariables['LOAD_BALANCER_HOSTNAME']).toBe('test-service.example.com');
      expect(result.environmentVariables['LOAD_BALANCER_IP']).toBe('10.0.0.1');
      
      // Assert IAM policies include Kubernetes API access
      const apiPolicy = result.iamPolicies.find(p => p.description.includes('service'));
      expect(apiPolicy).toBeDefined();
      expect(apiPolicy!.statement.actions).toContain('eks:AccessKubernetesApi');
    });
  });

  describe('EksBind__ServiceMeshEnabled__ConfiguresAppMesh', () => {
    const metadata = {
      id: 'TP-binders-eks-006',
      level: 'unit' as const,
      capability: 'Configures AWS App Mesh when service mesh is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ServiceMeshEnabled',
        outcome: 'ConfiguresAppMesh'
      },
      invariants: [
        'Environment variables include APPMESH_VIRTUAL_NODE_NAME and APPMESH_MESH_NAME when provided',
        'IAM policies include App Mesh describe actions',
        'Service mesh configuration is optional and only applied when enableServiceMesh is true'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:cluster capability and enableServiceMesh option',
        notes: 'EKS cluster binding with service mesh enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ServiceMeshEnabled__ConfiguresAppMesh', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-cluster', {
        'eks:cluster': {
          type: 'eks:cluster',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          clusterEndpoint: 'https://ABC.gr7.us-east-1.eks.amazonaws.com',
          virtualNodeName: 'test-virtual-node',
          virtualServiceName: 'test-virtual-service',
          meshName: 'test-mesh'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:cluster',
        access: 'read',
        options: {
          enableServiceMesh: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Service mesh environment variables are set
      expect(result.environmentVariables['APPMESH_VIRTUAL_NODE_NAME']).toBe('test-virtual-node');
      expect(result.environmentVariables['APPMESH_MESH_NAME']).toBe('test-mesh');
      expect(result.environmentVariables['APPMESH_VIRTUAL_SERVICE_NAME']).toBe('test-virtual-service');
      
      // Assert IAM policies include App Mesh permissions
      const appMeshPolicy = result.iamPolicies.find(p => p.description.includes('App Mesh'));
      expect(appMeshPolicy).toBeDefined();
      expect(appMeshPolicy!.statement.actions).toContain('appmesh:DescribeVirtualNode');
      expect(appMeshPolicy!.statement.actions).toContain('appmesh:DescribeVirtualService');
      
      // Assert basic App Mesh permissions are always granted when service mesh is enabled
      const basicAppMeshPolicy = result.iamPolicies.find(p => p.description.includes('basic access'));
      expect(basicAppMeshPolicy).toBeDefined();
      expect(basicAppMeshPolicy!.statement.actions).toContain('appmesh:DescribeMesh');
      expect(basicAppMeshPolicy!.statement.actions).toContain('appmesh:ListMeshes');
    });

    test('EksBind__ServiceMeshEnabledWithVirtualNodeService__ConfiguresAppMeshForPod', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-pod', {
        'eks:pod': {
          type: 'eks:pod',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          namespace: 'production',
          virtualNodeName: 'test-pod-virtual-node',
          virtualServiceName: 'test-pod-virtual-service',
          meshName: 'test-mesh'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:pod',
        access: 'read',
        options: {
          enableServiceMesh: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Service mesh environment variables are set for pod
      expect(result.environmentVariables['APPMESH_VIRTUAL_NODE_NAME']).toBe('test-pod-virtual-node');
      expect(result.environmentVariables['APPMESH_MESH_NAME']).toBe('test-mesh');
      expect(result.environmentVariables['APPMESH_VIRTUAL_SERVICE_NAME']).toBe('test-pod-virtual-service');
      
      // Assert IAM policies include App Mesh permissions for pod
      const virtualNodePolicy = result.iamPolicies.find(p => p.description.includes('virtual node'));
      expect(virtualNodePolicy).toBeDefined();
      expect(virtualNodePolicy!.statement.actions).toContain('appmesh:DescribeVirtualNode');
      
      const virtualServicePolicy = result.iamPolicies.find(p => p.description.includes('virtual service'));
      expect(virtualServicePolicy).toBeDefined();
      expect(virtualServicePolicy!.statement.actions).toContain('appmesh:DescribeVirtualService');
    });
  });

  describe('EksBind__PodNamespaceDefault__UsesDefaultNamespace', () => {
    const metadata = {
      id: 'TP-binders-eks-010',
      level: 'unit' as const,
      capability: 'Uses default namespace "default" when namespace is not provided for pod binding',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'PodNamespaceDefault',
        outcome: 'UsesDefaultNamespace'
      },
      invariants: [
        'KUBERNETES_NAMESPACE defaults to "default" when not provided',
        'Pod binding works correctly without explicit namespace'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:pod capability without namespace',
        notes: 'EKS pod binding with default namespace'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__PodNamespaceDefault__UsesDefaultNamespace', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-pod', {
        'eks:pod': {
          type: 'eks:pod',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster'
          // No namespace provided - should default to 'default'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:pod',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Default namespace is used
      expect(result.environmentVariables['KUBERNETES_NAMESPACE']).toBe('default');
      expect(result.environmentVariables['EKS_CLUSTER_NAME']).toBe('test-cluster');
      expect(result.environmentVariables['EKS_CLUSTER_ARN']).toBe('arn:aws:eks:us-east-1:123456789012:cluster/test-cluster');
    });
  });

  describe('EksBind__ServiceDefaults__AppliesPortProtocolDefaults', () => {
    const metadata = {
      id: 'TP-binders-eks-007',
      level: 'unit' as const,
      capability: 'Applies default port (80) and protocol (TCP) when not specified',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'ServiceDefaults',
        outcome: 'AppliesPortProtocolDefaults'
      },
      invariants: [
        'Service port defaults to 80 if not provided',
        'Service protocol defaults to TCP if not provided',
        'Service type is set when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:service capability without port/protocol',
        notes: 'EKS service binding with defaults applied'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__ServiceDefaults__AppliesPortProtocolDefaults', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-service', {
        'eks:service': {
          type: 'eks:service',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          serviceName: 'test-service'
          // No port or protocol specified
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Defaults are applied
      expect(result.environmentVariables['KUBERNETES_SERVICE_PORT']).toBe('80');
      expect(result.environmentVariables['KUBERNETES_SERVICE_PROTOCOL']).toBe('TCP');
      expect(result.environmentVariables['KUBERNETES_SERVICE_NAME']).toBe('test-service');
    });

    test('EksBind__ServicePortDefault__DefaultsTo80', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-service', {
        'eks:service': {
          type: 'eks:service',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          serviceName: 'test-service',
          serviceProtocol: 'UDP'
          // No port specified - should default to 80
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Port defaults to 80 even when protocol is specified
      expect(result.environmentVariables['KUBERNETES_SERVICE_PORT']).toBe('80');
      expect(result.environmentVariables['KUBERNETES_SERVICE_PROTOCOL']).toBe('UDP');
    });

    test('EksBind__ServiceProtocolDefault__DefaultsToTCP', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-service', {
        'eks:service': {
          type: 'eks:service',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          serviceName: 'test-service',
          servicePort: 443
          // No protocol specified - should default to TCP
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Protocol defaults to TCP even when port is specified
      expect(result.environmentVariables['KUBERNETES_SERVICE_PORT']).toBe('443');
      expect(result.environmentVariables['KUBERNETES_SERVICE_PROTOCOL']).toBe('TCP');
    });
  });

  describe('EksBind__NodeGroupScalingConfig__ExposesScalingEnvVars', () => {
    const metadata = {
      id: 'TP-binders-eks-008',
      level: 'unit' as const,
      capability: 'Exposes scaling configuration environment variables for node groups',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'NodeGroupScalingConfig',
        outcome: 'ExposesScalingEnvVars'
      },
      invariants: [
        'Scaling config env vars are always exposed (empty string if not configured)',
        'MIN_SIZE, MAX_SIZE, DESIRED_SIZE are set when scaling config is provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:nodegroup capability with scaling config',
        notes: 'EKS node group binding with scaling configuration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__NodeGroupScalingConfig__ExposesScalingEnvVars', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-nodegroup', {
        'eks:nodegroup': {
          type: 'eks:nodegroup',
          nodeGroupArn: 'arn:aws:eks:us-east-1:123456789012:nodegroup/test-cluster/test-nodegroup/abc123',
          nodeGroupName: 'test-nodegroup',
          clusterName: 'test-cluster',
          scalingConfig: {
            minSize: 2,
            maxSize: 10,
            desiredSize: 5
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:nodegroup',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Scaling config env vars are exposed
      expect(result.environmentVariables['EKS_NODEGROUP_MIN_SIZE']).toBe('2');
      expect(result.environmentVariables['EKS_NODEGROUP_MAX_SIZE']).toBe('10');
      expect(result.environmentVariables['EKS_NODEGROUP_DESIRED_SIZE']).toBe('5');
    });

    test('EksBind__NodeGroupNoScalingConfig__ExposesEmptyScalingEnvVars', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-nodegroup', {
        'eks:nodegroup': {
          type: 'eks:nodegroup',
          nodeGroupArn: 'arn:aws:eks:us-east-1:123456789012:nodegroup/test-cluster/test-nodegroup/abc123',
          nodeGroupName: 'test-nodegroup',
          clusterName: 'test-cluster'
          // No scaling config
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:nodegroup',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Empty scaling config env vars are exposed for visibility
      expect(result.environmentVariables['EKS_NODEGROUP_MIN_SIZE']).toBe('');
      expect(result.environmentVariables['EKS_NODEGROUP_MAX_SIZE']).toBe('');
      expect(result.environmentVariables['EKS_NODEGROUP_DESIRED_SIZE']).toBe('');
    });
  });

  describe('EksBind__AdminAccessOptIn__RequiresAllowAdminOperations', () => {
    const metadata = {
      id: 'TP-binders-eks-009',
      level: 'unit' as const,
      capability: 'Requires allowAdminOperations opt-in for high-privilege admin actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'EksBind',
        condition: 'AdminAccessOptIn',
        outcome: 'RequiresAllowAdminOperations'
      },
      invariants: [
        'Admin access without allowAdminOperations excludes high-privilege actions (TagResource, AssociateIdentityProviderConfig)',
        'Admin access with allowAdminOperations includes all high-privilege actions'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with eks:cluster capability and admin access',
        notes: 'EKS cluster binding with admin access and opt-in flag'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('EksBind__AdminAccessWithoutOptIn__ExcludesHighPrivilegeActions', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-cluster', {
        'eks:cluster': {
          type: 'eks:cluster',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          clusterEndpoint: 'https://ABC.gr7.us-east-1.eks.amazonaws.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:cluster',
        access: 'admin'
        // No allowAdminOperations option
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: High-privilege actions are excluded
      const clusterPolicy = result.iamPolicies.find(p => p.description.includes('cluster') && p.description.includes('admin'));
      expect(clusterPolicy).toBeDefined();
      expect(clusterPolicy!.statement.actions).not.toContain('eks:TagResource');
      expect(clusterPolicy!.statement.actions).not.toContain('eks:AssociateIdentityProviderConfig');
      expect(clusterPolicy!.statement.actions).toContain('eks:DescribeCluster');
    });

    test('EksBind__AdminAccessWithOptIn__IncludesHighPrivilegeActions', async () => {
      const strategy = new EksBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('eks-cluster', {
        'eks:cluster': {
          type: 'eks:cluster',
          clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
          clusterName: 'test-cluster',
          clusterEndpoint: 'https://ABC.gr7.us-east-1.eks.amazonaws.com'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'eks:cluster',
        access: 'admin',
        options: {
          allowAdminOperations: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: High-privilege actions are included
      const clusterPolicy = result.iamPolicies.find(p => p.description.includes('cluster') && p.description.includes('admin'));
      expect(clusterPolicy).toBeDefined();
      expect(clusterPolicy!.statement.actions).toContain('eks:TagResource');
      expect(clusterPolicy!.statement.actions).toContain('eks:AssociateIdentityProviderConfig');
    });
  });
});
