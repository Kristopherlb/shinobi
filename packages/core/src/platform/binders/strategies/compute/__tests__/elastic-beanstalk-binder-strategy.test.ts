/**
 * Unit Tests: Elastic Beanstalk Binder Strategy (Unified)
 * Tests for AWS Elastic Beanstalk bindings with compliance enforcement
 */

import { ElasticBeanstalkBinderStrategy } from '../elastic-beanstalk-binder-strategy.js';
import {
  createMockSourceComponent,
  createMockTargetComponent,
  createBindingContext,
  executeUnifiedBinding,
  assertEnhancedBindingResult,
  TEST_CONSTANTS
} from '../../security/__tests__/unified-strategy-test-helpers.js';

describe('ElasticBeanstalkBinderStrategy', () => {
  describe('ElasticBeanstalkBind__ValidApplicationAccess__ReturnsApplicationEnvVars', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-001',
      level: 'unit' as const,
      capability: 'Returns Elastic Beanstalk application environment variables for valid application access',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'ValidApplicationAccess',
        outcome: 'ReturnsApplicationEnvVars'
      },
      invariants: [
        'Returns EnhancedBindingResult with compliance block',
        'Environment variables include EB_APPLICATION_NAME, EB_APPLICATION_ARN',
        'IAM policies include Elastic Beanstalk application read actions',
        'S3 access is granted when version bucket is provided',
        'Security group rules array is empty'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:application capability and read access',
        notes: 'Basic Elastic Beanstalk application read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__ValidApplicationAccess__ReturnsApplicationEnvVars', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-application', {
        'elasticbeanstalk:application': {
          type: 'elasticbeanstalk:application',
          applicationArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app',
          applicationName: 'test-app',
          description: 'Test application',
          versionBucket: 'test-app-versions',
          versionLabels: ['v1.0.0', 'v1.1.0']
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:application',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Application environment variables are set
      expect(result.environmentVariables['EB_APPLICATION_NAME']).toBe('test-app');
      expect(result.environmentVariables['EB_APPLICATION_ARN']).toBe('arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app');
      expect(result.environmentVariables['EB_APPLICATION_DESCRIPTION']).toBe('Test application');
      expect(result.environmentVariables['EB_VERSION_LABELS']).toBe('v1.0.0,v1.1.0');
      
      // Assert IAM policies include Elastic Beanstalk application read actions
      const appPolicy = result.iamPolicies.find(p => p.description.includes('application') && p.description.includes('read'));
      expect(appPolicy).toBeDefined();
      expect(appPolicy!.statement.actions).toContain('elasticbeanstalk:DescribeApplications');
      expect(appPolicy!.statement.resources).toEqual(['arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app']);
      
      // Assert S3 access is granted
      const s3Policy = result.iamPolicies.find(p => p.description.includes('S3'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      expect(s3Policy!.statement.resources).toEqual(['arn:aws:s3:::test-app-versions/*']);
      
      expect(result.securityGroupRules).toEqual([]);
    });
  });

  describe('ElasticBeanstalkBind__ApplicationWriteAccess__GrantsApplicationWriteActions', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-002',
      level: 'unit' as const,
      capability: 'Grants Elastic Beanstalk application write actions including CreateApplication and UpdateApplication for write access',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'ApplicationWriteAccess',
        outcome: 'GrantsApplicationWriteActions'
      },
      invariants: [
        'IAM policies include Elastic Beanstalk application write actions (CreateApplication, UpdateApplication, DeleteApplication)',
        'Read actions are included in write access',
        'Resources include application ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:application capability and write access',
        notes: 'Elastic Beanstalk application write access with application management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__ApplicationWriteAccess__GrantsApplicationWriteActions', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-application', {
        'elasticbeanstalk:application': {
          type: 'elasticbeanstalk:application',
          applicationArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app',
          applicationName: 'test-app'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:application',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('application') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:CreateApplication');
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:UpdateApplication');
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:DeleteApplication');
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:DescribeApplications');
    });
  });

  describe('ElasticBeanstalkBind__ValidEnvironmentAccess__ReturnsEnvironmentEnvVars', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-003',
      level: 'unit' as const,
      capability: 'Returns Elastic Beanstalk environment environment variables for valid environment access',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'ValidEnvironmentAccess',
        outcome: 'ReturnsEnvironmentEnvVars'
      },
      invariants: [
        'Environment variables include EB_ENVIRONMENT_NAME, EB_ENVIRONMENT_ARN, EB_ENVIRONMENT_URL, EB_ENVIRONMENT_STATUS',
        'IAM policies include Elastic Beanstalk environment read actions',
        'CloudWatch Logs access is granted when log groups are provided',
        'Platform and solution stack information are exposed'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:environment capability and read access',
        notes: 'Basic Elastic Beanstalk environment read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__ValidEnvironmentAccess__ReturnsEnvironmentEnvVars', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-environment', {
        'elasticbeanstalk:environment': {
          type: 'elasticbeanstalk:environment',
          environmentArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:environment/test-app/test-env',
          environmentName: 'test-env',
          environmentId: 'e-abc123',
          endpointUrl: 'http://test-env.elasticbeanstalk.com',
          status: 'Ready',
          health: 'Ok',
          platformVersion: '64bit Amazon Linux 2 v3.4.0 running Python 3.8',
          solutionStackName: '64bit Amazon Linux 2 v3.4.0 running Python 3.8',
          tier: {
            name: 'WebServer',
            type: 'Standard',
            version: '1.0'
          },
          logGroups: ['/aws/elasticbeanstalk/test-env/var/log/eb-engine.log']
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:environment',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Environment environment variables are set
      expect(result.environmentVariables['EB_ENVIRONMENT_NAME']).toBe('test-env');
      expect(result.environmentVariables['EB_ENVIRONMENT_ARN']).toBe('arn:aws:elasticbeanstalk:us-east-1:123456789012:environment/test-app/test-env');
      expect(result.environmentVariables['EB_ENVIRONMENT_ID']).toBe('e-abc123');
      expect(result.environmentVariables['EB_ENVIRONMENT_URL']).toBe('http://test-env.elasticbeanstalk.com');
      expect(result.environmentVariables['EB_ENVIRONMENT_STATUS']).toBe('Ready');
      expect(result.environmentVariables['EB_ENVIRONMENT_HEALTH']).toBe('Ok');
      expect(result.environmentVariables['EB_PLATFORM_VERSION']).toBe('64bit Amazon Linux 2 v3.4.0 running Python 3.8');
      expect(result.environmentVariables['EB_TIER_NAME']).toBe('WebServer');
      expect(result.environmentVariables['EB_TIER_TYPE']).toBe('Standard');
      
      // Assert IAM policies include CloudWatch Logs access
      const logsPolicy = result.iamPolicies.find(p => p.description.includes('CloudWatch Logs'));
      expect(logsPolicy).toBeDefined();
      expect(logsPolicy!.statement.actions).toContain('logs:DescribeLogGroups');
      expect(logsPolicy!.statement.actions).toContain('logs:GetLogEvents');
    });
  });

  describe('ElasticBeanstalkBind__EnvironmentWriteAccess__GrantsEnvironmentWriteActions', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-004',
      level: 'unit' as const,
      capability: 'Grants Elastic Beanstalk environment write actions including CreateEnvironment and UpdateEnvironment for write access',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'EnvironmentWriteAccess',
        outcome: 'GrantsEnvironmentWriteActions'
      },
      invariants: [
        'IAM policies include Elastic Beanstalk environment write actions (CreateEnvironment, UpdateEnvironment, TerminateEnvironment)',
        'Read actions are included in write access',
        'Resources include environment ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:environment capability and write access',
        notes: 'Elastic Beanstalk environment write access with environment management permissions'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__EnvironmentWriteAccess__GrantsEnvironmentWriteActions', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-environment', {
        'elasticbeanstalk:environment': {
          type: 'elasticbeanstalk:environment',
          environmentArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:environment/test-app/test-env',
          environmentName: 'test-env',
          environmentId: 'e-abc123',
          endpointUrl: 'http://test-env.elasticbeanstalk.com',
          status: 'Ready',
          health: 'Ok',
          platformVersion: '64bit Amazon Linux 2 v3.4.0 running Python 3.8',
          solutionStackName: '64bit Amazon Linux 2 v3.4.0 running Python 3.8'
        }
      });

      const context = createBindingContext({
        source,
        target,
      capability: 'elasticbeanstalk:environment',
        access: 'write'
      });

      const result = await executeUnifiedBinding(strategy, context);

      // Primary assertion: Write actions are granted
      const writePolicy = result.iamPolicies.find(p => p.description.includes('environment') && p.description.includes('write'));
      expect(writePolicy).toBeDefined();
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:CreateEnvironment');
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:UpdateEnvironment');
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:TerminateEnvironment');
      expect(writePolicy!.statement.actions).toContain('elasticbeanstalk:DescribeEnvironments');
    });
  });

  describe('ElasticBeanstalkBind__ValidVersionAccess__ReturnsVersionEnvVars', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-005',
      level: 'unit' as const,
      capability: 'Returns Elastic Beanstalk version environment variables for valid version access',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'ValidVersionAccess',
        outcome: 'ReturnsVersionEnvVars'
      },
      invariants: [
        'Environment variables include EB_VERSION_LABEL, EB_VERSION_ARN',
        'IAM policies include Elastic Beanstalk version read actions',
        'S3 access is granted when source bundle is provided',
        'Source bundle and build configuration information are exposed'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:version capability and read access',
        notes: 'Basic Elastic Beanstalk version read access binding'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__ValidVersionAccess__ReturnsVersionEnvVars', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-version', {
        'elasticbeanstalk:version': {
          type: 'elasticbeanstalk:version',
          applicationArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app',
          versionLabel: 'v1.0.0',
          versionArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:applicationversion/test-app/v1.0.0',
          description: 'Version 1.0.0',
          sourceBundle: {
            s3Bucket: 'test-app-versions',
            s3Key: 'v1.0.0/app.zip'
          },
          buildConfiguration: {
            artifactName: 'app.zip',
            codeBuildServiceRole: 'arn:aws:iam::123456789012:role/codebuild-role'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:version',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Version environment variables are set
      expect(result.environmentVariables['EB_VERSION_LABEL']).toBe('v1.0.0');
      expect(result.environmentVariables['EB_VERSION_ARN']).toBe('arn:aws:elasticbeanstalk:us-east-1:123456789012:applicationversion/test-app/v1.0.0');
      expect(result.environmentVariables['EB_VERSION_DESCRIPTION']).toBe('Version 1.0.0');
      expect(result.environmentVariables['EB_SOURCE_BUNDLE_S3_BUCKET']).toBe('test-app-versions');
      expect(result.environmentVariables['EB_SOURCE_BUNDLE_S3_KEY']).toBe('v1.0.0/app.zip');
      expect(result.environmentVariables['EB_BUILD_CONFIG_ARTIFACT_NAME']).toBe('app.zip');
      
      // Assert IAM policies include S3 access
      const s3Policy = result.iamPolicies.find(p => p.description.includes('S3'));
      expect(s3Policy).toBeDefined();
      expect(s3Policy!.statement.actions).toContain('s3:GetObject');
      expect(s3Policy!.statement.resources).toEqual(['arn:aws:s3:::test-app-versions/*']);
    });
  });

  describe('ElasticBeanstalkBind__SecureNetworkingEnabled__ConfiguresVpcSslAutoScaling', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-006',
      level: 'unit' as const,
      capability: 'Configures VPC networking, SSL certificate, and auto scaling when secure networking is enabled',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'SecureNetworkingEnabled',
        outcome: 'ConfiguresVpcSslAutoScaling'
      },
      invariants: [
        'Environment variables include EB_VPC_ID, EB_SUBNETS, EB_SECURITY_GROUPS when VPC is configured',
        'Environment variables include EB_SSL_CERTIFICATE_ARN and EB_LOAD_BALANCER_ARN when provided',
        'IAM policies include ACM certificate, auto scaling, and KMS permissions when enabled',
        'Secure networking configuration is optional and only applied when requireSecureNetworking is true'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:environment capability and requireSecureNetworking option',
        notes: 'Elastic Beanstalk environment binding with secure networking enabled'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__SecureNetworkingEnabled__ConfiguresVpcSslAutoScaling', async () => {
    const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-environment', {
        'elasticbeanstalk:environment': {
          type: 'elasticbeanstalk:environment',
          environmentArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:environment/test-app/test-env',
          environmentName: 'test-env',
          environmentId: 'e-abc123',
          endpointUrl: 'https://test-env.elasticbeanstalk.com',
      status: 'Ready',
          health: 'Ok',
          platformVersion: '64bit Amazon Linux 2 v3.4.0 running Python 3.8',
          solutionStackName: '64bit Amazon Linux 2 v3.4.0 running Python 3.8',
          vpcId: 'vpc-123',
          subnets: ['subnet-123', 'subnet-456'],
          securityGroups: ['sg-123', 'sg-456'],
          loadBalancerArn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/abc123',
      loadBalancerType: 'application',
          sslCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc123',
          autoScalingGroups: ['test-app-test-env-asg'],
          encryptionKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/abc123',
      healthCheckUrl: '/health',
      healthCheckTimeout: 30
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:environment',
        access: 'read',
        options: {
          requireSecureNetworking: true,
          enableEncryption: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: Secure networking environment variables are set
      expect(result.environmentVariables['EB_VPC_ID']).toBe('vpc-123');
      expect(result.environmentVariables['EB_SUBNETS']).toBe('subnet-123,subnet-456');
      expect(result.environmentVariables['EB_SECURITY_GROUPS']).toBe('sg-123,sg-456');
      expect(result.environmentVariables['EB_LOAD_BALANCER_ARN']).toBe('arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/abc123');
      expect(result.environmentVariables['EB_LOAD_BALANCER_TYPE']).toBe('application');
      expect(result.environmentVariables['EB_SSL_CERTIFICATE_ARN']).toBe('arn:aws:acm:us-east-1:123456789012:certificate/abc123');
      expect(result.environmentVariables['EB_AUTO_SCALING_GROUPS']).toBe('test-app-test-env-asg');
      expect(result.environmentVariables['EB_ENCRYPTION_ENABLED']).toBe('true');
      expect(result.environmentVariables['EB_ENCRYPTION_KEY_ARN']).toBe('arn:aws:kms:us-east-1:123456789012:key/abc123');
      expect(result.environmentVariables['EB_HEALTH_CHECK_URL']).toBe('/health');
      expect(result.environmentVariables['EB_HEALTH_CHECK_TIMEOUT']).toBe('30');
      
      // Assert IAM policies include secure networking permissions
      const acmPolicy = result.iamPolicies.find(p => p.description.includes('ACM certificate'));
      expect(acmPolicy).toBeDefined();
      expect(acmPolicy!.statement.actions).toContain('acm:DescribeCertificate');
      expect(acmPolicy!.statement.resources).toEqual(['arn:aws:acm:us-east-1:123456789012:certificate/abc123']);
      
      const autoScalingPolicy = result.iamPolicies.find(p => p.description.includes('Auto scaling'));
      expect(autoScalingPolicy).toBeDefined();
      expect(autoScalingPolicy!.statement.actions).toContain('autoscaling:DescribeAutoScalingGroups');
      
      const kmsPolicy = result.iamPolicies.find(p => p.description.includes('KMS'));
      expect(kmsPolicy).toBeDefined();
      expect(kmsPolicy!.statement.actions).toContain('kms:Decrypt');
      expect(kmsPolicy!.statement.resources).toEqual(['arn:aws:kms:us-east-1:123456789012:key/abc123']);
    });
  });

  describe('ElasticBeanstalkBind__CodeBuildIntegration__GrantsCodeBuildPermissions', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-007',
      level: 'unit' as const,
      capability: 'Grants CodeBuild permissions when build configuration includes CodeBuild service role',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'CodeBuildIntegration',
        outcome: 'GrantsCodeBuildPermissions'
      },
      invariants: [
        'CodeBuild permissions are granted when codeBuildServiceRole is provided',
        'IAM PassRole permission is granted for CodeBuild service role',
        'Environment variables include CodeBuild service role ARN'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:version capability including buildConfiguration with codeBuildServiceRole',
        notes: 'Elastic Beanstalk version binding with CodeBuild integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__CodeBuildIntegration__GrantsCodeBuildPermissions', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-version', {
        'elasticbeanstalk:version': {
          type: 'elasticbeanstalk:version',
          applicationArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app',
          versionLabel: 'v1.0.0',
          versionArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:applicationversion/test-app/v1.0.0',
          buildConfiguration: {
            artifactName: 'test-artifact',
            codeBuildServiceRole: 'arn:aws:iam::123456789012:role/codebuild-service-role'
          }
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:version',
        access: 'read'
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: CodeBuild environment variables are set
      expect(result.environmentVariables['EB_BUILD_CONFIG_ARTIFACT_NAME']).toBe('test-artifact');
      expect(result.environmentVariables['EB_BUILD_CONFIG_CODE_BUILD_SERVICE_ROLE']).toBe('arn:aws:iam::123456789012:role/codebuild-service-role');
      
      // Assert IAM policies include CodeBuild permissions
      const codeBuildPolicy = result.iamPolicies.find(p => p.description.includes('CodeBuild'));
      expect(codeBuildPolicy).toBeDefined();
      expect(codeBuildPolicy!.statement.actions).toContain('codebuild:StartBuild');
      expect(codeBuildPolicy!.statement.actions).toContain('codebuild:BatchGetBuilds');
      
      // Assert IAM PassRole permission is granted
      const passRolePolicy = result.iamPolicies.find(p => p.description.includes('PassRole') && p.description.includes('CodeBuild'));
      expect(passRolePolicy).toBeDefined();
      expect(passRolePolicy!.statement.actions).toContain('iam:PassRole');
      expect(passRolePolicy!.statement.resources).toEqual(['arn:aws:iam::123456789012:role/codebuild-service-role']);
    });
  });

  describe('ElasticBeanstalkBind__CodePipelineIntegration__GrantsCodePipelinePermissions', () => {
    const metadata = {
      id: 'TP-binders-elasticbeanstalk-008',
      level: 'unit' as const,
      capability: 'Grants CodePipeline permissions when CodePipeline integration is enabled',
      oracle: 'exact' as const,
        feature: 'ElasticBeanstalkBind',
        condition: 'CodePipelineIntegration',
        outcome: 'GrantsCodePipelinePermissions'
      },
      invariants: [
        'CodePipeline permissions are granted when enableCodePipeline option is true',
        'Environment variable EB_CODEPIPELINE_ENABLED is set to true',
        'IAM policies include CodePipeline actions for deployments'
      ],
      fixtures: ['MockSourceComponent', 'MockTargetComponent'],
      inputs: {
        shape: 'BindingContext with elasticbeanstalk:version capability and enableCodePipeline option',
        notes: 'Elastic Beanstalk version binding with CodePipeline integration'
      },
      risks: [],
      dependencies: [],
      evidence: [],
      compliance_refs: [],
      ai_generated: true,
      human_reviewed_by: 'Platform Engineering'
    };

    test('ElasticBeanstalkBind__CodePipelineIntegration__GrantsCodePipelinePermissions', async () => {
      const strategy = new ElasticBeanstalkBinderStrategy();
      const source = createMockSourceComponent();
      const target = createMockTargetComponent('elasticbeanstalk-version', {
        'elasticbeanstalk:version': {
          type: 'elasticbeanstalk:version',
          applicationArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:application/test-app',
          versionLabel: 'v1.0.0',
          versionArn: 'arn:aws:elasticbeanstalk:us-east-1:123456789012:applicationversion/test-app/v1.0.0'
        }
      });

      const context = createBindingContext({
        source,
        target,
        capability: 'elasticbeanstalk:version',
        access: 'read',
        options: {
          enableCodePipeline: true
        }
      });

      const result = await executeUnifiedBinding(strategy, context);

      assertEnhancedBindingResult(result);

      // Primary assertion: CodePipeline environment variable is set
      expect(result.environmentVariables['EB_CODEPIPELINE_ENABLED']).toBe('true');
      
      // Assert IAM policies include CodePipeline permissions
      const codePipelinePolicy = result.iamPolicies.find(p => p.description.includes('CodePipeline'));
      expect(codePipelinePolicy).toBeDefined();
      expect(codePipelinePolicy!.statement.actions).toContain('codepipeline:GetPipeline');
      expect(codePipelinePolicy!.statement.actions).toContain('codepipeline:StartPipelineExecution');
      expect(codePipelinePolicy!.statement.actions).toContain('codepipeline:PutJobSuccessResult');
    });
  });
});
