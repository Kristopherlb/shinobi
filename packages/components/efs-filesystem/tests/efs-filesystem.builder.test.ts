import {
  EfsFilesystemComponentConfigBuilder,
  EfsFilesystemConfig
} from '../efs-filesystem.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

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

const createSpec = (config: Partial<EfsFilesystemConfig> = {}): ComponentSpec => ({
  name: 'shared-efs',
  type: 'efs-filesystem',
  config
});

describe('EfsFilesystemComponentConfigBuilder', () => {
  it('normalises commercial defaults', () => {
    const builder = new EfsFilesystemComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });
    const config = builder.buildSync();

    expect(config.fileSystemName).toBe('files-service-shared-efs');
    expect(config.performanceMode).toBe('generalPurpose');
    expect(config.throughputMode).toBe('bursting');
    expect(config.encryption.enabled).toBe(true);
    expect(config.encryption.encryptInTransit).toBe(false);
    expect(config.vpc.securityGroup.ingressRules[0].port).toBe(2049);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('applies fedramp-high platform defaults', () => {
    const builder = new EfsFilesystemComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec()
    });
    const config = builder.buildSync();

    expect(config.encryption.encryptInTransit).toBe(true);
    expect(config.backups.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('fedramp-high');
    expect(config.logging.audit.enabled).toBe(true);
    expect(config.removalPolicy).toBe('retain');
  });

  it('honours manifest overrides for provisioned throughput and custom networking', () => {
    const builder = new EfsFilesystemComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        throughputMode: 'provisioned',
        provisionedThroughputMibps: 128,
        vpc: {
          enabled: true,
          vpcId: 'vpc-1234567890',
          subnetIds: ['subnet-1', 'subnet-2'],
          securityGroup: {
            create: true,
            ingressRules: [
              {
                port: 2049,
                cidr: '10.0.0.0/16',
                description: 'NFS from application subnets'
              }
            ]
          }
        },
        logging: {
          access: {
            enabled: true,
            retentionInDays: 180,
            removalPolicy: 'retain'
          }
        }
      })
    });

    const config = builder.buildSync();

    expect(config.throughputMode).toBe('provisioned');
    expect(config.provisionedThroughputMibps).toBe(128);
    expect(config.vpc.enabled).toBe(true);
    expect(config.vpc.subnetIds).toEqual(['subnet-1', 'subnet-2']);
    expect(config.logging.access.enabled).toBe(true);
    expect(config.logging.access.removalPolicy).toBe('retain');
  });

  it('merges filesystem policy statements when provided', () => {
    const builder = new EfsFilesystemComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        filesystemPolicy: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: 'arn:aws:iam::123456789012:role/ApplicationRole'
              },
              Action: 'elasticfilesystem:ClientMount',
              Resource: '*'
            }
          ]
        }
      })
    });

    const config = builder.buildSync();
    expect(config.filesystemPolicy).toBeDefined();
    expect(config.filesystemPolicy?.Statement).toHaveLength(1);
  });
});
