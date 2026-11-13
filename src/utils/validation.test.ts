import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugifyShopName,
  isValidShopSlug,
  normalizeWhatsappNumber,
  isValidWhatsappNumber,
  isValidEmail,
  validateRegistrationInput,
  validateLoginInput,
  validateContactInput,
  parseCurrencyToCents,
  formatCentsToInputString,
  validateProductInput,
  validateCategoryName,
  validateProductImageFileMeta,
  buildProductImageStoragePath,
} from './validation';
import {
  formatCurrencyFromCents,
  formatOrderStatusLabel,
  formatStorefrontUrl,
} from './formatters';

test('slugifyShopName normalizes spaces, casing, and punctuation', () => {
  assert.equal(slugifyShopName('  Kala & Loom Studio! '), 'kala-loom-studio');
  assert.equal(slugifyShopName('Green___Corner   Shop'), 'green-corner-shop');
  assert.equal(slugifyShopName('---Apex---'), 'apex');
});

test('isValidShopSlug enforces 3-64 char lowercase alphanumeric hyphenated slugs', () => {
  assert.equal(isValidShopSlug('kala-loom'), true);
  assert.equal(isValidShopSlug('ab'), false);
  assert.equal(isValidShopSlug('-leading-hyphen'), false);
  assert.equal(isValidShopSlug('trailing-hyphen-'), false);
  assert.equal(isValidShopSlug('invalid_underscore'), false);
});

test('WhatsApp normalization and E.164 validation', () => {
  assert.equal(normalizeWhatsappNumber('+91 98765-43210'), '+919876543210');
  assert.equal(isValidWhatsappNumber('+91 98765 43210'), true);
  assert.equal(isValidWhatsappNumber('12345'), false);
  assert.equal(isValidWhatsappNumber('+0123456789'), false);
});

test('validateRegistrationInput rejects invalid fields and accepts valid input', () => {
  const invalid = validateRegistrationInput({
    fullName: 'A',
    email: 'not-an-email',
    password: 'short',
    shopName: '',
    shopCategory: '',
    shopSlug: 'x',
    whatsappNumber: '12',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.password);
  assert.ok(invalid.errors.shopName);
  assert.ok(invalid.errors.shopCategory);
  assert.ok(invalid.errors.shopSlug);
  assert.ok(invalid.errors.whatsappNumber);

  const valid = validateRegistrationInput({
    fullName: 'Arif Thoker',
    email: 'arif@example.com',
    password: 'securePassword123',
    shopName: 'Kala Loom Studio',
    shopCategory: 'Home & Ceramics',
    shopSlug: 'kala-loom-studio',
    whatsappNumber: '+919876543210',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('validateLoginInput and validateContactInput enforce required fields', () => {
  assert.equal(validateLoginInput('bad', '').valid, false);
  assert.equal(validateLoginInput('owner@shop.com', 'password123').valid, true);
  assert.equal(
    validateContactInput({
      name: 'Riya',
      email: 'riya@shop.com',
      shopName: 'Riya Ceramics',
      message: 'Short',
    }).valid,
    false
  );
  assert.equal(
    validateContactInput({
      name: 'Riya',
      email: 'riya@shop.com',
      shopName: 'Riya Ceramics',
      message: 'We would like to onboard two retail locations.',
    }).valid,
    true
  );
  assert.equal(isValidEmail('hello@dukaanflow.app'), true);
});

test('formatters produce consistent labels and URLs', () => {
  assert.equal(formatOrderStatusLabel('new'), 'New');
  assert.equal(formatOrderStatusLabel('contacted'), 'Contacted');
  assert.equal(formatOrderStatusLabel('confirmed'), 'Confirmed');
  assert.equal(formatOrderStatusLabel('completed'), 'Completed');
  assert.equal(formatOrderStatusLabel('cancelled'), 'Cancelled');
  assert.equal(formatStorefrontUrl('kala-loom'), 'dukaanflow.com/store/kala-loom');
  assert.ok(formatCurrencyFromCents(125000, 'INR').includes('1,250'));
});

test('parseCurrencyToCents and formatCentsToInputString handle decimals accurately', () => {
  assert.equal(parseCurrencyToCents('499'), 49900);
  assert.equal(parseCurrencyToCents('499.50'), 49950);
  assert.equal(parseCurrencyToCents('-10'), null);
  assert.equal(parseCurrencyToCents('abc'), null);
  assert.equal(formatCentsToInputString(49900), '499');
  assert.equal(formatCentsToInputString(49950), '499.50');
});

test('validateProductInput validates name, positive price, sale price < regular, and non-negative stock', () => {
  const invalid = validateProductInput({
    name: '',
    description: '',
    regularPrice: '0',
    salePrice: '100',
    sku: 'SKU-1',
    stockQuantity: '-2',
    lowStockThreshold: '5',
    categoryId: '',
    isActive: true,
    isFeatured: false,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.regularPrice);
  assert.ok(invalid.errors.stockQuantity);

  const saleHigher = validateProductInput({
    name: 'LED Bulb 12W',
    description: 'Warm white',
    regularPrice: '150',
    salePrice: '180',
    sku: 'LED-12W',
    stockQuantity: '20',
    lowStockThreshold: '5',
    categoryId: 'cat-1',
    isActive: true,
    isFeatured: true,
  });
  assert.equal(saleHigher.valid, false);
  assert.ok(saleHigher.errors.salePrice);

  const valid = validateProductInput({
    name: 'LED Bulb 12W',
    description: 'Warm white',
    regularPrice: '150',
    salePrice: '125',
    sku: 'LED-12W',
    stockQuantity: '20',
    lowStockThreshold: '5',
    categoryId: 'cat-1',
    isActive: true,
    isFeatured: true,
  });
  assert.equal(valid.valid, true);
});

test('validateCategoryName and validateProductImageFileMeta enforce constraints', () => {
  assert.equal(validateCategoryName('A').valid, false);
  assert.equal(validateCategoryName('Electrical').valid, true);

  assert.equal(
    validateProductImageFileMeta({
      name: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024 * 500,
    }).valid,
    true
  );
  assert.equal(
    validateProductImageFileMeta({
      name: 'script.svg',
      type: 'image/svg+xml',
      size: 1024,
    }).valid,
    false
  );
  assert.equal(
    validateProductImageFileMeta({
      name: 'huge.png',
      type: 'image/png',
      size: 6 * 1024 * 1024,
    }).valid,
    false
  );
  assert.equal(
    buildProductImageStoragePath('shop-1', 'prod-2', 'abc_123', 'image/webp'),
    'shop-1/prod-2/abc_123.webp'
  );
});
