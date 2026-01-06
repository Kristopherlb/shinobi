# Test Deployment Checklist - hello-world-api

## Prerequisites

- [ ] **AWS Account ID**: Update `accountId` in `service.yml` (currently `"911871352725"`)
- [ ] **AWS Credentials**: Configured via `aws configure` or environment variables
- [ ] **AWS Region**: Set to `us-west-2` (or update in `service.yml`)
- [ ] **Platform Built**: All packages built successfully (`pnpm build` completed)

## Pre-Deployment Steps

### 1. Update Service Manifest

**File: `apps/hello-world-api/service.yml`**

Update the `accountId` field with your actual AWS account ID:

```yaml
accountId: "911871352725"  # Current value - update if needed
```

### 2. Verify Lambda Code

**File: `apps/hello-world-api/src/index.js`**

Ensure the Lambda handler exists and is correct:

```javascript
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Hello from hello-world-api!',
      timestamp: new Date().toISOString(),
      requestId: event.requestContext?.requestId || 'unknown'
    })
  };
};
```

## Deployment Workflow

### Step 1: Validate Manifest

```bash
# From monorepo root
node dist/apps/shinobi/src/main.js validate --file apps/hello-world-api/service.yml
```

**Expected Output:**
- ✅ Manifest validation passes
- ✅ All components recognized
- ✅ Bindings validated
- ✅ No errors or warnings

**If errors occur:**
- Check component types are registered
- Verify bindings reference correct component names
- Ensure all required fields are present

### Step 2: Plan (Dry Run)

```bash
# From monorepo root
node dist/apps/shinobi/src/main.js plan --file apps/hello-world-api/service.yml --env dev
```

**Expected Output:**
- ✅ Plan generated successfully
- ✅ Shows all components that will be created
- ✅ Displays resource configurations
- ✅ Shows bindings and capabilities

**Review the plan to verify:**
- Lambda function configuration (runtime, memory, handler)
- IAM role creation
- RDS Postgres instance (db.t3.micro, 20GB)
- Security group rules (Lambda → RDS)

### Step 3: Synthesize CDK Stack

```bash
# From monorepo root
node dist/apps/shinobi/src/main.js synth \
  --file apps/hello-world-api/service.yml \
  --env dev
```

**Note:** The account ID will be resolved from:
1. `--account` flag (if provided)
2. `accountId` in `service.yml` manifest
3. `CDK_DEFAULT_ACCOUNT` environment variable

Since your AWS credentials are configured in your shell, ensure your `service.yml` has the correct `accountId` or set `CDK_DEFAULT_ACCOUNT` in your environment.

**Expected Output:**
- ✅ CDK synthesis completes
- ✅ CloudFormation templates in `cdk.out/`
- ✅ No synthesis errors

**Verify synthesis:**
```bash
# Check CDK output exists
ls -la cdk.out/

# View stack template (optional)
cat cdk.out/hello-world-api-dev.template.json | jq '.Resources | keys'
```

**Expected Resources:**
- `AWS::Lambda::Function`
- `AWS::IAM::Role`
- `AWS::RDS::DBInstance`
- `AWS::EC2::SecurityGroup` (for RDS)
- `AWS::EC2::SecurityGroupIngress` (Lambda → RDS)

### Step 4: Deploy to AWS

```bash
# From monorepo root
node dist/apps/shinobi/src/main.js up \
  --file apps/hello-world-api/service.yml \
  --env dev \
  --yes
```

**Expected Output:**
- ✅ Stack deployment starts
- ✅ Resources created in order
- ✅ Deployment completes successfully
- ✅ Stack status: `CREATE_COMPLETE`

**Deployment Time:**
- Lambda: ~30 seconds
- IAM Role: ~10 seconds
- RDS Postgres: **~5-10 minutes** (longest step)

**Monitor deployment:**
```bash
# In another terminal
aws cloudformation describe-stacks \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'Stacks[0].StackStatus' \
  --output text
```

### Step 5: Verify Deployment

```bash
# From apps/hello-world-api directory
cd apps/hello-world-api
chmod +x verify.sh
./verify.sh
```

**Or use the comprehensive test script:**
```bash
chmod +x test-stack.sh
./test-stack.sh
```

**Expected Output:**
- ✅ Stack exists with status `CREATE_COMPLETE`
- ✅ Lambda function found with runtime `nodejs20.x`
- ✅ RDS instance found with class `db.t3.micro`
- ✅ IAM role attached to Lambda
- ✅ Security groups configured correctly

### Step 6: Test the API

**Get API Gateway URL (if created):**
```bash
API_URL=$(aws cloudformation describe-stacks \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "API URL: $API_URL"
```

**Test the endpoint:**
```bash
curl -v "$API_URL"
```

**Expected Response:**
```json
{
  "message": "Hello from hello-world-api!",
  "timestamp": "2025-01-05T...",
  "requestId": "..."
}
```

**Test with different methods:**
```bash
# GET request
curl "$API_URL"

# POST request
curl -X POST "$API_URL" -H "Content-Type: application/json" -d '{"test": "data"}'
```

### Step 7: Verify Bindings

**Check Lambda → RDS Security Group Rule:**
```bash
# Get Lambda security group
LAMBDA_SG=$(aws cloudformation describe-stack-resources \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'StackResources[?ResourceType==`AWS::EC2::SecurityGroup` && LogicalResourceId==`ApiSecurityGroup`].PhysicalResourceId' \
  --output text)

# Get RDS security group
RDS_SG=$(aws cloudformation describe-stack-resources \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'StackResources[?ResourceType==`AWS::EC2::SecurityGroup` && LogicalResourceId==`ProtectedDbSecurityGroup`].PhysicalResourceId' \
  --output text)

# Check ingress rule
aws ec2 describe-security-group-rules \
  --filters "Name=group-id,Values=$RDS_SG" \
  --query 'SecurityGroupRules[?IsEgress==`false`]' \
  --region us-west-2
```

**Expected:**
- ✅ Ingress rule allowing Lambda security group to access RDS on port 5432

**Check Lambda IAM Role:**
```bash
# Get Lambda function name
LAMBDA_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
  --output text)

# Get role ARN
ROLE_ARN=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region us-west-2 \
  --query 'Role' \
  --output text)

echo "Lambda Role: $ROLE_ARN"

# Get role policies
aws iam list-attached-role-policies --role-name $(basename "$ROLE_ARN")
```

**Expected:**
- ✅ IAM role attached to Lambda
- ✅ Policies granting necessary permissions

**Check CloudWatch Logs:**
```bash
# Get log group name
LOG_GROUP=$(aws cloudformation describe-stack-resources \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'StackResources[?ResourceType==`AWS::Logs::LogGroup`].PhysicalResourceId' \
  --output text)

# View recent logs
aws logs tail "$LOG_GROUP" --follow --region us-west-2
```

**Expected:**
- ✅ Log group exists
- ✅ Lambda execution logs appear when API is called

## Post-Deployment Validation

### Checklist

- [ ] Stack deployed successfully (`CREATE_COMPLETE`)
- [ ] Lambda function created with correct runtime (`nodejs20.x`)
- [ ] IAM role attached to Lambda
- [ ] RDS Postgres instance created (`db.t3.micro`)
- [ ] Security group rule created (Lambda → RDS)
- [ ] API Gateway endpoint accessible (if created)
- [ ] API returns expected response
- [ ] Logs appear in CloudWatch

### Test Scenarios

1. **Basic API Call**
   ```bash
   curl "$API_URL"
   ```
   - ✅ Returns 200 OK
   - ✅ Response body matches expected format

2. **Lambda Execution**
   - ✅ Check CloudWatch logs for execution
   - ✅ Verify no errors in logs
   - ✅ Check execution duration and memory usage

3. **Database Connectivity** (if Lambda code connects to RDS)
   - ✅ Lambda can connect to RDS
   - ✅ Security group allows ingress from Lambda

4. **Error Handling**
   ```bash
   # Test invalid endpoint
   curl "$API_URL/invalid"
   ```
   - ✅ Returns appropriate error response

## Troubleshooting

### Stack Creation Fails

**Check CloudFormation events:**
```bash
aws cloudformation describe-stack-events \
  --stack-name hello-world-api-dev \
  --region us-west-2 \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]' \
  --output table
```

**Common Issues:**
- **IAM Permissions**: Ensure AWS credentials have sufficient permissions
- **RDS Subnet Group**: May need VPC configuration
- **Account Limits**: Check RDS instance limits
- **Region Availability**: Verify resources available in `us-west-2`

### Lambda Not Invoking

**Check Lambda configuration:**
```bash
aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region us-west-2
```

**Check API Gateway integration:**
```bash
# If API Gateway is created
aws apigateway get-rest-apis --region us-west-2
```

### RDS Not Accessible

**Check RDS status:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE" \
  --region us-west-2 \
  --query 'DBInstances[0].DBInstanceStatus'
```

**Check security groups:**
```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*hello-world-api*" \
  --region us-west-2
```

## Cleanup

### Remove All Resources

```bash
# Using Shinobi CLI
node dist/apps/shinobi/src/main.js destroy \
  --file apps/hello-world-api/service.yml \
  --env dev \
  --yes
```

**Or manually:**
```bash
aws cloudformation delete-stack \
  --stack-name hello-world-api-dev \
  --region us-west-2
```

**Wait for deletion:**
```bash
aws cloudformation wait stack-delete-complete \
  --stack-name hello-world-api-dev \
  --region us-west-2
```

**Note:** RDS deletion may take 5-10 minutes. Final snapshot may be created.

## Next Steps After Successful Deployment

1. ✅ **Document any issues encountered**
2. ✅ **Verify all bindings work correctly**
3. ✅ **Test Lambda → RDS connectivity** (if implemented)
4. ✅ **Review CloudWatch metrics and logs**
5. ✅ **Test error scenarios**
6. ⏭️ **Add integration tests**
7. ⏭️ **Set up monitoring and alerts**
8. ⏭️ **Plan production deployment**

## Success Criteria

✅ **Deployment succeeds** - Stack created without errors  
✅ **All resources exist** - Lambda, IAM, RDS, Security Groups  
✅ **Bindings work** - Security group rules, IAM permissions  
✅ **API responds** - Endpoint returns expected data  
✅ **Logs appear** - CloudWatch logs show Lambda executions  
✅ **Cleanup works** - Stack deletion completes successfully  

---

**Ready to deploy? Start with Step 1: Validate Manifest**

