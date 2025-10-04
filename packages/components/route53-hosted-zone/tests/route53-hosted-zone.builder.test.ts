import {
  Route53HostedZoneComponentConfigBuilder,
  Route53HostedZoneConfig
} from '../route53-hosted-zone.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'dns-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'dns-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<Route53HostedZoneConfig>): ComponentSpec => ({
  name: 'public-zone',
  type: 'route53-hosted-zone',
  config
});

describe('Route53HostedZoneComponentConfigBuilder', () => {
  it('normalises baseline commercial configuration', () => {
    const builder = new Route53HostedZoneComponentConfigBuilder(
      createContext('commercial'),
      createSpec({ zoneName: 'Example.COM.' })
    );

    const config = builder.buildSync();

    expect(config.zoneName).toBe('example.com');
    expect(config.zoneType).toBe('public');
    expect(config.queryLogging.enabled).toBe(false);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('applies fedramp-high defaults from platform configuration', () => {
    const builder = new Route53HostedZoneComponentConfigBuilder(
      createContext('fedramp-high'),
      createSpec({ zoneName: 'secure.example.com' })
    );

    const config = builder.buildSync();

    expect(config.queryLogging.enabled).toBe(true);
    expect(config.dnssec.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('fedramp-high');
  });

  it('honours manifest overrides for private zone and logging', () => {
    const builder = new Route53HostedZoneComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        zoneName: 'internal.example.com',
        zoneType: 'private',
        vpcAssociations: [
          { vpcId: 'vpc-0123456789abcdef0', region: 'us-east-1' }
        ],
        queryLogging: {
          enabled: true,
          logGroupName: '/aws/route53/internal',
          retentionDays: 30,
          removalPolicy: 'destroy'
        },
        monitoring: {
          enabled: true,
          alarms: {
            queryVolume: {
              enabled: true,
              threshold: 5000
            }
          }
        },
        tags: { team: 'networking' }
      })
    );

    const config = builder.buildSync();

    expect(config.zoneType).toBe('private');
    expect(config.vpcAssociations).toHaveLength(1);
    expect(config.queryLogging.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.tags.team).toBe('networking');
  });

  it('throws when zone name is missing', () => {
    const builder = new Route53HostedZoneComponentConfigBuilder(
      createContext('commercial'),
      createSpec({ zoneName: undefined as unknown as string })
    );

    expect(() => builder.buildSync()).toThrow(/zoneName/i);
  });
});
