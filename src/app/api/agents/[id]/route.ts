import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Agent from '@/lib/models/Agent';
import { getUserFromToken } from '@/lib/auth';
import bcrypt from 'bcrypt';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const agent = await Agent.findById(id).select('-password');
    if (!agent) {
      return NextResponse.json({ status: false, message: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: agent });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;
    const body = await req.json();

    const allowedFields: Record<string, any> = {};
    const updatable = ['userName', 'name', 'email', 'phone', 'city', 'state', 'address', 'pincode', 'status', 'commissionRate', 'profileImage', 'bankDetails', 'panNo', 'gstNo', 'aadharCard'];
    for (const field of updatable) {
      if (body[field] !== undefined) allowedFields[field] = body[field];
    }

    if (body.password) {
      allowedFields.password = await bcrypt.hash(body.password, 10);
    }

    const agent = await Agent.findByIdAndUpdate(id, allowedFields, { new: true }).select('-password');
    if (!agent) {
      return NextResponse.json({ status: false, message: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Agent updated', data: agent });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await context.params;

    const agent = await Agent.findByIdAndUpdate(id, { status: 'Delete' }, { new: true });
    if (!agent) {
      return NextResponse.json({ status: false, message: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Agent deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
