import { clsx, type ClassValue } from 'clsx';
import axios from 'axios';
import type { ApiError } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (message) return message;
  }

  return error instanceof Error ? error.message : fallback;
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: options?.year === 'numeric' ? 'numeric' : undefined,
    ...options
  });
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = then.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return formatDate(then);
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'text-danger-600 bg-danger-100 dark:bg-danger-900/30 dark:text-danger-300';
    case 'high': return 'text-warning-600 bg-warning-100 dark:bg-warning-900/30 dark:text-warning-300';
    case 'medium': return 'text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300';
    case 'low': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'done': return 'text-success-600 bg-success-100 dark:bg-success-900/30 dark:text-success-300';
    case 'in_progress': return 'text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300';
    case 'todo': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function getTypeColor(type: string) {
  switch (type) {
    case 'exam': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
    case 'project': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
    case 'assignment': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'lab': return 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300';
    case 'personal': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function getTypeIcon(type: string) {
  switch (type) {
    case 'exam': return 'graduation-cap';
    case 'project': return 'folder-kanban';
    case 'assignment': return 'file-text';
    case 'lab': return 'flask-conical';
    case 'personal': return 'user';
    default: return 'file-text';
  }
}