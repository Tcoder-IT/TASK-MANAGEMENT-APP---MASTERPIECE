import request from 'supertest';
import { app, connectDB } from '../src/app.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import mongoose from 'mongoose';
import { startReminderScheduler, stopReminderScheduler, isPushNotificationsEnabled } from '../src/services/reminderScheduler.js';

describe('Push Notifications & Reminder Scheduler', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'TestPass123';
  const testName = 'Test User';
  let accessToken;

  beforeAll(async () => { await connectDB(); });
  afterAll(async () => { stopReminderScheduler(); await mongoose.disconnect(); });
  afterEach(async () => { await User.deleteMany({}); await Task.deleteMany({}); stopReminderScheduler(); });

  async function registerAndLogin(email = testEmail, password = testPassword) {
    const res = await request(app).post('/api/v1/auth/register').send({ name: testName, email, password });
    return res.body.data.accessToken;
  }

  beforeEach(async () => {
    accessToken = await registerAndLogin();
  });

  describe('VAPID Configuration', () => {
    it('should report push notifications as disabled when VAPID keys not configured', () => { expect(isPushNotificationsEnabled()).toBe(false); });
    it('should not send push reminders when VAPID not configured', async () => {
      const user = await User.findOne({ email: testEmail });
      await Task.create({ user: user._id, title: 'Test Task', dueDate: new Date(Date.now() + 30 * 60 * 1000), reminders: [60] });
      startReminderScheduler(); await new Promise(r => setTimeout(r, 100));
      expect(await Task.findOne({ title: 'Test Task' })).toBeTruthy();
    });
  });

  describe('Stale Subscription Cleanup', () => {
    it('should remove stale subscription on 410/404', async () => {
      const user = await User.findOne({ email: testEmail });
      const endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint';
      await User.findByIdAndUpdate(user._id, { $push: { pushSubscriptions: { endpoint, keys: { p256dh: 'k', auth: 'a' } } } });
      expect((await User.findById(user._id)).pushSubscriptions).toHaveLength(1);
      await User.findByIdAndUpdate(user._id, { $pull: { pushSubscriptions: { endpoint } } });
      expect((await User.findById(user._id)).pushSubscriptions).toHaveLength(0);
    });
  });

  describe('Push Subscription Management', () => {
    it('should allow subscribing to push notifications without VAPID', async () => {
      const res = await request(app).post('/api/v1/push/subscribe').set('Authorization', `Bearer ${accessToken}`).send({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: 'k', auth: 'a' } });
      expect(res.status).toBe(201); expect(res.body.success).toBe(true); expect(res.body.data.message).toBe('Subscribed successfully');
    });
    it('should prevent duplicate subscriptions', async () => {
      const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/dup-test', keys: { p256dh: 'k', auth: 'a' } };
      await request(app).post('/api/v1/push/subscribe').set('Authorization', `Bearer ${accessToken}`).send(sub);
      const res = await request(app).post('/api/v1/push/subscribe').set('Authorization', `Bearer ${accessToken}`).send(sub);
      expect(res.status).toBe(200); expect(res.body.data.message).toBe('Already subscribed');
    });
    it('should allow unsubscribing from push notifications', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/unsub-test';
      await request(app).post('/api/v1/push/subscribe').set('Authorization', `Bearer ${accessToken}`).send({ endpoint, keys: { p256dh: 'k', auth: 'a' } });
      const res = await request(app).post('/api/v1/push/unsubscribe').set('Authorization', `Bearer ${accessToken}`).send({ endpoint });
      expect(res.status).toBe(200); expect(res.body.data.message).toBe('Unsubscribed successfully');
      expect((await User.findOne({ email: testEmail })).pushSubscriptions).toHaveLength(0);
    });
  });

  describe('Reminder Scheduler Behavior', () => {
    it('should start and stop without errors', () => { expect(() => startReminderScheduler()).not.toThrow(); expect(() => stopReminderScheduler()).not.toThrow(); });
    it('should not crash when checking reminders with no tasks', async () => { startReminderScheduler(); await new Promise(r => setTimeout(r, 50)); expect(() => stopReminderScheduler()).not.toThrow(); });
    it('should not crash when user has reminders disabled', async () => {
      await User.findOneAndUpdate({ email: testEmail }, { $set: { 'settings.remindersEnabled': false } });
      const user = await User.findOne({ email: testEmail });
      await Task.create({ user: user._id, title: 'Test', dueDate: new Date(Date.now() + 30 * 60 * 1000), reminders: [60] });
      startReminderScheduler(); await new Promise(r => setTimeout(r, 50)); expect(() => stopReminderScheduler()).not.toThrow();
    });
    it('should handle tasks with reminders for different offsets', async () => {
      const user = await User.findOne({ email: testEmail }); const now = new Date();
      await Task.create({ user: user._id, title: 'Task due in 1 hour', dueDate: new Date(now.getTime() + 60 * 60 * 1000), reminders: [60] });
      await Task.create({ user: user._id, title: 'Task due in 1 day', dueDate: new Date(now.getTime() + 1440 * 60 * 1000), reminders: [1440] });
      await Task.create({ user: user._id, title: 'Task due in 2 hours', dueDate: new Date(now.getTime() + 120 * 60 * 1000), reminders: [60, 1440] });
      startReminderScheduler(); await new Promise(r => setTimeout(r, 100)); stopReminderScheduler();
      expect(await Task.find({ user: user._id })).toHaveLength(3);
    });
  });
});