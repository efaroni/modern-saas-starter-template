# Database Migrations Guide

This guide covers the professional-grade database migration setup for your Next.js SaaS application using Drizzle ORM, Neon (PostgreSQL), and GitHub Actions.

## Overview

Our migration system follows industry best practices:

- **Separation of Concerns**: CI/CD handles infrastructure, Vercel handles application
- **Safety First**: Migrations run before deployment with validation
- **Rollback Ready**: Can abort deployment if migrations fail
- **Full Auditability**: Clear logs of all database changes

## Architecture

```
GitHub Push → GitHub Actions → Run Migrations → Deploy to Vercel
                   ↓               ↓              ↓
            (GitHub Secrets)  (Success/Fail)  (App runs)
```

## Required Setup

### 1. GitHub Secrets Configuration

You need to add the following secrets to your GitHub repository:

**Required Secrets:**

- `STAGING_DATABASE_URL` - Your Neon staging database connection string
- `PRODUCTION_DATABASE_URL` - Your Neon production database connection string

**Optional Secrets (for automatic backups):**

- `NEON_API_KEY` - Neon API key for creating backups
- `NEON_PROJECT_ID` - Your Neon project ID

**How to add GitHub Secrets:**

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Add the secrets:

```
Name: STAGING_DATABASE_URL
Value: postgresql://username:password@ep-staging-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require

Name: PRODUCTION_DATABASE_URL
Value: postgresql://username:password@ep-production-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require

Name: NEON_API_KEY (optional)
Value: your-neon-api-key

Name: NEON_PROJECT_ID (optional)
Value: your-neon-project-id
```

**⚠️ Important:** These are different from your Vercel environment variables. GitHub Actions needs its own database credentials to run migrations.

### 2. Neon Database Setup

Ensure your Neon databases are configured:

1. **Staging Database**: Create a separate database for staging
2. **Production Database**: Create a separate database for production
3. **Connection Strings**: Copy the connection strings from Neon dashboard
4. **SSL Mode**: Always use `sslmode=require` for Neon connections
5. **API Access**: (Optional) Create Neon API key for automatic backups

### 3. Environment Variables

Your environment variables should be consistent across all environments:

```bash
# Same variable names everywhere (local, staging, production)
DB_HOST=your-neon-host.aws.neon.tech
DB_PORT=5432
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
```

**Local (.env.local):**

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=saas_template
```

**Vercel Staging Environment Variables:**

```bash
DB_HOST=your-staging-neon-host.aws.neon.tech
DB_PORT=5432
DB_USER=staging_user
DB_PASSWORD=staging_password
DB_NAME=saas_staging
```

## Migration Workflow

### Development Process

1. **Make Schema Changes**

   ```bash
   # Edit lib/db/schema.ts
   npm run db:generate  # Generate migration files
   npm run db:migrate   # Test locally
   ```

2. **Deploy to Staging**

   ```bash
   git add lib/db/migrations/
   git commit -m "feat: add user preferences table"
   git push origin staging  # Deploys to staging with migrations
   ```

3. **Deploy to Production**

   ```bash
   # Create GitHub Release
   gh release create v1.2.0 --title "User Preferences Feature" --notes "Added user preferences table"
   # OR use GitHub UI to create release
   ```

4. **Automatic Deployment Behavior**
   - **Staging**: Deploys on push to `staging` branch
   - **Production**: Deploys on GitHub Release publication
   - Migrations run automatically before deployment
   - Deployment aborts if migrations fail

### Migration Scripts

#### Available Scripts

1. **Run Migrations** (`scripts/run-migrations.ts`)

   ```bash
   # Basic migration
   tsx scripts/run-migrations.ts

   # Dry run (preview only)
   tsx scripts/run-migrations.ts --dry-run

   # With validation
   tsx scripts/run-migrations.ts --validate

   # Production-grade with comprehensive checks
   tsx scripts/run-migrations.ts --validate --comprehensive
   ```

2. **Database Validation** (`scripts/validate-database.ts`)

   ```bash
   # Basic validation
   tsx scripts/validate-database.ts

   # Comprehensive checks
   tsx scripts/validate-database.ts --comprehensive

   # Performance benchmarks
   tsx scripts/validate-database.ts --performance
   ```

#### Script Features

**Migration Runner (`run-migrations.ts`):**

- ✅ Environment validation
- ✅ Connection testing with retries
- ✅ Transaction-safe migrations
- ✅ Post-migration validation
- ✅ Comprehensive error handling
- ✅ Detailed logging for CI/CD

**Database Validator (`validate-database.ts`):**

- ✅ Connectivity checks
- ✅ Schema structure validation
- ✅ Data integrity verification
- ✅ Performance benchmarking
- ✅ Index optimization analysis
- ✅ Connection pool monitoring

## GitHub Actions Integration

### Staging Workflow

The staging deployment workflow (`deploy-staging.yml`) runs migrations before deployment:

```yaml
- name: Run database migrations
  env:
    DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
    NODE_ENV: production
  run: |
    echo "🔄 Running database migrations for staging..."
    tsx scripts/run-migrations.ts --validate
    echo "✅ Database migrations completed successfully"
```

**Triggers:** Push to `staging` branch

### Production Workflow

The production deployment workflow (`deploy-production.yml`) includes enhanced safety:

```yaml
- name: Create database backup
  env:
    NEON_API_KEY: ${{ secrets.NEON_API_KEY }}
    NEON_PROJECT_ID: ${{ secrets.NEON_PROJECT_ID }}
  run: |
    # Creates automatic database backup via Neon API

- name: Run production database migrations
  env:
    DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
    NODE_ENV: production
  run: |
    tsx scripts/run-migrations.ts --validate --comprehensive
```

**Triggers:** GitHub Release publication

**Migration Process:**

1. Creates automatic database backup (if Neon API configured)
2. Validates environment configuration
3. Tests database connectivity
4. Applies pending migrations
5. Runs comprehensive validation and performance checks
6. Proceeds with Vercel deployment if successful
7. Aborts deployment if migrations fail

## Safety Features

### Pre-Migration Checks

- Environment validation
- Database connectivity testing
- Migration file validation
- Dry-run capability

### During Migration

- Transaction-safe operations
- Progress logging
- Error capture and reporting
- Connection retry logic

### Post-Migration

- Schema integrity validation
- Data consistency checks
- Performance verification
- Health check endpoints

### Rollback Strategy

If migrations fail:

1. GitHub Actions job fails immediately
2. Vercel deployment is aborted
3. Previous version continues running
4. Migration logs available for debugging
5. Manual rollback available through Neon dashboard

## Troubleshooting

### Common Issues

1. **Migration Fails: "DATABASE_URL not found"**
   - Ensure `STAGING_DATABASE_URL` is set in GitHub Secrets
   - Verify the connection string format

2. **Migration Fails: "Connection timeout"**
   - Check Neon database status
   - Verify network connectivity
   - Check if database is sleeping (Neon auto-suspend)

3. **Migration Fails: "Permission denied"**
   - Ensure database user has CREATE/ALTER permissions
   - Check if schema changes require superuser privileges

4. **Validation Fails After Migration**
   - Check migration files for syntax errors
   - Verify schema changes are correct
   - Review data integrity constraints

### Debug Commands

```bash
# Test migration locally
DATABASE_URL="your-staging-url" tsx scripts/run-migrations.ts --dry-run

# Validate staging database
DATABASE_URL="your-staging-url" tsx scripts/validate-database.ts --comprehensive

# Check migration status
npm run db:studio  # Open Drizzle Studio
```

### Log Analysis

Migration logs include:

- Environment validation results
- Connection test outcomes
- Migration execution details
- Validation check results
- Performance metrics
- Error details with stack traces

## Best Practices

### Migration Design

- ✅ Make migrations idempotent when possible
- ✅ Use transactions for multi-statement migrations
- ✅ Add proper indexes for new columns
- ✅ Consider migration performance impact
- ❌ Never modify existing migration files

### Schema Changes

- ✅ Use backward-compatible changes when possible
- ✅ Add columns as nullable initially
- ✅ Use proper foreign key constraints
- ✅ Index frequently queried columns
- ❌ Avoid breaking changes without version bumps

### Data Migrations

- ✅ Seed only essential system data
- ✅ Use environment-specific seed files
- ✅ Validate data after seeding
- ❌ Never seed test data in production

## Security Considerations

### Credential Management

- Database credentials stored in GitHub Secrets
- Separate credentials for migration vs. runtime
- SSL required for all remote connections
- Regular credential rotation

### Access Control

- Migration credentials have DDL permissions
- Runtime credentials have minimal required permissions
- Audit logs for all database changes
- Network restrictions where possible

## Monitoring and Alerting

### What to Monitor

- Migration execution time
- Database connection health
- Schema drift detection
- Performance regression
- Error rates

### Available Metrics

- Migration duration
- Validation check results
- Database performance benchmarks
- Connection pool usage
- Index effectiveness

## Support

### Getting Help

1. Check migration logs in GitHub Actions
2. Review this documentation
3. Test migrations locally first
4. Use dry-run mode for validation

### Emergency Procedures

1. **Migration Failure**: Check logs, fix issues, re-run
2. **Data Corruption**: Use Neon point-in-time recovery
3. **Performance Issues**: Check indexes and query plans
4. **Connection Issues**: Verify Neon database status

---

## Quick Reference

### Environment Setup Checklist

- [ ] `STAGING_DATABASE_URL` added to GitHub Secrets
- [ ] `PRODUCTION_DATABASE_URL` added to GitHub Secrets
- [ ] `NEON_API_KEY` added to GitHub Secrets (optional, for backups)
- [ ] `NEON_PROJECT_ID` added to GitHub Secrets (optional, for backups)
- [ ] Neon staging database created and accessible
- [ ] Neon production database created and accessible
- [ ] Migration files committed to repository
- [ ] Local development environment tested

### Before Each Release

- [ ] Test migrations locally
- [ ] Deploy and validate on staging first
- [ ] Run comprehensive validation checks
- [ ] Review migration logs
- [ ] Create GitHub Release to trigger production deployment
- [ ] Monitor production deployment

### Emergency Contacts

- **Database Issues**: Check Neon dashboard
- **CI/CD Issues**: Review GitHub Actions logs
- **Application Issues**: Check Vercel deployment logs
