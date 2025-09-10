/**
 * Service Manifest Schema Validation Tests
 * Tests the JSON Schema for service.yml manifests
 * 
 * Test Metadata:
 * {
 *   "id": "TP-services-manifest-schema-001",
 *   "level": "unit",
 *   "capability": "service.yml schema validation and compliance enforcement",
 *   "oracle": "contract",
 *   "invariants": ["schema validity", "binding target enforcement", "trigger structure validation"],
 *   "fixtures": ["JSON Schema validator", "sample service manifests"],
 *   "inputs": { "shape": "service.yml manifest objects with various configurations", "notes": "" },
 *   "risks": ["invalid schema breaking validation", "missing required constraints"],
 *   "dependencies": ["Ajv JSON Schema validator", "service-manifest.schema.json"],
 *   "evidence": ["schema validation results", "constraint enforcement verification"],
 *   "compliance_refs": ["std://platform-testing-standard"],
 *   "ai_generated": true,
 *   "human_reviewed_by": "Platform Engineering"
 * }
 */

import { describe, test, expect } from '@jest/globals';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '../../../src/services/service-manifest.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('Service Manifest Schema', () => {
  describe('Schema Structure Validation', () => {
    test('SchemaStructure__ValidJsonSchema__LoadsSuccessfully', () => {
      // Act & Assert
      expect(schema).toBeDefined();
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(schema.title).toBe('Platform Service Manifest');
      expect(schema.type).toBe('object');
    });

    test('RequiredFields__MinimalManifest__EnforcesRequiredProperties', () => {
      // Arrange
      const minimalValid = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'lambda-api'
          }
        ]
      };

      const missingService = {
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'lambda-api'
          }
        ]
      };

      const emptyComponents = {
        service: 'test-service',
        owner: 'test-team',
        components: []
      };

      // Act & Assert
      expect(validate(minimalValid)).toBe(true);
      
      expect(validate(missingService)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '',
            schemaPath: '#/required',
            keyword: 'required',
            params: { missingProperty: 'service' }
          })
        ])
      );

      expect(validate(emptyComponents)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/components',
            schemaPath: '#/properties/components/minItems',
            keyword: 'minItems'
          })
        ])
      );
    });
  });

  describe('Component Definition Validation', () => {
    test('ComponentStructure__ValidComponent__AcceptsRequiredFields', () => {
      // Arrange
      const validManifest = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'test-component',
            type: 'lambda-api',
            config: {
              runtime: 'nodejs20'
            }
          }
        ]
      };

      // Act & Assert
      expect(validate(validManifest)).toBe(true);
    });

    test('ComponentStructure__WithTriggersBlock__AcceptsTriggersArray', () => {
      // Arrange
      const manifestWithTriggers = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'source-bucket',
            type: 's3-bucket',
            triggers: [
              {
                event: 'objectCreated',
                target: 'processor-lambda'
              },
              {
                event: 'objectRemoved',
                target: 'cleanup-lambda'
              }
            ]
          },
          {
            name: 'processor-lambda',
            type: 'lambda-worker'
          },
          {
            name: 'cleanup-lambda',
            type: 'lambda-worker'
          }
        ]
      };

      // Act & Assert
      expect(validate(manifestWithTriggers)).toBe(true);
    });

    test('TriggerValidation__MissingRequiredFields__RejectsInvalidTriggers', () => {
      // Arrange
      const invalidTriggers = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'source-bucket',
            type: 's3-bucket',
            triggers: [
              {
                event: 'objectCreated'
                // Missing required 'target' field
              }
            ]
          }
        ]
      };

      // Act & Assert
      expect(validate(invalidTriggers)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/components/0/triggers/0',
            schemaPath: '#/$defs/trigger/required',
            keyword: 'required',
            params: { missingProperty: 'target' }
          })
        ])
      );
    });
  });

  describe('Binding Target Enforcement', () => {
    test('BindingTargetEnforcement__ValidToBinding__AcceptsDirectTarget', () => {
      // Arrange
      const validToBinding = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'api-lambda',
            type: 'lambda-api',
            binds: [
              {
                to: 'user-database',
                capability: 'db:postgres',
                access: 'readwrite'
              }
            ]
          },
          {
            name: 'user-database',
            type: 'rds-postgres'
          }
        ]
      };

      // Act & Assert
      expect(validate(validToBinding)).toBe(true);
    });

    test('BindingTargetEnforcement__ValidSelectBinding__AcceptsSelectorTarget', () => {
      // Arrange
      const validSelectBinding = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'api-lambda',
            type: 'lambda-api',
            binds: [
              {
                select: {
                  type: 'rds-postgres',
                  withLabels: {
                    'tier': 'primary'
                  }
                },
                capability: 'db:postgres',
                access: 'readwrite'
              }
            ]
          }
        ]
      };

      // Act & Assert
      expect(validate(validSelectBinding)).toBe(true);
    });

    test('BindingTargetEnforcement__MissingTarget__RejectsAmbiguousBinding', () => {
      // Arrange
      const ambiguousBinding = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'api-lambda',
            type: 'lambda-api',
            binds: [
              {
                // Missing both 'to' and 'select'
                capability: 'db:postgres',
                access: 'readwrite'
              }
            ]
          }
        ]
      };

      // Act & Assert
      expect(validate(ambiguousBinding)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/components/0/binds/0',
            keyword: 'oneOf'
          })
        ])
      );
    });

    test('BindingTargetEnforcement__BothTargets__RejectsConflictingBinding', () => {
      // Arrange
      const conflictingBinding = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'api-lambda',
            type: 'lambda-api',
            binds: [
              {
                // Both 'to' and 'select' provided - should be rejected
                to: 'user-database',
                select: {
                  type: 'rds-postgres'
                },
                capability: 'db:postgres',
                access: 'readwrite'
              }
            ]
          }
        ]
      };

      // Act & Assert
      expect(validate(conflictingBinding)).toBe(false);
      expect(validate.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/components/0/binds/0',
            keyword: 'oneOf'
          })
        ])
      );
    });
  });

  describe('Comprehensive Integration Validation', () => {
    test('ComplexManifest__EventDrivenArchitecture__ValidatesSuccessfully', () => {
      // Arrange - Complex e-commerce order processing service
      const complexManifest = {
        service: 'order-processing',
        owner: 'team-fulfillment',
        complianceFramework: 'fedramp-moderate',
        runtime: 'nodejs20',
        labels: {
          domain: 'e-commerce',
          criticality: 'high'
        },
        environments: {
          'dev-us-west-2': {
            defaults: {
              logLevel: 'debug',
              instanceSize: 'small'
            }
          },
          'prod-us-west-2': {
            defaults: {
              logLevel: 'info',
              instanceSize: 'large'
            }
          }
        },
        components: [
          {
            name: 'order-api',
            type: 'lambda-api',
            config: {
              timeout: 30,
              memory: 512
            },
            binds: [
              {
                to: 'order-database',
                capability: 'db:postgres',
                access: 'readwrite'
              },
              {
                select: {
                  type: 'sqs-queue',
                  withLabels: {
                    purpose: 'notifications'
                  }
                },
                capability: 'queue:send',
                access: 'write'
              }
            ],
            labels: {
              tier: 'api'
            }
          },
          {
            name: 'order-database',
            type: 'rds-postgres',
            config: {
              instanceClass: 'db.r5.large',
              allocatedStorage: 100
            },
            triggers: [
              {
                event: 'dataChange',
                target: 'audit-processor'
              }
            ],
            labels: {
              tier: 'data'
            }
          },
          {
            name: 'notification-queue',
            type: 'sqs-queue',
            labels: {
              purpose: 'notifications',
              tier: 'messaging'
            },
            triggers: [
              {
                event: 'messageReceived',
                target: 'notification-handler'
              }
            ]
          },
          {
            name: 'notification-handler',
            type: 'lambda-worker',
            binds: [
              {
                to: 'external-email-service',
                capability: 'api:rest',
                access: 'write'
              }
            ]
          },
          {
            name: 'external-email-service',
            type: 'api-gateway-rest'
          },
          {
            name: 'audit-processor',
            type: 'lambda-worker',
            binds: [
              {
                to: 'audit-log-bucket',
                capability: 'storage:object',
                access: 'write'
              }
            ]
          },
          {
            name: 'audit-log-bucket',
            type: 's3-bucket',
            config: {
              versioning: true,
              encryption: 'aws:kms'
            }
          }
        ]
      };

      // Act & Assert
      expect(validate(complexManifest)).toBe(true);
    });
  });
});
