import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const city = searchParams.get('city');
    const inspectorId = searchParams.get('inspectorId');

    let start: Date;
    let end: Date;

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (startDateParam && endDateParam) {
      start = new Date(startDateParam);
      end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const matchStage: Record<string, any> = {
      inspectionDate: { $gte: start, $lte: end },
      status: { $ne: 'Delete' }
    };

    if (city) {
      matchStage.city = { $regex: city, $options: 'i' };
    }

    if (inspectorId) {
      const mongoose = (await import('mongoose')).default;
      matchStage.inspectorId = new mongoose.Types.ObjectId(inspectorId);
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$inspectionDate' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const results: { _id: string; count: number }[] = await Property.aggregate(pipeline);

    // Build a complete date range so days with zero inspections are included
    const dateMap: Record<string, number> = {};
    for (const r of results) {
      dateMap[r._id] = r.count;
    }

    const dates: string[] = [];
    const counts: number[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      dates.push(key);
      counts.push(dateMap[key] || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      status: true,
      data: { dates, counts, label: 'Inspections' }
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
