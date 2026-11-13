import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { listShopOrders, updateShopOrderStatus } from '../services/orderService';
import type { OrderStatus, OrderWithItems } from '../types/database';
import {
  formatCurrencyFromCents,
  formatOrderStatusLabel,
  formatShortDate,
  formatShortDateTime,
} from '../utils/formatters';
import { sanitizeWhatsAppPhoneForUrl } from '../utils/whatsapp';

const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'contacted',
  'confirmed',
  'completed',
  'cancelled',
];

function getStatusTextClass(status: OrderStatus): string {
  switch (status) {
    case 'new':
      return 'text-amber-700';
    case 'contacted':
      return 'text-blue-700';
    case 'confirmed':
      return 'text-emerald-700';
    case 'completed':
      return 'text-neutral-900';
    case 'cancelled':
      return 'text-red-700';
  }
}

const ORDERS_PAGE_SIZE = 15;

export const DashboardOrdersPage: React.FC = () => {
  const { profile, shop } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!shop || !profile) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await listShopOrders(shop.id, profile.id);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load orders.');
    } finally {
      setIsLoading(false);
    }
  }, [shop, profile]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const countsByStatus = useMemo(() => {
    const counts: Record<'all' | OrderStatus, number> = {
      all: orders.length,
      new: 0,
      contacted: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const order of orders) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      if (!needle) return true;
      return (
        order.order_number.toLowerCase().includes(needle) ||
        order.customer_name.toLowerCase().includes(needle) ||
        (order.customer_phone ?? '').toLowerCase().includes(needle) ||
        order.items.some((item) => item.product_name.toLowerCase().includes(needle))
      );
    });
  }, [orders, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PAGE_SIZE;
    return filteredOrders.slice(start, start + ORDERS_PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    if (!shop || !profile) return;
    setUpdatingOrderId(orderId);
    setError(null);
    setFeedback(null);
    try {
      const updated = await updateShopOrderStatus(
        shop.id,
        profile.id,
        orderId,
        nextStatus
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setFeedback(
        `Order ${updated.order_number} marked as ${formatOrderStatusLabel(nextStatus)}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Order Enquiries
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Review WhatsApp enquiries and update order fulfillment status for{' '}
            {shop?.name ?? 'your shop'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {shop && (
            <Link
              to={`/store/${shop.slug}`}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open Storefront</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={isLoading}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Status Tabs */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order #, customer name, phone, or product..."
            aria-label="Search order enquiries"
            className="w-full min-h-[42px] rounded-lg border border-neutral-300 pl-9 pr-3.5 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter orders by status"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            className={`min-h-[36px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#111315] text-white'
                : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            All ({countsByStatus.all})
          </button>
          {ORDER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`min-h-[36px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#111315] text-white'
                  : 'border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {formatOrderStatusLabel(status)} ({countsByStatus[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-20 rounded-xl bg-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <EmptyState
            borderless
            icon={ClipboardList}
            title="No WhatsApp enquiries yet"
            description="When customers submit products from your public storefront enquiry cart, their order snapshots appear here automatically."
            action={
              shop ? (
                <Link
                  to={`/store/${shop.slug}`}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
                >
                  Open Live Storefront
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-12 text-center space-y-3">
          <p className="text-sm font-medium text-neutral-900">
            No orders match your current filter
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
                    <th className="px-5 py-3.5 font-medium">Order</th>
                    <th className="px-5 py-3.5 font-medium">Customer</th>
                    <th className="px-5 py-3.5 font-medium">Items</th>
                    <th className="px-5 py-3.5 font-medium">Date</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 text-right font-medium">Estimated Total</th>
                    <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-sm">
                  {paginatedOrders.map((order) => {
                    const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-neutral-50/70 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-neutral-900">
                          {order.order_number}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-neutral-900">{order.customer_name}</p>
                          {order.customer_phone && (
                            <p className="font-mono text-xs text-neutral-500">
                              {order.customer_phone}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-600">
                          <span className="font-medium text-neutral-800 tabular-nums">
                            {itemCount} {itemCount === 1 ? 'unit' : 'units'}
                          </span>
                          {order.items[0] && (
                            <p className="mt-0.5 text-neutral-500 truncate max-w-[200px]">
                              {order.items[0].product_name}
                              {order.items.length > 1
                                ? ` +${order.items.length - 1} more`
                                : ''}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                          {formatShortDate(order.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            aria-label={`Update status for ${order.order_number}`}
                            value={order.status}
                            disabled={updatingOrderId === order.id}
                            onChange={(e) =>
                              void handleStatusChange(
                                order.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className={`min-h-[36px] rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 ${getStatusTextClass(
                              order.status
                            )}`}
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st} className="text-neutral-900">
                                {formatOrderStatusLabel(st)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-xs font-semibold text-neutral-900 tabular-nums">
                          {formatCurrencyFromCents(order.total_cents, order.currency)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {paginatedOrders.map((order) => {
              const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
              return (
                <article
                  key={order.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-neutral-900">
                        {order.order_number}
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold text-neutral-900 truncate">
                        {order.customer_name}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {formatShortDate(order.created_at)} · {itemCount}{' '}
                        {itemCount === 1 ? 'unit' : 'units'}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-neutral-900 tabular-nums shrink-0">
                      {formatCurrencyFromCents(order.total_cents, order.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <select
                      aria-label={`Status for ${order.order_number}`}
                      value={order.status}
                      disabled={updatingOrderId === order.id}
                      onChange={(e) =>
                        void handleStatusChange(order.id, e.target.value as OrderStatus)
                      }
                      className={`flex-1 min-h-[42px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold ${getStatusTextClass(
                        order.status
                      )}`}
                    >
                      {ORDER_STATUSES.map((st) => (
                        <option key={st} value={st} className="text-neutral-900">
                          {formatOrderStatusLabel(st)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="min-h-[42px] rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                    >
                      Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-xs text-neutral-600">
              <span className="tabular-nums">
                Page {currentPage} of {totalPages} ({filteredOrders.length} enquiries)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="min-h-[38px] rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-[38px] rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
        >
          <div
            className="fixed inset-0 bg-neutral-950/50 backdrop-blur-[1px]"
            onClick={() => setSelectedOrderId(null)}
          />

          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-emerald-700">
                  {selectedOrder.order_number}
                </p>
                <h3
                  id="order-detail-title"
                  className="mt-1 font-display text-lg font-bold text-neutral-900"
                >
                  {selectedOrder.customer_name}
                </h3>
                <p className="text-xs text-neutral-500">
                  Recorded {formatShortDateTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                aria-label="Close order details"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Customer Contact & Notes */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">Customer Name</span>
                <span className="font-medium text-neutral-900">
                  {selectedOrder.customer_name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500">Phone / WhatsApp</span>
                {selectedOrder.customer_phone ? (
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-neutral-900">
                      {selectedOrder.customer_phone}
                    </span>
                    <a
                      href={`https://wa.me/${sanitizeWhatsAppPhoneForUrl(
                        selectedOrder.customer_phone
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Reply</span>
                    </a>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-neutral-400">
                    <Phone className="h-3 w-3" />
                    <span>Not provided</span>
                  </span>
                )}
              </div>
              {selectedOrder.notes && (
                <div className="border-t border-neutral-200 pt-2">
                  <p className="text-neutral-500">Customer Note</p>
                  <p className="mt-0.5 text-neutral-900">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Snapshotted Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Order Item Snapshots
              </h4>
              <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {item.product_name}
                      </p>
                      <p className="font-mono text-xs text-neutral-500 tabular-nums">
                        {formatCurrencyFromCents(
                          item.unit_price_cents,
                          selectedOrder.currency
                        )}{' '}
                        × {item.quantity}
                        {item.product_sku ? ` · SKU: ${item.product_sku}` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-semibold text-neutral-900 tabular-nums shrink-0">
                      {formatCurrencyFromCents(
                        item.line_total_cents,
                        selectedOrder.currency
                      )}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 text-sm font-semibold">
                  <span className="text-neutral-700">Estimated Total</span>
                  <span className="font-mono text-base font-bold text-neutral-900 tabular-nums">
                    {formatCurrencyFromCents(
                      selectedOrder.total_cents,
                      selectedOrder.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Update Status */}
            <div className="space-y-2 pt-1">
              <label
                htmlFor="modal-order-status"
                className="block text-xs font-semibold uppercase tracking-wide text-neutral-500"
              >
                Update Status
              </label>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((st) => {
                  const active = selectedOrder.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingOrderId === selectedOrder.id}
                      onClick={() => void handleStatusChange(selectedOrder.id, st)}
                      className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#111315] text-white'
                          : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {formatOrderStatusLabel(st)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
