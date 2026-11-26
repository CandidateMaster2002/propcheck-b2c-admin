import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';

const SYNC_SECRET = process.env.PROPCHECK_SYNC_SECRET || 'propcheck_internal_sync_2026';

/**
 * Internal read endpoint for PropCheck backend (propcheck-be) to fetch
 * the full B2C Property + inspectionDetail for a booking/lead.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('x-propcheck-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== SYNC_SECRET) {
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = req.nextUrl;
    const b2cPropertyId = searchParams.get('b2cPropertyId');
    const leadId = searchParams.get('leadId');
    const bookingId = searchParams.get('bookingId');
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    let property: any = null;

    if (b2cPropertyId && mongoose.Types.ObjectId.isValid(b2cPropertyId)) {
      property = await Property.findById(b2cPropertyId).populate('inspectorId validatorId');
    }

    if (!property) {
      const queryConditions: any[] = [];
      if (leadId) {
        const numLead = Number(leadId);
        if (!Number.isNaN(numLead)) queryConditions.push({ leadId: numLead });
        queryConditions.push({ leadId: String(leadId) });
      }
      if (bookingId) {
        const numBooking = Number(bookingId);
        if (!Number.isNaN(numBooking)) queryConditions.push({ bookingId: numBooking });
        queryConditions.push({ bookingId: String(bookingId) });
      }
      if (phone) {
        const cleanDigits = String(phone).replace(/\D/g, '').slice(-10);
        if (cleanDigits.length >= 10) {
          queryConditions.push({ ownerPhone: { $regex: cleanDigits + '$' } });
        }
      }
      if (email && email.trim()) {
        queryConditions.push({
          ownerEmail: { $regex: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });
      }

      if (queryConditions.length > 0) {
        property = await Property.findOne({ $or: queryConditions })
          .sort({ updatedAt: -1 })
          .populate('inspectorId validatorId');
      }
    }

    if (!property) {
      return NextResponse.json({ status: false, message: 'Property not found in B2C database' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: property });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
