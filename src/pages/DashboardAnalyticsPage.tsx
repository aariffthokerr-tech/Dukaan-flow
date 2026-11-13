import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  ClipboardList,
  Eye,
  Package,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchShopAnalytics } from '../services/analyticsService';
import type { OrderStatus, ShopAnalyticsData } from '../types/database';
import {
  formatCurrencyFromCents,
  formatOrderStatusLabel,
  formatShortDateTime,
} from '../utils/formatters';

const STATUS_ORDER: OrderStatus[] = [
  'new',
  'contacted',
  'confirmed',
  'completed',
  'cancelled',
];

export const DashboardAnalyticsPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const [analytics, setAnalytics] = useState<ShopAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!shop || !profile) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchShopAnalytics(shop.id, profile.id);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [shop, profile]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 rounded-xl bg-neutral-200 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-neutral-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Store Analytics
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Live catalog counts, WhatsApp enquiry breakdown, and recorded product views for{' '}
            {shop?.name ?? 'your shop'}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {/* Summary Counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">Total Products</p>
          <p className="mt-2 font-mono text-2xl font-bold text-neutral-900 tabular-nums">
            {analytics?.totalProducts ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {analytics?.totalCategories ?? 0} categories configured
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">Active Products</p>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {analytics?.activeProducts ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {analytics?.inactiveProducts ?? 0} hidden · {analytics?.featuredProducts ?? 0}{' '}
            featured
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">Total Enquiries</p>
          <p className="mt-2 font-mono text-2xl font-bold text-neutral-900 tabular-nums">
            {analytics?.totalEnquiries ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Est. value{' '}
            {formatCurrencyFromCents(analytics?.estimatedEnquiryValueCents ?? 0, 'INR')}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">Low Stock Items</p>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {analytics?.lowStockProducts ?? 0}
          </p>
          <p className="mt-1 text-xs text-neutral-500">At or below alert threshold</p>
        </div>
      </div>

      {/* Order Status Breakdown & Most Viewed Products */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-neutral-900">
                Enquiry Status Breakdown
              </h3>
              <p className="text-xs text-neutral-500">
                Distribution across all recorded customer enquiries
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>

          {!analytics || analytics.totalEnquiries === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-xs text-neutral-500">
              No enquiries recorded yet. Status counts will populate automatically as customers
              enquire on WhatsApp.
            </div>
          ) : (
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = analytics.statusBreakdown[status] ?? 0;
                const pct = Math.round((count / analytics.totalEnquiries) * 100);
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">
                        {formatOrderStatusLabel(status)}
                      </span>
                      <span className="font-mono text-neutral-600 tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'completed' || status === 'confirmed'
                            ? 'bg-emerald-700'
                            : status === 'cancelled'
                              ? 'bg-red-500'
                              : 'bg-[#111315]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Most Viewed Products (Strictly Real Tracking) */}
        <section className="lg:col-span-6 rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-neutral-900">
                Most Viewed Products
              </h3>
              <p className="text-xs text-neutral-500">
                Counted from real storefront product page visits
              </p>
            </div>
            <Eye className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>

          {!analytics || analytics.mostViewedProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-xs text-neutral-500">
              No product views recorded yet. Views increment when shoppers open a product detail
              page on your public storefront.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {analytics.mostViewedProducts.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-neutral-400 w-5">
                      0{idx + 1}
                    </span>
                    {shop ? (
                      <Link
                        to={`/store/${shop.slug}/product/${item.slug}`}
                        className="font-medium text-neutral-900 hover:text-emerald-700 truncate"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-neutral-900 truncate">{item.name}</span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold text-neutral-700 tabular-nums shrink-0">
                    {item.view_count} {item.view_count === 1 ? 'view' : 'views'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Activity Timeline */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-neutral-900">
              Recent Activity
            </h3>
            <p className="text-xs text-neutral-500">
              Latest catalog changes and customer WhatsApp enquiries
            </p>
          </div>
          <Activity className="h-4 w-4 text-neutral-400" aria-hidden="true" />
        </div>

        {!analytics || analytics.recentActivity.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4">
            No catalog updates or enquiries recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {analytics.recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {event.type === 'order' ? (
                    <ClipboardList
                      className="h-4 w-4 text-emerald-700 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-neutral-500 shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{event.title}</p>
                    <p className="text-neutral-500 capitalize">{event.subtitle}</p>
                  </div>
                </div>
                <span className="font-mono text-neutral-400 shrink-0">
                  {formatShortDateTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
