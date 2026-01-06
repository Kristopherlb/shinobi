import {
  OpenSearchDomainComponentConfigBuilder,
  OpenSearchDomainConfig
} from '../opensearch-domain.builder.js';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.js';

const createContext = (framework: string = 'commercial'): ComponentContext => ({
  serviceName: 'search-service',
  owner: 'platform-team',
  environment: 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  account: '123456789012',
  tags: {
    'service-name': 'search-service',
    environment: 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config: Partial<OpenSearchDomainConfig> = {}): ComponentSpec => ({
  name: 'primary-search',
  type: 'opensearch-domain',
  config
});

describe('OpenSearchDomainComponentConfigBuilder', () => {
  it('normalises baseline commercial configuration', () => {
    const builder = new OpenSearchDomainComponentConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.buildSync();

    expect(config.domainName).toBe('search-service-primary-searc');
    expect(config.version).toBe('OpenSearch_2.7');
    expect(config.cluster.instanceType).toBe('t3.small.search');
    expect(config.ebs.volumeType).toBe('gp3');
    expect(config.logging.application.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(false);
    expect(config.hardeningProfile).toBe('baseline');
  });

  it('applies platform defaults for fedramp-high', () => {
    const builder = new OpenSearchDomainComponentConfigBuilder(createContext('fedramp-high'), createSpec());
    const config = builder.buildSync();

    expect(config.cluster.instanceType).toBe('m6g.large.search');
    expect(config.cluster.dedicatedMasterEnabled).toBe(true);
    expect(config.cluster.warmEnabled).toBe(true);
    expect(config.logging.audit.enabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.hardeningProfile).toBe('fedramp-high');
    expect(config.removalPolicy).toBe('retain');
  });

  it('honours manifest overrides and sanitises domain name', () => {
    const builder = new OpenSearchDomainComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        domainName: 'My Custom Domain Name!',
        cluster: {
          instanceCount: 3,
          zoneAwarenessEnabled: true,
          availabilityZoneCount: 3,
          dedicatedMasterEnabled: true,
          masterInstanceType: 'm6g.large.search',
          masterInstanceCount: 5
        },
        monitoring: {
          enabled: true,
          alarms: {
            clusterStatusRed: {
              enabled: true,
              evaluationPeriods: 3
            }
          }
        }
      })
    );

    const config = builder.buildSync();

    expect(config.domainName).toMatch(/^my-custom-domain-name/);
    expect(config.cluster.instanceCount).toBe(3);
    expect(config.cluster.zoneAwarenessEnabled).toBe(true);
    expect(config.monitoring.enabled).toBe(true);
    expect(config.monitoring.alarms.clusterStatusRed.enabled).toBe(true);
    expect(config.monitoring.alarms.clusterStatusRed.evaluationPeriods).toBe(3);
  });

  it('merges access policy statements from manifest', () => {
    const builder = new OpenSearchDomainComponentConfigBuilder(
      createContext('commercial'),
      createSpec({
        accessPolicies: {
          statements: [
            {
              effect: 'Allow',
              principals: ['arn:aws:iam::123456789012:role/ExampleRole'],
              actions: ['es:ESHttpGet'],
              resources: ['arn:aws:es:us-east-1:123456789012:domain/search-service-primary-search/*']
            }
          ]
        }
      })
    );

    const config = builder.buildSync();
    expect(config.accessPolicies.statements).toHaveLength(1);
    expect(config.accessPolicies.statements[0].actions).toContain('es:ESHttpGet');
  });
});
