import { jest } from '@jest/globals';
import { ApiGatewayRestConfigBuilder } from '../src/api-gateway-rest.builder.ts';

const createContext = (framework = 'commercial') => ({
  serviceName: 'test-service',
  environment: 'test',
  complianceFramework: framework,
  region: 'us-east-1',
  accountId: '123456789012',
  tags: {
    'service-name': 'test-service',
    environment: 'test',
    'compliance-framework': framework
  }
});

const createSpec = (config = {}) => ({
  name: 'test-api',
  type: 'api-gateway-rest',
  config
});

describe('ApiGatewayRestConfigBuilder__Precedence__FrameworkDefaults', () => {
  let loadPlatformConfigSpy;

  beforeEach(() => {
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

  /*
   * Test Metadata: TP-API-GW-REST-CONFIG-001
   * {
   *   "id": "TP-API-GW-REST-CONFIG-001",
   *   "level": "unit",
   *   "capability": "Commercial framework uses platform defaults",
   *   "oracle": "exact",
   *   "invariants": ["Execute endpoint enabled", "Commercial throttling applied"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "No overrides provided" },
   *   "risks": ["Baseline throttling regression"],
   *   "dependencies": [],
   *   "evidence": ["disableExecuteApiEndpoint=false"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CommercialDefaults__ExecuteEndpointEnabled__AppliesCommercialThrottling', () => {
    const builder = new ApiGatewayRestConfigBuilder(createContext('commercial'), createSpec());
    const config = builder.build();

    expect(config.disableExecuteApiEndpoint).toBe(false);
    expect(config.throttling).toEqual({ rateLimit: 1000, burstLimit: 2000 });
    expect(config.logging?.executionLoggingLevel).toBe('INFO');
  });

  /*
   * Test Metadata: TP-API-GW-REST-CONFIG-002
   * {
   *   "id": "TP-API-GW-REST-CONFIG-002",
   *   "level": "unit",
   *   "capability": "FedRAMP High disables execute endpoint and hardens throttling",
   *   "oracle": "exact",
   *   "invariants": ["Execute endpoint disabled", "FedRAMP throttling limits applied"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP High context"],
   *   "inputs": { "shape": "Empty manifest", "notes": "No overrides provided" },
   *   "risks": ["Insecure public endpoint"],
   *   "dependencies": [],
   *   "evidence": ["disableExecuteApiEndpoint=true"],
   *   "compliance_refs": ["std://configuration", "std://security"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('FedrampHighDefaults__ExecuteEndpointDisabled__AppliesFedrampThrottling', () => {
    const builder = new ApiGatewayRestConfigBuilder(createContext('fedramp-high'), createSpec());
    const config = builder.build();

    expect(config.disableExecuteApiEndpoint).toBe(true);
    expect(config.throttling).toEqual({ rateLimit: 100, burstLimit: 50 });
    expect(config.logging?.retentionInDays).toBe(2555);
    expect(config.tracing?.xrayEnabled).toBe(true);
  });

  /*
   * Test Metadata: TP-API-GW-REST-CONFIG-003
   * {
   *   "id": "TP-API-GW-REST-CONFIG-003",
   *   "level": "unit",
   *   "capability": "Manifest overrides take precedence over defaults",
   *   "oracle": "exact",
   *   "invariants": ["User throttling win", "Execute endpoint flag respected"],
   *   "fixtures": ["ConfigBuilder", "Commercial context"],
   *   "inputs": { "shape": "Manifest overriding throttling", "notes": "User sets tighter limits" },
   *   "risks": ["Overrides ignored"],
   *   "dependencies": [],
   *   "evidence": ["throttling rateLimit=200"],
   *   "compliance_refs": ["std://configuration"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ManifestOverrides__CustomThrottling__TakesPriorityOverDefaults', () => {
    const builder = new ApiGatewayRestConfigBuilder(
      createContext('commercial'),
      createSpec({
        disableExecuteApiEndpoint: true,
        throttling: { rateLimit: 200, burstLimit: 300 }
      })
    );
    const config = builder.build();

    expect(config.disableExecuteApiEndpoint).toBe(true);
    expect(config.throttling).toEqual({ rateLimit: 200, burstLimit: 300 });
  });
});
