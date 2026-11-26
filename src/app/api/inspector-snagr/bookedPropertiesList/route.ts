import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import UserManagement from '@/lib/models/UserManagement';
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
      bookingStatus: { $in: ['Booked', 'Assigned', 'Confirmed', 'Rescheduled', 'InProgress'] },
    };

    if (role === 'Validator') {
      query.validatorId = inspectorOid;
    } else {
      query.inspectorId = inspectorOid;
    }

    const properties: any[] = await Property.find(query)
      .select('-inspectionData')
      .sort({ _id: -1 })
      .limit(50)
      .lean();

    const userIds = properties.map((p) => p.userId).filter(Boolean);
    const users: any[] = userIds.length
      ? await UserManagement.find({ _id: { $in: userIds } }).select('name userName email phone').lean()
      : [];
    const usersMap: Record<string, any> = {};
    users.forEach((u) => { usersMap[String(u._id)] = u; });

    const enriched = properties.map((p) => ({
      ...p,
      userDetail: p.userId ? usersMap[String(p.userId)] || null : null,
    }));

    return NextResponse.json({
      statusCode: 200,
      status: true,
      message: 'Booked properties fetched',
      data: enriched,
    });
  } catch (error: any) {
    console.error('[bookedPropertiesList]', error);
    return NextResponse.json({ statusCode: 500, status: false, message: error.message }, { status: 500 });
  }
}
