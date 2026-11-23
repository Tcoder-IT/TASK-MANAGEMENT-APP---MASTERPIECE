import request from 'supertest';
import mongoose from 'mongoose';
import Task from '../src/models/Task.js';
const { startTestMongo } = require('./helpers/mongo');

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

describe('PATCH /api/v1/tasks/move', () => {
  let accessToken;

  beforeEach(async () => {
    accessToken = await registerAndLogin(app);
    await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Course', color: '#6366f1' });
  });

  async function createTasks(statuses = ['todo', 'todo', 'todo']) {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const tasks = [];
    for (const status of statuses) {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: `Task for ${status}`, dueDate, status });
      tasks.push(res.body.data);
    }
    return tasks;
  }

  describe('Moving a task to another status', () => {
    it('should update status, order, and completedAt when moving to done', async () => {
      const tasks = await createTasks(['todo', 'todo']);
      const taskToMove = tasks[0];

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: taskToMove._id, targetStatus: 'done', targetIndex: 0 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('done');
      expect(res.body.data.completedAt).toBeTruthy();
    });

    it('should clear completedAt when leaving done', async () => {
      // Create a todo task, move it to done (sets completedAt), then move back to todo
      const tasks = await createTasks(['todo']);
      const todoTask = tasks[0];

      await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: todoTask._id, targetStatus: 'done', targetIndex: 0 })
        .expect(200);

      const updated = await Task.findById(todoTask._id);
      expect(updated.completedAt).toBeTruthy();
      expect(updated.status).toBe('done');

      // Now move back to todo - completedAt should be cleared
      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: todoTask._id, targetStatus: 'todo', targetIndex: 0 })
        .expect(200);

      expect(res.body.data.status).toBe('todo');
      expect(res.body.data.completedAt).toBeNull();
    });
  });

  describe('Reordering within a column', () => {
    it('should reorder tasks within the same column', async () => {
      const tasks = await createTasks(['todo', 'todo', 'todo']);

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[2]._id, targetStatus: 'todo', targetIndex: 0 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('todo');
    });

    it('should keep orders consecutive without gaps or duplicates', async () => {
      const tasks = await createTasks(['todo', 'todo', 'todo']);

      await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[2]._id, targetStatus: 'todo', targetIndex: 1 })
        .expect(200);

      const allTasks = await Task.find({ status: 'todo', archived: false }).sort({ order: 1 });
      const orders = allTasks.map(t => t.order);
      expect(orders).toEqual([0, 1, 2]);
    });
  });

  describe('targetIndex positions', () => {
    it('should move task to start (targetIndex 0)', async () => {
      const tasks = await createTasks(['todo', 'todo', 'todo']);

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[2]._id, targetStatus: 'todo', targetIndex: 0 })
        .expect(200);

      expect(res.body.data.order).toBe(0);
    });

    it('should move task to middle', async () => {
      const tasks = await createTasks(['todo', 'todo', 'todo']);

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[0]._id, targetStatus: 'todo', targetIndex: 1 })
        .expect(200);

      expect(res.body.data.order).toBe(1);
    });

    it('should move task to end (targetIndex at length)', async () => {
      const tasks = await createTasks(['todo', 'todo', 'todo']);

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[0]._id, targetStatus: 'todo', targetIndex: 3 })
        .expect(200);

      expect(res.body.data.order).toBe(2);
    });
  });

  describe('targetIndex out of range', () => {
    it('should clamp targetIndex when too high', async () => {
      const tasks = await createTasks(['todo', 'todo']);
      const taskToMove = tasks[0];

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: taskToMove._id, targetStatus: 'todo', targetIndex: 999 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBe(1);
    });

    it('should return 400 for negative targetIndex (validation error)', async () => {
      const tasks = await createTasks(['todo', 'todo']);
      const taskToMove = tasks[1];

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: taskToMove._id, targetStatus: 'todo', targetIndex: -1 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid taskId', async () => {
      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: 'invalid-id', targetStatus: 'todo', targetIndex: 0 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing targetStatus', async () => {
      const tasks = await createTasks(['todo']);
      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[0]._id, targetIndex: 0 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing targetIndex', async () => {
      const tasks = await createTasks(['todo']);
      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: tasks[0]._id, targetStatus: 'todo' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Ownership', () => {
    it('should return 404 for task owned by another user', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'My Task', dueDate });

      await request(app).post('/api/v1/auth/register').send({ name: 'User Two', email: 'user2@example.com', password: 'password123' });
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'user2@example.com', password: 'password123' });
      const token2 = loginRes.body.data.accessToken;

      const otherUserTask = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'Other User Task', dueDate });

      const otherTaskId = otherUserTask.body.data._id;
      const originalOrder = otherUserTask.body.data.order;
      const originalStatus = otherUserTask.body.data.status;

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ taskId: otherTaskId, targetStatus: 'done', targetIndex: 0 })
        .expect(404);

      expect(res.body.success).toBe(false);

      const unchanged = await Task.findById(otherTaskId);
      expect(unchanged.status).toBe(originalStatus);
      expect(unchanged.order).toBe(originalOrder);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const createRes = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Auth Test', dueDate });

      const res = await request(app)
        .patch('/api/v1/tasks/move')
        .send({ taskId: createRes.body.data._id, targetStatus: 'done', targetIndex: 0 })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });
});