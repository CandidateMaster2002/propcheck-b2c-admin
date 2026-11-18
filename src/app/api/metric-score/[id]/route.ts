import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import MetricScore from '@/lib/models/MetricScore';
import { getUserFromToken } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;
    const body = await req.json();

    const doc = await MetricScore.findByIdAndUpdate(id, body, { new: true });
    if (!doc) return NextResponse.json({ status: false, message: 'Score not found' }, { status: 404 });

    return NextResponse.json({ status: true, statusCode: 200, message: 'Score Updated Successfully', data: doc });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
