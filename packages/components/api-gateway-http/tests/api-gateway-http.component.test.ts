import { jest } from '@jest/globals';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';

import { ApiGatewayHttpComponent } from '../src/api-gateway-http.component.ts';
import { ApiGatewayHttpConfigBuilder } from '../src/api-gateway-http.builder.ts';

const createContext = (framework = 'commercial', scope?: Stack) => ({
  serviceName: 'test-http-service',
  environment: framework === 'fedramp-high' ? 'prod' : 'dev',
  complianceFramework: framework,
  scope,
  region: 'us-east-1',
  accountId: '123456789012'
});

const createSpec = (config = {}) => ({
  name: 'test-http-api',
  type: 'api-gateway-http',
  config
});

describe('ApiGatewayHttpComponent__Synthesis__HttpApiResources', () => {
  let app: App;
  let stack: Stack;
  let context;
  let loadPlatformConfigSpy: jest.SpiedFunction<ApiGatewayHttpConfigBuilder['_loadPlatformConfiguration']>;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'HttpApiStack', {
      env: { account: '123456789012', region: 'us-east-1' }
    });
    context = createContext('commercial', stack);

    loadPlatformConfigSpy = jest
      .spyOn(ApiGatewayHttpConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-moderate') {
          return {
            throttling: { rateLimit: 50, burstLimit: 100 },
            accessLogging: { enabled: true, retentionInDays: 180 },
            monitoring: { detailedMetrics: true, tracingEnabled: true },
            apiSettings: { disableExecuteApiEndpoint: true },
            security: { enableWaf: false }
          };
        }

        return {
          throttling: { rateLimit: 1000, burstLimit: 2000 },
          accessLogging: { enabled: true, retentionInDays: 90 },
          monitoring: { detailedMetrics: true, tracingEnabled: true },
          apiSettings: { disableExecuteApiEndpoint: false },
          security: { enableWaf: false }
        };
      });
  });

  afterEach(() => {
    loadPlatformConfigSpy.mockRestore();
  });

  const synthesize = (specOverrides = {}, contextOverrides = {}) => {
    const ctx = { ...context, ...contextOverrides };
    const spec = createSpec(specOverrides);
    const component = new ApiGatewayHttpComponent(stack, 'HttpApiComponent', ctx, spec);
    component.synth();
    const template = Template.fromStack(stack);
    return { component, template };
  };

  /*
   * Test Metadata: TP-HTTP-GW-COMPONENT-001
   * {
   *   "id": "TP-HTTP-GW-COMPONENT-001",
   *   "level": "unit",
   *   "capability": "Commercial synthesis provisions HTTP API",
   *   "oracle": "contract",
   *   "invariants": ["ProtocolType HTTP", "Description populated"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayHttpComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "Default configuration" },
   *   "risks": ["API created with incorrect type"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Template resources"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('HttpApiResource__CommercialDefaults__CreatesHttpApi', () => {
    const { template } = synthesize();

    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      ProtocolType: 'HTTP',
      Description: 'HTTP API for test-http-api'
    });
  });

  /*
   * Test Metadata: TP-HTTP-GW-COMPONENT-002
   * {
   *   "id": "TP-HTTP-GW-COMPONENT-002",
   *   "level": "unit",
   *   "capability": "Stage configures access logging",
   *   "oracle": "contract",
   *   "invariants": ["AccessLogSetting present"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayHttpComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "Default stage" },
   *   "risks": ["Access logs disabled"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Stage resources"],
   *   "compliance_refs": ["std://logging"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('StageResource__CommercialDefaults__ConfiguresAccessLogging', () => {
    const { template } = synthesize();

    template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      AccessLogSettings: Match.objectLike({
        DestinationArn: Match.anyValue()
      })
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 90
    });
  });

  /*
   * Test Metadata: TP-HTTP-GW-COMPONENT-003
   * {
   *   "id": "TP-HTTP-GW-COMPONENT-003",
   *   "level": "unit",
   *   "capability": "FedRAMP moderate disables execute API endpoint",
   *   "oracle": "contract",
   *   "invariants": ["DisableExecuteApiEndpoint true"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayHttpComponent"],
   *   "inputs": { "shape": "FedRAMP moderate framework", "notes": "No overrides" },
   *   "risks": ["Public endpoint enabled"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Template properties"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('HttpApiResource__FedrampModerate__DisablesExecuteEndpoint', () => {
    const { template } = synthesize({}, { complianceFramework: 'fedramp-moderate', environment: 'stage' });

    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      DisableExecuteApiEndpoint: true
    });
  });

  /*
   * Test Metadata: TP-HTTP-GW-COMPONENT-004
   * {
   *   "id": "TP-HTTP-GW-COMPONENT-004",
   *   "level": "unit",
   *   "capability": "Access log retention respects manifest overrides",
   *   "oracle": "contract",
   *   "invariants": ["LogGroup retention matches override"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayHttpComponent"],
   *   "inputs": { "shape": "Manifest override retention", "notes": "Retention set to 400" },
   *   "risks": ["Retention ignored"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["LogGroup properties"],
   *   "compliance_refs": ["std://logging"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('AccessLogs__ManifestOverride__AppliesRetentionDays', () => {
    const { template } = synthesize({ accessLogging: { enabled: true, retentionInDays: 400 } });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 400
    });
  });

  /*
   * Test Metadata: TP-HTTP-GW-COMPONENT-005
   * {
   *   "id": "TP-HTTP-GW-COMPONENT-005",
   *   "level": "unit",
   *   "capability": "Component publishes HTTP API capability metadata",
   *   "oracle": "exact",
   *   "invariants": ["Capability contains apiId", "Stage name present"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayHttpComponent"],
   *   "inputs": { "shape": "Commercial framework", "notes": "Default configuration" },
   *   "risks": ["Capability map out-of-date"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["component.getCapabilities()"],
   *   "compliance_refs": ["std://capabilities"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('Capabilities__CommercialDefaults__PublishesHttpApiContract', () => {
    const { component } = synthesize();

    const capability = component.getCapabilities()['api:http'];
    expect(capability).toEqual(
      expect.objectContaining({
        resources: expect.objectContaining({
          apiId: expect.any(String),
          stage: 'dev'
        }),
        endpoints: expect.objectContaining({
          invokeUrl: expect.stringContaining('https://')
        })
      })
    );
  });

  /*
   * Test Metadata: TP-HTTP-GW-COMPONENT-006
   * {
   *   "id": "TP-HTTP-GW-COMPONENT-006",
   *   "level": "unit",
   *   "capability": "Custom domain missing certificate throws validation error",
   *   "oracle": "exact",
   *   "invariants": ["Error thrown"],
   *   "fixtures": ["cdk.Stack", "ApiGatewayHttpComponent"],
   *   "inputs": { "shape": "customDomain with autoGenerateCertificate=true and no hostedZone", "notes": "Negative coverage" },
   *   "risks": ["Implicit certificate generation without DNS"],
   *   "dependencies": ["aws-cdk-lib"],
   *   "evidence": ["Error message"],
   *   "compliance_refs": ["std://testing"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CustomDomain__MissingHostedZone__ThrowsConfigurationError', () => {
    const component = new ApiGatewayHttpComponent(
      stack,
      'InvalidHttpApi',
      context,
      createSpec({
        customDomain: {
          domainName: 'api.example.com',
          autoGenerateCertificate: true
        }
      })
    );

    expect(() => component.synth()).toThrow('autoGenerateCertificate requires hostedZoneId');
  });
});
