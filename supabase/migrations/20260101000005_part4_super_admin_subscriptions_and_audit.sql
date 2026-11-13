-- DukaanFlow Part 4/4: Super Admin, Subscription Architecture, Plan Enforcement & Security Audit

-- ---------------------------------------------------------------------------
-- 1. Shop Status & Suspension Protection
-- ---------------------------------------------------------------------------
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

UPDATE public.shops
SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
WHERE status NOT IN ('active', 'inactive', 'suspended')
   OR (status = 'active' AND is_active = FALSE)
   OR (status = 'inactive' AND is_active = TRUE);

ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_status_check,
  ADD CONSTRAINT shops_status_check
    CHECK (status IN ('active', 'inactive', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_shops_status ON public.shops(status);

-- Ensure shop owners cannot bypass suspension or self-reactivate a suspended shop
CREATE OR REPLACE FUNCTION public.enforce_shop_status_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    IF OLD.status = 'suspended' THEN
      IF NEW.status IS DISTINCT FROM OLD.status OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'This shop has been suspended by platform administration and cannot be reactivated by the owner.';
      END IF;
    END IF;

    IF NEW.status = 'suspended' THEN
      RAISE EXCEPTION 'Only platform administrators can suspend a shop.';
    END IF;

    -- Keep status and is_active synchronized when owner toggles visibility
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.is_active := (NEW.status = 'active');
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
    END IF;
  ELSE
    -- Admin or trusted system context: keep is_active synchronized with status
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.is_active := (NEW.status = 'active');
    ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
    END IF;

    IF NEW.status <> 'suspended' THEN
      NEW.suspension_reason := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shops_enforce_status_sync ON public.shops;
CREATE TRIGGER trg_shops_enforce_status_sync
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_shop_status_sync();

-- ---------------------------------------------------------------------------
-- 2. Real Product View Counter (Zero Fake Analytics)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0);

CREATE OR REPLACE FUNCTION public.record_product_view(
  p_shop_slug TEXT,
  p_product_slug TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  SELECT s.id INTO v_shop_id
  FROM public.shops s
  LEFT JOIN public.subscriptions sub ON sub.shop_id = s.id
  WHERE s.slug = lower(trim(COALESCE(p_shop_slug, '')))
    AND s.status = 'active'
    AND s.is_active = TRUE
    AND COALESCE(sub.status, 'trialing') IN ('trialing', 'active')
    AND (sub.current_period_end IS NULL OR sub.current_period_end >= NOW())
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.products
  SET view_count = view_count + 1
  WHERE shop_id = v_shop_id
    AND slug = lower(trim(COALESCE(p_product_slug, '')))
    AND is_active = TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.record_product_view(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_product_view(TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Configurable Subscription Plans (Starter, Basic, Pro) & Platform Settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  tier TEXT PRIMARY KEY CHECK (tier IN ('starter', 'basic', 'pro')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  monthly_price_inr INTEGER NOT NULL CHECK (monthly_price_inr >= 0),
  max_products INTEGER NOT NULL CHECK (max_products > 0),
  max_categories INTEGER NOT NULL CHECK (max_categories > 0),
  max_images_per_product INTEGER NOT NULL CHECK (max_images_per_product > 0),
  analytics_level TEXT NOT NULL CHECK (analytics_level IN ('basic_counts', 'standard', 'advanced')),
  custom_branding_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans (
  tier,
  name,
  description,
  monthly_price_inr,
  max_products,
  max_categories,
  max_images_per_product,
  analytics_level,
  custom_branding_enabled
)
VALUES
  ('starter', 'Starter', 'Limited product catalog, public storefront, and basic WhatsApp enquiries.', 0, 25, 10, 3, 'basic_counts', FALSE),
  ('basic', 'Basic', 'Higher product and category limits with standard storefront analytics.', 999, 150, 25, 5, 'standard', TRUE),
  ('pro', 'Pro', 'Highest catalog capacity, advanced analytics, and full storefront branding.', 2499, 1000, 100, 10, 'advanced', TRUE)
ON CONFLICT (tier) DO NOTHING;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_read_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read_all"
  ON public.subscription_plans FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "subscription_plans_admin_write" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_write"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_name TEXT NOT NULL DEFAULT 'DukaanFlow',
  support_whatsapp TEXT,
  support_email TEXT,
  allow_new_registrations BOOLEAN NOT NULL DEFAULT TRUE,
  default_trial_days INTEGER NOT NULL DEFAULT 14 CHECK (default_trial_days >= 0),
  maintenance_notice TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (
  id,
  platform_name,
  support_email,
  allow_new_registrations,
  default_trial_days
)
VALUES (1, 'DukaanFlow', 'support@dukaanflow.app', TRUE, 14)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_read_all" ON public.platform_settings;
CREATE POLICY "platform_settings_read_all"
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "platform_settings_admin_write" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_write"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Update subscriptions schema for Starter / Basic / Pro + Upgrade Requests
UPDATE public.subscriptions
SET plan_tier = CASE
  WHEN plan_tier = 'growth' THEN 'basic'
  WHEN plan_tier = 'scale' THEN 'pro'
  ELSE plan_tier
END
WHERE plan_tier IN ('growth', 'scale');

UPDATE public.subscriptions
SET status = 'expired'
WHERE status = 'past_due';

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_tier_check,
  ADD CONSTRAINT subscriptions_plan_tier_check
    CHECK (plan_tier IN ('starter', 'basic', 'pro'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check,
  ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('trialing', 'active', 'expired', 'suspended', 'cancelled'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS requested_plan_tier TEXT CHECK (requested_plan_tier IN ('starter', 'basic', 'pro')),
  ADD COLUMN IF NOT EXISTS upgrade_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upgrade_request_note TEXT,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Set default 14-day trial window where missing on existing rows
UPDATE public.subscriptions
SET current_period_end = current_period_start + INTERVAL '14 days'
WHERE status = 'trialing'
  AND current_period_end IS NULL;

-- Only super_admin may mutate subscriptions directly; owners use request_subscription_upgrade()
DROP POLICY IF EXISTS "subscriptions_admin_all" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_all"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 4. Trusted Backend Plan & Access Limit Enforcement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_shop_can_write(p_shop_id UUID)
RETURNS public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.shops;
  v_sub public.subscriptions;
  v_plan public.subscription_plans;
BEGIN
  SELECT * INTO v_shop FROM public.shops WHERE id = p_shop_id;
  IF v_shop.id IS NULL THEN
    RAISE EXCEPTION 'Shop workspace not found.';
  END IF;

  IF v_shop.status = 'suspended' THEN
    RAISE EXCEPTION 'This shop is suspended. Catalog changes are disabled until reactivated by Super Admin.';
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE shop_id = p_shop_id;

  IF v_sub.id IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE tier = 'starter';
    RETURN v_plan;
  END IF;

  IF v_sub.status IN ('expired', 'suspended', 'cancelled') THEN
    RAISE EXCEPTION 'Your subscription is % . Request plan activation to continue adding catalog items.', v_sub.status;
  END IF;

  IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < NOW() THEN
    RAISE EXCEPTION 'Your subscription expired on %. Request renewal from the Plan & Billing page.', to_char(v_sub.current_period_end, 'YYYY-MM-DD');
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE tier = v_sub.plan_tier;
  IF v_plan.tier IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE tier = 'starter';
  END IF;

  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_product_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.subscription_plans;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  v_plan := public.assert_shop_can_write(NEW.shop_id);

  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.products
    WHERE shop_id = NEW.shop_id;

    IF v_count >= v_plan.max_products THEN
      RAISE EXCEPTION 'Plan limit reached: % plan allows up to % products. Request an upgrade to add more.', v_plan.name, v_plan.max_products;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_enforce_plan_limit ON public.products;
CREATE TRIGGER trg_products_enforce_plan_limit
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_plan_limit();

CREATE OR REPLACE FUNCTION public.enforce_category_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.subscription_plans;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  v_plan := public.assert_shop_can_write(NEW.shop_id);

  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.categories
    WHERE shop_id = NEW.shop_id;

    IF v_count >= v_plan.max_categories THEN
      RAISE EXCEPTION 'Plan limit reached: % plan allows up to % categories. Request an upgrade to add more.', v_plan.name, v_plan.max_categories;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_enforce_plan_limit ON public.categories;
CREATE TRIGGER trg_categories_enforce_plan_limit
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_category_plan_limit();

CREATE OR REPLACE FUNCTION public.enforce_product_image_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.subscription_plans;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  v_plan := public.assert_shop_can_write(NEW.shop_id);

  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.product_images
    WHERE product_id = NEW.product_id
      AND shop_id = NEW.shop_id;

    IF v_count >= v_plan.max_images_per_product THEN
      RAISE EXCEPTION 'Image limit reached: % plan allows up to % images per product.', v_plan.name, v_plan.max_images_per_product;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_images_enforce_plan_limit ON public.product_images;
CREATE TRIGGER trg_product_images_enforce_plan_limit
  BEFORE INSERT ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_image_plan_limit();

-- ---------------------------------------------------------------------------
-- 5. Update Public Storefront & Enquiry RPCs for Suspension / Expiry Enforcement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_storefront(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop RECORD;
  v_categories JSONB;
  v_products JSONB;
BEGIN
  SELECT
    s.id,
    s.name,
    s.slug,
    s.description,
    s.logo_path,
    s.category,
    s.whatsapp_number,
    s.address,
    s.opening_hours,
    s.is_active,
    s.status
  INTO v_shop
  FROM public.shops s
  LEFT JOIN public.subscriptions sub ON sub.shop_id = s.id
  WHERE s.slug = lower(trim(p_slug))
    AND s.status = 'active'
    AND s.is_active = TRUE
    AND COALESCE(sub.status, 'trialing') IN ('trialing', 'active')
    AND (sub.current_period_end IS NULL OR sub.current_period_end >= NOW())
  LIMIT 1;

  IF v_shop.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'shop_id', c.shop_id,
        'name', c.name,
        'slug', c.slug,
        'sort_order', c.sort_order,
        'is_active', c.is_active,
        'created_at', c.created_at,
        'updated_at', c.updated_at
      )
      ORDER BY c.sort_order ASC, c.name ASC
    ),
    '[]'::jsonb
  )
  INTO v_categories
  FROM public.categories c
  WHERE c.shop_id = v_shop.id
    AND c.is_active = TRUE;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'shop_id', p.shop_id,
        'category_id', p.category_id,
        'name', p.name,
        'slug', p.slug,
        'description', p.description,
        'sku', p.sku,
        'price_cents', p.price_cents,
        'sale_price_cents', p.sale_price_cents,
        'compare_at_price_cents', p.compare_at_price_cents,
        'currency', p.currency,
        'stock_quantity', p.stock_quantity,
        'low_stock_threshold', p.low_stock_threshold,
        'is_active', p.is_active,
        'is_featured', p.is_featured,
        'view_count', p.view_count,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'category', CASE
          WHEN cat.id IS NOT NULL THEN jsonb_build_object(
            'id', cat.id,
            'shop_id', cat.shop_id,
            'name', cat.name,
            'slug', cat.slug,
            'sort_order', cat.sort_order,
            'is_active', cat.is_active,
            'created_at', cat.created_at,
            'updated_at', cat.updated_at
          )
          ELSE NULL
        END,
        'images', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', img.id,
                'shop_id', img.shop_id,
                'product_id', img.product_id,
                'storage_path', img.storage_path,
                'alt_text', img.alt_text,
                'sort_order', img.sort_order,
                'is_primary', img.is_primary,
                'created_at', img.created_at
              )
              ORDER BY img.is_primary DESC, img.sort_order ASC
            )
            FROM public.product_images img
            WHERE img.product_id = p.id
              AND img.shop_id = v_shop.id
          ),
          '[]'::jsonb
        )
      )
      ORDER BY p.is_featured DESC, p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_products
  FROM public.products p
  LEFT JOIN public.categories cat
    ON cat.id = p.category_id
    AND cat.shop_id = v_shop.id
  WHERE p.shop_id = v_shop.id
    AND p.is_active = TRUE;

  RETURN jsonb_build_object(
    'shop', jsonb_build_object(
      'id', v_shop.id,
      'name', v_shop.name,
      'slug', v_shop.slug,
      'description', v_shop.description,
      'logo_path', v_shop.logo_path,
      'category', v_shop.category,
      'whatsapp_number', v_shop.whatsapp_number,
      'address', v_shop.address,
      'opening_hours', v_shop.opening_hours,
      'is_active', v_shop.is_active
    ),
    'categories', v_categories,
    'products', v_products
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_whatsapp_enquiry(
  p_shop_slug TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.shops;
  v_sub public.subscriptions;
  v_clean_name TEXT := trim(COALESCE(p_customer_name, ''));
  v_clean_phone TEXT := NULLIF(trim(COALESCE(p_customer_phone, '')), '');
  v_clean_notes TEXT := NULLIF(trim(COALESCE(p_notes, '')), '');
  v_item RECORD;
  v_product public.products;
  v_unit_price INTEGER;
  v_line_total INTEGER;
  v_subtotal INTEGER := 0;
  v_order_id UUID;
  v_order_number TEXT;
  v_items_out JSONB := '[]'::jsonb;
  v_item_count INTEGER := 0;
BEGIN
  IF char_length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters.';
  END IF;

  SELECT *
  INTO v_shop
  FROM public.shops
  WHERE slug = lower(trim(COALESCE(p_shop_slug, '')))
    AND status = 'active'
    AND is_active = TRUE
  LIMIT 1;

  IF v_shop.id IS NULL THEN
    RAISE EXCEPTION 'This storefront is unavailable or inactive.';
  END IF;

  SELECT * INTO v_sub FROM public.subscriptions WHERE shop_id = v_shop.id;
  IF v_sub.id IS NOT NULL AND (
    v_sub.status NOT IN ('trialing', 'active')
    OR (v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < NOW())
  ) THEN
    RAISE EXCEPTION 'This storefront is temporarily unavailable because its shop plan is inactive.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Select at least one product before submitting an enquiry.';
  END IF;

  v_order_number := 'DF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.orders (
    shop_id,
    customer_id,
    order_number,
    customer_name,
    customer_phone,
    status,
    subtotal_cents,
    total_cents,
    currency,
    notes
  )
  VALUES (
    v_shop.id,
    auth.uid(),
    v_order_number,
    v_clean_name,
    v_clean_phone,
    'new',
    0,
    0,
    'INR',
    v_clean_notes
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT
      (elem->>'product_id')::uuid AS product_id,
      SUM((elem->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) AS elem
    GROUP BY (elem->>'product_id')::uuid
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Requested quantity must be at least 1.';
    END IF;

    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
      AND shop_id = v_shop.id
      AND is_active = TRUE;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'One or more selected products are no longer available.';
    END IF;

    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%" (only % available).', v_product.name, v_product.stock_quantity;
    END IF;

    v_unit_price := COALESCE(v_product.sale_price_cents, v_product.price_cents);
    v_line_total := v_unit_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_item_count := v_item_count + 1;

    INSERT INTO public.order_items (
      shop_id,
      order_id,
      product_id,
      product_name,
      product_sku,
      unit_price_cents,
      quantity,
      line_total_cents
    )
    VALUES (
      v_shop.id,
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.sku,
      v_unit_price,
      v_item.quantity,
      v_line_total
    );

    v_items_out := v_items_out || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_sku', v_product.sku,
      'quantity', v_item.quantity,
      'unit_price_cents', v_unit_price,
      'line_total_cents', v_line_total
    );
  END LOOP;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Select at least one valid product.';
  END IF;

  UPDATE public.orders
  SET subtotal_cents = v_subtotal,
      total_cents = v_subtotal
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'shop_id', v_shop.id,
    'shop_name', v_shop.name,
    'shop_slug', v_shop.slug,
    'shop_whatsapp_number', v_shop.whatsapp_number,
    'customer_name', v_clean_name,
    'customer_phone', v_clean_phone,
    'status', 'new',
    'total_cents', v_subtotal,
    'currency', 'INR',
    'items', v_items_out,
    'created_at', NOW()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Shop Owner Upgrade Request & Super Admin Management RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_subscription_upgrade(
  p_shop_id UUID,
  p_requested_tier TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.subscriptions;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_owns_shop(p_shop_id) THEN
    RAISE EXCEPTION 'Unauthorized subscription access.';
  END IF;

  IF p_requested_tier NOT IN ('starter', 'basic', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan tier selected.';
  END IF;

  UPDATE public.subscriptions
  SET requested_plan_tier = p_requested_tier,
      upgrade_requested_at = NOW(),
      upgrade_request_note = NULLIF(trim(COALESCE(p_note, '')), '')
  WHERE shop_id = p_shop_id
  RETURNING * INTO v_sub;

  IF v_sub.id IS NULL THEN
    INSERT INTO public.subscriptions (
      shop_id,
      plan_tier,
      status,
      requested_plan_tier,
      upgrade_requested_at,
      upgrade_request_note
    )
    VALUES (
      p_shop_id,
      'starter',
      'trialing',
      p_requested_tier,
      NOW(),
      NULLIF(trim(COALESCE(p_note, '')), '')
    )
    RETURNING * INTO v_sub;
  END IF;

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.request_subscription_upgrade(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_subscription_upgrade(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_platform_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_shops INTEGER;
  v_active_shops INTEGER;
  v_suspended_shops INTEGER;
  v_inactive_shops INTEGER;
  v_total_products INTEGER;
  v_total_enquiries INTEGER;
  v_pending_upgrades INTEGER;
  v_recent JSONB;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin access required.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'suspended'),
    COUNT(*) FILTER (WHERE status = 'inactive')
  INTO v_total_shops, v_active_shops, v_suspended_shops, v_inactive_shops
  FROM public.shops;

  SELECT COUNT(*) INTO v_total_products FROM public.products;
  SELECT COUNT(*) INTO v_total_enquiries FROM public.orders;
  SELECT COUNT(*) INTO v_pending_upgrades FROM public.subscriptions WHERE requested_plan_tier IS NOT NULL;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug,
        'category', s.category,
        'status', s.status,
        'suspension_reason', s.suspension_reason,
        'is_active', s.is_active,
        'created_at', s.created_at,
        'product_count', (SELECT COUNT(*) FROM public.products p WHERE p.shop_id = s.id),
        'enquiry_count', (SELECT COUNT(*) FROM public.orders o WHERE o.shop_id = s.id),
        'plan_tier', COALESCE(sub.plan_tier, 'starter'),
        'subscription_status', COALESCE(sub.status, 'trialing'),
        'current_period_start', sub.current_period_start,
        'current_period_end', sub.current_period_end,
        'requested_plan_tier', sub.requested_plan_tier,
        'upgrade_requested_at', sub.upgrade_requested_at,
        'upgrade_request_note', sub.upgrade_request_note
      )
      ORDER BY s.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent
  FROM public.shops s
  LEFT JOIN public.subscriptions sub ON sub.shop_id = s.id;

  RETURN jsonb_build_object(
    'totalShops', COALESCE(v_total_shops, 0),
    'activeShops', COALESCE(v_active_shops, 0),
    'suspendedShops', COALESCE(v_suspended_shops, 0),
    'inactiveShops', COALESCE(v_inactive_shops, 0),
    'totalProducts', COALESCE(v_total_products, 0),
    'totalEnquiries', COALESCE(v_total_enquiries, 0),
    'pendingUpgradeRequests', COALESCE(v_pending_upgrades, 0),
    'shops', v_recent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_platform_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_shop_status(
  p_shop_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.shops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.shops;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin access required.';
  END IF;

  IF p_status NOT IN ('active', 'inactive', 'suspended') THEN
    RAISE EXCEPTION 'Invalid shop status.';
  END IF;

  UPDATE public.shops
  SET status = p_status,
      is_active = (p_status = 'active'),
      suspension_reason = CASE
        WHEN p_status = 'suspended' THEN NULLIF(trim(COALESCE(p_reason, '')), '')
        ELSE NULL
      END
  WHERE id = p_shop_id
  RETURNING * INTO v_shop;

  IF v_shop.id IS NULL THEN
    RAISE EXCEPTION 'Shop not found.';
  END IF;

  RETURN v_shop;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_shop_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_shop_status(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  p_shop_id UUID,
  p_plan_tier TEXT,
  p_status TEXT,
  p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.subscriptions;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Admin access required.';
  END IF;

  IF p_plan_tier NOT IN ('starter', 'basic', 'pro') THEN
    RAISE EXCEPTION 'Invalid subscription tier.';
  END IF;

  IF p_status NOT IN ('trialing', 'active', 'expired', 'suspended', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid subscription status.';
  END IF;

  INSERT INTO public.subscriptions (
    shop_id,
    plan_tier,
    status,
    current_period_start,
    current_period_end,
    activated_by
  )
  VALUES (
    p_shop_id,
    p_plan_tier,
    p_status,
    NOW(),
    p_period_end,
    auth.uid()
  )
  ON CONFLICT (shop_id) DO UPDATE
    SET plan_tier = EXCLUDED.plan_tier,
        status = EXCLUDED.status,
        current_period_start = CASE
          WHEN public.subscriptions.plan_tier IS DISTINCT FROM EXCLUDED.plan_tier
            OR public.subscriptions.status IS DISTINCT FROM EXCLUDED.status
          THEN NOW()
          ELSE public.subscriptions.current_period_start
        END,
        current_period_end = EXCLUDED.current_period_end,
        requested_plan_tier = NULL,
        upgrade_requested_at = NULL,
        upgrade_request_note = NULL,
        activated_by = auth.uid()
  RETURNING * INTO v_sub;

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- Trusted Super Admin Promotion Instruction (Execute ONLY in Supabase SQL Editor as postgres):
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'your-admin@example.com';
