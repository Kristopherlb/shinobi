# Feature Request: Logs Account Policy Singleton Handler

**Type:** Feature Request  
**Priority:** P2 (Medium) - Future Enhancement  
**Status:** 🟡 Planned  
**Created:** 2026-01-07  
**Component:** Platform Infrastructure  
**Labels:** `singleton-handler`, `cloudwatch-logs`, `infrastructure`, `future-enhancement`

---

## Summary

Add a `LogsAccountPolicyHandler` to the `SingletonResourceHandlerService` to handle conflicts with `AWS::Logs::AccountPolicy` singleton resources. This handler will prevent Early Validation failures when multiple components attempt to create account-level CloudWatch Logs policies.

## Problem Statement

`AWS::Logs::AccountPolicy` is a **singleton resource per AWS account**. Only one account-level policy can exist per account. If multiple components attempt to create account-level log policies, CloudFormation will fail with resource conflicts.

### Current State

- `SingletonResourceHandlerService` currently handles `AWS::ApiGateway::Account` singleton
- No handler exists for `AWS::Logs::AccountPolicy`
- Components that create account-level log policies may conflict

### Potential Impact

- **Deployment Blocking**: Yes - Could prevent deployments if multiple components create account policies
- **User Impact**: Medium - Affects components that create account-level CloudWatch Logs policies
- **Frequency**: Low - Only affects services with account-level log policy components

## Proposed Solution

Create a `LogsAccountPolicyHandler` that:

1. **Checks for existing account policy** using AWS SDK `DescribeAccountPoliciesCommand`
2. **Removes `AWS::Logs::AccountPolicy` resources** from template if policy already exists
3. **Cleans up `DependsOn` references** to removed resources
4. **Follows same pattern** as `ApiGatewayAccountHandler` for consistency

## Implementation Details

### Handler Structure

```typescript
/**
 * Logs Account Policy Handler
 * 
 * Handles the singleton AWS::Logs::AccountPolicy resource.
 * 
 * CloudWatch Logs Account Policy is a singleton per account.
 * If it already exists, CDK attempts to create a new one, causing conflicts.
 */
export class LogsAccountPolicyHandler {
  constructor(private dependencies: LogsAccountPolicyHandlerDependencies) {}

  async postProcess(
    assemblyDir: string,
    stackId: string,
    templateFileName: string,
    region: string
  ): Promise<PostProcessResult> {
    // Check if Logs Account Policy exists
    // If exists, remove AWS::Logs::AccountPolicy resources from template
    // Clean up DependsOn references
    // Return PostProcessResult
  }
}
```

### Integration Points

1. **Add to `SingletonResourceHandlerService`**:
   ```typescript
   this.handlers.push({
     name: 'logsAccountPolicy',
     enabled: enabledHandlers.includes('logsAccountPolicy'),
     handler: new LogsAccountPolicyHandler({ logger: dependencies.logger })
   });
   ```

2. **AWS SDK Dependency**: `@aws-sdk/client-logs`
   - Use `DescribeAccountPoliciesCommand` to check for existing policies
   - Support multiple policy types: `DATA_PROTECTION_POLICY`, `SUBSCRIPTION_FILTER_POLICY`, etc.

3. **Template Processing**:
   - Find all `AWS::Logs::AccountPolicy` resources in template
   - Remove resources if account policy already exists
   - Clean up `DependsOn` arrays
   - Optionally clean manifest.json metadata

## Requirements

### Functional Requirements

1. **Policy Detection**
   - Check for existing account policies using AWS SDK
   - Support multiple policy types (data protection, subscription filter, etc.)
   - Handle errors gracefully (non-fatal)

2. **Template Modification**
   - Remove `AWS::Logs::AccountPolicy` resources when policy exists
   - Clean up `DependsOn` references
   - Preserve other resources

3. **Observability**
   - Log when policies are removed
   - Track modified resources in `PostProcessResult`
   - Include handler name in results

### Non-Functional Requirements

1. **Consistency**: Follow same pattern as `ApiGatewayAccountHandler`
2. **Error Handling**: Non-fatal errors - continue deployment if check fails
3. **Performance**: Minimal impact on deployment time
4. **Testing**: Unit tests + integration tests

## Testing Strategy

### Test Cases

1. **Fresh Deployment (No Existing Policy)**
   - Deploy service with account policy component
   - Should create policy successfully
   - Handler should not modify template

2. **Existing Policy**
   - Deploy service when account policy already exists
   - Handler should remove policy resource from template
   - Deployment should succeed

3. **Multiple Policy Types**
   - Test with different policy types (data protection, subscription filter)
   - Handler should detect and handle each type

4. **Error Handling**
   - Test with AWS SDK errors (permissions, network)
   - Should log error and continue (non-fatal)

## Dependencies

- `@aws-sdk/client-logs` - AWS SDK for CloudWatch Logs
- `SingletonResourceHandlerService` - Service infrastructure
- Existing handler pattern from `ApiGatewayAccountHandler`

## Related Work

- `tickets/bugs/api-gateway-account-early-validation-error.md` - Similar singleton issue
- `packages/core/src/platform/services/singleton-resource-handler/` - Existing handler infrastructure
- `tickets/features/s3-bucket-notification-singleton-handler.md` - Related singleton handler

## Acceptance Criteria

- [ ] `LogsAccountPolicyHandler` class implemented
- [ ] Integrated into `SingletonResourceHandlerService`
- [ ] Unit tests with >90% coverage
- [ ] Integration tests for existing/new policy scenarios
- [ ] Documentation in handler class
- [ ] Error handling tested and verified
- [ ] Non-fatal error handling (doesn't block deployments)

## Notes

- **Priority**: P2 - Only needed if components start creating account-level log policies
- **Timeline**: Defer until actual need arises
- **Pattern**: Follows same pattern as `ApiGatewayAccountHandler` for consistency
- **Future**: May need to handle multiple policy types separately if conflicts arise

