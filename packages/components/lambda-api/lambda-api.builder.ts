import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaApiSpec } from "./lambda-api.component";

type BuilderContext = {
  complianceFramework?: string;     // "commercial" | "fedramp-moderate" | "fedramp-high" | etc.
  environment?: string;             // e.g. "dev-us-east-1"
};

// Export types and schema for external use
export type LambdaApiConfig = LambdaApiSpec;

export const LAMBDA_API_CONFIG_SCHEMA = {
  type: "object",
  properties: {
    handler: { type: "string" },
    runtime: { type: "string" },
    memorySize: { type: "number", minimum: 128, maximum: 10240 },
    timeoutSec: { type: "number", minimum: 1, maximum: 900 },
    logRetentionDays: { type: "number", minimum: 1, maximum: 3653 },
    environment: { type: "object", additionalProperties: { type: "string" } }
  },
  required: ["handler"],
  additionalProperties: false
};

export class LambdaApiConfigBuilder {
  build(ctx: BuilderContext, input: Partial<LambdaApiSpec>): LambdaApiSpec {
    // Platform defaults
    const base: LambdaApiSpec = {
      handler: "src/api.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeoutSec: 10,
      logRetentionDays: 14,
      environment: {},
    };

    // Compliance defaults
    const isFedramp =
      (ctx.complianceFramework ?? "").startsWith("fedramp");
    if (isFedramp) {
      // Slightly stricter defaults in fedramp modes
      base.timeoutSec = Math.max(base.timeoutSec || 10, 10);
      base.logRetentionDays = Math.max(base.logRetentionDays || 30, 30);
    }

    // Merge input last (component-level overrides win)
    return {
      ...base,
      ...input,
      environment: { ...(base.environment ?? {}), ...(input.environment ?? {}) },
    };
  }

  // Convenience for legacy codepaths
  buildSync(ctx: BuilderContext, input: Partial<LambdaApiSpec>): LambdaApiSpec {
    return this.build(ctx, input);
  }
}
