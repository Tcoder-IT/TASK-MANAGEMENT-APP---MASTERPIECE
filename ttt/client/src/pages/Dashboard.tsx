import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../../api/endpoints';
import { formatRelativeTime, getPriorityColor } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { Target, CheckCircle, AlertTriangle, Clock, TrendingUp, BookOpen, Flame, Award } from 'lucide-react';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getSummary
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
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

  const stats = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your progress and upcoming deadlines</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Tasks" value={stats?.totals?.total || 0} color="text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400" />
        <StatCard title="Active" value={stats?.totals?.active || 0} color="text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard title="Completed" value={stats?.totals?.completed || 0} color="text-success-600 bg-success-100 dark:bg-success-900/30 dark:text-success-400" />
        <StatCard title="Overdue" value={stats?.totals?.overdue || 0} color="text-danger-600 bg-danger-100 dark:bg-danger-900/30 dark:text-danger-400" />
        <StatCard title="Due Today" value={stats?.totals?.dueToday || 0} color="text-warning-600 bg-warning-100 dark:bg-warning-900/30 dark:text-warning-400" />
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="card p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}