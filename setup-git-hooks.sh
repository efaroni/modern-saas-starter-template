#!/bin/bash

# Setup script for git hooks
echo "Setting up git hooks..."

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

echo "✅ Git hooks setup complete!"
echo "Unit tests will now run automatically before each commit."