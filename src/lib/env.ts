import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  INTERNAL_SERVER_SECRET: z.string().optional(),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  MESSAGING_DRIVER: z.enum(['dev', 'whatsapp_cloud']).default('dev'),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida'),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

function validateEnv() {
  const isServer = typeof window === 'undefined';

  const clientParsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  if (!clientParsed.success) {
    console.error('❌ Error de validación en variables de entorno cliente:', clientParsed.error.format());
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Configuración de variables de entorno de cliente inválida.');
    }
  }

  if (isServer) {
    const serverParsed = serverEnvSchema.safeParse(process.env);
    if (!serverParsed.success) {
      console.error('❌ Error de validación en variables de entorno servidor:', serverParsed.error.format());
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Configuración de variables de entorno de servidor inválida.');
      }
    }
    return {
      ...(clientParsed.data || {}),
      ...(serverParsed.data || {}),
    };
  }

  return clientParsed.data || {};
}

export const env = validateEnv();
