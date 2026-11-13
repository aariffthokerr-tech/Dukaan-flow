import React, { useState } from 'react';
import {
  ArrowLeft,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { useAuth } from '../hooks/useAuth';

export const AdminLayout: React.FC = () => {
  const { profile, shop, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Super Admin navigation"
        className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-[#111315] text-white border-r border-neutral-800"
      >
        <div className="flex h-16 items-center px-6 border-b border-neutral-800">
          <Link to="/" className="focus-visible:outline-2 focus-visible:outline-emerald-500 rounded">
            <BrandLogo inverted />
          </Link>
        </div>

        <div className="px-5 py-4 border-b border-neutral-800/80">
          <p className="text-xs font-medium text-emerald-400">Super Admin Console</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-white truncate">
            Platform Administration
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-700 text-white'
                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`
            }
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Platform Overview</span>
          </NavLink>

          {shop && (
            <Link
              to="/dashboard"
              className="flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>My Shop Workspace</span>
            </Link>
          )}

          <Link
            to="/"
            className="flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Public Website</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {profile?.full_name ?? 'Super Admin'}
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

      {/* Mobile Drawer */}
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

            <nav className="flex-1 space-y-1 px-3 py-4">
              <NavLink
                to="/admin"
                end
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Platform Overview</span>
              </NavLink>
              {shop && (
                <Link
                  to="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
                >
                  <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>My Shop Workspace</span>
                </Link>
              )}
              <Link
                to="/"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Public Website</span>
              </Link>
            </nav>

            <div className="p-4 border-t border-neutral-800">
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

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open admin navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-emerald-700 font-medium hidden sm:block">
                Restricted Super Admin Access
              </p>
              <h1 className="font-display text-base lg:text-lg font-semibold text-neutral-900 truncate">
                Platform Control Center
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#111315] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <OfflineBanner />
    </div>
  );
};
