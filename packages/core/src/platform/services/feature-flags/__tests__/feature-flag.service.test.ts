import { InMemoryProvider, StandardResolutionReasons } from '@openfeature/js-sdk';
import { FeatureFlagService } from '../feature-flag.service.ts';
import { ComponentContext } from '../../../contracts/component-interfaces.ts';

const buildInMemoryProvider = () => new InMemoryProvider({
  'beta-feature': {
    variants: {
      enabled: true,
      disabled: false
    },
    defaultVariant: 'enabled',
    disabled: false
  }
});

describe('FeatureFlagService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-feature-flags-service-001",
   *   "level": "unit",
   *   "capability": "Feature flag evaluation via OpenFeature provider",
   *   "oracle": "exact",
   *   "invariants": ["provider configuration determines resolved value"],
   *   "fixtures": ["InMemoryProvider", "FeatureFlagService instance"],
   *   "inputs": { "shape": "boolean flag key with default value", "notes": "provider returns true" },
   *   "risks": ["flag defaults used unexpectedly", "provider misconfiguration"],
   *   "dependencies": ["@openfeature/js-sdk"],
   *   "evidence": ["evaluation result value", "resolution reason"],
   *   "compliance_refs": ["std://platform-testing-standard", "std://platform-feature-flags"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  it('FeatureFlagService__InMemoryProvider__ReturnsConfiguredValue', async () => {
    const service = new FeatureFlagService({
      provider: {
        name: 'in-memory',
        providerInstance: buildInMemoryProvider()
      }
    });

    const result = await service.getBooleanValue({
      flagKey: 'beta-feature',
      defaultValue: false
    });

    expect(result.value).toBe(true);
    expect([
      StandardResolutionReasons.TARGETING_MATCH,
      StandardResolutionReasons.DEFAULT,
      StandardResolutionReasons.STATIC
    ]).toContain(result.reason);

    await service.shutdown();
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-feature-flags-service-002",
   *   "level": "unit",
   *   "capability": "Client context merges component metadata",
   *   "oracle": "exact",
   *   "invariants": ["service/environment labels are injected"],
   *   "fixtures": ["ComponentContext stub"],
   *   "inputs": { "shape": "component context with feature flag targeting key", "notes": "ensures deterministic context" },
   *   "risks": ["missing targeting key", "context leak across clients"],
   *   "dependencies": ["FeatureFlagService"],
   *   "evidence": ["client.getContext output"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  it('FeatureFlagService__ComponentContext__DerivesClientContext', async () => {
    const service = new FeatureFlagService();

    const componentContext: ComponentContext = {
      serviceName: 'orders-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      scope: {} as any,
      featureFlags: {
        targetingKey: 'user-123',
        clientName: 'orders'
      },
      region: 'us-east-1',
      accountId: '123456789012',
      serviceLabels: {
        version: '1.2.3'
      }
    };

    const client = await service.getClient({
      componentContext
    });

    expect(client.getContext()).toMatchObject({
      serviceName: 'orders-service',
      environment: 'dev',
      complianceFramework: 'commercial',
      targetingKey: 'user-123'
    });

    await service.shutdown();
  });

  /**
   * Test Metadata:
   * {
   *   "id": "TP-feature-flags-service-003",
   *   "level": "unit",
   *   "capability": "Fallback to default when provider unavailable",
   *   "oracle": "exact",
   *   "invariants": ["evaluation returns default value on provider failure"],
   *   "fixtures": ["FeatureFlagService with unavailable provider"],
   *   "inputs": { "shape": "boolean flag key with default true", "notes": "provider module does not exist" },
   *   "risks": ["unexpected provider failures"],
   *   "dependencies": [],
   *   "evidence": ["evaluation result value", "resolution reason"],
   *   "compliance_refs": ["std://platform-testing-standard"],
   *   "ai_generated": true,
   *   "human_reviewed_by": "Platform Engineering"
   * }
   */
  it('FeatureFlagService__UnknownProvider__FallsBackToDefault', async () => {
    const service = new FeatureFlagService({
      provider: {
        name: 'unavailable-provider',
        module: '@not-a-real/module'
      }
    });

    const result = await service.getBooleanValue({
      flagKey: 'missing-flag',
      defaultValue: true
    });

    expect(result.value).toBe(true);
    expect(typeof result.reason).toBe('string');

    await service.shutdown();
  });
});
