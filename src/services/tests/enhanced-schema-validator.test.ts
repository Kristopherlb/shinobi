/**
 * Unit tests for EnhancedSchemaValidator
 * Following Platform Testing Standard v1.0
 */

import { EnhancedSchemaValidator } from '../enhanced-schema-validator';
import { ManifestSchemaComposer } from '../manifest-schema-composer';
import { Logger } from '../../platform/logger/src/index';

// Test metadata following §11
const testMetadata = {
  "id": "TP-enhanced-validator-validation-001",
  "level": "unit",
  "capability": "Validates manifest against composed master schema",
  "oracle": "exact",
  "invariants": ["Validation results are deterministic", "Error reporting is comprehensive"],
  "fixtures": ["Mock manifest data", "Composed master schema"],
  "inputs": { "shape": "Service manifest object", "notes": "Tests comprehensive validation logic" },
  "risks": [],
  "dependencies": [],
  "evidence": [],
  "compliance_refs": [],
  "ai_generated": true,
  "human_reviewed_by": "Platform Engineering Team"
};

describe('EnhancedSchemaValidator', () => {
  let validator: EnhancedSchemaValidator;
  let composer: ManifestSchemaComposer;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger('test');
    composer = new ManifestSchemaComposer({ logger: mockLogger });
    validator = new EnhancedSchemaValidator({ logger: mockLogger, schemaComposer: composer });
  });

  describe('Manifest Validation', () => {
    test('ValidatesManifest__ValidStructure__ReturnsSuccess', async () => {
      // TP-enhanced-validator-validation-001
      // Test metadata above

      // Given: Valid manifest structure
      const validManifest = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'ec2-instance',
            config: {
              instanceType: 't3.micro',
              ami: { amiId: 'ami-12345678' }
            }
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(validManifest);

      // Then: Validation succeeds
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.componentValidationResults).toHaveLength(1);
      expect(result.componentValidationResults[0].valid).toBe(true);
    });

    test('ValidatesManifest__MissingRequiredFields__ReturnsErrors', async () => {
      // TP-enhanced-validator-validation-002
      const testMetadata = {
        "id": "TP-enhanced-validator-validation-002",
        "level": "unit",
        "capability": "Validates required fields and reports errors",
        "oracle": "exact",
        "invariants": ["Missing required fields generate errors", "Error paths are accurate"],
        "fixtures": ["Invalid manifest with missing fields"],
        "inputs": { "shape": "Manifest missing required fields", "notes": "Tests required field validation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Manifest missing required fields
      const invalidManifest = {
        // Missing service, owner, components
        components: [
          {
            // Missing name, type, config
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(invalidManifest);

      // Then: Validation fails with specific errors
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for specific error types
      const missingFieldErrors = result.errors.filter(e => e.rule === 'required');
      expect(missingFieldErrors.length).toBeGreaterThan(0);
    });

    test('ValidatesManifest__InvalidEnumValues__ReturnsEnumErrors', async () => {
      // TP-enhanced-validator-validation-003
      const testMetadata = {
        "id": "TP-enhanced-validator-validation-003",
        "level": "unit",
        "capability": "Validates enum values and reports allowed values",
        "oracle": "exact",
        "invariants": ["Invalid enum values generate errors", "Allowed values are provided"],
        "fixtures": ["Manifest with invalid enum values"],
        "inputs": { "shape": "Component config with invalid enum", "notes": "Tests enum validation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Manifest with invalid enum value
      const manifestWithInvalidEnum = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'ec2-instance',
            config: {
              instanceType: 'invalid-instance-type', // Invalid enum value
              ami: { amiId: 'ami-12345678' }
            }
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(manifestWithInvalidEnum);

      // Then: Enum validation error is reported
      expect(result.valid).toBe(false);

      const enumErrors = result.errors.filter(e => e.rule === 'enum');
      expect(enumErrors.length).toBeGreaterThan(0);

      const enumError = enumErrors[0];
      expect(enumError.allowedValues).toBeDefined();
      expect(Array.isArray(enumError.allowedValues)).toBe(true);
      expect(enumError.path).toContain('instanceType');
    });

    test('ValidatesManifest__UnknownComponentType__ReturnsComponentTypeError', async () => {
      // TP-enhanced-validator-validation-004
      const testMetadata = {
        "id": "TP-enhanced-validator-validation-004",
        "level": "unit",
        "capability": "Validates component types and reports unknown types",
        "oracle": "exact",
        "invariants": ["Unknown component types generate errors", "Available types are listed"],
        "fixtures": ["Manifest with unknown component type"],
        "inputs": { "shape": "Component with unknown type", "notes": "Tests component type validation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Manifest with unknown component type
      const manifestWithUnknownType = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'unknown-component',
            type: 'unknown-component-type',
            config: {}
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(manifestWithUnknownType);

      // Then: Component type error is reported
      expect(result.valid).toBe(false);

      const componentTypeErrors = result.errors.filter(e => e.rule === 'component-type-validation');
      expect(componentTypeErrors.length).toBeGreaterThan(0);

      const componentTypeError = componentTypeErrors[0];
      expect(componentTypeError.message).toContain('Unknown component type');
      expect(componentTypeError.allowedValues).toBeDefined();
      expect(Array.isArray(componentTypeError.allowedValues)).toBe(true);
    });

    test('ValidatesManifest__InvalidComponentConfig__ReturnsConfigErrors', async () => {
      // TP-enhanced-validator-validation-005
      const testMetadata = {
        "id": "TP-enhanced-validator-validation-005",
        "level": "unit",
        "capability": "Validates component configuration against schema",
        "oracle": "exact",
        "invariants": ["Invalid config generates errors", "Component type context is preserved"],
        "fixtures": ["Component with invalid configuration"],
        "inputs": { "shape": "Component config violating schema", "notes": "Tests component config validation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Component with invalid configuration
      const manifestWithInvalidConfig = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'ec2-instance',
            config: {
              instanceType: 't3.micro',
              // Missing required ami field
              storage: {
                rootVolumeSize: 'invalid-size' // Wrong type
              }
            }
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(manifestWithInvalidConfig);

      // Then: Config validation errors are reported
      expect(result.valid).toBe(false);

      const configErrors = result.errors.filter(e => e.componentType === 'ec2-instance');
      expect(configErrors.length).toBeGreaterThan(0);

      // Check for specific error types
      const requiredFieldErrors = configErrors.filter(e => e.rule === 'required');
      const typeErrors = configErrors.filter(e => e.rule === 'type');

      expect(requiredFieldErrors.length + typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Reporting', () => {
    test('GeneratesValidationReport__MultipleErrors__ReturnsFormattedReport', async () => {
      // TP-enhanced-validator-reporting-001
      const testMetadata = {
        "id": "TP-enhanced-validator-reporting-001",
        "level": "unit",
        "capability": "Generates human-readable validation reports",
        "oracle": "exact",
        "invariants": ["Report includes all errors", "Report is properly formatted"],
        "fixtures": ["Manifest with multiple validation errors"],
        "inputs": { "shape": "Validation result with errors", "notes": "Tests report generation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Manifest with multiple errors
      const invalidManifest = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'ec2-instance',
            config: {
              instanceType: 'invalid-type',
              ami: { amiId: 'ami-12345678' }
            }
          },
          {
            name: 'unknown-component',
            type: 'unknown-type',
            config: {}
          }
        ]
      };

      // When: Validation is performed and report generated
      const result = await validator.validateManifest(invalidManifest);
      const report = validator.generateValidationReport(result);

      // Then: Report is properly formatted
      expect(report).toContain('❌ Manifest validation failed!');
      expect(report).toContain('Errors (');
      expect(report).toContain('Component Validation Summary:');
    });

    test('FormatsJsonPath__ComplexPath__ReturnsReadablePath', () => {
      // TP-enhanced-validator-path-001
      const testMetadata = {
        "id": "TP-enhanced-validator-path-001",
        "level": "unit",
        "capability": "Formats JSON paths for readability",
        "oracle": "exact",
        "invariants": ["Paths are human-readable", "Array indices are preserved"],
        "fixtures": [],
        "inputs": { "shape": "JSON pointer path", "notes": "Tests path formatting utility" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Complex JSON path
      const complexPath = '/components/1/config/storage/additionalVolumes/0/size';

      // When: Path is formatted
      const formattedPath = (validator as any).formatJsonPath(complexPath);

      // Then: Path is readable
      expect(formattedPath).toBe('components.1.config.storage.additionalVolumes.0.size');
      expect(formattedPath).not.toContain('/');
    });

    test('DeterminesErrorSeverity__VariousRules__ReturnsCorrectSeverity', () => {
      // TP-enhanced-validator-severity-001
      const testMetadata = {
        "id": "TP-enhanced-validator-severity-001",
        "level": "unit",
        "capability": "Determines appropriate error severity levels",
        "oracle": "exact",
        "invariants": ["Critical errors are marked as errors", "Minor issues are warnings"],
        "fixtures": [],
        "inputs": { "shape": "AJV validation error objects", "notes": "Tests severity determination logic" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Various validation errors
      const criticalError = { keyword: 'required' };
      const minorError = { keyword: 'format' };

      // When: Severity is determined
      const criticalSeverity = (validator as any).determineErrorSeverity(criticalError);
      const minorSeverity = (validator as any).determineErrorSeverity(minorError);

      // Then: Correct severity is returned
      expect(criticalSeverity).toBe('error');
      expect(minorSeverity).toBe('warning');
    });
  });

  describe('Component Validation', () => {
    test('ValidatesComponent__ValidComponent__ReturnsValidResult', async () => {
      // TP-enhanced-validator-component-001
      const testMetadata = {
        "id": "TP-enhanced-validator-component-001",
        "level": "unit",
        "capability": "Validates individual component configuration",
        "oracle": "exact",
        "invariants": ["Valid components pass validation", "Component context is preserved"],
        "fixtures": ["Valid component configuration"],
        "inputs": { "shape": "Component object with valid config", "notes": "Tests component validation logic" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Valid manifest with component
      const validManifest = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'ec2-instance',
            config: {
              instanceType: 't3.micro',
              ami: { amiId: 'ami-12345678' }
            }
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(validManifest);

      // Then: Component validation succeeds
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.componentValidationResults).toHaveLength(1);
      expect(result.componentValidationResults[0].valid).toBe(true);
      expect(result.componentValidationResults[0].componentName).toBe('test-component');
      expect(result.componentValidationResults[0].componentType).toBe('ec2-instance');
    });

    test('ValidatesComponent__MissingRequiredFields__ReturnsErrors', async () => {
      // TP-enhanced-validator-component-002
      const testMetadata = {
        "id": "TP-enhanced-validator-component-002",
        "level": "unit",
        "capability": "Validates component required fields",
        "oracle": "exact",
        "invariants": ["Missing required fields generate errors", "Error context includes component info"],
        "fixtures": ["Component missing required fields"],
        "inputs": { "shape": "Component missing required config", "notes": "Tests required field validation" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Manifest with component missing required fields
      const incompleteManifest = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'ec2-instance',
            config: {
              // Missing required ami field
            }
          }
        ]
      };

      // When: Manifest is validated
      const result = await validator.validateManifest(incompleteManifest);

      // Then: Required field errors are reported
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const requiredErrors = result.errors.filter((e: any) => e.rule === 'required');
      expect(requiredErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('HandlesEmptyManifest__NoComponents__ReturnsBaseValidation', async () => {
      // TP-enhanced-validator-edge-001
      const testMetadata = {
        "id": "TP-enhanced-validator-edge-001",
        "level": "unit",
        "capability": "Handles empty manifest gracefully",
        "oracle": "exact",
        "invariants": ["Empty manifests are handled", "Base validation is performed"],
        "fixtures": ["Empty manifest object"],
        "inputs": { "shape": "Manifest with no components", "notes": "Tests empty manifest handling" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Empty manifest (base schema requires at least 1 component)
      const emptyManifest = {
        service: 'test-service',
        owner: 'test-team',
        components: []
      };

      // When: Empty manifest is validated
      const result = await validator.validateManifest(emptyManifest);

      // Then: Validation handles empty components but fails due to base schema requirement
      expect(result.componentValidationResults).toHaveLength(0);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for the minimum items error
      const minItemsError = result.errors.find(e => e.rule === 'minItems');
      expect(minItemsError).toBeDefined();
    });

    test('HandlesNullManifest__NullInput__ThrowsError', async () => {
      // TP-enhanced-validator-edge-002
      const testMetadata = {
        "id": "TP-enhanced-validator-edge-002",
        "level": "unit",
        "capability": "Handles null manifest input",
        "oracle": "exact",
        "invariants": ["Null input is handled gracefully", "Error is thrown appropriately"],
        "fixtures": [],
        "inputs": { "shape": "Null manifest", "notes": "Tests null input handling" },
        "risks": [],
        "dependencies": [],
        "evidence": [],
        "compliance_refs": [],
        "ai_generated": true,
        "human_reviewed_by": "Platform Engineering Team"
      };

      // Given: Null manifest
      const nullManifest = null;

      // When: Null manifest validation is attempted
      // Then: Error is thrown
      await expect(validator.validateManifest(nullManifest as any)).rejects.toThrow();
    });
  });
});
