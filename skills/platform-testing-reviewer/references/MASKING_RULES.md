# Snapshot Masking Rules

This document defines the masking rules required for snapshot tests to prevent flaky tests caused by volatile fields.

## Why Masking is Required

Snapshot tests compare serialized outputs against committed baselines. If the output contains volatile fields (timestamps, UUIDs, ARNs), the snapshot will change on every run, causing test failures even when the actual behavior is correct.

**Rule**: All snapshot tests MUST declare `mask_rules` in metadata and apply masks before snapshotting.

## Required Masks for Common Volatile Fields

### 1. Timestamps

**Fields to mask**:
- `timestamp`, `createdAt`, `updatedAt`, `lastModified`
- `Date`, `Time`, `DateTime`
- ISO 8601 strings: `2025-01-15T10:30:00Z`
- Unix timestamps: `1705315800`

**Example**:
```typescript
// Before masking
{
  "timestamp": "2025-01-15T10:30:00Z",
  "createdAt": 1705315800
}

// After masking
{
  "timestamp": "<TIMESTAMP>",
  "createdAt": "<TIMESTAMP>"
}
```

**Mask rule**: `"timestamp"`

### 2. UUIDs and Random IDs

**Fields to mask**:
- `uuid`, `id`, `requestId`, `traceId`, `spanId`
- `correlationId`, `transactionId`
- Any field matching pattern: `*Id`, `*UUID`, `*Guid`

**Example**:
```typescript
// Before masking
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "abc123def456"
}

// After masking
{
  "requestId": "<UUID>",
  "traceId": "<UUID>"
}
```

**Mask rule**: `"uuid"` or `"id"`

### 3. ARNs (Amazon Resource Names)

**Fields to mask**:
- `arn`, `Arn`, `resourceArn`
- Any field containing ARN pattern: `arn:aws:service:region:account:resource`
- Resource IDs that are ARN-like

**Example**:
```typescript
// Before masking
{
  "bucketArn": "arn:aws:s3:::my-bucket-123456789",
  "lambdaArn": "arn:aws:lambda:us-east-1:123456789012:function:my-function"
}

// After masking
{
  "bucketArn": "<ARN>",
  "lambdaArn": "<ARN>"
}
```

**Mask rule**: `"arn"`

### 4. Hashes and Checksums

**Fields to mask**:
- `hash`, `checksum`, `digest`, `signature`
- `md5`, `sha256`, `etag`
- Any field matching pattern: `*Hash`, `*Checksum`, `*Digest`

**Example**:
```typescript
// Before masking
{
  "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}

// After masking
{
  "etag": "<HASH>",
  "sha256": "<HASH>"
}
```

**Mask rule**: `"hash"`

### 5. Generated Names and Resource IDs

**Fields to mask**:
- Auto-generated resource names
- CloudFormation logical IDs that include random suffixes
- Dynamically generated identifiers

**Example**:
```typescript
// Before masking
{
  "logicalId": "MyResourceA1B2C3D4",
  "resourceName": "my-service-abc123def456"
}

// After masking
{
  "logicalId": "<GENERATED_NAME>",
  "resourceName": "<GENERATED_NAME>"
}
```

**Mask rule**: `"generated_name"` or `"resource_id"`

## Masking Implementation

### Vitest/Jest Snapshot Serializers

Create a custom serializer that applies masks:

```typescript
// test-serializer.ts
export const maskedSnapshotSerializer = {
  test: (val: any) => typeof val === 'object' && val !== null,
  print: (val: any, serialize: any) => {
    const masked = applyMasks(val, [
      'timestamp',
      'uuid',
      'arn',
      'hash',
      'generated_name'
    ]);
    return serialize(masked);
  }
};

expect.addSnapshotSerializer(maskedSnapshotSerializer);
```

### Mask Application Function

```typescript
function applyMasks(obj: any, maskRules: string[]): any {
  if (Array.isArray(obj)) {
    return obj.map(item => applyMasks(item, maskRules));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key matches any mask rule
      if (maskRules.some(rule => {
        if (rule === 'timestamp') {
          return /timestamp|date|time|created|updated|modified/i.test(key);
        }
        if (rule === 'uuid') {
          return /uuid|id|requestid|traceid|spanid|correlationid/i.test(key);
        }
        if (rule === 'arn') {
          return /arn/i.test(key) || (typeof value === 'string' && value.startsWith('arn:aws:'));
        }
        if (rule === 'hash') {
          return /hash|checksum|digest|md5|sha256|etag/i.test(key);
        }
        if (rule === 'generated_name') {
          return /name|id/i.test(key) && typeof value === 'string' && /[a-f0-9]{8,}/i.test(value);
        }
        return false;
      })) {
        masked[key] = `<${maskRules.find(r => matchesRule(key, value, r))?.toUpperCase() || 'MASKED'}>`;
      } else {
        masked[key] = applyMasks(value, maskRules);
      }
    }
    return masked;
  }
  
  return obj;
}
```

## Metadata Declaration

Always declare `mask_rules` in test metadata:

```json
{
  "id": "TP-component-synthesis-001",
  "oracle": "snapshot",
  "mask_rules": ["timestamp", "uuid", "arn", "hash"],
  "inputs": {
    "shape": "CloudFormation template",
    "notes": "Masks applied: timestamp, uuid, arn, hash"
  }
}
```

## Common Masking Patterns by Test Type

### CloudFormation Template Snapshots

**Required masks**: `["timestamp", "arn", "hash", "generated_name"]`

```json
{
  "mask_rules": ["timestamp", "arn", "hash", "generated_name"]
}
```

### Component Config Snapshots

**Required masks**: `["timestamp", "uuid"]`

```json
{
  "mask_rules": ["timestamp", "uuid"]
}
```

### Log Output Snapshots

**Required masks**: `["timestamp", "uuid", "traceId", "spanId"]`

```json
{
  "mask_rules": ["timestamp", "uuid", "traceId", "spanId"]
}
```

### API Response Snapshots

**Required masks**: `["timestamp", "requestId", "etag"]`

```json
{
  "mask_rules": ["timestamp", "requestId", "etag"]
}
```

## Validation

The `validate-test-metadata.sh` script checks that:
1. If `oracle="snapshot"`, `mask_rules` array is present and non-empty
2. Common volatile fields are covered by mask rules

## Best Practices

1. **Be Specific**: List exact fields you're masking, not just generic rules
2. **Document in Notes**: Include masking details in `inputs.notes`
3. **Test Your Masks**: Verify masks work by running tests twice and ensuring snapshots match
4. **Update on Changes**: When adding new volatile fields, update mask_rules
5. **Use Consistent Placeholders**: Use `<TIMESTAMP>`, `<UUID>`, `<ARN>`, `<HASH>` format

## Anti-Patterns

### ❌ Don't Mask Everything

```typescript
// ❌ BAD: Masking all fields
mask_rules: ["*"] // Too broad, loses test value
```

### ❌ Don't Forget to Mask

```typescript
// ❌ BAD: Snapshot without masks
{
  "oracle": "snapshot",
  // Missing mask_rules - will cause flaky tests
}
```

### ❌ Don't Mask Non-Volatile Fields

```typescript
// ❌ BAD: Masking stable fields
mask_rules: ["serviceName", "componentType"] // These are stable, don't mask
```

## Reference

- Platform Testing Standard §13: Snapshot Masking Rule
- See `ORACLE_GUIDE.md` for when to use snapshot oracle
- See `ORACLE_EXAMPLES.md` for snapshot test examples

