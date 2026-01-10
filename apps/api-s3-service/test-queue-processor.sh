#!/bin/bash
# Test script for the queue-processor Lambda function
# This script sends a test message to the SQS queue and verifies it's processed

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Queue Processor Lambda ===${NC}\n"

STACK_NAME="api-s3-service-dev"
REGION="us-west-2"

# Get queue URL from CloudFormation
echo -e "${YELLOW}Fetching SQS queue URL from stack: ${STACK_NAME}...${NC}"
QUEUE_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "StackResources[?ResourceType=='AWS::SQS::Queue' && LogicalResourceId=='fileprocessingqueueMainQueue'].PhysicalResourceId" \
  --output text 2>/dev/null || echo "")

if [ -z "$QUEUE_NAME" ] || [ "$QUEUE_NAME" == "None" ]; then
  echo -e "${YELLOW}⚠️  Could not find queue name. Trying alternative method...${NC}"
  QUEUE_NAME=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::SQS::Queue'].PhysicalResourceId" \
    --output text 2>/dev/null | head -1 || echo "")
fi

if [ -z "$QUEUE_NAME" ] || [ "$QUEUE_NAME" == "None" ]; then
  echo -e "${YELLOW}⚠️  Could not determine queue name automatically.${NC}"
  echo -e "${YELLOW}Please provide the queue name:${NC}"
  read -r QUEUE_NAME
fi

ACCOUNT_ID="911871352725"
QUEUE_URL="https://sqs.${REGION}.amazonaws.com/${ACCOUNT_ID}/${QUEUE_NAME}"

echo -e "${GREEN}✓ Queue URL: ${QUEUE_URL}${NC}\n"

# Send test message
echo -e "${BLUE}Sending test message to queue...${NC}"
MESSAGE_BODY=$(cat <<EOF
{
  "action": "test-queue-processor",
  "message": "Test message for queue processor",
  "testId": "$(date +%s)",
  "path": "/test",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

MESSAGE_ID=$(aws sqs send-message \
  --queue-url "$QUEUE_URL" \
  --message-body "$MESSAGE_BODY" \
  --region "$REGION" \
  --query 'MessageId' \
  --output text)

echo -e "${GREEN}✓ Message sent! Message ID: ${MESSAGE_ID}${NC}\n"

# Wait a few seconds for processing
echo -e "${YELLOW}Waiting 5 seconds for Lambda to process the message...${NC}"
sleep 5

# Check Lambda logs
echo -e "${BLUE}Checking Lambda logs for processing confirmation...${NC}"
LOG_GROUP="/aws/lambda/queue-processor"

if aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP" \
  --region "$REGION" \
  --query "logGroups[?logGroupName=='${LOG_GROUP}']" \
  --output text | grep -q "$LOG_GROUP"; then
  
  echo -e "${GREEN}Recent logs from queue-processor:${NC}"
  aws logs tail "$LOG_GROUP" \
    --region "$REGION" \
    --since 1m \
    --format short | head -20 || echo "No recent logs found"
else
  echo -e "${YELLOW}⚠️  Log group ${LOG_GROUP} does not exist yet.${NC}"
  echo -e "${YELLOW}The Lambda may not have been invoked yet.${NC}"
fi

# Check S3 bucket for uploaded file
echo -e "\n${BLUE}Checking S3 bucket for processed files...${NC}"
BUCKET_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" \
  --output text 2>/dev/null | head -1 || echo "")

if [ -n "$BUCKET_NAME" ] && [ "$BUCKET_NAME" != "None" ]; then
  echo -e "${GREEN}Checking bucket: ${BUCKET_NAME}${NC}"
  
  # List files in processed/ prefix
  FILES=$(aws s3 ls "s3://${BUCKET_NAME}/processed/" \
    --region "$REGION" \
    --recursive \
    --output text 2>/dev/null | tail -5 || echo "")
  
  if [ -n "$FILES" ]; then
    echo -e "${GREEN}✓ Found processed files:${NC}"
    echo "$FILES"
  else
    echo -e "${YELLOW}⚠️  No processed files found yet. The Lambda may still be processing.${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Could not find S3 bucket name.${NC}"
fi

echo -e "\n${GREEN}✓ Test completed!${NC}"
echo -e "${YELLOW}To view logs in real-time, run: ./view-queue-processor-logs.sh${NC}"


