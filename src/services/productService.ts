import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  PRODUCT_IMAGE_BUCKET,
  type Category,
  type Product,
  type ProductImage,
  type ProductMutationPayload,
  type ProductWithDetails,
} from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { slugifyCategoryOrProduct } from '../utils/validation';
import {
  localCreateProduct,
  localDeleteProduct,
  localListProducts,
  localPatchProductFlags,
  localUpdateProduct,
} from './localPreviewStore';
import { getProductImagePublicUrl } from './storageService';

async function assertSupabaseShopOwnership(shopId: string, ownerId: string): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Unauthorized shop access.');
  }
}

async function generateUniqueProductSlug(
  shopId: string,
  name: string,
  excludeProductId?: string
): Promise<string> {
  const base = slugifyCategoryOrProduct(name, 'product');
  if (!supabase) return base;

  let candidate = base;
  let counter = 2;
  while (counter < 50) {
    let query = supabase
      .from('products')
      .select('id')
      .eq('shop_id', shopId)
      .eq('slug', candidate);

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return `${base}-${Date.now()}`;
}

async function assertSkuUnique(
  shopId: string,
  sku: string | null,
  excludeProductId?: string
): Promise<void> {
  if (!sku || !sku.trim() || !supabase) return;
  const cleanSku = sku.trim();

  let query = supabase
    .from('products')
    .select('id')
    .eq('shop_id', shopId)
    .ilike('sku', cleanSku);

  if (excludeProductId) {
    query = query.neq('id', excludeProductId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    throw new Error(`SKU "${cleanSku}" is already assigned to another product in your shop.`);
  }
}

export async function listProducts(
  shopId: string,
  ownerId: string
): Promise<ProductWithDetails[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localListProducts(shopId, ownerId);
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const [productsRes, categoriesRes, imagesRes] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*').eq('shop_id', shopId),
    supabase
      .from('product_images')
      .select('*')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true }),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  if (imagesRes.error) throw new Error(imagesRes.error.message);

  const categoryMap = new Map<string, Category>();
  for (const c of (categoriesRes.data as Category[]) ?? []) {
    categoryMap.set(c.id, c);
  }

  const imageMap = new Map<string, ProductImage[]>();
  for (const img of (imagesRes.data as ProductImage[]) ?? []) {
    const hydrated: ProductImage = {
      ...img,
      public_url: getProductImagePublicUrl(img.storage_path),
    };
    const arr = imageMap.get(img.product_id) ?? [];
    arr.push(hydrated);
    imageMap.set(img.product_id, arr);
  }

  return ((productsRes.data as Product[]) ?? []).map((prod) => {
    const prodImages = (imageMap.get(prod.id) ?? []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
    );
    return {
      ...prod,
      category: prod.category_id ? categoryMap.get(prod.category_id) ?? null : null,
      images: prodImages,
    };
  });
}

export async function createProduct(
  shopId: string,
  ownerId: string,
  payload: ProductMutationPayload
): Promise<ProductWithDetails> {
  if (!isSupabaseConfigured || !supabase) {
    return localCreateProduct(shopId, ownerId, payload);
  }

  await assertSupabaseShopOwnership(shopId, ownerId);
  await assertSkuUnique(shopId, payload.sku);

  if (payload.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', payload.category_id)
      .eq('shop_id', shopId)
      .maybeSingle();
    if (!cat) {
      throw new Error('Selected category does not belong to your shop.');
    }
  }

  const slug = await generateUniqueProductSlug(shopId, payload.name);

  const { data, error } = await supabase
    .from('products')
    .insert({
      shop_id: shopId,
      category_id: payload.category_id,
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() || null,
      sku: payload.sku?.trim() || null,
      price_cents: payload.price_cents,
      sale_price_cents: payload.sale_price_cents,
      compare_at_price_cents: payload.sale_price_cents ? payload.price_cents : null,
      currency: 'INR',
      stock_quantity: payload.stock_quantity,
      low_stock_threshold: payload.low_stock_threshold,
      is_active: payload.is_active,
      is_featured: payload.is_featured,
    })
    .select('*')
    .single();

  if (error) {
    logAppError('createProduct', error, { shopId });
    throw new Error(normalizeAppError(error, 'Unable to create product.'));
  }

  const created = data as Product;
  return {
    ...created,
    category: null,
    images: [],
  };
}

export async function updateProduct(
  shopId: string,
  ownerId: string,
  productId: string,
  payload: ProductMutationPayload
): Promise<ProductWithDetails> {
  if (!isSupabaseConfigured || !supabase) {
    return localUpdateProduct(shopId, ownerId, productId, payload);
  }

  await assertSupabaseShopOwnership(shopId, ownerId);
  await assertSkuUnique(shopId, payload.sku, productId);

  if (payload.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', payload.category_id)
      .eq('shop_id', shopId)
      .maybeSingle();
    if (!cat) {
      throw new Error('Selected category does not belong to your shop.');
    }
  }

  const slug = await generateUniqueProductSlug(shopId, payload.name, productId);

  const { data, error } = await supabase
    .from('products')
    .update({
      category_id: payload.category_id,
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() || null,
      sku: payload.sku?.trim() || null,
      price_cents: payload.price_cents,
      sale_price_cents: payload.sale_price_cents,
      compare_at_price_cents: payload.sale_price_cents ? payload.price_cents : null,
      stock_quantity: payload.stock_quantity,
      low_stock_threshold: payload.low_stock_threshold,
      is_active: payload.is_active,
      is_featured: payload.is_featured,
    })
    .eq('id', productId)
    .eq('shop_id', shopId)
    .select('*')
    .single();

  if (error) {
    logAppError('updateProduct', error, { shopId, productId });
    throw new Error(normalizeAppError(error, 'Unable to update product.'));
  }

  const updated = data as Product;
  return {
    ...updated,
    category: null,
    images: [],
  };
}

export async function deleteProduct(
  shopId: string,
  ownerId: string,
  productId: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    localDeleteProduct(shopId, ownerId, productId);
    return;
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)
    .eq('shop_id', shopId);

  const paths = (images ?? [])
    .map((img) => img.storage_path)
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('shop_id', shopId);

  if (error) {
    logAppError('deleteProduct', error, { shopId, productId });
    throw new Error(normalizeAppError(error, 'Unable to delete product.'));
  }
}

export async function toggleProductActive(
  shopId: string,
  ownerId: string,
  productId: string,
  isActive: boolean
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    localPatchProductFlags(shopId, ownerId, productId, { is_active: isActive });
    return;
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
    .eq('shop_id', shopId);

  if (error) throw new Error(error.message);
}

export async function toggleProductFeatured(
  shopId: string,
  ownerId: string,
  productId: string,
  isFeatured: boolean
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    localPatchProductFlags(shopId, ownerId, productId, { is_featured: isFeatured });
    return;
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const { error } = await supabase
    .from('products')
    .update({ is_featured: isFeatured })
    .eq('id', productId)
    .eq('shop_id', shopId);

  if (error) throw new Error(error.message);
}

export async function updateProductStock(
  shopId: string,
  ownerId: string,
  productId: string,
  stockQuantity: number
): Promise<void> {
  if (stockQuantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }

  if (!isSupabaseConfigured || !supabase) {
    localPatchProductFlags(shopId, ownerId, productId, { stock_quantity: stockQuantity });
    return;
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: stockQuantity })
    .eq('id', productId)
    .eq('shop_id', shopId);

  if (error) throw new Error(error.message);
}
