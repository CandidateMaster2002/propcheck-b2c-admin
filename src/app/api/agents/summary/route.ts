import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AgentStatement from '@/lib/models/AgentStatement';
import { getUserFromToken } from '@/lib/auth';

// GET /api/agents/summary?shortBy=netAmount&sortDir=desc&page=1&perPage=10
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const p = req.nextUrl.searchParams;
    const sortBy = p.get('shortBy') || 'count';
    const sortDir = p.get('sortDir') === 'asc' ? 1 : -1;
    const page = parseInt(p.get('page') || '1');
    const perPage = parseInt(p.get('perPage') || '10');
    const skip = (page - 1) * perPage;

    const sortField = ['netAmount', 'incentiveAmount', 'count'].includes(sortBy) ? sortBy : 'count';

    const basePipeline: any[] = [
      {
        $group: {
          _id: '$agentId',
          netAmount: { $sum: '$netAmount' },
          incentiveAmount: { $sum: '$incentiveAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { [sortField]: sortDir } },
      {
        $lookup: {
          from: 'agents',
          localField: '_id',
          foreignField: '_id',
          as: 'agent',
        },
      },
      { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          agentId: '$_id',
          userName: { $ifNull: ['$agent.userName', { $ifNull: ['$agent.name', 'Unknown'] }] },
          phone: { $ifNull: ['$agent.phone', '-'] },
          netAmount: 1,
          incentiveAmount: 1,
          count: 1,
        },
      },
    ];

    const [data, countResult] = await Promise.all([
      AgentStatement.aggregate([...basePipeline, { $skip: skip }, { $limit: perPage }]),
      AgentStatement.aggregate([...basePipeline, { $count: 'total' }]),
    ]);

    const total = countResult[0]?.total || 0;
    return NextResponse.json({ status: true, statusCode: 200, data, total });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
