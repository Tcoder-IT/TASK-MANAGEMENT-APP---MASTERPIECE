import { z } from 'zod';

const taskTypeEnum = ['assignment', 'exam', 'project', 'lab', 'personal'];
const taskStatusEnum = ['todo', 'in_progress', 'done'];
const taskPriorityEnum = ['low', 'medium', 'high', 'urgent'];

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(120).trim(),
    description: z.string().max(2000).optional(),
    type: z.enum(taskTypeEnum).default('assignment'),
    status: z.enum(taskStatusEnum).default('todo'),
    priority: z.enum(taskPriorityEnum).default('medium'),
    dueDate: z.coerce.date(),
    course: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    subtasks: z.array(z.object({
      title: z.string().min(1).max(200).trim(),
      done: z.boolean().default(false),
    })).optional(),
    reminders: z.array(z.number().int().min(1).max(10080)).max(10).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(120).trim().optional(),
    description: z.string().max(2000).optional(),
    type: z.enum(taskTypeEnum).optional(),
    status: z.enum(taskStatusEnum).optional(),
    priority: z.enum(taskPriorityEnum).optional(),
    dueDate: z.coerce.date().optional(),
    course: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    subtasks: z.array(z.object({
      title: z.string().min(1).max(200).trim(),
      done: z.boolean().default(false),
    })).optional(),
    reminders: z.array(z.number().int().min(1).max(10080)).max(10).optional(),
    order: z.number().int().optional(),
    archived: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const reorderTasksSchema = z.object({
  body: z.object({
    taskIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
  }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    taskId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    targetStatus: z.enum(['todo', 'in_progress', 'done']),
    targetIndex: z.number().int().min(0),
  }),
});

export const quickAddTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(120).trim(),
  }),
});

export const listTasksQuerySchema = z.object({
  query: z.object({
    status: z.enum([...taskStatusEnum, 'active']).optional(),
    priority: z.enum(taskPriorityEnum).optional(),
    type: z.enum(taskTypeEnum).optional(),
    course: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    tag: z.string().optional(),
    dueWindow: z.enum(['overdue', 'today', 'week']).optional(),
    search: z.string().optional(),
    sort: z.enum(['dueDate', 'createdAt', 'priority', 'order']).default('dueDate'),
    order: z.enum(['asc', 'desc']).default('asc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    archived: z.coerce.boolean().default(false),
  }),
});