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
    const roleField = role === 'Validator' ? 'validatorId' : 'inspectorId';

    const [bookedList, reportList, recheckList] = await Promise.all([
      Property.countDocuments({
        [roleField]: inspectorOid,
        status: { $ne: 'Delete' },
        bookingStatus: { $in: ['Booked', 'Rescheduled', 'InProgress'] },
      }),
      Property.countDocuments({
        [roleField]: inspectorOid,
        status: { $ne: 'Delete' },
        bookingStatus: 'Completed',
      }),
      Property.countDocuments({
        [roleField]: inspectorOid,
        status: { $ne: 'Delete' },
        bookingStatus: 'Recheck',
      }),
    ]);

    return NextResponse.json({
      statusCode: 200,
      status: true,
      bookedList,
      reportList,
      recheckList,
    });
  } catch (error: any) {
    console.error('[countPropertiesList]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
