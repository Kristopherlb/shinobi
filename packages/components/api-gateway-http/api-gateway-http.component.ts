/**
 * Modern HTTP API Gateway Component implementing Component API Contract v1.0
 *
 * Provision an AWS API Gateway v2 (HTTP API) instance with platform defaults
 * for logging, observability, and compliance-aware hardening.
 */

import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { LogGroupLogDestination } from 'aws-cdk-lib/aws-apigatewayv2';
import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec
} from '@shinobi/core';
import { ApiGatewayHttpConfig, ApiGatewayHttpConfigBuilder } from './api-gateway-http.builder.js';

type RouteConfig = NonNullable<ApiGatewayHttpConfig['routes']>[number];
type CustomDomainConfig = NonNullable<ApiGatewayHttpConfig['customDomain']>;

export class ApiGatewayHttpComponent extends BaseComponent {
  private httpApi?: apigatewayv2.HttpApi;
  private stage?: apigatewayv2.HttpStage;
  private domainName?: apigatewayv2.DomainName;
  private accessLogGroup?: logs.LogGroup;
  private config!: ApiGatewayHttpConfig;
  private readonly logger = this.getLogger('component.api-gateway-http');
  private hostedZone?: route53.IHostedZone;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
  }

  public synth(): void {
    this.logger.info('Starting synthesis for API Gateway HTTP component', {
      component: this.spec.name,
      service: this.context.serviceName,
      compliance: this.context.complianceFramework
    });

    const configBuilder = new ApiGatewayHttpConfigBuilder({
      context: this.context,
      spec: this.spec
    });
    this.config = configBuilder.buildSync();

    this.createAccessLogGroup();
    this.createHttpApi();
    this.configureRoutes();
    this.createStage();
    this.configureCustomDomain();
    this.configureDnsRecords();
    this.associateWaf();
    this.createAlarms();
    this.configureApiKeyUsage();
    this.configureObservabilityTelemetry();

    this.registerConstructs();
    this.registerCapabilities();

    this.logger.info('Completed synthesis for API Gateway HTTP component', {
      component: this.spec.name,
      apiId: this.httpApi?.httpApiId,
      stage: this.stage?.stageName ?? '$default'
    });
  }

  public getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public getType(): string {
    return 'api-gateway-http';
  }

  private createAccessLogGroup(): void {
    const retention = this.getAccessLogRetentionSetting();
    const retainOnDelete = this.config.accessLogging?.retainOnDelete ?? false;
    this.accessLogGroup = new logs.LogGroup(this, 'AccessLogs', {
      logGroupName: this.config.accessLogging?.logGroupName ?? `/platform/http-api/${this.context.serviceName}/${this.spec.name}`,
      retention,
      removalPolicy: retainOnDelete ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });
    this.applyStandardTags(this.accessLogGroup);
  }

  private createHttpApi(): void {
    const cors = this.config?.cors?.allowOrigins?.length! > 0
      ? {
        allowCredentials: this.config.cors!.allowCredentials,
        allowHeaders: this.config.cors!.allowHeaders,
        allowMethods: this.mapCorsMethods(this.config.cors!.allowMethods ?? ['GET', 'POST', 'OPTIONS']),
        allowOrigins: this.config.cors!.allowOrigins,
        exposeHeaders: this.config.cors!.exposeHeaders,
        maxAge: this.config.cors!.maxAge ? cdk.Duration.seconds(this.config.cors!.maxAge) : undefined
      }
      : undefined;

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: this.config.apiName ?? `${this.context.serviceName}-${this.spec.name}`,
      description: this.config.description ?? `HTTP API for ${this.spec.name}`,
      corsPreflight: cors,
      createDefaultStage: false,
      disableExecuteApiEndpoint: this.config.apiSettings?.disableExecuteApiEndpoint
    });

    this.applyStandardTags(this.httpApi, this.config.tags);
  }

  private configureRoutes(): void {
    if (!this.config.routes?.length) {
      return;
    }

    const routes = this.config.routes ?? [];
    routes.forEach((route, index) => {
      const integration = this.createIntegration(route, index);
      const authorizer = this.createAuthorizer(route.authorization);

      new apigatewayv2.HttpRoute(this, `Route${index}`, {
        httpApi: this.httpApi!,
        routeKey: apigatewayv2.HttpRouteKey.with(route.routeKey),
        integration,
        authorizer
      });
    });
  }

  private createStage(): void {
    const stageName = this.config.defaultStage?.stageName ?? '$default';
    const autoDeploy = this.config.defaultStage?.autoDeploy ?? true;

    this.stage = new apigatewayv2.HttpStage(this, 'Stage', {
      httpApi: this.httpApi!,
      stageName,
      autoDeploy,
      throttle: this.config.defaultStage?.throttling ?? this.config.throttling,
      detailedMetricsEnabled: this.config.monitoring?.detailedMetrics !== false,
      accessLogSettings: this.config.accessLogging?.enabled !== false && this.accessLogGroup
        ? {
          destination: new LogGroupLogDestination(this.accessLogGroup),
          format: AccessLogFormat.jsonWithStandardFields({
            caller: true,
            httpMethod: true,
            ip: true,
            protocol: true,
            requestTime: true,
            resourcePath: true,
            responseLength: true,
            status: true,
            user: true
          })
        }
        : undefined
    });

    this.applyStandardTags(this.stage);
  }

  private configureCustomDomain(): void {
    const customDomain = this.config.customDomain;
    if (!customDomain?.domainName) {
      return;
    }

    if (customDomain.certificateArn && customDomain.autoGenerateCertificate) {
      throw new Error('customDomain cannot specify both certificateArn and autoGenerateCertificate.');
    }

    let certificate: certificatemanager.ICertificate;
    if (customDomain.certificateArn) {
      certificate = certificatemanager.Certificate.fromCertificateArn(this, 'ImportedCertificate', customDomain.certificateArn);
    } else if (customDomain.autoGenerateCertificate) {
      const hostedZone = this.getHostedZone();
      if (!hostedZone) {
        throw new Error('autoGenerateCertificate requires hostedZoneId (and optional hostedZoneName) to be provided.');
      }

      certificate = new certificatemanager.DnsValidatedCertificate(this, 'GeneratedCertificate', {
        domainName: customDomain.domainName,
        hostedZone,
        region: cdk.Stack.of(this).region
      });
    } else {
      throw new Error('customDomain requires either certificateArn or autoGenerateCertificate.');
    }

    this.domainName = new apigatewayv2.DomainName(this, 'CustomDomain', {
      domainName: customDomain.domainName,
      certificate,
      securityPolicy: this.mapSecurityPolicy(customDomain.securityPolicy),
      endpointType: this.mapEndpointType(customDomain.endpointType)
    });

    new apigatewayv2.ApiMapping(this, 'ApiMapping', {
      api: this.httpApi!,
      domainName: this.domainName,
      stage: this.stage!,
      apiMappingKey: customDomain.basePath
    });

    this.applyStandardTags(this.domainName);
  }

  private configureDnsRecords(): void {
    if (!this.domainName) {
      return;
    }

    const customDomain = this.config.customDomain;
    if (!customDomain) {
      return;
    }

    const hostedZone = this.getHostedZone();
    if (!hostedZone) {
      return;
    }

    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: customDomain.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          this.domainName.regionalDomainName,
          this.domainName.regionalHostedZoneId
        )
      )
    });
  }

  private deriveZoneName(domainName: string): string {
    const parts = domainName.split('.');
    return parts.length > 2 ? parts.slice(parts.length - 2).join('.') : domainName;
  }

  private getHostedZone(): route53.IHostedZone | undefined {
    const customDomain = this.config.customDomain;
    if (!customDomain?.hostedZoneId) {
      return undefined;
    }

    if (!this.hostedZone) {
      const zoneName = customDomain.hostedZoneName ?? this.deriveZoneName(customDomain.domainName);
      this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: customDomain.hostedZoneId,
        zoneName
      });
    }

    return this.hostedZone;
  }

  private mapSecurityPolicy(policy?: CustomDomainConfig['securityPolicy']): apigatewayv2.SecurityPolicy {
    if (!policy || policy === 'TLS_1_2') {
      return apigatewayv2.SecurityPolicy.TLS_1_2;
    }
    throw new Error(`Unsupported security policy ${policy}. Only TLS_1_2 is supported.`);
  }

  private mapEndpointType(endpointType?: CustomDomainConfig['endpointType']): apigatewayv2.EndpointType | undefined {
    if (!endpointType) {
      return undefined;
    }
    return endpointType === 'EDGE' ? apigatewayv2.EndpointType.EDGE : apigatewayv2.EndpointType.REGIONAL;
  }

  private associateWaf(): void {
    const security = this.config.security;
    if (!security?.enableWaf) {
      return;
    }

    if (!security.webAclArn) {
      this.logComponentEvent('waf_configuration_missing', 'WAF enabled but no webAclArn provided; skipping association', {
        component: this.spec.name,
        service: this.context.serviceName
      });
      return;
    }

    if (!this.stage) {
      this.logComponentEvent('waf_association_skipped', 'WAF configuration present but stage not ready; skipping association', {
        component: this.spec.name,
        service: this.context.serviceName
      });
      return;
    }

    const stack = cdk.Stack.of(this);
    const stageName = this.stage.stageName;
    const resourceArn = `arn:${stack.partition}:apigateway:${stack.region}::/apis/${this.httpApi!.httpApiId}/stages/${stageName}`;

    new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn,
      webAclArn: security.webAclArn
    });
  }

  private createAlarms(): void {
    const alarms = this.config.monitoring?.alarms;
    if (!alarms) {
      return;
    }

    const metricsDimensions = { ApiId: this.httpApi!.httpApiId, Stage: this.stage?.stageName ?? '$default' };

    if (alarms.errorRate4xx !== undefined) {
      new cloudwatch.Alarm(this, 'FourXxErrorAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-4xx-error-rate`,
        alarmDescription: 'High 4XX error rate detected on HTTP API',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: metricsDimensions,
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarms.errorRate4xx,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    if (alarms.errorRate5xx !== undefined) {
      new cloudwatch.Alarm(this, 'FiveXxErrorAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-5xx-error-rate`,
        alarmDescription: 'High 5XX error rate detected on HTTP API',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: metricsDimensions,
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarms.errorRate5xx,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    if (alarms.highLatency !== undefined) {
      new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-latency`,
        alarmDescription: 'High latency detected on HTTP API integration',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: metricsDimensions,
          statistic: 'Average',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarms.highLatency,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    }

    if (alarms.lowThroughput !== undefined) {
      new cloudwatch.Alarm(this, 'LowThroughputAlarm', {
        alarmName: `${this.context.serviceName}-${this.spec.name}-low-throughput`,
        alarmDescription: 'Low request throughput detected on HTTP API',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: metricsDimensions,
          statistic: 'Sum',
          period: cdk.Duration.minutes(5)
        }),
        threshold: alarms.lowThroughput,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.BREACHING
      });
    }
  }

  private registerConstructs(): void {
    this.registerConstruct('main', this.httpApi!);
    this.registerConstruct('httpApi', this.httpApi!);
    if (this.stage) {
      this.registerConstruct('stage', this.stage);
    }
    if (this.accessLogGroup) {
      this.registerConstruct('logGroup', this.accessLogGroup);
    }
    if (this.domainName) {
      this.registerConstruct('customDomain', this.domainName);
    }
  }

  private registerCapabilities(): void {
    const stageName = this.stage?.stageName ?? '$default';
    const stack = cdk.Stack.of(this);
    const apiArn = `arn:${stack.partition}:apigateway:${stack.region}::/apis/${this.httpApi!.httpApiId}`;
    this.registerCapability('api:http', {
      type: 'api:http',
      resources: {
        arn: apiArn,
        apiId: this.httpApi!.httpApiId,
        stage: stageName
      },
      endpoints: {
        invokeUrl: this.stage?.url ?? this.httpApi!.url ?? '',
        executeApiArn: this.httpApi!.arnForExecuteApi('*', '/*', stageName)
      },
      cors: {
        enabled: !!this.config.cors?.allowOrigins?.length,
        origins: this.config.cors?.allowOrigins ?? []
      },
      customDomain: this.domainName
        ? {
          domainName: this.domainName.name,
          hostedZoneId: this.domainName.regionalHostedZoneId,
          regionalDomainName: this.domainName.regionalDomainName
        }
        : undefined,
      security: {
        apiKeyEnabled: this.config.security?.enableApiKey ?? false,
        wafEnabled: this.config.security?.enableWaf ?? false
      }
    });
  }

  private createIntegration(routeConfig: RouteConfig, index: number): apigatewayv2.HttpRouteIntegration {
    const integrationConfig = routeConfig.integration;
    switch (integrationConfig.type) {
      case 'HTTP_PROXY':
        if (!integrationConfig.uri) {
          throw new Error(`Route ${index}: HTTP proxy integrations require a target URI`);
        }
        return new integrations.HttpUrlIntegration(`HttpProxyIntegration${index}`, integrationConfig.uri, {
          method: integrationConfig.httpMethod ? this.mapHttpMethod(integrationConfig.httpMethod) : undefined
        });
      case 'AWS_PROXY':
        if (!integrationConfig.lambdaFunctionArn) {
          throw new Error(`Route ${index}: AWS proxy integrations require a Lambda function ARN`);
        }
        const lambdaFunction = lambda.Function.fromFunctionArn(
          this,
          `LambdaIntegration${index}`,
          integrationConfig.lambdaFunctionArn
        );
        return new integrations.HttpLambdaIntegration(`LambdaIntegration${index}`, lambdaFunction);
      case 'MOCK':
        throw new Error(`Route ${index}: integration type MOCK is not supported. Use HTTP_PROXY or AWS_PROXY instead.`);
      default:
        throw new Error(`Unsupported integration type ${integrationConfig.type}`);
    }
  }

  private createAuthorizer(authConfig?: RouteConfig['authorization']) {
    if (!authConfig || authConfig.authorizationType === 'NONE') {
      return undefined;
    }

    if (authConfig.authorizationType === 'AWS_IAM') {
      return new authorizers.HttpIamAuthorizer();
    }

    if (authConfig.authorizationType === 'JWT') {
      if (!authConfig.jwtConfiguration?.issuer) {
        throw new Error('JWT authorizer requires an issuer');
      }
      if (!authConfig.jwtConfiguration.audience || authConfig.jwtConfiguration.audience.length === 0) {
        throw new Error('JWT authorizer requires at least one audience');
      }
      return new authorizers.HttpJwtAuthorizer('JwtAuthorizer', authConfig.jwtConfiguration.issuer, {
        jwtAudience: authConfig.jwtConfiguration.audience
      });
    }

    throw new Error(`Unsupported authorization type ${authConfig.authorizationType}`);
  }

  private mapCorsMethods(methods: string[]): apigatewayv2.CorsHttpMethod[] {
    const methodMap: Record<string, apigatewayv2.CorsHttpMethod> = {
      DELETE: apigatewayv2.CorsHttpMethod.DELETE,
      GET: apigatewayv2.CorsHttpMethod.GET,
      HEAD: apigatewayv2.CorsHttpMethod.HEAD,
      OPTIONS: apigatewayv2.CorsHttpMethod.OPTIONS,
      PATCH: apigatewayv2.CorsHttpMethod.PATCH,
      POST: apigatewayv2.CorsHttpMethod.POST,
      PUT: apigatewayv2.CorsHttpMethod.PUT,
      '*': apigatewayv2.CorsHttpMethod.ANY
    };

    return methods
      .map(method => methodMap[method.toUpperCase()] ?? apigatewayv2.CorsHttpMethod.ANY)
      .filter(Boolean);
  }

  private mapHttpMethod(method: string): apigatewayv2.HttpMethod {
    const map: Record<string, apigatewayv2.HttpMethod> = {
      DELETE: apigatewayv2.HttpMethod.DELETE,
      GET: apigatewayv2.HttpMethod.GET,
      HEAD: apigatewayv2.HttpMethod.HEAD,
      OPTIONS: apigatewayv2.HttpMethod.OPTIONS,
      PATCH: apigatewayv2.HttpMethod.PATCH,
      POST: apigatewayv2.HttpMethod.POST,
      PUT: apigatewayv2.HttpMethod.PUT
    };
    const resolved = map[method.toUpperCase()];
    if (!resolved) {
      throw new Error(`Unsupported HTTP method ${method}`);
    }
    return resolved;
  }

  private getAccessLogRetentionSetting(): logs.RetentionDays {
    const override = this.config.accessLogging?.retentionInDays;
    const enumValues = logs.RetentionDays as unknown as Record<string, number | undefined>;
    const allowed = Object.keys(enumValues)
      .filter(key => /^\d+$/.test(key))
      .map(Number)
      .sort((a, b) => a - b);

    if (override !== undefined) {
      if (!allowed.includes(override)) {
        throw new Error(`Unsupported access log retention ${override}. Allowed values: ${allowed.join(', ')}.`);
      }
      return override as logs.RetentionDays;
    }

    return logs.RetentionDays.THREE_MONTHS;
  }

  private configureApiKeyUsage(): void {
    if (!this.config.security?.enableApiKey) {
      return;
    }

    this.logComponentEvent('api_key_enforcement_pending', 'API key enforcement requested but usage plan provisioning is not yet implemented', {
      component: this.spec.name,
      service: this.context.serviceName
    });
  }

  private configureObservabilityTelemetry(): void {
    const observabilityConfig = this.config.observability;
    if (!observabilityConfig) {
      return;
    }

    this.logComponentEvent('observability_configured', 'Configured observability settings for API Gateway HTTP', {
      tracingEnabled: observabilityConfig.tracingEnabled ?? false,
      metricsEnabled: observabilityConfig.metricsEnabled ?? false,
      logsEnabled: observabilityConfig.logsEnabled ?? false,
      otlpEndpoint: observabilityConfig.otlpEndpoint ?? 'platform-default',
      serviceName: observabilityConfig.serviceName ?? `${this.context.serviceName}-${this.spec.name}`
    });
  }
}
