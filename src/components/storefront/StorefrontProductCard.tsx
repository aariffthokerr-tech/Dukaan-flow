import React, { useState } from 'react';
import { Check, Package, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductWithDetails } from '../../types/database';
import { formatCurrencyFromCents } from '../../utils/formatters';

interface StorefrontProductCardProps {
  shopSlug: string;
  product: ProductWithDetails;
  inCartQty: number;
  onAddToEnquiry: (product: ProductWithDetails) => void;
}

export const StorefrontProductCard: React.FC<StorefrontProductCardProps> = ({
  shopSlug,
  product,
  inCartQty,
  onAddToEnquiry,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const primaryImage =
    product.images.find((img) => img.is_primary) ?? product.images[0] ?? null;
  const imageSrc = primaryImage?.public_url || primaryImage?.storage_path || null;

  const hasSale =
    product.sale_price_cents !== null &&
    product.sale_price_cents < product.price_cents;
  const effectivePriceCents = hasSale
    ? product.sale_price_cents!
    : product.price_cents;

  const outOfStock = product.stock_quantity <= 0;
  const maxReached = inCartQty >= product.stock_quantity && !outOfStock;

  const stockText = outOfStock
    ? 'Out of stock'
    : product.stock_quantity <= product.low_stock_threshold
      ? `Only ${product.stock_quantity} left`
      : `${product.stock_quantity} in stock`;

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white overflow-hidden transition-colors hover:border-neutral-300">
      <div>
        <Link
          to={`/store/${shopSlug}/product/${product.slug}`}
          className="block relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden"
        >
          {imageSrc && !imgFailed ? (
            <img
              src={imageSrc}
              alt={primaryImage?.alt_text || product.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              <Package className="h-10 w-10 stroke-[1.5]" aria-hidden="true" />
            </div>
          )}
        </Link>

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="truncate">
              {product.category?.name ?? 'General'}
              {product.is_featured ? ' · Featured' : ''}
            </span>
            <span
              className={`shrink-0 font-medium ${
                outOfStock
                  ? 'text-red-700'
                  : product.stock_quantity <= product.low_stock_threshold
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {stockText}
            </span>
          </div>

          <Link
            to={`/store/${shopSlug}/product/${product.slug}`}
            className="block font-display text-sm sm:text-base font-semibold text-neutral-900 leading-snug line-clamp-2 hover:text-emerald-800 transition-colors"
          >
            {product.name}
          </Link>

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="font-mono text-base font-bold text-neutral-900 tabular-nums">
              {formatCurrencyFromCents(effectivePriceCents, product.currency)}
            </span>
            {hasSale && (
              <span className="font-mono text-xs text-neutral-400 line-through tabular-nums">
                {formatCurrencyFromCents(product.price_cents, product.currency)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-1">
        <button
          type="button"
          onClick={() => onAddToEnquiry(product)}
          disabled={outOfStock || maxReached}
          className={`flex w-full min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
            outOfStock || maxReached
              ? 'border border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed'
              : inCartQty > 0
                ? 'border border-emerald-700/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-[#111315] text-white hover:bg-neutral-800'
          }`}
        >
          {outOfStock ? (
            <span>Unavailable</span>
          ) : maxReached ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Max in Enquiry ({inCartQty})</span>
            </>
          ) : inCartQty > 0 ? (
            <>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Another ({inCartQty} in cart)</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add to Enquiry</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
