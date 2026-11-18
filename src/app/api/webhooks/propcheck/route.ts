import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';

/**
 * Inbound Webhook from PropCheck Backend
 * Receives:
 * 1. VALIDATION_DONE: Updates property status to 'Validated', stores validator remarks and timestamp
 * 2. REPORT_SENT: Updates property status to 'Completed' / 'Report Sent', records dispatch timestamp
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      event,
      leadId,
      bookingId,
      phone,
      ownerPhone,
      email,
      ownerEmail,
      validatorRemarks,
      validatorName,
      validatedAt,
      reportUrl,
      sentAt,
    } = body;

    const contactPhone = phone || ownerPhone;
    const contactEmail = email || ownerEmail;

    // Build flexible query to match the property in MongoDB
    const queryConditions: any[] = [];

    if (leadId) {
      queryConditions.push({ leadId });
    }
    if (bookingId) {
      queryConditions.push({ bookingId });
    }
    if (contactPhone) {
      const cleanDigits = String(contactPhone).replace(/\D/g, '').slice(-10);
      if (cleanDigits.length >= 10) {
        queryConditions.push({ ownerPhone: { $regex: cleanDigits + '$' } });
      }
    }
    if (contactEmail) {
      queryConditions.push({
        ownerEmail: { $regex: new RegExp(`^${String(contactEmail).trim()}$`, 'i') },
      });
    }

    if (queryConditions.length === 0) {
      return NextResponse.json(
        { status: false, message: 'No identifying parameter (leadId, phone, or email) provided' },
        { status: 400 }
      );
    }

    const property = await Property.findOne({ $or: queryConditions }).sort({ updatedAt: -1 });

    if (!property) {
      return NextResponse.json(
        { status: false, message: 'Property matching identifiers not found in Admin Portal' },
        { status: 404 }
      );
    }

    // Process event
    if (event === 'VALIDATION_DONE') {
      property.bookingStatus = 'Validated';
      property.isValidated = true;
      property.validatedAt = validatedAt ? new Date(validatedAt) : new Date();
      if (validatorRemarks) {
        property.validatorRemarks = validatorRemarks;
      }
      await property.save();

      console.log(`[Admin Portal Inbound] Property #${property._id} marked as Validated by ${validatorName || 'Validator'}`);
      return NextResponse.json({
        status: true,
        message: 'Property validation status updated in Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    if (event === 'REPORT_SENT') {
      property.isReportSent = true;
      property.reportSentAt = sentAt ? new Date(sentAt) : new Date();
      if (reportUrl) {
        property.reportUrl = reportUrl;
      }
      property.bookingStatus = 'Completed';
      await property.save();

      console.log(`[Admin Portal Inbound] Property #${property._id} marked as Report Sent`);
      return NextResponse.json({
        status: true,
        message: 'Property report sent status updated in Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    // Default fallback update
    return NextResponse.json({
      status: true,
      message: 'Webhook received, no status change required',
      propertyId: property._id,
    });
  } catch (error: any) {
    console.error('[Admin Portal Webhook Error]', error);
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
