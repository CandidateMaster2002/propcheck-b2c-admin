import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AgentStatement from '@/lib/models/AgentStatement';
import Agent from '@/lib/models/Agent';
import { getUserFromToken } from '@/lib/auth';

// GET /api/agents/statements?agentId=&startDate=&endDate=&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    // Ensure Agent model is registered so populate works
    void Agent;

    const p = req.nextUrl.searchParams;
    const agentId = p.get('agentId') || '';
    const startDate = p.get('startDate') || '';
    const endDate = p.get('endDate') || '';
    const limit = parseInt(p.get('limit') || '20');
    const page = parseInt(p.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: any = {};
    if (agentId) query.agentId = agentId;
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.bookingDate.$lte = end;
      }
    }

    const [rawStatements, total] = await Promise.all([
      AgentStatement.find(query)
        .populate('agentId', 'name userName phone commissionRate')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AgentStatement.countDocuments(query),
    ]);

    // Post-process: fill agentName from populated agentId if available
    const data = (rawStatements || []).map((s: any) => {
      const agentObj = s.agentId && typeof s.agentId === 'object' ? s.agentId : null;
      return {
        ...s,
        agentName: s.agentName || agentObj?.userName || agentObj?.name || '',
        agentId: agentObj,
        // inspectionId might be a string from old data — wrap it
        inspectionId: s.inspectionId
          ? (typeof s.inspectionId === 'string'
            ? { _id: s.inspectionId, propertyName: s._old_propertyName || '' }
            : s.inspectionId)
          : null,
      };
    });

    return NextResponse.json({ status: true, data, total, limit });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

// POST /api/agents/statements — create a new statement entry
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (!body.agentId) {
      return NextResponse.json({ status: false, message: 'agentId is required' }, { status: 400 });
    }

    if (body.netAmount === undefined && body.amount !== undefined) {
      body.netAmount = (body.amount || 0) - (body.discount || 0);
    }

    const stmt = await AgentStatement.create(body);
    return NextResponse.json({ status: true, message: 'Statement created', data: stmt });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
