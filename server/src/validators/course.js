import { z } from 'zod';

export const createCourseSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80).trim(),
    code: z.string().max(20).trim().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

export const updateCourseSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80).trim().optional(),
    code: z.string().max(20).trim().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});

export const courseIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  }),
});