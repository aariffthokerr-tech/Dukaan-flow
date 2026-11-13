import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardSnapshot } from '../services/dashboardService';
import type { DashboardSnapshot } from '../types/database';
import { useAuth } from './useAuth';

export function useShopDashboard() {
  const { profile, shop } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop || !profile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardSnapshot(shop.id, profile.id);
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [shop, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    snapshot,
    isLoading,
    error,
    reload: load,
  };
}
