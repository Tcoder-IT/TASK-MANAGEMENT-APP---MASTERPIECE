import { createHash } from 'node:crypto';

export function createAuthRateLimitKey(ip, email) {
  const address = typeof ip === 'string' && ip ? ip : 'unknown';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const emailHash = createHash('sha256').update(normalizedEmail).digest('hex');

  return `${address}:${emailHash}`;
}
