import { Stack } from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@shinobi/core/component-interfaces';
import { EcsClusterComponentConfigBuilder, EcsClusterConfig } from '../ecs-cluster.builder.ts';

const createContext = (
  overrides: Partial<ComponentContext> = {}
): ComponentContext => ({
  serviceName: 'test-service',
  environment: 'dev',
  complianceFramework: 'commercial',
  region: 'us-east-1',
  accountId: '123456789012',
  scope: new Stack(),
  tags: {
    'service-name': 'test-service',
    environment: 'dev'
  },
  ...overrides
});

const createSpec = (config: Partial<EcsClusterConfig> = {}): ComponentSpec => ({
  name: 'test-ecs-cluster',
  type: 'ecs-cluster',
  config: {
    serviceConnect: {
      namespace: 'internal'
    },
    ...config
  }
});

describe('EcsClusterComponentConfigBuilder__Validation', () => {
  let platformConfigSpy: jest.SpyInstance;

  beforeEach(() => {
    platformConfigSpy = jest
      .spyOn(EcsClusterComponentConfigBuilder.prototype, '_loadPlatformConfiguration')
      .mockImplementation(() => ({}));
  });

  afterEach(() => {
    platformConfigSpy.mockRestore();
  });

  /*
   * Test Metadata: TP-ecs-cluster-config-builder-001
   * {
   *   "id": "TP-ecs-cluster-config-builder-001",
   *   "level": "unit",
   *   "capability": "Builder rejects missing service connect namespace",
   *   "oracle": "contract",
   *   "invariants": ["Validation error thrown"],
   *   "fixtures": ["ConfigBuilder"],
   *   "inputs": { "shape": "Config without namespace", "notes": "Namespace required for discovery" },
   *   "risks": ["Service discovery misconfiguration"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-networking-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('SchemaValidation__MissingNamespace__Throws', () => {
    const context = createContext();
    const spec: ComponentSpec = {
      name: 'missing-namespace',
      type: 'ecs-cluster',
      config: {
        serviceConnect: {
          namespace: ''
        }
      }
    };

    const builder = new EcsClusterComponentConfigBuilder({ context, spec });

    expect(() => builder.buildSync()).toThrow('serviceConnect.namespace');
  });

  /*
   * Test Metadata: TP-ecs-cluster-config-builder-002
   * {
   *   "id": "TP-ecs-cluster-config-builder-002",
   *   "level": "unit",
   *   "capability": "Builder enforces capacity bounds",
   *   "oracle": "contract",
   *   "invariants": ["minSize <= maxSize", "desiredSize within range"],
   *   "fixtures": ["ConfigBuilder"],
   *   "inputs": { "shape": "Invalid capacity bounds", "notes": "Min greater than max" },
   *   "risks": ["Auto Scaling misconfiguration"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CapacityValidation__InvalidBounds__Throws', () => {
    const context = createContext();
    const spec = createSpec({
      capacity: {
        instanceType: 'm5.large',
        minSize: 5,
        maxSize: 2,
        desiredSize: 3
      }
    });

    const builder = new EcsClusterComponentConfigBuilder({ context, spec });

    expect(() => builder.buildSync()).toThrow('minSize cannot be greater');
  });

  /*
   * Test Metadata: TP-ecs-cluster-config-builder-003
   * {
   *   "id": "TP-ecs-cluster-config-builder-003",
   *   "level": "unit",
   *   "capability": "Builder accepts desired size within bounds",
   *   "oracle": "exact",
   *   "invariants": ["desiredSize retained"],
   *   "fixtures": ["ConfigBuilder"],
   *   "inputs": { "shape": "Valid capacity configuration", "notes": "Desired between min and max" },
   *   "risks": ["Unexpected validation failure"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('CapacityValidation__DesiredSizeWithinBounds__Passes', () => {
    const context = createContext();
    const spec = createSpec({
      capacity: {
        instanceType: 'm5.large',
        minSize: 1,
        maxSize: 3,
        desiredSize: 2,
        enableMonitoring: true
      }
    });

    const builder = new EcsClusterComponentConfigBuilder({ context, spec });
    const config = builder.buildSync();

    expect(config.capacity?.desiredSize).toBe(2);
  });
});
