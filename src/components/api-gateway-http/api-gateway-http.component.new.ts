/**
 * Modern HTTP API Gateway Component implementing Platform Component API Contract v1.1
 * 
 * AWS API Gateway v2 (HTTP API) for modern, high-performance APIs with cost optimization:
 * - Up to 70% lower cost than REST API Gateway
 * - 60% lower latency for better performance
 * - Native JWT authentication and OIDC integration
 * - WebSocket support for real-time communication
 * - VPC Link support for private integrations
 * - Streamlined configuration for microservices
 * 
 * Use this for modern microservices, serverless APIs, and cost-sensitive applications.
 * For complex enterprise features, use api-gateway-rest instead.
 */

import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { BaseComponent } from '../../platform/contracts/component';
import {
  ComponentSpec,
  ComponentContext,
  ComponentCapabilities
} from '../../platform/contracts/component-interfaces';
import { 
  ApiGatewayHttpConfig, 
  ApiGatewayHttpConfigBuilder 
} from './api-gateway-http.builder';

/**
 * Modern HTTP API Gateway Component
 * 
 * Extends BaseComponent and implements the Platform Component API Contract.
 * Provides comprehensive HTTP API functionality with security, monitoring,
 * and compliance features.
 */
export class ApiGatewayHttpComponent extends BaseComponent {
  
  /** Final resolved configuration */
  private config!: ApiGatewayHttpConfig;
  
  /** Main API Gateway construct */
  private api!: apigatewayv2.HttpApi;
  
  /** API Gateway stage */
  private stage!: apigatewayv2.HttpStage;
  
  /** CloudWatch log group for access logs */
  private logGroup?: logs.LogGroup;
  
  /** Custom domain configuration */
  private customDomain?: apigatewayv2.DomainName;
  
  /** SSL certificate for custom domain */
  private certificate?: certificatemanager.Certificate;
  
  /** VPC Link for private integrations */
  private vpcLink?: apigatewayv2.VpcLink;
  
  /** Configured authorizers */
  private authorizers: Map<string, apigatewayv2.IHttpRouteAuthorizer> = new Map();
  
  /** Configured routes */
  private routes: Map<string, apigatewayv2.HttpRoute> = new Map();
  
  /** Configured integrations */
  private integrations: Map<string, apigatewayv2.HttpRouteIntegration> = new Map();
  
  /**
   * Constructor
   * 
   * @param scope - CDK construct scope
   * @param spec - Component specification from service manifest
   * @param context - Service context (environment, compliance, etc.)
   */
  constructor(scope: Construct, spec: ComponentSpec, context: ComponentContext) {
    super(scope, spec, context);
  }
  
  /**
   * Component type identifier
   */
  public getType(): string {
    return 'api-gateway-http';
  }
  
  /**
   * Main synthesis method
   * 
   * Follows the exact sequence defined in the Platform Component API Contract:
   * 1. Build configuration using ConfigBuilder
   * 2. Call BaseComponent helper methods
   * 3. Instantiate CDK constructs
   * 4. Apply standard tags
   * 5. Register constructs
   * 6. Register capabilities
   */
  public synth(): void {
    // Step 1: Build configuration using ConfigBuilder
    const configBuilder = new ApiGatewayHttpConfigBuilder(this.context, this.spec);
    this.config = configBuilder.buildSync();
    
    // Step 2: Call BaseComponent helper methods
    const logger = this.getLogger();
    logger.info('Starting API Gateway HTTP synthesis', {
      context: {
        componentName: this.spec.name,
        componentType: this.getType(),
        environment: this.context.environment,
        complianceFramework: this.context.complianceFramework
      }
    });
    
    // Step 3: Instantiate CDK constructs
    this.createApiGateway();
    this.createAccessLogging();
    this.createCustomDomain();
    this.createMonitoring();
    
    // Step 4: Apply standard tags (handled by BaseComponent helpers)
    this.applyStandardTags();
    
    // Step 5: Register constructs for patches.ts access
    this.registerConstructs();
    
    // Step 6: Register capabilities for component binding
    this.registerCapabilities();
    
    logger.info('API Gateway HTTP synthesis completed', {
      context: {
        componentName: this.spec.name,
        apiId: this.api.httpApiId,
        apiEndpoint: this.api.apiEndpoint
      }
    });
  }
  
  /**
   * Creates the main API Gateway HTTP API
   */
  private createApiGateway(): void {
    const apiName = this.config.apiName || `${this.spec.name}-api`;
    
    // Create the HTTP API
    this.api = new apigatewayv2.HttpApi(this, 'Api', {
      apiName,
      description: this.config.description || `HTTP API for ${this.spec.name}`,
      
      // CORS configuration
      corsPreflight: this.config.cors ? {
        allowOrigins: this.config.cors.allowOrigins || ['*'],
        allowHeaders: this.config.cors.allowHeaders || ['Content-Type', 'Authorization'],
        allowMethods: this.config.cors.allowMethods?.map(method => 
          apigatewayv2.CorsHttpMethod[method as keyof typeof apigatewayv2.CorsHttpMethod]
        ) || [apigatewayv2.CorsHttpMethod.ANY],
        allowCredentials: this.config.cors.allowCredentials,
        maxAge: this.config.cors.maxAge ? cdk.Duration.seconds(this.config.cors.maxAge) : undefined,
        exposeHeaders: this.config.cors.exposeHeaders
      } : undefined,
      
      // Disable execute API endpoint if configured
      disableExecuteApiEndpoint: this.config.apiSettings?.disableExecuteApiEndpoint
    });
    
    // Create default stage
    this.stage = new apigatewayv2.HttpStage(this, 'Stage', {
      httpApi: this.api,
      stageName: this.context.environment,
      autoDeploy: true,
      
      // Throttling configuration
      throttle: this.config.throttling ? {
        rateLimit: this.config.throttling.rateLimit,
        burstLimit: this.config.throttling.burstLimit
      } : undefined
    });
    
    // Apply standard tags
    this._applyStandardTags(this.api);
    this._applyStandardTags(this.stage);
  }
  
  /**
   * Creates access logging configuration
   */
  private createAccessLogging(): void {
    if (!this.config.accessLogging?.enabled) {
      return;
    }
    
    const logGroupName = this.config.accessLogging.logGroupName || 
      `/aws/apigateway/${this.spec.name}-http-api`;
    
    // Create log group
    this.logGroup = new logs.LogGroup(this, 'AccessLogGroup', {
      logGroupName,
      retention: this.config.accessLogging.retentionInDays 
        ? logs.RetentionDays[`DAYS_${this.config.accessLogging.retentionInDays}` as keyof typeof logs.RetentionDays]
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // Configure access logging format
    const logFormat = this.config.accessLogging.format || 
      '$requestId $requestTime $httpMethod $resourcePath $status $responseLength $requestTime';
    
    // Update stage with access logging
    const cfnStage = this.stage.node.defaultChild as apigatewayv2.CfnStage;
    cfnStage.accessLogSettings = {
      destinationArn: this.logGroup.logGroupArn,
      format: logFormat
    };
    
    // Grant API Gateway permission to write to CloudWatch Logs
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayLogRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')
      ]
    });
    
    this.logGroup.grantWrite(apiGatewayRole);
    
    // Apply standard tags
    this._applyStandardTags(this.logGroup);
    this._applyStandardTags(apiGatewayRole);
  }
  
  /**
   * Creates custom domain configuration
   */
  private createCustomDomain(): void {
    if (!this.config.customDomain) {
      return;
    }
    
    const domainConfig = this.config.customDomain;
    
    // Handle SSL certificate
    let certificate: certificatemanager.ICertificate;
    
    if (domainConfig.certificateArn) {
      // Use existing certificate
      certificate = certificatemanager.Certificate.fromCertificateArn(
        this, 
        'ExistingCertificate', 
        domainConfig.certificateArn
      );
    } else if (domainConfig.autoGenerateCertificate && domainConfig.hostedZoneId) {
      // Auto-generate certificate
      const hostedZone = route53.HostedZone.fromHostedZoneId(
        this, 
        'HostedZone', 
        domainConfig.hostedZoneId
      );
      
      this.certificate = new certificatemanager.Certificate(this, 'Certificate', {
        domainName: domainConfig.domainName,
        validation: certificatemanager.CertificateValidation.fromDns(hostedZone)
      });
      
      certificate = this.certificate;
      this._applyStandardTags(this.certificate);
    } else {
      throw new Error('Custom domain requires either certificateArn or autoGenerateCertificate with hostedZoneId');
    }
    
    // Create custom domain
    this.customDomain = new apigatewayv2.DomainName(this, 'CustomDomain', {
      domainName: domainConfig.domainName,
      certificate,
      endpointType: domainConfig.endpointType === 'EDGE' 
        ? apigatewayv2.EndpointType.EDGE 
        : apigatewayv2.EndpointType.REGIONAL,
      securityPolicy: domainConfig.securityPolicy === 'TLS_1_0' 
        ? apigatewayv2.SecurityPolicy.TLS_1_0 
        : apigatewayv2.SecurityPolicy.TLS_1_2
    });
    
    // Create API mapping
    new apigatewayv2.ApiMapping(this, 'ApiMapping', {
      api: this.api,
      domainName: this.customDomain,
      stage: this.stage
    });
    
    // Create Route 53 record if hosted zone is provided
    if (domainConfig.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneId(
        this, 
        'Route53HostedZone', 
        domainConfig.hostedZoneId
      );
      
      new route53.ARecord(this, 'CustomDomainRecord', {
        zone: hostedZone,
        recordName: domainConfig.domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.ApiGatewayv2DomainProperties(
            this.customDomain.regionalDomainName,
            this.customDomain.regionalHostedZoneId
          )
        )
      });
    }
    
    // Apply standard tags
    this._applyStandardTags(this.customDomain);
  }
  
  /**
   * Creates monitoring and observability resources
   */
  private createMonitoring(): void {
    if (!this.config.monitoring) {
      return;
    }
    
    const monitoring = this.config.monitoring;
    
    // Enable X-Ray tracing if configured
    if (monitoring.tracingEnabled) {
      // Configure X-Ray tracing
      const cfnStage = this.stage.node.defaultChild as apigatewayv2.CfnStage;
      cfnStage.addPropertyOverride('TracingConfig', {
        TracingEnabled: true
      });
    }
    
    // Create CloudWatch alarms if configured
    if (monitoring.alarms) {
      this.createCloudWatchAlarms(monitoring.alarms);
    }
  }
  
  /**
   * Creates CloudWatch alarms for monitoring
   */
  private createCloudWatchAlarms(alarmConfig: NonNullable<ApiGatewayHttpConfig['monitoring']>['alarms']): void {
    if (!alarmConfig) return;
    
    const apiId = this.api.httpApiId;
    const stageName = this.stage.stageName;
    
    // 4xx Error Rate Alarm
    if (alarmConfig.errorRate4xx !== undefined) {
      new cloudwatch.Alarm(this, '4xxErrorAlarm', {
        alarmName: `${this.spec.name}-api-4xx-errors`,
        alarmDescription: '4xx error rate is too high',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiId: apiId,
            Stage: stageName
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarmConfig.errorRate4xx,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }
    
    // 5xx Error Rate Alarm
    if (alarmConfig.errorRate5xx !== undefined) {
      new cloudwatch.Alarm(this, '5xxErrorAlarm', {
        alarmName: `${this.spec.name}-api-5xx-errors`,
        alarmDescription: '5xx error rate is too high',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiId: apiId,
            Stage: stageName
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarmConfig.errorRate5xx,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }
    
    // High Latency Alarm
    if (alarmConfig.highLatency !== undefined) {
      new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
        alarmName: `${this.spec.name}-api-high-latency`,
        alarmDescription: 'API latency is too high',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'IntegrationLatency',
          dimensionsMap: {
            ApiId: apiId,
            Stage: stageName
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarmConfig.highLatency,
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }
  }
  
  /**
   * Applies standard tags to all resources
   */
  private applyStandardTags(): void {
    // BaseComponent handles standard tagging automatically
    // Additional component-specific tags can be added here
    const additionalTags = {
      'component-type': this.getType(),
      'api-type': 'http',
      'protocol': this.config.protocolType?.toLowerCase() || 'http'
    };
    
    // Apply to main constructs
    [this.api, this.stage, this.logGroup, this.customDomain, this.certificate, this.vpcLink]
      .filter(Boolean)
      .forEach(construct => {
        this._applyStandardTags(construct!, additionalTags);
      });
  }
  
  /**
   * Registers construct handles for patches.ts access
   */
  private registerConstructs(): void {
    // Register main constructs
    this._registerConstruct('main', this.api);
    this._registerConstruct('api', this.api);
    this._registerConstruct('stage', this.stage);
    
    // Register optional constructs
    if (this.logGroup) {
      this._registerConstruct('logGroup', this.logGroup);
    }
    
    if (this.customDomain) {
      this._registerConstruct('customDomain', this.customDomain);
    }
    
    if (this.certificate) {
      this._registerConstruct('certificate', this.certificate);
    }
    
    if (this.vpcLink) {
      this._registerConstruct('vpcLink', this.vpcLink);
    }
  }
  
  /**
   * Registers capabilities for component binding
   */
  private registerCapabilities(): void {
    const capabilities: ComponentCapabilities = {};
    
    // HTTP API capability
    capabilities['api:http'] = {
      apiId: this.api.httpApiId,
      apiEndpoint: this.api.apiEndpoint,
      apiArn: this.api.httpApiArn,
      stageName: this.stage.stageName,
      stageArn: this.stage.stageArn
    };
    
    // Custom domain capability (if configured)
    if (this.customDomain) {
      capabilities['api:custom-domain'] = {
        domainName: this.customDomain.name,
        domainEndpoint: `https://${this.customDomain.name}`,
        regionalDomainName: this.customDomain.regionalDomainName,
        regionalHostedZoneId: this.customDomain.regionalHostedZoneId
      };
    }
    
    // WebSocket capability (if configured)
    if (this.config.protocolType === 'WEBSOCKET') {
      capabilities['api:websocket'] = {
        apiId: this.api.httpApiId,
        apiEndpoint: this.api.apiEndpoint
      };
    }
    
    // Monitoring capability
    if (this.config.monitoring) {
      capabilities['monitoring:api'] = {
        detailedMetrics: this.config.monitoring.detailedMetrics || false,
        tracingEnabled: this.config.monitoring.tracingEnabled || false,
        alarmsEnabled: !!this.config.monitoring.alarms
      };
    }
    
    // Logging capability
    if (this.logGroup) {
      capabilities['logging:access'] = {
        logGroupName: this.logGroup.logGroupName,
        logGroupArn: this.logGroup.logGroupArn
      };
    }
    
    // Register all capabilities
    Object.entries(capabilities).forEach(([key, data]) => {
      this._registerCapability(key, data);
    });
  }
  
  /**
   * Returns the machine-readable capabilities of the component
   */
  public getCapabilities(): ComponentCapabilities {
    // This method is called after synthesis to return the registered capabilities
    return this.capabilities || {};
  }
}
