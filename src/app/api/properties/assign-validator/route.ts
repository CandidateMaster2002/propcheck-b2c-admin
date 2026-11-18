import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { propertyId, validatorId } = body;

    if (!propertyId || !validatorId) {
      return NextResponse.json(
        { status: false, message: 'propertyId and validatorId are required' },
        { status: 400 }
      );
    }

    const property = await Property.findByIdAndUpdate(
      propertyId,
      { validatorId },
      { new: true }
    ).populate('inspectorId validatorId');

    if (!property) {
      return NextResponse.json({ status: false, message: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Validator assigned', data: property });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
