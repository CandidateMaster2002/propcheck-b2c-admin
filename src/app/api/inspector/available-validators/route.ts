import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inspector from '@/lib/models/Inspector';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const validators = await Inspector.find({
      status: { $in: ['Enable', 'enable', 'Active', 'active'] },
      role: { $regex: /^validator$/i },
    }).select('name email phone city state');

    return NextResponse.json({ status: true, data: validators, totalResult: validators.length });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
