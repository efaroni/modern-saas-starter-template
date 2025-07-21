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

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|mjs|json|md|css|scss|yaml|yml)$')

if [ -z "$STAGED_FILES" ]; then
  echo "ℹ️  No lintable files staged, skipping lint/format checks"
else
  echo "📋 Checking staged files: $(echo $STAGED_FILES | wc -w) files"
  
  # Run ESLint check on staged files only
  echo "🔧 Running ESLint..."
  npx eslint $STAGED_FILES
  ESLINT_EXIT_CODE=$?
  
  if [ $ESLINT_EXIT_CODE -ne 0 ]; then
    echo "❌ ESLint found issues."
    echo "💡 Run 'npm run lint:fix' to auto-fix some issues, then re-stage your files."
    exit 1
  fi
  
  # Run Prettier check on staged files only
  echo "🎨 Running Prettier check..."
  npx prettier --check $STAGED_FILES
  PRETTIER_EXIT_CODE=$?
  
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