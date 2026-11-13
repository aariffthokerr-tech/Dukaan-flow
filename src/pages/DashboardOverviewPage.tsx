import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FolderTree,
  Inbox,
  Layers,
  MessageSquarePlus,
  Package,
  RefreshCw,
} from 'lucide-react';
import { KpiCard } from '../components/dashboard/KpiCard';
import { QuickActionsSection } from '../components/dashboard/QuickActionsSection';
import { RecentOrdersSection } from '../components/dashboard/RecentOrdersSection';
import { StorefrontPlaceholder } from '../components/dashboard/StorefrontPlaceholder';
import { useAuth } from '../hooks/useAuth';
import { useShopDashboard } from '../hooks/useShopDashboard';

export const DashboardOverviewPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const { snapshot, isLoading, error, reload } = useShopDashboard();

  const metrics = snapshot?.metrics ?? {
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    totalCategories: 0,
    totalEnquiries: 0,
    newEnquiries: 0,
    confirmedOrders: 0,
    completedOrders: 0,
  };

  return (
    <div className="space-y-6">
      {/* Workspace Greeting */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Welcome, {profile?.full_name ?? 'Shop Owner'}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600">
            {shop ? (
              <>
                Managing <span className="font-medium text-neutral-900">{shop.name}</span>
                <span aria-hidden="true"> · </span>
                <span>{shop.category}</span>
              </>
            ) : (
              'Shop workspace overview'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          disabled={isLoading}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {/* KPI Cards: Catalog + Enquiries/Orders */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        <KpiCard
          label="Total Products"
          value={metrics.totalProducts}
          helperText={metrics.totalProducts === 0 ? 'Catalog empty' : 'In your shop'}
          icon={Package}
          isLoading={isLoading}
        />
        <KpiCard
          label="Active Products"
          value={metrics.activeProducts}
          helperText={metrics.activeProducts === 0 ? 'None published' : 'Visible to buyers'}
          icon={Layers}
          accent="green"
          isLoading={isLoading}
        />
        <KpiCard
          label="Low Stock Products"
          value={metrics.lowStockProducts}
          helperText={metrics.lowStockProducts === 0 ? 'All stock healthy' : 'Needs restock'}
          icon={AlertTriangle}
          accent={metrics.lowStockProducts > 0 ? 'amber' : 'default'}
          isLoading={isLoading}
        />
        <KpiCard
          label="Total Categories"
          value={metrics.totalCategories}
          helperText="Catalog groups"
          icon={FolderTree}
          isLoading={isLoading}
        />
        <KpiCard
          label="Total Enquiries"
          value={metrics.totalEnquiries}
          helperText={metrics.totalEnquiries === 0 ? 'No enquiries yet' : 'WhatsApp requests'}
          icon={Inbox}
          isLoading={isLoading}
        />
        <KpiCard
          label="New Enquiries"
          value={metrics.newEnquiries}
          helperText={metrics.newEnquiries === 0 ? 'All caught up' : 'Awaiting follow-up'}
          icon={MessageSquarePlus}
          accent={metrics.newEnquiries > 0 ? 'amber' : 'default'}
          isLoading={isLoading}
        />
        <KpiCard
          label="Confirmed Orders"
          value={metrics.confirmedOrders}
          helperText={metrics.confirmedOrders === 0 ? 'None confirmed' : 'Ready to fulfill'}
          icon={ClipboardCheck}
          accent="green"
          isLoading={isLoading}
        />
        <KpiCard
          label="Completed Orders"
          value={metrics.completedOrders}
          helperText={metrics.completedOrders === 0 ? 'No completed orders' : 'Fulfilled'}
          icon={CheckCircle2}
          accent="green"
          isLoading={isLoading}
        />
      </div>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <RecentOrdersSection
            orders={snapshot?.recentOrders ?? []}
            isLoading={isLoading}
          />
          <QuickActionsSection />
        </div>

        <div className="lg:col-span-5">
          <StorefrontPlaceholder shop={shop} />
        </div>
      </div>
    </div>
  );
};
