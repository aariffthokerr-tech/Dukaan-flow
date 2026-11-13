import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { PWAInstallButton } from '../components/common/PWAInstallButton';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  label: string;
  shortLabel: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const SIDEBAR_ITEMS: NavItem[] = [
  {
    label: 'Overview',
    shortLabel: 'Home',
    to: '/dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Products',
    shortLabel: 'Products',
    to: '/dashboard/products',
    icon: Package,
  },
  {
    label: 'Categories',
    shortLabel: 'Categories',
    to: '/dashboard/categories',
    icon: FolderTree,
  },
  {
    label: 'Orders',
    shortLabel: 'Orders',
    to: '/dashboard/orders',
    icon: ClipboardList,
  },
  {
    label: 'Analytics',
    shortLabel: 'Analytics',
    to: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    label: 'Plan & Limits',
    shortLabel: 'Plan',
    to: '/dashboard/plan',
    icon: CreditCard,
  },
  {
    label: 'Storefront',
    shortLabel: 'Store',
    to: '/dashboard/storefront',
    icon: Store,
  },
  {
    label: 'Settings',
    shortLabel: 'Settings',
    to: '/dashboard/settings',
    icon: Settings,
  },
];

const MOBILE_BOTTOM_ITEMS = SIDEBAR_ITEMS.filter((item) =>
  ['/dashboard', '/dashboard/products', '/dashboard/orders', '/dashboard/settings'].includes(
    item.to
  )
);

export const DashboardLayout: React.FC = () => {
  const { profile, shop, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTitle =
    SIDEBAR_ITEMS.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label ?? 'Dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Shop navigation"
        className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-[#111315] text-white border-r border-neutral-800"
      >
        <div className="flex h-16 items-center px-6 border-b border-neutral-800">
          <Link to="/" className="focus-visible:outline-2 focus-visible:outline-emerald-500 rounded">
            <BrandLogo inverted />
          </Link>
        </div>

        <div className="px-5 py-4 border-b border-neutral-800/80">
          <p className="text-xs text-neutral-400">Active Shop</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-white truncate">
            {shop?.name ?? 'Shop Workspace'}
          </p>
          {shop?.slug && (
            <Link
              to={`/store/${shop.slug}`}
              className="mt-0.5 inline-block font-mono text-xs text-emerald-400 hover:text-emerald-300 truncate max-w-full"
            >
              /store/{shop.slug}
            </Link>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {profile?.role === 'super_admin' && (
            <Link
              to="/admin"
              className="mt-2 flex min-h-[42px] items-center gap-3 rounded-lg border border-emerald-700/40 bg-emerald-950/40 px-3 text-sm font-medium text-emerald-300 hover:bg-emerald-900/40"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Super Admin</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-3">
          <PWAInstallButton variant="sidebar" />
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {profile?.full_name ?? 'Shop Owner'}
              </p>
              <p className="text-xs text-neutral-400 truncate">{profile?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Sign out"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/55"
          />
          <aside className="relative z-10 flex w-72 max-w-[82vw] flex-col bg-[#111315] text-white h-full">
            <div className="flex h-14 items-center justify-between px-4 border-b border-neutral-800">
              <BrandLogo inverted />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-300 hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-neutral-800">
              <p className="text-xs text-neutral-400">Active Shop</p>
              <p className="mt-0.5 font-display text-sm font-semibold text-white truncate">
                {shop?.name ?? 'Shop Workspace'}
              </p>
              {shop?.slug && (
                <Link
                  to={`/store/${shop.slug}`}
                  onClick={() => setDrawerOpen(false)}
                  className="mt-0.5 inline-block font-mono text-xs text-emerald-400 hover:text-emerald-300 truncate max-w-full"
                >
                  /store/{shop.slug}
                </Link>
              )}
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {profile?.role === 'super_admin' && (
                <Link
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="mt-2 flex min-h-[44px] items-center gap-3 rounded-lg border border-emerald-700/40 bg-emerald-950/40 px-3 text-sm font-medium text-emerald-300"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Super Admin</span>
                </Link>
              )}
            </nav>

            <div className="p-4 border-t border-neutral-800 space-y-3">
              <PWAInstallButton variant="sidebar" />
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 truncate hidden sm:block">
                {shop?.name ?? 'Workspace'} / {currentTitle}
              </p>
              <h1 className="font-display text-base lg:text-lg font-semibold text-neutral-900 truncate">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/dashboard/settings"
              className="hidden sm:inline-flex min-h-[38px] items-center rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 whitespace-nowrap"
            >
              Shop Settings
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#111315] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          <div className="mx-auto max-w-6xl space-y-5">
            {shop?.status === 'suspended' && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold">
                    This shop is suspended by platform administration.
                  </p>
                  <p className="mt-0.5 text-red-700">
                    {shop.suspension_reason
                      ? `Reason: ${shop.suspension_reason}. `
                      : ''}
                    Your public storefront and catalog editing are disabled until reactivated.
                  </p>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile dashboard navigation"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-16 grid-cols-4 border-t border-neutral-200 bg-white/95 backdrop-blur-md lg:hidden"
      >
        {MOBILE_BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-medium transition-colors ${
                  isActive ? 'text-emerald-700' : 'text-neutral-500 hover:text-neutral-900'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
      </nav>

      <OfflineBanner />
    </div>
  );
};
