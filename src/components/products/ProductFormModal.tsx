import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  createProduct,
  updateProduct,
} from '../../services/productService';
import {
  deleteProductImage,
  replaceProductImage,
  setPrimaryProductImage,
  uploadProductImages,
} from '../../services/storageService';
import type {
  CategoryWithCount,
  ProductFormInput,
  ProductImage,
  ProductMutationPayload,
  ProductWithDetails,
} from '../../types/database';
import {
  formatCentsToInputString,
  parseCurrencyToCents,
  validateProductInput,
} from '../../utils/validation';
import {
  ProductImageManager,
  type PendingUploadFile,
} from './ProductImageManager';

interface ProductFormModalProps {
  isOpen: boolean;
  shopId: string;
  ownerId: string;
  categories: CategoryWithCount[];
  editingProduct: ProductWithDetails | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const EMPTY_FORM: ProductFormInput = {
  name: '',
  description: '',
  regularPrice: '',
  salePrice: '',
  sku: '',
  stockQuantity: '0',
  lowStockThreshold: '5',
  categoryId: '',
  isActive: true,
  isFeatured: false,
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  shopId,
  ownerId,
  categories,
  editingProduct,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<ProductFormInput>(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingUploadFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        description: editingProduct.description ?? '',
        regularPrice: formatCentsToInputString(editingProduct.price_cents),
        salePrice: formatCentsToInputString(editingProduct.sale_price_cents),
        sku: editingProduct.sku ?? '',
        stockQuantity: String(editingProduct.stock_quantity),
        lowStockThreshold: String(editingProduct.low_stock_threshold),
        categoryId: editingProduct.category_id ?? '',
        isActive: editingProduct.is_active,
        isFeatured: editingProduct.is_featured,
      });
      setExistingImages(editingProduct.images);
    } else {
      setForm({
        ...EMPTY_FORM,
        categoryId: categories[0]?.id ?? '',
      });
      setExistingImages([]);
    }
    setPendingFiles([]);
    setErrors({});
    setServerError(null);
    setUploadProgress(null);
  }, [isOpen, editingProduct, categories]);

  useEffect(() => {
    return () => {
      pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [pendingFiles]);

  if (!isOpen) return null;

  const handleAddPending = (files: PendingUploadFile[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleRemovePending = (pendingId: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === pendingId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== pendingId);
    });
  };

  const handleSetPrimaryExisting = async (image: ProductImage) => {
    if (!editingProduct) return;
    await setPrimaryProductImage({
      shopId,
      ownerId,
      productId: editingProduct.id,
      imageId: image.id,
    });
    setExistingImages((prev) =>
      prev.map((item) => ({
        ...item,
        is_primary: item.id === image.id,
      }))
    );
    await onSaved();
  };

  const handleReplaceExisting = async (image: ProductImage, newFile: File) => {
    if (!editingProduct) return;
    const updated = await replaceProductImage({
      shopId,
      ownerId,
      productId: editingProduct.id,
      imageId: image.id,
      oldStoragePath: image.storage_path,
      newFile,
    });
    setExistingImages((prev) =>
      prev.map((item) => (item.id === image.id ? updated : item))
    );
    await onSaved();
  };

  const handleDeleteExisting = async (image: ProductImage) => {
    if (!editingProduct) return;
    await deleteProductImage({
      shopId,
      ownerId,
      productId: editingProduct.id,
      imageId: image.id,
      storagePath: image.storage_path,
    });
    setExistingImages((prev) => {
      const remaining = prev.filter((item) => item.id !== image.id);
      if (image.is_primary && remaining.length > 0 && !remaining.some((r) => r.is_primary)) {
        remaining[0] = { ...remaining[0], is_primary: true };
      }
      return remaining;
    });
    await onSaved();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateProductInput(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const regularCents = parseCurrencyToCents(form.regularPrice);
    if (regularCents === null || regularCents <= 0) {
      setErrors({ regularPrice: 'Regular price must be greater than zero.' });
      return;
    }

    const saleCents = form.salePrice.trim()
      ? parseCurrencyToCents(form.salePrice)
      : null;

    const payload: ProductMutationPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: regularCents,
      sale_price_cents: saleCents,
      sku: form.sku.trim() || null,
      stock_quantity: Number(form.stockQuantity.trim()),
      low_stock_threshold: form.lowStockThreshold.trim()
        ? Number(form.lowStockThreshold.trim())
        : 5,
      category_id: form.categoryId || null,
      is_active: form.isActive,
      is_featured: form.isFeatured,
    };

    setErrors({});
    setIsSaving(true);

    try {
      let targetProductId = editingProduct?.id;

      if (editingProduct) {
        await updateProduct(shopId, ownerId, editingProduct.id, payload);
      } else {
        const created = await createProduct(shopId, ownerId, payload);
        targetProductId = created.id;
      }

      if (targetProductId && pendingFiles.length > 0) {
        setUploadProgress({ completed: 0, total: pendingFiles.length });
        await uploadProductImages({
          shopId,
          ownerId,
          productId: targetProductId,
          files: pendingFiles.map((p) => p.file),
          onProgress: (completed, total) => setUploadProgress({ completed, total }),
        });
      }

      await onSaved();
      onClose();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Unable to save product.'
      );
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="product-form-title"
              className="font-display text-lg font-bold text-neutral-900"
            >
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {editingProduct
                ? 'Update product pricing, inventory, and images.'
                : 'Add a new item to your shop catalog.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product form"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          noValidate
          className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5"
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className="block text-sm font-medium text-neutral-800">
                Product name
              </label>
              <input
                id="prod-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Copper Modular Switch 16A"
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label
                htmlFor="prod-category"
                className="block text-sm font-medium text-neutral-800"
              >
                Category
              </label>
              <select
                id="prod-category"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-sku" className="block text-sm font-medium text-neutral-800">
                SKU (unique per shop)
              </label>
              <input
                id="prod-sku"
                type="text"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="e.g. ELEC-SW-16A"
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
            </div>

            <div>
              <label
                htmlFor="prod-regular-price"
                className="block text-sm font-medium text-neutral-800"
              >
                Regular price (₹)
              </label>
              <input
                id="prod-regular-price"
                type="text"
                inputMode="decimal"
                value={form.regularPrice}
                onChange={(e) => setForm((f) => ({ ...f, regularPrice: e.target.value }))}
                placeholder="e.g. 299"
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {errors.regularPrice && (
                <p className="mt-1 text-xs text-red-600">{errors.regularPrice}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="prod-sale-price"
                className="block text-sm font-medium text-neutral-800"
              >
                Sale price (₹, optional)
              </label>
              <input
                id="prod-sale-price"
                type="text"
                inputMode="decimal"
                value={form.salePrice}
                onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                placeholder="Optional discounted price"
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {errors.salePrice && (
                <p className="mt-1 text-xs text-red-600">{errors.salePrice}</p>
              )}
            </div>

            <div>
              <label htmlFor="prod-stock" className="block text-sm font-medium text-neutral-800">
                Stock quantity
              </label>
              <input
                id="prod-stock"
                type="number"
                min={0}
                step={1}
                value={form.stockQuantity}
                onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {errors.stockQuantity && (
                <p className="mt-1 text-xs text-red-600">{errors.stockQuantity}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="prod-low-stock"
                className="block text-sm font-medium text-neutral-800"
              >
                Low stock alert threshold
              </label>
              <input
                id="prod-low-stock"
                type="number"
                min={0}
                step={1}
                value={form.lowStockThreshold}
                onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
                className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {errors.lowStockThreshold && (
                <p className="mt-1 text-xs text-red-600">{errors.lowStockThreshold}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="prod-description"
                className="block text-sm font-medium text-neutral-800"
              >
                Description
              </label>
              <textarea
                id="prod-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Specifications, dimensions, warranty, or pack details..."
                className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-b border-neutral-200 py-4">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
              />
              <span>Active (visible on storefront)</span>
            </label>

            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
              />
              <span>Featured product</span>
            </label>
          </div>

          <ProductImageManager
            existingImages={existingImages}
            pendingFiles={pendingFiles}
            onAddPendingFiles={handleAddPending}
            onRemovePendingFile={handleRemovePending}
            onSetPrimaryExisting={editingProduct ? handleSetPrimaryExisting : undefined}
            onReplaceExisting={editingProduct ? handleReplaceExisting : undefined}
            onDeleteExisting={editingProduct ? handleDeleteExisting : undefined}
            uploadProgress={uploadProgress}
            disabled={isSaving}
          />

          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-neutral-200 bg-white pt-4 pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] rounded-lg bg-[#111315] px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSaving
                ? 'Saving...'
                : editingProduct
                  ? 'Save Product'
                  : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
