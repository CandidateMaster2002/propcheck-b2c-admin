import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DataManagement from '@/lib/models/DataManagement';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const space = searchParams.get('space');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Exclude deleted only — some migrated docs may have no status field at all
    const query: Record<string, any> = { status: { $ne: 'Delete' } };
    if (space) {
      query.space = space;
    }

    const [data, total] = await Promise.all([
      DataManagement.find(query).sort({ order: 1, createdDate: 1, _id: 1 }).skip(skip).limit(limit),
      DataManagement.countDocuments(query)
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

    if (!body.space || !body.item) {
      return NextResponse.json(
        { status: false, message: 'space and item are required' },
        { status: 400 }
      );
    }

    const item = await DataManagement.create(body);
    return NextResponse.json({ status: true, message: 'Checklist item added', data: item });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
