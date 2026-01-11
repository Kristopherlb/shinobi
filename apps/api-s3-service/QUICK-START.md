# Quick Start Guide

## 1. Deploy the Stack

```bash
cd /Users/kristopherbowles/project42/shinobi
pnpm shinobi up -f apps/api-s3-service/service.yml
```

Wait for the stack to deploy successfully.

## 2. Test the Lambda

```bash
cd apps/api-s3-service
./test-lambda.sh
```

This will:
- Automatically find your API Gateway endpoint
- Send 3 test messages to the SQS queue
- Show you the responses

## 3. View Logs

```bash
# View recent logs
./view-logs.sh recent

# Or tail logs in real-time
./view-logs.sh tail
```

## 4. Verify Messages in SQS

```bash
# Get queue URL
STACK_NAME="api-s3-service-dev"
REGION="us-west-2"

QUEUE_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "StackResources[?ResourceType=='AWS::SQS::Queue' && LogicalResourceId=='fileprocessingqueueMainQueue'].PhysicalResourceId" \
  --output text)

# Check message count
aws sqs get-queue-attributes \
  --queue-url "https://sqs.${REGION}.amazonaws.com/911871352725/${QUEUE_NAME}" \
  --attribute-names ApproximateNumberOfMessages \
  --region "$REGION"
```

## Expected Output

### Successful Lambda Response

```json
{
  "success": true,
  "message": "Message sent to SQS queue successfully",
  "messageId": "abc123-def456-ghi789",
  "queueUrl": "https://sqs.us-west-2.amazonaws.com/...",
  "timestamp": "2025-01-15T12:34:56.789Z"
}
```

### Lambda Logs

You should see logs like:
```
Message sent to SQS queue {
  queueUrl: 'https://sqs.us-west-2.amazonaws.com/...',
  queueArn: 'arn:aws:sqs:us-west-2:...',
  messageId: 'abc123-def456-ghi789',
  requestId: 'test-request-id',
  md5OfBody: '...'
}
```

### SQS Queue

- Messages should appear in the `file-processing-queue`
- Check CloudWatch metrics for queue depth
- Messages will be processed by any consumers attached to the queue

## Troubleshooting

### "QUEUE_URL not set" Error

The binding should set this automatically. If you see this error:
1. Check that the binding is in `service.yml` (it is)
2. Redeploy: `pnpm shinobi up -f apps/api-s3-service/service.yml`
3. Check CloudFormation events for binding errors

### API Endpoint Not Found

The test script will prompt you to enter it manually. You can also find it:
- In CloudFormation stack outputs
- In API Gateway console
- From the stack resources

### No Logs Appearing

- Wait a few seconds after invoking (logs can take 5-10 seconds)
- Check that the log group exists: `/aws/lambda/file-storage-api`
- Verify the function was actually invoked (check API Gateway logs)


