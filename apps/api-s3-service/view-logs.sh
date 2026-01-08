#!/bin/bash
# View CloudWatch Logs for the file-storage-api Lambda function
# This script helps you view and tail logs to verify the Lambda is working

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FUNCTION_NAME="file-storage-api"
REGION="us-west-2"
LOG_GROUP="/aws/lambda/${FUNCTION_NAME}"

echo -e "${BLUE}=== CloudWatch Logs for ${FUNCTION_NAME} ===${NC}\n"

# Check if log group exists
if ! aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP" \
  --region "$REGION" \
  --query "logGroups[?logGroupName=='${LOG_GROUP}']" \
  --output text | grep -q "$LOG_GROUP"; then
  echo -e "${YELLOW}⚠️  Log group ${LOG_GROUP} does not exist yet.${NC}"
  echo -e "${YELLOW}The Lambda function may not have been invoked yet.${NC}"
  echo -e "${YELLOW}Invoke the function first using ./test-lambda.sh${NC}"
  exit 1
fi

# Function to show recent logs
show_recent_logs() {
  echo -e "${GREEN}Fetching recent logs (last 5 minutes)...${NC}\n"
  
  START_TIME=$(($(date +%s) - 300))000  # 5 minutes ago in milliseconds
  
  aws logs filter-log-events \
    --log-group-name "$LOG_GROUP" \
    --start-time "$START_TIME" \
    --region "$REGION" \
    --query "events[*].[timestamp,message]" \
    --output text | \
    while IFS=$'\t' read -r timestamp message; do
      # Convert timestamp to readable date
      date_str=$(date -r $((timestamp / 1000)) '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -d "@$((timestamp / 1000))" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$timestamp")
      echo -e "${BLUE}[${date_str}]${NC} $message"
    done
}

# Function to tail logs
tail_logs() {
  echo -e "${GREEN}Tailing logs (press Ctrl+C to stop)...${NC}\n"
  
  # Get the latest stream
  STREAM_NAME=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --region "$REGION" \
    --query "logStreams[0].logStreamName" \
    --output text)
  
  if [ -z "$STREAM_NAME" ] || [ "$STREAM_NAME" == "None" ]; then
    echo -e "${YELLOW}No log streams found. Waiting for new logs...${NC}"
    STREAM_NAME=""
  else
    echo -e "${GREEN}Following stream: ${STREAM_NAME}${NC}\n"
  fi
  
  # Start tailing
  aws logs tail "$LOG_GROUP" \
    --region "$REGION" \
    --follow \
    --format short
}

# Function to show SQS queue metrics
show_sqs_metrics() {
  echo -e "\n${BLUE}=== SQS Queue Metrics ===${NC}\n"
  
  STACK_NAME="api-s3-service-dev"
  QUEUE_NAME=$(aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::SQS::Queue' && LogicalResourceId=='fileprocessingqueueMainQueue'].PhysicalResourceId" \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$QUEUE_NAME" ]; then
    echo -e "${YELLOW}Could not find SQS queue name.${NC}"
    return
  fi
  
  echo -e "${GREEN}Queue: ${QUEUE_NAME}${NC}\n"
  
  # Get approximate number of messages
  aws cloudwatch get-metric-statistics \
    --namespace AWS/SQS \
    --metric-name ApproximateNumberOfMessagesVisible \
    --dimensions Name=QueueName,Value="$QUEUE_NAME" \
    --start-time "$(date -u -v-5M +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
    --period 300 \
    --statistics Average \
    --region "$REGION" \
    --output table 2>/dev/null || echo -e "${YELLOW}No metrics available yet${NC}"
}

# Main menu
case "${1:-recent}" in
  recent)
    show_recent_logs
    ;;
  tail|follow)
    tail_logs
    ;;
  metrics)
    show_sqs_metrics
    ;;
  all)
    show_recent_logs
    echo ""
    show_sqs_metrics
    ;;
  *)
    echo "Usage: $0 [recent|tail|metrics|all]"
    echo ""
    echo "  recent  - Show recent logs (last 5 minutes) [default]"
    echo "  tail    - Follow logs in real-time"
    echo "  metrics - Show SQS queue metrics"
    echo "  all     - Show recent logs and metrics"
    exit 1
    ;;
esac


