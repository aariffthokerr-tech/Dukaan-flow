import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Globe, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Shop } from '../../types/database';
import { formatStorefrontUrl } from '../../utils/formatters';

interface StorefrontPlaceholderProps {
  shop: Shop | null;
}

export const StorefrontPlaceholder: React.FC<StorefrontPlaceholderProps> = ({ shop }) => {
  const [copied, setCopied] = useState(false);

  if (!shop) {
    return null;
  }

  const storefrontUrl = formatStorefrontUrl(shop.slug);
  const livePath = `/store/${shop.slug}`;

  const handleCopySlug = async () => {
    try {
      const originUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${livePath}`
          : `https://${storefrontUrl}`;
      await navigator.clipboard.writeText(originUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be restricted in headless contexts
    }
  };

  return (
    <section
      aria-labelledby="storefront-preview-heading"
      className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
    >
      <div className="border-b border-neutral-200 bg-[#111315] px-5 py-4 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="storefront-preview-heading"
              className="font-display text-base font-semibold text-white truncate"
            >
              Public Storefront
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              {shop.is_active
                ? 'Active storefront ready for WhatsApp orders'
                : 'Storefront is currently hidden from customers'}
            </p>
          </div>
          <Globe className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
          <span className="font-mono text-xs text-neutral-900 truncate">
            {storefrontUrl}
          </span>
          <button
            type="button"
            onClick={() => void handleCopySlug()}
            aria-label="Copy storefront URL"
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 shrink-0 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-2 text-xs text-neutral-600">
          <div className="flex items-center justify-between py-1 border-b border-neutral-100">
            <span>Shop Name</span>
            <span className="font-medium text-neutral-900">{shop.name}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-neutral-100">
            <span>Category</span>
            <span className="font-medium text-neutral-900">{shop.category}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-neutral-100">
            <span>Visibility</span>
            <span
              className={`font-medium ${
                shop.is_active ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {shop.is_active ? 'Public & Active' : 'Paused'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>WhatsApp Business</span>
            </span>
            <span className="font-mono font-medium text-neutral-900">
              {shop.whatsapp_number}
            </span>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4 flex flex-wrap items-center gap-2.5">
          <Link
            to={livePath}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open Live Storefront</span>
          </Link>
          <Link
            to="/dashboard/settings"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            Edit Info
          </Link>
        </div>
      </div>
    </section>
  );
};
