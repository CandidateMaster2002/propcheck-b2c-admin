import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MetricScore from '@/lib/models/MetricScore';
import { getUserFromToken } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const doc = await MetricScore.findOne().sort({ createdAt: -1 });
    return NextResponse.json({ status: true, statusCode: 200, data: doc });
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
    const doc = await MetricScore.create(body);
    return NextResponse.json({ status: true, statusCode: 200, message: 'Score added Successfully', data: doc });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
