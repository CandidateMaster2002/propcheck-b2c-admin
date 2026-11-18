import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, propertyId } = await req.json();

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      await Property.findByIdAndUpdate(propertyId, {
        paymentStatus: 'Paid',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });

      return NextResponse.json({
        status: true,
        message: 'Payment verified successfully'
      });
    } else {
      return NextResponse.json({
        status: false,
        message: 'Payment verification failed'
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
