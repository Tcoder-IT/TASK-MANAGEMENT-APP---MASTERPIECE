import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80).trim(),
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8).max(128)
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128)
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80).trim().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    defaultView: z.enum(['list', 'board']).optional(),
    remindersEnabled: z.boolean().optional(),
    reminderOffsets: z.array(z.number().int().min(1).max(10080)).max(10).optional(),
  }),
});