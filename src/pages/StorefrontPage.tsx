import React, { useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, MessageCircle, Package, Store } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EnquiryCartDrawer } from '../components/storefront/EnquiryCartDrawer';
import { StorefrontHeader } from '../components/storefront/StorefrontHeader';
import { StorefrontProductCard } from '../components/storefront/StorefrontProductCard';
import { useEnquiryCart } from '../hooks/useEnquiryCart';
import { fetchPublicStorefront } from '../services/storefrontService';
import type { PublicStorefrontData } from '../types/database';
import { buildWhatsAppContactUrl } from '../utils/whatsapp';

const STOREFRONT_PAGE_SIZE = 12;

export const StorefrontPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicStorefrontData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(STOREFRONT_PAGE_SIZE);
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
    setSelectedCategoryId('all');
    setSearchQuery('');

    fetchPublicStorefront(slug)
      .then((res) => {
        if (!active) return;
        setData(res);
        if (res) {
          syncWithCatalog(res.products);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load storefront.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const cartQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [cartItems]);

  const featuredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter((p) => p.is_featured);
  }, [data]);

  const categoriesWithProducts = useMemo(() => {
    if (!data) return [];
    const activeIds = new Set(data.products.map((p) => p.category_id).filter(Boolean));
    return data.categories.filter((cat) => activeIds.has(cat.id));
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const needle = searchQuery.trim().toLowerCase();

    return data.products.filter((product) => {
      if (selectedCategoryId !== 'all' && product.category_id !== selectedCategoryId) {
        return false;
      }
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.description ?? '').toLowerCase().includes(needle) ||
        (product.sku ?? '').toLowerCase().includes(needle) ||
        (product.category?.name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [data, searchQuery, selectedCategoryId]);

  useEffect(() => {
    setVisibleCount(STOREFRONT_PAGE_SIZE);
  }, [slug, searchQuery, selectedCategoryId]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="h-16 border-b border-neutral-200 bg-white" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="h-36 rounded-2xl bg-neutral-200 animate-pulse" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((card) => (
              <div key={card} className="h-72 rounded-xl bg-neutral-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
            <Store className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-neutral-900">
            {error ? 'Unable to load storefront' : 'Storefront unavailable'}
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {error
              ? error
              : 'This storefront link does not exist or the shop is currently inactive.'}
          </p>
          <Link
            to="/"
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#111315] px-5 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            Go to DukaanFlow
          </Link>
        </div>
      </div>
    );
  }

  const { shop } = data;
  const logoSrc = shop.logo_url || shop.logo_path || null;
  const whatsappContactUrl = buildWhatsAppContactUrl(shop.whatsapp_number, shop.name);
  const showFeaturedSection =
    featuredProducts.length > 0 && selectedCategoryId === 'all' && !searchQuery.trim();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-neutral-900">
      <StorefrontHeader
        shop={shop}
        cartCount={totalQuantity}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Shop Identity Banner */}
        <section
          aria-label="Shop details"
          className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={`${shop.name} logo`}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border border-neutral-200 object-cover bg-neutral-50"
                />
              ) : (
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-xl bg-[#111315] text-white font-display text-2xl font-bold">
                  {shop.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                  {shop.category}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                  {shop.name}
                </h1>
                {shop.description && (
                  <p className="max-w-2xl text-sm text-neutral-600 leading-relaxed">
                    {shop.description}
                  </p>
                )}

                {(shop.address || shop.opening_hours) && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1.5 text-xs text-neutral-600">
                    {shop.address && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>{shop.address}</span>
                      </span>
                    )}
                    {shop.opening_hours && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span>{shop.opening_hours}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 sm:pt-1">
              <a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Category Navigation */}
          {categoriesWithProducts.length > 0 && (
            <nav
              aria-label="Product categories"
              className="mt-6 border-t border-neutral-100 pt-4 flex items-center gap-2 overflow-x-auto pb-1"
            >
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategoryId === 'all'
                    ? 'bg-[#111315] text-white'
                    : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                All Products ({data.products.length})
              </button>
              {categoriesWithProducts.map((cat) => {
                const count = data.products.filter((p) => p.category_id === cat.id).length;
                const active = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#111315] text-white'
                        : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </nav>
          )}
        </section>

        {/* Featured Products */}
        {showFeaturedSection && (
          <section aria-labelledby="featured-products-heading" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2
                  id="featured-products-heading"
                  className="font-display text-lg font-bold tracking-tight text-neutral-900"
                >
                  Featured Products
                </h2>
                <p className="text-xs text-neutral-500">
                  Highlighted items from {shop.name}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap font-mono text-xs text-neutral-500 tabular-nums">
                {featuredProducts.length} featured
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <StorefrontProductCard
                  key={`featured-${product.id}`}
                  shopSlug={shop.slug}
                  product={product}
                  inCartQty={cartQtyByProduct.get(product.id) ?? 0}
                  onAddToEnquiry={(item) => addItem(item, 1)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Main Catalogue */}
        <section aria-labelledby="catalogue-heading" className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2
                id="catalogue-heading"
                className="font-display text-lg font-bold tracking-tight text-neutral-900"
              >
                {selectedCategoryId === 'all'
                  ? 'Product Catalogue'
                  : categoriesWithProducts.find((c) => c.id === selectedCategoryId)?.name ??
                    'Products'}
              </h2>
              <p className="text-xs text-neutral-500">
                Select quantities and send your order enquiry on WhatsApp
              </p>
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-neutral-500 tabular-nums">
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'product' : 'products'}
            </span>
          </div>

          {data.products.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-neutral-900">
                No products published yet
              </h3>
              <p className="mt-1.5 mx-auto max-w-sm text-xs text-neutral-600 leading-relaxed">
                {shop.name} is setting up its online catalogue. Reach out directly on WhatsApp
                for current stock enquiries.
              </p>
              <a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 transition-colors"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Message on WhatsApp</span>
              </a>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white px-6 py-12 text-center space-y-3">
              <p className="text-sm font-medium text-neutral-900">
                No products match your search or category filter
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId('all');
                }}
                className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {visibleProducts.map((product) => (
                  <StorefrontProductCard
                    key={product.id}
                    shopSlug={shop.slug}
                    product={product}
                    inCartQty={cartQtyByProduct.get(product.id) ?? 0}
                    onAddToEnquiry={(item) => addItem(item, 1)}
                  />
                ))}
              </div>

              {filteredProducts.length > visibleCount && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((prev) => prev + STOREFRONT_PAGE_SIZE)
                    }
                    className="min-h-[42px] rounded-lg border border-neutral-300 bg-white px-6 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
                  >
                    Show More Products ({filteredProducts.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 border-t border-neutral-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>
            © {new Date().getFullYear()} {shop.name} · Powered by{' '}
            <Link to="/" className="font-medium text-neutral-800 hover:underline">
              DukaanFlow
            </Link>
          </p>
          <a
            href={whatsappContactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-800"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>WhatsApp {shop.whatsapp_number}</span>
          </a>
        </div>
      </footer>

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
