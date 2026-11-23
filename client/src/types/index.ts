export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  settings: UserSettings;
  pushSubscriptions: PushSubscription[];
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultView: 'list' | 'board';
  remindersEnabled: boolean;
  reminderOffsets: number[];
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Course {
  _id: string;
  user: string;
  name: string;
  code: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  user: string;
  title: string;
  description: string;
  type: 'assignment' | 'exam' | 'project' | 'lab' | 'personal';
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  course: string | null;
  tags: string[];
  subtasks: Subtask[];
  order: number;
  completedAt: string | null;
  archived: boolean;
  reminders: number[];
  createdAt: string;
  updatedAt: string;
  subtaskProgress?: { done: number; total: number };
}

export interface Subtask {
  title: string;
  done: boolean;
}

export interface StudySession {
  _id: string;
  user: string;
  course: string | null;
  task: string | null;
  startedAt: string;
  durationMin: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StatsSummary {
  totals: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    dueToday: number;
  };
  nextUp: Task[];
  courseProgress: CourseProgress[];
  studyChart: { date: string; minutes: number }[];
  studyTimePerCourse: { courseId: string; courseName: string; courseColor: string; minutes: number }[];
  tasksCompletedPerDay: { date: string; count: number }[];
  tasksByStatus: { status: string; count: number; label: string }[];
}

export interface CourseProgress {
  courseId: string;
  courseName: string;
  courseColor: string;
  total: number;
  completed: number;
  progress: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileData {
  name?: string;
  theme?: 'light' | 'dark' | 'system';
  defaultView?: 'list' | 'board';
  remindersEnabled?: boolean;
  reminderOffsets?: number[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  type?: 'assignment' | 'exam' | 'project' | 'lab' | 'personal';
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  course?: string | null;
  tags?: string[];
  subtasks?: { title: string; done: boolean }[];
  reminders?: number[];
}

export interface CreateCourseData {
  name: string;
  code?: string;
  color?: string;
}

export interface CreateSessionData {
  course?: string | null;
  task?: string | null;
  durationMin: number;
  startedAt?: string;
}