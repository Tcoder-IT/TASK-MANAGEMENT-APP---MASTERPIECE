import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Target, Brain, Clock, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

const features = [
  {
    icon: Target,
    title: 'Smart Task Management',
    description: 'Organize assignments, exams, projects, and labs by course with priorities, due dates, and subtasks.'
  },
  {
    icon: Brain,
    title: 'Pomodoro Timer',
    description: 'Built-in focus timer with customizable intervals. Track study sessions per course and build streaks.'
  },
  {
    icon: Clock,
    title: 'Deadline Reminders',
    description: 'Get notified before deadlines via browser push notifications. Never miss a due date again.'
  },
  {
    icon: Zap,
    title: 'Progress Analytics',
    description: 'Visualize completion rates per course, weekly study charts, and upcoming deadlines at a glance.'
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-950 dark:to-gray-900">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">StudyFlow</span>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Sign in
              </Link>
              <Link
                to="/register"
                className="btn-primary text-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Your Study{' '}
              <span className="text-primary-600 dark:text-primary-400">Command Center</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Organize assignments, track deadlines, and boost productivity with a beautiful planner built for students.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-3">
                Start Free
              </Link>
              <Link to="/login" className="btn-secondary text-base px-8 py-3">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}