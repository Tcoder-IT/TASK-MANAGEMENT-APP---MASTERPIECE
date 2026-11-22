import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi } from '../../api/endpoints';
import { cn } from '../../lib/utils';
import { Plus, Edit, Trash2, Palette } from 'lucide-react';
import { useState } from 'react';

export default function Courses() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list()
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; color?: string }) => courseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowCreate(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] })
  });

  if (isLoading) {
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
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <span className="mr-2">+</span> New Course
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">New Course</h2>
            <form onSubmit={(e) => { e.preventDefault(); const form = e.target as HTMLFormElement; const data = { name: form.name.value, code: form.code.value || '', color: form.color.value }; createMutation.mutate(data); }} className="space-y-4">
              <input name="name" className="input" placeholder="Course name" required />
              <input name="code" className="input" placeholder="Code (optional)" />
              <input name="color" type="color" className="h-10 w-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" defaultValue="#6366f1" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.data?.map((course) => (
          <div key={course._id} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
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
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(course._id)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-danger-600 dark:hover:bg-gray-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data?.data?.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first course to organize your tasks</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <span className="mr-2">+</span> Create Course
          </button>
        </div>
      )}
    </div>
  );
}