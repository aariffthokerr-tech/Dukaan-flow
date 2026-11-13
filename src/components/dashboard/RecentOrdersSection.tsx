import React from 'react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Order } from '../../types/database';
import {
  formatCurrencyFromCents,
  formatOrderStatusLabel,
  formatShortDate,
} from '../../utils/formatters';
import { EmptyState } from '../common/EmptyState';

interface RecentOrdersSectionProps {
  orders: Order[];
  isLoading: boolean;
}

export const RecentOrdersSection: React.FC<RecentOrdersSectionProps> = ({
  orders,
  isLoading,
}) => {
  return (
    <section
      aria-labelledby="recent-orders-heading"
      className="rounded-xl border border-neutral-200 bg-white"
    >
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
        <div>
          <h2
            id="recent-orders-heading"
            className="font-display text-base font-semibold text-neutral-900"
          >
            Recent Orders
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Latest orders placed for your shop
          </p>
        </div>
        <Link
          to="/dashboard/orders"
          className="text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
        >
          View Orders
        </Link>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-11 w-full animate-pulse rounded-lg bg-neutral-100"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            borderless
            icon={ClipboardList}
            title="No enquiries received yet"
            description="Customer order enquiries sent through your live public storefront will appear here automatically."
            action={
              <Link
                to="/dashboard/orders"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                Open Orders Workspace
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-medium text-neutral-500">
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs font-medium text-neutral-900">
                      {order.order_number}
                    </td>
                    <td className="py-3 pr-4 text-neutral-800">{order.customer_name}</td>
                    <td className="py-3 pr-4 text-xs text-neutral-500 tabular-nums">
                      {formatShortDate(order.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium text-neutral-700">
                      {formatOrderStatusLabel(order.status)}
                    </td>
                    <td className="py-3 text-right font-mono text-xs font-semibold text-neutral-900 tabular-nums">
                      {formatCurrencyFromCents(order.total_cents, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
