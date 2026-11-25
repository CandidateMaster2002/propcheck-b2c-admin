import { NextResponse } from 'next/server';

const LAMBDA_BASE = 'https://b9p96pyvp4.execute-api.ap-south-1.amazonaws.com/v1';

export async function GET() {
  try {
    const res = await fetch(`${LAMBDA_BASE}/data-management-snagr/checklist-template`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[checklist-template proxy]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
