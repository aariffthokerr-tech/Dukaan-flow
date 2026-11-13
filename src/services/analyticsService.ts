import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Order, OrderStatus, Product, ShopAnalyticsData } from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { localGetShopAnalytics } from './localPreviewStore';

export async function fetchShopAnalytics(
  shopId: string,
  ownerId: string
): Promise<ShopAnalyticsData> {
  if (!isSupabaseConfigured || !supabase) {
    return localGetShopAnalytics(shopId, ownerId);
  }

  const [productsRes, categoriesRes, ordersRes] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, slug, is_active, is_featured, stock_quantity, low_stock_threshold, view_count, created_at, updated_at'
      )
      .eq('shop_id', shopId),
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, status, total_cents, created_at')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false }),
  ]);

  if (productsRes.error) {
    logAppError('fetchShopAnalytics.products', productsRes.error, { shopId });
    throw new Error(normalizeAppError(productsRes.error, 'Unable to load product analytics.'));
  }
  if (categoriesRes.error) {
    logAppError('fetchShopAnalytics.categories', categoriesRes.error, { shopId });
    throw new Error(normalizeAppError(categoriesRes.error, 'Unable to load category analytics.'));
  }
  if (ordersRes.error) {
    logAppError('fetchShopAnalytics.orders', ordersRes.error, { shopId });
    throw new Error(normalizeAppError(ordersRes.error, 'Unable to load enquiry analytics.'));
  }

  const products = (productsRes.data ?? []) as Array<
    Pick<
      Product,
      | 'id'
      | 'name'
      | 'slug'
      | 'is_active'
      | 'is_featured'
      | 'stock_quantity'
      | 'low_stock_threshold'
      | 'view_count'
      | 'created_at'
      | 'updated_at'
    >
  >;

  const orders = (ordersRes.data ?? []) as Array<
    Pick<Order, 'id' | 'order_number' | 'customer_name' | 'status' | 'total_cents' | 'created_at'>
  >;

  const statusBreakdown: Record<OrderStatus, number> = {
    new: 0,
    contacted: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  let estimatedEnquiryValueCents = 0;
  for (const order of orders) {
    statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
    if (order.status !== 'cancelled') {
      estimatedEnquiryValueCents += order.total_cents;
    }
  }

  const mostViewedProducts = products
    .filter((p) => (p.view_count ?? 0) > 0)
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      view_count: p.view_count ?? 0,
    }));

  const recentActivity: ShopAnalyticsData['recentActivity'] = [
    ...orders.slice(0, 6).map((o) => ({
      id: `order-${o.id}`,
      type: 'order' as const,
      title: `Enquiry ${o.order_number} from ${o.customer_name}`,
      subtitle: `Status: ${o.status}`,
      timestamp: o.created_at,
    })),
    ...products
      .slice()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6)
      .map((p) => ({
        id: `prod-${p.id}`,
        type: 'product' as const,
        title: `${p.created_at === p.updated_at ? 'Product added' : 'Product updated'}: ${p.name}`,
        subtitle: p.is_active ? 'Active in catalog' : 'Hidden from storefront',
        timestamp: p.updated_at,
      })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.is_active).length,
    inactiveProducts: products.filter((p) => !p.is_active).length,
    featuredProducts: products.filter((p) => p.is_featured).length,
    lowStockProducts: products.filter(
      (p) => p.stock_quantity <= p.low_stock_threshold
    ).length,
    totalCategories: categoriesRes.count ?? 0,
    totalEnquiries: orders.length,
    estimatedEnquiryValueCents,
    statusBreakdown,
    mostViewedProducts,
    recentActivity,
  };
}
