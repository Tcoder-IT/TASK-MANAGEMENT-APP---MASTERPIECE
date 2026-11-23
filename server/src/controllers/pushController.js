import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { z } from 'zod';

export const pushSubscriptionSchema = z.object({
  body: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

export const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;

  // Check if subscription already exists
  const existing = await User.findOne({
    _id: req.user._id,
    'pushSubscriptions.endpoint': endpoint,
  });

  if (existing) {
    return successResponse(res, { message: 'Already subscribed' });
  }

  await User.findByIdAndUpdate(req.user._id, {
    $push: { pushSubscriptions: { endpoint, keys } },
  });

  return successResponse(res, { message: 'Subscribed successfully' }, 201);
});

export const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { pushSubscriptions: { endpoint } },
  });

  return successResponse(res, { message: 'Unsubscribed successfully' });
});