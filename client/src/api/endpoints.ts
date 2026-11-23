import { api } from './client';
import type {
  AuthResponse,
  User,
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
  UpdateProfileData,
  Course,
  CreateCourseData,
  Task,
  CreateTaskData,
  PaginatedResponse,
  StatsSummary,
  StudySession,
  CreateSessionData
} from '../types';

export const authApi = {
  register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginCredentials) => api.post<AuthResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
  getMe: () => api.get<User>('/auth/me'),
  updateProfile: (data: UpdateProfileData) => api.patch<User>('/auth/me', data),
  changePassword: (data: ChangePasswordData) => api.patch('/auth/me/password', data),
  deleteAccount: () => api.delete('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export const courseApi = {
  list: () => api.get<Course[]>('/courses'),
  create: (data: CreateCourseData) => api.post<Course>('/courses', data),
  get: (id: string) => api.get<Course>(`/courses/${id}`),
  update: (id: string, data: Partial<CreateCourseData>) => api.patch<Course>(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`)
};

export const taskApi = {
  list: (params?: {
    status?: string;
    priority?: string;
    type?: string;
    course?: string;
    tag?: string;
    dueWindow?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
    archived?: boolean;
  }) => api.get<PaginatedResponse<Task>>('/tasks', { params }),
  getBoard: () => api.get<{ data: Task[]; meta: { total: number; cap: number; capReached: boolean } }>('/tasks/board'),
  create: (data: CreateTaskData) => api.post<Task>('/tasks', data),
  quickAdd: (title: string) => api.post<Task>('/tasks/quick', { title }),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  update: (id: string, data: Partial<CreateTaskData>) => api.patch<Task>(`/tasks/${id}`, data),
  toggle: (id: string) => api.patch<Task>(`/tasks/${id}/toggle`),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  reorder: (taskIds: string[]) => api.patch<Task[]>('/tasks/reorder', { taskIds }),
  move: (taskId: string, targetStatus: string, targetIndex: number) =>
    api.patch<Task>('/tasks/move', { taskId, targetStatus, targetIndex }),
};

export const statsApi = {
  getSummary: () => api.get<StatsSummary>('/stats/summary'),
  getTasksCompletedPerDay: (days?: number) => api.get<{ tasksCompletedPerDay: { date: string; count: number }[] }>(`/stats/tasks-completed${days ? `?days=${days}` : ''}`),
  getTasksByStatus: () => api.get<{ tasksByStatus: { status: string; count: number; label: string }[] }>('/stats/tasks-by-status'),
};

export const sessionApi = {
  list: (params?: {
    course?: string;
    task?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<StudySession>>('/sessions', { params }),
  create: (data: CreateSessionData) => api.post<StudySession>('/sessions', data)
};

export const pushApi = {
  subscribe: (endpoint: string, keys: { p256dh: string; auth: string }) =>
    api.post('/push/subscribe', { endpoint, keys }),
  unsubscribe: (endpoint: string) => api.post('/push/unsubscribe', { endpoint })
};