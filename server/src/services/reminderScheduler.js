import cron from 'node-cron';
import Task from '../models/Task.js';
import User from '../models/User.js';
import webpush from 'web-push';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let scheduledJob = null;
let isPushConfigured = false;

function initWebPush() {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
    try {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
      isPushConfigured = true;
      logger.info('Push notifications: VAPID configured successfully');
    } catch (error) {
      logger.warn('Push notifications: Failed to configure VAPID', { error: error.message });
      isPushConfigured = false;
    }
  } else {
    logger.info('Push notifications: VAPID keys not configured, push reminders disabled');
    isPushConfigured = false;
  }
}

async function removeStaleSubscription(userId, endpoint) {
  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint } },
    });
    logger.info('Push notifications: Removed stale subscription', { userId, endpoint });
  } catch (error) {
    logger.error('Push notifications: Failed to remove stale subscription', { error: error.message, userId, endpoint });
  }
}

async function sendPushNotification(subscription, payload, userId) {
  if (!isPushConfigured) {
    return { sent: false, reason: 'VAPID not configured' };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true };
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      logger.warn('Push notifications: Subscription expired or invalid, removing', {
        userId,
        endpoint: subscription.endpoint,
      });
      await removeStaleSubscription(userId, subscription.endpoint);
      return { sent: false, reason: 'stale_subscription_removed' };
    }
    logger.error('Push notifications: Send failed', { error: error.message, userId });
    return { sent: false, reason: error.message };
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
        await sendPushNotification(subscription, payload, user._id);
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
      logger.error('Reminder scheduler error:', { error: error.message, stack: error.stack });
    }
  });

  logger.info('Reminder scheduler started');
}

export function stopReminderScheduler() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    logger.info('Reminder scheduler stopped');
  }
}

export function isPushNotificationsEnabled() {
  return isPushConfigured;
}