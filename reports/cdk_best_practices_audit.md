# CDK Best Practices Audit – dynamodb-table

## Observations
- The component relies on AWS CDK v2 L2 constructs (`dynamodb.Table`, `applicationautoscaling.ScalableTarget`, `backup.BackupPlan`) rather than falling back to low-level `Cfn*` resources, keeping the implementation idiomatic.[^cdk-l2]
- Persistent data is protected with `RemovalPolicy.RETAIN` and point-in-time recovery support coming from configuration layers, aligning with CDK guidance for stateful services.[^cdk-retain]
- The package adheres to the workspace standard for dependency versions (`aws-cdk-lib@^2.140.0`, `constructs@^10.3.0`).[^cdk-versions]
- Unit tests exercise multiple compliance frameworks and validate synthesized CloudFormation resources using `Template.hasResourceProperties`, demonstrating healthy CDK testing patterns.[^cdk-tests]

## Findings
- ⚠️ The automated test suite does not currently include `cdk-nag` assertions or suppressions, leaving best-practice linting coverage to global pipelines rather than package-level regression tests.[^cdk-nag]
- ⚠️ Layer-1 hardcoded fallbacks disable point-in-time recovery and backups, relying entirely on higher precedence layers; consider setting conservative secure defaults even at the fallback layer to match the "secure by default" guidance.[^cdk-fallbacks]

## Recommendations
1. Add a lightweight `cdk-nag` test (or shared harness invocation) to catch regressions in security controls before integration testing.[^cdk-nag]
2. Evaluate whether hardcoded fallbacks for critical controls (PITR, backups) can default to safe values without breaking developer ergonomics.[^cdk-fallbacks]

[^cdk-l2]: packages/components/dynamodb-table/src/dynamodb-table.component.ts:1-205
[^cdk-retain]: packages/components/dynamodb-table/src/dynamodb-table.component.ts:155-164; config/commercial.yml:1189-1218; config/fedramp-high.yml:1368-1411
[^cdk-versions]: packages/components/dynamodb-table/package.json:23-38
[^cdk-tests]: packages/components/dynamodb-table/tests/dynamodb-table.component.synthesis.test.ts:46-145
[^cdk-nag]: packages/components/dynamodb-table/tests (no `cdk-nag` test present); docs/platform-standards/platform-component-api-spec.md:100-107
[^cdk-fallbacks]: docs/platform-standards/platform-configuration-standard.md:32-63; packages/components/dynamodb-table/src/dynamodb-table.builder.ts:188-209
