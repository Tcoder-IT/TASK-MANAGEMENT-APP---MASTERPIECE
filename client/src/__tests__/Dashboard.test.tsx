import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseApi, statsApi, taskApi } from '../api/endpoints';
import type { ApiResponse, Course, StatsSummary, Task } from '../types';
import Dashboard from '../pages/Dashboard';
import Tasks from '../pages/Tasks';

vi.mock('../api/endpoints', () => ({
  courseApi: { list: vi.fn() },
  statsApi: {
    getSummary: vi.fn(),
    getTasksCompletedPerDay: vi.fn(),
    getTasksByStatus: vi.fn(),
  },
  taskApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggle: vi.fn(),
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Study User' } }),
}));

vi.mock('../components/tasks/TaskDrawer', () => ({
  TaskDrawer: () => null,
}));

vi.mock('recharts', () => {
  const Chart = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Chart,
    BarChart: Chart,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
    PieChart: Chart,
    Pie: () => null,
    Cell: () => null,
  };
});

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
}

const course: Course = {
  _id: 'course-1',
  user: 'user-1',
  name: 'Biology',
  code: 'BIO101',
  color: '#10b981',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const upcomingTask: Task = {
  _id: 'task-1',
  user: 'user-1',
  title: 'Review cell structure',
  description: '',
  type: 'assignment',
  status: 'todo',
  priority: 'high',
  dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  course: course._id,
  tags: [],
  subtasks: [],
  order: 1,
  completedAt: null,
  archived: false,
  reminders: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function renderApp(initialPath = '/dashboard') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const summary: StatsSummary = {
      totals: { total: 4, active: 2, completed: 1, overdue: 1, dueToday: 1 },
      nextUp: [],
      courseProgress: [],
      studyChart: [],
      studyTimePerCourse: [],
    };

    vi.mocked(statsApi.getSummary).mockResolvedValue(
      axiosResponse<ApiResponse<StatsSummary>>({ success: true, data: summary })
    );
    vi.mocked(statsApi.getTasksCompletedPerDay).mockResolvedValue(
      axiosResponse({
        success: true,
        data: { tasksCompletedPerDay: [{ date: '2025-01-01', count: 1 }] },
      })
    );
    vi.mocked(statsApi.getTasksByStatus).mockResolvedValue(
      axiosResponse({
        success: true,
        data: { tasksByStatus: [{ status: 'todo', count: 1, label: 'To Do' }] },
      })
    );
    vi.mocked(courseApi.list).mockResolvedValue(
      axiosResponse<ApiResponse<Course[]>>({ success: true, data: [course] })
    );
    vi.mocked(taskApi.list).mockImplementation(async (params) =>
      axiosResponse({
        success: true,
        data: params?.status === 'active' ? [] : [upcomingTask],
        meta: { total: 1, page: 1, pages: 1 },
      })
    );
  });

  it('renders dashboard API data and opens the active task filter', async () => {
    renderApp();

    expect(await screen.findByText('Review cell structure')).toBeTruthy();
    expect(screen.getByText('BIO101')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Active/ }));

    await waitFor(() => {
      expect(taskApi.list).toHaveBeenCalledWith({ status: 'active', page: 1, limit: 20 });
    });
    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeTruthy();
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('active');
  });
});
