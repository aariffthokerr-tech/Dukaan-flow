import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { DashboardSnapshot, Order, Subscription } from '../types/database';
import { localGetDashboardSnapshot } from './localPreviewStore';

export async function fetchDashboardSnapshot(
  shopId: string,
  ownerId: string
): Promise<DashboardSnapshot> {
  if (!isSupabaseConfigured || !supabase) {
    return localGetDashboardSnapshot(shopId, ownerId);
  }

  // All queries are protected by RLS + explicit shop_id filter derived from authenticated owner's shop
  const [
    totalProductsRes,
    activeProductsRes,
    totalEnquiriesRes,
    newEnquiriesRes,
    confirmedOrdersRes,
    completedOrdersRes,
    productStockRes,
    totalCategoriesRes,
    recentOrdersRes,
    subscriptionRes,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('status', 'new'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('status', 'confirmed'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('status', 'completed'),
    supabase
      .from('products')
      .select('stock_quantity, low_stock_threshold')
      .eq('shop_id', shopId),
    supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId),
    supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('shop_id', shopId)
      .maybeSingle(),
  ]);

  if (totalProductsRes.error) throw new Error(totalProductsRes.error.message);
  if (activeProductsRes.error) throw new Error(activeProductsRes.error.message);
  if (totalEnquiriesRes.error) throw new Error(totalEnquiriesRes.error.message);
  if (newEnquiriesRes.error) throw new Error(newEnquiriesRes.error.message);
  if (confirmedOrdersRes.error) throw new Error(confirmedOrdersRes.error.message);
  if (completedOrdersRes.error) throw new Error(completedOrdersRes.error.message);
  if (productStockRes.error) throw new Error(productStockRes.error.message);
  if (totalCategoriesRes.error) throw new Error(totalCategoriesRes.error.message);
  if (recentOrdersRes.error) throw new Error(recentOrdersRes.error.message);
  if (subscriptionRes.error) throw new Error(subscriptionRes.error.message);

  const lowStockCount = (productStockRes.data || []).filter(
    (item) => item.stock_quantity <= item.low_stock_threshold
  ).length;

  return {
    metrics: {
      totalProducts: totalProductsRes.count ?? 0,
      activeProducts: activeProductsRes.count ?? 0,
      lowStockProducts: lowStockCount,
      totalCategories: totalCategoriesRes.count ?? 0,
      totalEnquiries: totalEnquiriesRes.count ?? 0,
      newEnquiries: newEnquiriesRes.count ?? 0,
      confirmedOrders: confirmedOrdersRes.count ?? 0,
      completedOrders: completedOrdersRes.count ?? 0,
    },
    recentOrders: (recentOrdersRes.data as Order[]) ?? [],
    subscription: (subscriptionRes.data as Subscription | null) ?? null,
  };
}
