import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  AdminPlatformOverview,
  PlanConfig,
  PlanTier,
  PlatformSettings,
  Shop,
  ShopStatus,
  Subscription,
  SubscriptionStatus,
} from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import {
  localAdminGetOverview,
  localAdminUpdatePlanConfig,
  localAdminUpdatePlatformSettings,
  localAdminUpdateShopStatus,
  localAdminUpdateSubscription,
  localGetPlatformSettings,
} from './localPreviewStore';

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  if (!isSupabaseConfigured || !supabase) {
    return localGetPlatformSettings();
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    if (error) logAppError('fetchPlatformSettings', error);
    return {
      id: 1,
      platform_name: 'DukaanFlow',
      support_whatsapp: null,
      support_email: 'support@dukaanflow.app',
      allow_new_registrations: true,
      default_trial_days: 14,
      maintenance_notice: null,
      updated_at: new Date().toISOString(),
    };
  }

  return data as PlatformSettings;
}

export async function fetchAdminPlatformOverview(
  actorId: string
): Promise<AdminPlatformOverview> {
  if (!isSupabaseConfigured || !supabase) {
    return localAdminGetOverview(actorId);
  }

  const { data, error } = await supabase.rpc('admin_get_platform_overview');
  if (error) {
    logAppError('fetchAdminPlatformOverview', error, { actorId });
    throw new Error(normalizeAppError(error, 'Unable to load platform administration overview.'));
  }

  return data as AdminPlatformOverview;
}

export async function adminUpdateShopStatus(params: {
  actorId: string;
  shopId: string;
  status: ShopStatus;
  reason?: string;
}): Promise<Shop> {
  const { actorId, shopId, status, reason } = params;

  if (!isSupabaseConfigured || !supabase) {
    return localAdminUpdateShopStatus({ actorId, shopId, status, reason });
  }

  const { data, error } = await supabase.rpc('admin_update_shop_status', {
    p_shop_id: shopId,
    p_status: status,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    logAppError('adminUpdateShopStatus', error, { shopId, status });
    throw new Error(normalizeAppError(error, 'Unable to update shop status.'));
  }

  return data as Shop;
}

export async function adminUpdateSubscription(params: {
  actorId: string;
  shopId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  periodEnd: string | null;
}): Promise<Subscription> {
  const { actorId, shopId, planTier, status, periodEnd } = params;

  if (!isSupabaseConfigured || !supabase) {
    return localAdminUpdateSubscription({
      actorId,
      shopId,
      planTier,
      status,
      periodEnd,
    });
  }

  const { data, error } = await supabase.rpc('admin_update_subscription', {
    p_shop_id: shopId,
    p_plan_tier: planTier,
    p_status: status,
    p_period_end: periodEnd,
  });

  if (error) {
    logAppError('adminUpdateSubscription', error, { shopId, planTier, status });
    throw new Error(normalizeAppError(error, 'Unable to update shop subscription.'));
  }

  return data as Subscription;
}

export async function adminUpdatePlanConfig(params: {
  actorId: string;
  tier: PlanTier;
  updates: Partial<Omit<PlanConfig, 'tier'>>;
}): Promise<PlanConfig> {
  const { actorId, tier, updates } = params;

  if (!isSupabaseConfigured || !supabase) {
    return localAdminUpdatePlanConfig({ actorId, tier, updates });
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('tier', tier)
    .select('*')
    .single();

  if (error) {
    logAppError('adminUpdatePlanConfig', error, { tier });
    throw new Error(normalizeAppError(error, 'Unable to update plan configuration.'));
  }

  return data as PlanConfig;
}

export async function adminUpdatePlatformSettings(params: {
  actorId: string;
  updates: Partial<Omit<PlatformSettings, 'id' | 'updated_at' | 'updated_by'>>;
}): Promise<PlatformSettings> {
  const { actorId, updates } = params;

  if (!isSupabaseConfigured || !supabase) {
    return localAdminUpdatePlatformSettings({ actorId, updates });
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .update({
      ...updates,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single();

  if (error) {
    logAppError('adminUpdatePlatformSettings', error);
    throw new Error(normalizeAppError(error, 'Unable to save platform settings.'));
  }

  return data as PlatformSettings;
}
