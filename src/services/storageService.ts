import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { PRODUCT_IMAGE_BUCKET, type ProductImage } from '../types/database';
import { logAppError, normalizeAppError } from '../utils/errorHandling';
import {
  buildProductImageStoragePath,
  getExtensionFromMimeType,
  validateProductImageFileMeta,
} from '../utils/validation';
import {
  localDeleteProductImage,
  localReplaceProductImage,
  localSetPrimaryProductImage,
  localUploadProductImages,
  localUploadShopLogo,
} from './localPreviewStore';

function generateUniqueFilenameId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function verifyOwnedProduct(
  shopId: string,
  ownerId: string,
  productId: string
): Promise<void> {
  if (!supabase) return;

  const [{ data: shopRow, error: shopErr }, { data: prodRow, error: prodErr }] =
    await Promise.all([
      supabase
        .from('shops')
        .select('id')
        .eq('id', shopId)
        .eq('owner_id', ownerId)
        .maybeSingle(),
      supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .eq('shop_id', shopId)
        .maybeSingle(),
    ]);

  if (shopErr || !shopRow) {
    throw new Error('Unauthorized shop ownership check failed.');
  }
  if (prodErr || !prodRow) {
    throw new Error('Product does not belong to your shop.');
  }
}

export function getProductImagePublicUrl(storagePath: string): string {
  if (!isSupabaseConfigured || !supabase) {
    return storagePath;
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export function validateSelectedImageFiles(files: File[]): string[] {
  const errors: string[] = [];
  for (const file of files) {
    const res = validateProductImageFileMeta({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!res.valid && res.error) {
      errors.push(res.error);
    }
  }
  return errors;
}

export async function uploadProductImages(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  files: File[];
  onProgress?: (completed: number, total: number) => void;
}): Promise<ProductImage[]> {
  const { shopId, ownerId, productId, files, onProgress } = params;
  if (files.length === 0) return [];

  const fileErrors = validateSelectedImageFiles(files);
  if (fileErrors.length > 0) {
    throw new Error(fileErrors[0]);
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Image uploads require an active internet connection.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return localUploadProductImages({ shopId, ownerId, productId, files, onProgress });
  }

  await verifyOwnedProduct(shopId, ownerId, productId);

  const { data: existingImages, error: listErr } = await supabase
    .from('product_images')
    .select('id, sort_order, is_primary')
    .eq('product_id', productId)
    .eq('shop_id', shopId);

  if (listErr) {
    throw new Error(listErr.message);
  }

  let hasPrimary = (existingImages ?? []).some((img) => img.is_primary);
  let nextSort =
    (existingImages ?? []).reduce((max, img) => Math.max(max, img.sort_order), 0) + 1;

  const uploadedRecords: ProductImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const storagePath = buildProductImageStoragePath(
      shopId,
      productId,
      generateUniqueFilenameId(),
      file.type
    );

    const { error: uploadErr } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadErr) {
      logAppError('uploadProductImages.storage', uploadErr, { shopId, productId });
      throw new Error(
        `Failed to upload "${file.name}": ${normalizeAppError(uploadErr, 'Storage upload failed.')}`
      );
    }

    const { data: insertedRow, error: insertErr } = await supabase
      .from('product_images')
      .insert({
        shop_id: shopId,
        product_id: productId,
        storage_path: storagePath,
        alt_text: file.name.replace(/\.[^.]+$/, ''),
        sort_order: nextSort++,
        is_primary: !hasPrimary,
      })
      .select('*')
      .single();

    if (insertErr) {
      // Clean up orphaned storage object if metadata insert fails
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);
      logAppError('uploadProductImages.metadata', insertErr, { shopId, productId });
      throw new Error(
        normalizeAppError(insertErr, 'Failed to save image metadata.')
      );
    }

    hasPrimary = true;
    const record = insertedRow as ProductImage;
    uploadedRecords.push({
      ...record,
      public_url: getProductImagePublicUrl(record.storage_path),
    });
    onProgress?.(i + 1, files.length);
  }

  return uploadedRecords;
}

export async function replaceProductImage(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  imageId: string;
  oldStoragePath: string;
  newFile: File;
}): Promise<ProductImage> {
  const { shopId, ownerId, productId, imageId, oldStoragePath, newFile } = params;

  const validation = validateProductImageFileMeta({
    name: newFile.name,
    type: newFile.type,
    size: newFile.size,
  });
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  if (!isSupabaseConfigured || !supabase) {
    return localReplaceProductImage({ shopId, ownerId, productId, imageId, newFile });
  }

  await verifyOwnedProduct(shopId, ownerId, productId);

  const newStoragePath = buildProductImageStoragePath(
    shopId,
    productId,
    generateUniqueFilenameId(),
    newFile.type
  );

  const { error: uploadErr } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(newStoragePath, newFile, {
      contentType: newFile.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Failed to upload replacement image: ${uploadErr.message}`);
  }

  const { data: updatedRow, error: updateErr } = await supabase
    .from('product_images')
    .update({
      storage_path: newStoragePath,
      alt_text: newFile.name.replace(/\.[^.]+$/, ''),
    })
    .eq('id', imageId)
    .eq('product_id', productId)
    .eq('shop_id', shopId)
    .select('*')
    .single();

  if (updateErr) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([newStoragePath]);
    throw new Error(`Failed to update image record: ${updateErr.message}`);
  }

  if (oldStoragePath && oldStoragePath !== newStoragePath) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([oldStoragePath]);
  }

  const record = updatedRow as ProductImage;
  return {
    ...record,
    public_url: getProductImagePublicUrl(record.storage_path),
  };
}

export async function deleteProductImage(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  imageId: string;
  storagePath: string;
}): Promise<void> {
  const { shopId, ownerId, productId, imageId, storagePath } = params;

  if (!isSupabaseConfigured || !supabase) {
    localDeleteProductImage({ shopId, ownerId, productId, imageId });
    return;
  }

  await verifyOwnedProduct(shopId, ownerId, productId);

  const { data: targetRow, error: fetchErr } = await supabase
    .from('product_images')
    .select('id, is_primary')
    .eq('id', imageId)
    .eq('product_id', productId)
    .eq('shop_id', shopId)
    .single();

  if (fetchErr || !targetRow) {
    throw new Error('Image record not found.');
  }

  const { error: deleteErr } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId)
    .eq('shop_id', shopId);

  if (deleteErr) {
    throw new Error(deleteErr.message);
  }

  if (storagePath) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);
  }

  if (targetRow.is_primary) {
    const { data: nextRows } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: true })
      .limit(1);

    const nextId = nextRows?.[0]?.id;
    if (nextId) {
      await supabase.rpc('set_primary_product_image', {
        p_product_id: productId,
        p_image_id: nextId,
      });
    }
  }
}

export async function setPrimaryProductImage(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  imageId: string;
}): Promise<void> {
  const { shopId, ownerId, productId, imageId } = params;

  if (!isSupabaseConfigured || !supabase) {
    localSetPrimaryProductImage({ shopId, ownerId, productId, imageId });
    return;
  }

  await verifyOwnedProduct(shopId, ownerId, productId);

  const { error } = await supabase.rpc('set_primary_product_image', {
    p_product_id: productId,
    p_image_id: imageId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadShopLogo(params: {
  shopId: string;
  ownerId: string;
  file: File;
  previousLogoPath?: string | null;
}): Promise<{ logoPath: string; publicUrl: string }> {
  const { shopId, ownerId, file, previousLogoPath } = params;

  const validation = validateProductImageFileMeta({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid logo image file.');
  }

  if (!isSupabaseConfigured || !supabase) {
    const dataUrl = await localUploadShopLogo({ shopId, ownerId, file });
    return { logoPath: dataUrl, publicUrl: dataUrl };
  }

  const { data: shopRow, error: shopErr } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (shopErr || !shopRow) {
    throw new Error('Unauthorized shop ownership check failed.');
  }

  const ext = getExtensionFromMimeType(file.type);
  const storagePath = `${shopId}/brand/${generateUniqueFilenameId()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Failed to upload shop logo: ${uploadErr.message}`);
  }

  const { error: updateErr } = await supabase
    .from('shops')
    .update({ logo_path: storagePath })
    .eq('id', shopId)
    .eq('owner_id', ownerId);

  if (updateErr) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([storagePath]);
    throw new Error(`Failed to save shop logo: ${updateErr.message}`);
  }

  if (previousLogoPath && previousLogoPath !== storagePath && !previousLogoPath.startsWith('data:')) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([previousLogoPath]);
  }

  return {
    logoPath: storagePath,
    publicUrl: getProductImagePublicUrl(storagePath),
  };
}

