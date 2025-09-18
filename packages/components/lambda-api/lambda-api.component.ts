/**
 * Lambda API Component
 * 
 * AWS Lambda function with API Gateway integration for synchronous API workloads.
 * Implements platform standards with configuration-driven compliance.
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as xray from 'aws-cdk-lib/aws-xray';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseComponent } from '../@shinobi/core';
import { ComponentSpec, ComponentContext, ComponentCapabilities } from '../@shinobi/core/component-interfaces';
import { LambdaApiConfig, LambdaApiComponentConfigBuilder, LAMBDA_API_CONFIG_SCHEMA } from './lambda-api.builder';


/**
 * Lambda API Component implementing Component API Contract v1.0
 */
export class LambdaApiComponent extends BaseComponent {
  private lambdaFunction?: lambda.Function;
  private api?: apigateway.RestApi;
  private kmsKey?: kms.Key;
  private readonly config: LambdaApiConfig;

  constructor(scope: Construct, id: string, context: ComponentContext, spec: ComponentSpec) {
    super(scope, id, context, spec);
    
    // Build configuration only - no synthesis in constructor
    const configBuilder = new LambdaApiComponentConfigBuilder({ context, spec });
    this.config = configBuilder.buildSync();
  }

  /**
   * Synthesis phase - Create Lambda function and API Gateway
   */
  public synth(): void {
    this.logComponentEvent('synthesis_start', 'Starting Lambda API component synthesis', {
      runtime: this.config.runtime,
      handler: this.config.handler
    });
    
    const startTime = Date.now();
    
    try {
      this.createKmsKeyIfNeeded();
      this.createLambdaFunction();
      this.createApiGateway();
      this.applyComplianceHardening();
      this.configureObservabilityForLambda();
    
      this.registerConstruct('lambdaFunction', this.lambdaFunction!);
      this.registerConstruct('api', this.api!);
      if (this.kmsKey) {
        this.registerConstruct('kmsKey', this.kmsKey);
      }
    
      this.registerCapability('lambda:function', this.buildLambdaCapability());
      this.registerCapability('api:rest', this.buildApiCapability());
    
      const duration = Date.now() - startTime;
      this.logPerformanceMetric('component_synthesis', duration, {
        resourcesCreated: Object.keys(this.capabilities).length
      });
    
      this.logComponentEvent('synthesis_complete', 'Lambda API component synthesis completed successfully', {
        functionsCreated: 1,
        apiCreated: 1,
        kmsKeyCreated: !!this.kmsKey
      });
      
    } catch (error) {
      this.logError(error as Error, 'component synthesis', {
        componentType: 'lambda-api',
        stage: 'synthesis'
      });
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
    return 'lambda-api';
  }

  /**
   * Create KMS key for encryption if required by compliance framework
   */
  private createKmsKeyIfNeeded(): void {
    if (this.shouldUseCustomerManagedKey()) {
      this.kmsKey = new kms.Key(this, 'EncryptionKey', {
        description: `Encryption key for ${this.spec.name} Lambda function`,
        enableKeyRotation: this.context.complianceFramework === 'fedramp-high',
        keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
        keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
      });
      
      // Apply standard tags to KMS key
      this.applyStandardTags(this.kmsKey, {
        'key-usage': 'lambda-environment-encryption',
        'key-rotation-enabled': (this.context.complianceFramework === 'fedramp-high').toString()
      });
    }
  }

  /**
   * Create the Lambda function with compliance-specific configuration
   */
  private createLambdaFunction(): void {
    const props: lambda.FunctionProps = {
      functionName: `${this.context.serviceName}-${this.spec.name}`,
      handler: this.config!.handler,
      runtime: this.getLambdaRuntime(),
      code: lambda.Code.fromAsset(this.config!.codePath || './src'),
      memorySize: this.config!.memory || 512,
      timeout: cdk.Duration.seconds(this.config!.timeout || 30),
      environment: this.config!.environmentVariables || {},
      description: `Lambda API function for ${this.spec.name}`,
      tracing: this.shouldEnableLambdaXRayTracing() ? lambda.Tracing.ACTIVE : lambda.Tracing.DISABLED
    };

    // Apply encryption for environment variables
    if (this.kmsKey) {
      Object.assign(props, { environmentEncryption: this.kmsKey });
    }

    // Apply VPC configuration for FedRAMP deployments
    if (this.shouldDeployInVpc()) {
      // In real implementation, this would lookup VPC and subnets
      // For now, we'll indicate VPC deployment is required
      Object.assign(props, { description: props.description + ' (VPC deployment required)' });
    }

    this.lambdaFunction = new lambda.Function(this, 'LambdaFunction', props);
    
    // Apply standard tags
    this.applyStandardTags(this.lambdaFunction, {
      'function-runtime': this.config!.runtime || 'nodejs20.x',
      'function-handler': this.config!.handler
    });
    
    // Configure automatic OpenTelemetry observability
    this.configureOpenTelemetryForLambda();
    
    // Log Lambda function creation
    this.logResourceCreation('lambda-function', this.lambdaFunction.functionName, {
      runtime: this.config!.runtime,
      memory: this.config!.memory,
      timeout: this.config!.timeout,
      hasKmsKey: !!this.kmsKey
    });
  }

  /**
   * Create API Gateway REST API
   */
  private createApiGateway(): void {
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: this.config!.api?.name || `${this.context.serviceName}-${this.spec.name}-api`,
      description: `API Gateway for ${this.spec.name} Lambda function`,
      defaultCorsPreflightOptions: this.config!.api?.cors ? {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      } : undefined,
      apiKeySourceType: this.config!.api?.apiKeyRequired ? 
        apigateway.ApiKeySourceType.HEADER : undefined
    });

    // Create default integration
    const integration = new apigateway.LambdaIntegration(this.lambdaFunction!);
    
    // Add proxy resource for all paths
    const proxyResource = this.api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', integration);
    
    // Also handle root path
    this.api.root.addMethod('ANY', integration);
    
    // Apply standard tags to API Gateway
    this.applyStandardTags(this.api, {
      'api-type': 'rest',
      'api-cors-enabled': (!!this.config!.api?.cors).toString()
    });
    
    // Log API Gateway creation
    this.logResourceCreation('api-gateway', this.api.restApiId, {
      type: 'rest',
      corsEnabled: !!this.config!.api?.cors,
      endpointUrl: this.api.url
    });
  }

  /**
   * Apply compliance-specific hardening
   */
  private applyComplianceHardening(): void {
    switch (this.context.complianceFramework) {
      case 'fedramp-moderate':
        this.applyFedrampModerateHardening();
        break;
      case 'fedramp-high':
        this.applyFedrampHighHardening();
        break;
      default:
        this.applyCommercialHardening();
        break;
    }
  }

  private applyCommercialHardening(): void {
    // Basic CloudWatch logging
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // Apply standard tags to log group
    this.applyStandardTags(logGroup, {
      'log-type': 'lambda-function',
      'retention-period': 'one-month'
    });
  }

  private applyFedrampModerateHardening(): void {
    // Enhanced logging with longer retention
    const enhancedLogGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    
    // Apply standard tags to enhanced log group
    this.applyStandardTags(enhancedLogGroup, {
      'log-type': 'lambda-function',
      'retention-period': 'three-months',
      'compliance-logging': 'fedramp-moderate'
    });

    // Enable X-Ray tracing
    if (this.lambdaFunction) {
      // Note: _X_AMZN_TRACE_ID is reserved by Lambda runtime and cannot be set manually
      // X-Ray tracing is enabled via the tracing property on the Lambda function
    }

    // Security tooling integration
    if (this.config?.security?.tools?.falco) {
      this.attachFalcoLayer();
    }
  }

  private applyFedrampHighHardening(): void {
    // Apply all moderate hardening
    this.applyFedrampModerateHardening();

    // Extended log retention for audit purposes
    const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
      logGroupName: `/aws/lambda/${this.lambdaFunction!.functionName}/audit`,
      retention: logs.RetentionDays.ONE_YEAR,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
    
    // Apply standard tags to audit log group
    this.applyStandardTags(auditLogGroup, {
      'log-type': 'audit',
      'retention-period': 'one-year',
      'compliance-logging': 'fedramp-high'
    });

    // Add STIG compliance configuration
    if (this.lambdaFunction) {
      this.lambdaFunction.addEnvironment('STIG_COMPLIANCE', 'true');
      this.lambdaFunction.addEnvironment('SECURITY_LEVEL', 'high');
    }

    // Restrict to VPC endpoints only (no public internet access)
    // This would be implemented with VPC endpoint policies in real deployment
  }

  /**
   * Attach Falco security monitoring layer
   */
  private attachFalcoLayer(): void {
    if (this.lambdaFunction) {
      // In real implementation, this would reference a pre-approved Falco layer ARN
      const falcoLayerArn = `arn:aws:lambda:${this.context.region}:123456789012:layer:falco-security:1`;
      
      // Add comment to indicate Falco layer attachment
      this.lambdaFunction.addEnvironment('FALCO_ENABLED', 'true');
      // Note: Actual layer attachment would require the real layer ARN
    }
  }

  /**
   * Build Lambda function capability data shape
   */
  private buildLambdaCapability(): any {
    return {
      functionArn: this.lambdaFunction!.functionArn,
      functionName: this.lambdaFunction!.functionName,
      roleArn: this.lambdaFunction!.role!.roleArn
    };
  }

  /**
   * Build API REST capability data shape
   */
  private buildApiCapability(): any {
    return {
      endpointUrl: this.api!.url,
      apiId: this.api!.restApiId
    };
  }

  /**
   * Helper methods for compliance decisions
   */
  private shouldUseCustomerManagedKey(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldEnableLambdaXRayTracing(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private shouldDeployInVpc(): boolean {
    return ['fedramp-moderate', 'fedramp-high'].includes(this.context.complianceFramework);
  }

  private getLambdaRuntime(): lambda.Runtime {
    const runtimeMap: Record<string, lambda.Runtime> = {
      'nodejs18.x': lambda.Runtime.NODEJS_18_X,
      'nodejs20.x': lambda.Runtime.NODEJS_20_X,
      'python3.9': lambda.Runtime.PYTHON_3_9,
      'python3.10': lambda.Runtime.PYTHON_3_10,
      'python3.11': lambda.Runtime.PYTHON_3_11
    };
    
    return runtimeMap[this.config!.runtime || 'nodejs20.x'] || lambda.Runtime.NODEJS_20_X;
  }


  /**
   * Configure OpenTelemetry observability for Lambda function according to Platform Observability Standard
   */
  private configureOpenTelemetryForLambda(): void {
    if (!this.lambdaFunction) return;

    // Get standardized OpenTelemetry environment variables
    const otelEnvVars = this.configureObservability(this.lambdaFunction, {
      customAttributes: {
        'lambda.runtime': this.config!.runtime || 'nodejs20.x',
        'lambda.handler': this.config!.handler,
        'api.type': 'rest',
        'api.cors.enabled': (!!this.config!.api?.cors).toString()
      }
    });

    // Apply all OpenTelemetry environment variables to Lambda
    Object.entries(otelEnvVars).forEach(([key, value]) => {
      this.lambdaFunction!.addEnvironment(key, value);
    });

    // Add runtime-specific OpenTelemetry layer for automatic instrumentation
    this.addOtelInstrumentationLayer();
  }

  /**
   * Add OpenTelemetry instrumentation layer based on Lambda runtime
   */
  private addOtelInstrumentationLayer(): void {
    if (!this.lambdaFunction) return;

    const runtime = this.config!.runtime || 'nodejs20.x';
    let layerArn: string;

    // Use AWS-managed OpenTelemetry layers for automatic instrumentation
    switch (runtime) {
      case 'nodejs18.x':
      case 'nodejs20.x':
        layerArn = `arn:aws:lambda:${this.context.region}:901920570463:layer:aws-otel-nodejs-${this.getArchString()}:7`;
        break;
      case 'python3.9':
      case 'python3.10':
      case 'python3.11':
        layerArn = `arn:aws:lambda:${this.context.region}:901920570463:layer:aws-otel-python-${this.getArchString()}:2`;
        break;
      case 'java11':
      case 'java17':
        layerArn = `arn:aws:lambda:${this.context.region}:901920570463:layer:aws-otel-java-wrapper-${this.getArchString()}:2`;
        break;
      default:
        // For unsupported runtimes, skip layer but keep environment variables
        return;
    }

    // Add the OpenTelemetry layer for automatic instrumentation
    this.lambdaFunction.addLayers(lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', layerArn));
  }

  /**
   * Get architecture string for Lambda layer ARN
   */
  private getArchString(): string {
    // Default to amd64 for x86_64 architecture since config doesn't specify architecture
    return 'amd64';
  }

  /**
   * Configure CloudWatch observability for Lambda API
   */
  private configureObservabilityForLambda(): void {
    // Enable monitoring for compliance frameworks only
    if (this.context.complianceFramework === 'commercial') {
      return;
    }

    const functionName = this.lambdaFunction!.functionName;

    // 1. Lambda Error Rate Alarm
    new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-lambda-errors`,
      alarmDescription: 'Lambda function errors alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: {
          FunctionName: functionName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 2. Lambda Duration Alarm
    new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-lambda-duration`,
      alarmDescription: 'Lambda function duration alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        dimensionsMap: {
          FunctionName: functionName
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: (this.config!.timeout || 30) * 1000 * 0.8, // 80% of timeout in milliseconds
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    // 3. Lambda Throttles Alarm
    new cloudwatch.Alarm(this, 'LambdaThrottlesAlarm', {
      alarmName: `${this.context.serviceName}-${this.spec.name}-lambda-throttles`,
      alarmDescription: 'Lambda function throttles alarm',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Throttles',
        dimensionsMap: {
          FunctionName: functionName
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });

    this.logComponentEvent('observability_configured', 'OpenTelemetry observability standard applied to Lambda API', {
      alarmsCreated: 3,
      functionName: functionName,
      monitoringEnabled: true
    });
  }
}