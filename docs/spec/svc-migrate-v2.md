Awesome — here’s a ready-to-drop **PR kit** you can paste into the repo to land `svc-migrate-v2` plus the supporting contracts, flags, and tests. I kept to the current class/packaging patterns (package-per-component, contracts in a shared module, resolver/aspect model). You can commit these as-is, or let Cursor apply them file-by-file.

---

# 1) New spec doc

**File:** `docs/specs/svc-migrate-v2.md`

````markdown
# Engineering Specification: The Platform Migration Tool (`svc migrate`) — v2

## Status
- **Active** (supersedes v1)
- **Replaces:** `docs/specs/svc-migrate-v1.md`
- **Date:** 2025-09-14
- **Why:** Platform added framework isolation, policy gates (cdk-nag/OPA/Wiz), Dagger pipeline, typed capabilities, deterministic binding IDs.

## 1) Vision & Goals
**Vision:** Semi-automated, safe, deterministic migration from existing AWS CDK/CFN to our **manifest-driven** platform with **zero drift**.  
**Primary Goal:** **Empty `cdk diff`** between original stack and migrated stack (via logical-ID preservation).  
**Secondary Goal:** Automate **80–90%** mapping; produce clear, actionable report for the rest.  
**Non-Goals:** Perfect conversion of imperative code, app logic migration.

### Constraints
- **CDK-only** output (no Terraform/other IaC).
- **Framework isolation:** one of `commercial | fedramp-moderate | fedramp-high`; no cross-tier config leakage.
- **Policy gates:** schema, cdk-nag/Conformance, OPA, and **Wiz** must pass in CI for Moderate/High.

## 2) Workflow

### Phase 1 — Analysis (read-only)
- Inputs: CDK app (or CFN template), stack name, **framework** (required).
- Outputs: resource inventory + original `template.json`, logical IDs, region/account context.

### Phase 2 — Mapping → Manifest
- Resource→Component matrix (pkg-per-component).
- Group into components; infer `config`.
- Apply **Configuration Precedence Chain**: platform → framework → env → overrides.
- Emit **binds** (capability enums) from discovered relationships.

### Phase 3 — Logical ID preservation
- Generate `logical-id-map.json`; Resolver Aspect overrides logical IDs at synth.
- Deterministic naming seeds; stable `bindingId` for binds.

### Phase 4 — Validation & Reporting
- `svc validate` (schema/semantics; data-classification for storage/db required).
- `svc plan` with framework enforcement + **cdk-nag/OPA/Wiz** gates.
- Final `cdk diff` vs original **with ID map** → **NO CHANGES**.
- Emit `MIGRATION_REPORT.md` + plan artifacts.

## 3) CLI UX (`svc migrate`)
```text
$ svc migrate
? Source type: (cdk / cfn)
? Path to project or template:
? Stack to migrate:
? Target service name:
? Compliance framework: (commercial / fedramp-moderate / fedramp-high)
? Output dir:
? Region/account (optional):

(1/4) Analyze … DONE
(2/4) Map & Generate manifest … DONE
(3/4) Logical ID map … DONE
(4/4) Validate, Plan, Diff … DONE  → Final Diff: NO CHANGES
````

**Flags**

* `--framework <tier>` (required)
* `--noninteractive`
* `--fail-on-warn`
* `--wiz-api <url>` `--wiz-token <secret_ref>`

## 4) Artifacts

* `service.yml`
* `logical-id-map.json`
* `patches.ts` (L1 escape hatch stubs)
* `MIGRATION_REPORT.md` (summary, control posture, binds, unmappables, final diff)
* `plan/template.json`, `plan/compliance-report.json`, `plan/tag-report.json`, `plan/dashboards/`

## 5) Edge cases

* `Custom::`/unknown → `patches.ts` L1 + control impact notes.
* Imperative patterns → warn + stubs.
* Cross-stack refs → selection or warnings + reference stubs.
* GovCloud gaps → `frameworkCapabilities.json` guidance.

## 6) Policy & Compliance (gates)

**High:** FIPS endpoints, private connectivity, VPC endpoints (S3/SSM/Secrets/KMS), TLS required, log retention ≥400d, SG peers only SG/RFC1918.
**Moderate:** encryption at rest, TLS, private preferred, stricter logs/metrics.
**Commercial:** best-practice warnings.

Required tags: `platform:*`, `compliance:framework`; data stores require `labels.data-classification`.

## 7) Dagger & CI

Single Dagger graph to run migrate→validate→plan→diff→wiz across GitLab (Gov) and CircleCI (Commercial); thin adapters for TeamCity/Bitbucket.

## 8) Acceptance

1. Representative legacy stacks → **NO CHANGES** with ID map.
2. Generated manifest passes schema + PaC + Wiz (Mod/High).
3. Unmappables have copy-pasteable L1 stubs.
4. Plan emits control evidence + dashboards.
5. Same Dagger pipeline runs in GitLab & CircleCI.

## 9) Implementation Notes

* Keep existing class patterns (pkg-per-component, Resolver/Aspect, binder strategies).
* Add capability enums + typed `CapabilityData`; binder strategies async.
* Deterministic `bindingId = sha256(src:tgt:cap:access:framework:env).slice(0,12)`.
* Structured platform logger (no `console.*`).
* Snapshot tests for plan artifacts & ID map.

## 10) Changes vs v1

* Framework isolation + PaC/Wiz gates
* Typed capabilities & CapabilityData
* Async binder strategies
* Deterministic binding IDs
* Dagger CI interlock
* Locked artifact contract

````

---

# 2) Contracts: capabilities & typed data

**File:** `packages/contracts/src/bindings.ts`

```ts
// Core enums
export type ComplianceFramework = 'commercial' | 'fedramp-moderate' | 'fedramp-high';
export type AccessLevel = 'read' | 'write' | 'readwrite' | 'admin';

// Capabilities (extend as needed)
export type DbCapability =
  | 'db:postgres'
  | 'db:mysql'
  | 'db:aurora-postgres'
  | 'db:aurora-mysql';
export type StorageCapability = 'storage:s3';
export type QueueCapability = 'queue:sqs' | 'topic:sns';
export type LambdaCapability = 'compute:lambda';
export type ApiCapability = 'http:api' | 'rest:api';

export type Capability =
  | DbCapability
  | StorageCapability
  | QueueCapability
  | LambdaCapability
  | ApiCapability;

// Discriminated capability data
export type PostgresData = {
  type: 'db:postgres';
  endpoints: { host: string; port: number };
  resources: { arn: string; name?: string; id?: string };
  secrets: { masterSecretArn: string };
};
export type S3Data = {
  type: 'storage:s3';
  resources: { arn: string; name: string };
};

export type CapabilityData = PostgresData | S3Data /* | …others */;

// Binding directive & selector
export interface ComponentSelector {
  type: string;
  withLabels?: Record<string, string>;
}

export interface BindingDirective {
  to?: string;
  select?: ComponentSelector;
  capability: Capability;
  access: AccessLevel;
  env?: Record<string, string>;
  options?: Record<string, unknown>;
  metadata?: { description?: string; tags?: Record<string, string> };
}

// Network policy
export type SgPeer =
  | { kind: 'sg'; id: string }
  | { kind: 'cidr'; cidr: string };

export interface PortRange {
  from: number;
  to: number;
  protocol: 'tcp' | 'udp';
}

export interface SecurityGroupRule {
  type: 'ingress' | 'egress';
  peer: SgPeer;
  port: PortRange;
  description: string;
}

// Results
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export interface IamPolicy {
  statement: PolicyStatement;
  description: string;
  complianceRequirement?: string;
}

export interface EnhancedBindingResult {
  readonly environmentVariables: Readonly<Record<string, string>>;
  readonly iamPolicies: ReadonlyArray<IamPolicy>;
  readonly securityGroupRules: ReadonlyArray<SecurityGroupRule>;
  readonly complianceActions: ReadonlyArray<{
    type: 'policy' | 'rule' | 'restriction' | 'monitoring';
    description: string;
    framework: ComplianceFramework;
    details: Record<string, unknown>;
  }>;
  readonly metadata: {
    bindingId: string;
    timestamp: string;
    framework: ComplianceFramework;
    description: string;
  };
}

// Context
export interface EnhancedBindingContext {
  source: { getId(): string; getName(): string; getType(): string; getServiceName(): string };
  target: { getId(): string; getName(): string; getType(): string };
  directive: BindingDirective;
  environment: string;
  complianceFramework: ComplianceFramework;
  targetCapabilityData: CapabilityData;
  options?: {
    iamAuth?: boolean;
    tlsRequired?: boolean;
    vpcEndpoint?: string;
    iamConditions?: Record<string, unknown>;
  };
}
````

---

# 3) Strategy interface → async & registry usage

**File:** `packages/core-engine/src/binders/enhanced-binder-strategy.ts`

```ts
import { Capability, EnhancedBindingContext, EnhancedBindingResult } from '@shinobi/contracts/bindings';

export interface EnhancedBinderStrategy {
  getStrategyName(): string;
  canHandle(sourceType: string, capability: Capability): boolean;
  bind(ctx: EnhancedBindingContext): Promise<EnhancedBindingResult>;
}
```

**File:** `packages/core-engine/src/binders/enhanced-binder-registry.ts` (adjust callsite)

```ts
// inside async bind(context)
const strategy = this.findStrategy(context.source.getType(), context.targetCapabilityData.type);
if (!strategy) throw new Error(/* … */);

// compliance check (existing)
// …

const result = await strategy.bind(context);
// freeze defensively for audit immutability
const frozen: EnhancedBindingResult = {
  ...result,
  environmentVariables: Object.freeze({ ...result.environmentVariables }),
  iamPolicies: Object.freeze([...result.iamPolicies]),
  securityGroupRules: Object.freeze([...result.securityGroupRules]),
  complianceActions: Object.freeze([...result.complianceActions]),
  metadata: Object.freeze({ ...result.metadata }),
};
this.bindingCache.set(context, frozen);
return frozen;
```

---

# 4) Logical-ID Aspect wiring test

**File:** `packages/core-engine/test/logical-id-aspect.spec.ts`

```ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CfnResource } from 'aws-cdk-lib';
import { LogicalIdAspect } from '../src/aspects/logical-id-aspect'; // your existing aspect

test('LogicalIdAspect overrides logical IDs from map', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');

  const bucket = new cdk.aws_s3.CfnBucket(stack, 'NewLogicalBucket');
  const fn = new cdk.aws_lambda.CfnFunction(stack, 'NewLogicalFunction', {
    role: 'arn:aws:iam::111122223333:role/placeholder',
    code: { zipFile: 'exports.handler=async()=>{}' },
    handler: 'index.handler',
    runtime: 'nodejs20.x',
  });

  const map = {
    NewLogicalBucket: 'LegacyBucket123',
    NewLogicalFunction: 'LegacyFunction456',
  };

  cdk.Aspects.of(stack).add(new LogicalIdAspect(map));
  const template = Template.fromStack(stack).toJSON() as any;

  // Ensure logical IDs are rewritten
  expect(template.Resources.LegacyBucket123).toBeDefined();
  expect(template.Resources.LegacyFunction456).toBeDefined();
  expect(template.Resources.NewLogicalBucket).toBeUndefined();
  expect(template.Resources.NewLogicalFunction).toBeUndefined();
});
```

> If your Aspect lives elsewhere, adjust import accordingly. The key is asserting IDs are replaced exactly as mapped.

---

# 5) CLI flags for `svc migrate`

**File:** `cli/src/commands/migrate.ts` (excerpt)

```ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runMigrate } from '../lib/migrate';

export const cmd = (argv = hideBin(process.argv)) =>
  yargs(argv)
    .command(
      'migrate',
      'Migrate an existing CDK/CFN stack to a Shinobi manifest',
      (y) =>
        y
          .option('framework', {
            type: 'string',
            choices: ['commercial', 'fedramp-moderate', 'fedramp-high'],
            demandOption: true,
            describe: 'Compliance framework for the migrated service',
          })
          .option('noninteractive', { type: 'boolean', default: false })
          .option('fail-on-warn', { type: 'boolean', default: false })
          .option('wiz-api', { type: 'string', describe: 'Wiz API base URL' })
          .option('wiz-token', { type: 'string', describe: 'Wiz token (or secret ref)' })
          .option('source-type', { type: 'string', choices: ['cdk', 'cfn'], default: 'cdk' })
          .option('stack', { type: 'string', describe: 'Source stack name (required for CDK apps)' })
          .option('project', { type: 'string', describe: 'Path to source project or template', demandOption: true })
          .option('service', { type: 'string', describe: 'Target service name', demandOption: true })
          .option('out', { type: 'string', describe: 'Output directory', default: (args) => `./${args.service}` }),
      (args) => runMigrate(args as any)
    )
    .strict()
    .demandCommand()
    .parse();
```

---

# 6) Golden E2E: zero-diff sample

**File:** `e2e/migrate-zero-diff.e2e.spec.ts`

```ts
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

const FIXTURE = path.join(__dirname, 'fixtures/legacy-lambda-rds');

function run(cmd: string, opts: any = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

describe('svc migrate → NO CHANGES (legacy lambda+rds)', () => {
  const outDir = path.join(__dirname, 'tmp/orders-api');

  it('produces artifacts and an empty diff', () => {
    // 1) synth original template
    run(`npm ci`, { cwd: FIXTURE });
    run(`npx cdk synth --json ${process.env.CDK_ARGS ?? ''}`, { cwd: FIXTURE });

    // 2) migrate
    run(
      `node ./dist/cli/index.js migrate --framework fedramp-moderate ` +
        `--source-type cdk --project ${FIXTURE} --stack LegacyApiStack ` +
        `--service orders-api --out ${outDir} --noninteractive`,
      { cwd: path.join(__dirname, '..') }
    );

    // 3) artifacts exist
    expect(existsSync(path.join(outDir, 'service.yml'))).toBe(true);
    expect(existsSync(path.join(outDir, 'logical-id-map.json'))).toBe(true);
    expect(existsSync(path.join(outDir, 'MIGRATION_REPORT.md'))).toBe(true);

    // 4) plan + diff (tool should apply logical-id-map)
    const planOut = run(`node ./dist/cli/index.js plan --service-dir ${outDir} --json`, {
      cwd: path.join(__dirname, '..'),
    });
    const plan = JSON.parse(planOut);
    expect(plan.finalDiff).toBe('NO_CHANGES');
  });
});
```

**Fixture suggestion:** `e2e/fixtures/legacy-lambda-rds/` = a tiny CDK app with a Lambda → RDS connection (use L1/L2 minimal). This keeps the test deterministic.

---

# 7) Quick git steps

```bash
git checkout -b feat/svc-migrate-v2
# 1) Spec doc
mkdir -p docs/specs
$EDITOR docs/specs/svc-migrate-v2.md

# 2) Contracts
mkdir -p packages/contracts/src
$EDITOR packages/contracts/src/bindings.ts

# 3) Strategy interface + registry change
$EDITOR packages/core-engine/src/binders/enhanced-binder-strategy.ts
$EDITOR packages/core-engine/src/binders/enhanced-binder-registry.ts

# 4) Aspect test
mkdir -p packages/core-engine/test
$EDITOR packages/core-engine/test/logical-id-aspect.spec.ts

# 5) CLI flags
$EDITOR cli/src/commands/migrate.ts

# 6) E2E
mkdir -p e2e/fixtures/legacy-lambda-rds
$EDITOR e2e/migrate-zero-diff.e2e.spec.ts
# (add a minimal fixture CDK app in the fixtures folder)

git add .
git commit -m "svc-migrate: v2 spec, capability enums, async strategies, CLI flags, logical-id aspect test, zero-diff E2E"
git push -u origin feat/svc-migrate-v2
```

---

## Notes on fit & drift

* This kit **does not** alter your established class patterns; it **tightens types**, **makes strategies async**, and **locks the artifact contract** so compliance and CI can trust it.
* If the repo already has equivalent files, copy the relevant blocks instead of replacing wholesale.
* After merging, point docs and tickets to `docs/specs/svc-migrate-v2.md`. Keep v1 archived for audit trace.

If you want, I can also sketch the tiny **legacy fixture CDK app** for the E2E to ensure truly “NO CHANGES” on CI.
