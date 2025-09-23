import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaApiSpec } from "./lambda-api.component";

type BuilderContext = {
  complianceFramework?: string;     // "commercial" | "fedramp-moderate" | "fedramp-high" | etc.
  environment?: string;             // e.g. "dev-us-east-1"
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

    // Merge input last (component-level overrides win)
    return {
      ...base,
      ...input,
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
