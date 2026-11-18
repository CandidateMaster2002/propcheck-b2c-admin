import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');

    const query: any = { inspectionDate: { $exists: true } };
    if (startDate && endDate) {
      query.inspectionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const inspections = await Property.find(query)
      .populate('inspectorId')
      .sort({ inspectionDate: 1 });

    const events = inspections.map(insp => ({
      id: insp._id,
      title: `${insp.propertyName} - ${insp.inspectorId?.name || 'Unassigned'}`,
      date: insp.inspectionDate,
      status: insp.bookingStatus,
      inspector: insp.inspectorId?.name
    }));

    return NextResponse.json({ status: true, data: events });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
