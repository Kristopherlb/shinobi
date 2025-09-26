import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import {
  BaseComponent,
  ComponentCapabilities,
  ComponentContext,
  ComponentSpec,
} from '@shinobi/core';

import {
  ApiGatewayRestConfig,
  ApiGatewayRestConfigBuilder,
} from './api-gateway-rest.builder';

interface ApiGatewayRestCapability {
  apiId: string;
  endpointUrl: string;
  stageName: string;
  restApiArn: string;
  authorizerArn?: string;
}

export class ApiGatewayRestComponent extends BaseComponent {
  private api?: apigateway.RestApi;
  private stage?: apigateway.Stage;
  private authorizer?: apigateway.CognitoUserPoolsAuthorizer;
  private accessLogGroup?: logs.LogGroup;
  private usagePlan?: apigateway.UsagePlan;
  private config!: ApiGatewayRestConfig;
  private resolvedStageName!: string;

  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec,
  ) {
    super(scope, id, context, spec);
  }

  public override synth(): void {
    const builder = new ApiGatewayRestConfigBuilder(this.context, this.spec);
    this.config = builder.build();

    this.resolvedStageName = this.resolveStageName();

    this.createRestApi();
    this.configureAuthentication();
    this.configureUsagePlan();
    this.ensureDefaultMethod();
    this.applyObservability();
    this.applyComplianceHardening();
    this.configureWafAssociation();
    this.createMonitoringAlarms();

    if (!this.api || !this.stage) {
      throw new Error('API Gateway REST component failed to create core constructs.');
    }

    this.registerConstruct('main', this.api);
    this.registerConstruct('stage', this.stage);
    if (this.accessLogGroup) {
      this.registerConstruct('accessLogGroup', this.accessLogGroup);
    }
    if (this.authorizer) {
      this.registerConstruct('authorizer', this.authorizer);
    }
    if (this.usagePlan) {
      this.registerConstruct('usagePlan', this.usagePlan);
    }

    this.registerCapability('api:rest', this.getApiCapability());
  }

  public override getCapabilities(): ComponentCapabilities {
    this.validateSynthesized();
    return this.capabilities;
  }

  public override getType(): string {
    return 'api-gateway-rest';
  }

  private createRestApi(): void {
    const deployOptions = this.buildStageOptions(this.resolvedStageName);

    this.api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: this.config.apiName ?? `${this.context.serviceName}-${this.spec.name}`,
      description:
        this.config.description ?? `Enterprise REST API Gateway for ${this.spec.name}`,
      deployOptions,
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: this.configureCors(),
      apiKeySourceType: this.config.authentication?.apiKey?.required
        ? apigateway.ApiKeySourceType.HEADER
        : undefined,
      disableExecuteApiEndpoint: this.config.disableExecuteApiEndpoint,
    });

    this.stage = this.api.deploymentStage;

    this.applyStandardTags(this.api, {
      'api-type': 'rest',
      'deployment-stage': this.resolvedStageName,
    });
    this.applyStandardTags(this.stage);

    if (this.config.domain?.domainName && this.config.domain.certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'ApiGatewayCertificate',
        this.config.domain.certificateArn,
      );

      this.api.addDomainName('CustomDomain', {
        domainName: this.config.domain.domainName,
        certificate,
        basePath: this.config.domain.basePath,
        endpointType: apigateway.EndpointType.REGIONAL,
      });
    }
  }

  private buildStageOptions(stageName: string): apigateway.StageOptions {
    const throttling = this.config.throttling ?? {};
    const tracingEnabled =
      this.config.tracing?.xrayEnabled ?? this.config.monitoring?.tracingEnabled;

    const stageOptions: apigateway.StageOptions = {
      stageName,
      throttlingBurstLimit: throttling.burstLimit,
      throttlingRateLimit: throttling.rateLimit,
      metricsEnabled: this.config.logging?.metricsEnabled ?? true,
      loggingLevel: this.resolveMethodLoggingLevel(),
      dataTraceEnabled: this.config.logging?.dataTraceEnabled ?? false,
      tracingEnabled: tracingEnabled ?? false,
    };

    if (this.shouldEnableAccessLogging()) {
      const logDestination = this.getAccessLogDestination();
      return {
        ...stageOptions,
        accessLogDestination: logDestination,
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      };
    }

    return stageOptions;
  }

  private shouldEnableAccessLogging(): boolean {
    return this.config.logging?.accessLoggingEnabled ?? true;
  }

  private getAccessLogDestination(): apigateway.LogGroupLogDestination {
    if (this.config.logging?.logGroupArn) {
      const imported = logs.LogGroup.fromLogGroupArn(
        this,
        'ImportedAccessLogs',
        this.config.logging.logGroupArn,
      );
      return new apigateway.LogGroupLogDestination(imported);
    }

    if (!this.accessLogGroup) {
      this.accessLogGroup = new logs.LogGroup(this, 'AccessLogs', {
        retention: this.resolveLogRetention(),
        removalPolicy: RemovalPolicy.RETAIN,
      });
      this.applyStandardTags(this.accessLogGroup);
    }

    return new apigateway.LogGroupLogDestination(this.accessLogGroup);
  }

  private resolveLogRetention(): logs.RetentionDays | undefined {
    const retention = this.config.logging?.retentionInDays;
    switch (retention) {
      case 90:
        return logs.RetentionDays.THREE_MONTHS;
      case 365:
        return logs.RetentionDays.ONE_YEAR;
      case 731:
        return logs.RetentionDays.TWO_YEARS;
      case 1095:
      case 1096:
        return logs.RetentionDays.THREE_YEARS;
      case 1827:
        return logs.RetentionDays.FIVE_YEARS;
      case 2555:
      case 2557:
        return logs.RetentionDays.SEVEN_YEARS;
      case 2922:
        return logs.RetentionDays.EIGHT_YEARS;
      case 3653:
        return logs.RetentionDays.TEN_YEARS;
      default:
        return undefined;
    }
  }

  private resolveMethodLoggingLevel(): apigateway.MethodLoggingLevel | undefined {
    const level = this.config.logging?.executionLoggingLevel ?? 'ERROR';
    if (level === 'OFF') {
      return undefined;
    }

    return apigateway.MethodLoggingLevel[level];
  }

  private configureCors(): apigateway.CorsOptions | undefined {
    if (!this.config.cors) {
      return undefined;
    }

    const allowOrigins = this.config.cors.allowOrigins ?? [];
    if (allowOrigins.length === 0) {
      return undefined;
    }

    return {
      allowOrigins,
      allowMethods: this.config.cors.allowMethods,
      allowHeaders: this.config.cors.allowHeaders,
      allowCredentials: this.config.cors.allowCredentials,
      maxAge: this.config.cors.maxAge
        ? Duration.seconds(this.config.cors.maxAge)
        : undefined,
    };
  }

  private configureAuthentication(): void {
    const cognitoConfig = this.config.authentication?.cognito;
    if (!cognitoConfig?.userPoolArn) {
      return;
    }

    const userPool = cognito.UserPool.fromUserPoolArn(
      this,
      'UserPool',
      cognitoConfig.userPoolArn,
    );

    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `${this.spec.name}-cognito-authorizer`,
      identitySource: 'method.request.header.Authorization',
    });
  }

  private configureUsagePlan(): void {
    const apiKeyConfig = this.config.authentication?.apiKey;
    const derivedUsagePlan = this.config.usagePlan;

    if (!apiKeyConfig?.required && !derivedUsagePlan) {
      return;
    }

    let apiKey: apigateway.ApiKey | undefined;
    if (apiKeyConfig?.required) {
      apiKey = new apigateway.ApiKey(this, 'ApiKey', {
        apiKeyName: apiKeyConfig.keyName ?? `${this.spec.name}-api-key`,
        enabled: true,
      });
      this.applyStandardTags(apiKey);
    }

    const quotaSettings = derivedUsagePlan?.quota?.limit !== undefined && derivedUsagePlan?.quota?.period
      ? {
          limit: derivedUsagePlan.quota.limit,
          period: this.mapQuotaPeriod(derivedUsagePlan.quota.period),
        }
      : undefined;

    this.usagePlan = this.api!.addUsagePlan('UsagePlan', {
      name: derivedUsagePlan?.name ?? apiKeyConfig?.usagePlanName ?? `${this.spec.name}-usage`,
      description: derivedUsagePlan?.description,
      throttle: derivedUsagePlan?.throttle,
      quota: quotaSettings,
    });

    this.usagePlan.addApiStage({ stage: this.stage! });

    if (apiKey) {
      this.usagePlan.addApiKey(apiKey);
    }
  }

  private ensureDefaultMethod(): void {
    if (!this.api) {
      return;
    }

    const mockIntegration = new apigateway.MockIntegration({
      integrationResponses: [{ statusCode: '200' }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    });

    this.api.root.addMethod('GET', mockIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }

  private applyObservability(): void {
    if (!this.api || !this.stage) {
      return;
    }

    const otelEnv = this.configureObservability(this.api, {
      serviceName: this.api.restApiName,
    });

    const cfnStage = this.stage.node.defaultChild as apigateway.CfnStage;
    cfnStage.variables = {
      ...cfnStage.variables,
      ...otelEnv,
    };
  }

  private applyComplianceHardening(): void {
    if (!this.stage) {
      return;
    }

    const cfnStage = this.stage.node.defaultChild as apigateway.CfnStage;

    if (this.context.complianceFramework?.startsWith('fedramp')) {
      cfnStage.addMetadata('ComplianceFramework', this.context.complianceFramework);
      cfnStage.methodSettings = [
        {
          dataTraceEnabled: false,
          metricsEnabled: true,
          throttlingBurstLimit: this.config.throttling?.burstLimit,
          throttlingRateLimit: this.config.throttling?.rateLimit,
          loggingLevel: this.config.logging?.executionLoggingLevel ?? 'ERROR',
          resourcePath: '/*',
          httpMethod: '*',
        },
      ];
    }
  }

  private configureWafAssociation(): void {
    const webAclArn = this.config.waf?.webAclArn;
    if (!webAclArn) {
      return;
    }

    if (!this.stage) {
      return;
    }

    const cfnStage = this.stage.node.defaultChild as apigateway.CfnStage;
    cfnStage.addPropertyOverride('WebAclArn', webAclArn);
  }

  private createMonitoringAlarms(): void {
    const thresholds = this.config.monitoring?.thresholds;
    if (!thresholds || !this.api) {
      return;
    }

    if (thresholds.errorRate4xxPercent !== undefined) {
      const metric4xx = this.api.metricClientError({ period: Duration.minutes(5) });
      new cw.Alarm(this, 'FourXXAlarm', {
        metric: metric4xx,
        threshold: thresholds.errorRate4xxPercent,
        evaluationPeriods: 1,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: '4XX error rate exceeded threshold',
      });
    }

    if (thresholds.errorRate5xxPercent !== undefined) {
      const metric5xx = this.api.metricServerError({ period: Duration.minutes(5) });
      new cw.Alarm(this, 'FiveXXAlarm', {
        metric: metric5xx,
        threshold: thresholds.errorRate5xxPercent,
        evaluationPeriods: 1,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: '5XX error rate exceeded threshold',
      });
    }

    if (thresholds.highLatencyMs !== undefined) {
      const latencyMetric = this.api.metricLatency({ period: Duration.minutes(5) });
      new cw.Alarm(this, 'LatencyAlarm', {
        metric: latencyMetric,
        threshold: thresholds.highLatencyMs,
        evaluationPeriods: 1,
        comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: 'Latency exceeded threshold',
      });
    }

    if (thresholds.lowThroughput !== undefined) {
      const countMetric = this.api.metricCount({ period: Duration.minutes(5) });
      new cw.Alarm(this, 'ThroughputAlarm', {
        metric: countMetric,
        threshold: thresholds.lowThroughput,
        evaluationPeriods: 1,
        comparisonOperator: cw.ComparisonOperator.LESS_THAN_THRESHOLD,
        alarmDescription: 'API throughput dropped below threshold',
      });
    }
  }

  private getApiCapability(): ApiGatewayRestCapability {
    if (!this.api) {
      throw new Error('API capability requested before API construct was created.');
    }

    return {
      apiId: this.api.restApiId,
      endpointUrl: this.api.url,
      stageName: this.resolvedStageName,
      restApiArn: this.api.arnForExecuteApi(),
      authorizerArn: this.authorizer?.authorizerArn,
    };
  }

  private resolveStageName(): string {
    return this.config.deploymentStage ?? this.context.environment ?? 'prod';
  }

  private mapQuotaPeriod(period: 'DAY' | 'WEEK' | 'MONTH'): apigateway.Period {
    switch (period) {
      case 'DAY':
        return apigateway.Period.DAY;
      case 'WEEK':
        return apigateway.Period.WEEK;
      case 'MONTH':
      default:
        return apigateway.Period.MONTH;
    }
  }
}
