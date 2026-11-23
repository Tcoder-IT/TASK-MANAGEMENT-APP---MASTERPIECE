import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../src/models/User.js';
const { startTestMongo } = require('./helpers/mongo');

let mongod;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5000';
  process.env.API_VERSION = 'v1';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/studyflow-test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-at-least-32-chars-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars-long';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.COOKIE_DOMAIN = 'localhost';
  process.env.COOKIE_SECURE = 'false';
  process.env.COOKIE_SAME_SITE = 'lax';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = '10';
  process.env.BODY_LIMIT = '10kb';

  const appModule = await import('../src/app.js');
  app = appModule.app;

  mongod = await startTestMongo();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
};

describe('Auth Password Reset', () => {
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return success message for existing user', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('If the email exists, a reset link has been sent');
      expect(res.body.data.devResetToken).toBeDefined();
    });

    it('should return success message for non-existing user (prevent email enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('If the email exists, a reset link has been sent');
      expect(res.body.data.devResetToken).toBeUndefined();
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should store hashed reset token in database', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      const user = await User.findOne({ email: testUser.email }).select('+resetPasswordToken +resetPasswordExpires');
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpires).toBeDefined();

      const tokenHash = crypto.createHash('sha256').update(res.body.data.devResetToken).digest('hex');
      expect(user.resetPasswordToken).toBe(tokenHash);

      const oneHourFromNow = Date.now() + 60 * 60 * 1000;
      expect(user.resetPasswordExpires.getTime()).toBeLessThanOrEqual(oneHourFromNow + 5000);
      expect(user.resetPasswordExpires.getTime()).toBeGreaterThanOrEqual(oneHourFromNow - 5000);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      const resetToken = forgotRes.body.data.devResetToken;
      const newPassword = 'newpassword123';

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Password has been reset. Please log in with your new password.');

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: newPassword })
        .expect(200);

      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });

    it('should return 400 for invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token', password: 'newpassword123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });

    it('should return 400 for expired token', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      const user = await User.findOne({ email: testUser.email });
      user.resetPasswordExpires = new Date(Date.now() - 1000);
      await user.save();

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: forgotRes.body.data.devResetToken, password: 'newpassword123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });

    it('should return 400 for token not found', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'nonexistent-token', password: 'newpassword123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired reset token');
    });

    it('should return 400 for weak password', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: forgotRes.body.data.devResetToken, password: 'weak' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should clear reset token fields after successful reset', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: forgotRes.body.data.devResetToken, password: 'newpassword123' })
        .expect(200);

      const user = await User.findOne({ email: testUser.email }).select('+resetPasswordToken +resetPasswordExpires');
      expect(user.resetPasswordToken).toBeUndefined();
      expect(user.resetPasswordExpires).toBeUndefined();
    });

    it('should revoke all refresh tokens after password reset', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser).expect(201);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const refreshToken = loginRes.headers['set-cookie'][0];

      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: forgotRes.body.data.devResetToken, password: 'newpassword123' })
        .expect(200);

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshToken)
        .expect(401);

      expect(refreshRes.body.success).toBe(false);
    });
  });
});