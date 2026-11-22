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
describe('Task Routes - Toggle, Delete, Reorder, Quick Add', () => {
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

  describe('PATCH /api/v1/tasks/:id/toggle', () => {
    it('should toggle task done status', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Toggle Me', dueDate });
      const taskId = createRes.body.data._id;

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/toggle`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('done');
      expect(res.body.data.completedAt).toBeTruthy();

      const res2 = await request(app)
        .patch(`/api/v1/tasks/${taskId}/toggle`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res2.body.data.status).toBe('todo');
      expect(res2.body.data.completedAt).toBeNull();
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should delete a task', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'To Delete', dueDate });
      const taskId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Task deleted');

      const check = await Task.findById(taskId);
      expect(check).toBeNull();
    });
  });

  describe('PATCH /api/v1/tasks/reorder', () => {
    it('should reorder tasks', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const t1 = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Task 1', dueDate });
      const t2 = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Task 2', dueDate });
      const t3 = await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'Task 3', dueDate });

      const taskIds = [t3.body.data._id, t1.body.data._id, t2.body.data._id];

      const res = await request(app)
        .patch('/api/v1/tasks/reorder')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskIds })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0]._id).toBe(t3.body.data._id);
      expect(res.body.data[1]._id).toBe(t1.body.data._id);
      expect(res.body.data[2]._id).toBe(t2.body.data._id);
      expect(res.body.data[0].order).toBe(0);
      expect(res.body.data[1].order).toBe(1);
      expect(res.body.data[2].order).toBe(2);
    });
  });

  describe('POST /api/v1/tasks/quick', () => {
    it('should quick add a task with only title', async () => {
      const res = await request(app)
        .post('/api/v1/tasks/quick')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Quick Task' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Quick Task');
      expect(res.body.data).toHaveProperty('order');
    });
  });

  describe('Ownership isolation', () => {
    it('should isolate tasks between users', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).send({ title: 'User 1 Task', dueDate });

      // Register and login second user
      const regRes = await request(app).post('/api/v1/auth/register').send({ name: 'User Two', email: 'user2@example.com', password: 'password123' });
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'user2@example.com', password: 'password123' });
      const token2 = loginRes.body.data.accessToken;

      await request(app).post('/api/v1/tasks').set('Authorization', `Bearer ${token2}`).send({ title: 'User 2 Task', dueDate });

      const res1 = await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${accessToken}`).expect(200);
      const res2 = await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${token2}`).expect(200);

      expect(res1.body.data).toHaveLength(1);
      expect(res1.body.data[0].title).toBe('User 1 Task');
      expect(res2.body.data).toHaveLength(1);
      expect(res2.body.data[0].title).toBe('User 2 Task');
    });
  });
});