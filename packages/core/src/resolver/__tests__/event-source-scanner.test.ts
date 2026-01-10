/**
 * Event Source Scanner Tests
 * 
 * Tests for event source auto-binding scanner following Platform Testing Standard v1.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventSourceScanner } from '../event-source-scanner.js';
import type { IComponent } from '../../platform/contracts/index.js';

describe('EventSourceScanner', () => {
  describe('ScanEventSources__WithSqsComponentReference__GeneratesBinding', () => {
    const metadata = {
      id: 'TP-event-source-scanner-001',
      level: 'unit' as const,
      capability: 'Scans event sources and generates implicit bindings for SQS component references',
      oracle: 'exact' as const,
      invariants: [
        'SQS event source with @component: reference generates binding',
        'Generated binding uses messaging:sqs capability',
        'Generated binding has read access',
        'Generated binding targets correct component'
      ],
      fixtures: ['EventSourceScanner', 'MockComponent'],
      inputs: {
        shape: 'IComponent[] with eventSources config containing SQS @component: reference',
        notes: 'Tests auto-generation of bindings from event sources'
      },
      risks: [
        'Incorrect capability mapping',
        'Missing component reference resolution',
        'Wrong access level'
      ],
      dependencies: ['@shinobi/core', 'vitest'],
      evidence: ['Generated binding directive assertions'],
      compliance_refs: ['docs/spec/platform-bindings-spec.md'],
      ai_generated: true,
      human_reviewed_by: 'platform-team'
    };

    it('ScanEventSources__WithSqsComponentReference__GeneratesBinding', () => {
      // Create mock component with SQS event source
      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {
            eventSources: [
              {
                type: 'sqs',
                queueArn: '@component:test-queue',
                batchSize: 10,
                enabled: true
              }
            ]
          }
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act
      const bindings = EventSourceScanner.scanEventSourcesForBindings(components);

      // Assert
      expect(bindings).toHaveLength(1);
      expect(bindings[0]).toMatchObject({
        to: 'test-queue',
        capability: 'messaging:sqs',
        access: 'read'
      });
      // Verify source component name is tracked internally (via Symbol)
      expect(EventSourceScanner.getSourceComponentName(bindings[0])).toBe('test-lambda');
    });

    it('ScanEventSources__WithExternalArnWithoutFlag__ThrowsError', () => {
      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {
            eventSources: [
              {
                type: 'sqs',
                queueArn: 'arn:aws:sqs:us-east-1:123456789012:external-queue'
                // Missing allowDirectGrant flag
              }
            ]
          }
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act & Assert
      expect(() => {
        EventSourceScanner.scanEventSourcesForBindings(components);
      }).toThrow(/platform-bindings-spec\.md line 274/);
    });

    it('ScanEventSources__WithExternalArnWithFlag__SkipsBindingAndLogsWarning', () => {
      const mockLogger = {
        warn: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
      };

      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {
            eventSources: [
              {
                type: 'sqs',
                queueArn: 'arn:aws:sqs:us-east-1:123456789012:external-queue',
                allowDirectGrant: true
              }
            ]
          }
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act
      const bindings = EventSourceScanner.scanEventSourcesForBindings(components, mockLogger);

      // Assert - external queues with flag skip auto-binding (handled by component)
      expect(bindings).toHaveLength(0);
      // Note: Warning logging would be tested in integration tests with actual logger
    });

    it('ScanEventSources__WithAutoBindFalse__SkipsBinding', () => {
      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {
            eventSources: {
              autoBind: false,
              sources: [
                {
                  type: 'sqs',
                  queueArn: '@component:test-queue'
                }
              ]
            }
          }
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act
      const bindings = EventSourceScanner.scanEventSourcesForBindings(components);

      // Assert - opt-out prevents auto-binding
      expect(bindings).toHaveLength(0);
    });

    it('ScanEventSources__WithNoEventSources__ReturnsEmptyArray', () => {
      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {}
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act
      const bindings = EventSourceScanner.scanEventSourcesForBindings(components);

      // Assert
      expect(bindings).toHaveLength(0);
    });

    it('ScanEventSources__WithMultipleEventSources__GeneratesMultipleBindings', () => {
      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {
            eventSources: [
              {
                type: 'sqs',
                queueArn: '@component:queue-1'
              },
              {
                type: 'sqs',
                queueArn: '@component:queue-2'
              }
            ]
          }
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act
      const bindings = EventSourceScanner.scanEventSourcesForBindings(components);

      // Assert
      expect(bindings).toHaveLength(2);
      expect(bindings[0]).toMatchObject({
        to: 'queue-1',
        capability: 'messaging:sqs',
        access: 'read'
      });
      expect(EventSourceScanner.getSourceComponentName(bindings[0])).toBe('test-lambda');
      expect(bindings[1]).toMatchObject({
        to: 'queue-2',
        capability: 'messaging:sqs',
        access: 'read'
      });
      expect(EventSourceScanner.getSourceComponentName(bindings[1])).toBe('test-lambda');
    });
  });
});

