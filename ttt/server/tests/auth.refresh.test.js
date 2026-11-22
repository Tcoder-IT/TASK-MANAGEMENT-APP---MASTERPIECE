import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import RefreshToken from '../src/models/RefreshToken.js';

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

  mongod = await MongoMemoryServer.create();
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

describe('Auth Refresh', () => {
  let cookies;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    cookies = res.headers['set-cookie'];
  });

  it('should refresh access token with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should return 401 without refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('should rotate refresh token (old one becomes invalid)', async () => {
    const res1 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(200);

    const newCookies = res1.headers['set-cookie'];

    const res2 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);

    expect(res2.body.success).toBe(false);

    const res3 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newCookies)
      .expect(200);
    expect(res3.body.success).toBe(true);
  });

  it('should invalidate refresh token in database on logout', async () => {
    await request(app).post('/api/v1/auth/logout').set('Cookie', cookies).expect(200);

    const tokenHash = RefreshToken.hashToken(cookies[0].split('refreshToken=')[1].split(';')[0]);
    const stored = await RefreshToken.findOne({ tokenHash });
    expect(stored).toBeTruthy();
    expect(stored.revokedAt).toBeTruthy();
  });
});