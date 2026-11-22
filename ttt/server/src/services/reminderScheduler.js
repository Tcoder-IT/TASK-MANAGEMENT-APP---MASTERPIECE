import cron from 'node-cron';
import Task from '../models/Task.js';
import webpush from 'web-push';
import { env } from '../config/env.js';

let scheduledJob = null;

function initWebPush() {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  }
}

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid - remove it
      console.warn('Removing invalid push subscription');
    }
    console.error('Push notification error:', error.message);
  }
}

async function checkAndSendReminders() {
  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find tasks with reminders due in the next minute
  const tasks = await Task.find({
    archived: false,
    status: { $ne: 'done' },
    dueDate: { $gte: now, $lte: inOneDay },
    reminders: { $in: [60, 1440] }, // 1 hour and 1 day before
  }).populate('user', 'pushSubscriptions settings');

  for (const task of tasks) {
    const user = task.user;
    if (!user || !user.settings?.remindersEnabled) continue;

    const minutesUntilDue = Math.round((task.dueDate - now) / 60000);
    const shouldRemind = user.settings.reminderOffsets?.includes(minutesUntilDue);

    if (shouldRemind && user.pushSubscriptions?.length > 0) {
      const payload = {
        title: 'StudyFlow Reminder',
        body: `"${task.title}" is due in ${minutesUntilDue === 60 ? '1 hour' : '1 day'}`,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url: `/tasks/${task._id}` },
        tag: `task-${task._id}-${minutesUntilDue}`,
        requireInteraction: true,
      };

      for (const subscription of user.pushSubscriptions) {
        await sendPushNotification(subscription, payload);
      }
    }
  }
}

export function startReminderScheduler() {
  initWebPush();
  
  if (scheduledJob) {
    scheduledJob.stop();
  }

  // Run every minute
  scheduledJob = cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendReminders();
    } catch (error) {
      console.error('Reminder scheduler error:', error);
    }
  });
}

export function stopReminderScheduler() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
}