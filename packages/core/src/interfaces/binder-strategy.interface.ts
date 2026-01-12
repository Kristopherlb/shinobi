import type { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import type { SecurityGroupRule } from '../platform/contracts/bindings.js';
import type { AccessLevel } from '../platform/contracts/platform-binding-trigger-spec.js';

export type { AccessLevel };

export interface BindingResultV1 {
  /** Env vars to inject into the source workload. */
  sourceEnv: Record<string, string>;

  /** Least-privilege IAM statements applied to the target or source role (adapter-level). */
  targetPolicy: PolicyStatement[];

  /** Network rules required for the binding to function. */
  securityGroupRules: SecurityGroupRule[];
}

export interface IBinderStrategyV1<SourceConfig, TargetConfig> {
  bind(source: SourceConfig, target: TargetConfig, accessLevel: AccessLevel): BindingResultV1;
}


