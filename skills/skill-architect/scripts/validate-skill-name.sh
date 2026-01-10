#!/bin/bash

# Validate skill name against Agent Skills specification
# Usage: ./validate-skill-name.sh <skill-name>

set -e

SKILL_NAME="${1:-}"

if [ -z "$SKILL_NAME" ]; then
  echo "Error: Skill name is required"
  echo "Usage: $0 <skill-name>"
  exit 1
fi

ERRORS=0

# Check length (1-64 characters)
if [ ${#SKILL_NAME} -lt 1 ] || [ ${#SKILL_NAME} -gt 64 ]; then
  echo "❌ Error: Skill name must be 1-64 characters. Got: ${#SKILL_NAME} characters."
  ERRORS=$((ERRORS + 1))
fi

# Check for lowercase alphanumeric and hyphens only
if ! echo "$SKILL_NAME" | grep -qE '^[a-z0-9-]+$'; then
  echo "❌ Error: Skill name may only contain lowercase letters, numbers, and hyphens."
  echo "   Got: \"$SKILL_NAME\""
  ERRORS=$((ERRORS + 1))
fi

# Check for leading hyphen
if [[ "$SKILL_NAME" == -* ]]; then
  echo "❌ Error: Skill name must not start with a hyphen."
  echo "   Got: \"$SKILL_NAME\""
  ERRORS=$((ERRORS + 1))
fi

# Check for trailing hyphen
if [[ "$SKILL_NAME" == *- ]]; then
  echo "❌ Error: Skill name must not end with a hyphen."
  echo "   Got: \"$SKILL_NAME\""
  ERRORS=$((ERRORS + 1))
fi

# Check for consecutive hyphens
if echo "$SKILL_NAME" | grep -qE '--'; then
  echo "❌ Error: Skill name must not contain consecutive hyphens."
  echo "   Got: \"$SKILL_NAME\""
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
  echo "✅ Skill name \"$SKILL_NAME\" is valid according to Agent Skills specification."
  exit 0
else
  echo ""
  echo "Validation failed with $ERRORS error(s)."
  echo "See https://agentskills.io/specification for naming rules."
  exit 1
fi


