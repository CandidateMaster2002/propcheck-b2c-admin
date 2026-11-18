import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScoringMetric from '@/lib/models/ScoringMetric';
import { getUserFromToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const rule = await ScoringMetric.findById(id);
    if (!rule) {
      return NextResponse.json({ status: false, message: 'Scoring rule not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: rule });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

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

    const rule = await ScoringMetric.findByIdAndUpdate(id, body, { new: true });
    if (!rule) {
      return NextResponse.json({ status: false, message: 'Scoring rule not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Scoring rule updated', data: rule });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const rule = await ScoringMetric.findByIdAndUpdate(id, { status: 'Inactive' }, { new: true });
    if (!rule) {
      return NextResponse.json({ status: false, message: 'Scoring rule not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Scoring rule deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
