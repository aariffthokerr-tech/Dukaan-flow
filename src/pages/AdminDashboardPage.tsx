import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../hooks/useAuth';
import {
  adminUpdatePlanConfig,
  adminUpdatePlatformSettings,
  adminUpdateShopStatus,
  adminUpdateSubscription,
  fetchAdminPlatformOverview,
  fetchPlatformSettings,
} from '../services/adminService';
import { listPlanConfigs } from '../services/subscriptionService';
import type {
  AdminPlatformOverview,
  AdminShopSummary,
  AnalyticsLevel,
  PlanConfig,
  PlanTier,
  PlatformSettings,
  ShopStatus,
  SubscriptionStatus,
} from '../types/database';
import { formatShortDate } from '../utils/formatters';
import {
  formatPlanTierLabel,
  formatSubscriptionStatusLabel,
} from '../utils/subscription';

type AdminTab = 'shops' | 'plans' | 'settings';
type ShopFilter = 'all' | ShopStatus | 'upgrade_requests';

const PAGE_SIZE = 15;

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('shops');
  const [overview, setOverview] = useState<AdminPlatformOverview | null>(null);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShopFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Suspend modal state
  const [suspendTarget, setSuspendTarget] = useState<AdminShopSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);

  // Subscription assignment modal state
  const [subTarget, setSubTarget] = useState<AdminShopSummary | null>(null);
  const [subPlanTier, setSubPlanTier] = useState<PlanTier>('starter');
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>('active');
  const [subExpiryDate, setSubExpiryDate] = useState('');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  // Plan editing state
  const [savingPlanTier, setSavingPlanTier] = useState<PlanTier | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!profile || profile.role !== 'super_admin') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [overviewRes, plansRes, settingsRes] = await Promise.all([
        fetchAdminPlatformOverview(profile.id),
        listPlanConfigs(),
        fetchPlatformSettings(),
      ]);
      setOverview(overviewRes);
      setPlans(plansRes);
      setSettings(settingsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console.');
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const filteredShops = useMemo(() => {
    if (!overview) return [];
    const needle = searchQuery.trim().toLowerCase();
    return overview.shops.filter((shop) => {
      if (statusFilter === 'upgrade_requests') {
        if (!shop.requested_plan_tier) return false;
      } else if (statusFilter !== 'all' && shop.status !== statusFilter) {
        return false;
      }

      if (!needle) return true;
      return (
        shop.name.toLowerCase().includes(needle) ||
        shop.slug.toLowerCase().includes(needle) ||
        shop.category.toLowerCase().includes(needle)
      );
    });
  }, [overview, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredShops.length / PAGE_SIZE));
  const paginatedShops = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredShops.slice(start, start + PAGE_SIZE);
  }, [filteredShops, currentPage]);

  const handleQuickStatusChange = async (
    shop: AdminShopSummary,
    nextStatus: ShopStatus,
    reason?: string
  ) => {
    if (!profile) return;
    setError(null);
    setFeedback(null);
    setIsUpdatingShop(true);
    try {
      await adminUpdateShopStatus({
        actorId: profile.id,
        shopId: shop.id,
        status: nextStatus,
        reason,
      });
      setSuspendTarget(null);
      setSuspendReason('');
      setFeedback(`Shop "${shop.name}" marked as ${nextStatus}.`);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update shop status.');
    } finally {
      setIsUpdatingShop(false);
    }
  };

  const openSubscriptionModal = (shop: AdminShopSummary) => {
    setSubTarget(shop);
    setSubPlanTier(shop.requested_plan_tier ?? shop.plan_tier);
    setSubStatus(shop.requested_plan_tier ? 'active' : shop.subscription_status);
    if (shop.current_period_end) {
      setSubExpiryDate(shop.current_period_end.slice(0, 10));
    } else {
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setSubExpiryDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !subTarget) return;

    setError(null);
    setFeedback(null);
    setIsUpdatingSub(true);
    try {
      const periodEndIso = subExpiryDate
        ? new Date(`${subExpiryDate}T23:59:59.999Z`).toISOString()
        : null;

      await adminUpdateSubscription({
        actorId: profile.id,
        shopId: subTarget.id,
        planTier: subPlanTier,
        status: subStatus,
        periodEnd: periodEndIso,
      });
      setFeedback(
        `Subscription for "${subTarget.name}" updated to ${formatPlanTierLabel(
          subPlanTier
        )} (${formatSubscriptionStatusLabel(subStatus)}).`
      );
      setSubTarget(null);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update subscription.');
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const handlePlanFieldChange = (
    tier: PlanTier,
    field: keyof PlanConfig,
    value: string | number | boolean
  ) => {
    setPlans((prev) =>
      prev.map((p) => (p.tier === tier ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePlanConfig = async (plan: PlanConfig) => {
    if (!profile) return;
    if (plan.max_products <= 0 || plan.max_categories <= 0 || plan.max_images_per_product <= 0) {
      setError('Plan limits must be greater than zero.');
      return;
    }

    setError(null);
    setFeedback(null);
    setSavingPlanTier(plan.tier);
    try {
      await adminUpdatePlanConfig({
        actorId: profile.id,
        tier: plan.tier,
        updates: {
          name: plan.name,
          description: plan.description,
          monthly_price_inr: plan.monthly_price_inr,
          max_products: plan.max_products,
          max_categories: plan.max_categories,
          max_images_per_product: plan.max_images_per_product,
          analytics_level: plan.analytics_level,
          custom_branding_enabled: plan.custom_branding_enabled,
        },
      });
      setFeedback(`Saved "${plan.name}" plan configuration.`);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plan config.');
    } finally {
      setSavingPlanTier(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !settings) return;
    if (settings.default_trial_days < 0) {
      setError('Default trial days cannot be negative.');
      return;
    }

    setError(null);
    setFeedback(null);
    setIsSavingSettings(true);
    try {
      const updated = await adminUpdatePlatformSettings({
        actorId: profile.id,
        updates: {
          platform_name: settings.platform_name.trim() || 'DukaanFlow',
          support_email: settings.support_email?.trim() || null,
          support_whatsapp: settings.support_whatsapp?.trim() || null,
          allow_new_registrations: settings.allow_new_registrations,
          default_trial_days: settings.default_trial_days,
          maintenance_notice: settings.maintenance_notice?.trim() || null,
        },
      });
      setSettings(updated);
      setFeedback('Platform settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save platform settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-24 rounded-xl bg-neutral-200 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-neutral-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Super Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Monitor registered shops, enforce account statuses, manage manual subscriptions, and
            configure platform limits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAdminData()}
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

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Total Shops</p>
          <p className="mt-1 font-mono text-2xl font-bold text-neutral-900 tabular-nums">
            {overview?.totalShops ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Active Shops</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {overview?.activeShops ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Suspended</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {overview?.suspendedShops ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Platform Products</p>
          <p className="mt-1 font-mono text-2xl font-bold text-neutral-900 tabular-nums">
            {overview?.totalProducts ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Total Enquiries</p>
          <p className="mt-1 font-mono text-2xl font-bold text-neutral-900 tabular-nums">
            {overview?.totalEnquiries ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-500">Upgrade Requests</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {overview?.pendingUpgradeRequests ?? 0}
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Super Admin sections"
        className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 pb-3"
      >
        {(
          [
            { id: 'shops', label: 'Shops & Subscriptions', icon: Store },
            { id: 'plans', label: 'Subscription Plans', icon: CreditCard },
            { id: 'settings', label: 'Platform Settings', icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-[#111315] text-white'
                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Shop Management & Recent Registrations */}
      {activeTab === 'shops' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shops by name, slug, or category..."
                aria-label="Search registered shops"
                className="w-full min-h-[42px] rounded-lg border border-neutral-300 pl-9 pr-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Shops' },
                  { id: 'active', label: 'Active' },
                  { id: 'suspended', label: 'Suspended' },
                  { id: 'inactive', label: 'Inactive' },
                  { id: 'upgrade_requests', label: 'Upgrade Requests' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatusFilter(item.id)}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === item.id
                      ? 'bg-[#111315] text-white'
                      : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredShops.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <EmptyState
                borderless
                icon={Store}
                title="No matching shops found"
                description="Registered retail workspaces will appear here once created or when filters are cleared."
              />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
                        <th className="py-3.5 pl-5 pr-3 font-medium">Shop & Slug</th>
                        <th className="py-3.5 px-3 font-medium">Registered</th>
                        <th className="py-3.5 px-3 font-medium">Shop Status</th>
                        <th className="py-3.5 px-3 font-medium">Plan & Billing</th>
                        <th className="py-3.5 px-3 text-right font-medium">Catalog</th>
                        <th className="py-3.5 pl-3 pr-5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-sm">
                      {paginatedShops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 pl-5 pr-3">
                            <div className="min-w-[180px]">
                              <p className="font-semibold text-neutral-900">{shop.name}</p>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                                <span className="font-mono">/store/{shop.slug}</span>
                                <Link
                                  to={`/store/${shop.slug}`}
                                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>View</span>
                                </Link>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-xs text-neutral-600 tabular-nums whitespace-nowrap">
                            {formatShortDate(shop.created_at)}
                          </td>

                          <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                            <span
                              className={`font-semibold capitalize ${
                                shop.status === 'active'
                                  ? 'text-emerald-700'
                                  : shop.status === 'suspended'
                                    ? 'text-red-700'
                                    : 'text-neutral-500'
                              }`}
                            >
                              {shop.status}
                            </span>
                            {shop.suspension_reason && (
                              <p className="mt-0.5 text-[11px] text-red-600 truncate max-w-[160px]">
                                {shop.suspension_reason}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-xs">
                            <p className="font-medium text-neutral-900">
                              {formatPlanTierLabel(shop.plan_tier)} ·{' '}
                              <span className="text-neutral-600">
                                {formatSubscriptionStatusLabel(shop.subscription_status)}
                              </span>
                            </p>
                            {shop.requested_plan_tier && (
                              <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                                Upgrade requested: {formatPlanTierLabel(shop.requested_plan_tier)}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono text-xs text-neutral-600 tabular-nums whitespace-nowrap">
                            {shop.product_count} prod · {shop.enquiry_count} enq
                          </td>

                          <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {shop.status !== 'active' && (
                                <button
                                  type="button"
                                  disabled={isUpdatingShop}
                                  onClick={() => void handleQuickStatusChange(shop, 'active')}
                                  className="min-h-[34px] rounded-lg border border-emerald-700/30 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                                >
                                  Activate
                                </button>
                              )}
                              {shop.status === 'active' && (
                                <button
                                  type="button"
                                  disabled={isUpdatingShop}
                                  onClick={() => void handleQuickStatusChange(shop, 'inactive')}
                                  className="min-h-[34px] rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                                >
                                  Deactivate
                                </button>
                              )}
                              {shop.status !== 'suspended' && (
                                <button
                                  type="button"
                                  disabled={isUpdatingShop}
                                  onClick={() => {
                                    setSuspendTarget(shop);
                                    setSuspendReason(shop.suspension_reason ?? '');
                                  }}
                                  className="min-h-[34px] rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openSubscriptionModal(shop)}
                                className="min-h-[34px] rounded-lg bg-[#111315] px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800"
                              >
                                Manage Plan
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {paginatedShops.map((shop) => (
                  <article
                    key={shop.id}
                    className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-neutral-900 truncate">
                          {shop.name}
                        </h3>
                        <p className="font-mono text-xs text-neutral-500 truncate">
                          /store/{shop.slug}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold capitalize shrink-0 ${
                          shop.status === 'active'
                            ? 'text-emerald-700'
                            : shop.status === 'suspended'
                              ? 'text-red-700'
                              : 'text-neutral-500'
                        }`}
                      >
                        {shop.status}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-600 space-y-1">
                      <p>
                        Plan:{' '}
                        <span className="font-medium text-neutral-900">
                          {formatPlanTierLabel(shop.plan_tier)}
                        </span>{' '}
                        ({formatSubscriptionStatusLabel(shop.subscription_status)})
                      </p>
                      <p className="tabular-nums">
                        {shop.product_count} products · {shop.enquiry_count} enquiries · Registered{' '}
                        {formatShortDate(shop.created_at)}
                      </p>
                      {shop.requested_plan_tier && (
                        <p className="font-medium text-amber-700">
                          Upgrade requested: {formatPlanTierLabel(shop.requested_plan_tier)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                      {shop.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => void handleQuickStatusChange(shop, 'active')}
                          className="min-h-[38px] rounded-lg border border-emerald-700/30 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
                        >
                          Activate
                        </button>
                      )}
                      {shop.status !== 'suspended' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSuspendTarget(shop);
                            setSuspendReason(shop.suspension_reason ?? '');
                          }}
                          className="min-h-[38px] rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openSubscriptionModal(shop)}
                        className="min-h-[38px] rounded-lg bg-[#111315] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Manage Plan
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-xs text-neutral-600">
                  <span className="tabular-nums">
                    Page {currentPage} of {totalPages} ({filteredShops.length} shops)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="min-h-[36px] rounded-lg border border-neutral-300 bg-white px-3 py-1 font-medium text-neutral-800 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="min-h-[36px] rounded-lg border border-neutral-300 bg-white px-3 py-1 font-medium text-neutral-800 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: Configurable Subscription Plans */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-neutral-900">
                    {plan.name}
                  </h3>
                  <p className="font-mono text-xs text-neutral-500">tier: {plan.tier}</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-neutral-700">
                    Monthly Price (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={plan.monthly_price_inr}
                    onChange={(e) =>
                      handlePlanFieldChange(
                        plan.tier,
                        'monthly_price_inr',
                        Math.max(0, Number(e.target.value))
                      )
                    }
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-sm text-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-700">
                      Max Products
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={plan.max_products}
                      onChange={(e) =>
                        handlePlanFieldChange(
                          plan.tier,
                          'max_products',
                          Math.max(1, Number(e.target.value))
                        )
                      }
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-sm text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700">
                      Max Categories
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={plan.max_categories}
                      onChange={(e) =>
                        handlePlanFieldChange(
                          plan.tier,
                          'max_categories',
                          Math.max(1, Number(e.target.value))
                        )
                      }
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-sm text-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-700">
                      Images / Product
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={plan.max_images_per_product}
                      onChange={(e) =>
                        handlePlanFieldChange(
                          plan.tier,
                          'max_images_per_product',
                          Math.max(1, Number(e.target.value))
                        )
                      }
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-sm text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700">
                      Analytics Level
                    </label>
                    <select
                      value={plan.analytics_level}
                      onChange={(e) =>
                        handlePlanFieldChange(
                          plan.tier,
                          'analytics_level',
                          e.target.value as AnalyticsLevel
                        )
                      }
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900"
                    >
                      <option value="basic_counts">Basic Counts</option>
                      <option value="standard">Standard</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.custom_branding_enabled}
                    onChange={(e) =>
                      handlePlanFieldChange(
                        plan.tier,
                        'custom_branding_enabled',
                        e.target.checked
                      )
                    }
                    className="h-4 w-4 accent-emerald-700"
                  />
                  <span>Custom storefront branding enabled</span>
                </label>
              </div>

              <button
                type="button"
                disabled={savingPlanTier === plan.tier}
                onClick={() => void handleSavePlanConfig(plan)}
                className="w-full min-h-[42px] rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {savingPlanTier === plan.tier ? 'Saving...' : `Save ${plan.name} Limits`}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Platform Settings */}
      {activeTab === 'settings' && settings && (
        <form
          onSubmit={(e) => void handleSaveSettings(e)}
          className="max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 space-y-5"
        >
          <div>
            <h3 className="font-display text-base font-bold text-neutral-900">
              Platform Settings
            </h3>
            <p className="mt-1 text-xs text-neutral-600">
              Global registration defaults and support contact details enforced across DukaanFlow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ps-name" className="block text-xs font-medium text-neutral-700">
                Platform Name
              </label>
              <input
                id="ps-name"
                type="text"
                value={settings.platform_name}
                onChange={(e) =>
                  setSettings({ ...settings, platform_name: e.target.value })
                }
                className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="ps-trial" className="block text-xs font-medium text-neutral-700">
                Default Trial Days
              </label>
              <input
                id="ps-trial"
                type="number"
                min={0}
                value={settings.default_trial_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_trial_days: Math.max(0, Number(e.target.value)),
                  })
                }
                className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="ps-email" className="block text-xs font-medium text-neutral-700">
                Support Email
              </label>
              <input
                id="ps-email"
                type="email"
                value={settings.support_email ?? ''}
                onChange={(e) =>
                  setSettings({ ...settings, support_email: e.target.value })
                }
                className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="ps-wa" className="block text-xs font-medium text-neutral-700">
                Support WhatsApp Number
              </label>
              <input
                id="ps-wa"
                type="text"
                value={settings.support_whatsapp ?? ''}
                onChange={(e) =>
                  setSettings({ ...settings, support_whatsapp: e.target.value })
                }
                placeholder="+91..."
                className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ps-notice" className="block text-xs font-medium text-neutral-700">
              Platform Maintenance Notice (optional)
            </label>
            <textarea
              id="ps-notice"
              rows={2}
              value={settings.maintenance_notice ?? ''}
              onChange={(e) =>
                setSettings({ ...settings, maintenance_notice: e.target.value })
              }
              placeholder="Optional announcement for shop owners..."
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-neutral-800 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allow_new_registrations}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allow_new_registrations: e.target.checked,
                })
              }
              className="h-4 w-4 accent-emerald-700"
            />
            <span>Allow new shop owner registrations</span>
          </label>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="min-h-[44px] rounded-lg bg-[#111315] px-5 py-2.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSavingSettings ? 'Saving Settings...' : 'Save Platform Settings'}
          </button>
        </form>
      )}

      {/* Suspend Shop Confirmation Modal */}
      {suspendTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="suspend-shop-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-red-700">
                <Ban className="h-5 w-5" aria-hidden="true" />
                <h3
                  id="suspend-shop-title"
                  className="font-display text-lg font-bold text-neutral-900"
                >
                  Suspend "{suspendTarget.name}"?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                aria-label="Close suspend modal"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Suspending this shop immediately hides its public storefront and prevents catalog
              modifications until a Super Admin reactivates it.
            </p>

            <div>
              <label
                htmlFor="suspend-reason-input"
                className="block text-xs font-medium text-neutral-700"
              >
                Suspension reason (visible to shop owner)
              </label>
              <input
                id="suspend-reason-input"
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Policy verification pending"
                className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isUpdatingShop}
                onClick={() => setSuspendTarget(null)}
                className="min-h-[40px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingShop}
                onClick={() =>
                  void handleQuickStatusChange(suspendTarget, 'suspended', suspendReason)
                }
                className="min-h-[40px] rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isUpdatingShop ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscription / Manual Plan Activation Modal */}
      {subTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-sub-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <form
            onSubmit={(e) => void handleSaveSubscription(e)}
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <h3
                  id="manage-sub-title"
                  className="font-display text-lg font-bold text-neutral-900"
                >
                  Manage Plan · {subTarget.name}
                </h3>
                <p className="text-xs text-neutral-500">
                  Manual Super Admin plan activation and expiry configuration
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTarget(null)}
                aria-label="Close subscription modal"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {subTarget.requested_plan_tier && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Owner requested upgrade to{' '}
                    {formatPlanTierLabel(subTarget.requested_plan_tier)}
                  </span>
                </div>
                {subTarget.upgrade_request_note && (
                  <p className="text-amber-800">Note: "{subTarget.upgrade_request_note}"</p>
                )}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="sub-tier-select" className="block font-medium text-neutral-700">
                  Plan Tier
                </label>
                <select
                  id="sub-tier-select"
                  value={subPlanTier}
                  onChange={(e) => setSubPlanTier(e.target.value as PlanTier)}
                  className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="starter">Starter</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <div>
                <label htmlFor="sub-status-select" className="block font-medium text-neutral-700">
                  Subscription Status
                </label>
                <select
                  id="sub-status-select"
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as SubscriptionStatus)}
                  className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label htmlFor="sub-expiry-input" className="block font-medium text-neutral-700">
                  Expiration Date
                </label>
                <input
                  id="sub-expiry-input"
                  type="date"
                  value={subExpiryDate}
                  onChange={(e) => setSubExpiryDate(e.target.value)}
                  className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isUpdatingSub}
                onClick={() => setSubTarget(null)}
                className="min-h-[40px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingSub}
                className="min-h-[40px] rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {isUpdatingSub ? 'Saving...' : 'Activate & Save Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
