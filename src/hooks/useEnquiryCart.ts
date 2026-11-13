import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EnquiryCartItem, ProductWithDetails } from '../types/database';
import {
  calculateEnquiryCartSubtotalCents,
  clampQuantityToStock,
} from '../utils/whatsapp';

function getCartStorageKey(shopSlug: string): string {
  return `dukaanflow_enquiry_cart_${shopSlug.trim().toLowerCase()}`;
}

function readStoredCart(shopSlug: string): EnquiryCartItem[] {
  if (!shopSlug) return [];
  try {
    const raw = localStorage.getItem(getCartStorageKey(shopSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EnquiryCartItem[]) : [];
  } catch {
    return [];
  }
}

export function useEnquiryCart(shopSlug: string) {
  const [items, setItems] = useState<EnquiryCartItem[]>(() => readStoredCart(shopSlug));

  useEffect(() => {
    setItems(readStoredCart(shopSlug));
  }, [shopSlug]);

  const persist = useCallback(
    (next: EnquiryCartItem[]) => {
      setItems(next);
      if (!shopSlug) return;
      try {
        localStorage.setItem(getCartStorageKey(shopSlug), JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
    },
    [shopSlug]
  );

  const addItem = useCallback(
    (product: ProductWithDetails, requestedQty: number = 1) => {
      if (!product.is_active || product.stock_quantity <= 0) return;

      const primaryImage =
        product.images.find((img) => img.is_primary) ?? product.images[0] ?? null;
      const unitPriceCents = product.sale_price_cents ?? product.price_cents;

      const existing = items.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = clampQuantityToStock(
          existing.quantity + requestedQty,
          product.stock_quantity
        );
        const next = items.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                name: product.name,
                productSlug: product.slug,
                sku: product.sku,
                unitPriceCents,
                regularPriceCents: product.price_cents,
                maxStock: product.stock_quantity,
                imageUrl: primaryImage?.public_url ?? primaryImage?.storage_path ?? null,
                quantity: nextQty,
              }
            : item
        );
        persist(next);
        return;
      }

      const safeQty = clampQuantityToStock(requestedQty, product.stock_quantity);
      if (safeQty <= 0) return;

      const next: EnquiryCartItem[] = [
        ...items,
        {
          productId: product.id,
          productSlug: product.slug,
          name: product.name,
          sku: product.sku,
          unitPriceCents,
          regularPriceCents: product.price_cents,
          currency: product.currency || 'INR',
          quantity: safeQty,
          maxStock: product.stock_quantity,
          imageUrl: primaryImage?.public_url ?? primaryImage?.storage_path ?? null,
        },
      ];
      persist(next);
    },
    [items, persist]
  );

  const updateQuantity = useCallback(
    (productId: string, nextQty: number) => {
      if (nextQty <= 0) {
        persist(items.filter((item) => item.productId !== productId));
        return;
      }

      const next = items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: clampQuantityToStock(nextQty, item.maxStock),
            }
          : item
      );
      persist(next);
    },
    [items, persist]
  );

  const removeItem = useCallback(
    (productId: string) => {
      persist(items.filter((item) => item.productId !== productId));
    },
    [items, persist]
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const syncWithCatalog = useCallback(
    (products: ProductWithDetails[]) => {
      if (items.length === 0) return;
      const byId = new Map(products.map((p) => [p.id, p]));
      let changed = false;

      const synced = items
        .map((item): EnquiryCartItem | null => {
          const live = byId.get(item.productId);
          if (!live || !live.is_active || live.stock_quantity <= 0) {
            changed = true;
            return null;
          }
          const unitPriceCents = live.sale_price_cents ?? live.price_cents;
          const clampedQty = clampQuantityToStock(item.quantity, live.stock_quantity);
          const primaryImage =
            live.images.find((img) => img.is_primary) ?? live.images[0] ?? null;
          const imageUrl = primaryImage?.public_url ?? primaryImage?.storage_path ?? null;

          if (
            clampedQty !== item.quantity ||
            live.stock_quantity !== item.maxStock ||
            unitPriceCents !== item.unitPriceCents ||
            live.name !== item.name ||
            imageUrl !== item.imageUrl
          ) {
            changed = true;
          }

          return {
            ...item,
            name: live.name,
            productSlug: live.slug,
            sku: live.sku,
            unitPriceCents,
            regularPriceCents: live.price_cents,
            maxStock: live.stock_quantity,
            quantity: clampedQty,
            imageUrl,
          };
        })
        .filter((x): x is EnquiryCartItem => x !== null);

      if (changed) {
        persist(synced);
      }
    },
    [items, persist]
  );

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotalCents = useMemo(
    () => calculateEnquiryCartSubtotalCents(items),
    [items]
  );

  return {
    items,
    totalQuantity,
    subtotalCents,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    syncWithCatalog,
  };
}
