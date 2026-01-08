#!/bin/bash
# Detects if running in sandbox environment by testing nx execution
# Returns 0 if normal environment, 1 if sandbox

set -e

TIMEOUT=2  # 2 second timeout

# Try to execute nx with timeout
if timeout $TIMEOUT pnpm nx --version > /dev/null 2>&1; then
    echo "normal"
    exit 0
else
    echo "sandbox"
    exit 0
fi

