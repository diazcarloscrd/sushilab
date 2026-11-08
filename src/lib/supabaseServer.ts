import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const internalSecret = process.env.INTERNAL_SERVER_SECRET;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno para inicializar Supabase Server.');
}

const keyToUse = serviceRoleKey || supabaseAnonKey;
const headers: Record<string, string> = {};

if (serviceRoleKey) {
  headers['Authorization'] = `Bearer ${serviceRoleKey}`;
} else if (internalSecret) {
  headers['x-server-auth'] = internalSecret;
}

export const supabaseServer = createClient(supabaseUrl, keyToUse, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers,
  },
});
