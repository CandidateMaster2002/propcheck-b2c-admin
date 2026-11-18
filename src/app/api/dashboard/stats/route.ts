import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Property from '@/lib/models/Property';
import Inspector from '@/lib/models/Inspector';
import Agent from '@/lib/models/Agent';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const [
      totalProperties,
      pendingInspections,
      completedInspections,
      totalInspectors,
      activeInspectors,
      totalAgents,
      totalRevenue
    ] = await Promise.all([
      Property.countDocuments({ status: { $ne: 'Delete' } }),
      Property.countDocuments({ bookingStatus: { $in: ['Pending', 'Booked', 'Assigned'] } }),
      Property.countDocuments({ bookingStatus: { $in: ['Completed', 'Inspection Complete'] } }),
      Inspector.countDocuments({ status: { $ne: 'Delete' } }),
      Inspector.countDocuments({ status: 'Enable' }),
      Agent.countDocuments({ status: { $ne: 'Delete' } }),
      Property.aggregate([
        { $match: { bookingStatus: { $in: ['Completed', 'Inspection Complete'] } } },
        { $group: { _id: null, total: { $sum: '$inspectionPrice' } } }
      ])
    ]);

    return NextResponse.json({
      status: true,
      data: {
        properties: {
          total: totalProperties,
          pending: pendingInspections,
          completed: completedInspections
        },
        inspectors: {
          total: totalInspectors,
          active: activeInspectors
        },
        agents: {
          total: totalAgents
        },
        revenue: {
          total: totalRevenue[0]?.total || 0
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
