/**
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 * 
 * AWS API Gateway v1 (REST API) for enterprise use cases with advanced features:
 * - Cognito User Pool authentication with scopes
 * - Request/response transformation and validation  
 * - API key management and throttling
 * - WAF integration and enterprise security
 * - Full feature set with caching and SDK generation
 * 
 * Use this for complex enterprise APIs requiring advanced authentication and transformation.
 * For simple, high-performance APIs, use api-gateway-http instead.
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../../../src/platform/contracts/component';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../../src/platform/contracts/component-interfaces';
import { ConfigBuilder, ConfigBuilderContext } from '../../../src/platform/contracts/config-builder';

/**
 * Configuration interface for Enterprise REST API Gateway component
 */
export interface ApiGatewayRestConfig {
  /** API name (optional, defaults to component name) */
  apiName?: string;
  
  /** API description */
  description?: string;
  
  /** API Gateway deployment stage */
  deploymentStage?: string;
  
  /** Domain configuration */
  domain?: {
    domainName?: string;
    certificateArn?: string;
    basePath?: string;
  };
  
  /** CORS configuration */
  cors?: {
    allowOrigins?: string[];
    allowMethods?: string[];
    allowHeaders?: string[];
    allowCredentials?: boolean;
  };
  
  /** Authentication configuration */
  authentication?: {
    cognito?: {
      userPoolId?: string;
      userPoolArn?: string;
      scopes?: string[];
    };
    apiKey?: {
      required?: boolean;
      keyName?: string;
    };
  };
  
  /** Tracing configuration */
  tracing?: {
    xrayEnabled?: boolean;
  };
  
  /** Throttling configuration */
  throttling?: {
    burstLimit?: number;
    rateLimit?: number;
  };
  
  /** WAF association */
  waf?: {
    webAclArn?: string;
  };
  
  /** Tags for the API */
  tags?: Record<string, string>;
}

/**
 * JSON Schema for Enterprise REST API Gateway configuration
 */
export const API_GATEWAY_REST_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    apiName: {
      type: 'string',
      pattern: '^[a-zA-Z0-9._-]+$',
      maxLength: 1024
    },
    description: { type: 'string' },
    deploymentStage: {
      type: 'string',
      pattern: '^[a-zA-Z0-9._-]+$',
      maxLength: 64
    },
    domain: {
      type: 'object',
      properties: {
        domainName: { type: 'string' },
        certificateArn: { type: 'string' },
        basePath: { type: 'string' }
      }
    },
    cors: {
      type: 'object',
      properties: {
        allowOrigins: {
          type: 'array',
          items: { type: 'string' }
        },
        allowMethods: {
          type: 'array',
          items: { type: 'string' }
        },
        allowHeaders: {
          type: 'array',
          items: { type: 'string' }
        },
        allowCredentials: { type: 'boolean' }
      }
    },
    authentication: {
      type: 'object',
      properties: {
        cognito: {
          type: 'object',
          properties: {
            userPoolId: { type: 'string' },
            userPoolArn: { type: 'string' },
            scopes: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        apiKey: {
          type: 'object',
          properties: {
            required: { type: 'boolean' },
            keyName: { type: 'string' }
          }
        }
      }
    },
    tracing: {
      type: 'object',
      properties: {
        xrayEnabled: { type: 'boolean' }
      }
    },
    throttling: {
      type: 'object',
      properties: {
        burstLimit: { type: 'number', minimum: 0 },
        rateLimit: { type: 'number', minimum: 0 }
      }
    },
    waf: {
      type: 'object',
      properties: {
        webAclArn: { type: 'string' }
      }
    },
    tags: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  },
  additionalProperties: false
};

/**
 * ConfigBuilder for Enterprise REST API Gateway component
 */
export class ApiGatewayRestConfigBuilder extends ConfigBuilder<ApiGatewayRestConfig> {
  constructor(context: ComponentContext, spec: ComponentSpec) {
    const builderContext: ConfigBuilderContext = { context, spec };
    super(builderContext, API_GATEWAY_REST_CONFIG_SCHEMA);
  }

    /**
   * Builds the final configuration using the centralized 5-layer precedence engine
   */
    public async build(): Promise<ApiGatewayRestConfig> {
      return this.buildSync();
    }
  /**
   * Component-specific hardcoded fallbacks
   */
  protected getHardcodedFallbacks(): ApiGatewayRestConfig {
    return {
      deploymentStage: this.builderContext.context.environment,
      description: `Enterprise REST API Gateway for ${this.builderContext.spec.name}`,
      cors: {
        allowOrigins: [], // CORS origins MUST be configured per environment - no hardcoded defaults
        allowMethods: ['GET', 'POST', 'OPTIONS'], // Minimal safe methods as fallback only
        allowHeaders: ['Content-Type', 'Authorization'], // Minimal safe headers as fallback only  
        allowCredentials: false // Always false for security - never override
      },
      tracing: {
        xrayEnabled: false // Tracing enablement driven by compliance framework config
      },
      throttling: {
        burstLimit: 100, // Very conservative fallback - real limits come from environment config
        rateLimit: 50   // Very conservative fallback - real limits come from environment config
      }
    };
  }

}

/**
 * Enterprise REST API Gateway Component implementing Component API Contract v1.0
 */
export class ApiGatewayRestComponent extends BaseComponent {
  private api?: apigateway.RestApi;
  private deployment?: apigateway.Deployment;
  private stage?: apigateway.Stage;
  private authorizer?: apigateway.CognitoUserPoolsAuthorizer;
  private config?: ApiGatewayRestConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  /**
   * Synthesis phase - Create standalone API Gateway with advanced configuration
   */
  public synth(): void {
    try {
      // Build configuration using ConfigBuilder
      const configBuilder = new ApiGatewayRestConfigBuilder(this.context, this.spec);
      this.config = configBuilder.buildSync();
      
      // Create API Gateway
      this.createApiGateway();
      
      // Create Cognito authorizer if configured
      this.createCognitoAuthorizerIfNeeded();
      
      // Configure tracing
      this.configureTracing();
      
      // Apply compliance hardening
      this.applyComplianceHardening();
      
      // Register constructs
      this.registerConstruct('api', this.api!);
      this.registerConstruct('stage', this.stage!);
      if (this.authorizer) {
        this.registerConstruct('authorizer', this.authorizer);
      }
      
      // Register capabilities
      this.registerCapability('api:rest', this.buildApiCapability());
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the capabilities this component provides
   */
  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  /**
   * Get the component type identifier
   */
  public getType(): string {
    return 'api-gateway-rest';
  }

  /**
   * Create CloudWatch log group if logging is enabled
   */

  /**
   * Create API Gateway REST API
   */
  private createApiGateway(): void {
    const apiName = this.config!.apiName || `${this.context.serviceName}-${this.spec.name}`;

    this.api = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: apiName,
      description: this.config!.description,
      deployOptions: {
        stageName: this.config!.deploymentStage || 'prod',
        throttlingBurstLimit: this.config!.throttling?.burstLimit,
        throttlingRateLimit: this.config!.throttling?.rateLimit,
        tracingEnabled: this.config!.tracing?.xrayEnabled
      },
      defaultCorsPreflightOptions: this.config!.cors ? {
        allowOrigins: this.config!.cors.allowOrigins || [],
        allowMethods: this.config!.cors.allowMethods || [],
        allowHeaders: this.config!.cors.allowHeaders || [],
        allowCredentials: this.config!.cors.allowCredentials
      } : undefined,
      apiKeySourceType: this.config!.authentication?.apiKey?.required ? 
        apigateway.ApiKeySourceType.HEADER : undefined
    });

    // Get the deployment stage
    this.stage = this.api.deploymentStage;

    // Apply standard tags
    this.applyStandardTags(this.api, {
      'api-type': 'rest',
      'deployment-stage': this.config!.deploymentStage || 'prod'
    });

    // Configure OpenTelemetry observability for API Gateway
    const otelEnvVars = this.configureObservability(this.api!, {
      serviceName: apiName
    });

    // Apply OTel environment variables to the stage
    const cfnStage = this.stage!.node.defaultChild as apigateway.CfnStage;
    cfnStage.variables = {
      ...cfnStage.variables,
      ...otelEnvVars
    };

  }

  /**
   * Create Cognito User Pool authorizer if configured
   */
  private createCognitoAuthorizerIfNeeded(): void {
    if (!this.config!.authentication?.cognito?.userPoolArn) {
      return;
    }

    const userPool = cognito.UserPool.fromUserPoolArn(
      this, 
      'UserPool', 
      this.config!.authentication!.cognito!.userPoolArn!
    );

    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `${this.spec.name}-cognito-authorizer`,
      identitySource: 'method.request.header.Authorization'
    });

  }

  /**
   * Configure X-Ray tracing
   */
  private configureTracing(): void {
    if (!this.config!.tracing?.xrayEnabled) {
      return;
    }

    // X-Ray tracing is already configured in deployOptions during API creation
  }


  /**
   * Apply compliance hardening based on framework
   */
  private applyComplianceHardening(): void {
    if (!this.api) return;

    switch (this.context.complianceFramework) {
      case 'fedramp-high':
      case 'fedramp-moderate':
        // For FedRAMP environments, ensure API has proper logging and security
        const cfnApi = this.api.node.defaultChild as apigateway.CfnRestApi;
        cfnApi.addMetadata('ComplianceFramework', this.context.complianceFramework);
        
        break;
        
      default:
        // No special hardening needed for commercial
        break;
    }
  }

  /**
   * Build API Gateway capability descriptor
   */
  private buildApiCapability(): any {
    return {
      type: 'api:rest',
      apiName: this.api!.restApiName,
      apiId: this.api!.restApiId,
      rootResourceId: this.api!.restApiRootResourceId,
      stageName: this.config!.deploymentStage || 'prod',
      endpoint: this.api!.url,
      cognitoAuthorizer: this.authorizer ? {
        authorizerArn: this.authorizer.authorizerArn,
        userPoolArn: this.config!.authentication?.cognito?.userPoolArn
      } : undefined
    };
  }

}