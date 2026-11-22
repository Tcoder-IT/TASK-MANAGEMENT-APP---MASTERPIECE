import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../../api/endpoints';
import { formatRelativeTime, getPriorityColor, getStatusColor, getTypeColor } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { Plus, Check, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Tasks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.list({})
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (error) {
    return <div className="text-center py-8 text-danger-600">Failed to load tasks</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your assignments and deadlines</p>
        </div>
        <Link to="/tasks/new" className="btn-primary">
          <span className="mr-2">+</span> New Task
        </Link>
      </div>

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
              {data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No tasks found. Create your first task!
                  </td>
                </tr>
              ) : (
                data?.data?.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
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
                      <span className={cn(
                        'font-mono text-sm',
                        new Date(task.dueDate) < new Date() && task.status !== 'done'
                          ? 'text-danger-600 dark:text-danger-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}>
                        {formatRelativeTime(task.dueDate)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                          aria-label={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-danger-600 dark:hover:bg-gray-800"
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
    </div>
  );
}