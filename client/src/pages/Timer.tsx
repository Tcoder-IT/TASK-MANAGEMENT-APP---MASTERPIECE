import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sessionApi, taskApi, courseApi } from '@/api/endpoints';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

const PRESETS = [
  { label: 'Pomodoro', work: 25, break: 5 },
  { label: 'Short Break', work: 5, break: 1 },
  { label: 'Long Break', work: 15, break: 5 },
  { label: 'Deep Work', work: 50, break: 10 },
];

export default function Timer() {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.list({ limit: 100 }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list(),
  });

  const tasks = tasksData?.data?.data || [];
  const courses = coursesData?.data || [];

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (mode === 'work') {
      setMode('break');
      setTimeLeft(breakDuration * 60);
      if (selectedTask || selectedCourse) {
        sessionApi.create({
          task: selectedTask || null,
          course: selectedCourse || null,
          durationMin: workDuration,
        });
      }
    } else {
      setMode('work');
      setTimeLeft(workDuration * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(workDuration * 60);
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
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold text-gray-900 dark:text-white font-mono">
            {formatTime(timeLeft)}
          </div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{mode === 'work' ? 'Focus on your task' : 'Take a break'}</p>
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
                  {tasks.map((task: any) => (
                    <option key={task._id} value={task._id}>{task.title}</option>
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
                  {courses.map((course: any) => (
                    <option key={course._id} value={course._id}>{course.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={resetTimer}
            className="btn-secondary"
          >
            <RotateCcw className="mr-2 h-5 w-5" /> Reset
          </button>
          <button
            onClick={toggleTimer}
            className="btn-primary px-8 py-3 text-lg"
          >
            {isRunning ? (
              <> <Pause className="mr-2 h-5 w-5" /> Pause </>
            ) : (
              <> <Play className="mr-2 h-5 w-5" /> Start </>
            )}
          </button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setWorkDuration(preset.work);
                setBreakDuration(preset.break);
                resetTimer();
              }}
              className="btn-secondary text-sm py-2"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}