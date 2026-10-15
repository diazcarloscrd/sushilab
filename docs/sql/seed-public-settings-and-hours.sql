-- YanKun SushiLab: initial public-site configuration and weekly kitchen schedule.
-- This is an auditable, idempotent seed/reference script. The live values are managed
-- from public-settings.html and business-hours.html after this initial setup.

DO $$
DECLARE
  v_store_id bigint;
  v_category_id bigint;
  v_upsell_id bigint;
BEGIN
  SELECT id INTO v_store_id
  FROM public.sales_locations
  WHERE code = 'bahia-blanca-store' AND location_type = 'store' AND is_active = true
  LIMIT 1;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el local principal activo.';
  END IF;

  INSERT INTO public.categories (name, slug, description, sort_order, is_active)
  VALUES ('Entradas', 'entradas', 'Entradas y complementos del menú', 90, true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO v_category_id;

  SELECT id INTO v_upsell_id
  FROM public.products
  WHERE lower(name) = lower('Bombas de Salmón (5 u.)')
  ORDER BY id LIMIT 1;

  IF v_upsell_id IS NULL THEN
    INSERT INTO public.products (category_id, name, description, price, is_available, sort_order)
    VALUES (v_category_id, 'Bombas de Salmón (5 u.)', 'Crocantes en panko + salsa', 9800, true, 999)
    RETURNING id INTO v_upsell_id;
  ELSE
    UPDATE public.products
    SET category_id = v_category_id,
        description = 'Crocantes en panko + salsa',
        price = 9800,
        is_available = true,
        sort_order = 999
    WHERE id = v_upsell_id;
  END IF;

  UPDATE public.business_settings
  SET value = value || jsonb_build_object('upsell_product_id', v_upsell_id, 'upsell_enabled', true),
      updated_at = now()
  WHERE key = 'public_site';
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró public_site en business_settings.'; END IF;

  UPDATE public.business_hours
  SET day_of_week = 2, is_open = true, opens_at = '18:30', closes_at = '21:30'
  WHERE sales_location_id = v_store_id AND schedule_type = 'weekly' AND day_of_week = 1;

  UPDATE public.business_hours
  SET is_open = true, opens_at = '18:30', closes_at = '21:30'
  WHERE sales_location_id = v_store_id AND schedule_type = 'weekly' AND day_of_week = 5;

  INSERT INTO public.business_hours (sales_location_id, schedule_type, day_of_week, specific_date, is_open, opens_at, closes_at)
  SELECT v_store_id, 'weekly', day_value, NULL, true, '18:30', '21:30'
  FROM (VALUES (3::smallint),(4::smallint),(6::smallint)) AS days(day_value)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.business_hours bh
    WHERE bh.sales_location_id = v_store_id
      AND bh.schedule_type = 'weekly'
      AND bh.day_of_week = days.day_value
  );
END $$;
