import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import { getUserFromToken } from '@/lib/auth';

// GET /api/payments?page=1&limit=10&status=&startDate=&endDate=&search=
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const p = req.nextUrl.searchParams;
    const limit = parseInt(p.get('limit') || '10');
    const page = parseInt(p.get('page') || '1');
    const skip = (page - 1) * limit;
    const status = p.get('status') || '';
    const startDate = p.get('startDate') || '';
    const endDate = p.get('endDate') || '';
    const search = p.get('search') || '';

    const query: any = {};
    if (status) query.paymentStatus = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); query.createdAt.$lte = e; }
    }
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { razorpayPaymentId: { $regex: search, $options: 'i' } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('propertyId', 'propertyName propertyType bookingStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query),
    ]);

    // Aggregate totals
    const agg = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$totalAmount', 0] } },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);
    const totals = agg[0] || { totalPaid: 0, totalPending: 0, totalAmount: 0 };

    // This month total
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthAgg = await Payment.aggregate([
      { $match: { createdAt: { $gte: thisMonthStart }, paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const thisMonthTotal = thisMonthAgg[0]?.total || 0;

    return NextResponse.json({ status: true, data: payments, total, limit, totals: { ...totals, thisMonthTotal } });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

// POST /api/payments — create a payment record
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    if (!body.amount || !body.totalAmount) {
      return NextResponse.json({ status: false, message: 'amount and totalAmount are required' }, { status: 400 });
    }

    const payment = await Payment.create(body);
    return NextResponse.json({ status: true, message: 'Payment recorded', data: payment });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
