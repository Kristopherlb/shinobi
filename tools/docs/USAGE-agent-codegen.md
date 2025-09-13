# Agent Codegen & Static Audit (Quickstart)

## Scaffold a component with compliance plan
```bash
node tools/kb-load.mjs platform-kb s3-bucket fedramp-moderate > /tmp/packs.json

node tools/agent-scaffold.mjs   --component s3-bucket   --service-type s3-bucket   --framework fedramp-moderate   --packs /tmp/packs.json   --controls "AC-2(3),AT-4(b)"
```

Generated under `packages/components/s3-bucket`:
- `audit/component.plan.json` (packs, rules, controls incl. AC-2(3), AT-4(b))
- `observability/alarms-config.json`, `observability/otel-dashboard-template.json`
- `src/*.ts` boilerplate, `tests/unit/*.ts` placeholders
- `README.md` with packs + control list

## Apply compliance tags
```ts
import { applyComplianceTags } from '../../_lib/tags';
applyComplianceTags(this, {
  component: 's3-bucket',
  serviceType: 's3-bucket',
  framework: 'fedramp-moderate',
  controls: ['AC-2(3)', 'AT-4(b)', 'AU-2', 'SC-13'],
  owner: 'platform-team', environment: 'dev'
});
```

## Run static audit
```bash
node tools/svc-audit-static.mjs
```
