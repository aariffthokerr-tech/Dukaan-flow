export type UserRole = 'super_admin' | 'shop_owner' | 'customer';

export type ShopStatus = 'active' | 'inactive' | 'suspended';

export type OrderStatus =
  | 'new'
  | 'contacted'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type PlanTier = 'starter' | 'basic' | 'pro';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'cancelled';

export type AnalyticsLevel = 'basic_counts' | 'standard' | 'advanced';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  category: string;
  whatsapp_number: string;
  address: string | null;
  opening_hours?: string | null;
  status: ShopStatus;
  suspension_reason?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicShopSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  logo_url?: string | null;
  category: string;
  whatsapp_number: string;
  address: string | null;
  opening_hours: string | null;
  is_active: boolean;
}

export interface Category {
  id: string;
  shop_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithCount extends Category {
  productCount: number;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  compare_at_price_cents: number | null;
  currency: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  view_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  shop_id: string;
  product_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  public_url?: string;
}

export interface ProductWithDetails extends Product {
  category: Category | null;
  images: ProductImage[];
}

export interface PublicStorefrontData {
  shop: PublicShopSummary;
  categories: Category[];
  products: ProductWithDetails[];
}

export interface EnquiryCartItem {
  productId: string;
  productSlug: string;
  name: string;
  sku: string | null;
  unitPriceCents: number;
  regularPriceCents: number;
  currency: string;
  quantity: number;
  maxStock: number;
  imageUrl: string | null;
}

export interface ProductFormInput {
  name: string;
  description: string;
  regularPrice: string;
  salePrice: string;
  sku: string;
  stockQuantity: string;
  lowStockThreshold: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductMutationPayload {
  name: string;
  description: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  category_id: string | null;
  is_active: boolean;
  is_featured: boolean;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string | null;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_address: string | null;
  status: OrderStatus;
  subtotal_cents: number;
  total_cents: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  shop_id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_sku?: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface CreatePublicEnquiryInput {
  shopSlug: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  items: Array<{ product_id: string; quantity: number }>;
}

export interface PublicEnquiryConfirmation {
  order_id: string;
  order_number: string;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  shop_whatsapp_number: string;
  customer_name: string;
  customer_phone: string | null;
  status: OrderStatus;
  total_cents: number;
  currency: string;
  items: Array<{
    product_id: string;
    product_name: string;
    product_sku: string | null;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
  created_at: string;
}

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  description: string;
  monthly_price_inr: number;
  max_products: number;
  max_categories: number;
  max_images_per_product: number;
  analytics_level: AnalyticsLevel;
  custom_branding_enabled: boolean;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  shop_id: string;
  plan_tier: PlanTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  requested_plan_tier?: PlanTier | null;
  upgrade_requested_at?: string | null;
  upgrade_request_note?: string | null;
  activated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: number;
  platform_name: string;
  support_whatsapp: string | null;
  support_email: string | null;
  allow_new_registrations: boolean;
  default_trial_days: number;
  maintenance_notice: string | null;
  updated_at: string;
  updated_by?: string | null;
}

export interface AdminShopSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: ShopStatus;
  suspension_reason: string | null;
  is_active: boolean;
  created_at: string;
  product_count: number;
  enquiry_count: number;
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  requested_plan_tier: PlanTier | null;
  upgrade_requested_at: string | null;
  upgrade_request_note: string | null;
}

export interface AdminPlatformOverview {
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  inactiveShops: number;
  totalProducts: number;
  totalEnquiries: number;
  pendingUpgradeRequests: number;
  shops: AdminShopSummary[];
}

export interface ShopAnalyticsData {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  lowStockProducts: number;
  totalCategories: number;
  totalEnquiries: number;
  estimatedEnquiryValueCents: number;
  statusBreakdown: Record<OrderStatus, number>;
  mostViewedProducts: Array<{
    id: string;
    name: string;
    slug: string;
    view_count: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'order' | 'product';
    title: string;
    subtitle: string;
    timestamp: string;
  }>;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  shopName: string;
  shopCategory: string;
  shopSlug: string;
  whatsappNumber: string;
}

export interface ShopUpdateInput {
  name: string;
  category: string;
  whatsapp_number: string;
  description: string | null;
  address: string | null;
  opening_hours?: string | null;
  logo_path?: string | null;
  is_active?: boolean;
}

export interface DashboardMetrics {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalCategories: number;
  totalEnquiries: number;
  newEnquiries: number;
  confirmedOrders: number;
  completedOrders: number;
}

export interface DashboardSnapshot {
  metrics: DashboardMetrics;
  recentOrders: Order[];
  subscription: Subscription | null;
}

export const SHOP_CATEGORIES = [
  'Apparel & Fashion',
  'Bakery & Confectionery',
  'Beauty & Personal Care',
  'Books & Stationery',
  'Electronics & Accessories',
  'Grocery & Essentials',
  'Home & Ceramics',
  'Jewelry & Watches',
  'Pharmacy & Wellness',
  'Specialty Coffee & Tea',
  'General Retail',
] as const;

export const DEFAULT_CATALOG_CATEGORIES = [
  'Hardware',
  'Electrical',
  'Electronics',
  'Mobile Accessories',
  'Clothing',
  'Grocery',
  'Home & Kitchen',
  'Other',
] as const;

export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
