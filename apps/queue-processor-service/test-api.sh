#!/bin/bash
# Test script for queue-processor-service API

set -e

STACK_NAME="queue-processor-service-dev"
REGION="us-west-2"
STAGE="dev"

echo "🔍 Finding API Gateway endpoint..."

# Try to get API ID from CloudFormation stack outputs
API_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiId' || OutputKey=='ApiGatewayId' || OutputKey=='RestApiId'].OutputValue" \
  --output text 2>/dev/null || echo "")

# If not found in outputs, try to find it from API Gateway
if [ -z "$API_ID" ]; then
  echo "⚠️  API ID not found in stack outputs, searching API Gateway..."
  API_ID=$(aws apigateway get-rest-apis \
    --region "$REGION" \
    --query "items[?contains(name, 'queue-processor')].id" \
    --output text | head -n 1 || echo "")
fi

if [ -z "$API_ID" ]; then
  echo "❌ Could not find API Gateway ID. Is the stack deployed?"
  echo ""
  echo "Try running: pnpm shinobi up -f apps/queue-processor-service/service.yml"
  exit 1
fi

# Construct the endpoint URL
ENDPOINT_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"

echo "✅ Found API ID: $API_ID"
echo "📍 Endpoint URL: $ENDPOINT_URL"
echo ""
echo "🧪 Testing API endpoint..."
echo ""

# Test the API
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -d '{"data": "Shinobi!"}')

# Extract HTTP status and body
HTTP_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

echo "📤 Request:"
echo "   POST $ENDPOINT_URL"
echo "   Body: {\"data\": \"test message from script\"}"
echo ""
echo "📥 Response (Status: $HTTP_STATUS):"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✅ API test successful!"
  
  # Extract message ID if available
  MESSAGE_ID=$(echo "$HTTP_BODY" | jq -r '.messageId // empty' 2>/dev/null || echo "")
  if [ -n "$MESSAGE_ID" ]; then
    echo "   Message ID: $MESSAGE_ID"
    echo ""
    echo "🔍 Next steps:"
    echo "   1. Check SQS queue: queue-processor-queue"
    echo "   2. Check CloudWatch Logs for worker Lambda"
    echo "   3. Check S3 bucket: queue-processor-service-bucket/processed/"
  fi
else
  echo "❌ API test failed with status $HTTP_STATUS"
  exit 1
fi

