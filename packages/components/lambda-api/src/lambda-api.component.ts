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
import { BaseComponent, ComponentSpec, ComponentCapabilities, ComponentContext } from "@platform/contracts";

export interface LambdaApiSpec {
  /** e.g. "src/api.handler" */
  handler: string;
  runtime?: lambda.Runtime;       // default NODEJS_20_X
  memorySize?: number;            // default 512
  timeout?: number;               // default 30
  logRetentionDays?: number;      // default 14 (>=30 in fedramp)
  environmentVariables?: Record<string, string>;
}

type HttpApiCapability = { url: string; functionArn: string };

export class LambdaApiComponent extends BaseComponent {
  constructor(
    scope: Construct,
    id: string,
    context: ComponentContext,
    spec: ComponentSpec
  ) {
    super(scope, id, context, spec);
  }
  private get typedSpec(): LambdaApiSpec {
    return this.spec.config as LambdaApiSpec;
  }

  synth(): void {
    const spec = this.typedSpec;
    const isFedramp = (this.context.complianceFramework ?? "").startsWith("fedramp");
    const stack = Stack.of(this as any);
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
      code: lambda.Code.fromAsset("dist/app"),
      memorySize: spec.memorySize ?? 512,
      timeout: Duration.seconds(spec.timeout ?? 30),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        // OTel standard envs
        OTEL_EXPORTER_OTLP_ENDPOINT: (this.context as any).otelCollectorEndpoint ?? "",
        OTEL_SERVICE_NAME: this.context.serviceName,
        OTEL_RESOURCE_ATTRIBUTES: [
          this.context.environment ? `env=${this.context.environment}` : undefined,
          (this.context as any).owner ? `owner=${(this.context as any).owner}` : undefined,
        ]
          .filter(Boolean)
          .join(","),
        // CDK property name: environment maps to our spec.environmentVariables
        ...(spec.environmentVariables ?? {}),
      },
      logRetention: retention,
    });

    // Optionally attach ADOT Lambda Layer if provided via context
    const adotLayerArn =
      (this.context as any)?.adotLayerArnMap?.[region] ??
      (this.context as any)?.adotLayerArn;
    if (adotLayerArn) {
      fn.addLayers(
        lambda.LayerVersion.fromLayerVersionArn(this, "AdotLayer", adotLayerArn)
      );
    }

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
  // inside class LambdaApiComponent extends BaseComponent { ... }

  // ---- BaseComponent abstract impls ----
  public getType(): string {
    return "lambda-api";
  }

  public getCapabilities(): ComponentCapabilities {
    return this.capabilities;
  }

}
