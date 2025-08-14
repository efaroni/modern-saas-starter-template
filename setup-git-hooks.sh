#!/bin/bash

# ADDED this only for git worktrees

# Determine if we're in the main repo (not a worktree)
REPO_ROOT=$(git rev-parse --git-common-dir 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
  echo "❌ Error: Not inside a Git repository"
  exit 1
fi

if [ "$REPO_ROOT" != ".git" ]; then
  echo "⚠️ Skipping git hook setup: not in main Git repo root"
  exit 0
fi

# DONE adding only for git worktrees

# Setup script for git hooks
echo "Setting up git hooks..."

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "❌ Error: This script must be run from the root of a git repository"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh

echo "🔍 Running pre-commit checks..."

# Create temporary file for safe file list handling
TEMP_FILE_LIST="/tmp/staged_files_$$"
git diff --cached --name-only --diff-filter=ACM | \
  grep -E '\.(ts|tsx|js|jsx|mjs|json|md|css|scss|yaml|yml)$' > "$TEMP_FILE_LIST"

# Check if we have any files to process
if [ ! -s "$TEMP_FILE_LIST" ]; then
  echo "ℹ️  No lintable files staged, skipping lint/format checks"
  rm -f "$TEMP_FILE_LIST"
else
  FILE_COUNT=$(wc -l < "$TEMP_FILE_LIST")
  echo "📋 Checking $FILE_COUNT staged files"
  
  # Run ESLint check on staged files only - secure file processing
  echo "🔧 Running ESLint..."
  if command -v xargs >/dev/null 2>&1; then
    # Use xargs with null delimiter for safety (handles spaces and special chars)
    tr '\n' '\0' < "$TEMP_FILE_LIST" | xargs -0 npx eslint
  else
    # Fallback: process files one by one (safer but slower)
    while IFS= read -r file; do
      npx eslint "$file"
    done < "$TEMP_FILE_LIST"
  fi
  ESLINT_EXIT_CODE=$?
  
  if [ $ESLINT_EXIT_CODE -ne 0 ]; then
    echo "❌ ESLint found issues."
    echo "💡 Run 'npm run lint:fix' to auto-fix some issues, then re-stage your files."
    rm -f "$TEMP_FILE_LIST"
    exit 1
  fi
  
  # Run Prettier check on staged files only - secure file processing
  echo "🎨 Running Prettier check..."
  if command -v xargs >/dev/null 2>&1; then
    # Use xargs with null delimiter for safety
    tr '\n' '\0' < "$TEMP_FILE_LIST" | xargs -0 npx prettier --check
  else
    # Fallback: process files one by one
    while IFS= read -r file; do
      npx prettier --check "$file"
    done < "$TEMP_FILE_LIST"
  fi
  PRETTIER_EXIT_CODE=$?
  
  # Clean up temp file
  rm -f "$TEMP_FILE_LIST"
  
  if [ $PRETTIER_EXIT_CODE -ne 0 ]; then
    echo "❌ Code formatting issues found."
    echo "💡 Run 'npm run format' to fix formatting, then re-stage your files."
    exit 1
  fi
  
  echo "✅ Linting and formatting checks passed!"
fi

# Run unit tests
echo "🧪 Running unit tests..."
npm test

# Check if tests passed
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Please fix the tests before committing."
  exit 1
fi

echo "✅ All pre-commit checks passed!"
exit 0
EOF

# Create commit-msg hook for commitlint
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/sh

# Run commitlint on the commit message
npx --no-install commitlint --edit $1

# Check if commitlint passed
if [ $? -ne 0 ]; then
  echo "❌ Commit message does not meet conventional commit standards."
  echo "💡 Format: type(scope): description"
  echo "   Examples: feat(auth): add oauth, fix(api): handle errors"
  exit 1
fi
EOF

# Make both hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg

# Verify the hooks are executable
if [ -x .git/hooks/pre-commit ] && [ -x .git/hooks/commit-msg ]; then
  echo "✅ Git hooks setup complete!"
  echo "Pre-commit hook will run:"
  echo "  🔧 ESLint (code quality)"
  echo "  🎨 Prettier (code formatting)"
  echo "  🧪 Unit tests"
  echo "Commit-msg hook will run:"
  echo "  📝 Commitlint (conventional commits)"
else
  echo "⚠️  Warning: Could not make hooks executable."
  echo "Please run: chmod +x .git/hooks/pre-commit .git/hooks/commit-msg"
fi