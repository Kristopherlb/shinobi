import { jest } from '@jest/globals';
import { ApplicationLoadBalancerComponentConfigBuilder } from '../src/application-load-balancer.builder.ts';

const createContext = (framework = 'commercial') => ({
  serviceName: 'payments-service',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  accountId: '123456789012',
  tags: {
    'service-name': 'payments-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config = {}) => ({
  name: 'public-alb',
  type: 'application-load-balancer',
  config
});

describe('ApplicationLoadBalancerConfigBuilder__Precedence__FrameworkDefaults', () => {
  let loadPlatformConfigSpy;

  beforeEach(() => {
    loadPlatformConfigSpy = jest
      .spyOn(ApplicationLoadBalancerComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-moderate') {
          return {
            scheme: 'internal',
            deletionProtection: true,
            accessLogs: { enabled: true, removalPolicy: 'retain' },
            listeners: [{ port: 443, protocol: 'HTTPS' }],
            monitoring: { enabled: true }
          };
        }

        if (framework === 'fedramp-high') {
          return {
            scheme: 'internal',
            deletionProtection: true,
            accessLogs: { enabled: true, retentionDays: 365, removalPolicy: 'retain' },
            listeners: [{ port: 443, protocol: 'HTTPS' }],
            monitoring: { enabled: true },
            securityGroups: { create: true, ingress: [] }
          };
        }

        return {
          scheme: 'internet-facing',
          ipAddressType: 'ipv4',
          deletionProtection: false,
          accessLogs: { enabled: true, retentionDays: 90 },
          listeners: [{ port: 80, protocol: 'HTTP' }],
          monitoring: { enabled: true },
          securityGroups: { create: true, ingress: [] }
        };
      });
  });

  afterEach(() => {
    loadPlatformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-ALB-CONFIG-001
   * {
   *   "id": "TP-ALB-CONFIG-001",
   *   "level": "unit",
   *   "capability": "Commercial defaults populate public ALB configuration",
   *   "oracle": "exact",
   *   "invariants": ["Scheme internet-facing", "HTTP listener on port 80"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Baselines only" },
   *   "risks": ["Incorrect baseline hardening"],
   *   "dependencies": [],
   *   "evidence": ["listeners[0].protocol=HTTP"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__InternetFacing__AppliesHttpListener', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.scheme).toBe('internet-facing');
    expect(config.listeners[0]).toEqual(expect.objectContaining({ port: 80, protocol: 'HTTP' }));
    expect(config.accessLogs?.enabled).toBe(true);
  });

  /*
   * Test Metadata: TP-ALB-CONFIG-002
   * {
   *   "id": "TP-ALB-CONFIG-002",
   *   "level": "unit",
   *   "capability": "FedRAMP moderate defaults enforce HTTPS and deletion protection",
   *   "oracle": "exact",
   *   "invariants": ["Listener protocol HTTPS", "Deletion protection enabled"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Segregated configuration" },
   *   "risks": ["Public HTTP listener in FedRAMP"],
   *   "dependencies": [],
   *   "evidence": ["listeners[0].protocol=HTTPS"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampModerateDefaults__InternalFacing__EnforcesDeletionProtection', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(createContext('fedramp-moderate'), createSpec());
    const config = builder.buildSync();

    expect(config.scheme).toBe('internal');
    expect(config.deletionProtection).toBe(true);
    expect(config.listeners[0].protocol).toBe('HTTPS');
  });

  /*
   * Test Metadata: TP-ALB-CONFIG-003
   * {
   *   "id": "TP-ALB-CONFIG-003",
   *   "level": "unit",
   *   "capability": "Manifest overrides sanitise names and respect custom logging",
   *   "oracle": "exact",
   *   "invariants": ["loadBalancerName sanitized", "Custom access log bucket used"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest defining custom name and bucket", "notes": "Includes HTTPS listener" },
   *   "risks": ["Unsafe resource names"],
   *   "dependencies": [],
   *   "evidence": ["loadBalancerName without spaces"],
   *   "compliance_refs": ["std://configuration", "std://logging"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__CustomName__PreservesExplicitAccessLogBucket', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        loadBalancerName: 'public alb prod',
        listeners: [
          {
            port: 443,
            protocol: 'HTTPS',
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc123'
          }
        ],
        accessLogs: {
          enabled: true,
          bucketName: 'custom-access-logs'
        }
      })
    );

    const config = builder.buildSync();

    expect(config.loadBalancerName).toBe('public-alb-prod');
    expect(config.listeners[0]).toEqual(
      expect.objectContaining({ port: 443, protocol: 'HTTPS', certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/abc123' })
    );
    expect(config.accessLogs?.bucketName).toBe('custom-access-logs');
  });

  /*
   * Test Metadata: TP-ALB-CONFIG-004
   * {
   *   "id": "TP-ALB-CONFIG-004",
   *   "level": "unit",
   *   "capability": "Monitoring alarms are normalised when partial thresholds supplied",
   *   "oracle": "exact",
   *   "invariants": ["Missing evaluation periods defaulted", "Threshold preserved"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest enabling partial monitoring config", "notes": "Only threshold set" },
   *   "risks": ["Incomplete alarms"],
   *   "dependencies": [],
   *   "evidence": ["http5xx.evaluationPeriods >= 1"],
   *   "compliance_refs": ["std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('MonitoringOverrides__PartialAlarmConfig__FillsMissingDefaults', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        monitoring: {
          enabled: true,
          alarms: {
            http5xx: { enabled: true, threshold: 5 }
          }
        }
      })
    );

    const config = builder.buildSync();

    expect(config.monitoring?.enabled).toBe(true);
    expect(config.monitoring?.alarms.http5xx.threshold).toBe(5);
    expect(config.monitoring?.alarms.http5xx.evaluationPeriods).toBeGreaterThanOrEqual(1);
  });
});
