import StudySession from '../models/StudySession.js';
import Task from '../models/Task.js';
import Course from '../models/Course.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    course: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
    task: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
    durationMin: z.number().int().min(1).max(480),
    startedAt: z.coerce.date().optional(),
  }),
});

export const sessionQuerySchema = z.object({
  query: z.object({
    course: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    task: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createSession = asyncHandler(async (req, res) => {
  try {
    const { course, task, durationMin, startedAt } = req.body;

    if (course) {
      const courseDoc = await Course.findOne({ _id: course, user: req.user._id });
      if (!courseDoc) throw new ApiError(404, 'Course not found');
    }

    if (task) {
      const taskDoc = await Task.findOne({ _id: task, user: req.user._id });
      if (!taskDoc) throw new ApiError(404, 'Task not found');
    }

    const session = await StudySession.create({
      user: req.user._id,
      course: course || null,
      task: task || null,
      durationMin,
      startedAt: startedAt || new Date(),
    });

    return successResponse(res, session, 201);
  } catch (error) {
    console.error('createSession error:', error);
    throw error;
  }
});

export const listSessions = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.course) filter.course = req.query.course;
  if (req.query.task) filter.task = req.query.task;
  if (req.query.from || req.query.to) {
    filter.startedAt = {};
    if (req.query.from) filter.startedAt.$gte = req.query.from;
    if (req.query.to) filter.startedAt.$lte = req.query.to;
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    StudySession.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit),
    StudySession.countDocuments(filter),
  ]);

  return successResponse(res, sessions, 200, { total, page, pages: Math.ceil(total / limit) });
});