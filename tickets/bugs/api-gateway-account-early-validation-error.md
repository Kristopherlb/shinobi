# Bug Report: API Gateway Account Early Validation Error

**Status:** 🔴 OPEN  
**Severity:** HIGH  
**Affected Components:** `lambda-api`, `api-gateway-rest`, `api-gateway-http`  
**Created:** 2026-01-07  
**Reporter:** Platform Team

## Executive Summary

CloudFormation deployments fail with `AWS::EarlyValidation::ResourceExistenceCheck` error when deploying stacks containing API Gateway resources (`AWS::ApiGateway::Account`). This occurs because `AWS::ApiGateway::Account` is a singleton resource per AWS account/region, and CDK attempts to create a new Account resource with a CloudWatch Role that references a non-existent IAM role using `Fn::GetAtt`, which Early Validation cannot resolve during change set creation.

## Root Cause

### The Problem

1. **ApiGateway Account is a Singleton**: `AWS::ApiGateway::Account` is a singleton resource per AWS account/region. Only one Account resource can exist per account/region.

2. **CDK Creates Account Automatically**: When creating a `RestApi` with logging enabled, CDK automatically creates:
   - An `AWS::ApiGateway::Account` resource
   - An `AWS::IAM::Role` (CloudWatch Role) for API Gateway logging
   - The Account resource references the CloudWatch Role using `Fn::GetAtt`

3. **Early Validation Failure**: CloudFormation's Early Validation runs **before** any resources are created. When it encounters `Fn::GetAtt` referencing a resource that doesn't exist yet (the CloudWatch Role), it fails with `AWS::EarlyValidation::ResourceExistenceCheck`.

4. **Existing Account Conflict**: If an ApiGateway Account already exists (from a previous deployment), CDK still tries to create a new Account resource, causing Early Validation to fail because:
   - The Account resource already exists (singleton conflict)
   - The CloudWatch Role ARN referenced via `Fn::GetAtt` doesn't exist yet

## Affected Components

- `lambda-api` - Creates RestApi with logging enabled
- `api-gateway-rest` - Creates RestApi resources
- `api-gateway-http` - Creates HTTP API resources (may be affected)

## Reproduction Steps

1. Deploy a service with a `lambda-api` component that has logging enabled
2. The deployment will fail during change set creation with:
   ```
   AWS::EarlyValidation::ResourceExistenceCheck
   Failed to create ChangeSet: The following hook(s)/validation failed: [AWS::EarlyValidation::ResourceExistenceCheck]
   ```

## Workaround

**Current Workaround (Implemented in `up-command.ts`):**

1. Check if ApiGateway Account already exists using AWS SDK `GetAccountCommand`
2. If Account exists, remove the `AWS::ApiGateway::Account` and `AWS::IAM::Role` (CloudWatch Role) resources from the synthesized template
3. Remove all `DependsOn` references to these resources
4. Remove metadata entries from `manifest.json` that reference these resources

**Location:** `apps/svc/src/cli/up-command.ts:209-346`

## Proposed Permanent Fix

### Option 1: Use Existing CloudWatch Role (Recommended)

Modify CDK RestApi creation to check for existing ApiGateway Account and use its CloudWatch Role ARN:

```typescript
// In lambda-api.component.ts or api-gateway-rest.component.ts
const existingAccount = await checkApiGatewayAccount();
const restApi = new apigw.RestApi(this, 'RestApi', {
  // ... other config
  cloudWatchRole: existingAccount?.cloudwatchRoleArn 
    ? iam.Role.fromRoleArn(this, 'CloudWatchRole', existingAccount.cloudwatchRoleArn)
    : undefined // Let CDK create if Account doesn't exist
});
```

### Option 2: Disable Account Creation

Prevent CDK from creating the Account resource if one already exists:

```typescript
// Use CDK feature flag to disable Account creation
const restApi = new apigw.RestApi(this, 'RestApi', {
  // ... other config
  // Note: This may require CDK feature flag or custom construct
});
```

### Option 3: Use CDK's Account.fromAccountId()

Use CDK's built-in method to reference existing Account:

```typescript
import { Account } from 'aws-cdk-lib/aws-apigateway';

const account = Account.fromAccountId(this, 'Account', accountId);
// Use account.cloudWatchRoleArn if available
```

## Impact Assessment

- **Deployment Blocking**: Yes - Prevents all deployments containing API Gateway resources
- **User Impact**: High - Affects all services using `lambda-api` component
- **Workaround Available**: Yes - Implemented in `up-command.ts` but needs permanent fix

## Related Issues

- Similar issue may affect other singleton resources (e.g., `AWS::ApiGateway::Account` for HTTP APIs)
- Early Validation failures may occur with other resources that use `Fn::GetAtt` to reference resources created in the same stack

## Testing

**Test Case 1: Fresh Deployment (No Existing Account)**
- Deploy a service with `lambda-api` component
- Should create Account and CloudWatch Role successfully

**Test Case 2: Existing Account**
- Deploy a service with `lambda-api` component when Account already exists
- Should use existing Account without creating new resources

**Test Case 3: Multiple Services**
- Deploy multiple services with API Gateway in the same account/region
- All should use the same singleton Account resource

## References

- AWS CDK RestApi Documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApi.html
- CloudFormation Early Validation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-validate-template.html
- ApiGateway Account Resource: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-account.html

## Notes

- The workaround in `up-command.ts` is a temporary fix that modifies templates post-synthesis
- A permanent fix should be implemented in the component code to prevent Account creation when one already exists
- Consider adding a platform-level utility to check for singleton resources before synthesis

