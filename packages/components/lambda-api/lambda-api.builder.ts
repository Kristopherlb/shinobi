import { lambda } from "aws-cdk-lib";
import { LambdaApiSpec } from "./lambda-api.component";

type BuilderContext = {
  complianceFramework?: string;     // "commercial" | "fedramp-moderate" | "fedramp-high" | etc.
  environment?: string;             // e.g. "dev-us-east-1"
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
      base.timeoutSec = Math.max(base.timeoutSec, 10);
      base.logRetentionDays = Math.max(base.logRetentionDays!, 30);
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
