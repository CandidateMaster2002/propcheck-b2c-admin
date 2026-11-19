import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import Inspector from '@/lib/models/Inspector';

/**
 * Inbound Webhook from PropCheck Backend
 * Receives the full lifecycle of a lead/inspection:
 * 1. BOOKING_CREATED / BOOKING_SCHEDULED
 * 2. ENGINEER_ASSIGNED
 * 3. POSTPONED
 * 4. CANCELLED
 * 5. INSPECTION_DONE
 * 6. VALIDATION_DONE
 * 7. REPORT_SENT
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
      customerName,
      ownerName,
      city,
      address,
      projectName,
      unitNo,
      flatNo,
      bhkType,
      bedroom,
      inspectionDate,
      inspectionTime,
      slotTime,
      slot,
      engineerName,
      engineerEmail,
      engineerPhone,
      engineerId,
      remark,
      postponeReason,
      cancelReason,
      validatorRemarks,
      validatorName,
      validatedAt,
      reportUrl,
      sentAt,
      inspectionCost,
      reInspectionCost,
    } = body;

    const contactPhone = phone || ownerPhone;
    const contactEmail = email || ownerEmail;
    const contactName = customerName || ownerName || 'Valued Customer';
    const chosenCity = city || 'Hyderabad';
    const chosenUnit = flatNo || unitNo || '';
    const chosenProject = projectName || '';
    const chosenAddress = address || (chosenProject ? `${chosenProject}, Flat ${chosenUnit}` : chosenCity);

    // Build flexible query to match existing property in MongoDB
    const queryConditions: any[] = [];
    if (leadId) queryConditions.push({ leadId });
    if (bookingId) queryConditions.push({ bookingId });
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

    let property: any = null;
    if (queryConditions.length > 0) {
      property = await Property.findOne({ $or: queryConditions }).sort({ updatedAt: -1 });
    }

    // 1. EVENT: BOOKING_CREATED / BOOKING_SCHEDULED
    if (event === 'BOOKING_CREATED' || event === 'BOOKING_SCHEDULED') {
      const parsedDate = inspectionDate ? new Date(inspectionDate) : new Date();
      const timeStr = inspectionTime || slotTime || slot || '09:30';

      if (!property) {
        // Create new Property in MongoDB
        property = new Property({
          propertyName: chosenProject || `Inspection for ${contactName}`,
          propertyType: 'Apartment',
          address: chosenAddress,
          city: chosenCity,
          ownerName: contactName,
          ownerPhone: contactPhone || '',
          ownerEmail: contactEmail || '',
          projectName: chosenProject,
          unitNo: chosenUnit,
          bedroom: bhkType || bedroom || '3 BHK',
          amount: String(inspectionCost || 0),
          inspectionType: 'Full Inspection',
          inspectionDate: parsedDate,
          inspectionTime: timeStr,
          bookingStatus: 'Booked',
          status: 'Active',
          leadId,
          bookingId,
        });
        await property.save();

        // Ensure inspectionNumber is set
        if (!property.inspectionNumber && property.shortId) {
          const inspectionNumber = `B2C${property.shortId}`;
          await Property.findByIdAndUpdate(property._id, { inspectionNumber });
          property.inspectionNumber = inspectionNumber;
        }

        console.log(`[Admin Portal] Created new Property #${property.inspectionNumber || property._id} for ${contactName}`);
      } else {
        // Update existing property schedule
        property.inspectionDate = parsedDate;
        property.inspectionTime = timeStr;
        property.bookingStatus = 'Booked';
        if (leadId) property.leadId = leadId;
        if (bookingId) property.bookingId = bookingId;
        await property.save();
        console.log(`[Admin Portal] Updated Property #${property._id} schedule to ${parsedDate.toISOString().slice(0, 10)} ${timeStr}`);
      }

      return NextResponse.json({
        status: true,
        message: 'Booking successfully synced to Admin Portal',
        propertyId: property._id,
        inspectionNumber: property.inspectionNumber || property.shortId,
        bookingStatus: property.bookingStatus,
      });
    }

    // For subsequent events, property must exist
    if (!property) {
      return NextResponse.json(
        { status: false, message: 'Property matching identifiers not found in Admin Portal' },
        { status: 404 }
      );
    }

    // 2. EVENT: ENGINEER_ASSIGNED
    if (event === 'ENGINEER_ASSIGNED') {
      // Find matching inspector in MongoDB
      if (engineerEmail || engineerPhone || engineerName) {
        const inspectorQuery: any[] = [];
        if (engineerEmail) inspectorQuery.push({ email: { $regex: new RegExp(`^${engineerEmail.trim()}$`, 'i') } });
        if (engineerPhone) {
          const cleanPhone = String(engineerPhone).replace(/\D/g, '').slice(-10);
          if (cleanPhone.length >= 10) inspectorQuery.push({ phone: { $regex: cleanPhone + '$' } });
        }
        if (engineerName) inspectorQuery.push({ name: { $regex: new RegExp(engineerName.trim(), 'i') } });

        const matchedInspector = await Inspector.findOne({ $or: inspectorQuery });
        if (matchedInspector) {
          property.inspectorId = matchedInspector._id;
        }
      }

      property.bookingStatus = 'Assigned';
      await property.save();
      console.log(`[Admin Portal] Assigned engineer to Property #${property._id} (${property.bookingStatus})`);
      return NextResponse.json({
        status: true,
        message: 'Engineer assignment synced to Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    // 3. EVENT: POSTPONED
    if (event === 'POSTPONED') {
      property.bookingStatus = 'Postponed';
      property.validatorRemarks = postponeReason || remark || 'Postponed by customer/operations';
      await property.save();
      console.log(`[Admin Portal] Property #${property._id} marked as Postponed`);
      return NextResponse.json({
        status: true,
        message: 'Postpone status synced to Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    // 4. EVENT: CANCELLED
    if (event === 'CANCELLED') {
      property.bookingStatus = 'Cancelled';
      property.validatorRemarks = cancelReason || remark || 'Cancelled by customer/operations';
      await property.save();
      console.log(`[Admin Portal] Property #${property._id} marked as Cancelled`);
      return NextResponse.json({
        status: true,
        message: 'Cancellation synced to Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    // 5. EVENT: INSPECTION_DONE
    if (event === 'INSPECTION_DONE') {
      property.bookingStatus = 'Inspection Done';
      if (reportUrl) property.reportUrl = reportUrl;
      await property.save();
      console.log(`[Admin Portal] Property #${property._id} marked as Inspection Done`);
      return NextResponse.json({
        status: true,
        message: 'Inspection completed status synced to Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    // 6. EVENT: VALIDATION_DONE
    if (event === 'VALIDATION_DONE') {
      property.bookingStatus = 'Validated';
      property.isValidated = true;
      property.validatedAt = validatedAt ? new Date(validatedAt) : new Date();
      if (validatorRemarks) {
        property.validatorRemarks = validatorRemarks;
      }
      await property.save();
      console.log(`[Admin Portal] Property #${property._id} marked as Validated by ${validatorName || 'Validator'}`);
      return NextResponse.json({
        status: true,
        message: 'Property validation status updated in Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

    // 7. EVENT: REPORT_SENT
    if (event === 'REPORT_SENT') {
      property.isReportSent = true;
      property.reportSentAt = sentAt ? new Date(sentAt) : new Date();
      if (reportUrl) {
        property.reportUrl = reportUrl;
      }
      property.bookingStatus = 'Completed';
      await property.save();
      console.log(`[Admin Portal] Property #${property._id} marked as Report Sent`);
      return NextResponse.json({
        status: true,
        message: 'Property report sent status updated in Admin Portal',
        propertyId: property._id,
        bookingStatus: property.bookingStatus,
      });
    }

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
