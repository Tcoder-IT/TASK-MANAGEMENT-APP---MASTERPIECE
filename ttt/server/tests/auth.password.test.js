import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

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
    await collections[key].deleteMany({ });
  }
});

const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
};

describe('Auth Change Password', () => {
  let accessToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    accessToken = res.body.data.accessToken;
  });

  it('should change password with correct current password', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: testUser.password, newPassword: 'newPassword123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Password changed');
  });

  it('should return 400 with incorrect current password', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrong', newPassword: 'newPassword123' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Current password is incorrect');
  });

  it('should invalidate all refresh tokens after password change', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    const cookies = loginRes.headers['set-cookie'];

    await request(app)
      .patch('/api/v1/auth/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: testUser.password, newPassword: 'newPassword123' })
      .expect(200);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth Delete Account', () => {
  let accessToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    accessToken = res.body.data.accessToken;
  });

  it('should delete account', async () => {
    const res = await request(app)
      .delete('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Account deleted successfully');
  });

  it('should return 401 after deletion', async () => {
    await request(app)
      .delete('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});

describe('Auth Ownership Isolation', () => {
  let accessToken1, accessToken2;

  beforeEach(async () => {
    const res1 = await request(app).post('/api/v1/auth/register').send({
      name: 'User One',
      email: 'user1@example.com',
      password: 'password123',
    });
    accessToken1 = res1.body.data.accessToken;

    const res2 = await request(app).post('/api/v1/auth/register').send({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'password123',
    });
    accessToken2 = res2.body.data.accessToken;
  });

  it('should isolate user data - each user sees only their own data', async () => {
    const me1 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken1}`)
      .expect(200);

    const me2 = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken2}`)
      .expect(200);

    expect(me1.body.data.email).toBe('user1@example.com');
    expect(me2.body.data.email).toBe('user2@example.com');
  });
});