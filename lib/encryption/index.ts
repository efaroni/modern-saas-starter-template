import crypto from 'crypto';

// Get encryption key from environment or generate one for development
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'dev-key-32-chars-change-in-prod!!';

// Ensure key is 32 bytes
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  // For mock keys, don't encrypt
  if (text.includes('mock')) {
    return `mock:${text}`;
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  // Handle mock keys
  if (encryptedText.startsWith('mock:')) {
    return encryptedText.slice(5);
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '***';

  // Never send the actual key to the client
  // Only show prefix for identification
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);

  // For Stripe, show if it's test or live
  if (key.startsWith('sk_test_')) {
    return 'sk_test_....' + suffix;
  } else if (key.startsWith('sk_live_')) {
    return 'sk_live_....' + suffix;
  }

  return `${prefix}....${suffix}`;
}

// Mask API key for display in input fields (shows more context than storage mask)
export function maskApiKeyForDisplay(key: string): string {
  if (!key || key.length < 8) return '*'.repeat(32);

  // Security best practice: Show enough to identify the key but not enough to compromise it
  // For most API keys, showing first 7-10 chars and last 4 is considered safe

  // Handle different key types with appropriate masking
  if (key.startsWith('sk_test_')) {
    // Stripe test keys - show type and last 4
    const visibleStart = key.slice(0, 11); // "sk_test_" + 3 chars
    const maskedLength = Math.max(key.length - 15, 20); // At least 20 asterisks
    return `${visibleStart}${'*'.repeat(maskedLength)}${key.slice(-4)}`;
  } else if (key.startsWith('sk_live_')) {
    // Stripe live keys - more conservative, only show type
    const visibleStart = key.slice(0, 8); // Just "sk_live_"
    const maskedLength = Math.max(key.length - 12, 24); // At least 24 asterisks
    return `${visibleStart}${'*'.repeat(maskedLength)}${key.slice(-4)}`;
  } else if (key.startsWith('sk-')) {
    // OpenAI style keys - show prefix and last 4
    const visibleStart = key.slice(0, 7); // "sk-" + 4 chars
    const maskedLength = Math.max(key.length - 11, 20);
    return `${visibleStart}${'*'.repeat(maskedLength)}${key.slice(-4)}`;
  } else if (key.startsWith('re_')) {
    // Resend keys - show prefix and last 4
    const visibleStart = key.slice(0, 7); // "re_" + 4 chars
    const maskedLength = Math.max(key.length - 11, 20);
    return `${visibleStart}${'*'.repeat(maskedLength)}${key.slice(-4)}`;
  }

  // Generic keys - conservative approach
  const visibleStart = key.slice(0, 6);
  const maskedLength = Math.max(key.length - 10, 20);
  return `${visibleStart}${'*'.repeat(maskedLength)}${key.slice(-4)}`;
}

// Generate a secure encryption key for production
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
