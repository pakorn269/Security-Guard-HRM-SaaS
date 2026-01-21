import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Palmtree,
} from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav, { type BottomNavItem } from './BottomNav';

/**
 * Admin Dashboard Layout
 *
 * Specifications (Part 4):
 * - Sidebar: Fixed, 240px width (expanded), 64px (collapsed/icon-only)
 * - Header: Fixed, 56px height
 * - Content area: Scrollable, max-width 1280px, centered
 * - Page padding: 32px (desktop), 16px (mobile)
 * - Breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px)
 */
export default function DashboardLayout() {
  const { t } = useTranslation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileNav, setIsMobileNav] = useState(false); // For bottom nav (< 768px)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Bottom navigation items for mobile
  const bottomNavItems: BottomNavItem[] = [
    { path: '/', label: t('navigation.dashboard', 'แดชบอร์ด'), icon: LayoutDashboard },
    { path: '/employees', label: t('navigation.employees', 'พนักงาน'), icon: Users },
    { path: '/attendance', label: t('navigation.attendance', 'ลงเวลา'), icon: Clock },
    { path: '/schedule', label: t('navigation.schedule', 'ตารางเวร'), icon: Calendar },
    { path: '/leave', label: t('navigation.leave', 'ลา'), icon: Palmtree },
  ];

  // Handle responsive behavior
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 1024;
      const mobileNav = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsMobileNav(mobileNav);

      // Auto-collapse sidebar on tablet, auto-expand on desktop
      if (window.innerWidth >= 1024) {
        // Keep user preference on desktop
      } else if (window.innerWidth >= 768) {
        // Collapse on tablet
        setSidebarExpanded(false);
      }

      // Close mobile menu when switching to desktop
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => !prev);
  }, []);

  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Calculate sidebar width for content offset
  const sidebarWidth = isMobile ? 0 : sidebarExpanded ? 240 : 64;

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Mobile overlay */}
      {mobileMenuOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isExpanded={isMobile ? mobileMenuOpen : sidebarExpanded}
        onToggle={toggleSidebar}
        isMobile={isMobile}
        onClose={closeMobileMenu}
      />

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header - 56px height */}
        <Header
          onMenuClick={openMobileMenu}
          showMenuButton={isMobile}
          title={t('app.name')}
          showSearch={!isMobile}
        />

        {/* Page content - scrollable */}
        <main className={`flex-1 overflow-auto ${isMobileNav ? 'pb-16' : ''}`}>
          {/* Content container with max-width and centered */}
          <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom navigation - only on screens < 768px */}
        {isMobileNav && (
          <BottomNav items={bottomNavItems} />
        )}
      </div>
    </div>
  );
}
