import {
  ALLOWED_PRODUCT_IMAGE_MIME_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  type ProductFormInput,
  type RegistrationInput,
} from '../types/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const E164_WHATSAPP_REGEX = /^\+?[1-9][0-9]{6,14}$/;

export function slugifyShopName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function slugifyCategoryOrProduct(input: string, fallback: string = 'item'): string {
  const base = slugifyShopName(input);
  return base || fallback;
}

export function isValidShopSlug(slug: string): boolean {
  const clean = slug.trim().toLowerCase();
  return clean.length >= 3 && clean.length <= 64 && SLUG_REGEX.test(clean);
}

export function normalizeWhatsappNumber(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

export function isValidWhatsappNumber(input: string): boolean {
  const normalized = normalizeWhatsappNumber(input);
  return E164_WHATSAPP_REGEX.test(normalized);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRegistrationInput(input: RegistrationInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.fullName.trim().length < 2) {
    errors.fullName = 'Enter your full name (at least 2 characters).';
  }

  if (!isValidEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (input.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (input.shopName.trim().length < 2) {
    errors.shopName = 'Enter your shop name (at least 2 characters).';
  }

  if (!input.shopCategory.trim()) {
    errors.shopCategory = 'Select a category for your shop.';
  }

  if (!isValidShopSlug(input.shopSlug)) {
    errors.shopSlug =
      'Shop slug must be 3–64 characters using lowercase letters, numbers, and hyphens.';
  }

  if (!isValidWhatsappNumber(input.whatsappNumber)) {
    errors.whatsappNumber =
      'Enter a valid WhatsApp business number with country code (e.g. +919876543210).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLoginInput(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Enter your password.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ContactFormInput {
  name: string;
  email: string;
  shopName: string;
  message: string;
}

export function validateContactInput(input: ContactFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.name.trim().length < 2) {
    errors.name = 'Enter your name.';
  }

  if (!isValidEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (input.message.trim().length < 10) {
    errors.message = 'Please include at least 10 characters in your message.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function parseCurrencyToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function formatCentsToInputString(cents: number | null | undefined): string {
  if (cents == null) return '';
  const value = cents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function validateProductInput(input: ProductFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.name.trim().length < 2) {
    errors.name = 'Product name is required (at least 2 characters).';
  }

  const regularCents = parseCurrencyToCents(input.regularPrice);
  if (regularCents === null || regularCents <= 0) {
    errors.regularPrice = 'Regular price must be greater than zero.';
  }

  if (input.salePrice.trim()) {
    const saleCents = parseCurrencyToCents(input.salePrice);
    if (saleCents === null || saleCents <= 0) {
      errors.salePrice = 'Sale price must be greater than zero.';
    } else if (regularCents !== null && saleCents >= regularCents) {
      errors.salePrice = 'Sale price must be lower than regular price.';
    }
  }

  const stockTrimmed = input.stockQuantity.trim();
  if (!/^\d+$/.test(stockTrimmed)) {
    errors.stockQuantity = 'Stock quantity must be a whole number of 0 or more.';
  }

  const thresholdTrimmed = input.lowStockThreshold.trim();
  if (thresholdTrimmed && !/^\d+$/.test(thresholdTrimmed)) {
    errors.lowStockThreshold = 'Low stock threshold must be a whole number of 0 or more.';
  }

  const skuTrimmed = input.sku.trim();
  if (skuTrimmed.length > 64) {
    errors.sku = 'SKU must be 64 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateCategoryName(name: string): ValidationResult {
  const errors: Record<string, string> = {};
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    errors.name = 'Category name must be at least 2 characters.';
  } else if (trimmed.length > 50) {
    errors.name = 'Category name must be 50 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ImageFileValidation {
  valid: boolean;
  error?: string;
}

export function validateProductImageFileMeta(file: {
  name: string;
  type: string;
  size: number;
}): ImageFileValidation {
  if (
    !ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_PRODUCT_IMAGE_MIME_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: `"${file.name}" has unsupported type (${file.type || 'unknown'}). Allowed: JPEG, PNG, WebP.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `"${file.name}" appears to be empty.`,
    };
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the 5 MB file size limit.`,
    };
  }

  return { valid: true };
}

export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

export function buildProductImageStoragePath(
  shopId: string,
  productId: string,
  uniqueId: string,
  mimeType: string
): string {
  const ext = getExtensionFromMimeType(mimeType);
  const safeUnique = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${shopId}/${productId}/${safeUnique}.${ext}`;
}
