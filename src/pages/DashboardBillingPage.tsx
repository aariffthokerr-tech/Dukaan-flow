import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchDashboardSnapshot } from '../services/dashboardService';
import {
  fetchShopSubscription,
  listPlanConfigs,
  requestSubscriptionUpgrade,
} from '../services/subscriptionService';
import type { PlanConfig, PlanTier, Subscription } from '../types/database';
import { formatShortDate } from '../utils/formatters';
import {
  DEFAULT_PLAN_CONFIGS,
  evaluateShopAccess,
  formatPlanTierLabel,
  formatSubscriptionStatusLabel,
} from '../utils/subscription';

export const DashboardBillingPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedTier, setSelectedTier] = useState<PlanTier>('basic');
  const [requestNote, setRequestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBilling = useCallback(async () => {
    if (!shop || !profile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [planList, sub, snapshot] = await Promise.all([
        listPlanConfigs(),
        fetchShopSubscription(shop.id, profile.id),
        fetchDashboardSnapshot(shop.id, profile.id),
      ]);
      setPlans(planList);
      setSubscription(sub);
      setProductCount(snapshot.metrics.totalProducts);
      setCategoryCount(snapshot.metrics.totalCategories);

      const currentTier = sub?.plan_tier ?? 'starter';
      setSelectedTier(currentTier === 'starter' ? 'basic' : 'pro');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load subscription details.');
    } finally {
      setIsLoading(false);
    }
  }, [shop, profile]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const activeTier: PlanTier = subscription?.plan_tier ?? 'starter';
  const activePlan = useMemo(
    () => plans.find((p) => p.tier === activeTier) ?? DEFAULT_PLAN_CONFIGS[activeTier],
    [plans, activeTier]
  );

  const access = useMemo(
    () => evaluateShopAccess(shop, subscription),
    [shop, subscription]
  );

  const handleRequestUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !profile) return;

    setError(null);
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const updated = await requestSubscriptionUpgrade({
        shopId: shop.id,
        ownerId: profile.id,
        requestedTier: selectedTier,
        note: requestNote,
      });
      setSubscription(updated);
      setRequestNote('');
      setFeedback(
        `Upgrade request for ${formatPlanTierLabel(
          selectedTier
        )} submitted. Super Admin will review and activate your plan manually.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit upgrade request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-36 rounded-xl bg-neutral-200 animate-pulse" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-xl bg-neutral-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const productPct = Math.min(
    100,
    Math.round((productCount / Math.max(activePlan.max_products, 1)) * 100)
  );
  const categoryPct = Math.min(
    100,
    Math.round((categoryCount / Math.max(activePlan.max_categories, 1)) * 100)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
          Plan & Usage Limits
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Review your current DukaanFlow tier, expiration schedule, usage quotas, and submit plan
          upgrade requests.
        </p>
      </div>

      {!access.canWriteCatalog && access.blockReason && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{access.blockReason}</span>
        </div>
      )}

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

      {/* Current Subscription Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111315] text-white">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">Current Plan</p>
              <h3 className="font-display text-lg font-bold text-neutral-900">
                {activePlan.name} Plan ·{' '}
                <span
                  className={
                    access.effectiveSubscriptionStatus === 'active' ||
                    access.effectiveSubscriptionStatus === 'trialing'
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }
                >
                  {formatSubscriptionStatusLabel(access.effectiveSubscriptionStatus)}
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-neutral-500">Start Date</p>
              <p className="mt-0.5 font-mono font-medium text-neutral-900">
                {subscription ? formatShortDate(subscription.current_period_start) : '—'}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Expiration Date</p>
              <p className="mt-0.5 font-mono font-medium text-neutral-900">
                {subscription?.current_period_end
                  ? formatShortDate(subscription.current_period_end)
                  : 'Open / No expiry set'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Quota Usage */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-700">Products Used</span>
              <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                {productCount} / {activePlan.max_products}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${
                  productPct >= 90 ? 'bg-amber-600' : 'bg-emerald-700'
                }`}
                style={{ width: `${productPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-700">Categories Used</span>
              <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                {categoryCount} / {activePlan.max_categories}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${
                  categoryPct >= 90 ? 'bg-amber-600' : 'bg-emerald-700'
                }`}
                style={{ width: `${categoryPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-700">Media & Analytics</p>
            <p className="text-xs text-neutral-600">
              Up to <span className="font-mono font-semibold">{activePlan.max_images_per_product}</span>{' '}
              images/product · Analytics:{' '}
              <span className="font-medium text-neutral-800">
                {activePlan.analytics_level === 'advanced'
                  ? 'Advanced'
                  : activePlan.analytics_level === 'standard'
                    ? 'Standard views'
                    : 'Basic counts'}
              </span>
            </p>
          </div>
        </div>

        {subscription?.requested_plan_tier && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Pending upgrade request:{' '}
            <span className="font-semibold">
              {formatPlanTierLabel(subscription.requested_plan_tier)}
            </span>{' '}
            {subscription.upgrade_requested_at
              ? `(submitted ${formatShortDate(subscription.upgrade_requested_at)})`
              : ''}
            . Waiting for manual Super Admin activation.
          </div>
        )}
      </div>

      {/* Plan Comparison Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {(plans.length > 0
          ? plans
          : [DEFAULT_PLAN_CONFIGS.starter, DEFAULT_PLAN_CONFIGS.basic, DEFAULT_PLAN_CONFIGS.pro]
        ).map((plan) => {
          const isCurrent = plan.tier === activeTier;
          return (
            <div
              key={plan.tier}
              className={`flex flex-col justify-between rounded-xl border p-6 ${
                isCurrent
                  ? 'border-[#111315] bg-[#111315] text-white'
                  : 'border-neutral-200 bg-white text-neutral-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                      Current
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 text-xs ${
                    isCurrent ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  {plan.description}
                </p>

                <p className="mt-5 font-mono text-2xl font-bold tabular-nums">
                  ₹{plan.monthly_price_inr.toLocaleString('en-IN')}
                  <span
                    className={`ml-1.5 font-sans text-xs font-normal ${
                      isCurrent ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    / month
                  </span>
                </p>

                <ul className="mt-5 space-y-2.5 text-xs">
                  <li className="flex items-center gap-2">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isCurrent ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    />
                    <span>Up to {plan.max_products} products</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isCurrent ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    />
                    <span>Up to {plan.max_categories} categories</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isCurrent ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    />
                    <span>Up to {plan.max_images_per_product} images per product</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isCurrent ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    />
                    <span>
                      {plan.analytics_level === 'advanced'
                        ? 'Advanced analytics'
                        : plan.analytics_level === 'standard'
                          ? 'Basic + view analytics'
                          : 'Basic count analytics'}
                    </span>
                  </li>
                </ul>
              </div>

              {!isCurrent && (
                <button
                  type="button"
                  onClick={() => setSelectedTier(plan.tier)}
                  className="mt-6 w-full min-h-[40px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  Select {plan.name} for Request
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade Request Form (Manual Activation — No Fake Payment Gateway) */}
      <form
        onSubmit={(e) => void handleRequestUpgrade(e)}
        className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4"
      >
        <div>
          <h3 className="font-display text-base font-bold text-neutral-900">
            Request Plan Upgrade or Renewal
          </h3>
          <p className="mt-1 text-xs text-neutral-600">
            DukaanFlow currently activates paid plans manually through platform administration. No
            online card charge is collected on this form.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="upgrade-tier" className="block text-xs font-medium text-neutral-700">
              Requested Plan
            </label>
            <select
              id="upgrade-tier"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as PlanTier)}
              className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            >
              <option value="starter">Starter</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div>
            <label htmlFor="upgrade-note" className="block text-xs font-medium text-neutral-700">
              Note for Admin (optional)
            </label>
            <input
              id="upgrade-note"
              type="text"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g. Seasonal catalog expansion"
              className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#111315] px-5 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting Request...' : 'Submit Upgrade Request'}
        </button>
      </form>
    </div>
  );
};
