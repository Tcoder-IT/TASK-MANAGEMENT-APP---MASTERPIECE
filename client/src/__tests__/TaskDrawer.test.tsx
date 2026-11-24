import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseApi } from '../api/endpoints';
import type { ApiResponse, Course, CreateTaskData } from '../types';
import { TaskDrawer } from '../components/tasks/TaskDrawer';

vi.mock('../api/endpoints', () => ({
  courseApi: { list: vi.fn() },
}));

const course: Course = {
  _id: 'course-1',
  user: 'user-1',
  name: 'Biology',
  code: 'BIO101',
  color: '#10b981',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
}

function renderTaskDrawer(onSubmit: (data: CreateTaskData) => Promise<void>, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TaskDrawer isOpen onClose={onClose} onSubmit={onSubmit} />
    </QueryClientProvider>
  );

  return onClose;
}

describe('TaskDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(courseApi.list).mockResolvedValue(
      axiosResponse<ApiResponse<Course[]>>({ success: true, data: [course] })
    );
  });

  it('sends null for the no-course option and closes after success', async () => {
    const onSubmit = vi.fn(async () => {});
    const onClose = renderTaskDrawer(onSubmit);

    await screen.findByLabelText('Course');
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Review biology notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Review biology notes',
          course: null,
        })
      );
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('preserves the selected course ID in the task payload', async () => {
    const onSubmit = vi.fn(async () => {});
    renderTaskDrawer(onSubmit);

    await screen.findByRole('option', { name: 'BIO101 - Biology' });
    fireEvent.change(screen.getByLabelText('Course'), {
      target: { value: course._id },
    });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Prepare lab report' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Prepare lab report', course: course._id })
      );
    });
  });

  it('shows submission errors without closing or leaking a rejected promise', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('Task could not be saved');
    });
    const onClose = renderTaskDrawer(onSubmit);

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Review biology notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Task could not be saved');
    expect(onClose).not.toHaveBeenCalled();
  });
});
