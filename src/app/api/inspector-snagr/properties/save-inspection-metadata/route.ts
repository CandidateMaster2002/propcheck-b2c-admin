import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getInspectorFromRequest } from '@/lib/inspectorAuth';

export async function POST(req: NextRequest) {
  try {
    const inspector = await getInspectorFromRequest(req);
    if (!inspector?.id) {
      return NextResponse.json({ statusCode: 401, status: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const propertyId = body.inspectionId || body.propertyId || body._id;

    if (!propertyId) {
      return NextResponse.json({ statusCode: 400, status: false, message: 'inspectionId is required' }, { status: 400 });
    }

    const updated: any = await Property.findByIdAndUpdate(
      propertyId,
      {
        $set: {
          inspectionData: body.inspectionData || body,
          inspectionDetail: body.inspectionDetail || body.inspectionData || body,
          overallhealthrating: body.overallhealthrating ?? body.insScore ?? 85,
          isInspected: true,
          actualInspectionDate: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ statusCode: 404, status: false, message: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({
      statusCode: 200,
      status: true,
      success: true,
      inspectionId: String(updated._id),
      message: 'Inspection metadata saved',
    });
  } catch (error: any) {
    console.error('[save-inspection-metadata]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
