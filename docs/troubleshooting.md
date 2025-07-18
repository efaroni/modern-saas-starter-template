# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the authentication system.

## Table of Contents

1. [General Troubleshooting](#general-troubleshooting)
2. [Authentication Issues](#authentication-issues)
3. [Database Issues](#database-issues)
4. [Redis/Cache Issues](#rediscache-issues)
5. [Email Service Issues](#email-service-issues)
6. [OAuth Issues](#oauth-issues)
7. [Performance Issues](#performance-issues)
8. [Security Issues](#security-issues)
9. [Deployment Issues](#deployment-issues)
10. [Monitoring and Logging](#monitoring-and-logging)

## General Troubleshooting

### Enable Debug Mode

First, enable debug mode to get detailed error information:

```env
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

### Check Application Logs

```bash
# View application logs
tail -f logs/app.log

# Check error logs
tail -f logs/error.log

# Filter authentication logs
grep "auth" logs/app.log
```

### Health Check Endpoints

Use health check endpoints to verify system status:

```bash
# Overall health
curl https://yourdomain.com/api/health

# Authentication health
curl https://yourdomain.com/api/auth/health

# Database health
curl https://yourdomain.com/api/auth/health?component=database

# Redis health
curl https://yourdomain.com/api/auth/health?component=redis
```

## Authentication Issues

### Login Failures

#### Issue: "Invalid credentials" error

**Symptoms:**
- Users cannot log in with correct credentials
- Error message: "Invalid credentials"

**Possible Causes:**
1. Password not properly hashed
2. Email case sensitivity
3. Database connection issues
4. Rate limiting active

**Solutions:**

1. **Check password hashing:**
```javascript
// Test password verification
const bcrypt = require('@node-rs/bcrypt');
const isValid = await bcrypt.verify(plainPassword, hashedPassword);
console.log('Password valid:', isValid);
```

2. **Check email case:**
```javascript
// Ensure email is lowercase
const email = userInput.email.toLowerCase();
```

3. **Test database connection:**
```bash
# Test database connection
psql "postgresql://username:password@host:port/database" -c "SELECT 1"
```

4. **Check rate limiting:**
```javascript
// Check rate limit status
const rateLimit = await rateLimiter.checkRateLimit(email, 'login');
console.log('Rate limit:', rateLimit);
```

#### Issue: Account locked message

**Symptoms:**
- User gets "Account temporarily locked" message
- Multiple failed login attempts

**Solutions:**

1. **Check rate limiting configuration:**
```javascript
// Verify rate limiting settings
const config = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000  // 30 minutes
};
```

2. **Reset rate limiting for user:**
```javascript
// Reset rate limit for specific user
await rateLimiter.resetRateLimit(email, 'login');
```

3. **Check auth attempts table:**
```sql
-- Check recent failed attempts
SELECT * FROM auth_attempts 
WHERE identifier = 'user@example.com' 
AND type = 'login' 
AND success = false 
ORDER BY created_at DESC;
```

### Registration Issues

#### Issue: "Email already exists" error

**Symptoms:**
- User cannot register with valid email
- Error occurs even with new email addresses

**Solutions:**

1. **Check for case sensitivity:**
```sql
-- Check for existing email (case insensitive)
SELECT * FROM users WHERE LOWER(email) = LOWER('User@Example.com');
```

2. **Clean up duplicate emails:**
```sql
-- Find duplicate emails
SELECT email, COUNT(*) 
FROM users 
GROUP BY LOWER(email) 
HAVING COUNT(*) > 1;
```

#### Issue: Password validation failures

**Symptoms:**
- Valid passwords rejected
- Inconsistent password requirements

**Solutions:**

1. **Test password validator:**
```javascript
// Test password validation
const { PasswordValidator } = require('./lib/auth/password-validator');
const validator = new PasswordValidator();
const result = validator.validate('TestPassword123!');
console.log('Validation result:', result);
```

2. **Check password policy:**
```javascript
// Verify password policy settings
const policy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  preventCommon: true
};
```

### Session Issues

#### Issue: Session expires too quickly

**Symptoms:**
- Users logged out unexpectedly
- Session timeout too aggressive

**Solutions:**

1. **Check session configuration:**
```javascript
// Verify session settings
const sessionConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  rolling: true,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'
};
```

2. **Check session cleanup:**
```sql
-- Check session expiration
SELECT * FROM user_sessions 
WHERE expires_at < NOW() 
ORDER BY expires_at DESC;
```

#### Issue: Session not persisting

**Symptoms:**
- User logged out on page refresh
- Session cookies not set

**Solutions:**

1. **Check cookie settings:**
```javascript
// Verify cookie configuration
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};
```

2. **Check HTTPS configuration:**
```javascript
// For production, ensure HTTPS
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

## Database Issues

### Connection Problems

#### Issue: Database connection refused

**Symptoms:**
- "Connection refused" errors
- Unable to connect to database

**Solutions:**

1. **Check database status:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if database is listening
netstat -an | grep 5432
```

2. **Test connection:**
```bash
# Test database connection
psql "postgresql://username:password@host:port/database" -c "SELECT version()"
```

3. **Check firewall:**
```bash
# Check firewall rules
sudo ufw status
sudo iptables -L
```

#### Issue: Too many connections

**Symptoms:**
- "Too many connections" error
- Connection pool exhausted

**Solutions:**

1. **Check connection pool settings:**
```javascript
// Verify pool configuration
const poolConfig = {
  max: 20,
  min: 2,
  idle: 10000,
  acquire: 30000,
  evict: 1000
};
```

2. **Monitor active connections:**
```sql
-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Check connection by database
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;
```

3. **Optimize queries:**
```sql
-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Migration Issues

#### Issue: Migration failures

**Symptoms:**
- Database schema out of sync
- Migration errors

**Solutions:**

1. **Check migration status:**
```bash
# Check migration status
npm run db:status

# List pending migrations
npm run db:pending
```

2. **Manual migration:**
```bash
# Run specific migration
npm run db:migrate:up 0001_initial_schema.sql

# Rollback migration
npm run db:migrate:down 0001_initial_schema.sql
```

3. **Reset migrations:**
```bash
# Reset all migrations (DANGER!)
npm run db:reset
npm run db:migrate
```

## Redis/Cache Issues

### Connection Problems

#### Issue: Redis connection failed

**Symptoms:**
- Cache not working
- Redis connection errors

**Solutions:**

1. **Check Redis status:**
```bash
# Check Redis status
redis-cli ping

# Check Redis info
redis-cli info
```

2. **Test Redis connection:**
```bash
# Test connection with auth
redis-cli -h host -p port -a password ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

3. **Fallback to in-memory cache:**
```javascript
// Enable fallback caching
const cacheConfig = {
  enableFallback: true,
  fallbackTimeout: 5000
};
```

#### Issue: Cache performance problems

**Symptoms:**
- Slow cache operations
- High cache miss rate

**Solutions:**

1. **Check cache statistics:**
```javascript
// Get cache stats
const stats = await cache.getStats();
console.log('Cache stats:', stats);
```

2. **Optimize cache keys:**
```javascript
// Use efficient cache keys
const cacheKey = `user:${userId}:profile`;
```

3. **Implement cache warming:**
```javascript
// Warm up cache on startup
await cache.warmUp();
```

## Email Service Issues

### Email Delivery Problems

#### Issue: Emails not being sent

**Symptoms:**
- Users not receiving emails
- Email service errors

**Solutions:**

1. **Check email service configuration:**
```javascript
// Test email service
const emailService = require('./lib/email/service');
const result = await emailService.sendTestEmail('test@example.com');
console.log('Email result:', result);
```

2. **Check API credentials:**
```bash
# Test Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@yourdomain.com",
    "to": "test@example.com",
    "subject": "Test",
    "html": "Test email"
  }'
```

3. **Check email logs:**
```bash
# Check email service logs
grep "email" logs/app.log
```

#### Issue: Emails in spam folder

**Symptoms:**
- Emails delivered to spam
- Low email delivery rates

**Solutions:**

1. **Verify domain authentication:**
   - SPF record
   - DKIM signing
   - DMARC policy

2. **Check email content:**
   - Avoid spam trigger words
   - Include unsubscribe link
   - Use proper HTML structure

3. **Monitor email reputation:**
   - Check sender reputation
   - Monitor bounce rates
   - Handle complaints

## OAuth Issues

### OAuth Flow Problems

#### Issue: OAuth redirect errors

**Symptoms:**
- OAuth flow fails
- Redirect URI mismatch

**Solutions:**

1. **Check OAuth configuration:**
```javascript
// Verify OAuth settings
const oauthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
};
```

2. **Verify redirect URIs:**
   - Google: Check Google Cloud Console
   - GitHub: Check GitHub OAuth App settings

3. **Test OAuth flow:**
```bash
# Test OAuth endpoint
curl "https://yourdomain.com/api/auth/signin/google"
```

#### Issue: OAuth token refresh failures

**Symptoms:**
- OAuth tokens expire
- Refresh token invalid

**Solutions:**

1. **Check token expiration:**
```javascript
// Check token validity
const tokenData = await oauthTokenCache.getOAuthToken(userId, 'google');
if (tokenData.isExpired) {
  await refreshOAuthToken(userId, 'google');
}
```

2. **Implement token refresh:**
```javascript
// Refresh OAuth token
const refreshResult = await oauthProvider.refreshToken(refreshToken);
```

## Performance Issues

### Slow Authentication

#### Issue: Authentication requests are slow

**Symptoms:**
- Long response times
- Timeouts during authentication

**Solutions:**

1. **Check database performance:**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%auth%' 
ORDER BY mean_time DESC;
```

2. **Optimize database queries:**
```sql
-- Add indexes for auth queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_auth_attempts_identifier ON auth_attempts(identifier, created_at);
```

3. **Enable caching:**
```javascript
// Enable user profile caching
const cachedUser = await userCache.getUser(userId);
```

#### Issue: High memory usage

**Symptoms:**
- Memory leaks
- High memory consumption

**Solutions:**

1. **Monitor memory usage:**
```javascript
// Check memory usage
const memoryUsage = process.memoryUsage();
console.log('Memory usage:', memoryUsage);
```

2. **Optimize cache settings:**
```javascript
// Limit cache size
const cacheConfig = {
  maxSize: 1000,
  ttl: 300000 // 5 minutes
};
```

3. **Clean up resources:**
```javascript
// Cleanup expired sessions
await sessionCleanup.cleanupExpiredSessions();
```

## Security Issues

### Security Vulnerabilities

#### Issue: Potential security breaches

**Symptoms:**
- Unusual login patterns
- Failed security scans

**Solutions:**

1. **Check security logs:**
```bash
# Check auth security events
grep "security" logs/app.log
```

2. **Run security scan:**
```bash
# Run vulnerability scan
npm audit

# Check for known vulnerabilities
npm audit --audit-level high
```

3. **Update dependencies:**
```bash
# Update all dependencies
npm update

# Check for outdated packages
npm outdated
```

#### Issue: Rate limiting bypass

**Symptoms:**
- Excessive requests
- Rate limiting not working

**Solutions:**

1. **Check rate limiting implementation:**
```javascript
// Verify rate limiting
const rateLimit = await rateLimiter.checkRateLimit(identifier, 'login');
if (!rateLimit.allowed) {
  throw new Error('Rate limit exceeded');
}
```

2. **Implement IP-based rate limiting:**
```javascript
// Add IP-based rate limiting
const ipRateLimit = await rateLimiter.checkIPRateLimit(ipAddress);
```

## Deployment Issues

### Deployment Failures

#### Issue: Build failures

**Symptoms:**
- Build process fails
- Deployment errors

**Solutions:**

1. **Check build logs:**
```bash
# Check build output
npm run build

# Check for build errors
npm run build 2>&1 | grep -i error
```

2. **Verify dependencies:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

3. **Check environment variables:**
```javascript
// Verify required env vars
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

#### Issue: SSL/TLS certificate errors

**Symptoms:**
- HTTPS errors
- Certificate validation failures

**Solutions:**

1. **Check certificate validity:**
```bash
# Check SSL certificate
openssl x509 -in certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

2. **Verify certificate chain:**
```bash
# Check certificate chain
curl -I https://yourdomain.com
```

## Monitoring and Logging

### Log Analysis

#### Common Log Patterns

1. **Authentication failures:**
```bash
# Find authentication failures
grep "auth.*failed" logs/app.log

# Count failed attempts by IP
grep "auth.*failed" logs/app.log | grep -o "[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}" | sort | uniq -c | sort -nr
```

2. **Performance issues:**
```bash
# Find slow queries
grep "slow.*query" logs/app.log

# Find memory issues
grep "memory\|heap" logs/app.log
```

3. **Security events:**
```bash
# Find security events
grep "security\|suspicious\|blocked" logs/app.log
```

### Monitoring Setup

1. **Set up alerts:**
```javascript
// Configure monitoring alerts
const alerts = {
  errorRate: 5, // Alert if error rate > 5%
  responseTime: 1000, // Alert if response time > 1s
  memoryUsage: 80 // Alert if memory usage > 80%
};
```

2. **Health check monitoring:**
```bash
# Set up health check monitoring
curl -f https://yourdomain.com/api/health || echo "Health check failed"
```

## Getting Help

### Information to Include

When seeking help, include:

1. **Error messages** (full stack trace)
2. **Environment details** (OS, Node.js version, etc.)
3. **Configuration** (sanitized, without secrets)
4. **Steps to reproduce** the issue
5. **Recent changes** that might have caused the issue

### Useful Commands

```bash
# System information
node --version
npm --version
uname -a

# Database version
psql --version

# Redis version
redis-cli --version

# Check running processes
ps aux | grep node
ps aux | grep postgres
ps aux | grep redis

# Check network connectivity
netstat -an | grep LISTEN
```

### Log Collection

```bash
# Collect recent logs
tail -n 1000 logs/app.log > debug-logs.txt
tail -n 1000 logs/error.log >> debug-logs.txt

# Collect system logs
journalctl -u your-app --since "1 hour ago" >> debug-logs.txt
```

## Prevention

### Best Practices

1. **Regular monitoring** of key metrics
2. **Automated testing** of critical flows
3. **Regular security audits**
4. **Keep dependencies updated**
5. **Implement proper error handling**
6. **Use structured logging**
7. **Set up alerting**
8. **Regular backups**

### Maintenance Tasks

1. **Weekly:** Check error logs and performance metrics
2. **Monthly:** Update dependencies and run security scans
3. **Quarterly:** Review and update security policies
4. **Annually:** Comprehensive security audit

## Support Resources

- [API Documentation](./api/authentication.md)
- [Deployment Guide](./deployment.md)
- [Security Best Practices](./security-best-practices.md)
- GitHub Issues
- Community Forum