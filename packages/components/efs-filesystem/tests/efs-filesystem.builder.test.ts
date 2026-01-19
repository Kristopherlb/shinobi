import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EfsFilesystemComponentConfigBuilder,
  EfsFilesystemConfig
} from '../src/efs-filesystem.builder';
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

const createSpec = (config: Partial<EfsFilesystemConfig> = {}): ComponentSpec => ({
  name: 'shared-efs',
  type: 'efs-filesystem',
  config
});

describe('EfsFilesystemComponentConfigBuilder', () => {
  it('normalises commercial defaults with secure configuration', () => {
    const builder = new EfsFilesystemComponentConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec()
    });
    const config = builder.buildSync();

    expect(config.fileSystemName).toBe('files-service-shared-efs');
    expect(config.performanceMode).toBe('generalPurpose');
    expect(config.throughputMode).toBe('bursting');
    expect(config.encryption.enabled).toBe(true);
    expect(config.encryption.encryptInTransit).toBe(false); // Not required for commercial

    // ✅ SECURITY FIX: No default ingress rules
    expect(config.vpc.securityGroup.ingressRules).toHaveLength(0);

    // Monitoring disabled for dev (enabled for prod)
    expect(config.monitoring.enabled).toBe(false);
    expect(config.backups.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');

    // Log retention: 90 days for access, 365 for audit in commercial baseline
    expect(config.logging.access.retentionInDays).toBe(90);
    expect(config.logging.audit.retentionInDays).toBe(365);
  });

  it('applies fedramp-high platform defaults with maximum security', () => {
    const builder = new EfsFilesystemComponentConfigBuilder({
      context: createContext('fedramp-high'),
      spec: createSpec()
    });
    const config = builder.buildSync();

    // Encryption: at rest and in transit
    expect(config.encryption.enabled).toBe(true);
    expect(config.encryption.encryptInTransit).toBe(true);

    // FedRAMP requirements
    expect(config.backups.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.logging.access.enabled).toBe(true);
    expect(config.logging.audit.enabled).toBe(true);

    // Log retention rounded up to the nearest supported CloudWatch retention (10 years)
    expect(config.logging.access.retentionInDays).toBe(3653);
    expect(config.logging.audit.retentionInDays).toBe(3653);
    expect(config.logging.access.removalPolicy).toBe('retain');
    expect(config.logging.audit.removalPolicy).toBe('retain');

    // Retention policy
    expect(config.removalPolicy).toBe('retain');
    expect(config.hardeningProfile).toBe('fedramp-high');

    // ✅ Security: No default ingress rules
    expect(config.vpc.securityGroup.ingressRules).toHaveLength(0);
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
