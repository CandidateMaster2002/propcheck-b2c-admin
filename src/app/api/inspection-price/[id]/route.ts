import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InspectionPrice from '@/lib/models/InspectionPrice';
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

    const price = await InspectionPrice.findById(id);
    if (!price) {
      return NextResponse.json({ status: false, message: 'Price entry not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: price });
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

    const price = await InspectionPrice.findByIdAndUpdate(id, body, { new: true });
    if (!price) {
      return NextResponse.json({ status: false, message: 'Price entry not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Price updated', data: price });
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

    const price = await InspectionPrice.findByIdAndUpdate(id, { status: 'Inactive' }, { new: true });
    if (!price) {
      return NextResponse.json({ status: false, message: 'Price entry not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Price entry deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
