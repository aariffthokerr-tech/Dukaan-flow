import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { ProductImage, ProductWithDetails, PublicStorefrontData } from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { localGetPublicStorefront, localRecordProductView } from './localPreviewStore';
import { getProductImagePublicUrl } from './storageService';

export async function fetchPublicStorefront(
  slug: string
): Promise<PublicStorefrontData | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  if (!isSupabaseConfigured || !supabase) {
    return localGetPublicStorefront(cleanSlug);
  }

  const { data, error } = await supabase.rpc('get_public_storefront', {
    p_slug: cleanSlug,
  });

  if (error) {
    logAppError('fetchPublicStorefront', error, { slug: cleanSlug });
    throw new Error(normalizeAppError(error, 'Unable to load storefront.'));
  }

  if (!data) {
    return null;
  }

  const payload = data as PublicStorefrontData;

  const hydratedShop = {
    ...payload.shop,
    logo_url: payload.shop.logo_path
      ? getProductImagePublicUrl(payload.shop.logo_path)
      : null,
  };

  const hydratedProducts: ProductWithDetails[] = (payload.products ?? []).map((product) => ({
    ...product,
    images: (product.images ?? []).map((img: ProductImage) => ({
      ...img,
      public_url: getProductImagePublicUrl(img.storage_path),
    })),
  }));

  return {
    shop: hydratedShop,
    categories: payload.categories ?? [],
    products: hydratedProducts,
  };
}

export async function recordProductView(
  shopSlug: string,
  productSlug: string
): Promise<void> {
  const cleanShop = shopSlug.trim().toLowerCase();
  const cleanProd = productSlug.trim().toLowerCase();
  if (!cleanShop || !cleanProd) return;

  if (!isSupabaseConfigured || !supabase) {
    localRecordProductView(cleanShop, cleanProd);
    return;
  }

  const { error } = await supabase.rpc('record_product_view', {
    p_shop_slug: cleanShop,
    p_product_slug: cleanProd,
  });

  if (error) {
    logAppError('recordProductView', error, { shopSlug: cleanShop, productSlug: cleanProd });
  }
}
