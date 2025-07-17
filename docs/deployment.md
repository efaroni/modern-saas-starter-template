# Deployment Guide

This guide provides step-by-step instructions for deploying the modern SaaS starter template with authentication to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Redis Setup](#redis-setup)
5. [Email Service Setup](#email-service-setup)
6. [OAuth Configuration](#oauth-configuration)
7. [Deployment Platforms](#deployment-platforms)
8. [Security Configuration](#security-configuration)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Post-Deployment](#post-deployment)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- PostgreSQL 14+ database
- Redis 6+ instance
- Email service (Resend, SendGrid, etc.)
- OAuth provider credentials (Google, GitHub)
- SSL certificate for HTTPS
- Domain name

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```env
# Application
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secret-key-here

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Redis (optional but recommended)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Email Service
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Security
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Cache Configuration
ENABLE_CACHE=true
CACHE_TTL=300

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true

# Optional: Sentry for error tracking
SENTRY_DSN=your-sentry-dsn
```

### Secure Secret Generation

Generate secure secrets:

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate strong database password
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 32
```

## Database Setup

### 1. PostgreSQL Installation

#### Option A: Managed Database (Recommended)

Use a managed PostgreSQL service:
- **Vercel Postgres**
- **Supabase**
- **PlanetScale**
- **AWS RDS**
- **Google Cloud SQL**

#### Option B: Self-Hosted

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE your_app_db;
CREATE USER your_app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE your_app_db TO your_app_user;
```

### 2. Database Migration

Run database migrations:

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Verify migration status
npm run db:status
```

### 3. Database Optimization

Apply production optimizations:

```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Optimize for authentication queries
ANALYZE users;
ANALYZE auth_attempts;
ANALYZE user_sessions;
```

## Redis Setup

### 1. Redis Installation

#### Option A: Managed Redis (Recommended)

Use a managed Redis service:
- **Upstash Redis**
- **Redis Cloud**
- **AWS ElastiCache**
- **Google Cloud Memorystore**

#### Option B: Self-Hosted

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Add password protection
requirepass your_redis_password

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Restart Redis
sudo systemctl restart redis-server
```

### 2. Redis Configuration

Configure Redis for production:

```bash
# Set max memory
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable keyspace notifications
redis-cli CONFIG SET notify-keyspace-events Ex
```

## Email Service Setup

### Resend Configuration

1. Sign up at [Resend](https://resend.com)
2. Verify your domain
3. Create API key
4. Add to environment variables

### SendGrid Configuration (Alternative)

1. Sign up at [SendGrid](https://sendgrid.com)
2. Create API key
3. Verify sender identity
4. Update email service configuration

## OAuth Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback/google`
6. Add environment variables

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL:
   - `https://yourdomain.com/api/auth/callback/github`
4. Add environment variables

## Deployment Platforms

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Configure vercel.json:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. Deploy:
```bash
vercel --prod
```

### Netlify Deployment

1. Create netlify.toml:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

2. Deploy via Git or CLI

### Docker Deployment

1. Create Dockerfile:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

2. Build and run:
```bash
docker build -t your-app .
docker run -p 3000:3000 --env-file .env.production your-app
```

### AWS Deployment

1. Create AWS Lambda function
2. Configure API Gateway
3. Set up RDS for PostgreSQL
4. Configure ElastiCache for Redis
5. Use AWS SES for email

## Security Configuration

### SSL/TLS Setup

1. Obtain SSL certificate (Let's Encrypt, Cloudflare, etc.)
2. Configure HTTPS redirect
3. Set security headers

### Security Headers

Add security headers to next.config.js:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
```

### Content Security Policy

```javascript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.resend.com;
  frame-ancestors 'none';
`;
```

## Monitoring and Logging

### Health Checks

Set up health check endpoints:

```javascript
// pages/api/health.js
export default async function handler(req, res) {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        email: 'healthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}
```

### Logging Configuration

```javascript
// lib/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### Error Tracking

Set up Sentry for error tracking:

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

## Post-Deployment

### 1. Verify Deployment

Check all endpoints:
- Health check: `https://yourdomain.com/api/health`
- Authentication: `https://yourdomain.com/api/auth/me`
- Database connection
- Redis connection
- Email service

### 2. Performance Testing

Run load tests:

```bash
# Install k6
npm install -g k6

# Run load test
k6 run load-test.js
```

### 3. Security Testing

- Run security scans
- Check for vulnerabilities
- Verify SSL configuration
- Test rate limiting

### 4. Monitoring Setup

- Set up uptime monitoring
- Configure alerts
- Monitor error rates
- Track performance metrics

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check connection
psql "postgresql://username:password@host:port/database"

# Check network access
telnet host port

# Verify credentials
```

#### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h host -p port -a password ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

#### Email Service Issues

```bash
# Test email API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","html":"Test"}'
```

#### OAuth Issues

- Verify redirect URIs
- Check OAuth credentials
- Ensure proper scopes
- Test OAuth flow

### Debug Mode

Enable debug mode for troubleshooting:

```env
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

### Performance Issues

- Check database query performance
- Monitor Redis memory usage
- Analyze application logs
- Use APM tools

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h host -U username -d database > backup.sql

# Restore backup
psql -h host -U username -d database < backup.sql
```

### Redis Backup

```bash
# Create Redis backup
redis-cli SAVE

# Copy backup file
cp /var/lib/redis/dump.rdb backup-$(date +%Y%m%d).rdb
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancers
- Implement session stickiness
- Consider microservices architecture

### Database Scaling

- Read replicas
- Connection pooling
- Query optimization
- Indexing strategy

### Cache Scaling

- Redis cluster
- Cache partitioning
- Cache warming strategies

## Security Checklist

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secrets properly managed
- [ ] Database secured
- [ ] Redis secured
- [ ] OAuth properly configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place

## Support

For deployment issues:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Review logs for errors
3. Test individual components
4. Contact support team

## Changelog

### v1.0.0 (2023-01-01)
- Initial deployment guide
- Multi-platform support
- Security configurations
- Monitoring setup