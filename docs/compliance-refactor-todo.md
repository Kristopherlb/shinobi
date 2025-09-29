# Compliance Configuration Refactor Backlog

The following components still embed `context.complianceFramework` switches or per-framework defaults in code. Each item needs to be migrated so that all behaviour is driven from the ConfigBuilder + `/config/<framework>.yml` profile, with components consuming only the resolved configuration.

## Batch 1 – High Traffic Entry Points
- [ ] `packages/components/api-gateway-http` — builder, component, creator, docs, tests
- [ ] `packages/components/auto-scaling-group` — builder & component refactor (monitoring/KMS/alarm defaults)
- [ ] `packages/components/certificate-manager` — builder/component switch removal

## Batch 2 – Identity & Networking
- [ ] `packages/components/cognito-user-pool` — builder + component compliance switches
- [ ] `packages/components/static-website` — builder/component/creator WAF & logging defaults
- [ ] `packages/components/waf-web-acl` — builder/component rule-set defaults

## Batch 3 – Data Plane Services
- [ ] `packages/components/ec2-instance` — builder/component encryption/backups/alarms
- [ ] `packages/components/elasticache-redis` — builder/component scaling/backups
- [ ] `packages/components/glue-job` — builder/component monitoring/security defaults
- [ ] `packages/components/sns-topic` — builder/component encryption/monitoring defaults
- [ ] `packages/components/sqs-queue` — builder/component FIFO/DLQ/monitoring defaults
- [ ] `packages/components/ssm-parameter` — component/creator key rotation & sensitivity enforcement

## Batch 4 – Eventing & Integration
- [ ] `packages/components/eventbridge-rule-cron`
- [ ] `packages/components/eventbridge-rule-pattern`
- [ ] `packages/components/lambda-api`
- [ ] `packages/components/openfeature-provider`
- [ ] `packages/components/feature-flag`

## Batch 5 – Platform Services
- [ ] `packages/components/backstage-portal`
- [ ] `packages/components/container-application`
- [ ] `packages/components/dagger-engine-pool` (root and `src/` variants)
- [ ] `packages/components/deployment-bundle-pipeline`
- [ ] `packages/components/mcp-server`
- [ ] `packages/components/sagemaker-notebook-instance`
- [ ] `packages/components/shinobi`

## Shared Libraries
- [ ] `packages/components/_lib/observability.ts` — extract framework retention map into config

As each batch is completed:
1. Update the component builder to source defaults exclusively from the platform config files.
2. Remove any `switch`/`if` statements in components and creators that depend on `context.complianceFramework`.
3. Refresh documentation and test suites to reflect the new configuration surface.
4. Run targeted Jest suites (builder + synthesis) and TypeScript builds for the affected packages.
