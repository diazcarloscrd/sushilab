-- Draft for review: secure public order creation (do not apply until approved).
-- Adds idempotency and a single transaction for the order header + item rows.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_uidx
  ON public.orders (client_request_id);

CREATE OR REPLACE FUNCTION public.create_public_order(
  p_request_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_order_id bigint;
  v_existing jsonb;
  v_store_id bigint;
  v_name text;
  v_phone text;
  v_mode text;
  v_method text;
  v_address text;
  v_notes text;
  v_fee numeric(12,2);
  v_local_now timestamp without time zone;
  v_local_date date;
  v_local_day smallint;
  v_local_time time without time zone;
  v_event_type text;
  v_event_open time without time zone;
  v_event_close time without time zone;
  v_day_open boolean;
  v_day_open_time time without time zone;
  v_day_close_time time without time zone;
  v_subtotal numeric(12,2) := 0;
  v_quantity integer;
  v_product_id bigint;
  v_product_name text;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_item jsonb;
  v_order public.orders%ROWTYPE;
BEGIN
  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Solicitud inválida';
  END IF;

  v_name := NULLIF(btrim(p_payload->>'customer_name'), '');
  v_phone := NULLIF(btrim(p_payload->>'customer_phone'), '');
  v_mode := p_payload->>'delivery_mode';
  v_address := NULLIF(btrim(p_payload->>'delivery_address'), '');
  v_notes := NULLIF(btrim(p_payload->>'customer_notes'), '');

  IF v_name IS NULL OR length(v_name) > 100 THEN RAISE EXCEPTION 'Nombre inválido'; END IF;
  IF v_phone IS NULL OR length(regexp_replace(v_phone, '[^0-9]', '', 'g')) NOT BETWEEN 8 AND 20 THEN
    RAISE EXCEPTION 'Teléfono inválido';
  END IF;
  IF v_mode IS NULL OR v_mode NOT IN ('delivery_bahia', 'pickup', 'otra_zona') THEN RAISE EXCEPTION 'Modalidad inválida'; END IF;
  IF v_mode IN ('delivery_bahia', 'otra_zona') AND v_address IS NULL THEN
    RAISE EXCEPTION 'Falta la dirección de entrega';
  END IF;
  IF p_payload->'items' IS NULL OR jsonb_typeof(p_payload->'items') <> 'array' THEN
    RAISE EXCEPTION 'El pedido no contiene productos válidos';
  END IF;
  IF jsonb_array_length(p_payload->'items') < 1 OR jsonb_array_length(p_payload->'items') > 20 THEN
    RAISE EXCEPTION 'El pedido no contiene productos válidos';
  END IF;

  SELECT sl.id INTO v_store_id
  FROM public.sales_locations sl
  WHERE sl.code = 'bahia-blanca-store' AND sl.location_type = 'store' AND sl.is_active = true
  LIMIT 1;
  IF v_store_id IS NULL THEN RAISE EXCEPTION 'El punto de venta no está disponible'; END IF;
  -- Recheck opening hours on the server so a browser cannot bypass the public schedule.
  v_local_now := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_local_date := v_local_now::date;
  v_local_day := extract(dow FROM v_local_now)::smallint;
  v_local_time := v_local_now::time;

  SELECT se.event_type, se.opens_at, se.closes_at
    INTO v_event_type, v_event_open, v_event_close
  FROM public.special_events se
  WHERE se.sales_location_id = v_store_id
    AND se.event_date = v_local_date
    AND se.is_active = true
  ORDER BY se.id DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_event_type = 'exceptional_closure' THEN
      RAISE EXCEPTION 'El local está cerrado por excepción';
    ELSIF v_event_type = 'special_opening' THEN
      IF v_event_open IS NULL OR v_event_close IS NULL
         OR v_local_time < v_event_open OR v_local_time >= v_event_close THEN
        RAISE EXCEPTION 'El local está fuera del horario de apertura especial';
      END IF;
    END IF;
  ELSE
    SELECT bh.is_open, bh.opens_at, bh.closes_at
      INTO v_day_open, v_day_open_time, v_day_close_time
    FROM public.business_hours bh
    WHERE bh.sales_location_id = v_store_id
      AND bh.schedule_type = 'weekly'
      AND bh.day_of_week = v_local_day
    ORDER BY bh.id DESC
    LIMIT 1;

    IF FOUND THEN
      IF NOT v_day_open OR v_day_open_time IS NULL OR v_day_close_time IS NULL
         OR v_local_time < v_day_open_time OR v_local_time >= v_day_close_time THEN
        RAISE EXCEPTION 'El local está fuera del horario de atención';
      END IF;
    ELSE
      RAISE EXCEPTION 'No hay horario configurado para hoy';
    END IF;
  END IF;


  v_method := CASE WHEN v_mode = 'pickup' THEN 'takeaway' ELSE 'delivery' END;
  v_fee := CASE WHEN v_mode = 'delivery_bahia' THEN 6000 ELSE 0 END;

  INSERT INTO public.orders (
    client_request_id, customer_name, customer_phone, delivery_method,
    delivery_address, customer_notes, status, subtotal, delivery_fee,
    discount, total, sales_location_id
  )
  VALUES (
    p_request_id, v_name, v_phone, v_method, v_address, v_notes,
    'pending', 0, v_fee, 0, v_fee, v_store_id
  )
  ON CONFLICT (client_request_id) DO NOTHING
  RETURNING id INTO v_order_id;

  -- A retry with the same request ID returns the original order without duplicating it.
  IF v_order_id IS NULL THEN
    SELECT to_jsonb(o) INTO v_existing
    FROM public.orders o
    WHERE o.client_request_id = p_request_id;
    RETURN jsonb_build_object('duplicate', true, 'order', v_existing);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items')
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::bigint;
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Producto o cantidad inválidos';
    END;

    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 20 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;

    SELECT p.name, p.price INTO v_product_name, v_unit_price
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    WHERE p.id = v_product_id AND p.is_available = true AND c.is_active = true;

    IF NOT FOUND THEN RAISE EXCEPTION 'Uno de los productos ya no está disponible'; END IF;

    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, line_total
    )
    VALUES (
      v_order_id, v_product_id, v_product_name, v_quantity, v_unit_price, v_line_total
    );
  END LOOP;

  UPDATE public.orders
  SET subtotal = v_subtotal,
      total = v_subtotal + v_fee
  WHERE id = v_order_id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'duplicate', false,
    'order', jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'subtotal', v_order.subtotal,
      'delivery_fee', v_order.delivery_fee,
      'discount', v_order.discount,
      'total', v_order.total,
      'created_at', v_order.created_at
    )
  );
END;
$function$;

-- Only the server-side Edge Function, authenticated with the secret key, may call this RPC.
REVOKE ALL ON FUNCTION public.create_public_order(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(uuid, jsonb) TO service_role;
