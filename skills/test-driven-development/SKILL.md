---
name: test-driven-development
description: Guides the Test-Driven Development (TDD) workflow following the Red-Green-Refactor cycle. Ensures all tests comply with Platform Testing Standard (PTS-1.0), including metadata sidecars, naming conventions, determinism, and oracle selection. Use when writing new code, refactoring existing code, or when the user requests TDD practices.
compatibility: Requires access to test files, source code, and platform testing standard documentation. Works with Vitest, Jest, and other test frameworks. Designed for use in the Shinobi platform codebase.
metadata:
  author: shinobi-platform
  version: "1.0"
license: Apache-2.0
---

# test-driven-development

<!-- Degrees of Freedom: Medium - Structured TDD workflow with flexibility for different scenarios -->

## Instructions

### TDD Workflow: Red-Green-Refactor

Follow the classic TDD cycle with Platform Testing Standard (PTS-1.0) compliance:

1. **🔴 RED**: Write a failing test first
   - Test must follow `Feature__Condition__ExpectedOutcome` naming
   - Create metadata sidecar (`.meta.json`) with all required fields
   - Choose appropriate oracle (exact, snapshot, contract, property, metamorphic, trace)
   - Ensure determinism (clock/RNG/I/O control)
   - Test should fail for the right reason (not compilation errors)

2. **🟢 GREEN**: Write minimal code to make the test pass
   - Write the simplest implementation that satisfies the test
   - Avoid over-engineering at this stage
   - Run tests to confirm they pass

3. **🔵 REFACTOR**: Improve code quality while keeping tests green
   - Improve design, readability, performance
   - Remove duplication
   - Ensure all tests remain passing
   - Update metadata if behavior changes

### Test-First Principles

**When to Write Tests First:**
- New features or functionality
- Bug fixes (write test that reproduces bug first)
- Refactoring (ensure tests exist before refactoring)
- API design (tests define the contract)

**When Tests May Follow:**
- Exploratory/spike work (add tests after understanding)
- Legacy code without tests (add tests incrementally)
- Complex integrations (may need integration tests after unit tests)

### Test Structure (PTS-1.0 Compliant)

Every test must include:

1. **Metadata Sidecar** (`.meta.json` or `.meta.yaml`):
   ```json
   {
     "id": "TP-<service>-<feature>-NNN",
     "level": "unit|integration|e2e",
     "capability": "Short behavior description",
     "oracle": "exact|snapshot|contract|property|metamorphic|trace",
     "invariants": ["Property that must hold"],
     "fixtures": ["fixture-name"],
     "inputs": { "shape": "Input description", "notes": "" },
     "risks": [],
     "dependencies": [],
     "evidence": [],
     "compliance_refs": [],
     "ai_generated": false,
     "human_reviewed_by": ""
   }
   ```

2. **Test Naming**: `Feature__Condition__ExpectedOutcome`
   - Example: `CalculateTotal__WithEmptyCart__ReturnsZero`
   - Example: `ValidateEmail__WithInvalidFormat__ThrowsError`

3. **Determinism Setup**:
   - Freeze clock: `vi.useFakeTimers()` or inject clock
   - Seed RNG: `Math.random = () => 0.5` or use seeded generator
   - Mock I/O: Use in-memory fakes or hermetic sandboxes
   - Restore after: `afterEach(() => { vi.restoreAllMocks() })`

4. **Single Oracle**: One primary oracle per test
   - Exact: `expect(result).toBe(expected)`
   - Snapshot: `expect(result).toMatchSnapshot()`
   - Contract: `expect(result).toMatchSchema(schema)`
   - Property: `expect(property).toHoldForAll(inputs)`
   - Metamorphic: `expect(roundTrip(input)).toBe(input)`
   - Trace: `expect(events).toContainEqual(expectedEvent)`

### TDD Patterns

#### Pattern 1: Simple Function TDD

```typescript
// 1. RED: Write failing test
describe('calculateTotal', () => {
  it('CalculateTotal__WithEmptyArray__ReturnsZero', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

// 2. GREEN: Minimal implementation
function calculateTotal(items: number[]): number {
  return 0; // Simplest that passes
}

// 3. REFACTOR: Add more tests, improve implementation
it('CalculateTotal__WithSingleItem__ReturnsItemValue', () => {
  expect(calculateTotal([5])).toBe(5);
});

function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
```

#### Pattern 2: Component TDD

```typescript
// 1. RED: Test component behavior
describe('MyComponent', () => {
  it('Render__WithValidProps__DisplaysContent', () => {
    const { getByText } = render(<MyComponent title="Test" />);
    expect(getByText('Test')).toBeInTheDocument();
  });
});

// 2. GREEN: Minimal component
function MyComponent({ title }: { title: string }) {
  return <div>{title}</div>;
}

// 3. REFACTOR: Improve structure, add edge cases
```

#### Pattern 3: Error Handling TDD

```typescript
// 1. RED: Test error case first
it('ValidateEmail__WithInvalidFormat__ThrowsError', () => {
  expect(() => validateEmail('invalid')).toThrow('Invalid email format');
});

// 2. GREEN: Implement validation
function validateEmail(email: string): void {
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
}

// 3. REFACTOR: Improve validation logic
```

### TDD Checklist

Before writing production code:

- [ ] Test file created with proper naming
- [ ] Metadata sidecar created with all required fields
- [ ] Test follows `Feature__Condition__ExpectedOutcome` naming
- [ ] Determinism setup (clock/RNG/I/O control)
- [ ] Single oracle selected and used
- [ ] Test fails for the right reason (not compilation)
- [ ] Test is minimal and focused (one behavior)

After writing production code:

- [ ] Test passes
- [ ] Code is minimal (simplest that works)
- [ ] No duplication introduced
- [ ] All existing tests still pass

During refactoring:

- [ ] All tests remain green
- [ ] Code quality improved
- [ ] Metadata updated if behavior changes
- [ ] No new tests needed (behavior unchanged)

### Integration with Platform Testing Standard

**Always use `platform-testing-reviewer` skill** after writing tests to ensure PTS-1.0 compliance:

1. Write test following TDD workflow
2. Run `platform-testing-reviewer` to validate compliance
3. Fix any violations (metadata, naming, determinism, oracle)
4. Continue TDD cycle

### Test Coverage Strategy

**TDD naturally leads to high coverage**, but follow these guidelines:

- **Unit Tests**: Write first (TDD cycle)
- **Integration Tests**: Add after unit tests pass
- **E2E Tests**: Add for critical user journeys
- **Coverage Target**: 90% statements, 80% branches (per Platform Testing Standard)

### Edge Cases & Negative Tests

**Include in TDD cycle:**

- Boundary values (empty, null, zero, max)
- Invalid inputs (malformed, wrong type)
- Error conditions (network failures, timeouts)
- Security cases (unauthorized access, injection)

**Example:**
```typescript
// RED: Test boundary case
it('CalculateTotal__WithNegativeValue__ThrowsError', () => {
  expect(() => calculateTotal([-1])).toThrow('Negative values not allowed');
});

// GREEN: Add validation
function calculateTotal(items: number[]): number {
  if (items.some(item => item < 0)) {
    throw new Error('Negative values not allowed');
  }
  return items.reduce((sum, item) => sum + item, 0);
}
```

## Execution Patterns

### Pattern 1: New Feature TDD

1. **Analyze**: Understand requirements, identify test cases
2. **RED**: Write failing test with metadata
3. **GREEN**: Implement minimal code
4. **REFACTOR**: Improve design
5. **Repeat**: Add next test case
6. **Validate**: Run `platform-testing-reviewer`

### Pattern 2: Bug Fix TDD

1. **RED**: Write test that reproduces the bug
2. **GREEN**: Fix the bug (test should pass)
3. **REFACTOR**: Improve fix if needed
4. **Validate**: Ensure no regressions

### Pattern 3: Refactoring TDD

1. **Ensure**: Tests exist for current behavior
2. **REFACTOR**: Improve code structure
3. **Verify**: All tests remain green
4. **Add**: Tests for new edge cases if needed

### Pattern 4: Component TDD

1. **RED**: Test component behavior (not implementation)
2. **GREEN**: Implement component
3. **REFACTOR**: Improve component structure
4. **Add**: Integration tests for component interactions

## Examples

### Example 1: TDD for a Utility Function

**Request**: "Create a function that validates email addresses"

**TDD Process**:

1. **RED**: Write failing test
```typescript
// email-validator.test.ts
describe('validateEmail', () => {
  it('ValidateEmail__WithValidFormat__ReturnsTrue', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
});
```

2. **GREEN**: Minimal implementation
```typescript
// email-validator.ts
export function validateEmail(email: string): boolean {
  return email.includes('@');
}
```

3. **REFACTOR**: Add more tests, improve
```typescript
it('ValidateEmail__WithInvalidFormat__ReturnsFalse', () => {
  expect(validateEmail('invalid')).toBe(false);
});

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Example 2: TDD for a Component

**Request**: "Create a button component that shows loading state"

**TDD Process**:

1. **RED**: Test component behavior
```typescript
it('Button__WhenLoading__ShowsSpinner', () => {
  const { getByRole } = render(<Button loading>Click</Button>);
  expect(getByRole('status')).toBeInTheDocument();
});
```

2. **GREEN**: Implement component
```typescript
function Button({ loading, children }: ButtonProps) {
  return (
    <button disabled={loading}>
      {loading && <span role="status">Loading...</span>}
      {children}
    </button>
  );
}
```

3. **REFACTOR**: Improve accessibility, styling

### Example 3: TDD for Error Handling

**Request**: "Add validation to prevent negative numbers"

**TDD Process**:

1. **RED**: Test error case
```typescript
it('CalculateTotal__WithNegativeValue__ThrowsError', () => {
  expect(() => calculateTotal([-1])).toThrow('Negative values not allowed');
});
```

2. **GREEN**: Add validation
```typescript
function calculateTotal(items: number[]): number {
  if (items.some(item => item < 0)) {
    throw new Error('Negative values not allowed');
  }
  return items.reduce((sum, item) => sum + item, 0);
}
```

3. **REFACTOR**: Improve error message, add more validation

## Bundled Resources

- **Scripts**: Use `scripts/` for TDD workflow automation
- **References**: Load `references/` files for detailed TDD patterns, PTS-1.0 integration, and examples
- **Assets**: Use `assets/` for test templates and metadata schemas

## Edge Cases

- **Legacy Code**: When working with untested legacy code, add tests incrementally before refactoring
- **Complex Dependencies**: Use test doubles (mocks, stubs, fakes) to isolate units under test
- **Async Code**: Use async/await patterns and proper timing controls in tests
- **Stateful Code**: Ensure determinism with proper setup/teardown and state isolation
- **AI-Generated Tests**: Must have `ai_generated=true` and `human_reviewed_by` in metadata

## Checklist of Truth

When practicing TDD, follow this checklist:

| Step | Check | Outcome |
|------|-------|---------|
| **1. Test First** | Did you write the test before code? | **FAIL** if code written first |
| **2. Test Fails** | Does the test fail for the right reason? | **FAIL** if compilation error |
| **3. Minimal Code** | Is the implementation the simplest that works? | **WARN** if over-engineered |
| **4. Tests Pass** | Do all tests pass after implementation? | **FAIL** if any test fails |
| **5. PTS Compliance** | Does test have metadata and follow naming? | **FAIL** if missing metadata |
| **6. Refactor** | Did you improve code quality? | **WARN** if skipped |

## Additional Resources

- See `references/TDD_PATTERNS.md` for detailed TDD patterns and examples
- See `references/PTS_INTEGRATION.md` for Platform Testing Standard integration guide
- See `references/TEST_ORACLES.md` for oracle selection guide
- See `references/DETERMINISM_GUIDE.md` for determinism setup patterns
- Use `scripts/generate-test-template.sh` to scaffold PTS-1.0 compliant test files
- Use `scripts/validate-tdd-workflow.sh` to validate TDD workflow compliance
- Always use `platform-testing-reviewer` skill after writing tests


