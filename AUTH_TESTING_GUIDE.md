# Authentication System Testing Guide

This guide will walk you through testing all authentication features in your local development environment.

## Prerequisites

1. **Database Setup**
   ```bash
   # Make sure PostgreSQL is running locally
   # Check your database configuration in .env.local:
   DB_HOST="localhost"
   DB_PORT="5432"
   DB_USER="postgres"
   DB_PASSWORD="postgres"
   DB_NAME="saas_template"
   
   # Run database migrations
   npm run db:migrate
   
   # (Optional) Open database studio to inspect data
   npm run db:studio
   ```

2. **Email Service Setup**
   - Ensure you have `RESEND_API_KEY` in your `.env.local`
   - Or use the mock email service for testing

3. **Start Development Server**
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

## Authentication Contract Verification

Your auth system should fulfill these contracts:

### 1. **User Registration Contract**
- ✅ Accept email and password
- ✅ Validate password complexity (min 8 chars, uppercase, lowercase, number, special char)
- ✅ Hash passwords with bcrypt
- ✅ Prevent duplicate emails
- ✅ Send verification email
- ✅ Create user session after signup

### 2. **User Login Contract**
- ✅ Authenticate with email/password
- ✅ Rate limiting (5 attempts per 15 minutes)
- ✅ Session management
- ✅ Remember me functionality
- ✅ Handle unverified emails appropriately

### 3. **Session Management Contract**
- ✅ Create secure sessions
- ✅ Limit concurrent sessions (max 3)
- ✅ Track session activity
- ✅ Invalidate sessions on password change
- ✅ Session expiration

### 4. **Password Security Contract**
- ✅ Password history (prevent reuse of last 5)
- ✅ Password reset flow
- ✅ Token-based reset with expiration
- ✅ Force password change on compromise

### 5. **OAuth Contract**
- ✅ Support Google/GitHub login
- ✅ Link OAuth accounts to existing users
- ✅ Handle OAuth errors gracefully

## Testing Scenarios

### 1. **Test User Registration**

**Via UI:**
1. Navigate to http://localhost:3000/signup
2. Enter test data:
   - Email: `test@example.com`
   - Password: `Test123!@#`
3. Submit and verify:
   - Check for success message
   - Check database for new user: `SELECT * FROM users WHERE email = 'test@example.com';`
   - Check password is hashed
   - Check verification email sent

**Via API:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### 2. **Test User Login**

**Via UI:**
1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `Test123!@#`
3. Verify:
   - Redirected to dashboard
   - Session cookie set
   - Check sessions table: `SELECT * FROM user_sessions WHERE user_id = '<user_id>';`

**Via API:**
```bash
# Using NextAuth endpoint
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### 3. **Test Email Verification**

1. **Send Verification Email:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-verification \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Check Token in Database:**
   ```sql
   SELECT * FROM verification_tokens WHERE identifier = 'test@example.com';
   ```

3. **Verify Email:**
   - Get token from email or database
   - Visit: `http://localhost:3000/verify-email?token=<token>`
   - Or via API:
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-email \
     -H "Content-Type: application/json" \
     -d '{"token": "<token>"}'
   ```

### 4. **Test Password Reset**

1. **Request Password Reset:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-password-reset \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Check Token:**
   ```sql
   SELECT * FROM verification_tokens WHERE identifier = 'test@example.com';
   ```

3. **Reset Password:**
   - Visit: `http://localhost:3000/reset-password?token=<token>`
   - Enter new password: `NewPass123!@#`
   - Or via API:
   ```bash
   curl -X POST http://localhost:3000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "token": "<token>",
       "password": "NewPass123!@#"
     }'
   ```

### 5. **Test Rate Limiting**

```bash
# Attempt login 6 times rapidly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/callback/credentials \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword"
    }'
  echo ""
done

# Check rate limit in database
SELECT * FROM auth_attempts WHERE identifier = 'test@example.com' ORDER BY created_at DESC;
```

### 6. **Test Session Management**

1. **Check Active Sessions:**
   ```sql
   SELECT * FROM user_sessions WHERE user_id = '<user_id>' AND is_active = true;
   ```

2. **Test Concurrent Session Limit:**
   - Login from 3 different browsers/incognito windows
   - Try 4th login - oldest session should be invalidated

3. **Test Session Activity:**
   ```sql
   SELECT * FROM session_activity WHERE session_id = '<session_id>' ORDER BY created_at DESC;
   ```

### 7. **Test OAuth (Google/GitHub)**

1. Navigate to http://localhost:3000/login
2. Click "Sign in with Google" or "Sign in with GitHub"
3. Complete OAuth flow
4. Verify in database:
   ```sql
   -- Check OAuth account linked
   SELECT * FROM accounts WHERE provider = 'google' AND user_id = '<user_id>';
   ```

### 8. **Test Password History**

1. Change password multiple times
2. Try to reuse an old password
3. Verify rejection:
   ```sql
   SELECT * FROM password_history WHERE user_id = '<user_id>' ORDER BY created_at DESC LIMIT 5;
   ```

## Security Testing

### 1. **SQL Injection Test**
```bash
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com'; DROP TABLE users; --",
    "password": "password"
  }'
```

### 2. **XSS Test**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "<script>alert(\"XSS\")</script>"
  }'
```

### 3. **Session Security**
- Check cookies have `HttpOnly` and `Secure` flags
- Verify `SameSite` policy is set
- Test session fixation attempts

## Health Check Endpoints

```bash
# General health check
curl http://localhost:3000/api/auth/health

# Liveness probe
curl http://localhost:3000/api/auth/health/live

# Readiness probe (checks database connection)
curl http://localhost:3000/api/auth/health/ready
```

## Database Queries for Verification

```sql
-- Check users
SELECT id, email, email_verified, created_at FROM users;

-- Check active sessions
SELECT us.*, u.email 
FROM user_sessions us 
JOIN users u ON us.user_id = u.id 
WHERE us.is_active = true;

-- Check auth attempts
SELECT * FROM auth_attempts 
WHERE created_at > NOW() - INTERVAL '1 hour' 
ORDER BY created_at DESC;

-- Check password history
SELECT ph.*, u.email 
FROM password_history ph 
JOIN users u ON ph.user_id = u.id 
ORDER BY ph.created_at DESC;

-- Check verification tokens
SELECT * FROM verification_tokens 
WHERE expires > NOW();
```

## Troubleshooting

### Common Issues:

1. **"Invalid credentials" on correct password**
   - Check if email is verified
   - Check rate limiting
   - Verify password hash in database

2. **Session not persisting**
   - Check cookie settings
   - Verify `AUTH_SECRET` is set
   - Check session storage configuration

3. **Email not sending**
   - Verify `RESEND_API_KEY` is valid
   - Check email service logs
   - Try mock email service for testing

4. **OAuth not working**
   - Verify OAuth client IDs and secrets
   - Check callback URLs match configuration
   - Ensure `NEXTAUTH_URL` is set correctly

## Performance Testing

```bash
# Load test login endpoint (requires Apache Bench)
ab -n 100 -c 10 -p login.json -T application/json \
  http://localhost:3000/api/auth/callback/credentials

# login.json content:
{
  "email": "test@example.com",
  "password": "Test123!@#"
}
```

## Summary

Your authentication system implements a comprehensive set of security features:
- ✅ Secure password storage with bcrypt
- ✅ Email verification
- ✅ Password reset flow
- ✅ Rate limiting
- ✅ Session management
- ✅ OAuth integration
- ✅ Password history
- ✅ Security audit logging

All these features work together to provide a production-ready authentication system that follows security best practices.