import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WaterQuality from '@/lib/models/WaterQuality';
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

    const test = await WaterQuality.findById(id).populate('propertyId');
    if (!test) {
      return NextResponse.json({ status: false, message: 'Water quality test not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: test });
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

    const test = await WaterQuality.findByIdAndUpdate(id, body, { new: true }).populate('propertyId');
    if (!test) {
      return NextResponse.json({ status: false, message: 'Water quality test not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Water quality test updated', data: test });
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

    const test = await WaterQuality.findByIdAndDelete(id);
    if (!test) {
      return NextResponse.json({ status: false, message: 'Water quality test not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Water quality test deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
