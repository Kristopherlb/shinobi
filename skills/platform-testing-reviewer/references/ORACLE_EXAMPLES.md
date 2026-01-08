# Oracle Examples

This document provides examples of each oracle type from Platform Testing Standard §5.

## 1. Exact Output Oracle

Deterministic value/structure comparison.

```typescript
it('ConfigBuilder__MinimalConfig__ReturnsExpectedStructure', () => {
  const builder = new MyServiceConfigBuilder(context, spec);
  const config = builder.buildSync();
  
  expect(config).toEqual({
    property1: 'default-value',
    property2: 100,
    encryption: { enabled: true }
  });
});
```

**Metadata**:
```json
{
  "oracle": "exact",
  "inputs": {
    "shape": "Minimal ComponentSpec",
    "notes": "Exact structure comparison"
  }
}
```

## 2. Snapshot (Golden) Oracle

Serialized artifact vs committed baseline; requires masks for volatility.

```typescript
it('ComponentSynthesis__DefaultConfig__MatchesSnapshot', () => {
  const component = new MyServiceComponent(stack, 'Test', context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
```

**Metadata**:
```json
{
  "oracle": "snapshot",
  "mask_rules": ["timestamp", "uuid", "arn", "requestId"],
  "inputs": {
    "shape": "ComponentSpec with defaults",
    "notes": "Snapshot of CloudFormation template with volatile fields masked"
  }
}
```

## 3. Property-Based Oracle

Invariants over generated inputs; shrink failing cases.

```typescript
import fc from 'fast-check';

it('ConfigBuilder__ArbitraryInputs__SatisfiesInvariants', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 64 }),
      (skillName) => {
        const spec = { name: skillName, type: 'test' };
        const builder = new ConfigBuilder(context, spec);
        const config = builder.buildSync();
        
        // Invariant: config always has required fields
        expect(config).toHaveProperty('property1');
        expect(config.property1).toBeDefined();
      }
    ),
    { seed: 42 }
  );
});
```

**Metadata**:
```json
{
  "oracle": "property",
  "invariants": ["Config always has required fields", "No undefined values"],
  "inputs": {
    "shape": "Generated ComponentSpec with arbitrary skillName",
    "notes": "Property-based test with fast-check, seed=42"
  }
}
```

## 4. Contract/Schema Oracle

Validate against schema/protocol (JSON Schema/OpenAPI).

```typescript
import Ajv from 'ajv';

it('ComponentConfig__ValidInput__PassesSchemaValidation', () => {
  const ajv = new Ajv();
  const validate = ajv.compile(COMPONENT_CONFIG_SCHEMA);
  
  const config = { property1: 'value', property2: 100 };
  const valid = validate(config);
  
  expect(valid).toBe(true);
  expect(validate.errors).toBeNull();
});
```

**Metadata**:
```json
{
  "oracle": "contract",
  "compliance_refs": ["std://platform-configuration-standard"],
  "inputs": {
    "shape": "ComponentConfig object",
    "notes": "JSON Schema validation using Ajv"
  }
}
```

## 5. Metamorphic Oracle

Relationships between inputs/outputs (parse⟷serialize stability).

```typescript
it('ManifestParser__RoundTrip__PreservesStructure', () => {
  const original = { service: 'test', components: [{ name: 'comp1', type: 'lambda' }] };
  
  const yaml = yamlDump(original);
  const parsed = yamlLoad(yaml);
  
  // Metamorphic property: parse(yamlDump(x)) ≈ x
  expect(parsed).toEqual(original);
});
```

**Metadata**:
```json
{
  "oracle": "metamorphic",
  "invariants": ["parse(yamlDump(x)) ≈ x"],
  "inputs": {
    "shape": "Service manifest object",
    "notes": "Round-trip serialization stability"
  }
}
```

## 6. Behavioral Trace Oracle

Observable side effects occurred without coupling to call graphs.

```typescript
it('ComponentSynthesis__TagsApplied__CreatesTaggedResources', () => {
  const component = new MyServiceComponent(stack, 'Test', context, spec);
  component.synth();
  
  const template = Template.fromStack(stack);
  
  // Behavioral trace: verify tags were applied (observable side effect)
  template.hasResourceProperties('AWS::ECS::Service', {
    Tags: Match.arrayWith([
      Match.objectLike({ Key: 'service-name', Value: 'test-service' })
    ])
  });
});
```

**Metadata**:
```json
{
  "oracle": "trace",
  "invariants": ["Tags applied to all resources"],
  "compliance_refs": ["std://platform-tagging-standard"],
  "inputs": {
    "shape": "ComponentSpec with service context",
    "notes": "Verifies observable side effects (tags) without coupling to implementation"
  }
}
```

## Oracle Selection Guide

- **Exact**: Use when output is deterministic and you want precise comparison
- **Snapshot**: Use for complex structures (CloudFormation templates, large configs) - requires masks
- **Property**: Use when you want to test invariants across many inputs
- **Contract**: Use when validating against schemas or protocols
- **Metamorphic**: Use when testing transformations that should be reversible or preserve properties
- **Trace**: Use when verifying observable side effects without coupling to implementation

## Anti-Pattern: Mixing Oracles

**❌ FORBIDDEN**: Mixing multiple primary oracles in the same test:

```typescript
// ❌ BAD: Mixing snapshot and contract
it('Test', () => {
  expect(result).toMatchSnapshot(); // Snapshot oracle
  expect(ajv.validate(schema, result)).toBe(true); // Contract oracle
});
```

**✅ CORRECT**: One primary oracle per test:

```typescript
// ✅ GOOD: Single snapshot oracle
it('Test__Snapshot', () => {
  expect(result).toMatchSnapshot();
});

// ✅ GOOD: Single contract oracle
it('Test__Schema', () => {
  expect(ajv.validate(schema, result)).toBe(true);
});
```

