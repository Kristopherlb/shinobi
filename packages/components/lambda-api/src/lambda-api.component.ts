// packages/components/lambda-api/src/lambda-api.component.ts
import { Construct } from "constructs";
import {
  Duration,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  aws_logs as logs,
  aws_kms as kms,
  Tags,
  Stack,
} from "aws-cdk-lib";
import { ComponentSpec, ComponentCapabilities, ComponentContext } from "@platform/contracts";
import { BaseComponent } from "@shinobi/core";
import * as path from "path";
import * as fs from "fs";
import { LambdaApiConfigBuilder } from "./lambda-api.builder";

export interface LambdaApiSpec {
  /** e.g. "src/api.handler" */
  handler: string;
  runtime?: lambda.Runtime;       // default NODEJS_20_X
  memorySize?: number;            // default 512
  timeout?: number;               // default 30
  logRetentionDays?: number;      // default 14 (>=30 in fedramp)
  environmentVariables?: Record<string, string>;
  /** Path to Lambda function code directory or file */
  codePath?: string;              // default "./src"
  /** Asset hash for code changes detection */
  codeAssetHash?: string;         // optional for cache busting
  /** Use inline code as fallback when codePath is not available */
  useInlineFallback?: boolean;    // default true
  /** API Gateway type: 'rest' or 'http' */
  apiType?: 'rest' | 'http';      // default 'rest'
}

type HttpApiCapability = { url: string; functionArn: string };

export class LambdaApiComponent extends BaseComponent {
  private resolvedConfig?: LambdaApiSpec;

  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ) {
    super(scope, id, context, spec);
  }

  private get typedSpec(): LambdaApiSpec {
    if (!this.resolvedConfig) {
      const builder = new LambdaApiConfigBuilder();
      this.resolvedConfig = builder.build(
        {
          complianceFramework: this.context.complianceFramework,
          environment: this.context.environment,
          observability: this.context.observability,
        },
        (this.spec.config ?? {}) as Partial<LambdaApiSpec>
      );
    }

    return this.resolvedConfig;
  }

  /**
   * Loads Lambda function code from the specified path or falls back to inline code
   */
  private loadLambdaCode(): lambda.Code {
    const spec = this.typedSpec;
    const codePath = spec.codePath ?? "./src";
    const useInlineFallback = spec.useInlineFallback ?? true;

    try {
      // Check if codePath exists and is accessible
      const fullPath = path.resolve(codePath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          // Directory path - use fromAsset
          return lambda.Code.fromAsset(fullPath, {
            assetHash: spec.codeAssetHash
          });
        } else if (stats.isFile()) {
          // File path - use fromAsset with the directory containing the file
          return lambda.Code.fromAsset(path.dirname(fullPath), {
            assetHash: spec.codeAssetHash
          });
        }
      }

      // If we reach here, the path doesn't exist or is invalid
      if (useInlineFallback) {
        console.warn(`Lambda code path '${codePath}' not found, falling back to inline code`);
        return this.getInlineFallbackCode();
      } else {
        throw new Error(`Lambda code path '${codePath}' not found and inline fallback is disabled`);
      }
    } catch (error) {
      if (useInlineFallback) {
        console.warn(`Error loading Lambda code from '${codePath}': ${error}, falling back to inline code`);
        return this.getInlineFallbackCode();
      } else {
        throw new Error(`Failed to load Lambda code from '${codePath}': ${error}`);
      }
    }
  }

  /**
   * Attaches observability layer (ADOT) to the Lambda function if configured
   */
  private attachObservabilityLayer(fn: lambda.Function, region: string): void {
    const observability = this.context.observability;

    if (!observability) {
      console.warn('No observability configuration provided - ADOT layer will not be attached');
      return;
    }

    // Check if observability is enabled
    const isObservabilityEnabled =
      observability.enableTracing !== false &&
      observability.enableMetrics !== false &&
      observability.enableLogs !== false;

    if (!isObservabilityEnabled) {
      console.log('Observability disabled - ADOT layer will not be attached');
      return;
    }

    // Get ADOT layer ARN from context
    const adotLayerArn = this.getAdotLayerArn(region);

    if (!adotLayerArn) {
      console.warn(`No ADOT layer ARN found for region ${region} - observability layer will not be attached`);
      return;
    }

    try {
      fn.addLayers(
        lambda.LayerVersion.fromLayerVersionArn(this, "AdotLayer", adotLayerArn)
      );
      console.log(`ADOT layer attached successfully: ${adotLayerArn}`);
    } catch (error) {
      console.error(`Failed to attach ADOT layer: ${error}`);
      // Don't throw - observability is optional
    }
  }

  /**
   * Gets the appropriate ADOT layer ARN for the given region
   */
  private getAdotLayerArn(region: string): string | undefined {
    const observability = this.context.observability;

    if (!observability) {
      return undefined;
    }

    // Try region-specific ARN first, then fallback to global ARN
    return observability.adotLayerArnMap?.[region] ?? observability.adotLayerArn;
  }

  /**
   * Provides a more realistic inline fallback code that can handle basic API requests
   */
  private getInlineFallbackCode(): lambda.Code {
    return lambda.Code.fromInline(`
      const { APIGatewayProxyEvent, APIGatewayProxyResult } = require('aws-lambda');

      exports.handler = async (event) => {
        console.log('Received event:', JSON.stringify(event, null, 2));
        
        try {
          // Basic CORS headers
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          };

          // Handle preflight OPTIONS requests
          if (event.httpMethod === 'OPTIONS') {
            return {
              statusCode: 200,
              headers,
              body: ''
            };
          }

          // Basic routing based on HTTP method and path
          const method = event.httpMethod;
          const path = event.path || '/';
          
          let response;
          
          switch (method) {
            case 'GET':
              if (path === '/health' || path === '/') {
                response = {
                  status: 'healthy',
                  timestamp: new Date().toISOString(),
                  service: process.env.OTEL_SERVICE_NAME || 'lambda-api',
                  environment: process.env.OTEL_RESOURCE_ATTRIBUTES || 'unknown'
                };
              } else {
                response = {
                  message: 'Hello from Lambda API!',
                  method: 'GET',
                  path: path,
                  queryParams: event.queryStringParameters || {}
                };
              }
              break;
              
            case 'POST':
            case 'PUT':
              response = {
                message: 'Request received',
                method: method,
                path: path,
                body: event.body ? JSON.parse(event.body) : null,
                timestamp: new Date().toISOString()
              };
              break;
              
            default:
              response = {
                message: 'Method not supported',
                method: method,
                path: path,
                supportedMethods: ['GET', 'POST', 'PUT', 'OPTIONS']
              };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
          };
          
        } catch (error) {
          console.error('Error processing request:', error);
          
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              error: 'Internal server error',
              message: error.message,
              timestamp: new Date().toISOString()
            })
          };
        }
      };
    `);
  }

  synth(): void {
    const spec = this.typedSpec;
    const isFedramp = (this.context.complianceFramework ?? "").startsWith("fedramp");
    const stack = Stack.of(this);
    const region = stack.region;

    // Logs
    const retention = this.resolveLogRetention(
      this.effectiveRetentionDays(spec.logRetentionDays, isFedramp)
    );
    const accessLogs = new logs.LogGroup(this, "ApiAccessLogs", { retention });

    // Lambda
    const fn = new lambda.Function(this, "Function", {
      functionName: `${this.context.serviceName}-${this.node.id}`,
      runtime: spec.runtime ?? lambda.Runtime.NODEJS_20_X,
      handler: spec.handler,
      code: this.loadLambdaCode(),
      memorySize: spec.memorySize ?? 512,
      timeout: Duration.seconds(spec.timeout ?? 30),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        // OTel standard envs
        OTEL_EXPORTER_OTLP_ENDPOINT: this.context.observability?.collectorEndpoint ?? "",
        OTEL_SERVICE_NAME: this.context.serviceName,
        OTEL_RESOURCE_ATTRIBUTES: [
          this.context.environment ? `env=${this.context.environment}` : undefined,
          this.context.owner ? `owner=${this.context.owner}` : undefined,
          this.context.complianceFramework ? `compliance=${this.context.complianceFramework}` : undefined,
        ]
          .filter(Boolean)
          .join(","),
        // CDK property name: environment maps to our spec.environmentVariables
        ...(spec.environmentVariables ?? {}),
      },
      logRetention: retention,
    });

    // Attach ADOT Lambda Layer if observability is configured
    this.attachObservabilityLayer(fn, region);

    // API Gateway (REST proxy to Lambda)
    const api = new apigw.RestApi(this, "RestApi", {
      deployOptions: {
        stageName: "prod",
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigw.AccessLogFormat.jsonWithStandardFields({
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
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    api.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(fn, { proxy: true }),
      anyMethod: true,
    });

    // Platform tagging (simplified for standalone package)
    Tags.of(fn).add("Service", this.context.serviceName);
    Tags.of(fn).add("Environment", this.context.environment);
    if ((this.context as any).owner) {
      Tags.of(fn).add("Owner", (this.context as any).owner);
    }
    if (this.context.complianceFramework) {
      Tags.of(fn).add("ComplianceFramework", this.context.complianceFramework);
    }

    Tags.of(api).add("Service", this.context.serviceName);
    Tags.of(api).add("Environment", this.context.environment);
    if ((this.context as any).owner) {
      Tags.of(api).add("Owner", (this.context as any).owner);
    }
    if (this.context.complianceFramework) {
      Tags.of(api).add("ComplianceFramework", this.context.complianceFramework);
    }

    // Register constructs
    this.constructs.set('lambdaFunction', fn);
    this.constructs.set('api', api);
    this.constructs.set('logGroup', accessLogs);

    // Register capabilities
    const capability: HttpApiCapability = { url: api.url, functionArn: fn.functionArn };
    this.capabilities['lambda:function'] = {
      functionArn: fn.functionArn,
      functionName: fn.functionName,
      roleArn: fn.role?.roleArn
    };
    this.capabilities['api:rest'] = {
      url: api.url,
      apiId: api.restApiId,
      rootResourceId: api.root.resourceId
    };
  }

  // ---- helpers ----

  private effectiveRetentionDays(input: number | undefined, isFedramp: boolean): number {
    const d = input ?? 14;
    if (isFedramp) return Math.max(d, 30);
    return d;
  }

  private resolveLogRetention(days: number): logs.RetentionDays {
    switch (days) {
      case 1: return logs.RetentionDays.ONE_DAY;
      case 3: return logs.RetentionDays.THREE_DAYS;
      case 5: return logs.RetentionDays.FIVE_DAYS;
      case 7: return logs.RetentionDays.ONE_WEEK;
      case 14: return logs.RetentionDays.TWO_WEEKS;
      case 30: return logs.RetentionDays.ONE_MONTH;
      case 60: return logs.RetentionDays.TWO_MONTHS;
      case 90: return logs.RetentionDays.THREE_MONTHS;
      case 180: return logs.RetentionDays.SIX_MONTHS;
      case 365: return logs.RetentionDays.ONE_YEAR;
      default:
        // round up to closest common bucket
        return days >= 30 ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.TWO_WEEKS;
    }
  }
  // ---- BaseComponent abstract impls ----
  public getType(): string {
    return "lambda-api";
  }

  public getCapabilities(): ComponentCapabilities {
    return this.capabilities;
  }

}
