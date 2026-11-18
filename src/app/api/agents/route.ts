import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Agent from '@/lib/models/Agent';
import { getUserFromToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    const query: any = { status: { $ne: 'Delete' } };
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [agents, total] = await Promise.all([
      Agent.find(query).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Agent.countDocuments(query),
    ]);

    return NextResponse.json({ status: true, data: agents, total, limit });
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
    body.password = await bcrypt.hash(body.password || 'agent@123', 10);

    const agent = await Agent.create(body);
    const agentData = agent.toObject();
    delete agentData.password;
    return NextResponse.json({ status: true, message: 'Agent added', data: agentData });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
