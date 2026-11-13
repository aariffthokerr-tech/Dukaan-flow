import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StorefrontPlaceholder } from '../components/dashboard/StorefrontPlaceholder';
import { useAuth } from '../hooks/useAuth';
import { formatShortDate } from '../utils/formatters';

export const DashboardStorefrontPage: React.FC = () => {
  const { shop } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Storefront Identity
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Verify your public storefront URL, opening hours, and WhatsApp contact.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {shop && (
            <Link
              to={`/store/${shop.slug}`}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open Live Storefront</span>
            </Link>
          )}
          <Link
            to="/dashboard/settings"
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Edit Shop Details
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <StorefrontPlaceholder shop={shop} />
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-neutral-900">
              Tenant Configuration Summary
            </h3>
            <dl className="divide-y divide-neutral-100 text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-neutral-500">Shop Status</dt>
                <dd
                  className={`font-medium ${
                    shop?.is_active ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {shop?.is_active ? 'Active & Public' : 'Inactive (Hidden)'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-neutral-500">Description</dt>
                <dd className="max-w-xs text-right text-neutral-900">
                  {shop?.description || 'Not configured yet'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-neutral-500">Business Address</dt>
                <dd className="max-w-xs text-right text-neutral-900">
                  {shop?.address || 'Not configured yet'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-neutral-500">Opening Hours</dt>
                <dd className="max-w-xs text-right text-neutral-900">
                  {shop?.opening_hours || 'Not configured yet'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-neutral-500">Provisioned On</dt>
                <dd className="font-mono text-xs text-neutral-700 tabular-nums">
                  {shop ? formatShortDate(shop.created_at) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
