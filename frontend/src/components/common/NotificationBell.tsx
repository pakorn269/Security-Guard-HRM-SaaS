
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationBell() {
    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        loading
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
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
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
                className="relative p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                aria-label="Notifications"
            >
                {/* Bell Icon SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-surface-600 dark:text-surface-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-white dark:border-surface-800">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-surface-800 rounded-xl shadow-xl overflow-hidden z-50 border border-surface-200 dark:border-surface-700 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
                        <h3 className="font-semibold text-surface-800 dark:text-surface-200">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-surface-500">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-surface-500 flex flex-col items-center">
                                <span className="text-4xl mb-2 opacity-50">🔕</span>
                                <p>No notifications</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-surface-100 dark:divide-surface-700">
                                {notifications.map(notification => (
                                    <li
                                        key={notification.id}
                                        className={`hover:bg-surface-50 dark:hover:bg-surface-750 transition-colors cursor-pointer ${!notification.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                                            }`}
                                        onClick={() => handleNotificationClick(notification.id)}
                                    >
                                        <div className="px-4 py-3 flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {/* Icon based on type */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBgColor(notification.type)
                                                    }`}>
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-surface-900 dark:text-white' : 'text-surface-700 dark:text-surface-300'
                                                    }`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-surface-500 dark:text-surface-400 line-clamp-2 mt-0.5 break-words">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-surface-400 mt-1">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <div className="flex-shrink-0 self-center">
                                                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
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

function getIconBgColor(type: string) {
    if (type.includes('shift')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    if (type.includes('leave')) {
        if (type.includes('approved')) return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        if (type.includes('rejected')) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    }
    if (type.includes('late') || type.includes('no_show')) return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400';
}

function getNotificationIcon(type: string) {
    // Return emoji for simplicity
    if (type.includes('shift')) return '📅';
    if (type.includes('leave')) return '🏖️';
    if (type.includes('attendance')) return '⏰';
    return '🔔';
}
