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

describe('Auth Register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toMatchObject({
      name: testUser.name,
      email: testUser.email,
      role: 'user',
    });
    expect(res.headers['set-cookie']).toBeDefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toContain('refreshToken=');
    expect(cookie).toContain('HttpOnly');
  });

  it('should return 409 for duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser).expect(201);
    const res = await request(app).post('/api/v1/auth/register').send(testUser).expect(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email already registered');
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, email: 'invalid' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: 'short' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for password without number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: 'passwordonly' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for password without letter', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...testUser, password: '12345678' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});