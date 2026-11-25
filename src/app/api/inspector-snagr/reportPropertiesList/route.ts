import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getInspectorFromRequest } from '@/lib/inspectorAuth';

export async function GET(req: NextRequest) {
  try {
    const inspector = await getInspectorFromRequest(req);
    if (!inspector?.id) {
      return NextResponse.json({ statusCode: 401, status: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const role = req.nextUrl.searchParams.get('role') || 'Inspector';
    const inspectorOid = new mongoose.Types.ObjectId(String(inspector.id));

    const query: any = {
      status: { $ne: 'Delete' },
      bookingStatus: 'Completed',
    };

    if (role === 'Validator') {
      query.validatorId = inspectorOid;
    } else {
      query.inspectorId = inspectorOid;
    }

    const properties = await Property.find(query)
      .select('-inspectionData')
      .sort({ _id: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      statusCode: 200,
      status: true,
      message: 'Completed properties fetched',
      data: properties,
    });
  } catch (error: any) {
    console.error('[reportPropertiesList]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
