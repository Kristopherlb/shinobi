/**
 * Event Source Scanner Improvements Tests
 * 
 * Tests for improvements: logging, supportedTypes, schema validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventSourceScanner } from '../event-source-scanner.js';
import type { IComponent } from '../../platform/contracts/index.js';

describe('EventSourceScanner - Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ScanEventSources__WithExternalArnWithAllowDirectGrant__LogsWarning', () => {
    it('ScanEventSources__WithExternalArnWithAllowDirectGrant__LogsWarning', () => {
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

      // Assert - external queues with flag skip auto-binding, but log warning for audit trail
      expect(bindings).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('External queue ARN detected'),
        expect.objectContaining({
          componentName: 'test-lambda',
          queueArn: 'arn:aws:sqs:us-east-1:123456789012:external-queue',
          allowDirectGrant: true
        })
      );
    });
  });

  describe('ScanEventSources__WithObjectFormatAutoBindFalse__RespectsOptOut', () => {
    it('ScanEventSources__WithObjectFormatAutoBindFalse__RespectsOptOut', () => {
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
  });

  describe('ScanEventSources__WithUnsupportedEventType__SkipsGracefully', () => {
    it('ScanEventSources__WithUnsupportedEventType__SkipsGracefully', () => {
      const mockComponent: Partial<IComponent> = {
        spec: {
          name: 'test-lambda',
          type: 'lambda-worker',
          config: {
            eventSources: [
              {
                type: 'sns', // Not yet supported
                topicArn: '@component:test-topic'
              },
              {
                type: 'sqs',
                queueArn: '@component:test-queue'
              }
            ]
          }
        },
        getType: () => 'lambda-worker'
      };

      const components = [mockComponent as IComponent];

      // Act
      const bindings = EventSourceScanner.scanEventSourcesForBindings(components);

      // Assert - only SQS binding generated, SNS skipped (future support)
      expect(bindings).toHaveLength(1);
      expect(bindings[0]).toMatchObject({
        to: 'test-queue',
        capability: 'messaging:sqs',
        access: 'read'
      });
    });
  });
});

