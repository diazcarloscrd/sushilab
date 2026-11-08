import { supabaseServer } from './supabaseServer';

export interface RateLimitCheckOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export async function checkRateLimit(options: RateLimitCheckOptions): Promise<{ allowed: boolean; remaining: number }> {
  const { key, limit, windowSeconds } = options;
  const now = new Date();
  const windowThreshold = new Date(now.getTime() - windowSeconds * 1000);

  try {
    const { data: record } = await supabaseServer
      .from('RateLimit')
      .select('key, count, windowStart')
      .eq('key', key)
      .maybeSingle();

    if (!record || new Date(record.windowStart) < windowThreshold) {
      // Nueva ventana
      await supabaseServer
        .from('RateLimit')
        .upsert({
          key,
          count: 1,
          windowStart: now.toISOString(),
        });

      return { allowed: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Incrementar
    await supabaseServer
      .from('RateLimit')
      .update({ count: record.count + 1 })
      .eq('key', key);

    return { allowed: true, remaining: limit - (record.count + 1) };
  } catch (err) {
    // Si la DB falla temporalmente, permitimos la llamada sin bloquear el checkout
    console.error('RateLimit error:', err);
    return { allowed: true, remaining: 1 };
  }
}
