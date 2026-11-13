import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { listCategories } from '../services/categoryService';
import { listProducts } from '../services/productService';
import type { CategoryWithCount, ProductWithDetails } from '../types/database';

export function useShopCatalog() {
  const { profile, shop } = useAuth();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!shop || !profile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [prods, cats] = await Promise.all([
        listProducts(shop.id, profile.id),
        listCategories(shop.id, profile.id),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load catalog.');
    } finally {
      setIsLoading(false);
    }
  }, [shop, profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    products,
    categories,
    isLoading,
    error,
    reload,
  };
}
