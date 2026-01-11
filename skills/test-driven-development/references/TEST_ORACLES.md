# Test Oracle Selection Guide

This guide helps you choose the appropriate oracle type for your TDD tests.

## Oracle Types

### 1. Exact Oracle

**When to Use:**
- Deterministic output with known expected value
- Simple value comparisons
- Most common for unit tests

**Example:**
```typescript
it('CalculateTotal__WithTwoItems__ReturnsSum', () => {
  expect(calculateTotal([1, 2])).toBe(3); // Exact value
});
```

**Metadata:**
```json
{
  "oracle": "exact"
}
```

---

### 2. Snapshot Oracle

**When to Use:**
- Complex data structures
- UI components
- Output that's hard to specify exactly
- **REQUIRED**: Must include `mask_rules` for volatile fields

**Example:**
```typescript
it('RenderComponent__WithProps__MatchesSnapshot', () => {
  const { container } = render(<MyComponent name="Test" />);
  expect(container).toMatchSnapshot();
});
```

**Metadata:**
```json
{
  "oracle": "snapshot",
  "inputs": {
    "notes": "Mask: timestamp, id, uuid"
  }
}
```

**Mask Rules:**
- Timestamps: `timestamp`, `created_at`, `updated_at`
- IDs: `id`, `uuid`, `guid`
- Hashes: `hash`, `checksum`, `digest`
- ARNs: `arn`, `resource_arn`

---

### 3. Contract Oracle

**When to Use:**
- API responses
- Data structures with schemas
- JSON Schema validation
- OpenAPI contract validation

**Example:**
```typescript
it('FetchUser__WithValidId__ReturnsValidUserSchema', () => {
  const user = await fetchUser('123');
  expect(user).toMatchSchema(userSchema);
});
```

**Metadata:**
```json
{
  "oracle": "contract",
  "compliance_refs": ["api-contract-v1.0"]
}
```

---

### 4. Property Oracle

**When to Use:**
- Invariants that must hold for all inputs
- Property-based testing
- Generated test cases

**Example:**
```typescript
it('CalculateTotal__WithAnyInput__ResultIsNumber', () => {
  const inputs = generateRandomArrays();
  inputs.forEach(arr => {
    const result = calculateTotal(arr);
    expect(typeof result).toBe('number');
  });
});
```

**Metadata:**
```json
{
  "oracle": "property",
  "invariants": ["Result is always a number"]
}
```

---

### 5. Metamorphic Oracle

**When to Use:**
- Round-trip operations
- Reversible transformations
- Idempotent operations

**Example:**
```typescript
it('ParseAndSerialize__WithValidJSON__ReturnsOriginal', () => {
  const original = { name: 'Test', value: 123 };
  const serialized = serialize(original);
  const parsed = parse(serialized);
  expect(parsed).toEqual(original); // Round-trip
});
```

**Metadata:**
```json
{
  "oracle": "metamorphic",
  "invariants": ["parse(serialize(x)) === x"]
}
```

---

### 6. Trace Oracle

**When to Use:**
- Observable side effects
- Event sequences
- Logging/auditing
- Behavioral verification without coupling to implementation

**Example:**
```typescript
it('ProcessOrder__WithValidOrder__EmitsOrderProcessedEvent', () => {
  const events: Event[] = [];
  orderProcessor.on('orderProcessed', (e) => events.push(e));
  
  orderProcessor.processOrder({ id: '123', items: [] });
  
  expect(events).toContainEqual(
    expect.objectContaining({ type: 'orderProcessed', orderId: '123' })
  );
});
```

**Metadata:**
```json
{
  "oracle": "trace",
  "invariants": ["orderProcessed event is emitted"]
}
```

---

## Decision Tree

```
Is the output deterministic and known?
├─ YES → Use Exact Oracle
└─ NO → Is it a complex data structure?
    ├─ YES → Use Snapshot Oracle (with mask_rules)
    └─ NO → Does it need schema validation?
        ├─ YES → Use Contract Oracle
        └─ NO → Is it a round-trip operation?
            ├─ YES → Use Metamorphic Oracle
            └─ NO → Are you testing invariants?
                ├─ YES → Use Property Oracle
                └─ NO → Are you testing side effects?
                    ├─ YES → Use Trace Oracle
                    └─ NO → Reconsider your test approach
```

---

## Rules

1. **One Primary Oracle Per Test** - Don't mix oracles
2. **Snapshot Tests Must Have Mask Rules** - Mask volatile fields
3. **Choose Simplest Oracle** - Use exact when possible
4. **Document Oracle Choice** - Include in metadata

---

## Examples by Scenario

### Scenario 1: Simple Calculation

**Oracle:** Exact
```typescript
expect(calculateTotal([1, 2, 3])).toBe(6);
```

### Scenario 2: Component Rendering

**Oracle:** Snapshot (with masks)
```typescript
expect(container).toMatchSnapshot();
// Mask: timestamp, id, uuid
```

### Scenario 3: API Response

**Oracle:** Contract
```typescript
expect(response).toMatchSchema(apiResponseSchema);
```

### Scenario 4: Round-Trip Operation

**Oracle:** Metamorphic
```typescript
expect(parse(serialize(data))).toEqual(data);
```

### Scenario 5: Event Emission

**Oracle:** Trace
```typescript
expect(events).toContainEqual(expectedEvent);
```

---

## References

- [Platform Testing Standard - Oracles](../../../../docs/platform-standards/platform-testing-standard.md#5-oracles)
- [platform-testing-reviewer - Oracle Guide](../platform-testing-reviewer/references/ORACLE_GUIDE.md)


