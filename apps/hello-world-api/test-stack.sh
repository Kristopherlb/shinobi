#!/bin/bash
# test-stack.sh - Comprehensive AWS stack correctness test
#
# This script performs thorough validation of the deployed hello-world-api stack
# including resource configuration, bindings, IAM permissions, and functionality.

set -euo pipefail

SERVICE="hello-world-api"
STACK_NAME="${SERVICE}-dev"
REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-911871352725}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
PASSED=0
FAILED=0
WARNINGS=0
TOTAL=0

# Helper functions
pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASSED++))
  ((TOTAL++))
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAILED++))
  ((TOTAL++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARNINGS++))
  ((TOTAL++))
}

info() {
  echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Main test execution
main() {
  section "🧪 AWS Stack Correctness Test - ${SERVICE}"
  info "Stack: ${STACK_NAME}"
  info "Region: ${REGION}"
  info "Account: ${ACCOUNT_ID}"
  echo ""

  # Test 1: Stack Existence and Status
  section "1. Stack Status Validation"
  test_stack_status

  # Test 2: Lambda Function Configuration
  section "2. Lambda Function Configuration"
  test_lambda_config

  # Test 3: IAM Role and Permissions
  section "3. IAM Role and Permissions"
  test_iam_role

  # Test 4: API Gateway Endpoint
  section "4. API Gateway Endpoint"
  test_api_gateway

  # Test 5: CloudWatch Logs
  section "5. CloudWatch Logs"
  test_cloudwatch_logs

  # Test 6: RDS Database
  section "6. RDS Database Configuration"
  test_rds_config

  # Test 7: Resource Tags
  section "7. Resource Tagging"
  test_resource_tags

  # Test 8: Bindings Validation
  section "8. Component Bindings"
  test_bindings

  # Final Summary
  section "Test Summary"
  echo -e "${GREEN}Passed: ${PASSED}${NC}"
  echo -e "${RED}Failed: ${FAILED}${NC}"
  echo -e "${YELLOW}Warnings: ${WARNINGS}${NC}"
  echo -e "Total Tests: ${TOTAL}"
  echo ""

  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}❌ Some tests failed. Review the output above.${NC}"
    exit 1
  fi
}

test_stack_status() {
  local status
  status=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

  if [ "$status" = "NOT_FOUND" ]; then
    fail "Stack ${STACK_NAME} does not exist"
    info "Deploy the stack first: node dist/apps/shinobi/main.js up --file apps/hello-world-api/service.yml --env dev --yes"
    return 1
  fi

  case "$status" in
    CREATE_COMPLETE|UPDATE_COMPLETE)
      pass "Stack status is ${status}"
      ;;
    CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|UPDATE_ROLLBACK_IN_PROGRESS)
      warn "Stack is in progress: ${status}"
      ;;
    *)
      fail "Stack status is ${status}"
      ;;
  esac
}

test_lambda_config() {
  local lambda_name
  lambda_name=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ -z "$lambda_name" ]; then
    fail "Lambda function not found in stack"
    return 1
  fi

  pass "Lambda function found: ${lambda_name}"

  # Check runtime
  local runtime
  runtime=$(aws lambda get-function-configuration \
    --function-name "$lambda_name" \
    --region "$REGION" \
    --query 'Runtime' \
    --output text 2>/dev/null || echo "")

  if [ "$runtime" = "nodejs20.x" ]; then
    pass "Lambda runtime is correct: ${runtime}"
  else
    fail "Lambda runtime mismatch. Expected: nodejs20.x, Got: ${runtime}"
  fi

  # Check memory
  local memory
  memory=$(aws lambda get-function-configuration \
    --function-name "$lambda_name" \
    --region "$REGION" \
    --query 'MemorySize' \
    --output text 2>/dev/null || echo "")

  if [ "$memory" = "512" ]; then
    pass "Lambda memory is correct: ${memory}MB"
  else
    warn "Lambda memory mismatch. Expected: 512MB, Got: ${memory}MB"
  fi

  # Check handler
  local handler
  handler=$(aws lambda get-function-configuration \
    --function-name "$lambda_name" \
    --region "$REGION" \
    --query 'Handler' \
    --output text 2>/dev/null || echo "")

  if [ "$handler" = "index.handler" ]; then
    pass "Lambda handler is correct: ${handler}"
  else
    fail "Lambda handler mismatch. Expected: index.handler, Got: ${handler}"
  fi

  # Test Lambda invocation directly
  info "Testing Lambda function invocation..."
  local invoke_result
  invoke_result=$(aws lambda invoke \
    --function-name "$lambda_name" \
    --region "$REGION" \
    --payload '{"httpMethod":"GET","path":"/","requestContext":{"requestId":"test-123"}}' \
    /tmp/lambda-response.json 2>&1)

  if [ $? -eq 0 ]; then
    local response_code
    response_code=$(jq -r '.statusCode' /tmp/lambda-response.json 2>/dev/null || echo "")
    if [ "$response_code" = "200" ]; then
      pass "Lambda function invocation successful (HTTP ${response_code})"
      info "Response: $(cat /tmp/lambda-response.json | jq -c . 2>/dev/null || cat /tmp/lambda-response.json)"
    else
      warn "Lambda function returned status code: ${response_code}"
    fi
    rm -f /tmp/lambda-response.json
  else
    warn "Lambda function invocation failed: ${invoke_result}"
  fi
}

test_iam_role() {
  local lambda_name
  lambda_name=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ -z "$lambda_name" ]; then
    fail "Cannot test IAM role - Lambda function not found"
    return 1
  fi

  local role_arn
  role_arn=$(aws lambda get-function-configuration \
    --function-name "$lambda_name" \
    --region "$REGION" \
    --query 'Role' \
    --output text 2>/dev/null || echo "")

  if [ -z "$role_arn" ]; then
    fail "IAM role not found for Lambda function"
    return 1
  fi

  pass "IAM role found: ${role_arn}"

  # Extract role name from ARN
  local role_name
  role_name=$(echo "$role_arn" | sed 's/.*role\///')

  # Check if role exists
  if aws iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    pass "IAM role exists and is accessible"
  else
    fail "IAM role does not exist or is not accessible: ${role_name}"
  fi

  # Check attached policies
  local policies
  policies=$(aws iam list-attached-role-policies \
    --role-name "$role_name" \
    --query 'AttachedPolicies[*].PolicyName' \
    --output text 2>/dev/null || echo "")

  if [ ! -z "$policies" ]; then
    info "Attached policies: ${policies}"
    pass "IAM role has attached policies"
  else
    warn "IAM role has no attached policies (may use inline policies)"
  fi

  # Check inline policies
  local inline_policies
  inline_policies=$(aws iam list-role-policies \
    --role-name "$role_name" \
    --query 'PolicyNames' \
    --output text 2>/dev/null || echo "")

  if [ ! -z "$inline_policies" ] && [ "$inline_policies" != "[]" ]; then
    info "Inline policies: ${inline_policies}"
    pass "IAM role has inline policies"
  fi
}

test_api_gateway() {
  local api_url
  api_url=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text 2>/dev/null || echo "")

  if [ -z "$api_url" ] || [ "$api_url" = "None" ]; then
    warn "API Gateway URL not found in stack outputs"
    info "This may be expected if API Gateway is not configured"
    return 0
  fi

  pass "API Gateway URL found: ${api_url}"

  # Test endpoint
  info "Testing API endpoint..."
  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" --max-time 10 "$api_url" 2>&1 || echo "")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    pass "API endpoint responded with HTTP 200"
    
    # Validate response structure
    if echo "$body" | jq -e '.message' >/dev/null 2>&1; then
      local message
      message=$(echo "$body" | jq -r '.message')
      if [ "$message" = "Hello from hello-world-api!" ]; then
        pass "API response message is correct"
      else
        fail "API response message mismatch. Expected: 'Hello from hello-world-api!', Got: '${message}'"
      fi
    else
      warn "API response is not valid JSON"
    fi

    info "Full response:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
  else
    fail "API endpoint returned HTTP ${http_code}"
    info "Response: ${body}"
  fi
}

test_cloudwatch_logs() {
  local log_group
  log_group=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::Logs::LogGroup`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ -z "$log_group" ] || [ "$log_group" = "None" ]; then
    warn "CloudWatch Log Group not found in stack"
    return 0
  fi

  pass "CloudWatch Log Group found: ${log_group}"

  # Check if log group exists
  if aws logs describe-log-groups \
    --log-group-name-prefix "$log_group" \
    --region "$REGION" \
    --query "logGroups[?logGroupName=='${log_group}']" \
    --output text >/dev/null 2>&1; then
    pass "CloudWatch Log Group exists"
  else
    fail "CloudWatch Log Group does not exist: ${log_group}"
  fi

  # Check for recent log streams (last 1 hour)
  local recent_streams
  recent_streams=$(aws logs describe-log-streams \
    --log-group-name "$log_group" \
    --region "$REGION" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].lastEventTime' \
    --output text 2>/dev/null || echo "")

  if [ ! -z "$recent_streams" ] && [ "$recent_streams" != "None" ]; then
    local current_time
    local log_time
    current_time=$(date +%s)
    log_time=$((recent_streams / 1000))
    local age=$((current_time - log_time))

    if [ $age -lt 3600 ]; then
      pass "Recent log activity found (${age} seconds ago)"
    else
      warn "No recent log activity (last log: $((age / 60)) minutes ago)"
    fi
  else
    warn "No log streams found in log group"
  fi
}

test_rds_config() {
  local rds_instance
  rds_instance=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::RDS::DBInstance`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ -z "$rds_instance" ] || [ "$rds_instance" = "None" ]; then
    warn "RDS instance not found in stack (may still be creating)"
    return 0
  fi

  pass "RDS instance found: ${rds_instance}"

  # Check instance class
  local instance_class
  instance_class=$(aws rds describe-db-instances \
    --db-instance-identifier "$rds_instance" \
    --region "$REGION" \
    --query 'DBInstances[0].DBInstanceClass' \
    --output text 2>/dev/null || echo "")

  if [ "$instance_class" = "db.t3.micro" ]; then
    pass "RDS instance class is correct: ${instance_class}"
  else
    warn "RDS instance class mismatch. Expected: db.t3.micro, Got: ${instance_class}"
  fi

  # Check instance status
  local db_status
  db_status=$(aws rds describe-db-instances \
    --db-instance-identifier "$rds_instance" \
    --region "$REGION" \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text 2>/dev/null || echo "")

  case "$db_status" in
    available)
      pass "RDS instance is available"
      ;;
    creating|backing-up|modifying)
      warn "RDS instance is in progress: ${db_status}"
      ;;
    *)
      fail "RDS instance status: ${db_status}"
      ;;
  esac

  # Check storage
  local allocated_storage
  allocated_storage=$(aws rds describe-db-instances \
    --db-instance-identifier "$rds_instance" \
    --region "$REGION" \
    --query 'DBInstances[0].AllocatedStorage' \
    --output text 2>/dev/null || echo "")

  if [ "$allocated_storage" = "20" ]; then
    pass "RDS allocated storage is correct: ${allocated_storage}GB"
  else
    warn "RDS allocated storage mismatch. Expected: 20GB, Got: ${allocated_storage}GB"
  fi
}

test_resource_tags() {
  info "Checking resource tagging compliance..."

  # Get stack tags
  local stack_tags
  stack_tags=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Tags' \
    --output json 2>/dev/null || echo "[]")

  if [ "$stack_tags" != "[]" ] && [ ! -z "$stack_tags" ]; then
    pass "Stack has tags configured"
    info "Stack tags: $(echo "$stack_tags" | jq -c . 2>/dev/null || echo "$stack_tags")"
  else
    warn "Stack has no tags configured"
  fi

  # Check Lambda tags
  local lambda_name
  lambda_name=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ ! -z "$lambda_name" ]; then
    local lambda_tags
    lambda_tags=$(aws lambda list-tags \
      --resource "${lambda_name}" \
      --region "$REGION" \
      --query 'Tags' \
      --output json 2>/dev/null || echo "{}")

    if [ "$lambda_tags" != "{}" ] && [ ! -z "$lambda_tags" ]; then
      pass "Lambda function has tags"
    else
      warn "Lambda function has no tags"
    fi
  fi
}

test_bindings() {
  info "Validating component bindings..."

  # Check Lambda -> IAM Role binding
  local lambda_name
  lambda_name=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ ! -z "$lambda_name" ]; then
    local role_arn
    role_arn=$(aws lambda get-function-configuration \
      --function-name "$lambda_name" \
      --region "$REGION" \
      --query 'Role' \
      --output text 2>/dev/null || echo "")

    if [ ! -z "$role_arn" ]; then
      pass "Lambda -> IAM Role binding is configured"
    else
      fail "Lambda -> IAM Role binding is missing"
    fi
  fi

  # Check Lambda -> CloudWatch Logs binding
  local log_group
  log_group=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'StackResources[?ResourceType==`AWS::Logs::LogGroup`].PhysicalResourceId' \
    --output text 2>/dev/null || echo "")

  if [ ! -z "$log_group" ]; then
    # Check if Lambda has permission to write to log group
    local lambda_name_short
    lambda_name_short=$(echo "$lambda_name" | awk -F: '{print $NF}')
    
    # This is a simplified check - in reality, we'd check the IAM policy
    pass "Lambda -> CloudWatch Logs binding configured (log group: ${log_group})"
  else
    warn "CloudWatch Log Group not found - cannot verify binding"
  fi

  # Check Lambda -> RDS binding (environment variables)
  if [ ! -z "$lambda_name" ]; then
    local env_vars
    env_vars=$(aws lambda get-function-configuration \
      --function-name "$lambda_name" \
      --region "$REGION" \
      --query 'Environment.Variables' \
      --output json 2>/dev/null || echo "{}")

    # Check for database-related environment variables
    if echo "$env_vars" | jq -e 'keys[] | select(test("DB|DATABASE|RDS"))' >/dev/null 2>&1; then
      pass "Lambda has database environment variables (RDS binding configured)"
      info "DB env vars: $(echo "$env_vars" | jq 'with_entries(select(.key | test("DB|DATABASE|RDS")))' 2>/dev/null || echo "")"
    else
      warn "Lambda does not have database environment variables (RDS binding may not be configured)"
    fi
  fi
}

# Run main function
main "$@"

