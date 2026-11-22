import Task from '../models/Task.js';
import Course from '../models/Course.js';
import StudySession from '../models/StudySession.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

function getWeekRange() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return { weekStart, weekEnd };
}

function getTodayRange() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { todayStart, todayEnd };
}

export const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const { todayStart, todayEnd } = getTodayRange();
  const { weekStart, weekEnd } = getWeekRange();

  const [
    totalTasks,
    activeTasks,
    completedTasks,
    overdueTasks,
    dueTodayTasks,
    upcomingTasks,
    courses,
    weekSessions,
  ] = await Promise.all([
    Task.countDocuments({ user: userId, archived: false }),
    Task.countDocuments({ user: userId, archived: false, status: { $in: ['todo', 'in_progress'] } }),
    Task.countDocuments({ user: userId, archived: false, status: 'done' }),
    Task.countDocuments({ user: userId, archived: false, dueDate: { $lt: now }, status: { $ne: 'done' } }),
    Task.countDocuments({ user: userId, archived: false, dueDate: { $gte: todayStart, $lt: todayEnd } }),
    Task.find({ user: userId, archived: false, status: { $ne: 'done' }, dueDate: { $gte: now } })
      .sort({ dueDate: 1 })
      .limit(5)
      .select('title dueDate type priority course'),
    Course.find({ user: userId }).select('name color'),
    StudySession.find({ user: userId, startedAt: { $gte: weekStart, $lt: weekEnd } })
      .select('course task durationMin startedAt'),
  ]);

  // Progress per course
  const courseProgress = await Promise.all(courses.map(async (course) => {
    const [total, completed] = await Promise.all([
      Task.countDocuments({ user: userId, course: course._id, archived: false }),
      Task.countDocuments({ user: userId, course: course._id, archived: false, status: 'done' }),
    ]);
    return {
      courseId: course._id,
      courseName: course.name,
      courseColor: course.color,
      total,
      completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }));

  // 7-day study time
  const studyByDay = {};
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const key = date.toISOString().split('T')[0];
    studyByDay[key] = 0;
  }
  weekSessions.forEach(s => {
    const key = s.startedAt.toISOString().split('T')[0];
    if (studyByDay[key] !== undefined) studyByDay[key] += s.durationMin;
  });

  const studyChart = Object.entries(studyByDay).map(([date, minutes]) => ({ date, minutes }));

  // Study time per course this week
  const courseStudyTime = {};
  weekSessions.forEach(s => {
    if (s.course) {
      const id = s.course.toString();
      courseStudyTime[id] = (courseStudyTime[id] || 0) + s.durationMin;
    }
  });

  const studyTimePerCourse = await Promise.all(
    Object.entries(courseStudyTime).map(async ([courseId, minutes]) => {
      const course = await Course.findById(courseId).select('name color');
      return { courseId, courseName: course?.name || 'Unknown', courseColor: course?.color || '#6366f1', minutes };
    })
  );

  return successResponse(res, {
    totals: {
      total: totalTasks,
      active: activeTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      dueToday: dueTodayTasks,
    },
    nextUp: upcomingTasks,
    courseProgress,
    studyChart,
    studyTimePerCourse,
  });
});