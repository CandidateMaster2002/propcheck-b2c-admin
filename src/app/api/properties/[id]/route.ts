import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';
import { notifyPropCheckWebhook } from '@/lib/propcheckWebhook';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const property = await Property.findById(id).populate('inspectorId validatorId');
    if (!property) {
      return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: property });
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

    const property = await Property.findByIdAndUpdate(id, body, { new: true }).populate('inspectorId validatorId');
    if (!property) {
      return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });
    }

    // If inspection is completed or report is attached, sync with PropCheck portal
    const isCompletedStatus =
      property.bookingStatus === 'Completed' ||
      property.bookingStatus === 'Inspection Complete' ||
      body.bookingStatus === 'Completed' ||
      body.bookingStatus === 'Inspection Complete' ||
      body.reportUrl;

    if (isCompletedStatus) {
      notifyPropCheckWebhook(property).catch((err) =>
        console.warn('[PropCheck Webhook] Async sync error:', err?.message)
      );
    }

    return NextResponse.json({ status: true, message: 'Property updated', data: property });
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

    const property = await Property.findByIdAndUpdate(id, { status: 'Delete' }, { new: true });
    if (!property) {
      return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Property deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
