#!/bin/bash

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

# Make the hook executable
chmod +x .git/hooks/pre-commit

# Verify the hook is executable
if [ -x .git/hooks/pre-commit ]; then
  echo "✅ Git hooks setup complete!"
  echo "Pre-commit hook will now run:"
  echo "  🔧 ESLint (code quality)"
  echo "  🎨 Prettier (code formatting)"
  echo "  🧪 Unit tests"
else
  echo "⚠️  Warning: Could not make pre-commit hook executable."
  echo "Please run: chmod +x .git/hooks/pre-commit"
fi