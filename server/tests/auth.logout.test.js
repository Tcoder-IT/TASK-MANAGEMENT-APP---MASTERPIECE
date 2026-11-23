import request from 'supertest';
import mongoose from 'mongoose';
const { startTestMongo } = require('./helpers/mongo');

let mongod;
let app;

beforeAll(async () => {
  // Set test environment variables before importing app
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

describe('Auth Logout', () => {
  let cookies;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    cookies = res.headers['set-cookie'];
  });

  it('should logout and clear cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Logged out successfully');
    const clearCookie = res.headers['set-cookie'][0];
    expect(clearCookie).toContain('refreshToken=;');
    expect(clearCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });
});