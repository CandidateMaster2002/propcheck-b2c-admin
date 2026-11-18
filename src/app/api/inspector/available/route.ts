import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inspector from '@/lib/models/Inspector';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date');
    const city = searchParams.get('city');

    if (!date) {
      return NextResponse.json({ status: false, message: 'date query parameter is required' }, { status: 400 });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ status: false, message: 'Invalid date format' }, { status: 400 });
    }

    const query: Record<string, any> = {
      status: 'Enable',
      role: 'Inspector'
    };

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    const inspectors = await Inspector.find(query).select('name email phone city leaves');

    const available = inspectors.filter((inspector) => {
      if (!inspector.leaves || inspector.leaves.length === 0) return true;
      return !inspector.leaves.some((leave: any) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        return targetDate >= start && targetDate <= end;
      });
    });

    const result = available.map((i) => ({
      _id: i._id,
      name: i.name,
      email: i.email,
      phone: i.phone,
      city: i.city
    }));

    return NextResponse.json({ status: true, data: result, totalResult: result.length });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
