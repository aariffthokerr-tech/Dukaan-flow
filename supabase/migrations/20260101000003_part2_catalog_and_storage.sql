-- DukaanFlow Part 2/4: Product Catalog Enhancements, Default Categories & Supabase Storage

-- ---------------------------------------------------------------------------
-- 1. Products Table Enhancements (Regular/Sale Price, Featured, Unique SKU)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Enforce price > 0 and valid sale_price_cents < price_cents
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_price_cents_check,
  ADD CONSTRAINT products_price_cents_positive CHECK (price_cents > 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sale_price_valid,
  ADD CONSTRAINT products_sale_price_valid
    CHECK (sale_price_cents IS NULL OR (sale_price_cents > 0 AND sale_price_cents < price_cents));

-- Enforce SKU uniqueness per shop (case-insensitive, ignoring NULL/blank SKUs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shop_sku_unique
  ON public.products (shop_id, lower(trim(sku)))
  WHERE sku IS NOT NULL AND char_length(trim(sku)) > 0;

CREATE INDEX IF NOT EXISTS idx_products_shop_featured
  ON public.products (shop_id, is_featured)
  WHERE is_featured = TRUE;

-- ---------------------------------------------------------------------------
-- 2. Product Images Integrity (One primary image per product)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary
  ON public.product_images (product_id)
  WHERE is_primary = TRUE;

CREATE OR REPLACE FUNCTION public.set_primary_product_image(
  p_product_id UUID,
  p_image_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT shop_id INTO v_shop_id
  FROM public.products
  WHERE id = p_product_id;

  IF v_shop_id IS NULL OR NOT public.user_owns_shop(v_shop_id) THEN
    RAISE EXCEPTION 'Unauthorized product access';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_images
    WHERE id = p_image_id
      AND product_id = p_product_id
      AND shop_id = v_shop_id
  ) THEN
    RAISE EXCEPTION 'Image does not belong to this product';
  END IF;

  UPDATE public.product_images
  SET is_primary = FALSE
  WHERE product_id = p_product_id
    AND shop_id = v_shop_id
    AND is_primary = TRUE;

  UPDATE public.product_images
  SET is_primary = TRUE
  WHERE id = p_image_id
    AND product_id = p_product_id
    AND shop_id = v_shop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_primary_product_image(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_primary_product_image(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Default Categories Seeding & Safe Deletion Protection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_default_categories_for_shop(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (shop_id, name, slug, sort_order, is_active)
  VALUES
    (p_shop_id, 'Hardware', 'hardware', 1, TRUE),
    (p_shop_id, 'Electrical', 'electrical', 2, TRUE),
    (p_shop_id, 'Electronics', 'electronics', 3, TRUE),
    (p_shop_id, 'Mobile Accessories', 'mobile-accessories', 4, TRUE),
    (p_shop_id, 'Clothing', 'clothing', 5, TRUE),
    (p_shop_id, 'Grocery', 'grocery', 6, TRUE),
    (p_shop_id, 'Home & Kitchen', 'home-kitchen', 7, TRUE),
    (p_shop_id, 'Other', 'other', 8, TRUE)
  ON CONFLICT (shop_id, slug) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_categories_for_shop(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shops_seed_default_categories ON public.shops;
CREATE TRIGGER trg_shops_seed_default_categories
  AFTER INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_default_categories();

-- Backfill default categories for any shops created during Part 1
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.shops LOOP
    PERFORM public.seed_default_categories_for_shop(r.id);
  END LOOP;
END;
$$;

-- Prevent accidental deletion of categories that still contain products
CREATE OR REPLACE FUNCTION public.prevent_category_delete_with_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE category_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete category "%" because it still contains products. Reassign products first.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_prevent_delete_with_products ON public.categories;
CREATE TRIGGER trg_categories_prevent_delete_with_products
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_category_delete_with_products();

-- Safe category deletion RPC with optional atomic product reassignment
CREATE OR REPLACE FUNCTION public.delete_category_with_reassignment(
  p_category_id UUID,
  p_target_category_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
  v_target_shop_id UUID;
  v_product_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT shop_id INTO v_shop_id
  FROM public.categories
  WHERE id = p_category_id;

  IF v_shop_id IS NULL OR NOT public.user_owns_shop(v_shop_id) THEN
    RAISE EXCEPTION 'Unauthorized category access';
  END IF;

  SELECT COUNT(*) INTO v_product_count
  FROM public.products
  WHERE category_id = p_category_id
    AND shop_id = v_shop_id;

  IF v_product_count > 0 THEN
    IF p_target_category_id IS NULL OR p_target_category_id = p_category_id THEN
      RAISE EXCEPTION 'Category contains % product(s). Select a target category to reassign them first.', v_product_count;
    END IF;

    SELECT shop_id INTO v_target_shop_id
    FROM public.categories
    WHERE id = p_target_category_id;

    IF v_target_shop_id IS DISTINCT FROM v_shop_id THEN
      RAISE EXCEPTION 'Target category does not belong to your shop';
    END IF;

    UPDATE public.products
    SET category_id = p_target_category_id
    WHERE category_id = p_category_id
      AND shop_id = v_shop_id;
  END IF;

  DELETE FROM public.categories
  WHERE id = p_category_id
    AND shop_id = v_shop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_category_with_reassignment(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_category_with_reassignment(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Supabase Storage Bucket (product-images) & Ownership Policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880, -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access for intentionally public product images
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Authenticated shop owners can upload ONLY inside their own {shop_id}/{product_id}/{file} folder
DROP POLICY IF EXISTS "product_images_owner_insert" ON storage.objects;
CREATE POLICY "product_images_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.user_owns_shop(((storage.foldername(name))[1])::uuid)
  );

-- Authenticated shop owners can update ONLY inside their own {shop_id} folder
DROP POLICY IF EXISTS "product_images_owner_update" ON storage.objects;
CREATE POLICY "product_images_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.user_owns_shop(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.user_owns_shop(((storage.foldername(name))[1])::uuid)
  );

-- Authenticated shop owners can delete ONLY inside their own {shop_id} folder
DROP POLICY IF EXISTS "product_images_owner_delete" ON storage.objects;
CREATE POLICY "product_images_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND public.user_owns_shop(((storage.foldername(name))[1])::uuid)
  );
