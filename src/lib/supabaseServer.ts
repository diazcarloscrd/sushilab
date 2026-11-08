import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdhnpsowlsesoobrytvh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaG5wc293bHNlc29vYnJ5dHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDY1NTksImV4cCI6MjEwNzU4MjU1OX0.CzhYFCsCDGHm5jUhEvGIBhfS84AYChRrFYCkq2fNNK8';
const serverSecret = process.env.INTERNAL_SERVER_SECRET || 'yankun_super_internal_secret_2026';

/**
 * Cliente de Supabase para el Servidor (Next.js Route Handlers y Server Components).
 * Emite la cabecera x-server-auth validada criptográficamente por PostgreSQL (Row Level Security),
 * otorgando permisos de administración completos y seguros sin exponer credenciales al navegador.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-server-auth': serverSecret,
    },
  },
});
