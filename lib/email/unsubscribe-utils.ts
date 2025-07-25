import { createHash } from 'crypto';

export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.AUTH_SECRET || 'default-secret';
  return createHash('sha256')
    .update(email + secret)
    .digest('hex')
    .substring(0, 32);
}

export function generateUnsubscribeUrl(email: string, baseUrl: string): string {
  const token = generateUnsubscribeToken(email);
  return `${baseUrl}/api/emails/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
