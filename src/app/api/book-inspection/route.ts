import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import UserManagement from '@/lib/models/UserManagement';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      userId,
      ownerName,
      ownerPhone,
      ownerEmail,
      unitNo,
      projectName,
      address,
      street,
      landmark,
      state,
      city,
      pincode,
      size,
      bedroom,
      propertyType,
      inspectionDate,
      amount,
      couponCode,
      floorPlan,
      gstPercentage,
      gstAmount,
      bookingStatus,
      longitude,
      latitude,
    } = body;

    if (!address || !city || !inspectionDate) {
      return NextResponse.json(
        { status: false, message: 'address, city and inspectionDate are required' },
        { status: 400 }
      );
    }

    // Resolve customer — either provided userId or create new
    let customer: any = null;
    if (userId) {
      customer = await UserManagement.findById(userId);
    }

    // Build property record
    const property = await Property.create({
      propertyName: projectName || unitNo || '',
      propertyType: propertyType || '1BHK',
      address,
      street: street || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      projectName: projectName || '',
      unitNo: unitNo || '',
      size: size ? String(size) : '',
      bedroom: bedroom ? String(bedroom) : '',
      amount: amount ? String(amount) : '',
      couponCode: couponCode || '',
      inspectionDate: new Date(inspectionDate),
      bookingStatus: bookingStatus || 'Booked',
      userId: customer?._id || null,
      ownerName: customer?.name || ownerName || '',
      ownerPhone: customer?.phone || ownerPhone || '',
      ownerEmail: customer?.email || ownerEmail || '',
      inspectionData: {
        floorPlan: floorPlan || '',
        gstPercentage: gstPercentage || 18,
        gstAmount: gstAmount || 0,
        longitude: longitude || '',
        latitude: latitude || '',
      },
    });

    // Generate inspectionNumber from shortId (set by pre-save hook)
    if (!property.inspectionNumber && property.shortId) {
      await Property.findByIdAndUpdate(property._id, {
        inspectionNumber: `B2C${property.shortId}`,
      });
      (property as any).inspectionNumber = `B2C${property.shortId}`;
    }

    // Link property to customer
    if (customer) {
      await UserManagement.findByIdAndUpdate(customer._id, {
        $addToSet: { properties: property._id, inspections: property._id },
      });
    }

    return NextResponse.json({
      status: true,
      message: 'Inspection booked successfully',
      propertyData: property,
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
