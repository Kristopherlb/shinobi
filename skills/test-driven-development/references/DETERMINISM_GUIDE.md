# Determinism Setup Guide

This guide explains how to set up determinism in TDD tests to comply with PTS-1.0.

## Overview

Tests must be deterministic - they must produce the same results every time they run. This requires controlling:
- **Clock**: Time-based operations
- **Randomness**: Random number generation
- **I/O**: File system, network, database operations
- **Environment**: Environment variables, feature flags

---

## Clock Control

### Problem
Time-based operations (e.g., `new Date()`, `setTimeout`) produce different results each run.

### Solution: Use Fake Timers

**Vitest:**
```typescript
import { vi } from 'vitest';

describe('TimeBasedFunction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('TimeBasedFunction__AtSpecificTime__ReturnsExpected', () => {
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    expect(timeBasedFunction()).toBe('noon');
  });
});
```

**Jest:**
```typescript
jest.useFakeTimers();

it('TimeBasedFunction__AtSpecificTime__ReturnsExpected', () => {
  jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));
  expect(timeBasedFunction()).toBe('noon');
});

afterEach(() => {
  jest.useRealTimers();
});
```

### Common Patterns

**Testing Delays:**
```typescript
it('DelayedFunction__AfterDelay__Executes', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  
  delayedFunction(callback, 1000);
  expect(callback).not.toHaveBeenCalled();
  
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
  
  vi.useRealTimers();
});
```

**Testing Intervals:**
```typescript
it('IntervalFunction__EverySecond__ExecutesMultipleTimes', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  
  setInterval(callback, 1000);
  
  vi.advanceTimersByTime(3000);
  expect(callback).toHaveBeenCalledTimes(3);
  
  vi.useRealTimers();
});
```

---

## Randomness Control

### Problem
Random number generation produces different results each run.

### Solution: Seed RNG or Use Deterministic Generator

**Option 1: Mock Math.random**
```typescript
describe('RandomFunction', () => {
  beforeEach(() => {
    // Seed Math.random to return predictable values
    Math.random = vi.fn(() => 0.5);
  });
  
  afterEach(() => {
    Math.random = Math.random; // Restore original
  });
  
  it('RandomFunction__WithSeededRNG__ReturnsDeterministicValue', () => {
    expect(randomFunction()).toBe(0.5);
  });
});
```

**Option 2: Use Seeded Random Generator**
```typescript
import seedrandom from 'seedrandom';

describe('RandomFunction', () => {
  it('RandomFunction__WithSeededRNG__ReturnsDeterministicValue', () => {
    const rng = seedrandom('test-seed');
    const result = randomFunction(rng);
    expect(result).toBe(0.123456789); // Deterministic with seed
  });
});
```

**Option 3: Inject RNG**
```typescript
function randomFunction(rng: () => number = Math.random): number {
  return rng();
}

it('RandomFunction__WithMockRNG__ReturnsMockedValue', () => {
  const mockRng = vi.fn(() => 0.5);
  expect(randomFunction(mockRng)).toBe(0.5);
});
```

---

## I/O Control

### Problem
File system, network, and database operations are non-deterministic and slow.

### Solution: Use Mocks, Fakes, or In-Memory Alternatives

**File System:**
```typescript
import { vi } from 'vitest';
import { readFileSync } from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

it('ReadConfig__WithValidFile__ReturnsConfig', () => {
  (readFileSync as any).mockReturnValue('{"key": "value"}');
  expect(readConfig('config.json')).toEqual({ key: 'value' });
});
```

**Network:**
```typescript
import { vi } from 'vitest';

global.fetch = vi.fn();

it('FetchData__WithValidURL__ReturnsData', async () => {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });
  
  const result = await fetchData('https://api.example.com/data');
  expect(result).toEqual({ data: 'test' });
});
```

**Database:**
```typescript
import { vi } from 'vitest';

const mockDb = {
  save: vi.fn(),
  find: vi.fn(),
};

it('SaveUser__WithValidData__CallsDbSave', async () => {
  await saveUser(mockDb, { name: 'John' });
  expect(mockDb.save).toHaveBeenCalledWith({ name: 'John' });
});
```

**In-Memory Alternatives:**
```typescript
// Use in-memory database for tests
import { Database } from 'better-sqlite3';

it('DatabaseOperation__WithInMemoryDb__Works', () => {
  const db = new Database(':memory:'); // In-memory SQLite
  // ... test operations
  db.close();
});
```

---

## Environment Control

### Problem
Environment variables and feature flags can change test behavior.

### Solution: Restore Environment After Each Test

**Vitest:**
```typescript
describe('EnvironmentDependentFunction', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  it('Function__WithFeatureFlag__BehavesDifferently', () => {
    process.env.FEATURE_FLAG = 'enabled';
    expect(functionWithFeatureFlag()).toBe('new behavior');
  });
});
```

**Jest:**
```typescript
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});
```

---

## Complete Example

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ComplexFunction', () => {
  // Store original values
  const originalDate = Date;
  const originalRandom = Math.random;
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Freeze clock
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    
    // Seed RNG
    Math.random = vi.fn(() => 0.5);
    
    // Reset environment
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    // Restore clock
    vi.useRealTimers();
    
    // Restore RNG
    Math.random = originalRandom;
    
    // Restore environment
    process.env = originalEnv;
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  it('ComplexFunction__WithDeterministicSetup__ReturnsExpected', () => {
    const result = complexFunction();
    expect(result).toBe('expected-value');
  });
});
```

---

## Checklist

When setting up determinism:

- [ ] Clock frozen/injected (no `new Date()` without control)
- [ ] RNG seeded (no `Math.random()` without control)
- [ ] I/O mocked/faked (no real file/network/database access)
- [ ] Environment restored (no cross-test leakage)
- [ ] Mocks cleared (no state between tests)
- [ ] Test is repeatable (same inputs → same outputs)

---

## Common Pitfalls

1. **Forgetting to restore** - Always restore in `afterEach`
2. **Leaking state** - Clear mocks between tests
3. **Real I/O in tests** - Always mock file/network/database
4. **Time-dependent tests** - Always control time
5. **Random in tests** - Always seed or mock randomness

---

## References

- [Platform Testing Standard - Determinism](../../../../docs/platform-standards/platform-testing-standard.md#6-fixtures-isolation--determinism)
- [platform-testing-reviewer - Determinism Check](../platform-testing-reviewer/scripts/check-determinism.sh)

