import Task from '../models/Task.js';
import Course from '../models/Course.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

function buildFilter(userId, query) {
  const filter = { user: userId };

  if (query.archived === false || query.archived === 'false') {
    filter.archived = false;
  } else if (query.archived === true || query.archived === 'true') {
    filter.archived = true;
  } else {
    filter.archived = false;
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.type) filter.type = query.type;
  if (query.course) filter.course = query.course;
  if (query.tag) filter.tags = query.tag;

  if (query.dueWindow) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (query.dueWindow === 'overdue') {
      filter.dueDate = { $lt: now };
      filter.status = { $ne: 'done' };
    } else if (query.dueWindow === 'today') {
      filter.dueDate = { $gte: todayStart, $lt: todayEnd };
    } else if (query.dueWindow === 'week') {
      filter.dueDate = { $gte: todayStart, $lt: weekEnd };
    }
  }

  return filter;
}

function buildSort(query) {
  const sort = {};
  const order = query.order === 'desc' ? -1 : 1;

  switch (query.sort) {
    case 'dueDate':
      sort.dueDate = order;
      break;
    case 'createdAt':
      sort.createdAt = order;
      break;
    case 'priority': {
      sort.priority = order;
      break;
    }
    case 'order':
      sort.order = order;
      break;
    default:
      sort.dueDate = 1;
  }

  sort.createdAt = -1;
  return sort;
}

export const getBoardTasks = asyncHandler(async (req, res) => {
  const CAP = 500;
  const filter = { user: req.user._id, archived: false };

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort({ order: 1, createdAt: 1 }).limit(CAP),
    Task.countDocuments(filter),
  ]);

  return successResponse(res, tasks, 200, {
    total,
    cap: CAP,
    capReached: total > CAP,
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const { title, description, type, status, priority, dueDate, course, tags, subtasks, reminders } = req.body;

  if (course) {
    const courseDoc = await Course.findOne({ _id: course, user: req.user._id });
    if (!courseDoc) {
      throw new ApiError(404, 'Course not found');
    }
  }

  const maxOrder = await Task.findOne({ user: req.user._id }).sort({ order: -1 }).select('order');
  const order = (maxOrder?.order || 0) + 1;

  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    type,
    status,
    priority,
    dueDate,
    course: course || null,
    tags,
    subtasks,
    reminders,
    order,
  });

  return successResponse(res, task, 201);
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return successResponse(res, task);
});

export const updateTask = asyncHandler(async (req, res) => {
  const updates = req.body;

  if (updates.course) {
    const courseDoc = await Course.findOne({ _id: updates.course, user: req.user._id });
    if (!courseDoc) {
      throw new ApiError(404, 'Course not found');
    }
  }

  if (updates.status === 'done' && updates.completedAt === undefined) {
    updates.completedAt = new Date();
  } else if (updates.status !== 'done') {
    updates.completedAt = null;
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { new: true, runValidators: true }
  );
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return successResponse(res, task);
});

export const toggleTaskDone = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  task.status = task.status === 'done' ? 'todo' : 'done';
  task.completedAt = task.status === 'done' ? new Date() : null;
  await task.save();

  return successResponse(res, task);
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return successResponse(res, { message: 'Task deleted', deletedTask: task });
});

export const reorderTasks = asyncHandler(async (req, res) => {
  const { taskIds } = req.body;

  const tasks = await Task.find({ _id: { $in: taskIds }, user: req.user._id });
  if (tasks.length !== taskIds.length) {
    throw new ApiError(400, 'Some tasks not found or unauthorized');
  }

  const bulkOps = taskIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, user: req.user._id },
      update: { $set: { order: index } },
    },
  }));

  await Task.bulkWrite(bulkOps);

  const updated = await Task.find({ _id: { $in: taskIds }, user: req.user._id }).sort({ order: 1 });
  return successResponse(res, updated);
});

export const moveTask = asyncHandler(async (req, res) => {
  const { taskId, targetStatus, targetIndex } = req.body;

  const task = await Task.findOne({ _id: taskId, user: req.user._id });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const oldStatus = task.status;

  // Get all tasks in the target column to reorder
  const targetColumnTasks = await Task.find({
    user: req.user._id,
    status: targetStatus,
    archived: false
  }).sort({ order: 1 });

  // Clamp targetIndex to valid range
  const clampedIndex = Math.min(Math.max(targetIndex, 0), targetColumnTasks.length);

  // Build all bulk write operations atomically
  const bulkOps = [];

  // If moving within the same column, just reorder
  if (oldStatus === targetStatus) {
    const taskIds = targetColumnTasks.map(t => t._id.toString());
    const taskIndex = taskIds.indexOf(taskId);

    // Remove from current position
    taskIds.splice(taskIndex, 1);
    // Insert at new position
    taskIds.splice(clampedIndex, 0, taskId);

    taskIds.forEach((id, index) => {
      const update = { $set: { order: index } };
      if (id === taskId) {
        update.$set.completedAt = targetStatus === 'done' ? new Date() : null;
      }
      bulkOps.push({
        updateOne: {
          filter: { _id: id, user: req.user._id },
          update,
        },
      });
    });
  } else {
    // Moving between columns
    // Remove from old column
    const oldColumnTasks = await Task.find({
      user: req.user._id,
      status: oldStatus,
      archived: false
    }).sort({ order: 1 });

    const oldTaskIds = oldColumnTasks
      .filter(t => t._id.toString() !== taskId)
      .map(t => t._id.toString());

    // Reassign orders in old column
    oldTaskIds.forEach((id, index) => {
      bulkOps.push({
        updateOne: {
          filter: { _id: id, user: req.user._id },
          update: { $set: { order: index } },
        },
      });
    });

    // Insert into new column at targetIndex and reassign orders
    const newTaskIds = targetColumnTasks.map(t => t._id.toString());
    newTaskIds.splice(clampedIndex, 0, taskId);

    newTaskIds.forEach((id, index) => {
      const update = { $set: { order: index } };
      if (id === taskId) {
        update.$set.status = targetStatus;
        update.$set.completedAt = targetStatus === 'done' ? new Date() : null;
      }
      bulkOps.push({
        updateOne: {
          filter: { _id: id, user: req.user._id },
          update,
        },
      });
    });
  }

  // All changes applied in one atomic bulkWrite
  await Task.bulkWrite(bulkOps);

  const updated = await Task.findOne({ _id: taskId, user: req.user._id });
  return successResponse(res, updated);
});

export const quickAddTask = asyncHandler(async (req, res) => {
  const { title } = req.body;

  const maxOrder = await Task.findOne({ user: req.user._id }).sort({ order: -1 }).select('order');
  const order = (maxOrder?.order || 0) + 1;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);
  dueDate.setHours(12, 0, 0, 0);

  const task = await Task.create({
    user: req.user._id,
    title,
    dueDate,
    order,
  });

  return successResponse(res, task, 201);
});
export const listTasks = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.user._id, req.query);
  const sort = buildSort(req.query);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = Task.find(filter).sort(sort);

  if (req.query.search) {
    query = query.find({ $text: { $search: req.query.search } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, ...sort });
  }

  const [tasks, total] = await Promise.all([
    query.skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  return successResponse(res, tasks, 200, {
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});