import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { EfsFilesystemComponent } from '../efs-filesystem.component';
import { EfsFilesystemConfig } from '../efs-filesystem.builder';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces';

const VPC_ID = 'vpc-0abc123def4567890';
const CONTEXT_KEY = `vpcProvider:account=123456789012:filter.vpcId=${VPC_ID}:region=us-east-1`;

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'files-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'files-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<EfsFilesystemConfig> | Record<string, any>): ComponentSpec => ({
  name: 'shared-efs',
  type: 'efs-filesystem',
  config
});

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
  const originalContext = process.env.CDK_CONTEXT_JSON;

  beforeAll(() => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [CONTEXT_KEY]: {
        vpcId: VPC_ID,
        availabilityZones: ['us-east-1a', 'us-east-1b'],
        publicSubnetIds: ['subnet-public-a', 'subnet-public-b'],
        privateSubnetIds: ['subnet-private-a', 'subnet-private-b'],
        isolatedSubnetIds: [],
        ownerAccountId: '123456789012',
        region: 'us-east-1',
        routeTableIds: ['rtb-1', 'rtb-2'],
        subnetGroups: {}
      }
    });
  });

  afterAll(() => {
    if (originalContext === undefined) {
      delete process.env.CDK_CONTEXT_JSON;
    } else {
      process.env.CDK_CONTEXT_JSON = originalContext;
    }
  });

  it('synthesises a commercial filesystem with custom security group', () => {
    const spec = createSpec({
      vpc: {
        enabled: true,
        vpcId: VPC_ID,
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

    const { component, template } = synthesizeComponent(createContext('commercial'), spec);

    template.hasResourceProperties('AWS::EFS::FileSystem', {
      PerformanceMode: 'generalPurpose',
      Encrypted: true,
      FileSystemTags: Match.arrayWith([
        Match.objectLike({ Key: 'backups-enabled', Value: 'true' })
      ]),
      BackupPolicy: { Status: 'ENABLED' }
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: Match.stringLikeRegexp('EFS filesystem'),
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({ FromPort: 2049, ToPort: 2049 })
      ])
    });

    expect(component.getCapabilities()['storage:efs']).toBeDefined();
  });

  it('enables monitoring and logging when requested', () => {
    const spec = createSpec({
      vpc: {
        enabled: true,
        vpcId: VPC_ID,
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

    const { template } = synthesizeComponent(createContext('commercial'), spec);

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
    const spec = createSpec({
      vpc: {
        enabled: true,
        vpcId: VPC_ID,
        subnetIds: ['subnet-private-a', 'subnet-private-b'],
        securityGroup: {
          create: true
        }
      }
    });

    const { template } = synthesizeComponent(createContext('fedramp-high'), spec);

    template.hasResourceProperties('AWS::EFS::FileSystem', Match.objectLike({
      Encrypted: true,
      BackupPolicy: { Status: 'ENABLED' }
    }));

    template.hasResource('AWS::CloudWatch::Alarm', Match.anyValue());
  });
});
