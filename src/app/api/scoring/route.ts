import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScoringMetric from '@/lib/models/ScoringMetric';
import { getUserFromToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const status = searchParams.get('status');

    const query: Record<string, any> = {};
    if (status) {
      query.status = status;
    }

    const [rules, total] = await Promise.all([
      ScoringMetric.find(query).skip(skip).limit(limit).sort({ category: 1 }),
      ScoringMetric.countDocuments(query)
    ]);

    return NextResponse.json({ status: true, data: rules, totalResult: total, limit });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (!body.category) {
      return NextResponse.json({ status: false, message: 'category is required' }, { status: 400 });
    }

    const rule = await ScoringMetric.create(body);
    return NextResponse.json({ status: true, message: 'Scoring rule created', data: rule });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
