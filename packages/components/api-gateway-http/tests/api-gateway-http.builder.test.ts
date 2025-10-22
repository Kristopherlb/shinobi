import { jest } from '@jest/globals';
import { ApiGatewayHttpConfigBuilder } from '../src/api-gateway-http.builder.ts';

const createContext = (framework = 'commercial') => ({
  serviceName: 'test-http-service',
  environment: framework === 'fedramp-high' ? 'prod' : 'dev',
  complianceFramework: framework,
  region: 'us-east-1',
  accountId: '123456789012',
  tags: {
    'service-name': 'test-http-service',
    environment: framework === 'fedramp-high' ? 'prod' : 'dev',
    'compliance-framework': framework
  }
});

const createSpec = (config = {}) => ({
  name: 'test-http-api',
  type: 'api-gateway-http',
  config
});

describe('ApiGatewayHttpConfigBuilder__Precedence__FrameworkDefaults', () => {
  let loadPlatformConfigSpy;

  beforeEach(() => {
    loadPlatformConfigSpy = jest
      .spyOn(ApiGatewayHttpConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(function () {
        const framework = this.builderContext.context.complianceFramework;
        if (framework === 'fedramp-moderate') {
          return {
            throttling: { rateLimit: 50, burstLimit: 100 },
            accessLogging: { enabled: true, retentionInDays: 180, retainOnDelete: true },
            monitoring: { alarms: { errorRate4xx: 2.0, highLatency: 3000, lowThroughput: 5 } },
            apiSettings: { disableExecuteApiEndpoint: true }
          };
        }

        if (framework === 'fedramp-high') {
          return {
            throttling: { rateLimit: 25, burstLimit: 50 },
            accessLogging: { enabled: true, retentionInDays: 365, retainOnDelete: true },
            monitoring: { alarms: { errorRate4xx: 1.0, highLatency: 2000, lowThroughput: 2 } },
            apiSettings: { disableExecuteApiEndpoint: true },
            security: { enableWaf: true }
          };
        }

        return {
          throttling: { rateLimit: 1000, burstLimit: 2000 },
          accessLogging: { enabled: true, retentionInDays: 90, retainOnDelete: false },
          monitoring: { alarms: { errorRate4xx: 5, highLatency: 5000, lowThroughput: 10 } },
          apiSettings: { disableExecuteApiEndpoint: false },
          security: { enableWaf: false }
        };
      });
  });

  afterEach(() => {
    loadPlatformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-HTTP-GW-CONFIG-001
   * {
   *   "id": "TP-HTTP-GW-CONFIG-001",
   *   "level": "unit",
   *   "capability": "Commercial defaults configure HTTP API baseline",
   *   "oracle": "exact",
   *   "invariants": ["Protocol HTTP", "Execute endpoint enabled"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Baselines only" },
   *   "risks": ["Regression in throttling defaults"],
   *   "dependencies": [],
   *   "evidence": ["throttling rateLimit=1000"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__HttpProtocol__KeepsExecuteEndpointEnabled', () => {
    const builder = new ApiGatewayHttpConfigBuilder({ context: createContext('commercial'), spec: createSpec() });
    const config = builder.buildSync();

    expect(config.protocolType).toBe('HTTP');
    expect(config.throttling).toEqual({ rateLimit: 1000, burstLimit: 2000 });
    expect(config.apiSettings?.disableExecuteApiEndpoint).toBe(false);
    expect(config.accessLogging?.retentionInDays).toBe(90);
  });

  /*
   * Test Metadata: TP-HTTP-GW-CONFIG-002
   * {
   *   "id": "TP-HTTP-GW-CONFIG-002",
   *   "level": "unit",
   *   "capability": "FedRAMP moderate defaults enforce throttling and execute endpoint disablement",
   *   "oracle": "exact",
   *   "invariants": ["Execute endpoint disabled", "Throttling tightened"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP moderate context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "Segregated defaults" },
   *   "risks": ["Loose public exposure"],
   *   "dependencies": [],
   *   "evidence": ["throttling rateLimit=50"],
   *   "compliance_refs": ["std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampModerateDefaults__TightThrottling__DisablesExecuteEndpoint', () => {
    const builder = new ApiGatewayHttpConfigBuilder({ context: createContext('fedramp-moderate'), spec: createSpec() });
    const config = builder.buildSync();

    expect(config.throttling).toEqual({ rateLimit: 50, burstLimit: 100 });
    expect(config.apiSettings?.disableExecuteApiEndpoint).toBe(true);
    expect(config.accessLogging?.retainOnDelete).toBe(true);
  });

  /*
   * Test Metadata: TP-HTTP-GW-CONFIG-003
   * {
   *   "id": "TP-HTTP-GW-CONFIG-003",
   *   "level": "unit",
   *   "capability": "Manifest overrides sanitise CORS and logging configuration",
   *   "oracle": "exact",
   *   "invariants": ["CORS allowOrigins respected", "Access logging disabled"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest with custom CORS and logging", "notes": "Overrides platform defaults" },
   *   "risks": ["Overrides ignored"],
   *   "dependencies": [],
   *   "evidence": ["cors.allowOrigins contains https://example.com"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__CustomCors__ReplacesPlatformDefaults', () => {
    const builder = new ApiGatewayHttpConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        cors: {
          allowOrigins: ['https://example.com'],
          allowMethods: ['GET'],
          allowHeaders: ['Content-Type'],
          allowCredentials: false
        },
        accessLogging: { enabled: false }
      })
    });

    const config = builder.buildSync();

    expect(config.cors?.allowOrigins).toEqual(['https://example.com']);
    expect(config.accessLogging?.enabled).toBe(false);
  });

  /*
   * Test Metadata: TP-HTTP-GW-CONFIG-004
   * {
   *   "id": "TP-HTTP-GW-CONFIG-004",
   *   "level": "unit",
   *   "capability": "Monitoring alarms fill missing defaults when partially specified",
   *   "oracle": "exact",
   *   "invariants": ["Default evaluation periods applied"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest with partial monitoring configuration", "notes": "Only threshold provided" },
   *   "risks": ["Incomplete alarm configuration"],
   *   "dependencies": [],
   *   "evidence": ["lowThroughput defaults applied"],
   *   "compliance_refs": ["std://observability"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('MonitoringOverrides__PartialAlarms__AppliesFallbackThresholds', () => {
    const builder = new ApiGatewayHttpConfigBuilder({
      context: createContext('commercial'),
      spec: createSpec({
        monitoring: {
          alarms: {
            lowThroughput: 3
          }
        }
      })
    });

    const config = builder.buildSync();
    expect(config.monitoring?.alarms?.lowThroughput).toBe(3);
    expect(config.monitoring?.alarms?.highLatency).toBeDefined();
  });
});
