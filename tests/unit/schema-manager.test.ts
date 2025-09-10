/**
 * Unit Tests for SchemaManager with Authoritative JSON Schema
 * Validates the complete service.yml schema including $ref support
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SchemaManager } from '../../src/services/schema-manager';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('SchemaManager', () => {
  let schemaManager: SchemaManager;
  let ajv: Ajv;

  beforeEach(() => {
    schemaManager = new SchemaManager();
    ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
  });

  describe('Authoritative Schema Loading', () => {
    test('should load the complete JSON schema successfully', async () => {
      const schema = await schemaManager.getBaseSchema();
      
      expect(schema).toBeDefined();
      expect(schema.title).toBe('Platform Service Manifest');
      expect(schema.type).toBe('object');
      expect(schema.required).toContain('service');
      expect(schema.required).toContain('owner');
      expect(schema.required).toContain('components');
    });

    test('should include $ref support in environment configuration', async () => {
      const schema = await schemaManager.getBaseSchema();
      
      const environmentDef = schema.$defs.environmentConfiguration;
      expect(environmentDef).toBeDefined();
      expect(environmentDef.properties.$ref).toBeDefined();
      expect(environmentDef.properties.$ref.type).toBe('string');
      expect(environmentDef.properties.$ref.description).toContain('external YAML or JSON file');
      
      // Environment-specific $ref support
      expect(environmentDef.additionalProperties.properties.$ref).toBeDefined();
    });

    test('should validate complete service manifest with all features', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const validManifest = {
        service: 'order-processor',
        owner: 'team-orders',
        complianceFramework: 'fedramp-moderate',
        runtime: 'nodejs20',
        labels: {
          domain: 'commerce',
          criticality: 'high'
        },
        environments: {
          $ref: './config/environments.yml',
          'prod-special': {
            $ref: './config/prod-override.json',
            defaults: {
              instanceSize: 'db.r5.xlarge'
            }
          }
        },
        components: [
          {
            name: 'shared-db',
            type: 'rds-postgres-import',
            config: {
              instanceArn: 'arn:aws:rds:us-east-1:123456789012:db:shared-db'
            }
          },
          {
            name: 'order-api',
            type: 'lambda-api',
            config: {
              handler: 'src/api.handler'
            },
            binds: [
              {
                to: 'shared-db',
                capability: 'db:postgres',
                access: 'readwrite'
              }
            ],
            labels: {
              tier: 'api'
            }
          }
        ],
        extensions: {
          patches: [
            {
              name: 'customSecurityGroup',
              justification: 'Required for legacy system integration until Q2 2024 migration',
              owner: 'team-orders',
              expiresOn: '2024-06-30'
            }
          ]
        }
      };

      const valid = validate(validManifest);
      if (!valid) {
        console.log('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    test('should validate component bindings with selectors', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const manifestWithSelectors = {
        service: 'notification-service',
        owner: 'team-notifications',
        components: [
          {
            name: 'notifier',
            type: 'lambda-worker',
            config: {
              handler: 'src/worker.handler'
            },
            binds: [
              {
                select: {
                  type: 'sns-topic',
                  withLabels: {
                    purpose: 'notifications',
                    environment: 'prod'
                  }
                },
                capability: 'topic:sns',
                access: 'write'
              }
            ]
          }
        ]
      };

      const valid = validate(manifestWithSelectors);
      expect(valid).toBe(true);
    });

    test('should reject invalid service names', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const invalidManifest = {
        service: 'Order_Processor', // Uppercase and underscore not allowed
        owner: 'team-orders',
        components: [
          { name: 'api', type: 'lambda-api' }
        ]
      };

      const valid = validate(invalidManifest);
      expect(valid).toBe(false);
      
      const serviceError = validate.errors?.find(err => 
        err.instancePath === '/service'
      );
      expect(serviceError).toBeDefined();
    });

    test('should require minimum justification length for patches', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const manifestWithShortJustification = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          { name: 'api', type: 'lambda-api' }
        ],
        extensions: {
          patches: [
            {
              name: 'testPatch',
              justification: 'Short', // Too short - minimum is 20 characters
              owner: 'test-team',
              expiresOn: '2024-12-31'
            }
          ]
        }
      };

      const valid = validate(manifestWithShortJustification);
      expect(valid).toBe(false);
      
      const justificationError = validate.errors?.find(err => 
        err.instancePath.includes('justification')
      );
      expect(justificationError).toBeDefined();
    });

    test('should validate date format for patch expiration', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const manifestWithInvalidDate = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          { name: 'api', type: 'lambda-api' }
        ],
        extensions: {
          patches: [
            {
              name: 'testPatch',
              justification: 'This is a valid justification that meets the minimum length requirement',
              owner: 'test-team',
              expiresOn: 'invalid-date' // Invalid date format
            }
          ]
        }
      };

      const valid = validate(manifestWithInvalidDate);
      expect(valid).toBe(false);
      
      const dateError = validate.errors?.find(err => 
        err.instancePath.includes('expiresOn')
      );
      expect(dateError).toBeDefined();
    });

    test('should validate binding access levels', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const manifestWithInvalidAccess = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            binds: [
              {
                to: 'database',
                capability: 'db:postgres',
                access: 'invalid-access' // Should be read, write, readwrite, or admin
              }
            ]
          }
        ]
      };

      const valid = validate(manifestWithInvalidAccess);
      expect(valid).toBe(false);
      
      const accessError = validate.errors?.find(err => 
        err.instancePath.includes('access')
      );
      expect(accessError).toBeDefined();
    });

    test('should support readwrite access level', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const manifestWithReadwriteAccess = {
        service: 'test-service',
        owner: 'test-team',
        components: [
          {
            name: 'api',
            type: 'lambda-api',
            binds: [
              {
                to: 'database',
                capability: 'db:postgres',
                access: 'readwrite' // Should be valid
              }
            ]
          }
        ]
      };

      const valid = validate(manifestWithReadwriteAccess);
      expect(valid).toBe(true);
    });

    test('should validate compliance framework enum', async () => {
      const schema = await schemaManager.getBaseSchema();
      const validate = ajv.compile(schema);

      const manifestWithInvalidCompliance = {
        service: 'test-service',
        owner: 'test-team',
        complianceFramework: 'invalid-framework', // Should be commercial, fedramp-moderate, or fedramp-high
        components: [
          { name: 'api', type: 'lambda-api' }
        ]
      };

      const valid = validate(manifestWithInvalidCompliance);
      expect(valid).toBe(false);
    });
  });

  describe('Schema Completeness', () => {
    test('should include all required top-level properties', async () => {
      const schema = await schemaManager.getBaseSchema();
      
      expect(schema.properties.service).toBeDefined();
      expect(schema.properties.owner).toBeDefined();
      expect(schema.properties.complianceFramework).toBeDefined();
      expect(schema.properties.runtime).toBeDefined();
      expect(schema.properties.labels).toBeDefined();
      expect(schema.properties.environments).toBeDefined();
      expect(schema.properties.components).toBeDefined();
      expect(schema.properties.extensions).toBeDefined();
    });

    test('should include all component definition properties', async () => {
      const schema = await schemaManager.getBaseSchema();
      const componentDef = schema.$defs.component;
      
      expect(componentDef.properties.name).toBeDefined();
      expect(componentDef.properties.type).toBeDefined();
      expect(componentDef.properties.config).toBeDefined();
      expect(componentDef.properties.binds).toBeDefined();
      expect(componentDef.properties.labels).toBeDefined();
      expect(componentDef.properties.overrides).toBeDefined();
      expect(componentDef.properties.policy).toBeDefined();
    });

    test('should include all binding definition properties', async () => {
      const schema = await schemaManager.getBaseSchema();
      const bindingDef = schema.$defs.binding;
      
      expect(bindingDef.properties.to).toBeDefined();
      expect(bindingDef.properties.select).toBeDefined();
      expect(bindingDef.properties.capability).toBeDefined();
      expect(bindingDef.properties.access).toBeDefined();
      expect(bindingDef.properties.env).toBeDefined();
      expect(bindingDef.properties.options).toBeDefined();
    });
  });
});