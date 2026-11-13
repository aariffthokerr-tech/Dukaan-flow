import React, { useState } from 'react';
import { ExternalLink, MessageCircle, ShoppingBag } from 'lucide-react';

interface PreviewCatalogItem {
  id: string;
  name: string;
  price: string;
  stock: string;
  image: string;
  alt: string;
}

interface StoreThemePreset {
  id: 'ceramics' | 'apparel';
  tabLabel: string;
  shopName: string;
  slug: string;
  category: string;
  description: string;
  items: PreviewCatalogItem[];
}

const STORE_PRESETS: StoreThemePreset[] = [
  {
    id: 'ceramics',
    tabLabel: 'Home & Ceramics',
    shopName: 'Kala Clay Goods',
    slug: 'kala-clay-goods',
    category: 'Home & Ceramics',
    description: 'Small-batch stoneware vessels and pour-over brewers crafted for daily kitchens.',
    items: [
      {
        id: 'c1',
        name: 'Stoneware Pour-Over Carafe',
        price: '₹1,850',
        stock: 'In stock',
        image: '/src/assets/images/preview_ceramic_vessel_1794579349792.jpg',
        alt: 'Matte stoneware ceramic pour-over coffee carafe on travertine',
      },
      {
        id: 'c2',
        name: 'Heavy Canvas Utility Tote',
        price: '₹1,200',
        stock: 'In stock',
        image: '/src/assets/images/preview_linen_tote_1794579348677.jpg',
        alt: 'Olive canvas market tote bag on stone pedestal',
      },
    ],
  },
  {
    id: 'apparel',
    tabLabel: 'Apparel & Carry',
    shopName: 'Loom & Field',
    slug: 'loom-and-field',
    category: 'Apparel & Fashion',
    description: 'Everyday heavy organic canvas bags and studio essentials.',
    items: [
      {
        id: 'a1',
        name: 'Organic Canvas Market Tote',
        price: '₹1,450',
        stock: 'In stock',
        image: '/src/assets/images/preview_linen_tote_1794579348677.jpg',
        alt: 'Olive forest green heavy organic canvas tote bag',
      },
      {
        id: 'a2',
        name: 'Studio Brewer Set',
        price: '₹2,100',
        stock: 'Low stock',
        image: '/src/assets/images/preview_ceramic_vessel_1794579349792.jpg',
        alt: 'Minimalist stoneware coffee server and cup',
      },
    ],
  },
];

export const StorefrontPreviewWidget: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<'ceramics' | 'apparel'>('ceramics');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const preset = STORE_PRESETS.find((p) => p.id === selectedPresetId) ?? STORE_PRESETS[0];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="font-mono text-neutral-900">dukaanflow.app/s/{preset.slug}</span>
          <span aria-hidden="true">·</span>
          <span>Sample Storefront Layout</span>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-200/70 p-1">
          {STORE_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedPresetId(item.id)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                item.id === selectedPresetId
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {item.tabLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-emerald-700">{preset.category}</p>
            <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900">
              {preset.shopName}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-neutral-600">{preset.description}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 whitespace-nowrap shrink-0">
            <MessageCircle className="h-4 w-4 text-emerald-700" />
            <span>WhatsApp Order Ready</span>
            <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {preset.items.map((product) => (
            <div
              key={product.id}
              className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                {failedImages[product.id] ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 p-4 text-center">
                    <ShoppingBag className="h-7 w-7 text-neutral-400" />
                    <span className="mt-2 text-xs font-medium text-neutral-600">
                      {product.name}
                    </span>
                  </div>
                ) : (
                  <img
                    src={product.image}
                    alt={product.alt}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                    }
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <h4 className="truncate font-display text-sm font-semibold text-neutral-900">
                    {product.name}
                  </h4>
                  <p className="mt-0.5 text-xs text-neutral-500">{product.stock}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-neutral-900 tabular-nums shrink-0">
                  {product.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
