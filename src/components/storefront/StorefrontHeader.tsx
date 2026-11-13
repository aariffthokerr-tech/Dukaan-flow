import React from 'react';
import { MessageCircle, Search, ShoppingBag, Store, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicShopSummary } from '../../types/database';
import { buildWhatsAppContactUrl } from '../../utils/whatsapp';

interface StorefrontHeaderProps {
  shop: PublicShopSummary;
  cartCount: number;
  onOpenCart: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  shop,
  cartCount,
  onOpenCart,
  searchQuery = '',
  onSearchChange,
  showSearch = true,
}) => {
  const contactUrl = buildWhatsAppContactUrl(shop.whatsapp_number, shop.name);
  const logoSrc = shop.logo_url || shop.logo_path || null;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Shop Brand */}
          <Link
            to={`/store/${shop.slug}`}
            className="flex min-w-0 items-center gap-3 group"
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={`${shop.name} logo`}
                referrerPolicy="no-referrer"
                className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 object-cover bg-neutral-50"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#111315] text-white">
                <Store className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-base font-bold tracking-tight text-neutral-900 truncate group-hover:text-emerald-800 transition-colors">
                {shop.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">{shop.category}</p>
            </div>
          </Link>

          {/* Desktop Search */}
          {showSearch && onSearchChange && (
            <div className="hidden md:block flex-1 max-w-md mx-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={`Search in ${shop.name}...`}
                  aria-label={`Search products in ${shop.name}`}
                  className="w-full min-h-[40px] rounded-lg border border-neutral-300 bg-neutral-50 pl-9 pr-8 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Open enquiry cart"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>Enquiry Cart</span>
              <span className="inline-flex min-w-[20px] items-center justify-center rounded-md bg-emerald-700 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && onSearchChange && (
          <div className="pb-3 md:hidden">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`Search in ${shop.name}...`}
                aria-label={`Search products in ${shop.name}`}
                className="w-full min-h-[42px] rounded-lg border border-neutral-300 bg-neutral-50 pl-9 pr-8 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
