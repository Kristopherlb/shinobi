import * as cdk from 'aws-cdk-lib';
import { ComponentContext, ComponentSpec } from '@platform/contracts';
import { EcsEc2ServiceConfig, EcsEc2ServiceConfigBuilder } from '../src/ecs-ec2-service.builder';

const createContext = (framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high'): ComponentContext => ({
  serviceName: 'orders',
  environment: 'dev',
  complianceFramework: framework,
  accountId: '123456789012',
  region: 'us-east-1',
  scope: new cdk.Stack(),
  serviceLabels: {
    owner: 'platform-team',
    version: '1.0.0'
  }
});

const createSpec = (config: Partial<EcsEc2ServiceConfig>): ComponentSpec => ({
  name: 'orders-ec2',
  type: 'ecs-ec2-service',
  config
});

describe('EcsEc2ServiceConfigBuilder', () => {
  const buildConfig = (
    framework: 'commercial' | 'fedramp-moderate' | 'fedramp-high',
    config: Partial<EcsEc2ServiceConfig>
  ) => {
    const builder = new EcsEc2ServiceConfigBuilder(createContext(framework), createSpec(config));
    return builder.buildSync();
  };

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-001
   * {
   *   "id": "TP-ecs-ec2-config-builder-001",
   *   "level": "unit",
   *   "capability": "Builder applies commercial baseline configuration",
   *   "oracle": "exact",
   *   "invariants": ["Platform defaults preserved"],
   *   "fixtures": ["ConfigBuilder", "Commercial platform config"],
   *   "inputs": { "shape": "Minimal config with cluster and image", "notes": "Valid commercial workload" },
   *   "risks": ["Incorrect defaults causing under-provisioning"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__CommercialBaseline__AppliesPlatformDefaults', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBe(256);
    expect(config.taskMemory).toBe(512);
    expect(config.logging.retentionInDays).toBe(30);
    expect(config.logging.removalPolicy).toBe('destroy');
    expect(config.monitoring.alarms.cpu.threshold).toBe(80);
    expect(config.diagnostics.enableExecuteCommand).toBe(false);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-002
   * {
   *   "id": "TP-ecs-ec2-config-builder-002",
   *   "level": "unit",
   *   "capability": "Builder enforces FedRAMP Moderate hardening",
   *   "oracle": "exact",
   *   "invariants": ["FedRAMP thresholds hardened"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP Moderate platform config"],
   *   "inputs": { "shape": "Minimal config with cluster and image", "notes": "FedRAMP Moderate workload" },
   *   "risks": ["Compliance gaps in FedRAMP Moderate"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__FedRampModerateDefaults__EnforcesHardening', () => {
    const config = buildConfig('fedramp-moderate', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBe(512);
    expect(config.logging.retentionInDays).toBe(1827);
    expect(config.monitoring.alarms.cpu.threshold).toBe(70);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-003
   * {
   *   "id": "TP-ecs-ec2-config-builder-003",
   *   "level": "unit",
   *   "capability": "Builder enforces FedRAMP High hardening",
   *   "oracle": "exact",
   *   "invariants": ["High baseline CPU", "Extended log retention"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP High platform config"],
   *   "inputs": { "shape": "Minimal config with cluster and image", "notes": "FedRAMP High workload" },
   *   "risks": ["FedRAMP High misconfiguration"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__FedRampHighDefaults__EnforcesHardening', () => {
    const config = buildConfig('fedramp-high', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBeGreaterThanOrEqual(1024);
    expect(config.logging.retentionInDays).toBe(3653);
    expect(config.monitoring.alarms.cpu.threshold).toBeLessThanOrEqual(60);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-004
   * {
   *   "id": "TP-ecs-ec2-config-builder-004",
   *   "level": "unit",
   *   "capability": "Builder respects manifest overrides",
   *   "oracle": "exact",
   *   "invariants": ["Manifest overrides win"],
   *   "fixtures": ["ConfigBuilder"],
   *   "inputs": { "shape": "Manifest with overrides", "notes": "Custom CPU/logging settings" },
   *   "risks": ["Overrides ignored causing regressions"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-configuration-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__ManifestOverrides__RespectsCallerIntent', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: '1.2.3' },
      taskCpu: 2048,
      logging: {
        createLogGroup: true,
        streamPrefix: 'custom',
        retentionInDays: 90,
        removalPolicy: 'retain'
      },
      diagnostics: {
        enableExecuteCommand: true
      }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.taskCpu).toBe(2048);
    expect(config.logging.streamPrefix).toBe('custom');
    expect(config.logging.retentionInDays).toBe(90);
    expect(config.diagnostics.enableExecuteCommand).toBe(true);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-005
   * {
   *   "id": "TP-ecs-ec2-config-builder-005",
   *   "level": "unit",
   *   "capability": "Builder applies observability defaults",
   *   "oracle": "exact",
   *   "invariants": ["Observability baseline established"],
   *   "fixtures": ["ConfigBuilder", "Commercial platform config"],
   *   "inputs": { "shape": "Minimal config", "notes": "Commercial workload" },
   *   "risks": ["Missing telemetry in baseline"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__ObservabilityDefaults__AppliesBaseline', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.observability?.xray?.enabled).toBe(false);
    expect(config.observability?.xray?.mode).toBe('centralized');
    expect(config.observability?.adot?.enabled).toBe(false);
    expect(config.observability?.adot?.mode).toBe('centralized');
    expect(config.observability?.dashboard?.enabled).toBe(true);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-006
   * {
   *   "id": "TP-ecs-ec2-config-builder-006",
   *   "level": "unit",
   *   "capability": "Builder merges custom observability configuration",
   *   "oracle": "exact",
   *   "invariants": ["Overrides preserved"],
   *   "fixtures": ["ConfigBuilder"],
   *   "inputs": { "shape": "Manifest overrides observability", "notes": "Custom tracing and dashboard" },
   *   "risks": ["Telemetry overrides lost"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__ObservabilityOverrides__PreservesCustomSettings', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' },
      observability: {
        xray: { enabled: true, mode: 'sidecar' },
        adot: { enabled: true, mode: 'sidecar', version: 'v0.40.0' },
        dashboard: { enabled: false }
      }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.observability?.xray?.enabled).toBe(true);
    expect(config.observability?.xray?.mode).toBe('sidecar');
    expect(config.observability?.adot?.enabled).toBe(true);
    expect(config.observability?.adot?.mode).toBe('sidecar');
    expect(config.observability?.adot?.version).toBe('v0.40.0');
    expect(config.observability?.dashboard?.enabled).toBe(false);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-007
   * {
   *   "id": "TP-ecs-ec2-config-builder-007",
   *   "level": "unit",
   *   "capability": "Builder sets network egress defaults",
   *   "oracle": "exact",
   *   "invariants": ["Default egress policy honored"],
   *   "fixtures": ["ConfigBuilder", "Commercial platform config"],
   *   "inputs": { "shape": "Minimal config", "notes": "Commercial workload" },
   *   "risks": ["Overly permissive networking"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-networking-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__NetworkDefaults__AppliesBaselineEgress', () => {
    const config = buildConfig('commercial', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.network?.egressPolicy).toBe('allow-all');
    expect(config.network?.vpcEndpoints).toEqual([]);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-008
   * {
   *   "id": "TP-ecs-ec2-config-builder-008",
   *   "level": "unit",
   *   "capability": "Builder preserves custom network configuration",
   *   "oracle": "exact",
   *   "invariants": ["Custom egress respected"],
   *   "fixtures": ["ConfigBuilder"],
   *   "inputs": { "shape": "Manifest overrides network", "notes": "FedRAMP High with endpoints" },
   *   "risks": ["Loss of restrictive egress"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-networking-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__NetworkOverrides__RetainsCustomEgress', () => {
    const config = buildConfig('fedramp-high', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' },
      network: {
        egressPolicy: 'vpc-endpoints-only',
        vpcEndpoints: ['pl-12345678', 'pl-87654321']
      }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.network?.egressPolicy).toBe('vpc-endpoints-only');
    expect(config.network?.vpcEndpoints).toEqual(['pl-12345678', 'pl-87654321']);
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-009
   * {
   *   "id": "TP-ecs-ec2-config-builder-009",
   *   "level": "unit",
   *   "capability": "Builder honours FedRAMP Moderate observability baseline",
   *   "oracle": "exact",
   *   "invariants": ["Enhanced telemetry enabled"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP Moderate platform config"],
   *   "inputs": { "shape": "Minimal config", "notes": "FedRAMP Moderate workload" },
   *   "risks": ["Telemetry disabled in FedRAMP"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__FedRampModerateObservability__EnablesTelemetry', () => {
    const config = buildConfig('fedramp-moderate', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.observability?.xray?.enabled).toBe(true);
    expect(config.observability?.xray?.mode).toBe('centralized');
    expect(config.observability?.adot?.enabled).toBe(true);
    expect(config.observability?.dashboard?.enabled).toBe(true);
    expect(config.network?.egressPolicy).toBe('vpc-only');
  });

  /*
   * Test Metadata: TP-ecs-ec2-config-builder-010
   * {
   *   "id": "TP-ecs-ec2-config-builder-010",
   *   "level": "unit",
   *   "capability": "Builder honours FedRAMP High observability baseline",
   *   "oracle": "exact",
   *   "invariants": ["Sidecar observability enforced"],
   *   "fixtures": ["ConfigBuilder", "FedRAMP High platform config"],
   *   "inputs": { "shape": "Minimal config", "notes": "FedRAMP High workload" },
   *   "risks": ["Missing isolation for telemetry collectors"],
   *   "dependencies": [],
   *   "evidence": ["builder.buildSync()"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-observability-standard"],
   *   "ai_generated": false,
   *   "human_reviewed_by": ""
   * }
   */
  it('ConfigBuilder__FedRampHighObservability__EnforcesSidecarCollectors', () => {
    const config = buildConfig('fedramp-high', {
      cluster: 'cluster',
      image: { repository: 'nginx', tag: 'latest' }
    } as Partial<EcsEc2ServiceConfig>);

    expect(config.observability?.xray?.enabled).toBe(true);
    expect(config.observability?.xray?.mode).toBe('sidecar');  // Sidecar for isolation
    expect(config.observability?.adot?.enabled).toBe(true);
    expect(config.observability?.adot?.mode).toBe('sidecar');
    expect(config.network?.egressPolicy).toBe('vpc-endpoints-only');
  });
});
