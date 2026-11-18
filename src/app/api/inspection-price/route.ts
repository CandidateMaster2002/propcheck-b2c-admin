import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InspectionPrice from '@/lib/models/InspectionPrice';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const propertyType = searchParams.get('propertyType');

    const query: Record<string, any> = { status: { $ne: 'Inactive' } };
    if (propertyType) query.propertyType = propertyType;

    if (limit > 0) {
      const skip = (page - 1) * limit;
      const [prices, total] = await Promise.all([
        InspectionPrice.find(query).skip(skip).limit(limit).sort({ propertyType: 1 }),
        InspectionPrice.countDocuments(query),
      ]);
      return NextResponse.json({ status: true, data: prices, totalResult: total, limit });
    }

    // No pagination — return all active prices (used by book-inspection calculator)
    const prices = await InspectionPrice.find({ ...query, status: 'Active' });
    return NextResponse.json({ status: true, data: prices });
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
    const price = await InspectionPrice.create(body);

    return NextResponse.json({ status: true, message: 'Price added', data: price });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
