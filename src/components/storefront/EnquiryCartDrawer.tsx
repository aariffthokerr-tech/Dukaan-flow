import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { createPublicWhatsAppEnquiry } from '../../services/orderService';
import type {
  EnquiryCartItem,
  PublicEnquiryConfirmation,
  PublicShopSummary,
} from '../../types/database';
import { formatCurrencyFromCents } from '../../utils/formatters';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  validateCustomerEnquiryInput,
} from '../../utils/whatsapp';

interface EnquiryCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shop: PublicShopSummary;
  items: EnquiryCartItem[];
  subtotalCents: number;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export const EnquiryCartDrawer: React.FC<EnquiryCartDrawerProps> = ({
  isOpen,
  onClose,
  shop,
  items,
  subtotalCents,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    record: PublicEnquiryConfirmation;
    message: string;
    whatsappUrl: string;
  } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateCustomerEnquiryInput({
      customerName,
      customerPhone,
      items,
    });
    if (!validation.valid) {
      const firstErr =
        validation.errors.cart ||
        validation.errors.customerName ||
        validation.errors.customerPhone ||
        'Please review your enquiry details.';
      setFormError(firstErr);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPublicWhatsAppEnquiry({
        shopSlug: shop.slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      });

      const message = buildWhatsAppOrderMessage({
        shopName: created.shop_name,
        items: created.items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
        })),
        customerName: created.customer_name,
        customerPhone: created.customer_phone,
        orderNumber: created.order_number,
        notes: notes.trim() || undefined,
      });

      const whatsappUrl = buildWhatsAppOrderUrl(
        created.shop_whatsapp_number,
        message
      );

      setConfirmation({
        record: created,
        message,
        whatsappUrl,
      });
      onClearCart();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to save your order enquiry. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      // Clipboard may be restricted
    }
  };

  const handleStartNewEnquiry = () => {
    setConfirmation(null);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setFormError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-drawer-title"
    >
      <div
        className="fixed inset-0 bg-neutral-950/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white border-l border-neutral-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag className="h-5 w-5 text-neutral-900 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="enquiry-drawer-title"
                className="font-display text-base font-bold text-neutral-900 truncate"
              >
                {confirmation ? 'Enquiry Ready for WhatsApp' : 'Enquiry Cart'}
              </h2>
              <p className="text-xs text-neutral-500 truncate">{shop.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close enquiry cart"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {confirmation ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-900">
                      Enquiry {confirmation.record.order_number} recorded
                    </p>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      Send this message to {confirmation.record.shop_name} on WhatsApp so
                      the shop owner can confirm stock availability and final price.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    WhatsApp Message Preview
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCopyMessage()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900"
                  >
                    {copiedMessage ? (
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
                <pre className="whitespace-pre-wrap font-sans text-xs text-neutral-800 leading-relaxed bg-white border border-neutral-200 rounded-lg p-3">
                  {confirmation.message}
                </pre>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Estimated Total</span>
                  <span className="font-mono text-sm font-bold text-neutral-900 tabular-nums">
                    {formatCurrencyFromCents(
                      confirmation.record.total_cents,
                      confirmation.record.currency
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Final confirmation and payment arrangements happen directly with the shop.
                </p>
              </div>

              <div className="space-y-2.5">
                <a
                  href={confirmation.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Continue to WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleStartNewEnquiry}
                  className="flex w-full min-h-[42px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Back to {shop.name}
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-neutral-900">
                Your enquiry cart is empty
              </h3>
              <p className="mt-1.5 max-w-xs text-xs text-neutral-600 leading-relaxed">
                Add products from {shop.name} to build a WhatsApp order enquiry. No payment is
                required online.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#111315] px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Item List */}
              <ul className="divide-y divide-neutral-200 border-b border-neutral-200">
                {items.map((item) => (
                  <li key={item.productId} className="py-4 first:pt-0">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 shrink-0 rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-neutral-400" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
                            {item.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.productId)}
                            aria-label={`Remove ${item.name}`}
                            className="p-1 text-neutral-400 hover:text-red-700 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-neutral-600 tabular-nums">
                            {formatCurrencyFromCents(item.unitPriceCents, item.currency)} each
                          </span>
                          <span className="font-mono text-xs font-semibold text-neutral-900 tabular-nums">
                            {formatCurrencyFromCents(
                              item.unitPriceCents * item.quantity,
                              item.currency
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.productId, item.quantity - 1)
                              }
                              aria-label={`Decrease quantity for ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:bg-neutral-50"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[28px] text-center font-mono text-xs font-semibold text-neutral-900 tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.productId, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.maxStock}
                              aria-label={`Increase quantity for ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-[11px] text-neutral-500 tabular-nums">
                            Max {item.maxStock} available
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Subtotal Summary */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-700">
                    Estimated Total
                  </span>
                  <span className="font-mono text-lg font-bold text-neutral-900 tabular-nums">
                    {formatCurrencyFromCents(subtotalCents, 'INR')}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Final price and availability will be confirmed by {shop.name} on WhatsApp.
                </p>
              </div>

              {/* Customer Enquiry Form */}
              <form
                id="whatsapp-enquiry-form"
                onSubmit={(e) => void handleSubmitEnquiry(e)}
                className="space-y-4"
              >
                {formError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                  >
                    {formError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="enquiry-customer-name"
                    className="block text-xs font-medium text-neutral-800"
                  >
                    Your name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="enquiry-customer-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rohan Mehta"
                    className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enquiry-customer-phone"
                    className="block text-xs font-medium text-neutral-800"
                  >
                    Phone / WhatsApp number{' '}
                    <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <input
                    id="enquiry-customer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1.5 w-full min-h-[42px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enquiry-customer-notes"
                    className="block text-xs font-medium text-neutral-800"
                  >
                    Delivery / pickup note{' '}
                    <span className="font-normal text-neutral-400">(optional)</span>
                  </label>
                  <textarea
                    id="enquiry-customer-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Preferred pickup time or delivery neighborhood..."
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full min-h-[46px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>{isSubmitting ? 'Preparing Enquiry...' : 'Order on WhatsApp'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
