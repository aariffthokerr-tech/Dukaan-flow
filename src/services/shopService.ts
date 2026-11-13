import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Shop, ShopUpdateInput } from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { normalizeWhatsappNumber, slugifyShopName } from '../utils/validation';
import { isLocalSlugAvailable, localUpdateShop } from './localPreviewStore';

export async function checkShopSlugAvailability(slug: string): Promise<boolean> {
  const clean = slugifyShopName(slug);
  if (clean.length < 3) return false;

  if (!isSupabaseConfigured || !supabase) {
    return isLocalSlugAvailable(clean);
  }

  const { data, error } = await supabase.rpc('is_shop_slug_available', {
    p_slug: clean,
  });

  if (error) {
    return true;
  }
  return Boolean(data);
}

export async function fetchOwnedShop(ownerId: string): Promise<Shop | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Shop | null) ?? null;
}

export async function updateOwnedShop(
  ownerId: string,
  shopId: string,
  updates: ShopUpdateInput
): Promise<Shop> {
  if (!isSupabaseConfigured || !supabase) {
    return localUpdateShop(ownerId, updates);
  }

  const updatePayload: Record<string, unknown> = {
    name: updates.name.trim(),
    category: updates.category.trim(),
    whatsapp_number: normalizeWhatsappNumber(updates.whatsapp_number),
    description: updates.description?.trim() || null,
    address: updates.address?.trim() || null,
  };

  if (updates.opening_hours !== undefined) {
    updatePayload.opening_hours = updates.opening_hours?.trim() || null;
  }
  if (updates.logo_path !== undefined) {
    updatePayload.logo_path = updates.logo_path;
  }
  if (updates.is_active !== undefined) {
    updatePayload.is_active = updates.is_active;
  }

  const { data, error } = await supabase
    .from('shops')
    .update(updatePayload)
    .eq('id', shopId)
    .eq('owner_id', ownerId)
    .select('*')
    .single();

  if (error) {
    logAppError('updateOwnedShop', error, { shopId });
    throw new Error(normalizeAppError(error, 'Unable to update shop settings.'));
  }

  return data as Shop;
}
