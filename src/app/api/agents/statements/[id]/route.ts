import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AgentStatement from '@/lib/models/AgentStatement';
import { getUserFromToken } from '@/lib/auth';

// PUT /api/agents/statements/[id]  — update statement (mark incentive paid, edit fields)
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

    const allowedFields = [
      'isPaid', 'isIncentivePaid', 'utrNumber', 'incentivePaidDate',
      'amount', 'discount', 'incentiveAmount', 'netAmount', 'customerAmount',
      'couponCode', 'customerName', 'agentName', 'bookingDate',
    ];

    const update: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    // If marking incentive as paid, validate UTR and date
    if (body.isIncentivePaid === true) {
      if (!body.utrNumber) {
        return NextResponse.json({ status: false, message: 'UTR number is required to mark incentive as paid' }, { status: 400 });
      }
      update.isIncentivePaid = true;
      update.utrNumber = body.utrNumber;
      update.incentivePaidDate = body.incentivePaidDate ? new Date(body.incentivePaidDate) : new Date();
    }

    const stmt = await AgentStatement.findByIdAndUpdate(id, update, { new: true });
    if (!stmt) return NextResponse.json({ status: false, message: 'Statement not found' }, { status: 404 });

    return NextResponse.json({ status: true, message: 'Statement updated', data: stmt });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/agents/statements/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;
    await AgentStatement.findByIdAndDelete(id);
    return NextResponse.json({ status: true, message: 'Statement deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
