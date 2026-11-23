import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { href: '/tasks', label: 'Tasks', icon: 'check-square' },
    { href: '/board', label: 'Board', icon: 'kanban' },
    { href: '/calendar', label: 'Calendar', icon: 'calendar' },
    { href: '/timer', label: 'Timer', icon: 'timer' },
    { href: '/courses', label: 'Courses', icon: 'graduation-cap' },
  ];

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        navigation={navigation}
        isActive={isActive}
        onNavigate={() => setSidebarOpen(false)}
        user={user}
        onLogout={logout}
      />

      <div className={cn('lg:pl-64 transition-all duration-200', sidebarOpen && 'lg:pl-64')}>
        <TopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          setTheme={setTheme}
          resolvedTheme={resolvedTheme}
        />

        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        <MobileBottomNav
          navigation={navigation}
          isActive={isActive}
          onNavigate={(href) => navigate(href)}
        />
      </div>
    </div>
  );
}