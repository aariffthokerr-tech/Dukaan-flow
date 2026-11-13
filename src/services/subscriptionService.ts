import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { PlanConfig, PlanTier, Subscription } from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { DEFAULT_PLAN_CONFIGS } from '../utils/subscription';
import {
  localGetShopSubscription,
  localListPlanConfigs,
  localRequestSubscriptionUpgrade,
} from './localPreviewStore';

export async function listPlanConfigs(): Promise<PlanConfig[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localListPlanConfigs();
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('monthly_price_inr', { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) logAppError('listPlanConfigs', error);
    return [
      DEFAULT_PLAN_CONFIGS.starter,
      DEFAULT_PLAN_CONFIGS.basic,
      DEFAULT_PLAN_CONFIGS.pro,
    ];
  }

  return data as PlanConfig[];
}

export async function fetchShopSubscription(
  shopId: string,
  ownerId: string
): Promise<Subscription | null> {
  if (!isSupabaseConfigured || !supabase) {
    return localGetShopSubscription(shopId, ownerId);
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('shop_id', shopId)
    .maybeSingle();

  if (error) {
    logAppError('fetchShopSubscription', error, { shopId });
    throw new Error(normalizeAppError(error, 'Unable to load subscription details.'));
  }

  return (data as Subscription | null) ?? null;
}

export async function requestSubscriptionUpgrade(params: {
  shopId: string;
  ownerId: string;
  requestedTier: PlanTier;
  note?: string;
}): Promise<Subscription> {
  const { shopId, ownerId, requestedTier, note } = params;

  if (!isSupabaseConfigured || !supabase) {
    return localRequestSubscriptionUpgrade({
      shopId,
      ownerId,
      requestedTier,
      note,
    });
  }

  const { data, error } = await supabase.rpc('request_subscription_upgrade', {
    p_shop_id: shopId,
    p_requested_tier: requestedTier,
    p_note: note?.trim() || null,
  });

  if (error) {
    logAppError('requestSubscriptionUpgrade', error, { shopId, requestedTier });
    throw new Error(normalizeAppError(error, 'Unable to submit upgrade request.'));
  }

  return data as Subscription;
}
