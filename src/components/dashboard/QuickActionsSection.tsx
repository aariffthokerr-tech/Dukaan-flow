import React from 'react';
import { ArrowRight, FolderTree, Plus, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const QuickActionsSection: React.FC = () => {
  const { shop } = useAuth();

  const actions = [
    {
      title: 'Add Product',
      description: 'Create a new product with pricing, stock, and uploaded images.',
      to: '/dashboard/products?new=1',
      icon: Plus,
    },
    {
      title: 'Manage Categories',
      description: 'Organize default and custom categories for your catalog.',
      to: '/dashboard/categories',
      icon: FolderTree,
    },
    {
      title: 'View Storefront',
      description: 'Open your live public storefront and test WhatsApp enquiry ordering.',
      to: shop ? `/store/${shop.slug}` : '/dashboard/storefront',
      icon: Store,
    },
  ];

  return (
    <section
      aria-labelledby="quick-actions-heading"
      className="rounded-xl border border-neutral-200 bg-white p-5"
    >
      <h2
        id="quick-actions-heading"
        className="font-display text-base font-semibold text-neutral-900"
      >
        Quick Actions
      </h2>
      <p className="mt-0.5 text-xs text-neutral-500">
        Essential catalog and storefront steps for your shop
      </p>

      <div className="mt-4 divide-y divide-neutral-100">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex min-h-[56px] items-center justify-between gap-4 py-3.5 transition-colors hover:bg-neutral-50/70 -mx-2 px-2 rounded-lg"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 shrink-0 group-hover:border-emerald-700/30 group-hover:text-emerald-700 transition-colors">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 shrink-0 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
};
