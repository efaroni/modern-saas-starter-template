# Authentication API Documentation

This document provides comprehensive documentation for all authentication API endpoints in the modern SaaS starter template.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Security Considerations](#security-considerations)
7. [Code Examples](#code-examples)

## Overview

The authentication system provides secure user registration, login, password management, and OAuth integration. All endpoints follow RESTful conventions and return JSON responses.

### Base URL
```
https://yourdomain.com/api/auth
```

### Authentication
Most endpoints require either:
- Session-based authentication (cookies)
- OAuth tokens
- API keys (for specific endpoints)

## Authentication Methods

### 1. Email/Password Authentication
Traditional username/password authentication with secure password hashing.

### 2. OAuth Integration
Supported providers:
- Google OAuth 2.0
- GitHub OAuth 2.0

### 3. Magic Links
Passwordless authentication via email links.

## API Endpoints

### User Registration

#### `POST /api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": null,
    "createdAt": "2023-01-01T00:00:00Z"
  },
  "message": "User registered successfully. Please check your email for verification."
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Email already exists",
  "code": "EMAIL_ALREADY_EXISTS"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, must contain uppercase, lowercase, number, and symbol
- `name`: Optional, 1-100 characters

### User Login

#### `POST /api/auth/login`

Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": "2023-01-01T00:00:00Z"
  },
  "session": {
    "id": "session-uuid",
    "expiresAt": "2023-01-02T00:00:00Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

**Rate Limiting:**
- 5 attempts per email per 15 minutes
- Account lockout after 5 failed attempts

### User Logout

#### `POST /api/auth/logout`

Terminate current session.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Email Verification

#### `POST /api/auth/send-verification`

Send email verification link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

#### `POST /api/auth/verify-email`

Verify email with token.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

### Password Reset

#### `POST /api/auth/send-password-reset`

Send password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}
```

**Note:** Returns success even for non-existent emails for security.

#### `POST /api/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Password Management

#### `POST /api/auth/change-password`

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "error": "Current password is incorrect",
  "code": "INVALID_CURRENT_PASSWORD"
}
```

### OAuth Authentication

#### `GET /api/auth/oauth/[provider]`

Initiate OAuth authentication.

**Parameters:**
- `provider`: `google` or `github`

**Query Parameters:**
- `redirect`: Optional redirect URL after authentication

**Response:**
Redirects to OAuth provider authorization URL.

#### `GET /api/auth/oauth/callback/[provider]`

Handle OAuth callback.

**Parameters:**
- `provider`: `google` or `github`

**Query Parameters:**
- `code`: Authorization code from OAuth provider
- `state`: CSRF protection state

**Response:**
Redirects to application with session created.

### User Profile

#### `GET /api/auth/me`

Get current user profile.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": "2023-01-01T00:00:00Z",
    "image": "https://example.com/avatar.jpg",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### `PUT /api/auth/me`

Update user profile.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "image": "https://example.com/new-avatar.jpg"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "Jane Doe",
    "emailVerified": "2023-01-01T00:00:00Z",
    "image": "https://example.com/new-avatar.jpg",
    "updatedAt": "2023-01-01T00:00:01Z"
  }
}
```

### Session Management

#### `GET /api/auth/sessions`

Get all active sessions for authenticated user.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-uuid",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2023-01-01T00:00:00Z",
      "lastActivity": "2023-01-01T01:00:00Z",
      "expiresAt": "2023-01-02T00:00:00Z",
      "isCurrent": true
    }
  ]
}
```

#### `DELETE /api/auth/sessions/[sessionId]`

Terminate specific session.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Parameters:**
- `sessionId`: ID of session to terminate

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

#### `DELETE /api/auth/sessions`

Terminate all sessions except current.

**Headers:**
```
Authorization: Bearer <session-token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "All other sessions terminated"
}
```

### Health Check

#### `GET /api/auth/health`

Check authentication service health.

**Response (Success - 200):**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "email": "healthy",
    "oauth": {
      "google": "healthy",
      "github": "healthy"
    }
  }
}
```

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid email/password |
| `EMAIL_ALREADY_EXISTS` | 400 | Email already registered |
| `INVALID_TOKEN` | 400 | Invalid or expired token |
| `WEAK_PASSWORD` | 400 | Password doesn't meet requirements |
| `RATE_LIMITED` | 429 | Too many requests |
| `ACCOUNT_LOCKED` | 423 | Account temporarily locked |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Error Handling Best Practices

1. **Always check the `success` field** before processing the response
2. **Use error codes** for programmatic error handling
3. **Display human-readable errors** to users
4. **Log detailed errors** for debugging
5. **Handle network errors** gracefully

## Rate Limiting

### Rate Limit Headers

All responses include rate limiting headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 per email | 15 minutes |
| `/api/auth/register` | 5 per IP | 15 minutes |
| `/api/auth/send-verification` | 3 per email | 1 hour |
| `/api/auth/send-password-reset` | 3 per email | 1 hour |
| `/api/auth/change-password` | 5 per user | 1 hour |
| Other endpoints | 100 per user | 1 hour |

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retryAfter": 900
}
```

## Security Considerations

### Password Security

- Minimum 8 characters
- Must contain uppercase, lowercase, number, and symbol
- Cannot reuse last 5 passwords
- Passwords are hashed with bcrypt (12 rounds)

### Session Security

- Secure, HttpOnly cookies
- CSRF protection
- Session timeout (24 hours default)
- Concurrent session limiting

### Token Security

- Cryptographically secure random tokens
- One-time use tokens
- Token expiration (1 hour for reset, 24 hours for verification)
- Secure token storage

### Input Validation

- All inputs are validated and sanitized
- SQL injection prevention
- XSS protection
- CSRF protection

## Code Examples

### JavaScript (Fetch API)

```javascript
// Register user
const registerUser = async (email, password, name) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.user;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

// Login user
const loginUser = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Get current user
const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.user;
  } catch (error) {
    console.error('Failed to get user:', error);
    throw error;
  }
};
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      setUser(data.user);
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      setUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
  };
};

export default useAuth;
```

### cURL Examples

```bash
# Register user
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'

# Login user
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# Get current user (with session cookie)
curl -X GET https://yourdomain.com/api/auth/me \
  -H "Cookie: session=your-session-token"

# Change password
curl -X POST https://yourdomain.com/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-token" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword123!"
  }'

# Logout
curl -X POST https://yourdomain.com/api/auth/logout \
  -H "Cookie: session=your-session-token"
```

## Testing

### Unit Tests

Test individual authentication functions:

```javascript
import { DatabaseAuthProvider } from '@/lib/auth/providers/database';

describe('Authentication', () => {
  it('should register user successfully', async () => {
    const provider = new DatabaseAuthProvider();
    const result = await provider.createUser({
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User'
    });
    
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('test@example.com');
  });
});
```

### Integration Tests

Test API endpoints:

```javascript
import { test, expect } from '@playwright/test';

test('should register and login user', async ({ page }) => {
  // Register
  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User'
    }
  });
  
  expect(registerResponse.ok()).toBe(true);
  
  // Login
  const loginResponse = await page.request.post('/api/auth/login', {
    data: {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }
  });
  
  expect(loginResponse.ok()).toBe(true);
});
```

## Support

For additional support or questions:

- Check the [Troubleshooting Guide](./troubleshooting.md)
- Review [Security Best Practices](./security-best-practices.md)
- See [Deployment Guide](./deployment.md)
- Open an issue on GitHub

## Changelog

### v1.0.0 (2023-01-01)
- Initial authentication API
- Email/password authentication
- OAuth integration
- Session management
- Rate limiting
- Security features