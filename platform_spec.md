# Platform Technical Specification

## Area 1 — Component Contract (@platform/contracts)

### 1.1 ComponentSpec (authoring contract)

**Goal**: a stable, typed surface that's easy to author in YAML and validate at runtime.

**Required fields**

- **name** (string, unique in manifest)
- **type** (string; registry key, e.g., lambda-api, rds-postgres)
- **config** (object; strongly-typed per component; validated against that component's JSON Schema)
- **binds** (array; structured bindings with intent, see below)
- **labels** (map<string,string>; optional discovery/selection tags)
- **overrides** (object; allow-list of overridable defaults and L2 passthroughs)
- **policy** (object; optional per-component governance knobs; e.g., opt-in public egress flag with justification)

**Typing & validation:**
- Each component publishes Config.schema.json (draft-07+).
- CLI performs schema validation on config and cross-field rules (e.g., cannot set publicAccess=true without justification).
- Versioned schema (semver) to preserve backward compatibility.

### 1.2 Binds (capabilities & access intent)

Flat arrays don't capture intent. Use structured binds:

```yaml
binds:
  - to: orders-db           # component name OR a selector (see below)
    capability: db:postgres # what we want
    access: read|write|admin
    env:
      # optional explicit env var names (else defaults)
      host: DB_HOST
      secretArn: DB_SECRET_ARN
    options:
      iamAuth: true|false
      tlsRequired: true|false
```

**Selectors (advanced):**

```yaml
binds:
  - select:
      type: rds-postgres
      withLabels: { tier: "gold", shared: "true" }
    capability: db:postgres
    access: read
```

Resolver resolves `to` or `select` → exactly one target; else error.

### 1.3 Provides (capability outputs)

Each component publishes a capability map after synth:

- **db:postgres** → { host, port, dbName, secretArn, sgId }
- **cache:redis** → { host, port, authSecretArn, sgId }
- **queue:sqs** → { queueUrl, queueArn }
- **topic:sns** → { topicArn }
- **bucket:s3** → { bucketName, bucketArn }
- **obs:log-group** → { logGroupName, logGroupArn }
- **net:security-group** → { sgId }

…(curated vocabulary; versioned)

### 1.4 Cross-component discovery (without binds)

Not every relationship is a runtime bind. Provide read-only references via a manifest-scoped lookup:

**Outputs Manifest** (generated post-synth): outputs.json

```json
{
  "components": {
    "orders-db": {
      "db:postgres": { "host": "...", "port": 5432, "secretArn": "..." }
    },
    "artifacts-bucket": {
      "bucket:s3": { "bucketName": "..." }
    }
  }
}
```

In service.yml, allow refs:

```yaml
config:
  auditBucketRef: ${ref:artifacts-bucket.bucket:s3.bucketName}
```

Resolver validates refs exist; read-only (does not drive wiring or IAM—use binds for that).

---

## Area 2 — Developer Experience (service.yml Manifest)

### Example: "Shipping Service"

Public REST API to create shipments → writes to SQS
Worker Lambda consumes SQS, computes rates → writes to RDS Postgres
Env divergence (dev vs prod), secret management (no plaintext), overrides/passthrough

### 2.1 Manifest structure (top-level)

```yaml
service: shipping
owner: team-fulfillment
runtime: nodejs20
complianceFramework: commercial|fedramp-moderate|fedramp-high
labels:
  domain: logistics
  pii: low

environments:
  dev:
    defaults:
      lambdaMemory: 512
      featureFlags:
        ENABLE_MOCK_RATES: true
  prod:
    defaults:
      lambdaMemory: 1024
      featureFlags:
        ENABLE_MOCK_RATES: false

components:
  - name: api
    type: lambda-api
    config:
      routes:
        - method: POST
          path: /shipments
          handler: src/api.createShipment
      env:
        FEATURE_FLAGS: ${env:featureFlags}   # injected map → JSON string
    binds:
      - to: requests-queue
        capability: queue:sqs
        access: write
        env:
          queueUrl: REQUESTS_QUEUE_URL
    overrides:
      function:
        memorySize: ${env:lambdaMemory}      # env-aware override
        timeout: 15
      logs:
        logRetentionDays: 14                 # non-default log retention

  - name: requests-queue
    type: sqs-queue
    config:
      fifo: true
      visibilityTimeout: 60
    overrides:
      queue:
        deadLetter:
          maxReceiveCount: 5

  - name: worker
    type: lambda-worker
    config:
      handler: src/worker.process
      batchSize: 10
    binds:
      - to: requests-queue
        capability: queue:sqs
        access: read
      - to: rates-db
        capability: db:postgres
        access: write
        options:
          iamAuth: true
        env:
          host: DB_HOST
          secretArn: DB_SECRET_ARN
    overrides:
      function:
        memorySize: ${env:lambdaMemory}
        timeout: 60
      logs:
        logRetentionDays: 30

  - name: rates-db
    type: rds-postgres
    config:
      dbName: shipping
      multiAz: ${envIs:prod}                 # true in prod, false dev
      backupRetentionDays:
        dev: 3
        prod: 14
      parameters:
        sharedExtensions:
          - uuid-ossp
          - pgcrypto
    # No secrets in manifest; platform generates a master secret in Secrets Manager
    # Optionally reference an *existing* secret by path/arn:
    # config.masterSecretRef: arn:aws:secretsmanager:...
    overrides:
      instance:
        class:
          dev: t3.micro
          prod: r5.large
        storageGb:
          dev: 20
          prod: 200
      network:
        allowPublicAccess: false
```

### 2.2 Environment divergence rules

**Interpolation helpers:**
- `${env:<key>}` → value from environments.<env>.defaults
- `${envIs:prod}` → boolean

Per-env maps supported on any scalar:
```yaml
memorySize:
  dev: 512
  prod: 1024
```

**Resolution order**: manifest base → environment defaults → per-env override → component overrides

### 2.3 Secret management

**Creation path (default)**: database components always create a secret in Secrets Manager; only the ARN is surfaced.

**Adoption path (optional)**: config.masterSecretRef may point to an existing secret ARN/path.

**Consumption**: binds inject ARNs only (e.g., DB_SECRET_ARN); runtime pulls values via SDK/IAM. No plaintext in manifest.

### 2.4 Overrides & L2 passthrough

overrides is allow-listed by component type (documented per component). Examples:
- function.memorySize, function.timeout
- logs.logRetentionDays
- queue.deadLetter.maxReceiveCount
- instance.class, instance.storageGb

For advanced use, a namespaced passthrough can be exposed (explicitly):
l2Props.function (full L2 props object). Use sparingly; flagged in plan output and governance review.

---

## Area 3 — Governance & Extensibility Contract

### 3.1 cdk-nag contract (governance as code)

**Default**: Enabled for all stacks in svc plan and CI.

**Policy packs**: aws-solutions, cis, plus org-custom pack.

**Fail policy**: error in prod, warn in dev (configurable).

**Suppressions (manifest)**:

```yaml
governance:
  cdkNag:
    suppress:
      - id: AwsSolutions-IAM5
        appliesTo:
          - component: api
          - path: constructs.api.function.role # optional precise path
        justification: "Wildcards limited to SSM param list due to vendor SDK pattern"
        expiresOn: "2026-01-01"
        owner: "team-fulfillment"
```

**Rules**:
- Required fields: id, justification, owner, expiresOn (ISO date).
- Granularity: component and optional path selector to avoid blanket suppressions.
- Audit: All suppressions appear in plan and are exported to the immutable audit feed.

### 3.2 patches.ts escape hatch (power with audit)

**Intent**: Give teams surgical power when overrides aren't enough—without forking the platform.

Each patch receives:
- **stack**: the top-level CDK Stack handle
- **graph**: read-only component graph (nodes, provides, binds)
- **handles**: a dictionary { [componentName]: { type, construct, provides } }
- **context**: { env, serviceName, tags, audit }
- **helpers**: safe utilities (attachAlarm, addNagSuppression, addSgRule, etc.)

Each patch returns a **PatchReport**: what was changed, why, risk level.

**Manifest registration & audit**:

```yaml
extensions:
  patches:
    - name: tighten-db-alarms
      justification: "Critical SLO for shipping rates. Pager duty integration required."
      owner: "team-fulfillment"
      expiresOn: "2026-01-01"
```

Plan shows the diff from patches.
CI gates can require approval for high-risk changes (e.g., SG egress to public CIDRs).

### 3.3 Internal Plugin contribution contract (new component)

**Purpose**: Let teams add components safely to the registry.

**What you must provide**:

1. **Metadata**: name, type (registry key), version (semver), owners (email/sg)
2. **Config schema**: Config.schema.json (draft-07+) with examples
3. **Capabilities**: provides: declared keys and their shapes (JSON schema)
4. **Documentation**: README with overview, use cases, examples, security posture
5. **Diagrams**: Minimal architecture diagram showing resource edges and security groups
6. **Tests**: Unit tests, snapshot tests, integration smoke tests
7. **Governance**: cdk-nag must pass with zero suppressions or provide scoped suppressions
8. **Operational hooks**: Default alarms & metrics, cost drivers documentation
9. **Registry manifest**: component.json with all of the above

**Review process**:
- Automated checks: schema validity, tests, nag, tags, license headers
- Security review: IAM diff, network posture
- Platform review: naming, capability keys, override surface area

---

## Why this works

- **Predictable DX**: one manifest, clear binds, sane defaults.
- **Safe power**: layered flexibility (overrides → patches → last-resort L2 passthrough), all audited.
- **Scale via ecosystem**: typed schemas, capability contracts, and a contribution checklist make components composable without central gatekeeping.
- **SaaS-ready**: governance, audit, and versioned registries are baked in from day one.