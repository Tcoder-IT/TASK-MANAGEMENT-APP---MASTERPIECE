import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionApi, taskApi, courseApi } from '@/api/endpoints';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [
  { label: 'Pomodoro', work: 25, break: 5 },
  { label: 'Short Break', work: 5, break: 1 },
  { label: 'Long Break', work: 15, break: 5 },
  { label: 'Deep Work', work: 50, break: 10 },
];

interface SessionFormData {
  workDuration: number;
  breakDuration: number;
}

export default function Timer() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState<SessionFormData>({ workDuration: 25, breakDuration: 5 });

  const queryClient = useQueryClient();

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.list({ limit: 100 }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list(),
  });

  const tasks = tasksData?.data.data || [];
  const courses = coursesData?.data.data || [];

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    if (mode === 'work') {
      setMode('break');
      setTimeLeft(breakDuration * 60);
      if (selectedTask || selectedCourse) {
        sessionApi
          .create({
            task: selectedTask || null,
            course: selectedCourse || null,
            durationMin: workDuration,
          })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Session logged');
          })
          .catch(() => {
            toast.error('Failed to log session');
          });
      }
    } else {
      setMode('work');
      setTimeLeft(workDuration * 60);
    }
  }, [mode, breakDuration, workDuration, selectedTask, selectedCourse, queryClient]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, handleTimerComplete]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const toggleTimer = () => setIsRunning((running) => !running);

  const resetTimer = () => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(workDuration * 60);
  };

  const openSettings = () => {
    setForm({ workDuration, breakDuration });
    setShowSettings(true);
  };

  const applyPreset = (work: number, rest: number) => {
    setIsRunning(false);
    setMode('work');
    setWorkDuration(work);
    setBreakDuration(rest);
    setForm({ workDuration: work, breakDuration: rest });
    setTimeLeft(work * 60);
  };

  const handleSettingsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const safeWork = Math.max(1, Math.min(120, Number(form.workDuration) || 25));
    const safeBreak = Math.max(1, Math.min(60, Number(form.breakDuration) || 5));
    setWorkDuration(safeWork);
    setBreakDuration(safeBreak);
    setForm({ workDuration: safeWork, breakDuration: safeBreak });
    setIsRunning(false);
    setMode('work');
    setTimeLeft(safeWork * 60);
    setShowSettings(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pomodoro Timer</h1>
        <p className="text-gray-600 dark:text-gray-400">Focus timer with session tracking</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'work' ? 'Focus Time' : 'Break Time'}
          </h2>
          <button
            type="button"
            onClick={openSettings}
            aria-label="Timer settings"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold text-gray-900 dark:text-white">
            {formatTime(timeLeft)}
          </div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {mode === 'work' ? 'Focus on your task' : 'Take a break'}
          </p>
        </div>

        {mode === 'work' && (tasks.length > 0 || courses.length > 0) && (
          <div className="mb-6 space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Link Session</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Task (optional)
                </label>
                <select
                  value={selectedTask || ''}
                  onChange={(e) => setSelectedTask(e.target.value || null)}
                  className="input"
                >
                  <option value="">No task selected</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Course (optional)
                </label>
                <select
                  value={selectedCourse || ''}
                  onChange={(e) => setSelectedCourse(e.target.value || null)}
                  className="input"
                >
                  <option value="">No course selected</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={resetTimer} className="btn-secondary">
            <RotateCcw className="mr-2 h-5 w-5" /> Reset
          </button>
          <button type="button" onClick={toggleTimer} className="btn-primary px-8 py-3 text-lg">
            {isRunning ? (
              <>
                <Pause className="mr-2 h-5 w-5" /> Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" /> Start
              </>
            )}
          </button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.work, preset.break)}
              className="btn-secondary text-sm py-2"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
              Session Settings
            </h3>
            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={form.workDuration}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, workDuration: Number(e.target.value) }))
                  }
                  className="input w-full py-2 px-3 rounded border dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Break Duration (minutes)
                </label>
                <input
                  type="number"
                  value={form.breakDuration}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, breakDuration: Number(e.target.value) }))
                  }
                  className="input w-full py-2 px-3 rounded border dark:bg-gray-700 dark:text-white"
                  min="1"
                  max="60"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="btn-ghost px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-2 text-sm">
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
