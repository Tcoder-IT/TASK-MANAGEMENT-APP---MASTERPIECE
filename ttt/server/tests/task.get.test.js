import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Course from '../src/models/Course.js';
import Task from '../src/models/Task.js';

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

describe('Task Routes - Get, Update, Delete, Toggle', () => {
  let accessToken;
  let courseId;

  beforeEach(async () => {
    accessToken = await registerAndLogin(app);
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Course', color: '#6366f1' });
    courseId = courseRes.body.data._id;
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get a task by id', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Get Me', dueDate });
      const taskId = createRes.body.data._id;

      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(taskId);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get('/api/v1/tasks/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update a task', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Original', dueDate });
      const taskId = createRes.body.data._id;

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated', priority: 'urgent' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated');
      expect(res.body.data.priority).toBe('urgent');
    });
  });
});