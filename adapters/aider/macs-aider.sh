#!/bin/bash
# MACS × Aider Wrapper
# Automatically claim a task, run Aider with MACS context, record completion.
#
# Usage:
#   ./macs-aider.sh [aider-options]
#   MACS_AGENT_ID=aider-backend ./macs-aider.sh

set -e

AGENT_ID="${MACS_AGENT_ID:-aider-$(hostname)}"
MACS_CMD="${MACS_CMD:-macs}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}[MACS]${NC} Agent: $AGENT_ID"

# Register agent if not already registered
$MACS_CMD register "$AGENT_ID" \
  --capabilities "${MACS_CAPABILITIES:-backend,refactoring}" \
  --model "${MACS_MODEL:-gpt-4}" 2>/dev/null || true

# Check inbox
echo -e "${GREEN}[MACS]${NC} Checking inbox..."
$MACS_CMD inbox "$AGENT_ID" --unread 2>/dev/null || true

# Claim a task
echo -e "${GREEN}[MACS]${NC} Claiming task..."
TASK_JSON=$($MACS_CMD claim --agent "$AGENT_ID" --json 2>/dev/null || echo "")

if [ -z "$TASK_JSON" ] || [ "$TASK_JSON" = "null" ]; then
  echo -e "${YELLOW}[MACS]${NC} No tasks available. Run 'macs status' to check."
  exit 0
fi

TASK_ID=$(echo "$TASK_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
TASK_TITLE=$(echo "$TASK_JSON" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)

echo -e "${GREEN}[MACS]${NC} Claimed: $TASK_ID — $TASK_TITLE"

# Start task
$MACS_CMD start "$TASK_ID" --agent "$AGENT_ID"

# Run Aider with MACS context
echo -e "${GREEN}[MACS]${NC} Starting Aider..."
aider \
  --read .macs/human/STATUS.md \
  --read AGENT-GUIDE.md \
  --message "You are agent '$AGENT_ID' working on task $TASK_ID: '$TASK_TITLE'. Follow the rules in AGENT-GUIDE.md for coordination with other agents." \
  "$@" || true

# Prompt for completion
echo ""
echo -e "${GREEN}[MACS]${NC} Aider session ended."
echo -e "Artifacts created (comma-separated file paths, or press Enter to skip):"
read -r ARTIFACTS

if [ -n "$ARTIFACTS" ]; then
  $MACS_CMD done "$TASK_ID" --agent "$AGENT_ID" --artifacts "$ARTIFACTS"
else
  $MACS_CMD done "$TASK_ID" --agent "$AGENT_ID"
fi

# Regenerate human-readable docs
$MACS_CMD generate
echo -e "${GREEN}[MACS]${NC} Done. Updated .macs/human/ documentation."
