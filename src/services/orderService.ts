import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  CreatePublicEnquiryInput,
  OrderItem,
  OrderStatus,
  OrderWithItems,
  PublicEnquiryConfirmation,
} from '../types/database';
import {
  localCreatePublicWhatsAppEnquiry,
  localListShopOrders,
  localUpdateOrderStatus,
} from './localPreviewStore';

export async function createPublicWhatsAppEnquiry(
  input: CreatePublicEnquiryInput
): Promise<PublicEnquiryConfirmation> {
  if (!isSupabaseConfigured || !supabase) {
    return localCreatePublicWhatsAppEnquiry(input);
  }

  const { data, error } = await supabase.rpc('create_public_whatsapp_enquiry', {
    p_shop_slug: input.shopSlug.trim().toLowerCase(),
    p_customer_name: input.customerName.trim(),
    p_customer_phone: input.customerPhone?.trim() || null,
    p_notes: input.notes?.trim() || null,
    p_items: input.items,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as PublicEnquiryConfirmation;
}

export async function listShopOrders(
  shopId: string,
  ownerId: string
): Promise<OrderWithItems[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localListShopOrders(shopId, ownerId);
  }

  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  if (ordersErr) {
    throw new Error(ordersErr.message);
  }

  const orders = (ordersData ?? []) as OrderWithItems[];
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: itemsData, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('shop_id', shopId)
    .in('order_id', orderIds)
    .order('created_at', { ascending: true });

  if (itemsErr) {
    throw new Error(itemsErr.message);
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of (itemsData ?? []) as OrderItem[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function updateShopOrderStatus(
  shopId: string,
  ownerId: string,
  orderId: string,
  status: OrderStatus
): Promise<OrderWithItems> {
  if (!isSupabaseConfigured || !supabase) {
    return localUpdateOrderStatus(shopId, ownerId, orderId, status);
  }

  const { data: updatedOrder, error: updateErr } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('shop_id', shopId)
    .select('*')
    .single();

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  const { data: itemsData, error: itemsErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('shop_id', shopId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (itemsErr) {
    throw new Error(itemsErr.message);
  }

  return {
    ...(updatedOrder as OrderWithItems),
    items: (itemsData ?? []) as OrderItem[],
  };
}
