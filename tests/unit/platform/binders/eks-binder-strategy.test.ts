/**
 * EKS Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-eks-binder-001",
 *   "level": "unit",
 *   "capability": "EKS binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "EKS component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["EksBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EksBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/compute/eks-binder-strategy';
import { BindingContext } from '../../../../packages/core/src/platform/binders/binding-context';
import { ComponentBinding } from '../../../../packages/core/src/platform/binders/component-binding';
import { ComplianceFramework } from '../../../../packages/core/src/platform/compliance/compliance-framework';

// Deterministic setup
let originalDateNow: () => number;
let mockDateNow: jest.SpiedFunction<typeof Date.now>;

beforeEach(() => {
  // Freeze clock for determinism
  originalDateNow = Date.now;
  const fixedTime = 1640995200000; // 2022-01-01T00:00:00Z
  mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(fixedTime);

  // Seed RNG for deterministic behavior
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  // Restore original functions
  mockDateNow.mockRestore();
  jest.restoreAllMocks();
});

describe('EksBinderStrategy', () => {
  let strategy: EksBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new EksBinderStrategy();

    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      clusterName: 'test-cluster',
      clusterArn: 'arn:aws:eks:us-east-1:123456789012:cluster/test-cluster',
      version: '1.28',
      status: 'ACTIVE',
      endpoint: 'https://test-cluster.yl4.us-east-1.eks.amazonaws.com',
      roleArn: 'arn:aws:iam::123456789012:role/test-cluster-role',
      vpcConfig: {
        subnetIds: ['subnet-12345', 'subnet-67890'],
        securityGroupIds: ['sg-12345'],
        endpointPrivateAccess: true,
        endpointPublicAccess: true
      },
      nodeGroupName: 'test-nodegroup',
      nodeGroupArn: 'arn:aws:eks:us-east-1:123456789012:nodegroup/test-cluster/test-nodegroup/12345678-1234-1234-1234-123456789012',
      instanceTypes: ['t3.medium'],
      scalingConfig: {
        minSize: 1,
        maxSize: 10,
        desiredSize: 3
      }
    };

    mockBinding = {
      capability: 'eks:cluster',
      access: ['read', 'write']
    };

    mockContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL
    };
  });

  describe('Constructor__ValidSetup__InitializesCorrectly', () => {
    test('should initialize with correct supported capabilities', () => {
      expect(strategy.supportedCapabilities).toEqual([
        'eks:cluster',
        'eks:nodegroup',
        'eks:fargate-profile'
      ]);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for EKS binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null, mockContext))
        .rejects.toThrow('Binding is required for EKS binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null))
        .rejects.toThrow('Context is required for EKS binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported EKS capability: invalid:capability');
    });
  });

  describe('Bind__EksClusterCapability__ConfiguresClusterAccess', () => {
    test('should configure read access for cluster', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'eks:DescribeCluster',
          'eks:ListClusters'
        ],
        Resource: mockTargetComponent.clusterArn
      });
    });

    test('should configure write access for cluster', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'eks:CreateCluster',
          'eks:UpdateClusterConfig',
          'eks:UpdateClusterVersion',
          'eks:DeleteCluster'
        ],
        Resource: mockTargetComponent.clusterArn
      });
    });

    test('should inject cluster environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_CLUSTER_NAME', mockTargetComponent.clusterName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_CLUSTER_ARN', mockTargetComponent.clusterArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_CLUSTER_VERSION', mockTargetComponent.version);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_CLUSTER_STATUS', mockTargetComponent.status);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_CLUSTER_ENDPOINT', mockTargetComponent.endpoint);
    });

    test('should configure VPC configuration', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_VPC_SUBNETS', mockTargetComponent.vpcConfig.subnetIds.join(','));
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_VPC_SECURITY_GROUPS', mockTargetComponent.vpcConfig.securityGroupIds.join(','));
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_ENDPOINT_PRIVATE_ACCESS', mockTargetComponent.vpcConfig.endpointPrivateAccess.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_ENDPOINT_PUBLIC_ACCESS', mockTargetComponent.vpcConfig.endpointPublicAccess.toString());
    });
  });

  describe('Bind__EksNodegroupCapability__ConfiguresNodegroupAccess', () => {
    test('should configure read access for nodegroup', async () => {
      const nodegroupBinding = { ...mockBinding, capability: 'eks:nodegroup', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, nodegroupBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'eks:DescribeNodegroup',
          'eks:ListNodegroups'
        ],
        Resource: mockTargetComponent.nodeGroupArn
      });
    });

    test('should configure write access for nodegroup', async () => {
      const nodegroupBinding = { ...mockBinding, capability: 'eks:nodegroup', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, nodegroupBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'eks:CreateNodegroup',
          'eks:UpdateNodegroupConfig',
          'eks:UpdateNodegroupVersion',
          'eks:DeleteNodegroup'
        ],
        Resource: mockTargetComponent.nodeGroupArn
      });
    });

    test('should inject nodegroup environment variables', async () => {
      const nodegroupBinding = { ...mockBinding, capability: 'eks:nodegroup' };

      await strategy.bind(mockSourceComponent, mockTargetComponent, nodegroupBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_NODEGROUP_NAME', mockTargetComponent.nodeGroupName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_NODEGROUP_ARN', mockTargetComponent.nodeGroupArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_INSTANCE_TYPES', mockTargetComponent.instanceTypes.join(','));
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_MIN_SIZE', mockTargetComponent.scalingConfig.minSize.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_MAX_SIZE', mockTargetComponent.scalingConfig.maxSize.toString());
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('EKS_DESIRED_SIZE', mockTargetComponent.scalingConfig.desiredSize.toString());
    });
  });

  describe('Bind__EksFargateProfileCapability__ConfiguresFargateProfileAccess', () => {
    test('should configure read access for fargate profile', async () => {
      const fargateBinding = { ...mockBinding, capability: 'eks:fargate-profile', access: ['read'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, fargateBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'eks:DescribeFargateProfile',
          'eks:ListFargateProfiles'
        ],
        Resource: `arn:aws:eks:${mockContext.region}:${mockContext.accountId}:fargateprofile/${mockTargetComponent.clusterName}/*`
      });
    });

    test('should configure write access for fargate profile', async () => {
      const fargateBinding = { ...mockBinding, capability: 'eks:fargate-profile', access: ['write'] };

      await strategy.bind(mockSourceComponent, mockTargetComponent, fargateBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'eks:CreateFargateProfile',
          'eks:UpdateFargateProfile',
          'eks:DeleteFargateProfile'
        ],
        Resource: `arn:aws:eks:${mockContext.region}:${mockContext.accountId}:fargateprofile/${mockTargetComponent.clusterName}/*`
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for EKS binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };

      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for EKS binding: invalid. Valid types: read, write, admin, deploy');
    });
  });
});
