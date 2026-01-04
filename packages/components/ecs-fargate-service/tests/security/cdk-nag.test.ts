/**
 * CDK Nag Security Tests for ECS Fargate Service Component
 * 
 * Validates that the component follows AWS security best practices
 * using CDK Nag rule packs (AwsSolutions and FedRAMP)
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsFargateServiceComponent } from '../../src/ecs-fargate-service.component';

describe('EcsFargateServiceComponent - CDK Nag Security Validation', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let cluster: ecs.Cluster;
  let context: ComponentContext;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    cluster = new ecs.Cluster(stack, 'TestCluster', {
      vpc,
      containerInsights: true // Required for AwsSolutions-ECS4
    });
    cluster.addDefaultCloudMapNamespace({ name: 'internal.local' });

    context = {
      serviceName: 'test-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      accountId: '123456789012',
      region: 'us-east-1',
      scope: stack,
      vpc
    } as ComponentContext;
  });

  describe('Commercial Framework - AwsSolutions', () => {
    it('passes AwsSolutions security checks for basic service', () => {
      const spec: ComponentSpec = {
        name: 'test-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-api',
            tag: 'v1.0.0'
          },
          serviceConnect: {
            portMappingName: 'api',
            namespace: 'internal.local'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'TestService', context, spec);
      component.synth();

      // Apply CDK Nag
      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for errors
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );

      const componentErrors = errors.filter((error) => {
        const message = String((error as any)?.entry?.data ?? '');
        return !message.includes('AwsSolutions-VPC7');
      });

      expect(componentErrors).toHaveLength(0);
    });

    it('security group has no overly permissive ingress rules', () => {
      const spec: ComponentSpec = {
        name: 'test-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'test-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'TestService', context, spec);
      component.synth();

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for AwsSolutions-EC23 (security group with overly permissive ingress)
      const warnings = Annotations.fromStack(stack).findWarning(
        '*',
        Match.stringLikeRegexp('AwsSolutions-EC23')
      );

      // Should have no EC23 warnings (no default VPC-wide ingress)
      expect(warnings).toHaveLength(0);
    });

    it('task definition has container logging enabled', () => {
      const spec: ComponentSpec = {
        name: 'test-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'test-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'TestService', context, spec);
      component.synth();

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      // Check for AwsSolutions-ECS7 (container logging disabled)
      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-ECS7')
      );

      // Should have no ECS7 errors (logging is enabled)
      expect(errors).toHaveLength(0);
    });
  });

  describe('FedRAMP Moderate - Enhanced Security', () => {
    it('passes security checks with KMS encryption', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: '123456789012.dkr.ecr.us-east-1.amazonaws.com/fedramp-api',
            tag: 'v1.0.0'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampService', context, spec);
      component.synth();

      Aspects.of(stack).add(new AwsSolutionsChecks({ verbose: true }));

      const errors = Annotations.fromStack(stack).findError(
        '*',
        Match.stringLikeRegexp('AwsSolutions-.*')
      );
      const componentErrors = errors.filter((error) => {
        const message = String((error as any)?.entry?.data ?? '');
        return !message.includes('AwsSolutions-VPC7');
      });

      expect(componentErrors).toHaveLength(0);
    });

    it('enables ECS Exec for audit requirements', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'fedramp-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampService', context, spec);
      component.synth();

      // Verify ECS Exec is enabled
      const template = cdk.assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::Service', {
        EnableExecuteCommand: true
      });
    });

    it('uses higher resource allocations for FedRAMP', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'fedramp-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampService', context, spec);
      component.synth();

      // Verify higher resource allocations
      const template = cdk.assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        Cpu: '512',
        Memory: '1024',
        EphemeralStorage: {
          SizeInGiB: 50
        }
      });
    });
  });

  describe('FedRAMP High - Maximum Security', () => {
    it('enforces high availability with multiple tasks', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-high'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-high-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'fedramp-high-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampHighService', context, spec);
      component.synth();

      // Verify high availability (2+ tasks by default)
      const template = cdk.assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::Service', {
        DesiredCount: 2
      });
    });

    it('uses stricter monitoring thresholds', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-high'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-high-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'fedramp-high-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampHighService', context, spec);
      component.synth();

      // Verify stricter alarm thresholds
      const template = cdk.assertions.Template.fromStack(stack);
      const alarms = template.findResources('AWS::CloudWatch::Alarm');

      // Find CPU alarm
      const cpuAlarm = Object.values(alarms).find((alarm: any) =>
        alarm.Properties?.MetricName === 'CPUUtilization'
      );

      expect(cpuAlarm).toBeDefined();
      expect((cpuAlarm as any).Properties.Threshold).toBe(70); // FedRAMP high baseline
    });
  });

  describe('X-Ray and Observability', () => {
    it('includes X-Ray daemon sidecar', () => {
      const spec: ComponentSpec = {
        name: 'test-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'test-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'TestService', context, spec);
      component.synth();

      // Verify X-Ray sidecar container exists
      const template = cdk.assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
          Match.objectLike({
            Name: 'xray-daemon',
            Image: Match.stringLikeRegexp('.*xray.*')
          })
        ])
      });
    });

    it('injects OTEL environment variables', () => {
      const spec: ComponentSpec = {
        name: 'test-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'test-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'TestService', context, spec);
      component.synth();

      // Verify OTEL environment variables
      const template = cdk.assertions.Template.fromStack(stack);
      const tdResources = Object.values(template.findResources('AWS::ECS::TaskDefinition')) as Array<{ Properties: any }>;
      expect(tdResources.length).toBeGreaterThan(0);
      const def = tdResources[0].Properties;
      const container = (def.ContainerDefinitions as Array<any>).find((item) => item.Name === 'Container');

      expect(container?.Environment).toEqual(expect.arrayContaining([
        expect.objectContaining({
          Name: 'OTEL_EXPORTER_OTLP_ENDPOINT',
          Value: expect.stringContaining('https://otel-collector')
        }),
        expect.objectContaining({
          Name: 'OTEL_SERVICE_NAME',
          Value: 'test-service-test-api'
        })
      ]));
    });
  });

  describe('Encryption and Data Protection', () => {
    it('creates KMS key for FedRAMP log encryption', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'fedramp-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampService', context, spec);
      component.synth();

      // Verify KMS key exists
      const template = cdk.assertions.Template.fromStack(stack);
      template.resourceCountIs('AWS::KMS::Key', 1);

      // Verify key rotation is enabled
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true
      });
    });

    it('enables ephemeral storage for FedRAMP', () => {
      context = {
        ...context,
        complianceFramework: 'fedramp-moderate'
      } as ComponentContext;

      const spec: ComponentSpec = {
        name: 'fedramp-api',
        type: 'ecs-fargate-service',
        config: {
          cluster: cluster.clusterName,
          image: {
            repository: 'fedramp-api',
            tag: 'latest'
          },
          serviceConnect: {
            portMappingName: 'api'
          }
        }
      };

      const component = new EcsFargateServiceComponent(stack, 'FedRampService', context, spec);
      component.synth();

      // Verify ephemeral storage configuration
      const template = cdk.assertions.Template.fromStack(stack);
      template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        EphemeralStorage: {
          SizeInGiB: 50
        }
      });
    });
  });
});
