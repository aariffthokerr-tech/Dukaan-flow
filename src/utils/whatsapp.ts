import type { EnquiryCartItem } from '../types/database';

export function sanitizeWhatsAppPhoneForUrl(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface WhatsAppOrderMessageInput {
  shopName: string;
  items: Array<{ name: string; quantity: number }>;
  customerName?: string;
  customerPhone?: string | null;
  orderNumber?: string;
  notes?: string | null;
}

export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  const lines: string[] = [
    `Hello, I want to order from ${input.shopName.trim()}.`,
    '',
    'Products:',
    ...input.items.map((item) => `${item.name} x ${item.quantity}`),
  ];

  const metaLines: string[] = [];
  if (input.orderNumber?.trim()) {
    metaLines.push(`Enquiry Ref: ${input.orderNumber.trim()}`);
  }
  if (input.customerName?.trim()) {
    metaLines.push(`Name: ${input.customerName.trim()}`);
  }
  if (input.customerPhone?.trim()) {
    metaLines.push(`Contact: ${input.customerPhone.trim()}`);
  }
  if (input.notes?.trim()) {
    metaLines.push(`Note: ${input.notes.trim()}`);
  }

  if (metaLines.length > 0) {
    lines.push('', ...metaLines);
  }

  lines.push('', 'Please confirm availability and final price.');
  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(
  shopWhatsappNumber: string,
  message: string
): string {
  const digits = sanitizeWhatsAppPhoneForUrl(shopWhatsappNumber);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppContactUrl(
  shopWhatsappNumber: string,
  shopName: string
): string {
  const digits = sanitizeWhatsAppPhoneForUrl(shopWhatsappNumber);
  const greeting = `Hello ${shopName.trim()}, I have a question about your products.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;
}

export function calculateEnquiryCartSubtotalCents(items: EnquiryCartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function clampQuantityToStock(requestedQty: number, maxStock: number): number {
  if (maxStock <= 0) return 0;
  if (!Number.isFinite(requestedQty) || requestedQty < 1) return 1;
  return Math.min(Math.floor(requestedQty), maxStock);
}

export interface CustomerEnquiryValidationResult {
  valid: boolean;
  errors: {
    customerName?: string;
    customerPhone?: string;
    cart?: string;
  };
}

export function validateCustomerEnquiryInput(params: {
  customerName: string;
  customerPhone?: string;
  items: EnquiryCartItem[];
}): CustomerEnquiryValidationResult {
  const errors: CustomerEnquiryValidationResult['errors'] = {};

  if (params.customerName.trim().length < 2) {
    errors.customerName = 'Enter your name (at least 2 characters).';
  }

  const cleanPhone = params.customerPhone?.trim() ?? '';
  if (cleanPhone) {
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.customerPhone = 'Enter a valid phone number (7–15 digits) or leave it blank.';
    }
  }

  if (params.items.length === 0) {
    errors.cart = 'Add at least one product to your enquiry cart.';
  } else {
    const overStock = params.items.find((item) => item.quantity > item.maxStock || item.quantity < 1);
    if (overStock) {
      errors.cart = `"${overStock.name}" exceeds available stock (${overStock.maxStock}).`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
