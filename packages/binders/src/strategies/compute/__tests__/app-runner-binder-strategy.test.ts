/**
 * Unit Tests: App Runner Binder Strategy (Unified)
 * Tests for App Runner containerized web application bindings with compliance enforcement
 */

import { AppRunnerBinderStrategy } from '../app-runner-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('AppRunnerBinderStrategy', () => {
  describe('AppRunnerBind__ValidServiceAccess__ReturnsServiceEnvVars', () => {
    const metadata = {
      id: 'TP-binders-apprunner-001',
      level: 'unit' as const,
      capability: 'Returns App Runner service environment variables for valid service access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ValidServiceAccess',
        outcome: 'ReturnsServiceEnvVars'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include APP_RUNNER_SERVICE_NAME, APP_RUNNER_SERVICE_ARN, APP_RUNNER_SERVICE_URL',
        'IAM policies include App Runner read actions (DescribeService, ListServices)',
        'IAM policies include ECR access for container images',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability and read access',
        notes: 'Basic App Runner service read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ValidServiceAccess__ReturnsServiceEnvVars', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Service environment variables are set
      expect(result.environmentVariables['APP_RUNNER_SERVICE_NAME']).toBe('app');
      expect(result.environmentVariables['APP_RUNNER_SERVICE_ARN']).toBe('arn:aws:apprunner:us-east-1:123456789012:service/app/abcd');
      expect(result.environmentVariables['APP_RUNNER_SERVICE_URL']).toBe('https://app.awsapprunner.com');
      expect(result.environmentVariables['APP_RUNNER_SERVICE_ID']).toBe('abcd');
      expect(result.environmentVariables['PORT']).toBe('8080'); // Default port
      
      // Assert IAM policies include App Runner read actions with specific resource ARN
      const servicePolicy = result.iamPolicies.find(p => p.description.includes('service') && p.description.includes('read'));
      expect(servicePolicy).toBeDefined();
      expect(servicePolicy!.statement.actions).toContain('apprunner:DescribeService');
      expect(servicePolicy!.statement.actions).toContain('apprunner:ListServices');
      expect(servicePolicy!.statement.resources).toEqual(['arn:aws:apprunner:us-east-1:123456789012:service/app/abcd']);
      
      // Assert ECR access is granted with specific repository ARN
      const ecrPolicy = result.iamPolicies.find(p => p.description.includes('ECR'));
      expect(ecrPolicy).toBeDefined();
      expect(ecrPolicy!.statement.actions).toContain('ecr:GetAuthorizationToken');
      expect(ecrPolicy!.statement.actions).toContain('ecr:BatchGetImage');
      expect(ecrPolicy!.statement.resources).toEqual(['arn:aws:ecr:us-east-1:123456789012:repository/app']);
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('AppRunnerBind__ServiceWriteAccess__GrantsServiceWriteActions', () => {
    const metadata = {
      id: 'TP-binders-apprunner-002',
      level: 'unit' as const,
      capability: 'Grants App Runner service write actions including CreateService and UpdateService for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ServiceWriteAccess',
        outcome: 'GrantsServiceWriteActions'
      },
      invariants: [
        'IAM policies include App Runner write actions (CreateService, UpdateService, DeleteService, StartDeployment)',
        'Read actions are included in write access',
        'Resources include service ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability and write access',
        notes: 'App Runner service write access with service management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ServiceWriteAccess__GrantsServiceWriteActions', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted with specific resource ARN
      const writePolicy = result.iamPolicies.find(p => p.description.includes('service') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('apprunner:CreateService');
      expect(writePolicy!.statement.actions).toContain('apprunner:UpdateService');
      expect(writePolicy!.statement.actions).toContain('apprunner:DeleteService');
      expect(writePolicy!.statement.actions).toContain('apprunner:StartDeployment');
      expect(writePolicy!.statement.actions).toContain('apprunner:DescribeService');
      expect(writePolicy!.statement.resources).toEqual(['arn:aws:apprunner:us-east-1:123456789012:service/app/abcd']);
    });
  });

  describe('AppRunnerBind__ServicePortDefault__DefaultsTo8080', () => {
    const metadata = {
      id: 'TP-binders-apprunner-003',
      level: 'unit' as const,
      capability: 'Applies default port (8080) when port is not specified',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ServicePortDefault',
        outcome: 'DefaultsTo8080'
      },
      invariants: [
        'Service port defaults to 8080 if not provided',
        'Custom port is used when specified'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability without port',
        notes: 'App Runner service binding with default port'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ServicePortDefault__DefaultsTo8080', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app'
          // No port specified - should default to 8080
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Default port is applied
      expect(result.environmentVariables['PORT']).toBe('8080');
    });

    test('AppRunnerBind__ServiceCustomPort__UsesCustomPort', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app',
          port: 3000
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom port is used
      expect(result.environmentVariables['PORT']).toBe('3000');
    });
  });

  describe('AppRunnerBind__SecureNetworkingEnabled__ConfiguresVpcSslAutoScaling', () => {
    const metadata = {
      id: 'TP-binders-apprunner-004',
      level: 'unit' as const,
      capability: 'Configures VPC connector, SSL certificate, and auto scaling when secure networking is enabled',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'SecureNetworkingEnabled',
        outcome: 'ConfiguresVpcSslAutoScaling'
      },
      invariants: [
        'Environment variables include VPC_CONNECTOR_ARN, CUSTOM_DOMAIN, SSL_CERTIFICATE_ARN, AUTO_SCALING_CONFIG_ARN when provided',
        'IAM policies include VPC connector, ACM certificate, and auto scaling permissions',
        'Secure networking configuration is optional and only applied when requireSecureNetworking is true'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability and requireSecureNetworking option',
        notes: 'App Runner service binding with secure networking enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__SecureNetworkingEnabled__ConfiguresVpcSslAutoScaling', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app',
          vpcConnectorArn: 'arn:aws:apprunner:us-east-1:123456789012:vpcconnector/vpc-conn',
          customDomain: 'app.example.com',
          sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/xyz',
          autoScalingConfigurationArn: 'arn:aws:apprunner:us-east-1:123456789012:autoscalingconfig/asc'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read',
        options: {
          requireSecureNetworking: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure networking environment variables are set
      expect(result.environmentVariables['VPC_CONNECTOR_ARN']).toBe('arn:aws:apprunner:us-east-1:123456789012:vpcconnector/vpc-conn');
      expect(result.environmentVariables['CUSTOM_DOMAIN']).toBe('app.example.com');
      expect(result.environmentVariables['SSL_CERTIFICATE_ARN']).toBe('arn:aws:acm:us-east-1:123456789012:certificate/xyz');
      expect(result.environmentVariables['AUTO_SCALING_CONFIG_ARN']).toBe('arn:aws:apprunner:us-east-1:123456789012:autoscalingconfig/asc');
      
      // Assert IAM policies include secure networking permissions with specific resource ARNs
      const vpcPolicy = result.iamPolicies.find(p => p.description.includes('VPC connector'));
      expect(vpcPolicy).toBeDefined();
      expect(vpcPolicy!.statement.actions).toContain('apprunner:DescribeVpcConnector');
      expect(vpcPolicy!.statement.resources).toContain('arn:aws:apprunner:us-east-1:123456789012:vpcconnector/vpc-conn');
      
      const acmPolicy = result.iamPolicies.find(p => p.description.includes('ACM certificate'));
      expect(acmPolicy).toBeDefined();
      expect(acmPolicy!.statement.actions).toContain('acm:DescribeCertificate');
      expect(acmPolicy!.statement.resources).toContain('arn:aws:acm:us-east-1:123456789012:certificate/xyz');
      
      const autoScalingPolicy = result.iamPolicies.find(p => p.description.includes('Auto scaling'));
      expect(autoScalingPolicy).toBeDefined();
      expect(autoScalingPolicy!.statement.actions).toContain('apprunner:DescribeAutoScalingConfiguration');
      expect(autoScalingPolicy!.statement.resources).toContain('arn:aws:apprunner:us-east-1:123456789012:autoscalingconfig/asc');
    });
  });

  describe('AppRunnerBind__CustomDomainSsl__ConfiguresDomainAndCertificate', () => {
    const metadata = {
      id: 'TP-binders-apprunner-009',
      level: 'unit' as const,
      capability: 'Configures custom domain and SSL certificate when provided with secure networking',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'CustomDomainSsl',
        outcome: 'ConfiguresDomainAndCertificate'
      },
      invariants: [
        'Environment variables include CUSTOM_DOMAIN and SSL_CERTIFICATE_ARN when provided',
        'IAM policies include ACM certificate permissions with specific certificate ARN',
        'Custom domain can be set without SSL certificate (SSL is optional)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability with custom domain and SSL certificate',
        notes: 'App Runner service binding with custom domain and SSL certificate'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__CustomDomainSsl__ConfiguresDomainAndCertificate', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app',
          customDomain: 'app.example.com',
          sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc123def456'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read',
        options: {
          requireSecureNetworking: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom domain and SSL certificate are configured
      expect(result.environmentVariables['CUSTOM_DOMAIN']).toBe('app.example.com');
      expect(result.environmentVariables['SSL_CERTIFICATE_ARN']).toBe('arn:aws:acm:us-east-1:123456789012:certificate/abc123def456');
      
      // Assert IAM policies include ACM certificate permissions with specific ARN
      const acmPolicy = result.iamPolicies.find(p => p.description.includes('ACM certificate'));
      expect(acmPolicy).toBeDefined();
      expect(acmPolicy!.statement.actions).toContain('acm:DescribeCertificate');
      expect(acmPolicy!.statement.actions).toContain('acm:ListCertificates');
      expect(acmPolicy!.statement.resources).toEqual(['arn:aws:acm:us-east-1:123456789012:certificate/abc123def456']);
    });

    test('AppRunnerBind__CustomDomainWithoutSsl__ConfiguresDomainOnly', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app',
          customDomain: 'app.example.com'
          // No SSL certificate ARN
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read',
        options: {
          requireSecureNetworking: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Custom domain is set but no SSL certificate env var
      expect(result.environmentVariables['CUSTOM_DOMAIN']).toBe('app.example.com');
      expect(result.environmentVariables['SSL_CERTIFICATE_ARN']).toBeUndefined();
      
      // Assert no ACM policy is created when SSL certificate is not provided
      const acmPolicy = result.iamPolicies.find(p => p.description.includes('ACM certificate'));
      expect(acmPolicy).toBeUndefined();
    });
  });

  describe('AppRunnerBind__EcrPolicyResourceScoping__ScopesToRepositoryArn', () => {
    const metadata = {
      id: 'TP-binders-apprunner-010',
      level: 'unit' as const,
      capability: 'ECR policy is scoped to specific repository ARN for least privilege',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'EcrPolicyResourceScoping',
        outcome: 'ScopesToRepositoryArn'
      },
      invariants: [
        'ECR policy resources are scoped to the specific ECR repository ARN',
        'ECR policy includes required actions for container image access',
        'No wildcard resources are used for ECR access'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability',
        notes: 'App Runner service binding with ECR repository access'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__EcrPolicyResourceScoping__ScopesToRepositoryArn', async () => {
      const ecrRepositoryArn = 'arn:aws:ecr:us-east-1:123456789012:repository/my-app';
      
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: ECR policy is scoped to specific repository ARN
      const ecrPolicy = result.iamPolicies.find(p => p.description.includes('ECR'));
      expect(ecrPolicy).toBeDefined();
      expect(ecrPolicy!.statement.actions).toContain('ecr:GetAuthorizationToken');
      expect(ecrPolicy!.statement.actions).toContain('ecr:BatchCheckLayerAvailability');
      expect(ecrPolicy!.statement.actions).toContain('ecr:GetDownloadUrlForLayer');
      expect(ecrPolicy!.statement.actions).toContain('ecr:BatchGetImage');
      expect(ecrPolicy!.statement.resources).toEqual([ecrRepositoryArn]);
    });
  });

  describe('AppRunnerBind__ServicePolicyResourceScoping__ScopesToServiceArn', () => {
    const metadata = {
      id: 'TP-binders-apprunner-011',
      level: 'unit' as const,
      capability: 'Service policy is scoped to specific service ARN for least privilege',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ServicePolicyResourceScoping',
        outcome: 'ScopesToServiceArn'
      },
      invariants: [
        'Service policy resources are scoped to the specific service ARN',
        'No wildcard resources are used for service access',
        'Connection policy resources are scoped to the specific connection ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service and apprunner:connection capabilities',
        notes: 'App Runner bindings with specific resource ARN scoping'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ServicePolicyResourceScoping__ScopesToServiceArn', async () => {
      const serviceArn = 'arn:aws:apprunner:us-east-1:123456789012:service/my-app/service-id';
      
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn,
          serviceName: 'my-app',
          serviceUrl: 'https://my-app.awsapprunner.com',
          serviceId: 'service-id',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/my-app'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Service policy is scoped to specific service ARN
      const servicePolicy = result.iamPolicies.find(p => p.description.includes('service') && p.description.includes('read'));
      expect(servicePolicy).toBeDefined();
      expect(servicePolicy!.statement.resources).toEqual([serviceArn]);
    });

    test('AppRunnerBind__ConnectionPolicyResourceScoping__ScopesToConnectionArn', async () => {
      const connectionArn = 'arn:aws:apprunner:us-east-1:123456789012:connection/github-connection';
      
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-connection', {
        'apprunner:connection': {
          type: 'apprunner:connection',
          connectionArn,
          connectionName: 'github-connection',
          provider: 'GITHUB'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:connection',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Connection policy is scoped to specific connection ARN
      const connectionPolicy = result.iamPolicies.find(p => p.description.includes('connection') && p.description.includes('read'));
      expect(connectionPolicy).toBeDefined();
      expect(connectionPolicy!.statement.resources).toEqual([connectionArn]);
    });
  });

  describe('AppRunnerBind__ValidConnectionAccess__ReturnsConnectionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-apprunner-005',
      level: 'unit' as const,
      capability: 'Returns App Runner connection environment variables for valid connection access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ValidConnectionAccess',
        outcome: 'ReturnsConnectionEnvVars'
      },
      invariants: [
        'Environment variables include APP_RUNNER_CONNECTION_NAME, APP_RUNNER_CONNECTION_ARN, APP_RUNNER_PROVIDER',
        'IAM policies include App Runner connection read actions',
        'Repository URL and branch name are set when provided'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:connection capability and read access',
        notes: 'Basic App Runner connection read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ValidConnectionAccess__ReturnsConnectionEnvVars', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-connection', {
        'apprunner:connection': {
          type: 'apprunner:connection',
          connectionArn: 'arn:aws:apprunner:us-east-1:123456789012:connection/github-conn',
          connectionName: 'github-conn',
          provider: 'GITHUB',
          repositoryUrl: 'https://github.com/org/repo',
          branchName: 'main'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:connection',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Connection environment variables are set
      expect(result.environmentVariables['APP_RUNNER_CONNECTION_NAME']).toBe('github-conn');
      expect(result.environmentVariables['APP_RUNNER_CONNECTION_ARN']).toBe('arn:aws:apprunner:us-east-1:123456789012:connection/github-conn');
      expect(result.environmentVariables['APP_RUNNER_PROVIDER']).toBe('GITHUB');
      expect(result.environmentVariables['REPOSITORY_URL']).toBe('https://github.com/org/repo');
      expect(result.environmentVariables['BRANCH_NAME']).toBe('main');
      
      // Assert IAM policies include connection read actions with specific resource ARN
      const connectionPolicy = result.iamPolicies.find(p => p.description.includes('connection') && p.description.includes('read'));
      expect(connectionPolicy).toBeDefined();
      expect(connectionPolicy!.statement.actions).toContain('apprunner:DescribeConnection');
      expect(connectionPolicy!.statement.actions).toContain('apprunner:ListConnections');
      expect(connectionPolicy!.statement.resources).toEqual(['arn:aws:apprunner:us-east-1:123456789012:connection/github-conn']);
    });
  });

  describe('AppRunnerBind__ConnectionWriteAccess__GrantsConnectionWriteActions', () => {
    const metadata = {
      id: 'TP-binders-apprunner-006',
      level: 'unit' as const,
      capability: 'Grants App Runner connection write actions including CreateConnection and UpdateConnection for write access',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ConnectionWriteAccess',
        outcome: 'GrantsConnectionWriteActions'
      },
      invariants: [
        'IAM policies include App Runner connection write actions (CreateConnection, UpdateConnection, DeleteConnection)',
        'Read actions are included in write access',
        'Resources include connection ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:connection capability and write access',
        notes: 'App Runner connection write access with connection management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ConnectionWriteAccess__GrantsConnectionWriteActions', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-connection', {
        'apprunner:connection': {
          type: 'apprunner:connection',
          connectionArn: 'arn:aws:apprunner:us-east-1:123456789012:connection/github-conn',
          connectionName: 'github-conn',
          provider: 'GITHUB'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:connection',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted with specific resource ARN
      const writePolicy = result.iamPolicies.find(p => p.description.includes('connection') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('apprunner:CreateConnection');
      expect(writePolicy!.statement.actions).toContain('apprunner:UpdateConnection');
      expect(writePolicy!.statement.actions).toContain('apprunner:DeleteConnection');
      expect(writePolicy!.statement.actions).toContain('apprunner:DescribeConnection');
      expect(writePolicy!.statement.resources).toEqual(['arn:aws:apprunner:us-east-1:123456789012:connection/github-conn']);
    });
  });

  describe('AppRunnerBind__ConnectionBranchDefault__DefaultsToMain', () => {
    const metadata = {
      id: 'TP-binders-apprunner-007',
      level: 'unit' as const,
      capability: 'Applies default branch name (main) when branch is not specified',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'ConnectionBranchDefault',
        outcome: 'DefaultsToMain'
      },
      invariants: [
        'Branch name defaults to "main" if not provided',
        'Custom branch name is used when specified'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:connection capability without branch name',
        notes: 'App Runner connection binding with default branch'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__ConnectionBranchDefault__DefaultsToMain', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-connection', {
        'apprunner:connection': {
          type: 'apprunner:connection',
          connectionArn: 'arn:aws:apprunner:us-east-1:123456789012:connection/github-conn',
          connectionName: 'github-conn',
          provider: 'GITHUB',
          repositoryUrl: 'https://github.com/org/repo'
          // No branch name specified - should default to 'main'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:connection',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Default branch is applied
      expect(result.environmentVariables['BRANCH_NAME']).toBe('main');
    });
  });

  describe('AppRunnerBind__InvalidCapabilityData__ThrowsError', () => {
    const metadata = {
      id: 'TP-binders-apprunner-008',
      level: 'unit' as const,
      capability: 'Throws error when capability data structure is invalid',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: {
        pattern: 'Feature__Condition__ExpectedOutcome',
        feature: 'AppRunnerBind',
        condition: 'InvalidCapabilityData',
        outcome: 'ThrowsError'
      },
      invariants: [
        'Error is thrown when required fields are missing',
        'Error message describes the missing fields'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with invalid apprunner:service capability data',
        notes: 'App Runner service binding with missing required fields'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__InvalidCapabilityData__ThrowsError', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd'
          // Missing required fields: serviceName, serviceUrl, serviceId, ecrRepositoryArn
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'apprunner:service',
        access: 'read'
      });

      await expect(executeUnifiedBinding(strategy, context)).rejects.toThrow(
        'Invalid App Runner service capability data structure'
      );
    });
  });

  describe('AppRunnerBind__CustomActionsOverride__ReplacesCoarseActions', () => {
    const metadata = {
      id: 'TP-binders-apprunner-012',
      level: 'unit' as const,
      capability: 'Custom actions override replaces default App Runner actions',
      oracle: 'exact' as const,
      determinism: 'deterministic' as const,
      naming: { pattern: 'AppRunnerBind__Condition__Outcome', example: 'AppRunnerBind__CustomActionsOverride__ReplacesCoarseActions' },
      invariants: [
        'IAM policy actions match provided custom actions array',
        'Default App Runner actions are not included when custom actions provided',
        'Actions array is used directly (replaces coarse access)'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with apprunner:service capability and directive.actions array',
        notes: 'Granular actions override test'
      },
      risks: [],
      dependencies: ['action-resolver'],
      evidence: [],
      compliance_refs: ['docs/platform-standards/platform-iam-auditing-standard.md'],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('AppRunnerBind__CustomActionsOverride__ReplacesCoarseActions', async () => {
      const strategy = new AppRunnerBinderStrategy();
      const customActions = ['apprunner:DescribeService', 'apprunner:ListServices'];
      const target = createMockTargetComponent('apprunner-service', {
        'apprunner:service': {
          type: 'apprunner:service',
          serviceArn: 'arn:aws:apprunner:us-east-1:123456789012:service/app/abcd',
          serviceName: 'app',
          serviceUrl: 'https://app.awsapprunner.com',
          serviceId: 'abcd',
          ecrRepositoryArn: 'arn:aws:ecr:us-east-1:123456789012:repository/app'
        }
      });

      const context = createBindingContext({
        source: createMockSourceComponent(),
        target,
        capability: 'apprunner:service',
        access: 'read',
        actions: customActions
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      expect(result.iamPolicies.length).toBeGreaterThan(0);
      const servicePolicy = result.iamPolicies.find(p => p.description.includes('service') && p.description.includes('read'));
      expect(servicePolicy).toBeDefined();
      
      const statementJson = servicePolicy!.statement.toStatementJson();
      const actions = Array.isArray(statementJson.Action)
        ? statementJson.Action
        : [statementJson.Action];

      expect(actions).toEqual(expect.arrayContaining(customActions));
      expect(actions.length).toBe(customActions.length);
    });
  });
});
