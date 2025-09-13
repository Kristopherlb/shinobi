/**
 * Test Metadata (Required by Platform Testing Standard §11)
 */
const testMetadata = {
  "id": "TP-dagger-engine-pool-builder-001",
  "level": "unit",
  "capability": "DaggerConfigBuilder 5-layer precedence chain and validation",
  "oracle": "exact",
  "invariants": ["Override > Environment > Platform > Compliance > Hardcoded precedence", "Required fields validation"],
  "fixtures": ["DaggerConfigBuilder instance", "Deterministic configuration objects"],
  "inputs": {
    "shape": "Configuration objects with various precedence levels and validation scenarios",
    "notes": "Uses deterministic test data with known configuration values"
  },
  "risks": ["Configuration precedence logic complexity", "Validation rule changes"],
  "dependencies": ["DaggerConfigBuilder", "DaggerConfig types"],
  "evidence": ["Configuration object property assertions", "Validation error messages"],
  "compliance_refs": ["std://configuration-precedence"],
  "ai_generated": false,
  "human_reviewed_by": "platform-team"
};

import { DaggerConfigBuilder } from '../../src/dagger-engine-pool.builder';
import { DaggerConfig } from '../../src/types';

describe('DaggerConfigBuilder', () => {
  let builder: DaggerConfigBuilder;

  beforeEach(() => {
    // Deterministic setup (Platform Testing Standard §6)
    builder = new DaggerConfigBuilder();
  });

  afterEach(() => {
    // Cleanup (Platform Testing Standard §6)
    jest.clearAllMocks();
  });

  describe('Builder__PlatformDefaults__AppliesSecureDefaults', () => {
    it('should apply secure platform defaults', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-001

      // Act: Apply platform defaults with required capacity
      const config = builder
        .withPlatformDefaults()
        .withOverrides({ capacity: { min: 1, max: 3 } })
        .build();

      // Assert: Verify secure defaults (Platform Testing Standard §5.1 - Exact oracle)
      expect(config.fipsMode).toBe(true);
      expect(config.instanceType).toBe('c7i.large');
      expect(config.storage?.cache).toBe('EBS');
      expect(config.storage?.ebsGiB).toBe(200);
      expect(config.endpoint?.nlbInternal).toBe(true);
      expect(config.compliance?.forbidPublicExposure).toBe(true);
      expect(config.compliance?.forbidNoKms).toBe(true);
    });
  });

  describe('Builder__CommercialCompliance__AppliesCommercialDefaults', () => {
    it('should apply commercial defaults when framework is commercial', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-002

      // Act: Apply commercial compliance defaults
      const config = builder
        .withPlatformDefaults()
        .withComplianceDefaults('commercial')
        .withOverrides({ capacity: { min: 1, max: 3 } })
        .build();

      // Assert: Commercial should not override FIPS mode from platform defaults
      expect(config.fipsMode).toBe(true); // Still from platform defaults
      expect(config.compliance?.forbidPublicExposure).toBe(true);
    });
  });

  describe('Builder__FedRAMPModerate__EnforcesFIPSMode', () => {
    it('should enforce FIPS mode for FedRAMP Moderate', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-003

      // Act: Apply FedRAMP Moderate compliance
      const config = builder
        .withPlatformDefaults()
        .withComplianceDefaults('fedramp-moderate')
        .withOverrides({ capacity: { min: 1, max: 3 } })
        .build();

      // Assert: FedRAMP Moderate requirements
      expect(config.fipsMode).toBe(true);
      expect(config.compliance?.forbidPublicExposure).toBe(true);
      expect(config.compliance?.forbidNoKms).toBe(true);
      expect(config.compliance?.forbidNonFipsAmi).toBe(true);
    });
  });

  describe('Builder__FedRAMPHigh__EnforcesFIPSMode', () => {
    it('should enforce FIPS mode for FedRAMP High', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-004

      // Act: Apply FedRAMP High compliance
      const config = builder
        .withPlatformDefaults()
        .withComplianceDefaults('fedramp-high')
        .withOverrides({ capacity: { min: 1, max: 3 } })
        .build();

      // Assert: FedRAMP High requirements (same as Moderate for this component)
      expect(config.fipsMode).toBe(true);
      expect(config.compliance?.forbidPublicExposure).toBe(true);
      expect(config.compliance?.forbidNoKms).toBe(true);
      expect(config.compliance?.forbidNonFipsAmi).toBe(true);
    });
  });

  describe('Builder__EnvironmentSettings__MergesEnvironmentConfig', () => {
    it('should merge environment-specific settings', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-005

      // Act: Apply environment-specific configuration
      const config = builder
        .withPlatformDefaults()
        .withEnvironment({
          otlpEndpoint: 'https://otel.example.com:4318',
          kmsKeyRef: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
        })
        .withOverrides({ capacity: { min: 1, max: 3 } })
        .build();

      // Assert: Environment settings merged correctly
      expect(config.observability?.otlpEndpoint).toBe('https://otel.example.com:4318');
    });
  });

  describe('Builder__ComponentOverrides__AppliesOverrides', () => {
    it('should apply component-specific overrides', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-006

      // Arrange: Define component overrides
      const overrides: Partial<DaggerConfig> = {
        capacity: { min: 2, max: 10 },
        instanceType: 'c7i.xlarge',
        storage: { cache: 'EFS', ebsGiB: 500 }
      };

      // Act: Apply overrides
      const config = builder
        .withPlatformDefaults()
        .withOverrides(overrides)
        .build();

      // Assert: Overrides applied correctly
      expect(config.capacity?.min).toBe(2);
      expect(config.capacity?.max).toBe(10);
      expect(config.instanceType).toBe('c7i.xlarge');
      expect(config.storage?.cache).toBe('EFS');
      expect(config.storage?.ebsGiB).toBe(500);
    });
  });

  describe('Builder__PrecedenceChain__RespectsOverridePrecedence', () => {
    it('should respect 5-layer precedence: override > env > platform > compliance > hardcoded', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-007

      // Act: Test precedence chain with override winning
      const config = builder
        .withPlatformDefaults()
        .withComplianceDefaults('commercial')
        .withEnvironment({})
        .withOverrides({
          fipsMode: false,
          capacity: { min: 1, max: 3 },
          compliance: { forbidNonFipsAmi: false }
        })
        .build();

      // Assert: Override should win over platform defaults (Invariant)
      expect(config.fipsMode).toBe(false);
    });
  });

  describe('Builder__NestedObjectMerging__MergesCorrectly', () => {
    it('should merge nested objects correctly', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-008

      // Arrange: Partial nested object override
      const overrides: Partial<DaggerConfig> = {
        storage: { cache: 'EFS' }, // Only override cache, keep other storage defaults
        capacity: { min: 1, max: 3 }
      };

      // Act: Apply partial override
      const config = builder
        .withPlatformDefaults()
        .withOverrides(overrides)
        .build();

      // Assert: Nested merge preserves other properties
      expect(config.storage?.cache).toBe('EFS');
      expect(config.storage?.ebsGiB).toBe(200); // Should keep platform default
    });
  });

  describe('Builder__MissingCapacity__ThrowsValidationError', () => {
    it('should throw error if capacity is missing', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-009

      // Act & Assert: Should throw validation error (Platform Testing Standard §8 - Negative testing)
      expect(() => {
        builder.build();
      }).toThrow('capacity is required');
    });
  });

  describe('Builder__FIPSModeValidation__EnforcesComplianceRules', () => {
    it('should throw error if FIPS mode is disabled when forbidNonFipsAmi is true', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-010

      // Act & Assert: Should enforce FIPS compliance rule
      expect(() => {
        builder
          .withPlatformDefaults()
          .withOverrides({
            fipsMode: false,
            compliance: { forbidNonFipsAmi: true },
            capacity: { min: 1, max: 3 }
          })
          .build();
      }).toThrow('FIPS mode is required when forbidNonFipsAmi is enabled');
    });

    it('should allow FIPS mode disabled when forbidNonFipsAmi is false', () => {
      // Test Metadata Reference: TP-dagger-engine-pool-builder-011

      // Act: Allow FIPS disabled when compliance allows it
      const config = builder
        .withPlatformDefaults()
        .withOverrides({
          fipsMode: false,
          compliance: { forbidNonFipsAmi: false },
          capacity: { min: 1, max: 3 }
        })
        .build();

      // Assert: Should allow FIPS disabled when compliance permits
      expect(config.fipsMode).toBe(false);
    });
  });
});