# TDD Patterns Guide

This document provides detailed TDD patterns and examples for common scenarios.

## Table of Contents

1. [Simple Function TDD](#simple-function-tdd)
2. [Component TDD](#component-tdd)
3. [Error Handling TDD](#error-handling-tdd)
4. [Async Code TDD](#async-code-tdd)
5. [Stateful Code TDD](#stateful-code-tdd)
6. [Integration TDD](#integration-tdd)

---

## Simple Function TDD

### Pattern: Pure Function

**RED Phase:**
```typescript
describe('calculateTotal', () => {
  it('CalculateTotal__WithEmptyArray__ReturnsZero', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

**GREEN Phase:**
```typescript
function calculateTotal(items: number[]): number {
  return 0; // Simplest that passes
}
```

**REFACTOR Phase:**
```typescript
it('CalculateTotal__WithSingleItem__ReturnsItemValue', () => {
  expect(calculateTotal([5])).toBe(5);
});

it('CalculateTotal__WithMultipleItems__ReturnsSum', () => {
  expect(calculateTotal([1, 2, 3])).toBe(6);
});

function calculateTotal(items: number[]): number {
  return items.reduce((sum, item) => sum + item, 0);
}
```

---

## Component TDD

### Pattern: React Component

**RED Phase:**
```typescript
describe('Button', () => {
  it('Button__WhenRendered__DisplaysText', () => {
    const { getByText } = render(<Button>Click Me</Button>);
    expect(getByText('Click Me')).toBeInTheDocument();
  });
});
```

**GREEN Phase:**
```typescript
function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}
```

**REFACTOR Phase:**
```typescript
it('Button__WhenLoading__ShowsSpinner', () => {
  const { getByRole } = render(<Button loading>Click</Button>);
  expect(getByRole('status')).toBeInTheDocument();
});

function Button({ loading, children }: ButtonProps) {
  return (
    <button disabled={loading}>
      {loading && <span role="status">Loading...</span>}
      {children}
    </button>
  );
}
```

---

## Error Handling TDD

### Pattern: Validation Function

**RED Phase:**
```typescript
describe('validateEmail', () => {
  it('ValidateEmail__WithInvalidFormat__ThrowsError', () => {
    expect(() => validateEmail('invalid')).toThrow('Invalid email format');
  });
});
```

**GREEN Phase:**
```typescript
function validateEmail(email: string): void {
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
}
```

**REFACTOR Phase:**
```typescript
it('ValidateEmail__WithValidFormat__DoesNotThrow', () => {
  expect(() => validateEmail('test@example.com')).not.toThrow();
});

it('ValidateEmail__WithEmptyString__ThrowsError', () => {
  expect(() => validateEmail('')).toThrow('Email cannot be empty');
});

function validateEmail(email: string): void {
  if (!email || email.trim() === '') {
    throw new Error('Email cannot be empty');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }
}
```

---

## Async Code TDD

### Pattern: Promise-Based Function

**RED Phase:**
```typescript
describe('fetchUserData', () => {
  it('FetchUserData__WithValidId__ReturnsUserData', async () => {
    const user = await fetchUserData('123');
    expect(user).toEqual({ id: '123', name: 'John' });
  });
});
```

**GREEN Phase:**
```typescript
async function fetchUserData(id: string): Promise<User> {
  // Mock implementation
  return { id, name: 'John' };
}
```

**REFACTOR Phase:**
```typescript
it('FetchUserData__WithInvalidId__ThrowsError', async () => {
  await expect(fetchUserData('invalid')).rejects.toThrow('User not found');
});

async function fetchUserData(id: string): Promise<User> {
  if (!id || id.trim() === '') {
    throw new Error('Invalid user ID');
  }
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return response.json();
}
```

---

## Stateful Code TDD

### Pattern: State Machine

**RED Phase:**
```typescript
describe('Counter', () => {
  it('Counter__InitialState__IsZero', () => {
    const counter = new Counter();
    expect(counter.getValue()).toBe(0);
  });
});
```

**GREEN Phase:**
```typescript
class Counter {
  private value = 0;
  
  getValue(): number {
    return this.value;
  }
}
```

**REFACTOR Phase:**
```typescript
it('Counter__WhenIncremented__IncreasesByOne', () => {
  const counter = new Counter();
  counter.increment();
  expect(counter.getValue()).toBe(1);
});

class Counter {
  private value = 0;
  
  getValue(): number {
    return this.value;
  }
  
  increment(): void {
    this.value++;
  }
}
```

---

## Integration TDD

### Pattern: Service Integration

**RED Phase:**
```typescript
describe('UserService', () => {
  it('UserService__CreateUser__PersistsToDatabase', async () => {
    const service = new UserService(mockDb);
    const user = await service.createUser({ name: 'John' });
    expect(mockDb.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'John' }));
  });
});
```

**GREEN Phase:**
```typescript
class UserService {
  constructor(private db: Database) {}
  
  async createUser(data: UserData): Promise<User> {
    await this.db.save(data);
    return { id: '1', ...data };
  }
}
```

**REFACTOR Phase:**
```typescript
it('UserService__CreateUser__ReturnsUserWithId', async () => {
  const service = new UserService(mockDb);
  const user = await service.createUser({ name: 'John' });
  expect(user.id).toBeDefined();
  expect(user.name).toBe('John');
});
```

---

## Best Practices

1. **Start with the simplest test** - Test the most basic case first
2. **One behavior per test** - Each test should verify one specific behavior
3. **Test edge cases** - Include boundary values, null, empty, invalid inputs
4. **Refactor incrementally** - Don't skip the refactor phase
5. **Keep tests fast** - Use mocks for slow operations
6. **Test behavior, not implementation** - Focus on what the code does, not how

---

## Common Pitfalls

1. **Writing too much code in GREEN phase** - Keep it minimal
2. **Skipping REFACTOR phase** - Always improve code quality
3. **Testing implementation details** - Test contracts, not internals
4. **Non-deterministic tests** - Always control time, randomness, I/O
5. **Missing edge cases** - Include negative tests and boundary conditions

