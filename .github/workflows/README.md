# CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows Overview

### 🔄 Continuous Integration (`ci.yml`)

**Triggers**: Push and PR to main/develop branches
**Purpose**: Validates code quality, runs tests, and ensures build success

- **Quality Checks**: TypeScript, ESLint, Prettier
- **Tests**: Unit and integration tests with coverage
- **Build Verification**: Next.js production build
- **Database Validation**: Migration testing

### 🧪 E2E Tests (`e2e-tests.yml`)

**Triggers**: Push to main/develop, PR, scheduled, manual
**Purpose**: End-to-end testing across browsers

- **Browser Coverage**: Chromium, Firefox, WebKit
- **Mobile Testing**: iOS and Android viewports
- **Performance**: Lighthouse CI integration
- **Accessibility**: axe-playwright tests

### 🔒 Security Scanning (`security-scan.yml`)

**Triggers**: Push, PR, scheduled, manual
**Purpose**: Comprehensive security analysis

- **CodeQL**: Static code analysis
- **Secret Detection**: Gitleaks scanning
- **Dependencies**: npm audit and optional Snyk
- **License Compliance**: Checks for prohibited licenses
- **Custom Checks**: SaaS-specific security patterns

### 🚀 Deploy to Staging (`deploy-staging.yml`)

**Triggers**: Push to main/develop/staging, manual
**Purpose**: Automated staging deployments

- **Build & Test**: Type checking, linting, unit tests
- **Vercel Deployment**: Preview URLs for each deployment
- **Environment Variables**: Secure secret management

### 🎯 Deploy to Production (`deploy-production.yml`)

**Triggers**: Manual only (requires approval)
**Purpose**: Production deployments with safeguards

- **Approval Required**: Manual review before deployment
- **Health Checks**: Post-deployment validation
- **Rollback Support**: Automatic rollback on failure

### 🤖 Claude Code Review (`claude-code-review.yml`)

**Triggers**: Pull requests
**Purpose**: AI-powered code review

- **Bug Detection**: Identifies potential bugs
- **Security Review**: Finds security vulnerabilities
- **Best Practices**: Suggests improvements

### 📦 Dependency Updates (`dependency-update.yml`)

**Triggers**: Scheduled (weekly), manual
**Purpose**: Keep dependencies up to date

- **Security Updates**: Critical patches
- **Version Bumps**: Minor and patch updates
- **PR Creation**: Automated pull requests

## Required Secrets

Configure these in Settings > Secrets:

### Required for Core Functionality

- `CODECOV_TOKEN`: For code coverage reporting
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID
- `VERCEL_TOKEN`: Vercel authentication token
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code review authentication

### Optional Secrets

- `SNYK_TOKEN`: For Snyk vulnerability scanning (optional)
- `SLACK_WEBHOOK_URL`: For failure notifications
- `STRIPE_TEST_SECRET_KEY`: For payment integration tests
- `RESEND_API_KEY`: For email service tests

## Best Practices Implemented

1. **Concurrency Control**: Prevents duplicate runs for same PR/branch
2. **Dependency Caching**: Speeds up workflows with npm cache
3. **Matrix Testing**: Tests across Node.js versions (18, 20, 22)
4. **Fail-Fast Strategy**: Continues other jobs even if one fails
5. **Timeout Limits**: Prevents stuck workflows
6. **Error Reporting**: Clear summaries and artifacts
7. **Security**: Minimal permissions by default

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure all type definitions are installed
2. **Database Connection**: CI uses mock database for builds
3. **E2E Test Failures**: Check Playwright report artifacts
4. **Security Scan Failures**: Review SARIF reports in Security tab

### Debug Commands

```bash
# Run workflows locally with act
act push -W .github/workflows/ci.yml

# Test specific job
act -j quality-checks -W .github/workflows/ci.yml

# With secrets
act push -W .github/workflows/deploy-staging.yml -s VERCEL_TOKEN=xxx
```

## Maintenance

- Review and update Node.js versions quarterly
- Check for workflow action updates monthly
- Monitor workflow run times and optimize as needed
- Keep secrets rotated according to security policy
