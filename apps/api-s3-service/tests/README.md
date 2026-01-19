# Smoke Test Suite

End-to-end smoke tests for the `api-s3-service` stack.

**Note**: This is an **opt-in E2E test suite** that requires AWS credentials and a deployed stack. It is **excluded from the default test suite** (`pnpm nx run-many -t test --all`) and will not run during offline testing. To run these tests, set `RUN_SMOKE_TESTS=true` and ensure AWS credentials are configured.

## Overview

This test suite validates the complete flow:
1. **API Gateway** → Receives HTTP request
2. **Lambda API** → Processes request and sends message to SQS
3. **SQS Queue** → Buffers message
4. **Queue Processor Lambda** → Processes message from queue
5. **S3 Bucket** → Stores processed file

## Prerequisites

1. **Deploy the stack:**
   ```bash
   pnpm shinobi up -f apps/api-s3-service/service.yml
   ```

2. **Install test dependencies:**
   ```bash
   cd apps/api-s3-service/tests
   pnpm install
   ```

3. **AWS credentials configured:**
   - AWS CLI configured with appropriate credentials
   - Permissions to read CloudFormation, SQS, S3, Lambda, and CloudWatch Logs

## Running Tests

### Quick Test

```bash
cd apps/api-s3-service/tests
pnpm test
```

### From Project Root

```bash
cd apps/api-s3-service/tests
pnpm tsx smoke-test.ts
```

### With Custom Configuration

```bash
STACK_NAME=api-s3-service-dev AWS_REGION=us-west-2 pnpm tsx smoke-test.ts
```

## Test Coverage

The suite tests:

1. ✅ **Stack Resource Discovery**
   - Verifies stack exists
   - Discovers API Gateway endpoint
   - Discovers SQS queue URL
   - Discovers S3 bucket name
   - Discovers Lambda function names

2. ✅ **API Endpoint Health Check**
   - Sends HTTP POST request to API Gateway
   - Verifies successful response (200 OK)
   - Validates response contains messageId

3. ✅ **SQS Message Received**
   - Polls SQS queue for test message
   - Verifies message was received
   - Cleans up test message

4. ✅ **Queue Processor Execution**
   - Waits for Lambda to process message
   - Verifies processing completed within timeout

5. ✅ **S3 File Created**
   - Lists files in S3 bucket
   - Verifies file was created in `processed/` prefix
   - Downloads and validates file content
   - Confirms file contains smoke test data

6. ✅ **Lambda Logs Verification**
   - Checks CloudWatch logs for errors
   - Filters out non-critical warnings
   - Reports any critical errors found

## Expected Output

```
🚀 Starting Smoke Test Suite for api-s3-service

Stack: api-s3-service-dev
Region: us-west-2

🧪 Discover Stack Resources... ✅ PASSED
🧪 API Endpoint Health Check... ✅ PASSED
🧪 SQS Message Received... ✅ PASSED
🧪 Queue Processor Execution... ✅ PASSED
🧪 S3 File Created... ✅ PASSED
🧪 Lambda Logs Verification... ✅ PASSED

============================================================
📊 TEST SUMMARY
============================================================
✅ Discover Stack Resources
✅ API Endpoint Health Check
✅ SQS Message Received
✅ Queue Processor Execution
✅ S3 File Created
✅ Lambda Logs Verification

------------------------------------------------------------
Total: 6 | Passed: 6 | Failed: 0
============================================================

✅ ALL SMOKE TESTS PASSED
```

## Troubleshooting

### Test Fails: "API Gateway endpoint not found"

**Solution:**
1. Verify stack is deployed: `aws cloudformation describe-stacks --stack-name api-s3-service-dev`
2. Check stack outputs for API endpoint
3. Ensure stack name is correct (default: `api-s3-service-dev`)

### Test Fails: "Message not found in SQS queue"

**Possible causes:**
1. Lambda API not sending messages (check Lambda logs)
2. IAM permissions issue (Lambda can't write to SQS)
3. Queue URL incorrect

**Solution:**
1. Check Lambda logs: `./view-logs.sh recent`
2. Verify bindings in `service.yml`
3. Redeploy stack: `pnpm shinobi up -f apps/api-s3-service/service.yml`

### Test Fails: "No files created in S3"

**Possible causes:**
1. Queue processor Lambda not triggered
2. Lambda processing failed
3. S3 permissions issue

**Solution:**
1. Check queue processor logs: `./view-queue-processor-logs.sh recent`
2. Verify event source mapping is configured
3. Check S3 bucket permissions
4. Verify Lambda has write access to bucket

### Test Fails: "Critical errors found in logs"

**Solution:**
1. Review CloudWatch logs for detailed error messages
2. Fix the underlying issue
3. Redeploy: `pnpm shinobi up -f apps/api-s3-service/service.yml`
4. Run tests again

## Continuous Testing Workflow

After making changes:

1. **Deploy:**
   ```bash
   pnpm shinobi up -f apps/api-s3-service/service.yml
   ```

2. **Test:**
   ```bash
   cd apps/api-s3-service/tests
   pnpm test
   ```

3. **If tests fail:**
   - Review error messages
   - Check CloudWatch logs
   - Fix issues
   - Repeat steps 1-2

## Integration with CI/CD

Add to your CI/CD pipeline:

```yaml
- name: Run Smoke Tests
  run: |
    cd apps/api-s3-service/tests
    pnpm install
    pnpm test
  env:
    AWS_REGION: us-west-2
    STACK_NAME: api-s3-service-dev
```

## Manual Testing

If you prefer to test manually, see the main [README.md](../README.md) for manual testing instructions.

