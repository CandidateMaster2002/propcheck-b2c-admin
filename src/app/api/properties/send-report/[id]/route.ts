import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const property = await Property.findById(params.id);
    if (!property) return NextResponse.json({ status: false, message: 'Inspection not found' }, { status: 404 });

    // Mark report as sent
    await Property.findByIdAndUpdate(params.id, {
      $set: {
        isReportSent: true,
        reportSentAt: new Date(),
        reportSentBy: user._id || user.id,
      }
    });

    // In a real implementation this would send an email/SMS to ownerEmail/ownerPhone
    // For now we just mark it as sent in the database

    return NextResponse.json({
      status: true,
      message: `Report marked as sent for ${property.ownerName || 'customer'}`,
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
