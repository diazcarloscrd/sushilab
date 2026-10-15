import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://sushilab-phi.vercel.app",
  "https://sushilab-git-develop-diaz-carlos-crd.vercel.app",
]);
const previewOrigin = /^https:\/\/sushilab-[a-z0-9]+-diaz-carlos-crd\.vercel\.app$/;

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function validOrigin(origin: string) {
  return allowedOrigins.has(origin) || previewOrigin.test(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (!origin || !validOrigin(origin)) return new Response("Forbidden", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405, origin);

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 16000) return json({ error: "El pedido es demasiado grande" }, 413, origin);

  try {
    const payload = await req.json();
    if (payload?.website) return json({ error: "Solicitud inválida" }, 400, origin); // honeypot
    const requestId = String(payload?.request_id || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json({ error: "No se pudo validar el pedido. Actualizá la página e intentá nuevamente." }, 400, origin);
    }

    const customerName = String(payload?.customer_name || "").trim();
    const customerPhone = String(payload?.customer_phone || "").trim();
    const digits = customerPhone.replace(/\D/g, "");
    const mode = String(payload?.delivery_mode || "");
    const address = String(payload?.delivery_address || "").trim();
    const items = payload?.items;
    if (!customerName || customerName.length > 100 || digits.length < 8 || digits.length > 20) {
      return json({ error: "Revisá el nombre y el teléfono." }, 400, origin);
    }
    if (!["delivery_bahia", "pickup", "otra_zona"].includes(mode) ||
        (mode !== "pickup" && (!address || address.length > 300))) {
      return json({ error: "Revisá la modalidad y la dirección." }, 400, origin);
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 20 ||
        items.some((item) => !Number.isSafeInteger(Number(item?.product_id)) ||
          Number(item.product_id) <= 0 || !Number.isSafeInteger(Number(item?.quantity)) ||
          Number(item.quantity) < 1 || Number(item.quantity) > 20)) {
      return json({ error: "El carrito contiene productos o cantidades inválidos." }, 400, origin);
    }

    const url = Deno.env.get("SUPABASE_URL");
    let secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!secret && secretKeys) {
      try { secret = JSON.parse(secretKeys).default; } catch { /* handled below */ }
    }
    if (!url || !secret) {
      console.error("Falta la configuración privada de Supabase para create-order.");
      return json({ error: "El sistema de pedidos no está disponible temporalmente." }, 503, origin);
    }

    const admin = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Basic abuse guard: cap repeated requests from the same phone in a short window.
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count, error: rateError } = await admin.from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", digits)
      .gte("created_at", since);
    if (rateError) {
      console.error("No se pudo verificar el límite de pedidos:", rateError.message);
      return json({ error: "No se pudo validar el pedido. Intentá nuevamente." }, 503, origin);
    }
    if ((count || 0) >= 3) return json({ error: "Ya recibimos varios pedidos con ese teléfono. Contactanos por WhatsApp." }, 429, origin);

    const notes = [
      payload?.requested_time ? "Horario solicitado: " + String(payload.requested_time).slice(0, 80) : "",
      payload?.payment_method ? "Medio de pago: " + String(payload.payment_method).slice(0, 80) : "",
      payload?.customer_notes ? "Observaciones: " + String(payload.customer_notes).trim().slice(0, 500) : "",
      mode === "otra_zona" ? "Entrega fuera de zona habitual: costo a coordinar por WhatsApp." : "",
    ].filter(Boolean).join("\n");

    const { data, error } = await admin.rpc("create_public_order", {
      p_request_id: requestId,
      p_payload: {
        customer_name: customerName,
        customer_phone: digits,
        delivery_mode: mode,
        delivery_address: address || null,
        customer_notes: notes || null,
        items: items.map((item: { product_id: number; quantity: number }) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
        })),
      },
    });
    if (error) {
      console.error("No se pudo registrar el pedido:", error.message);
      return json({ error: "No se pudo registrar el pedido. Revisá el carrito e intentá nuevamente." }, 422, origin);
    }

    return json(data, 201, origin);
  } catch (error) {
    console.error("Solicitud de pedido inválida:", error instanceof Error ? error.message : "unknown");
    return json({ error: "No se pudo procesar el pedido. Intentá nuevamente." }, 400, origin);
  }
});
