import { useState } from 'react';
import type { ComponentProps, MouseEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Sun, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { taskApi, courseApi } from '@/api/endpoints';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import type { Task, Course } from '@/types';

type CreateTaskPayload = Parameters<typeof taskApi.create>[0];
type UpdateTaskPayload = Parameters<typeof taskApi.update>[1];
type DrawerSubmitData = CreateTaskPayload & UpdateTaskPayload;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getTypeColor(type?: string) {
  switch (type) {
    case 'exam':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'assignment':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'project':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200';
    case 'reading':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  }
}

export default function Calendar() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState<string>('');

  const { data: tasksResponse, isLoading, isError } = useQuery({
    queryKey: ['tasks', 'calendar', { limit: 100 }],
    queryFn: () => taskApi.list({ limit: 100 }),
  });

  const { data: coursesResponse } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list(),
  });

  const tasks: Task[] = tasksResponse?.data?.data ?? [];
  const courses: Course[] = coursesResponse?.data.data ?? [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['board'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskApi.create(payload),
    onSuccess: () => {
      invalidateAll();
      setDrawerOpen(false);
      setEditingTask(null);
      toast.success('Task created');
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      taskApi.update(id, payload),
    onSuccess: () => {
      invalidateAll();
      setDrawerOpen(false);
      setEditingTask(null);
      toast.success('Task updated');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    return isBefore(new Date(task.dueDate), startOfDay(new Date()));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!task.dueDate) return acc;
    const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const handleDateClick = (date: Date) => {
    setEditingTask(null);
    setSelectedDueDate(format(date, 'yyyy-MM-dd'));
    setDrawerOpen(true);
  };

  const handleTaskChipClick = (task: Task, e: MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setSelectedDueDate('');
    setDrawerOpen(true);
  };

  const handleDrawerSubmit = async (formData: DrawerSubmitData) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask._id, payload: formData });
    } else {
      const resolvedDueDate =
        formData.dueDate || selectedDueDate || format(new Date(), 'yyyy-MM-dd');
      const resolvedTitle = formData.title?.trim() || `Task for ${resolvedDueDate}`;
      await createMutation.mutateAsync({
        ...formData,
        title: resolvedTitle,
        dueDate: resolvedDueDate,
      });
    }
  };

  const drawerProps: ComponentProps<typeof TaskDrawer> = {
    isOpen: drawerOpen,
    onClose: () => {
      setDrawerOpen(false);
      setEditingTask(null);
    },
    onSubmit: handleDrawerSubmit,
    courses,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    ...(editingTask ? { task: editingTask } : {}),
  } as ComponentProps<typeof TaskDrawer>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Click any day to schedule a task or click a task to edit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="btn-secondary"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleDateClick(new Date())}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {isError && (
        <div className="card p-4 text-sm text-red-600 dark:text-red-400">
          Failed to load calendar tasks. Please refresh and try again.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-r last:border-r-0 border-gray-200 dark:border-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading calendar...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);
              const isOverdueDay = dayTasks.some(isOverdue);

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleDateClick(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDateClick(day);
                    }
                  }}
                  className={cn(
                    'min-h-[110px] p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60',
                    !isCurrentMonth && 'bg-gray-50/70 dark:bg-gray-900/50 text-gray-400',
                    isTodayDay && 'bg-primary-50/70 dark:bg-primary-900/20',
                    isOverdueDay &&
                      'border-red-400/60 dark:border-red-500/40 bg-red-50/60 dark:bg-red-950/20'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isTodayDay
                          ? 'text-primary-600 dark:text-primary-400 font-semibold'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {isTodayDay && <Sun className="h-3.5 w-3.5 text-amber-500" />}
                      {isOverdueDay && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                    </span>
                  </div>

                  <div className="space-y-1 max-h-[82px] overflow-y-auto">
                    {dayTasks.slice(0, 4).map((task) => {
                      const taskOverdue = isOverdue(task);
                      return (
                        <button
                          key={task._id}
                          type="button"
                          onClick={(e) => handleTaskChipClick(task, e)}
                          className={cn(
                            'w-full text-left text-xs px-1.5 py-1 rounded truncate block transition-opacity hover:opacity-90',
                            getTypeColor(task.type),
                            taskOverdue && 'ring-1 ring-red-500/60',
                            task.status === 'done' && 'line-through opacity-65'
                          )}
                        >
                          {task.title}
                        </button>
                      );
                    })}
                    {dayTasks.length > 4 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                        +{dayTasks.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskDrawer {...drawerProps} />
    </div>
  );
}
