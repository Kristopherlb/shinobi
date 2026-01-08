# File Storage API Service

This service provides a complete file processing pipeline:
1. **Lambda API** receives HTTP requests and sends messages to SQS
2. **SQS Queue** buffers messages for processing
3. **Queue Processor Lambda** processes messages and uploads files to S3

## Architecture

- **Lambda API** (`file-storage-api`): Receives HTTP requests and sends messages to SQS
- **SQS Queue** (`file-processing-queue`): Buffers messages for asynchronous processing
- **Queue Processor Lambda** (`queue-processor`): Processes SQS messages and generates S3 files
- **S3 Bucket** (`file-bucket`): Stores processed files

## Lambda Handler

The Lambda handler (`src/handler.ts`) receives API Gateway requests and sends messages to the SQS queue.

### Environment Variables (Set by Bindings)

- `QUEUE_URL`: The SQS queue URL (automatically set by the `file-processing-queue` binding)
- `QUEUE_ARN`: The SQS queue ARN (automatically set by the `file-processing-queue` binding)

### Message Format

Messages sent to SQS include:
- Request metadata (requestId, httpMethod, path)
- Query string parameters
- Request body (JSON)
- Headers (user-agent, content-type)
- Timestamp

## Testing

### Quick Start: Run Smoke Tests

After deploying, run the automated smoke test suite:

```bash
# Option 1: Use the convenience script
./run-smoke-tests.sh

# Option 2: Run directly
cd tests && pnpm install && pnpm test
```

The smoke tests verify the complete end-to-end flow automatically. See [tests/README.md](tests/README.md) for details.

### Prerequisites

1. Deploy the stack:
   ```bash
   pnpm shinobi up -f apps/api-s3-service/service.yml
   ```

2. Ensure AWS CLI is configured with appropriate credentials

### Test the Lambda Function

Run the test script to send test messages to the SQS queue:

```bash
./test-lambda.sh
```

This script will:
1. Automatically discover the API Gateway endpoint
2. Send 3 test messages with different payloads
3. Display the responses

### Manual Testing

You can also test manually using curl:

```bash
# Get the API endpoint from CloudFormation
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name api-s3-service-dev \
  --region us-west-2 \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayEndpoint'].OutputValue" \
  --output text)

# Send a test message
curl -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test",
    "message": "Hello from manual test"
  }'
```

## Viewing Logs

### View Recent Logs

```bash
./view-logs.sh recent
```

Shows logs from the last 5 minutes.

### Tail Logs in Real-Time

```bash
./view-logs.sh tail
```

Follows logs as they come in (press Ctrl+C to stop).

### View SQS Queue Metrics

```bash
./view-logs.sh metrics
```

Shows SQS queue metrics (message count, etc.).

### View Everything

```bash
./view-logs.sh all
```

Shows recent logs and SQS metrics.

### Manual Log Viewing

You can also view logs directly using AWS CLI:

```bash
# View recent logs
aws logs tail /aws/lambda/file-storage-api \
  --region us-west-2 \
  --since 5m

# Follow logs
aws logs tail /aws/lambda/file-storage-api \
  --region us-west-2 \
  --follow
```

Or use the AWS Console:
1. Go to CloudWatch → Log groups
2. Find `/aws/lambda/file-storage-api`
3. Click on a log stream to view logs

## Queue Processor Lambda

The `queue-processor` Lambda function:
- Listens to the SQS queue (`file-processing-queue`)
- Processes messages in batches (up to 10 messages per batch)
- Generates JSON files based on the message content
- Uploads files to S3 bucket (`file-bucket`) under the `processed/` prefix

### Testing the Queue Processor

```bash
# Send a test message to the queue and verify processing
./test-queue-processor.sh
```

This script will:
1. Send a test message to the SQS queue
2. Wait for the Lambda to process it
3. Check Lambda logs for processing confirmation
4. Verify files were uploaded to S3

### Viewing Queue Processor Logs

```bash
# View recent logs
./view-queue-processor-logs.sh recent

# Or tail logs in real-time
./view-queue-processor-logs.sh tail
```

### Verifying S3 Files

```bash
# List processed files in S3
BUCKET_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name api-s3-service-dev \
  --region us-west-2 \
  --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" \
  --output text)

aws s3 ls "s3://${BUCKET_NAME}/processed/" --recursive
```

## Verifying SQS Messages

### Check Queue Depth

```bash
# Get queue URL from CloudFormation
QUEUE_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name api-s3-service-dev \
  --region us-west-2 \
  --query "StackResources[?ResourceType=='AWS::SQS::Queue' && LogicalResourceId=='fileprocessingqueueMainQueue'].PhysicalResourceId" \
  --output text)

# Get approximate number of messages
aws sqs get-queue-attributes \
  --queue-url "https://sqs.us-west-2.amazonaws.com/911871352725/${QUEUE_NAME}" \
  --attribute-names ApproximateNumberOfMessages \
  --region us-west-2
```

## Complete Workflow

1. **Send HTTP request** → API Gateway → `file-storage-api` Lambda
2. **Lambda sends message** → SQS queue (`file-processing-queue`)
3. **Queue triggers** → `queue-processor` Lambda (processes message)
4. **Lambda generates file** → Uploads to S3 bucket (`file-bucket/processed/`)

### Automated End-to-End Smoke Tests

**Recommended:** Use the automated smoke test suite for comprehensive testing:

```bash
# Install test dependencies (first time only)
cd tests
pnpm install

# Run all smoke tests
pnpm test
```

The smoke test suite automatically:
1. Discovers all stack resources
2. Sends a test request to the API
3. Verifies message was received in SQS
4. Waits for queue processor to execute
5. Verifies file was created in S3
6. Checks Lambda logs for errors

See [tests/README.md](tests/README.md) for detailed documentation.

### Manual End-to-End Test

For manual testing:

```bash
# 1. Send a message via API
./test-lambda.sh

# 2. Wait a few seconds, then check if it was processed
./test-queue-processor.sh

# 3. Verify the file was created in S3
BUCKET_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name api-s3-service-dev \
  --region us-west-2 \
  --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" \
  --output text)

aws s3 ls "s3://${BUCKET_NAME}/processed/" --recursive
```

## Troubleshooting

### Lambda Not Receiving QUEUE_URL

If the Lambda function shows "QUEUE_URL not set" error:
1. Verify the binding is configured in `service.yml`
2. Redeploy the stack: `pnpm shinobi up -f apps/api-s3-service/service.yml`
3. Check CloudFormation stack outputs for binding errors

### Queue Processor Not Triggering

If messages aren't being processed:
1. Check that the event source is configured correctly in `service.yml`
2. Verify the queue ARN reference is correct (may need to use CloudFormation GetAtt)
3. Check Lambda logs: `./view-queue-processor-logs.sh recent`
4. Verify IAM permissions for SQS event source mapping

### Messages Not Appearing in Queue

1. Check Lambda logs for errors: `./view-logs.sh recent`
2. Verify IAM permissions (should be set automatically by bindings)
3. Check SQS queue metrics: `./view-logs.sh metrics`

### Files Not Appearing in S3

1. Check queue processor logs: `./view-queue-processor-logs.sh recent`
2. Verify S3 bucket permissions (should be set by binding)
3. Check that the Lambda has write access to the bucket
4. Verify the bucket name is correct in environment variables

### API Gateway Not Found

If the test script can't find the API endpoint:
1. Manually provide the endpoint when prompted
2. Or get it from CloudFormation:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name api-s3-service-dev \
     --region us-west-2 \
     --query "Stacks[0].Outputs"
   ```

## Development

### Local Testing

To test the handler locally (without deploying):

```bash
cd apps/api-s3-service/src
npm install
node --test test/handler.test.js
```

### Building

The Lambda code is automatically bundled during deployment. To build manually:

```bash
cd apps/api-s3-service/src
npm install
npm run build  # if you add a build step
```

