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

// Generate a secure encryption key for production
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
