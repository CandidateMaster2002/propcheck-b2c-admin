import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
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

    const allowed = ['paymentStatus', 'razorpayPaymentId', 'razorpayOrderId', 'razorpaySignature', 'paidAt', 'notes', 'amount', 'gst', 'totalAmount'];
    const update: any = {};
    for (const f of allowed) { if (body[f] !== undefined) update[f] = body[f]; }
    if (body.paymentStatus === 'Paid' && !update.paidAt) update.paidAt = new Date();

    const payment = await Payment.findByIdAndUpdate(id, update, { new: true });
    if (!payment) return NextResponse.json({ status: false, message: 'Payment not found' }, { status: 404 });

    return NextResponse.json({ status: true, message: 'Payment updated', data: payment });
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
    await Payment.findByIdAndDelete(id);
    return NextResponse.json({ status: true, message: 'Payment deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
