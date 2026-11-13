-- DukaanFlow Part 3/4: Public Storefront, WhatsApp Enquiries & Order Management

-- ---------------------------------------------------------------------------
-- 1. Shop Enhancements (Opening Hours)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS opening_hours TEXT;

-- ---------------------------------------------------------------------------
-- 2. Orders & Order Items Enhancements (New/Contacted/Confirmed/Completed/Cancelled)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ALTER COLUMN customer_phone DROP NOT NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_sku TEXT;

-- Migrate any legacy Part 1 order statuses before tightening the check constraint
UPDATE public.orders
SET status = CASE
  WHEN status = 'pending' THEN 'new'
  WHEN status = 'preparing' THEN 'contacted'
  ELSE status
END
WHERE status IN ('pending', 'preparing');

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check,
  ADD CONSTRAINT orders_status_check
    CHECK (status IN ('new', 'contacted', 'confirmed', 'completed', 'cancelled'));

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'new';

-- ---------------------------------------------------------------------------
-- 3. Public Storefront Read RPCs (Active shops & active products only)
--    Keeps direct table SELECT on shops/orders locked down for private fields.
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
    s.is_active
  INTO v_shop
  FROM public.shops s
  WHERE s.slug = lower(trim(p_slug))
    AND s.is_active = TRUE
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

REVOKE ALL ON FUNCTION public.get_public_storefront(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_storefront(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Server-Validated WhatsApp Order Enquiry Creation RPC
--    Never trusts frontend totals, unit prices, or shop ownership.
-- ---------------------------------------------------------------------------
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
    AND is_active = TRUE
  LIMIT 1;

  IF v_shop.id IS NULL THEN
    RAISE EXCEPTION 'This storefront is unavailable or inactive.';
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

REVOKE ALL ON FUNCTION public.create_public_whatsapp_enquiry(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_whatsapp_enquiry(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS Verification on orders & order_items
-- ---------------------------------------------------------------------------
-- Existing policies from Part 1 (orders_owner_all, order_items_owner_all,
-- orders_customer_select_own, order_items_customer_select_own) remain active.
-- Public anonymous users have ZERO direct SELECT/INSERT/UPDATE/DELETE access
-- to orders or order_items and must go through create_public_whatsapp_enquiry().
