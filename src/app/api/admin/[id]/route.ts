import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
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

    const admin = await Admin.findById(id).select('-password');
    if (!admin) {
      return NextResponse.json({ status: false, message: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, data: admin });
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

    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    } else {
      delete body.password;
    }

    const admin = await Admin.findByIdAndUpdate(id, body, { new: true }).select('-password');
    if (!admin) {
      return NextResponse.json({ status: false, message: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Admin updated', data: admin });
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

    const admin = await Admin.findByIdAndUpdate(id, { status: 'Delete' }, { new: true });
    if (!admin) {
      return NextResponse.json({ status: false, message: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({ status: true, message: 'Admin deleted' });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
