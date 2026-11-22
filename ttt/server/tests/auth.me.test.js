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

describe('Auth Me', () => {
  let accessToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    accessToken = res.body.data.accessToken;
  });

  it('should return current user with valid access token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: testUser.name,
      email: testUser.email,
      role: 'user',
    });
    expect(res.body.data).toHaveProperty('settings');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Auth Update Profile', () => {
  let accessToken;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    accessToken = res.body.data.accessToken;
  });

  it('should update name', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('should update theme', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ theme: 'dark' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.settings.theme).toBe('dark');
  });

  it('should return 400 for invalid theme', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ theme: 'invalid' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});