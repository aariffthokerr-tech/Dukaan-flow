import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppContactUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
  calculateEnquiryCartSubtotalCents,
  clampQuantityToStock,
  sanitizeWhatsAppPhoneForUrl,
  validateCustomerEnquiryInput,
} from './whatsapp';

test('sanitizeWhatsAppPhoneForUrl strips formatting and leading plus', () => {
  assert.equal(sanitizeWhatsAppPhoneForUrl('+91 98765-43210'), '919876543210');
  assert.equal(sanitizeWhatsAppPhoneForUrl('919876543210'), '919876543210');
});

test('buildWhatsAppOrderMessage formats exact enquiry text and URL encoding', () => {
  const message = buildWhatsAppOrderMessage({
    shopName: 'Royal Hardware',
    items: [
      { name: 'Product A', quantity: 2 },
      { name: 'Product B', quantity: 1 },
    ],
  });

  assert.equal(
    message,
    [
      'Hello, I want to order from Royal Hardware.',
      '',
      'Products:',
      'Product A x 2',
      'Product B x 1',
      '',
      'Please confirm availability and final price.',
    ].join('\n')
  );

  const url = buildWhatsAppOrderUrl('+919876543210', message);
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  assert.ok(decodeURIComponent(url.split('?text=')[1]).includes('Product A x 2'));
});

test('buildWhatsAppContactUrl encodes shop inquiry greeting', () => {
  const url = buildWhatsAppContactUrl('+91 98765 43210', 'Royal Hardware');
  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  assert.ok(decodeURIComponent(url).includes('Royal Hardware'));
});

test('cart quantity clamping, subtotal, and customer enquiry validation', () => {
  assert.equal(clampQuantityToStock(5, 3), 3);
  assert.equal(clampQuantityToStock(0, 3), 1);
  assert.equal(clampQuantityToStock(2, 0), 0);

  const items = [
    {
      productId: 'p1',
      productSlug: 'switch-16a',
      name: 'Copper Switch 16A',
      sku: 'SW-16A',
      unitPriceCents: 24900,
      regularPriceCents: 29900,
      currency: 'INR',
      quantity: 2,
      maxStock: 5,
      imageUrl: null,
    },
  ];
  assert.equal(calculateEnquiryCartSubtotalCents(items), 49800);

  assert.equal(
    validateCustomerEnquiryInput({
      customerName: 'A',
      customerPhone: '',
      items,
    }).valid,
    false
  );

  assert.equal(
    validateCustomerEnquiryInput({
      customerName: 'Sana Khan',
      customerPhone: '123',
      items,
    }).valid,
    false
  );

  assert.equal(
    validateCustomerEnquiryInput({
      customerName: 'Sana Khan',
      customerPhone: '',
      items,
    }).valid,
    true
  );

  assert.equal(
    validateCustomerEnquiryInput({
      customerName: 'Sana Khan',
      customerPhone: '+919876543210',
      items: [{ ...items[0], quantity: 8 }],
    }).valid,
    false
  );
});
