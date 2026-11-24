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

async function registerAndLogin(app, userData = { name: 'Test User', email: 'test@example.com', password: 'password123' }) {
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send(userData);
  return res.body.data.accessToken;
}

describe('Task Routes', () => {
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

  describe('POST /api/v1/tasks', () => {
    it('should create a task', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Test Task', dueDate, course: courseId, priority: 'high' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Task');
      expect(res.body.data.priority).toBe('high');
      expect(res.body.data.course).toBe(courseId);
      expect(res.body.data).toHaveProperty('order');
    });

    it('should create a task without course', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'No Course Task', dueDate, course: null })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.course).toBeNull();
    });

    it('should return 404 for non-existent course', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Task', dueDate, course: '507f1f77bcf86cd799439011' })
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Task 1', dueDate, priority: 'high' });
      await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Task 2', dueDate, priority: 'low' });
    });

    it('should list tasks with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({ total: 2, page: 1, pages: 2 });
    });

    it('should filter by priority', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?priority=high')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].priority).toBe('high');
    });

    it('should filter active tasks without including completed tasks', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'In progress task', dueDate, status: 'in_progress' });
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Completed task', dueDate, status: 'done' });

      const res = await request(app)
        .get('/api/v1/tasks?status=active')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.data.every((task) => task.status !== 'done')).toBe(true);
      expect(res.body.meta.total).toBe(3);
    });

  });
});