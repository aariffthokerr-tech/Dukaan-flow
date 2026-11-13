import React, { useState } from 'react';
import { Check, Edit3, FolderTree, Plus, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useShopCatalog } from '../hooks/useShopCatalog';
import {
  createCategory,
  deleteCategory,
  renameCategory,
} from '../services/categoryService';
import type { CategoryWithCount } from '../types/database';
import { validateCategoryName } from '../utils/validation';

export const DashboardCategoriesPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const { categories, isLoading, error, reload } = useShopCatalog();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [rowError, setRowError] = useState<string | null>(null);
  const [isSavingRename, setIsSavingRename] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !profile) return;

    const check = validateCategoryName(newCategoryName);
    if (!check.valid) {
      setCreateError(check.errors.name || 'Invalid category name.');
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    try {
      await createCategory(shop.id, profile.id, newCategoryName);
      setNewCategoryName('');
      await reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setRowError(null);
  };

  const handleRename = async (categoryId: string) => {
    if (!shop || !profile) return;

    const check = validateCategoryName(editingName);
    if (!check.valid) {
      setRowError(check.errors.name || 'Invalid category name.');
      return;
    }

    setRowError(null);
    setIsSavingRename(true);
    try {
      await renameCategory(shop.id, profile.id, categoryId, editingName);
      setEditingId(null);
      await reload();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Unable to rename category.');
    } finally {
      setIsSavingRename(false);
    }
  };

  const openDeleteModal = (cat: CategoryWithCount) => {
    const alternatives = categories.filter((c) => c.id !== cat.id);
    setDeleteTarget(cat);
    setReassignTargetId(alternatives[0]?.id ?? '');
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!shop || !profile || !deleteTarget) return;

    if (deleteTarget.productCount > 0 && !reassignTargetId) {
      setDeleteError(
        'Select another category to reassign existing products before deleting this category.'
      );
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteCategory(
        shop.id,
        profile.id,
        deleteTarget.id,
        deleteTarget.productCount > 0 ? reassignTargetId : null
      );
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  const reassignmentOptions = deleteTarget
    ? categories.filter((c) => c.id !== deleteTarget.id)
    : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Categories
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Organize products in {shop?.name ?? 'your shop'}. Categories containing products
            require reassignment before deletion.
          </p>
        </div>

        <Link
          to="/dashboard/products"
          className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 self-start sm:self-auto whitespace-nowrap"
        >
          Back to Products
        </Link>
      </div>

      {/* Create Category Form */}
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3"
      >
        <label htmlFor="new-category-name" className="block text-sm font-medium text-neutral-800">
          Add new category
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="new-category-name"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Lighting & Fixtures"
            className="flex-1 min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{isCreating ? 'Adding...' : 'Add Category'}</span>
          </button>
        </div>
        {createError && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {createError}
          </p>
        )}
      </form>

      {(error || rowError) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {error || rowError}
        </div>
      )}

      {/* Categories List */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 w-full animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-6">
            <EmptyState
              borderless
              icon={FolderTree}
              title="No categories found"
              description="Add your first category above to organize products for your storefront."
            />
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;
              return (
                <div
                  key={cat.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        aria-label="Rename category"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 min-h-[40px] rounded-lg border border-emerald-700 px-3 py-1.5 text-sm text-neutral-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isSavingRename}
                        onClick={() => void handleRename(cat.id)}
                        aria-label={`Save rename for ${cat.name}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isSavingRename}
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel rename"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-neutral-900">
                        {cat.name}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        <span className="font-mono">/{cat.slug}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">
                          {cat.productCount} product{cat.productCount === 1 ? '' : 's'}
                        </span>
                      </p>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(cat)}
                        aria-label={`Rename ${cat.name}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Rename</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(cat)}
                        aria-label={`Delete ${cat.name}`}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safe Category Deletion Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-category-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6">
            <h3
              id="delete-category-title"
              className="font-display text-lg font-bold text-neutral-900"
            >
              Delete "{deleteTarget.name}"?
            </h3>

            {deleteTarget.productCount > 0 ? (
              <div className="mt-3 space-y-4">
                <p className="text-sm text-neutral-600 leading-relaxed">
                  This category currently contains{' '}
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {deleteTarget.productCount}
                  </span>{' '}
                  product{deleteTarget.productCount === 1 ? '' : 's'}. Select another category
                  to reassign them before deletion.
                </p>

                {reassignmentOptions.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                    Create at least one other category first so existing products can be
                    reassigned safely.
                  </p>
                ) : (
                  <div>
                    <label
                      htmlFor="reassign-category-select"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Reassign products to
                    </label>
                    <select
                      id="reassign-category-select"
                      value={reassignTargetId}
                      onChange={(e) => setReassignTargetId(e.target.value)}
                      className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none"
                    >
                      {reassignmentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                This category has no assigned products and can be removed safely.
              </p>
            )}

            {deleteError && (
              <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="min-h-[42px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isDeleting ||
                  (deleteTarget.productCount > 0 && reassignmentOptions.length === 0)
                }
                onClick={() => void handleConfirmDelete()}
                className="min-h-[42px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting
                  ? 'Deleting...'
                  : deleteTarget.productCount > 0
                    ? 'Reassign & Delete'
                    : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
