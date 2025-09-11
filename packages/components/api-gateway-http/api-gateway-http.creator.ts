/**
 * Creator for Modern HTTP API Gateway Component
 * 
 * Implements the ComponentCreator pattern as defined in the Platform Component API Contract.
 * Makes the component discoverable by the platform and provides factory methods.
 */

import { Construct } from 'constructs';
import { 
  ComponentSpec, 
  ComponentContext, 
  IComponentCreator 
} from '../../../src/platform/contracts/component-interfaces';
import { ApiGatewayHttpComponent } from './api-gateway-http.component';
import { ApiGatewayHttpConfig, API_GATEWAY_HTTP_CONFIG_SCHEMA } from './api-gateway-http.builder';

/**
 * Creator class for API Gateway HTTP component
 * 
 * Responsible for:
 * - Component factory creation
 * - Early validation of component specifications
 * - Schema definition and validation
 * - Component type identification
 */
export class ApiGatewayHttpCreator implements IComponentCreator {
  
  /**
   * Component type identifier
   */
  public readonly componentType = 'api-gateway-http';
  
  /**
   * Component display name
   */
  public readonly displayName = 'Modern HTTP API Gateway';
  
  /**
   * Component description
   */
  public readonly description = 'AWS API Gateway v2 HTTP API for modern, high-performance APIs with cost optimization';
  
  /**
   * Component category for organization
   */
  public readonly category = 'api';
  
  /**
   * Component tags for discovery
   */
  public readonly tags = [
    'api-gateway',
    'http-api', 
    'serverless',
    'microservices',
    'websocket',
    'cost-optimized',
    'high-performance'
  ];
  
  /**
   * JSON Schema for component configuration validation
   */
  public readonly configSchema = API_GATEWAY_HTTP_CONFIG_SCHEMA;
  
  /**
   * Factory method to create component instances
   * 
   * @param scope - CDK construct scope
   * @param spec - Component specification from service manifest
   * @param context - Service context (environment, compliance, etc.)
   * @returns New component instance
   */
  public createComponent(
    scope: Construct, 
    spec: ComponentSpec, 
    context: ComponentContext
  ): ApiGatewayHttpComponent {
    return new ApiGatewayHttpComponent(scope, spec, context);
  }
  
  /**
   * Validates component specification beyond JSON Schema validation
   * 
   * Performs advanced validation that cannot be expressed in JSON Schema:
   * - Cross-field validation
   * - Business logic validation
   * - Security policy compliance
   * - Resource naming conflicts
   * 
   * @param spec - Component specification to validate
   * @param context - Service context for validation
   * @returns Validation result with errors if any
   */
  public validateSpec(
    spec: ComponentSpec, 
    context: ComponentContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = spec.config as ApiGatewayHttpConfig;
    
    // Validate component name
    if (!spec.name || spec.name.length === 0) {
      errors.push('Component name is required');
    } else if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(spec.name)) {
      errors.push('Component name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    } else if (spec.name.length > 64) {
      errors.push('Component name must be 64 characters or less');
    }
    
    // Validate API name if provided
    if (config?.apiName && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(config.apiName)) {
      errors.push('API name must start with a letter and contain only alphanumeric characters, hyphens, and underscores');
    }
    
    // Validate custom domain configuration
    if (config?.customDomain) {
      const domain = config.customDomain;
      
      // Domain name validation
      if (!domain.domainName) {
        errors.push('Custom domain requires domainName to be specified');
      } else {
        // Basic domain name format validation
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-\.]*[a-zA-Z0-9]$/;
        if (!domainRegex.test(domain.domainName)) {
          errors.push('Invalid domain name format');
        }
        
        // Check for wildcard domains in production
        if (domain.domainName.includes('*') && context.environment === 'prod') {
          errors.push('Wildcard domains are not allowed in production environment');
        }
      }
      
      // Certificate configuration validation
      if (domain.certificateArn && domain.autoGenerateCertificate) {
        errors.push('Cannot specify both certificateArn and autoGenerateCertificate');
      }
      
      if (!domain.certificateArn && !domain.autoGenerateCertificate) {
        errors.push('Must specify either certificateArn or set autoGenerateCertificate to true');
      }
      
      // Auto-certificate requires Route53 hosted zone
      if (domain.autoGenerateCertificate && !domain.hostedZoneId) {
        errors.push('Auto-generated certificates require hostedZoneId to be specified');
      }
    }
    
    // Validate CORS configuration for compliance
    if (config?.cors && (context.complianceFramework === 'fedramp-moderate' || context.complianceFramework === 'fedramp-high')) {
      const cors = config.cors;
      
      // FedRAMP requires explicit origin configuration
      if (!cors.allowOrigins || cors.allowOrigins.length === 0) {
        errors.push('FedRAMP compliance requires explicit CORS allowOrigins configuration');
      }
      
      // Check for wildcard origins in FedRAMP
      if (cors.allowOrigins?.some(origin => origin === '*' || origin.includes('*'))) {
        errors.push('Wildcard CORS origins are not allowed in FedRAMP environments');
      }
      
      // FedRAMP should have credentials enabled for proper authentication
      if (cors.allowCredentials === false) {
        errors.push('FedRAMP compliance typically requires CORS credentials to be enabled');
      }
    }
    
    // Validate routes configuration
    if (config?.routes) {
      const routeKeys = new Set<string>();
      
      config.routes.forEach((route, index) => {
        const routeKey = `${route.method.toUpperCase()} ${route.path}`;
        
        // Check for duplicate routes
        if (routeKeys.has(routeKey)) {
          errors.push(`Duplicate route detected: ${routeKey}`);
        }
        routeKeys.add(routeKey);
        
        // Validate route path
        if (!route.path.startsWith('/')) {
          errors.push(`Route ${index}: path must start with '/'`);
        }
        
        // Validate integration configuration
        if (!route.integration) {
          errors.push(`Route ${index}: integration configuration is required`);
        } else {
          const integration = route.integration;
          
          // Validate integration target
          if (integration.type !== 'MOCK' && !integration.target) {
            errors.push(`Route ${index}: integration target is required for type ${integration.type}`);
          }
          
          // Validate Lambda integration
          if (integration.type === 'LAMBDA' && integration.target && !integration.target.includes('arn:aws:lambda:')) {
            errors.push(`Route ${index}: Lambda integration target must be a valid Lambda function ARN`);
          }
          
          // Validate timeout
          if (integration.timeoutInMillis && (integration.timeoutInMillis < 50 || integration.timeoutInMillis > 30000)) {
            errors.push(`Route ${index}: integration timeout must be between 50ms and 30000ms`);
          }
        }
      });
    }
    
    // Validate WebSocket configuration
    if (config?.protocolType === 'WEBSOCKET') {
      if (!config.websocket) {
        errors.push('WebSocket protocol requires websocket configuration');
      } else {
        const ws = config.websocket;
        
        // Validate required routes
        if (!ws.connectRoute && !ws.defaultRoute) {
          errors.push('WebSocket APIs require at least a connect route or default route');
        }
        
        // Validate route targets
        [ws.connectRoute, ws.disconnectRoute, ws.defaultRoute].forEach((route, index) => {
          if (route && route.integrationType === 'LAMBDA' && route.target && !route.target.includes('arn:aws:lambda:')) {
            const routeNames = ['connect', 'disconnect', 'default'];
            errors.push(`WebSocket ${routeNames[index]} route: Lambda integration target must be a valid Lambda function ARN`);
          }
        });
      }
    }
    
    // Validate throttling configuration
    if (config?.throttling) {
      const throttling = config.throttling;
      
      if (throttling.rateLimit && throttling.rateLimit < 1) {
        errors.push('Throttling rate limit must be at least 1');
      }
      
      if (throttling.burstLimit && throttling.burstLimit < 1) {
        errors.push('Throttling burst limit must be at least 1');
      }
      
      if (throttling.rateLimit && throttling.burstLimit && throttling.burstLimit < throttling.rateLimit) {
        errors.push('Throttling burst limit must be greater than or equal to rate limit');
      }
    }
    
    // Validate monitoring configuration
    if (config?.monitoring?.alarms) {
      const alarms = config.monitoring.alarms;
      
      if (alarms.errorRate4xx && (alarms.errorRate4xx < 0 || alarms.errorRate4xx > 100)) {
        errors.push('4xx error rate alarm threshold must be between 0 and 100');
      }
      
      if (alarms.errorRate5xx && (alarms.errorRate5xx < 0 || alarms.errorRate5xx > 100)) {
        errors.push('5xx error rate alarm threshold must be between 0 and 100');
      }
      
      if (alarms.highLatency && alarms.highLatency < 100) {
        errors.push('High latency alarm threshold must be at least 100ms');
      }
    }
    
    // Validate VPC configuration
    if (config?.vpc) {
      const vpc = config.vpc;
      
      if (vpc.vpcLinkId && vpc.createVpcLink) {
        errors.push('Cannot specify both vpcLinkId and createVpcLink');
      }
      
      if (!vpc.vpcLinkId && !vpc.createVpcLink) {
        errors.push('VPC configuration requires either vpcLinkId or createVpcLink to be specified');
      }
      
      if (vpc.createVpcLink && vpc.vpcLinkConfig) {
        const linkConfig = vpc.vpcLinkConfig;
        
        if (!linkConfig.name) {
          errors.push('VPC Link creation requires a name');
        }
        
        if (!linkConfig.targets || linkConfig.targets.length === 0) {
          errors.push('VPC Link creation requires at least one target NLB ARN');
        }
        
        // Validate NLB ARN format
        linkConfig.targets?.forEach((target, index) => {
          if (!target.includes('arn:aws:elasticloadbalancing:') || !target.includes('loadbalancer/net/')) {
            errors.push(`VPC Link target ${index}: must be a valid Network Load Balancer ARN`);
          }
        });
      }
    }
    
    // Environment-specific validations
    if (context.environment === 'prod') {
      // Production environment validations
      if (!config?.accessLogging?.enabled) {
        errors.push('Access logging must be enabled in production environment');
      }
      
      if (!config?.monitoring?.detailedMetrics) {
        errors.push('Detailed metrics must be enabled in production environment');
      }
      
      if (config?.throttling?.rateLimit && config.throttling.rateLimit < 100) {
        errors.push('Production environment requires minimum rate limit of 100 requests per second');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Returns the capabilities this component provides when synthesized
   * 
   * These capabilities can be referenced by other components for binding
   * and integration purposes.
   */
  public getProvidedCapabilities(): string[] {
    return [
      'api:http',           // HTTP API endpoint capability
      'api:websocket',      // WebSocket API capability (if configured)
      'api:gateway',        // Generic API Gateway capability
      'auth:jwt',           // JWT authentication capability (if configured)
      'auth:lambda',        // Lambda authorization capability (if configured)
      'monitoring:api',     // API monitoring and metrics capability
      'logging:access'      // Access logging capability
    ];
  }
  
  /**
   * Returns the capabilities this component requires from other components
   * 
   * These are dependencies that must be satisfied for proper operation.
   */
  public getRequiredCapabilities(): string[] {
    return [
      // Optional dependencies - will be resolved if available
      'lambda:function',    // For Lambda integrations
      'vpc:link',           // For VPC Link integrations
      'certificate:ssl',    // For custom domain SSL certificates
      'dns:route53'         // For custom domain DNS configuration
    ];
  }
  
  /**
   * Returns construct handles that will be registered by this component
   * 
   * These handles can be used in patches.ts for advanced customization.
   */
  public getConstructHandles(): string[] {
    return [
      'main',               // Main API Gateway construct (required)
      'api',                // Alias for main API Gateway
      'logGroup',           // CloudWatch log group for access logs
      'stage',              // API Gateway stage
      'customDomain',       // Custom domain (if configured)
      'certificate',        // SSL certificate (if auto-generated)
      'vpcLink',            // VPC Link (if created)
      'authorizers',        // Map of configured authorizers
      'routes',             // Map of configured routes
      'integrations'        // Map of configured integrations
    ];
  }
}
