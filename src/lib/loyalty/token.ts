import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'yankun_jwt_secret_loyalty_2026';
const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);

export interface LoyaltyRedeemPayload {
  phone: string;
  purpose: 'REDEEM';
  jti: string;
}

export async function createRedeemToken(phone: string, otpId: string): Promise<string> {
  return await new SignJWT({ phone, purpose: 'REDEEM', jti: otpId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey);
}

export async function verifyRedeemToken(token: string): Promise<LoyaltyRedeemPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.purpose !== 'REDEEM' || !payload.phone || !payload.jti) {
      return null;
    }
    return {
      phone: String(payload.phone),
      purpose: 'REDEEM',
      jti: String(payload.jti),
    };
  } catch {
    return null;
  }
}
