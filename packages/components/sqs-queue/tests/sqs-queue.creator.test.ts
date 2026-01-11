/**
 * SqsQueueComponent Creator Test Suite
 * Tests component creator validation logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { App, Stack, Environment } from 'aws-cdk-lib';
import { SqsQueueCreator } from '../sqs-queue.creator.js';
import { SqsQueueConfig } from '../sqs-queue.builder.js';
import { ComponentContext, ComponentSpec } from '@shinobi/core';
import { vi } from 'vitest';

// Determinism controls (PTS-301, PTS-303)
let rngSeed: number;
let randomSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Freeze clock for deterministic tests (PTS-301)
  vi.useFakeTimers();
  
  // Seed RNG for reproducibility (PTS-303)
  rngSeed = 12345;
  randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
    // Simple LCG for deterministic randomness
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;
    rngSeed = (a * rngSeed + c) % m;
    return rngSeed / m;
  });
});

afterEach(() => {
  vi.useRealTimers();
  randomSpy?.mockRestore();
});

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
    it('ComponentMetadata__ComponentType__MatchesExpected', () => {
      expect(creator.componentType).toBe('sqs-queue');
    });

    it('ComponentMetadata__DisplayName__MatchesExpected', () => {
      expect(creator.displayName).toBe('SQS Queue');
    });

    it('ComponentMetadata__Category__MatchesExpected', () => {
      expect(creator.category).toBe('messaging');
    });

    it('ComponentMetadata__AWSService__MatchesExpected', () => {
      expect(creator.awsService).toBe('SQS');
    });

    it('ComponentMetadata__ConfigSchema__IsDefined', () => {
      expect(creator.configSchema).toBeDefined();
    });
  });

  describe('validateSpec', () => {
    it('Validation__ValidComponentName__PassesValidation', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Validation__NameStartsWithNumber__RejectsWithError', () => {
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

    it('Validation__NameWithInvalidCharacters__RejectsWithError', () => {
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

    it('Validation__ValidQueueName__PassesValidation', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: 'valid-queue-name-123'
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Validation__QueueNameWithInvalidCharacters__RejectsWithError', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: 'invalid@queue#name'
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('queueName must contain only alphanumeric'))).toBe(true);
    });

    it('Validation__QueueNameExceeds80Chars__RejectsWithError', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: 'a'.repeat(81) // 81 characters
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('queueName must be 80 characters or less'))).toBe(true);
    });

    it('Validation__EmptyQueueName__RejectsWithError', () => {
      const context = createMockContext();
      const spec = createMockSpec({
        queueName: ''
      });
      
      const result = creator.validateSpec(spec, context);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('queueName cannot be empty'))).toBe(true);
    });

    it('Validation__DetailedMetricsWithoutMonitoring__RejectsWithError', () => {
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

    it('Validation__ValidDLQConfig__PassesValidation', () => {
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

    it('Validation__InvalidMaxReceiveCount__RejectsWithError', () => {
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

    it('Validation__DLQWithoutMaxReceiveCount__UsesDefault', () => {
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
    it('ComponentCreation__ValidSpec__CreatesInstance', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const component = creator.createComponent(spec, context);
      expect(component).toBeDefined();
      expect(component.getType()).toBe('sqs-queue');
    });

    it('ComponentCreation__ProcessComponentAlias__CreatesInstance', () => {
      const context = createMockContext();
      const spec = createMockSpec();
      
      const component = creator.processComponent(spec, context);
      expect(component).toBeDefined();
      expect(component.getType()).toBe('sqs-queue');
    });
  });

  describe('getProvidedCapabilities', () => {
    it('CapabilityRegistration__GetProvidedCapabilities__ReturnsCorrectTypes', () => {
      const capabilities = creator.getProvidedCapabilities();
      expect(capabilities).toContain('messaging:sqs');
      expect(capabilities).toContain('messaging:sqs:dlq');
    });
  });

  describe('getRequiredCapabilities', () => {
    it('CapabilityRegistration__GetRequiredCapabilities__ReturnsEmptyArray', () => {
      const capabilities = creator.getRequiredCapabilities();
      expect(capabilities).toEqual([]);
    });
  });

  describe('getConstructHandles', () => {
    it('ConstructHandles__GetConstructHandles__ReturnsCorrectHandles', () => {
      const handles = creator.getConstructHandles();
      expect(handles).toContain('main');
      expect(handles).toContain('deadLetterQueue');
      expect(handles).toContain('kmsKey');
      expect(handles).toContain('kmsKeyAlias');
    });
  });
});

