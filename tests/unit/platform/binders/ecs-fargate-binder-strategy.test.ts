/**
 * ECS Fargate Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-ecs-fargate-binder-001",
 *   "level": "unit",
 *   "capability": "ECS Fargate binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "ECS component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["EcsFargateBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EcsFargateBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/compute/ecs-fargate-binder-strategy';
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

describe('EcsFargateBinderStrategy', () => {
  let strategy: EcsFargateBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let bindingContext: BindingContext;

  beforeEach(() => {
    strategy = new EcsFargateBinderStrategy();

    // Mock source component with required methods
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn(),
      securityGroup: {
        addIngressRule: jest.fn()
      }
    };

    // Mock target component with valid ECS properties
    mockTargetComponent = {
      clusterArn: 'arn:aws:ecs:us-east-1:123456789012:cluster/test-cluster',
      clusterName: 'test-cluster',
      serviceArn: 'arn:aws:ecs:us-east-1:123456789012:service/test-cluster/test-service',
      serviceName: 'test-service',
      taskDefinitionArn: 'arn:aws:ecs:us-east-1:123456789012:task-definition/test-task:1',
      taskDefinitionFamily: 'test-task'
    };

    bindingContext = {
      region: 'us-east-1',
      accountId: '123456789012',
      complianceFramework: ComplianceFramework.COMMERCIAL,
      environment: 'test'
    };
  });

  describe('SupportedCapabilities__ValidStrategy__ReturnsCorrectCapabilities', () => {
    test('should return correct supported capabilities', () => {
      // Arrange & Act
      const capabilities = strategy.supportedCapabilities;

      // Assert
      expect(capabilities).toEqual(['ecs:cluster', 'ecs:service', 'ecs:task-definition']);
    });
  });

  describe('BindToCluster__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure cluster binding with read access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeClusters',
          'ecs:ListServices',
          'ecs:ListTasks'
        ],
        Resource: mockTargetComponent.clusterArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('ECS_CLUSTER_NAME', mockTargetComponent.clusterName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('ECS_CLUSTER_ARN', mockTargetComponent.clusterArn);
    });

    test('should configure cluster binding with write access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['write']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecs:CreateService',
          'ecs:UpdateService',
          'ecs:DeleteService',
          'ecs:RegisterTaskDefinition',
          'ecs:DeregisterTaskDefinition'
        ],
        Resource: [
          mockTargetComponent.clusterArn,
          `arn:aws:ecs:${bindingContext.region}:${bindingContext.accountId}:service/${mockTargetComponent.clusterName}/*`,
          `arn:aws:ecs:${bindingContext.region}:${bindingContext.accountId}:task-definition/*`
        ]
      });
    });
  });

  describe('BindToCluster__NullTargetComponent__ThrowsDescriptiveError', () => {
    test('should throw error when target component is null', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, null, binding, bindingContext))
        .rejects.toThrow('Target component is required for ECS cluster binding');
    });

    test('should throw error when target component is undefined', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, undefined, binding, bindingContext))
        .rejects.toThrow('Target component is required for ECS cluster binding');
    });
  });

  describe('BindToCluster__MissingRequiredProperties__ThrowsDescriptiveError', () => {
    test('should throw error when clusterArn is missing', async () => {
      // Arrange
      const invalidTargetComponent = { ...mockTargetComponent };
      delete invalidTargetComponent.clusterArn;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, invalidTargetComponent, binding, bindingContext))
        .rejects.toThrow('Target component missing required clusterArn property for ECS cluster binding');
    });

    test('should throw error when clusterName is missing', async () => {
      // Arrange
      const invalidTargetComponent = { ...mockTargetComponent };
      delete invalidTargetComponent.clusterName;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['write']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, invalidTargetComponent, binding, bindingContext))
        .rejects.toThrow('Target component missing required clusterName property for ECS cluster binding');
    });
  });

  describe('BindToCluster__InvalidAccessPatterns__ThrowsDescriptiveError', () => {
    test('should throw error when access array contains invalid values', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['invalid-access', 'read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Invalid access types for ECS cluster binding: invalid-access. Valid types: read, write, admin, encrypt, decrypt, process');
    });

    test('should throw error when access array is empty', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: []
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Access array cannot be empty for ECS cluster binding');
    });
  });

  describe('BindToCluster__MissingContextProperties__ThrowsDescriptiveError', () => {
    test('should throw error when region is missing from context', async () => {
      // Arrange
      const invalidContext = { ...bindingContext };
      delete (invalidContext as any).region;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['write']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, invalidContext))
        .rejects.toThrow('Missing required context properties for ARN construction: region, accountId');
    });

    test('should throw error when accountId is missing from context', async () => {
      // Arrange
      const invalidContext = { ...bindingContext };
      delete (invalidContext as any).accountId;

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['write']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, invalidContext))
        .rejects.toThrow('Missing required context properties for ARN construction: region, accountId');
    });
  });

  describe('BindToCluster__UnsupportedCapability__ThrowsDescriptiveError', () => {
    test('should throw error for unsupported capability', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:unsupported',
        access: ['read']
      };

      // Act & Assert
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext))
        .rejects.toThrow('Unsupported ECS Fargate capability: ecs:unsupported. Supported capabilities: ecs:cluster, ecs:service, ecs:task-definition');
    });
  });

  describe('BindToCluster__FedRampCompliance__ConfiguresSecureAccess', () => {
    test('should configure secure network access for FedRAMP Moderate', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_MODERATE
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.securityGroup.addIngressRule).toHaveBeenCalledWith(
        mockSourceComponent.securityGroup,
        { port: 443, protocol: 'tcp' },
        'HTTPS access for ECS API calls'
      );
    });

    test('should configure VPC endpoints for FedRAMP High', async () => {
      // Arrange
      const fedrampContext = {
        ...bindingContext,
        complianceFramework: ComplianceFramework.FEDRAMP_HIGH
      };

      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-cluster',
        capability: 'ecs:cluster',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, fedrampContext);

      // Assert
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith(
        'ECS_ENDPOINT',
        `https://ecs.${fedrampContext.region}.amazonaws.com`
      );
    });
  });

  describe('BindToService__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure service binding with read access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-service',
        capability: 'ecs:service',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeServices',
          'ecs:ListTasks',
          'ecs:DescribeTasks'
        ],
        Resource: [
          mockTargetComponent.serviceArn,
          `arn:aws:ecs:${bindingContext.region}:${bindingContext.accountId}:task/${mockTargetComponent.clusterName}/*`
        ]
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('ECS_SERVICE_NAME', mockTargetComponent.serviceName);
    });
  });

  describe('BindToTaskDefinition__ValidInputs__ConfiguresCorrectly', () => {
    test('should configure task definition binding with read access', async () => {
      // Arrange
      const binding: ComponentBinding = {
        from: 'lambda-function',
        to: 'ecs-task-definition',
        capability: 'ecs:task-definition',
        access: ['read']
      };

      // Act
      await strategy.bind(mockSourceComponent, mockTargetComponent, binding, bindingContext);

      // Assert
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecs:DescribeTaskDefinition',
          'ecs:ListTaskDefinitions'
        ],
        Resource: mockTargetComponent.taskDefinitionArn
      });
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('ECS_TASK_DEFINITION_ARN', mockTargetComponent.taskDefinitionArn);
    });
  });
});
