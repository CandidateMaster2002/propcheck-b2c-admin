import { NextRequest, NextResponse } from 'next/server';
import { getInspectorFromRequest } from '@/lib/inspectorAuth';

export async function POST(req: NextRequest) {
  const inspector = await getInspectorFromRequest(req);
  if (!inspector?.id) {
    return NextResponse.json({ statusCode: 401, status: false, message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    statusCode: 200,
    status: true,
    success: true,
    message: 'Image batch acknowledged in dev sandbox',
  });
}
