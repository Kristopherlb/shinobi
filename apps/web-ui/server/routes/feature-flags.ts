/**
 * Feature Flag API Routes
 * 
 * Express routes for feature flag evaluation endpoints.
 * Integrates with the WebUI Feature Flag Service for client-side evaluation.
 * Compliant with Platform Feature Flagging & Canary Deployment Standard v1.0.
 */

import { Router, Request, Response } from 'express';
import { getGlobalContainer } from '../services/di-container.js';
import { SERVICE_TOKENS } from '../services/service-tokens.js';

const router = Router();

/**
 * Evaluate a single feature flag
 * POST /api/feature-flags/evaluate
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { flagKey, defaultValue, type = 'boolean', context = {} } = req.body;

    // Validate request
    if (!flagKey) {
      return res.status(400).json({
        error: 'flagKey is required',
        code: 'MISSING_FLAG_KEY'
      });
    }

    if (defaultValue === undefined) {
      return res.status(400).json({
        error: 'defaultValue is required',
        code: 'MISSING_DEFAULT_VALUE'
      });
    }

    // Get feature flag service from DI container
    const container = getGlobalContainer();
    const featureFlagService = await container.get(SERVICE_TOKENS.FEATURE_FLAG_SERVICE);

    // Build evaluation options
    const evaluationOptions = {
      flagKey,
      defaultValue,
      clientName: 'web-ui-client',
      userContext: context.userContext || {},
      requestContext: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        sessionId: context.sessionId
      },
      context: context
    };

    // Evaluate the feature flag
    let result;
    switch (type) {
      case 'boolean':
        result = await featureFlagService.getBooleanValue(evaluationOptions);
        break;
      case 'string':
        result = await featureFlagService.getStringValue(evaluationOptions);
        break;
      case 'number':
        result = await featureFlagService.getNumberValue(evaluationOptions);
        break;
      case 'object':
        result = await featureFlagService.getObjectValue(evaluationOptions);
        break;
      default:
        return res.status(400).json({
          error: `Invalid flag type: ${type}`,
          code: 'INVALID_FLAG_TYPE'
        });
    }

    // Return evaluation result
    res.json(result);

  } catch (error) {
    console.error('Feature flag evaluation error:', error);
    res.status(500).json({
      error: 'Feature flag evaluation failed',
      code: 'EVALUATION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Evaluate multiple feature flags in batch
 * POST /api/feature-flags/evaluate-batch
 */
router.post('/evaluate-batch', async (req: Request, res: Response) => {
  try {
    const { flags, context = {} } = req.body;

    // Validate request
    if (!Array.isArray(flags) || flags.length === 0) {
      return res.status(400).json({
        error: 'flags array is required and must not be empty',
        code: 'MISSING_FLAGS_ARRAY'
      });
    }

    // Validate each flag configuration
    for (const flag of flags) {
      if (!flag.flagKey) {
        return res.status(400).json({
          error: 'flagKey is required for each flag',
          code: 'MISSING_FLAG_KEY'
        });
      }
      if (flag.defaultValue === undefined) {
        return res.status(400).json({
          error: 'defaultValue is required for each flag',
          code: 'MISSING_DEFAULT_VALUE'
        });
      }
    }

    // Get feature flag service from DI container
    const container = getGlobalContainer();
    const featureFlagService = await container.get(SERVICE_TOKENS.FEATURE_FLAG_SERVICE);

    // Build batch evaluation request
    const batchRequest = {
      flags: flags.map((flag: any) => ({
        key: flag.flagKey,
        type: flag.type || 'boolean',
        defaultValue: flag.defaultValue
      })),
      clientName: 'web-ui-client',
      userContext: context.userContext || {},
      requestContext: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        sessionId: context.sessionId
      }
    };

    // Evaluate all feature flags
    const results = await featureFlagService.evaluateFlags(batchRequest);

    // Return batch evaluation results
    res.json(results);

  } catch (error) {
    console.error('Feature flag batch evaluation error:', error);
    res.status(500).json({
      error: 'Feature flag batch evaluation failed',
      code: 'BATCH_EVALUATION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get feature flag metadata and configuration
 * GET /api/feature-flags/metadata/:flagKey
 */
router.get('/metadata/:flagKey', async (req: Request, res: Response) => {
  try {
    const { flagKey } = req.params;

    // Get feature flag service from DI container
    const container = getGlobalContainer();
    const featureFlagService = await container.get(SERVICE_TOKENS.FEATURE_FLAG_SERVICE);

    // For now, return basic metadata
    // In a full implementation, this would fetch flag configuration from the provider
    const metadata = {
      flagKey,
      type: 'boolean', // This would be determined from the provider
      description: `Feature flag: ${flagKey}`,
      lastModified: new Date().toISOString(),
      provider: 'shinobi-platform'
    };

    res.json(metadata);

  } catch (error) {
    console.error('Feature flag metadata error:', error);
    res.status(500).json({
      error: 'Failed to fetch feature flag metadata',
      code: 'METADATA_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for feature flag service
 * GET /api/feature-flags/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Get feature flag service from DI container
    const container = getGlobalContainer();
    const featureFlagService = await container.get(SERVICE_TOKENS.FEATURE_FLAG_SERVICE);

    // Test basic functionality
    const testResult = await featureFlagService.getBooleanValue({
      flagKey: 'health-check',
      defaultValue: true,
      clientName: 'health-check-client'
    });

    res.json({
      status: 'healthy',
      service: 'feature-flags',
      timestamp: new Date().toISOString(),
      testEvaluation: testResult.value,
      reason: testResult.reason
    });

  } catch (error) {
    console.error('Feature flag health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'feature-flags',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;