import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Course from '../src/models/Course.js';
import Task from '../src/models/Task.js';

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

async function registerAndLogin(app, userData = { name: 'Test User', email: 'test@example.com', password: 'password123' }) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send(userData);
  return res.body.data.accessToken;
}

describe('Course Routes', () => {
  let accessToken;

  beforeEach(async () => {
    accessToken = await registerAndLogin(app);
  });

  describe('POST /api/v1/courses', () => {
    it('should create a course', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Computer Science', code: 'CS101', color: '#6366f1' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'Computer Science',
        code: 'CS101',
        color: '#6366f1',
      });
      expect(res.body.data).toHaveProperty('_id');
    });

    it('should return 409 for duplicate course name', async () => {
      await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Math' })
        .expect(201);

      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Math' })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Course with this name already exists');
    });

    it('should return 400 for invalid color', async () => {
      const res = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Physics', color: 'invalid' })
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/courses', () => {
    it('should list courses for authenticated user', async () => {
      await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Course 1' });
      await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Course 2' });

      const res = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return empty array when no courses', async () => {
      const res = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });
  });
});