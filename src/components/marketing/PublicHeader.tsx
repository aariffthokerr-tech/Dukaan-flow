import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../common/BrandLogo';

const NAV_LINKS = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const PublicHeader: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 rounded-md"
          onClick={() => setMobileMenuOpen(false)}
        >
          <BrandLogo />
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 ${
                  isActive ? 'text-neutral-900 underline underline-offset-8 decoration-emerald-700 decoration-2' : 'text-neutral-600'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {!isAuthenticated && (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `text-sm font-medium whitespace-nowrap shrink-0 transition-colors hover:text-neutral-900 ${
                  isActive ? 'text-neutral-900 underline underline-offset-8 decoration-emerald-700 decoration-2' : 'text-neutral-600'
                }`
              }
            >
              Sign in
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="hidden sm:inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#111315] px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            {isAuthenticated ? 'Dashboard' : 'Create Your Store'}
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-4">
          <nav aria-label="Mobile navigation" className="flex flex-col space-y-1">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `min-h-[44px] flex items-center rounded-lg px-3 text-sm font-medium ${
                    isActive
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {!isAuthenticated ? (
              <NavLink
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center rounded-lg px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Sign in
              </NavLink>
            ) : null}
            <div className="pt-2">
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center justify-center rounded-lg bg-[#111315] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Create Your Store'}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
