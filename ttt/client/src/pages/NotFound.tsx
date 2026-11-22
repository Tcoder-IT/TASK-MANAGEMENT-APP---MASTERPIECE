import { Link } from 'react-router-dom';
import { Home, Search, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-danger-100 dark:bg-danger-900/30 mb-6">
          <AlertCircle className="h-10 w-10 text-danger-600 dark:text-danger-400" aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-6">Page not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <span className="mr-2">←</span> Go Back
          </button>
          <Link to="/" className="btn-primary">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}