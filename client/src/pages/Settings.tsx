import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { toast } from 'sonner';
import { User, Bell, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Settings() {
  useAuth(); // For auth context initialization
  useTheme(); // For theme context initialization
  const [activeTab, setActiveTab] = useState<'profile'|'notifications'|'security'|'danger'>('profile');

  const tabs = [{id:'profile',label:'Profile',icon:User},{id:'notifications',label:'Notifications',icon:Bell},{id:'security',label:'Security',icon:Shield},{id:'danger',label:'Danger Zone',icon:Trash2}];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 p-1" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
              <p className="text-gray-600 dark:text-gray-400">Profile settings coming soon</p>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notifications</h2>
              <p className="text-gray-600 dark:text-gray-400">Notification settings coming soon</p>
            </div>
          )}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security</h2>
              <p className="text-gray-600 dark:text-gray-400">Security settings coming soon</p>
            </div>
          )}
          {activeTab === 'danger' && (
            <div className="space-y-4 border-t border-danger-200 dark:border-danger-800 pt-6">
              <h2 className="text-lg font-semibold text-danger-600 dark:text-danger-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Danger Zone
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="danger" onClick={() => { if(confirm('Are you absolutely sure?')) { /* deleteAccount() */ toast.success('Account deletion not yet implemented') } }}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}