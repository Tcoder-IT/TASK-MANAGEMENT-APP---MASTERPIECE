import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { taskApi } from '@/api/endpoints';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import type { FilterFormData } from '@/components/tasks/TaskFilters';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { formatRelativeTime, getPriorityColor, getStatusColor, getTypeColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Check, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateTaskData, Task } from '@/types';

type TaskFormData = CreateTaskData;

function getInitialFilters(searchParams: URLSearchParams): Partial<FilterFormData> {
  const filters: Partial<FilterFormData> = {};
  const status = searchParams.get('status');
  const dueWindow = searchParams.get('dueWindow');

  if (status === 'todo' || status === 'in_progress' || status === 'done' || status === 'active') {
    filters.status = status;
  }
  if (dueWindow === 'overdue' || dueWindow === 'today' || dueWindow === 'week') {
    filters.dueWindow = dueWindow;
  }

  return filters;
}

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<Partial<FilterFormData>>(() =>
    getInitialFilters(searchParams)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks', filters, currentPage],
    queryFn: () => {
      const params = { ...filters, page: currentPage, limit: 20 };
      for (const key of ['search', 'status', 'priority', 'type', 'course', 'tag', 'dueWindow'] as const) {
        if (params[key] === '') delete params[key];
      }
      return taskApi.list(params);
    },
    placeholderData: (previous) => previous,
  });

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['board'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: TaskFormData) => taskApi.create(data),
    onSuccess: () => {
      invalidateTasks();
      toast.success('Task created');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskData> }) =>
      taskApi.update(id, data),
    onSuccess: () => {
      invalidateTasks();
      toast.success('Task updated');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      toast.error(message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => taskApi.toggle(id),
    onSuccess: () => {
      invalidateTasks();
      toast.success('Task status updated');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to toggle task';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => {
      invalidateTasks();
      toast.success('Task deleted');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      toast.error(message);
    },
  });

  const handleFilterChange = (newFilters: Partial<FilterFormData>) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    setTotalTasks(data?.data.meta.total ?? 0);
    setTotalPages(data?.data.meta.pages ?? 1);
  }, [data]);

  const openCreateDrawer = () => {
    setEditingTask(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (task: Task) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleDrawerSubmit = async (formData: TaskFormData) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask._id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleToggle = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setActionLoading(taskId);
    try {
      await toggleMutation.mutateAsync(taskId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, taskId: string, taskTitle: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${taskTitle}"? This cannot be undone.`)) return;
    setActionLoading(taskId);
    try {
      await deleteMutation.mutateAsync(taskId);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-danger-600">Failed to load tasks</div>;
  }

  const tasks: Task[] = data?.data.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your assignments and deadlines</p>
        </div>
        <button onClick={openCreateDrawer} className="btn-primary">
          <span className="mr-2">+</span> New Task
        </button>
      </div>

      <TaskFilters
        onFilterChange={handleFilterChange}
        initialFilters={filters}
        totalTasks={totalTasks}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Task</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Type</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Priority</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Status</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Due</th>
                <th className="text-right p-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No tasks found. Create your first task!
                  </td>
                </tr>
              ) : (
                tasks.map((task: Task) => (
                  <tr
                    key={task._id}
                    onClick={() => openEditDrawer(task)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={cn('badge', getTypeColor(task.type))}>{task.type}</span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={cn('badge', getPriorityColor(task.priority))}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={cn('badge', getStatusColor(task.status))}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span
                        className={cn(
                          'font-mono text-sm',
                          new Date(task.dueDate) < new Date() && task.status !== 'done'
                            ? 'text-danger-600 dark:text-danger-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {formatRelativeTime(task.dueDate)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleToggle(e, task._id)}
                          disabled={actionLoading === task._id}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-success-600 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDrawer(task);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-800"
                          aria-label="Edit task"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, task._id, task.title)}
                          disabled={actionLoading === task._id}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-danger-600 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleDrawerSubmit}
        initialData={editingTask}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}