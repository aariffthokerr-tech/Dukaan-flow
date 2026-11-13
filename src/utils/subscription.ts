import type {
  PlanConfig,
  PlanTier,
  Shop,
  Subscription,
  SubscriptionStatus,
} from '../types/database';

export const DEFAULT_PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    description:
      'Limited product catalog, public storefront, and basic WhatsApp order enquiries.',
    monthly_price_inr: 0,
    max_products: 25,
    max_categories: 10,
    max_images_per_product: 3,
    analytics_level: 'basic_counts',
    custom_branding_enabled: false,
  },
  basic: {
    tier: 'basic',
    name: 'Basic',
    description:
      'Higher product and category limits with standard storefront analytics.',
    monthly_price_inr: 999,
    max_products: 150,
    max_categories: 25,
    max_images_per_product: 5,
    analytics_level: 'standard',
    custom_branding_enabled: true,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description:
      'Highest catalog capacity, advanced analytics, and full storefront branding.',
    monthly_price_inr: 2499,
    max_products: 1000,
    max_categories: 100,
    max_images_per_product: 10,
    analytics_level: 'advanced',
    custom_branding_enabled: true,
  },
};

export function formatPlanTierLabel(tier: PlanTier): string {
  switch (tier) {
    case 'starter':
      return 'Starter';
    case 'basic':
      return 'Basic';
    case 'pro':
      return 'Pro';
  }
}

export function formatSubscriptionStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'trialing':
      return 'Trialing';
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'suspended':
      return 'Suspended';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function isSubscriptionExpired(
  subscription: Pick<Subscription, 'status' | 'current_period_end'> | null,
  nowMs: number = Date.now()
): boolean {
  if (!subscription) return false;
  if (subscription.status === 'expired') return true;
  if (!subscription.current_period_end) return false;
  const endMs = new Date(subscription.current_period_end).getTime();
  if (Number.isNaN(endMs)) return false;
  return endMs < nowMs;
}

export interface ShopAccessEvaluation {
  canWriteCatalog: boolean;
  canServePublicStorefront: boolean;
  effectiveSubscriptionStatus: SubscriptionStatus;
  blockReason: string | null;
}

export function evaluateShopAccess(
  shop: Pick<Shop, 'status' | 'is_active' | 'suspension_reason'> | null,
  subscription: Subscription | null,
  nowMs: number = Date.now()
): ShopAccessEvaluation {
  if (!shop) {
    return {
      canWriteCatalog: false,
      canServePublicStorefront: false,
      effectiveSubscriptionStatus: 'cancelled',
      blockReason: 'No shop workspace found for this account.',
    };
  }

  if (shop.status === 'suspended') {
    return {
      canWriteCatalog: false,
      canServePublicStorefront: false,
      effectiveSubscriptionStatus: subscription?.status ?? 'suspended',
      blockReason: shop.suspension_reason
        ? `Shop suspended: ${shop.suspension_reason}`
        : 'This shop has been suspended by platform administration.',
    };
  }

  const expired = isSubscriptionExpired(subscription, nowMs);
  const subStatus: SubscriptionStatus = expired
    ? 'expired'
    : subscription?.status ?? 'trialing';

  if (subStatus === 'suspended') {
    return {
      canWriteCatalog: false,
      canServePublicStorefront: false,
      effectiveSubscriptionStatus: 'suspended',
      blockReason: 'Your shop subscription is suspended. Contact support or Super Admin.',
    };
  }

  if (subStatus === 'expired') {
    return {
      canWriteCatalog: false,
      canServePublicStorefront: false,
      effectiveSubscriptionStatus: 'expired',
      blockReason: 'Your subscription period has expired. Request renewal to restore storefront and catalog editing.',
    };
  }

  if (subStatus === 'cancelled') {
    return {
      canWriteCatalog: false,
      canServePublicStorefront: false,
      effectiveSubscriptionStatus: 'cancelled',
      blockReason: 'Your subscription is cancelled. Request plan activation to continue.',
    };
  }

  return {
    canWriteCatalog: true,
    canServePublicStorefront: shop.status === 'active' && shop.is_active,
    effectiveSubscriptionStatus: subStatus,
    blockReason: null,
  };
}

export function checkPlanQuota(params: {
  resource: 'products' | 'categories' | 'images';
  currentCount: number;
  plan: PlanConfig;
  access: ShopAccessEvaluation;
}): { allowed: boolean; reason: string | null } {
  const { resource, currentCount, plan, access } = params;

  if (!access.canWriteCatalog) {
    return {
      allowed: false,
      reason: access.blockReason || 'Your shop account cannot modify catalog items.',
    };
  }

  if (resource === 'products' && currentCount >= plan.max_products) {
    return {
      allowed: false,
      reason: `${plan.name} plan limit reached (${plan.max_products} products). Request an upgrade to add more products.`,
    };
  }

  if (resource === 'categories' && currentCount >= plan.max_categories) {
    return {
      allowed: false,
      reason: `${plan.name} plan limit reached (${plan.max_categories} categories). Request an upgrade to add more categories.`,
    };
  }

  if (resource === 'images' && currentCount >= plan.max_images_per_product) {
    return {
      allowed: false,
      reason: `${plan.name} plan allows up to ${plan.max_images_per_product} images per product.`,
    };
  }

  return { allowed: true, reason: null };
}
