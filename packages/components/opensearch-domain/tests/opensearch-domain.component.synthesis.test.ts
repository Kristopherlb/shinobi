import { Template, Match } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { OpenSearchDomainComponent } from '../opensearch-domain.component.ts';
import { OpenSearchDomainConfig } from '../opensearch-domain.builder.ts';
import { ComponentContext, ComponentSpec } from '../../../platform/contracts/component-interfaces.ts';

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

const synthesizeComponent = (context: ComponentContext, spec: ComponentSpec) => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: context.account, region: context.region }
  });

  const component = new OpenSearchDomainComponent(stack, spec.name, context, spec);
  component.synth();

  return {
    component,
    template: Template.fromStack(stack)
  };
};

describe('OpenSearchDomainComponent synthesis', () => {
  it('synthesises a commercial domain with defaults', () => {
    const { component, template } = synthesizeComponent(createContext('commercial'), createSpec());

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      DomainName: 'search-service-primary-searc',
      EngineVersion: 'OpenSearch_2.7'
    });

    expect(component.getType()).toBe('opensearch-domain');
    expect(component.getCapabilities()['search:opensearch']).toBeDefined();
  });

  it('enables hardened settings for fedramp-high', () => {
    const { template } = synthesizeComponent(createContext('fedramp-high'), createSpec());

    template.hasResourceProperties('AWS::OpenSearchService::Domain', Match.objectLike({
      ClusterConfig: Match.objectLike({
        DedicatedMasterEnabled: true,
        WarmEnabled: true
      }),
      LogPublishingOptions: Match.objectLike({
        AUDIT_LOGS: Match.objectLike({ Enabled: true })
      })
    }));
  });

  it('honours manifest overrides for monitoring', () => {
    const { template } = synthesizeComponent(
      createContext('commercial'),
      createSpec({
        monitoring: {
          enabled: true,
          alarms: {
            clusterStatusRed: {
              enabled: true,
              evaluationPeriods: 2
            }
          }
        }
      })
    );

    template.hasResource('AWS::CloudWatch::Alarm', Match.objectLike({
      Properties: Match.objectLike({
        AlarmName: Match.stringLikeRegexp('search-service-primary-search-cluster-status-red-alarm')
      })
    }));
  });
});
