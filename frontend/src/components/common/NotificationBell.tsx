import { useState, useRef, useEffect } from 'react';
import { Bell, Calendar, CalendarOff, Clock, BellOff, Loader2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    loading,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Refresh on open
      fetchNotifications(1);
    }
  };

  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={20} className="text-neutral-600 dark:text-neutral-400" />

        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold leading-none text-white bg-error-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-md shadow-lg overflow-hidden z-50 border border-neutral-200 dark:border-neutral-800 animate-scale-in origin-top-right">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 flex flex-col items-center">
                <BellOff size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-primary-50/50 dark:bg-primary-950/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="px-4 py-3 flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconStyles(notification.type)}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            !notification.isRead
                              ? 'text-neutral-900 dark:text-white'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 self-center">
                          <div className="w-2 h-2 bg-primary-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getIconStyles(type: string): string {
  if (type.includes('shift')) {
    return 'bg-info-100 text-info-600 dark:bg-info-900/30 dark:text-info-400';
  }
  if (type.includes('leave')) {
    if (type.includes('approved')) {
      return 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400';
    }
    if (type.includes('rejected')) {
      return 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400';
    }
    return 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400';
  }
  if (type.includes('late') || type.includes('no_show')) {
    return 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400';
  }
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
}

function getNotificationIcon(type: string) {
  const iconProps = { size: 16 };

  if (type.includes('shift')) {
    return <Calendar {...iconProps} />;
  }
  if (type.includes('leave')) {
    return <CalendarOff {...iconProps} />;
  }
  if (type.includes('attendance') || type.includes('late') || type.includes('no_show')) {
    return <Clock {...iconProps} />;
  }
  return <Bell {...iconProps} />;
}
