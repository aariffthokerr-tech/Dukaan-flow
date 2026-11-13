import React, { useEffect, useMemo, useState } from 'react';
import {
  Edit3,
  Eye,
  EyeOff,
  Minus,
  Package,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { useAuth } from '../hooks/useAuth';
import { useShopCatalog } from '../hooks/useShopCatalog';
import {
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
  updateProductStock,
} from '../services/productService';
import type { ProductWithDetails } from '../types/database';
import { formatCurrencyFromCents } from '../utils/formatters';

type StatusFilter = 'all' | 'active' | 'inactive' | 'featured' | 'low_stock';
const PRODUCTS_PAGE_SIZE = 12;

export const DashboardProductsPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const { products, categories, isLoading, error, reload } = useShopCatalog();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithDetails | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProduct(null);
      setIsFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (query) {
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSku = (p.sku ?? '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku) return false;
      }

      if (categoryFilter === 'uncategorized') {
        if (p.category_id !== null) return false;
      } else if (categoryFilter !== 'all') {
        if (p.category_id !== categoryFilter) return false;
      }

      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (statusFilter === 'featured' && !p.is_featured) return false;
      if (statusFilter === 'low_stock' && p.stock_quantity > p.low_stock_threshold) {
        return false;
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PAGE_SIZE;
    return filteredProducts.slice(start, start + PRODUCTS_PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const openAddModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditModal = (product: ProductWithDetails) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (product: ProductWithDetails) => {
    if (!shop || !profile) return;
    setActionError(null);
    setBusyProductId(product.id);
    try {
      await toggleProductActive(shop.id, profile.id, product.id, !product.is_active);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setBusyProductId(null);
    }
  };

  const handleToggleFeatured = async (product: ProductWithDetails) => {
    if (!shop || !profile) return;
    setActionError(null);
    setBusyProductId(product.id);
    try {
      await toggleProductFeatured(shop.id, profile.id, product.id, !product.is_featured);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update featured status.');
    } finally {
      setBusyProductId(null);
    }
  };

  const handleAdjustStock = async (product: ProductWithDetails, delta: number) => {
    if (!shop || !profile) return;
    const nextStock = product.stock_quantity + delta;
    if (nextStock < 0) return;

    setActionError(null);
    setBusyProductId(product.id);
    try {
      await updateProductStock(shop.id, profile.id, product.id, nextStock);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to adjust stock.');
    } finally {
      setBusyProductId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!shop || !profile || !deleteTarget) return;
    setActionError(null);
    setIsDeleting(true);
    try {
      await deleteProduct(shop.id, profile.id, deleteTarget.id);
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Product Catalog
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Manage products, pricing, stock levels, and images for {shop?.name ?? 'your shop'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/dashboard/categories"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors whitespace-nowrap"
          >
            Manage Categories
          </Link>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full min-h-[42px] rounded-lg border border-neutral-300 pl-9 pr-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              <option value="all">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-5 flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-lg bg-neutral-100 p-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Disabled' },
                { id: 'featured', label: 'Featured' },
                { id: 'low_stock', label: 'Low Stock' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[34px] flex-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {error || actionError}
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-14 w-full animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <EmptyState
            borderless
            icon={Package}
            title="No products in your catalog yet"
            description="Add your first product with pricing, stock quantity, category, and product images."
            action={
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add First Product</span>
              </button>
            }
          />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <EmptyState
            borderless
            icon={Search}
            title="No matching products"
            description="No products matched your current search query or selected filters."
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Clear Filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-medium text-neutral-500">
                    <th className="py-3 pl-5 pr-3 font-medium">Product</th>
                    <th className="py-3 px-3 font-medium">SKU</th>
                    <th className="py-3 px-3 font-medium">Category</th>
                    <th className="py-3 px-3 text-right font-medium">Price</th>
                    <th className="py-3 px-3 font-medium">Stock</th>
                    <th className="py-3 px-3 font-medium">Status</th>
                    <th className="py-3 pl-3 pr-5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                  {paginatedProducts.map((product) => {
                    const primaryImage =
                      product.images.find((i) => i.is_primary) ?? product.images[0];
                    const imageSrc =
                      primaryImage?.public_url || primaryImage?.storage_path || null;
                    const isLowStock =
                      product.stock_quantity <= product.low_stock_threshold;
                    const isBusy = busyProductId === product.id;

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-neutral-50/80 transition-colors"
                      >
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={product.name}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package
                                  className="h-4 w-4 text-neutral-400"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-neutral-900 truncate max-w-[220px]">
                                {product.name}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {product.images.length} image
                                {product.images.length === 1 ? '' : 's'}
                                {product.is_featured ? ' · Featured' : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-xs text-neutral-600 whitespace-nowrap">
                          {product.sku || '—'}
                        </td>

                        <td className="py-3.5 px-3 text-xs text-neutral-700 whitespace-nowrap">
                          {product.category?.name ?? 'Uncategorized'}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                          {product.sale_price_cents ? (
                            <div>
                              <span className="font-semibold text-neutral-900">
                                {formatCurrencyFromCents(
                                  product.sale_price_cents,
                                  product.currency
                                )}
                              </span>
                              <span className="ml-1.5 text-neutral-400 line-through">
                                {formatCurrencyFromCents(
                                  product.price_cents,
                                  product.currency
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-neutral-900">
                              {formatCurrencyFromCents(
                                product.price_cents,
                                product.currency
                              )}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy || product.stock_quantity <= 0}
                              onClick={() => void handleAdjustStock(product, -1)}
                              aria-label={`Decrease stock for ${product.name}`}
                              className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span
                              className={`min-w-[28px] text-center font-mono text-xs font-semibold tabular-nums ${
                                isLowStock ? 'text-amber-700' : 'text-neutral-900'
                              }`}
                            >
                              {product.stock_quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleAdjustStock(product, 1)}
                              aria-label={`Increase stock for ${product.name}`}
                              className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              product.is_active ? 'text-emerald-700' : 'text-neutral-500'
                            }`}
                          >
                            {product.is_active ? 'Active' : 'Disabled'}
                          </span>
                          {isLowStock && (
                            <span className="text-amber-700"> · Low stock</span>
                          )}
                        </td>

                        <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleFeatured(product)}
                              aria-label={
                                product.is_featured
                                  ? `Unfeature ${product.name}`
                                  : `Feature ${product.name}`
                              }
                              title={
                                product.is_featured
                                  ? 'Remove from featured'
                                  : 'Mark as featured'
                              }
                              className={`min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg transition-colors ${
                                product.is_featured
                                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                  : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
                              }`}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  product.is_featured ? 'fill-amber-500' : ''
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleActive(product)}
                              aria-label={
                                product.is_active
                                  ? `Disable ${product.name}`
                                  : `Enable ${product.name}`
                              }
                              title={product.is_active ? 'Disable product' : 'Enable product'}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              {product.is_active ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              aria-label={`Edit ${product.name}`}
                              title="Edit product"
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(product)}
                              aria-label={`Delete ${product.name}`}
                              title="Delete product"
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-neutral-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Responsive Product Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedProducts.map((product) => {
              const primaryImage =
                product.images.find((i) => i.is_primary) ?? product.images[0];
              const imageSrc =
                primaryImage?.public_url || primaryImage?.storage_path || null;
              const isLowStock = product.stock_quantity <= product.low_stock_threshold;
              const isBusy = busyProductId === product.id;

              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-semibold text-neutral-900 truncate">
                          {product.name}
                        </h3>
                        <span className="font-mono text-sm font-semibold text-neutral-900 tabular-nums shrink-0">
                          {formatCurrencyFromCents(
                            product.sale_price_cents ?? product.price_cents,
                            product.currency
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-neutral-500 truncate">
                        {product.category?.name ?? 'Uncategorized'}
                        {product.sku ? ` · ${product.sku}` : ''}
                      </p>

                      <p className="mt-1 text-xs">
                        <span
                          className={
                            product.is_active
                              ? 'font-medium text-emerald-700'
                              : 'font-medium text-neutral-500'
                          }
                        >
                          {product.is_active ? 'Active' : 'Disabled'}
                        </span>
                        {product.is_featured ? (
                          <span className="text-amber-700"> · Featured</span>
                        ) : null}
                        {isLowStock ? (
                          <span className="text-amber-700"> · Low stock</span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-xs text-neutral-500">Qty:</span>
                      <button
                        type="button"
                        disabled={isBusy || product.stock_quantity <= 0}
                        onClick={() => void handleAdjustStock(product, -1)}
                        aria-label={`Decrease stock for ${product.name}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[24px] text-center font-mono text-xs font-semibold tabular-nums">
                        {product.stock_quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleAdjustStock(product, 1)}
                        aria-label={`Increase stock for ${product.name}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleFeatured(product)}
                        aria-label={
                          product.is_featured
                            ? `Unfeature ${product.name}`
                            : `Feature ${product.name}`
                        }
                        className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border ${
                          product.is_featured
                            ? 'border-amber-200 bg-amber-50 text-amber-600'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 ${product.is_featured ? 'fill-amber-500' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleActive(product)}
                        aria-label={
                          product.is_active
                            ? `Disable ${product.name}`
                            : `Enable ${product.name}`
                        }
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-700"
                      >
                        {product.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        aria-label={`Edit ${product.name}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-700"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(product)}
                        aria-label={`Delete ${product.name}`}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-xs text-neutral-600">
              <span className="tabular-nums">
                Page {currentPage} of {totalPages} ({filteredProducts.length} products)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="min-h-[38px] rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-[38px] rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {shop && profile && (
        <ProductFormModal
          isOpen={isFormOpen}
          shopId={shop.id}
          ownerId={profile.id}
          categories={categories}
          editingProduct={editingProduct}
          onClose={() => setIsFormOpen(false)}
          onSaved={reload}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6">
            <h3
              id="delete-product-title"
              className="font-display text-lg font-bold text-neutral-900"
            >
              Delete product?
            </h3>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              This will permanently remove{' '}
              <span className="font-semibold text-neutral-900">{deleteTarget.name}</span> and
              all of its uploaded product images from storage.
            </p>
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
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
                className="min-h-[42px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
