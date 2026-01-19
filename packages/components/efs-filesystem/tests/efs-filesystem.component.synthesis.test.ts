import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { EfsFilesystemComponent } from '../src/efs-filesystem.component';
import { EfsFilesystemConfig } from '../src/efs-filesystem.builder';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createContext = (framework?: string): ComponentContext => {
  const fw = framework || 'commercial';
  return {
    serviceName: 'files-service',
    owner: 'platform-team',
    environment: 'dev',
    complianceFramework: fw,
    region: 'us-east-1',
    account: '123456789012',
    tags: {
      'service-name': 'files-service',
      environment: 'dev',
      'compliance-framework': fw
    }
  } as ComponentContext;
};

const createSpec = (config: Partial<EfsFilesystemConfig> | Record<string, any>): ComponentSpec => {
  return {
    name: 'shared-efs',
    type: 'efs-filesystem',
    config
  };
};

const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: context.account, region: context.region }
  });

  const component = new EfsFilesystemComponent(stack, spec.name, context, spec);
  component.synth();

  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('EfsFilesystemComponent synthesis', () => {

  it('synthesises a commercial filesystem with custom security group', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    // Create VPC construct and inject via context (avoids Vpc.fromLookup() in unit tests)
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const context = createContext('commercial');
    context.vpc = vpc;

    const spec = createSpec({
      vpc: {
        enabled: true,
        // Use injected VPC via context.vpc instead of vpcId (avoids Vpc.fromLookup() in unit tests)
        subnetIds: ['subnet-private-a', 'subnet-private-b'],
        securityGroup: {
          create: true,
          ingressRules: [
            {
              port: 2049,
              cidr: '10.0.0.0/16',
              description: 'NFS traffic from app subnets'
            }
          ]
        }
      },
      encryption: {
        enabled: true,
        encryptInTransit: true,
        customerManagedKey: {
          create: false,
          enableRotation: true
        }
      },
      backups: {
        enabled: true
      }
    });

    const component = new EfsFilesystemComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::EFS::FileSystem', {
      PerformanceMode: 'generalPurpose',
      Encrypted: true,
      FileSystemTags: Match.arrayWith([
        Match.objectLike({ Key: 'backups-enabled', Value: 'true' })
      ]),
      BackupPolicy: { Status: 'ENABLED' },
      FileSystemPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Condition: Match.objectLike({
              Bool: {
                'aws:SecureTransport': 'false'
              }
            })
          })
        ])
      })
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('EFS filesystem'),
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({ FromPort: 2049, ToPort: 2049 })
      ])
    });

    expect(component.getCapabilities()['storage:efs']).toBeDefined();
    expect(component.getCapabilities()['efs:file-system']).toBeDefined();
  });

  it('enables monitoring and logging when requested', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    // Create VPC construct and inject via context (avoids Vpc.fromLookup() in unit tests)
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const context = createContext('commercial');
    context.vpc = vpc;

    const spec = createSpec({
      vpc: {
        enabled: true,
        // Use injected VPC via context.vpc instead of vpcId (avoids Vpc.fromLookup() in unit tests)
        subnetIds: ['subnet-private-a', 'subnet-private-b'],
        securityGroup: {
          create: false,
          securityGroupId: 'sg-0123456789abcdef0',
          ingressRules: []
        }
      },
      logging: {
        access: {
          enabled: true,
          retentionInDays: 180,
          removalPolicy: 'retain'
        },
        audit: {
          enabled: true,
          retentionInDays: 365,
          removalPolicy: 'retain'
        }
      },
      monitoring: {
        enabled: true,
        alarms: {
          storageUtilization: {
            enabled: true,
            threshold: 214748364800
          },
          clientConnections: {
            enabled: true,
            threshold: 200
          },
          burstCreditBalance: {
            enabled: true,
            threshold: 128,
            comparisonOperator: 'lt'
          }
        }
      }
    });

    const component = new EfsFilesystemComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', Match.objectLike({
      RetentionInDays: 180
    }));

    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({
        AlarmName: Match.stringLikeRegexp('files-service-shared-efs-storage-utilization-alarm')
      })
    }));
  });

  it('honours fedramp-high defaults', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    // Create VPC construct and inject via context (avoids Vpc.fromLookup() in unit tests)
    const vpc = new ec2.Vpc(stack, 'TestVpc', { maxAzs: 2 });
    const context = createContext('fedramp-high');
    context.vpc = vpc;

    const spec = createSpec({
      vpc: {
        enabled: true,
        // Use injected VPC via context.vpc instead of vpcId (avoids Vpc.fromLookup() in unit tests)
        subnetIds: ['subnet-private-a', 'subnet-private-b'],
        securityGroup: {
          create: true
        }
      }
    });

    const component = new EfsFilesystemComponent(stack, spec.name, context, spec);
    component.synth();
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::EFS::FileSystem', Match.objectLike({
      Encrypted: true,
      BackupPolicy: { Status: 'ENABLED' }
    }));

    template.hasResource('AWS::CloudWatch::Alarm', Match.anyValue());
  });
});
