import request from 'supertest';
import { app, connectDB } from '../src/app.js';
import User from '../src/models/User.js';
import RefreshToken from '../src/models/RefreshToken.js';
import mongoose from 'mongoose';

describe('Password Reset Email Flow', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'TestPass123';
  const testName = 'Test User';

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
  });

  it('should handle forgot password without email config (console fallback)', async () => {
    // Create user
    await User.create({
      name: testName,
      email: testEmail,
      passwordHash: await User.hashPassword(testPassword),
    });

    // Request password reset
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('If the email exists, a reset link has been sent');
    // In test env, devResetToken should be returned
    expect(res.body.data.devResetToken).toBeDefined();
  });

  it('should handle forgot password for non-existent email (prevents enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('If the email exists, a reset link has been sent');
    // Should not return devResetToken for non-existent email
    expect(res.body.data.devResetToken).toBeUndefined();
  });

  it('should reset password with valid token', async () => {
    // Create user
    await User.create({
      name: testName,
      email: testEmail,
      passwordHash: await User.hashPassword(testPassword),
    });

    // Request password reset to get token
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail });

    const resetToken = forgotRes.body.data.devResetToken;
    expect(resetToken).toBeDefined();

    // Reset password
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'NewPass456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Password has been reset. Please log in with your new password.');

    // Verify login works with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'NewPass456' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  it('should reject invalid or expired reset token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid-token', password: 'NewPass456' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired reset token');
  });

  it('should revoke all refresh tokens after password reset', async () => {
    // Create user
    const user = await User.create({
      name: testName,
      email: testEmail,
      passwordHash: await User.hashPassword(testPassword),
    });

    // Create a refresh token
    await RefreshToken.create({
      user: user._id,
      tokenHash: RefreshToken.hashToken('test-refresh-token'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Verify token exists
    const beforeCount = await RefreshToken.countDocuments({ user: user._id, revokedAt: null });
    expect(beforeCount).toBe(1);

    // Request password reset
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testEmail });

    const resetToken = forgotRes.body.data.devResetToken;

    // Reset password
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'NewPass456' });

    // Verify refresh token was revoked
    const afterCount = await RefreshToken.countDocuments({ user: user._id, revokedAt: null });
    expect(afterCount).toBe(0);
  });
});