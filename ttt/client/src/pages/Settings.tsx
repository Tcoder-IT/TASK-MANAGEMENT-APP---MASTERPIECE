import { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../features/theme/ThemeContext';
import { authApi } from '../../api/endpoints';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { User, Bell, Moon, Sun, Monitor, Key, Trash2, Shield } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'danger'>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 p-1" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                  <input className="input" defaultValue={user?.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Theme</label>
                  <div className="flex gap-2">
                    {['light', 'dark', 'system'].map((t) => (
                      <button key={t} type="button" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors">
                        <span className="capitalize">{t}</span>
                        <input type="radio" name="theme" value={t} className="sr-only" defaultChecked={theme === t} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default View</label>
                  <select className="input" defaultValue="list">
                    <option value="list">List</option>
                    <option value="board">Board</option>
                  </select>
                </div>
                <button className="btn-primary">Save Changes</button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive browser notifications for upcoming deadlines</p>
                  </div>
                  <input type="checkbox" checked={true} className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive email reminders for upcoming deadlines</p>
                  </div>
                  <input type="checkbox" checked={false} className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.target as HTMLFormElement; const data = { currentPassword: form.currentPassword.value, newPassword: form.newPassword.value }; try { await authApi.changePassword(data); toast.success('Password changed. Please log in again.'); } catch (error) { toast.error('Failed to change password'); } }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                  <input name="currentPassword" type="password" className="input" placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                  <input name="newPassword" type="password" className="input" placeholder="••••••••" required />
                </div>
              </div>
              <button type="submit" className="btn-primary">Change Password</button>
            </form>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6 border-t border-danger-200 dark:border-danger-800 pt-6">
              <h2 className="text-lg font-semibold text-danger-600 dark:text-danger-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button onClick={async () => { try { await authApi.deleteAccount(); toast.success('Account deleted'); } catch (error) { toast.error('Failed to delete account'); } }} className="btn-danger">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}