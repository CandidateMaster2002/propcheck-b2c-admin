import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WaterQuality from '@/lib/models/WaterQuality';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const propertyId = searchParams.get('propertyId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (propertyId) {
      query.propertyId = propertyId;
    }

    const [data, total] = await Promise.all([
      WaterQuality.find(query).populate('propertyId').sort({ testDate: -1 }).skip(skip).limit(limit),
      WaterQuality.countDocuments(query)
    ]);

    return NextResponse.json({ status: true, data, totalResult: total, limit });
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

    if (!body.propertyId) {
      return NextResponse.json({ status: false, message: 'propertyId is required' }, { status: 400 });
    }

    const test = await WaterQuality.create(body);
    return NextResponse.json({ status: true, message: 'Water quality test added', data: test });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
