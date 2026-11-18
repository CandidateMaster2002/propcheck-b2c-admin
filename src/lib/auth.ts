import { SignJWT, jwtVerify } from 'jose';
import CryptoJS from 'crypto-js';
import { cookies } from 'next/headers';

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

function getSaltSecret(): string {
  const secret = process.env.SALT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: SALT_SECRET environment variable is required');
  }
  return secret;
}

export function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), getSaltSecret()).toString();
}

export function decryptData(ciphertext: string): any {
  const bytes = CryptoJS.AES.decrypt(ciphertext, getSaltSecret());
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

export async function generateToken(payload: any): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(getJWTSecret());
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload;
  } catch (error: any) {
    console.error('❌ verifyToken: Verification failed!', error.message);
    return null;
  }
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value;
}

export async function getUserFromToken() {
  const token = await getAuthToken();
  if (!token) return null;
  return await verifyToken(token);
}
