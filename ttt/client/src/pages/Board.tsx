import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../../api/endpoints';
import { getStatusColor, getTypeColor, getPriorityColor } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { Plus, Check, Trash2 } from 'lucide-react';

const columns = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' }
];

export default function Board() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.list({})
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (error) {
    return <div className="text-center py-8 text-danger-600">Failed to load board</div>;
  }

  const tasksByStatus = {
    todo: data?.data?.filter(t => t.status === 'todo') || [],
    in_progress: data?.data?.filter(t => t.status === 'in_progress') || [],
    done: data?.data?.filter(t => t.status === 'done') || []
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban Board</h1>
          <p className="text-gray-600 dark:text-gray-400">Visualize your workflow</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.id} className="card flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{column.title}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px]">
              {tasksByStatus[column.id].map((task) => (
                <div
                  key={task._id}
                  className="card p-4 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('badge text-xs', getTypeColor(task.type))}>{task.type}</span>
                        <span className={cn('badge text-xs', getPriorityColor(task.priority))}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </div>
                      {task.dueDate && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 rounded text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}