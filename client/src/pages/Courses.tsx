import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, taskApi } from '@/api/endpoints';
import { Edit, Trash2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Course, CreateCourseData } from '@/types';

const COLOR_PRESETS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#14b8a6', '#f97316', '#ec4899', '#64748b',
];

export default function Courses() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateCourseData) => courseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Course created');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to create course';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCourseData> }) =>
      courseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Course updated');
      setShowModal(false);
      setEditingCourse(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update course';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Course deleted');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to delete course';
      toast.error(message);
    },
  });

  const openCreateModal = () => {
    setShowModal(true);
    setEditingCourse(null);
    setModalMode('create');
  };

  const openEditModal = (course: Course) => {
    setShowModal(true);
    setEditingCourse(course);
    setModalMode('edit');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setActionLoading(null);
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list(),
  });

  const courses = data?.data.data || [];

  if (isLoading && !data) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  if (error) {
    return <div className="text-center py-8 text-danger-600">Failed to load courses</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="text-gray-600 dark:text-gray-400">Organize your subjects</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <span className="mr-2">+</span> New Course
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400">Course</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Name</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Code</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Color</th>
                <th className="text-left p-4 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Tasks</th>
                <th className="text-right p-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No courses yet
                  </td>
                </tr>
              ) : (
                courses.map((course: Course) => (
                  <tr key={course._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: course.color }}
                        >
                          {course.code?.slice(0, 3).toUpperCase() || course.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{course.name}</h3>
                          {course.code && <p className="text-sm text-gray-500 dark:text-gray-400">{course.code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">{course.name}</td>
                    <td className="p-4 hidden lg:table-cell">{course.code || ''}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <span style={{ backgroundColor: course.color }} className="inline-block w-6 h-6 rounded border" />
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        <TaskCount courseId={course._id} />
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(course)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-800"
                          aria-label="Edit course"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(course._id, course.name)}
                          disabled={actionLoading === course._id}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-danger-600 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Delete course"
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

      {courses.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first course to organize your tasks</p>
          <button onClick={openCreateModal} className="btn-primary">
            <span className="mr-2">+</span> Create Course
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {modalMode === 'create' ? 'New Course' : 'Edit Course'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nameInput = document.getElementById('course-name') as HTMLInputElement | null;
                const codeInput = document.getElementById('course-code') as HTMLInputElement | null;
                const colorInput = document.getElementById('course-color') as HTMLInputElement | null;
                if (!nameInput || !colorInput) return;
                if (modalMode === 'edit' && editingCourse) {
                  updateMutation.mutate({ id: editingCourse._id, data: { name: nameInput.value, code: codeInput?.value || undefined, color: colorInput.value } });
                } else {
                  createMutation.mutate({ name: nameInput.value, code: codeInput?.value || undefined, color: colorInput.value });
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <Input
                  id="course-name"
                  value={editingCourse?.name ?? ''}
                  placeholder="Course name"
                  required
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code (optional)</label>
                <Input
                  id="course-code"
                  value={editingCourse?.code ?? ''}
                  placeholder="CS101"
                  className="input"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        const colorInput = document.getElementById('course-color') as HTMLInputElement | null;
                        if (colorInput) colorInput.value = color;
                      }}
                      ref={(element) => {
                        if (element) element.style.backgroundColor = color;
                      }}
                      className="w-8 h-8 rounded-lg border-2 cursor-pointer transition-transform hover:scale-110"
                      aria-label={"Select color " + color}
                    />
                  ))}
                  <input
                    id="course-color"
                    type="color"
                    value={editingCourse?.color ?? '#6366f1'}
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                    aria-label="Custom color picker"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={createMutation.isPending || updateMutation.isPending} className="flex-1">
                  {modalMode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingCourse(null); }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCount({ courseId }: { courseId: string }) {
  const { data } = useQuery({
    queryKey: ['task-count', courseId],
    queryFn: async () => {
      const res = await taskApi.list({ course: courseId, limit: 1 });
      return res.data?.meta.total ?? 0;
    },
  });
  return data ?? 0;
}
