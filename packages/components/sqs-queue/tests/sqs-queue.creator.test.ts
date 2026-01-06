/**
 * SqsQueueComponent Creator Test Suite
 * Tests component creator validation logic
 */

import { describe, it, expect } from 'vitest';
import { App, Stack, Environment } from 'aws-cdk-lib';
import { SqsQueueCreator } from '../sqs-queue.creator.js';
import { SqsQueueConfig } from '../sqs-queue.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';

const createMockContext = (
  complianceFramework: 'commercial' | 'fedramp-moderate' | 'fedramp-high' = 'commercial',
  environment: string = 'dev'
): ComponentContext => {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1'
    } as Environment
  });
  
  return {
    serviceName: 'test-service',
    owner: 'test-team',
    environment,
    complianceFramework,
    region: 'us-east-1',
    accountId: '123456789012',
    scope: stack,
    serviceLabels: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    },
    tags: {
      'service-name': 'test-service',
      'owner': 'test-team',
      'environment': environment,
      'compliance-framework': complianceFramework
    }
  };
};

const createMockSpec = (config: Partial<SqsQueueConfig> = {}): ComponentSpec => ({
  name: 'test-sqs-queue',
  type: 'sqs-queue',
  config
});

describe('SqsQueueCreator', () => {
  const creator = new SqsQueueCreator();

  describe('Component metadata', () => {
    it('should have correct component type', () => {
      expect(creator.componentType).toBe('sqs-queue');
    });

    it('should have correct display name', () => {
      expect(creator.displayName).toBe('SQS Queue');
    });

    it('should have correct category', () => {
      expect(creator.category).toBe('messaging');
    });

    it('should have correct AWS service', () => {
      expect(creator.awsService).toBe('SQS');
    });

    it('should have config schema', () => {
      expect(creator.configSchema).toBeDefined();
    });
  });

  describe('validateSpec', () => {
    it('should validate component name', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid component name starting with number', () => {
      const context = createMockContext();
      const spec: ComponentSpec = {
        name: '123-invalid-name',
        type: 'sqs-queue',
        config: {}
      };
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Component name must start with a letter');
    });

    it('should reject component name with invalid characters', () => {
      const context = createMockContext();
      const spec: ComponentSpec = {
        name: 'invalid@name',
        type: 'sqs-queue',
        config: {}
      };
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('alphanumeric characters, hyphens, and underscores');
    });

    it('should validate queue name pattern', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: 'valid-queue-name-123'
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject queue name with invalid characters', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: 'invalid@queue#name'
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('queueName must contain only alphanumeric'))).toBe(true);
    });

    it('should reject queue name longer than 80 characters', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: 'a'.repeat(81) // 81 characters
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('queueName must be 80 characters or less'))).toBe(true);
    });

    it('should reject empty queue name', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: ''
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('queueName cannot be empty'))).toBe(true);
    });

    it('should reject detailedMetrics when monitoring is disabled', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        monitoring: {
          enabled: false,
          detailedMetrics: true
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('detailedMetrics cannot be enabled when monitoring is disabled'))).toBe(true);
    });

    it('should validate DLQ configuration with valid maxReceiveCount', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        deadLetterQueue: {
          enabled: true,
          maxReceiveCount: 5
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject DLQ with invalid maxReceiveCount', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        deadLetterQueue: {
          enabled: true,
          maxReceiveCount: 0 // Invalid: must be at least 1
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('maxReceiveCount must be at least 1'))).toBe(true);
    });

    it('should allow DLQ without maxReceiveCount (uses default)', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        deadLetterQueue: {
          enabled: true
          // maxReceiveCount will use default from builder
        }
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createComponent', () => {
    it('should create component instance', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const component = creator.createComponent(spec, context);
      expect(component).toBeDefined();
      expect(component.getType()).toBe('sqs-queue');
    });

    it('should create component via processComponent alias', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const component = creator.processComponent(spec, context);
      expect(component).toBeDefined();
      expect(component.getType()).toBe('sqs-queue');
    });
  });

  describe('getProvidedCapabilities', () => {
    it('should return correct capability types', () => {
      const capabilities = creator.getProvidedCapabilities();
      expect(capabilities).toContain('messaging:sqs');
      expect(capabilities).toContain('messaging:sqs:dlq');
    });
  });

  describe('getRequiredCapabilities', () => {
    it('should return empty array (no required capabilities)', () => {
      const capabilities = creator.getRequiredCapabilities();
      expect(capabilities).toEqual([]);
    });
  });

  describe('getConstructHandles', () => {
    it('should return correct construct handles', () => {
      const handles = creator.getConstructHandles();
      expect(handles).toContain('main');
      expect(handles).toContain('deadLetterQueue');
      expect(handles).toContain('kmsKey');
      expect(handles).toContain('kmsKeyAlias');
    });
  });
});

