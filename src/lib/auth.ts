import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET_STRING = process.env.JWT_SECRET;

if (!JWT_SECRET_STRING) {
  throw new Error('FATAL: Variable de entorno JWT_SECRET no configurada.');
}

const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN_LOCAL' | 'COCINERO' | 'REPARTIDOR' | string;
}

export async function createSessionToken(payload: AdminSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('yankun_admin_token')?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

/**
 * Control de Intentos y Rate-Limiting en Memoria
 * Previene ataques de fuerza bruta contra el PIN de 6 dígitos o credenciales de admin.
 */
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const attemptsStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000, // 15 minutos
  lockoutMs = 15 * 60 * 1000 // 15 minutos de bloqueo
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const record = attemptsStore.get(identifier);

  if (!record) {
    return { allowed: true, remaining: maxAttempts, retryAfterSec: 0 };
  }

  // Si está actualmente bloqueado
  if (record.lockedUntil > now) {
    const retryAfterSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  // Si la ventana expiró, reiniciar
  if (now - record.firstAttemptAt > windowMs) {
    attemptsStore.delete(identifier);
    return { allowed: true, remaining: maxAttempts, retryAfterSec: 0 };
  }

  // Verificar intentos restantes
  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    const retryAfterSec = Math.ceil(lockoutMs / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return { allowed: true, remaining: maxAttempts - record.attempts, retryAfterSec: 0 };
}

export function recordFailedAttempt(
  identifier: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockoutMs = 15 * 60 * 1000
) {
  const now = Date.now();
  const record = attemptsStore.get(identifier);

  if (!record) {
    attemptsStore.set(identifier, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    });
    return;
  }

  if (now - record.firstAttemptAt > windowMs) {
    record.attempts = 1;
    record.firstAttemptAt = now;
    record.lockedUntil = 0;
    return;
  }

  record.attempts += 1;
  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutMs;
  }
}

export function resetRateLimit(identifier: string) {
  attemptsStore.delete(identifier);
}
