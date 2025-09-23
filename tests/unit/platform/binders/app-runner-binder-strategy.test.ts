/**
 * App Runner Binder Strategy Tests
 * Comprehensive tests following Platform Testing Standard
 */

/**
 * Test Metadata:
 * {
 *   "id": "TP-app-runner-binder-001",
 *   "level": "unit",
 *   "capability": "App Runner binding strategy validation and error handling",
 *   "oracle": "exact",
 *   "invariants": ["null safety", "access pattern validation", "ARN construction safety"],
 *   "fixtures": ["deterministic clock", "seeded RNG", "mock components"],
 *   "inputs": { "shape": "App Runner component properties and binding configurations", "notes": "includes null/undefined edge cases" },
 *   "risks": ["null reference errors", "ARN construction failures", "access pattern validation bypass"],
 *   "dependencies": ["AppRunnerBinderStrategy", "BindingContext", "ComponentBinding"],
 *   "evidence": ["null safety validation", "error message quality", "access pattern coverage"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AppRunnerBinderStrategy } from '../../../../packages/core/src/platform/binders/strategies/compute/app-runner-binder-strategy';
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

describe('AppRunnerBinderStrategy', () => {
  let strategy: AppRunnerBinderStrategy;
  let mockSourceComponent: any;
  let mockTargetComponent: any;
  let mockBinding: ComponentBinding;
  let mockContext: BindingContext;

  beforeEach(() => {
    strategy = new AppRunnerBinderStrategy();
    
    mockSourceComponent = {
      addToRolePolicy: jest.fn(),
      addEnvironment: jest.fn()
    };

    mockTargetComponent = {
      serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/test-service',
      serviceName: 'test-service',
      serviceUrl: 'https://test-service.awsapprunner.com',
      serviceId: 'test-service-id',
      port: 8080,
      ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/test-repo',
      connectionArn: 'arn:aws:apprunner:us-east-1:123456789012:connection/test-connection',
      connectionName: 'test-connection',
      provider: 'GITHUB',
      repositoryUrl: 'https://github.com/test/repo',
      branchName: 'main',
      vpcConnectorArn: 'arn:aws:apprunner:us-east-1:123456789012:vpcconnector/test-vpc',
      customDomain: 'test.example.com',
      sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert',
      autoScalingConfigurationArn: 'arn:aws:apprunner:us-east-1:123456789012:autoscalingconfiguration/test-config'
    };

    mockBinding = {
      from: 'test-source',
      to: 'test-target',
      capability: 'apprunner:service',
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
      expect(strategy.supportedCapabilities).toEqual(['apprunner:service', 'apprunner:connection']);
    });
  });

  describe('Bind__NullTargetComponent__ThrowsError', () => {
    test('should throw error when target component is null', async () => {
      await expect(strategy.bind(mockSourceComponent, null, mockBinding, mockContext))
        .rejects.toThrow('Target component is required for App Runner binding');
    });
  });

  describe('Bind__NullBinding__ThrowsError', () => {
    test('should throw error when binding is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, null as any, mockContext))
        .rejects.toThrow('Binding is required for App Runner binding');
    });
  });

  describe('Bind__NullContext__ThrowsError', () => {
    test('should throw error when context is null', async () => {
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, null as any))
        .rejects.toThrow('Context is required for App Runner binding');
    });
  });

  describe('Bind__MissingCapability__ThrowsError', () => {
    test('should throw error when capability is missing', async () => {
      const invalidBinding = { ...mockBinding, capability: undefined as any };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding capability is required');
    });
  });

  describe('Bind__MissingAccess__ThrowsError', () => {
    test('should throw error when access is missing', async () => {
      const invalidBinding = { ...mockBinding, access: undefined as any };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Binding access is required');
    });
  });

  describe('Bind__InvalidCapability__ThrowsError', () => {
    test('should throw error for unsupported capability', async () => {
      const invalidBinding = { ...mockBinding, capability: 'invalid:capability' };
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidBinding, mockContext))
        .rejects.toThrow('Unsupported App Runner capability: invalid:capability');
    });
  });

  describe('Bind__AppRunnerServiceCapability__ConfiguresServiceAccess', () => {
    test('should configure read access for service', async () => {
      const readOnlyBinding = { ...mockBinding, access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, readOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeService',
          'apprunner:ListServices',
          'apprunner:DescribeOperation',
          'apprunner:ListOperations'
        ],
        Resource: mockTargetComponent.serviceArn
      });
    });

    test('should configure write access for service', async () => {
      const writeOnlyBinding = { ...mockBinding, access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, writeOnlyBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:CreateService',
          'apprunner:UpdateService',
          'apprunner:DeleteService',
          'apprunner:StartDeployment',
          'apprunner:PauseService',
          'apprunner:ResumeService'
        ],
        Resource: mockTargetComponent.serviceArn
      });
    });

    test('should configure ECR access for container images', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        Resource: mockTargetComponent.ecrRepositoryArn
      });
    });

    test('should inject service environment variables', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_SERVICE_NAME', mockTargetComponent.serviceName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_SERVICE_ARN', mockTargetComponent.serviceArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_SERVICE_URL', mockTargetComponent.serviceUrl);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_SERVICE_ID', mockTargetComponent.serviceId);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('PORT', '8080');
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AWS_REGION', mockContext.region);
    });

    test('should use default port when not specified', async () => {
      const targetWithoutPort = { ...mockTargetComponent, port: undefined };
      
      await strategy.bind(mockSourceComponent, targetWithoutPort, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('PORT', '8080');
    });
  });

  describe('Bind__AppRunnerConnectionCapability__ConfiguresConnectionAccess', () => {
    test('should configure read access for connection', async () => {
      const connectionBinding = { ...mockBinding, capability: 'apprunner:connection', access: ['read'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, connectionBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeConnection',
          'apprunner:ListConnections'
        ],
        Resource: mockTargetComponent.connectionArn
      });
    });

    test('should configure write access for connection', async () => {
      const connectionBinding = { ...mockBinding, capability: 'apprunner:connection', access: ['write'] };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, connectionBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:CreateConnection',
          'apprunner:UpdateConnection',
          'apprunner:DeleteConnection'
        ],
        Resource: mockTargetComponent.connectionArn
      });
    });

    test('should configure GitHub access for GITHUB provider', async () => {
      const connectionBinding = { ...mockBinding, capability: 'apprunner:connection' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, connectionBinding, mockContext);

      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeConnection',
          'apprunner:ListConnections'
        ],
        Resource: mockTargetComponent.connectionArn
      });
    });

    test('should inject connection environment variables', async () => {
      const connectionBinding = { ...mockBinding, capability: 'apprunner:connection' };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, connectionBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_CONNECTION_NAME', mockTargetComponent.connectionName);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_CONNECTION_ARN', mockTargetComponent.connectionArn);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('APP_RUNNER_PROVIDER', mockTargetComponent.provider);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('REPOSITORY_URL', mockTargetComponent.repositoryUrl);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BRANCH_NAME', mockTargetComponent.branchName);
    });

    test('should use default branch name when not specified', async () => {
      const targetWithoutBranch = { ...mockTargetComponent, branchName: undefined };
      const connectionBinding = { ...mockBinding, capability: 'apprunner:connection' };
      
      await strategy.bind(mockSourceComponent, targetWithoutBranch, connectionBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('BRANCH_NAME', 'main');
    });
  });

  describe('Bind__FedRampModerateCompliance__ConfiguresSecureNetworking', () => {
    test('should configure VPC connector for FedRAMP Moderate', async () => {
      const fedrampContext = { ...mockContext, complianceFramework: ComplianceFramework.FEDRAMP_MODERATE };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, fedrampContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('VPC_CONNECTOR_ARN', mockTargetComponent.vpcConnectorArn);
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeVpcConnector',
          'apprunner:ListVpcConnectors'
        ],
        Resource: mockTargetComponent.vpcConnectorArn
      });
    });
  });

  describe('Bind__FedRampHighCompliance__ConfiguresCustomDomain', () => {
    test('should configure custom domain and SSL certificate for FedRAMP High', async () => {
      const fedrampHighContext = { ...mockContext, complianceFramework: ComplianceFramework.FEDRAMP_HIGH };
      
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, fedrampHighContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('CUSTOM_DOMAIN', mockTargetComponent.customDomain);
      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('SSL_CERTIFICATE_ARN', mockTargetComponent.sslCertificateArn);
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'acm:DescribeCertificate',
          'acm:ListCertificates'
        ],
        Resource: mockTargetComponent.sslCertificateArn
      });
    });
  });

  describe('Bind__AutoScalingConfiguration__ConfiguresAutoScaling', () => {
    test('should configure auto scaling when configuration ARN is provided', async () => {
      await strategy.bind(mockSourceComponent, mockTargetComponent, mockBinding, mockContext);

      expect(mockSourceComponent.addEnvironment).toHaveBeenCalledWith('AUTO_SCALING_CONFIG_ARN', mockTargetComponent.autoScalingConfigurationArn);
      expect(mockSourceComponent.addToRolePolicy).toHaveBeenCalledWith({
        Effect: 'Allow',
        Action: [
          'apprunner:DescribeAutoScalingConfiguration',
          'apprunner:ListAutoScalingConfigurations'
        ],
        Resource: mockTargetComponent.autoScalingConfigurationArn
      });
    });
  });

  describe('Bind__EmptyAccessArray__ThrowsError', () => {
    test('should throw error when access array is empty', async () => {
      const emptyAccessBinding = { ...mockBinding, access: [] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, emptyAccessBinding, mockContext))
        .rejects.toThrow('Access array cannot be empty for App Runner binding');
    });
  });

  describe('Bind__InvalidAccessType__ThrowsError', () => {
    test('should throw error for invalid access type', async () => {
      const invalidAccessBinding = { ...mockBinding, access: ['invalid'] };
      
      await expect(strategy.bind(mockSourceComponent, mockTargetComponent, invalidAccessBinding, mockContext))
        .rejects.toThrow('Invalid access types for App Runner binding: invalid. Valid types: read, write, admin, deploy, scale');
    });
  });
});
