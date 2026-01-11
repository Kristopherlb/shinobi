# ElastiCache Redis: CloudWatch Logs KMS Key Policy Error

**Status:** 🔴 OPEN  
**Severity:** HIGH  
**Component:** `elasticache-redis`  
**Created:** 2026-01-07  
**Reporter:** Platform Team

## Summary

When deploying an ElastiCache Redis component with CloudWatch Logs enabled and KMS encryption, CloudFormation fails to create log groups with the error:

```
The specified KMS key does not exist or is not allowed to be used with Arn 'arn:aws:logs:us-west-2:911871352725:log-group:/aws/platform/redis/sample-api-app-cache/slow-log'
```

This causes the entire stack deployment to fail and rollback, leaving the ElastiCache cluster in an invalid state that blocks stack deletion.

## Root Cause

The KMS key resource policy was being added to the key, but:

1. **Missing dependency**: Log groups were created without an explicit dependency on the KMS key, causing CloudFormation to attempt log group creation before the key policy was fully applied.

2. **Incorrect policy format**: The KMS key policy included `resources: ['*']` which is not needed (and potentially incorrect) for KMS key policies - the policy applies to the key itself.

3. **Region resolution**: The region used in the service principal might not have been properly resolved, causing the policy to reference an incorrect region.

## Impact

- **Deployment failures**: All deployments with ElastiCache Redis and CloudWatch Logs fail
- **Stack stuck in rollback**: Failed deployments leave stacks in `UPDATE_ROLLBACK_IN_PROGRESS` state
- **Manual intervention required**: Stuck ElastiCache clusters must be manually deleted or skipped to unblock stack deletion
- **Production risk**: Cannot deploy ElastiCache Redis components with logging enabled

## Affected Versions

- `@shinobi/components-elasticache-redis` - All versions prior to fix

## Steps to Reproduce

1. Create a service manifest with an `elasticache-redis` component:
```yaml
components:
  - name: app-cache
    type: elasticache-redis
    config:
      encryption:
        atRest: true
        inTransit: true
      logging:
        enabled: true
        slowLog:
          enabled: true
          destinationType: cloudwatch-logs
```

2. Deploy the stack: `pnpm shinobi up -f service.yml --yes`

3. Observe CloudFormation failure during log group creation

## Fix Applied

1. **Added explicit dependency**: Log groups now depend on the KMS key:
```typescript
if (kmsKey) {
  logGroup.node.addDependency(kmsKey);
}
```

2. **Removed resources field**: KMS key policies no longer include `resources: ['*']`:
```typescript
this.loggingKmsKey.addToResourcePolicy(new iam.PolicyStatement({
  sid: 'AllowCloudWatchLogs',
  principals: [new iam.ServicePrincipal(`logs.${region}.amazonaws.com`)],
  actions: [
    'kms:Decrypt',
    'kms:GenerateDataKey',
    'kms:DescribeKey'
  ]
  // Note: resources field is not needed for KMS key policies
}));
```

3. **Fixed region resolution**: Use `cdk.Stack.of(this).region` to ensure proper region resolution:
```typescript
const region = cdk.Stack.of(this).region ?? this.context.region ?? 'us-east-1';
```

## Verification

After fix:
- [ ] ElastiCache Redis component with CloudWatch Logs deploys successfully
- [ ] Log groups are created with KMS encryption
- [ ] KMS key policy allows CloudWatch Logs service principal
- [ ] No stack rollback failures

## Related Issues

- Stack stuck in `UPDATE_ROLLBACK_IN_PROGRESS` state
- ElastiCache cluster stuck in invalid deletion state

## Resolution Steps for Stuck Stacks

If a stack is stuck in rollback due to this issue:

1. **Continue rollback and skip stuck resource**:
```bash
aws cloudformation continue-update-rollback \
  --stack-name sample-api-dev-v2 \
  --region us-west-2 \
  --resources-to-skip <logical-resource-id>
```

   To find the logical resource ID:
```bash
aws cloudformation describe-stack-resources \
  --stack-name sample-api-dev-v2 \
  --region us-west-2 \
  --query 'StackResources[?ResourceType==`AWS::ElastiCache::ReplicationGroup`].[LogicalResourceId,ResourceStatus]' \
  --output table
```

2. **After rollback completes**, delete the stack normally:
```bash
aws cloudformation delete-stack --stack-name sample-api-dev-v2 --region us-west-2
```

3. **If ElastiCache cluster is stuck**, manually delete it from AWS Console, then continue rollback.

## References

- AWS CloudFormation: [ContinueUpdateRollback](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ContinueUpdateRollback.html)
- AWS KMS: [Key Policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)
- AWS CloudWatch Logs: [Encrypting Log Data](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)

