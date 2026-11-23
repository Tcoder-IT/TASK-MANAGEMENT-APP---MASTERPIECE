import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/api/endpoints';
import { getTypeColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sun } from 'lucide-react';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

export default function Calendar() {
  const { data } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.list({})
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const tasks = data?.data?.data || [];
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksByDate = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const goToToday = () => setCurrentMonth(new Date());
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">View your deadlines and schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="btn-secondary">Today</button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[100px] p-2 border-r border-b border-gray-200 dark:border-gray-700',
                  !isCurrentMonth && 'bg-gray-50 dark:bg-gray-900/50',
                  isTodayDay && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <div className={cn('text-sm font-medium mb-1', isTodayDay ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white')}>
                  {format(day, 'd')}
                  {isTodayDay && <Sun className="ml-1 h-3 w-3 inline" />}
                </div>
                <div className="space-y-1 max-h-[80px] overflow-y-auto">
                  {dayTasks.slice(0, 3).map((task: any) => (
                    <div
                      key={task._id}
                      className={cn(
                        'text-xs p-1.5 rounded truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                        getTypeColor(task.type)
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}