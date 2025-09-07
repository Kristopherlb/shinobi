/**
 * Main API Router for MCP Server
 * Implements the complete MCP Server Specification v1.0 API endpoints
 */

import express from 'express';
import { PlatformEndpointsService } from '../services/platform-endpoints';
import { ServiceEndpointsService } from '../services/service-endpoints';
import { GenerativeEndpointsService } from '../services/generative-endpoints';
import { AdminEndpointsService } from '../services/admin-endpoints';
import { 
  authenticateToken, 
  requireReadAccess, 
  requireGenerativeAccess, 
  requireAdmin,
  auditLog,
  AuthenticatedRequest
} from '../middleware/auth-middleware';

export interface McpServerConfig {
  jwtSecret: string;
  corsOrigins?: string[];
  rateLimiting?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Create the main API router with all endpoints
 */
export function createApiRouter(config: McpServerConfig): express.Router {
  const router = express.Router();

  // Initialize services
  const platformService = new PlatformEndpointsService();
  const serviceService = new ServiceEndpointsService();
  const generativeService = new GenerativeEndpointsService();
  const adminService = new AdminEndpointsService();

  // Middleware setup
  router.use(express.json({ limit: '10mb' }));
  router.use(authenticateToken({ jwtSecret: config.jwtSecret }));

  // ========================================
  // Platform-Level Endpoints (Developer's Toolbox)
  // ========================================

  /**
   * GET /platform/components
   * Lists all available, versioned components.
   */
  router.get('/platform/components', 
    requireReadAccess(),
    auditLog('list_components'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const components = await platformService.getComponents();
        res.json(components);
      } catch (error) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Failed to retrieve components'
        });
      }
    }
  );

  /**
   * GET /platform/components/{type}/schema
   * Returns the Config.schema.json for a component.
   */
  router.get('/platform/components/:type/schema',
    requireReadAccess(),
    auditLog('get_component_schema'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const schema = await platformService.getComponentSchema(req.params.type);
        res.json(schema);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(404).json({ 
            error: 'Component not found',
            message: `Component type '${req.params.type}' does not exist`
          });
        } else {
          res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve component schema'
          });
        }
      }
    }
  );

  /**
   * GET /platform/capabilities
   * Returns the official Capability Naming Standard.
   */
  router.get('/platform/capabilities',
    requireReadAccess(),
    auditLog('list_capabilities'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const capabilities = await platformService.getCapabilities();
        res.json(capabilities);
      } catch (error) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Failed to retrieve capabilities'
        });
      }
    }
  );

  /**
   * GET /platform/bindings
   * Returns the BindingMatrix from the BinderRegistry.
   */
  router.get('/platform/bindings',
    requireReadAccess(),
    auditLog('list_bindings'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const bindings = await platformService.getBindings();
        res.json(bindings);
      } catch (error) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Failed to retrieve bindings'
        });
      }
    }
  );

  /**
   * POST /platform/validate
   * Validates a provided service.yml manifest.
   */
  router.post('/platform/validate',
    requireReadAccess(),
    auditLog('validate_manifest'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const manifest = req.body;
        const validationResult = await platformService.validateManifest(manifest);
        res.json(validationResult);
      } catch (error) {
        res.status(400).json({ 
          error: 'Validation failed',
          message: 'Invalid manifest format'
        });
      }
    }
  );

  // ========================================
  // Service-Level Endpoints (Running Systems)
  // ========================================

  /**
   * GET /services
   * Lists all services managed by the platform.
   */
  router.get('/services',
    requireReadAccess(),
    auditLog('list_services'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const services = await serviceService.getServices();
        res.json(services);
      } catch (error) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Failed to retrieve services'
        });
      }
    }
  );

  /**
   * GET /services/{name}
   * Provides a consolidated view of a service.
   */
  router.get('/services/:name',
    requireReadAccess(),
    auditLog('get_service'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const service = await serviceService.getService(req.params.name);
        res.json(service);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(404).json({ 
            error: 'Service not found',
            message: `Service '${req.params.name}' does not exist`
          });
        } else {
          res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve service'
          });
        }
      }
    }
  );

  /**
   * GET /services/{name}/manifest
   * Returns the service's current service.yml.
   */
  router.get('/services/:name/manifest',
    requireReadAccess(),
    auditLog('get_service_manifest'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const manifest = await serviceService.getServiceManifest(req.params.name);
        res.json(manifest);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(404).json({ 
            error: 'Manifest not found',
            message: `Manifest for service '${req.params.name}' does not exist`
          });
        } else {
          res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve service manifest'
          });
        }
      }
    }
  );

  /**
   * GET /services/{name}/status
   * Returns the actual state of the service from live AWS APIs.
   */
  router.get('/services/:name/status',
    requireReadAccess(),
    auditLog('get_service_status'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const status = await serviceService.getServiceStatus(req.params.name);
        res.json(status);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(404).json({ 
            error: 'Service status not found',
            message: `Status for service '${req.params.name}' not available`
          });
        } else {
          res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to retrieve service status'
          });
        }
      }
    }
  );

  /**
   * GET /services/{name}/logs
   * Returns a stream of correlated, structured logs for the service.
   */
  router.get('/services/:name/logs',
    requireReadAccess(),
    auditLog('get_service_logs'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 100;
        const startTime = req.query.startTime as string;
        
        const logs = await serviceService.getServiceLogs(req.params.name, limit, startTime);
        res.json(logs);
      } catch (error) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Failed to retrieve service logs'
        });
      }
    }
  );

  // ========================================
  // Generative Tooling Endpoints (Scaffolding Engine)
  // ========================================

  /**
   * POST /platform/generate/component
   * Generates the complete, multi-file boilerplate for a new component.
   */
  router.post('/platform/generate/component',
    requireGenerativeAccess(),
    auditLog('generate_component'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const request = req.body;
        
        // Validate request
        if (!request.componentName || !request.componentType || !request.awsService) {
          return res.status(400).json({ 
            error: 'Invalid request',
            message: 'componentName, componentType, and awsService are required'
          });
        }

        const result = await generativeService.generateComponent(request);
        res.json(result);
      } catch (error) {
        if (error instanceof Error && error.message.includes('must be lowercase')) {
          res.status(400).json({ 
            error: 'Invalid component name',
            message: error.message
          });
        } else {
          res.status(500).json({ 
            error: 'Generation failed',
            message: 'Failed to generate component'
          });
        }
      }
    }
  );

  // ========================================
  // Platform Administration Endpoints (Super Admin Toolkit)
  // ========================================

  /**
   * GET /admin/health
   * Performs a deep health check of the MCP server and its data sources.
   */
  router.get('/admin/health',
    requireAdmin(),
    auditLog('admin_health_check'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const health = await adminService.getHealth();
        
        // Return appropriate HTTP status based on health
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({ 
          status: 'unhealthy',
          error: 'Health check failed',
          message: 'Unable to perform health check'
        });
      }
    }
  );

  /**
   * POST /admin/registry/reload
   * Forces the server to clear its cache and reload the component registry.
   */
  router.post('/admin/registry/reload',
    requireAdmin(),
    auditLog('admin_reload_registry'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const result = await adminService.reloadRegistry();
        
        const statusCode = result.success ? 200 : 500;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(500).json({ 
          success: false,
          error: 'Registry reload failed',
          message: 'Unable to reload component registry'
        });
      }
    }
  );

  /**
   * GET /admin/audit
   * Queries the platform's central audit log.
   */
  router.get('/admin/audit',
    requireAdmin(),
    auditLog('admin_query_audit'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const queryParams = {
          service: req.query.service as string,
          component: req.query.component as string,
          action: req.query.action as string,
          actor: req.query.actor as string,
          severity: req.query.severity as 'info' | 'warning' | 'critical',
          startTime: req.query.startTime as string,
          endTime: req.query.endTime as string,
          limit: parseInt(req.query.limit as string) || 100,
          offset: parseInt(req.query.offset as string) || 0
        };

        const auditLogs = await adminService.getAuditLogs(queryParams);
        res.json(auditLogs);
      } catch (error) {
        res.status(500).json({ 
          error: 'Audit query failed',
          message: 'Unable to retrieve audit logs'
        });
      }
    }
  );

  /**
   * GET /admin/dependencies
   * Returns a complete dependency graph of the entire ecosystem.
   */
  router.get('/admin/dependencies',
    requireAdmin(),
    auditLog('admin_get_dependencies'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const componentFilter = req.query.component as string;
        const dependencies = await adminService.getDependencies(componentFilter);
        res.json(dependencies);
      } catch (error) {
        res.status(500).json({ 
          error: 'Dependencies query failed',
          message: 'Unable to retrieve dependency graph'
        });
      }
    }
  );

  /**
   * GET /admin/drift
   * Triggers drift detection scan across all managed services.
   */
  router.get('/admin/drift',
    requireAdmin(),
    auditLog('admin_detect_drift'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const serviceName = req.query.service as string;
        const driftResults = await adminService.detectDrift(serviceName);
        res.json(driftResults);
      } catch (error) {
        res.status(500).json({ 
          error: 'Drift detection failed',
          message: 'Unable to perform drift detection'
        });
      }
    }
  );

  // ========================================
  // Health Check Endpoint (Unauthenticated)
  // ========================================

  /**
   * GET /health (Basic health check for load balancer)
   */
  router.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mcp-server'
    });
  });

  return router;
}