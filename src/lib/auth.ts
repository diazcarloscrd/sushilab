import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'yankun_super_secret_jwt_key_2026_shokunin';
const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export async function createSessionToken(payload: AdminSession) {
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
