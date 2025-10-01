import {
  ApplicationLoadBalancerComponentConfigBuilder,
  ApplicationLoadBalancerConfig
} from '../application-load-balancer.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'payments-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'payments-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<ApplicationLoadBalancerConfig> = {}): ComponentSpec => ({
  name: 'public-alb',
  type: 'application-load-balancer',
  config
});

describe('ApplicationLoadBalancerComponentConfigBuilder', () => {
  it('merges commercial defaults with hardcoded fallbacks', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(
      createContext('commercial'),
      createSpec()
    );

    const config = builder.buildSync();

    expect(config.loadBalancerName).toBe('public-alb');
    expect(config.scheme).toBe('internet-facing');
    expect(config.ipAddressType).toBe('ipv4');
    expect(config.listeners[0].port).toBe(80);
    expect(config.accessLogs.enabled).toBe(false);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBeDefined();
    expect(config.securityGroups.create).toBe(true);
    expect(config.securityGroups.ingress.length).toBeGreaterThanOrEqual(1);
  });

  it('applies fedramp-moderate defaults from segregated configuration', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(
      createContext('fedramp-moderate'),
      createSpec()
    );

    const config = builder.buildSync();

    expect(config.deletionProtection).toBe(true);
    expect(config.accessLogs.enabled).toBe(true);
    expect(config.accessLogs.removalPolicy).toBe('retain');
    expect(config.listeners.every(listener => listener.protocol === 'HTTPS')).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.hardeningProfile).toMatch(/fedramp/i);
  });

  it('sanitises names and honours manifest overrides', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        loadBalancerName: 'public alb prod',
        listeners: [
          {
            port: 443,
            protocol: 'HTTPS',
            certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/11111111-2222-3333-4444-555555555555'
          }
        ],
        accessLogs: {
          enabled: true,
          bucketName: 'custom-access-log-bucket'
        },
        idleTimeoutSeconds: 120
      })
    );

    const config = builder.buildSync();

    expect(config.loadBalancerName).toBe('public-alb-prod');
    expect(config.listeners[0].port).toBe(443);
    expect(config.listeners[0].protocol).toBe('HTTPS');
    expect(config.accessLogs.enabled).toBe(true);
    expect(config.accessLogs.bucketName).toBe('custom-access-log-bucket');
    expect(config.idleTimeoutSeconds).toBe(120);
  });

  it('normalises monitoring alarms when partially specified', () => {
    const builder = new ApplicationLoadBalancerComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        monitoring: {
          enabled: true,
          alarms: {
            http5xx: {
              enabled: true,
              threshold: 5
            },
            rejectedConnections: {
              enabled: true
            }
          }
        }
      })
    );

    const config = builder.buildSync();

    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms.http5xx.enabled).toBe(true);
    expect(config.monitoring.alarms.http5xx.threshold).toBe(5);
    expect(config.monitoring.alarms.http5xx.evaluationPeriods).toBeGreaterThan(0);
    expect(config.monitoring.alarms.rejectedConnections.enabled).toBe(true);
    expect(config.monitoring.alarms.rejectedConnections.threshold).toBeGreaterThan(0);
  });
});
