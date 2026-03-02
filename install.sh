#!/usr/bin/env bash
# MACS Universal Installer
# Automatically detects platform and installs MACS

set -e

VERSION="2.3.0"
MACS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Banner
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  MACS Universal Installer v${VERSION}      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  Multi-Agent Collaboration System         ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Get target directory
TARGET_DIR="${1:-.}"
cd "$TARGET_DIR"
PROJECT_NAME="${2:-$(basename $(pwd))}"

print_info "Target directory: $(pwd)"
print_info "Project name: $PROJECT_NAME"
echo ""

# Detect platform
detect_platform() {
  # Check for Claude Code
  if [ -f ".claude/settings.local.json" ] || [ -d ".claude" ]; then
    echo "claude-code"
    return
  fi

  # Check for Cursor
  if [ -f ".cursorrules" ] || command -v cursor &> /dev/null; then
    echo "cursor"
    return
  fi

  # Check for Continue.dev
  if [ -f ".continuerc.json" ] || [ -f ".continue/config.json" ]; then
    echo "continue"
    return
  fi

  # Check for OpenClaw
  if command -v openclaw &> /dev/null; then
    echo "openclaw"
    return
  fi

  # Check for ZeroClaw
  if command -v zeroclaw &> /dev/null; then
    echo "zeroclaw"
    return
  fi

  # Check for NanoClaw
  if command -v nanoclaw &> /dev/null; then
    echo "nanoclaw"
    return
  fi

  # Check for VS Code
  if [ -d ".vscode" ] || command -v code &> /dev/null; then
    echo "vscode"
    return
  fi

  # Default: generic
  echo "generic"
}

PLATFORM=$(detect_platform)

print_info "Detected platform: ${PLATFORM}"
echo ""

# Install based on platform
case "$PLATFORM" in
  claude-code)
    print_success "Claude Code detected!"
    echo ""

    # Create .claude/skills/macs if not exists
    mkdir -p .claude/skills/macs

    # Copy SKILL.md
    if [ -f "$MACS_DIR/SKILL.md" ]; then
      cp "$MACS_DIR/SKILL.md" .claude/skills/macs/SKILL.md
      print_success "Installed MACS skill to .claude/skills/macs/"
    fi

    # Initialize templates
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    echo ""
    print_success "MACS installed for Claude Code!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart Claude Code (or run: source ~/.zshrc)"
    echo "  2. Type /macs to use MACS commands"
    echo "  3. Edit TASK.md to add your first tasks"
    echo "  4. Run: macs dashboard"
    ;;

  cursor)
    print_success "Cursor detected!"
    echo ""

    # Copy templates
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    # Check if .cursorrules exists
    if [ -f ".cursorrules" ]; then
      print_warning ".cursorrules already exists. Appending MACS instructions..."
      echo "" >> .cursorrules
    fi

    # Append MACS instructions to .cursorrules
    cat >> .cursorrules << 'EOF'

# ═══════════════════════════════════════════════════════════
# MACS (Multi-Agent Collaboration System)
# ═══════════════════════════════════════════════════════════

## 📋 Before Starting Work

Always read these files first:
- **TASK.md** - Task board (what to do)
- **CHANGELOG.md** - Recent changes (what was done)
- **CONTEXT.md** - Project context (why we did it)

## ✍️ After Completing Work

Update these files:
1. **CHANGELOG.md**: Add entry in this format:
   ```
   - [type] Description - by cursor-agent #tags
   ```
   Types: ✨feat, 🐛fix, ♻️refactor, 📝docs, ⚡perf, 🔧config
   Tags: #dev, #ops, #docs, #design, etc.

2. **TASK.md**: Mark task as completed `[x]`

3. **CONTEXT.md** (optional): Add important decisions or insights

## 🚨 If Blocked

If you encounter:
- Architectural decisions beyond your scope
- Ambiguous requirements
- Blocking issues

Add entry to TASK.md → 🚨 Escalations section with:
- Task description
- Why blocked
- What needs to be decided

## 📊 Token Optimization

Use MACS index for efficient querying:
```bash
# Generate index (run this after major changes)
macs index .

# Query instead of reading full files
# (Saves 99% tokens: 3000 → 30 tokens per query)
```

## 🎯 Collaboration Protocol

- Read TASK.md to know current priorities
- Update CHANGELOG.md after every significant change
- Use tags (#dev, #ops, #docs) to categorize work
- Identify yourself as "cursor-agent" in CHANGELOG

EOF

    print_success "Added MACS instructions to .cursorrules"

    echo ""
    print_success "MACS installed for Cursor!"
    echo ""
    echo "Next steps:"
    echo "  1. Cursor will automatically read .cursorrules"
    echo "  2. Edit TASK.md to add your first tasks"
    echo "  3. Start working with Cursor Agent"
    echo "  4. Run: macs dashboard (to visualize progress)"
    ;;

  continue)
    print_success "Continue.dev detected!"
    echo ""

    # Copy templates
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    # Create .continue directory if not exists
    mkdir -p .continue

    # Add MACS context provider to config
    if [ -f ".continue/config.json" ]; then
      print_warning ".continue/config.json exists. Manual integration required."
      print_info "Add MACS files to contextProviders in .continue/config.json"
    else
      cat > .continue/config.json << 'EOF'
{
  "contextProviders": [
    {
      "name": "macs-task",
      "params": {
        "filepath": "TASK.md"
      }
    },
    {
      "name": "macs-changelog",
      "params": {
        "filepath": "CHANGELOG.md"
      }
    },
    {
      "name": "macs-context",
      "params": {
        "filepath": "CONTEXT.md"
      }
    }
  ],
  "slashCommands": [
    {
      "name": "macs-update",
      "description": "Update MACS documents after work",
      "prompt": "Please update CHANGELOG.md with your changes in the format: [type] description - by continue-agent #tags"
    }
  ]
}
EOF
      print_success "Created .continue/config.json with MACS integration"
    fi

    echo ""
    print_success "MACS installed for Continue.dev!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart VS Code"
    echo "  2. Use @macs-task, @macs-changelog, @macs-context in prompts"
    echo "  3. Edit TASK.md to add your first tasks"
    ;;

  openclaw)
    print_success "OpenClaw detected!"
    echo ""

    # OpenClaw natively supports stigmergy (document-driven collaboration)
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    print_success "MACS templates installed!"
    print_info "OpenClaw natively supports document-driven collaboration."

    echo ""
    print_success "MACS installed for OpenClaw!"
    echo ""
    echo "Next steps:"
    echo "  1. Edit TASK.md to add your first tasks"
    echo "  2. OpenClaw agents will automatically read MACS documents"
    echo "  3. Run: macs dashboard"
    ;;

  zeroclaw|nanoclaw)
    print_success "${PLATFORM} detected!"
    echo ""

    # Copy templates
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    print_success "MACS templates installed!"

    echo ""
    print_success "MACS installed for ${PLATFORM}!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure ${PLATFORM} to read TASK.md, CHANGELOG.md, CONTEXT.md"
    echo "  2. Edit TASK.md to add your first tasks"
    echo "  3. Run: macs dashboard"
    ;;

  vscode)
    print_success "VS Code detected!"
    echo ""

    # Copy templates
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    print_warning "VS Code detected but no specific AI assistant found."
    print_info "MACS templates have been installed."
    print_info "You can use MACS with:"
    print_info "  - Continue.dev (install extension)"
    print_info "  - GitHub Copilot Chat"
    print_info "  - Any VS Code AI extension"

    echo ""
    print_success "MACS templates installed!"
    echo ""
    echo "Next steps:"
    echo "  1. Install an AI assistant extension (Continue, Copilot, etc.)"
    echo "  2. Configure it to read TASK.md, CHANGELOG.md, CONTEXT.md"
    echo "  3. Edit TASK.md to add your first tasks"
    ;;

  generic)
    print_warning "No specific platform detected."
    echo ""

    # Copy templates
    "$MACS_DIR/scripts/init.sh" "$PROJECT_NAME" .

    print_success "MACS templates installed!"

    echo ""
    print_info "Manual configuration required for your platform."
    echo ""
    echo "To use MACS:"
    echo "  1. Configure your AI agent to read:"
    echo "     - TASK.md (task board)"
    echo "     - CHANGELOG.md (change history)"
    echo "     - CONTEXT.md (project context)"
    echo ""
    echo "  2. After each change, update:"
    echo "     - CHANGELOG.md with: [type] description - by {agent} #tags"
    echo "     - TASK.md: mark tasks as completed"
    echo ""
    echo "  3. Run: macs dashboard (to visualize progress)"
    ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Optional: Generate index
if command -v node &> /dev/null; then
  print_info "Generating MACS index for token optimization..."
  if [ -f "$MACS_DIR/scripts/macs" ]; then
    "$MACS_DIR/scripts/macs" index . 2>/dev/null || true
  fi
fi

echo ""
print_success "Installation complete!"
echo ""
print_info "Documentation: https://github.com/your-org/macs"
print_info "Issues: https://github.com/your-org/macs/issues"
echo ""
