import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getInspectorFromRequest } from '@/lib/inspectorAuth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const inspector = await getInspectorFromRequest(req);
    if (!inspector?.id) {
      return NextResponse.json({ statusCode: 401, status: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const updated = await Property.findByIdAndUpdate(
      id,
      { $set: { gatePass: true, actualInspectionDate: new Date(), updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ statusCode: 404, status: false, message: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({
      statusCode: 200,
      status: true,
      message: 'Reached unit updated',
      data: updated,
    });
  } catch (error: any) {
    console.error('[editReachedUnit]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
