import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseApi, taskApi } from '../api/endpoints';
import type { ApiResponse, Course, PaginatedResponse, Task } from '../types';
import Timer from '../pages/Timer';

vi.mock('../api/endpoints', () => ({
  courseApi: { list: vi.fn() },
  taskApi: { list: vi.fn() },
}));

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
}

const task: Task = {
  _id: 'task-1',
  user: 'user-1',
  title: 'Review biology notes',
  description: '',
  type: 'assignment',
  status: 'todo',
  priority: 'medium',
  dueDate: '2026-12-01T17:00:00.000Z',
  course: null,
  tags: [],
  subtasks: [],
  order: 1,
  completedAt: null,
  archived: false,
  reminders: [],
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
};

function renderTimer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <Timer />
    </QueryClientProvider>
  );
}

describe('Timer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(taskApi.list).mockResolvedValue(
      axiosResponse<ApiResponse<Task[]> & { meta: PaginatedResponse<Task>['meta'] }>({
        success: true,
        data: [task],
        meta: { total: 1, page: 1, pages: 1 },
      })
    );
    vi.mocked(courseApi.list).mockResolvedValue(
      axiosResponse<ApiResponse<Course[]>>({ success: true, data: [] })
    );
  });

  it('loads and allows selecting a task from the paginated task response', async () => {
    renderTimer();

    expect(await screen.findByRole('option', { name: task.title })).toBeTruthy();
    expect(taskApi.list).toHaveBeenCalledWith({ limit: 100 });

    const taskSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(taskSelect, { target: { value: task._id } });

    expect(taskSelect.value).toBe(task._id);
  });
});
