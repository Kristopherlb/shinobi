#!/bin/bash
# View CloudWatch Logs for the queue-processor Lambda function

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FUNCTION_NAME="queue-processor"
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
  echo -e "${YELLOW}Send a message to the queue first using ./test-queue-processor.sh${NC}"
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
  
  aws logs tail "$LOG_GROUP" \
    --region "$REGION" \
    --follow \
    --format short
}

# Main menu
case "${1:-recent}" in
  recent)
    show_recent_logs
    ;;
  tail|follow)
    tail_logs
    ;;
  *)
    echo "Usage: $0 [recent|tail]"
    echo ""
    echo "  recent  - Show recent logs (last 5 minutes) [default]"
    echo "  tail    - Follow logs in real-time"
    exit 1
    ;;
esac


