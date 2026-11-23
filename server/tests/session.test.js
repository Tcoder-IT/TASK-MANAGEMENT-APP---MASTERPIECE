import request from 'supertest';
import mongoose from 'mongoose';
import StudySession from '../src/models/StudySession.js';
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

async function registerAndLogin(app, userData = { name: 'Test User', email: 'test@example.com', password: 'password123' }) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send(userData);
  return res.body.data.accessToken;
}

describe('Session Routes', () => {
  let accessToken;
  let courseId;
  let taskId;

  beforeEach(async () => {
    accessToken = await registerAndLogin(app);
    const courseRes = await request(app).post('/api/v1/courses').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Test Course', color: '#6366f1' });
    courseId = courseRes.body.data._id;
    const taskRes = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Test Task', dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), course: courseId });
    taskId = taskRes.body.data._id;
  });

  describe('POST /api/v1/sessions', () => {
    it('should create a study session', async () => {
      const res = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ course: courseId, task: taskId, durationMin: 25 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.durationMin).toBe(25);
      expect(res.body.data.course).toBe(courseId);
      expect(res.body.data.task).toBe(taskId);
      expect(res.body.data.user).toBeDefined();
    });

    it('should create a session without course or task', async () => {
      const res = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ durationMin: 30 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.durationMin).toBe(30);
      expect(res.body.data.course).toBeNull();
      expect(res.body.data.task).toBeNull();
    });

    it('should return 404 for non-existent course', async () => {
      const res = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ course: '507f1f77bcf86cd799439011', durationMin: 25 })
        .expect(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ task: '507f1f77bcf86cd799439011', durationMin: 25 })
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/sessions', () => {
    beforeEach(async () => {
      // Get the authenticated user's ID
      const userRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
      const userId = userRes.body.data.id;
      
      // Create sessions for the authenticated user
      await StudySession.create({ user: userId, durationMin: 25, startedAt: new Date() });
      await StudySession.create({ user: userId, durationMin: 30, startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });
    });

    it('should list sessions with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/sessions?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ total: 2, page: 1, pages: 2 });
    });

    it('should filter by course', async () => {
      const userRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
      const userId = userRes.body.data.id;
      
      await StudySession.create({ user: userId, course: courseId, durationMin: 20, startedAt: new Date() });

      const res = await request(app)
        .get(`/api/v1/sessions?course=${courseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].course).toBe(courseId);
    });
  });
});