#!/bin/bash
# Test script for the file-storage-api Lambda function
# This script invokes the Lambda via API Gateway and displays the response

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing file-storage-api Lambda Function ===${NC}\n"

# Get API Gateway endpoint from CloudFormation stack
STACK_NAME="api-s3-service-dev"
REGION="us-west-2"

echo -e "${YELLOW}Fetching API Gateway endpoint from stack: ${STACK_NAME}...${NC}"

# Try multiple methods to find the API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?contains(OutputKey, 'Api') || contains(OutputKey, 'Endpoint') || contains(OutputKey, 'URL')].OutputValue" \
  --output text 2>/dev/null | head -1 || echo "")

if [ -z "$API_ENDPOINT" ]; then
  echo -e "${YELLOW}Could not find API endpoint in stack outputs. Trying alternative method...${NC}"
  # Try to get from API Gateway directly
  API_ID=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::ApiGateway::RestApi'].PhysicalResourceId" \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$API_ID" ] && [ "$API_ID" != "None" ]; then
    API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com/dev"
  fi
fi

# Also try to get from API Gateway deployment
if [ -z "$API_ENDPOINT" ]; then
  echo -e "${YELLOW}Trying to get from API Gateway deployments...${NC}"
  REST_API_ID=$(aws apigateway get-rest-apis \
    --region "$REGION" \
    --query "items[?name=='api-s3-service-dev' || contains(name, 'api-s3-service')].id" \
    --output text 2>/dev/null | head -1 || echo "")
  
  if [ -n "$REST_API_ID" ] && [ "$REST_API_ID" != "None" ]; then
    API_ENDPOINT="https://${REST_API_ID}.execute-api.${REGION}.amazonaws.com/dev"
  fi
fi

if [ -z "$API_ENDPOINT" ]; then
  echo -e "${YELLOW}⚠️  Could not determine API endpoint automatically.${NC}"
  echo -e "${YELLOW}Please provide the API Gateway endpoint URL:${NC}"
  read -r API_ENDPOINT
fi

echo -e "${GREEN}✓ API Endpoint: ${API_ENDPOINT}${NC}\n"

# Test 1: Send a simple message
echo -e "${BLUE}Test 1: Sending simple message to SQS queue...${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test",
    "message": "Hello from Lambda test script",
    "testId": "'$(date +%s)'"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 2: Send a file upload notification
echo -e "${BLUE}Test 2: Sending file upload notification...${NC}"
RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "file-uploaded",
    "bucket": "file-bucket",
    "key": "test-file-'$(date +%s)'.txt",
    "size": 1024,
    "contentType": "text/plain"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Test 3: Send with query parameters
echo -e "${BLUE}Test 3: Sending message with query parameters...${NC}"
RESPONSE=$(curl -s -X POST "${API_ENDPOINT}?source=test-script&version=1.0" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test-script",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

echo -e "${GREEN}✓ All tests completed!${NC}"
echo -e "${YELLOW}Check CloudWatch Logs to verify messages were sent to SQS queue.${NC}"
echo -e "${YELLOW}Run: ./view-logs.sh${NC}"

