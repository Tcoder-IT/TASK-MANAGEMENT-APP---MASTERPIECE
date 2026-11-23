import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { statsApi } from '@/api/endpoints';
import { formatRelativeTime } from '@/lib/utils';

const STATUS_COLORS = {
  todo: '#9ca3af',
  in_progress: '#6366f1',
  done: '#22c55e',
};

function getPriorityBadgeVariant(priority: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'primary';
    case 'low': return 'default';
    default: return 'default';
  }
}

function getTypeBadgeVariant(type: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  switch (type) {
    case 'exam': return 'primary';
    case 'project': return 'info';
    case 'assignment': return 'default';
    case 'lab': return 'success';
    case 'personal': return 'default';
    default: return 'default';
  }
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="card p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-8 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="card p-6">
      <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function ErrorChart({ message }: { message: string }) {
  return (
    <div className="card p-6">
      <div className="flex flex-col items-center justify-center h-64 text-center text-danger-600 dark:text-danger-400">
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function TasksCompletedChart({ data, isLoading, error }: { data: { date: string; count: number }[] | undefined; isLoading: boolean; error: unknown }) {
  const ariaDescription = 'Bar chart showing tasks completed each day over the last 7 days. ' + (data?.map(d => d.date + ': ' + d.count + ' tasks').join(', ') || 'No data available');

  if (isLoading) return <ChartSkeleton />;
  if (error) return <ErrorChart message="Failed to load chart data" />;
  if (!data || data.length === 0) return <EmptyChart message="No completed tasks in the last 7 days" />;

  return (
    <div className="card p-6" role="img" aria-label={ariaDescription} aria-describedby="tasks-completed-desc">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks Completed (Last 7 Days)</h3>
      <p id="tasks-completed-desc" className="sr-only">{ariaDescription}</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="date" type="category" width={80} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [value + ' tasks', 'Completed']}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} width={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TasksByStatusChart({ data }: { data: { status: string; count: number; label: string }[] | undefined }) {
  const ariaDescription = 'Donut chart showing tasks distribution by status. ' + (data?.map(d => d.label + ': ' + d.count).join(', ') || 'No data available');

  if (!data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="card p-6" role="img" aria-label={ariaDescription}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks by Status</h3>
        <EmptyChart message="No tasks to display" />
      </div>
    );
  }

  return (
    <div className="card p-6" role="img" aria-label={ariaDescription}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks by Status</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={100}
            paddingAngle={2}
            dataKey="count"
            nameKey="label"
            label={({ name, percent }) => name + ' ' + (percent * 100).toFixed(0) + '%'}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [value + ' tasks', name]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function StudyTimePerCourseChart({ data }: { data: { courseName: string; minutes: number }[] | undefined }) {
  const ariaDescription = 'Bar chart showing study time in minutes per course this week. ' + (data?.map(d => d.courseName + ': ' + d.minutes + ' minutes').join(', ') || 'No data available');

  if (!data || data.length === 0) {
    return (
      <div className="card p-6" role="img" aria-label={ariaDescription}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Study Time per Course (This Week)</h3>
        <EmptyChart message="No study sessions this week" />
      </div>
    );
  }

  return (
    <div className="card p-6" role="img" aria-label={ariaDescription}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Study Time per Course (This Week)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="courseName" type="category" width={120} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [value + ' min', 'Study Time']}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey="minutes" fill="#f59e0b" radius={[4, 0, 0, 4]} width={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function UpcomingDeadlines({ tasks }: { tasks: { _id: string; title: string; type: string; priority: string; dueDate: string }[] | undefined }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h3>
        <EmptyChart message="No upcoming deadlines" />
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h3>
      <div className="space-y-3" role="list" aria-label="Upcoming deadlines">
        {tasks.slice(0, 5).map((task) => (
          <div
            key={task._id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            role="listitem"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getPriorityBadgeVariant(task.priority)}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
                <Badge variant={getTypeBadgeVariant(task.type)}>
                  {task.type}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {formatRelativeTime(task.dueDate)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksCompletedSelector({ data, isLoading, error, onDaysChange }: { data: { date: string; count: number }[] | undefined; isLoading: boolean; error: unknown; onDaysChange: (days: number) => void }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tasks Completed</h3>
        <Select
          value={7}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          options={[
            { value: '7', label: 'Last 7 Days' },
            { value: '30', label: 'Last 30 Days' },
          ]}
          className="w-40"
        />
      </div>
      <TasksCompletedChart data={data} isLoading={isLoading} error={error} />
    </div>
  );
}

export default function Dashboard() {
  const [completedDays, setCompletedDays] = useState(7);
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getSummary,
  });
  const { data: completedData, isLoading: completedLoading, error: completedError } = useQuery({
    queryKey: ['tasksCompleted', completedDays],
    queryFn: () => statsApi.getTasksCompletedPerDay(completedDays),
  });
  const { data: statusData } = useQuery({
    queryKey: ['tasksByStatus'],
    queryFn: statsApi.getTasksByStatus,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your progress and upcoming deadlines</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger-600 dark:text-danger-400">Failed to load dashboard</p>
      </div>
    );
  }

  const statsData = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your progress and upcoming deadlines</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Tasks" value={statsData?.totals?.total || 0} color="text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400" />
        <StatCard title="Active" value={statsData?.totals?.active || 0} color="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard title="Completed" value={statsData?.totals?.completed || 0} color="text-success-600 bg-success-100 dark:bg-success-900/30 dark:text-success-400" />
        <StatCard title="Overdue" value={statsData?.totals?.overdue || 0} color="text-danger-600 bg-danger-100 dark:bg-danger-900/30 dark:text-danger-400" />
        <StatCard title="Due Today" value={statsData?.totals?.dueToday || 0} color="text-warning-600 bg-warning-100 dark:bg-warning-900/30 dark:text-warning-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksCompletedSelector
          data={completedData?.data?.tasksCompletedPerDay}
          isLoading={completedLoading}
          error={completedError}
          onDaysChange={(days) => setCompletedDays(Number(days))}
        />
        <TasksByStatusChart data={statusData?.data?.tasksByStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StudyTimePerCourseChart data={statsData?.studyTimePerCourse} />
        <UpcomingDeadlines tasks={statsData?.nextUp} />
      </div>
    </div>
  );
}