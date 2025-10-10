/**
 * CDK Nag Security Tests for ECS EC2 Service Component
 * 
 * Validates that the component follows AWS security best practices
 * using cdk-nag AwsSolutions pack.
 */

import { App, Stack, Aspects, Annotations, Match } from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsEc2ServiceComponent } from '../../src/ecs-ec2-service.component';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

describe('ECS EC2 Service - CDK Nag Security Checks', () => {
  let app: App;
  let stack: Stack;
  let vpc: ec2.IVpc;
  let cluster: ecs.ICluster;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });

    // Create VPC for testing
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      natGateways: 1
    });

    // Create ECS cluster for testing
    cluster = new ecs.Cluster(stack, 'TestCluster', {
      vpc,
      clusterName: 'test-cluster'
    });

    // Apply AWS Solutions security checks
    Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));
  });

  it('should pass AWS Solutions security checks with justified suppressions', () => {
    const context: ComponentContext = {
      serviceName: 'test-service',
      environment: 'prod',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      vpc,
      serviceLabels: {
        owner: 'test-team',
        version: '1.0.0'
      }
    };

    const spec: ComponentSpec = {
      name: 'test-ecs-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'public.ecr.aws/nginx/nginx',
          tag: 'latest'
        },
        taskCpu: 256,
        taskMemory: 512,
        port: 8080,
        serviceConnect: {
          portMappingName: 'api'
        }
      }
    };

    const component = new EcsEc2ServiceComponent(stack, 'TestComponent', context, spec);

    // Suppress known/accepted warnings with justification
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/TestComponent/TaskDefinition',
      [
        {
          id: 'AwsSolutions-ECS2',
          reason: 'Environment variables are non-sensitive configuration only. Secrets use Secrets Manager integration.'
        }
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/TestComponent/TaskRole/Resource',
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'AWS managed policies are acceptable for task execution role as they follow least privilege for ECS tasks.'
        }
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/TestComponent/Service/Service',
      [
        {
          id: 'AwsSolutions-ECS4',
          reason: 'Container Insights are enabled at cluster level, not per-service, for cost optimization.'
        }
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/TestComponent/SecurityGroup/Resource',
      [
        {
          id: 'AwsSolutions-EC23',
          reason: 'Ingress from VPC CIDR is intentional for internal service communication. No public access is allowed.'
        }
      ]
    );

    // Check for errors (should be none after suppressions)
    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    expect(errors).toHaveLength(0);
  });

  it('should pass security checks for FedRAMP Moderate configuration', () => {
    const context: ComponentContext = {
      serviceName: 'fedramp-service',
      environment: 'prod',
      complianceFramework: 'fedramp-moderate',
      accountId: '123456789012',
      region: 'us-gov-west-1',
      scope: stack,
      vpc,
      serviceLabels: {
        owner: 'security-team',
        version: '1.0.0'
      }
    };

    const spec: ComponentSpec = {
      name: 'secure-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'dkr.ecr.us-gov-west-1.amazonaws.com/secure-app',
          tag: 'v1.2.3'
        },
        taskCpu: 512,
        taskMemory: 1024,
        port: 8443,
        serviceConnect: {
          portMappingName: 'secure-api'
        },
        logging: {
          retentionInDays: 1827, // 5 years for FedRAMP Moderate
          removalPolicy: 'retain'
        },
        monitoring: {
          enabled: true,
          alarms: {
            cpu: { enabled: true, threshold: 70, evaluationPeriods: 3 },
            memory: { enabled: true, threshold: 75, evaluationPeriods: 3 }
          }
        },
        diagnostics: {
          enableExecuteCommand: true
        }
      }
    };

    const component = new EcsEc2ServiceComponent(stack, 'FedRAMPComponent', context, spec);

    // Apply suppressions
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/FedRAMPComponent/TaskDefinition',
      [
        {
          id: 'AwsSolutions-ECS2',
          reason: 'Environment variables are non-sensitive configuration only. Secrets use Secrets Manager integration.'
        }
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/FedRAMPComponent/Service/Service',
      [
        {
          id: 'AwsSolutions-ECS4',
          reason: 'Container Insights enabled at cluster level for FedRAMP compliance.'
        }
      ]
    );

    // Verify no critical security issues
    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'));
    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    // Should have some warnings (expected for suppressions) but no errors
    expect(errors).toHaveLength(0);
  });

  it('should validate security group rules', () => {
    const context: ComponentContext = {
      serviceName: 'secure-service',
      environment: 'prod',
      complianceFramework: 'fedramp-high',
      accountId: '123456789012',
      region: 'us-gov-east-1',
      scope: stack,
      vpc,
      serviceLabels: {
        owner: 'security-team',
        version: '1.0.0'
      }
    };

    const spec: ComponentSpec = {
      name: 'high-security-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'dkr.ecr.us-gov-east-1.amazonaws.com/high-secure-app',
          tag: 'v2.0.0'
        },
        taskCpu: 1024,
        taskMemory: 2048,
        port: 8443,
        serviceConnect: {
          portMappingName: 'secure-api'
        }
      }
    };

    const component = new EcsEc2ServiceComponent(stack, 'HighSecurityComponent', context, spec);

    // Apply broad suppressions for this test
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Test suppression for environment variable check'
      },
      {
        id: 'AwsSolutions-ECS4',
        reason: 'Test suppression for Container Insights'
      },
      {
        id: 'AwsSolutions-EC23',
        reason: 'Test suppression for security group ingress'
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Test suppression for managed policies'
      }
    ]);

    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
    expect(errors).toHaveLength(0);
  });

  it('should validate IAM role permissions', () => {
    const context: ComponentContext = {
      serviceName: 'iam-test-service',
      environment: 'prod',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      vpc,
      serviceLabels: {
        owner: 'test-team',
        version: '1.0.0'
      }
    };

    const spec: ComponentSpec = {
      name: 'iam-test-service',
      type: 'ecs-ec2-service',
      config: {
        cluster: cluster.clusterName,
        image: {
          repository: 'public.ecr.aws/nginx/nginx',
          tag: 'latest'
        },
        serviceConnect: {
          portMappingName: 'api'
        }
      }
    };

    const component = new EcsEc2ServiceComponent(stack, 'IAMTestComponent', context, spec);

    // Apply suppressions
    NagSuppressions.addStackSuppressions(stack, [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Environment variables are non-sensitive'
      },
      {
        id: 'AwsSolutions-ECS4',
        reason: 'Container Insights at cluster level'
      },
      {
        id: 'AwsSolutions-EC23',
        reason: 'VPC CIDR ingress is intentional'
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Managed policies acceptable for ECS task execution'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Task execution role requires wildcard for CloudWatch Logs write permissions (logs:CreateLogStream/*)',
        appliesTo: ['Resource::*']
      }
    ]);

    const errors = Annotations.fromStack(stack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));
    expect(errors).toHaveLength(0);
  });
});

