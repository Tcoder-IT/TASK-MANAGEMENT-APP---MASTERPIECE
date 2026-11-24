import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { courseApi } from '../../api/endpoints';
import { useQuery } from '@tanstack/react-query';
import type { Course } from '../../types';

const filterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'active']).optional().or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().or(z.literal('')),
  type: z.enum(['assignment', 'exam', 'project', 'lab', 'personal']).optional().or(z.literal('')),
  course: z.string().optional(),
  tag: z.string().optional(),
  dueWindow: z.enum(['overdue', 'today', 'week']).optional().or(z.literal('')),
  sort: z.enum(['dueDate', 'createdAt', 'priority', 'order']).default('dueDate'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  archived: z.boolean().default(false),
});

type FilterFormData = z.infer<typeof filterSchema>;
export type { FilterFormData };

interface TaskFiltersProps {
  onFilterChange: (filters: Partial<FilterFormData>) => void;
  initialFilters?: Partial<FilterFormData>;
  totalTasks?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'lab', label: 'Lab' },
  { value: 'personal', label: 'Personal' },
];

const dueWindowOptions = [
  { value: '', label: 'All Dates' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due Today' },
  { value: 'week', label: 'This Week' },
];

const sortOptions = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'createdAt', label: 'Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'order', label: 'Manual Order' },
];

const orderOptions = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

const limitOptions = [
  { value: 10, label: '10 per page' },
  { value: 20, label: '20 per page' },
  { value: 50, label: '50 per page' },
];

export function TaskFilters({
  onFilterChange,
  initialFilters = {},
  totalTasks = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: TaskFiltersProps) {
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => courseApi.list() });

  const courseOptions = useMemo(() => [
    { value: '', label: 'All Courses' },
    { value: 'null', label: 'No Course' },
    ...(courses?.data.data?.map((c: Course) => ({ value: c._id, label: `${c.code ? `${c.code} - ` : ''}${c.name}` })) || []),
  ], [courses?.data.data]);

  const form = useForm<FilterFormData>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: '',
      status: '',
      priority: '',
      type: '',
      course: '',
      tag: '',
      dueWindow: '',
      sort: 'dueDate',
      order: 'asc',
      page: currentPage,
      limit: 20,
      archived: false,
      ...initialFilters,
    },
    mode: 'onChange',
  });

  const { watch } = form;
  const hasActiveFilters = Object.entries(watch()).some(([key, value]) => {
    if (key === 'sort' || key === 'order' || key === 'page' || key === 'limit') return false;
    return value !== '' && value !== false && value !== undefined;
  });

  const handleSubmit = (data: Partial<FilterFormData>) => {
    onFilterChange(data);
  };

  const clearFilters = () => {
    form.reset({
      search: '',
      status: '',
      priority: '',
      type: '',
      course: '',
      tag: '',
      dueWindow: '',
      sort: 'dueDate',
      order: 'asc',
      page: 1,
      limit: 20,
      archived: false,
    });
    onFilterChange({
      search: '',
      status: '',
      priority: '',
      type: '',
      course: '',
      tag: '',
      dueWindow: '',
      sort: 'dueDate',
      order: 'asc',
      page: 1,
      limit: 20,
      archived: false,
    });
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Input
          {...form.register('search')}
          label="Search"
          placeholder="Search tasks..."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            {...form.register('status')}
            label="Status"
            options={statusOptions}
            placeholder="All Status"
          />

          <Select
            {...form.register('priority')}
            label="Priority"
            options={priorityOptions}
            placeholder="All Priorities"
          />

          <Select
            {...form.register('type')}
            label="Type"
            options={typeOptions}
            placeholder="All Types"
          />

          <Select
            {...form.register('course')}
            label="Course"
            options={courseOptions}
            placeholder="All Courses"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            {...form.register('dueWindow')}
            label="Due Window"
            options={dueWindowOptions}
            placeholder="All Dates"
          />

          <Select
            {...form.register('sort')}
            label="Sort By"
            options={sortOptions}
          />

          <Select
            {...form.register('order')}
            label="Order"
            options={orderOptions}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Select
              {...form.register('limit')}
              options={limitOptions.map(o => ({ value: String(o.value), label: o.label }))}
              className="w-auto"
            />
            {totalTasks > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * form.watch('limit')) + 1} to {Math.min(currentPage * form.watch('limit'), totalTasks)} of {totalTasks}
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronDown className="h-4 w-4 rotate-180" />
              </Button>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}