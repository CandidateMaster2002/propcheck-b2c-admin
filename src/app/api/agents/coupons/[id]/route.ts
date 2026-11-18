import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/lib/models/Coupon';
import { getUserFromToken } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const updated = await Coupon.findByIdAndUpdate(params.id, { $set: body }, { new: true });
    if (!updated) return NextResponse.json({ status: false, message: 'Coupon not found' }, { status: 404 });

    return NextResponse.json({ status: true, message: 'Coupon updated', data: updated });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    await Coupon.findByIdAndDelete(params.id);
    return NextResponse.json({ status: true, message: 'Coupon deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
