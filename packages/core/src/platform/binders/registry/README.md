# Unified Binder Registry

The `UnifiedBinderRegistry` is the central registry for all unified binder strategies following design principles:
- **Dependency injection**: Strategies provided via constructor (composition root pattern)
- **No global state**: No singletons, all state is instance-based
- **Single responsibility**: Only handles strategy registration and lookup
- **Configurable**: Supports custom strategy sets per instance

## Quick Start

### Using the Factory Function (Recommended)

The easiest way to create a registry with all security strategies:

```typescript
import { createUnifiedBinderRegistry } from '@shinobi/core';

const registry = createUnifiedBinderRegistry();
// Registry now contains: KMS, Secrets Manager, Certificate, Cognito strategies
```

### Manual Registration

For more control, you can manually register strategies:

```typescript
import { UnifiedBinderRegistry } from '@shinobi/core';
import {
  KmsBinderStrategy,
  SecretsManagerBinderStrategy,
  CertificateBinderStrategy,
  CognitoUserPoolBinderStrategy
} from '@shinobi/core';

const registry = new UnifiedBinderRegistry([
  new KmsBinderStrategy(),
  new SecretsManagerBinderStrategy(),
  new CertificateBinderStrategy(),
  new CognitoUserPoolBinderStrategy()
]);
```

## Usage with ResolverEngine

The registry is designed to be injected into `ResolverEngine`:

```typescript
import { ResolverEngine, createUnifiedBinderRegistry, Logger as PlatformLogger } from '@shinobi/core';

const logger = new PlatformLogger();
const registry = createUnifiedBinderRegistry();

const resolver = new ResolverEngine({
  logger,
  binderRegistry: registry
});

const result = await resolver.synthesize(validatedConfig);
```

## Registered Security Strategies

Currently registered strategies (via `createUnifiedBinderRegistry()`):

| Strategy | Capabilities | Description |
|----------|-------------|-------------|
| **KMS** | `kms:key`, `kms:alias`, `kms:grant` | Encryption key management |
| **Secrets Manager** | `secretsmanager:secret`, `secretsmanager:rotation` | Secure credential storage and rotation |
| **Certificate (ACM)** | `certificate:acm`, `certificate:validation`, `certificate:monitoring` | TLS/SSL certificate management |
| **Cognito User Pool** | `auth:user-pool`, `auth:identity-provider` | Authentication and user management |

## API

### `findStrategy(capability: string): IUnifiedBinderStrategy | null`

Find a strategy by capability string.

```typescript
const strategy = registry.findStrategy('kms:key');
if (strategy) {
  const result = await strategy.bind(context);
}
```

### `findStrategyForBinding(sourceType: string, capability: string): IUnifiedBinderStrategy | null`

Find a strategy that can handle the given source type and capability combination.

```typescript
const strategy = registry.findStrategyForBinding('lambda-api', 'kms:key');
if (strategy) {
  const result = await strategy.bind(context);
}
```

### `hasStrategy(capability: string): boolean`

Check if a capability has a registered strategy.

### `getRegisteredCapabilities(): string[]`

Get all capability strings that have strategies registered.

### `getStrategyCount(): number`

Get the number of unique strategies (not capabilities - a strategy can handle multiple capabilities).

### `register(strategy: IUnifiedBinderStrategy): void`

Register an additional strategy (useful for custom strategies or dynamic registration).

```typescript
registry.register(new CustomBinderStrategy());
```

