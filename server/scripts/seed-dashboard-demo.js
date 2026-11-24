import 'dotenv/config';
import mongoose from 'mongoose';
import Course from '../src/models/Course.js';
import StudySession from '../src/models/StudySession.js';
import Task from '../src/models/Task.js';
import User from '../src/models/User.js';

const DEMO_EMAIL = 'demo@studyflow.local';
const DEMO_NAME = 'StudyFlow Demo';
const DEMO_TAG = 'studyflow-demo';

function assertSafeDatabaseUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI must be a valid local MongoDB connection string.');
  }

  const isLoopbackHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));

  if (
    parsed.protocol !== 'mongodb:' ||
    !isLoopbackHost ||
    !/^\/?studyflow$/.test(parsed.pathname) ||
    databaseName !== 'studyflow' ||
    parsed.host.includes(',')
  ) {
    throw new Error('Dashboard demo data can only be seeded into local MongoDB database "studyflow".');
  }
}

function dueDateFromToday(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(17, 0, 0, 0);
  return date;
}

function getWeekSessionDate(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay() + dayOffset);
  date.setHours(10, 0, 0, 0);
  return date;
}

async function seedDashboardDemo() {
  const uri = process.env.MONGODB_URI;
  const password = process.env.DEMO_SEED_PASSWORD;

  if (!uri) {
    throw new Error('Set MONGODB_URI in server/.env before running the dashboard demo seed.');
  }
  assertSafeDatabaseUri(uri);

  if (!password || password.length < 12) {
    throw new Error('Set DEMO_SEED_PASSWORD to a password of at least 12 characters.');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  let user = await User.findOne({ email: DEMO_EMAIL }).select('+passwordHash');
  if (!user) {
    user = await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash: await User.hashPassword(password),
    });
  } else if (!(await user.comparePassword(password))) {
    throw new Error(
      `The existing ${DEMO_EMAIL} account password does not match DEMO_SEED_PASSWORD; no data was changed.`
    );
  }

  const courseSpecs = [
    { name: 'Biology', code: 'BIO101', color: '#10b981' },
    { name: 'Mathematics', code: 'MAT201', color: '#3b82f6' },
    { name: 'History', code: 'HIS110', color: '#f59e0b' },
  ];

  const courses = await Promise.all(
    courseSpecs.map((course) =>
      Course.findOneAndUpdate(
        { user: user._id, name: course.name },
        { $set: course },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
    )
  );
  const [biology, mathematics, history] = courses;

  const taskSpecs = [
    {
      title: 'Review cell structure notes',
      description: 'Review the lecture notes and summarize the main organelles.',
      type: 'assignment',
      status: 'todo',
      priority: 'high',
      course: biology._id,
      dueOffset: 1,
      subtasks: [{ title: 'Review lecture notes', done: false }, { title: 'Write a summary', done: false }],
    },
    {
      title: 'Prepare mitosis diagram',
      description: 'Create a labeled diagram of the stages of mitosis.',
      type: 'project',
      status: 'in_progress',
      priority: 'medium',
      course: biology._id,
      dueOffset: 2,
    },
    {
      title: 'Read chapter 4: Genetics',
      description: 'Read the assigned chapter and note key vocabulary.',
      type: 'assignment',
      status: 'todo',
      priority: 'medium',
      course: biology._id,
      dueOffset: 0,
    },
    {
      title: 'Submit biology lab report',
      description: 'Finish the observations and submit the report.',
      type: 'lab',
      status: 'todo',
      priority: 'urgent',
      course: biology._id,
      dueOffset: -2,
    },
    {
      title: 'Solve quadratic practice set',
      description: 'Complete problems 1 through 20 from the practice set.',
      type: 'assignment',
      status: 'in_progress',
      priority: 'high',
      course: mathematics._id,
      dueOffset: 3,
    },
    {
      title: 'Review algebra quiz',
      description: 'Revisit missed questions before the next quiz.',
      type: 'exam',
      status: 'done',
      priority: 'medium',
      course: mathematics._id,
      dueOffset: -1,
      completedOffset: -1,
    },
    {
      title: 'Draft history essay outline',
      description: 'Prepare a thesis and three supporting sections.',
      type: 'assignment',
      status: 'todo',
      priority: 'medium',
      course: history._id,
      dueOffset: 4,
    },
    {
      title: 'Read primary source documents',
      description: 'Annotate the assigned sources for the seminar.',
      type: 'assignment',
      status: 'done',
      priority: 'low',
      course: history._id,
      dueOffset: -3,
      completedOffset: -2,
    },
    {
      title: 'Prepare for weekly review',
      description: 'Collect questions from this week’s lectures.',
      type: 'personal',
      status: 'todo',
      priority: 'low',
      course: null,
      dueOffset: 6,
    },
  ];

  const tasks = await Promise.all(
    taskSpecs.map((task, index) => {
      const { dueOffset, completedOffset, ...fields } = task;
      return Task.findOneAndUpdate(
        { user: user._id, title: task.title, tags: DEMO_TAG },
        {
          $set: {
            ...fields,
            dueDate: dueDateFromToday(dueOffset),
            completedAt: completedOffset === undefined ? null : dueDateFromToday(completedOffset),
            order: index + 1,
            tags: [DEMO_TAG, 'dashboard'],
            archived: false,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    })
  );

  const sessionSpecs = [
    { course: biology, taskTitle: 'Review cell structure notes', dayOffset: 1, durationMin: 35 },
    { course: mathematics, taskTitle: 'Solve quadratic practice set', dayOffset: 2, durationMin: 50 },
    { course: history, taskTitle: 'Draft history essay outline', dayOffset: 3, durationMin: 40 },
  ];

  await Promise.all(
    sessionSpecs.map(({ course, taskTitle, dayOffset, durationMin }) => {
      const task = tasks.find((item) => item.title === taskTitle);
      if (!task) {
        throw new Error(`Could not find seeded task "${taskTitle}" for its study session.`);
      }
      return StudySession.findOneAndUpdate(
        { user: user._id, task: task._id, startedAt: getWeekSessionDate(dayOffset) },
        { $set: { course: course._id, durationMin, completed: true } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    })
  );

  process.stdout.write(`Seeded dashboard demo data for ${DEMO_EMAIL} in local database studyflow.\n`);
}

try {
  await seedDashboardDemo();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Dashboard demo seeding failed.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
