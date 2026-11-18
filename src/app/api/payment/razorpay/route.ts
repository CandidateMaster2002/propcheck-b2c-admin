import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { propertyId, amount } = await req.json();

    const orderData = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${propertyId}_${Date.now()}`,
      notes: {
        propertyId,
        userId: user._id
      }
    };

    return NextResponse.json({
      status: true,
      message: 'Order created',
      data: {
        orderId: `order_${Date.now()}`,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: RAZORPAY_KEY_ID
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
