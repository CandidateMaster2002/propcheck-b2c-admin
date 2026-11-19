import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import Inspector from '@/lib/models/Inspector';
import UserManagement from '@/lib/models/UserManagement';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || null;
    const bookingStatus = searchParams.get('bookingStatus');
    const propertyType = searchParams.get('propertyType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: any = { status: { $ne: 'Delete' } };

    if (search) {
      const upper = search.toUpperCase();
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { inspectionNumber: upper },  // exact indexed lookup
        { shortId: upper },           // exact indexed lookup
        { ownerName: regex },
        { ownerEmail: regex },
        { ownerPhone: regex },
        { projectName: regex },
      ];
    }

    if (bookingStatus) {
      query.bookingStatus = bookingStatus;
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (startDate || endDate) {
      query.inspectionDate = {};
      if (startDate) query.inspectionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.inspectionDate.$lte = end;
      }
    }

    // Sort by updatedAt desc so recently assigned/updated inspections (re-checks) appear first.
    // estimatedDocumentCount is O(1) for the unfiltered case; countDocuments for filtered.
    const hasFilters = !!(search || bookingStatus || propertyType || startDate || endDate);
    const [properties, total] = await Promise.all([
      Property.find(query)
        .select('-inspectionData')
        .lean()
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      hasFilters
        ? Property.countDocuments(query)
        : Property.estimatedDocumentCount(),
    ]);

    // Manual lookups for all referenced IDs (avoids populate() model-registration issues)
    // Note: .lean() returns ObjectId instances (typeof === 'object'), so filter only on truthiness
    const rawUserIds = (properties as any[]).map((p: any) => p.userId).filter(Boolean);
    const rawInspectorIds = (properties as any[]).flatMap((p: any) => [p.inspectorId, p.validatorId]).filter(Boolean);

    const [users, inspectors] = await Promise.all([
      rawUserIds.length > 0
        ? UserManagement.find({ _id: { $in: rawUserIds } }).select('name userName email phone').lean()
        : [],
      rawInspectorIds.length > 0
        ? Inspector.find({ _id: { $in: rawInspectorIds } }).select('name userName email phone').lean()
        : [],
    ]);

    const usersMap: Record<string, any> = {};
    (users as any[]).forEach((u: any) => { usersMap[String(u._id)] = u; });

    const inspectorsMap: Record<string, any> = {};
    (inspectors as any[]).forEach((i: any) => { inspectorsMap[String(i._id)] = i; });

    const enriched = (properties as any[]).map((p: any) => ({
      ...p,
      userDetail: p.userId ? (usersMap[String(p.userId)] || null) : null,
      inspectorId: p.inspectorId ? (inspectorsMap[String(p.inspectorId)] || null) : null,
      validatorId: p.validatorId ? (inspectorsMap[String(p.validatorId)] || null) : null,
    }));

    return NextResponse.json({ status: true, data: enriched, total, totalResult: total, limit });
  } catch (error: any) {
    console.error('[properties GET]', error);
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const property = await Property.create(body);

    // Generate inspectionNumber if not already set (pre-save hook sets shortId)
    if (!property.inspectionNumber && property.shortId) {
      const inspectionNumber = `B2C${property.shortId}`;
      await Property.findByIdAndUpdate(property._id, { inspectionNumber });
      (property as any).inspectionNumber = inspectionNumber;
    }

    return NextResponse.json({ status: true, message: 'Property added', data: property });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
