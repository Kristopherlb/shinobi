/**
 * Schema Error Formatter Tests
 * Tests the enhanced error messaging for service.yml validation failures
 * 
 * Test Metadata:
 * {
 *   "id": "TP-services-schema-error-formatter-001",
 *   "level": "unit",
 *   "capability": "schema error formatting and developer experience",
 *   "oracle": "contract",
 *   "invariants": ["error message clarity", "actionable suggestions", "CI/CD compatibility"],
 *   "fixtures": ["mock validation errors", "sample service manifests"],
 *   "inputs": { "shape": "ErrorObject arrays from ajv validation", "notes": "" },
 *   "risks": ["incorrect error formatting", "missing suggestions"],
 *   "dependencies": ["ajv ErrorObject types", "SchemaErrorFormatter"],
 *   "evidence": ["formatted error messages", "CI/CD JSON output"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect } from '@jest/globals';
import { SchemaErrorFormatter, FormattedError } from '../../../src/services/schema-error-formatter';
import { ErrorObject } from 'ajv';

describe('Schema Error Formatter', () => {
  describe('Error Formatting', () => {
    test('RequiredFieldError__MissingService__ProvidesActionableSuggestion', () => {
      // Arrange
      const error: ErrorObject = {
        instancePath: '',
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'service' },
        message: 'must have required property \'service\''
      };

      // Act
      const formatted = SchemaErrorFormatter.formatErrors([error]);

      // Assert
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        path: 'root',
        message: 'Missing required field: service',
        suggestion: 'Provide a unique service name (e.g., "user-api", "order-processor")',
        severity: 'error'
      });
    });

    test('BindingTargetError__AmbiguousBinding__ProvidesClearGuidance', () => {
      // Arrange
      const error: ErrorObject = {
        instancePath: '/components/0/binds/0',
        schemaPath: '#/$defs/binding/oneOf',
        keyword: 'oneOf',
        params: { passingSchemas: null },
        message: 'must match exactly one schema in oneOf'
      };

      // Act
      const formatted = SchemaErrorFormatter.formatErrors([error]);

      // Assert
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        path: 'components[0].binds[0]',
        message: 'Binding target is ambiguous or invalid',
        suggestion: 'Specify either "to" (direct component name) or "select" (component selector) to identify the target',
        severity: 'error'
      });
    });

    test('ArrayConstraintError__EmptyComponents__ProvidesContextualSuggestion', () => {
      // Arrange
      const error: ErrorObject = {
        instancePath: '/components',
        schemaPath: '#/properties/components/minItems',
        keyword: 'minItems',
        params: { limit: 1 },
        message: 'must NOT have fewer than 1 items'
      };

      // Act
      const formatted = SchemaErrorFormatter.formatErrors([error]);

      // Assert
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        path: 'components',
        message: 'Array must have at least 1 item(s)',
        suggestion: 'Define at least 1 infrastructure component(s) for your service',
        severity: 'error'
      });
    });

    test('PatternError__InvalidServiceName__ProvidesFormatGuidance', () => {
      // Arrange
      const error: ErrorObject = {
        instancePath: '/service',
        schemaPath: '#/properties/service/pattern',
        keyword: 'pattern',
        params: { pattern: '^[a-z0-9-]+$' },
        message: 'must match pattern "^[a-z0-9-]+$"'
      };

      // Act
      const formatted = SchemaErrorFormatter.formatErrors([error]);

      // Assert
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        path: 'service',
        message: 'Invalid format for service',
        suggestion: 'Use lowercase letters, numbers, and hyphens only (e.g., "user-api", "order-processor")',
        severity: 'error'
      });
    });

    test('EnumError__InvalidAccessLevel__ListsValidOptions', () => {
      // Arrange
      const error: ErrorObject = {
        instancePath: '/components/0/binds/0/access',
        schemaPath: '#/$defs/binding/properties/access/enum',
        keyword: 'enum',
        params: { allowedValues: ['read', 'write', 'readwrite', 'admin'] },
        message: 'must be equal to one of the allowed values'
      };

      // Act
      const formatted = SchemaErrorFormatter.formatErrors([error]);

      // Assert
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toEqual({
        path: 'components[0].binds[0].access',
        message: 'Invalid value for access',
        suggestion: 'Must be one of: read, write, readwrite, admin',
        severity: 'error'
      });
    });
  });

  describe('Error Report Generation', () => {
    test('HumanReport__MultipleErrors__GroupsByPath', () => {
      // Arrange
      const errors: ErrorObject[] = [
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'service' },
          message: 'must have required property \'service\''
        },
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'owner' },
          message: 'must have required property \'owner\''
        },
        {
          instancePath: '/components/0/binds/0',
          schemaPath: '#/$defs/binding/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: null },
          message: 'must match exactly one schema in oneOf'
        }
      ];

      // Act
      const report = SchemaErrorFormatter.generateErrorReport(errors, 'human');

      // Assert
      expect(report).toContain('❌ Service manifest validation failed:');
      expect(report).toContain('📊 Summary: 3 error(s), 0 warning(s)');
      expect(report).toContain('📍 root:');
      expect(report).toContain('📍 components[0].binds[0]:');
      expect(report).toContain('Missing required field: service');
      expect(report).toContain('Missing required field: owner');
      expect(report).toContain('Binding target is ambiguous or invalid');
    });

    test('JsonReport__MultipleErrors__MachineReadableFormat', () => {
      // Arrange
      const errors: ErrorObject[] = [
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'service' },
          message: 'must have required property \'service\''
        },
        {
          instancePath: '/components/0/binds/0',
          schemaPath: '#/$defs/binding/oneOf',
          keyword: 'oneOf',
          params: { passingSchemas: null },
          message: 'must match exactly one schema in oneOf'
        }
      ];

      // Act
      const report = SchemaErrorFormatter.generateErrorReport(errors, 'json');
      const parsed = JSON.parse(report);

      // Assert
      expect(parsed).toEqual({
        valid: false,
        summary: {
          errors: 2,
          warnings: 0,
          total: 2
        },
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'root',
            message: 'Missing required field: service',
            severity: 'error'
          }),
          expect.objectContaining({
            path: 'components[0].binds[0]',
            message: 'Binding target is ambiguous or invalid',
            severity: 'error'
          })
        ]),
        groupedErrors: expect.objectContaining({
          'root': expect.any(Array),
          'components[0].binds[0]': expect.any(Array)
        })
      });
    });

    test('ValidManifest__NoErrors__SuccessMessage', () => {
      // Arrange
      const errors: ErrorObject[] = [];

      // Act
      const humanReport = SchemaErrorFormatter.generateErrorReport(errors, 'human');
      const jsonReport = SchemaErrorFormatter.generateErrorReport(errors, 'json');
      const parsedJson = JSON.parse(jsonReport);

      // Assert
      expect(humanReport).toBe('✅ Service manifest is valid!');
      expect(parsedJson).toEqual({
        valid: true,
        errors: [],
        summary: { errors: 0, warnings: 0 }
      });
    });
  });

  describe('Path Formatting', () => {
    test('PathFormatting__ComplexPaths__ConvertsToReadableFormat', () => {
      // Arrange
      const testCases = [
        { input: '', expected: 'root' },
        { input: '/service', expected: 'service' },
        { input: '/components/0', expected: 'components[0]' },
        { input: '/components/0/binds/1', expected: 'components[0].binds[1]' },
        { input: '/components/0/config/timeout', expected: 'components[0].config.timeout' }
      ];

      // Act & Assert
      for (const testCase of testCases) {
        const error: ErrorObject = {
          instancePath: testCase.input,
          schemaPath: '#/test',
          keyword: 'required',
          params: { missingProperty: 'test' },
          message: 'test'
        };

        const formatted = SchemaErrorFormatter.formatErrors([error]);
        expect(formatted[0].path).toBe(testCase.expected);
      }
    });
  });

  describe('CI/CD Integration', () => {
    test('CICDConsumption__JsonFormat__EnablesAutomatedProcessing', () => {
      // Arrange
      const errors: ErrorObject[] = [
        {
          instancePath: '/service',
          schemaPath: '#/properties/service/pattern',
          keyword: 'pattern',
          params: { pattern: '^[a-z0-9-]+$' },
          message: 'must match pattern'
        }
      ];

      // Act
      const jsonReport = SchemaErrorFormatter.generateErrorReport(errors, 'json');
      const parsed = JSON.parse(jsonReport);

      // Assert - Verify structure is suitable for CI/CD automation
      expect(parsed.valid).toBe(false);
      expect(parsed.summary.errors).toBe(1);
      expect(parsed.errors).toHaveLength(1);
      expect(parsed.errors[0]).toHaveProperty('path');
      expect(parsed.errors[0]).toHaveProperty('message');
      expect(parsed.errors[0]).toHaveProperty('suggestion');
      expect(parsed.errors[0]).toHaveProperty('severity');
      
      // Verify grouped errors structure for path-based processing
      expect(parsed.groupedErrors).toHaveProperty('service');
      expect(parsed.groupedErrors.service).toHaveLength(1);
    });

    test('CICDConsumption__ErrorCounts__EnablesThresholdBasedActions', () => {
      // Arrange
      const errors: ErrorObject[] = [
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'service' },
          message: 'missing service'
        },
        {
          instancePath: '',
          schemaPath: '#/required',
          keyword: 'required',
          params: { missingProperty: 'owner' },
          message: 'missing owner'
        }
      ];

      // Act
      const jsonReport = SchemaErrorFormatter.generateErrorReport(errors, 'json');
      const parsed = JSON.parse(jsonReport);

      // Assert - Verify summary enables CI/CD decision making
      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.errors).toBe(2);
      expect(parsed.summary.warnings).toBe(0);
      
      // CI/CD can use these counts for automated actions
      if (parsed.summary.errors > 0) {
        expect(parsed.valid).toBe(false);
      }
    });
  });
});
