#!/bin/bash

# Start test database
echo "Starting test database..."
docker-compose -f docker-compose.test.yml up -d test-db

# Wait for database to be ready
echo "Waiting for database to be ready..."
until docker exec saas-template-test-db pg_isready -U test_user -d saas_template_test; do
  echo "Database not ready yet, waiting..."
  sleep 1
done

echo "Test database is ready!"

# Run migrations to set up schema
echo "Running migrations..."
npx drizzle-kit push --config=scripts/drizzle.config.test.ts

echo "Test database setup complete!" 