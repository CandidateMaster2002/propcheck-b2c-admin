import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inspector from '@/lib/models/Inspector';
import { getUserFromToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const condition: any = { status: 'Enable' };

    if (role && role !== 'Both') {
      condition.role = role;
    }

    if (search) {
      condition.$or = [
        { name: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [inspectors, total] = await Promise.all([
      Inspector.find(condition).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Inspector.countDocuments(condition)
    ]);

    // Normalize: old migrated docs use 'userName', new schema uses 'name'
    const normalized = inspectors.map((ins: any) => ({
      ...ins,
      name: ins.name || ins.userName || '',
    }));

    return NextResponse.json({ status: true, data: normalized, total, totalResult: total, limit });
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
    body.password = await bcrypt.hash(body.password || 'inspector@123', 10);

    const inspector = await Inspector.create(body);
    return NextResponse.json({ status: true, message: 'Inspector added', data: inspector });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
