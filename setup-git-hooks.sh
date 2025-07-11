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

# Run unit tests before commit
echo "Running unit tests before commit..."

# Run jest tests
npm test

# Check if tests passed
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Please fix the tests before committing."
  exit 1
fi

echo "✅ All unit tests passed!"
exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

# Verify the hook is executable
if [ -x .git/hooks/pre-commit ]; then
  echo "✅ Git hooks setup complete!"
  echo "Unit tests will now run automatically before each commit."
else
  echo "⚠️  Warning: Could not make pre-commit hook executable."
  echo "Please run: chmod +x .git/hooks/pre-commit"
fi