import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inspector from '@/lib/models/Inspector';
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

    const inspector = await Inspector.findById(id).select('-password').lean();
    if (!inspector) {
      return NextResponse.json({ status: false, message: 'Inspector not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: inspector });
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
    const updatable = ['name', 'email', 'phone', 'city', 'state', 'pincode', 'role', 'status', 'profileImage'];
    for (const field of updatable) {
      if (body[field] !== undefined) allowedFields[field] = body[field];
    }

    if (body.password) {
      allowedFields.password = await bcrypt.hash(body.password, 10);
    }

    const inspector = await Inspector.findByIdAndUpdate(id, allowedFields, { new: true }).select('-password');
    if (!inspector) {
      return NextResponse.json({ status: false, message: 'Inspector not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Inspector updated', data: inspector });
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

    const inspector = await Inspector.findByIdAndUpdate(id, { status: 'Delete' }, { new: true });
    if (!inspector) {
      return NextResponse.json({ status: false, message: 'Inspector not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Inspector deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
