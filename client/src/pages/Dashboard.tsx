import { useMemo, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isToday, isBefore, startOfDay } from 'date-fns';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  CalendarClock,
  Kanban,
  Timer,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';
import { statsApi, taskApi, courseApi } from '@/api/endpoints';
import { useAuth } from '@/features/auth/AuthContext';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import type { Task, Course } from '@/types';

type CreateTaskPayload = Parameters<typeof taskApi.create>[0];
type UpdateTaskPayload = Parameters<typeof taskApi.update>[1];
type DrawerSubmitData = CreateTaskPayload & UpdateTaskPayload;

interface SummaryStats {
  totalTasks?: number;
  activeTasks?: number;
  completedTasks?: number;
  overdueTasks?: number;
  dueTodayTasks?: number;
}

interface CompletedDayPoint {
  date?: string;
  label?: string;
  count?: number;
  completed?: number;
}

interface StatusSlice {
  name?: string;
  status?: string;
  count?: number;
  value?: number;
}

interface CourseStudyPoint {
  courseName?: string;
  name?: string;
  minutes?: number;
  hours?: number;
  totalMinutes?: number;
}

const DONUT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function getPriorityClasses(priority?: string) {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

function getTypeClasses(type?: string) {
  switch (type) {
    case 'exam':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';
    case 'assignment':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200';
    case 'project':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200';
    case 'reading':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
  }
}

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  accentClass: string;
  highlightAlert?: boolean;
  onClick: () => void;
}

function StatCard({
  title,
  value,
  icon,
  accentClass,
  highlightAlert = false,
  onClick,
}: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        highlightAlert && value > 0
          ? 'border-red-400/70 dark:border-red-500/50 bg-red-50/50 dark:bg-red-950/20'
          : ''
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        <span className={cn('p-2 rounded-lg', accentClass)}>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
          View <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-60 w-full rounded-lg bg-gray-100 dark:bg-gray-800/70 animate-pulse p-4 flex flex-col justify-end gap-2">
      <div className="flex items-end gap-3 h-40">
        <div className="flex-1 h-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 h-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 h-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 h-4/5 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 h-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [daysWindow, setDaysWindow] = useState<7 | 30>(7);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const invalidateDashboardData = () => {
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['board'] });
  };

  const {
    data: summaryResponse,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => statsApi.getSummary(),
  });

  const {
    data: completedResponse,
    isLoading: completedLoading,
    isError: completedError,
  } = useQuery({
    queryKey: ['stats', 'completed-per-day', daysWindow],
    queryFn: () => statsApi.getTasksCompletedPerDay(daysWindow),
  });

  const {
    data: statusResponse,
    isLoading: statusLoading,
    isError: statusError,
  } = useQuery({
    queryKey: ['stats', 'by-status'],
    queryFn: () => statsApi.getTasksByStatus(),
  });

  const { data: deadlinesResponse, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['tasks', 'dashboard-deadlines'],
    queryFn: () => taskApi.list({ limit: 15, sort: 'dueDate', order: 'asc' }),
  });

  const { data: coursesResponse } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskApi.create(payload),
    onSuccess: () => {
      invalidateDashboardData();
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
      invalidateDashboardData();
      setDrawerOpen(false);
      setEditingTask(null);
      toast.success('Task updated');
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => taskApi.toggle(id),
    onMutate: (id: string) => {
      setTogglingId(id);
    },
    onSuccess: () => {
      invalidateDashboardData();
      toast.success('Task status updated');
    },
    onError: () => {
      toast.error('Failed to update task status');
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const summary: SummaryStats = useMemo(() => {
    const raw =
      (summaryResponse?.data as Record<string, unknown> | undefined)?.data ??
      summaryResponse?.data ??
      {};
    return raw as SummaryStats;
  }, [summaryResponse]);

  const completedSeries = useMemo(() => {
    const raw =
      (completedResponse?.data as Record<string, unknown> | undefined)?.data ??
      completedResponse?.data ??
      [];
    if (!Array.isArray(raw)) return [];
    return (raw as CompletedDayPoint[]).map((item, idx) => ({
      label: item.label || item.date || `Day ${idx + 1}`,
      completed: Number(item.completed ?? item.count ?? 0),
    }));
  }, [completedResponse]);

  const statusSeries = useMemo(() => {
    const raw =
      (statusResponse?.data as Record<string, unknown> | undefined)?.data ??
      statusResponse?.data ??
      [];
    if (!Array.isArray(raw)) return [];
    return (raw as StatusSlice[])
      .map((item, idx) => ({
        name: item.name || item.status || `Group ${idx + 1}`,
        value: Number(item.value ?? item.count ?? 0),
      }))
      .filter((item) => item.value > 0);
  }, [statusResponse]);

  const courseStudySeries = useMemo(() => {
    const raw = (summaryResponse?.data as Record<string, unknown> | undefined)?.studyTimePerCourse;
    if (!Array.isArray(raw)) return [];
    return (raw as CourseStudyPoint[]).map((item, idx) => ({
      course: item.courseName || item.name || `Course ${idx + 1}`,
      minutes: Number(item.minutes ?? item.totalMinutes ?? (item.hours ? item.hours * 60 : 0)),
    }));
  }, [summaryResponse]);

  const upcomingTasks: Task[] = useMemo(() => {
    const list: Task[] = deadlinesResponse?.data?.data ?? [];
    return list.filter((t) => t.status !== 'done').slice(0, 6);
  }, [deadlinesResponse]);

  const courses: Course[] = coursesResponse?.data ?? [];
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(c._id, c));
    return map;
  }, [courses]);

  const openQuickAdd = () => {
    setEditingTask(null);
    setDrawerOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleDrawerSubmit = async (formData: DrawerSubmitData) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask._id, payload: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    return isBefore(new Date(task.dueDate), startOfDay(new Date()));
  };

  const goToTasksFilter = (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    navigate(search ? `/tasks?${search}` : '/tasks');
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

  const greetingName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {greetingName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} — track deadlines, progress, and focus time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/board" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <Kanban className="h-4 w-4" />
            Board
          </Link>
          <Link to="/timer" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <Timer className="h-4 w-4" />
            Focus Timer
          </Link>
          <button
            type="button"
            onClick={openQuickAdd}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            Quick Add Task
          </button>
        </div>
      </div>

      {summaryError && (
        <div className="card p-4 text-sm text-red-600 dark:text-red-400">
          Failed to load dashboard summary. Please refresh the page.
        </div>
      )}

      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="card h-24 animate-pulse bg-gray-100 dark:bg-gray-800/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Total Tasks"
            value={Number(summary.totalTasks ?? 0)}
            icon={<CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
            accentClass="bg-blue-50 dark:bg-blue-950/50"
            onClick={() => goToTasksFilter({})}
          />
          <StatCard
            title="Active"
            value={Number(summary.activeTasks ?? 0)}
            icon={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            accentClass="bg-amber-50 dark:bg-amber-950/50"
            onClick={() => goToTasksFilter({ status: 'in_progress' })}
          />
          <StatCard
            title="Completed"
            value={Number(summary.completedTasks ?? 0)}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            accentClass="bg-emerald-50 dark:bg-emerald-950/50"
            onClick={() => goToTasksFilter({ status: 'done' })}
          />
          <StatCard
            title="Overdue"
            value={Number(summary.overdueTasks ?? 0)}
            icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
            accentClass="bg-red-50 dark:bg-red-950/50"
            highlightAlert
            onClick={() => goToTasksFilter({ due: 'overdue' })}
          />
          <StatCard
            title="Due Today"
            value={Number(summary.dueTodayTasks ?? 0)}
            icon={<CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
            accentClass="bg-indigo-50 dark:bg-indigo-950/50"
            onClick={() => goToTasksFilter({ due: 'today' })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Tasks Completed
              </h2>
            </div>

            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDaysWindow(7)}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  daysWindow === 7
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setDaysWindow(30)}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  daysWindow === 30
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                30 Days
              </button>
            </div>
          </div>

          {completedLoading ? (
            <ChartSkeleton />
          ) : completedError ? (
            <div className="h-60 flex items-center justify-center text-sm text-red-600 dark:text-red-400">
              Could not load completion history.
            </div>
          ) : completedSeries.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No completed tasks recorded in the last {daysWindow} days.
              </p>
              <button type="button" onClick={openQuickAdd} className="btn-secondary text-xs">
                Add a task to get started
              </button>
            </div>
          ) : (
            <div
              className="h-60 w-full"
              role="img"
              aria-label={`Tasks completed per day over the last ${daysWindow} days`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completedSeries}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Tasks by Status
            </h2>
          </div>

          {statusLoading ? (
            <ChartSkeleton />
          ) : statusError ? (
            <div className="h-60 flex items-center justify-center text-sm text-red-600 dark:text-red-400">
              Could not load status breakdown.
            </div>
          ) : statusSeries.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              No status data available yet.
            </div>
          ) : (
            <div className="h-60 w-full" role="img" aria-label="Distribution of tasks by status">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusSeries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {statusSeries.map((entry, idx) => (
                      <Cell
                        key={`${entry.name}-${idx}`}
                        fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Upcoming Deadlines
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Click a task to edit, or check it off directly
              </p>
            </div>
            <Link
              to="/tasks"
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View all tasks
            </Link>
          </div>

          {deadlinesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800/70 animate-pulse"
                />
              ))}
            </div>
          ) : upcomingTasks.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No upcoming open tasks. You are all caught up.
              </p>
              <button
                type="button"
                onClick={openQuickAdd}
                className="btn-primary inline-flex items-center gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Schedule a Task
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {upcomingTasks.map((task) => {
                const overdue = isTaskOverdue(task);
                const dueObj = task.dueDate ? new Date(task.dueDate) : null;
                const linkedCourse = task.course ? courseMap.get(task.course) : undefined;
                const isToggling = togglingId === task._id && toggleMutation.isPending;

                return (
                  <li
                    key={task._id}
                    onClick={() => openEditTask(task)}
                    className="py-3 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMutation.mutate(task._id);
                        }}
                        aria-label={`Mark ${task.title} as complete`}
                        className="mt-0.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                      >
                        <Circle className="h-5 w-5" />
                      </button>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {linkedCourse && (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: linkedCourse.color || '#3b82f6' }}
                              />
                              {linkedCourse.code || linkedCourse.name}
                            </span>
                          )}
                          {task.type && (
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-xs font-medium capitalize',
                                getTypeClasses(task.type)
                              )}
                            >
                              {task.type}
                            </span>
                          )}
                          {task.priority && (
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-xs font-medium capitalize',
                                getPriorityClasses(task.priority)
                              )}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {dueObj && (
                      <div
                        className={cn(
                          'text-xs text-right shrink-0',
                          overdue
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : isToday(dueObj)
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        <div>{format(dueObj, 'MMM d')}</div>
                        <div>
                          {overdue
                            ? `${formatDistanceToNow(dueObj)} overdue`
                            : formatDistanceToNow(dueObj, { addSuffix: true })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Study Time per Course
            </h2>
          </div>

          {summaryLoading ? (
            <ChartSkeleton />
          ) : courseStudySeries.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No study sessions logged yet.
              </p>
              <Link to="/timer" className="btn-secondary text-xs">
                Open Focus Timer
              </Link>
            </div>
          ) : (
            <div className="h-60 w-full" role="img" aria-label="Study minutes per course">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseStudySeries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="course" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <TaskDrawer {...drawerProps} />
    </div>
  );
}
