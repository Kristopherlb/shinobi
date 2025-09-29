/**
 * API Integration Tests
 * 
 * Integration tests for API endpoints to ensure proper request/response handling
 * and integration with the logger service.
 * 
 * Compliant with Platform Testing Standard v1.0
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';
import { createWebUIDIContainer, setGlobalContainer } from '../../server/services/di-container';
import { SERVICE_TOKENS } from '../../server/services/service-tokens';
import { setupDeterministicTest, teardownDeterministicTest, DeterminismHarness, TestMetadata } from '../utils/platform-testing-utils';

// Mock the Logger service
const mockLogger = {
  configure: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

vi.mock('@shinobi/observability-handlers', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger)
}));

// Mock the FeatureFlagService
const mockFeatureFlagService = {
  configure: vi.fn().mockResolvedValue(undefined),
  getClient: vi.fn().mockResolvedValue({}),
  getBooleanValue: vi.fn().mockResolvedValue({
    value: true,
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  getStringValue: vi.fn().mockResolvedValue({
    value: 'default',
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  getNumberValue: vi.fn().mockResolvedValue({
    value: 0,
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  getObjectValue: vi.fn().mockResolvedValue({
    value: {},
    reason: 'DEFAULT',
    variant: undefined,
    flagMetadata: {}
  }),
  evaluateFlags: vi.fn().mockResolvedValue({}),
  shutdown: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@shinobi/core', () => ({
  FeatureFlagService: vi.fn().mockImplementation(() => mockFeatureFlagService)
}));

describe('API Integration Tests', () => {
  let app: express.Application;
  let harness: DeterminismHarness;

  beforeAll(async () => {
    // Setup deterministic test environment
    harness = setupDeterministicTest();

    // Create Express app
    app = express();
    app.use(express.json());

    // Initialize DI container with mocked services
    const container = createWebUIDIContainer();
    
    // Register mocked services
    const { WebUILoggerService } = await import('../../server/services/logger.service');
    const { createWebUIFeatureFlagService } = await import('../../server/services/feature-flag.service');
    
    container.register(SERVICE_TOKENS.SHINOBI_LOGGER, mockLogger, true);
    container.register(SERVICE_TOKENS.LOGGER_SERVICE, new WebUILoggerService(mockLogger), true);
    container.register(SERVICE_TOKENS.SHINOBI_FEATURE_FLAG_SERVICE, mockFeatureFlagService, true);
    container.register(SERVICE_TOKENS.FEATURE_FLAG_SERVICE, createWebUIFeatureFlagService(mockFeatureFlagService, new WebUILoggerService(mockLogger)), true);
    
    setGlobalContainer(container);

    // Register routes
    await registerRoutes(app);
  });

  afterAll(() => {
    // Teardown deterministic test environment
    teardownDeterministicTest(harness);
  });

  describe('Health Check', () => {
    const metadata: TestMetadata = {
      id: 'health-check-001',
      level: 'integration',
      capability: 'health-monitoring',
      oracle: 'status-code-and-response-structure',
      compliance_refs: ['platform-testing-standard-v1.0'],
      ai_generated: true
    };

    it('HealthCheck__ValidRequest__ReturnsOkStatus', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'web-ui',
        timestamp: expect.any(String),
        version: expect.any(String)
      });
    }, metadata);
  });

  describe('Feature Flags', () => {
    const metadata: TestMetadata = {
      id: 'feature-flags-001',
      level: 'integration',
      capability: 'feature-flag-evaluation',
      oracle: 'response-structure-and-status-code',
      compliance_refs: ['platform-testing-standard-v1.0', 'feature-flagging-canary-deployment-v1.0'],
      ai_generated: true
    };

    it('FeatureFlagHealth__ValidRequest__ReturnsHealthyStatus', async () => {
      const response = await request(app)
        .get('/api/feature-flags/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'feature-flags',
        timestamp: expect.any(String),
        testEvaluation: expect.any(Boolean),
        reason: expect.any(String)
      });
    }, metadata);

    it('FeatureFlagEvaluation__ValidBooleanFlag__ReturnsEvaluationResult', async () => {
      const response = await request(app)
        .post('/api/feature-flags/evaluate')
        .send({
          flagKey: 'test-flag',
          defaultValue: false,
          type: 'boolean'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        value: expect.any(Boolean),
        reason: expect.any(String),
        flagMetadata: expect.any(Object)
      });
    }, metadata);

    it('FeatureFlagEvaluation__MissingFlagKey__ReturnsBadRequest', async () => {
      const response = await request(app)
        .post('/api/feature-flags/evaluate')
        .send({
          defaultValue: false,
          type: 'boolean'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'flagKey is required',
        code: 'MISSING_FLAG_KEY'
      });
    }, metadata);

    it('FeatureFlagEvaluation__MissingDefaultValue__ReturnsBadRequest', async () => {
      const response = await request(app)
        .post('/api/feature-flags/evaluate')
        .send({
          flagKey: 'test-flag',
          type: 'boolean'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'defaultValue is required',
        code: 'MISSING_DEFAULT_VALUE'
      });
    }, metadata);

    it('FeatureFlagBatchEvaluation__ValidFlags__ReturnsBatchResults', async () => {
      const response = await request(app)
        .post('/api/feature-flags/evaluate-batch')
        .send({
          flags: [
            {
              flagKey: 'flag1',
              defaultValue: true,
              type: 'boolean'
            },
            {
              flagKey: 'flag2',
              defaultValue: 'default',
              type: 'string'
            }
          ]
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    }, metadata);
  });

  describe('Local Development', () => {
    const metadata: TestMetadata = {
      id: 'local-dev-001',
      level: 'integration',
      capability: 'local-development-management',
      oracle: 'response-structure-and-status-code',
      compliance_refs: ['platform-testing-standard-v1.0'],
      ai_generated: true
    };

    it('LocalDevServices__ValidRequest__ReturnsServicesList', async () => {
      const response = await request(app)
        .get('/api/local-dev/services')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        serviceName: expect.any(String),
        description: expect.any(String),
        owner: expect.any(String),
        team: expect.any(String),
        complianceFramework: expect.any(String),
        initialPattern: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        status: expect.any(String)
      });
    }, metadata);

    it('LocalDevServiceStart__ValidServiceId__ReturnsSuccessResponse', async () => {
      const response = await request(app)
        .post('/api/local-dev/services/test-service-1/start')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        serviceId: 'test-service-1',
        status: 'starting'
      });
    }, metadata);

    it('LocalDevServiceStop__ValidServiceId__ReturnsSuccessResponse', async () => {
      const response = await request(app)
        .post('/api/local-dev/services/test-service-1/stop')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        serviceId: 'test-service-1',
        status: 'stopping'
      });
    }, metadata);
  });

  describe('Error Handling', () => {
    const metadata: TestMetadata = {
      id: 'error-handling-001',
      level: 'integration',
      capability: 'error-handling',
      oracle: 'error-response-structure',
      compliance_refs: ['platform-testing-standard-v1.0'],
      ai_generated: true
    };

    it('InvalidRoute__NonExistentEndpoint__ReturnsNotFound', async () => {
      const response = await request(app)
        .get('/api/invalid-route')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'API endpoint not found',
        code: 'NOT_FOUND',
        path: '/invalid-route',
        timestamp: expect.any(String)
      });
    }, metadata);
  });
});