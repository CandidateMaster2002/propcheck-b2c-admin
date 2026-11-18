import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/lib/models/Coupon';
import { getUserFromToken } from '@/lib/auth';

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const agentId = req.nextUrl.searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ status: false, message: 'agentId required' }, { status: 400 });

    const coupons = await Coupon.find({ agentId }).sort({ createdAt: -1 });
    return NextResponse.json({ status: true, data: coupons });
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
    const { agentId, couponPercentage, incentivePercentage, couponType } = body;

    if (!agentId) return NextResponse.json({ status: false, message: 'agentId is required' }, { status: 400 });
    if (couponPercentage == null || incentivePercentage == null) {
      return NextResponse.json({ status: false, message: 'couponPercentage and incentivePercentage are required' }, { status: 400 });
    }

    // Generate unique coupon code
    let couponCode = '';
    let attempts = 0;
    while (attempts < 10) {
      const candidate = generateCouponCode();
      const existing = await Coupon.findOne({ couponCode: candidate });
      if (!existing) { couponCode = candidate; break; }
      attempts++;
    }
    if (!couponCode) return NextResponse.json({ status: false, message: 'Failed to generate unique coupon code' }, { status: 500 });

    const coupon = await Coupon.create({
      agentId, couponCode, couponPercentage, incentivePercentage,
      couponType: couponType || 'regular', assignedStatus: 'Active',
    });

    return NextResponse.json({ status: true, message: 'Coupon created', data: coupon });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
