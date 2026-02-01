/**
 * Notification Preferences Page
 * Allows users to manage email and LINE notification settings
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

interface NotificationPreferences {
  email: {
    request: boolean;
    approval: boolean;
    reminder: boolean;
  };
  line: {
    request: boolean;
    approval: boolean;
    reminder: boolean;
  };
}

export default function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      request: true,
      approval: true,
      reminder: true,
    },
    line: {
      request: true,
      approval: true,
      reminder: true,
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me');
      const userData = response.data.data;

      // Parse email_notifications JSONB from backend
      const emailPrefs = userData.email_notifications || {};
      const linePrefs = userData.line_notifications || {};

      setPreferences({
        email: {
          request: emailPrefs.request !== false,
          approval: emailPrefs.approval !== false,
          reminder: emailPrefs.reminder !== false,
        },
        line: {
          request: linePrefs.request !== false,
          approval: linePrefs.approval !== false,
          reminder: linePrefs.reminder !== false,
        },
      });
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (channel: 'email' | 'line', type: keyof NotificationPreferences['email']) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: !prev[channel][type],
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      await api.patch('/users/me', {
        email_notifications: preferences.email,
        line_notifications: preferences.line,
      });

      setMessage({ type: 'success', text: t('settings.notifications.saved') });

      // Auto-hide success message
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setMessage({ type: 'error', text: t('settings.notifications.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('settings.notifications.title', 'Notification Preferences')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t(
            'settings.notifications.subtitle',
            'Manage how you receive notifications about leave requests and approvals'
          )}
        </p>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center">
            <span className="mr-2">
              {message.type === 'success' ? '✓' : '⚠'}
            </span>
            {message.text}
          </div>
        </div>
      )}

      {/* User Email Info */}
      {user?.email && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center text-blue-800 dark:text-blue-300">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="font-medium">
              {t('settings.notifications.emailAddress', 'Email')}: {user.email}
            </span>
          </div>
        </div>
      )}

      {/* Notification Settings Cards */}
      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('settings.notifications.emailTitle', 'Email Notifications')}
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'settings.notifications.emailDescription',
                'Receive email notifications for important leave events'
              )}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <ToggleItem
              label={t('settings.notifications.newRequest', 'New Leave Requests')}
              description={t(
                'settings.notifications.newRequestDesc',
                'Notify me when someone submits a new leave request (Managers only)'
              )}
              checked={preferences.email.request}
              onChange={() => handleToggle('email', 'request')}
              disabled={user?.role !== 'manager' && user?.role !== 'company_admin'}
            />

            <ToggleItem
              label={t('settings.notifications.approvalStatus', 'Approval Status Changes')}
              description={t(
                'settings.notifications.approvalStatusDesc',
                'Notify me when my leave request is approved or rejected'
              )}
              checked={preferences.email.approval}
              onChange={() => handleToggle('email', 'approval')}
            />

            <ToggleItem
              label={t('settings.notifications.upcomingLeave', 'Upcoming Leave Reminders')}
              description={t(
                'settings.notifications.upcomingLeaveDesc',
                'Send me a reminder the day before my leave starts'
              )}
              checked={preferences.email.reminder}
              onChange={() => handleToggle('email', 'reminder')}
            />
          </div>
        </div>

        {/* LINE Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400 mr-3"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('settings.notifications.lineTitle', 'LINE Notifications')}
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t(
                'settings.notifications.lineDescription',
                'Receive instant notifications via LINE messenger'
              )}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <ToggleItem
              label={t('settings.notifications.newRequest', 'New Leave Requests')}
              description={t(
                'settings.notifications.newRequestDesc',
                'Notify me when someone submits a new leave request (Managers only)'
              )}
              checked={preferences.line.request}
              onChange={() => handleToggle('line', 'request')}
              disabled={user?.role !== 'manager' && user?.role !== 'company_admin'}
            />

            <ToggleItem
              label={t('settings.notifications.approvalStatus', 'Approval Status Changes')}
              description={t(
                'settings.notifications.approvalStatusDesc',
                'Notify me when my leave request is approved or rejected'
              )}
              checked={preferences.line.approval}
              onChange={() => handleToggle('line', 'approval')}
            />

            <ToggleItem
              label={t('settings.notifications.upcomingLeave', 'Upcoming Leave Reminders')}
              description={t(
                'settings.notifications.upcomingLeaveDesc',
                'Send me a reminder the day before my leave starts'
              )}
              checked={preferences.line.reminder}
              onChange={() => handleToggle('line', 'reminder')}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('common.saving', 'Saving...')}
            </span>
          ) : (
            t('common.saveChanges', 'Save Changes')
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Toggle Switch Component
 */
interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleItem({ label, description, checked, onChange, disabled }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
