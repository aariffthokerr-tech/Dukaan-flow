import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  DEFAULT_CATALOG_CATEGORIES,
  type Category,
  type CategoryWithCount,
} from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import { slugifyCategoryOrProduct } from '../utils/validation';
import {
  localCreateCategory,
  localDeleteCategory,
  localListCategories,
  localRenameCategory,
} from './localPreviewStore';

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

export async function listCategories(
  shopId: string,
  ownerId: string
): Promise<CategoryWithCount[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localListCategories(shopId, ownerId);
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const [{ data: categoriesData, error: catError }, { data: productsData, error: prodError }] =
    await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('shop_id', shopId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase.from('products').select('id, category_id').eq('shop_id', shopId),
    ]);

  if (catError) throw new Error(catError.message);
  if (prodError) throw new Error(prodError.message);

  let categories = (categoriesData as Category[]) ?? [];

  // Seed default categories if a shop was created before the Part 2 migration trigger
  if (categories.length === 0) {
    const rows = DEFAULT_CATALOG_CATEGORIES.map((name, idx) => ({
      shop_id: shopId,
      name,
      slug: slugifyCategoryOrProduct(name, `category-${idx + 1}`),
      sort_order: idx + 1,
      is_active: true,
    }));

    const { data: inserted, error: seedError } = await supabase
      .from('categories')
      .upsert(rows, { onConflict: 'shop_id,slug' })
      .select('*');

    if (!seedError && inserted) {
      categories = (inserted as Category[]).sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      );
    }
  }

  const countMap = new Map<string, number>();
  for (const prod of productsData ?? []) {
    if (prod.category_id) {
      countMap.set(prod.category_id, (countMap.get(prod.category_id) ?? 0) + 1);
    }
  }

  return categories.map((cat) => ({
    ...cat,
    productCount: countMap.get(cat.id) ?? 0,
  }));
}

export async function createCategory(
  shopId: string,
  ownerId: string,
  name: string
): Promise<Category> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error('Category name must be at least 2 characters.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return localCreateCategory(shopId, ownerId, trimmed);
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const slug = slugifyCategoryOrProduct(trimmed, 'category');
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('shop_id', shopId)
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    throw new Error(`Category "${trimmed}" already exists in your shop.`);
  }

  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      shop_id: shopId,
      name: trimmed,
      slug,
      sort_order: nextSort,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    logAppError('createCategory', error, { shopId });
    throw new Error(normalizeAppError(error, 'Unable to create category.'));
  }

  return data as Category;
}

export async function renameCategory(
  shopId: string,
  ownerId: string,
  categoryId: string,
  newName: string
): Promise<Category> {
  const trimmed = newName.trim();
  if (trimmed.length < 2) {
    throw new Error('Category name must be at least 2 characters.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return localRenameCategory(shopId, ownerId, categoryId, trimmed);
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const slug = slugifyCategoryOrProduct(trimmed, 'category');
  const { data: duplicate } = await supabase
    .from('categories')
    .select('id')
    .eq('shop_id', shopId)
    .eq('slug', slug)
    .neq('id', categoryId)
    .maybeSingle();

  if (duplicate) {
    throw new Error(`Another category named "${trimmed}" already exists.`);
  }

  const { data, error } = await supabase
    .from('categories')
    .update({
      name: trimmed,
      slug,
    })
    .eq('id', categoryId)
    .eq('shop_id', shopId)
    .select('*')
    .single();

  if (error) {
    logAppError('renameCategory', error, { shopId, categoryId });
    throw new Error(normalizeAppError(error, 'Unable to rename category.'));
  }

  return data as Category;
}

export async function deleteCategory(
  shopId: string,
  ownerId: string,
  categoryId: string,
  reassignToCategoryId?: string | null
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    localDeleteCategory(shopId, ownerId, categoryId, reassignToCategoryId);
    return;
  }

  await assertSupabaseShopOwnership(shopId, ownerId);

  const { error } = await supabase.rpc('delete_category_with_reassignment', {
    p_category_id: categoryId,
    p_target_category_id: reassignToCategoryId || null,
  });

  if (error) {
    logAppError('deleteCategory', error, { shopId, categoryId });
    throw new Error(normalizeAppError(error, 'Unable to delete category.'));
  }
}
