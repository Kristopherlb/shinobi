import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaApiSpec } from "./lambda-api.component";

const RUNTIME_ALIASES: Record<string, lambda.Runtime> = {
  "nodejs20.x": lambda.Runtime.NODEJS_20_X,
  "nodejs18.x": lambda.Runtime.NODEJS_18_X,
  "nodejs16.x": lambda.Runtime.NODEJS_16_X,
  "nodejs14.x": lambda.Runtime.NODEJS_14_X,
  "python3.11": lambda.Runtime.PYTHON_3_11,
  "python3.10": lambda.Runtime.PYTHON_3_10,
  "python3.9": lambda.Runtime.PYTHON_3_9,
  "python3.8": lambda.Runtime.PYTHON_3_8,
  "dotnet6": lambda.Runtime.DOTNET_6,
  "dotnet8": lambda.Runtime.DOTNET_8,
  "java11": lambda.Runtime.JAVA_11,
  "java17": lambda.Runtime.JAVA_17,
  "provided.al2": lambda.Runtime.PROVIDED_AL2,
};

const normalizeRuntime = (value: unknown): lambda.Runtime | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof lambda.Runtime) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    const runtime = RUNTIME_ALIASES[normalized];
    if (!runtime) {
      throw new Error(
        `Unsupported Lambda runtime '${value}'. Supported values: ${Object.keys(RUNTIME_ALIASES).join(", ")}`
      );
    }
    return runtime;
  }

  throw new Error(
    "Lambda runtime must be provided as a lambda.Runtime or supported runtime string"
  );
};

type BuilderContext = {
  complianceFramework?: string;     // "commercial" | "fedramp-moderate" | "fedramp-high" | etc.
  environment?: string;             // e.g. "dev-us-east-1"
  observability?: {
    collectorEndpoint?: string;
    adotLayerArn?: string;
    adotLayerArnMap?: Record<string, string>;
    enableTracing?: boolean;
    enableMetrics?: boolean;
    enableLogs?: boolean;
  };
};

// Export types and schema for external use
export type LambdaApiConfig = LambdaApiSpec;


export class LambdaApiConfigBuilder {
  build(ctx: BuilderContext, input: Partial<LambdaApiSpec>): LambdaApiSpec {
    // Platform defaults
    const base: LambdaApiSpec = {
      handler: "src/api.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: 30,
      logRetentionDays: 14,
      environmentVariables: {},
      codePath: "./src",
      useInlineFallback: true,
      apiType: "rest",
    };

    // Compliance defaults
    const isFedramp =
      (ctx.complianceFramework ?? "").startsWith("fedramp");
    if (isFedramp) {
      // FedRAMP compliance requirements
      if (ctx.complianceFramework === "fedramp-moderate") {
        base.memorySize = 768;
        base.timeout = 45;
      } else if (ctx.complianceFramework === "fedramp-high") {
        base.memorySize = 1024;
        base.timeout = 60;
      }
      base.logRetentionDays = Math.max(base.logRetentionDays || 30, 30);
    }

    const overrideRuntime = normalizeRuntime((input as any)?.runtime);

    // Merge input last (component-level overrides win)
    return {
      ...base,
      ...input,
      runtime: overrideRuntime ?? base.runtime,
      environmentVariables: {
        ...(base.environmentVariables ?? {}),
        ...(input.environmentVariables ?? {})
      },
    };
  }

  // Convenience for legacy codepaths
  buildSync(ctx: BuilderContext, input: Partial<LambdaApiSpec>): LambdaApiSpec {
    return this.build(ctx, input);
  }
}
