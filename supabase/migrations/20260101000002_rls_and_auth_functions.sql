-- DukaanFlow Part 1/4: Multi-Tenant Row Level Security, Role Protection & Auth Onboarding

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on ALL tenant and user tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Security Helper Functions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_shop(target_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shops
    WHERE id = target_shop_id
      AND owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Prevent Privilege Escalation (Users cannot assign themselves super_admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow privileged postgres/service migrations or existing super_admin
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Insufficient privileges to assign super_admin role';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Role changes are not permitted from client context';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- Prevent changing shop owner_id after creation from client context
CREATE OR REPLACE FUNCTION public.prevent_shop_owner_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Shop ownership cannot be reassigned';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shops_prevent_owner_transfer ON public.shops;
CREATE TRIGGER trg_shops_prevent_owner_transfer
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_shop_owner_transfer();

-- ---------------------------------------------------------------------------
-- 4. Automatic Profile & Shop Creation on Auth Signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_shop_name TEXT;
  v_shop_slug TEXT;
  v_shop_category TEXT;
  v_whatsapp TEXT;
  v_role TEXT := 'customer';
  v_shop_id UUID;
BEGIN
  v_full_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));
  v_shop_name := NULLIF(trim(NEW.raw_user_meta_data->>'shop_name'), '');
  v_shop_slug := NULLIF(lower(trim(NEW.raw_user_meta_data->>'shop_slug')), '');
  v_shop_category := NULLIF(trim(NEW.raw_user_meta_data->>'shop_category'), '');
  v_whatsapp := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', ''), '[\s\-()]', '', 'g'), '');

  IF v_shop_name IS NOT NULL AND v_shop_slug IS NOT NULL AND v_shop_category IS NOT NULL AND v_whatsapp IS NOT NULL THEN
    v_role := 'shop_owner';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, v_full_name, NEW.email, v_role)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

  IF v_role = 'shop_owner' THEN
    INSERT INTO public.shops (owner_id, name, slug, category, whatsapp_number)
    VALUES (NEW.id, v_shop_name, v_shop_slug, v_shop_category, v_whatsapp)
    RETURNING id INTO v_shop_id;

    INSERT INTO public.subscriptions (shop_id, plan_tier, status)
    VALUES (v_shop_id, 'starter', 'trialing')
    ON CONFLICT (shop_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Secure RPC for Authenticated Shop Onboarding (Never trusts owner_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_shop_for_authenticated_user(
  p_name TEXT,
  p_slug TEXT,
  p_category TEXT,
  p_whatsapp_number TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS public.shops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_existing_shop public.shops;
  v_created_shop public.shops;
  v_clean_slug TEXT := lower(trim(p_slug));
  v_clean_phone TEXT := regexp_replace(trim(p_whatsapp_number), '[\s\-()]', '', 'g');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    v_uid,
    COALESCE(NULLIF(trim(p_full_name), ''), split_part(v_email, '@', 1)),
    v_email,
    'shop_owner'
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE WHEN public.profiles.role = 'super_admin' THEN 'super_admin' ELSE 'shop_owner' END,
        full_name = COALESCE(NULLIF(trim(p_full_name), ''), public.profiles.full_name);

  SELECT * INTO v_existing_shop
  FROM public.shops
  WHERE owner_id = v_uid
  LIMIT 1;

  IF v_existing_shop.id IS NOT NULL THEN
    RETURN v_existing_shop;
  END IF;

  INSERT INTO public.shops (owner_id, name, slug, category, whatsapp_number)
  VALUES (v_uid, trim(p_name), v_clean_slug, trim(p_category), v_clean_phone)
  RETURNING * INTO v_created_shop;

  INSERT INTO public.subscriptions (shop_id, plan_tier, status)
  VALUES (v_created_shop.id, 'starter', 'trialing')
  ON CONFLICT (shop_id) DO NOTHING;

  RETURN v_created_shop;
END;
$$;

REVOKE ALL ON FUNCTION public.create_shop_for_authenticated_user(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_shop_for_authenticated_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Public slug availability helper (exposes only boolean, zero private shop fields)
CREATE OR REPLACE FUNCTION public.is_shop_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.shops
    WHERE slug = lower(trim(p_slug))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_shop_slug_available(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. RLS Policies
-- ---------------------------------------------------------------------------

-- PROFILES
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_super_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

-- SHOPS (Strictly owner or super_admin; customers cannot query private shop records)
CREATE POLICY "shops_select_owner_or_admin"
  ON public.shops FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "shops_insert_owner_only"
  ON public.shops FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "shops_update_owner_or_admin"
  ON public.shops FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "shops_delete_owner_or_admin"
  ON public.shops FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_super_admin());

-- CATEGORIES
CREATE POLICY "categories_owner_all"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.user_owns_shop(shop_id) OR public.is_super_admin())
  WITH CHECK (public.user_owns_shop(shop_id) OR public.is_super_admin());

-- PRODUCTS
CREATE POLICY "products_owner_all"
  ON public.products FOR ALL
  TO authenticated
  USING (public.user_owns_shop(shop_id) OR public.is_super_admin())
  WITH CHECK (public.user_owns_shop(shop_id) OR public.is_super_admin());

-- PRODUCT IMAGES
CREATE POLICY "product_images_owner_all"
  ON public.product_images FOR ALL
  TO authenticated
  USING (public.user_owns_shop(shop_id) OR public.is_super_admin())
  WITH CHECK (public.user_owns_shop(shop_id) OR public.is_super_admin());

-- ORDERS (Shop owner manages shop orders; customer can read only their own orders)
CREATE POLICY "orders_owner_all"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.user_owns_shop(shop_id) OR public.is_super_admin())
  WITH CHECK (public.user_owns_shop(shop_id) OR public.is_super_admin());

CREATE POLICY "orders_customer_select_own"
  ON public.orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- ORDER ITEMS
CREATE POLICY "order_items_owner_all"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.user_owns_shop(shop_id) OR public.is_super_admin())
  WITH CHECK (public.user_owns_shop(shop_id) OR public.is_super_admin());

CREATE POLICY "order_items_customer_select_own"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- SUBSCRIPTIONS
CREATE POLICY "subscriptions_select_owner_or_admin"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.user_owns_shop(shop_id) OR public.is_super_admin());
