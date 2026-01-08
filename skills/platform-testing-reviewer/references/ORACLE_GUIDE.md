# Oracle Selection Guide

This guide helps you choose the right oracle type for your test based on what you're validating.

## Decision Tree

### 1. Are you validating a CloudFormation template or large structured output?

**YES** → Use **Snapshot Oracle**
- Best for: CDK synthesis outputs, CloudFormation templates, complex configuration objects
- Requires: `mask_rules` for volatile fields (timestamp, uuid, arn, hash)
- Example: `Template.fromStack(stack).toJSON()` snapshot

**NO** → Continue to next question

### 2. Are you validating against a schema or protocol?

**YES** → Use **Contract Oracle**
- Best for: JSON Schema validation, OpenAPI contract validation, component config validation
- Tools: Ajv, Zod, Yup, JSON Schema validators
- Example: Validating component config against `Config.schema.json`

**NO** → Continue to next question

### 3. Are you testing invariants across many generated inputs?

**YES** → Use **Property-Based Oracle**
- Best for: Input validation, edge case discovery, invariant testing
- Tools: fast-check (JS/TS), Hypothesis (Python)
- Example: Testing ConfigBuilder with arbitrary skill names

**NO** → Continue to next question

### 4. Are you testing a transformation that should be reversible or preserve properties?

**YES** → Use **Metamorphic Oracle**
- Best for: Serialization/deserialization, parsing/formatting, encoding/decoding
- Example: `parse(yamlDump(x)) ≈ x` or `encode(decode(x)) === x`

**NO** → Continue to next question

### 5. Are you verifying observable side effects without coupling to implementation?

**YES** → Use **Behavioral Trace Oracle**
- Best for: Verifying tags were applied, logs were written, permissions were granted
- Example: Checking CloudFormation template has tags without knowing how they were added

**NO** → Use **Exact Output Oracle**
- Best for: Deterministic value/structure comparison
- Example: Comparing config objects, return values, simple structures

## Oracle Comparison Matrix

| Oracle | Best For | Requires | Tools | When to Avoid |
|--------|----------|----------|-------|---------------|
| **Exact** | Simple deterministic outputs | None | Standard assertions | Large/complex structures |
| **Snapshot** | Large structured outputs (CFN templates) | `mask_rules` | Jest/Vitest snapshots | When structure changes frequently |
| **Property** | Invariant testing, edge cases | RNG seeding | fast-check, Hypothesis | When you need specific known inputs |
| **Contract** | Schema/protocol validation | Schema definition | Ajv, Zod, Yup | When you need exact value matching |
| **Metamorphic** | Reversible transformations | Transformation pair | Custom assertions | When transformation isn't reversible |
| **Trace** | Observable side effects | Observable interface | Template assertions, log checks | When you need exact value matching |

## Common Patterns

### Pattern 1: Component Synthesis Tests

**Use**: **Snapshot Oracle** with **Contract Oracle** for validation

```typescript
// Snapshot for full template
it('Synthesis__DefaultConfig__MatchesSnapshot', () => {
  const component = new MyComponent(stack, 'Test', context, spec);
  component.synth();
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

// Contract for specific resource properties
it('Synthesis__DefaultConfig__ValidatesResourceProperties', () => {
  const component = new MyComponent(stack, 'Test', context, spec);
  component.synth();
  const template = Template.fromStack(stack);
  
  template.hasResourceProperties('AWS::ECS::Service', {
    ServiceName: 'test-service',
    LaunchType: 'FARGATE'
  });
});
```

**Metadata**:
```json
{
  "oracle": "snapshot",
  "mask_rules": ["timestamp", "uuid", "arn"],
  "compliance_refs": ["std://platform-component-api-spec"]
}
```

### Pattern 2: ConfigBuilder Tests

**Use**: **Exact Oracle** for simple configs, **Property Oracle** for edge cases

```typescript
// Exact for known inputs
it('ConfigBuilder__MinimalConfig__ReturnsDefaults', () => {
  const builder = new ConfigBuilder(context, minimalSpec);
  const config = builder.buildSync();
  expect(config).toEqual(expectedDefaults);
});

// Property for edge cases
it('ConfigBuilder__ArbitrarySkillName__SatisfiesConstraints', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 64 }).filter(s => /^[a-z0-9-]+$/.test(s)),
      (skillName) => {
        const spec = { name: skillName, type: 'test' };
        const builder = new ConfigBuilder(context, spec);
        const config = builder.buildSync();
        expect(config).toHaveProperty('property1');
      }
    ),
    { seed: 42 }
  );
});
```

### Pattern 3: Binding/Integration Tests

**Use**: **Trace Oracle** for IAM policies, **Contract Oracle** for capability validation

```typescript
// Trace for observable side effects (IAM policies)
it('Binding__S3Capability__GeneratesIAMPolicy', () => {
  const binding = await binder.bind(bindingContext);
  
  // Trace: Verify IAM policy was created (observable side effect)
  expect(binding.iamPolicies).toHaveLength(1);
  expect(binding.iamPolicies[0].statements[0].actions).toContain('s3:GetObject');
});

// Contract for capability validation
it('Binding__InvalidCapability__FailsValidation', () => {
  const invalidBinding = { capability: 'invalid:capability' };
  
  const validate = ajv.compile(CAPABILITY_SCHEMA);
  const valid = validate(invalidBinding);
  
  expect(valid).toBe(false);
  expect(validate.errors).toBeDefined();
});
```

### Pattern 4: Serialization Tests

**Use**: **Metamorphic Oracle**

```typescript
it('ManifestParser__RoundTrip__PreservesStructure', () => {
  const original = { service: 'test', components: [{ name: 'comp1' }] };
  
  const yaml = yamlDump(original);
  const parsed = yamlLoad(yaml);
  
  // Metamorphic: parse(yamlDump(x)) ≈ x
  expect(parsed).toEqual(original);
});
```

## Anti-Patterns: When NOT to Use Each Oracle

### ❌ Don't Use Snapshot For:
- Simple value comparisons (use Exact)
- Frequently changing structures (use Contract)
- When you need to test specific values (use Exact or Contract)

### ❌ Don't Use Property For:
- Known specific inputs (use Exact)
- When you need deterministic output (use Exact or Snapshot)
- Schema validation (use Contract)

### ❌ Don't Use Contract For:
- Exact value matching (use Exact)
- Large complex structures (use Snapshot)
- When schema doesn't capture all requirements (use Exact or Snapshot)

### ❌ Don't Use Exact For:
- Large CloudFormation templates (use Snapshot)
- When structure might evolve (use Contract or Snapshot)
- Testing invariants across inputs (use Property)

## Oracle Selection Checklist

Before choosing an oracle, ask:

1. **What am I validating?**
   - Simple value → Exact
   - Large structure → Snapshot
   - Schema compliance → Contract
   - Invariant → Property
   - Transformation → Metamorphic
   - Side effect → Trace

2. **How stable is the output?**
   - Stable → Exact or Contract
   - Volatile (timestamps, UUIDs) → Snapshot (with masks)

3. **Do I need to test many inputs?**
   - Yes → Property
   - No → Exact, Snapshot, or Contract

4. **Is this a reversible transformation?**
   - Yes → Metamorphic
   - No → Other oracle

5. **Am I testing observable side effects?**
   - Yes → Trace
   - No → Other oracle

## Reference

- See `ORACLE_EXAMPLES.md` for code examples of each oracle type
- See Platform Testing Standard §5 for oracle definitions
- See `MASKING_RULES.md` for snapshot masking requirements

