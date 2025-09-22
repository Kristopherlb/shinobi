// packages/components/lambda-api/src/lambda-api.component.ts
import { Construct } from "constructs";
import {
  Duration,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  aws_logs as logs,
  Tags,
  Stack,
} from "aws-cdk-lib";
import {
  BaseComponent,
  ComponentContext,
} from "@shinobi/core";
import { CapabilityData } from "@shinobi/core/platform/contracts/bindings";

export interface LambdaApiSpec {
  /** e.g. "src/api.handler" */
  handler: string;
  runtime?: lambda.Runtime;       // default NODEJS_20_X
  memorySize?: number;            // default 512
  timeoutSec?: number;            // default 10
  logRetentionDays?: number;      // default 14 (>=30 in fedramp)
  environment?: Record<string, string>;
}

type HttpApiCapability = { url: string; functionArn: string };

export class LambdaApiComponent extends BaseComponent {
  constructor(
    scope: Construct,
    id: string,
    ctx: ComponentContext,
    spec: LambdaApiSpec
  ) {
    super(spec, ctx);
    (this as any).scope = scope;
    (this as any).id = id;
  }
  private get typedSpec(): LambdaApiSpec {
    return (this as any).spec as LambdaApiSpec;
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
    const accessLogs = new logs.LogGroup((this as any).scope, "ApiAccessLogs", { retention });

    // Lambda
    const fn = new lambda.Function((this as any).scope, "Function", {
      functionName: `${this.context.serviceName}-${(this as any).id}`,
      runtime: spec.runtime ?? lambda.Runtime.NODEJS_20_X,
      handler: spec.handler,
      code: lambda.Code.fromAsset("dist/app"),
      memorySize: spec.memorySize ?? 512,
      timeout: Duration.seconds(spec.timeoutSec ?? 10),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        // OTel standard envs
        OTEL_EXPORTER_OTLP_ENDPOINT: this.context.otelCollectorEndpoint ?? "",
        OTEL_SERVICE_NAME: this.context.serviceName,
        OTEL_RESOURCE_ATTRIBUTES: [
          this.context.environment ? `env=${this.context.environment}` : undefined,
          this.context.owner ? `owner=${this.context.owner}` : undefined,
        ]
          .filter(Boolean)
          .join(","),
        ...(spec.environment ?? {}),
      },
      logRetention: retention,
    });

    // Optionally attach ADOT Lambda Layer if provided via context
    const adotLayerArn =
      (this.context as any)?.adotLayerArnMap?.[region] ??
      (this.context as any)?.adotLayerArn;
    if (adotLayerArn) {
      fn.addLayers(
        lambda.LayerVersion.fromLayerVersionArn((this as any).scope, "AdotLayer", adotLayerArn)
      );
    }

    // API Gateway (REST proxy to Lambda)
    const api = new apigw.RestApi((this as any).scope, "RestApi", {
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

    // Platform tagging
    this.taggingService.applyComplianceTags(fn, this.context.complianceFramework, {
      serviceName: this.context.serviceName,
      environment: this.context.environment,
      owner: this.context.owner,
      componentType: "lambda-api"
    });
    this.taggingService.applyComplianceTags(api, this.context.complianceFramework, {
      serviceName: this.context.serviceName,
      environment: this.context.environment,
      owner: this.context.owner,
      componentType: "lambda-api"
    });

    // Registry bookkeeping
    (this as any).registerConstructs("lambda", fn);
    (this as any).registerConstructs("api", api);

    const capability: HttpApiCapability = { url: api.url, functionArn: fn.functionArn };
    (this as any).registerCapabilities("http:api", capability);
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
  public getName(): string {
    // prefer platform context then CDK id
    return (this.context as any)?.componentName ?? (this as any).id;
  }

  public getId(): string {
    // CDK construct id is a stable identifier within the scope
    return (this as any).id;
  }

  public getType(): string {
    return "lambda-api";
  }

  public getCapabilityData(): CapabilityData {
    // Return the registered capability data
    const caps = (this as any)._capabilities ?? new Map<string, unknown>();
    return Object.fromEntries(caps.entries()) as CapabilityData;
  }

}
