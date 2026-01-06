#!/bin/bash
# verify.sh - Verify deployed hello-world-api resources
#
# This script checks that the deployed infrastructure matches expected values.
# Run this after deploying with: pnpm shinobi up

set -e

SERVICE="hello-world-api"
STACK_NAME="${SERVICE}-dev"
REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-911871352725}"

echo "🔍 Verifying deployed resources for ${SERVICE}..."
echo "   Stack: ${STACK_NAME}"
echo "   Region: ${REGION}"
echo ""

# Check if stack exists
echo "📋 Checking stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" = "NOT_FOUND" ]; then
  echo "❌ Stack ${STACK_NAME} not found. Deploy first with: pnpm shinobi up"
  exit 1
fi

echo "✅ Stack exists with status: ${STACK_STATUS}"
echo ""

# Get Lambda function name
echo "🔍 Finding Lambda function..."
LAMBDA_NAME=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
  --output text 2>/dev/null || echo "")

if [ -z "$LAMBDA_NAME" ]; then
  echo "⚠️  Lambda function not found in stack"
else
  echo "✅ Lambda Function: ${LAMBDA_NAME}"
  
  # Check Lambda configuration
  LAMBDA_RUNTIME=$(aws lambda get-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --region "$REGION" \
    --query 'Runtime' \
    --output text 2>/dev/null || echo "")
  
  if [ ! -z "$LAMBDA_RUNTIME" ]; then
    echo "   Runtime: ${LAMBDA_RUNTIME}"
    echo "   Expected: nodejs20.x"
    if [ "$LAMBDA_RUNTIME" = "nodejs20.x" ]; then
      echo "   ✅ Runtime matches expected value"
    else
      echo "   ⚠️  Runtime mismatch"
    fi
  fi
fi
echo ""

# Get API Gateway URL (if exists)
echo "🔍 Finding API Gateway endpoint..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$API_URL" ] && [ "$API_URL" != "None" ]; then
  echo "✅ API Gateway URL: ${API_URL}"
  echo ""
  echo "🧪 Testing endpoint..."
  
  RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL" || echo "")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Endpoint responded with HTTP 200"
    echo "📄 Response body:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  else
    echo "⚠️  Endpoint responded with HTTP ${HTTP_CODE}"
    echo "Response: $BODY"
  fi
else
  echo "⚠️  API Gateway URL not found in stack outputs"
fi
echo ""

# Check RDS instance (if exists)
echo "🔍 Checking RDS instance..."
RDS_INSTANCE=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?ResourceType==`AWS::RDS::DBInstance`].PhysicalResourceId' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$RDS_INSTANCE" ] && [ "$RDS_INSTANCE" != "None" ]; then
  echo "✅ RDS Instance: ${RDS_INSTANCE}"
  
  RDS_CLASS=$(aws rds describe-db-instances \
    --db-instance-identifier "$RDS_INSTANCE" \
    --region "$REGION" \
    --query 'DBInstances[0].DBInstanceClass' \
    --output text 2>/dev/null || echo "")
  
  if [ ! -z "$RDS_CLASS" ]; then
    echo "   Instance Class: ${RDS_CLASS}"
    echo "   Expected: db.t3.micro"
    if [ "$RDS_CLASS" = "db.t3.micro" ]; then
      echo "   ✅ Instance class matches expected value"
    else
      echo "   ⚠️  Instance class mismatch"
    fi
  fi
else
  echo "⚠️  RDS instance not found (may still be creating)"
fi
echo ""

# Check CloudWatch Log Group
echo "🔍 Checking CloudWatch Log Group..."
LOG_GROUP=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'StackResources[?ResourceType==`AWS::Logs::LogGroup`].PhysicalResourceId' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$LOG_GROUP" ] && [ "$LOG_GROUP" != "None" ]; then
  echo "✅ CloudWatch Log Group: ${LOG_GROUP}"
else
  echo "⚠️  CloudWatch Log Group not found"
fi
echo ""

echo "✅ Verification complete!"
echo ""
echo "📝 Summary:"
echo "   - Stack Status: ${STACK_STATUS}"
echo "   - Lambda: ${LAMBDA_NAME:-Not found}"
echo "   - API Gateway: ${API_URL:-Not found}"
echo "   - RDS: ${RDS_INSTANCE:-Not found}"
echo "   - Log Group: ${LOG_GROUP:-Not found}"

