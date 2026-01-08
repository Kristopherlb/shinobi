# Reference Code Snippets

This directory contains markdown versions of key component and binder strategy files for reference.

## Files Included

### ECS Cluster Component Files

1. **ecs-cluster.builder.ts.md** - Configuration builder implementing the 5-layer precedence chain
2. **ecs-cluster.component.ts.md** - Main ECS Cluster component implementation (922 lines)
3. **ecs-cluster.creator.ts.md** - Component creator/factory implementation
4. **Config.schema.json.md** - JSON Schema for ECS Cluster configuration validation

### Binder Strategy Files

5. **cloudfront-binder-strategy.ts.md** - CloudFront CDN binder strategy (1457 lines)
   - Handles CloudFront distribution, origin, cache policy, function, Lambda@Edge, response headers, and field-level encryption bindings

6. **ecs-fargate-binder-strategy.ts.md** - ECS Fargate binder strategy (693 lines)
   - Handles ECS cluster, service, task definition, and OpenTelemetry environment bindings

7. **lambda-binder-strategy.ts.md** - Lambda function binder strategy (246 lines)
   - Handles Lambda function invocation bindings with sync/async support

## Original File Locations

- ECS Cluster: `packages/components/ecs-cluster/src/`
- CloudFront Binder: `packages/binders/src/strategies/cdn/cloudfront-binder-strategy.ts`
- ECS Fargate Binder: `packages/binders/src/strategies/compute/ecs-fargate-binder-strategy.ts`
- Lambda Binder: `packages/binders/src/strategies/compute/lambda-binder-strategy.ts`

## Notes

- All files have been converted from TypeScript/JSON to Markdown format with code blocks
- Full content is preserved in the markdown files
- These files are for reference purposes and may not reflect the latest changes in the codebase

