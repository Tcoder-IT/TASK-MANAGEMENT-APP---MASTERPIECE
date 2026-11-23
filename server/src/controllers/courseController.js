import Course from '../models/Course.js';
import Task from '../models/Task.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

export const createCourse = asyncHandler(async (req, res) => {
  const { name, code, color } = req.body;

  const existing = await Course.findOne({ user: req.user._id, name });
  if (existing) {
    throw new ApiError(409, 'Course with this name already exists');
  }

  const course = await Course.create({ user: req.user._id, name, code, color });
  return successResponse(res, course, 201);
});

export const listCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ user: req.user._id }).sort({ name: 1 });
  return successResponse(res, courses);
});

export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, user: req.user._id });
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  return successResponse(res, course);
});

export const updateCourse = asyncHandler(async (req, res) => {
  const { name, code, color } = req.body;

  if (name) {
    const existing = await Course.findOne({ user: req.user._id, name, _id: { $ne: req.params.id } });
    if (existing) {
      throw new ApiError(409, 'Course with this name already exists');
    }
  }

  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { name, code, color },
    { new: true, runValidators: true }
  );
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  return successResponse(res, course);
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  await Task.updateMany(
    { course: course._id, user: req.user._id },
    { $set: { course: null } }
  );

  return successResponse(res, { message: 'Course deleted. Tasks unassigned.' });
});