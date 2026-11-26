import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ statusCode: 200, status: true, data: [] });
}
