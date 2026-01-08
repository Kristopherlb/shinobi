# Platform Testing Standard (PTS-1.0) Integration Guide

This guide explains how to integrate TDD practices with the Platform Testing Standard (PTS-1.0).

## Overview

The Platform Testing Standard (PTS-1.0) defines requirements for all tests in the Shinobi platform. When practicing TDD, you must ensure all tests comply with PTS-1.0 from the start.

## Key PTS-1.0 Requirements

### 1. Test Metadata Sidecar

**REQUIRED**: Every test file MUST have an adjacent metadata sidecar (`.meta.json`, `.meta.yaml`, or `.meta.yml`).

**TDD Integration:**
- Create metadata sidecar in the **RED phase** (before writing the test)
- Update metadata in the **REFACTOR phase** if behavior changes

**Example:**
```json
{
  "id": "TP-my-service-calculate-001",
  "level": "unit",
  "capability": "Calculate total from array of numbers",
  "oracle": "exact",
  "invariants": ["Result is always a number", "Empty array returns 0"],
  "fixtures": [],
  "inputs": { "shape": "number[]", "notes": "Array of numbers to sum" },
  "risks": [],
  "dependencies": [],
  "evidence": [],
  "compliance_refs": [],
  "ai_generated": false,
  "human_reviewed_by": ""
}
```

### 2. Naming Convention

**REQUIRED**: Tests must follow `Feature__Condition__ExpectedOutcome` format.

**TDD Integration:**
- Use this naming convention in the **RED phase**
- Example: `CalculateTotal__WithEmptyArray__ReturnsZero`

### 3. Determinism

**REQUIRED**: Tests must be deterministic (clock/RNG/I/O control).

**TDD Integration:**
- Set up determinism in the **RED phase** (before writing test)
- Use `vi.useFakeTimers()` for time
- Seed RNG: `Math.random = () => 0.5`
- Mock I/O operations

**Example:**
```typescript
describe('TimeBasedFunction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  
  it('TimeBasedFunction__AtMidnight__ReturnsSpecialValue', () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    expect(timeBasedFunction()).toBe('midnight');
  });
});
```

### 4. Single Oracle

**REQUIRED**: One primary oracle per test.

**TDD Integration:**
- Choose oracle in the **RED phase**
- Don't mix oracles (e.g., don't use both snapshot and exact assertions)

**Oracle Types:**
- **Exact**: `expect(result).toBe(expected)`
- **Snapshot**: `expect(result).toMatchSnapshot()`
- **Contract**: `expect(result).toMatchSchema(schema)`
- **Property**: `expect(property).toHoldForAll(inputs)`
- **Metamorphic**: `expect(roundTrip(input)).toBe(input)`
- **Trace**: `expect(events).toContainEqual(expectedEvent)`

### 5. Test Structure

**REQUIRED**: One behavior per test, one primary assertion.

**TDD Integration:**
- Write focused tests in the **RED phase**
- Each test should verify one specific behavior

---

## TDD Workflow with PTS-1.0

### Step 1: RED - Write Failing Test (PTS-1.0 Compliant)

1. **Create metadata sidecar** (`.meta.json`)
   - Set `id`: `TP-<service>-<feature>-NNN`
   - Set `level`: `unit`, `integration`, or `e2e`
   - Set `oracle`: Choose appropriate oracle type
   - Set `capability`: Describe what the test verifies

2. **Write test with proper naming**
   - Use `Feature__Condition__ExpectedOutcome` format
   - Example: `CalculateTotal__WithEmptyArray__ReturnsZero`

3. **Set up determinism**
   - Freeze clock if needed
   - Seed RNG if needed
   - Mock I/O if needed

4. **Choose single oracle**
   - Use exact, snapshot, contract, property, metamorphic, or trace
   - Don't mix oracles

5. **Write minimal test**
   - One behavior per test
   - One primary assertion

### Step 2: GREEN - Make Test Pass

1. **Write minimal code** to make test pass
2. **Run test** to verify it passes
3. **Don't worry about PTS-1.0** in this phase (already compliant from RED)

### Step 3: REFACTOR - Improve Code

1. **Improve code quality** while keeping tests green
2. **Update metadata** if behavior changes
3. **Add more tests** for edge cases (following RED-GREEN-REFACTOR)

---

## Using platform-testing-reviewer

**ALWAYS** use the `platform-testing-reviewer` skill after writing tests to ensure PTS-1.0 compliance:

1. Write test following TDD workflow
2. Run `platform-testing-reviewer` to validate compliance
3. Fix any violations (metadata, naming, determinism, oracle)
4. Continue TDD cycle

---

## Example: Complete TDD Cycle with PTS-1.0

### RED Phase

**1. Create metadata sidecar** (`calculate-total.test.meta.json`):
```json
{
  "id": "TP-calculator-total-001",
  "level": "unit",
  "capability": "Calculate sum of numbers in array",
  "oracle": "exact",
  "invariants": ["Result is always a number", "Empty array returns 0"],
  "fixtures": [],
  "inputs": { "shape": "number[]", "notes": "Array of numbers" },
  "risks": [],
  "dependencies": [],
  "evidence": [],
  "compliance_refs": [],
  "ai_generated": false,
  "human_reviewed_by": ""
}
```

**2. Write test** (`calculate-total.test.ts`):
```typescript
describe('calculateTotal', () => {
  it('CalculateTotal__WithEmptyArray__ReturnsZero', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

**3. Test fails** (function doesn't exist yet)

### GREEN Phase

**1. Write minimal implementation**:
```typescript
function calculateTotal(items: number[]): number {
  return 0;
}
```

**2. Test passes** ✅

### REFACTOR Phase

**1. Add more tests** (following RED-GREEN-REFACTOR):
```typescript
it('CalculateTotal__WithSingleItem__ReturnsItemValue', () => {
  expect(calculateTotal([5])).toBe(5);
});

it('CalculateTotal__WithMultipleItems__ReturnsSum', () => {
  expect(calculateTotal([1, 2, 3])).toBe(6);
});
```

**2. Improve implementation**:
```typescript
function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
```

**3. All tests pass** ✅

**4. Run platform-testing-reviewer** to validate PTS-1.0 compliance ✅

---

## Checklist

When practicing TDD with PTS-1.0:

- [ ] Metadata sidecar created in RED phase
- [ ] Test follows `Feature__Condition__ExpectedOutcome` naming
- [ ] Determinism set up (clock/RNG/I/O control)
- [ ] Single oracle selected and used
- [ ] One behavior per test
- [ ] Test fails for the right reason (not compilation)
- [ ] Minimal code in GREEN phase
- [ ] All tests pass after implementation
- [ ] Metadata updated in REFACTOR if behavior changes
- [ ] platform-testing-reviewer validates compliance

---

## References

- [Platform Testing Standard](../../../../docs/platform-standards/platform-testing-standard.md)
- [platform-testing-reviewer skill](../platform-testing-reviewer/SKILL.md)

