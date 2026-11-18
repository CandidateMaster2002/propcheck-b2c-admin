import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inspector from '@/lib/models/Inspector';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const inspectorId = req.nextUrl.searchParams.get('inspectorId');

    if (!inspectorId) {
      return NextResponse.json({ status: false, message: 'inspectorId query parameter is required' }, { status: 400 });
    }

    const inspector = await Inspector.findById(inspectorId).select('leaves name email');
    if (!inspector) {
      return NextResponse.json({ status: false, message: 'Inspector not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: inspector.leaves || [] });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { inspectorId, startDate, endDate, reason } = body;

    if (!inspectorId || !startDate || !endDate) {
      return NextResponse.json(
        { status: false, message: 'inspectorId, startDate and endDate are required' },
        { status: 400 }
      );
    }

    const inspector = await Inspector.findByIdAndUpdate(
      inspectorId,
      { $push: { leaves: { startDate: new Date(startDate), endDate: new Date(endDate), reason } } },
      { new: true }
    ).select('-password');

    if (!inspector) {
      return NextResponse.json({ status: false, message: 'Inspector not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Leave added', data: inspector });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
