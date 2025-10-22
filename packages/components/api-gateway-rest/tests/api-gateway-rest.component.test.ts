import { jest } from '@jest/globals';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { ApiGatewayRestComponent } from '../src/api-gateway-rest.component.ts';
import { ApiGatewayRestConfigBuilder } from '../src/api-gateway-rest.builder.ts';

const createContext = (framework = 'commercial', scope?: Stack) => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: framework,
  scope,
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config = {}) => ({
  name: 'test-rest-api',
  type: 'api-gateway-rest',
  config
});

describe('ApiGatewayRestComponent__Synthesis__RestApiResources', () => {
  let app: App;
  let stack: Stack;
  let context: ReturnType<typeof createContext>;
  let loadPlatformConfigSpy: jest.SpiedFunction<ApiGatewayRestConfigBuilder['_loadPlatformConfiguration']>;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'RestApiStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    context = createContext('commercial', stack);

    loadPlatformConfigSpy = jest
      .spyOn(ApiGatewayRestConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-high') {
          return {
            disableExecuteApiEndpoint: true,
            throttling: { rateLimit: 100, burstLimit: 50 },
            logging: { retentionInDays: 2555, executionLoggingLevel: 'ERROR' },
            monitoring: { thresholds: { errorRate5xxPercent: 1 } },
            tracing: { xrayEnabled: true }
          };
        }

        return {
          disableExecuteApiEndpoint: false,
          throttling: { rateLimit: 1000, burstLimit: 2000 },
          logging: { retentionInDays: 90, executionLoggingLevel: 'INFO' },
          monitoring: { thresholds: { errorRate5xxPercent: 5 } },
          tracing: { xrayEnabled: true }
        };
      });
  });

  afterEach(() => {
    loadPlatformConfigSpy.mockRestore();
  });

  const synthesize = (specOverrides = {}, contextOverrides = {}) => {
    const ctx = { ...context, ...contextOverrides };
    const component = new ApiGatewayRestComponent(stack, 'TestRestApi', ctx, createSpec(specOverrides));
    component.synth();
    return { component, template: Template.fromStack(stack) };
  };

  /*
   * Test Metadata: TP-API-GW-REST-COMPONENT-001
   * {
   *   "id": "TP-API-GW-REST-COMPONENT-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis creates regional REST API",
   *   "oracle": "contract",
   *   "invariants": ["Endpoint configuration regional", "Resource has friendly name"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayRestComponent"],
   *   "inputs": { "shape": "Commercial framework with description", "notes": "No overrides" },
   *   "risks": ["Wrong endpoint type"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["EndpointConfiguration.Types contains REGIONAL"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('RestApiResource__CommercialDefaults__CreatesRegionalEndpoint', () => {
    const { template } = synthesize({ description: 'Commercial API' });

    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: Match.stringLikeRegexp('test-service-test-rest-api'),
      EndpointConfiguration: { Types: ['REGIONAL'] }
    });
  });

  /*
   * Test Metadata: TP-API-GW-REST-COMPONENT-002
   * {
   *   "id": "TP-API-GW-REST-COMPONENT-002",
   *   "level": "unit",
   *   "capability": "Commercial stage configures access logging",
   *   "oracle": "contract",
   *   "invariants": ["AccessLogSetting present", "Logging level INFO"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayRestComponent"],
   *   "inputs": { "shape": "Commercial framework with defaults", "notes": "Validates logging" },
   *   "risks": ["Missing access logs"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["MethodSettings[0].LoggingLevel = INFO"],
   *   "compliance_refs": ["std://logging"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('StageResource__CommercialDefaults__EnablesAccessLogging', () => {
    const { template } = synthesize();

    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      AccessLogSetting: Match.objectLike({}),
      MethodSettings: Match.arrayWith([
        Match.objectLike({
          LoggingLevel: 'INFO'
        })
      ])
    });
  });

  /*
   * Test Metadata: TP-API-GW-REST-COMPONENT-003
   * {
   *   "id": "TP-API-GW-REST-COMPONENT-003",
   *   "level": "unit",
   *   "capability": "FedRAMP high disables execute-api endpoint",
   *   "oracle": "exact",
   *   "invariants": ["DisableExecuteApiEndpoint = true"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayRestComponent"],
   *   "inputs": { "shape": "FedRAMP high framework", "notes": "No overrides" },
   *   "risks": ["Unrestricted public endpoint"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["DisableExecuteApiEndpoint=true"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('RestApiResource__FedrampHigh__DisablesExecuteApiEndpoint', () => {
    const { template } = synthesize({}, { complianceFramework: 'fedramp-high', environment: 'prod' });

    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      DisableExecuteApiEndpoint: true
    });
  });

  /*
   * Test Metadata: TP-API-GW-REST-COMPONENT-004
   * {
   *   "id": "TP-API-GW-REST-COMPONENT-004",
   *   "level": "unit",
   *   "capability": "FedRAMP high stage applies hardened logging and throttling",
   *   "oracle": "contract",
   *   "invariants": ["Throttling burst 50", "Logging level ERROR"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayRestComponent"],
   *   "inputs": { "shape": "FedRAMP high framework", "notes": "No overrides" },
   *   "risks": ["Non-compliant throttling"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["ThrottlingBurstLimit=50"],
   *   "compliance_refs": ["std://logging", "std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('StageResource__FedrampHigh__AppliesHardenedThrottlingAndLogging', () => {
    const { template } = synthesize({}, { complianceFramework: 'fedramp-high', environment: 'prod' });

    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      MethodSettings: Match.arrayWith([
        Match.objectLike({
          ThrottlingBurstLimit: 50,
          ThrottlingRateLimit: 100,
          LoggingLevel: 'ERROR'
        })
      ])
    });

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    const retentionValues = Object.values(logGroups).map(resource => resource.Properties?.RetentionInDays);
    expect(retentionValues.some(value => typeof value === 'number' && value >= 2555)).toBe(true);
  });

  /*
   * Test Metadata: TP-API-GW-REST-COMPONENT-005
   * {
   *   "id": "TP-API-GW-REST-COMPONENT-005",
   *   "level": "unit",
   *   "capability": "Capability contract exposes API identifiers",
   *   "oracle": "exact",
   *   "invariants": ["Capability has apiId", "Stage name matches context"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayRestComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "No overrides" },
   *   "risks": ["Capability map drift"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Capability['api:rest'].stageName=test"],
   *   "compliance_refs": ["std://capabilities"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Capabilities__CommercialDefaults__PublishesRestApiContract', () => {
    const { component } = synthesize();

    const capabilities = component.getCapabilities();
    expect(capabilities['api:rest']).toEqual(
      expect.objectContaining({
        apiId: expect.any(String),
        endpointUrl: expect.stringContaining('https://'),
        stageName: 'test'
      })
    );
  });
});
