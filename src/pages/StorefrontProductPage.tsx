import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EnquiryCartDrawer } from '../components/storefront/EnquiryCartDrawer';
import { StorefrontHeader } from '../components/storefront/StorefrontHeader';
import { useEnquiryCart } from '../hooks/useEnquiryCart';
import { fetchPublicStorefront, recordProductView } from '../services/storefrontService';
import type { PublicStorefrontData } from '../types/database';
import { formatCurrencyFromCents } from '../utils/formatters';
import { buildWhatsAppContactUrl } from '../utils/whatsapp';

export const StorefrontProductPage: React.FC = () => {
  const { slug = '', productSlug = '' } = useParams<{
    slug: string;
    productSlug: string;
  }>();

  const [data, setData] = useState<PublicStorefrontData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    items: cartItems,
    totalQuantity,
    subtotalCents,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    syncWithCatalog,
  } = useEnquiryCart(slug);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setActiveImageIndex(0);
    setQty(1);

    fetchPublicStorefront(slug)
      .then((res) => {
        if (!active) return;
        setData(res);
        if (res) {
          syncWithCatalog(res.products);
          const matched = res.products.find((p) => p.slug === productSlug);
          if (matched) {
            void recordProductView(slug, productSlug);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load product.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, productSlug]);

  const product = useMemo(() => {
    if (!data) return null;
    return data.products.find((p) => p.slug === productSlug) ?? null;
  }, [data, productSlug]);

  const inCartQty = useMemo(() => {
    if (!product) return 0;
    return cartItems.find((item) => item.productId === product.id)?.quantity ?? 0;
  }, [cartItems, product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="h-16 border-b border-neutral-200 bg-white" />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6 aspect-[4/3] rounded-2xl bg-neutral-200 animate-pulse" />
            <div className="lg:col-span-6 space-y-4">
              <div className="h-8 w-3/4 rounded bg-neutral-200 animate-pulse" />
              <div className="h-6 w-1/3 rounded bg-neutral-200 animate-pulse" />
              <div className="h-24 w-full rounded bg-neutral-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !product) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 space-y-4">
          <h1 className="font-display text-xl font-bold text-neutral-900">
            Product unavailable
          </h1>
          <p className="text-sm text-neutral-600">
            {error ?? 'This product is no longer listed or the storefront is inactive.'}
          </p>
          <Link
            to={data ? `/store/${data.shop.slug}` : '/'}
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#111315] px-5 py-2 text-xs font-medium text-white hover:bg-neutral-800"
          >
            {data ? `Back to ${data.shop.name}` : 'Go to DukaanFlow'}
          </Link>
        </div>
      </div>
    );
  }

  const { shop } = data;
  const images = product.images;
  const currentImage = images[activeImageIndex] ?? images[0] ?? null;
  const currentImageSrc = currentImage?.public_url || currentImage?.storage_path || null;

  const hasSale =
    product.sale_price_cents !== null &&
    product.sale_price_cents < product.price_cents;
  const effectivePriceCents = hasSale
    ? product.sale_price_cents!
    : product.price_cents;

  const remainingAddable = Math.max(0, product.stock_quantity - inCartQty);
  const outOfStock = product.stock_quantity <= 0;

  const handleAddToEnquiry = () => {
    if (outOfStock || remainingAddable <= 0) return;
    const bounded = Math.min(qty, remainingAddable);
    addItem(product, bounded);
    setQty(1);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const whatsappQuestionUrl = buildWhatsAppContactUrl(
    shop.whatsapp_number,
    shop.name
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-neutral-900">
      <StorefrontHeader
        shop={shop}
        cartCount={totalQuantity}
        onOpenCart={() => setIsCartOpen(true)}
        showSearch={false}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Link
          to={`/store/${shop.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to {shop.name}</span>
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-8">
          {/* Image Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 flex items-center justify-center">
              {currentImageSrc ? (
                <img
                  src={currentImageSrc}
                  alt={currentImage?.alt_text || product.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-12 w-12 text-neutral-400 stroke-[1.5]" />
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {images.map((img, idx) => {
                  const thumbUrl = img.public_url || img.storage_path;
                  const active = idx === activeImageIndex;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`View image ${idx + 1}`}
                      className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                        active
                          ? 'border-[#111315]'
                          : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      <img
                        src={thumbUrl}
                        alt={img.alt_text || `${product.name} thumbnail ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product Details & Enquiry Controls */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>{product.category?.name ?? 'General'}</span>
                {product.sku && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">SKU: {product.sku}</span>
                  </>
                )}
                {product.is_featured && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-emerald-700">Featured</span>
                  </>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-bold text-neutral-900 tabular-nums">
                  {formatCurrencyFromCents(effectivePriceCents, product.currency)}
                </span>
                {hasSale && (
                  <span className="font-mono text-base text-neutral-400 line-through tabular-nums">
                    {formatCurrencyFromCents(product.price_cents, product.currency)}
                  </span>
                )}
              </div>

              <div className="text-sm">
                <span
                  className={`font-medium ${
                    outOfStock
                      ? 'text-red-700'
                      : product.stock_quantity <= product.low_stock_threshold
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {outOfStock
                    ? 'Currently out of stock'
                    : `${product.stock_quantity} units available`}
                </span>
                {inCartQty > 0 && (
                  <span className="ml-2 text-xs text-neutral-500">
                    ({inCartQty} currently in your enquiry cart)
                  </span>
                )}
              </div>

              {product.description ? (
                <div className="border-t border-neutral-100 pt-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Description
                  </h2>
                  <p className="mt-2 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              ) : (
                <p className="border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                  Contact {shop.name} on WhatsApp for detailed specifications.
                </p>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-5 space-y-3">
              {!outOfStock && remainingAddable > 0 && (
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                      aria-label="Decrease quantity"
                      className="flex h-11 w-11 items-center justify-center text-neutral-700 hover:bg-neutral-50"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[36px] text-center font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQty((prev) => Math.min(remainingAddable, prev + 1))
                      }
                      disabled={qty >= remainingAddable}
                      aria-label="Increase quantity"
                      className="flex h-11 w-11 items-center justify-center text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToEnquiry}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#111315] px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
                  >
                    {addedFeedback ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Added to Enquiry</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        <span>Add to Enquiry</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {(outOfStock || remainingAddable === 0) && (
                <button
                  type="button"
                  disabled
                  className="w-full min-h-[44px] rounded-lg border border-neutral-200 bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-500 cursor-not-allowed"
                >
                  {outOfStock
                    ? 'Out of Stock'
                    : `Maximum Available Quantity (${inCartQty}) in Cart`}
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                {totalQuantity > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Review Enquiry Cart ({totalQuantity})</span>
                  </button>
                )}

                <a
                  href={whatsappQuestionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-700" />
                  <span>Ask Shop on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <EnquiryCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        shop={shop}
        items={cartItems}
        subtotalCents={subtotalCents}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />
    </div>
  );
};
