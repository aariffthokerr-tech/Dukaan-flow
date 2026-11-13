import assert from 'node:assert/strict';
import test from 'node:test';
import type { Shop, Subscription } from '../types/database';
import {
  checkPlanQuota,
  DEFAULT_PLAN_CONFIGS,
  evaluateShopAccess,
  formatPlanTierLabel,
  formatSubscriptionStatusLabel,
  isSubscriptionExpired,
} from './subscription';
import { normalizeAppError, sanitizeLogMeta } from './errorHandling';

const BASE_SHOP: Pick<Shop, 'status' | 'is_active' | 'suspension_reason'> = {
  status: 'active',
  is_active: true,
  suspension_reason: null,
};

const BASE_SUB: Subscription = {
  id: 'sub-1',
  shop_id: 'shop-1',
  plan_tier: 'starter',
  status: 'active',
  current_period_start: '2026-01-01T00:00:00.000Z',
  current_period_end: '2026-12-31T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

test('evaluateShopAccess blocks suspended shops and expired subscriptions', () => {
  const now = new Date('2026-06-01T00:00:00.000Z').getTime();

  const active = evaluateShopAccess(BASE_SHOP, BASE_SUB, now);
  assert.equal(active.canWriteCatalog, true);
  assert.equal(active.canServePublicStorefront, true);
  assert.equal(active.effectiveSubscriptionStatus, 'active');

  const suspended = evaluateShopAccess(
    { status: 'suspended', is_active: false, suspension_reason: 'Policy review' },
    BASE_SUB,
    now
  );
  assert.equal(suspended.canWriteCatalog, false);
  assert.equal(suspended.canServePublicStorefront, false);
  assert.ok(suspended.blockReason?.includes('Policy review'));

  const pastPeriodEnd = new Date('2027-02-01T00:00:00.000Z').getTime();
  assert.equal(isSubscriptionExpired(BASE_SUB, pastPeriodEnd), true);

  const expired = evaluateShopAccess(BASE_SHOP, BASE_SUB, pastPeriodEnd);
  assert.equal(expired.canWriteCatalog, false);
  assert.equal(expired.canServePublicStorefront, false);
  assert.equal(expired.effectiveSubscriptionStatus, 'expired');
});

test('checkPlanQuota enforces Starter/Basic/Pro limits accurately', () => {
  const active = evaluateShopAccess(BASE_SHOP, BASE_SUB, new Date('2026-06-01T00:00:00.000Z').getTime());

  const starterAllowed = checkPlanQuota({
    resource: 'products',
    currentCount: 24,
    plan: DEFAULT_PLAN_CONFIGS.starter,
    access: active,
  });
  assert.equal(starterAllowed.allowed, true);

  const starterBlocked = checkPlanQuota({
    resource: 'products',
    currentCount: 25,
    plan: DEFAULT_PLAN_CONFIGS.starter,
    access: active,
  });
  assert.equal(starterBlocked.allowed, false);
  assert.ok(starterBlocked.reason?.includes('25 products'));

  const imageBlocked = checkPlanQuota({
    resource: 'images',
    currentCount: 3,
    plan: DEFAULT_PLAN_CONFIGS.starter,
    access: active,
  });
  assert.equal(imageBlocked.allowed, false);

  const proAllowed = checkPlanQuota({
    resource: 'products',
    currentCount: 25,
    plan: DEFAULT_PLAN_CONFIGS.pro,
    access: active,
  });
  assert.equal(proAllowed.allowed, true);
});

test('plan labels and error sanitizer mask sensitive fields', () => {
  assert.equal(formatPlanTierLabel('starter'), 'Starter');
  assert.equal(formatPlanTierLabel('basic'), 'Basic');
  assert.equal(formatPlanTierLabel('pro'), 'Pro');
  assert.equal(formatSubscriptionStatusLabel('trialing'), 'Trialing');

  const safe = sanitizeLogMeta({
    shopId: 'shop-123',
    password: 'secret-value',
    accessToken: 'jwt-123',
    customerPhone: '+919876543210',
  });
  assert.equal(safe?.shopId, 'shop-123');
  assert.equal(safe?.password, '[REDACTED]');
  assert.equal(safe?.accessToken, '[REDACTED]');
  assert.equal(safe?.customerPhone, '[REDACTED]');

  assert.match(
    normalizeAppError(new Error('Failed to fetch'), 'Fallback'),
    /Network connection error/
  );
  assert.match(
    normalizeAppError(new Error('Forbidden: Super Admin access required'), 'Fallback'),
    /do not have permission/
  );
});
