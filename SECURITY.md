# Security Best Practices

## API Key Storage

This template implements secure API key storage with the following measures:

### 1. **Encryption at Rest**
- All API keys are encrypted using AES-256-GCM before database storage
- Encryption key is stored in environment variables, never in code
- Each key has a unique initialization vector (IV)

### 2. **Server-Side Only Access**
- API keys are NEVER sent to the client in decrypted form
- Client only receives masked versions (e.g., `sk_test_....abcd`)
- Decryption only happens server-side when needed for API calls

### 3. **Key Format**
```
Stored in DB: [IV]:[AuthTag]:[EncryptedData]
Sent to Client: sk_test_....1234 (masked)
```

### 4. **Environment Variables**
```env
# Production checklist:
ENCRYPTION_KEY="[Generate with: openssl rand -base64 32]"
AUTH_SECRET="[Generate with: openssl rand -base64 32]"
DATABASE_URL="[Use connection pooling]"
```

### 5. **Production Setup**

#### Generate Secure Keys:
```bash
# Generate encryption key
openssl rand -base64 32

# Generate auth secret
openssl rand -base64 32
```

#### Database Security:
- Use connection pooling
- Enable SSL/TLS
- Restrict IP access
- Regular backups
- Audit logs

#### Additional Measures:
- [ ] Implement key rotation
- [ ] Add audit logging
- [ ] Set up monitoring alerts
- [ ] Use secrets management service (e.g., HashiCorp Vault)
- [ ] Implement rate limiting
- [ ] Add IP allowlisting

### 6. **Code Patterns**

#### ❌ Never Do This:
```typescript
// Never send decrypted keys to client
return { apiKey: decryptedKey }

// Never log API keys
console.log('Key:', apiKey)

// Never store keys in frontend
localStorage.setItem('apiKey', key)
```

#### ✅ Always Do This:
```typescript
// Only send masked keys to client
return { apiKey: maskApiKey(key) }

// Use server actions for API calls
'use server'
const key = await apiKeyService.getDecryptedKey(id)

// Validate on server before using
const isValid = await validateApiKey(type, key)
```

### 7. **Testing Security**

1. Check database - keys should be encrypted:
   ```sql
   SELECT key FROM api_keys;
   -- Should see: a1b2c3:d4e5f6:7890abcdef (not sk_test_123)
   ```

2. Check network tab - no real keys should be sent:
   - API responses should only contain masked keys
   - Server actions should not return decrypted keys

3. Test key rotation:
   - Change ENCRYPTION_KEY
   - Implement migration to re-encrypt

### 8. **Compliance Considerations**

- **PCI DSS**: If storing payment keys, additional requirements apply
- **GDPR**: Implement right to deletion
- **SOC 2**: Audit trails and access controls
- **HIPAA**: Additional encryption requirements for health data

### 9. **Incident Response**

If keys are compromised:
1. Rotate all affected API keys immediately
2. Generate new ENCRYPTION_KEY
3. Re-encrypt all stored keys
4. Audit access logs
5. Notify affected users
6. Document incident

### 10. **Regular Security Tasks**

- [ ] Monthly: Review access logs
- [ ] Quarterly: Rotate encryption keys
- [ ] Yearly: Security audit
- [ ] Ongoing: Monitor for exposed keys in code

Remember: Security is not a feature, it's a process. Keep improving!