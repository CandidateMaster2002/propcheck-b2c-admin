import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function getInspectorFromRequest(req: NextRequest) {
  const token =
    req.headers.get('x-access-token') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return await verifyToken(token);
}
