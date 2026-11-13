import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="inline-block">
              <BrandLogo />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-600">
              Multi-tenant storefront and retail operations software built for independent merchants.
              Each shop operates in its own isolated workspace.
            </p>
            <div className="mt-5">
              <PWAInstallButton variant="footer" />
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-neutral-900">Platform</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to="/features" className="hover:text-neutral-900 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-neutral-900 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/demo" className="hover:text-neutral-900 transition-colors">
                  Storefront Demo
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-neutral-900 transition-colors">
                  Create Your Store
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-neutral-900">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to="/about" className="hover:text-neutral-900 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-neutral-900 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-neutral-900 transition-colors">
                  Shop Owner Sign In
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-neutral-900 transition-colors">
                  Reset Password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-8 text-xs text-neutral-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} DukaanFlow. All rights reserved.</p>
          <p>Isolated shop workspaces · WhatsApp-ready retail storefronts</p>
        </div>
      </div>
    </footer>
  );
};
