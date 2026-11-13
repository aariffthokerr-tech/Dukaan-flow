import {
  DEFAULT_CATALOG_CATEGORIES,
  type AdminPlatformOverview,
  type AdminShopSummary,
  type Category,
  type CategoryWithCount,
  type CreatePublicEnquiryInput,
  type DashboardSnapshot,
  type Order,
  type OrderItem,
  type OrderStatus,
  type OrderWithItems,
  type PlanConfig,
  type PlanTier,
  type PlatformSettings,
  type Product,
  type ProductImage,
  type ProductMutationPayload,
  type ProductWithDetails,
  type Profile,
  type PublicEnquiryConfirmation,
  type PublicStorefrontData,
  type RegistrationInput,
  type Shop,
  type ShopAnalyticsData,
  type ShopStatus,
  type ShopUpdateInput,
  type Subscription,
  type SubscriptionStatus,
} from '../types/database';
import {
  checkPlanQuota,
  DEFAULT_PLAN_CONFIGS,
  evaluateShopAccess,
} from '../utils/subscription';
import {
  buildProductImageStoragePath,
  normalizeWhatsappNumber,
  slugifyCategoryOrProduct,
  slugifyShopName,
} from '../utils/validation';

const STORAGE_KEY = 'dukaanflow_local_preview_db_v1';
const SESSION_KEY = 'dukaanflow_local_preview_session_v1';

// Deterministic local preview admin seed (used only when Supabase env vars are absent)
export const LOCAL_PREVIEW_ADMIN_EMAIL = 'admin@dukaanflow.local';
const LOCAL_PREVIEW_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
// Precomputed SHA-256 of `${LOCAL_PREVIEW_ADMIN_ID}:AdminPreview123!`
const LOCAL_PREVIEW_ADMIN_HASH =
  'e263c5951c84ee08444b01813d450b654ec1227f4c2ec41f3b44511c67b7f2d3';

interface StoredUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  profile: Profile;
}

interface LocalDatabase {
  users: StoredUserRecord[];
  shops: Shop[];
  categories: Category[];
  products: Product[];
  productImages: ProductImage[];
  orders: Order[];
  orderItems: OrderItem[];
  subscriptions: Subscription[];
  planConfigs: PlanConfig[];
  platformSettings: PlatformSettings;
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `${salt}:${password}`;
}

function defaultPlanList(): PlanConfig[] {
  return [
    { ...DEFAULT_PLAN_CONFIGS.starter },
    { ...DEFAULT_PLAN_CONFIGS.basic },
    { ...DEFAULT_PLAN_CONFIGS.pro },
  ];
}

function defaultPlatformSettings(): PlatformSettings {
  return {
    id: 1,
    platform_name: 'DukaanFlow',
    support_whatsapp: null,
    support_email: 'support@dukaanflow.app',
    allow_new_registrations: true,
    default_trial_days: 14,
    maintenance_notice: null,
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

function normalizeLegacyPlanTier(tier: string): PlanTier {
  if (tier === 'growth' || tier === 'basic') return 'basic';
  if (tier === 'scale' || tier === 'pro') return 'pro';
  return 'starter';
}

function normalizeLegacySubStatus(status: string): SubscriptionStatus {
  if (status === 'past_due' || status === 'expired') return 'expired';
  if (status === 'active' || status === 'suspended' || status === 'cancelled') {
    return status;
  }
  return 'trialing';
}

function ensureLocalPreviewAdminSeed(db: LocalDatabase): boolean {
  const existing = db.users.find(
    (u) => u.id === LOCAL_PREVIEW_ADMIN_ID || u.email === LOCAL_PREVIEW_ADMIN_EMAIL
  );
  if (existing) {
    if (existing.id === LOCAL_PREVIEW_ADMIN_ID && existing.passwordHash !== LOCAL_PREVIEW_ADMIN_HASH) {
      existing.passwordHash = LOCAL_PREVIEW_ADMIN_HASH;
      return true;
    }
    return false;
  }

  const now = new Date().toISOString();
  db.users.push({
    id: LOCAL_PREVIEW_ADMIN_ID,
    email: LOCAL_PREVIEW_ADMIN_EMAIL,
    passwordHash: LOCAL_PREVIEW_ADMIN_HASH,
    profile: {
      id: LOCAL_PREVIEW_ADMIN_ID,
      full_name: 'Platform Super Admin',
      email: LOCAL_PREVIEW_ADMIN_EMAIL,
      role: 'super_admin',
      created_at: now,
      updated_at: now,
    },
  });
  return true;
}

function readDb(): LocalDatabase {
  let db: LocalDatabase = {
    users: [],
    shops: [],
    categories: [],
    products: [],
    productImages: [],
    orders: [],
    orderItems: [],
    subscriptions: [],
    planConfigs: defaultPlanList(),
    platformSettings: defaultPlatformSettings(),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
      db = {
        users: parsed.users ?? [],
        shops: (parsed.shops ?? []).map((s) => ({
          ...s,
          status: s.status ?? (s.is_active ? 'active' : 'inactive'),
          suspension_reason: s.suspension_reason ?? null,
        })),
        categories: parsed.categories ?? [],
        products: (parsed.products ?? []).map((p) => ({
          ...p,
          view_count: p.view_count ?? 0,
        })),
        productImages: parsed.productImages ?? [],
        orders: parsed.orders ?? [],
        orderItems: parsed.orderItems ?? [],
        subscriptions: (parsed.subscriptions ?? []).map((sub) => ({
          ...sub,
          plan_tier: normalizeLegacyPlanTier(sub.plan_tier),
          status: normalizeLegacySubStatus(sub.status),
        })),
        planConfigs:
          parsed.planConfigs && parsed.planConfigs.length === 3
            ? parsed.planConfigs
            : defaultPlanList(),
        platformSettings: parsed.platformSettings ?? defaultPlatformSettings(),
      };
    }
  } catch {
    // Ignore corrupted storage
  }

  if (ensureLocalPreviewAdminSeed(db)) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore storage quota issues during bootstrap
    }
  }

  return db;
}

function writeDb(db: LocalDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function assertShopOwnership(db: LocalDatabase, shopId: string, ownerId: string): Shop {
  const shop = db.shops.find((s) => s.id === shopId && s.owner_id === ownerId);
  if (!shop) {
    throw new Error('Unauthorized shop access.');
  }
  return shop;
}

function assertLocalSuperAdmin(db: LocalDatabase, actorId: string): Profile {
  const user = db.users.find((u) => u.id === actorId);
  if (!user || user.profile.role !== 'super_admin') {
    throw new Error('Forbidden: Super Admin access required.');
  }
  return user.profile;
}

function getShopPlanAndAccess(db: LocalDatabase, shop: Shop): {
  subscription: Subscription | null;
  plan: PlanConfig;
  access: ReturnType<typeof evaluateShopAccess>;
} {
  const subscription = db.subscriptions.find((sub) => sub.shop_id === shop.id) || null;
  const tier = subscription?.plan_tier ?? 'starter';
  const plan =
    db.planConfigs.find((p) => p.tier === tier) ?? DEFAULT_PLAN_CONFIGS[tier];
  const access = evaluateShopAccess(shop, subscription);
  return { subscription, plan, access };
}

function assertLocalShopCanWrite(db: LocalDatabase, shop: Shop): PlanConfig {
  const { plan, access } = getShopPlanAndAccess(db, shop);
  if (!access.canWriteCatalog) {
    throw new Error(
      access.blockReason || 'Your shop plan or status does not allow catalog updates.'
    );
  }
  return plan;
}

function ensureDefaultCategoriesForShop(db: LocalDatabase, shopId: string): boolean {
  const existing = db.categories.filter((c) => c.shop_id === shopId);
  if (existing.length > 0) return false;

  const now = new Date().toISOString();
  DEFAULT_CATALOG_CATEGORIES.forEach((name, idx) => {
    db.categories.push({
      id: createUuid(),
      shop_id: shopId,
      name,
      slug: slugifyCategoryOrProduct(name, `cat-${idx + 1}`),
      sort_order: idx + 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  });
  return true;
}

export function getLocalSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setLocalSessionUserId(userId: string | null): void {
  if (userId) {
    localStorage.setItem(SESSION_KEY, userId);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function isLocalSlugAvailable(slug: string): boolean {
  const clean = slugifyShopName(slug);
  if (!clean) return false;
  const db = readDb();
  return !db.shops.some((s) => s.slug === clean);
}

export async function localRegisterShopOwner(input: RegistrationInput): Promise<{
  profile: Profile;
  shop: Shop;
}> {
  const db = readDb();
  if (!db.platformSettings.allow_new_registrations) {
    throw new Error('New shop registrations are currently paused by platform administration.');
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const cleanSlug = slugifyShopName(input.shopSlug);
  const cleanWhatsapp = normalizeWhatsappNumber(input.whatsappNumber);

  if (db.users.some((u) => u.email === cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  if (db.shops.some((s) => s.slug === cleanSlug)) {
    throw new Error('This shop slug is already taken. Please choose another.');
  }

  const now = new Date().toISOString();
  const userId = createUuid();
  const passwordHash = await hashPassword(input.password, userId);

  const profile: Profile = {
    id: userId,
    full_name: input.fullName.trim(),
    email: cleanEmail,
    role: 'shop_owner',
    created_at: now,
    updated_at: now,
  };

  const shop: Shop = {
    id: createUuid(),
    owner_id: userId,
    name: input.shopName.trim(),
    slug: cleanSlug,
    description: null,
    logo_path: null,
    category: input.shopCategory.trim(),
    whatsapp_number: cleanWhatsapp,
    address: null,
    opening_hours: null,
    status: 'active',
    suspension_reason: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  const trialDays = Math.max(0, db.platformSettings.default_trial_days ?? 14);
  const trialEnd =
    trialDays > 0
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const subscription: Subscription = {
    id: createUuid(),
    shop_id: shop.id,
    plan_tier: 'starter',
    status: 'trialing',
    current_period_start: now,
    current_period_end: trialEnd,
    requested_plan_tier: null,
    upgrade_requested_at: null,
    upgrade_request_note: null,
    activated_by: null,
    created_at: now,
    updated_at: now,
  };

  db.users.push({
    id: userId,
    email: cleanEmail,
    passwordHash,
    profile,
  });
  db.shops.push(shop);
  db.subscriptions.push(subscription);
  ensureDefaultCategoriesForShop(db, shop.id);

  writeDb(db);
  setLocalSessionUserId(userId);

  return { profile, shop };
}

export async function localLoginWithEmail(
  email: string,
  password: string
): Promise<{ profile: Profile; shop: Shop | null }> {
  const db = readDb();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find((u) => u.email === cleanEmail);

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const candidateHash = await hashPassword(password, user.id);
  if (candidateHash !== user.passwordHash) {
    throw new Error('Invalid email or password.');
  }

  setLocalSessionUserId(user.id);
  const shop = db.shops.find((s) => s.owner_id === user.id) || null;
  if (shop && ensureDefaultCategoriesForShop(db, shop.id)) {
    writeDb(db);
  }
  return { profile: user.profile, shop };
}

export function localLogout(): void {
  setLocalSessionUserId(null);
}

export function localGetSessionState(): { profile: Profile; shop: Shop | null } | null {
  const userId = getLocalSessionUserId();
  if (!userId) return null;

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    setLocalSessionUserId(null);
    return null;
  }

  const shop = db.shops.find((s) => s.owner_id === user.id) || null;
  if (shop && ensureDefaultCategoriesForShop(db, shop.id)) {
    writeDb(db);
  }
  return { profile: user.profile, shop };
}

export function localUpdateShop(ownerId: string, updates: ShopUpdateInput): Shop {
  const db = readDb();
  const index = db.shops.findIndex((s) => s.owner_id === ownerId);
  if (index === -1) {
    throw new Error('Shop record not found for this account.');
  }

  const current = db.shops[index];
  if (
    current.status === 'suspended' &&
    updates.is_active !== undefined &&
    updates.is_active !== current.is_active
  ) {
    throw new Error(
      'This shop has been suspended by platform administration and cannot be reactivated by the owner.'
    );
  }

  const nextActive =
    current.status === 'suspended'
      ? false
      : updates.is_active !== undefined
        ? updates.is_active
        : current.is_active;
  const nextStatus: ShopStatus =
    current.status === 'suspended'
      ? 'suspended'
      : nextActive
        ? 'active'
        : 'inactive';

  const updated: Shop = {
    ...current,
    name: updates.name.trim(),
    category: updates.category.trim(),
    whatsapp_number: normalizeWhatsappNumber(updates.whatsapp_number),
    description: updates.description?.trim() || null,
    address: updates.address?.trim() || null,
    opening_hours:
      updates.opening_hours !== undefined
        ? updates.opening_hours?.trim() || null
        : current.opening_hours ?? null,
    logo_path:
      updates.logo_path !== undefined ? updates.logo_path : current.logo_path,
    status: nextStatus,
    is_active: nextActive,
    updated_at: new Date().toISOString(),
  };

  db.shops[index] = updated;
  writeDb(db);
  return updated;
}

export function localGetDashboardSnapshot(shopId: string, ownerId: string): DashboardSnapshot {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  if (ensureDefaultCategoriesForShop(db, shop.id)) {
    writeDb(db);
  }

  const shopProducts = db.products.filter((p) => p.shop_id === shop.id);
  const shopCategories = db.categories.filter((c) => c.shop_id === shop.id);
  const shopOrders = db.orders
    .filter((o) => o.shop_id === shop.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const subscription = db.subscriptions.find((sub) => sub.shop_id === shop.id) || null;

  return {
    metrics: {
      totalProducts: shopProducts.length,
      activeProducts: shopProducts.filter((p) => p.is_active).length,
      lowStockProducts: shopProducts.filter(
        (p) => p.stock_quantity <= p.low_stock_threshold
      ).length,
      totalCategories: shopCategories.length,
      totalEnquiries: shopOrders.length,
      newEnquiries: shopOrders.filter((o) => o.status === 'new').length,
      confirmedOrders: shopOrders.filter((o) => o.status === 'confirmed').length,
      completedOrders: shopOrders.filter((o) => o.status === 'completed').length,
    },
    recentOrders: shopOrders.slice(0, 5),
    subscription,
  };
}

// ---------------------------------------------------------------------------
// Categories (Local Preview Store)
// ---------------------------------------------------------------------------
export function localListCategories(shopId: string, ownerId: string): CategoryWithCount[] {
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);
  if (ensureDefaultCategoriesForShop(db, shopId)) {
    writeDb(db);
  }

  return db.categories
    .filter((c) => c.shop_id === shopId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((cat) => ({
      ...cat,
      productCount: db.products.filter(
        (p) => p.shop_id === shopId && p.category_id === cat.id
      ).length,
    }));
}

export function localCreateCategory(
  shopId: string,
  ownerId: string,
  name: string
): Category {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  const { plan, access } = getShopPlanAndAccess(db, shop);
  const currentCatCount = db.categories.filter((c) => c.shop_id === shopId).length;
  const quota = checkPlanQuota({
    resource: 'categories',
    currentCount: currentCatCount,
    plan,
    access,
  });
  if (!quota.allowed) {
    throw new Error(quota.reason || 'Category quota reached.');
  }

  const trimmed = name.trim();
  const baseSlug = slugifyCategoryOrProduct(trimmed, 'category');
  const duplicate = db.categories.some(
    (c) =>
      c.shop_id === shopId &&
      (c.name.toLowerCase() === trimmed.toLowerCase() || c.slug === baseSlug)
  );
  if (duplicate) {
    throw new Error(`Category "${trimmed}" already exists in your shop.`);
  }

  const now = new Date().toISOString();
  const maxOrder = db.categories
    .filter((c) => c.shop_id === shopId)
    .reduce((max, c) => Math.max(max, c.sort_order), 0);

  const created: Category = {
    id: createUuid(),
    shop_id: shopId,
    name: trimmed,
    slug: baseSlug,
    sort_order: maxOrder + 1,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  db.categories.push(created);
  writeDb(db);
  return created;
}

export function localRenameCategory(
  shopId: string,
  ownerId: string,
  categoryId: string,
  newName: string
): Category {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const index = db.categories.findIndex(
    (c) => c.id === categoryId && c.shop_id === shopId
  );
  if (index === -1) {
    throw new Error('Category not found.');
  }

  const trimmed = newName.trim();
  const newSlug = slugifyCategoryOrProduct(trimmed, 'category');
  const duplicate = db.categories.some(
    (c) =>
      c.shop_id === shopId &&
      c.id !== categoryId &&
      (c.name.toLowerCase() === trimmed.toLowerCase() || c.slug === newSlug)
  );
  if (duplicate) {
    throw new Error(`Another category named "${trimmed}" already exists.`);
  }

  const updated: Category = {
    ...db.categories[index],
    name: trimmed,
    slug: newSlug,
    updated_at: new Date().toISOString(),
  };

  db.categories[index] = updated;
  writeDb(db);
  return updated;
}

export function localDeleteCategory(
  shopId: string,
  ownerId: string,
  categoryId: string,
  reassignToCategoryId?: string | null
): void {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const catIndex = db.categories.findIndex(
    (c) => c.id === categoryId && c.shop_id === shopId
  );
  if (catIndex === -1) {
    throw new Error('Category not found.');
  }

  const assignedProducts = db.products.filter(
    (p) => p.shop_id === shopId && p.category_id === categoryId
  );

  if (assignedProducts.length > 0) {
    if (!reassignToCategoryId || reassignToCategoryId === categoryId) {
      throw new Error(
        `Category contains ${assignedProducts.length} product(s). Reassign products before deleting.`
      );
    }

    const targetExists = db.categories.some(
      (c) => c.id === reassignToCategoryId && c.shop_id === shopId
    );
    if (!targetExists) {
      throw new Error('Target category does not belong to your shop.');
    }

    const now = new Date().toISOString();
    db.products = db.products.map((p) =>
      p.shop_id === shopId && p.category_id === categoryId
        ? { ...p, category_id: reassignToCategoryId, updated_at: now }
        : p
    );
  }

  db.categories.splice(catIndex, 1);
  writeDb(db);
}

// ---------------------------------------------------------------------------
// Products & Images (Local Preview Store)
// ---------------------------------------------------------------------------
function hydrateProduct(db: LocalDatabase, product: Product): ProductWithDetails {
  const category = product.category_id
    ? db.categories.find(
        (c) => c.id === product.category_id && c.shop_id === product.shop_id
      ) ?? null
    : null;

  const images = db.productImages
    .filter((img) => img.product_id === product.id && img.shop_id === product.shop_id)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

  return {
    ...product,
    view_count: product.view_count ?? 0,
    category,
    images,
  };
}

function makeUniqueProductSlug(db: LocalDatabase, shopId: string, name: string, excludeId?: string): string {
  const base = slugifyCategoryOrProduct(name, 'product');
  let candidate = base;
  let counter = 2;
  while (
    db.products.some(
      (p) => p.shop_id === shopId && p.id !== excludeId && p.slug === candidate
    )
  ) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export function localListProducts(shopId: string, ownerId: string): ProductWithDetails[] {
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);

  return db.products
    .filter((p) => p.shop_id === shopId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((p) => hydrateProduct(db, p));
}

export function localCreateProduct(
  shopId: string,
  ownerId: string,
  payload: ProductMutationPayload
): ProductWithDetails {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  const { plan, access } = getShopPlanAndAccess(db, shop);
  const currentProductCount = db.products.filter((p) => p.shop_id === shopId).length;
  const quota = checkPlanQuota({
    resource: 'products',
    currentCount: currentProductCount,
    plan,
    access,
  });
  if (!quota.allowed) {
    throw new Error(quota.reason || 'Product quota reached.');
  }

  if (payload.price_cents <= 0) {
    throw new Error('Product price must be greater than zero.');
  }
  if (payload.stock_quantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }
  if (payload.category_id) {
    const validCat = db.categories.some(
      (c) => c.id === payload.category_id && c.shop_id === shopId
    );
    if (!validCat) {
      throw new Error('Selected category does not belong to your shop.');
    }
  }

  const cleanSku = payload.sku?.trim() || null;
  if (
    cleanSku &&
    db.products.some(
      (p) => p.shop_id === shopId && p.sku && p.sku.toLowerCase() === cleanSku.toLowerCase()
    )
  ) {
    throw new Error(`SKU "${cleanSku}" is already used by another product in your shop.`);
  }

  const now = new Date().toISOString();
  const product: Product = {
    id: createUuid(),
    shop_id: shopId,
    category_id: payload.category_id,
    name: payload.name.trim(),
    slug: makeUniqueProductSlug(db, shopId, payload.name),
    description: payload.description?.trim() || null,
    sku: cleanSku,
    price_cents: payload.price_cents,
    sale_price_cents: payload.sale_price_cents,
    compare_at_price_cents: payload.sale_price_cents ? payload.price_cents : null,
    currency: 'INR',
    stock_quantity: payload.stock_quantity,
    low_stock_threshold: payload.low_stock_threshold,
    is_active: payload.is_active,
    is_featured: payload.is_featured,
    view_count: 0,
    created_at: now,
    updated_at: now,
  };

  db.products.push(product);
  writeDb(db);
  return hydrateProduct(db, product);
}

export function localUpdateProduct(
  shopId: string,
  ownerId: string,
  productId: string,
  payload: ProductMutationPayload
): ProductWithDetails {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const index = db.products.findIndex(
    (p) => p.id === productId && p.shop_id === shopId
  );
  if (index === -1) {
    throw new Error('Product not found.');
  }

  if (payload.price_cents <= 0) {
    throw new Error('Product price must be greater than zero.');
  }
  if (payload.stock_quantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }

  const cleanSku = payload.sku?.trim() || null;
  if (
    cleanSku &&
    db.products.some(
      (p) =>
        p.shop_id === shopId &&
        p.id !== productId &&
        p.sku &&
        p.sku.toLowerCase() === cleanSku.toLowerCase()
    )
  ) {
    throw new Error(`SKU "${cleanSku}" is already used by another product in your shop.`);
  }

  const updated: Product = {
    ...db.products[index],
    category_id: payload.category_id,
    name: payload.name.trim(),
    slug: makeUniqueProductSlug(db, shopId, payload.name, productId),
    description: payload.description?.trim() || null,
    sku: cleanSku,
    price_cents: payload.price_cents,
    sale_price_cents: payload.sale_price_cents,
    compare_at_price_cents: payload.sale_price_cents ? payload.price_cents : null,
    stock_quantity: payload.stock_quantity,
    low_stock_threshold: payload.low_stock_threshold,
    is_active: payload.is_active,
    is_featured: payload.is_featured,
    updated_at: new Date().toISOString(),
  };

  db.products[index] = updated;
  writeDb(db);
  return hydrateProduct(db, updated);
}

export function localDeleteProduct(
  shopId: string,
  ownerId: string,
  productId: string
): void {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const index = db.products.findIndex(
    (p) => p.id === productId && p.shop_id === shopId
  );
  if (index === -1) {
    throw new Error('Product not found.');
  }

  db.products.splice(index, 1);
  db.productImages = db.productImages.filter(
    (img) => !(img.product_id === productId && img.shop_id === shopId)
  );
  writeDb(db);
}

export function localPatchProductFlags(
  shopId: string,
  ownerId: string,
  productId: string,
  patch: Partial<Pick<Product, 'is_active' | 'is_featured' | 'stock_quantity'>>
): ProductWithDetails {
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const index = db.products.findIndex(
    (p) => p.id === productId && p.shop_id === shopId
  );
  if (index === -1) {
    throw new Error('Product not found.');
  }

  if (patch.stock_quantity !== undefined && patch.stock_quantity < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }

  db.products[index] = {
    ...db.products[index],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  writeDb(db);
  return hydrateProduct(db, db.products[index]);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Unable to read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export async function localUploadProductImages(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  files: File[];
  onProgress?: (completed: number, total: number) => void;
}): Promise<ProductImage[]> {
  const { shopId, ownerId, productId, files, onProgress } = params;
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  const { plan, access } = getShopPlanAndAccess(db, shop);

  const productExists = db.products.some(
    (p) => p.id === productId && p.shop_id === shopId
  );
  if (!productExists) {
    throw new Error('Product not found.');
  }

  const existing = db.productImages.filter(
    (img) => img.product_id === productId && img.shop_id === shopId
  );
  const quota = checkPlanQuota({
    resource: 'images',
    currentCount: existing.length + files.length - 1,
    plan,
    access,
  });
  if (!quota.allowed) {
    throw new Error(quota.reason || 'Image quota reached for this product.');
  }

  let hasPrimary = existing.some((img) => img.is_primary);
  let nextSort = existing.reduce((max, img) => Math.max(max, img.sort_order), 0) + 1;
  const createdImages: ProductImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dataUrl = await readFileAsDataUrl(file);
    const uniqueId = createUuid();
    const storagePath = buildProductImageStoragePath(shopId, productId, uniqueId, file.type);

    const record: ProductImage = {
      id: createUuid(),
      shop_id: shopId,
      product_id: productId,
      storage_path: storagePath,
      alt_text: file.name.replace(/\.[^.]+$/, ''),
      sort_order: nextSort++,
      is_primary: !hasPrimary,
      created_at: new Date().toISOString(),
      public_url: dataUrl,
    };

    hasPrimary = true;
    db.productImages.push(record);
    createdImages.push(record);
    onProgress?.(i + 1, files.length);
  }

  writeDb(db);
  return createdImages;
}

export async function localReplaceProductImage(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  imageId: string;
  newFile: File;
}): Promise<ProductImage> {
  const { shopId, ownerId, productId, imageId, newFile } = params;
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const index = db.productImages.findIndex(
    (img) => img.id === imageId && img.product_id === productId && img.shop_id === shopId
  );
  if (index === -1) {
    throw new Error('Product image not found.');
  }

  const dataUrl = await readFileAsDataUrl(newFile);
  const storagePath = buildProductImageStoragePath(
    shopId,
    productId,
    createUuid(),
    newFile.type
  );

  const updated: ProductImage = {
    ...db.productImages[index],
    storage_path: storagePath,
    alt_text: newFile.name.replace(/\.[^.]+$/, ''),
    public_url: dataUrl,
  };

  db.productImages[index] = updated;
  writeDb(db);
  return updated;
}

export function localDeleteProductImage(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  imageId: string;
}): void {
  const { shopId, ownerId, productId, imageId } = params;
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const index = db.productImages.findIndex(
    (img) => img.id === imageId && img.product_id === productId && img.shop_id === shopId
  );
  if (index === -1) {
    throw new Error('Product image not found.');
  }

  const wasPrimary = db.productImages[index].is_primary;
  db.productImages.splice(index, 1);

  if (wasPrimary) {
    const nextImg = db.productImages
      .filter((img) => img.product_id === productId && img.shop_id === shopId)
      .sort((a, b) => a.sort_order - b.sort_order)[0];
    if (nextImg) {
      nextImg.is_primary = true;
    }
  }

  writeDb(db);
}

export function localSetPrimaryProductImage(params: {
  shopId: string;
  ownerId: string;
  productId: string;
  imageId: string;
}): void {
  const { shopId, ownerId, productId, imageId } = params;
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);

  const target = db.productImages.find(
    (img) => img.id === imageId && img.product_id === productId && img.shop_id === shopId
  );
  if (!target) {
    throw new Error('Product image not found.');
  }

  db.productImages.forEach((img) => {
    if (img.product_id === productId && img.shop_id === shopId) {
      img.is_primary = img.id === imageId;
    }
  });

  writeDb(db);
}

export async function localUploadShopLogo(params: {
  shopId: string;
  ownerId: string;
  file: File;
}): Promise<string> {
  const { shopId, ownerId, file } = params;
  const db = readDb();
  const shop = assertShopOwnership(db, shopId, ownerId);
  assertLocalShopCanWrite(db, shop);
  const dataUrl = await readFileAsDataUrl(file);
  shop.logo_path = dataUrl;
  shop.updated_at = new Date().toISOString();
  writeDb(db);
  return dataUrl;
}

// ---------------------------------------------------------------------------
// Public Storefront, View Tracking & Order Enquiries (Local Preview Store)
// ---------------------------------------------------------------------------
export function localGetPublicStorefront(slug: string): PublicStorefrontData | null {
  const cleanSlug = slug.trim().toLowerCase();
  const db = readDb();
  const shop = db.shops.find((s) => s.slug === cleanSlug);
  if (!shop) return null;

  const { access } = getShopPlanAndAccess(db, shop);
  if (!access.canServePublicStorefront) {
    return null;
  }

  if (ensureDefaultCategoriesForShop(db, shop.id)) {
    writeDb(db);
  }

  const categories = db.categories
    .filter((c) => c.shop_id === shop.id && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const products = db.products
    .filter((p) => p.shop_id === shop.id && p.is_active)
    .sort(
      (a, b) =>
        Number(b.is_featured) - Number(a.is_featured) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((p) => hydrateProduct(db, p));

  return {
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      description: shop.description,
      logo_path: shop.logo_path,
      logo_url: shop.logo_path,
      category: shop.category,
      whatsapp_number: shop.whatsapp_number,
      address: shop.address,
      opening_hours: shop.opening_hours ?? null,
      is_active: shop.is_active,
    },
    categories,
    products,
  };
}

export function localRecordProductView(shopSlug: string, productSlug: string): void {
  const db = readDb();
  const cleanShop = shopSlug.trim().toLowerCase();
  const cleanProd = productSlug.trim().toLowerCase();
  const shop = db.shops.find((s) => s.slug === cleanShop);
  if (!shop) return;

  const { access } = getShopPlanAndAccess(db, shop);
  if (!access.canServePublicStorefront) return;

  const idx = db.products.findIndex(
    (p) => p.shop_id === shop.id && p.slug === cleanProd && p.is_active
  );
  if (idx === -1) return;

  db.products[idx] = {
    ...db.products[idx],
    view_count: (db.products[idx].view_count ?? 0) + 1,
  };
  writeDb(db);
}

export function localCreatePublicWhatsAppEnquiry(
  input: CreatePublicEnquiryInput
): PublicEnquiryConfirmation {
  const db = readDb();
  const cleanName = input.customerName.trim();
  if (cleanName.length < 2) {
    throw new Error('Customer name must be at least 2 characters.');
  }

  const shop = db.shops.find(
    (s) => s.slug === input.shopSlug.trim().toLowerCase()
  );
  if (!shop || !getShopPlanAndAccess(db, shop).access.canServePublicStorefront) {
    throw new Error('This storefront is unavailable or inactive.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('Select at least one product before submitting an enquiry.');
  }

  const qtyByProduct = new Map<string, number>();
  for (const raw of input.items) {
    if (!Number.isInteger(raw.quantity) || raw.quantity <= 0) {
      throw new Error('Requested quantity must be at least 1.');
    }
    qtyByProduct.set(raw.product_id, (qtyByProduct.get(raw.product_id) ?? 0) + raw.quantity);
  }

  const now = new Date().toISOString();
  const orderId = createUuid();
  const orderNumber = `DF-${orderId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

  let totalCents = 0;
  const orderItems: OrderItem[] = [];
  const itemsOut: PublicEnquiryConfirmation['items'] = [];

  for (const [productId, quantity] of qtyByProduct.entries()) {
    const product = db.products.find(
      (p) => p.id === productId && p.shop_id === shop.id && p.is_active
    );
    if (!product) {
      throw new Error('One or more selected products are no longer available.');
    }
    if (product.stock_quantity < quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}" (only ${product.stock_quantity} available).`
      );
    }

    const unitPriceCents = product.sale_price_cents ?? product.price_cents;
    const lineTotalCents = unitPriceCents * quantity;
    totalCents += lineTotalCents;

    orderItems.push({
      id: createUuid(),
      shop_id: shop.id,
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      unit_price_cents: unitPriceCents,
      quantity,
      line_total_cents: lineTotalCents,
      created_at: now,
    });

    itemsOut.push({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    });
  }

  const order: Order = {
    id: orderId,
    shop_id: shop.id,
    customer_id: getLocalSessionUserId(),
    order_number: orderNumber,
    customer_name: cleanName,
    customer_phone: input.customerPhone?.trim() || null,
    customer_email: null,
    delivery_address: null,
    status: 'new',
    subtotal_cents: totalCents,
    total_cents: totalCents,
    currency: 'INR',
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  db.orders.push(order);
  db.orderItems.push(...orderItems);
  writeDb(db);

  return {
    order_id: order.id,
    order_number: order.order_number,
    shop_id: shop.id,
    shop_name: shop.name,
    shop_slug: shop.slug,
    shop_whatsapp_number: shop.whatsapp_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    status: order.status,
    total_cents: order.total_cents,
    currency: order.currency,
    items: itemsOut,
    created_at: order.created_at,
  };
}

export function localListShopOrders(shopId: string, ownerId: string): OrderWithItems[] {
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);

  return db.orders
    .filter((o) => o.shop_id === shopId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((order) => ({
      ...order,
      items: db.orderItems.filter(
        (item) => item.order_id === order.id && item.shop_id === shopId
      ),
    }));
}

export function localUpdateOrderStatus(
  shopId: string,
  ownerId: string,
  orderId: string,
  status: OrderStatus
): OrderWithItems {
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);

  const index = db.orders.findIndex((o) => o.id === orderId && o.shop_id === shopId);
  if (index === -1) {
    throw new Error('Order not found.');
  }

  const updated: Order = {
    ...db.orders[index],
    status,
    updated_at: new Date().toISOString(),
  };

  db.orders[index] = updated;
  writeDb(db);

  return {
    ...updated,
    items: db.orderItems.filter(
      (item) => item.order_id === updated.id && item.shop_id === shopId
    ),
  };
}

// ---------------------------------------------------------------------------
// Subscriptions, Analytics & Platform Settings (Local Preview Store)
// ---------------------------------------------------------------------------
export function localListPlanConfigs(): PlanConfig[] {
  const db = readDb();
  return [...db.planConfigs].sort((a, b) => a.monthly_price_inr - b.monthly_price_inr);
}

export function localGetPlatformSettings(): PlatformSettings {
  const db = readDb();
  return { ...db.platformSettings };
}

export function localGetShopSubscription(shopId: string, ownerId: string): Subscription | null {
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);
  return db.subscriptions.find((s) => s.shop_id === shopId) ?? null;
}

export function localRequestSubscriptionUpgrade(params: {
  shopId: string;
  ownerId: string;
  requestedTier: PlanTier;
  note?: string;
}): Subscription {
  const { shopId, ownerId, requestedTier, note } = params;
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);

  const now = new Date().toISOString();
  const idx = db.subscriptions.findIndex((s) => s.shop_id === shopId);

  if (idx === -1) {
    const created: Subscription = {
      id: createUuid(),
      shop_id: shopId,
      plan_tier: 'starter',
      status: 'trialing',
      current_period_start: now,
      current_period_end: null,
      requested_plan_tier: requestedTier,
      upgrade_requested_at: now,
      upgrade_request_note: note?.trim() || null,
      activated_by: null,
      created_at: now,
      updated_at: now,
    };
    db.subscriptions.push(created);
    writeDb(db);
    return created;
  }

  const updated: Subscription = {
    ...db.subscriptions[idx],
    requested_plan_tier: requestedTier,
    upgrade_requested_at: now,
    upgrade_request_note: note?.trim() || null,
    updated_at: now,
  };
  db.subscriptions[idx] = updated;
  writeDb(db);
  return updated;
}

export function localGetShopAnalytics(shopId: string, ownerId: string): ShopAnalyticsData {
  const db = readDb();
  assertShopOwnership(db, shopId, ownerId);

  const shopProducts = db.products.filter((p) => p.shop_id === shopId);
  const shopCategories = db.categories.filter((c) => c.shop_id === shopId);
  const shopOrders = db.orders.filter((o) => o.shop_id === shopId);

  const statusBreakdown: Record<OrderStatus, number> = {
    new: 0,
    contacted: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  let estimatedEnquiryValueCents = 0;
  for (const order of shopOrders) {
    statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
    if (order.status !== 'cancelled') {
      estimatedEnquiryValueCents += order.total_cents;
    }
  }

  const mostViewedProducts = shopProducts
    .filter((p) => (p.view_count ?? 0) > 0)
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      view_count: p.view_count ?? 0,
    }));

  const recentActivity: ShopAnalyticsData['recentActivity'] = [
    ...shopOrders.map((o) => ({
      id: `order-${o.id}`,
      type: 'order' as const,
      title: `Enquiry ${o.order_number} from ${o.customer_name}`,
      subtitle: `Status: ${o.status}`,
      timestamp: o.created_at,
    })),
    ...shopProducts.map((p) => ({
      id: `prod-${p.id}`,
      type: 'product' as const,
      title: `${p.created_at === p.updated_at ? 'Product added' : 'Product updated'}: ${p.name}`,
      subtitle: p.is_active ? 'Active in catalog' : 'Hidden from storefront',
      timestamp: p.updated_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return {
    totalProducts: shopProducts.length,
    activeProducts: shopProducts.filter((p) => p.is_active).length,
    inactiveProducts: shopProducts.filter((p) => !p.is_active).length,
    featuredProducts: shopProducts.filter((p) => p.is_featured).length,
    lowStockProducts: shopProducts.filter(
      (p) => p.stock_quantity <= p.low_stock_threshold
    ).length,
    totalCategories: shopCategories.length,
    totalEnquiries: shopOrders.length,
    estimatedEnquiryValueCents,
    statusBreakdown,
    mostViewedProducts,
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Super Admin Controls (Local Preview Store — Strictly Role-Checked)
// ---------------------------------------------------------------------------
export function localAdminGetOverview(actorId: string): AdminPlatformOverview {
  const db = readDb();
  assertLocalSuperAdmin(db, actorId);

  const shops: AdminShopSummary[] = [...db.shops]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((s) => {
      const sub = db.subscriptions.find((item) => item.shop_id === s.id);
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        category: s.category,
        status: s.status ?? (s.is_active ? 'active' : 'inactive'),
        suspension_reason: s.suspension_reason ?? null,
        is_active: s.is_active,
        created_at: s.created_at,
        product_count: db.products.filter((p) => p.shop_id === s.id).length,
        enquiry_count: db.orders.filter((o) => o.shop_id === s.id).length,
        plan_tier: sub?.plan_tier ?? 'starter',
        subscription_status: sub?.status ?? 'trialing',
        current_period_start: sub?.current_period_start ?? null,
        current_period_end: sub?.current_period_end ?? null,
        requested_plan_tier: sub?.requested_plan_tier ?? null,
        upgrade_requested_at: sub?.upgrade_requested_at ?? null,
        upgrade_request_note: sub?.upgrade_request_note ?? null,
      };
    });

  return {
    totalShops: shops.length,
    activeShops: shops.filter((s) => s.status === 'active').length,
    suspendedShops: shops.filter((s) => s.status === 'suspended').length,
    inactiveShops: shops.filter((s) => s.status === 'inactive').length,
    totalProducts: db.products.length,
    totalEnquiries: db.orders.length,
    pendingUpgradeRequests: shops.filter((s) => Boolean(s.requested_plan_tier)).length,
    shops,
  };
}

export function localAdminUpdateShopStatus(params: {
  actorId: string;
  shopId: string;
  status: ShopStatus;
  reason?: string;
}): Shop {
  const { actorId, shopId, status, reason } = params;
  const db = readDb();
  assertLocalSuperAdmin(db, actorId);

  const idx = db.shops.findIndex((s) => s.id === shopId);
  if (idx === -1) {
    throw new Error('Shop not found.');
  }

  const updated: Shop = {
    ...db.shops[idx],
    status,
    is_active: status === 'active',
    suspension_reason: status === 'suspended' ? reason?.trim() || null : null,
    updated_at: new Date().toISOString(),
  };

  db.shops[idx] = updated;
  writeDb(db);
  return updated;
}

export function localAdminUpdateSubscription(params: {
  actorId: string;
  shopId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  periodEnd: string | null;
}): Subscription {
  const { actorId, shopId, planTier, status, periodEnd } = params;
  const db = readDb();
  assertLocalSuperAdmin(db, actorId);

  const shopExists = db.shops.some((s) => s.id === shopId);
  if (!shopExists) {
    throw new Error('Shop not found.');
  }

  const now = new Date().toISOString();
  const idx = db.subscriptions.findIndex((s) => s.shop_id === shopId);

  if (idx === -1) {
    const created: Subscription = {
      id: createUuid(),
      shop_id: shopId,
      plan_tier: planTier,
      status,
      current_period_start: now,
      current_period_end: periodEnd,
      requested_plan_tier: null,
      upgrade_requested_at: null,
      upgrade_request_note: null,
      activated_by: actorId,
      created_at: now,
      updated_at: now,
    };
    db.subscriptions.push(created);
    writeDb(db);
    return created;
  }

  const current = db.subscriptions[idx];
  const updated: Subscription = {
    ...current,
    plan_tier: planTier,
    status,
    current_period_start:
      current.plan_tier !== planTier || current.status !== status
        ? now
        : current.current_period_start,
    current_period_end: periodEnd,
    requested_plan_tier: null,
    upgrade_requested_at: null,
    upgrade_request_note: null,
    activated_by: actorId,
    updated_at: now,
  };
  db.subscriptions[idx] = updated;
  writeDb(db);
  return updated;
}

export function localAdminUpdatePlanConfig(params: {
  actorId: string;
  tier: PlanTier;
  updates: Partial<Omit<PlanConfig, 'tier'>>;
}): PlanConfig {
  const { actorId, tier, updates } = params;
  const db = readDb();
  assertLocalSuperAdmin(db, actorId);

  const idx = db.planConfigs.findIndex((p) => p.tier === tier);
  if (idx === -1) {
    throw new Error('Plan configuration not found.');
  }

  const updated: PlanConfig = {
    ...db.planConfigs[idx],
    ...updates,
    tier,
    updated_at: new Date().toISOString(),
  };
  db.planConfigs[idx] = updated;
  writeDb(db);
  return updated;
}

export function localAdminUpdatePlatformSettings(params: {
  actorId: string;
  updates: Partial<Omit<PlatformSettings, 'id' | 'updated_at' | 'updated_by'>>;
}): PlatformSettings {
  const { actorId, updates } = params;
  const db = readDb();
  assertLocalSuperAdmin(db, actorId);

  db.platformSettings = {
    ...db.platformSettings,
    ...updates,
    id: 1,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  };
  writeDb(db);
  return { ...db.platformSettings };
}
