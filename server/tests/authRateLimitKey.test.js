import { createAuthRateLimitKey } from '../src/utils/authRateLimitKey.js';

describe('Authentication rate-limit keys', () => {
  it('keeps attempts for different email addresses in separate buckets', () => {
    const firstAccount = createAuthRateLimitKey('192.0.2.10', 'first@example.com');
    const secondAccount = createAuthRateLimitKey('192.0.2.10', 'second@example.com');

    expect(firstAccount).not.toBe(secondAccount);
  });

  it('normalizes email casing and surrounding whitespace', () => {
    const normalized = createAuthRateLimitKey('192.0.2.10', 'student@example.com');
    const varied = createAuthRateLimitKey('192.0.2.10', ' Student@Example.com ');

    expect(varied).toBe(normalized);
  });

  it('keeps the same account separated by client IP', () => {
    const firstIp = createAuthRateLimitKey('192.0.2.10', 'student@example.com');
    const secondIp = createAuthRateLimitKey('192.0.2.11', 'student@example.com');

    expect(firstIp).not.toBe(secondIp);
  });
});
