import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';
import { cn, getApiErrorMessage } from '../../lib/utils';
import { courseApi } from '../../api/endpoints';
import { useQuery } from '@tanstack/react-query';
import type { Task } from '../../types';

const taskTypeEnum = ['assignment', 'exam', 'project', 'lab', 'personal'] as const;
const taskStatusEnum = ['todo', 'in_progress', 'done'] as const;
const taskPriorityEnum = ['low', 'medium', 'high', 'urgent'] as const;

const subtaskSchema = z.object({
  title: z.string().min(1).max(200),
  done: z.boolean().default(false),
});

const taskSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  type: z.enum(taskTypeEnum).default('assignment'),
  status: z.enum(taskStatusEnum).default('todo'),
  priority: z.enum(taskPriorityEnum).default('medium'),
  dueDate: z.string().min(1, 'Due date is required'),
  course: z.string().nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  subtasks: z.array(subtaskSchema).optional(),
  reminders: z.array(z.number().int().min(1).max(10080)).max(10).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialData?: Task | null;
  loading?: boolean;
}

const typeOptions = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'lab', label: 'Lab' },
  { value: 'personal', label: 'Personal' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const reminderOptions = [
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 4320, label: '3 days before' },
  { value: 10080, label: '1 week before' },
];
export function TaskDrawer({ isOpen, onClose, onSubmit, initialData, loading }: TaskDrawerProps) {
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => courseApi.list() });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo<TaskFormData>(() => ({
    title: '',
    description: '',
    type: 'assignment',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    course: null,
    tags: [],
    subtasks: [],
    reminders: [60, 1440],
  }), []);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    setSubmitError(null);
    if (initialData) {
      form.reset({
        title: initialData.title,
        description: initialData.description,
        type: initialData.type,
        status: initialData.status,
        priority: initialData.priority,
        dueDate: new Date(initialData.dueDate).toISOString().split('T')[0],
        course: initialData.course || null,
        tags: initialData.tags,
        subtasks: initialData.subtasks.map(s => ({ title: s.title, done: s.done })),
        reminders: initialData.reminders,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [isOpen, initialData, form, defaultValues]);

  const handleSubmit = async (data: TaskFormData) => {
    setSubmitError(null);
    try {
      await onSubmit({ ...data, course: data.course || null });
      onClose();
    } catch (error: unknown) {
      setSubmitError(getApiErrorMessage(error, 'Failed to save task. Please try again.'));
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  const { watch, setValue } = form;
  const subtasks = watch('subtasks') || [];
  const tags = watch('tags') || [];
  const reminders = watch('reminders') || [];

  const addSubtask = () => {
    setValue('subtasks', [...subtasks, { title: '', done: false }], { shouldValidate: true });
  };

  const removeSubtask = (index: number) => {
    setValue('subtasks', subtasks.filter((_, i) => i !== index), { shouldValidate: true });
  };

  const updateSubtask = (index: number, field: 'title' | 'done', value: string | boolean) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], [field]: value };
    setValue('subtasks', updated, { shouldValidate: true });
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setValue('tags', [...tags, trimmed], { shouldValidate: true });
    }
  };

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter(t => t !== tag), { shouldValidate: true });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  const addReminder = (value: number) => {
    if (!reminders.includes(value) && reminders.length < 10) {
      setValue('reminders', [...reminders, value], { shouldValidate: true });
    }
  };

  const removeReminder = (value: number) => {
    setValue('reminders', reminders.filter(r => r !== value), { shouldValidate: true });
  };

  const isEditMode = !!initialData;
return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Task' : 'New Task'}
      description={isEditMode ? 'Update your task details' : 'Create a new task to track your work'}
      size="lg"
      position="right"
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <Input
            {...form.register('title')}
            label="Title"
            placeholder="Enter task title"
            error={form.formState.errors.title?.message}
            required
          />

          <Textarea
            {...form.register('description')}
            label="Description"
            placeholder="Add details (optional)"
            rows={3}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              {...form.register('type')}
              label="Type"
              options={typeOptions}
              placeholder="Select type"
              error={form.formState.errors.type?.message}
            />

            <Select
              {...form.register('status')}
              label="Status"
              options={statusOptions}
              placeholder="Select status"
              error={form.formState.errors.status?.message}
            />

            <Select
              {...form.register('priority')}
              label="Priority"
              options={priorityOptions}
              placeholder="Select priority"
              error={form.formState.errors.priority?.message}
            />
<div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Due Date
              </label>
              <Input
                {...form.register('dueDate')}
                id="dueDate"
                type="date"
                error={form.formState.errors.dueDate?.message}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <Select
              {...form.register('course')}
              label="Course"
              options={[
                { value: '', label: 'No Course' },
                ...(courses?.data.data?.map(c => ({ value: c._id, label: `${c.code ? `${c.code} - ` : ''}${c.name}` })) || []),
              ]}
              placeholder="Select course"
              error={form.formState.errors.course?.message}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tags</label>
            <span className="text-xs text-gray-500 dark:text-gray-400">Max 10</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="primary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <input
              type="text"
              placeholder="Add tag, press Enter"
              className="input px-3 py-1.5 text-sm flex-1 min-w-[120px]"
              onKeyDown={handleTagKeyDown}
              aria-label="Add tag"
            />
          </div>
        </div>
<div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subtasks</label>
            <Button type="button" variant="ghost" size="sm" onClick={addSubtask}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {subtasks.map((subtask, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                <Checkbox
                  checked={subtask.done}
                  onChange={(e) => updateSubtask(index, 'done', e.target.checked)}
                  aria-label={`Subtask ${index + 1}`}
                />
                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                  placeholder="Subtask title"
                  className="input flex-1 py-1.5 text-sm"
                  aria-label={`Subtask ${index + 1} title`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubtask(index)}
                  aria-label={`Remove subtask ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-danger-500" />
                </Button>
              </div>
            ))}
            {subtasks.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No subtasks yet. Add some to break down your task.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reminders</label>
          <div className="flex flex-wrap gap-2">
            {reminderOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (reminders.includes(option.value)) {
                    removeReminder(option.value);
                  } else {
                    addReminder(option.value);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  reminders.includes(option.value)
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEditMode ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
        {submitError && (
          <p className="rounded-lg border border-danger-300 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-950/30 dark:text-danger-300" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </Drawer>
  );
}