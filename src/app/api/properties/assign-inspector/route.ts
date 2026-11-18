import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { propertyId, inspectorId, inspectionDate, inspectionTime } = await req.json();

    // Fetch first to check if inspectionNumber is missing
    const existing = await Property.findById(propertyId).lean() as any;
    if (!existing) return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });

    const updateFields: any = { inspectorId, bookingStatus: 'Assigned' };
    if (inspectionDate) updateFields.inspectionDate = inspectionDate;
    if (inspectionTime) updateFields.inspectionTime = inspectionTime;

    // Generate inspectionNumber if missing — APK requires it to allow image uploads
    if (!existing.inspectionNumber) {
      const shortId = existing.shortId || (existing._id as any).toString().slice(-6).toUpperCase();
      updateFields.inspectionNumber = `B2C${shortId}`;
    }

    const property = await Property.findByIdAndUpdate(propertyId, updateFields, { new: true });
    if (!property) return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });
    return NextResponse.json({ status: true, message: 'Inspector assigned', data: property });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
