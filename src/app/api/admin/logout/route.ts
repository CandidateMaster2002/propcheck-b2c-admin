import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ status: true, message: 'Logged out' });
  response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
  return response;
}
