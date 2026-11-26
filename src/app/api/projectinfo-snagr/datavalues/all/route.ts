import { NextRequest, NextResponse } from 'next/server';

const LAMBDA_BASE = 'https://b9p96pyvp4.execute-api.ap-south-1.amazonaws.com/v1';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('x-access-token') || '';
    const res = await fetch(`${LAMBDA_BASE}/projectinfo-snagr/datavalues/all`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { 'x-access-token': token } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[datavalues proxy]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
