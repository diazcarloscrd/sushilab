// Supabase Edge Function: admin-login
// Exchanges the shared CRM username + password for a Supabase Auth session.
// Required function secrets:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   ADMIN_LOGIN_EMAIL
//   ADMIN_LOGIN_USERNAME (optional; defaults to "adminsushilab")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const adminEmail = Deno.env.get("ADMIN_LOGIN_EMAIL");
  const expectedUsername = Deno.env.get("ADMIN_LOGIN_USERNAME") ?? "adminsushilab";

  if (!supabaseUrl || !anonKey || !adminEmail) {
    return jsonResponse({ error: "El acceso todavía no está configurado." }, 500);
  }

  let payload: { username?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Solicitud inválida." }, 400);
  }

  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!username || !password || username.length > 80 || password.length > 256) {
    return jsonResponse({ error: "Usuario o contraseña incorrectos." }, 400);
  }

  if (username.toLowerCase() !== expectedUsername.toLowerCase()) {
    return jsonResponse({ error: "Usuario o contraseña incorrectos." }, 401);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password,
  });

  if (error || !data.session || !data.user) {
    return jsonResponse({ error: "Usuario o contraseña incorrectos." }, 401);
  }

  // Confirm the authenticated account is explicitly listed as an administrator.
  const adminClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  const { data: adminRow, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    await supabase.auth.signOut({ scope: "local" });
    return jsonResponse({ error: "Esta cuenta no tiene permisos de administración." }, 403);
  }

  return jsonResponse({
    session: data.session,
    user: { id: data.user.id },
  });
});
